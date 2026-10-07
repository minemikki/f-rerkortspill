/**
 * Regression tests for every scenario branch:
 *  - the scenario always completes
 *  - no two actors (involving a vehicle) ever overlap — near-misses must stay misses
 *  - the expected outcome is picked for each player policy
 *  - every outcome/option/label referenced by choreography exists in the faglig content
 */
import { describe, expect, test } from 'vitest'
import { playHeadless, type Policy } from './headless'
import { CONTENT, SCENARIOS } from '../scenarios'
import { ScenarioRunner } from './runner'

const POLICIES: Record<string, Array<[string, Policy, Record<string, string>]>> = {
  's1-hoyreregel': [
    ['wait', { choices: { priority: 'wait' } }, { priority: 'wait' }],
    ['go', { choices: { priority: 'go' } }, { priority: 'go' }],
    ['speed', { choices: { priority: 'speed' } }, { priority: 'speed' }],
    ['timeout', {}, { priority: 'go' }],
  ],
  's2-ballen': [
    ['cautious', { brakeAfter: { react: 0.8 } }, { react: 'cautious' }],
    ['perfect', { brakeAfter: { react: 2.6 } }, { react: 'perfect' }],
    ['late', { brakeAfter: { react: 3.9 } }, { react: 'late' }],
    ['fail', {}, { react: 'fail' }],
  ],
  's3-syklisten': [
    ['found', { taps: { spot: ['cyclist'] } }, { spot: 'all' }],
    ['distracted', { taps: { spot: ['bus'] } }, { spot: 'none' }],
    ['nothing', {}, { spot: 'none' }],
  ],
  's4-gangfelt': [
    ['slow', { choices: { approach: 'slow' } }, { approach: 'slow' }],
    ['hold', { choices: { approach: 'hold' } }, { approach: 'hold' }],
    ['brake', { choices: { approach: 'brake' } }, { approach: 'brake' }],
  ],
  's5-rushtrafikk': [
    [
      'best',
      { taps: { scan: ['ped', 'circ'] }, choices: { blinker: 'wait', signal: 'right' }, brakeAfter: { exit: 1.0 } },
      { scan: 'all', blinker: 'wait', signal: 'right', exit: 'perfect' },
    ],
    [
      'missed-ped',
      { taps: { scan: ['circ'] }, choices: { blinker: 'trust', signal: 'left' }, brakeAfter: { exit: 1.6 } },
      { scan: 'missed-ped', blinker: 'trust', signal: 'left', exit: 'late' },
    ],
    [
      'missed-circ',
      { taps: { scan: ['ped'] }, choices: { blinker: 'rush', signal: 'none' } },
      { scan: 'missed-circ', blinker: 'rush', signal: 'none', exit: 'fail' },
    ],
    ['nothing', {}, { scan: 'none', blinker: 'wait', signal: 'none', exit: 'fail' }],
  ],
}

describe.each(SCENARIOS.map((s) => [s.id, s] as const))('%s', (id, def) => {
  test('content covers every step, option, outcome and spot label', () => {
    const c = CONTENT[id]
    expect(c, 'content missing').toBeTruthy()
    for (const step of def.steps) {
      const sc = c.steps[step.id]
      expect(sc, `content for step ${step.id}`).toBeTruthy()
      const outcomes =
        step.kind === 'choice'
          ? step.options.map((o) => o.outcome)
          : step.kind === 'spot'
            ? [step.outcomes.all, step.outcomes.none, ...Object.values(step.outcomes.missed ?? {})]
            : Object.values(step.outcomes)
      for (const o of outcomes) expect(sc.outcomes[o.id], `outcome text ${step.id}.${o.id}`).toBeTruthy()
      if (step.kind === 'choice') for (const o of step.options) expect(sc.options?.[o.id], `option label ${o.id}`).toBeTruthy()
      if (step.kind === 'spot') for (const t of [...step.targets, ...step.distractors]) expect(sc.labels?.[t], `label ${t}`).toBeTruthy()
    }
  })

  for (const [name, policy, expected] of POLICIES[id] ?? []) {
    test(`branch: ${name}`, () => {
      const rep = playHeadless(def, policy, { maxSeconds: 140 })
      expect(rep.result, 'scenario completes').toBeTruthy()
      for (const [stepId, outcome] of Object.entries(expected)) expect(rep.outcomes[stepId], `outcome of ${stepId}`).toBe(outcome)
      const overlaps = Object.entries(rep.minGap).filter(([, v]) => v.gap < 0.05)
      expect(overlaps.map(([k, v]) => `${k} @${v.t.toFixed(2)}`)).toEqual([])
    })
  }

  test('retry rewinds to the step and can succeed', () => {
    const r = new ScenarioRunner(def)
    let retried = false
    for (let i = 0; i < 60 * 140 && r.ui.phase !== 'complete'; i++) {
      r.update(1 / 60)
      if (r.ui.phase === 'feedback' && r.ui.feedback?.blocking) {
        if (!retried) {
          retried = true
          r.retry()
        } else r.continue()
      }
    }
    expect(r.ui.phase).toBe('complete')
  })
})

describe('learn-mode theory panel (hold + hint)', () => {
  const s1 = SCENARIOS.find((s) => s.id === 's1-hoyreregel')!
  const toStep = () => {
    const r = new ScenarioRunner(s1)
    for (let i = 0; i < 60 * 60 && r.ui.phase !== 'step'; i++) r.update(1 / 60)
    return r
  }

  test('opening the panel freezes time during a step', () => {
    const r = toStep()
    expect(r.ui.phase).toBe('step')
    const t0 = r.now
    const s0 = r.sim.t
    r.setHold(true)
    for (let i = 0; i < 600; i++) r.update(1 / 60) // 10 s with the panel open
    expect(r.now).toBe(t0)
    expect(r.sim.t).toBe(s0)
    expect(r.ui.phase).toBe('step') // no timeout while reading
    r.setHold(false)
    r.update(1 / 60)
    expect(r.now).toBeGreaterThan(t0)
  })

  test('a hinted correct answer scores lower than an unhinted one', () => {
    const finish = (hint: boolean) => {
      const r = toStep()
      if (hint) {
        r.setHold(true)
        r.setHold(false)
      }
      r.choose('wait')
      for (let i = 0; i < 60 * 90 && r.ui.phase !== 'complete'; i++) {
        r.update(1 / 60)
        if (r.ui.phase === 'feedback' && r.ui.feedback?.blocking) r.continue()
      }
      return r.ui.result!
    }
    const plain = finish(false)
    const hinted = finish(true)
    expect(hinted.total).toBeLessThan(plain.total)
    expect(hinted.steps[0].xp).toBeLessThan(plain.steps[0].xp)
  })
})

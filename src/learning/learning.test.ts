import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '../scenarios'
import { OBJECTIVES, QUESTIONS, QUESTION_BY_ID, RULE_CARDS, SCENARIO_LOOP } from './bank'
import { dueQuestions, emptyMastery, levelOf, recordPractice, recordScenario, recordTheoryAnswer, summarize } from './mastery'
import { dailyPlan } from './recommend'
import { SKILLS } from './types'

const day = (s: string) => new Date(s + 'T12:00:00Z')
const scenarioIds = SCENARIOS.map((s) => s.id)

describe('theory bank integrity', () => {
  it('has unique ids and valid answers', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length)
    for (const q of QUESTIONS) {
      const ids = q.answerOptions.map((o) => o.id)
      expect(new Set(ids).size, q.id).toBe(ids.length)
      if (q.questionType === 'ordering') {
        expect(Array.isArray(q.correctAnswer), q.id).toBe(true)
        expect([...(q.correctAnswer as string[])].sort(), q.id).toEqual([...ids].sort())
      } else {
        expect(ids, q.id).toContain(q.correctAnswer as string)
      }
      for (const k of Object.keys(q.misconception ?? {})) expect(ids, q.id).toContain(k)
      expect(q.explanation.length, q.id).toBeGreaterThan(20)
    }
  })

  it('links only to existing scenarios, objectives and skills', () => {
    const objectives = new Set(OBJECTIVES.map((o) => o.id))
    for (const q of QUESTIONS) {
      for (const s of q.linkedScenarioIds) expect(scenarioIds, q.id).toContain(s)
      for (const o of q.learningObjectiveIds) expect(objectives.has(o), `${q.id} → ${o}`).toBe(true)
      for (const s of Object.keys(q.skills)) expect(SKILLS as string[], q.id).toContain(s)
    }
  })

  it('cites at least one source per item', () => {
    for (const q of QUESTIONS) expect(q.sourceMetadata.length, q.id).toBeGreaterThan(0)
  })

  it('never ships an item as approved without a named reviewer', () => {
    for (const q of QUESTIONS) {
      if (q.professionalReviewStatus === 'approved') {
        const last = q.reviewHistory.at(-1)
        expect(last?.status, q.id).toBe('approved')
        expect(last?.by.trim().length, q.id).toBeGreaterThan(3)
      }
    }
    // v0: nothing has been professionally reviewed yet
    expect(QUESTIONS.every((q) => q.professionalReviewStatus !== 'approved')).toBe(true)
  })

  it('has a 3-question loop + recall + rule card for every scenario', () => {
    for (const id of scenarioIds) {
      const loop = SCENARIO_LOOP[id]
      expect(loop, id).toBeTruthy()
      expect(loop.questions).toHaveLength(3)
      for (const q of [...loop.questions, loop.recall]) expect(QUESTION_BY_ID.has(q), q).toBe(true)
      expect(loop.questions).not.toContain(loop.recall)
      expect(RULE_CARDS[id], id).toBeTruthy()
    }
  })
})

describe('mastery engine', () => {
  const q = QUESTION_BY_ID.get('q-s1-hoyreregel')!

  it('separates theory from applied evidence', () => {
    let m = emptyMastery()
    m = recordTheoryAnswer(m, q, true, day('2026-10-01')).state
    expect(m.skills.trafficRules.theory.score).toBe(1)
    expect(m.skills.trafficRules.applied.n).toBe(0)
    m = recordScenario(m, 's1-hoyreregel', [{ result: 'wrong', tests: ['rules', 'risk'], scores: { rules: 0, risk: 0.2 }, attempts: 1 }], day('2026-10-01')).state
    const s = summarize(m).find((x) => x.skill === 'trafficRules')!
    expect(s.theory).toBe(1)
    expect(s.applied).toBe(0)
    expect(s.gap).toBe('knows-not-does')
  })

  it('weights first attempts above retries', () => {
    const steps = (attempts: number) => [{ result: 'perfect' as const, tests: ['rules' as const], scores: { rules: 1 }, attempts }]
    const base = recordScenario(emptyMastery(), 's1-hoyreregel', [{ result: 'wrong', tests: ['rules'], scores: { rules: 0 }, attempts: 1 }], day('2026-10-01')).state
    const first = recordScenario(base, 's1-hoyreregel', steps(1), day('2026-10-02')).state
    const retry = recordScenario(base, 's1-hoyreregel', steps(2), day('2026-10-02')).state
    expect(first.skills.trafficRules.applied.score).toBeGreaterThan(retry.skills.trafficRules.applied.score)
  })

  it('reports deltas and levels', () => {
    const r = recordTheoryAnswer(emptyMastery(), q, true, day('2026-10-01'))
    expect(r.deltas.map((d) => d.skill)).toEqual(expect.arrayContaining(['trafficRules', 'intersections']))
    expect(r.deltas.every((d) => d.before === null && d.track === 'theory')).toBe(true)
    expect(levelOf(emptyMastery().skills.observation.theory)).toBe('ny')
  })

  it('schedules wrong answers for repetition today and right answers later', () => {
    let m = recordTheoryAnswer(emptyMastery(), q, false, day('2026-10-01')).state
    expect(dueQuestions(m, day('2026-10-01'))).toEqual(['q-s1-hoyreregel'])
    m = recordTheoryAnswer(m, q, true, day('2026-10-01')).state
    expect(dueQuestions(m, day('2026-10-01'))).toEqual([])
    expect(dueQuestions(m, day('2026-10-02'))).toEqual(['q-s1-hoyreregel'])
  })

  it('records practice assessments as applied evidence', () => {
    const r = recordPractice(emptyMastery(), { observation: 0.5, speedAdaptation: 1, positioning: 0.75, trafficRules: 1 }, day('2026-10-01'))
    expect(r.state.skills.speedAdaptation.applied.score).toBe(1)
    expect(r.state.skills.observation.theory.n).toBe(0)
  })

  it('is pure (does not mutate input)', () => {
    const m = emptyMastery()
    const snap = JSON.stringify(m)
    recordTheoryAnswer(m, q, true, day('2026-10-01'))
    recordScenario(m, 's2-ballen', [{ result: 'good', tests: ['reaction'], scores: { reaction: 0.7 }, attempts: 1 }], day('2026-10-01'))
    expect(JSON.stringify(m)).toBe(snap)
  })
})

describe('daily plan', () => {
  const base = { scenarioOrder: scenarioIds, titleOf: (id: string) => id, today: day('2026-10-07'), practiceUnlocked: true }

  it('starts a new learner on the first scenario with ~12–14 minutes', () => {
    const p = dailyPlan({ ...base, mastery: emptyMastery(), completed: {} })
    expect(p.items[0]).toMatchObject({ kind: 'scenario', scenarioId: 's1-hoyreregel' })
    expect(p.items.some((i) => i.kind === 'theory')).toBe(true)
    expect(p.minutes).toBeGreaterThanOrEqual(10)
    expect(p.minutes).toBeLessThanOrEqual(14)
    for (const i of p.items) expect(i.reason.length).toBeGreaterThan(5)
  })

  it('fills ~12 minutes for a brand-new learner without practice unlocked', () => {
    const p = dailyPlan({ ...base, practiceUnlocked: false, mastery: emptyMastery(), completed: {} })
    expect(p.minutes).toBeGreaterThanOrEqual(12)
    expect(p.items.filter((i) => i.kind === 'scenario').map((i) => i.scenarioId)).toEqual(['s1-hoyreregel', 's2-ballen'])
  })

  it('is deterministic', () => {
    const a = dailyPlan({ ...base, mastery: emptyMastery(), completed: { 's1-hoyreregel': { stars: 2 } } })
    const b = dailyPlan({ ...base, mastery: emptyMastery(), completed: { 's1-hoyreregel': { stars: 2 } } })
    expect(a).toEqual(b)
  })

  it('targets the weakest skill and includes due repetitions and a challenge', () => {
    let m = emptyMastery()
    // strong everywhere except cyclists
    for (const qq of QUESTIONS) m = recordTheoryAnswer(m, qq, !Object.keys(qq.skills).includes('cyclists'), day('2026-10-06')).state
    const completed = Object.fromEntries(scenarioIds.map((id) => [id, { stars: id === 's3-syklisten' ? 1 : 3 }]))
    const p = dailyPlan({ ...base, mastery: m, completed })
    expect(p.focus).toContain('cyclists')
    const rep = p.items.find((i) => i.kind === 'repetition')
    expect(rep?.questionIds?.length).toBeGreaterThan(0)
    expect(p.items.find((i) => i.kind === 'challenge' || i.kind === 'scenario')?.scenarioId).toBe('s3-syklisten')
  })
})

describe('sign citations', () => {
  it('every «Skilt NNN» source matches skiltforskriften (number + name)', async () => {
    const { checkSignCitation } = await import('./signs')
    const cites = [...QUESTIONS.flatMap((q) => q.sourceMetadata), ...Object.values(RULE_CARDS).map((r) => r.source)]
      .filter((s) => s.title === 'Skiltforskriften' && s.section?.startsWith('Skilt'))
      .map((s) => s.section!)
    expect(cites.length).toBeGreaterThan(0)
    for (const c of cites) expect(checkSignCitation(c), c).not.toBeNull()
    expect(checkSignCitation('Skilt 208 Forkjørsveg')).toBeNull()
  })
})

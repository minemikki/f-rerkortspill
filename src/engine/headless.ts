import { ScenarioRunner } from './runner'
import { obbGap } from './sim'
import type { ScenarioDef } from './types'

/**
 * Headless playthrough used by tests and tuning: plays a scenario with a
 * fixed policy and reports the closest approach between actors.
 */
export interface Policy {
  /** option id per choice step */
  choices?: Record<string, string>
  /** actor ids to tap per spot step */
  taps?: Record<string, string[]>
  /** sim seconds after the reaction trigger to brake (undefined = never) */
  brakeAfter?: Record<string, number | undefined>
}

export interface PlayReport {
  outcomes: Record<string, string>
  minGap: Record<string, { gap: number; t: number }>
  freezeGaps: Array<{ step: string; gaps: Record<string, number> }>
  result: ScenarioRunner['ui']['result']
  simTime: number
  log: string[]
}

const VEHICLES = new Set(['car', 'van', 'bus'])

export function playHeadless(def: ScenarioDef, policy: Policy, opts: { maxSeconds?: number; trace?: string[] } = {}) {
  const r = new ScenarioRunner(def)
  const dt = 1 / 60
  const report: PlayReport = { outcomes: {}, minGap: {}, freezeGaps: [], result: null, simTime: 0, log: [] }
  let reactionTrigger: number | null = null
  let lastStep: string | null = null
  const maxT = opts.maxSeconds ?? 120
  let real = 0
  let lastLog = -1
  while (real < maxT) {
    real += dt
    r.update(dt)
    const ui = r.ui
    if (ui.phase === 'step' && ui.step && ui.step.id !== lastStep) {
      lastStep = ui.step.id
      const sid = ui.step.id
      report.log.push(`step ${sid} at t=${r.sim.t.toFixed(2)} player s=${r.sim.get('player').s.toFixed(1)}`)
      if (ui.step.kind === 'choice') {
        const opt = policy.choices?.[sid]
        if (opt) r.choose(opt)
      } else if (ui.step.kind === 'spot') {
        for (const id of policy.taps?.[sid] ?? []) r.tap(id)
      }
      if (ui.phase !== 'step') report.outcomes[sid] = 'resolved'
    }
    if (ui.reaction && !ui.reaction.pressed) {
      if (lastStep !== ui.reaction.stepId) {
        lastStep = ui.reaction.stepId
        reactionTrigger = r.sim.t
        report.log.push(`reaction ${ui.reaction.stepId} armed at t=${r.sim.t.toFixed(2)}`)
      }
      const after = policy.brakeAfter?.[ui.reaction.stepId]
      if (after !== undefined && reactionTrigger !== null && r.sim.t - reactionTrigger >= after) r.brake()
    }
    if (ui.phase === 'impact' || (ui.phase === 'feedback' && ui.feedback?.blocking)) {
      const fb = ui.feedback
      const sid = fb?.stepId ?? lastStep ?? '?'
      if (!report.freezeGaps.find((f) => f.step === sid)) {
        report.freezeGaps.push({ step: sid, gaps: gapsToPlayer(r) })
        report.log.push(`freeze ${sid} t=${r.sim.t.toFixed(2)} ${JSON.stringify(gapsToPlayer(r))}`)
      }
    }
    if (ui.feedback) report.outcomes[ui.feedback.stepId] = ui.feedback.outcomeId
    if (ui.phase === 'feedback' && ui.feedback?.blocking) r.continue()
    if (ui.phase === 'complete') {
      report.result = ui.result
      break
    }
    // gaps
    const actors = r.sim.actors
    for (let i = 0; i < actors.length; i++) {
      for (let j = i + 1; j < actors.length; j++) {
        const a = actors[i]
        const b = actors[j]
        if (a.def.kind === 'ball' || b.def.kind === 'ball') continue
        if (!a.view.visible || !b.view.visible) continue
        if (!VEHICLES.has(a.def.kind) && !VEHICLES.has(b.def.kind)) continue
        if (a.def.parked && b.def.parked) continue
        const key = `${a.def.id}~${b.def.id}`
        const g = obbGap(a, b)
        const cur = report.minGap[key]
        if (!cur || g < cur.gap) report.minGap[key] = { gap: g, t: r.sim.t }
      }
    }
    if (opts.trace && Math.floor(r.sim.t * 2) !== lastLog) {
      lastLog = Math.floor(r.sim.t * 2)
      report.log.push(
        `t=${r.sim.t.toFixed(1)} ` +
          opts.trace
            .map((id) => {
              const a = r.sim.get(id)
              return `${id}(${a.view.x.toFixed(1)},${a.view.z.toFixed(1)} v=${a.v.toFixed(1)} a=${a.a.toFixed(1)})`
            })
            .join(' '),
      )
    }
  }
  report.simTime = r.sim.t
  return report
}

function gapsToPlayer(r: ScenarioRunner) {
  const p = r.sim.get('player')
  const out: Record<string, number> = {}
  for (const a of r.sim.actors) {
    if (a === p || !a.view.visible || a.def.parked) continue
    const g = obbGap(p, a)
    if (g < 6) out[a.def.id] = +g.toFixed(2)
  }
  // also pairs not involving the player
  for (const a of r.sim.actors) {
    for (const b of r.sim.actors) {
      if (a.def.id >= b.def.id || a === p || b === p || a.def.parked || b.def.parked) continue
      if (!a.view.visible || !b.view.visible) continue
      const g = obbGap(a, b)
      if (g < 3) out[`${a.def.id}~${b.def.id}`] = +g.toFixed(2)
    }
  }
  return out
}

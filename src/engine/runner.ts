import { Sim, type ActorView, type SimSnapshot } from './sim'
import { scoreScenario, type ScenarioResult, type StepResult } from './scoring'
import type { CameraShot, Outcome, ScenarioDef, Step, Trigger } from './types'

/**
 * ScenarioRunner — the game loop state machine for one scenario.
 *
 *   intro → drive ⇄ step → outcome ─┬→ (toast) → drive …
 *                                   └→ impact → replay → feedback ─┬→ outcome (continue)
 *                                                                  └→ step (retry, rewinds time)
 *   … → complete
 *
 * Pure TypeScript: React only reads `ui` and calls the input methods.
 */

export type Phase = 'intro' | 'drive' | 'step' | 'outcome' | 'impact' | 'replay' | 'feedback' | 'complete'

export type UIEvent =
  | { type: 'stepStart'; kind: Step['kind'] }
  | { type: 'found'; actor: string }
  | { type: 'wrongTap'; actor: string }
  | { type: 'resolve'; result: Outcome['result']; xp: number }
  | { type: 'impact' }
  | { type: 'complete' }

export interface FeedbackState {
  stepId: string
  outcomeId: string
  result: Outcome['result']
  xp: number
  badge?: Outcome['badge']
  blocking: boolean
  highlight: string[]
  /** Distractor the player tapped (spot steps) — used for "DU SÅ …". */
  sawActor?: string
  attempt: number
  canRetry: boolean
}

export interface RunnerUI {
  phase: Phase
  stepIndex: number
  stepCount: number
  stepsDone: number
  step: null | {
    id: string
    kind: Step['kind']
    timeLimit: number
    startedAt: number
    options: string[]
    found: string[]
    targets: string[]
    attempt: number
  }
  reaction: null | { stepId: string; pressed: boolean }
  feedback: FeedbackState | null
  xp: number
  result: ScenarioResult | null
}

const INTRO_SECONDS = 2.6
const IMPACT_SECONDS = 1.15
const REPLAY_LEAD = 3.2
const REPLAY_SPEED = 0.6
const TOAST_SECONDS = 3.8

interface ActiveStep {
  step: Step
  index: number
  startedReal: number
  snapshot: SimSnapshot
  found: Set<string>
  tapped: string[]
  attempt: number
  triggerT: number
  resolveAt?: number
}

interface ActiveOutcome {
  step: Step
  outcome: Outcome
  startT: number
  frozen: boolean
  freezeT?: number
  toastShown: boolean
  toastHideAt?: number
  done: boolean
  attempt: number
  sawActor?: string
  snapshot: SimSnapshot
  index: number
}

export class ScenarioRunner {
  readonly def: ScenarioDef
  readonly sim: Sim
  phase: Phase = 'intro'
  timeScale = 0
  private targetScale = 0
  private realT = 0
  private phaseStart = 0
  private nextStep = 0
  private active: ActiveStep | null = null
  private outcome: ActiveOutcome | null = null
  private results = new Map<string, StepResult>()
  private replay: { from: number; to: number; t: number } | null = null
  private listeners = new Set<() => void>()
  private uiEvents: UIEvent[] = []
  private pendingComplete: number | null = null

  /** Camera override (step camera / replay camera). null = scenario default. */
  camera: CameraShot | null = null
  /** Actors highlighted with rings in 3D. */
  highlights: string[] = []
  /** Replay view override (null when live). */
  replayViews: ActorView[] | null = null

  ui: RunnerUI

  constructor(def: ScenarioDef) {
    this.def = def
    this.sim = new Sim(def.actors, def.cues)
    this.ui = {
      phase: 'intro',
      stepIndex: 0,
      stepCount: def.steps.length,
      stepsDone: 0,
      step: null,
      reaction: null,
      feedback: null,
      xp: 0,
      result: null,
    }
  }

  /* ───────────── subscription ───────────── */

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(patch: Partial<RunnerUI>) {
    this.ui = { ...this.ui, ...patch }
    this.listeners.forEach((l) => l())
  }

  drainUIEvents() {
    const e = this.uiEvents
    this.uiEvents = []
    return e
  }

  get now() {
    return this.realT
  }

  /** View used by the renderer for an actor (replay-aware). */
  view(index: number): ActorView {
    return this.replayViews ? this.replayViews[index] : this.sim.actors[index].view
  }

  /* ───────────── main loop ───────────── */

  update(dtReal: number) {
    const dt = Math.min(dtReal, 0.1)
    this.realT += dt
    const k = 1 - Math.exp(-dt * 7)
    this.timeScale += (this.targetScale - this.timeScale) * k
    if (Math.abs(this.targetScale - this.timeScale) < 0.002) this.timeScale = this.targetScale
    const elapsed = this.realT - this.phaseStart

    switch (this.phase) {
      case 'intro':
        if (elapsed > INTRO_SECONDS) {
          this.setPhase('drive')
          this.targetScale = 1
        }
        break
      case 'drive':
      case 'outcome':
      case 'step':
      case 'complete':
        this.sim.advance(dt * this.timeScale)
        this.afterAdvance()
        break
      case 'impact':
        if (elapsed > IMPACT_SECONDS) this.startReplay()
        break
      case 'replay': {
        const r = this.replay!
        r.t += dt * REPLAY_SPEED
        this.replayViews = this.sim.frameAt(r.t)
        if (r.t >= r.to) {
          this.replay = null
          this.replayViews = null
          this.camera = null
          this.setPhase('feedback')
        }
        break
      }
      case 'feedback':
        break
    }
  }

  private afterAdvance() {
    const sim = this.sim
    // step timers
    if (this.phase === 'step' && this.active) {
      const a = this.active
      const s = a.step
      if (a.resolveAt !== undefined && this.realT >= a.resolveAt) {
        this.resolveSpot()
      } else if (s.kind !== 'reaction' && this.realT - a.startedReal > s.timeLimit) {
        if (s.kind === 'choice') this.choose(s.timeoutOption)
        else this.resolveSpot()
      }
    }
    // reaction step armed during drive
    if (this.active && this.active.step.kind === 'reaction' && this.phase === 'drive') {
      const s = this.active.step
      if (sim.t - this.active.triggerT >= s.failAt) this.resolve(s.outcomes.fail)
    }
    // outcome progression
    if (this.phase === 'outcome' && this.outcome) {
      const o = this.outcome
      const rel = sim.t - o.startT
      const fz = o.outcome.freezeAt
      if (fz !== undefined && !o.frozen) {
        if (rel >= fz - 0.7) this.targetScale = 0.3
        if (rel >= fz) {
          o.frozen = true
          o.freezeT = sim.t
          this.timeScale = 0
          this.targetScale = 0
          this.highlights = o.outcome.highlight ?? []
          this.uiEvents.push({ type: 'impact' })
          this.setPhase('impact')
          return
        }
      }
      if (fz === undefined && !o.toastShown && rel >= (o.outcome.feedbackAt ?? 0.4)) {
        o.toastShown = true
        if (o.outcome.result === 'wrong') {
          // mistakes without a near-miss still stop the world so the player reads why
          o.frozen = true
          this.timeScale = 0
          this.targetScale = 0
          this.highlights = o.outcome.highlight ?? []
          this.setPhase('feedback')
          this.showFeedback(true)
          return
        }
        o.toastHideAt = this.realT + TOAST_SECONDS
        this.showFeedback(false)
      }
      if (o.toastShown && o.toastHideAt && this.realT > o.toastHideAt && this.ui.feedback && !this.ui.feedback.blocking) {
        this.highlights = []
        this.emit({ feedback: null })
      }
      if (!o.done && rel >= o.outcome.duration) {
        o.done = true
        if (!this.ui.feedback || !this.ui.feedback.blocking) {
          this.phase = 'drive'
          this.emit({ phase: 'drive' })
        }
      }
    }
    // next step trigger
    if ((this.phase === 'drive' || this.phase === 'outcome') && !this.active) {
      const next = this.def.steps[this.nextStep]
      if (next && this.triggered(next.trigger)) this.startStep(next, this.nextStep)
    }
    // end
    if (
      (this.phase === 'drive' || this.phase === 'outcome') &&
      !this.active &&
      this.nextStep >= this.def.steps.length &&
      this.pendingComplete === null &&
      this.triggered(this.def.end)
    ) {
      this.pendingComplete = this.realT
      this.complete()
    }
  }

  private triggered(t: Trigger) {
    if ('time' in t) return this.sim.t >= t.time
    return this.sim.get('player').s >= t.playerS
  }

  private setPhase(p: Phase) {
    this.phase = p
    this.phaseStart = this.realT
    this.emit({ phase: p })
  }

  /* ───────────── steps ───────────── */

  private startStep(step: Step, index: number, attempt = 1, snapshot?: SimSnapshot) {
    const snap = snapshot ?? this.sim.snapshot()
    if (step.setup?.commands) for (const [id, cmds] of Object.entries(step.setup.commands)) this.sim.setCommands(id, cmds)
    if (step.setup?.cues) this.sim.addCues(step.setup.cues)
    this.active = {
      step,
      index,
      startedReal: this.realT,
      snapshot: snap,
      found: new Set(),
      tapped: [],
      attempt,
      triggerT: this.sim.t,
    }
    this.outcome = null
    this.highlights = []
    this.uiEvents.push({ type: 'stepStart', kind: step.kind })
    if (step.kind === 'reaction') {
      this.phase = 'drive'
      this.targetScale = 1
      this.emit({
        phase: 'drive',
        stepIndex: index,
        feedback: null,
        reaction: { stepId: step.id, pressed: false },
        step: null,
      })
    } else {
      this.targetScale = step.slowmo ?? 0.05
      this.camera = step.camera ?? null
      this.phase = 'step'
      this.phaseStart = this.realT
      this.emit({
        phase: 'step',
        stepIndex: index,
        feedback: null,
        reaction: null,
        step: {
          id: step.id,
          kind: step.kind,
          timeLimit: step.timeLimit,
          startedAt: this.realT,
          options: step.kind === 'choice' ? step.options.map((o) => o.id) : [],
          found: [],
          targets: step.kind === 'spot' ? step.targets : [],
          attempt,
        },
      })
    }
  }

  /** Player picked an option in a choice step. */
  choose(optionId: string) {
    const a = this.active
    if (!a || a.step.kind !== 'choice' || this.phase !== 'step') return
    const opt = a.step.options.find((o) => o.id === optionId)
    if (!opt) return
    this.resolve(opt.outcome)
  }

  /** Player tapped an actor (or empty space = null) in a spot step. */
  tap(actorId: string | null) {
    const a = this.active
    if (!a || a.step.kind !== 'spot' || this.phase !== 'step' || a.resolveAt !== undefined) return
    if (!actorId) return
    const s = a.step
    if (s.targets.includes(actorId)) {
      if (a.found.has(actorId)) return
      a.found.add(actorId)
      this.highlights = [...a.found]
      this.uiEvents.push({ type: 'found', actor: actorId })
      if (a.found.size === s.targets.length) a.resolveAt = this.realT + 0.75
      this.emit({ step: this.ui.step ? { ...this.ui.step, found: [...a.found] } : null })
    } else if (s.distractors.includes(actorId)) {
      if (a.tapped.includes(actorId)) return
      a.tapped.push(actorId)
      this.uiEvents.push({ type: 'wrongTap', actor: actorId })
    }
  }

  /** Player pressed the brake in a reaction step. */
  brake() {
    const a = this.active
    if (!a || a.step.kind !== 'reaction' || this.phase !== 'drive') return
    const rel = this.sim.t - a.triggerT
    const w = a.step.windows.find((w) => rel < w.until)
    const outcome = w ? a.step.outcomes[w.outcome] : a.step.outcomes.fail
    this.emit({ reaction: { stepId: a.step.id, pressed: true } })
    this.resolve(outcome)
  }

  private resolveSpot() {
    const a = this.active
    if (!a || a.step.kind !== 'spot') return
    const s = a.step
    const missed = s.targets.filter((t) => !a.found.has(t))
    let outcome = s.outcomes.none
    if (missed.length === 0) outcome = s.outcomes.all
    else if (missed.length === 1 && s.outcomes.missed?.[missed[0]]) outcome = s.outcomes.missed[missed[0]]
    // observation score is computed from what was actually found
    const obs = Math.max(0, a.found.size / s.targets.length - 0.15 * a.tapped.length)
    const scored: Outcome = { ...outcome, scores: { ...outcome.scores, observation: obs } }
    if (missed.length === 0 && a.tapped.length > 0) {
      scored.result = 'good'
      scored.badge = undefined
      scored.xp = Math.round(outcome.xp * 0.75)
    }
    this.resolve(scored, a.tapped[0])
  }

  private resolve(outcome: Outcome, sawActor?: string) {
    const a = this.active
    if (!a) return
    const step = a.step
    this.recordResult(step, outcome, a.attempt)
    if (outcome.commands) for (const [id, cmds] of Object.entries(outcome.commands)) this.sim.setCommands(id, cmds)
    if (outcome.cues) this.sim.addCues(outcome.cues)
    this.outcome = {
      step,
      outcome,
      startT: this.sim.t,
      frozen: false,
      toastShown: false,
      done: false,
      attempt: a.attempt,
      sawActor,
      snapshot: a.snapshot,
      index: a.index,
    }
    this.nextStep = a.index + 1
    this.active = null
    this.camera = null
    this.targetScale = 1
    const positive = outcome.result === 'perfect' || outcome.result === 'good'
    this.highlights = step.kind === 'spot' ? this.highlights : positive ? (outcome.highlight ?? []) : []
    this.uiEvents.push({ type: 'resolve', result: outcome.result, xp: this.xpFor(step.id) })
    this.phase = 'outcome'
    this.phaseStart = this.realT
    this.emit({
      phase: 'outcome',
      step: null,
      reaction: null,
      stepsDone: this.nextStep,
      xp: this.totalXp(),
    })
  }

  private showFeedback(blocking: boolean) {
    const o = this.outcome
    if (!o) return
    this.emit({
      feedback: {
        stepId: o.step.id,
        outcomeId: o.outcome.id,
        result: o.outcome.result,
        xp: this.xpFor(o.step.id),
        badge: o.outcome.badge,
        blocking,
        highlight: o.outcome.highlight ?? [],
        sawActor: o.sawActor,
        attempt: o.attempt,
        canRetry: o.attempt < 3,
      },
    })
  }

  private startReplay() {
    const o = this.outcome
    if (!o || o.freezeT === undefined) {
      this.setPhase('feedback')
      return
    }
    const first = this.sim.history[0]?.t ?? o.freezeT
    const from = Math.max(first, o.freezeT - REPLAY_LEAD)
    this.replay = { from, to: o.freezeT, t: from }
    this.camera = o.outcome.replayShot ?? this.autoReplayShot(o.outcome.highlight ?? [])
    this.highlights = o.outcome.highlight ?? []
    this.setPhase('replay')
    this.showFeedback(true)
  }

  private autoReplayShot(highlight: string[]): CameraShot {
    // Steep, high shot over the conflict point — top-down views make the
    // spatial relation (who was where) obvious, also on tall phone screens.
    const p = this.sim.get('player').view
    const others = highlight.map((id) => this.sim.get(id).view)
    const pts = [p, ...others]
    const cx = pts.reduce((a, v) => a + v.x, 0) / pts.length
    const cz = pts.reduce((a, v) => a + v.z, 0) / pts.length
    const spread = Math.max(...pts.map((v) => Math.hypot(v.x - cx, v.z - cz)))
    const back = 7 + spread * 0.6
    const up = 15 + spread * 1.3
    const bx = cx - Math.sin(p.h) * back
    const bz = cz - Math.cos(p.h) * back
    return { kind: 'fixed', pos: [bx, up, bz], target: [cx, 0, cz], fov: 48 }
  }

  /** Watch the replay again (from the blocking feedback card). */
  replayAgain() {
    if (this.phase !== 'feedback' || !this.outcome) return
    this.startReplay()
  }

  /** Dismiss blocking feedback and keep playing from the near-miss. */
  continue() {
    if (this.phase === 'feedback' || this.phase === 'replay') {
      this.replay = null
      this.replayViews = null
      this.camera = null
      this.highlights = []
      this.targetScale = 1
      const done = this.outcome?.done
      this.setPhase(done ? 'drive' : 'outcome')
      this.emit({ feedback: null })
    } else if (this.ui.feedback && !this.ui.feedback.blocking) {
      this.emit({ feedback: null })
    }
  }

  /** Rewind to the start of the failed step and try again. */
  retry() {
    const o = this.outcome
    if (!o) return
    this.replay = null
    this.replayViews = null
    this.camera = null
    this.highlights = []
    this.sim.restore(o.snapshot)
    this.outcome = null
    this.nextStep = o.index
    this.emit({ feedback: null })
    this.timeScale = 0.05
    this.startStep(o.step, o.index, o.attempt + 1, o.snapshot)
  }

  /* ───────────── scoring ───────────── */

  private recordResult(step: Step, outcome: Outcome, attempt: number) {
    const prev = this.results.get(step.id)
    const r: StepResult = {
      stepId: step.id,
      outcomeId: outcome.id,
      result: outcome.result,
      tests: step.tests,
      scores: { ...outcome.scores },
      xp: outcome.xp,
      badge: outcome.badge,
      attempts: attempt,
    }
    if (prev && attempt > 1) {
      // retries teach, but the first attempt counts most
      const merged: StepResult = { ...prev, attempts: attempt }
      for (const c of step.tests) {
        merged.scores[c] = Math.max(prev.scores[c] ?? 0, (r.scores[c] ?? 0) * 0.7)
      }
      merged.xp = prev.xp + Math.round(r.xp * 0.4)
      this.results.set(step.id, merged)
    } else {
      this.results.set(step.id, r)
    }
  }

  private xpFor(stepId: string) {
    return this.results.get(stepId)?.xp ?? 0
  }

  private totalXp() {
    let x = 0
    this.results.forEach((r) => (x += r.xp))
    return x
  }

  private complete() {
    const result = scoreScenario(this.def, [...this.results.values()])
    this.targetScale = 0.35
    this.uiEvents.push({ type: 'complete' })
    this.phase = 'complete'
    this.phaseStart = this.realT
    this.emit({ phase: 'complete', result, feedback: null, step: null, reaction: null })
  }
}

import type { Category, OutcomeResult } from '../engine/types'
import { SCENARIO_SKILLS } from './bank'
import { SKILLS, type SkillId, type TheoryQuestion } from './types'

/**
 * Mastery engine — pure functions, deterministic, unit tested.
 *
 * Two independent evidence tracks per skill:
 *  - THEORY  : answering theory questions (knowing the rule)
 *  - APPLIED : what you actually did in scenarios / practice driving
 * A learner can know the høyreregel perfectly (theory 100 %) and still fail
 * to slow down in the 3D junction (applied 40 %) — the UI shows both.
 *
 * Scores are game/learning scores. They are NOT a prediction of the
 * official theory test or driving test and must never be presented as one.
 */

export interface Evidence {
  /** recency-weighted mean, 0..1 */
  score: number
  /** effective amount of evidence (decays as new evidence arrives) */
  weight: number
  /** raw number of observations */
  n: number
  last: string | null
}

export interface SkillMastery {
  theory: Evidence
  applied: Evidence
}

/** Leitner-style spaced repetition record per question. */
export interface QuestionRecord {
  attempts: number
  correct: number
  lastCorrect: boolean
  lastAt: string
  box: number
  due: string
}

export interface MasteryState {
  version: 1
  skills: Record<SkillId, SkillMastery>
  /** topic (e.g. "Vikeplikt") → theory evidence */
  topics: Record<string, Evidence>
  questions: Record<string, QuestionRecord>
}

const MAX_WEIGHT = 6 // cap → recent evidence keeps mattering
/** days until a question is due again, per Leitner box */
export const BOX_INTERVALS = [0, 1, 3, 7, 16]

const emptyEv = (): Evidence => ({ score: 0, weight: 0, n: 0, last: null })

export function emptyMastery(): MasteryState {
  const skills = {} as Record<SkillId, SkillMastery>
  for (const s of SKILLS) skills[s] = { theory: emptyEv(), applied: emptyEv() }
  return { version: 1, skills, topics: {}, questions: {} }
}

export function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(day: string, n: number) {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return isoDay(d)
}

/** Fold one observation x∈[0,1] with strength w∈(0,1] into evidence. */
export function observe(e: Evidence, x: number, w: number, day: string): Evidence {
  const weight = Math.min(MAX_WEIGHT, e.weight)
  const nw = weight + w
  return { score: (e.score * weight + x * w) / nw, weight: nw, n: e.n + 1, last: day }
}

export interface SkillDelta {
  skill: SkillId
  track: 'theory' | 'applied'
  before: number | null
  after: number
}

function snapshot(state: MasteryState, track: 'theory' | 'applied') {
  const out = {} as Record<SkillId, number | null>
  for (const s of SKILLS) out[s] = state.skills[s][track].n ? state.skills[s][track].score : null
  return out
}

function diff(before: Record<SkillId, number | null>, state: MasteryState, track: 'theory' | 'applied'): SkillDelta[] {
  const out: SkillDelta[] = []
  for (const s of SKILLS) {
    const e = state.skills[s][track]
    if (!e.n) continue
    if (before[s] === null || Math.abs((before[s] ?? 0) - e.score) > 1e-9) out.push({ skill: s, track, before: before[s], after: e.score })
  }
  return out
}

/* ───────────── theory evidence ───────────── */

export function recordTheoryAnswer(state: MasteryState, q: TheoryQuestion, correct: boolean, at: Date): { state: MasteryState; deltas: SkillDelta[] } {
  const day = isoDay(at)
  const before = snapshot(state, 'theory')
  const next: MasteryState = structuredClone(state)
  // harder questions are stronger evidence when right, weaker when wrong
  const strength = (d: number) => (correct ? 0.6 + d * 0.2 : 1.1 - d * 0.2)
  for (const [skill, w] of Object.entries(q.skills) as Array<[SkillId, number]>) {
    next.skills[skill].theory = observe(next.skills[skill].theory, correct ? 1 : 0, w * strength(q.difficulty), day)
  }
  next.topics[q.topic] = observe(next.topics[q.topic] ?? emptyEv(), correct ? 1 : 0, 1, day)
  const rec = next.questions[q.id]
  const box = correct ? Math.min(BOX_INTERVALS.length - 1, (rec?.box ?? 0) + 1) : 0
  next.questions[q.id] = {
    attempts: (rec?.attempts ?? 0) + 1,
    correct: (rec?.correct ?? 0) + (correct ? 1 : 0),
    lastCorrect: correct,
    lastAt: day,
    box,
    due: addDays(day, correct ? BOX_INTERVALS[box] : 0),
  }
  return { state: next, deltas: diff(before, next, 'theory') }
}

/* ───────────── applied evidence ───────────── */

const CATEGORY_SKILL: Record<Category, SkillId> = {
  rules: 'trafficRules',
  observation: 'observation',
  risk: 'riskUnderstanding',
  reaction: 'hazardAwareness',
}

export interface AppliedStep {
  result: OutcomeResult
  tests: Category[]
  scores: Partial<Record<Category, number>>
  attempts: number
}

/**
 * A scenario run is applied evidence. Only the FIRST attempt of each step
 * counts at full strength — a retry after seeing the replay shows learning,
 * but is weaker evidence of what you would do on the road.
 */
export function recordScenario(state: MasteryState, scenarioId: string, steps: AppliedStep[], at: Date): { state: MasteryState; deltas: SkillDelta[] } {
  const day = isoDay(at)
  const before = snapshot(state, 'applied')
  const next: MasteryState = structuredClone(state)
  if (!steps.length) return { state: next, deltas: [] }
  const firstTry = (s: AppliedStep) => (s.attempts <= 1 ? 1 : 0.5)
  // per tested category
  for (const st of steps)
    for (const c of st.tests) {
      const skill = CATEGORY_SKILL[c]
      next.skills[skill].applied = observe(next.skills[skill].applied, st.scores[c] ?? 0, 0.8 * firstTry(st), day)
    }
  // topic skills of the scenario, from the mean step score
  const mean =
    steps.reduce((a, s) => {
      const v = Object.values(s.scores) as number[]
      return a + (v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0)
    }, 0) / steps.length
  const strength = steps.every((s) => s.attempts <= 1) ? 1 : 0.6
  for (const [skill, w] of Object.entries(SCENARIO_SKILLS[scenarioId] ?? {}) as Array<[SkillId, number]>) {
    if (Object.values(CATEGORY_SKILL).includes(skill) && steps.some((s) => s.tests.some((c) => CATEGORY_SKILL[c] === skill))) continue
    next.skills[skill].applied = observe(next.skills[skill].applied, mean, w * strength, day)
  }
  return { state: next, deltas: diff(before, next, 'applied') }
}

/** Practice-drive assessment (0..1 per area) → applied evidence. */
export function recordPractice(
  state: MasteryState,
  a: { observation: number; speedAdaptation: number; positioning: number; trafficRules: number },
  at: Date,
): { state: MasteryState; deltas: SkillDelta[] } {
  const day = isoDay(at)
  const before = snapshot(state, 'applied')
  const next: MasteryState = structuredClone(state)
  for (const k of ['observation', 'speedAdaptation', 'positioning', 'trafficRules'] as const) next.skills[k].applied = observe(next.skills[k].applied, a[k], 1, day)
  next.skills.intersections.applied = observe(next.skills.intersections.applied, (a.trafficRules + a.observation) / 2, 0.6, day)
  return { state: next, deltas: diff(before, next, 'applied') }
}

/* ───────────── read-outs ───────────── */

export type MasteryLevel = 'ny' | 'øver' | 'på vei' | 'sikker'

export const LEVEL_LABELS: Record<MasteryLevel, string> = { ny: 'Ikke testet', øver: 'Øver', 'på vei': 'På vei', sikker: 'Sikker' }

export function levelOf(e: Evidence): MasteryLevel {
  if (e.n === 0 || e.weight < 0.6) return 'ny'
  if (e.score < 0.5) return 'øver'
  if (e.score < 0.8 || e.weight < 2) return 'på vei'
  return 'sikker'
}

export interface SkillSummary {
  skill: SkillId
  theory: number | null
  applied: number | null
  theoryLevel: MasteryLevel
  appliedLevel: MasteryLevel
  /** theory known but not applied (or vice versa) — a key teaching signal */
  gap: 'knows-not-does' | 'does-not-knows' | null
}

export function summarize(state: MasteryState): SkillSummary[] {
  return SKILLS.map((skill) => {
    const t = state.skills[skill].theory
    const a = state.skills[skill].applied
    const theory = t.n ? t.score : null
    const applied = a.n ? a.score : null
    let gap: SkillSummary['gap'] = null
    if (theory !== null && applied !== null) {
      if (theory - applied > 0.3) gap = 'knows-not-does'
      else if (applied - theory > 0.3) gap = 'does-not-knows'
    }
    return { skill, theory, applied, theoryLevel: levelOf(t), appliedLevel: levelOf(a), gap }
  })
}

/** Priority for training: low or unknown evidence first. Unknown counts as 0.35 so new skills get introduced. */
export function weakness(state: MasteryState, skill: SkillId) {
  const t = state.skills[skill].theory
  const a = state.skills[skill].applied
  const v = (e: Evidence) => (e.n ? e.score * Math.min(1, e.weight / 2) + 0.35 * (1 - Math.min(1, e.weight / 2)) : 0.35)
  return 1 - (v(t) * 0.45 + v(a) * 0.55)
}

export function dueQuestions(state: MasteryState, today: Date): string[] {
  const day = isoDay(today)
  return Object.entries(state.questions)
    .filter(([, r]) => r.due <= day)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : a[0] < b[0] ? -1 : 1))
    .map(([id]) => id)
}

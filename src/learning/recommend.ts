import { QUESTIONS, SCENARIO_SKILLS } from './bank'
import { dueQuestions, weakness, type MasteryState } from './mastery'
import { SKILLS, SKILL_LABELS, type SkillId } from './types'

/**
 * "DIN TRENING I DAG" — a deterministic daily plan of ~12–14 minutes:
 *   1 scenario (new, or the one that trains your weakest skill)
 *   + targeted theory  + spaced repetition  + one challenge.
 * Same input → same plan (no randomness), so it is testable and explainable:
 * every item carries a human-readable reason.
 */

export type PlanKind = 'scenario' | 'theory' | 'repetition' | 'challenge' | 'practice'

export interface PlanItem {
  kind: PlanKind
  title: string
  reason: string
  minutes: number
  scenarioId?: string
  questionIds?: string[]
}

export interface PlanInput {
  mastery: MasteryState
  /** best stars per completed scenario */
  completed: Record<string, { stars: number }>
  scenarioOrder: string[]
  titleOf: (scenarioId: string) => string
  today: Date
  practiceUnlocked: boolean
}

export const MIN_PER_SCENARIO = 3
export const MIN_PER_QUESTION = 0.5
export const MIN_PRACTICE = 4
export const TARGET_MINUTES: [number, number] = [12, 14]

export function weakestSkills(m: MasteryState, n: number): SkillId[] {
  return [...SKILLS].sort((a, b) => weakness(m, b) - weakness(m, a) || SKILLS.indexOf(a) - SKILLS.indexOf(b)).slice(0, n)
}

function scenarioFor(skill: SkillId, pool: string[]): string | null {
  let best: string | null = null
  let bw = 0
  for (const id of pool) {
    const w = SCENARIO_SKILLS[id]?.[skill] ?? 0
    if (w > bw) {
      bw = w
      best = id
    }
  }
  return best
}

export function dailyPlan(p: PlanInput): { items: PlanItem[]; minutes: number; focus: SkillId[] } {
  const items: PlanItem[] = []
  const focus = weakestSkills(p.mastery, 2)
  const done = p.scenarioOrder.filter((id) => p.completed[id])
  const fresh = p.scenarioOrder.find((id) => !p.completed[id])

  // 1 · scenario
  if (fresh) {
    items.push({ kind: 'scenario', scenarioId: fresh, title: p.titleOf(fresh), reason: 'Neste situasjon på kartet', minutes: MIN_PER_SCENARIO })
  } else {
    const id = scenarioFor(focus[0], done) ?? done[0]
    items.push({ kind: 'scenario', scenarioId: id, title: p.titleOf(id), reason: `Trener ${SKILL_LABELS[focus[0]].toLowerCase()} – ditt svakeste område nå`, minutes: MIN_PER_SCENARIO })
  }
  const usedScenario = new Set(items.map((i) => i.scenarioId))

  // 2 · spaced repetition (questions you got wrong / that are due)
  const due = dueQuestions(p.mastery, p.today).slice(0, 5)
  if (due.length) items.push({ kind: 'repetition', questionIds: due, title: `${due.length} spørsmål til repetisjon`, reason: 'Spørsmål du bommet på, eller som er klare for repetisjon', minutes: due.length * MIN_PER_QUESTION })

  // 3 · challenge (3 stars on a weak-skill scenario) or practice driving
  const challengePool = done.filter((id) => (p.completed[id]?.stars ?? 0) < 3 && !usedScenario.has(id))
  const ch = scenarioFor(focus[1], challengePool) ?? scenarioFor(focus[0], challengePool) ?? challengePool[0]
  if (ch) items.push({ kind: 'challenge', scenarioId: ch, title: `3 stjerner: ${p.titleOf(ch)}`, reason: 'Du har ikke full uttelling her ennå', minutes: MIN_PER_SCENARIO })
  else if (p.practiceUnlocked) items.push({ kind: 'practice', title: 'Øvelseskjøring i boligfeltet', reason: 'Kjør selv med instruktør – bruk det du har lært', minutes: MIN_PRACTICE })
  else {
    // brand-new learner: a second new situation instead of a challenge
    const second = p.scenarioOrder.find((id) => !p.completed[id] && !usedScenario.has(id))
    if (second) items.push({ kind: 'scenario', scenarioId: second, title: p.titleOf(second), reason: 'Når du er varm i trøya', minutes: MIN_PER_SCENARIO })
  }

  // 4 · targeted theory fills the rest of the session up to the target length
  const used = items.reduce((a, i) => a + i.minutes, 0)
  const nQ = Math.max(4, Math.min(12, Math.round((TARGET_MINUTES[0] + 1 - used) / MIN_PER_QUESTION)))
  const dueSet = new Set(due)
  const ranked = QUESTIONS.filter((q) => !dueSet.has(q.id))
    .map((q) => {
      const rec = p.mastery.questions[q.id]
      const rel = focus.reduce((a, s, i) => a + (q.skills[s] ?? 0) * (i === 0 ? 1 : 0.7), 0)
      const novelty = rec ? (rec.lastCorrect ? -0.6 - rec.box * 0.2 : 0.3) : 0.5
      return { id: q.id, v: rel + novelty }
    })
    .sort((a, b) => b.v - a.v || (a.id < b.id ? -1 : 1))
    .slice(0, nQ)
    .map((x) => x.id)
  items.splice(1, 0, {
    kind: 'theory',
    questionIds: ranked,
    title: `${ranked.length} teorispørsmål`,
    reason: `Fokus: ${focus.map((f) => SKILL_LABELS[f].toLowerCase()).join(' og ')}`,
    minutes: ranked.length * MIN_PER_QUESTION,
  })

  const minutes = items.reduce((a, i) => a + i.minutes, 0)
  return { items, minutes, focus }
}

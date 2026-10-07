import { CATEGORIES, type BadgeId, type Category, type OutcomeResult, type ScenarioDef } from './types'

export interface StepResult {
  stepId: string
  outcomeId: string
  result: OutcomeResult
  tests: Category[]
  scores: Partial<Record<Category, number>>
  xp: number
  badge?: BadgeId
  attempts: number
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface ScenarioResult {
  scenarioId: string
  categories: Partial<Record<Category, number>> // 0..100
  total: number // 0..100
  grade: Grade
  stars: 0 | 1 | 2 | 3
  xp: number
  stepXp: number
  bonusXp: number
  badges: BadgeId[]
  steps: StepResult[]
  perfect: boolean
}

export function gradeFor(pct: number): Grade {
  if (pct >= 90) return 'A'
  if (pct >= 80) return 'B'
  if (pct >= 65) return 'C'
  if (pct >= 50) return 'D'
  if (pct >= 35) return 'E'
  return 'F'
}

export function starsFor(pct: number): 0 | 1 | 2 | 3 {
  if (pct >= 90) return 3
  if (pct >= 65) return 2
  if (pct >= 30) return 1
  return 0
}

export function scoreScenario(def: ScenarioDef, steps: StepResult[]): ScenarioResult {
  const categories: Partial<Record<Category, number>> = {}
  for (const c of CATEGORIES) {
    const vals = steps.filter((s) => s.tests.includes(c)).map((s) => s.scores[c] ?? 0)
    if (vals.length) categories[c] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100)
  }
  const present = Object.values(categories) as number[]
  const total = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : 0
  const stars = starsFor(total)
  const stepXp = steps.reduce((a, s) => a + s.xp, 0)
  const bonusXp = def.completionXp + (stars === 3 ? 15 : 0)
  const badges = [...new Set(steps.map((s) => s.badge).filter(Boolean) as BadgeId[])]
  if (def.boss && total >= 80) badges.push('boss-city')
  const perfect = steps.every((s) => s.result === 'perfect' && s.attempts === 1)
  return {
    scenarioId: def.id,
    categories,
    total,
    grade: gradeFor(total),
    stars,
    xp: stepXp + bonusXp,
    stepXp,
    bonusXp,
    badges,
    steps,
    perfect,
  }
}

/* ───────────── Player level ───────────── */

export const LEVELS = [
  { xp: 0, name: 'Nybegynner' },
  { xp: 120, name: 'Øvelseskjører' },
  { xp: 300, name: 'Bykjører' },
  { xp: 600, name: 'Trafikkleser' },
  { xp: 1000, name: 'Veiveteran' },
  { xp: 1600, name: 'Landeveisfører' },
  { xp: 2400, name: 'Mørkekjører' },
  { xp: 3400, name: 'Vinterfører' },
]

export function levelFor(xp: number) {
  let i = 0
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++
  const cur = LEVELS[i]
  const next = LEVELS[i + 1]
  return {
    level: i + 1,
    name: cur.name,
    from: cur.xp,
    to: next?.xp ?? cur.xp,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
  }
}

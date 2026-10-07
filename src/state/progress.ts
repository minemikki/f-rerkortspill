import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { levelFor, type ScenarioResult } from '../engine/scoring'
import type { BadgeId } from '../engine/types'

export interface ScenarioRecord {
  stars: number
  best: number
  grade: string
  plays: number
}

export interface CompletionSummary {
  xpBefore: number
  xpAfter: number
  levelBefore: number
  levelAfter: number
  streakBefore: number
  streakAfter: number
  newBadges: BadgeId[]
  improvedStars: boolean
}

interface ProgressState {
  xp: number
  streak: number
  lastPlayed: string | null
  results: Record<string, ScenarioRecord>
  badges: BadgeId[]
  sound: boolean
  completeScenario: (r: ScenarioResult) => CompletionSummary
  setSound: (on: boolean) => void
  reset: () => void
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(a: string, b: string) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: 0,
      lastPlayed: null,
      results: {},
      badges: [],
      sound: true,
      completeScenario: (r) => {
        const s = get()
        const t = today()
        let streak = s.streak
        if (!s.lastPlayed) streak = 1
        else {
          const gap = daysBetween(s.lastPlayed, t)
          if (gap === 1) streak = s.streak + 1
          else if (gap > 1) streak = 1
          else streak = Math.max(1, s.streak)
        }
        const prev = s.results[r.scenarioId]
        // repeat plays give reduced XP so grinding the same level isn't the best path
        const xpGain = prev ? Math.round(r.xp * 0.35) : r.xp
        const rec: ScenarioRecord = {
          stars: Math.max(prev?.stars ?? 0, r.stars),
          best: Math.max(prev?.best ?? 0, r.total),
          grade: prev && prev.best > r.total ? prev.grade : r.grade,
          plays: (prev?.plays ?? 0) + 1,
        }
        const newBadges = r.badges.filter((b) => !s.badges.includes(b))
        const xpAfter = s.xp + xpGain
        set({
          xp: xpAfter,
          streak,
          lastPlayed: t,
          results: { ...s.results, [r.scenarioId]: rec },
          badges: [...s.badges, ...newBadges],
        })
        return {
          xpBefore: s.xp,
          xpAfter,
          levelBefore: levelFor(s.xp).level,
          levelAfter: levelFor(xpAfter).level,
          streakBefore: s.streak,
          streakAfter: streak,
          newBadges,
          improvedStars: (prev?.stars ?? 0) < r.stars,
        }
      },
      setSound: (on) => set({ sound: on }),
      reset: () => set({ xp: 0, streak: 0, lastPlayed: null, results: {}, badges: [] }),
    }),
    { name: 'kjor-progress-v1' },
  ),
)

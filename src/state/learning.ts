import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScenarioResult } from '../engine/scoring'
import { QUESTION_BY_ID } from '../learning/bank'
import { emptyMastery, recordPractice, recordScenario, recordTheoryAnswer, type MasteryState, type SkillDelta } from '../learning/mastery'

/** Local-only learning state (no accounts in this phase). */
interface LearningState {
  mastery: MasteryState
  /** practice drive assessments, newest last (max 20) */
  practiceLog: Array<{ at: string; total: number; areas: Record<string, number> }>
  theoryTests: Array<{ at: string; correct: number; total: number; timed: boolean }>
  answer: (questionId: string, correct: boolean) => SkillDelta[]
  scenarioDone: (r: ScenarioResult) => SkillDelta[]
  practiceDone: (a: { observation: number; speedAdaptation: number; positioning: number; trafficRules: number }) => SkillDelta[]
  theoryTestDone: (correct: number, total: number, timed: boolean) => void
  reset: () => void
}

export const useLearning = create<LearningState>()(
  persist(
    (set, get) => ({
      mastery: emptyMastery(),
      practiceLog: [],
      theoryTests: [],
      answer: (id, correct) => {
        const q = QUESTION_BY_ID.get(id)
        if (!q) return []
        const r = recordTheoryAnswer(get().mastery, q, correct, new Date())
        set({ mastery: r.state })
        return r.deltas
      },
      scenarioDone: (res) => {
        const r = recordScenario(
          get().mastery,
          res.scenarioId,
          res.steps.map((s) => ({ result: s.result, tests: s.tests, scores: s.scores, attempts: s.attempts })),
          new Date(),
        )
        set({ mastery: r.state })
        return r.deltas
      },
      practiceDone: (a) => {
        const r = recordPractice(get().mastery, a, new Date())
        const total = (a.observation + a.speedAdaptation + a.positioning + a.trafficRules) / 4
        set({ mastery: r.state, practiceLog: [...get().practiceLog.slice(-19), { at: new Date().toISOString(), total, areas: a }] })
        return r.deltas
      },
      theoryTestDone: (correct, total, timed) => set({ theoryTests: [...get().theoryTests.slice(-19), { at: new Date().toISOString(), correct, total, timed }] }),
      reset: () => set({ mastery: emptyMastery(), practiceLog: [], theoryTests: [] }),
    }),
    { name: 'kjor-learning-v1' },
  ),
)

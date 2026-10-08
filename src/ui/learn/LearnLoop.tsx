import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { QUESTION_BY_ID, SCENARIO_LOOP, SCENARIO_SKILLS } from '../../learning/bank'
import type { SkillDelta } from '../../learning/mastery'
import type { SkillId } from '../../learning/types'
import { useLearning } from '../../state/learning'
import { IconArrow } from '../components/Icons'
import { MasteryBars, RulePanel } from './RulePanel'
import { isComplete, isCorrect, QuestionView, type Answer } from './QuestionView'

/**
 * The learning loop after a scenario:
 *   LÆR REGELEN → 3 contextual theory questions → 1 recall variant → mastery update.
 * Short by design (≈ 90 s). Skippable — but skipping gives no theory evidence.
 */
type Stage = { k: 'rule' } | { k: 'q'; i: number } | { k: 'recall' } | { k: 'mastery' }

export function LearnLoop({ scenarioId, appliedDeltas, onDone }: { scenarioId: string; appliedDeltas: SkillDelta[]; onDone: () => void }) {
  const loop = SCENARIO_LOOP[scenarioId]
  const questions = useMemo(() => (loop ? loop.questions.map((id) => QUESTION_BY_ID.get(id)!) : []), [loop])
  const recall = loop ? QUESTION_BY_ID.get(loop.recall)! : null
  const answerQ = useLearning((s) => s.answer)
  const mastery = useLearning((s) => s.mastery)
  const [stage, setStage] = useState<Stage>({ k: 'rule' })
  const [answer, setAnswer] = useState<Answer>(null)
  const [revealed, setRevealed] = useState(false)
  const [deltas, setDeltas] = useState<SkillDelta[]>(appliedDeltas)
  const [score, setScore] = useState(0)

  if (!loop || !recall) return null
  const current = stage.k === 'q' ? questions[stage.i] : stage.k === 'recall' ? recall : null
  const step = stage.k === 'rule' ? 0 : stage.k === 'q' ? stage.i + 1 : stage.k === 'recall' ? 4 : 5

  const check = () => {
    if (!current) return
    const ok = isCorrect(current, answer)
    sfx.play(ok ? 'correct' : 'miss')
    haptic(ok ? [12, 40, 18] : [10, 30, 10])
    const d = answerQ(current.id, ok)
    // keep the latest delta per (skill, track) but the earliest "before"
    setDeltas((prev) => {
      const out = [...prev]
      for (const x of d) {
        const i = out.findIndex((y) => y.skill === x.skill && y.track === x.track)
        if (i >= 0) out[i] = { ...x, before: out[i].before }
        else out.push(x)
      }
      return out
    })
    if (ok) setScore((s) => s + 1)
    setRevealed(true)
  }
  const next = () => {
    sfx.play('tap')
    setAnswer(null)
    setRevealed(false)
    if (stage.k === 'rule') setStage({ k: 'q', i: 0 })
    else if (stage.k === 'q') setStage(stage.i < questions.length - 1 ? { k: 'q', i: stage.i + 1 } : { k: 'recall' })
    else if (stage.k === 'recall') setStage({ k: 'mastery' })
    else onDone()
  }
  const skills = Object.keys(SCENARIO_SKILLS[scenarioId] ?? {}) as SkillId[]

  return (
    <motion.div
      className="absolute inset-0 z-40 flex justify-center overflow-y-auto bg-ink/55 px-4 pb-[calc(24px+var(--safe-bottom))] pt-[calc(20px+var(--safe-top))] backdrop-blur-[3px] sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="panel relative my-auto w-full max-w-[560px] rounded-[28px] p-5 sm:p-7">
        {/* progress pips */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-signal' : i === step ? 'bg-snow' : 'bg-white/10'}`} />
            ))}
          </div>
          {stage.k !== 'mastery' && (
            <button className="text-[12px] font-bold text-fog hover:text-snow" onClick={onDone}>
              Hopp over
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={stage.k + ('i' in stage ? stage.i : '')} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            {stage.k === 'rule' && (
              <>
                <RulePanel scenarioId={scenarioId} />
                <p className="mt-5 text-[14px] text-mist">Tre korte spørsmål om det du nettopp kjørte, og én variant av situasjonen.</p>
              </>
            )}
            {current && (
              <>
                {stage.k === 'recall' && <p className="eyebrow mb-3 text-[10px] text-ice">Variant · samme regel, ny situasjon</p>}
                <QuestionView q={current} answer={answer} onAnswer={setAnswer} reveal={revealed} compact />
              </>
            )}
            {stage.k === 'mastery' && (
              <>
                <p className="eyebrow text-[10px] text-signal">Mestring oppdatert</p>
                <h3 className="display-tight mt-1 text-[26px]">
                  {score}/{questions.length + 1} riktige
                </h3>
                <p className="mb-4 mt-1 text-[14px] text-mist">Teori er det du vet. «I trafikken» er det du gjorde i situasjonen.</p>
                <MasteryBars mastery={mastery} deltas={deltas} only={skills} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-6">
          {current && !revealed ? (
            <button className="btn btn-primary h-[58px] w-full text-[16px] disabled:opacity-40" disabled={!isComplete(current, answer)} onClick={check}>
              Sjekk svar
            </button>
          ) : (
            <button className="btn btn-primary h-[58px] w-full text-[16px]" onClick={next}>
              {stage.k === 'rule' ? 'Test deg selv' : stage.k === 'mastery' ? 'Se resultat' : 'Neste'} <IconArrow />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { WORLDS } from '../../content/world'
import { QUESTION_BY_ID } from '../../learning/bank'
import { dailyPlan, type PlanItem } from '../../learning/recommend'
import { SKILL_LABELS } from '../../learning/types'
import { CONTENT } from '../../scenarios'
import { useLearning } from '../../state/learning'
import { useNav } from '../../state/nav'
import { useProgress } from '../../state/progress'
import { IconArrow, IconClose } from '../components/Icons'
import { MasteryBars } from './RulePanel'
import { isComplete, isCorrect, QuestionView, type Answer } from './QuestionView'

const KIND: Record<PlanItem['kind'], { label: string; color: string }> = {
  scenario: { label: 'Situasjon', color: 'text-signal' },
  theory: { label: 'Teori', color: 'text-ice' },
  repetition: { label: 'Repetisjon', color: 'text-go' },
  challenge: { label: 'Utfordring', color: 'text-stop' },
  practice: { label: 'Kjør selv', color: 'text-signal' },
}

export function DailyPlanCard() {
  const go = useNav((s) => s.go)
  const results = useProgress((s) => s.results)
  const mastery = useLearning((s) => s.mastery)
  const [quiz, setQuiz] = useState<{ title: string; ids: string[] } | null>(null)
  const [showMastery, setShowMastery] = useState(false)
  const plan = useMemo(
    () =>
      dailyPlan({
        mastery,
        completed: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { stars: v.stars }])),
        scenarioOrder: WORLDS[0].scenarios,
        titleOf: (id) => CONTENT[id]?.title ?? id,
        today: new Date(),
        practiceUnlocked: !!results['s1-hoyreregel'],
      }),
    [mastery, results],
  )
  const open = (it: PlanItem) => {
    sfx.unlock()
    sfx.play('tap')
    haptic(10)
    if (it.scenarioId) go('play', it.scenarioId)
    else if (it.questionIds) setQuiz({ title: it.title, ids: it.questionIds })
    else if (it.kind === 'practice') go('practice', 'practice')
  }
  const hasEvidence = Object.values(mastery.skills).some((s) => s.theory.n || s.applied.n)
  return (
    <section className="panel rounded-[28px] p-5" aria-labelledby="plan-h">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="plan-h" className="display-tight text-[24px]">
          Din trening i dag
        </h2>
        <span className="num shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[12px] font-extrabold">≈ {Math.round(plan.minutes)} min</span>
      </div>
      <p className="mt-1 text-[13px] text-fog">Fokus: {plan.focus.map((f) => SKILL_LABELS[f].toLowerCase()).join(' og ')}</p>
      <ol className="mt-4 space-y-2">
        {plan.items.map((it, k) => (
          <li key={k}>
            <button onClick={() => open(it)} className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3.5 py-2.5 text-left ring-1 ring-white/8 transition-colors hover:bg-white/[0.08]">
              <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-[13px] font-black">{k + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`eyebrow block text-[9.5px] ${KIND[it.kind].color}`}>{KIND[it.kind].label}</span>
                <span className="block truncate text-[15px] font-bold">{it.title}</span>
                <span className="block truncate text-[12px] text-fog">{it.reason}</span>
              </span>
              <span className="num shrink-0 text-[12px] font-bold text-fog">{Math.round(it.minutes * 10) / 10} min</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn btn-ghost h-[50px] px-2 text-[13px] !normal-case !tracking-normal" onClick={() => go('theory')}>
          Teoritrening
        </button>
        <button className="btn btn-ghost h-[50px] px-2 text-[13px] !normal-case !tracking-normal" onClick={() => go('practice', 'practice')}>
          Kjør selv
        </button>
      </div>
      {hasEvidence && (
        <button className="mt-3 w-full text-center text-[12px] font-bold text-fog hover:text-snow" onClick={() => setShowMastery((v) => !v)} aria-expanded={showMastery}>
          {showMastery ? 'Skjul mestring' : 'Vis mestring: teori og i trafikken'}
        </button>
      )}
      {showMastery && (
        <div className="mt-4">
          <MasteryBars mastery={mastery} />
        </div>
      )}
      <AnimatePresence>{quiz && <QuizSheet title={quiz.title} ids={quiz.ids} onClose={() => setQuiz(null)} />}</AnimatePresence>
    </section>
  )
}

/** Quick learn-mode quiz (immediate feedback), used for plan items. */
export function QuizSheet({ title, ids, onClose }: { title: string; ids: string[]; onClose: () => void }) {
  const qs = ids.map((id) => QUESTION_BY_ID.get(id)!).filter(Boolean)
  const record = useLearning((s) => s.answer)
  const [i, setI] = useState(0)
  const [a, setA] = useState<Answer>(null)
  const [rev, setRev] = useState(false)
  const [ok, setOk] = useState(0)
  const done = i >= qs.length
  const q = qs[i]
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink/75 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="panel relative max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] p-5 pb-[calc(20px+var(--safe-bottom))] sm:rounded-[28px] sm:p-7"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-[10px] text-signal">{title}</div>
            {!done && (
              <div className="num text-[12px] text-fog">
                {i + 1} / {qs.length}
              </div>
            )}
          </div>
          <button aria-label="Lukk" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/6 ring-1 ring-white/10">
            <IconClose size={16} />
          </button>
        </div>
        {done ? (
          <div className="py-6 text-center">
            <div className="display text-[64px] text-signal">
              {ok}/{qs.length}
            </div>
            <p className="mt-2 text-[14px] text-mist">Mestringen din er oppdatert.</p>
            <button className="btn btn-primary mt-6 h-[56px] w-full text-[15px]" onClick={onClose}>
              Ferdig
            </button>
          </div>
        ) : (
          <>
            <QuestionView key={q.id} q={q} answer={a} onAnswer={setA} reveal={rev} compact />
            <div className="mt-5">
              {!rev ? (
                <button
                  className="btn btn-primary h-[56px] w-full text-[15px] disabled:opacity-40"
                  disabled={!isComplete(q, a)}
                  onClick={() => {
                    const c = isCorrect(q, a)
                    record(q.id, c)
                    if (c) setOk((x) => x + 1)
                    sfx.play(c ? 'correct' : 'miss')
                    setRev(true)
                  }}
                >
                  Sjekk svar
                </button>
              ) : (
                <button
                  className="btn btn-primary h-[56px] w-full text-[15px]"
                  onClick={() => {
                    setI(i + 1)
                    setA(null)
                    setRev(false)
                  }}
                >
                  Neste <IconArrow />
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

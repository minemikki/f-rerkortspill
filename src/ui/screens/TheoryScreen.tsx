import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { QUESTIONS } from '../../learning/bank'
import { THEORY_CATEGORY_LABELS, type TheoryCategory, type TheoryQuestion } from '../../learning/types'
import { CONTENT } from '../../scenarios'
import { useLearning } from '../../state/learning'
import { useNav } from '../../state/nav'
import { IconArrow, IconBack } from '../components/Icons'
import { isComplete, isCorrect, QuestionView, type Answer } from '../learn/QuestionView'

/**
 * TEORITRENING — theory test demonstrator.
 * Practice tool only: question pool, timing and pass mark are NOT the
 * official Statens vegvesen theory test and must not be presented as such.
 */

const SECONDS_PER_Q = 90

function seeded(n: number, seed: number) {
  const idx = Array.from({ length: n }, (_, i) => i)
  let s = seed
  for (let i = n - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

type Phase = { k: 'setup' } | { k: 'test' } | { k: 'result' }

export function TheoryScreen() {
  const go = useNav((s) => s.go)
  const [phase, setPhase] = useState<Phase>({ k: 'setup' })
  const [count, setCount] = useState<10 | 21>(10)
  const [timed, setTimed] = useState(true)
  const [qs, setQs] = useState<TheoryQuestion[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [i, setI] = useState(0)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [confirm, setConfirm] = useState(false)
  const record = useLearning((s) => s.answer)
  const testDone = useLearning((s) => s.theoryTestDone)

  const start = () => {
    sfx.unlock()
    sfx.play('whoosh')
    const day = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
    const order = seeded(QUESTIONS.length, day).slice(0, Math.min(count, QUESTIONS.length))
    const list = order.map((k) => QUESTIONS[k])
    setQs(list)
    setAnswers(list.map(() => null))
    setI(0)
    setDeadline(timed ? Date.now() + list.length * SECONDS_PER_Q * 1000 : null)
    setPhase({ k: 'test' })
  }

  const submit = () => {
    setConfirm(false)
    let correct = 0
    qs.forEach((q, k) => {
      const ok = isCorrect(q, answers[k])
      if (ok) correct++
      if (answers[k] !== null) record(q.id, ok)
    })
    testDone(correct, qs.length, timed)
    sfx.play(correct / qs.length >= 0.8 ? 'levelUp' : 'good')
    haptic([12, 40, 18])
    setPhase({ k: 'result' })
  }

  return (
    <div className="relative h-full overflow-y-auto bg-ink no-scrollbar">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-ink via-ink/95 to-transparent px-4 pb-4 pt-[calc(var(--safe-top)+12px)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button aria-label="Tilbake" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/6 ring-1 ring-white/10" onClick={() => (phase.k === 'test' ? setConfirm(true) : go('map'))}>
            <IconBack size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-[10px] text-signal">Teoritrening</div>
            <div className="truncate text-[13px] font-bold text-fog">Øving – ikke den offisielle teoriprøven</div>
          </div>
          {phase.k === 'test' && deadline && <Countdown deadline={deadline} onEnd={submit} />}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-[calc(var(--safe-bottom)+40px)]">
        {phase.k === 'setup' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="display mt-4 text-[clamp(44px,12vw,72px)]">
              Teori&shy;prøve
              <br />
              <span className="text-signal">på trening</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mist">
              Svar uten hint. Du får se fasit, forklaring og kilde etterpå – og kan hoppe rett til situasjonen i spillet som trener det du bommet på.
            </p>
            <div className="mt-8 space-y-5">
              <Choice label="Antall spørsmål" value={count} options={[10, 21]} render={(v) => (v === 21 ? 'Alle (21)' : String(v))} onChange={(v) => setCount(v as 10 | 21)} />
              <Choice label="Tid" value={timed ? 1 : 0} options={[1, 0]} render={(v) => (v ? `Med tid (${SECONDS_PER_Q} s per spm.)` : 'Uten tid')} onChange={(v) => setTimed(!!v)} />
            </div>
            <button className="btn btn-primary mt-10 h-[60px] w-full text-[16px] sm:w-auto sm:px-12" onClick={start}>
              Start <IconArrow />
            </button>
            <p className="mt-6 text-[12px] leading-snug text-fog">
              Spørsmålene er utkast og er ikke faglig godkjent ennå. Antall, tidsbruk og bestått-grense her er ikke de samme som på Statens vegvesens teoriprøve.
            </p>
          </motion.div>
        )}

        {phase.k === 'test' && qs[i] && (
          <div>
            <Navigator n={qs.length} i={i} answered={answers.map((a, k) => isComplete(qs[k], a))} onPick={setI} />
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="mt-5">
                <div className="num mb-2 text-[12px] font-bold text-fog">
                  Spørsmål {i + 1} av {qs.length}
                </div>
                <QuestionView q={qs[i]} answer={answers[i]} onAnswer={(a) => setAnswers((arr) => arr.map((x, k) => (k === i ? a : x)))} reveal={false} />
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex gap-3">
              <button className="btn btn-ghost h-[56px] flex-1 text-[14px] disabled:opacity-30" disabled={i === 0} onClick={() => setI(i - 1)}>
                Forrige
              </button>
              {i < qs.length - 1 ? (
                <button className="btn btn-primary h-[56px] flex-1 text-[14px]" onClick={() => setI(i + 1)}>
                  Neste
                </button>
              ) : (
                <button className="btn btn-primary h-[56px] flex-1 text-[14px]" onClick={() => setConfirm(true)}>
                  Lever
                </button>
              )}
            </div>
          </div>
        )}

        {phase.k === 'result' && <Results qs={qs} answers={answers} onAgain={() => setPhase({ k: 'setup' })} onTrain={(id) => go('play', id)} />}
      </main>

      <AnimatePresence>
        {confirm && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={() => setConfirm(false)} />
            <div className="panel relative w-full max-w-sm rounded-[28px] p-6 text-center">
              <h3 className="display-tight text-[26px]">Levere nå?</h3>
              <p className="mt-2 text-[14px] text-mist">
                {answers.filter((a, k) => isComplete(qs[k], a)).length} av {qs.length} besvart.
              </p>
              <div className="mt-6 flex gap-3">
                <button className="btn btn-ghost h-[52px] flex-1 text-[14px]" onClick={() => setConfirm(false)}>
                  Fortsett
                </button>
                <button className="btn btn-primary h-[52px] flex-1 text-[14px]" onClick={submit}>
                  Lever
                </button>
              </div>
              <button className="mt-4 text-[12px] font-bold text-fog" onClick={() => go('map')}>
                Avbryt prøven
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Choice<T extends number>({ label, value, options, render, onChange }: { label: string; value: T; options: T[]; render: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="eyebrow mb-2 text-[10px] text-fog">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`min-h-[48px] rounded-2xl px-4 text-[14px] font-bold ring-1 ${o === value ? 'bg-signal text-ink ring-signal' : 'bg-white/5 ring-white/10'}`}>
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Navigator({ n, i, answered, onPick }: { n: number; i: number; answered: boolean[]; onPick: (k: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Spørsmålsoversikt">
      {Array.from({ length: n }, (_, k) => (
        <button
          key={k}
          aria-label={`Spørsmål ${k + 1}${answered[k] ? ', besvart' : ''}`}
          onClick={() => onPick(k)}
          className={`num grid h-9 w-9 place-items-center rounded-xl text-[12px] font-extrabold ring-1 ${k === i ? 'bg-snow text-ink ring-snow' : answered[k] ? 'bg-signal/20 text-signal ring-signal/40' : 'bg-white/5 text-fog ring-white/10'}`}
        >
          {k + 1}
        </button>
      ))}
    </div>
  )
}

function Countdown({ deadline, onEnd }: { deadline: number; onEnd: () => void }) {
  const [left, setLeft] = useState(deadline - Date.now())
  const ended = useRef(false)
  useEffect(() => {
    const t = setInterval(() => {
      const l = deadline - Date.now()
      setLeft(l)
      if (l <= 0 && !ended.current) {
        ended.current = true
        onEnd()
      }
    }, 500)
    return () => clearInterval(t)
  }, [deadline, onEnd])
  const s = Math.max(0, Math.ceil(left / 1000))
  return (
    <div className={`num rounded-full px-3 py-1.5 text-[14px] font-extrabold ring-1 ${s < 60 ? 'bg-stop/15 text-stop ring-stop/40' : 'bg-white/6 ring-white/10'}`} aria-live="polite">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </div>
  )
}

function Results({ qs, answers, onAgain, onTrain }: { qs: TheoryQuestion[]; answers: Answer[]; onAgain: () => void; onTrain: (scenarioId: string) => void }) {
  const correct = qs.filter((q, k) => isCorrect(q, answers[k])).length
  const byCat = useMemo(() => {
    const m = new Map<TheoryCategory, { ok: number; n: number }>()
    qs.forEach((q, k) => {
      const e = m.get(q.category) ?? { ok: 0, n: 0 }
      e.n++
      if (isCorrect(q, answers[k])) e.ok++
      m.set(q.category, e)
    })
    return [...m.entries()].sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
  }, [qs, answers])
  const wrong = qs.map((q, k) => ({ q, a: answers[k] })).filter(({ q, a }) => !isCorrect(q, a))
  const [open, setOpen] = useState<string | null>(wrong[0]?.q.id ?? null)
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mt-4 flex items-end gap-4">
        <div className="display text-[clamp(64px,18vw,104px)] text-signal">
          {correct}
          <span className="text-snow/30">/{qs.length}</span>
        </div>
      </div>
      <p className="mt-2 text-[14px] text-mist">Riktige svar. Treningsresultat – sier ikke om du består teoriprøven.</p>

      <section className="mt-8">
        <div className="eyebrow mb-3 text-[10px] text-fog">Per tema</div>
        <div className="space-y-2.5">
          {byCat.map(([cat, e]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-[13px] font-bold sm:w-48">{THEORY_CATEGORY_LABELS[cat]}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <div className={`h-full rounded-full ${e.ok === e.n ? 'bg-go' : e.ok / e.n >= 0.5 ? 'bg-signal' : 'bg-stop'}`} style={{ width: `${(e.ok / e.n) * 100}%` }} />
              </div>
              <span className="num w-10 text-right text-[13px] font-bold">
                {e.ok}/{e.n}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="eyebrow mb-3 text-[10px] text-fog">{wrong.length ? `Gå gjennom feilene (${wrong.length})` : 'Ingen feil'}</div>
        <div className="space-y-3">
          {wrong.map(({ q, a }) => {
            const scenario = q.linkedScenarioIds[0]
            const title = scenario ? CONTENT[scenario]?.title : null
            const isOpen = open === q.id
            return (
              <div key={q.id} className="rounded-[22px] bg-white/[0.035] ring-1 ring-white/8">
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stop/20 text-[13px] font-black text-stop">✕</span>
                  <span className="flex-1 text-[14px] font-bold leading-snug">{q.prompt}</span>
                  <span className="text-fog">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <QuestionView q={q} answer={a} onAnswer={() => {}} reveal compact />
                    {scenario && title && (
                      <button className="btn btn-primary mt-4 h-[52px] w-full text-[14px]" onClick={() => onTrain(scenario)}>
                        Tren dette: {title} <IconArrow />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <button className="btn btn-ghost mt-10 h-[56px] w-full text-[14px]" onClick={onAgain}>
        Ny runde
      </button>
    </motion.div>
  )
}

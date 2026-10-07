import { motion } from 'motion/react'
import { REVIEW_STATUS_LABELS, type SourceRef, type TheoryQuestion } from '../../learning/types'
import { SceneVisual } from './Diagram'

export type Answer = string | string[] | null

export function isCorrect(q: TheoryQuestion, a: Answer) {
  if (a === null) return false
  if (Array.isArray(q.correctAnswer)) return Array.isArray(a) && a.length === q.correctAnswer.length && a.every((x, i) => x === q.correctAnswer[i])
  return a === q.correctAnswer
}

export function isComplete(q: TheoryQuestion, a: Answer) {
  if (a === null) return false
  return q.questionType === 'ordering' ? Array.isArray(a) && a.length === q.answerOptions.length : true
}

const TYPE_LABEL: Record<TheoryQuestion['questionType'], string> = {
  multiple_choice: 'Flervalg',
  image_choice: 'Bildevalg',
  situational: 'Situasjon',
  hazard_recognition: 'Se faren',
  ordering: 'Rekkefølge',
  sign_recognition: 'Skilt',
  what_happens_next: 'Hva skjer nå?',
  scene_linked: 'Fra scenarioet',
}

export function SourceLine({ sources }: { sources: SourceRef[] }) {
  return (
    <p className="text-[11px] leading-snug text-fog">
      Kilde:{' '}
      {sources.map((s, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-snow">
            {s.section ? `${s.title.startsWith('Forskrift om kjørende') ? 'Trafikkreglene' : s.title} ${s.section}` : s.title}
          </a>
          {s.confidence === 'uncertain' && <span className="text-signal"> (må verifiseres)</span>}
        </span>
      ))}
    </p>
  )
}

export function ReviewChip({ status }: { status: TheoryQuestion['professionalReviewStatus'] }) {
  const ok = status === 'approved'
  return (
    <span className={`eyebrow inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] ${ok ? 'bg-go/15 text-go' : 'bg-white/6 text-fog'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-go' : 'bg-signal'}`} />
      {REVIEW_STATUS_LABELS[status]}
      {!ok && ' · ikke faglig godkjent'}
    </span>
  )
}

/**
 * One theory question. `reveal` = show right/wrong + explanation (learn mode);
 * in test mode the parent keeps reveal=false until the review page.
 */
export function QuestionView({
  q,
  answer,
  onAnswer,
  reveal,
  compact = false,
}: {
  q: TheoryQuestion
  answer: Answer
  onAnswer: (a: Answer) => void
  reveal: boolean
  compact?: boolean
}) {
  const ordering = q.questionType === 'ordering'
  const order = (Array.isArray(answer) ? answer : []) as string[]
  const correct = isCorrect(q, answer)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow text-[10px] text-signal">{TYPE_LABEL[q.questionType]}</span>
        <ReviewChip status={q.professionalReviewStatus} />
      </div>
      <h3 className={`font-extrabold leading-tight tracking-[-0.01em] ${compact ? 'text-[19px]' : 'text-[22px] sm:text-[24px]'}`}>{q.prompt}</h3>
      {q.imageOrSceneReference && <SceneVisual scene={q.imageOrSceneReference} className={`mx-auto w-full ${compact ? 'max-w-[200px]' : 'max-w-[260px]'} overflow-hidden rounded-2xl`} />}
      {ordering && <p className="text-[13px] text-mist">Trykk i riktig rekkefølge. Trykk igjen for å angre.</p>}
      <div className="flex flex-col gap-2.5" role={ordering ? 'list' : 'radiogroup'}>
        {q.answerOptions.map((o) => {
          const picked = ordering ? order.includes(o.id) : answer === o.id
          const pos = order.indexOf(o.id)
          const isRight = ordering ? false : o.id === q.correctAnswer
          let tone = 'bg-white/[0.05] ring-white/10 hover:bg-white/[0.09]'
          if (picked && !reveal) tone = 'bg-signal/12 ring-signal'
          if (reveal && isRight) tone = 'bg-go/14 ring-go'
          if (reveal && picked && !isRight && !ordering) tone = 'bg-stop/14 ring-stop'
          if (reveal && ordering) tone = correct ? 'bg-go/14 ring-go' : 'bg-white/[0.05] ring-white/10'
          return (
            <button
              key={o.id}
              role={ordering ? 'listitem' : 'radio'}
              aria-checked={picked}
              disabled={reveal}
              onClick={() => {
                if (ordering) onAnswer(picked ? order.filter((x) => x !== o.id) : [...order, o.id])
                else onAnswer(o.id)
              }}
              className={`flex min-h-[54px] items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold ring-1 transition-colors ${tone}`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-black ${picked ? 'bg-signal text-ink' : 'bg-white/8 text-fog'}`}>
                {ordering ? (pos >= 0 ? pos + 1 : '') : String.fromCharCode(65 + q.answerOptions.indexOf(o))}
              </span>
              <span className="flex-1">{o.text}</span>
            </button>
          )
        })}
      </div>
      {reveal && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-4 ring-1 ${correct ? 'bg-go/8 ring-go/30' : 'bg-stop/8 ring-stop/30'}`}>
          <p className={`display-tight text-[18px] ${correct ? 'text-go' : 'text-stop'}`}>{correct ? 'Riktig' : 'Ikke helt'}</p>
          {!correct && typeof answer === 'string' && q.misconception?.[answer] && <p className="mt-2 text-[14px] text-snow">{q.misconception[answer]}</p>}
          {!correct && ordering && <p className="mt-2 text-[14px] text-snow">Riktig rekkefølge: {(q.correctAnswer as string[]).map((id) => q.answerOptions.find((o) => o.id === id)?.text).join(' → ')}</p>}
          <p className="mt-2 text-[14px] leading-relaxed text-mist">{q.explanation}</p>
          <div className="mt-3">
            <SourceLine sources={q.sourceMetadata} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

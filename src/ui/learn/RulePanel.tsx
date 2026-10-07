import { RULE_CARDS } from '../../learning/bank'
import { SKILL_LABELS, type SkillId } from '../../learning/types'
import type { SkillDelta } from '../../learning/mastery'
import { summarize, LEVEL_LABELS, type MasteryState } from '../../learning/mastery'
import { DiagramSvg } from './Diagram'
import { SourceLine } from './QuestionView'

/** "LÆR REGELEN" — theory linked to the scenario: one rule, one diagram, one source. */
export function RulePanel({ scenarioId, compact = false }: { scenarioId: string; compact?: boolean }) {
  const card = RULE_CARDS[scenarioId]
  if (!card) return null
  return (
    <div className={`flex gap-4 ${compact ? 'items-center' : 'flex-col sm:flex-row sm:items-start'}`}>
      <div className={`${compact ? 'h-20 w-20' : 'mx-auto h-40 w-40 sm:mx-0 sm:h-36 sm:w-36'} shrink-0 overflow-hidden rounded-2xl`}>
        <DiagramSvg id={card.diagram} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-[10px] text-signal">Lær regelen</p>
        <h3 className={`display-tight mt-1 ${compact ? 'text-[17px]' : 'text-[24px]'}`}>{card.title}</h3>
        <p className={`mt-1.5 leading-relaxed text-mist ${compact ? 'text-[12.5px]' : 'text-[15px]'}`}>{card.body}</p>
        {!compact && (
          <div className="mt-3 space-y-1">
            <SourceLine sources={[card.source]} />
            <p className="text-[11px] text-fog">Faglig innhold er et utkast og ikke godkjent av trafikklærer ennå.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}`)

/** Theory vs applied, per skill. Highlights skills touched in this session. */
export function MasteryBars({ mastery, deltas, only }: { mastery: MasteryState; deltas?: SkillDelta[]; only?: SkillId[] }) {
  const rows = summarize(mastery).filter((r) => (only ? only.includes(r.skill) : r.theory !== null || r.applied !== null))
  const changed = new Set((deltas ?? []).map((d) => d.skill))
  const deltaOf = (s: SkillId, t: 'theory' | 'applied') => {
    const d = deltas?.find((x) => x.skill === s && x.track === t)
    if (!d) return null
    return Math.round((d.after - (d.before ?? 0)) * 100)
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-4 text-[10px] font-bold uppercase tracking-[0.14em] text-fog">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ice" /> Teori
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-signal" /> I trafikken
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.skill} className={`rounded-2xl p-3 ring-1 ${changed.has(r.skill) ? 'bg-white/[0.06] ring-white/14' : 'bg-white/[0.025] ring-white/6'}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-bold">{SKILL_LABELS[r.skill]}</span>
            <span className="text-[11px] text-fog">
              {LEVEL_LABELS[r.theoryLevel]} · {LEVEL_LABELS[r.appliedLevel]}
            </span>
          </div>
          {(['theory', 'applied'] as const).map((t) => {
            const v = t === 'theory' ? r.theory : r.applied
            const d = deltaOf(r.skill, t)
            return (
              <div key={t} className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div className={`h-full rounded-full ${t === 'theory' ? 'bg-ice' : 'bg-signal'} transition-[width] duration-700`} style={{ width: `${(v ?? 0) * 100}%` }} />
                </div>
                <span className="num w-8 text-right text-[12px] font-bold">{pct(v)}</span>
                <span className={`num w-9 text-right text-[11px] font-bold ${d === null ? 'text-transparent' : d >= 0 ? 'text-go' : 'text-stop'}`}>{d === null ? '0' : `${d >= 0 ? '+' : ''}${d}`}</span>
              </div>
            )
          })}
          {r.gap === 'knows-not-does' && <p className="mt-2 text-[12px] text-signal">Du kan regelen – nå gjelder det å bruke den i trafikken.</p>}
          {r.gap === 'does-not-knows' && <p className="mt-2 text-[12px] text-ice">Du gjør det riktig – lær også regelen bak.</p>}
        </div>
      ))}
      <p className="text-[11px] leading-snug text-fog">Læringspoeng i spillet. Ikke en prognose for teoriprøven eller førerprøven.</p>
    </div>
  )
}

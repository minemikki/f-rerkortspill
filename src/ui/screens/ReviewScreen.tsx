import { WORLDS } from '../../content/world'
import { CONTENT, scenarioById } from '../../scenarios'
import type { Step } from '../../engine/types'
import { useNav } from '../../state/nav'
import { IconBack } from '../components/Icons'

/**
 * Faglig gjennomgang — every player-facing text, rule reference and correct
 * answer in one printable page, so a qualified driving instructor can
 * review the content without reading code.
 */

const RESULT_LABEL: Record<string, string> = {
  perfect: 'Riktig (full uttelling)',
  good: 'Godt (delvis bonus)',
  partial: 'Delvis riktig',
  wrong: 'Feil',
}

const STATUS: Record<string, string> = {
  utkast: 'bg-stop/20 text-stop ring-stop/30',
  'til-gjennomgang': 'bg-signal/20 text-signal ring-signal/30',
  godkjent: 'bg-go/20 text-go ring-go/30',
}

function outcomesOf(step: Step) {
  if (step.kind === 'choice') return step.options.map((o) => ({ key: o.id, o: o.outcome, how: `Valg: «${o.id}»` }))
  if (step.kind === 'spot') {
    const out = [{ key: 'all', o: step.outcomes.all, how: 'Fant alle farene' }]
    for (const [t, o] of Object.entries(step.outcomes.missed ?? {})) out.push({ key: o.id, o, how: `Overså: ${t}` })
    out.push({ key: 'none', o: step.outcomes.none, how: 'Fant ingen / flere oversett' })
    return out
  }
  return [
    ...step.windows.map((w, i) => ({ key: w.outcome, o: step.outcomes[w.outcome], how: `Bremset ${i === 0 ? 'før' : 'innen'} ${w.until.toFixed(1)} s` })),
    { key: 'fail', o: step.outcomes.fail, how: `Ingen brems innen ${step.failAt.toFixed(1)} s` },
  ]
}

export function ReviewScreen() {
  const go = useNav((s) => s.go)
  return (
    <div className="h-full overflow-y-auto bg-[#f6f4ef] text-[#14171c]">
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
        <button className="mb-8 flex items-center gap-2 text-[14px] font-bold text-[#555] print:hidden" onClick={() => go('landing')}>
          <IconBack size={16} /> Tilbake
        </button>
        <div className="eyebrow text-[#8a6d00]">KJØR · Faglig gjennomgang</div>
        <h1 className="display-tight mt-2 text-[44px]">Innhold til kvalitetssikring</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#444]">
          Denne siden viser alt faglig innhold i prototypen: spørsmål, svaralternativer, hva som regnes som riktig, forklaringer og regelhenvisninger. Ingen
          scenarioer er godkjent ennå. Regelutsagn merket <b>«Verifisert av utvikler»</b> er sjekket mot Statens vegvesens sider, men må fortsatt godkjennes av en
          trafikklærer. Innholdet redigeres i <code className="rounded bg-black/5 px-1">src/content/scenarios/</code>.
        </p>

        {WORLDS[0].scenarios.map((id, i) => {
          const c = CONTENT[id]
          const def = scenarioById(id)!
          return (
            <section key={id} className="mt-12 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[#888]">
                    Nivå {i + 1} · {def.environment} · vanskelighet {def.difficulty}/5
                  </div>
                  <h2 className="display-tight mt-1 text-[32px]">{c.title}</h2>
                  <p className="mt-1 text-[15px] text-[#555]">{c.learningObjective}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[12px] font-bold uppercase ring-1 ${STATUS[c.review.status]}`}>{c.review.status}</span>
              </div>

              {def.steps.map((step) => {
                const sc = c.steps[step.id]
                return (
                  <div key={step.id} className="mt-6 border-t border-black/8 pt-5">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-[#8a6d00]">
                      Steg «{step.id}» · {step.kind === 'choice' ? 'Velg handling' : step.kind === 'spot' ? 'Trykk på faren' : 'Reaksjon (brems)'} · tester{' '}
                      {step.tests.join(', ')}
                    </div>
                    <div className="mt-1 text-[20px] font-extrabold">«{sc.prompt}»</div>
                    {sc.hint && <div className="text-[14px] text-[#666]">Hint: {sc.hint}</div>}
                    {step.kind === 'spot' && (
                      <div className="mt-2 text-[14px]">
                        <b>Farer (riktig):</b> {step.targets.map((t) => sc.labels?.[t] ?? t).join(', ')} · <b>Distraksjoner:</b>{' '}
                        {step.distractors.map((t) => sc.labels?.[t] ?? t).join(', ')}
                      </div>
                    )}
                    <table className="mt-3 w-full text-left text-[14px]">
                      <thead>
                        <tr className="text-[12px] uppercase tracking-wider text-[#888]">
                          <th className="py-1 pr-3">Spiller gjør</th>
                          <th className="py-1 pr-3">Vurdering</th>
                          <th className="py-1">Tilbakemelding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outcomesOf(step).map(({ key, o, how }) => {
                          const oc = sc.outcomes[o.id]
                          const label = step.kind === 'choice' ? `«${sc.options?.[key] ?? key}»` : how
                          return (
                            <tr key={key} className="border-t border-black/5 align-top">
                              <td className="py-2 pr-3 font-semibold">{label}</td>
                              <td className="py-2 pr-3">
                                <span className={o.result === 'wrong' ? 'text-[#c0392b]' : o.result === 'perfect' ? 'text-[#1e8e5a]' : 'text-[#9a7400]'}>
                                  {RESULT_LABEL[o.result]}
                                </span>
                                <div className="text-[12px] text-[#888]">
                                  {Object.entries(o.scores)
                                    .map(([k, v]) => `${k} ${Math.round((v ?? 0) * 100)} %`)
                                    .join(' · ')}
                                </div>
                              </td>
                              <td className="py-2">
                                <div className="font-bold">{oc?.title}</div>
                                {(oc?.saw || oc?.missed) && (
                                  <div className="text-[13px] text-[#666]">
                                    {oc.saw && `Du så ${oc.saw}. `}
                                    {oc.missed && `Men du overså ${oc.missed}.`}
                                  </div>
                                )}
                                <div className="text-[#333]">{oc?.body}</div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}

              <div className="mt-6 border-t border-black/8 pt-5">
                <div className="text-[12px] font-bold uppercase tracking-widest text-[#888]">Hovedbudskap</div>
                <p className="mt-1 text-[16px] font-semibold">{c.takeaway}</p>
              </div>
              <div className="mt-5">
                <div className="text-[12px] font-bold uppercase tracking-widest text-[#888]">Regelgrunnlag</div>
                <ul className="mt-2 space-y-2">
                  {c.rules.map((r, k) => (
                    <li key={k} className="text-[14px]">
                      <span>{r.text}</span>
                      <div className="text-[12px] text-[#777]">
                        Kilde: {r.source} ·{' '}
                        <span className={r.verifiedByDev ? 'text-[#1e8e5a]' : 'text-[#c0392b]'}>{r.verifiedByDev ? 'Verifisert av utvikler' : 'Ikke verifisert'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 rounded-2xl bg-[#fff8db] p-4 text-[14px] text-[#5c4a00]">
                <b>Notat til trafikklærer:</b> {c.review.notes}
                <div className="mt-2 text-[12px]">
                  Godkjent av: {c.review.reviewer ?? '—'} · Dato: {c.review.date ?? '—'}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

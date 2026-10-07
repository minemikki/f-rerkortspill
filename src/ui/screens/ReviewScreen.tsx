import { WORLDS } from '../../content/world'
import { CONTENT, scenarioById } from '../../scenarios'
import type { Step } from '../../engine/types'
import { useNav } from '../../state/nav'
import { IconBack } from '../components/Icons'
import { OBJECTIVES, QUESTIONS, RULE_CARDS, SCENARIO_LOOP } from '../../learning/bank'
import { REVIEW_STATUS_LABELS, SKILL_LABELS, THEORY_CATEGORY_LABELS, type SkillId, type TheoryQuestion } from '../../learning/types'

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

        <TheoryReview />
        <RuleCardReview />
        <PracticeCriteria />
        <Boundaries />
      </div>
    </div>
  )
}

const H2 = ({ children, id }: { children: React.ReactNode; id: string }) => (
  <h2 id={id} className="display-tight mt-16 text-[34px]">
    {children}
  </h2>
)

function download() {
  const data = { exportedAt: new Date().toISOString(), questions: QUESTIONS, objectives: OBJECTIVES, ruleCards: RULE_CARDS, scenarioLoops: SCENARIO_LOOP, scenarios: CONTENT }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'kjor-faglig-innhold.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

function TheoryReview() {
  const counts = QUESTIONS.reduce<Record<string, number>>((m, q) => ((m[q.professionalReviewStatus] = (m[q.professionalReviewStatus] ?? 0) + 1), m), {})
  const uncertain = QUESTIONS.filter((q) => q.sourceMetadata.some((s) => s.confidence === 'uncertain')).length
  return (
    <section>
      <H2 id="teori">Teorispørsmål ({QUESTIONS.length})</H2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#444]">
        Alle spørsmål er utkast. Status endres bare når en trafikklærer har vurdert spørsmålet (navn og dato registreres i <code className="rounded bg-black/5 px-1">reviewHistory</code>
        ). Kilder merket <b className="text-[#c0392b]">«må verifiseres»</b> er ikke kontrollert mot primærkilden.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
        {Object.entries(counts).map(([k, n]) => (
          <span key={k} className="rounded-full bg-white px-3 py-1 font-bold ring-1 ring-black/10">
            {REVIEW_STATUS_LABELS[k as TheoryQuestion['professionalReviewStatus']]}: {n}
          </span>
        ))}
        <span className="rounded-full bg-[#fff1ef] px-3 py-1 font-bold text-[#c0392b] ring-1 ring-[#c0392b]/20">Med usikker kilde: {uncertain}</span>
        <button className="rounded-full bg-[#14171c] px-3 py-1 font-bold print:hidden" onClick={download}>
          <span className="text-white">Last ned alt faglig innhold (JSON)</span>
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {QUESTIONS.map((q) => (
          <article key={q.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#888]">
              <span>{q.id}</span>
              <span>· v{q.version}</span>
              <span>· {THEORY_CATEGORY_LABELS[q.category]}</span>
              <span>· {q.topic} / {q.subtopic}</span>
              <span>· {q.questionType}</span>
              <span>· vanskelighet {q.difficulty}/3</span>
              <span className="rounded-full bg-[#fdecea] px-2 py-0.5 text-[#c0392b]">{REVIEW_STATUS_LABELS[q.professionalReviewStatus]}</span>
            </div>
            <div className="mt-2 text-[18px] font-extrabold">{q.prompt}</div>
            {q.imageOrSceneReference && (
              <div className="text-[12px] text-[#777]">
                Visuelt: {q.imageOrSceneReference.kind} ·{' '}
                {q.imageOrSceneReference.kind === 'sign' ? q.imageOrSceneReference.sign : q.imageOrSceneReference.kind === 'diagram' ? q.imageOrSceneReference.diagram : q.imageOrSceneReference.scenarioId}
              </div>
            )}
            <ol className="mt-3 space-y-1 text-[14px]">
              {q.answerOptions.map((o, k) => {
                const right = Array.isArray(q.correctAnswer) ? null : q.correctAnswer === o.id
                const pos = Array.isArray(q.correctAnswer) ? q.correctAnswer.indexOf(o.id) + 1 : null
                return (
                  <li key={o.id} className={right ? 'font-bold text-[#1e8e5a]' : ''}>
                    {pos ? `${pos}. ` : `${String.fromCharCode(65 + k)}. `}
                    {o.text} {right && '✓ riktig'}
                    {q.misconception?.[o.id] && <div className="ml-5 text-[12.5px] font-normal text-[#8a6d00]">Misforståelse: {q.misconception[o.id]}</div>}
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 text-[14px] text-[#333]">
              <b>Forklaring:</b> {q.explanation}
            </p>
            <div className="mt-2 text-[12.5px] text-[#666]">
              <b>Kilder:</b>{' '}
              {q.sourceMetadata.map((s, k) => (
                <span key={k}>
                  {k > 0 && ' · '}
                  <a href={s.url} className="underline" target="_blank" rel="noreferrer">
                    {s.publisher}: {s.section ?? s.title}
                  </a>{' '}
                  <span className={s.confidence === 'checked' ? 'text-[#1e8e5a]' : 'text-[#c0392b]'}>({s.confidence === 'checked' ? 'sjekket av utvikler mot Lovdata' : 'må verifiseres'})</span>
                </span>
              ))}
            </div>
            <div className="mt-1 text-[12.5px] text-[#666]">
              <b>Koblet til:</b> {q.linkedScenarioIds.map((id) => CONTENT[id]?.title ?? id).join(', ')} · <b>Læringsmål:</b>{' '}
              {q.learningObjectiveIds.map((id) => OBJECTIVES.find((o) => o.id === id)?.text ?? id).join(' / ')} · <b>Ferdigheter:</b>{' '}
              {(Object.keys(q.skills) as SkillId[]).map((s) => SKILL_LABELS[s]).join(', ')}
            </div>
            <div className="mt-3 rounded-xl bg-[#f6f4ef] p-3 text-[12.5px] text-[#555]">
              Vurdering: ☐ Godkjent ☐ Må revideres — Kommentar: ____________________ · Navn/dato: ____________
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function RuleCardReview() {
  return (
    <section>
      <H2 id="regelkort">«Lær regelen»-kort</H2>
      <p className="mt-3 max-w-2xl text-[15px] text-[#444]">Vises i beslutningspanelet og etter hvert scenario. Én regel, én skisse, én kilde.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {Object.entries(RULE_CARDS).map(([id, r]) => (
          <div key={id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#888]">{CONTENT[id]?.title}</div>
            <div className="mt-1 text-[18px] font-extrabold">{r.title}</div>
            <p className="mt-1 text-[14px] text-[#333]">{r.body}</p>
            <div className="mt-2 text-[12px] text-[#777]">
              Kilde: {r.source.section ?? r.source.title} <span className={r.source.confidence === 'checked' ? 'text-[#1e8e5a]' : 'text-[#c0392b]'}>({r.source.confidence === 'checked' ? 'sjekket' : 'må verifiseres'})</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PracticeCriteria() {
  const rows: Array<[string, string, string]> = [
    ['Observasjon', 'Så til høyre (E / «Se ▶») før det uoversiktlige krysset', 'Mangler: alvorlig (−50)'],
    ['Observasjon', 'Så til venstre før svingen', 'Mangler: mindre (−20)'],
    ['Fartstilpasning', 'Maks fart siste 9 m før krysset ≤ 22 km/t', 'Over: alvorlig (−35)'],
    ['Fartstilpasning', 'Over 33 km/t i mer enn 1 s (fartsgrense 30)', 'Mindre (−15)'],
    ['Fartstilpasning', 'Retardasjon > 6,2 m/s² i mer enn 0,4 s', 'Mindre: brå oppbremsing (−15)'],
    ['Plassering', 'Over midtlinjen > 0,8 s / helt ute ved kanten', 'Alvorlig (−35) / mindre (−15)'],
    ['Plassering', 'Snittavvik fra feltets midte > 0,6 m', 'Mindre (−20)'],
    ['Plassering', 'Stans inntil høyre kant i stoppsonen', 'Ellers mindre (−15)'],
    ['Trafikkregler', 'Tegn (blinklys) i god tid før svingen', 'Mangler: mindre (−15)'],
    ['Trafikkregler', 'Vikeplikt ved venstresving for bil fra høyre (§ 7 nr. 2): bilen må ikke bremse for deg', 'Alvorlig (−35), totalscore maks 55'],
    ['Trafikkregler', 'Vikeplikt for gående når du svinger (§ 7 nr. 3)', 'Alvorlig (−35), totalscore maks 55'],
    ['Alle', 'Kollisjon / nesten-påkjørsel', 'Farlig – kjøringen avsluttes'],
  ]
  return (
    <section>
      <H2 id="ovelse">Øvelseskjøring – vurderingskriterier</H2>
      <p className="mt-3 max-w-2xl text-[15px] text-[#444]">
        Grensene er utviklerens forslag og må vurderes av trafikklærer. De ligger i <code className="rounded bg-black/5 px-1">src/practice/session.ts</code> og er dekket av automatiske tester.
      </p>
      <table className="mt-5 w-full rounded-2xl bg-white text-left text-[14px] ring-1 ring-black/5">
        <thead>
          <tr className="text-[12px] uppercase tracking-wider text-[#888]">
            <th className="p-3">Område</th>
            <th className="p-3">Kriterium</th>
            <th className="p-3">Konsekvens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={k} className="border-t border-black/5 align-top">
              {r.map((c, j) => (
                <td key={j} className={`p-3 ${j === 0 ? 'font-bold' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Boundaries() {
  return (
    <section className="mb-10 mt-16 rounded-3xl bg-[#14171c] p-6 text-white md:p-8">
      <div className="text-[12px] font-bold uppercase tracking-widest text-[#ffd400]">Avgrensning</div>
      <p className="mt-2 text-[15px] leading-relaxed text-white/80">
        KJØR er et treningsverktøy. Det erstatter ikke obligatorisk opplæring, kjøretimer med trafikklærer, førstehjelpskurs, mørkekjøring eller den offisielle
        førerprøven. Poeng og vurderinger er læringspoeng i spillet og er ikke en prognose for teoriprøven eller førerprøven.
      </p>
    </section>
  )
}

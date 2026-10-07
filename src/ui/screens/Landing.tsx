import { motion } from 'motion/react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { useNav } from '../../state/nav'
import { useProgress } from '../../state/progress'
import { registerAnchor } from '../../three/anchors'
import { IconArrow, IconEye, IconSound, Wordmark, Star } from '../components/Icons'

const HeroCanvas = lazy(() => import('../../three/HeroScene').then((m) => ({ default: m.HeroCanvas })))

const ease = [0.16, 1, 0.3, 1] as const

export function Landing() {
  const go = useNav((s) => s.go)
  const xp = useProgress((s) => s.xp)
  const howRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(sfx.muted)

  const start = () => {
    sfx.unlock()
    sfx.play('whoosh')
    go('map')
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar bg-ink">
      {/* ───────── HERO ───────── */}
      <section className="relative h-[100svh] min-h-[600px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full w-full bg-[#e9dccb]" />}>
            <HeroCanvas />
          </Suspense>
        </div>
        {/* legibility gradients */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-ink via-ink/60 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-ink/55 to-transparent md:block" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/50 to-transparent" />
        <div className="pointer-events-none absolute inset-0 grain" />

        {/* hazard tags anchored to 3D actors */}
        <HeroTag id="hero-car" label="Vikeplikt?" tone="signal" />
        <HeroTag id="hero-car3" label="Vikeplikt?" tone="signal" />
        <HeroTag id="hero-cyclist" label="Syklist" tone="go" />

        {/* top bar */}
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-[calc(var(--safe-top)+18px)] md:px-10">
          <Wordmark />
          <div className="flex items-center gap-2">
            <span className="chip hidden sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-go" /> Prototype
            </span>
            <button
              aria-label={muted ? 'Slå på lyd' : 'Slå av lyd'}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/8 ring-1 ring-white/12 backdrop-blur-md"
              onClick={() => {
                sfx.unlock()
                sfx.setMuted(!muted)
                setMuted(!muted)
              }}
            >
              <IconSound muted={muted} size={18} />
            </button>
          </div>
        </header>

        {/* copy */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-[calc(var(--safe-bottom)+28px)] md:px-10 md:pb-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.15 }} className="eyebrow mb-4 flex items-center gap-3 text-signal">
            <span className="stripe inline-block h-[3px] w-10" /> Trafikktrening · Klasse B
          </motion.div>
          <h1 className="display max-w-[12ch] text-[clamp(38px,10.6vw,124px)] text-snow">
            {['Kan du', 'lese', 'trafikken?'].map((w, i) => (
              <motion.span
                key={w}
                className="block"
                initial={{ opacity: 0, y: '0.5em', filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.9, ease, delay: 0.25 + i * 0.09 }}
              >
                {i === 2 ? (
                  <>
                    trafikken<span className="text-signal">?</span>
                  </>
                ) : (
                  w
                )}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.6 }}
            className="mt-5 max-w-[30ch] text-[17px] leading-snug text-mist md:text-[20px]"
          >
            Tren på ekte trafikksituasjoner før du møter dem på veien.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.75 }}
            className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <button className="btn btn-primary h-[62px] px-8 text-[17px]" onClick={start}>
              {xp > 0 ? 'Fortsett å kjøre' : 'Start å kjøre'} <IconArrow size={20} />
            </button>
            <button
              className="flex h-12 items-center gap-2 self-start px-1 text-[15px] font-semibold text-mist underline-offset-4 hover:text-snow hover:underline sm:self-auto"
              onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              <IconEye size={18} /> Se hvordan det fungerer
            </button>
          </motion.div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section ref={howRef} className="relative px-5 py-20 md:px-10 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="eyebrow text-fog">Slik fungerer det</div>
          <h2 className="display-tight mt-3 max-w-[16ch] text-[clamp(32px,7vw,68px)]">
            Ikke bare les trafikken. <span className="text-signal">Opplev den.</span>
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Step n="01" title="Observer" body="Situasjonen spilles av. Se etter det som kan skje.">
              <ScanVisual />
            </Step>
            <Step n="02" title="Bestem" body="Trykk på faren, velg handling eller brems i tide.">
              <ChoiceVisual />
            </Step>
            <Step n="03" title="Se konsekvensen" body="Feil? Du ser replay av det du overså — og hvorfor.">
              <MissVisual />
            </Step>
          </div>
        </div>
      </section>

      {/* ───────── SCORE PREVIEW ───────── */}
      <section className="relative overflow-hidden px-5 py-20 md:px-10 md:py-28">
        <div className="pointer-events-none absolute -right-40 top-10 h-[480px] w-[480px] rounded-full bg-signal/8 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <div className="eyebrow text-fog">Mer enn rett eller galt</div>
            <h2 className="display-tight mt-3 text-[clamp(32px,6.5vw,60px)]">
              Vi belønner risikoforståelse. <span className="text-fog">Ikke pugging.</span>
            </h2>
            <p className="mt-5 max-w-[38ch] text-[17px] leading-relaxed text-mist">
              Reagerer du på ballen før barnet kommer, får du mer enn den som bremser i siste liten.
            </p>
          </div>
          <ScorePreview />
        </div>
      </section>

      {/* ───────── WORLDS ───────── */}
      <section className="px-5 pb-10 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="eyebrow text-fog">Reisen</div>
          <div className="mt-5 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {[
              { t: 'Byen', s: '5 nivåer', open: true, c: 'from-[#2a3a4a] to-[#141b24]' },
              { t: 'Landevei', s: 'Snart', c: 'from-[#2d3a2a] to-[#141a14]' },
              { t: 'Mørket', s: 'Snart', c: 'from-[#141a2e] to-[#07090f]' },
              { t: 'Vinter', s: 'Snart', c: 'from-[#3a4652] to-[#1a2028]' },
              { t: 'Motorvei', s: 'Snart', c: 'from-[#3a3428] to-[#161410]' },
            ].map((w, i) => (
              <div key={w.t} className={`relative h-44 w-40 shrink-0 overflow-hidden rounded-3xl bg-gradient-to-b ${w.c} p-4 ring-1 ring-white/10`}>
                <div className="num text-[12px] font-bold text-fog">VERDEN {i + 1}</div>
                <div className="display-tight mt-1 text-[22px]">{w.t}</div>
                <div className={`absolute bottom-4 left-4 text-[13px] font-semibold ${w.open ? 'text-go' : 'text-fog'}`}>{w.s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="px-5 pb-[calc(var(--safe-bottom)+40px)] pt-10 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 border-t border-line pt-12 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="display text-[clamp(34px,8vw,72px)]">Klar?</h3>
            <button className="btn btn-primary mt-6 h-[60px] px-8 text-[16px]" onClick={start}>
              Start å kjøre <IconArrow size={20} />
            </button>
          </div>
          <div className="max-w-md text-[13px] leading-relaxed text-fog">
            KJØR er et lærings- og treningsverktøy. Det erstatter ikke trafikalt grunnkurs, mørkekjøring, førstehjelp eller annen obligatorisk
            opplæring. Innholdet er under faglig kvalitetssikring.
            <button className="mt-3 block font-semibold text-mist underline underline-offset-4 hover:text-snow" onClick={() => go('review')}>
              Faglig innhold for trafikklærere →
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function HeroTag({ id, label, tone }: { id: string; label: string; tone: 'signal' | 'go' }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    registerAnchor(id, ref.current)
    return () => registerAnchor(id, null)
  }, [id])
  const color = tone === 'signal' ? 'bg-signal text-ink' : 'bg-go text-ink'
  return (
    <div ref={ref} className="pointer-events-none absolute left-0 top-0 z-[5] opacity-0 transition-opacity duration-500" style={{ willChange: 'transform' }}>
      <div className="flex flex-col items-center">
        <div className={`rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide shadow-lg ${color}`} style={{ fontStretch: '115%' }}>
          {label}
        </div>
        <div className={`h-3 w-[2px] ${tone === 'signal' ? 'bg-signal' : 'bg-go'}`} />
        <div className="relative h-2 w-2">
          <span className={`absolute inset-0 rounded-full ${tone === 'signal' ? 'bg-signal' : 'bg-go'}`} />
          <span className={`pulse-ring absolute inset-0 rounded-full ${tone === 'signal' ? 'bg-signal' : 'bg-go'}`} />
        </div>
      </div>
    </div>
  )
}

function Step({ n, title, body, children }: { n: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease }}
      className="relative overflow-hidden rounded-[28px] bg-ink-2 p-6 ring-1 ring-white/8"
    >
      <div className="relative h-44 overflow-hidden rounded-2xl bg-ink-3 ring-1 ring-white/6">{children}</div>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="num text-[13px] font-bold text-signal">{n}</span>
        <h3 className="display-tight text-[26px]">{title}</h3>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-mist">{body}</p>
    </motion.div>
  )
}

function ScanVisual() {
  return (
    <div className="absolute inset-0">
      {/* stylised top-down junction */}
      <div className="absolute left-1/2 top-0 h-full w-14 -translate-x-1/2 bg-[#2a3038]" />
      <div className="absolute left-0 top-1/2 h-14 w-full -translate-y-1/2 bg-[#2a3038]" />
      <div className="absolute left-[calc(50%+6px)] top-[70%] h-7 w-4 rounded-[5px] bg-snow" />
      <motion.div
        className="absolute top-[calc(50%-14px)] h-4 w-7 rounded-[5px] bg-ice"
        animate={{ left: ['100%', '58%', '58%'] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.6, 1], ease: 'easeOut' }}
      />
      <motion.div
        className="absolute h-16 w-16 rounded-full ring-2 ring-signal"
        style={{ top: 'calc(50% - 32px)' }}
        animate={{ left: ['90%', 'calc(58% - 18px)', 'calc(58% - 18px)'], opacity: [0, 1, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.6, 1], ease: 'easeOut' }}
      />
    </div>
  )
}

function ChoiceVisual() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6">
      {['Brems og vent', 'Fortsett', 'Øk farten'].map((t, i) => (
        <motion.div
          key={t}
          className={`rounded-xl px-4 py-2.5 text-[13px] font-extrabold uppercase tracking-wide ${i === 0 ? 'bg-signal text-ink' : 'bg-white/6 text-mist ring-1 ring-white/10'}`}
          style={{ fontStretch: '115%' }}
          initial={{ x: -10, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15 * i, duration: 0.6, ease }}
        >
          {t}
        </motion.div>
      ))}
    </div>
  )
}

function MissVisual() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center px-6">
      <div className="flex items-center gap-2">
        <span className="rec h-2 w-2 rounded-full bg-stop" />
        <span className="eyebrow text-stop">Replay</span>
      </div>
      <div className="mt-3 text-[13px] font-bold uppercase tracking-wide text-fog" style={{ fontStretch: '115%' }}>
        Du så bilen.
      </div>
      <div className="display-tight mt-1 text-[22px] leading-[1.02]">
        Men du overså <span className="text-signal">syklisten.</span>
      </div>
    </div>
  )
}

function ScorePreview() {
  const rows = [
    ['Observasjon', 92],
    ['Risikoforståelse', 84],
    ['Trafikkregler', 100],
    ['Reaksjon', 76],
  ] as const
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, ease }}
      className="panel relative rounded-[32px] p-7"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow text-fog">Boss · Rushtrafikk</div>
          <div className="mt-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <Star key={i} filled size={24} />
            ))}
          </div>
        </div>
        <div className="display text-[84px] leading-none text-signal">A</div>
      </div>
      <div className="mt-6 space-y-4">
        {rows.map(([label, v], i) => (
          <div key={label}>
            <div className="flex justify-between text-[13px] font-bold uppercase tracking-wide" style={{ fontStretch: '112%' }}>
              <span className="text-mist">{label}</span>
              <span className="num">{v} %</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-go to-[#9af5d2]"
                initial={{ width: 0 }}
                whileInView={{ width: `${v}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease, delay: 0.2 + i * 0.12 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

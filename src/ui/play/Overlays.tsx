import { AnimatePresence, motion } from 'motion/react'
import { RULE_CARDS } from '../../learning/bank'
import { DiagramSvg } from '../learn/Diagram'
import { RulePanel } from '../learn/RulePanel'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RunnerUI, ScenarioRunner } from '../../engine/runner'
import type { ScenarioContent, ScenarioDef } from '../../engine/types'
import { BADGES } from '../../content/world'
import { registerAnchor } from '../../three/anchors'
import { IconCheck, IconClose, IconEye, IconRetry, IconArrow } from '../components/Icons'
import { actorLabel, cap } from './labels'

const ease = [0.16, 1, 0.3, 1] as const
const spring = [0.34, 1.56, 0.64, 1] as const

/* ───────────── frame loop helper ───────────── */

export function useRaf(fn: (dt: number) => void) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    let id = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      ref.current(dt)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])
}

/* ───────────── cinematic letterbox ───────────── */

export function Letterbox({ on }: { on: boolean }) {
  return (
    <>
      <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-ink" initial={false} animate={{ height: on ? '9vh' : 0 }} transition={{ duration: 0.7, ease }} />
      <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-ink" initial={false} animate={{ height: on ? '9vh' : 0 }} transition={{ duration: 0.7, ease }} />
    </>
  )
}

/* ───────────── intro card ───────────── */

export function IntroCard({ show, level, content, boss }: { show: boolean; level: number; content: ScenarioContent; boss?: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-30 flex flex-col items-start justify-end px-6 pb-[18vh] md:px-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
          <motion.div className="eyebrow relative flex items-center gap-3 text-signal" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.7, ease, delay: 0.1 }}>
            <span className="stripe inline-block h-[3px] w-10" />
            {boss ? 'Boss · Verden 1' : `Nivå ${level} · Byen`}
          </motion.div>
          <motion.h1
            className="display relative mt-3 max-w-[14ch] text-[clamp(44px,12vw,104px)]"
            initial={{ y: 30, opacity: 0, filter: 'blur(10px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease, delay: 0.18 }}
          >
            {content.title}
          </motion.h1>
          <motion.p className="relative mt-3 max-w-[32ch] text-[17px] text-mist" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease, delay: 0.32 }}>
            {content.tagline}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ───────────── top HUD ───────────── */

export function TopHud({ ui, onClose, visible }: { ui: RunnerUI; onClose: () => void; visible: boolean }) {
  const [bump, setBump] = useState(0)
  const prev = useRef(ui.xp)
  const [delta, setDelta] = useState(0)
  useEffect(() => {
    if (ui.xp > prev.current) {
      setDelta(ui.xp - prev.current)
      setBump((b) => b + 1)
    }
    prev.current = ui.xp
  }, [ui.xp])
  return (
    <motion.div
      className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-4 pt-[calc(var(--safe-top)+12px)] md:px-6"
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -20 }}
      transition={{ duration: 0.5, ease }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <button aria-label="Avslutt" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/55 ring-1 ring-white/12 backdrop-blur-md">
        <IconClose size={18} />
      </button>
      <div className="flex flex-1 items-center gap-1.5">
        {Array.from({ length: ui.stepCount }, (_, i) => (
          <div key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-ink/45 ring-1 ring-white/10 backdrop-blur">
            <motion.div className="h-full rounded-full bg-signal" initial={false} animate={{ width: i < ui.stepsDone ? '100%' : i === ui.stepIndex && ui.phase === 'step' ? '35%' : '0%' }} transition={{ duration: 0.6, ease }} />
          </div>
        ))}
      </div>
      <div className="relative">
        <motion.div
          key={bump}
          className="flex h-10 items-center gap-1.5 rounded-full bg-ink/55 px-3.5 ring-1 ring-white/12 backdrop-blur-md"
          initial={{ scale: bump ? 1.25 : 1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: spring }}
        >
          <span className="text-[11px] font-black text-signal" style={{ fontStretch: '120%' }}>
            XP
          </span>
          <CountUp value={ui.xp} className="num text-[15px] font-extrabold" />
        </motion.div>
        <AnimatePresence>
          {bump > 0 && (
            <motion.div
              key={`d${bump}`}
              className="num absolute right-1 top-11 text-[15px] font-black text-signal"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: [0, 1, 1, 0], y: [14, 0, -6, -16] }}
              transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1] }}
            >
              +{delta}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function CountUp({ value, className, duration = 0.8 }: { value: number; className?: string; duration?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const start = useRef(0)
  const target = useRef(value)
  useEffect(() => {
    from.current = shown
    target.current = value
    start.current = performance.now()
    let id = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start.current) / (duration * 1000))
      const e = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(from.current + (target.current - from.current) * e))
      if (k < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span className={className}>{shown}</span>
}

/* ───────────── speedometer & indicator ───────────── */

export function Speedo({ runner, visible }: { runner: ScenarioRunner; visible: boolean }) {
  const kmh = useRef<HTMLSpanElement>(null)
  const left = useRef<HTMLDivElement>(null)
  const right = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const idx = useMemo(() => runner.sim.actors.findIndex((a) => a.def.id === 'player'), [runner])
  useRaf(() => {
    const v = runner.view(idx)
    const k = Math.round(v.v * 3.6)
    if (kmh.current) kmh.current.textContent = String(k)
    if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, v.v / 13.9)})`
    const on = Math.floor(performance.now() / 385) % 2 === 0
    if (left.current) left.current.style.opacity = (v.indicator === 'left' || v.indicator === 'hazard') && on ? '1' : '0.15'
    if (right.current) right.current.style.opacity = (v.indicator === 'right' || v.indicator === 'hazard') && on ? '1' : '0.15'
  })
  return (
    <motion.div
      className="pointer-events-none absolute bottom-[calc(var(--safe-bottom)+18px)] left-4 z-20 md:left-6"
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.5, ease }}
    >
      <div className="rounded-2xl bg-ink/55 px-3.5 py-2.5 ring-1 ring-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div ref={left} className="text-[#ff9a1a] transition-opacity duration-75" style={{ opacity: 0.15 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 12l10-9v6h10v6H12v6z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1">
            <span ref={kmh} className="num text-[26px] font-black leading-none" style={{ fontStretch: '120%' }}>
              0
            </span>
            <span className="text-[10px] font-bold text-fog">KM/T</span>
          </div>
          <div ref={right} className="text-[#ff9a1a] transition-opacity duration-75" style={{ opacity: 0.15 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 12l-10-9v6H2v6h10v6z" />
            </svg>
          </div>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div ref={bar} className="h-full origin-left rounded-full bg-snow/80" />
        </div>
      </div>
    </motion.div>
  )
}

/* ───────────── timer ───────────── */

function TimerBar({ runner, startedAt, limit }: { runner: ScenarioRunner; startedAt: number; limit: number }) {
  const el = useRef<HTMLDivElement>(null)
  useRaf(() => {
    const k = Math.max(0, 1 - (runner.now - startedAt) / limit)
    if (el.current) {
      el.current.style.transform = `scaleX(${k})`
      el.current.style.backgroundColor = k < 0.3 ? '#ff4a3d' : '#ffd400'
    }
  })
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div ref={el} className="h-full origin-left rounded-full bg-signal" />
    </div>
  )
}

/* ───────────── choice step ───────────── */

function seededOrder(ids: string[], seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const out = [...ids]
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0
    const j = h % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function ChoiceOverlay({ ui, runner, content, onChoose }: { ui: RunnerUI; runner: ScenarioRunner; content: ScenarioContent; onChoose: (id: string) => void }) {
  const step = ui.step!
  const sc = content.steps[step.id]
  const order = useMemo(() => seededOrder(step.options, step.id + content.id), [step.options, step.id, content.id])
  const [theory, setTheory] = useState(false)
  const toggleTheory = (on: boolean) => {
    runner.setHold(on)
    setTheory(on)
  }
  useEffect(() => () => runner.setHold(false), [runner])
  return (
    <motion.div className="absolute inset-0 z-30 flex flex-col justify-end md:items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink via-ink/75 to-transparent md:h-[30%] md:via-ink/30" />
      <div className="relative mx-auto w-full max-w-md px-4 pb-[calc(var(--safe-bottom)+20px)] md:panel md:mx-0 md:mb-8 md:mr-8 md:rounded-[30px] md:p-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease }}>
          {sc.hint && <div className="eyebrow mb-2 text-signal">{sc.hint}</div>}
          <h2 className="display-tight text-[clamp(30px,8.6vw,44px)]">{sc.prompt}</h2>
          <div className="mt-4">
            <TimerBar runner={runner} startedAt={step.startedAt} limit={step.timeLimit} />
          </div>
        </motion.div>
        <AnimatePresence>
          {theory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-2xl bg-ink-2/90 p-4 ring-1 ring-white/10">
                <RulePanel scenarioId={content.id} compact />
                <button className="mt-3 text-[12px] font-bold text-signal" onClick={() => toggleTheory(false)}>
                  Lukk og velg ↓
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-5 flex flex-col gap-3">
          {order.map((id, i) => (
            <motion.button
              key={id}
              className="btn option h-[60px] w-full justify-between px-5 text-left text-[16px]"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease, delay: 0.08 + i * 0.06 }}
              onClick={() => onChoose(id)}
            >
              <span>{sc.options?.[id] ?? id}</span>
              <span className="hidden h-7 w-7 place-items-center rounded-lg bg-white/8 text-[12px] text-fog md:grid">{i + 1}</span>
            </motion.button>
          ))}
        </div>
        {RULE_CARDS[content.id] && !theory && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => toggleTheory(true)}
            className="mt-4 flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2 text-left ring-1 ring-white/8 hover:bg-white/[0.08]"
          >
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
              <DiagramSvg id={RULE_CARDS[content.id].diagram} />
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-extrabold uppercase tracking-[0.06em]">Lær regelen</span>
              <span className="block text-[11.5px] text-fog">Teori koblet til scenarioet · pauser · gir færre poeng</span>
            </span>
            <span className="text-fog">›</span>
          </motion.button>
        )}
      </div>
      <KeyChoice order={order} onChoose={onChoose} />
    </motion.div>
  )
}

function KeyChoice({ order, onChoose }: { order: string[]; onChoose: (id: string) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= order.length) onChoose(order[n - 1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [order, onChoose])
  return null
}

/* ───────────── spot step ───────────── */

export function SpotOverlay({ ui, runner, content }: { ui: RunnerUI; runner: ScenarioRunner; content: ScenarioContent }) {
  const step = ui.step!
  const sc = content.steps[step.id]
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_50%,rgba(10,14,19,0.32)_95%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-ink/85 via-ink/40 to-transparent md:inset-x-auto md:left-0 md:h-full md:w-[460px] md:bg-gradient-to-r md:from-ink/70 md:via-ink/25" />
      {/* phones: top band; desktop: left column, so the road ahead stays clear */}
      <div className="relative mx-auto w-full max-w-md px-4 pt-[calc(var(--safe-top)+70px)] md:mx-0 md:ml-8 md:max-w-[400px]">
        <motion.div initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease }}>
          <div className="flex items-center justify-between">
            <div className="eyebrow flex items-center gap-2 text-go">
              <span className="relative h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-go" />
                <span className="pulse-ring absolute inset-0 rounded-full bg-go" />
              </span>
              {sc.hint ?? 'Trykk i bildet'}
            </div>
            <div className="num rounded-full bg-white/8 px-2.5 py-1 text-[12px] font-extrabold ring-1 ring-white/10">
              {step.found.length}/{step.targets.length}
            </div>
          </div>
          <h2 className="display-tight mt-2 text-[clamp(26px,7.6vw,40px)]">{sc.prompt}</h2>
          <div className="mt-3">
            <TimerBar runner={runner} startedAt={step.startedAt} limit={step.timeLimit} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ───────────── reaction step ───────────── */

export function BrakeButton({ ui, onBrake, content }: { ui: RunnerUI; onBrake: () => void; content: ScenarioContent }) {
  const r = ui.reaction!
  const sc = content.steps[r.stepId]
  const [hint, setHint] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 3200)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'b') {
        e.preventDefault()
        onBrake()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onBrake])
  return (
    <>
      <AnimatePresence>
        {hint && !r.pressed && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+70px)] z-30 flex justify-center px-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="rounded-full bg-ink/70 px-4 py-2 text-[13px] font-bold ring-1 ring-white/10 backdrop-blur-md">{sc.prompt}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        aria-label="Brems"
        onPointerDown={(e) => {
          e.preventDefault()
          onBrake()
        }}
        disabled={r.pressed}
        className="absolute bottom-[calc(var(--safe-bottom)+22px)] right-5 z-30 select-none md:right-8"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: r.pressed ? 0.92 : 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: spring }}
      >
        <div
          className={`relative grid h-[104px] w-[104px] place-items-center rounded-full transition-all duration-100 ${
            r.pressed ? 'translate-y-[6px] bg-[#b3261e] shadow-[0_1px_0_0_#6e130e]' : 'bg-stop shadow-[0_8px_0_0_#9c1c14,0_18px_40px_-8px_rgba(255,74,61,0.6)]'
          }`}
        >
          <div className="absolute inset-[7px] rounded-full ring-2 ring-white/25" />
          <div className="flex flex-col items-center">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
              <rect x="6" y="4" width="12" height="16" rx="3" />
              <path d="M9 8h6M9 12h6M9 16h6" />
            </svg>
            <span className="mt-0.5 text-[13px] font-black tracking-wider text-white" style={{ fontStretch: '120%' }}>
              {r.pressed ? 'BREMSER' : 'BREMS'}
            </span>
          </div>
        </div>
        <span className="mt-2 hidden text-center text-[11px] font-bold text-fog md:block">mellomrom</span>
      </motion.button>
    </>
  )
}

/* ───────────── feedback ───────────── */

export function FeedbackToast({ ui, content, onDismiss }: { ui: RunnerUI; content: ScenarioContent; onDismiss: () => void }) {
  const fb = ui.feedback!
  const oc = content.steps[fb.stepId]?.outcomes[fb.outcomeId]
  const positive = fb.result === 'perfect' || fb.result === 'good'
  const badge = fb.badge ? BADGES[fb.badge] : null
  return (
    <motion.div
      className="absolute inset-x-0 top-[calc(var(--safe-top)+64px)] z-30 flex justify-center px-4"
      initial={{ y: -30, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -20, opacity: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.55, ease: spring }}
      onClick={onDismiss}
    >
      <div className="panel w-full max-w-md overflow-hidden rounded-[26px]">
        <div className="flex gap-4 p-4">
          <motion.div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${positive ? 'bg-go text-ink' : 'bg-signal text-ink'}`}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.12, duration: 0.5, ease: spring }}
          >
            {positive ? <IconCheck size={26} /> : <span className="display text-[26px]">!</span>}
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="display-tight text-[21px] leading-[1.02]">{oc?.title}</div>
              <motion.div
                className="num shrink-0 rounded-full bg-signal px-2.5 py-1 text-[13px] font-black text-ink"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25, duration: 0.5, ease: spring }}
              >
                +{fb.xp} XP
              </motion.div>
            </div>
            <p className="mt-1.5 text-[14px] leading-snug text-mist">{oc?.body}</p>
            {badge && (
              <motion.div
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-go/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-go ring-1 ring-go/30"
                style={{ fontStretch: '115%' }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5, ease }}
              >
                {badge.icon} {badge.title}
              </motion.div>
            )}
          </div>
        </div>
        <motion.div className="h-1 origin-left bg-go/60" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 3.8, ease: 'linear' }} />
      </div>
    </motion.div>
  )
}

/**
 * Replay captions, synced to the replay's two camera languages:
 * driver view → "DU SÅ …", overhead reveal → "MEN DU OVERSÅ …", freeze-frame → both held.
 */
export function ReplayCaption({ runner, ui, def, content }: { runner: ScenarioRunner; ui: RunnerUI; def: ScenarioDef; content: ScenarioContent }) {
  const [info, setInfo] = useState<{ p: number; pov: boolean; frozen: boolean } | null>(null)
  useRaf(() => {
    const r = runner.replayInfo
    setInfo((prev) => (r === null ? null : prev && Math.abs(prev.p - r.p) < 0.02 && prev.pov === r.pov && prev.frozen === r.frozen ? prev : { ...r }))
  })
  const fb = ui.feedback
  if (!info || !fb) return null
  const oc = content.steps[fb.stepId]?.outcomes[fb.outcomeId]
  const saw = fb.sawActor ? actorLabel(def, content, fb.sawActor) : oc?.saw
  const lines: [string | null, string | null] = oc?.replay
    ? [oc.replay[0], oc.replay[1]]
    : [saw ? `Du så ${saw}.` : null, oc?.missed ? `${saw ? 'Men du' : 'Du'} overså ${oc.missed}.` : oc?.title ?? null]
  const showSecond = !info.pov || info.frozen || info.p > 0.6
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(11vh+18px)] z-30 flex flex-col items-center gap-1 px-5 text-center" aria-live="polite">
      <div className="mb-2 flex items-center gap-2 rounded-full bg-ink/70 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-md">
        <span className={`h-2 w-2 rounded-full ${info.frozen ? 'bg-ice' : 'rec bg-stop'}`} />
        <span className="eyebrow text-[10px] text-snow">{info.frozen ? 'Fryst' : info.pov ? 'Replay · din utsikt' : 'Replay · ovenfra'}</span>
      </div>
      <AnimatePresence>
        {lines[0] && (
          <motion.div key="l1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="display-tight text-[clamp(22px,5.4vw,40px)] text-snow [text-shadow:0_2px_18px_rgba(0,0,0,0.7)]">
            {lines[0]}
          </motion.div>
        )}
        {showSecond && lines[1] && (
          <motion.div key="l2" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35 }} className="display-tight text-[clamp(24px,6vw,46px)] text-signal [text-shadow:0_2px_18px_rgba(0,0,0,0.7)]">
            {lines[1]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MistakeCard({
  ui,
  def,
  content,
  onRetry,
  onContinue,
  onReplay,
}: {
  ui: RunnerUI
  def: ScenarioDef
  content: ScenarioContent
  onRetry: () => void
  onContinue: () => void
  onReplay: () => void
}) {
  const fb = ui.feedback!
  const oc = content.steps[fb.stepId]?.outcomes[fb.outcomeId]
  const saw = fb.sawActor ? actorLabel(def, content, fb.sawActor) : oc?.saw
  const missed = oc?.missed
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onContinue()
      if (e.key === 'r' || e.key === 'R') onRetry()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onContinue, onRetry])
  return (
    <motion.div className="absolute inset-0 z-30 flex flex-col justify-end md:items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-ink via-ink/80 to-transparent md:h-[30%] md:via-ink/30" />
      <motion.div
        className="relative mx-auto w-full max-w-md px-4 pb-[calc(var(--safe-bottom)+20px)] md:panel md:mx-0 md:mb-8 md:mr-8 md:rounded-[30px] md:p-6"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease }}
      >
        {saw && missed ? (
          <>
            <div className="text-[15px] font-extrabold uppercase tracking-wide text-fog" style={{ fontStretch: '115%' }}>
              Du så {saw}.
            </div>
            <h2 className={`display-tight mt-1 break-words ${missed.length > 10 ? 'text-[clamp(26px,7.4vw,36px)]' : 'text-[clamp(30px,8.4vw,44px)]'}`}>
              Men du overså <span className="text-signal">{missed}.</span>
            </h2>
          </>
        ) : missed ? (
          <h2 className={`display-tight break-words ${missed.length > 10 ? 'text-[clamp(26px,7.4vw,36px)]' : 'text-[clamp(30px,8.4vw,44px)]'}`}>
            Du overså <span className="text-signal">{missed}.</span>
          </h2>
        ) : (
          <h2 className="display-tight text-[clamp(30px,8.4vw,44px)]">{oc?.title}</h2>
        )}
        <p className="mt-3 text-[16px] leading-snug text-mist">{oc?.body}</p>
        {RULE_CARDS[content.id] && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.05] p-2.5 ring-1 ring-white/10">
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
              <DiagramSvg id={RULE_CARDS[content.id].diagram} />
            </span>
            <span className="min-w-0">
              <span className="eyebrow block text-[9.5px] text-signal">Regelen</span>
              <span className="block text-[14px] font-extrabold leading-tight">{RULE_CARDS[content.id].title}</span>
              <span className="block text-[11.5px] text-fog">{RULE_CARDS[content.id].source.section ? `Trafikkreglene ${RULE_CARDS[content.id].source.section}` : RULE_CARDS[content.id].source.title}</span>
            </span>
          </div>
        )}
        <div className="mt-6 flex gap-3">
          {fb.canRetry && (
            <button className="btn btn-primary h-[60px] flex-1 text-[16px]" onClick={onRetry}>
              <IconRetry size={20} /> Prøv igjen
            </button>
          )}
          <button className={`btn btn-ghost h-[60px] text-[16px] ${fb.canRetry ? 'px-5' : 'flex-1'}`} onClick={onContinue} aria-label="Fortsett">
            {fb.canRetry ? <IconArrow size={20} /> : <>Fortsett <IconArrow size={20} /></>}
          </button>
        </div>
        <button className="mx-auto mt-4 flex items-center gap-2 text-[13px] font-bold text-fog hover:text-snow" onClick={onReplay}>
          <IconEye size={16} /> Se replay igjen
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ───────────── impact ───────────── */

export function ImpactFlash({ trigger }: { trigger: number }) {
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <motion.div key={trigger} className="pointer-events-none absolute inset-0 z-40" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.3, ease: 'easeOut' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(255,40,30,0.55)_100%)]" />
          <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }} />
          <div className="absolute inset-0 grid place-items-center">
            <motion.div
              className="display text-[clamp(44px,13vw,120px)] text-white drop-shadow-[0_6px_30px_rgba(255,40,30,0.8)]"
              initial={{ scale: 1.6, opacity: 0, letterSpacing: '0.2em' }}
              animate={{ scale: 1, opacity: [0, 1, 1, 0], letterSpacing: '-0.02em' }}
              transition={{ duration: 1.2, times: [0, 0.15, 0.7, 1], ease }}
            >
              Nesten!
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ───────────── labels anchored to actors ───────────── */

export function ActorLabels({ ui, def, content }: { ui: RunnerUI; def: ScenarioDef; content: ScenarioContent }) {
  const items = useMemo(() => {
    const out: Array<{ id: string; tone: 'go' | 'signal' }> = []
    if (ui.phase === 'step' && ui.step?.kind === 'spot') ui.step.found.forEach((id) => out.push({ id, tone: 'go' }))
    else if (ui.feedback) {
      const tone = ui.feedback.blocking ? 'signal' : 'go'
      ui.feedback.highlight.forEach((id) => out.push({ id, tone }))
    }
    return out
  }, [ui.phase, ui.step, ui.feedback])
  return (
    <>
      {items.map((it) => (
        <Label key={it.id + it.tone} id={it.id} tone={it.tone} text={cap(actorLabel(def, content, it.id))} />
      ))}
    </>
  )
}

function Label({ id, tone, text }: { id: string; tone: 'go' | 'signal'; text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    registerAnchor(id, ref.current)
    return () => registerAnchor(id, null)
  }, [id])
  return (
    <div ref={ref} className="pointer-events-none absolute left-0 top-0 z-[25] opacity-0" style={{ willChange: 'transform' }}>
      <motion.div className="flex flex-col items-center" initial={{ scale: 0.5, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.45, ease: spring }}>
        <div
          className={`whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-black uppercase tracking-wide shadow-lg ${tone === 'go' ? 'bg-go text-ink' : 'bg-signal text-ink'}`}
          style={{ fontStretch: '115%' }}
        >
          {tone === 'go' ? '✓ ' : ''}
          {text}
        </div>
        <div className={`h-6 w-[2px] ${tone === 'go' ? 'bg-go' : 'bg-signal'}`} />
      </motion.div>
    </div>
  )
}

/* ───────────── tap ripple (spot) ───────────── */

export function TapRipples({ ripples }: { ripples: Array<{ id: number; x: number; y: number; ok: boolean | null }> }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[26]">
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.div
            key={r.id}
            className={`absolute h-14 w-14 rounded-full ring-2 ${r.ok === true ? 'ring-go' : r.ok === false ? 'ring-stop' : 'ring-white/60'}`}
            style={{ left: r.x - 28, top: r.y - 28 }}
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { haptic, sfx } from '../../audio/sfx'
import type { ActorView } from '../../engine/sim'
import { drive as autopilot } from '../../practice/autopilot'
import { AREA_LABELS, PracticeSession, VERDICT_LABELS, verdictOf, type Area, type Assessment } from '../../practice/session'
import { useLearning } from '../../state/learning'
import { useNav } from '../../state/nav'
import { Car, Person } from '../../three/models'
import { BenchmarkWorld } from '../../three/render/BenchmarkWorld'
import { initialTier, lowerTier, settingsFor, type QualityTier } from '../../three/render/quality'
import { FrameGuard } from '../../three/GameScene'
import { IconArrow, IconClose, IconRetry } from '../components/Icons'

/**
 * ØVELSESKJØRING (practice) / PRØVEKJØRING (exam, simulated) — the same
 * world and simulation as S1, but you drive. Training assessment only.
 */

type Mode = 'practice' | 'exam'

const AUTOPILOT = import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('autopilot') : null

export function PracticeScreen({ mode }: { mode: Mode }) {
  const [run, setRun] = useState(0)
  return <PracticeRun key={run} mode={mode} onAgain={() => setRun((r) => r + 1)} />
}

function PracticeRun({ mode, onAgain }: { mode: Mode; onAgain: () => void }) {
  const go = useNav((s) => s.go)
  const session = useMemo(() => new PracticeSession(mode), [mode])
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<Assessment | null>(null)
  const [, force] = useState(0)
  const practiceDone = useLearning((s) => s.practiceDone)
  const recorded = useRef(false)
  session.paused = !started || !!result

  useEffect(() => {
    if (import.meta.env.DEV) {
      const w = window as unknown as { __practice: PracticeSession; __practiceRun: (sec: number, kind?: 'careful' | 'careless') => void }
      w.__practice = session
      // screenshot/test hook: fast-forward the deterministic drive with the autopilot
      w.__practiceRun = (sec, kind = 'careful') => {
        for (let i = 0; i < sec * 60 && !session.finished; i++) {
          autopilot(session, kind)
          session.step()
        }
      }
    }
  }, [session])

  // UI refresh at ~10 Hz (instruction, speed) — the 3D runs on its own loop
  useEffect(() => {
    const t = setInterval(() => {
      force((n) => n + 1)
      if (session.finished && !recorded.current) {
        recorded.current = true
        const a = session.finished
        practiceDone(a.areas)
        sfx.play(verdictOf(a) === 'god' ? 'levelUp' : 'good')
        setTimeout(() => setResult(a), 900)
      }
    }, 100)
    return () => clearInterval(t)
  }, [session, practiceDone])

  useEffect(() => {
    if (session.instruction) {
      sfx.play('stepStart', { volume: 0.5 })
      haptic(12)
    }
  }, [session.instruction?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const controls = useControls(session, started && !result)
  const kmh = Math.round(session.player.v * 3.6)

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      <PracticeCanvas session={session} paused={!!result} />

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-ink/80 to-transparent px-4 pb-10 pt-[calc(var(--safe-top)+12px)]">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3">
          <button aria-label="Avslutt" onClick={() => go('map')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/55 ring-1 ring-white/12 backdrop-blur-md">
            <IconClose size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-[10px] text-signal">{mode === 'exam' ? 'Prøvekjøring · simulert' : 'Øvelseskjøring'}</div>
            <div className="truncate text-[12px] font-semibold text-mist">Treningsvurdering – ikke en offisiell kjøreprøve</div>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {session.instruction && started && (
            <motion.div
              key={session.instruction.id}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto mt-3 flex max-w-md items-start gap-3 rounded-2xl bg-ink/75 px-4 py-3 ring-1 ring-white/12 backdrop-blur-md"
              role="status"
              aria-live="assertive"
            >
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-black ${session.instruction.coach ? 'bg-ice text-ink' : 'bg-signal text-ink'}`}>
                {session.instruction.coach ? 'TIPS' : 'INS'}
              </span>
              <div>
                <div className="eyebrow text-[9px] text-fog">{session.instruction.coach ? 'Instruktøren tipser' : 'Instruktøren'}</div>
                <div className="text-[16px] font-bold leading-snug">{session.instruction.text}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* speed + status */}
      {started && !result && (
        <div className="pointer-events-none absolute left-4 top-[calc(var(--safe-top)+150px)] z-20 md:bottom-8 md:top-auto">
          <div className="rounded-2xl bg-ink/65 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-md">
            <div className={`num text-[30px] font-black leading-none ${kmh > 33 ? 'text-stop' : ''}`}>{kmh}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fog">km/t · 30</div>
          </div>
        </div>
      )}

      {started && !result && <TouchControls session={session} controls={controls} />}

      <AnimatePresence>{!started && <StartCard mode={mode} onStart={() => (sfx.unlock(), sfx.play('whoosh'), setStarted(true))} />}</AnimatePresence>
      <AnimatePresence>{result && <Report a={result} mode={mode} onAgain={onAgain} onMap={() => go('map')} />}</AnimatePresence>
    </div>
  )
}

/* ───────────── input ───────────── */

interface InputState {
  gas: boolean
  brake: boolean
  left: boolean
  right: boolean
  steerTouch: number | null
}

function useControls(session: PracticeSession, active: boolean) {
  const st = useRef<InputState>({ gas: false, brake: false, left: false, right: false, steerTouch: null })
  const apply = useCallback(() => {
    const s = st.current
    const steer = s.steerTouch ?? (s.left ? 1 : 0) + (s.right ? -1 : 0)
    session.setControls({ throttle: s.gas ? 1 : 0, brake: s.brake ? 1 : 0, steer })
  }, [session])
  useEffect(() => {
    if (!active) return
    const set = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase()
      const s = st.current
      if (k === 'w' || k === 'arrowup') s.gas = on
      else if (k === 's' || k === 'arrowdown' || k === ' ') s.brake = on
      else if (k === 'a' || k === 'arrowleft') s.left = on
      else if (k === 'd' || k === 'arrowright') s.right = on
      else if (k === 'q') session.look = on ? -1 : 0
      else if (k === 'e') session.look = on ? 1 : 0
      else if (on && (k === 'z' || k === ',')) session.indicator = session.indicator === 'left' ? null : 'left'
      else if (on && (k === 'x' || k === '.')) session.indicator = session.indicator === 'right' ? null : 'right'
      else return
      e.preventDefault()
      apply()
    }
    const down = (e: KeyboardEvent) => !e.repeat && set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [active, apply, session])
  return { st, apply }
}

function Hold({ label, sub, className, onChange }: { label: string; sub?: string; className: string; onChange: (on: boolean) => void }) {
  const [on, setOn] = useState(false)
  const set = (v: boolean) => {
    setOn(v)
    onChange(v)
    if (v) haptic(8)
  }
  return (
    <button
      className={`select-none touch-none rounded-[22px] font-black uppercase tracking-[0.08em] ring-1 transition-transform ${on ? 'scale-95' : ''} ${className}`}
      onPointerDown={(e) => {
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="block text-[14px]">{label}</span>
      {sub && <span className="hidden text-[10px] font-bold text-current/60 md:block">{sub}</span>}
    </button>
  )
}

function TouchControls({ session, controls }: { session: PracticeSession; controls: ReturnType<typeof useControls> }) {
  const pad = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const origin = useRef<number | null>(null)
  const [, force] = useState(0)
  const steerTo = (v: number | null) => {
    controls.st.current.steerTouch = v
    controls.apply()
    if (knob.current) knob.current.style.transform = `translateX(${-(v ?? 0) * 46}px)`
  }
  const ind = session.indicator
  const blink = (side: 'left' | 'right') => {
    session.indicator = session.indicator === side ? null : side
    sfx.play('tick')
    force((n) => n + 1)
  }
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(var(--safe-bottom)+14px)]">
      {/* indicators + head checks */}
      <div className="mx-auto mb-3 flex max-w-md items-center justify-center gap-2">
        <Hold label="◀ Se" sub="Q" className="h-12 w-[74px] bg-ink/60 text-snow ring-white/15 backdrop-blur-md" onChange={(on) => (session.look = on ? -1 : 0)} />
        <button aria-pressed={ind === 'left'} onClick={() => blink('left')} className={`h-12 w-14 rounded-[18px] text-[18px] font-black ring-1 backdrop-blur-md ${ind === 'left' ? 'bg-[#ffa020] text-ink ring-[#ffa020]' : 'bg-ink/60 ring-white/15'}`} aria-label="Blinklys venstre (Z)">
          ⇦
        </button>
        <button aria-pressed={ind === 'right'} onClick={() => blink('right')} className={`h-12 w-14 rounded-[18px] text-[18px] font-black ring-1 backdrop-blur-md ${ind === 'right' ? 'bg-[#ffa020] text-ink ring-[#ffa020]' : 'bg-ink/60 ring-white/15'}`} aria-label="Blinklys høyre (X)">
          ⇨
        </button>
        <Hold label="Se ▶" sub="E" className="h-12 w-[74px] bg-ink/60 text-snow ring-white/15 backdrop-blur-md" onChange={(on) => (session.look = on ? 1 : 0)} />
      </div>
      <div className="mx-auto flex max-w-3xl items-end justify-between gap-3">
        {/* steering pad */}
        <div
          ref={pad}
          className="relative h-[86px] w-[168px] touch-none select-none rounded-[26px] bg-ink/55 ring-1 ring-white/12 backdrop-blur-md md:hidden"
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            origin.current = e.clientX
          }}
          onPointerMove={(e) => {
            if (origin.current === null) return
            steerTo(Math.max(-1, Math.min(1, -(e.clientX - origin.current) / 60)))
          }}
          onPointerUp={() => {
            origin.current = null
            steerTo(null)
          }}
          onPointerCancel={() => {
            origin.current = null
            steerTo(null)
          }}
          aria-label="Ratt: dra til venstre eller høyre"
        >
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
          <div ref={knob} className="pointer-events-none absolute left-1/2 top-1/2 -ml-7 -mt-7 grid h-14 w-14 place-items-center rounded-full bg-snow text-[10px] font-black text-ink shadow-lg">
            RATT
          </div>
        </div>
        <div className="hidden rounded-2xl bg-ink/55 px-4 py-3 text-[12px] leading-relaxed text-mist ring-1 ring-white/10 backdrop-blur-md md:block">
          <b className="text-snow">W/S</b> gass/brems · <b className="text-snow">A/D</b> styr · <b className="text-snow">Q/E</b> se venstre/høyre · <b className="text-snow">Z/X</b> blinklys
        </div>
        {/* pedals */}
        <div className="flex items-end gap-2.5 md:hidden">
          <Hold label="Brems" className="h-[86px] w-[86px] bg-stop/85 text-snow ring-stop" onChange={(on) => ((controls.st.current.brake = on), controls.apply())} />
          <Hold label="Gass" className="h-[112px] w-[86px] bg-go/85 text-ink ring-go" onChange={(on) => ((controls.st.current.gas = on), controls.apply())} />
        </div>
      </div>
    </div>
  )
}

/* ───────────── 3D ───────────── */

function PracticeCanvas({ session, paused }: { session: PracticeSession; paused: boolean }) {
  const [tier, setTier] = useState<QualityTier>(initialTier)
  const quality = useMemo(() => settingsFor(tier), [tier])
  const focus = useRef(new THREE.Vector3())
  const view = (o: { x: number; z: number; h: number; v: number; a?: number }, extra: Partial<ActorView> = {}): ActorView => ({
    x: o.x,
    z: o.z,
    h: o.h,
    v: o.v,
    a: o.a ?? 0,
    visible: true,
    indicator: null,
    pose: 'auto',
    face: null,
    ...extra,
  })
  const getPlayer = useCallback(() => view(session.player, { indicator: session.indicator }), [session]) // eslint-disable-line react-hooks/exhaustive-deps
  const getCar = useCallback(() => ({ ...view(session.car), visible: session.car.active || session.car.x < 44 }), [session]) // eslint-disable-line react-hooks/exhaustive-deps
  const getWalker = useCallback(() => view(session.walker, { pose: session.walker.v > 0.1 ? 'walk' : 'idle' }), [session]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Canvas
      shadows={quality.shadows ? 'percentage' : false}
      dpr={quality.dpr}
      gl={{ antialias: !quality.post, powerPreference: 'high-performance' }}
      camera={{ fov: 58, near: 0.3, far: 900, position: [1.5, 3, 50] }}
      frameloop={paused ? 'never' : 'always'}
      onCreated={(state) => {
        if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state
      }}
      style={{ touchAction: 'none' }}
    >
      <BenchmarkWorld id="boliggate-kryss" quality={quality} focus={focus} />
      <Actor get={getPlayer}>
        <Car get={getPlayer} color="#E8E4DA" plate="EL 30001" />
      </Actor>
      <Actor get={getCar}>
        <Car get={getCar} color="#2F5D8A" plate="SV 48213" />
      </Actor>
      <Actor get={getWalker}>
        <Person get={getWalker} variant={2} />
      </Actor>
      <SessionDriver session={session} />
      <ChaseCam session={session} focus={focus} />
      <FrameGuard repeat disabled={tier === 'low'} onSlow={() => setTier((t) => lowerTier(t))} />
    </Canvas>
  )
}

function Actor({ get, children }: { get: () => ActorView; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const v = get()
    if (!ref.current) return
    ref.current.position.set(v.x, 0, v.z)
    ref.current.rotation.y = v.h
    ref.current.visible = v.visible
  })
  return <group ref={ref}>{children}</group>
}

function SessionDriver({ session }: { session: PracticeSession }) {
  useFrame((_, dt) => {
    if (AUTOPILOT && !session.paused) autopilot(session, AUTOPILOT === 'careless' ? 'careless' : 'careful')
    session.update(dt)
  }, -1)
  return null
}

function ChaseCam({ session, focus }: { session: PracticeSession; focus: React.MutableRefObject<THREE.Vector3> }) {
  const { camera, size } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const pos = useRef(new THREE.Vector3(1.5, 3, 52))
  const look = useRef(new THREE.Vector3(1.5, 1, 30))
  const h = useRef(Math.PI)
  const yaw = useRef(0)
  const acc = useRef(0)
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = session.player
    let dh = p.h - h.current
    while (dh > Math.PI) dh -= Math.PI * 2
    while (dh < -Math.PI) dh += Math.PI * 2
    h.current += dh * Math.min(1, dt * 3.2)
    if (import.meta.env.DEV && (window as unknown as { __camSnap?: boolean }).__camSnap) h.current = p.h
    acc.current += (p.a - acc.current) * Math.min(1, dt * 3)
    // head check: swing the view ~60° left/right (relative to the car)
    // (h grows to the left, so looking right is a negative yaw)
    const snap = import.meta.env.DEV && (window as unknown as { __camSnap?: boolean }).__camSnap ? 1 : 0
    yaw.current += (-session.look * 1.05 - yaw.current) * (snap || Math.min(1, dt * 7))
    const portrait = size.width / size.height < 0.9
    const back = (portrait ? 7.4 : 6.4) + p.v * 0.07 + acc.current * 0.12
    const up = portrait ? 3.4 : 2.7
    const fx = Math.sin(h.current)
    const fz = Math.cos(h.current)
    const desired = new THREE.Vector3(p.x - fx * back, up, p.z - fz * back)
    const lh = h.current + yaw.current
    const ahead = 9
    const target = new THREE.Vector3(p.x + Math.sin(lh) * ahead, 1.1, p.z + Math.cos(lh) * ahead)
    if (Math.abs(yaw.current) > 0.05) {
      // during a head check, move the eye to the driver seat height so the side road is visible
      desired.lerp(new THREE.Vector3(p.x + fx * 1.6, 1.75, p.z + fz * 1.6), Math.min(1, Math.abs(yaw.current)))
    }
    pos.current.lerp(desired, snap || 1 - Math.exp(-dt * 6))
    look.current.lerp(target, snap || 1 - Math.exp(-dt * 8))
    cam.position.copy(pos.current)
    cam.lookAt(look.current)
    const fov = (portrait ? 66 : 56) + p.v * 0.3
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    focus.current.set(p.x, 0, p.z)
  })
  return null
}

/* ───────────── cards ───────────── */

function StartCard({ mode, onStart }: { mode: Mode; onStart: () => void }) {
  return (
    <motion.div className="absolute inset-0 z-40 flex items-end justify-center bg-ink/55 p-4 pb-[calc(var(--safe-bottom)+20px)] backdrop-blur-[2px] sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="panel w-full max-w-[520px] rounded-[28px] p-6">
        <div className="eyebrow text-[10px] text-signal">{mode === 'exam' ? 'Prøvekjøring · simulert' : 'Øvelseskjøring'}</div>
        <h1 className="display-tight mt-2 text-[34px]">{mode === 'exam' ? 'Kjør som på prøve' : 'Nå kjører du selv'}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mist">
          {mode === 'exam'
            ? 'Instruktøren gir bare veibeskrivelse. Ingen hint, ingen pause. Du får en full vurdering etterpå.'
            : 'Følg instruktøren. Se deg rundt, gi tegn og tilpass farten. Du får en kjørevurdering etterpå.'}
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 text-[12.5px] text-mist">
          <li className="rounded-xl bg-white/5 px-3 py-2">
            <b className="text-snow">Gass / brems</b>
            <br />W / S · pedaler
          </li>
          <li className="rounded-xl bg-white/5 px-3 py-2">
            <b className="text-snow">Styre</b>
            <br />A / D · rattet
          </li>
          <li className="rounded-xl bg-white/5 px-3 py-2">
            <b className="text-snow">Se til siden</b>
            <br />Q / E · «Se»-knapper
          </li>
          <li className="rounded-xl bg-white/5 px-3 py-2">
            <b className="text-snow">Blinklys</b>
            <br />Z / X · pilknapper
          </li>
        </ul>
        <button className="btn btn-primary mt-6 h-[60px] w-full text-[16px]" onClick={onStart}>
          Start kjøringen <IconArrow />
        </button>
        <p className="mt-4 text-[11.5px] leading-snug text-fog">Trening i et simulert miljø. Erstatter ikke obligatorisk opplæring, kjøretimer med trafikklærer eller førerprøven.</p>
      </div>
    </motion.div>
  )
}

const AREAS: Area[] = ['observation', 'speedAdaptation', 'positioning', 'trafficRules']

function Report({ a, mode, onAgain, onMap }: { a: Assessment; mode: Mode; onAgain: () => void; onMap: () => void }) {
  const verdict = verdictOf(a)
  const faults = a.events.filter((e) => e.kind !== 'good')
  const good = a.events.filter((e) => e.kind === 'good')
  const tone = verdict === 'god' ? 'text-go' : verdict === 'ova' ? 'text-signal' : 'text-stop'
  return (
    <motion.div className="absolute inset-0 z-50 overflow-y-auto bg-ink/85 px-4 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+20px)] backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mx-auto max-w-[620px]">
        <div className="eyebrow text-[10px] text-fog">{mode === 'exam' ? 'Simulert prøvekjøring' : 'Øvelseskjøring'} · treningsvurdering</div>
        <h1 className="display mt-2 text-[clamp(40px,11vw,64px)]">Kjøre&shy;vurdering</h1>
        <div className={`display-tight mt-3 text-[26px] ${tone}`}>{VERDICT_LABELS[verdict]}</div>
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {AREAS.map((k) => {
            const v = a.areas[k]
            return (
              <div key={k} className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/8">
                <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-fog">{AREA_LABELS[k]}</div>
                <div className={`num mt-1 text-[30px] font-black ${v >= 0.85 ? 'text-go' : v >= 0.6 ? 'text-signal' : 'text-stop'}`}>{Math.round(v * 100)}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className={`h-full rounded-full ${v >= 0.85 ? 'bg-go' : v >= 0.6 ? 'bg-signal' : 'bg-stop'}`} style={{ width: `${v * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        {faults.length > 0 && (
          <section className="mt-7">
            <div className="eyebrow mb-2 text-[10px] text-stop">Dette må du øve på</div>
            <ul className="space-y-2">
              {faults.map((e, k) => (
                <li key={k} className="flex gap-3 rounded-2xl bg-stop/[0.07] p-3.5 ring-1 ring-stop/20">
                  <span className={`mt-0.5 shrink-0 text-[11px] font-black uppercase ${e.kind === 'minor' ? 'text-signal' : 'text-stop'}`}>{e.kind === 'minor' ? 'Mindre' : e.kind === 'major' ? 'Alvorlig' : 'Farlig'}</span>
                  <span className="flex-1 text-[14px] leading-snug">
                    {e.text}
                    <span className="mt-0.5 block text-[11px] text-fog">{AREA_LABELS[e.area]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {good.length > 0 && (
          <section className="mt-6">
            <div className="eyebrow mb-2 text-[10px] text-go">Dette gjorde du bra</div>
            <ul className="space-y-2">
              {good.map((e, k) => (
                <li key={k} className="flex gap-3 rounded-2xl bg-go/[0.06] p-3.5 ring-1 ring-go/20">
                  <span className="shrink-0 text-go">✓</span>
                  <span className="text-[14px] leading-snug">{e.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="mt-8 flex gap-3">
          <button className="btn btn-primary h-[58px] flex-1 text-[15px]" onClick={onAgain}>
            <IconRetry /> Kjør igjen
          </button>
          <button className="btn btn-ghost h-[58px] flex-1 text-[15px]" onClick={onMap}>
            Til kartet
          </button>
        </div>
        <p className="mt-6 text-[11.5px] leading-snug text-fog">
          Treningsvurdering i et simulert miljø, laget for å øve. Den er ikke en offisiell vurdering, sier ikke om du vil bestå førerprøven, og erstatter ikke obligatorisk opplæring eller kjøretimer med trafikklærer.
        </p>
      </div>
    </motion.div>
  )
}

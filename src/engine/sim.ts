import type { Path, PathSample } from './path'
import type { ActorDef, ActorKind, CameraShot, Cue, Pose, SoundId, SpeedCmd } from './types'

/**
 * Deterministic traffic simulation. Every actor moves along a Path; its
 * speed is controlled by a program of commands (and optional car-following).
 * No rendering here — the same code runs in tests and in the browser.
 */

export const DT = 1 / 120

export const DIMS: Record<ActorKind, { len: number; wid: number; accel: number; decel: number }> = {
  car: { len: 4.4, wid: 1.85, accel: 2.2, decel: 3.5 },
  van: { len: 5.4, wid: 2.05, accel: 1.8, decel: 3.2 },
  bus: { len: 12, wid: 2.55, accel: 1.2, decel: 2.5 },
  cyclist: { len: 1.8, wid: 0.6, accel: 1.5, decel: 3 },
  pedestrian: { len: 0.5, wid: 0.55, accel: 2.5, decel: 4 },
  child: { len: 0.4, wid: 0.45, accel: 4, decel: 5 },
  ball: { len: 0.24, wid: 0.24, accel: 6, decel: 1.5 },
}

export interface ActorView {
  x: number
  z: number
  h: number
  v: number
  a: number
  visible: boolean
  indicator: 'left' | 'right' | 'hazard' | null
  pose: Pose
  face: number | null
}

export interface ActorRuntime {
  def: ActorDef
  path: Path
  s: number
  v: number
  a: number
  program: SpeedCmd[]
  pc: number
  active: SpeedCmd
  view: ActorView
  hardBraking: boolean
  len: number
  wid: number
}

export type SimEvent =
  | { type: 'sound'; sound: SoundId; actor?: string; x?: number; z?: number }
  | { type: 'camera'; shot: CameraShot | null }
  | { type: 'mark'; label: string }

export interface Frame {
  t: number
  views: ActorView[]
}

export interface SimSnapshot {
  t: number
  actors: Array<{
    s: number
    v: number
    a: number
    program: SpeedCmd[]
    pc: number
    active: SpeedCmd
    view: ActorView
    hardBraking: boolean
  }>
  cues: Cue[]
  cueIdx: number
}

const HISTORY_SECONDS = 7
const HISTORY_EVERY = 2 // record every 2 ticks (60 Hz)

export class Sim {
  t = 0
  actors: ActorRuntime[] = []
  byId = new Map<string, ActorRuntime>()
  cues: Cue[] = []
  cueIdx = 0
  events: SimEvent[] = []
  history: Frame[] = []
  private tick = 0
  private tmp: PathSample = { x: 0, z: 0, h: 0 }

  constructor(defs: ActorDef[], cues: Cue[] = []) {
    for (const def of defs) {
      const d = DIMS[def.kind]
      const v0 = def.v0 ?? 0
      const rt: ActorRuntime = {
        def,
        path: def.path,
        s: def.s0 ?? 0,
        v: v0,
        a: 0,
        program: [...(def.program ?? [])].sort((a, b) => a.at - b.at),
        pc: 0,
        active: { at: 0, v: v0 },
        view: {
          x: 0,
          z: 0,
          h: 0,
          v: v0,
          a: 0,
          visible: def.visible ?? true,
          indicator: def.indicator ?? null,
          pose: 'auto',
          face: null,
        },
        hardBraking: false,
        len: d.len,
        wid: d.wid,
      }
      this.actors.push(rt)
      this.byId.set(def.id, rt)
    }
    this.cues = [...cues].sort((a, b) => a.at - b.at)
    this.updateViews()
    this.record()
  }

  get(id: string) {
    const a = this.byId.get(id)
    if (!a) throw new Error(`Unknown actor ${id}`)
    return a
  }

  /** Replace an actor's future program with commands relative to `base` time. */
  setCommands(id: string, cmds: SpeedCmd[], base = this.t) {
    const a = this.get(id)
    const kept = a.program.slice(0, a.pc)
    const fresh = cmds.map((c) => ({ ...c, at: c.abs ? Math.max(c.at, this.t) : base + c.at })).sort((x, y) => x.at - y.at)
    a.program = [...kept, ...fresh]
    // pc stays: kept commands are already applied
  }

  addCues(cues: Cue[], base = this.t) {
    const fresh = cues.map((c) => ({ ...c, at: base + c.at }))
    const rest = this.cues.slice(this.cueIdx)
    this.cues = [...this.cues.slice(0, this.cueIdx), ...[...rest, ...fresh].sort((a, b) => a.at - b.at)]
  }

  /** Advance the simulation by `dt` seconds (internally fixed steps). */
  advance(dt: number) {
    let remaining = dt
    while (remaining > 1e-9) {
      const h = Math.min(DT, remaining)
      this.stepOnce(h)
      remaining -= h
    }
  }

  private stepOnce(dt: number) {
    this.t += dt
    // cues
    while (this.cueIdx < this.cues.length && this.cues[this.cueIdx].at <= this.t) {
      this.applyCue(this.cues[this.cueIdx])
      this.cueIdx++
    }
    // programs
    for (const a of this.actors) {
      while (a.pc < a.program.length && a.program[a.pc].at <= this.t) {
        const c = a.program[a.pc]
        if (c.setS !== undefined) a.s = c.setS
        if (c.setV !== undefined) a.v = c.setV
        if (c.v !== undefined || c.stopAt !== undefined) a.active = c
        a.pc++
      }
    }
    // dynamics
    for (const a of this.actors) {
      const d = DIMS[a.def.kind]
      const c = a.active
      let acc: number
      if (c.stopAt !== undefined) {
        const rem = c.stopAt - a.s
        const pref = c.decel ?? d.decel
        if (rem <= 0.01) {
          a.v = 0
          acc = 0
        } else {
          const need = (a.v * a.v) / (2 * rem)
          if (need >= pref * 0.98) acc = -need
          else {
            const vmax = c.v ?? Math.max(a.v, 1.2)
            acc = clamp(3 * (vmax - a.v), -pref, c.accel ?? d.accel)
          }
        }
      } else {
        const target = c.v ?? a.v
        acc = clamp(2.6 * (target - a.v), -(c.decel ?? d.decel), c.accel ?? d.accel)
      }

      if (a.def.follow) {
        const leader = this.byId.get(a.def.follow.leader)
        if (leader) {
          const gap = leader.s - a.s - (leader.len + a.len) / 2
          const v0 = Math.max(0.1, c.v ?? 8)
          const T = a.def.follow.headway ?? 1.2
          const s0 = a.def.follow.gap
          const amax = d.accel
          const b = 2.5
          const dv = a.v - leader.v
          const sStar = s0 + Math.max(0, a.v * T + (a.v * dv) / (2 * Math.sqrt(amax * b)))
          const idm = amax * (1 - Math.pow(a.v / v0, 4) - Math.pow(sStar / Math.max(gap, 0.3), 2))
          acc = Math.min(acc, Math.max(idm, -9))
        }
      }

      a.a = acc
      a.v = Math.max(0, a.v + acc * dt)
      a.s += a.v * dt

      // automatic hard-brake sound for vehicles
      const isVehicle = a.def.kind === 'car' || a.def.kind === 'van' || a.def.kind === 'bus'
      if (isVehicle) {
        if (!a.hardBraking && acc < -4.6 && a.v > 2) {
          a.hardBraking = true
          this.events.push({ type: 'sound', sound: 'screech', actor: a.def.id })
        } else if (a.hardBraking && (acc > -2 || a.v < 0.5)) {
          a.hardBraking = false
        }
      }
    }
    this.updateViews()
    this.tick++
    if (this.tick % HISTORY_EVERY === 0) this.record()
  }

  private applyCue(c: Cue) {
    switch (c.type) {
      case 'indicator':
        this.get(c.actor).view.indicator = c.side
        break
      case 'pose':
        this.get(c.actor).view.pose = c.pose
        break
      case 'face':
        this.get(c.actor).view.face = c.heading
        break
      case 'visible':
        this.get(c.actor).view.visible = c.visible
        break
      case 'sound': {
        const a = c.actor ? this.byId.get(c.actor) : undefined
        this.events.push({ type: 'sound', sound: c.sound, actor: c.actor, x: a?.view.x, z: a?.view.z })
        break
      }
      case 'camera':
        this.events.push({ type: 'camera', shot: c.shot })
        break
      case 'mark':
        this.events.push({ type: 'mark', label: c.label })
        break
    }
  }

  private updateViews() {
    for (const a of this.actors) {
      const p = a.path.sample(a.s, this.tmp)
      a.view.x = p.x
      a.view.z = p.z
      a.view.h = p.h
      a.view.v = a.v
      a.view.a = a.a
    }
  }

  private record() {
    this.history.push({ t: this.t, views: this.actors.map((a) => ({ ...a.view })) })
    const cutoff = this.t - HISTORY_SECONDS
    let drop = 0
    while (drop < this.history.length && this.history[drop].t < cutoff) drop++
    if (drop > 0) this.history.splice(0, drop)
  }

  /** Interpolated historical view of all actors at time t (for replays). */
  frameAt(t: number): ActorView[] {
    const hist = this.history
    if (hist.length === 0) return this.actors.map((a) => a.view)
    if (t <= hist[0].t) return hist[0].views
    if (t >= hist[hist.length - 1].t) return hist[hist.length - 1].views
    let lo = 0
    let hi = hist.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (hist[mid].t <= t) lo = mid
      else hi = mid
    }
    const A = hist[lo]
    const B = hist[hi]
    const k = (t - A.t) / (B.t - A.t || 1)
    return A.views.map((va, i) => {
      const vb = B.views[i]
      return {
        ...va,
        x: va.x + (vb.x - va.x) * k,
        z: va.z + (vb.z - va.z) * k,
        h: va.h + angleDiff(va.h, vb.h) * k,
        v: va.v + (vb.v - va.v) * k,
        a: va.a + (vb.a - va.a) * k,
      }
    })
  }

  snapshot(): SimSnapshot {
    return {
      t: this.t,
      actors: this.actors.map((a) => ({
        s: a.s,
        v: a.v,
        a: a.a,
        program: a.program.map((c) => ({ ...c })),
        pc: a.pc,
        active: { ...a.active },
        view: { ...a.view },
        hardBraking: a.hardBraking,
      })),
      cues: this.cues.map((c) => ({ ...c })),
      cueIdx: this.cueIdx,
    }
  }

  restore(s: SimSnapshot) {
    this.t = s.t
    s.actors.forEach((src, i) => {
      const a = this.actors[i]
      a.s = src.s
      a.v = src.v
      a.a = src.a
      a.program = src.program.map((c) => ({ ...c }))
      a.pc = src.pc
      a.active = { ...src.active }
      a.view = { ...src.view }
      a.hardBraking = src.hardBraking
    })
    this.cues = s.cues.map((c) => ({ ...c }))
    this.cueIdx = s.cueIdx
    this.history = []
    this.events = []
    this.updateViews()
    this.record()
  }

  drainEvents() {
    const e = this.events
    this.events = []
    return e
  }
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

export function angleDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/** Oriented-rectangle separation distance (approx; 0 when overlapping). Used by tests & tuning. */
export function obbGap(a: ActorRuntime, b: ActorRuntime) {
  const corners = (r: ActorRuntime) => {
    const { x, z, h } = r.view
    const fx = Math.sin(h)
    const fz = Math.cos(h)
    const rx = -Math.cos(h)
    const rz = Math.sin(h)
    const hl = r.len / 2
    const hw = r.wid / 2
    return [
      [x + fx * hl + rx * hw, z + fz * hl + rz * hw],
      [x + fx * hl - rx * hw, z + fz * hl - rz * hw],
      [x - fx * hl - rx * hw, z - fz * hl - rz * hw],
      [x - fx * hl + rx * hw, z - fz * hl + rz * hw],
    ] as const
  }
  const A = corners(a)
  const B = corners(b)
  const axes: Array<[number, number]> = []
  for (const P of [A, B]) {
    for (let i = 0; i < 2; i++) {
      const [x1, z1] = P[i]
      const [x2, z2] = P[i + 1]
      const ex = x2 - x1
      const ez = z2 - z1
      const l = Math.hypot(ex, ez) || 1
      axes.push([-ez / l, ex / l])
    }
  }
  let maxSep = -Infinity
  for (const [ax, az] of axes) {
    let minA = Infinity
    let maxA = -Infinity
    let minB = Infinity
    let maxB = -Infinity
    for (const [x, z] of A) {
      const p = x * ax + z * az
      minA = Math.min(minA, p)
      maxA = Math.max(maxA, p)
    }
    for (const [x, z] of B) {
      const p = x * ax + z * az
      minB = Math.min(minB, p)
      maxB = Math.max(maxB, p)
    }
    const sep = Math.max(minB - maxA, minA - maxB)
    maxSep = Math.max(maxSep, sep)
  }
  return Math.max(0, maxSep)
}

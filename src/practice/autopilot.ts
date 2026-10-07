import { DT, type Controls, type PracticeSession } from './session'

/**
 * Scripted drivers for tests and demos (not used in normal play).
 *  - careful: slows down, head-checks, signals, yields to the car and the pedestrian
 *  - careless: fast, no head checks, no signal, never yields
 * Steering: pure pursuit along the instructor's route.
 */

const PATH: Array<[number, number]> = (() => {
  const pts: Array<[number, number]> = []
  for (let z = 44; z >= 6; z -= 1) pts.push([1.5, z])
  // left turn: arc centred (−6, 6), radius 7.5, from (1.5, 6) to (−6, −1.5)
  for (let i = 1; i <= 16; i++) {
    const a = (-Math.PI / 2) * (i / 16)
    pts.push([-6 + Math.cos(a) * 7.5, 6 + Math.sin(a) * 7.5])
  }
  for (let x = -7; x >= -80; x -= 1) pts.push([x, -1.5])
  return pts
})()

const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function steerFor(s: PracticeSession, look = 5.5): number {
  const p = s.player
  let best = 0
  let bd = Infinity
  PATH.forEach(([x, z], i) => {
    const d = Math.hypot(x - p.x, z - p.z)
    if (d < bd) {
      bd = d
      best = i
    }
  })
  let k = best
  while (k < PATH.length - 1 && Math.hypot(PATH[k][0] - p.x, PATH[k][1] - p.z) < look) k++
  const [tx, tz] = PATH[k]
  const alpha = wrap(Math.atan2(tx - p.x, tz - p.z) - p.h)
  const delta = Math.atan((2 * 2.62 * Math.sin(alpha)) / look)
  const maxSteer = 0.6 / (1 + p.v / 10)
  return Math.max(-1, Math.min(1, delta / maxSteer))
}

function speedTo(s: PracticeSession, target: number, stopIn?: number): Partial<Controls> {
  const v = s.player.v
  if (stopIn !== undefined) {
    if (stopIn < 0.4) return { throttle: 0, brake: v > 0.05 ? 0.8 : 0.3 }
    const need = (v * v) / (2 * Math.max(0.3, stopIn))
    if (need > 1.2) return { throttle: 0, brake: Math.min(1, need / 7.5 + 0.05) }
    target = Math.min(target, Math.sqrt(2 * 1.6 * stopIn))
  }
  if (v < target - 0.1) return { throttle: Math.min(1, (target - v) * 0.9 + 0.15), brake: 0 }
  if (v > target + 0.25) return { throttle: 0, brake: Math.min(1, (v - target) * 0.35) }
  return { throttle: 0.12, brake: 0 }
}

export type DriverKind = 'careful' | 'careless'

export function drive(s: PracticeSession, kind: DriverKind) {
  const p = s.player
  const steer = steerFor(s)
  if (kind === 'careless') {
    s.indicator = null
    s.look = 0
    s.setControls({ steer, ...speedTo(s, p.x < -30 ? 0 : 11, p.x < -30 ? Math.max(0, p.x + 40) : undefined) })
    return
  }
  // careful
  s.indicator = p.z < 32 && p.x > -10 ? 'left' : null
  s.look = p.z < 21 && p.z > 19 ? 1 : p.z < 18.5 && p.z > 16.5 ? -1 : 0
  const car = s.car
  const w = s.walker
  let target = p.z > 16 ? 7.5 : 4
  let stopIn: number | undefined
  // yield to the car from the right before turning left
  if (p.z > 4 && (!car.active || car.x > -R_CLEAR)) stopIn = p.z - 5.2
  // yield to the pedestrian crossing the road we turn into
  else if (p.x > -3 && w.active && w.z > -3.8 && w.z < 6) stopIn = Math.max(0, p.x + 1.2) + Math.max(0, p.z + 0.5) * 0.5
  if (p.x < -6) target = 6
  if (p.x < -28) stopIn = p.x + 38
  if (!car.active && p.z > 4 && p.z < 23) stopIn = undefined // car not yet released — keep rolling slowly
  s.setControls({ steer, ...speedTo(s, target, stopIn) })
}

const R_CLEAR = 5

/** Run a whole drive headlessly. */
export function runDrive(s: PracticeSession, kind: DriverKind, maxSeconds = 120) {
  for (let i = 0; i < maxSeconds / DT && !s.finished; i++) {
    drive(s, kind)
    s.step()
  }
  return s.finished
}

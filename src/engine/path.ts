/**
 * Paths are dense polylines sampled every SAMPLE metres, built with a small
 * "turtle" API so every curve is tangent-continuous (no kinks when a car
 * moves from a straight into a turn).
 *
 * Coordinate system (matches three.js):
 *   x = east (right on screen), z = south (towards the default camera)
 *   heading h = rotation.y, direction = (sin h, cos h)
 *   h = 0 → facing +z (south), h = π → facing −z (north)
 *   A RIGHT turn decreases h, a LEFT turn increases h.
 */

export type P2 = readonly [number, number]

const SAMPLE = 0.1

export interface PathSample {
  x: number
  z: number
  h: number
}

export class Path {
  readonly xs: Float32Array
  readonly zs: Float32Array
  readonly hs: Float32Array
  readonly length: number

  constructor(xs: number[], zs: number[], hs: number[]) {
    this.xs = Float32Array.from(xs)
    this.zs = Float32Array.from(zs)
    this.hs = Float32Array.from(hs)
    this.length = (xs.length - 1) * SAMPLE
  }

  /** Sample position/heading at distance s (clamped, extrapolated linearly past the ends). */
  sample(s: number, out: PathSample = { x: 0, z: 0, h: 0 }): PathSample {
    const n = this.xs.length
    if (s <= 0) {
      const h = this.hs[0]
      out.x = this.xs[0] + Math.sin(h) * s
      out.z = this.zs[0] + Math.cos(h) * s
      out.h = h
      return out
    }
    if (s >= this.length) {
      const h = this.hs[n - 1]
      const d = s - this.length
      out.x = this.xs[n - 1] + Math.sin(h) * d
      out.z = this.zs[n - 1] + Math.cos(h) * d
      out.h = h
      return out
    }
    const f = s / SAMPLE
    const i = Math.floor(f)
    const t = f - i
    out.x = this.xs[i] + (this.xs[i + 1] - this.xs[i]) * t
    out.z = this.zs[i] + (this.zs[i + 1] - this.zs[i]) * t
    out.h = lerpAngle(this.hs[i], this.hs[i + 1], t)
    return out
  }

  /** Distance along the path of the sample closest to a point (coarse search). */
  closestS(x: number, z: number): number {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < this.xs.length; i += 2) {
      const dx = this.xs[i] - x
      const dz = this.zs[i] - z
      const d = dx * dx + dz * dz
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best * SAMPLE
  }
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export const deg = (d: number) => (d * Math.PI) / 180

/** Turtle-style path builder. */
export class PathBuilder {
  private xs: number[] = []
  private zs: number[] = []
  private hs: number[] = []
  private x: number
  private z: number
  private h: number

  constructor(x: number, z: number, heading: number) {
    this.x = x
    this.z = z
    this.h = heading
    this.push()
  }

  /** Start at (x,z) facing compass direction. */
  static from(x: number, z: number, facing: 'N' | 'S' | 'E' | 'W' | number) {
    const h =
      typeof facing === 'number'
        ? facing
        : { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 }[facing]
    return new PathBuilder(x, z, h)
  }

  private push() {
    this.xs.push(this.x)
    this.zs.push(this.z)
    this.hs.push(this.h)
  }

  forward(d: number) {
    const n = Math.max(1, Math.round(d / SAMPLE))
    const step = d / n
    for (let i = 0; i < n; i++) {
      this.x += Math.sin(this.h) * step
      this.z += Math.cos(this.h) * step
      this.push()
    }
    return this
  }

  /** Drive forward until the given axis coordinate is reached (for straight segments). */
  forwardTo(axis: 'x' | 'z', value: number) {
    const dir = axis === 'x' ? Math.sin(this.h) : Math.cos(this.h)
    const cur = axis === 'x' ? this.x : this.z
    const d = (value - cur) / dir
    if (d > 0) this.forward(d)
    return this
  }

  private arc(radius: number, angle: number, sign: 1 | -1) {
    // exact circular arc around the turn centre
    const left = sign === 1
    // left vector = (cos h, −sin h); right vector = (−cos h, sin h)
    const lx = left ? Math.cos(this.h) : -Math.cos(this.h)
    const lz = left ? -Math.sin(this.h) : Math.sin(this.h)
    const cx = this.x + lx * radius
    const cz = this.z + lz * radius
    const startH = this.h
    const length = Math.abs(angle) * radius
    const n = Math.max(2, Math.round(length / SAMPLE))
    for (let i = 1; i <= n; i++) {
      const h = startH + sign * angle * (i / n)
      // position = centre − leftvec(h) * radius
      const lhx = left ? Math.cos(h) : -Math.cos(h)
      const lhz = left ? -Math.sin(h) : Math.sin(h)
      this.x = cx - lhx * radius
      this.z = cz - lhz * radius
      this.h = h
      this.push()
    }
    return this
  }

  right(radius: number, angleDeg: number) {
    return this.arc(radius, deg(angleDeg), -1)
  }

  left(radius: number, angleDeg: number) {
    return this.arc(radius, deg(angleDeg), 1)
  }

  /** Smoothly shift sideways by `offset` metres (positive = right) over `length` metres. */
  shift(offset: number, length: number) {
    // two opposite arcs (S-curve)
    const half = length / 2
    const a = Math.abs(offset) / 2
    // radius for an arc covering chord (half, a): r = (half² + a²) / (2a)
    if (a < 1e-6) return this.forward(length)
    const r = (half * half + a * a) / (2 * a)
    const ang = (Math.asin(half / r) * 180) / Math.PI
    if (offset > 0) this.right(r, ang).left(r, ang)
    else this.left(r, ang).right(r, ang)
    return this
  }

  get pos() {
    return { x: this.x, z: this.z, h: this.h }
  }

  build() {
    return new Path(this.xs, this.zs, this.hs)
  }
}

/**
 * Single-lane roundabout route generator (right-hand traffic, counter-clockwise
 * when seen from above with north up).
 *
 * arms: 'S' = approach from the south heading north, 'W' = from the west heading east, etc.
 * exit: 1 = first exit (right), 2 = straight, 3 = left, 4 = U-turn
 */
export interface RoundaboutGeom {
  laneOffset: number // distance from arm centreline to lane centre
  circleR: number // circulating lane centre radius
  entryR: number // entry/exit curve radius
  armLength: number // how far out the route starts/ends
}

export function roundaboutRoute(
  g: RoundaboutGeom,
  from: 'S' | 'W' | 'N' | 'E',
  exit: 1 | 2 | 3 | 4,
  opts: { startDist?: number; endDist?: number } = {},
) {
  const a = g.laneOffset
  const Re = g.entryR
  const Rc = g.circleR
  const z1 = Math.sqrt((Re + Rc) ** 2 - (a + Re) ** 2)
  const alpha = (Math.acos((a + Re) / (Re + Rc)) * 180) / Math.PI
  const sweep = 2 * alpha + (exit - 2) * 90
  const start = opts.startDist ?? g.armLength
  const end = opts.endDist ?? g.armLength

  // template: from the south arm
  const b = new PathBuilder(a, start, Math.PI)
  b.forwardTo('z', z1).right(Re, alpha).left(Rc, sweep).right(Re, alpha)
  // after exiting we are on an arm heading outward; drive out to `end` metres from centre
  b.forward(Math.max(1, end - projectOut(b.pos)))
  const tpl = b.build()

  const rot = { S: 0, W: -Math.PI / 2, N: Math.PI, E: Math.PI / 2 }[from]
  return rotatePath(tpl, rot)
}

function projectOut(p: { x: number; z: number; h: number }) {
  // distance from centre along current heading direction
  return p.x * Math.sin(p.h) + p.z * Math.cos(p.h)
}

/** Rotate a path around the origin by θ (three.js rotation.y semantics). */
export function rotatePath(p: Path, theta: number) {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const xs: number[] = []
  const zs: number[] = []
  const hs: number[] = []
  for (let i = 0; i < p.xs.length; i++) {
    const x = p.xs[i]
    const z = p.zs[i]
    xs.push(x * c + z * s)
    zs.push(-x * s + z * c)
    hs.push(p.hs[i] + theta)
  }
  return new Path(xs, zs, hs)
}

/** Straight path between two points. */
export function line(x0: number, z0: number, x1: number, z1: number) {
  const h = Math.atan2(x1 - x0, z1 - z0)
  return new PathBuilder(x0, z0, h).forward(Math.hypot(x1 - x0, z1 - z0)).build()
}

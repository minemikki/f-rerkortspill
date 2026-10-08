import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ActorView } from '../../engine/sim'

/**
 * Semi-realistic procedural people (adult, child, jogger) and cyclists.
 *
 * Each character is ONE SkinnedMesh (one draw call + shadow) with a 17-bone
 * rig. Body parts are lathed, tapered limbs with blended skin weights at the
 * joints, so knees, elbows and hips bend smoothly. Clothing is vertex colour
 * on a single shared material. Motion is procedural (gait cycles, idle
 * breathing, look-around, recoil) driven by the deterministic sim's
 * ActorView — no clips to download, and it always matches the simulation.
 *
 * Proportions follow real anthropometry (adult ≈ 7.5 heads, child ≈ 5.5).
 * Faces are deliberately abstract (no uncanny realism); a nose and hair
 * parting make head direction readable from a distance — that matters,
 * because "is that pedestrian looking at me?" is part of the lesson.
 */

type ViewGetter = () => ActorView

export type BodyKind = 'adult' | 'child' | 'jogger' | 'cyclist'

interface Outfit {
  top: string
  bottom: string
  shoes: string
  skin: string
  hair: string
  hat?: string
  backpack?: string
  /** jogger: shorts → bare shins */
  shorts?: boolean
  /** long coat hem below the hips */
  coat?: boolean
  hood?: boolean
}

const SKIN = ['#efc9a8', '#d9a882', '#b98462', '#8a5e43', '#f3d5bd']

/** Norwegian everyday palette: muted outdoor jackets, one bright rain jacket. */
export const ADULT_OUTFITS: Outfit[] = [
  { top: '#2c3e57', bottom: '#3a4f6e', shoes: '#ece9e2', skin: SKIN[0], hair: '#4a3324', hood: true }, // navy parka, jeans
  { top: '#c9b48f', bottom: '#2b2d31', shoes: '#3b2a20', skin: SKIN[4], hair: '#d2b27a', coat: true }, // beige trench
  { top: '#e8b923', bottom: '#2f3540', shoes: '#25282c', skin: SKIN[1], hair: '#6b4a30', hood: true }, // yellow rain jacket
  { top: '#56623f', bottom: '#5b5e63', shoes: '#2a2622', skin: SKIN[2], hair: '#1b1410' }, // olive jacket
  { top: '#a63a32', bottom: '#38475e', shoes: '#ece9e2', skin: SKIN[0], hair: '#b8b4ae', hat: '#2b2d31' }, // red jacket, grey hair, beanie (senior)
  { top: '#e8573b', bottom: '#1c1f24', shoes: '#f2f2f2', skin: SKIN[1], hair: '#2a1d16', shorts: true }, // jogger (variant 5)
]

export const CHILD_OUTFITS: Outfit[] = [
  { top: '#e0453a', bottom: '#27324a', shoes: '#f0c419', skin: SKIN[0], hair: '#c79a5a', hat: '#2f6fb2', backpack: '#2f6fb2' },
  { top: '#2f8fd8', bottom: '#4b4f56', shoes: '#2b2b2b', skin: SKIN[2], hair: '#1b1410', backpack: '#f0c419' },
  { top: '#3c9a5f', bottom: '#2c3e57', shoes: '#e0453a', skin: SKIN[4], hair: '#6b4a30', hat: '#f0c419' },
]

export const RIDER_OUTFITS: Outfit[] = [
  { top: '#2b2f36', bottom: '#3a4f6e', shoes: '#ece9e2', skin: SKIN[0], hair: '#4a3324', hat: '#f2efe8' },
  { top: '#c4553b', bottom: '#2b2d31', shoes: '#25282c', skin: SKIN[1], hair: '#1b1410', hat: '#2b2f36' },
  { top: '#3b6e8f', bottom: '#2f3540', shoes: '#f2f2f2', skin: SKIN[3], hair: '#151515', hat: '#e8b923' },
]

/* ───────────── rig ───────────── */

const B = {
  root: 0,
  pelvis: 1,
  spine: 2,
  chest: 3,
  neck: 4,
  head: 5,
  upperArmL: 6,
  foreArmL: 7,
  upperArmR: 8,
  foreArmR: 9,
  thighL: 10,
  shinL: 11,
  footL: 12,
  thighR: 13,
  shinR: 14,
  footR: 15,
} as const
type BoneName = keyof typeof B
const PARENT: Record<BoneName, BoneName | null> = {
  root: null,
  pelvis: 'root',
  spine: 'pelvis',
  chest: 'spine',
  neck: 'chest',
  head: 'neck',
  upperArmL: 'chest',
  foreArmL: 'upperArmL',
  upperArmR: 'chest',
  foreArmR: 'upperArmR',
  thighL: 'pelvis',
  shinL: 'thighL',
  footL: 'shinL',
  thighR: 'pelvis',
  shinR: 'thighR',
  footR: 'shinR',
}

interface Proportions {
  H: number // total height
  hip: number
  waist: number
  chest: number
  shoulder: number
  neck: number
  headC: number
  headR: [number, number, number]
  shoulderW: number
  hipW: number
  elbow: number
  wrist: number
  knee: number
  ankle: number
  girth: number
}

function proportions(kind: BodyKind): Proportions {
  if (kind === 'child') {
    // ≈ 7–8 years, 1.22 m, ≈ 5.6 heads
    return { H: 1.22, hip: 0.6, waist: 0.68, chest: 0.84, shoulder: 0.95, neck: 1.0, headC: 1.1, headR: [0.083, 0.1, 0.092], shoulderW: 0.13, hipW: 0.065, elbow: 0.77, wrist: 0.6, knee: 0.33, ankle: 0.055, girth: 0.72 }
  }
  // adult ≈ 1.76 m, 7.5 heads
  return { H: 1.76, hip: 0.94, waist: 1.06, chest: 1.3, shoulder: 1.45, neck: 1.52, headC: 1.645, headR: [0.088, 0.112, 0.1], shoulderW: 0.185, hipW: 0.092, elbow: 1.16, wrist: 0.9, knee: 0.5, ankle: 0.08, girth: kind === 'jogger' ? 0.92 : 1 }
}

/** bone head positions in character space (rest pose, facing +z) */
function restPositions(p: Proportions): Record<BoneName, THREE.Vector3> {
  return {
    root: new THREE.Vector3(0, 0, 0),
    pelvis: new THREE.Vector3(0, p.hip, 0),
    spine: new THREE.Vector3(0, p.waist, 0),
    chest: new THREE.Vector3(0, p.chest, 0),
    neck: new THREE.Vector3(0, p.neck, 0),
    head: new THREE.Vector3(0, p.headC - p.headR[1] * 0.6, 0),
    upperArmL: new THREE.Vector3(p.shoulderW, p.shoulder, 0),
    foreArmL: new THREE.Vector3(p.shoulderW + 0.012, p.elbow, -0.01),
    upperArmR: new THREE.Vector3(-p.shoulderW, p.shoulder, 0),
    foreArmR: new THREE.Vector3(-p.shoulderW - 0.012, p.elbow, -0.01),
    thighL: new THREE.Vector3(p.hipW, p.hip - 0.02, 0),
    shinL: new THREE.Vector3(p.hipW, p.knee, 0.005),
    footL: new THREE.Vector3(p.hipW, p.ankle, 0),
    thighR: new THREE.Vector3(-p.hipW, p.hip - 0.02, 0),
    shinR: new THREE.Vector3(-p.hipW, p.knee, 0.005),
    footR: new THREE.Vector3(-p.hipW, p.ankle, 0),
  }
}

/* ───────────── geometry ───────────── */

interface Part {
  g: THREE.BufferGeometry
}

const tmpC = new THREE.Color()

/** Tag a geometry with one colour and skin weights to bone a (blending into bone b near `from`). */
function skin(g: THREE.BufferGeometry, color: string, a: number, b: number, from?: THREE.Vector3, axis?: THREE.Vector3, blend = 0) {
  const n = g.attributes.position.count
  const col = new Float32Array(n * 3)
  const si = new Uint16Array(n * 4)
  const sw = new Float32Array(n * 4)
  tmpC.set(color).convertSRGBToLinear()
  const p = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    col[i * 3] = tmpC.r
    col[i * 3 + 1] = tmpC.g
    col[i * 3 + 2] = tmpC.b
    let w = 1
    if (from && axis && blend > 0) {
      p.fromBufferAttribute(g.attributes.position as THREE.BufferAttribute, i).sub(from)
      const t = p.dot(axis)
      w = THREE.MathUtils.clamp(0.5 + 0.5 * (t / blend), 0.5, 1)
    }
    si[i * 4] = a
    si[i * 4 + 1] = b
    sw[i * 4] = w
    sw[i * 4 + 1] = 1 - w
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4))
  if (g.attributes.uv) g.deleteAttribute('uv')
  return g
}

/** Tapered limb with rounded ends from → to. `bulge` adds a muscle/fabric belly. */
function limb(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, opts: { ez?: number; bulge?: number; seg?: number; caps?: number } = {}) {
  const dir = to.clone().sub(from)
  const len = dir.length()
  dir.normalize()
  const c0 = r0 * (opts.caps ?? 0.45)
  const c1 = r1 * (opts.caps ?? 0.45)
  const pts: THREE.Vector2[] = []
  const N = 12
  for (let i = 0; i <= N; i++) {
    const y = -c0 + ((len + c0 + c1) * i) / N
    let r: number
    if (y < 0) r = r0 * Math.sqrt(Math.max(0, 1 - (y / c0) ** 2))
    else if (y > len) r = r1 * Math.sqrt(Math.max(0, 1 - ((y - len) / c1) ** 2))
    else {
      const t = y / len
      r = r0 + (r1 - r0) * t + Math.sin(Math.PI * t) * (opts.bulge ?? 0)
    }
    pts.push(new THREE.Vector2(Math.max(0.0005, r), y))
  }
  const g = new THREE.LatheGeometry(pts, opts.seg ?? 10)
  if (opts.ez) g.scale(1, 1, opts.ez)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))
  g.translate(from.x, from.y, from.z)
  return { g, dir }
}

/**
 * One continuous lathed limb from → (joint) → to, skinned to two bones with a
 * smooth blend band at the joint (and into the parent at the root) — no
 * visible seam at knees and elbows.
 */
function chain(from: THREE.Vector3, joint: THREE.Vector3, to: THREE.Vector3, r: [number, number, number, number], bones: [number, number, number], color: string, colorB?: string) {
  const dir = to.clone().sub(from)
  const len = dir.length()
  dir.normalize()
  const tj = joint.clone().sub(from).dot(dir)
  const c0 = r[0] * 0.4
  const c1 = r[3] * 0.5
  const pts: THREE.Vector2[] = []
  const N = 18
  for (let i = 0; i <= N; i++) {
    const y = -c0 + ((len + c0 + c1) * i) / N
    let rad: number
    if (y < 0) rad = r[0] * Math.sqrt(Math.max(0, 1 - (y / c0) ** 2))
    else if (y > len) rad = r[3] * Math.sqrt(Math.max(0, 1 - ((y - len) / c1) ** 2))
    else if (y < tj) {
      const t = y / tj
      rad = r[0] + (r[1] - r[0]) * t + Math.sin(Math.PI * t) * r[0] * 0.08
    } else {
      const t = (y - tj) / (len - tj)
      rad = r[1] + (r[2] - r[1]) * Math.min(1, t * 1.6) + (r[3] - r[2]) * Math.max(0, t * 1.6 - 0.6) / 1.0 + Math.sin(Math.PI * t) * r[1] * 0.07
    }
    pts.push(new THREE.Vector2(Math.max(0.0005, rad), y))
  }
  const g = new THREE.LatheGeometry(pts, 10).toNonIndexed()
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))
  g.translate(from.x, from.y, from.z)
  const ng = skin(g, color, bones[0], bones[0])
  const pos = ng.attributes.position
  const si = ng.attributes.skinIndex as THREE.BufferAttribute
  const sw = ng.attributes.skinWeight as THREE.BufferAttribute
  const col = ng.attributes.color as THREE.BufferAttribute
  const cB = new THREE.Color(colorB ?? color).convertSRGBToLinear()
  const v = new THREE.Vector3()
  const band = 0.05
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos as THREE.BufferAttribute, i).sub(from)
    const t = v.dot(dir)
    let a = bones[0]
    let b = bones[2]
    let w: number
    if (t < band) w = 0.5 + 0.5 * Math.max(0, t / band) // blend into parent at the root
    else if (t < tj - band) [a, b, w] = [bones[0], bones[0], 1]
    else if (t < tj + band) [a, b, w] = [bones[1], bones[0], (t - (tj - band)) / (2 * band)]
    else [a, b, w] = [bones[1], bones[1], 1]
    si.setXY(i, a, b)
    sw.setXY(i, w, 1 - w)
    if (colorB && t > tj + 0.02) col.setXYZ(i, cB.r, cB.g, cB.b)
  }
  return ng
}

function ellipsoid(c: THREE.Vector3, r: [number, number, number], ws = 12, hs = 9) {
  const g = new THREE.SphereGeometry(1, ws, hs)
  g.scale(r[0], r[1], r[2])
  g.translate(c.x, c.y, c.z)
  return g
}

const geoCache = new Map<string, THREE.BufferGeometry>()

/** Build (and cache) the skinned body geometry for a body kind + outfit. */
export function bodyGeometry(kind: BodyKind, o: Outfit, key: string) {
  const ck = `${kind}:${key}`
  const hit = geoCache.get(ck)
  if (hit) return hit
  const p = proportions(kind)
  const P = restPositions(p)
  const parts: Part[] = []
  const add = (g: THREE.BufferGeometry, color: string, bone: BoneName, parent?: BoneName, from?: THREE.Vector3, axis?: THREE.Vector3, blend = 0) =>
    parts.push({ g: skin(g.index ? g.toNonIndexed() : g, color, B[bone], B[parent ?? bone], from, axis, blend) })
  const k = p.girth
  const up = new THREE.Vector3(0, 1, 0)

  /* torso: ONE lathed profile (hem → hips → waist → chest → shoulders), weights blended by height */
  {
    const hem = o.coat ? p.hip - 0.17 : p.hip - 0.07
    const prof: Array<[number, number]> = [
      [0.0, hem - 0.012],
      [(o.coat ? 0.168 : 0.148) * k, hem],
      [0.152 * k, p.hip],
      [0.142 * k, p.waist],
      [0.158 * k, (p.waist + p.chest) / 2],
      [0.172 * k, p.chest],
      [0.168 * k, p.shoulder - 0.06],
      [0.15 * k, p.shoulder - 0.01],
      [0.085, p.shoulder + 0.03],
      [0.055, p.neck],
    ]
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 18)
    g.scale(1, 1, 0.64)
    const ng = skin(g.toNonIndexed(), o.top, B.pelvis, B.pelvis)
    const pos = ng.attributes.position
    const si = ng.attributes.skinIndex as THREE.BufferAttribute
    const sw = ng.attributes.skinWeight as THREE.BufferAttribute
    const band = 0.07
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      let a: number = B.pelvis
      let b: number = B.spine
      let w = 1
      if (y < p.waist - band) [a, b, w] = [B.pelvis, B.pelvis, 1]
      else if (y < p.waist + band) [a, b, w] = [B.spine, B.pelvis, (y - (p.waist - band)) / (2 * band)]
      else if (y < p.chest - band) [a, b, w] = [B.spine, B.spine, 1]
      else if (y < p.chest + band) [a, b, w] = [B.chest, B.spine, (y - (p.chest - band)) / (2 * band)]
      else [a, b, w] = [B.chest, B.chest, 1]
      si.setXY(i, a, b)
      sw.setXY(i, w, 1 - w)
    }
    parts.push({ g: ng })
  }
  // collar / hood
  if (o.hood) add(limb(new THREE.Vector3(0, p.shoulder - 0.01, -0.035), new THREE.Vector3(0, p.neck + 0.03, -0.05), 0.085, 0.075, { ez: 0.8, seg: 12, caps: 0.6 }).g, shade(o.top, 0.85), 'chest')
  else add(limb(new THREE.Vector3(0, p.shoulder - 0.005, -0.01), new THREE.Vector3(0, p.neck + 0.005, -0.01), 0.07, 0.058, { ez: 0.85, seg: 12, caps: 0.3 }).g, shade(o.top, 0.9), 'chest')
  if (o.backpack) add(ellipsoid(new THREE.Vector3(0, (p.chest + p.waist) / 2 + 0.02, -0.15 * k), [0.12 * k, 0.15, 0.07]), o.backpack, 'chest')

  /* neck + head */
  add(limb(new THREE.Vector3(0, p.neck - 0.02, 0), new THREE.Vector3(0, P.head.y + 0.02, 0.005), 0.045, 0.042, { caps: 0.2 }).g, o.skin, 'neck', 'chest', P.neck, up, 0.03)
  const hc = new THREE.Vector3(0, p.headC, 0.008)
  add(ellipsoid(hc, p.headR, 16, 12), o.skin, 'head')
  add(ellipsoid(hc.clone().add(new THREE.Vector3(0, -0.012, p.headR[2] * 0.95)), [0.014, 0.022, 0.018], 8, 6), shade(o.skin, 0.92), 'head') // nose
  for (const s of [-1, 1]) add(ellipsoid(hc.clone().add(new THREE.Vector3(s * p.headR[0] * 0.98, -0.005, 0)), [0.012, 0.022, 0.016], 6, 5), shade(o.skin, 0.9), 'head') // ears
  if (o.hat) {
    add(ellipsoid(hc.clone().add(new THREE.Vector3(0, p.headR[1] * 0.38, -0.006)), [p.headR[0] * 1.1, p.headR[1] * 0.7, p.headR[2] * 1.1]), o.hat, 'head')
  } else {
    // hair: cap over the top and back, leaving the face
    add(ellipsoid(hc.clone().add(new THREE.Vector3(0, p.headR[1] * 0.28, -p.headR[2] * 0.12)), [p.headR[0] * 1.07, p.headR[1] * 0.82, p.headR[2] * 1.02]), o.hair, 'head')
  }
  // eyes (tiny, dark) — give the face a direction without realism
  for (const s of [-1, 1]) add(ellipsoid(hc.clone().add(new THREE.Vector3(s * 0.032, 0.012, p.headR[2] * 0.86)), [0.011, 0.008, 0.006], 6, 4), '#2a2420', 'head')

  /* arms */
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    const ua = P[`upperArm${side}` as BoneName]
    const fa = P[`foreArm${side}` as BoneName]
    const wr = new THREE.Vector3(s * (p.shoulderW + 0.02), p.wrist, 0.02)
    const sleeve = o.shorts ? o.skin : o.top
    parts.push({ g: chain(ua.clone().add(new THREE.Vector3(0, -0.01, 0)), fa, wr, [0.047 * k, 0.037 * k, 0.031 * k, 0.027 * k], [B[`upperArm${side}` as BoneName], B[`foreArm${side}` as BoneName], B.chest], o.shorts ? o.top : sleeve, o.shorts ? o.skin : undefined) })
    // hand
    add(ellipsoid(wr.clone().add(new THREE.Vector3(0, -0.055, 0.005)), [0.021, 0.046, 0.03]), o.skin, `foreArm${side}` as BoneName)
  }

  /* legs */
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1
    const th = P[`thigh${side}` as BoneName]
    const kn = P[`shin${side}` as BoneName]
    const an = P[`foot${side}` as BoneName]
    parts.push({ g: chain(th, kn, an.clone().add(new THREE.Vector3(0, 0.01, 0)), [0.077 * k, 0.052 * k, 0.045 * k, 0.036 * k], [B[`thigh${side}` as BoneName], B[`shin${side}` as BoneName], B.pelvis], o.bottom, o.shorts ? o.skin : undefined) })
    // shoe: flattened ellipsoid forward of the ankle, sole at y≈0
    const shoe = ellipsoid(new THREE.Vector3(s * 0.002, an.y * 0.42, 0.045 * (p.H / 1.76)), [0.042 * (p.H / 1.76 + 0.15), an.y * 0.55, 0.112 * (p.H / 1.76)], 10, 7)
    const pos = shoe.attributes.position
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.004) pos.setY(i, 0.004)
    shoe.computeVertexNormals()
    shoe.translate(an.x, 0, an.z)
    add(shoe, o.shoes, `foot${side}` as BoneName)
    if (o.shorts) add(limb(an.clone().add(new THREE.Vector3(0, 0.0, 0)), an.clone().add(new THREE.Vector3(0, 0.06, 0)), 0.04, 0.038, { caps: 0.2 }).g, '#f2f2f2', `foot${side}` as BoneName) // socks
  }

  const g = mergeGeometries(parts.map((x) => x.g), false)!
  g.computeBoundingSphere()
  geoCache.set(ck, g)
  return g
}

function shade(hex: string, k: number) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
}

let bodyMat: THREE.MeshStandardMaterial | null = null
export function bodyMaterial() {
  return (bodyMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.8 }))
}

/** Create a skinned instance (own bones) for a geometry. */
export function makeBody(kind: BodyKind, o: Outfit, key: string) {
  const geo = bodyGeometry(kind, o, key)
  const P = restPositions(proportions(kind))
  const names = Object.keys(B) as BoneName[]
  const bones = names.map(() => new THREE.Bone())
  names.forEach((n, i) => {
    bones[i].name = n
    const parent = PARENT[n]
    const pos = P[n].clone()
    if (parent) {
      pos.sub(P[parent])
      bones[B[parent]].add(bones[i])
    }
    bones[i].position.copy(pos)
  })
  const mesh = new THREE.SkinnedMesh(geo, bodyMaterial())
  mesh.add(bones[0])
  bones[0].updateMatrixWorld(true)
  mesh.bind(new THREE.Skeleton(bones))
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  const bone = Object.fromEntries(names.map((n, i) => [n, bones[i]])) as Record<BoneName, THREE.Bone>
  return { mesh, bone, rest: P }
}

/* ───────────── gait / pose ───────────── */

interface MotionState {
  phase: number
  walkW: number // 0..1 walking blend
  runW: number
  recoil: number
  yaw: number
  t: number
}

/**
 * Procedural locomotion. Swing-phase knee flexion, opposite arm swing,
 * pelvis bob/twist/sway, counter-rotating chest, forward lean when jogging,
 * head stabilised and turned towards `face`.
 */
export function animateBody(bone: Record<BoneName, THREE.Bone>, rest: Record<BoneName, THREE.Vector3>, m: MotionState, v: ActorView, bodyYaw: number, dt: number, kind: BodyKind, seed: number) {
  m.t += dt
  const speed = v.v
  const jog = kind === 'jogger' || v.pose === 'run' || speed > 2.3
  const moving = speed > 0.12
  const stride = (kind === 'child' ? 0.48 : 0.72) * (jog ? 1.55 : 1)
  m.phase += (speed / stride) * Math.PI * dt
  const k = Math.min(1, dt * 6)
  m.walkW += ((moving && !jog ? 1 : 0) - m.walkW) * k
  m.runW += ((moving && jog ? 1 : 0) - m.runW) * k
  m.recoil += ((v.pose === 'recoil' ? 1 : 0) - m.recoil) * Math.min(1, dt * 10)
  const ph = m.phase
  const W = m.walkW
  const R = m.runW
  const amp = Math.min(1, 0.55 + speed * 0.25)
  const idle = 1 - Math.max(W, R)

  // legs
  const legSwing = (W * 0.42 + R * 0.75) * amp
  const kneeMax = W * 0.7 + R * 1.55
  const sides: Array<['L' | 'R', number]> = [
    ['L', 0],
    ['R', Math.PI],
  ]
  for (const [s, off] of sides) {
    const p = ph + off
    const thigh = bone[`thigh${s}` as BoneName]
    const shin = bone[`shin${s}` as BoneName]
    const foot = bone[`foot${s}` as BoneName]
    const swing = Math.cos(p) // >0 during swing
    thigh.rotation.set(-Math.sin(p) * legSwing - R * 0.18, 0, 0)
    shin.rotation.set(0.04 + kneeMax * Math.max(0, swing) ** 1.4 + R * 0.25 + idle * 0.02, 0, 0)
    foot.rotation.set(-0.15 * Math.sin(p) * (W + R) - shin.rotation.x * 0.25, 0, 0)
  }
  // arms
  const armSwing = (W * 0.32 + R * 0.6) * amp
  for (const [s, off] of sides) {
    const p = ph + off
    const ua = bone[`upperArm${s}` as BoneName]
    const fa = bone[`foreArm${s}` as BoneName]
    const sg = s === 'L' ? 1 : -1
    ua.rotation.set(Math.sin(p) * armSwing + idle * Math.sin(m.t * 0.9 + seed) * 0.02, 0, sg * (0.08 + R * 0.12 + idle * 0.03))
    fa.rotation.set(-(0.18 + W * 0.12 + R * 1.35 + Math.max(0, -Math.sin(p)) * W * 0.2), 0, 0)
  }
  // pelvis / spine
  const bob = W * 0.022 * Math.cos(2 * ph) + R * 0.05 * Math.abs(Math.cos(ph)) - R * 0.03
  bone.pelvis.position.y = rest.pelvis.y + bob + idle * Math.sin(m.t * 1.7 + seed) * 0.003
  bone.pelvis.rotation.set(0, 0.09 * Math.sin(ph) * (W + R), 0.035 * Math.cos(ph) * W + idle * Math.sin(m.t * 0.4 + seed) * 0.02)
  bone.spine.rotation.set(0.03 * W + 0.17 * R, -0.05 * Math.sin(ph) * (W + R), 0)
  bone.chest.rotation.set(idle * Math.sin(m.t * 1.6 + seed) * 0.015, -0.07 * Math.sin(ph) * (W + R), 0)

  // head: look towards `face` (or scan when told to look around), stabilise against lean
  let target = 0
  if (v.face !== null) {
    let rel = v.face - bodyYaw
    while (rel > Math.PI) rel -= Math.PI * 2
    while (rel < -Math.PI) rel += Math.PI * 2
    target = THREE.MathUtils.clamp(rel, -1.3, 1.3)
  } else if (v.pose === 'look') target = Math.sin(m.t * 0.9 + seed) * 1.0
  m.yaw += (target - m.yaw) * Math.min(1, dt * 4)
  // large head turns are shared with the chest (how people really look over a shoulder)
  bone.chest.rotation.y += m.yaw * 0.3
  bone.neck.rotation.set(-0.03 * W - 0.12 * R, m.yaw * 0.3, 0)
  bone.head.rotation.set(-(0.03 * W + 0.05 * R), m.yaw * 0.4, 0)

  // special poses
  const still = !moving
  if (still && v.pose === 'phone') {
    bone.upperArmR.rotation.set(-0.55, 0, -0.25)
    bone.foreArmR.rotation.set(-1.75, 0.3, 0)
    bone.head.rotation.x = 0.45
    bone.neck.rotation.x = 0.2
  }
  if (v.pose === 'wave') {
    bone.upperArmL.rotation.set(-0.3, 0, 2.5)
    bone.foreArmL.rotation.set(-0.3 + Math.sin(m.t * 9) * 0.35, 0, 0)
  }
  if (v.pose === 'crouch') {
    bone.pelvis.position.y = rest.pelvis.y * 0.62
    for (const s of ['L', 'R'] as const) {
      bone[`thigh${s}` as BoneName].rotation.x = -1.5
      bone[`shin${s}` as BoneName].rotation.x = 2.1
      bone[`foot${s}` as BoneName].rotation.x = -0.55
    }
    bone.spine.rotation.x = 0.45
  }
  const r = m.recoil
  if (r > 0.01) {
    // startled stop: weight back, hands up
    bone.spine.rotation.x = bone.spine.rotation.x * (1 - r) - 0.22 * r
    for (const s of ['L', 'R'] as const) {
      const ua = bone[`upperArm${s}` as BoneName]
      const fa = bone[`foreArm${s}` as BoneName]
      ua.rotation.x = ua.rotation.x * (1 - r) - 1.25 * r
      ua.rotation.z = ua.rotation.z * (1 - r) + (s === 'L' ? 0.35 : -0.35) * r
      fa.rotation.x = fa.rotation.x * (1 - r) - 1.2 * r
    }
    bone.head.rotation.x -= 0.15 * r
  }
}

/* ───────────── components ───────────── */

export function outfitFor(kind: 'adult' | 'child', variant: number): { kind: BodyKind; o: Outfit; key: string } {
  if (kind === 'child') {
    const i = variant % CHILD_OUTFITS.length
    return { kind: 'child', o: CHILD_OUTFITS[i], key: `c${i}` }
  }
  const i = variant % ADULT_OUTFITS.length
  return { kind: i === 5 ? 'jogger' : 'adult', o: ADULT_OUTFITS[i], key: `a${i}` }
}

/** A pedestrian (adult, child or jogger) driven by the sim. Parent group is positioned/rotated by ActorNode. */
export function Human({ get, variant = 0, child = false }: { get: ViewGetter; variant?: number; child?: boolean }) {
  const { kind, o, key } = outfitFor(child ? 'child' : 'adult', variant)
  const body = useMemo(() => makeBody(kind, o, key), [kind, o, key])
  const m = useRef<MotionState>({ phase: variant * 1.3, walkW: 0, runW: 0, recoil: 0, yaw: 0, t: variant * 3.1 })
  const yawRef = useRef<THREE.Group>(null)
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const v = get()
    // world yaw of this character = parent group's rotation (set by ActorNode)
    const yaw = yawRef.current?.parent?.rotation.y ?? v.h
    animateBody(body.bone, body.rest, m.current, v, yaw, dt, kind, variant)
  })
  return (
    <group ref={yawRef}>
      <primitive object={body.mesh} />
    </group>
  )
}

/* ───────────── bicycle ───────────── */

const BIKE = { wheelR: 0.34, wheelbase: 1.08, bb: new THREE.Vector3(0, 0.29, 0.0), crank: 0.17, saddle: new THREE.Vector3(0, 0.96, -0.22), bar: new THREE.Vector3(0, 1.04, 0.5) }

function tube(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8) {
  const d = b.clone().sub(a)
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()))
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  return g
}

function colorize(g: THREE.BufferGeometry, color: string) {
  const ng = g.index ? g.toNonIndexed() : g
  const n = ng.attributes.position.count
  const c = new Float32Array(n * 3)
  tmpC.set(color).convertSRGBToLinear()
  for (let i = 0; i < n; i++) {
    c[i * 3] = tmpC.r
    c[i * 3 + 1] = tmpC.g
    c[i * 3 + 2] = tmpC.b
  }
  ng.setAttribute('color', new THREE.BufferAttribute(c, 3))
  if (ng.attributes.uv) ng.deleteAttribute('uv')
  return ng
}

const bikeCache = new Map<string, { frame: THREE.BufferGeometry; wheel: THREE.BufferGeometry; crank: THREE.BufferGeometry }>()
/** City/hybrid bike: diamond frame, fork, mudguards, rack, lamp — all in one vertex-coloured mesh. */
export function bikeGeometry(color: string) {
  const hit = bikeCache.get(color)
  if (hit) return hit
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const rearHub = v(0, BIKE.wheelR, -0.62)
  const frontHub = v(0, BIKE.wheelR, 0.46)
  const bb = BIKE.bb
  const seatTop = v(0, 0.84, -0.17)
  const headTop = v(0, 0.92, 0.38)
  const headBot = v(0, 0.74, 0.42)
  const parts: THREE.BufferGeometry[] = []
  const F = (g: THREE.BufferGeometry) => parts.push(colorize(g, color))
  const D = (g: THREE.BufferGeometry, c = '#1b1c1e') => parts.push(colorize(g, c))
  F(tube(bb, seatTop, 0.017))
  F(tube(seatTop, headTop, 0.016))
  F(tube(bb, headBot, 0.02))
  F(tube(headBot, headTop, 0.022))
  for (const s of [-1, 1]) {
    F(tube(bb.clone().setX(s * 0.03), rearHub.clone().setX(s * 0.055), 0.011))
    F(tube(seatTop.clone().setX(s * 0.012), rearHub.clone().setX(s * 0.055), 0.01))
    D(tube(headBot.clone().setX(s * 0.03), frontHub.clone().setX(s * 0.05), 0.012), '#2a2c30') // fork legs
  }
  // seat post + saddle
  D(tube(seatTop, BIKE.saddle.clone().add(v(0, -0.03, 0.01)), 0.013), '#9aa0a6')
  const saddle = new THREE.SphereGeometry(1, 10, 6)
  saddle.scale(0.075, 0.03, 0.14)
  saddle.translate(BIKE.saddle.x, BIKE.saddle.y, BIKE.saddle.z + 0.02)
  D(saddle, '#2a1f1a')
  // stem + swept city handlebar + grips
  D(tube(headTop, v(0, BIKE.bar.y, BIKE.bar.z - 0.06), 0.014), '#9aa0a6')
  const barC = v(0, BIKE.bar.y, BIKE.bar.z - 0.06)
  for (const s of [-1, 1]) {
    const tip = v(s * 0.28, BIKE.bar.y + 0.01, BIKE.bar.z - 0.16)
    D(tube(barC, tip, 0.011), '#9aa0a6')
    D(tube(tip, tip.clone().add(v(s * 0.02, 0, -0.08)), 0.017), '#1b1c1e')
  }
  // mudguards (arcs) + rear rack + front lamp
  for (const hub of [rearHub, frontHub]) {
    const arc = new THREE.TorusGeometry(BIKE.wheelR + 0.04, 0.02, 4, 18, Math.PI * 0.85)
    arc.rotateY(Math.PI / 2)
    arc.rotateX(hub === rearHub ? -0.1 : -0.7)
    arc.scale(1.4, 1, 1)
    arc.translate(hub.x, hub.y, hub.z)
    D(arc, '#2a2c30')
  }
  D(tube(v(0, 0.72, -0.35), v(0, 0.72, -0.78), 0.008), '#2a2c30')
  for (const s of [-1, 1]) D(tube(v(s * 0.07, 0.72, -0.78), rearHub.clone().setX(s * 0.06), 0.007), '#2a2c30')
  const lamp = new THREE.CylinderGeometry(0.03, 0.035, 0.06, 10)
  lamp.rotateX(Math.PI / 2)
  lamp.translate(0, 0.8, 0.49)
  D(lamp, '#e9e6dc')
  D(tube(v(0, 0.75, -0.8), v(0, 0.7, -0.82), 0.02), '#c4261d') // rear reflector
  const frame = mergeGeometries(parts, false)!

  // wheel (centred at origin, axle along x): tyre, rim, hub, 18 spokes
  const w: THREE.BufferGeometry[] = []
  const tyre = new THREE.TorusGeometry(BIKE.wheelR - 0.018, 0.019, 8, 36)
  tyre.rotateY(Math.PI / 2)
  w.push(colorize(tyre, '#161718'))
  const rim = new THREE.TorusGeometry(BIKE.wheelR - 0.04, 0.009, 4, 36)
  rim.rotateY(Math.PI / 2)
  w.push(colorize(rim, '#b9bec4'))
  const hubG = new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10)
  hubG.rotateZ(Math.PI / 2)
  w.push(colorize(hubG, '#9aa0a6'))
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    const sx = i % 2 ? 0.03 : -0.03
    w.push(colorize(tube(v(sx, 0, 0), v(0, Math.cos(a) * (BIKE.wheelR - 0.045), Math.sin(a) * (BIKE.wheelR - 0.045)), 0.0018, 3), '#c9ccd0'))
  }
  const wheel = mergeGeometries(w, false)!

  // crank set: chainring + two arms + pedals (rotates around bb, axle x)
  const c: THREE.BufferGeometry[] = []
  const ring = new THREE.TorusGeometry(0.09, 0.008, 4, 24)
  ring.rotateY(Math.PI / 2)
  ring.translate(0.05, 0, 0)
  c.push(colorize(ring, '#7c8086'))
  for (const s of [-1, 1]) {
    const tip = v(s * 0.09, -s * BIKE.crank, 0)
    c.push(colorize(tube(v(s * 0.06, 0, 0), tip, 0.011), '#9aa0a6'))
    const pedal = new THREE.BoxGeometry(0.09, 0.02, 0.1)
    pedal.translate(s * 0.13, -s * BIKE.crank, 0)
    c.push(colorize(pedal, '#1b1c1e'))
  }
  const crank = mergeGeometries(c, false)!
  const out = { frame, wheel, crank }
  bikeCache.set(color, out)
  return out
}

const FRAME_COLORS = ['#1f6f5c', '#b8352c', '#2b2f36', '#d8d4c8']

/** 2-bone IK in the sagittal (y,z) plane: returns [thigh pitch, knee bend]. */
export function legIK(hip: THREE.Vector3, target: THREE.Vector3, L1: number, L2: number): [number, number] {
  const dy = target.y - hip.y
  const dz = target.z - hip.z
  const d = Math.min(Math.hypot(dy, dz), (L1 + L2) * 0.999)
  const line = Math.atan2(-dz, -dy) // rotation.x that points the bone along hip→target
  const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
  const inner = Math.acos(THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1))
  return [line - a, Math.PI - inner]
}

/** Cyclist: bike + skinned rider with pedal IK, steering lean, head checks. */
export function CyclistModel({ get, variant = 0 }: { get: ViewGetter; variant?: number }) {
  const o = RIDER_OUTFITS[variant % RIDER_OUTFITS.length]
  const g = useMemo(() => bikeGeometry(FRAME_COLORS[variant % FRAME_COLORS.length]), [variant])
  const body = useMemo(() => makeBody('cyclist', o, `r${variant % RIDER_OUTFITS.length}`), [o, variant])
  const wf = useRef<THREE.Mesh>(null)
  const wr = useRef<THREE.Mesh>(null)
  const crank = useRef<THREE.Mesh>(null)
  const lean = useRef<THREE.Group>(null)
  const st = useRef({ wheel: 0, crank: 0, yaw: 0, lastH: null as number | null, lean: 0, t: variant * 2 })
  const P = body.rest
  const L1 = P.thighL.distanceTo(P.shinL)
  const L2 = P.shinL.distanceTo(P.footL)
  // rider placement: pelvis on the saddle
  const riderY = BIKE.saddle.y + 0.07 - P.pelvis.y
  const riderZ = BIKE.saddle.z - 0.02
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const v = get()
    const s = st.current
    s.t += dt
    s.wheel += (v.v * dt) / BIKE.wheelR
    // gear ratio ≈ 2.4 wheel turns per crank turn; freewheel when braking hard / stopped
    const pedalling = v.v > 0.3 && v.a > -1.2
    if (pedalling) s.crank += (v.v * dt) / BIKE.wheelR / 2.4
    if (wf.current) wf.current.rotation.x = s.wheel
    if (wr.current) wr.current.rotation.x = s.wheel
    if (crank.current) crank.current.rotation.x = s.crank
    // lean into turns
    let yawRate = 0
    if (s.lastH !== null && dt > 0) {
      let d = v.h - s.lastH
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      yawRate = d / dt
    }
    s.lastH = v.h
    s.lean += (THREE.MathUtils.clamp(-yawRate * v.v * 0.12, -0.35, 0.35) - s.lean) * Math.min(1, dt * 5)
    if (lean.current) lean.current.rotation.z = s.lean
    const b = body.bone
    // upright city-bike posture
    b.pelvis.position.set(0, P.pelvis.y, 0)
    b.pelvis.rotation.set(0, 0, 0)
    b.spine.rotation.set(0.32, 0, 0)
    b.chest.rotation.set(0.12, 0, 0)
    // arms reach the grips
    for (const sd of ['L', 'R'] as const) {
      b[`upperArm${sd}` as BoneName].rotation.set(-0.95, 0, sd === 'L' ? -0.12 : 0.12)
      b[`foreArm${sd}` as BoneName].rotation.set(-0.45, 0, 0)
    }
    // legs follow the pedals (IK in bike space → rider space)
    for (const [sd, off] of [
      ['L', 0],
      ['R', Math.PI],
    ] as const) {
      const a = s.crank + off
      const pedal = new THREE.Vector3(0, BIKE.bb.y - Math.cos(a) * BIKE.crank + 0.075, BIKE.bb.z + Math.sin(a) * BIKE.crank - 0.02)
      const hip = new THREE.Vector3(0, riderY + P.pelvis.y - 0.02, riderZ)
      const [th, kn] = legIK(hip, pedal, L1, L2)
      b[`thigh${sd}` as BoneName].rotation.set(th, 0, 0)
      b[`shin${sd}` as BoneName].rotation.set(kn, 0, 0)
      b[`foot${sd}` as BoneName].rotation.set(-(th + kn) + 0.1, 0, 0)
    }
    // head: look where `face` says (shoulder checks) or straight
    let target = 0
    if (v.face !== null) {
      let rel = v.face - v.h
      while (rel > Math.PI) rel -= Math.PI * 2
      while (rel < -Math.PI) rel += Math.PI * 2
      target = THREE.MathUtils.clamp(rel, -1.3, 1.3)
    }
    s.yaw += (target - s.yaw) * Math.min(1, dt * 4)
    b.neck.rotation.set(-0.3, s.yaw * 0.45, 0)
    b.head.rotation.set(-0.15, s.yaw * 0.55, 0)
    b.chest.rotation.y = s.yaw * 0.2
  })
  return (
    <group ref={lean}>
      <mesh geometry={g.frame} material={bodyMaterial()} castShadow receiveShadow />
      <mesh ref={wr} geometry={g.wheel} material={bodyMaterial()} position={[0, BIKE.wheelR, -0.62]} castShadow />
      <mesh ref={wf} geometry={g.wheel} material={bodyMaterial()} position={[0, BIKE.wheelR, 0.46]} castShadow />
      <mesh ref={crank} geometry={g.crank} material={bodyMaterial()} position={[0, BIKE.bb.y, BIKE.bb.z]} castShadow />
      <group position={[0, riderY, riderZ]}>
        <primitive object={body.mesh} />
      </group>
    </group>
  )
}

/** A parked bicycle (static, no rider) for environmental detail. */
export function ParkedBike({ x, z, rot = 0, variant = 0, kick = 0.12 }: { x: number; z: number; rot?: number; variant?: number; kick?: number }) {
  const g = useMemo(() => bikeGeometry(FRAME_COLORS[variant % FRAME_COLORS.length]), [variant])
  return (
    <group position={[x, 0, z]} rotation={[0, rot, kick]}>
      <mesh geometry={g.frame} material={bodyMaterial()} castShadow />
      <mesh geometry={g.wheel} material={bodyMaterial()} position={[0, BIKE.wheelR, -0.62]} castShadow />
      <mesh geometry={g.wheel} material={bodyMaterial()} position={[0, BIKE.wheelR, 0.46]} rotation-y={0.25} castShadow />
      <mesh geometry={g.crank} material={bodyMaterial()} position={[0, BIKE.bb.y, BIKE.bb.z]} />
    </group>
  )
}

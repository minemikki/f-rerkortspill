import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

/**
 * Procedural compact European hatchback (≈ Golf/Polo class, 4.25 × 1.79 m).
 *
 * Built once from side profiles (extruded with bevels for rounded shoulders,
 * a tapered glasshouse for tumblehome), then shared by every car instance.
 * Real-world proportions matter more than polygon count: wheelbase 2.62 m,
 * 0.315 m wheels, 1.47 m roof, short overhangs.
 *
 * Local frame: +z = forward, +x = left side (matches models.tsx), y up.
 * Replace with an authored glTF (see docs/ASSET_AUDIT) when budget allows —
 * the part names/pivots here are the contract a glTF must satisfy.
 */

export const HATCH = {
  L: 4.25,
  W: 1.79,
  wheelR: 0.315,
  wheelW: 0.205,
  track: 1.54,
  wheelbase: 2.62,
  frontAxle: 1.33,
  rearAxle: -1.29,
  belt: 0.98,
  roof: 1.46,
}

/** Chaikin corner cutting → soft automotive surfaces from a coarse outline. `keep` = indices not to smooth. */
function chaikin(pts: Array<[number, number]>, iterations: number, keep: Set<number> = new Set()) {
  let cur = pts.map((p, i) => ({ p, k: keep.has(i) }))
  for (let it = 0; it < iterations; it++) {
    const next: typeof cur = []
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i]
      const b = cur[(i + 1) % cur.length]
      if (a.k) next.push(a)
      else next.push({ p: [a.p[0] * 0.75 + b.p[0] * 0.25, a.p[1] * 0.75 + b.p[1] * 0.25], k: false })
      if (!b.k) next.push({ p: [a.p[0] * 0.25 + b.p[0] * 0.75, a.p[1] * 0.25 + b.p[1] * 0.75], k: false })
    }
    cur = next
  }
  return cur.map((c) => c.p)
}

function extrudeProfile(pts: Array<[number, number]>, width: number, bevel: number) {
  const s = new THREE.Shape()
  s.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1])
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: width - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 4,
    curveSegments: 10,
  })
  g.translate(0, 0, -(width - bevel * 2) / 2)
  g.rotateY(-Math.PI / 2) // shape x → world z (forward), depth → world x
  return g
}

/** Lower body outline (side view) with wheel arches cut out. z forward, y up. */
function bodyProfile(): Array<[number, number]> {
  const { frontAxle: fa, rearAxle: ra } = HATCH
  const arch = (cz: number, r: number, from: number, to: number, n = 14) => {
    const out: Array<[number, number]> = []
    for (let i = 0; i <= n; i++) {
      const a = from + ((to - from) * i) / n
      out.push([cz + Math.cos(a) * r, 0.33 + Math.sin(a) * r])
    }
    return out
  }
  // arch radius before the 0.072 m bevel growth → ≈0.38 m opening around a 0.315 m wheel
  const AR = 0.45
  return [
    // rear bumper bottom → along the sill to the front, arches cut upwards
    [-2.04, 0.34],
    [ra - AR - 0.02, 0.3],
    ...arch(ra, AR, Math.PI, 0),
    [fa - AR, 0.3],
    ...arch(fa, AR, Math.PI, 0),
    [1.98, 0.3],
    // front bumper + nose
    [2.1, 0.38],
    [2.14, 0.52],
    [2.12, 0.66],
    [2.03, 0.77],
    // bonnet rising to the cowl
    [1.6, 0.86],
    [1.05, 0.95],
    [0.82, HATCH.belt],
    // waist line back to the tailgate
    [-1.2, HATCH.belt + 0.02],
    [-1.95, HATCH.belt + 0.01],
    [-2.1, 0.94],
    [-2.13, 0.72],
    [-2.11, 0.5],
  ]
}

/** Glasshouse outline (windows volume). */
export type BodyType = 'hatch' | 'estate'

function glassProfile(type: BodyType = 'hatch'): Array<[number, number]> {
  // estate: the roof runs on to an almost vertical tailgate (longer glasshouse, same footprint)
  const e = type === 'estate'
  return [
    [0.86, HATCH.belt - 0.02],
    [0.06, HATCH.roof - 0.04],
    [e ? -1.86 : -1.5, HATCH.roof - (e ? 0.03 : 0.02)],
    [e ? -2.06 : -1.98, e ? 1.14 : 1.1],
    [-2.04, HATCH.belt - 0.02],
  ]
}

/** narrow upper parts of a geometry towards the roof (tumblehome) */
function taper(g: THREE.BufferGeometry, y0: number, y1: number, k: number) {
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) - y0) / (y1 - y0), 0, 1)
    p.setX(i, p.getX(i) * (1 - k * t))
  }
  g.computeVertexNormals()
  return g
}

function plateTexture(text: string) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 56
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f4f0'
  g.fillRect(0, 0, 256, 56)
  g.fillStyle = '#1d3f8f'
  g.fillRect(0, 0, 30, 56)
  g.fillStyle = '#fff'
  g.font = 'bold 18px sans-serif'
  g.textAlign = 'center'
  g.fillText('N', 15, 47)
  // tiny flag
  g.fillStyle = '#ba0c2f'
  g.fillRect(7, 8, 16, 12)
  g.fillStyle = '#fff'
  g.fillRect(11, 8, 4, 12)
  g.fillRect(7, 12, 16, 4)
  g.fillStyle = '#00205b'
  g.fillRect(12, 8, 2, 12)
  g.fillRect(7, 13, 16, 2)
  g.fillStyle = '#111'
  g.font = 'bold 40px "Arial Narrow", Arial, sans-serif'
  g.fillText(text, 145, 44)
  g.strokeStyle = '#222'
  g.lineWidth = 3
  g.strokeRect(1.5, 1.5, 253, 53)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export interface HatchGeos {
  body: THREE.BufferGeometry
  glass: THREE.BufferGeometry
  cabin: THREE.BufferGeometry
  trim: THREE.BufferGeometry // black plastic: bumpers' lower parts, pillars, seams, mirror bases
  chrome: THREE.BufferGeometry
  head: THREE.BufferGeometry
  brake: THREE.BufferGeometry
  indL: THREE.BufferGeometry
  indR: THREE.BufferGeometry
  plates: THREE.BufferGeometry
  tyre: THREE.BufferGeometry
  rim: THREE.BufferGeometry
}

const geoByType = new Map<BodyType, HatchGeos>()
export function hatchGeos(type: BodyType = 'hatch'): HatchGeos {
  const cached = geoByType.get(type)
  if (cached) return cached
  const est = type === 'estate'
  const { W, belt, roof } = HATCH
  const hw = W / 2

  // smooth everything except the wheel-arch openings (already dense)
  const bp = bodyProfile()
  const keep = new Set<number>()
  bp.forEach((p, i) => {
    if (p[1] <= 0.34 || (p[1] < 0.8 && (Math.abs(p[0] - HATCH.frontAxle) < 0.46 || Math.abs(p[0] - HATCH.rearAxle) < 0.46))) keep.add(i)
  })
  const body = extrudeProfile(chaikin(bp, 2, keep), W, 0.09)
  // slight tumblehome on the shoulders + rounded nose plan (narrow the corners)
  {
    const p = body.attributes.position
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i)
      const y = p.getY(i)
      let k = 1
      if (z > 1.7) k *= 1 - 0.07 * ((z - 1.7) / 0.45) ** 2
      if (z < -1.85) k *= 1 - 0.05 * ((-1.85 - z) / 0.3) ** 2
      if (y > 0.75) k *= 1 - 0.025 * ((y - 0.75) / 0.25)
      p.setX(i, p.getX(i) * k)
    }
    body.computeVertexNormals()
  }

  // cabin (glasshouse volume) in body paint; windows are inset panels on top → real pillars
  const cabin = taper(extrudeProfile(chaikin(glassProfile(type), 1, new Set([0, 4])), W - 0.1, 0.05), belt, roof, 0.17)
  const cabinHalf = (y: number) => ((W - 0.1) / 2) * (1 - 0.17 * THREE.MathUtils.clamp((y - belt) / (roof - belt), 0, 1))
  const tilt = Math.atan(((W - 0.1) / 2) * 0.17 / (roof - belt))
  const glassParts: THREE.BufferGeometry[] = []
  const ym = (belt + roof) / 2
  const sideWindow = (poly: Array<[number, number]>, s: number) => {
    // shape x must map to world z after the rotation (mirrored for the +x side)
    const sh = new THREE.Shape(poly.map(([z, y]) => new THREE.Vector2(s > 0 ? -z : z, y - ym)))
    const g = new THREE.ShapeGeometry(sh)
    g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2)
    g.rotateZ(s * tilt)
    g.translate(s * (cabinHalf(ym) + 0.012), ym, 0)
    glassParts.push(g)
  }
  for (const s of [-1, 1]) {
    sideWindow([[0.74, belt + 0.085], [0.2, roof - 0.11], [-0.33, roof - 0.08], [-0.33, belt + 0.085]], s)
    sideWindow([[-0.44, belt + 0.085], [-0.44, roof - 0.08], [est ? -1.3 : -1.36, roof - 0.075], [est ? -1.42 : -1.6, belt + (est ? 0.085 : 0.14)], [est ? -1.42 : -1.58, belt + 0.085]], s)
    // estate: third side window behind the C-pillar
    if (est) sideWindow([[-1.52, belt + 0.085], [-1.52, roof - 0.085], [-1.78, roof - 0.09], [-1.95, belt + 0.12], [-1.95, belt + 0.085]], s)
  }
  /** quad on a profile segment A→B (z,y), between t0..t1, pushed out along the segment normal */
  const screen = (A: [number, number], B: [number, number], t0: number, t1: number, inset: number) => {
    const dz = B[0] - A[0]
    const dy = B[1] - A[1]
    const len = Math.hypot(dz, dy)
    const nz = dy / len
    const ny = -dz / len
    const off = 0.046
    const P = (t: number) => [A[0] + dz * t + nz * off, A[1] + dy * t + ny * off] as const
    const [z0, y0] = P(t0)
    const [z1, y1] = P(t1)
    const h0 = cabinHalf(y0) - inset
    const h1 = cabinHalf(y1) - inset
    const v = [-h0, y0, z0, h0, y0, z0, h1, y1, z1, -h0, y0, z0, h1, y1, z1, -h1, y1, z1]
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    g.computeVertexNormals()
    const n = g.attributes.normal
    if (n.getY(0) * ny + n.getZ(0) * nz < 0) {
      // wrong winding → flip
      const p = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < p.count; i += 3) {
        const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1)
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2))
        p.setXYZ(i + 2, x, y, z)
      }
      g.computeVertexNormals()
    }
    glassParts.push(g)
  }
  const gp = glassProfile(type)
  screen(gp[0], gp[1], 0.12, 0.78, 0.07) // windscreen
  screen(gp[2], gp[3], 0.22, 0.8, 0.09) // tailgate window

  const trimParts: THREE.BufferGeometry[] = []
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const g = new THREE.BoxGeometry(w, h, d)
    g.rotateX(rx)
    g.rotateY(ry)
    g.rotateZ(rz)
    g.translate(x, y, z)
    return g
  }
  // lower bumper / diffuser / grille / sills
  trimParts.push(box(1.2, 0.12, 0.12, 0, 0.42, 2.16))
  trimParts.push(box(0.8, 0.09, 0.06, 0, 0.6, 2.19))
  trimParts.push(box(1.56, 0.14, 0.12, 0, 0.4, -2.14))
  for (const s of [-1, 1]) {
    trimParts.push(box(0.05, 0.08, 1.7, s * (hw + 0.005), 0.33, 0.02))
    // B-pillar (black, between the side windows) — tilted with the tumblehome
    trimParts.push(box(0.03, roof - belt - 0.04, 0.09, s * (hw - 0.09), (belt + roof) / 2 - 0.02, -0.38, 0, 0, s * 0.17))
    // window frame line along the belt
    trimParts.push(box(0.025, 0.025, 2.75, s * (hw - 0.05), belt + 0.075, -0.6))
    // door seams + handles
    for (const z of [0.82, -0.36, -1.18]) trimParts.push(box(0.012, 0.6, 0.006, s * (hw + 0.012), 0.66, z))
    trimParts.push(box(0.018, 0.035, 0.16, s * (hw * 0.99 + 0.006), 0.86, 0.32))
    trimParts.push(box(0.018, 0.035, 0.16, s * (hw * 0.99 + 0.006), 0.86, -0.72))
    // mirror arm
    trimParts.push(box(0.12, 0.05, 0.08, s * (hw + 0.02), 1.0, 0.74))
    // wheel arch liners (dark, give depth)
    for (const az of [HATCH.frontAxle, HATCH.rearAxle]) {
      const liner = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 18, 1, true, -Math.PI / 2, Math.PI)
      liner.rotateZ(-Math.PI / 2) // axle along x
      liner.rotateX(-Math.PI / 2) // open half faces down, over the wheel
      liner.translate(s * (hw - 0.2), 0.33, az)
      trimParts.push(liner)
    }
  }
  // headlight housings (black surround behind the lenses)
  for (const sx of [-1, 1]) trimParts.push(box(0.5, 0.15, 0.05, sx * 0.56, 0.735, 2.115, 0, sx * -0.18, 0))
  // windscreen wipers + cowl
  trimParts.push(box(1.35, 0.03, 0.12, 0, belt + 0.08, 0.78, -0.5))
  // rear spoiler lip
  trimParts.push(box(1.3, 0.04, 0.16, 0, roof + 0.0, est ? -1.92 : -1.6, 0.25))

  // mirror housings in body colour → go into "body" merge below
  const mirrors: THREE.BufferGeometry[] = []
  for (const s of [-1, 1]) {
    const m = new THREE.SphereGeometry(0.1, 10, 8)
    m.scale(1.1, 0.75, 0.8)
    m.translate(s * (hw + 0.1), 1.03, 0.72)
    mirrors.push(m.toNonIndexed())
  }
  const bodyAll = mergeGeometries([body, ...mirrors].map(stripToPN), false)!

  // lights — tilted to sit on the nose / tail surfaces
  const head = mergeGeometries(
    [-1, 1].map((s) => stripToPN(box(0.42, 0.1, 0.06, s * 0.56, 0.735, 2.13, 0, s * -0.18, 0))),
    false,
  )!
  const brake = mergeGeometries(
    [-1, 1].flatMap((s) => [stripToPN(box(0.34, 0.12, 0.05, s * 0.62, 0.93, -2.18, 0, s * 0.12, 0)), stripToPN(box(0.05, 0.12, 0.22, s * 0.86, 0.93, -2.0))]),
    false,
  )!
  // +x is the car's LEFT side (models.tsx convention)
  const ind = (s: number) =>
    mergeGeometries(
      [
        stripToPN(box(0.12, 0.06, 0.05, s * 0.79, 0.72, 2.11, 0, s * -0.4, 0)),
        stripToPN(box(0.12, 0.05, 0.05, s * 0.66, 0.85, -2.18)),
        stripToPN(box(0.03, 0.025, 0.1, s * (hw + 0.19), 1.0, 0.72)),
      ],
      false,
    )!
  const chrome = mergeGeometries([stripToPN(box(0.6, 0.02, 0.02, 0, 0.75, -2.205))], false)!
  const plates = mergeGeometries(
    [stripToPN(planeUV(0.52, 0.11, 0, 0.44, 2.23, 0)), stripToPN(planeUV(0.52, 0.11, 0, 0.6, -2.21, Math.PI))],
    true,
  )!

  // wheels (local to each wheel: axle along x)
  const tyreProfile: THREE.Vector2[] = []
  const R = HATCH.wheelR
  const tw = HATCH.wheelW / 2
  const prof: Array<[number, number]> = [
    [0.2, -tw * 0.9],
    [R - 0.03, -tw],
    [R - 0.005, -tw * 0.75],
    [R, -tw * 0.3],
    [R, tw * 0.3],
    [R - 0.005, tw * 0.75],
    [R - 0.03, tw],
    [0.2, tw * 0.9],
  ]
  for (const [r, y] of prof) tyreProfile.push(new THREE.Vector2(r, y))
  const tyre = new THREE.LatheGeometry(tyreProfile, 28)
  tyre.rotateZ(Math.PI / 2)
  const rimParts: THREE.BufferGeometry[] = []
  const barrel = new THREE.CylinderGeometry(0.205, 0.205, tw * 1.7, 24, 1, true)
  barrel.rotateZ(Math.PI / 2)
  rimParts.push(barrel)
  const face = new THREE.CylinderGeometry(0.06, 0.07, 0.03, 16)
  face.rotateZ(Math.PI / 2)
  face.translate(tw * 0.7, 0, 0)
  rimParts.push(face)
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.BoxGeometry(0.03, 0.17, 0.05)
    sp.translate(tw * 0.62, 0.11, 0)
    sp.rotateX((i / 5) * Math.PI * 2)
    rimParts.push(sp)
  }
  const ring = new THREE.TorusGeometry(0.2, 0.012, 6, 28)
  ring.rotateY(Math.PI / 2)
  ring.translate(tw * 0.62, 0, 0)
  rimParts.push(ring)
  // brake disc shares the rim material (one draw call less per wheel)
  const disc = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20)
  disc.rotateZ(Math.PI / 2)
  disc.translate(-tw * 0.1, 0, 0)
  rimParts.push(disc)
  const rim = mergeGeometries(rimParts.map(stripToPN), false)!

  const geos: HatchGeos = {
    body: mergeGeometries([stripToPN(bodyAll), stripToPN(cabin)], false)!,
    glass: mergeGeometries(glassParts.map(stripToPN), false)!,
    cabin,
    trim: mergeGeometries(trimParts.map(stripToPN), false)!,
    chrome,
    head,
    brake,
    indL: ind(1),
    indR: ind(-1),
    plates,
    tyre,
    rim,
  }
  geoByType.set(type, geos)
  return geos
}

function planeUV(w: number, h: number, x: number, y: number, z: number, ry: number) {
  const g = new THREE.PlaneGeometry(w, h)
  g.rotateY(ry)
  g.translate(x, y, z)
  return g
}

/** keep only position+normal (+uv as zeros) so mixed primitives merge */
function stripToPN(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k)
  if (!n.attributes.normal) n.computeVertexNormals()
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
  return n
}

/* ───────────── materials (per car; env map per renderer) ───────────── */

const envByRenderer = new WeakMap<THREE.WebGLRenderer, Promise<THREE.Texture>>()
/** Small IBL for vehicles in scenes that don't have a scene.environment (classic look). */
function vehicleEnv(gl: THREE.WebGLRenderer) {
  let p = envByRenderer.get(gl)
  if (!p) {
    p = new HDRLoader().loadAsync(`${import.meta.env.BASE_URL ?? '/'}assets/sky/sky_1k.hdr`).then((hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping
      const pm = new THREE.PMREMGenerator(gl)
      const rt = pm.fromEquirectangular(hdr)
      pm.dispose()
      hdr.dispose()
      return rt.texture
    })
    envByRenderer.set(gl, p)
  }
  return p
}

export interface HatchMaterials {
  paint: THREE.MeshPhysicalMaterial
  glass: THREE.MeshPhysicalMaterial
  trim: THREE.MeshStandardMaterial
  chrome: THREE.MeshStandardMaterial
  head: THREE.MeshStandardMaterial
  brake: THREE.MeshStandardMaterial
  indL: THREE.MeshStandardMaterial
  indR: THREE.MeshStandardMaterial
  plate: THREE.MeshStandardMaterial
  tyre: THREE.MeshStandardMaterial
  rim: THREE.MeshStandardMaterial
}

const plateTexCache = new Map<string, THREE.Texture>()

export function useHatchMaterials(color: string, plate: string): HatchMaterials {
  const { gl, scene } = useThree()
  const m = useMemo<HatchMaterials>(() => {
    let pt = plateTexCache.get(plate)
    if (!pt) {
      pt = plateTexture(plate)
      plateTexCache.set(plate, pt)
    }
    const c = new THREE.Color(color)
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl)
    const metallic = hsl.s > 0.15 || hsl.l < 0.5
    return {
      paint: new THREE.MeshPhysicalMaterial({
        color,
        metalness: metallic ? 0.5 : 0.08,
        roughness: metallic ? 0.36 : 0.42,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 0.9,
      }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#0b1014', metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.5 }),
      trim: new THREE.MeshStandardMaterial({ color: '#151618', roughness: 0.6, metalness: 0, side: THREE.DoubleSide }),
      chrome: new THREE.MeshStandardMaterial({ color: '#d6d9dc', roughness: 0.15, metalness: 1 }),
      head: new THREE.MeshStandardMaterial({ color: '#8d969c', roughness: 0.06, metalness: 0.9, emissive: '#fff6e0', emissiveIntensity: 0.25 }),
      brake: new THREE.MeshStandardMaterial({ color: '#4a0808', roughness: 0.2, metalness: 0.2, emissive: '#ff1a10', emissiveIntensity: 0.35 }),
      indL: new THREE.MeshStandardMaterial({ color: '#5a3605', roughness: 0.25, emissive: '#ffa020', emissiveIntensity: 0.02 }),
      indR: new THREE.MeshStandardMaterial({ color: '#5a3605', roughness: 0.25, emissive: '#ffa020', emissiveIntensity: 0.02 }),
      plate: new THREE.MeshStandardMaterial({ map: pt, roughness: 0.45 }),
      tyre: new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.88 }),
      rim: new THREE.MeshStandardMaterial({ color: '#b8bdc2', roughness: 0.28, metalness: 1 }),
    }
  }, [color, plate])
  useEffect(() => {
    if (scene.environment) return
    let alive = true
    vehicleEnv(gl).then((env) => {
      if (!alive) return
      for (const k of ['paint', 'glass', 'chrome', 'rim', 'head'] as const) {
        m[k].envMap = env
        m[k].needsUpdate = true
      }
    })
    return () => {
      alive = false
    }
  }, [gl, scene, m])
  useEffect(
    () => () => {
      Object.values(m).forEach((x) => x.dispose())
    },
    [m],
  )
  return m
}

/** Deterministic Norwegian-style plate text from an id. */
export function plateFor(id: string) {
  const L = 'ABCDEFGHJKLNPRSTUVYZ'
  let h = 7
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const a = L[h % L.length]
  const b = L[(h >> 5) % L.length]
  const n = 10000 + ((h >> 9) % 89999)
  return `${a}${b} ${n}`
}

/* ───────────── van + city bus (same construction, same materials) ───────────── */

export interface BoxVehicleGeos {
  body: THREE.BufferGeometry
  glass: THREE.BufferGeometry
  trim: THREE.BufferGeometry
  head: THREE.BufferGeometry
  brake: THREE.BufferGeometry
  indL: THREE.BufferGeometry
  indR: THREE.BufferGeometry
  plates: THREE.BufferGeometry
  /** wheel centres (x, z) and radius */
  wheels: Array<[number, number]>
  wheelR: number
  /** optional emissive destination sign (bus) */
  sign?: THREE.BufferGeometry
}

function archPts(cz: number, cy: number, r: number, n = 14): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (Math.PI * i) / n
    out.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

function bx(w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.rotateX(rx)
  g.rotateY(ry)
  g.rotateZ(rz)
  g.translate(x, y, z)
  return stripToPN(g)
}

/** flat polygon window on a vehicle side (x = ±xs), poly in (z, y) */
function sidePane(poly: Array<[number, number]>, xs: number) {
  const s = Math.sign(xs)
  const sh = new THREE.Shape(poly.map(([z, y]) => new THREE.Vector2(s > 0 ? -z : z, y)))
  const g = new THREE.ShapeGeometry(sh)
  g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2)
  g.translate(xs, 0, 0)
  return stripToPN(g)
}

/** vertical pane facing ±z */
function endPane(w: number, y0: number, y1: number, z: number, facing: 1 | -1, lean = 0) {
  const g = new THREE.PlaneGeometry(w, y1 - y0)
  if (lean) g.rotateX(-lean)
  if (facing < 0) g.rotateY(Math.PI)
  g.translate(0, (y0 + y1) / 2, z)
  return stripToPN(g)
}

function linersFor(axles: number[], hw: number, r: number, cy: number) {
  const out: THREE.BufferGeometry[] = []
  for (const s of [-1, 1])
    for (const az of axles) {
      const liner = new THREE.CylinderGeometry(r, r, 0.34, 18, 1, true, -Math.PI / 2, Math.PI)
      liner.rotateZ(-Math.PI / 2)
      liner.rotateX(-Math.PI / 2)
      liner.translate(s * (hw - 0.22), cy, az)
      out.push(stripToPN(liner))
    }
  return out
}

let vanCache: BoxVehicleGeos | null = null
/** Transit-class panel van, 5.4 × 2.02 × 2.45 m. Local +z forward, +x = left side. */
export function vanGeos(): BoxVehicleGeos {
  if (vanCache) return vanCache
  const W = 2.02
  const hw = W / 2
  const R = 0.36
  const FA = 1.72
  const RA = -1.72
  const AR = 0.5
  const prof: Array<[number, number]> = [
    [-2.62, 0.42],
    [RA - AR - 0.02, 0.36],
    ...archPts(RA, 0.4, AR),
    [FA - AR - 0.02, 0.36],
    ...archPts(FA, 0.4, AR),
    [2.5, 0.36],
    [2.62, 0.48],
    [2.66, 0.72],
    [2.6, 0.97],
    [2.25, 1.13],
    [1.85, 1.23],
    [1.1, 2.3],
    [0.9, 2.42],
    [-2.5, 2.44],
    [-2.64, 2.3],
    [-2.66, 0.6],
  ]
  const keep = new Set<number>()
  prof.forEach((p, i) => p[1] < 0.95 && Math.min(Math.abs(p[0] - FA), Math.abs(p[0] - RA)) < AR + 0.05 && keep.add(i))
  const body = extrudeProfile(chaikin(prof, 2, keep), W, 0.1)
  const glass: THREE.BufferGeometry[] = []
  // windscreen on the (1.85,1.23)–(1.1,2.3) segment, pushed out along its normal
  {
    const A = [1.85, 1.23]
    const Bp = [1.1, 2.3]
    const dz = Bp[0] - A[0]
    const dy = Bp[1] - A[1]
    const L = Math.hypot(dz, dy)
    const nz = dy / L
    const ny = -dz / L
    const p0 = [A[0] + dz * 0.1 + nz * 0.085, A[1] + dy * 0.1 + ny * 0.085]
    const p1 = [A[0] + dz * 0.86 + nz * 0.085, A[1] + dy * 0.86 + ny * 0.085]
    const h = hw - 0.11
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([-h, p0[1], p0[0], h, p0[1], p0[0], h, p1[1], p1[0], -h, p0[1], p0[0], h, p1[1], p1[0], -h, p1[1], p1[0]], 3))
    g.computeVertexNormals()
    if (g.attributes.normal.getZ(0) < 0) g.scale(-1, 1, 1)
    g.computeVertexNormals()
    glass.push(stripToPN(g))
  }
  for (const s of [-1, 1]) glass.push(sidePane([[1.72, 1.4], [1.22, 2.16], [0.38, 2.16], [0.38, 1.4]], s * (hw + 0.004)))
  // rear door windows
  for (const s of [-1, 1]) {
    const g = endPane(0.78, 1.55, 2.15, -2.745, -1)
    g.translate(s * 0.47, 0, 0)
    glass.push(g)
  }
  const trim: THREE.BufferGeometry[] = [
    bx(1.98, 0.3, 0.14, 0, 0.52, 2.71),
    bx(1.25, 0.3, 0.05, 0, 0.84, 2.71, 0.25),
    bx(2.0, 0.22, 0.14, 0, 0.5, -2.72),
    bx(0.02, 1.6, 0.012, 0, 1.35, -2.752), // rear door split
    ...linersFor([FA, RA], hw, 0.44, 0.4),
  ]
  for (const s of [-1, 1]) {
    trim.push(bx(0.03, 0.12, 4.4, s * (hw + 0.012), 0.82, -0.1)) // rub strip
    trim.push(bx(0.05, 0.1, 1.9, s * (hw + 0.006), 0.36, 0)) // sill
    for (const z of [1.7, 0.33]) trim.push(bx(0.012, 1.85, 0.008, s * (hw + 0.012), 1.32, z)) // cab door seams
    trim.push(bx(0.02, 0.04, 0.18, s * (hw + 0.014), 1.18, 0.62)) // handle
    trim.push(bx(0.06, 0.32, 0.18, s * (hw + 0.16), 1.72, 1.32)) // big mirror
    trim.push(bx(0.16, 0.04, 0.05, s * (hw + 0.06), 1.62, 1.36))
    trim.push(bx(0.025, 0.035, 0.85, s * (hw + 0.005), 2.18, 0.8)) // window frame top
  }
  trim.push(bx(0.012, 1.85, 0.008, -(hw + 0.012), 1.32, -1.15)) // sliding door rear seam (right side)
  trim.push(bx(0.03, 0.04, 2.4, -(hw + 0.02), 2.0, -0.4)) // sliding door rail
  const lights = (fn: (s: number) => THREE.BufferGeometry[]) => mergeGeometries([-1, 1].flatMap(fn), false)!
  const head = lights((s) => [bx(0.42, 0.2, 0.06, s * 0.7, 1.0, 2.64, 0, s * -0.25, 0)])
  const brake = lights((s) => [bx(0.13, 0.5, 0.05, s * 0.93, 1.02, -2.75)])
  const ind = (s: number) =>
    mergeGeometries([bx(0.14, 0.09, 0.06, s * 0.94, 0.98, 2.56, 0, s * -0.6, 0), bx(0.13, 0.12, 0.05, s * 0.93, 1.38, -2.75), bx(0.03, 0.03, 0.09, s * (hw + 0.2), 1.6, 1.32)], false)!
  const plates = mergeGeometries([stripToPN(planeUV(0.52, 0.11, 0, 0.52, 2.79, 0)), stripToPN(planeUV(0.52, 0.11, 0, 0.66, -2.79, Math.PI))], true)!
  vanCache = {
    body: stripToPN(body),
    glass: mergeGeometries(glass, false)!,
    trim: mergeGeometries(trim, false)!,
    head,
    brake,
    indL: ind(1),
    indR: ind(-1),
    plates,
    wheels: [
      [0.87, FA],
      [-0.87, FA],
      [0.87, RA],
      [-0.87, RA],
    ],
    wheelR: R,
  }
  return vanCache
}

let busCache: BoxVehicleGeos | null = null
/** 12 m low-entry city bus (Norwegian city-bus proportions), doors on the right (−x) side. */
export function busGeos(): BoxVehicleGeos {
  if (busCache) return busCache
  const W = 2.55
  const hw = W / 2
  const R = 0.5
  const FA = 3.45
  const RA = -2.45
  const AR = 0.66
  const prof: Array<[number, number]> = [
    [-5.95, 0.4],
    [RA - AR - 0.02, 0.34],
    ...archPts(RA, 0.5, AR),
    [FA - AR - 0.02, 0.34],
    ...archPts(FA, 0.5, AR),
    [5.86, 0.34],
    [5.98, 0.46],
    [6.02, 0.95],
    [5.99, 2.92],
    [5.86, 3.1],
    [-5.86, 3.12],
    [-5.99, 2.95],
    [-6.0, 0.52],
  ]
  const keep = new Set<number>()
  prof.forEach((p, i) => p[1] < 1.2 && Math.min(Math.abs(p[0] - FA), Math.abs(p[0] - RA)) < AR + 0.05 && keep.add(i))
  const body = extrudeProfile(chaikin(prof, 1, keep), W, 0.12)
  const glass: THREE.BufferGeometry[] = [endPane(W - 0.3, 1.0, 2.72, 6.115, 1, 0.04), endPane(1.6, 2.05, 2.75, -6.1, -1)]
  const xs = hw + 0.004
  // left side (+x): continuous window band
  glass.push(sidePane([[5.35, 1.32], [5.35, 2.74], [-5.45, 2.74], [-5.45, 1.32]], xs))
  // right side (−x): band interrupted by front + middle doors; doors are full-height glass
  const doors: Array<[number, number]> = [
    [4.55, 1.25],
    [0.35, 1.3],
  ]
  const segs: Array<[number, number]> = [
    [5.35, doors[0][0] + doors[0][1] / 2 + 0.08],
    [doors[0][0] - doors[0][1] / 2 - 0.08, doors[1][0] + doors[1][1] / 2 + 0.08],
    [doors[1][0] - doors[1][1] / 2 - 0.08, -5.45],
  ]
  for (const [a, b] of segs) glass.push(sidePane([[a, 1.32], [a, 2.74], [b, 2.74], [b, 1.32]], -xs))
  for (const [z, w] of doors) {
    glass.push(sidePane([[z + w / 2 - 0.05, 0.42], [z + w / 2 - 0.05, 2.7], [z + 0.02, 2.7], [z + 0.02, 0.42]], -(xs + 0.002)))
    glass.push(sidePane([[z - 0.02, 0.42], [z - 0.02, 2.7], [z - w / 2 + 0.05, 2.7], [z - w / 2 + 0.05, 0.42]], -(xs + 0.002)))
  }
  const trim: THREE.BufferGeometry[] = [
    bx(W - 0.1, 0.32, 0.16, 0, 0.5, 6.06),
    bx(W - 0.1, 0.32, 0.16, 0, 0.52, -6.06),
    bx(W - 0.3, 0.26, 0.05, 0, 2.86, 6.11), // destination display housing
    bx(1.6, 0.34, 2.4, 0, 3.32, -1.6), // roof AC unit
    bx(1.2, 0.24, 1.6, 0, 3.28, 2.6),
    ...linersFor([FA, RA], hw, 0.6, 0.5),
  ]
  for (const s of [-1, 1]) {
    trim.push(bx(0.03, 0.42, 11.4, s * (hw + 0.008), 0.6, 0)) // dark skirt
    trim.push(bx(0.025, 0.05, 11.0, s * (hw + 0.006), 1.3, 0)) // window frame bottom
    trim.push(bx(0.025, 0.05, 11.0, s * (hw + 0.006), 2.76, 0)) // window frame top
    for (let z = 4.0; z > -5.4; z -= 1.55) if (s > 0 || Math.min(...doors.map(([dz, dw]) => Math.abs(z - dz) - dw / 2)) > 0.12) trim.push(bx(0.03, 1.44, 0.07, s * (hw + 0.008), 2.03, z)) // pillars
    trim.push(bx(0.06, 0.05, 0.6, s * (hw + 0.28), 2.45, 5.75)) // mirror arm
    trim.push(bx(0.06, 0.42, 0.22, s * (hw + 0.55), 2.2, 5.85)) // mirror
  }
  for (const [z] of doors) trim.push(bx(0.03, 2.32, 0.05, -(hw + 0.01), 1.56, z)) // door centre seal
  for (const [z, w] of doors) {
    trim.push(bx(0.035, 0.06, w, -(hw + 0.01), 2.72, z))
    trim.push(bx(0.035, 2.3, 0.05, -(hw + 0.01), 1.56, z + w / 2))
    trim.push(bx(0.035, 2.3, 0.05, -(hw + 0.01), 1.56, z - w / 2))
  }
  const lights = (fn: (s: number) => THREE.BufferGeometry[]) => mergeGeometries([-1, 1].flatMap(fn), false)!
  const head = lights((s) => [bx(0.42, 0.16, 0.05, s * 0.88, 0.82, 6.07)])
  const brake = lights((s) => [bx(0.2, 0.55, 0.05, s * 1.05, 1.05, -6.08), bx(0.25, 0.08, 0.05, s * 0.9, 3.0, -6.04)])
  const ind = (s: number) => mergeGeometries([bx(0.18, 0.12, 0.05, s * 1.08, 0.82, 6.07), bx(0.2, 0.16, 0.05, s * 1.05, 1.5, -6.08), bx(0.04, 0.08, 0.3, s * (hw + 0.012), 0.95, 4.9)], false)!
  const plates = mergeGeometries([stripToPN(planeUV(0.52, 0.11, 0, 0.5, 6.15, 0)), stripToPN(planeUV(0.52, 0.11, 0, 0.6, -6.15, Math.PI))], true)!
  const sign = planeUV(W - 0.42, 0.18, 0, 2.86, 6.14, 0)
  busCache = {
    body: stripToPN(body),
    glass: mergeGeometries(glass, false)!,
    trim: mergeGeometries(trim, false)!,
    head,
    brake,
    indL: ind(1),
    indR: ind(-1),
    plates,
    wheels: [
      [1.05, FA],
      [-1.05, FA],
      [1.05, RA],
      [-1.05, RA],
    ],
    wheelR: R,
    sign,
  }
  return busCache
}

let signTex: THREE.CanvasTexture | null = null
/** LED destination display: route number + destination (fictional route). */
export function destinationTexture() {
  if (signTex) return signTex
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 48
  const g = c.getContext('2d')!
  g.fillStyle = '#0b0b0a'
  g.fillRect(0, 0, 512, 48)
  g.fillStyle = '#ffb21e'
  g.font = 'bold 34px "Arial Narrow", Arial, sans-serif'
  g.textBaseline = 'middle'
  g.fillText('31', 14, 26)
  g.font = 'bold 30px "Arial Narrow", Arial, sans-serif'
  g.fillText('Sentrum via Torget', 78, 26)
  signTex = new THREE.CanvasTexture(c)
  signTex.colorSpace = THREE.SRGBColorSpace
  return signTex
}

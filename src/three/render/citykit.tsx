import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { shopSign } from '../textures'
import { glass, metal, paint, plastic, surface, windowGlass } from './materials'
import { boxUV, worldBox } from './uv'

/**
 * City kit — the second half of the premium street kit (see streetkit.tsx):
 * worn road markings, bike-lane surfacing, circular road pieces, Norwegian
 * urban apartment blocks (bygårder) with recessed windows and shopfronts,
 * and sidewalk furniture. Everything returns world-UV geometry or uses the
 * shared materials, so MergeStatic batches a whole street.
 *
 * Marking geometry follows the Norwegian conventions used by the scenario
 * layouts (yellow centre lines between opposing traffic, white edge/lane
 * lines, white zebra bars parallel to the travel direction, give-way
 * "haitenner"). Dimensions are approximate — see docs/SIGNAGE_AUDIT.md.
 */

const Y = 0.009

/* ───────────── markings ───────────── */

let wearTex: THREE.CanvasTexture | null = null
/** Speckled wear mask for road paint (alpha). Tiles every 2 m via world UVs. */
function paintWearTexture() {
  if (wearTex) return wearTex
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 256, 256)
  let s = 7
  const r = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff
  for (let i = 0; i < 1800; i++) {
    const a = 0.25 + r() * 0.65
    g.fillStyle = `rgba(0,0,0,${a})`
    const x = r() * 256
    const y = r() * 256
    const rad = 0.6 + r() * (r() < 0.08 ? 6 : 1.8)
    g.beginPath()
    g.ellipse(x, y, rad, rad * (0.6 + r()), r() * 3, 0, Math.PI * 2)
    g.fill()
  }
  wearTex = new THREE.CanvasTexture(c)
  wearTex.wrapS = wearTex.wrapT = THREE.RepeatWrapping
  wearTex.repeat.set(0.5, 0.5)
  wearTex.colorSpace = THREE.NoColorSpace
  return wearTex
}

const markCache = new Map<string, THREE.MeshStandardMaterial>()
/** Road-paint material: slightly glossy, worn (alpha-tested speckle). */
export function markingMaterial(color: 'white' | 'yellow') {
  let m = markCache.get(color)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: color === 'white' ? '#e9e7df' : '#e3b62a',
      roughness: 0.62,
      alphaMap: paintWearTexture(),
      alphaTest: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      envMapIntensity: 0.6,
    })
    m.name = `marking:${color}`
    markCache.set(color, m)
  }
  return m
}

/** Flat rectangle mark centred at (x, z), w along x, d along z, optional yaw. */
export function markRect(x: number, z: number, w: number, d: number, rot = 0) {
  const g = new THREE.PlaneGeometry(w, d)
  g.rotateX(-Math.PI / 2)
  if (rot) g.rotateY(rot)
  g.translate(x, Y, z)
  const p = g.attributes.position
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i))
  return g
}

/** Solid line along an axis. */
export function lineMark(axis: 'x' | 'z', at: number, from: number, to: number, width = 0.12) {
  const len = Math.abs(to - from)
  const mid = (from + to) / 2
  return axis === 'z' ? markRect(at, mid, width, len) : markRect(mid, at, len, width)
}

/** Dashed line (Norwegian centre line ≈ 3 m dash / 9 m gap outside built-up areas; 3/3 in towns). */
export function dashedMark(axis: 'x' | 'z', at: number, from: number, to: number, dash = 3, gap = 3, width = 0.12) {
  const parts: THREE.BufferGeometry[] = []
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  for (let p = lo; p + dash <= hi + 0.01; p += dash + gap) parts.push(lineMark(axis, at, p, p + dash, width))
  return parts.length ? mergeGeometries(parts)! : new THREE.BufferGeometry()
}

/** Zebra crossing: bars parallel to the travel direction (axis = road direction). */
export function zebraMark(axis: 'x' | 'z', at: number, from: number, to: number, depth = 3, bar = 0.5, step = 1.0) {
  const parts: THREE.BufferGeometry[] = []
  for (let p = Math.min(from, to) + 0.45; p < Math.max(from, to) - 0.2; p += step)
    parts.push(axis === 'z' ? markRect(p, at, bar, depth) : markRect(at, p, depth, bar))
  return mergeGeometries(parts)!
}

/** Give-way line: triangles across the lane pointing at the approaching driver (approach from +local z). */
export function yieldTeeth(x: number, z: number, width: number, rot = 0) {
  const n = Math.max(2, Math.floor(width / 0.75))
  const step = width / n
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < n; i++) {
    const s = new THREE.Shape()
    s.moveTo(-0.25, 0)
    s.lineTo(0.25, 0)
    s.lineTo(0, -0.6)
    s.closePath()
    const g = new THREE.ShapeGeometry(s)
    g.rotateX(-Math.PI / 2)
    g.translate(-width / 2 + step * (i + 0.5), 0, 0)
    parts.push(g)
  }
  const g = mergeGeometries(parts)!
  g.rotateY(rot)
  g.translate(x, Y, z)
  const p = g.attributes.position
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i))
  return g
}

/** Painted ring (roundabout edge line). */
export function ringMark(r0: number, r1: number, seg = 96) {
  const g = new THREE.RingGeometry(r0, r1, seg)
  g.rotateX(-Math.PI / 2)
  g.translate(0, Y, 0)
  const p = g.attributes.position
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i))
  return g
}

/* ───────────── road surfaces ───────────── */

/** Red-surfaced bike lane (tinted asphalt, same micro-detail as the road). */
export function bikeLaneMaterial() {
  return surface('asphalt', { color: '#b8705f', roughness: 1 })
}

/** Flat disc / ring with metre UVs at height y. */
export function discGeo(r: number, y = 0, seg = 96) {
  const g = new THREE.CircleGeometry(r, seg)
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  const p = g.attributes.position
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i))
  return g
}

export function ringGeo(r0: number, r1: number, y = 0, seg = 96) {
  const g = new THREE.RingGeometry(r0, r1, seg)
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  const p = g.attributes.position
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i))
  return g
}

/** Raised cylinder (island) with world UVs. */
export function islandGeo(r: number, h: number, seg = 64) {
  const g = new THREE.CylinderGeometry(r, r, h, seg)
  g.translate(0, h / 2, 0)
  return boxUV(g)
}

/* ───────────── apartment block (bygård) ───────────── */

export interface BlockSpec {
  x: number
  z: number
  rot?: number
  w: number
  d: number
  floors: number
  color: string
  /** street-facing ground-floor shop */
  shop?: { text: string; bg: string; fg: string; awning?: string }
  roof?: 'flat' | 'hip'
  balconies?: boolean
  seed?: number
  /** brick facade instead of plaster */
  brick?: boolean
  /** windows on the gable ends too (corner / free-standing blocks) */
  allSides?: boolean
}

const FLOOR_H = 3.05
const GROUND_H = 3.6

/**
 * Urban apartment block in the Norwegian 1900–1950 tradition: plastered
 * facade, cornice, recessed two-light windows with reveals and sills,
 * optional shopfront and balconies. Front = local +z (the street).
 */
export function CityBlock(spec: BlockSpec) {
  const { x, z, rot = 0, w, d, floors, color, shop, roof = 'flat', balconies, seed = 1, brick, allSides } = spec
  const parts = useMemo(() => {
    const out: Array<{ g: THREE.BufferGeometry; m: THREE.Material; cast?: boolean }> = []
    const facade = brick ? surface('brick', { color: '#f2ebe4' }) : surface('plaster', { color })
    const trim = paint('#ece9e1', 0.65)
    const dark = paint('#2b2f33', 0.6)
    const H = GROUND_H + (floors - 1) * FLOOR_H
    out.push({ g: worldBox(0, H / 2, 0, w, H, d), m: facade })
    // plinth + cornice + floor bands
    out.push({ g: worldBox(0, 0.35, d / 2 + 0.02, w + 0.04, 0.7, 0.06), m: surface('granite', { tile: 1.2 }) })
    out.push({ g: worldBox(0, H + 0.12, 0, w + 0.3, 0.24, d + 0.3), m: trim })
    out.push({ g: worldBox(0, H - 0.12, d / 2 + 0.08, w + 0.2, 0.16, 0.16), m: trim })
    if (floors > 1) out.push({ g: worldBox(0, GROUND_H, d / 2 + 0.05, w + 0.06, 0.18, 0.1), m: trim })
    // roof
    if (roof === 'hip') {
      const rh = Math.min(3.2, d * 0.32)
      const g = new THREE.ConeGeometry(1, 1, 4, 1)
      g.rotateY(Math.PI / 4)
      g.scale(((w + 0.5) / 2) * Math.SQRT2, rh, ((d + 0.5) / 2) * Math.SQRT2)
      g.translate(0, H + 0.24 + rh / 2, 0)
      out.push({ g: boxUV(g), m: surface('roof_dark', { tile: 2.2 }) })
    } else {
      out.push({ g: worldBox(0, H + 0.5, 0, w + 0.2, 0.55, d + 0.2), m: dark })
      // rooftop plant / stair housing
      out.push({ g: worldBox(w * 0.2, H + 1.2, -d * 0.15, 3, 1.4, 2.4), m: facade })
    }
    // windows
    const glassM = windowGlass()
    const cols = Math.max(2, Math.round(w / 2.7))
    const colW = w / cols
    /** window on face `face` (0 front +z, 1 back, 2 right +x, 3 left −x): glass on the wall plane, casing + sill protrude */
    const faceM = (face: number, cx: number) => {
      const m = new THREE.Matrix4()
      if (face === 0) m.makeTranslation(cx, 0, d / 2)
      if (face === 1) m.makeRotationY(Math.PI).premultiply(new THREE.Matrix4().makeTranslation(cx, 0, -d / 2))
      if (face === 2) m.makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(w / 2, 0, cx))
      if (face === 3) m.makeRotationY(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(-w / 2, 0, cx))
      return m
    }
    const local = (g: THREE.BufferGeometry, m: THREE.Matrix4, mat: THREE.Material, cast = false) => out.push({ g: boxUV(g.applyMatrix4(m)), m: mat, cast })
    const addWindow = (cx: number, cy: number, ww: number, wh: number, face = 0) => {
      const m = faceM(face, cx)
      const b = (bw: number, bh: number, bd: number, x: number, y: number, zz: number) => new THREE.BoxGeometry(bw, bh, bd).translate(x, y, zz)
      local(new THREE.PlaneGeometry(ww, wh).translate(0, cy, 0.012), m, glassM)
      // casing (protruding frame) gives the window depth
      local(b(ww + 0.2, 0.09, 0.09, 0, cy + wh / 2 + 0.045, 0.045), m, trim)
      for (const s of [-1, 1]) local(b(0.1, wh, 0.09, (s * (ww + 0.1)) / 2, cy, 0.045), m, trim)
      // sash bars: mullion + transom
      local(b(0.05, wh, 0.03, 0, cy, 0.02), m, trim)
      local(b(ww, 0.05, 0.03, 0, cy + wh * 0.22, 0.02), m, trim)
      // sill + head moulding
      local(b(ww + 0.3, 0.07, 0.17, 0, cy - wh / 2 - 0.04, 0.085), m, trim, true)
      local(b(ww + 0.34, 0.12, 0.08, 0, cy + wh / 2 + 0.15, 0.04), m, trim)
    }
    for (let f = shop ? 1 : 0; f < floors; f++) {
      const cy = f === 0 ? 1.7 : GROUND_H + (f - 1) * FLOOR_H + 1.55
      for (let i = 0; i < cols; i++) addWindow(-w / 2 + colW * (i + 0.5), cy, 1.15, f === 0 ? 1.5 : 1.55)
      if (allSides) {
        const sc = Math.max(1, Math.round(d / 3))
        for (let i = 0; i < sc; i++) {
          const cz = -d / 2 + (d / sc) * (i + 0.5)
          addWindow(cz, cy, 1.05, 1.5, 2)
          addWindow(-cz, cy, 1.05, 1.5, 3)
        }
      }
    }
    // shopfront
    if (shop) {
      const sw = w - 1.6
      out.push({ g: worldBox(0, 1.55, d / 2 + 0.015, sw, 2.5, 0.02), m: glass('#1c242b', 0.92), cast: false })
      for (let i = 0; i <= 4; i++) out.push({ g: worldBox(-sw / 2 + (sw / 4) * i, 1.55, d / 2 + 0.05, 0.1, 2.5, 0.1), m: dark, cast: false })
      out.push({ g: worldBox(0, 2.84, d / 2 + 0.05, sw + 0.1, 0.12, 0.1), m: dark, cast: false })
      out.push({ g: worldBox(0, 0.22, d / 2 + 0.05, sw, 0.44, 0.1), m: dark, cast: false })
      // door
      out.push({ g: worldBox(sw / 2 - 1.1, 1.15, d / 2 + 0.03, 1.0, 2.3, 0.04), m: paint('#3a3328', 0.5), cast: false })
      if (shop.awning) {
        const a = new THREE.BoxGeometry(sw, 0.06, 1.3)
        a.rotateX(0.32)
        a.translate(0, 3.05, d / 2 + 0.6)
        out.push({ g: boxUV(a), m: paint(shop.awning, 0.85) })
        out.push({ g: worldBox(0, 2.86, d / 2 + 1.22, sw, 0.22, 0.03), m: paint(shop.awning, 0.85) })
      }
    }
    // balconies on upper floors (concrete slab + glass/steel railing)
    if (balconies && floors > 2) {
      for (let f = 2; f < floors; f++) {
        const by = GROUND_H + (f - 1) * FLOOR_H + 0.05
        for (let i = 1; i < cols; i += 2) {
          const bxx = -w / 2 + colW * i
          out.push({ g: worldBox(bxx, by, d / 2 + 0.6, 2.4, 0.16, 1.2), m: surface('concrete', { tile: 2 }) })
          out.push({ g: worldBox(bxx, by + 0.55, d / 2 + 1.18, 2.4, 0.95, 0.03), m: glass('#9fb3bf', 0.55), cast: false })
          out.push({ g: worldBox(bxx, by + 1.04, d / 2 + 1.18, 2.44, 0.05, 0.06), m: metal('#4a4f55', 0.4) })
        }
      }
    }
    // downpipes
    for (const s of [-1, 1]) out.push({ g: worldBox(s * (w / 2 - 0.15), H / 2, d / 2 + 0.1, 0.1, H, 0.1), m: metal('#5c6166', 0.45) })
    void seed
    return out
  }, [w, d, floors, color, shop, roof, balconies, seed, brick, allSides])
  const signTex = useMemo(() => (shop ? shopSign(shop.text, shop.bg, shop.fg) : null), [shop])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.g} material={p.m} castShadow={p.cast ?? true} receiveShadow />
      ))}
      {shop && signTex && (
        <mesh position={[0, 3.35, d / 2 + 0.07]}>
          <planeGeometry args={[Math.min(w - 2, 5.2), 0.62]} />
          <meshStandardMaterial map={signTex} roughness={0.5} emissive="#ffffff" emissiveMap={signTex} emissiveIntensity={0.15} />
        </mesh>
      )}
    </group>
  )
}

/* ───────────── furniture ───────────── */

/** Modern Norwegian bus shelter (leskur): steel frame, glass back + side, bench, timetable case. */
export function BusShelter2({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const g = useMemo(() => {
    const steel: THREE.BufferGeometry[] = []
    for (const sx of [-1.9, 1.9]) for (const sz of [-0.65, 0.55]) steel.push(worldBox(sx, 1.25, sz, 0.08, 2.5, 0.08))
    steel.push(worldBox(0, 2.55, -0.05, 4.1, 0.1, 1.6))
    steel.push(worldBox(0, 0.48, -0.42, 2.6, 0.06, 0.38))
    steel.push(worldBox(0, 0.24, -0.42, 2.4, 0.04, 0.05))
    const glassG = [worldBox(0, 1.35, -0.67, 3.7, 2.1, 0.02), worldBox(-1.9, 1.35, -0.05, 0.02, 2.1, 1.1)]
    return { steel: mergeGeometries(steel)!, glass: mergeGeometries(glassG)! }
  }, [])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={g.steel} material={metal('#3a3f45', 0.45)} castShadow receiveShadow />
      <mesh geometry={g.glass} material={glass('#c9dbe4', 0.28)} />
      <mesh position={[1.55, 1.4, -0.6]} material={plastic('#f2f0ea', 0.4)}>
        <boxGeometry args={[0.6, 0.9, 0.06]} />
      </mesh>
    </group>
  )
}

export function Bench2({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const g = useMemo(() => {
    const wood: THREE.BufferGeometry[] = []
    for (let i = 0; i < 4; i++) wood.push(worldBox(0, 0.46, -0.18 + i * 0.12, 1.8, 0.04, 0.09))
    for (let i = 0; i < 2; i++) wood.push(worldBox(0, 0.62 + i * 0.14, -0.3, 1.8, 0.09, 0.03))
    const steel = [worldBox(-0.75, 0.3, -0.05, 0.06, 0.6, 0.5), worldBox(0.75, 0.3, -0.05, 0.06, 0.6, 0.5)]
    return { wood: mergeGeometries(wood)!, steel: mergeGeometries(steel)! }
  }, [])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={g.wood} material={paint('#7a5537', 0.7)} castShadow />
      <mesh geometry={g.steel} material={metal('#2f3337', 0.5)} castShadow />
    </group>
  )
}

/** Sidewalk tree pit with cast-iron grate. */
export function TreeGrate({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.135, z]}>
      <mesh material={metal('#2a2b2c', 0.6)} receiveShadow rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.18, 0.75, 4, 1, Math.PI / 4]} />
      </mesh>
    </group>
  )
}

export function Bollard({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.45} material={metal('#3a3f45', 0.45)} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.9, 10]} />
      </mesh>
      <mesh position-y={0.8} material={paint('#e9e6dc', 0.5)}>
        <cylinderGeometry args={[0.075, 0.075, 0.05, 10]} />
      </mesh>
    </group>
  )
}

export function BikeRack({ x, z, rot = 0, n = 4 }: { x: number; z: number; rot?: number; n?: number }) {
  const g = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (let i = 0; i < n; i++) {
      const t = new THREE.TorusGeometry(0.35, 0.025, 6, 12, Math.PI)
      t.rotateY(Math.PI / 2)
      t.translate(-(n - 1) * 0.4 + i * 0.8, 0.08, 0)
      parts.push(t)
    }
    return mergeGeometries(parts)!
  }, [n])
  return <mesh geometry={g} material={metal('#8f969d', 0.35)} position={[x, 0, z]} rotation-y={rot} castShadow />
}

export function Planter({ x, z, w = 1.6 }: { x: number; z: number; w?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.3} material={surface('concrete', { tile: 1.5, color: '#b8b4ab' })} castShadow receiveShadow>
        <boxGeometry args={[w, 0.6, 0.7]} />
      </mesh>
      <mesh position-y={0.66} material={paint('#4c6b3a', 0.95)} castShadow>
        <sphereGeometry args={[0.4, 10, 7]} />
      </mesh>
      <mesh position={[w * 0.28, 0.62, 0.05]} material={paint('#c2436a', 0.9)}>
        <sphereGeometry args={[0.22, 8, 6]} />
      </mesh>
      <mesh position={[-w * 0.28, 0.62, -0.05]} material={paint('#e9c24a', 0.9)}>
        <sphereGeometry args={[0.2, 8, 6]} />
      </mesh>
    </group>
  )
}

export function LitterBin({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.45} material={metal('#3d5a45', 0.5)} castShadow>
        <cylinderGeometry args={[0.22, 0.2, 0.9, 12]} />
      </mesh>
      <mesh position-y={0.92} material={metal('#2a2c30', 0.5)}>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 12]} />
      </mesh>
    </group>
  )
}

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { metal, paint, plastic, surface, windowGlass } from './materials'
import { boxUV, groundPlane, worldBox } from './uv'

/**
 * Reusable Norwegian street kit (benchmark quality). Every piece uses the
 * shared PBR library + metre UVs so MergeStatic can batch a whole street.
 */

const WHITE = '#f1efe9'

function M({ geo, mat, cast = true, recv = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; cast?: boolean; recv?: boolean }) {
  return <mesh geometry={geo} material={mat} castShadow={cast} receiveShadow={recv} />
}

/* ───────────── road surface details ───────────── */

let overlayTex: THREE.CanvasTexture | null = null
/** Procedural wear overlay: kerb grime, tyre polish, crack sealing, patches. u = across road, v = along (repeats). */
function roadOverlayTexture() {
  if (overlayTex) return overlayTex
  const W = 256
  const H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  let s = 11
  const r = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff
  // kerb-side grime gradients
  for (const side of [0, 1]) {
    const grad = g.createLinearGradient(side ? W : 0, 0, side ? W - 46 : 46, 0)
    grad.addColorStop(0, 'rgba(25,24,22,0.55)')
    grad.addColorStop(0.35, 'rgba(25,24,22,0.22)')
    grad.addColorStop(1, 'rgba(25,24,22,0)')
    g.fillStyle = grad
    g.fillRect(side ? W - 46 : 0, 0, 46, H)
  }
  // tyre tracks: slightly darker, smoother bands (two per lane)
  for (const u of [0.16, 0.37, 0.63, 0.84]) {
    const x = u * W
    const grad = g.createLinearGradient(x - 14, 0, x + 14, 0)
    grad.addColorStop(0, 'rgba(30,30,30,0)')
    grad.addColorStop(0.5, 'rgba(30,30,30,0.16)')
    grad.addColorStop(1, 'rgba(30,30,30,0)')
    g.fillStyle = grad
    g.fillRect(x - 14, 0, 28, H)
  }
  // centre band slightly lighter (less traffic)
  g.fillStyle = 'rgba(210,205,195,0.05)'
  g.fillRect(W * 0.46, 0, W * 0.08, H)
  // patches (repaired asphalt — darker, sharper edged)
  for (let i = 0; i < 3; i++) {
    const w = 30 + r() * 70
    const h = 60 + r() * 160
    const x = r() * (W - w)
    const y = r() * (H - h)
    g.fillStyle = 'rgba(28,28,30,0.16)'
    g.fillRect(x, y, w, h)
    g.strokeStyle = 'rgba(12,12,12,0.3)'
    g.lineWidth = 2
    g.strokeRect(x, y, w, h)
  }
  // crack sealing (bitumen lines)
  g.strokeStyle = 'rgba(14,14,14,0.32)'
  for (let i = 0; i < 7; i++) {
    g.lineWidth = 1 + r() * 1.5
    let x = r() * W
    let y = r() * H
    g.beginPath()
    g.moveTo(x, y)
    const n = 6 + Math.floor(r() * 10)
    for (let k = 0; k < n; k++) {
      x += (r() - 0.5) * 22
      y += 8 + r() * 26
      g.lineTo(x, y)
    }
    g.stroke()
  }
  // oil drops in lane centres
  for (let i = 0; i < 40; i++) {
    const x = (r() < 0.5 ? 0.26 : 0.74) * W + (r() - 0.5) * 30
    const y = r() * H
    g.fillStyle = `rgba(15,15,15,${0.08 + r() * 0.12})`
    g.beginPath()
    g.ellipse(x, y, 3 + r() * 10, 3 + r() * 14, r() * 3, 0, Math.PI * 2)
    g.fill()
  }
  overlayTex = new THREE.CanvasTexture(c)
  overlayTex.colorSpace = THREE.SRGBColorSpace
  overlayTex.wrapS = THREE.ClampToEdgeWrapping
  overlayTex.wrapT = THREE.RepeatWrapping
  overlayTex.anisotropy = 8
  return overlayTex
}

const overlayMat = () =>
  new THREE.MeshStandardMaterial({
    map: roadOverlayTexture(),
    transparent: true,
    depthWrite: false,
    roughness: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
let _overlay: THREE.MeshStandardMaterial | null = null

/** Wear overlay for a straight road strip. axis: direction of travel. */
export function RoadWear({ axis, at, from, to, width, repeat = 22 }: { axis: 'x' | 'z'; at: number; from: number; to: number; width: number; repeat?: number }) {
  const geo = useMemo(() => {
    const len = Math.abs(to - from)
    const mid = (from + to) / 2
    const g = new THREE.PlaneGeometry(width, len)
    g.rotateX(-Math.PI / 2)
    if (axis === 'x') g.rotateY(Math.PI / 2)
    g.translate(axis === 'z' ? at : mid, 0.004, axis === 'z' ? mid : at)
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (len / repeat))
    return g
  }, [axis, at, from, to, width, repeat])
  if (!_overlay) _overlay = overlayMat()
  return <mesh geometry={geo} material={_overlay} receiveShadow renderOrder={1} />
}

/** Straight granite kerb run along x or z. side = which side is the road (+1/-1) – used for chamfer orientation. */
export function curbGeo(axis: 'x' | 'z', at: number, from: number, to: number, h = 0.14, w = 0.16) {
  const len = Math.abs(to - from)
  const mid = (from + to) / 2
  return axis === 'z' ? worldBox(at, h / 2, mid, w, h, len) : worldBox(mid, h / 2, at, len, h, w)
}

/** Curved kerb (quarter arcs at corners), as box segments. */
export function curbArcGeo(cx: number, cz: number, r: number, a0: number, a1: number, h = 0.14, w = 0.16, seg = 10) {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + ((a1 - a0) * i) / seg
    const t1 = a0 + ((a1 - a0) * (i + 1)) / seg
    const tm = (t0 + t1) / 2
    const L = r * Math.abs(t1 - t0) + 0.02
    const g = new THREE.BoxGeometry(L, h, w)
    g.rotateY(-tm - Math.PI / 2)
    g.translate(cx + Math.cos(tm) * r, h / 2, cz + Math.sin(tm) * r)
    parts.push(boxUV(g))
  }
  return mergeGeometries(parts)!
}

/** Corner sidewalk fill: square (corner region) minus quarter circle, raised. */
export function cornerGeo(cx: number, cz: number, sx: number, sz: number, size: number, r: number, h = 0.13) {
  // cx,cz = road corner point; sx,sz = direction into the block (±1)
  const s = new THREE.Shape()
  s.moveTo(r, 0)
  s.lineTo(size, 0)
  s.lineTo(size, size)
  s.lineTo(0, size)
  s.lineTo(0, r)
  s.absarc(r, r, r, Math.PI, Math.PI * 1.5, false)
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 12 })
  g.rotateX(Math.PI / 2)
  g.translate(0, h, 0)
  g.scale(sx, 1, sz)
  if (sx * sz < 0) {
    // mirrored → flip winding
    const idx = g.index
    if (idx) for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1)
      idx.setX(i + 1, idx.getX(i + 2))
      idx.setX(i + 2, a)
    }
    g.computeVertexNormals()
  }
  g.translate(cx, 0, cz)
  return boxUV(g)
}

export function Drain({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const geos = useMemo(() => {
    const frame = new THREE.BoxGeometry(0.5, 0.02, 0.9)
    const slots: THREE.BufferGeometry[] = []
    for (let i = 0; i < 7; i++) {
      const b = new THREE.BoxGeometry(0.4, 0.025, 0.05)
      b.translate(0, 0.002, -0.36 + i * 0.12)
      slots.push(b)
    }
    return { frame, slots: mergeGeometries(slots)! }
  }, [])
  return (
    <group position={[x, 0.006, z]} rotation-y={rot}>
      <mesh geometry={geos.frame} material={plastic('#08090a', 0.9)} receiveShadow />
      <mesh geometry={geos.slots} material={metal('#3a3b3c', 0.55)} receiveShadow />
    </group>
  )
}

let manholeTex: THREE.CanvasTexture | null = null
let manholeMat: THREE.MeshStandardMaterial | null = null
export function Manhole({ x, z }: { x: number; z: number }) {
  if (!manholeTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#5a5a58'
    g.fillRect(0, 0, 128, 128)
    g.strokeStyle = '#2c2c2b'
    g.lineWidth = 3
    for (let r = 14; r < 62; r += 8) {
      g.beginPath()
      g.arc(64, 64, r, 0, Math.PI * 2)
      g.stroke()
    }
    for (let a = 0; a < 16; a++) {
      g.beginPath()
      g.moveTo(64, 64)
      g.lineTo(64 + Math.cos((a / 16) * 6.28) * 60, 64 + Math.sin((a / 16) * 6.28) * 60)
      g.stroke()
    }
    manholeTex = new THREE.CanvasTexture(c)
    manholeTex.colorSpace = THREE.SRGBColorSpace
  }
  manholeMat ??= new THREE.MeshStandardMaterial({ map: manholeTex, metalness: 0.7, roughness: 0.55 })
  return (
    <mesh position={[x, 0.007, z]} rotation-x={-Math.PI / 2} receiveShadow material={manholeMat}>
      <circleGeometry args={[0.34, 24]} />
    </mesh>
  )
}

/* ───────────── furniture ───────────── */

let _lens: THREE.MeshStandardMaterial | null = null
const lampLens = () => (_lens ??= new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4dc', emissiveIntensity: 0.4, side: THREE.DoubleSide }))

/** Modern Norwegian street light: galvanised tapered pole, slim LED head. */
export function StreetLight({ x, z, rot = 0, h = 6 }: { x: number; z: number; rot?: number; h?: number }) {
  const geo = useMemo(() => {
    const pole = new THREE.CylinderGeometry(0.055, 0.09, h, 10)
    pole.translate(0, h / 2, 0)
    const arm = new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8)
    arm.rotateX(Math.PI / 2 - 0.12)
    arm.translate(0, h - 0.05, 0.62)
    const head = new THREE.BoxGeometry(0.22, 0.07, 0.62)
    head.translate(0, h - 0.02, 1.3)
    const base = new THREE.CylinderGeometry(0.14, 0.16, 0.5, 10)
    base.translate(0, 0.25, 0)
    return { metal: mergeGeometries([pole, arm, base])!, head }
  }, [h])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <M geo={geo.metal} mat={metal('#9da2a6', 0.42)} />
      <M geo={geo.head} mat={plastic('#3c4045', 0.45)} />
      <mesh position={[0, h - 0.06, 1.3]} rotation-x={Math.PI / 2} material={lampLens()}>
        <planeGeometry args={[0.16, 0.5]} />
      </mesh>
    </group>
  )
}

/** Postkassestativ: classic Norwegian mailbox stand with 2–3 boxes. */
export function MailboxStand({ x, z, rot = 0, colors = ['#b8352c', '#2a5b3c', '#c7a23a'] }: { x: number; z: number; rot?: number; colors?: string[] }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {[-0.42, 0.42].map((px) => (
        <mesh key={px} position={[px, 0.55, 0]} castShadow material={metal('#5c6064', 0.5)}>
          <boxGeometry args={[0.05, 1.1, 0.05]} />
        </mesh>
      ))}
      <mesh position={[0, 1.02, 0]} castShadow material={metal('#5c6064', 0.5)}>
        <boxGeometry args={[1.05, 0.04, 0.32]} />
      </mesh>
      {colors.map((c, i) => (
        <group key={i} position={[-0.32 + i * 0.32, 1.2, 0]}>
          <mesh castShadow material={paint(c, 0.45)}>
            <boxGeometry args={[0.28, 0.32, 0.36]} />
          </mesh>
          <mesh position={[0, 0.17, 0]} rotation-z={Math.PI / 2} castShadow material={paint(c, 0.45)}>
            <cylinderGeometry args={[0.14, 0.14, 0.28, 12, 1, false, 0, Math.PI]} />
          </mesh>
          <mesh position={[0, 0.02, 0.185]} material={plastic('#151515')}>
            <boxGeometry args={[0.18, 0.025, 0.01]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function UtilityCabinet({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow material={paint('#8f978d', 0.6)}>
        <boxGeometry args={[0.9, 1.24, 0.38]} />
      </mesh>
      <mesh position={[0, 1.26, 0]} castShadow material={paint('#7d857b', 0.6)}>
        <boxGeometry args={[0.96, 0.05, 0.44]} />
      </mesh>
      <mesh position={[0, 0.65, 0.195]} material={paint('#7b8379', 0.55)}>
        <boxGeometry args={[0.004, 1.05, 0.004]} />
      </mesh>
    </group>
  )
}

export function WheelieBin({ x, z, rot = 0, color = '#2d4a33' }: { x: number; z: number; rot?: number; color?: string }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={plastic(color, 0.55)}>
        <boxGeometry args={[0.58, 0.98, 0.72]} />
      </mesh>
      <mesh position={[0, 1.01, 0.02]} castShadow material={plastic(color, 0.5)}>
        <boxGeometry args={[0.62, 0.05, 0.78]} />
      </mesh>
      {[-0.22, 0.22].map((px) => (
        <mesh key={px} position={[px, 0.1, -0.36]} rotation-z={Math.PI / 2} material={plastic('#111')}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────────── hedges & fences ───────────── */

let hedgeMat: THREE.MeshStandardMaterial | null = null
function getHedgeMat() {
  if (!hedgeMat) {
    const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL ?? '/'}assets/tex/hedge_diff.jpg`)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(0.6, 0.6)
    hedgeMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, color: '#c4d0b0', envMapIntensity: 0.5 })
  }
  return hedgeMat
}

/** Trimmed hedge with organic, slightly lumpy surface. */
export function hedgeGeo(x: number, z: number, w: number, d: number, h: number, seed = 1) {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(2, Math.round(w * 2)), Math.max(2, Math.round(h * 3)), Math.max(2, Math.round(d * 2)))
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    // round the top edges and add lumps
    const nx = v.x / (w / 2)
    const ny = (v.y + h / 2) / h
    const nz = v.z / (d / 2)
    const edge = Math.max(Math.abs(nx), Math.abs(nz))
    if (ny > 0.75) {
      const k = (ny - 0.75) / 0.25
      v.x *= 1 - 0.12 * k * Math.abs(nx)
      v.z *= 1 - 0.12 * k * Math.abs(nz)
      v.y -= 0.08 * k * edge
    }
    const n = Math.sin(v.x * 3.1 + seed) * Math.cos(v.z * 2.7 + seed * 2) * Math.sin(v.y * 4.3)
    v.multiplyScalar(1).add(new THREE.Vector3(Math.sign(v.x) * n * 0.05, n * 0.03, Math.sign(v.z) * n * 0.05))
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  g.translate(x, h / 2, z)
  return boxUV(g)
}

export function Hedge(p: { x: number; z: number; w: number; d: number; h?: number; seed?: number }) {
  const geo = useMemo(() => hedgeGeo(p.x, p.z, p.w, p.d, p.h ?? 1.3, p.seed ?? 1), [p.x, p.z, p.w, p.d, p.h, p.seed])
  return <M geo={geo} mat={getHedgeMat()} />
}

/** White picket fence ("stakittgjerde") as ONE merged geometry, so MergeStatic can batch every fence on a street. */
let picketProto: THREE.BufferGeometry | null = null
export function fenceGeo(x: number, z: number, length: number, axis: 'x' | 'z' = 'x') {
  if (!picketProto) {
    const sh = new THREE.Shape()
    sh.moveTo(-0.035, 0)
    sh.lineTo(0.035, 0)
    sh.lineTo(0.035, 0.92)
    sh.lineTo(0, 1.0)
    sh.lineTo(-0.035, 0.92)
    sh.closePath()
    picketProto = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }).toNonIndexed()
    picketProto.deleteAttribute('uv')
  }
  const n = Math.max(2, Math.floor(length / 0.16))
  const parts: THREE.BufferGeometry[] = []
  const m = new THREE.Matrix4()
  const rot = new THREE.Matrix4().makeRotationY(axis === 'x' ? 0 : Math.PI / 2)
  for (let i = 0; i < n; i++) {
    const p = -length / 2 + (i + 0.5) * (length / n)
    m.makeTranslation(axis === 'x' ? x + p : x, 0, axis === 'x' ? z : z + p).multiply(rot)
    parts.push(picketProto.clone().applyMatrix4(m))
  }
  for (const y of [0.28, 0.72]) {
    const r = new THREE.BoxGeometry(axis === 'x' ? length : 0.03, 0.07, axis === 'x' ? 0.03 : length).toNonIndexed()
    r.deleteAttribute('uv')
    r.translate(x, y, z)
    parts.push(r)
  }
  return boxUV(mergeGeometries(parts)!)
}

export function PicketFence({ x, z, length, axis = 'x', color = WHITE }: { x: number; z: number; length: number; axis?: 'x' | 'z'; color?: string }) {
  const geo = useMemo(() => fenceGeo(x, z, length, axis), [x, z, length, axis])
  return <M geo={geo} mat={paint(color, 0.6)} />
}

/* ───────────── house ───────────── */

export interface HouseSpec {
  x: number
  z: number
  rot?: number
  w?: number
  d?: number
  floors?: 1 | 2
  color: string
  roof?: 'dark' | 'red'
  pitch?: number
  seed?: number
  porch?: boolean
  chimney?: boolean
}

/** Norwegian detached timber house (enebolig). Built from shared materials so it batches. */
export function NorHouse(spec: HouseSpec) {
  const { x, z, rot = 0, w = 9, d = 7, floors = 2, color, roof = 'dark', pitch = 34, seed = 1, porch = true, chimney = true } = spec
  const parts = useMemo(() => {
    const F = 0.55 // foundation height
    const H = floors === 2 ? 5.4 : 2.9
    const out: Array<{ g: THREE.BufferGeometry; m: THREE.Material; cast?: boolean }> = []
    const trim = paint(WHITE, 0.55)
    const siding = surface('siding', { color })
    out.push({ g: worldBox(0, F / 2, 0, w + 0.12, F, d + 0.12), m: surface('concrete', { tile: 2 }) })
    out.push({ g: worldBox(0, F + H / 2, 0, w, H, d), m: siding })
    // corner boards
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push({ g: worldBox((sx * w) / 2, F + H / 2, (sz * d) / 2, 0.16, H, 0.16), m: trim })
    if (floors === 2) {
      out.push({ g: worldBox(0, F + H / 2, d / 2 + 0.02, w + 0.04, 0.14, 0.05), m: trim })
      out.push({ g: worldBox(0, F + H / 2, -d / 2 - 0.02, w + 0.04, 0.14, 0.05), m: trim })
    }
    // windows
    const glassM = windowGlass()
    const win = (cx: number, cy: number, face: 'f' | 'b' | 'l' | 'r', ww = 1.05, wh = 1.3) => {
      const t = 0.06
      const make = (g: THREE.BufferGeometry, m: THREE.Material) => {
        const mtx = new THREE.Matrix4()
        if (face === 'f') mtx.makeTranslation(cx, cy, d / 2)
        if (face === 'b') mtx.makeRotationY(Math.PI).premultiply(new THREE.Matrix4().makeTranslation(cx, cy, -d / 2))
        if (face === 'r') mtx.makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(w / 2, cy, cx))
        if (face === 'l') mtx.makeRotationY(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(-w / 2, cy, cx))
        g.applyMatrix4(mtx)
        out.push({ g: boxUV(g), m, cast: false })
      }
      // frame
      make(new THREE.BoxGeometry(ww + 0.16, 0.09, t).translate(0, wh / 2 + 0.04, 0.03), trim)
      make(new THREE.BoxGeometry(ww + 0.16, 0.09, t).translate(0, -wh / 2 - 0.04, 0.03), trim)
      make(new THREE.BoxGeometry(0.09, wh, t).translate(-ww / 2 - 0.04, 0, 0.03), trim)
      make(new THREE.BoxGeometry(0.09, wh, t).translate(ww / 2 + 0.04, 0, 0.03), trim)
      make(new THREE.BoxGeometry(0.05, wh, 0.04).translate(0, 0, 0.02), trim)
      make(new THREE.BoxGeometry(ww, 0.05, 0.04).translate(0, wh * 0.18, 0.02), trim)
      make(new THREE.BoxGeometry(ww + 0.26, 0.05, 0.16).translate(0, -wh / 2 - 0.1, 0.07), trim)
      make(new THREE.PlaneGeometry(ww, wh).translate(0, 0, 0.0), glassM)
    }
    const perRow = Math.max(2, Math.round(w / 2.6))
    for (let f = 0; f < floors; f++) {
      const cy = F + 1.45 + f * 2.65
      for (let i = 0; i < perRow; i++) {
        const cx = -w / 2 + (w / perRow) * (i + 0.5)
        if (f === 0 && i === 1 && porch) continue // door slot
        win(cx, cy, 'f')
        win(cx, cy, 'b')
      }
      win(-d / 4, cy, 'l', 0.9)
      win(d / 4, cy, 'r', 0.9)
    }
    // door
    const dx = -w / 2 + (w / perRow) * 1.5
    out.push({ g: worldBox(dx, F + 1.05, d / 2 + 0.03, 1.0, 2.1, 0.06), m: paint(seed % 2 ? '#2f3a33' : '#5a3a2a', 0.5) })
    out.push({ g: worldBox(dx, F + 2.2, d / 2 + 0.06, 1.25, 0.1, 0.1), m: trim })
    if (porch) {
      out.push({ g: worldBox(dx, F + 2.55, d / 2 + 0.6, 1.9, 0.08, 1.2), m: trim })
      out.push({ g: worldBox(dx, F / 2, d / 2 + 0.6, 1.8, F, 1.2), m: surface('concrete', { tile: 2 }) })
    }
    // roof (gable, ridge along x)
    const th = THREE.MathUtils.degToRad(pitch)
    const run = d / 2 + 0.5
    const slope = run / Math.cos(th)
    const rise = Math.tan(th) * (d / 2)
    const roofM = surface(roof === 'dark' ? 'roof_dark' : 'roof_red', { tile: 2.2 })
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(w + 0.9, 0.14, slope)
      g.translate(0, 0, (s * slope) / 2)
      g.rotateX(s * th)
      g.translate(0, F + H + rise + 0.05, 0)
      // shift so the eaves sit just outside the wall
      out.push({ g: boxUV(g), m: roofM })
      // fascia + gutter along eaves
      const eaveZ = s * (run * 1.0)
      const eaveY = F + H + rise - Math.tan(th) * run + 0.02
      out.push({ g: worldBox(0, eaveY - 0.06, eaveZ, w + 0.92, 0.18, 0.04), m: trim })
      const gut = new THREE.CylinderGeometry(0.07, 0.07, w + 0.9, 8)
      gut.rotateZ(Math.PI / 2)
      gut.translate(0, eaveY - 0.12, eaveZ + s * 0.07)
      out.push({ g: boxUV(gut), m: metal('#4d5155', 0.45) })
    }
    // ridge cap
    out.push({ g: worldBox(0, F + H + rise + 0.14, 0, w + 0.9, 0.12, 0.3), m: roofM })
    // gable triangles (siding) + rake boards
    const tri = new THREE.Shape()
    tri.moveTo(-d / 2, 0)
    tri.lineTo(d / 2, 0)
    tri.lineTo(0, rise)
    tri.closePath()
    for (const s of [-1, 1]) {
      const g = new THREE.ExtrudeGeometry(tri, { depth: 0.05, bevelEnabled: false })
      g.rotateY(Math.PI / 2)
      g.translate((s * w) / 2 - (s > 0 ? 0.05 : 0), F + H, 0)
      out.push({ g: boxUV(g), m: siding })
      // gable window
      if (floors === 2 || w > 8) {
        const gw = new THREE.PlaneGeometry(0.7, 0.9)
        gw.rotateY((s * Math.PI) / 2)
        gw.translate((s * w) / 2 + s * 0.01, F + H + rise * 0.42, 0)
        out.push({ g: boxUV(gw), m: glassM, cast: false })
      }
      for (const k of [-1, 1]) {
        const rb = new THREE.BoxGeometry(0.06, 0.2, slope + 0.02)
        rb.translate(0, 0, (k * slope) / 2)
        rb.rotateX(k * th)
        rb.translate((s * (w + 0.9)) / 2, F + H + rise - 0.03, 0)
        out.push({ g: boxUV(rb), m: trim })
      }
    }
    if (chimney) {
      out.push({ g: worldBox(w * 0.22, F + H + rise * 0.8, -d * 0.12, 0.6, rise * 0.9 + 1.2, 0.6), m: surface('concrete', { color: '#a9a49c', tile: 1.5 }) })
      out.push({ g: worldBox(w * 0.22, F + H + rise * 0.8 + rise * 0.45 + 0.62, -d * 0.12, 0.72, 0.06, 0.72), m: metal('#3f4246', 0.5) })
    }
    // downpipes
    for (const sx of [-1, 1]) {
      const p = new THREE.CylinderGeometry(0.045, 0.045, F + H, 8)
      p.translate((sx * (w / 2 + 0.12)), (F + H) / 2, d / 2 + 0.2)
      out.push({ g: boxUV(p), m: metal('#4d5155', 0.45) })
    }
    return out
  }, [w, d, floors, color, roof, pitch, seed, porch, chimney])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {parts.map((p, i) => (
        <M key={i} geo={p.g} mat={p.m} cast={p.cast ?? true} />
      ))}
    </group>
  )
}

/* ───────────── terrain ───────────── */

let macroTex: THREE.DataTexture | null = null
function macroNoise() {
  if (macroTex) return macroTex
  const N = 128
  const data = new Uint8Array(N * N * 4)
  const h = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - Math.floor(s)
  }
  const smooth = (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    const w = (a: number, b: number) => h(((a % N) + N) % N, ((b % N) + N) % N)
    return w(xi, yi) * (1 - u) * (1 - v) + w(xi + 1, yi) * u * (1 - v) + w(xi, yi + 1) * (1 - u) * v + w(xi + 1, yi + 1) * u * v
  }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let n = 0
      let a = 0.5
      let f = 1 / 16
      for (let o = 0; o < 4; o++) {
        n += smooth(x * f * 4, y * f * 4) * a
        a *= 0.5
        f *= 2
      }
      const i = (y * N + x) * 4
      data[i] = data[i + 1] = data[i + 2] = Math.round(n * 255)
      data[i + 3] = 255
    }
  macroTex = new THREE.DataTexture(data, N, N)
  macroTex.wrapS = macroTex.wrapT = THREE.RepeatWrapping
  macroTex.magFilter = THREE.LinearFilter
  macroTex.minFilter = THREE.LinearMipmapLinearFilter
  macroTex.generateMipmaps = true
  macroTex.needsUpdate = true
  return macroTex
}

/** Adds large-scale colour variation (breaks texture tiling) to a world-UV surface material. */
export function withMacroVariation(m: THREE.MeshStandardMaterial, scale = 0.012, amount = 0.28, key = 'macro') {
  const tex = macroNoise()
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uMacro = { value: tex }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMacroUv;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMacroUv = uv * ${scale.toFixed(4)};`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uMacro;\nvarying vec2 vMacroUv;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float mac = texture2D(uMacro, vMacroUv).r * 0.65 + texture2D(uMacro, vMacroUv * 3.7 + 0.31).r * 0.35;
        diffuseColor.rgb *= mix(1.0 - ${amount.toFixed(3)}, 1.0 + ${(amount * 0.6).toFixed(3)}, mac);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.02, 0.86), smoothstep(0.55, 0.8, mac) * 0.6);`,
      )
  }
  m.customProgramCacheKey = () => key
  return m
}

/** Distant hills ring covered in forest (procedural canopy texture), fades into haze. */
export function ForestHills({ inner = 170, outer = 620, seed = 3 }: { inner?: number; outer?: number; seed?: number }) {
  const { geo, mat } = useMemo(() => {
    const segA = 160
    const segR = 14
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    const noise = (a: number, r: number) =>
      Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7.1 + seed * 2) * 0.3 + Math.sin(a * 17.3 + r * 0.01) * 0.12 + Math.sin(a * 41 + r * 0.03) * 0.05
    for (let j = 0; j <= segR; j++) {
      const t = j / segR
      const r = inner + (outer - inner) * t
      for (let i = 0; i <= segA; i++) {
        const a = (i / segA) * Math.PI * 2
        const n = noise(a, r)
        const hgt = Math.max(0, t * t * (60 + n * 55) + Math.sin(t * 9 + a * 5) * 3 * t)
        pos.push(Math.cos(a) * r, hgt - 1, Math.sin(a) * r)
        uv.push((a * r) / 40, r / 40)
      }
    }
    for (let j = 0; j < segR; j++)
      for (let i = 0; i < segA; i++) {
        const a = j * (segA + 1) + i
        const b = a + segA + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    // canopy texture
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const cx = c.getContext('2d')!
    cx.fillStyle = '#2c3a27'
    cx.fillRect(0, 0, 256, 256)
    let s = 5
    const rnd = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * 256
      const y = rnd() * 256
      const r = 2 + rnd() * 5
      const light = rnd()
      const birch = rnd() < 0.18
      cx.fillStyle = birch ? `rgba(${110 + light * 40},${128 + light * 40},${70 + light * 20},0.9)` : `rgba(${30 + light * 30},${48 + light * 34},${32 + light * 20},0.9)`
      cx.beginPath()
      cx.arc(x, y, r, 0, Math.PI * 2)
      cx.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: '#c4cdb8', envMapIntensity: 0.6 })
    return { geo: g, mat: m }
  }, [inner, outer, seed])
  return <mesh geometry={geo} material={mat} receiveShadow={false} />
}

export { groundPlane, worldBox }

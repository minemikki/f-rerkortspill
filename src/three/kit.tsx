import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  asphaltTexture,
  claddingTexture,
  facadeTexture,
  grassTexture,
  gravelTexture,
  paverTexture,
  roofTexture,
  shopSign,
  signBuss,
  signFartsgrense,
  signGangfelt,
  signVikeplikt,
  streetPlate,
} from './textures'

/**
 * Environment building kit. Everything is low-poly, stylised and built from
 * primitives so 5+ environments can be composed quickly from the same parts.
 */

export const C = {
  white: '#f2efe8',
  line: '#f4f1ea',
  yellow: '#e8b923',
  curb: '#9c9a94',
  bikeRed: '#a5473c',
}

/* ───────────── shared materials ───────────── */

const matCache = new Map<string, THREE.Material>()
export function mat(color: string, opts: { rough?: number; metal?: number; emissive?: string; ei?: number } = {}) {
  const key = `${color}-${opts.rough ?? 0.9}-${opts.metal ?? 0}-${opts.emissive ?? ''}-${opts.ei ?? 0}`
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.9,
      metalness: opts.metal ?? 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.ei ?? 0,
    })
    matCache.set(key, m)
  }
  return m
}

function texMat(key: string, make: () => THREE.Texture, rx: number, ry: number, opts: { rough?: number; color?: string } = {}) {
  const k = `${key}-${rx.toFixed(2)}-${ry.toFixed(2)}-${opts.color ?? ''}`
  let m = matCache.get(k)
  if (!m) {
    const t = make().clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    m = new THREE.MeshStandardMaterial({ map: t, roughness: opts.rough ?? 0.95, color: opts.color ?? '#ffffff' })
    matCache.set(k, m)
  }
  return m
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1)
const planeGeo = new THREE.PlaneGeometry(1, 1)
const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10)

/* ───────────── ground & roads ───────────── */

export function Ground({ size = 400, color }: { size?: number; color?: string }) {
  const m = useMemo(() => texMat('grass', grassTexture, size / 6, size / 6, { color: color ?? '#ffffff' }), [size, color])
  return <mesh geometry={planeGeo} material={m} rotation-x={-Math.PI / 2} scale={[size, size, 1]} receiveShadow position-y={-0.01} />
}

/** Axis-aligned asphalt rectangle centred at (x, z) with size w (x) × d (z). */
export function Asphalt({ x = 0, z = 0, w, d, y = 0 }: { x?: number; z?: number; w: number; d: number; y?: number }) {
  const m = useMemo(() => texMat('asphalt', asphaltTexture, w / 8, d / 8), [w, d])
  return <mesh geometry={planeGeo} material={m} rotation-x={-Math.PI / 2} position={[x, y, z]} scale={[w, d, 1]} receiveShadow />
}

export function Gravel({ x = 0, z = 0, w, d }: { x?: number; z?: number; w: number; d: number }) {
  const m = useMemo(() => texMat('gravel', gravelTexture, w / 4, d / 4), [w, d])
  return <mesh geometry={planeGeo} material={m} rotation-x={-Math.PI / 2} position={[x, 0.004, z]} scale={[w, d, 1]} receiveShadow />
}

/** Raised sidewalk with kerb. */
export function Sidewalk({ x, z, w, d, h = 0.13 }: { x: number; z: number; w: number; d: number; h?: number }) {
  const m = useMemo(() => texMat('pavers', paverTexture, w / 2.4, d / 2.4), [w, d])
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={boxGeo} material={m} position-y={h / 2} scale={[w, h, d]} receiveShadow castShadow={false} />
    </group>
  )
}

/** Flat road marking strip (axis-aligned). */
export function Mark({ x, z, w, d, color = C.line, y = 0.012 }: { x: number; z: number; w: number; d: number; color?: string; y?: number }) {
  return <mesh geometry={planeGeo} material={mat(color, { rough: 0.7 })} rotation-x={-Math.PI / 2} position={[x, y, z]} scale={[w, d, 1]} receiveShadow />
}

/** Dashed line along z (x fixed) or along x. */
export function Dashed({
  axis,
  at,
  from,
  to,
  dash = 3,
  gap = 9,
  width = 0.12,
  color = C.line,
}: {
  axis: 'z' | 'x'
  at: number
  from: number
  to: number
  dash?: number
  gap?: number
  width?: number
  color?: string
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const items = useMemo(() => {
    const out: number[] = []
    const lo = Math.min(from, to)
    const hi = Math.max(from, to)
    for (let p = lo; p + dash <= hi; p += dash + gap) out.push(p + dash / 2)
    return out
  }, [from, to, dash, gap])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    items.forEach((p, i) => {
      const pos = axis === 'z' ? new THREE.Vector3(at, 0.013, p) : new THREE.Vector3(p, 0.013, at)
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
      const s = axis === 'z' ? new THREE.Vector3(width, dash, 1) : new THREE.Vector3(dash, width, 1)
      m.compose(pos, q, s)
      ref.current!.setMatrixAt(i, m)
    })
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [items, axis, at, dash, width])
  return <instancedMesh ref={ref} args={[planeGeo, mat(color, { rough: 0.7 }), items.length]} receiveShadow />
}

/**
 * Norwegian gangfelt: white bars parallel to the direction of travel.
 * `axis` = direction of the road. Crossing is centred at `at` along that axis.
 */
export function Zebra({ axis, at, from, to, depth = 3 }: { axis: 'z' | 'x'; at: number; from: number; to: number; depth?: number }) {
  const bars: number[] = []
  for (let p = Math.min(from, to) + 0.45; p < Math.max(from, to) - 0.2; p += 1.0) bars.push(p)
  return (
    <group>
      {bars.map((p, i) =>
        axis === 'z' ? (
          <Mark key={i} x={p} z={at} w={0.5} d={depth} y={0.014} />
        ) : (
          <Mark key={i} x={at} z={p} w={depth} d={0.5} y={0.014} />
        ),
      )}
    </group>
  )
}

/** Haitenner (vikelinje): white triangles across a lane pointing at the approaching driver. */
export function YieldTeeth({ x, z, width, rotation = 0, count }: { x: number; z: number; width: number; rotation?: number; count?: number }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.25, 0)
    s.lineTo(0.25, 0)
    s.lineTo(0, 0.55)
    s.closePath()
    return new THREE.ShapeGeometry(s)
  }, [])
  const n = count ?? Math.max(2, Math.floor(width / 0.7))
  const step = width / n
  return (
    <group position={[x, 0.014, z]} rotation-y={rotation}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} geometry={geo} material={mat(C.line, { rough: 0.7 })} rotation-x={-Math.PI / 2} position={[-width / 2 + step * (i + 0.5), 0, 0]} receiveShadow />
      ))}
    </group>
  )
}

/* ───────────── buildings ───────────── */

function gableGeometry(w: number, d: number, rise: number, overhang: number) {
  // prism along z, ridge along z
  const hw = w / 2 + overhang
  const hd = d / 2 + overhang
  const s = new THREE.Shape()
  s.moveTo(-hw, 0)
  s.lineTo(hw, 0)
  s.lineTo(0, rise)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: hd * 2, bevelEnabled: false })
  g.translate(0, 0, -hd)
  return g
}

export interface HouseProps {
  x: number
  z: number
  rot?: number
  w?: number
  d?: number
  h?: number
  color: string
  roof?: string
  trim?: string
  floors?: 1 | 2
}

/** Norwegian timber house: cladding, white trim, dark gable roof, chimney. */
export function House({ x, z, rot = 0, w = 8, d = 6.5, h, color, roof = '#2b2f33', trim = '#f4f1ea', floors = 2 }: HouseProps) {
  const H = h ?? (floors === 2 ? 5.6 : 3.2)
  const rise = w * 0.32
  const geo = useMemo(() => gableGeometry(w, d, rise, 0.35), [w, d, rise])
  const wall = useMemo(() => texMat(`clad-${color}`, () => claddingTexture(color), w / 2, H / 2), [color, w, H])
  const roofM = useMemo(() => texMat(`roof-${roof}`, () => roofTexture(roof), 3, 3, { rough: 0.8 }), [roof])
  const windows = useMemo(() => {
    const out: Array<{ p: [number, number, number]; r: number }> = []
    const perFloor = Math.max(2, Math.round(w / 2.8))
    for (let f = 0; f < floors; f++) {
      const y = 1.2 + f * 2.5
      for (let i = 0; i < perFloor; i++) {
        const px = -w / 2 + (w / perFloor) * (i + 0.5)
        out.push({ p: [px, y, d / 2 + 0.03], r: 0 })
        out.push({ p: [px, y, -d / 2 - 0.03], r: Math.PI })
      }
    }
    return out
  }, [w, d, floors])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={boxGeo} material={mat('#3a3631')} position-y={0.25} scale={[w + 0.1, 0.5, d + 0.1]} receiveShadow />
      <mesh geometry={boxGeo} material={wall} position-y={0.5 + H / 2} scale={[w, H, d]} castShadow receiveShadow />
      {/* gable roof (ridge along house depth) */}
      <mesh geometry={geo} material={roofM} position-y={0.5 + H} rotation-y={0} castShadow receiveShadow />
      {/* corner trims */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} geometry={boxGeo} material={mat(trim)} position={[(sx * w) / 2, 0.5 + H / 2, (sz * d) / 2]} scale={[0.16, H, 0.16]} />
        )),
      )}
      {windows.map((wi, i) => (
        <group key={i} position={wi.p} rotation-y={wi.r}>
          <mesh geometry={boxGeo} material={mat(trim)} scale={[1.15, 1.35, 0.06]} />
          <mesh geometry={boxGeo} material={mat('#3e4f5e', { rough: 0.25, metal: 0.2 })} position-z={0.02} scale={[0.92, 1.12, 0.06]} />
          <mesh geometry={boxGeo} material={mat(trim)} position-z={0.05} scale={[0.06, 1.12, 0.04]} />
        </group>
      ))}
      {/* door */}
      <mesh geometry={boxGeo} material={mat('#3b2a22')} position={[w * 0.28, 1.5, d / 2 + 0.04]} scale={[1, 2, 0.08]} />
      <mesh geometry={boxGeo} material={mat(trim)} position={[w * 0.28, 2.6, d / 2 + 0.25]} scale={[1.6, 0.08, 0.5]} />
      {/* chimney */}
      <mesh geometry={boxGeo} material={mat('#5a4a42')} position={[-w * 0.22, 0.5 + H + rise * 0.7, d * 0.15]} scale={[0.6, 1.6, 0.6]} castShadow />
    </group>
  )
}

export interface BlockProps {
  x: number
  z: number
  rot?: number
  w: number
  d: number
  floors: number
  color: string
  shop?: { text: string; bg: string; fg: string }
  seed?: number
}

/** City apartment block (bygård) with window facade and optional shop. */
export function Block({ x, z, rot = 0, w, d, floors, color, shop, seed = 1 }: BlockProps) {
  const fh = 3.1
  const H = floors * fh
  const front = useMemo(() => {
    const cols = Math.max(2, Math.round(w / 3))
    const t = facadeTexture(color, floors, cols, seed)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 })
  }, [color, floors, w, seed])
  const side = useMemo(() => {
    const cols = Math.max(2, Math.round(d / 3))
    const t = facadeTexture(color, floors, cols, seed + 7)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 })
  }, [color, floors, d, seed])
  const top = mat('#4a4c50')
  const mats = useMemo(() => [side, side, top, top, front, front], [side, top, front])
  const shopTex = useMemo(() => (shop ? shopSign(shop.text, shop.bg, shop.fg) : null), [shop])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={boxGeo} material={mats} position-y={H / 2} scale={[w, H, d]} castShadow receiveShadow />
      {/* parapet */}
      <mesh geometry={boxGeo} material={mat('#e7e2d8')} position-y={H + 0.25} scale={[w + 0.3, 0.5, d + 0.3]} castShadow />
      {shop && shopTex && (
        <group position={[0, 0, d / 2]}>
          <mesh geometry={boxGeo} material={mat(shop.bg)} position={[0, 3.0, 0.7]} scale={[w * 0.8, 0.12, 1.4]} castShadow />
          <mesh position={[0, 2.55, 0.06]}>
            <planeGeometry args={[Math.min(w * 0.6, 7), 0.8]} />
            <meshStandardMaterial map={shopTex} roughness={0.6} emissive="#ffffff" emissiveIntensity={0.08} emissiveMap={shopTex} />
          </mesh>
          <mesh geometry={boxGeo} material={mat('#f6d9a0', { emissive: '#f3c77a', ei: 0.35, rough: 0.3 })} position={[0, 1.15, 0.03]} scale={[w * 0.7, 1.8, 0.05]} />
        </group>
      )}
    </group>
  )
}

/* ───────────── vegetation ───────────── */

export interface TreeItem {
  x: number
  z: number
  s?: number
  type: 'birch' | 'spruce' | 'round'
}

const crownGeoRound = new THREE.IcosahedronGeometry(1, 1)
const coneGeo = new THREE.ConeGeometry(1, 1, 8)
// shared, stable materials (new materials in `args` would re-create the instanced meshes every render)
const crownMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true })
const birchCrownMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true })
const coneMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true })

/** Instanced trees: birch (white trunk), spruce (stacked cones), round deciduous. */
export function Trees({ items }: { items: TreeItem[] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const birchTrunkRef = useRef<THREE.InstancedMesh>(null)
  const crownRef = useRef<THREE.InstancedMesh>(null)
  const birchCrownRef = useRef<THREE.InstancedMesh>(null)
  const coneRef = useRef<THREE.InstancedMesh>(null)

  const counts = useMemo(() => {
    const birch = items.filter((t) => t.type === 'birch').length
    const spruce = items.filter((t) => t.type === 'spruce').length
    const round = items.filter((t) => t.type === 'round').length
    return { birch, spruce, round }
  }, [items])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    let it = 0
    let ib = 0
    let ic = 0
    let ibc = 0
    let icone = 0
    const color = new THREE.Color()
    items.forEach((t, idx) => {
      const s = t.s ?? 1
      const jitter = ((idx * 9301 + 49297) % 233280) / 233280
      if (t.type === 'spruce') {
        m.compose(new THREE.Vector3(t.x, 0.6 * s, t.z), q.identity(), new THREE.Vector3(0.22 * s, 1.2 * s, 0.22 * s))
        trunkRef.current!.setMatrixAt(it++, m)
        for (let k = 0; k < 3; k++) {
          const r = (2.0 - k * 0.55) * s
          const y = (1.6 + k * 1.55) * s
          e.set(0, jitter * 6 + k, 0)
          q.setFromEuler(e)
          m.compose(new THREE.Vector3(t.x, y + 1.0 * s, t.z), q, new THREE.Vector3(r, 2.6 * s, r))
          coneRef.current!.setMatrixAt(icone, m)
          color.setHSL(0.36 + jitter * 0.03, 0.32, 0.2 + k * 0.025)
          coneRef.current!.setColorAt(icone, color)
          icone++
        }
      } else if (t.type === 'birch') {
        m.compose(new THREE.Vector3(t.x, 2.2 * s, t.z), q.identity(), new THREE.Vector3(0.18 * s, 4.4 * s, 0.18 * s))
        birchTrunkRef.current!.setMatrixAt(ib++, m)
        for (let k = 0; k < 3; k++) {
          const ox = Math.sin(jitter * 10 + k * 2.1) * 0.7 * s
          const oz = Math.cos(jitter * 10 + k * 2.1) * 0.7 * s
          const r = (1.25 - k * 0.18) * s
          e.set(jitter, jitter * 4 + k, 0)
          q.setFromEuler(e)
          m.compose(new THREE.Vector3(t.x + ox, (4.2 + k * 0.7) * s, t.z + oz), q, new THREE.Vector3(r, r * 1.15, r))
          birchCrownRef.current!.setMatrixAt(ibc, m)
          color.setHSL(0.2 + jitter * 0.04, 0.42, 0.42 + k * 0.03)
          birchCrownRef.current!.setColorAt(ibc, color)
          ibc++
        }
      } else {
        m.compose(new THREE.Vector3(t.x, 1.2 * s, t.z), q.identity(), new THREE.Vector3(0.26 * s, 2.4 * s, 0.26 * s))
        trunkRef.current!.setMatrixAt(it++, m)
        e.set(jitter, jitter * 5, 0)
        q.setFromEuler(e)
        m.compose(new THREE.Vector3(t.x, 3.6 * s, t.z), q, new THREE.Vector3(2.0 * s, 1.9 * s, 2.0 * s))
        crownRef.current!.setMatrixAt(ic, m)
        color.setHSL(0.26 + jitter * 0.05, 0.38, 0.3)
        crownRef.current!.setColorAt(ic, color)
        ic++
      }
    })
    // hide any unused slots (count is at least 1 even for empty groups)
    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    const fill = (r: React.RefObject<THREE.InstancedMesh | null>, used: number) => {
      if (!r.current) return
      for (let i = used; i < r.current.count; i++) r.current.setMatrixAt(i, zero)
    }
    fill(trunkRef, it)
    fill(birchTrunkRef, ib)
    fill(crownRef, ic)
    fill(birchCrownRef, ibc)
    fill(coneRef, icone)
    for (const r of [trunkRef, birchTrunkRef, crownRef, birchCrownRef, coneRef]) {
      if (!r.current) continue
      r.current.instanceMatrix.needsUpdate = true
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true
      r.current.computeBoundingSphere()
    }
  }, [items])

  const trunkCount = counts.spruce + counts.round
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[cylGeo, mat('#4a3a2c'), Math.max(1, trunkCount)]} castShadow />
      <instancedMesh ref={birchTrunkRef} args={[cylGeo, mat('#e9e6dc'), Math.max(1, counts.birch)]} castShadow />
      <instancedMesh ref={crownRef} args={[crownGeoRound, crownMat, Math.max(1, counts.round)]} castShadow receiveShadow />
      <instancedMesh ref={birchCrownRef} args={[crownGeoRound, birchCrownMat, Math.max(1, counts.birch * 3)]} castShadow receiveShadow />
      <instancedMesh ref={coneRef} args={[coneGeo, coneMat, Math.max(1, counts.spruce * 3)]} castShadow receiveShadow />
    </group>
  )
}

export function Hedge({ x, z, w, d, h = 1.3, color = '#557346' }: { x: number; z: number; w: number; d: number; h?: number; color?: string }) {
  return <mesh geometry={boxGeo} material={mat(color)} position={[x, h / 2, z]} scale={[w, h, d]} castShadow receiveShadow />
}

/** White picket fence along x (axis 'x') or z. */
export function Fence({ x, z, length, axis = 'x', color = '#f1eee6' }: { x: number; z: number; length: number; axis?: 'x' | 'z'; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const n = Math.max(2, Math.floor(length / 0.22))
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let i = 0; i < n; i++) {
      const p = -length / 2 + (i + 0.5) * (length / n)
      const pos = axis === 'x' ? new THREE.Vector3(x + p, 0.5, z) : new THREE.Vector3(x, 0.5, z + p)
      m.compose(pos, q, new THREE.Vector3(axis === 'x' ? 0.09 : 0.04, 1.0, axis === 'x' ? 0.04 : 0.09))
      ref.current!.setMatrixAt(i, m)
    }
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [n, x, z, length, axis])
  return (
    <group>
      <instancedMesh ref={ref} args={[boxGeo, mat(color), n]} castShadow />
      <mesh geometry={boxGeo} material={mat(color)} position={[x, 0.7, z]} scale={axis === 'x' ? [length, 0.07, 0.05] : [0.05, 0.07, length]} />
      <mesh geometry={boxGeo} material={mat(color)} position={[x, 0.3, z]} scale={axis === 'x' ? [length, 0.07, 0.05] : [0.05, 0.07, length]} />
    </group>
  )
}

/* ───────────── street furniture ───────────── */

export function Lamp({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={cylGeo} material={mat('#5b6168', { rough: 0.5, metal: 0.4 })} position-y={3.5} scale={[0.12, 7, 0.12]} castShadow />
      <mesh geometry={boxGeo} material={mat('#5b6168', { rough: 0.5, metal: 0.4 })} position={[0, 6.95, 0.7]} scale={[0.1, 0.1, 1.5]} />
      <mesh geometry={boxGeo} material={mat('#3d4146')} position={[0, 6.88, 1.4]} scale={[0.36, 0.14, 0.7]} castShadow />
      <mesh geometry={boxGeo} material={mat('#fff6dc', { emissive: '#ffe7b0', ei: 0.6 })} position={[0, 6.8, 1.4]} scale={[0.28, 0.03, 0.6]} />
    </group>
  )
}

type SignKind = 'gangfelt' | 'vikeplikt' | 'fart30' | 'fart40' | 'buss'

/** Traffic sign on a pole. `rot` = direction the sign faces (towards the approaching driver). */
export function Sign({ x, z, rot = 0, kind, height = 2.3, size = 0.75 }: { x: number; z: number; rot?: number; kind: SignKind; height?: number; size?: number }) {
  const tex = useMemo(() => {
    switch (kind) {
      case 'gangfelt':
        return signGangfelt()
      case 'vikeplikt':
        return signVikeplikt()
      case 'fart30':
        return signFartsgrense(30)
      case 'fart40':
        return signFartsgrense(40)
      case 'buss':
        return signBuss()
    }
  }, [kind])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={cylGeo} material={mat('#8d949b', { rough: 0.4, metal: 0.6 })} position-y={height / 2} scale={[0.07, height, 0.07]} castShadow />
      <mesh position={[0, height, 0.05]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.5} roughness={0.5} side={THREE.FrontSide} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, height, 0.035]} rotation-y={Math.PI}>
        <planeGeometry args={[size * 0.96, size * 0.96]} />
        <meshStandardMaterial color="#9aa1a8" roughness={0.6} transparent alphaTest={0.5} alphaMap={tex} />
      </mesh>
    </group>
  )
}

export function StreetPlate({ x, z, rot = 0, name, height = 2.9 }: { x: number; z: number; rot?: number; name: string; height?: number }) {
  const tex = useMemo(() => streetPlate(name), [name])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={cylGeo} material={mat('#8d949b', { rough: 0.4, metal: 0.6 })} position-y={height / 2} scale={[0.07, height, 0.07]} />
      <mesh position={[0.55, height - 0.1, 0]}>
        <planeGeometry args={[1.1, 0.28]} />
        <meshStandardMaterial map={tex} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function BusShelter({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={boxGeo} material={mat('#2f3337', { rough: 0.4, metal: 0.5 })} position={[0, 2.5, 0]} scale={[4, 0.12, 1.6]} castShadow />
      {[-1.9, 1.9].map((px) => (
        <mesh key={px} geometry={boxGeo} material={mat('#2f3337', { rough: 0.4, metal: 0.5 })} position={[px, 1.25, -0.7]} scale={[0.08, 2.5, 0.08]} />
      ))}
      <mesh geometry={boxGeo} position={[0, 1.3, -0.72]} scale={[3.8, 2.2, 0.04]}>
        <meshStandardMaterial color="#cfe3ee" transparent opacity={0.28} roughness={0.1} metalness={0.1} />
      </mesh>
      <mesh geometry={boxGeo} material={mat('#8a6a4a')} position={[0, 0.5, -0.45]} scale={[2.4, 0.08, 0.4]} />
      <Sign x={2.4} z={0.3} kind="buss" height={2.6} size={0.6} />
    </group>
  )
}

export function Mailboxes({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={boxGeo} material={mat('#3b3f44')} position={[0, 0.5, 0]} scale={[1.4, 1, 0.08]} />
      {[-0.45, 0, 0.45].map((px, i) => (
        <mesh key={i} geometry={boxGeo} material={mat(['#b8352c', '#2f5d8a', '#e1b12c'][i])} position={[px, 1.15, 0]} scale={[0.36, 0.3, 0.44]} castShadow />
      ))}
    </group>
  )
}

export function Bench({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh geometry={boxGeo} material={mat('#7a5a3a')} position={[0, 0.45, 0]} scale={[1.6, 0.06, 0.45]} castShadow />
      <mesh geometry={boxGeo} material={mat('#7a5a3a')} position={[0, 0.8, -0.2]} scale={[1.6, 0.35, 0.05]} />
      <mesh geometry={boxGeo} material={mat('#333')} position={[0, 0.22, 0]} scale={[1.4, 0.44, 0.08]} />
    </group>
  )
}

/**
 * Distant mountain ridges — a jagged silhouette ring that gives the Nordic
 * horizon. Unlit vertex-coloured strip blended towards the fog colour.
 */
export function Mountains({ radius = 300, tint = '#8a9aa8', haze = '#dfe6ea' }: { radius?: number; tint?: string; haze?: string }) {
  const geo = useMemo(() => {
    const segs = 220
    const pos: number[] = []
    const col: number[] = []
    const idx: number[] = []
    const base = new THREE.Color(tint)
    const snow = new THREE.Color('#eef2f5')
    const hz = new THREE.Color(haze)
    const ridge = (x: number) => {
      const r = 1 - Math.abs(Math.sin(x))
      return r * r
    }
    const height = (a: number, layer: number) => {
      const p = layer * 1.9
      const n = ridge(a * 2.5 + p) * 0.55 + ridge(a * 5.3 + 1.3 + p) * 0.3 + ridge(a * 11.7 + 0.7 + p) * 0.15 + Math.sin(a * 23 + p) * 0.02
      return (layer === 0 ? 14 : 6) + n * (layer === 0 ? 58 : 30)
    }
    let v = 0
    for (let layer = 0; layer < 2; layer++) {
      const r = radius + layer * -70
      const dark = layer === 1 ? new THREE.Color('#5d6d5c') : base.clone()
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2
        const h = height(a, layer)
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        pos.push(x, -2, z, x, h, z)
        const bottom = dark.clone().lerp(hz, layer === 0 ? 0.6 : 0.45)
        const topC = layer === 0 && h > 48 ? snow.clone().lerp(hz, 0.25) : dark.clone().lerp(hz, layer === 0 ? 0.3 : 0.18)
        col.push(bottom.r, bottom.g, bottom.b, topC.r, topC.g, topC.b)
        if (i < segs) {
          const o = v + i * 2
          idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2)
        }
      }
      v += (segs + 1) * 2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    return g
  }, [radius, tint, haze])
  return (
    <mesh geometry={geo} renderOrder={-5}>
      <meshBasicMaterial vertexColors fog={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Forest band of spruces for backgrounds. */
export function forestBand(x0: number, x1: number, z0: number, z1: number, n: number, seed = 1): TreeItem[] {
  const out: TreeItem[] = []
  let s = seed
  const r = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  for (let i = 0; i < n; i++) {
    out.push({ x: x0 + r() * (x1 - x0), z: z0 + r() * (z1 - z0), s: 0.9 + r() * 0.8, type: r() < 0.75 ? 'spruce' : 'birch' })
  }
  return out
}

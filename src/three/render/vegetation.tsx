import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { loadTex, surface } from './materials'

/**
 * Card-based trees (SpeedTree-style, generated at load):
 *  - trunk + branches as tapered cylinders with bark PBR
 *  - foliage as alpha-tested leaf-cluster cards whose normals point away
 *    from the crown centre → soft volumetric shading instead of flat cards
 *  - a vertex-shader wind sway (cheap, per-instance phase)
 *  - instanced per variant, so a street full of trees costs a few draw calls
 */

export type TreeKind = 'oak' | 'birch' | 'spruce'

export interface TreeInstance {
  x: number
  z: number
  kind: TreeKind
  s?: number
  rot?: number
}

interface TreeGeo {
  wood: THREE.BufferGeometry
  leaves: THREE.BufferGeometry
  /** crossed silhouette cards (spruce) — gives the dense conifer mass at any distance */
  cards?: THREE.BufferGeometry
}

/** Procedural spruce silhouette (alpha): drooping branch tiers built from needle strokes. */
let spruceCardTex: THREE.CanvasTexture | null = null
function spruceCardTexture() {
  if (spruceCardTex) return spruceCardTex
  const W = 256
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const r = rng(77)
  const tiers = 26
  for (let t = 0; t < tiers; t++) {
    const k = t / (tiers - 1) // 0 top → 1 bottom
    const y0 = 8 + k * (H - 40)
    const half = 6 + k * (W / 2 - 10) * (0.88 + r() * 0.12)
    for (const side of [-1, 1]) {
      const n = 90 + Math.round(k * 160)
      for (let i = 0; i < n; i++) {
        const u = Math.pow(r(), 0.8) // along the branch
        const x = W / 2 + side * u * half
        const droop = u * u * (10 + k * 26)
        const y = y0 + droop + (r() - 0.5) * (6 + k * 10)
        const len = 4 + r() * 7
        const shade = 0.55 + r() * 0.45 - u * 0.15
        g.strokeStyle = `rgb(${Math.round(34 * shade + 8)},${Math.round(58 * shade + 12)},${Math.round(38 * shade + 8)})`
        g.lineWidth = 1 + r() * 1.4
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + side * len * 0.6, y + len * (0.4 + r() * 0.6))
        g.stroke()
      }
    }
  }
  spruceCardTex = new THREE.CanvasTexture(c)
  spruceCardTex.colorSpace = THREE.SRGBColorSpace
  spruceCardTex.wrapS = spruceCardTex.wrapT = THREE.ClampToEdgeWrapping
  spruceCardTex.anisotropy = 4
  return spruceCardTex
}

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 16807) % 2147483647
    return (s & 0xffffff) / 0x1000000
  }
}

function limb(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, seg = 6) {
  const len = from.distanceTo(to)
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true)
  g.translate(0, len / 2, 0)
  const dir = to.clone().sub(from).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  g.applyQuaternion(q)
  g.translate(from.x, from.y, from.z)
  // cylindrical UVs: u around, v along (metres)
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (r0 * 6.28) * 2, uv.getY(i) * len * 1.2)
  return g
}

/** A leaf card: quad of size s, centred at c, random orientation; normals = spherical from crown centre. */
function card(c: THREE.Vector3, s: number, crown: THREE.Vector3, rand: () => number, droop = 0) {
  const g = new THREE.PlaneGeometry(s, s)
  const e = new THREE.Euler(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI + droop)
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e))
  g.translate(c.x, c.y, c.z)
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    n.set(pos.getX(i) - crown.x, (pos.getY(i) - crown.y) * 1.3, pos.getZ(i) - crown.z).normalize()
    nor.setXYZ(i, n.x, n.y, n.z)
  }
  return g
}

function buildOak(seed: number): TreeGeo {
  const r = rng(seed)
  const wood: THREE.BufferGeometry[] = []
  const leaves: THREE.BufferGeometry[] = []
  const H = 3.2 + r() * 1.4
  const base = new THREE.Vector3(0, 0, 0)
  const top = new THREE.Vector3((r() - 0.5) * 0.3, H, (r() - 0.5) * 0.3)
  wood.push(limb(base, top, 0.22, 0.12, 8))
  const crown = new THREE.Vector3(top.x, H + 1.4, top.z)
  const nB = 6 + Math.floor(r() * 3)
  for (let i = 0; i < nB; i++) {
    const a = (i / nB) * Math.PI * 2 + r() * 0.6
    const y0 = H * (0.6 + r() * 0.35)
    const from = new THREE.Vector3(top.x * (y0 / H), y0, top.z * (y0 / H))
    const L = 1.6 + r() * 1.4
    const to = new THREE.Vector3(from.x + Math.cos(a) * L, y0 + 0.9 + r() * 1.2, from.z + Math.sin(a) * L)
    wood.push(limb(from, to, 0.09, 0.035, 5))
    for (let k = 0; k < 7; k++) {
      const c = to.clone().add(new THREE.Vector3((r() - 0.5) * 1.5, (r() - 0.3) * 1.2, (r() - 0.5) * 1.5))
      leaves.push(card(c, 1.6 + r() * 0.9, crown, r))
    }
  }
  for (let k = 0; k < 14; k++) {
    const c = crown.clone().add(new THREE.Vector3((r() - 0.5) * 2.6, (r() - 0.4) * 2.0, (r() - 0.5) * 2.6))
    leaves.push(card(c, 1.8 + r(), crown, r))
  }
  return { wood: mergeGeometries(wood)!, leaves: mergeGeometries(leaves)! }
}

function buildBirch(seed: number): TreeGeo {
  const r = rng(seed + 100)
  const wood: THREE.BufferGeometry[] = []
  const leaves: THREE.BufferGeometry[] = []
  const H = 6 + r() * 2.5
  const lean = new THREE.Vector3((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6)
  const top = new THREE.Vector3(lean.x, H, lean.z)
  wood.push(limb(new THREE.Vector3(), top, 0.15, 0.05, 7))
  const crown = new THREE.Vector3(top.x, H * 0.72, top.z)
  for (let i = 0; i < 9; i++) {
    const t = 0.35 + (i / 9) * 0.6
    const a = r() * Math.PI * 2
    const from = new THREE.Vector3(lean.x * t, H * t, lean.z * t)
    const L = (1.0 + r() * 1.1) * (1.1 - t * 0.5)
    const to = new THREE.Vector3(from.x + Math.cos(a) * L, from.y + 0.5 + r() * 0.6, from.z + Math.sin(a) * L)
    wood.push(limb(from, to, 0.04, 0.015, 4))
    for (let k = 0; k < 5; k++) {
      const c = to.clone().add(new THREE.Vector3((r() - 0.5) * 1.1, (r() - 0.7) * 1.3, (r() - 0.5) * 1.1))
      leaves.push(card(c, 1.2 + r() * 0.6, crown, r, 0.3))
    }
  }
  return { wood: mergeGeometries(wood)!, leaves: mergeGeometries(leaves)! }
}

function buildSpruce(seed: number): TreeGeo {
  const r = rng(seed + 200)
  const H = 9 + r() * 5
  const wood = [limb(new THREE.Vector3(), new THREE.Vector3(0, H, 0), 0.25, 0.03, 7)]
  const leaves: THREE.BufferGeometry[] = []
  const layers = 12
  for (let l = 0; l < layers; l++) {
    const t = l / (layers - 1)
    const y = 1.2 + t * (H - 1.4)
    const rad = (1 - t) * (2.4 + r() * 0.4) + 0.25
    const n = Math.max(3, Math.round(7 * (1 - t)) + 3)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.5 + l
      // frond card: hangs outwards from the trunk, drooping
      const g = new THREE.PlaneGeometry(rad * 1.25, rad * 0.75)
      g.translate(rad * 0.55, -rad * 0.12, 0)
      g.rotateX(Math.PI / 2 + (r() - 0.5) * 0.5)
      g.rotateZ(-0.55 - r() * 0.35)
      g.rotateY(-a)
      g.translate(0, y, 0)
      const pos = g.attributes.position
      const nor = g.attributes.normal
      const v = new THREE.Vector3()
      for (let k = 0; k < pos.count; k++) {
        v.set(pos.getX(k), (pos.getY(k) - y) * 0.6 + 0.35, pos.getZ(k)).normalize()
        nor.setXYZ(k, v.x, v.y, v.z)
      }
      leaves.push(g)
    }
  }
  // 4 crossed silhouette cards = the dense conical mass (reads correctly from far away)
  const cards: THREE.BufferGeometry[] = []
  const cw = 2 * (2.4 + 0.25) * 1.05
  const ch = H - 0.6
  for (let i = 0; i < 4; i++) {
    const g = new THREE.PlaneGeometry(cw, ch)
    g.translate(0, 0.9 + ch / 2, 0)
    g.rotateY((i / 4) * Math.PI + r() * 0.2)
    const pos = g.attributes.position
    const nor = g.attributes.normal
    const v = new THREE.Vector3()
    for (let k = 0; k < pos.count; k++) {
      v.set(pos.getX(k), 0.55, pos.getZ(k)).normalize()
      nor.setXYZ(k, v.x, v.y, v.z)
    }
    cards.push(g)
  }
  return { wood: mergeGeometries(wood)!, leaves: mergeGeometries(leaves)!, cards: mergeGeometries(cards)! }
}

const geoCache = new Map<string, TreeGeo>()
function treeGeo(kind: TreeKind, variant: number): TreeGeo {
  const k = `${kind}:${variant}`
  let g = geoCache.get(k)
  if (!g) {
    g = kind === 'oak' ? buildOak(variant + 1) : kind === 'birch' ? buildBirch(variant + 1) : buildSpruce(variant + 1)
    geoCache.set(k, g)
  }
  return g
}

/* ───────────── materials with wind ───────────── */

const windUniform = { value: 0 }

function withWind(m: THREE.Material, strength: number) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = windUniform
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
        #else
          float ph = 0.0;
        #endif
        float hgt = max(position.y - 1.5, 0.0);
        float sway = sin(uWind * 1.3 + ph) * 0.5 + sin(uWind * 2.9 + ph * 1.7) * 0.25;
        transformed.x += sway * hgt * ${strength.toFixed(4)};
        transformed.z += cos(uWind * 1.1 + ph) * hgt * ${(strength * 0.6).toFixed(4)};`,
      )
  }
  m.customProgramCacheKey = () => `wind${strength}`
  return m
}

let mats: Record<string, THREE.Material> | null = null
function treeMaterials() {
  if (mats) return mats
  const leafTex = (file: string) => {
    const t = loadTex(file, true)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    return t
  }
  const leaf = (file: string, color: string) =>
    withWind(
      new THREE.MeshStandardMaterial({ map: leafTex(file), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.82, color, envMapIntensity: 0.7 }),
      0.012,
    )
  mats = {
    oakLeaves: leaf('foliage_cluster.png', '#c7d0a4'),
    birchLeaves: leaf('birch_cluster.png', '#d6dcab'),
    spruceLeaves: withWind(
      new THREE.MeshStandardMaterial({ map: leafTex('spruce_frond.png'), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9, color: '#a9b49a', envMapIntensity: 0.55 }),
      0.004,
    ),
    spruceCard: withWind(
      new THREE.MeshStandardMaterial({ map: spruceCardTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, color: '#d2dccb', envMapIntensity: 0.5 }),
      0.003,
    ),
    bark: surface('bark', { tile: 1.2 }),
    birchBark: new THREE.MeshStandardMaterial({ map: loadTex('birch_bark.jpg', true), roughness: 0.75 }),
  }
  return mats
}

/* ───────────── instanced forest ───────────── */

const VARIANTS = 3

export function Trees({ items, castShadow = true }: { items: TreeInstance[]; castShadow?: boolean }) {
  const m = treeMaterials()
  const groups = useMemo(() => {
    const out: Array<{ key: string; geo: TreeGeo; wood: THREE.Material; leaves: THREE.Material; cards: THREE.Material; list: TreeInstance[] }> = []
    for (const kind of ['oak', 'birch', 'spruce'] as TreeKind[]) {
      for (let v = 0; v < VARIANTS; v++) {
        const list = items.filter((t, i) => t.kind === kind && i % VARIANTS === v)
        if (!list.length) continue
        out.push({
          key: `${kind}${v}`,
          geo: treeGeo(kind, v),
          wood: kind === 'birch' ? m.birchBark : m.bark,
          leaves: kind === 'oak' ? m.oakLeaves : kind === 'birch' ? m.birchLeaves : m.spruceLeaves,
          cards: m.spruceCard,
          list,
        })
      }
    }
    return out
  }, [items, m])
  useFrame((_, dt) => {
    windUniform.value += Math.min(dt, 0.05)
  })
  return (
    <group>
      {groups.map(({ key, ...g }) => (
        <TreeBatch key={key} {...g} castShadow={castShadow} />
      ))}
    </group>
  )
}

function TreeBatch({ geo, wood, leaves, cards, list, castShadow }: { geo: TreeGeo; wood: THREE.Material; leaves: THREE.Material; cards: THREE.Material; list: TreeInstance[]; castShadow: boolean }) {
  const a = useRef<THREE.InstancedMesh>(null)
  const b = useRef<THREE.InstancedMesh>(null)
  const c = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    list.forEach((t, i) => {
      const s = t.s ?? 1
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot ?? (t.x * 13.1 + t.z * 7.7) % 6.28)
      m4.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(s, s, s))
      a.current!.setMatrixAt(i, m4)
      b.current!.setMatrixAt(i, m4)
      c.current?.setMatrixAt(i, m4)
    })
    for (const r of [a, b, c]) {
      if (!r.current) continue
      r.current.instanceMatrix.needsUpdate = true
      r.current.computeBoundingSphere()
    }
  }, [list])
  return (
    <>
      <instancedMesh ref={a} args={[geo.wood, wood, list.length]} castShadow={castShadow} receiveShadow />
      <instancedMesh ref={b} args={[geo.leaves, leaves, list.length]} castShadow={castShadow} receiveShadow />
      {geo.cards && <instancedMesh ref={c} args={[geo.cards, cards, list.length]} castShadow={castShadow} receiveShadow />}
    </>
  )
}

/** Deterministic scatter helper for background forest belts. */
export function scatter(x0: number, x1: number, z0: number, z1: number, n: number, seed: number, mix: Partial<Record<TreeKind, number>> = { spruce: 0.7, birch: 0.3 }): TreeInstance[] {
  const r = rng(seed)
  const kinds = Object.entries(mix) as Array<[TreeKind, number]>
  const out: TreeInstance[] = []
  for (let i = 0; i < n; i++) {
    let p = r()
    let kind: TreeKind = kinds[0][0]
    for (const [k, w] of kinds) {
      if (p < w) {
        kind = k
        break
      }
      p -= w
    }
    out.push({ x: x0 + r() * (x1 - x0), z: z0 + r() * (z1 - z0), kind, s: 0.85 + r() * 0.5 })
  }
  return out
}

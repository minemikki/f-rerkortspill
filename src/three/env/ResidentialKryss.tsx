import { useMemo } from 'react'
import * as THREE from 'three'
import { KRYSS } from '../../scenarios/layouts'
import { MergeStatic, Sign, StreetPlate } from '../kit'
import { surface } from '../render/materials'
import type { QualitySettings } from '../render/quality'
import {
  Drain,
  ForestHills,
  Hedge,
  MailboxStand,
  Manhole,
  NorHouse,
  PicketFence,
  RoadWear,
  StreetLight,
  UtilityCabinet,
  WheelieBin,
  cornerGeo,
  curbArcGeo,
  curbGeo,
  groundPlane,
  withMacroVariation,
  worldBox,
  type HouseSpec,
} from '../render/streetkit'
import { Trees, scatter, type TreeInstance } from '../render/vegetation'

/**
 * VISUAL BENCHMARK — S1 "Uregulert kryss i boligfelt".
 *
 * A quiet Norwegian residential crossroads: 6 m roads without markings,
 * granite kerbs, paved sidewalks with rounded corners, timber houses in
 * gardens, hedges/picket fences, mailbox stands, street lights, spruce
 * belts and forested hills in the haze. All dimensions derive from
 * KRYSS so choreography and world agree.
 *
 * Gameplay-critical: the NE-corner hedge (x>0, z>0) hides traffic from
 * the right until the player is close — that is the lesson.
 */

const R = KRYSS.roadHalf // 3
const SW = 2.0 // sidewalk width
const CR = 4 // corner kerb radius
const CURB = 0.16
const H = 0.13 // kerb height

const NS = { from: -140, to: 75 } // north–south road extent (z)
const EW = 135 // east–west road half-length (x)

const COLORS = ['#8e2f25', '#e2c46d', '#f0ece2', '#e8dcb5', '#7d95a3', '#3f5c4d', '#cfc9bd', '#a54a33', '#d8b9a0', '#56616b']

let groundMat: THREE.MeshStandardMaterial | null = null
let asphaltMat: THREE.MeshStandardMaterial | null = null
function mats() {
  if (!groundMat) groundMat = withMacroVariation(surface('grass', { tile: 2.6, color: '#e2ead0' }).clone(), 0.02, 0.22, 'macro-grass')
  if (!asphaltMat) asphaltMat = withMacroVariation(surface('asphalt').clone(), 0.03, 0.16, 'macro-asphalt')
  return { ground: groundMat, asphalt: asphaltMat }
}

/** angle helper for kerb arcs */
function arcAngles(sx: number, sz: number) {
  const a0 = Math.atan2(0, -sx)
  let a1 = Math.atan2(-sz, 0)
  if (a1 - a0 > Math.PI) a1 -= Math.PI * 2
  if (a0 - a1 > Math.PI) a1 += Math.PI * 2
  return [a0, a1] as const
}

function useStatic() {
  return useMemo(() => {
    const { ground, asphalt } = mats()
    const pave = surface('pavement')
    const granite = surface('granite')
    const gravel = surface('gravel')
    const out: Array<{ g: THREE.BufferGeometry; m: THREE.Material; cast?: boolean }> = []

    // ground (slightly below roads)
    out.push({ g: groundPlane(0, -30, 760, 760, -0.02), m: ground, cast: false })
    // roads
    out.push({ g: groundPlane(0, (NS.from + NS.to) / 2, R * 2, NS.to - NS.from, 0), m: asphalt, cast: false })
    out.push({ g: groundPlane(-(EW + R) / 2, 0, EW - R, R * 2, 0), m: asphalt, cast: false })
    out.push({ g: groundPlane((EW + R) / 2, 0, EW - R, R * 2, 0), m: asphalt, cast: false })
    // asphalt in the corner fillets
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push({ g: groundPlane(sx * (R + CR / 2), sz * (R + CR / 2), CR, CR, 0.001), m: asphalt, cast: false })

    // sidewalks + kerbs on all four arms, both sides
    const s0 = R + CR // straight sidewalks start after the corner radius
    for (const sx of [-1, 1]) {
      // N–S arm (along z), side sx
      for (const [a, b] of [
        [s0, NS.to],
        [NS.from, -s0],
      ]) {
        const len = b - a
        out.push({ g: worldBox(sx * (R + SW / 2), H / 2, (a + b) / 2, SW, H, len), m: pave, cast: false })
        out.push({ g: curbGeo('z', sx * (R + CURB / 2), a, b, H + 0.01, CURB), m: granite, cast: false })
      }
    }
    for (const sz of [-1, 1]) {
      for (const [a, b] of [
        [s0, EW],
        [-EW, -s0],
      ]) {
        const len = b - a
        out.push({ g: worldBox((a + b) / 2, H / 2, sz * (R + SW / 2), len, H, SW), m: pave, cast: false })
        out.push({ g: curbGeo('x', sz * (R + CURB / 2), a, b, H + 0.01, CURB), m: granite, cast: false })
      }
    }
    // corners: rounded sidewalk + kerb arc
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        out.push({ g: cornerGeo(sx * R, sz * R, sx, sz, SW, CR, H), m: pave, cast: false })
        const [a0, a1] = arcAngles(sx, sz)
        out.push({ g: curbArcGeo(sx * (R + CR), sz * (R + CR), CR - CURB / 2, a0, a1, H + 0.01, CURB, 12), m: granite, cast: false })
      }

    // driveways (gravel) from sidewalk into each lot, beside the houses
    for (const d of driveways()) out.push({ g: groundPlane(d.x, d.z, d.w, d.d, 0.004), m: gravel, cast: false })
    return out
  }, [])
}

/* ───────────── lots ───────────── */

interface Lot {
  house: HouseSpec
  drive: { x: number; z: number; w: number; d: number }
  bin: { x: number; z: number; rot: number }
  mail: { x: number; z: number; rot: number } | null
  edge: 'hedge' | 'fence' | 'open'
  edgeLine: { x: number; z: number; len: number; axis: 'x' | 'z' }
}

const lotsCache: Lot[] = []
function lots(): Lot[] {
  if (lotsCache.length) return lotsCache
  let k = 0
  const pick = () => COLORS[(k++ * 7) % COLORS.length]
  const edgeOf = (i: number): Lot['edge'] => (['fence', 'hedge', 'open', 'fence', 'hedge'] as const)[i % 5]
  const out = R + SW // outer sidewalk edge (5)
  // houses along the N–S road
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const zs = sz > 0 ? [19, 36, 53] : [19, 36, 53, 70, 87, 104]
      zs.forEach((az, i) => {
        const z = sz * az
        const x = sx * 13.5
        const floors = (i + (sx > 0 ? 1 : 0)) % 3 === 0 ? 1 : 2
        lotsCache.push({
          house: { x, z, rot: sx > 0 ? -Math.PI / 2 : Math.PI / 2, w: 9 + (i % 2) * 1.2, d: 7.2, floors, color: pick(), roof: (i + sz) % 3 === 0 ? 'red' : 'dark', seed: i + 3, pitch: floors === 1 ? 30 : 34 },
          drive: { x: sx * (out + 6), z: z + sz * 7.2, w: 12, d: 3 },
          bin: { x: sx * (out + 1.2), z: z + sz * 9.4, rot: sx > 0 ? -Math.PI / 2 : Math.PI / 2 },
          mail: i % 2 === 0 ? { x: sx * (out + 0.45), z: z + sz * 5.4, rot: sx > 0 ? -Math.PI / 2 : Math.PI / 2 } : null,
          edge: edgeOf(i + (sx > 0 ? 2 : 0)),
          edgeLine: { x: sx * (out + 0.5), z: z - sz * 1.6, len: 11.5, axis: 'z' },
        })
      })
    }
  // houses along the E–W road
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      ;[25, 42, 59, 76].forEach((ax, i) => {
        const x = sx * ax
        const z = sz * 13.5
        const floors = (i + (sz > 0 ? 0 : 1)) % 2 === 0 ? 2 : 1
        lotsCache.push({
          house: { x, z, rot: sz > 0 ? Math.PI : 0, w: 9.5, d: 7, floors, color: pick(), roof: (i + sx) % 3 === 1 ? 'red' : 'dark', seed: i + 11, pitch: 32 },
          drive: { x: x + sx * 7.2, z: sz * (out + 6), w: 3, d: 12 },
          bin: { x: x + sx * 9.4, z: sz * (out + 1.2), rot: sz > 0 ? Math.PI : 0 },
          mail: null,
          edge: edgeOf(i + 1 + (sz > 0 ? 0 : 3)),
          edgeLine: { x: x - sx * 1.6, z: sz * (out + 0.5), len: 11.5, axis: 'x' },
        })
      })
    }
  // the NE corner lots are bordered by the sight-blocking hedges instead
  for (const l of lotsCache) if (l.house.x > 0 && l.house.z > 0 && (l.house.x === 13.5 ? l.house.z === 19 : l.house.x === 25)) l.edge = 'open'
  return lotsCache
}

function driveways() {
  return lots().map((l) => l.drive)
}

/** NE corner: sight-blocking hedge (gameplay critical), matching the old layout's coverage. */
const BLOCKING_HEDGES = [
  { x: R + SW + 0.75, z: 15, w: 1.3, d: 15, h: 1.6, seed: 2 },
  { x: 16, z: R + SW + 0.75, w: 17, d: 1.3, h: 1.6, seed: 5 },
]

export function ResidentialKryss({ quality }: { quality: QualitySettings }) {
  const statics = useStatic()
  const L = lots()
  const trees = useMemo<TreeInstance[]>(() => {
    const t: TreeInstance[] = []
    // garden trees (behind houses, and in front corners) — deterministic
    L.forEach((l, i) => {
      const { x, z } = l.house
      const alongNS = Math.abs(x) === 13.5
      const back = alongNS ? { x: x + Math.sign(x) * 9, z } : { x, z: z + Math.sign(z) * 9 }
      t.push({ x: back.x + ((i * 37) % 5) - 2, z: back.z + ((i * 53) % 5) - 2, kind: i % 3 === 0 ? 'birch' : i % 3 === 1 ? 'oak' : 'spruce', s: 0.85 + ((i * 13) % 7) * 0.06, rot: i })
      // keep the NE sight triangle clear of trunks/crowns (the hedge alone hides the car — that is the lesson)
      const inSightTriangle = (px: number, pz: number) => px > 0 && pz > 0 && px < 22 && pz < 22
      if (i % 2 === 0) {
        const front = alongNS ? { x: Math.sign(x) * 7.6, z: z - Math.sign(z) * 4.5 } : { x: x - Math.sign(x) * 4.5, z: Math.sign(z) * 7.6 }
        if (!inSightTriangle(front.x, front.z)) t.push({ x: front.x, z: front.z, kind: i % 4 === 0 ? 'birch' : 'oak', s: 0.7 + ((i * 7) % 5) * 0.06, rot: i * 2 })
      }
    })
    // the big birch in the NE garden, behind the hedge line (frames, but never hides, the side road)
    t.push({ x: 11, z: 24, kind: 'birch', s: 1.15, rot: 1 })
    t.push({ x: -9, z: -9.5, kind: 'oak', s: 1.05, rot: 3 })
    // spruce belts behind the rows + forest beyond
    const f = quality.foliage
    t.push(...scatter(26, 70, -150, 70, Math.round(60 * f), 11, { spruce: 0.75, birch: 0.25 }).filter((p) => Math.abs(p.z) > 24))
    t.push(...scatter(-70, -26, -150, 70, Math.round(60 * f), 23, { spruce: 0.75, birch: 0.25 }).filter((p) => Math.abs(p.z) > 24))
    t.push(...scatter(-140, 140, 26, 60, Math.round(50 * f), 37, { spruce: 0.6, birch: 0.25, oak: 0.15 }).filter((p) => Math.abs(p.x) > 90))
    t.push(...scatter(-140, 140, -60, -26, Math.round(50 * f), 41, { spruce: 0.6, birch: 0.25, oak: 0.15 }).filter((p) => Math.abs(p.x) > 90))
    t.push(...scatter(-150, 150, -230, -150, Math.round(110 * f), 53, { spruce: 0.85, birch: 0.15 }).filter((p) => Math.abs(p.x) > 8))
    t.push(...scatter(-160, -90, -150, 110, Math.round(70 * f), 61, { spruce: 0.85, birch: 0.15 }))
    t.push(...scatter(90, 160, -150, 110, Math.round(70 * f), 67, { spruce: 0.85, birch: 0.15 }))
    return t
  }, [L, quality.foliage])

  return (
    <group>
      <ForestHills inner={200} outer={640} />
      <MergeStatic>
        {statics.map((p, i) => (
          <mesh key={i} geometry={p.g} material={p.m} castShadow={p.cast ?? false} receiveShadow />
        ))}
        {L.map((l, i) => (
          <NorHouse key={`h${i}`} {...l.house} />
        ))}
        {L.map((l, i) =>
          l.edge === 'hedge' ? (
            <Hedge key={`e${i}`} x={l.edgeLine.x} z={l.edgeLine.z} w={l.edgeLine.axis === 'x' ? l.edgeLine.len : 0.9} d={l.edgeLine.axis === 'z' ? l.edgeLine.len : 0.9} h={1.15} seed={i} />
          ) : null,
        )}
        {L.map((l, i) => (l.edge === 'fence' ? <PicketFence key={`f${i}`} x={l.edgeLine.x} z={l.edgeLine.z} length={l.edgeLine.len} axis={l.edgeLine.axis} /> : null))}
        {BLOCKING_HEDGES.map((h, i) => (
          <Hedge key={`b${i}`} {...h} />
        ))}
        {L.map((l, i) => (i % 3 === 0 ? <WheelieBin key={`w${i}`} {...l.bin} color={i % 2 ? '#2d4a33' : '#3a3d41'} /> : null))}
        {L.map((l, i) => (l.mail ? <MailboxStand key={`m${i}`} {...l.mail} colors={i % 4 === 0 ? ['#b8352c', '#2a5b3c'] : ['#b8352c', '#c7a23a', '#2f4f73']} /> : null))}
        {/* street lights — west/east sidewalks near the kerb, clear of the walker line (x = -4.6) */}
        <StreetLight x={-R - 0.45} z={-11} rot={Math.PI / 2} />
        <StreetLight x={-R - 0.45} z={-44} rot={Math.PI / 2} />
        <StreetLight x={-R - 0.45} z={-78} rot={Math.PI / 2} />
        <StreetLight x={R + 0.45} z={52} rot={-Math.PI / 2} />
        <StreetLight x={24} z={R + 0.45} rot={Math.PI} />
        <StreetLight x={-30} z={-R - 0.45} rot={0} />
        <UtilityCabinet x={R + SW - 0.3} z={-9.5} rot={-Math.PI / 2} />
        <Drain x={R - 0.3} z={-8.5} />
        <Drain x={-R + 0.3} z={9} />
        <Drain x={R - 0.3} z={-40} />
        <Drain x={-9} z={R - 0.3} rot={Math.PI / 2} />
        <Drain x={9} z={-R + 0.3} rot={Math.PI / 2} />
        <Manhole x={0.6} z={-16} />
        <Manhole x={-0.8} z={24} />
        <Manhole x={18} z={0.7} />
      </MergeStatic>
      <RoadWear axis="z" at={0} from={NS.from} to={NS.to} width={R * 2} />
      <RoadWear axis="x" at={0} from={R} to={EW} width={R * 2} />
      <RoadWear axis="x" at={0} from={-EW} to={-R} width={R * 2} />
      <Trees items={trees} castShadow={quality.shadows} />
      {/* signage: 30-sone for the player's approach, street name at the corner */}
      <Sign x={R + 0.5} z={36} kind="fart30" />
      <StreetPlate x={-R - SW - 0.6} z={R + CR + 0.6} name="Bjørkeveien" />
    </group>
  )
}

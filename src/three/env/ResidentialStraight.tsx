import { useMemo } from 'react'
import { RETT } from '../../scenarios/layouts'
import { MergeStatic, Sign, StreetPlate } from '../kit'
import { ParkedBike } from '../render/characters'
import { surface } from '../render/materials'
import type { QualitySettings } from '../render/quality'
import { Drain, ForestHills, Hedge, MailboxStand, Manhole, NorHouse, PicketFence, RoadWear, StreetLight, UtilityCabinet, WheelieBin, groundPlane, type HouseSpec } from '../render/streetkit'
import { Trees, scatter, type TreeInstance } from '../render/vegetation'
import { Statics, groundStatic, roadStrip, sidewalkRun, type Static, roadEndForest } from './shared'

/**
 * S2 «Ballen» — a straight residential street (8 m, no markings, 30 zone)
 * with parked cars along the east kerb, sidewalks and gardens.
 *
 * Choreography constraints (from s2-ballen.ts):
 *  - the child and ball come out of the EAST garden at z ≈ −4, behind the
 *    parked van (x = 2.9) → an east driveway opens exactly there, so the
 *    child plausibly comes from a garden and stays hidden by the van
 *  - the ball rolls on to x ≈ −7.5 → a west driveway at the same z keeps
 *    its path clear of hedges
 *  - the walker uses the west sidewalk at x = −5.2 → furniture stays at
 *    the kerb (x ≈ −4.35) or on the garden side
 */

const R = RETT.roadHalf // 4
const S = RETT.sidewalk // 2.2
const Z = { from: -150, to: 70 }
const OUT = R + S // 6.2 garden edge
const COLORS = ['#e8dcb5', '#8e2f25', '#7d95a3', '#f0ece2', '#3f5c4d', '#e2c46d', '#cfc9bd', '#a54a33', '#d8b9a0', '#56616b']

interface Lot {
  house: HouseSpec
  drive: number // z of driveway centre
}

function lots(): Lot[] {
  const out: Lot[] = []
  let k = 0
  // east side (faces west, rot −π/2); driveway at z = −4 is the child's way out
  const east = [44, 26, 8, -14, -32, -50, -68, -86]
  const eastDrive = [36, 18, 0.5, -4, -40, -58, -76, -94]
  east.forEach((z, i) => {
    out.push({ house: { x: OUT + 9.5, z, rot: -Math.PI / 2, w: 9 + (i % 3) * 0.8, d: 7.2, floors: i % 3 === 1 ? 1 : 2, color: COLORS[k++ % COLORS.length], roof: i % 4 === 2 ? 'red' : 'dark', seed: i + 21 }, drive: eastDrive[i] })
  })
  const west = [38, 20, 2, -20, -38, -56, -74, -92]
  const westDrive = [30, 12, -4.6, -28, -46, -64, -82, -100]
  west.forEach((z, i) => {
    out.push({ house: { x: -OUT - 9.5, z, rot: Math.PI / 2, w: 9.5, d: 7, floors: i % 2 ? 2 : 1, color: COLORS[k++ % COLORS.length], roof: i % 3 === 0 ? 'red' : 'dark', seed: i + 41 }, drive: westDrive[i] })
  })
  return out
}

export function ResidentialStraight({ quality }: { quality: QualitySettings }) {
  const L = useMemo(lots, [])
  const statics = useMemo(() => {
    const out: Static[] = [groundStatic(), roadStrip('z', 0, Z.from, Z.to, R * 2)]
    for (const side of [-1, 1] as const) out.push(...sidewalkRun('z', side * R, side, Z.from, Z.to, S))
    // driveways (gravel / asphalt) from the sidewalk into each lot
    const gravel = surface('gravel')
    for (const l of L) {
      const side = Math.sign(l.house.x)
      out.push({ g: groundPlane(side * (OUT + 5.5), l.drive, 11, 3.2, 0.004), m: gravel, cast: false })
    }
    return out
  }, [L])

  // garden edges: hedge or picket fence segments, with gaps for driveways
  const edges = useMemo(() => {
    const out: Array<{ kind: 'hedge' | 'fence'; x: number; z: number; len: number }> = []
    for (const side of [-1, 1]) {
      const drives = L.filter((l) => Math.sign(l.house.x) === side)
        .map((l) => l.drive)
        .sort((a, b) => b - a)
      let top = Z.to - 4
      drives.forEach((dz, i) => {
        const a = dz + 2.2
        if (top - a > 2) out.push({ kind: (i + (side > 0 ? 1 : 0)) % 2 ? 'hedge' : 'fence', x: side * (OUT + 0.5), z: (top + a) / 2, len: top - a })
        top = dz - 2.2
      })
    }
    return out
  }, [L])

  const trees = useMemo<TreeInstance[]>(() => {
    const t: TreeInstance[] = []
    L.forEach((l, i) => {
      const side = Math.sign(l.house.x)
      t.push({ x: side * (OUT + 18 + (i % 3)), z: l.house.z + ((i * 7) % 5) - 2, kind: i % 3 === 0 ? 'spruce' : i % 3 === 1 ? 'birch' : 'oak', s: 0.9 + ((i * 13) % 5) * 0.07 })
      if (i % 2 === 0) t.push({ x: side * (OUT + 2.6), z: l.house.z - 5.5, kind: i % 4 === 0 ? 'birch' : 'oak', s: 0.75 })
    })
    const f = quality.foliage
    t.push(...scatter(28, 90, -160, 80, Math.round(90 * f), 71, { spruce: 0.75, birch: 0.25 }))
    t.push(...scatter(-90, -28, -160, 80, Math.round(90 * f), 73, { spruce: 0.75, birch: 0.25 }))
    t.push(...scatter(-120, 120, -230, -160, Math.round(80 * f), 77, { spruce: 0.85, birch: 0.15 }).filter((p) => Math.abs(p.x) > 10))
    t.push(...roadEndForest(Z.from, f, 79))
    return t
  }, [L, quality.foliage])

  return (
    <group>
      <ForestHills inner={200} outer={640} seed={5} />
      <MergeStatic>
        <Statics items={statics} />
        {L.map((l, i) => (
          <NorHouse key={i} {...l.house} />
        ))}
        {edges.map((e, i) => (e.kind === 'hedge' ? <Hedge key={i} x={e.x} z={e.z} w={0.9} d={e.len} h={1.1} seed={i + 3} /> : <PicketFence key={i} x={e.x} z={e.z} length={e.len} axis="z" />))}
        {L.map((l, i) => {
          const side = Math.sign(l.house.x)
          return i % 2 === 0 ? <WheelieBin key={`b${i}`} x={side * (OUT + 1.0)} z={l.drive + 2.6} rot={side > 0 ? -Math.PI / 2 : Math.PI / 2} color={i % 4 ? '#2d4a33' : '#3a3d41'} /> : null
        })}
        <MailboxStand x={OUT + 0.45} z={9.2} rot={-Math.PI / 2} />
        <MailboxStand x={-OUT - 0.45} z={-26} rot={Math.PI / 2} colors={['#b8352c', '#c7a23a']} />
        <StreetLight x={R + 0.45} z={30} rot={-Math.PI / 2} />
        <StreetLight x={-R - 0.35} z={2} rot={Math.PI / 2} />
        <StreetLight x={R + 0.45} z={-26} rot={-Math.PI / 2} />
        <StreetLight x={-R - 0.35} z={-54} rot={Math.PI / 2} />
        <UtilityCabinet x={OUT - 0.3} z={-20} rot={-Math.PI / 2} />
        <Drain x={R - 0.3} z={14} />
        <Drain x={-R + 0.3} z={-12} />
        <Drain x={R - 0.3} z={-44} />
        <Manhole x={-1.2} z={20} />
        <Manhole x={0.8} z={-30} />
      </MergeStatic>
      <ParkedBike x={-OUT - 1.4} z={11.2} rot={0.3} variant={1} />
      <ParkedBike x={OUT + 2.2} z={-41.8} rot={-0.2} variant={2} />
      <RoadWear axis="z" at={0} from={Z.from} to={Z.to} width={R * 2} />
      <Trees items={trees} castShadow={quality.shadows} />
      <Sign x={R + 0.5} z={48} kind="fart30" />
      <StreetPlate x={-OUT - 0.4} z={46} name="Lerkeveien" rot={Math.PI} />
    </group>
  )
}

import { useMemo } from 'react'
import { GANGFELT } from '../../scenarios/layouts'
import { MergeStatic, Sign } from '../kit'
import { Bench2, BikeRack, CityBlock, LitterBin, Planter, dashedMark, lineMark, markingMaterial, zebraMark, type BlockSpec } from '../render/citykit'
import { ParkedBike } from '../render/characters'
import { surface } from '../render/materials'
import type { QualitySettings } from '../render/quality'
import { Drain, ForestHills, Hedge, Manhole, NorHouse, RoadWear, StreetLight, groundPlane, worldBox } from '../render/streetkit'
import { Trees, scatter, type TreeInstance } from '../render/vegetation'
import { Statics, groundStatic, roadStrip, sidewalkRun, type Static, KERB_H } from './shared'

/**
 * S4 «Fotgjengeren» — small-town main street (7 m, centre line) with a
 * zebra crossing between a bakery and a pharmacy. The pedestrian waits on
 * the east kerb (x ≈ 5.4) and steps out at z = 0.2; a trailing car follows
 * the player. Lowered kerbs + tactile paving mark the crossing, 516
 * gangfelt signs stand at the crossing on both sides, and the centre line
 * becomes solid on the approach (no overtaking at the crossing).
 */

const R = GANGFELT.roadHalf // 3.5
const S = GANGFELT.sidewalk // 2.8
const H = GANGFELT.crossHalf // 1.5
const Z = { from: -150, to: 80 }
const OUT = R + S

export function CrossingStreet({ quality }: { quality: QualitySettings }) {
  const statics = useMemo(() => {
    const out: Static[] = [groundStatic(), roadStrip('z', 0, Z.from, Z.to, R * 2)]
    for (const side of [-1, 1] as const) out.push(...sidewalkRun('z', side * R, side, Z.from, Z.to, S))
    const white = markingMaterial('white')
    const yellow = markingMaterial('yellow')
    out.push({ g: zebraMark('z', 0, -R, R, H * 2), m: white, cast: false })
    out.push({ g: dashedMark('z', 0, H + 12, Z.to, 3, 3, 0.12), m: yellow, cast: false })
    out.push({ g: dashedMark('z', 0, Z.from, -H - 12, 3, 3, 0.12), m: yellow, cast: false })
    out.push({ g: lineMark('z', 0, H + 0.5, H + 12, 0.12), m: yellow, cast: false })
    out.push({ g: lineMark('z', 0, -H - 12, -H - 0.5, 0.12), m: yellow, cast: false })
    for (const s of [-1, 1]) out.push({ g: lineMark('z', s * (R - 0.25), Z.from, Z.to, 0.1), m: white, cast: false })
    // tactile paving pads at both kerbs (dark, ribbed), forecourts in front of the shops
    const tactile = surface('granite', { color: '#5f6062', tile: 0.6 })
    for (const s of [-1, 1]) out.push({ g: worldBox(s * (R + 0.6), KERB_H + 0.004, 0, 0.9, 0.01, H * 2 - 0.2), m: tactile, cast: false })
    const pave = surface('pavement', { color: '#b9b5ac' })
    out.push({ g: groundPlane(OUT + 3, 0, 6, 22, 0.006), m: pave, cast: false })
    out.push({ g: groundPlane(-OUT - 3, -4, 6, 22, 0.006), m: pave, cast: false })
    return out
  }, [])

  const blocks = useMemo<BlockSpec[]>(
    () => [
      { x: OUT + 13, z: 6, rot: -Math.PI / 2, w: 14, d: 12, floors: 2, color: '#e3d3a4', roof: 'hip', shop: { text: 'BAKERI', bg: '#2f3a33', fg: '#f3e2b8', awning: '#2f3a33' } },
      { x: OUT + 13, z: -10, rot: -Math.PI / 2, w: 12, d: 12, floors: 3, color: '#b65a44', brick: true },
      { x: -OUT - 13, z: -4, rot: Math.PI / 2, w: 14, d: 12, floors: 3, color: '#cfd5d2', roof: 'hip', shop: { text: 'APOTEK', bg: '#1f6f50', fg: '#ffffff' } },
      { x: -OUT - 13, z: 12, rot: Math.PI / 2, w: 12, d: 12, floors: 2, color: '#d8c7a0', shop: { text: 'KIOSK', bg: '#b8352c', fg: '#ffffff', awning: '#b8352c' } },
    ],
    [],
  )
  const houses = useMemo(
    () => [
      { x: -OUT - 10, z: 30, rot: Math.PI / 2, color: '#e2c46d', floors: 2 as const },
      { x: OUT + 10, z: 28, rot: -Math.PI / 2, color: '#f0ece2', floors: 2 as const },
      { x: -OUT - 10, z: 46, rot: Math.PI / 2, color: '#8e2f25', floors: 1 as const },
      { x: OUT + 10, z: 46, rot: -Math.PI / 2, color: '#7d95a3', floors: 2 as const },
      { x: OUT + 10, z: -30, rot: -Math.PI / 2, color: '#3f5c4d', floors: 2 as const },
      { x: -OUT - 10, z: -26, rot: Math.PI / 2, color: '#a54a33', floors: 2 as const },
      { x: -OUT - 10, z: -44, rot: Math.PI / 2, color: '#d8b9a0', floors: 1 as const },
      { x: OUT + 10, z: -48, rot: -Math.PI / 2, color: '#cfc9bd', floors: 2 as const },
    ],
    [],
  )
  const trees = useMemo<TreeInstance[]>(() => {
    const f = quality.foliage
    return [
      { x: OUT + 2, z: 18, kind: 'birch', s: 0.9 },
      { x: -OUT - 2, z: 24, kind: 'birch', s: 1.1 },
      { x: OUT + 2.5, z: -20, kind: 'oak', s: 0.9 },
      { x: -OUT - 2, z: -16, kind: 'birch' },
      { x: OUT + 2, z: 38, kind: 'oak', s: 1 },
      ...scatter(28, 90, -160, 80, Math.round(90 * f), 81, { spruce: 0.75, birch: 0.25 }),
      ...scatter(-90, -28, -160, 80, Math.round(90 * f), 83, { spruce: 0.75, birch: 0.25 }),
      ...scatter(-120, 120, -230, -160, Math.round(80 * f), 85, { spruce: 0.85, birch: 0.15 }).filter((p) => Math.abs(p.x) > 10),
    ]
  }, [quality.foliage])

  return (
    <group>
      <ForestHills inner={200} outer={640} seed={13} />
      <MergeStatic>
        <Statics items={statics} />
        {blocks.map((b, i) => (
          <CityBlock key={i} {...b} seed={i + 51} allSides />
        ))}
        {houses.map((h, i) => (
          <NorHouse key={i} {...h} seed={i + 61} />
        ))}
        <Hedge x={OUT + 0.6} z={30} w={0.9} d={14} h={1.1} seed={3} />
        <Hedge x={-OUT - 0.6} z={-34} w={0.9} d={14} h={1.1} seed={7} />
        <StreetLight x={R + 0.45} z={-H - 1.2} rot={-Math.PI / 2} />
        <StreetLight x={-R - 0.35} z={H + 1.2} rot={Math.PI / 2} />
        <StreetLight x={R + 0.45} z={30} rot={-Math.PI / 2} />
        <StreetLight x={-R - 0.35} z={-30} rot={Math.PI / 2} />
        <Drain x={R - 0.3} z={-6} />
        <Drain x={-R + 0.3} z={6} />
        <Manhole x={-1.6} z={16} />
      </MergeStatic>
      <Trees items={trees} castShadow={quality.shadows} />
      <Bench2 x={OUT + 4} z={-3.5} rot={-Math.PI / 2} />
      <Planter x={OUT + 1.2} z={7} />
      <Planter x={-OUT - 1.2} z={-9} />
      <LitterBin x={OUT - 0.4} z={-4.2} />
      <BikeRack x={-OUT - 1.5} z={5} rot={Math.PI / 2} n={3} />
      <ParkedBike x={-OUT - 1.4} z={4.2} rot={Math.PI / 2} variant={2} kick={0} />
      <RoadWear axis="z" at={0} from={Z.from} to={Z.to} width={R * 2} />
      {/* 516 Gangfelt at the crossing, on the right-hand side of each approach */}
      <Sign x={R + 0.55} z={H + 0.4} kind="gangfelt" />
      <Sign x={-R - 0.55} z={-H - 0.4} rot={Math.PI} kind="gangfelt" />
      <Sign x={R + 0.6} z={56} kind="fart30" />
    </group>
  )
}

import { useMemo } from 'react'
import { BYGATE } from '../../scenarios/layouts'
import { MergeStatic, Sign, StreetPlate } from '../kit'
import { ParkedBike } from '../render/characters'
import { BikeRack, Bench2, Bollard, BusShelter2, CityBlock, LitterBin, Planter, TreeGrate, bikeLaneMaterial, dashedMark, lineMark, markingMaterial, yieldTeeth, type BlockSpec } from '../render/citykit'
import type { QualitySettings } from '../render/quality'
import { cornerGeo, curbArcGeo, Drain, ForestHills, groundPlane, Manhole, RoadWear, StreetLight, UtilityCabinet } from '../render/streetkit'
import { surface } from '../render/materials'
import { Trees, type TreeInstance } from '../render/vegetation'
import { Statics, envMats, roadStrip, sidewalkRun, type Static, KERB_H } from './shared'

/**
 * S3 «Se syklisten» — inner-city street with red bike lanes on both sides,
 * 4–5 storey apartment blocks with shops, and a side street to the right
 * (east, z ∈ [−4, 4]). The player turns right across the bike lane.
 *
 * The cyclist rides in the bike lane at x = 4.8, behind the player's right
 * shoulder: POSSIBLE to see in the mirror / shoulder check, easy to miss.
 * Nothing hides the cyclist unrealistically — no tall objects in the bike
 * lane or on the kerb line next to it.
 */

const RH = BYGATE.roadHalf // 5.6
const B = BYGATE.bike // 1.6
const SW = BYGATE.sidewalk // 3
const SH = BYGATE.sideHalf // 4
const CR = 3 // corner radius
const Z = { from: -150, to: 100 }
const SIDE_LEN = 90

export function CityStreet({ quality }: { quality: QualitySettings }) {
  const statics = useMemo(() => {
    const out: Static[] = []
    const { urbanPave } = envMats()
    out.push({ g: groundPlane(0, -30, 760, 760, -0.02), m: urbanPave, cast: false })
    out.push(roadStrip('z', 0, Z.from, Z.to, RH * 2))
    // side street to the east + corner asphalt
    out.push(roadStrip('x', 0, RH, RH + SIDE_LEN, SH * 2, 0.001))
    for (const sz of [-1, 1]) out.push({ g: groundPlane(RH + CR / 2, sz * (SH + CR / 2), CR, CR, 0.0015), m: envMats().asphalt, cast: false })
    // bike lanes (red surfacing) incl. across the side-street mouth
    const bike = bikeLaneMaterial()
    out.push({ g: groundPlane(-(RH - B / 2), (Z.from + Z.to) / 2, B, Z.to - Z.from, 0.004), m: bike, cast: false })
    out.push({ g: groundPlane(RH - B / 2, (Z.from + Z.to) / 2, B, Z.to - Z.from, 0.004), m: bike, cast: false })
    // sidewalks: west continuous; east split by the side street (with rounded corners)
    out.push(...sidewalkRun('z', -RH, -1, Z.from, Z.to, SW))
    out.push(...sidewalkRun('z', RH, 1, SH + CR, Z.to, SW))
    out.push(...sidewalkRun('z', RH, 1, Z.from, -SH - CR, SW))
    out.push(...sidewalkRun('x', SH, 1, RH + CR, RH + SIDE_LEN, SW))
    out.push(...sidewalkRun('x', -SH, -1, RH + CR, RH + SIDE_LEN, SW))
    const pave = surface('pavement')
    const granite = surface('granite')
    for (const sz of [-1, 1] as const) {
      out.push({ g: cornerGeo(RH, sz * SH, 1, sz, SW, CR, KERB_H), m: pave, cast: false })
      const a0 = Math.atan2(0, -1)
      let a1 = Math.atan2(-sz, 0)
      if (a1 - a0 > Math.PI) a1 -= Math.PI * 2
      if (a0 - a1 > Math.PI) a1 += Math.PI * 2
      out.push({ g: curbArcGeo(RH + CR, sz * (SH + CR), CR - 0.08, a0, a1, KERB_H + 0.01, 0.16, 10), m: granite, cast: false })
    }
    // markings
    const yellow = markingMaterial('yellow')
    const white = markingMaterial('white')
    out.push({ g: dashedMark('z', 0, Z.from, Z.to, 3, 6, 0.12), m: yellow, cast: false })
    for (const s of [-1, 1]) {
      // bike lane line (solid), dashed across the side-street mouth on the east side
      if (s < 0) out.push({ g: lineMark('z', -(RH - B), Z.from, Z.to, 0.2), m: white, cast: false })
      else {
        out.push({ g: lineMark('z', RH - B, SH + 0.5, Z.to, 0.2), m: white, cast: false })
        out.push({ g: lineMark('z', RH - B, Z.from, -SH - 0.5, 0.2), m: white, cast: false })
        out.push({ g: dashedMark('z', RH - B, -SH - 0.5, SH + 0.5, 0.6, 0.6, 0.2), m: white, cast: false })
      }
    }
    out.push({ g: dashedMark('x', 0, RH + 6, RH + SIDE_LEN, 3, 6, 0.12), m: yellow, cast: false })
    // side-street traffic gives way to the main street: haitenner across its exit lane (z ∈ [−4, 0], heading −x)
    out.push({ g: yieldTeeth(RH + 0.9, -SH / 2, SH - 0.3, Math.PI / 2), m: white, cast: false })
    return out
  }, [])

  const blocks = useMemo<BlockSpec[]>(() => {
    const d = 14
    const west: BlockSpec[] = ([
      { x: 0, z: 46, w: 16, d, floors: 5, color: '#d9c7a1', roof: 'hip' },
      { x: 0, z: 30, w: 15.5, d, floors: 4, color: '#b65a44', brick: true, shop: { text: 'BOKHANDEL', bg: '#1f2f45', fg: '#f3e2b8', awning: '#1f2f45' } },
      { x: 0, z: 14, w: 16, d, floors: 5, color: '#e6e0d2', shop: { text: 'BAKERI', bg: '#2f3a33', fg: '#f3e2b8', awning: '#2f3a33' }, balconies: true },
      { x: 0, z: -2, w: 15.5, d, floors: 4, color: '#8fa3a5', roof: 'hip' },
      { x: 0, z: -18, w: 16, d, floors: 5, color: '#cfa75a', shop: { text: 'KAFFE', bg: '#7b2d26', fg: '#f6efe2', awning: '#7b2d26' } },
      { x: 0, z: -34, w: 15.5, d, floors: 4, color: '#e3d8c3', balconies: true },
      { x: 0, z: -50, w: 16, d, floors: 5, color: '#a4573f', brick: true },
      { x: 0, z: -66, w: 16, d, floors: 4, color: '#d8d2c4', roof: 'hip' },
    ] as BlockSpec[]).map((b) => ({ ...b, x: -RH - SW - d / 2, rot: Math.PI / 2 }))
    const east: BlockSpec[] = ([
      { x: 0, z: 48, w: 15.5, d, floors: 4, color: '#e9dcc0', roof: 'hip' },
      { x: 0, z: 32, w: 16, d, floors: 5, color: '#7e9184', shop: { text: 'BLOMSTER', bg: '#f1ece1', fg: '#2f5a3a', awning: '#2f5a3a' } },
      { x: 0, z: 16, w: 15.5, d, floors: 4, color: '#c9b490', balconies: true },
      { x: 0, z: -16, w: 15.5, d, floors: 5, color: '#c9d0cd', shop: { text: 'APOTEK', bg: '#1f6f50', fg: '#ffffff' } },
      { x: 0, z: -32, w: 16, d, floors: 4, color: '#b04a3a', brick: true },
      { x: 0, z: -48, w: 15.5, d, floors: 5, color: '#d8d2c4', roof: 'hip' },
    ] as BlockSpec[]).map((b) => ({ ...b, x: RH + SW + d / 2, rot: -Math.PI / 2 }))
    // along the side street (face the side street)
    const side: BlockSpec[] = [
      { x: RH + SW + 24, z: SH + SW + 7, rot: Math.PI, w: 18, d, floors: 4, color: '#e1cfa8', roof: 'hip' },
      { x: RH + SW + 42, z: SH + SW + 7, rot: Math.PI, w: 16, d, floors: 5, color: '#9db0b8' },
      { x: RH + SW + 24, z: -SH - SW - 7, rot: 0, w: 18, d, floors: 5, color: '#c78a6a', brick: true, shop: { text: 'SYKKEL', bg: '#e8b923', fg: '#14171c' } },
      { x: RH + SW + 42, z: -SH - SW - 7, rot: 0, w: 16, d, floors: 4, color: '#cfc4ad' },
      // narrow corner buildings close to the junction
      { x: RH + SW + 7, z: SH + SW + 4.5, rot: -Math.PI / 2, w: 9, d: 9, floors: 4, color: '#d9cfb8', roof: 'hip' },
      { x: RH + SW + 7, z: -SH - SW - 4.5, rot: -Math.PI / 2, w: 9, d: 9, floors: 4, color: '#bfa38a' },
    ]
    // back rows (fill the skyline)
    const back: BlockSpec[] = []
    for (let z = 50; z > -80; z -= 18) {
      back.push({ x: -RH - SW - 30, z, rot: Math.PI / 2, w: 16, d: 12, floors: 6, color: ['#cbbfa9', '#a8a39a', '#d6c9b1'][Math.abs(z) % 3], roof: 'flat' })
      if (Math.abs(z) > 20) back.push({ x: RH + SW + 30, z, rot: -Math.PI / 2, w: 16, d: 12, floors: 6, color: ['#bcb3a3', '#d2c6ad', '#9fa6a8'][Math.abs(z) % 3], roof: 'flat' })
    }
    // continue both frontages to the end of the street so the vanishing point is city, not haze
    const tail: BlockSpec[] = []
    const cols = ['#d9cdb4', '#b9c3c4', '#e0c79a', '#c98f74', '#e6e1d6', '#a9b6a5']
    for (let z = -82, i = 0; z > -150; z -= 16, i++) {
      tail.push({ x: -RH - SW - d / 2, z, rot: Math.PI / 2, w: 15.5, d, floors: 4 + (i % 2), color: cols[i % cols.length], roof: i % 3 === 0 ? 'hip' : 'flat', brick: i % 4 === 3 })
      tail.push({ x: RH + SW + d / 2, z: z + 4, rot: -Math.PI / 2, w: 15.5, d, floors: 5 - (i % 2), color: cols[(i + 3) % cols.length], roof: i % 3 === 1 ? 'hip' : 'flat', brick: i % 4 === 1 })
    }
    for (let z = 64; z < 110; z += 16) {
      tail.push({ x: -RH - SW - d / 2, z, rot: Math.PI / 2, w: 15.5, d, floors: 4, color: cols[(z / 16) % cols.length | 0], roof: 'hip' })
      tail.push({ x: RH + SW + d / 2, z, rot: -Math.PI / 2, w: 15.5, d, floors: 4, color: cols[((z / 16) | 0) % cols.length] })
    }
    return [...west, ...east, ...side.map((b) => ({ ...b, allSides: true })), ...back, ...tail]
  }, [])

  const trees = useMemo<TreeInstance[]>(() => {
    // street trees in grates — kept out of the walkers' lines (x = ±7.1/7.4 near z ∈ [−10, 10])
    const t: TreeInstance[] = []
    for (const z of [38, 22, -26, -42, -58]) t.push({ x: -RH - SW + 0.9, z, kind: z % 4 === 0 ? 'birch' : 'oak', s: 0.75 })
    for (const z of [40, 24, -24, -40]) t.push({ x: RH + SW - 0.6, z, kind: 'oak', s: 0.72 })
    for (const x of [RH + 18, RH + 34]) t.push({ x, z: SH + SW - 0.6, kind: 'birch', s: 0.7 })
    return t
  }, [])

  return (
    <group>
      <ForestHills inner={230} outer={660} seed={9} />
      <MergeStatic>
        <Statics items={statics} />
        {blocks.map((b, i) => (
          <CityBlock key={i} {...b} seed={i + 1} />
        ))}
        <StreetLight x={RH + 0.45} z={14} rot={-Math.PI / 2} h={7} />
        <StreetLight x={-RH - 0.45} z={-6} rot={Math.PI / 2} h={7} />
        <StreetLight x={RH + 0.45} z={-30} rot={-Math.PI / 2} h={7} />
        <StreetLight x={-RH - 0.45} z={30} rot={Math.PI / 2} h={7} />
        <StreetLight x={RH + 20} z={SH + 0.45} rot={Math.PI} h={7} />
        <Drain x={RH - B - 0.3} z={20} />
        <Drain x={-RH + B + 0.3} z={-12} />
        <Manhole x={1.5} z={-20} />
        <Manhole x={-2.4} z={26} />
        <UtilityCabinet x={-RH - SW + 0.4} z={-12} rot={Math.PI / 2} />
        {[4.5, 6.3, 8.1].map((x) => (
          <Bollard key={x} x={RH + SW - 0.5 + x - 4.5} z={SH + 0.6} />
        ))}
      </MergeStatic>
      {trees.map((t, i) => (
        <TreeGrate key={i} x={t.x} z={t.z} />
      ))}
      <Trees items={trees} castShadow={quality.shadows} />
      <BusShelter2 x={-RH - SW + 0.9} z={18} rot={Math.PI / 2} />
      <Bench2 x={-RH - SW + 0.7} z={-28} rot={Math.PI / 2} />
      <LitterBin x={-RH - 0.6} z={12} />
      <Planter x={RH + SW - 0.6} z={8} w={1.4} />
      <BikeRack x={RH + SW - 0.6} z={-12} rot={Math.PI / 2} />
      <ParkedBike x={RH + SW - 0.55} z={-10.4} rot={Math.PI / 2 + 0.05} variant={3} kick={0} />
      <ParkedBike x={RH + SW - 0.55} z={-12.0} rot={Math.PI / 2 - 0.05} variant={1} kick={0} />
      <RoadWear axis="z" at={0} from={Z.from} to={Z.to} width={(RH - B) * 2} />
      <Sign x={RH + 0.6} z={34} kind="fart40" />
      <Sign x={RH + 1.2} z={-SH - 0.6} rot={Math.PI / 2} kind="vikeplikt" />
      <StreetPlate x={RH + 0.7} z={SH + 0.8} name="Kirkegata" />
    </group>
  )
}

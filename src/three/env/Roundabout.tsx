import { useMemo } from 'react'
import * as THREE from 'three'
import { RUND } from '../../scenarios/layouts'
import { MergeStatic, Sign } from '../kit'
import { ParkedBike } from '../render/characters'
import { Bench2, BikeRack, BusShelter2, CityBlock, LitterBin, Planter, dashedMark, discGeo, lineMark, markingMaterial, yieldTeeth, zebraMark, type BlockSpec } from '../render/citykit'
import { surface } from '../render/materials'
import type { QualitySettings } from '../render/quality'
import { boxUV } from '../render/uv'
import { ForestHills, groundPlane, Manhole, NorHouse, RoadWear, StreetLight, curbArcGeo, worldBox } from '../render/streetkit'
import { Trees, scatter, type TreeInstance } from '../render/vegetation'
import { Statics, envMats, groundStatic, roadStrip, sidewalkRun, type Static, KERB_H } from './shared'

/**
 * S5 «Rushtrafikk» (boss) — single-lane roundabout in a town centre: raised
 * island with birches, truck apron, splitter islands, give-way markings
 * and 202 signs on every entry, zebra crossings on the arms (the north one
 * further out behind the bus lay-by), a gang- og sykkelvei, and a ring of
 * apartment blocks and shops. Dimensions come from RUND.
 */

const g = RUND
const a = g.armHalf // 3.7
const SW = g.sidewalk // 2.6
const ARM = 110

/** annular strip between r0..r1 from angle a0..a1 (radians, in the x→z plane) at height y, metre UVs */
function arcStrip(r0: number, r1: number, a0: number, a1: number, y: number, seg = 24) {
  const pos: number[] = []
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + ((a1 - a0) * i) / seg
    const t1 = a0 + ((a1 - a0) * (i + 1)) / seg
    const p = (r: number, t: number) => [Math.cos(t) * r, y, Math.sin(t) * r]
    const A = p(r0, t0)
    const B = p(r1, t0)
    const C = p(r1, t1)
    const D = p(r0, t1)
    pos.push(...A, ...C, ...B, ...A, ...D, ...C)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  if (geo.attributes.normal.getY(0) < 0) {
    geo.scale(1, -1, 1)
    geo.translate(0, 2 * y, 0)
    geo.computeVertexNormals()
  }
  const uv = new Float32Array((pos.length / 3) * 2)
  for (let i = 0; i < pos.length / 3; i++) {
    uv[i * 2] = pos[i * 3]
    uv[i * 2 + 1] = pos[i * 3 + 2]
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}

function rotY(geo: THREE.BufferGeometry, r: number) {
  return r ? geo.applyMatrix4(new THREE.Matrix4().makeRotationY(r)) : geo
}

/** the four arms: rotation of the south-arm template (+z) */
const ARMS = [
  { key: 'S', rot: 0 },
  { key: 'E', rot: Math.PI / 2 },
  { key: 'N', rot: Math.PI },
  { key: 'W', rot: -Math.PI / 2 },
]

export function Roundabout({ quality }: { quality: QualitySettings }) {
  const statics = useMemo(() => {
    const out: Static[] = [groundStatic()]
    const { asphalt } = envMats()
    const white = markingMaterial('white')
    const yellow = markingMaterial('yellow')
    const pave = surface('pavement')
    const granite = surface('granite')
    // circulating carriageway + island + truck apron
    out.push({ g: discGeo(g.outerR + 0.4, 0.001), m: asphalt, cast: false })
    out.push({ g: boxUV(new THREE.CylinderGeometry(g.apronR, g.apronR, 0.06, 72).translate(0, 0.03, 0)), m: surface('pavement', { color: '#a9a49a', tile: 1.2 }), cast: false })
    out.push({ g: boxUV(new THREE.CylinderGeometry(g.islandR + 0.08, g.islandR + 0.08, 0.2, 72).translate(0, 0.1, 0)), m: granite, cast: false })
    out.push({ g: discGeo(g.islandR, 0.205, 72), m: envMats().ground, cast: false })
    // circle edge line between the arms + outer kerb arcs + corner pavements
    const edgeA = Math.asin((a + 0.05) / g.outerR)
    for (let q = 0; q < 4; q++) {
      const a0 = (q * Math.PI) / 2 + edgeA
      const a1 = ((q + 1) * Math.PI) / 2 - edgeA
      out.push({ g: arcStrip(g.outerR - 0.35, g.outerR - 0.22, a0, a1, 0.009), m: white, cast: false })
      out.push({ g: curbArcGeo(0, 0, g.outerR + 0.08, a0, a1, KERB_H + 0.01, 0.16, 18), m: granite, cast: false })
      out.push({ g: arcStrip(g.outerR + 0.16, g.outerR + 3.2, a0 - 0.03, a1 + 0.03, KERB_H, 28), m: pave, cast: false })
    }
    for (const arm of ARMS) {
      const r = arm.rot
      const add = (s: Static) => out.push({ ...s, g: rotY(s.g, r) })
      add(roadStrip('z', 0, g.outerR - 1.5, g.outerR + ARM, a * 2, 0.0005))
      add({ g: groundPlane(0, g.outerR + 1.2, a * 2 + 2.2, 4.4, 0.0008), m: asphalt, cast: false }) // entry flare
      const crossNear = arm.key === 'N' ? -g.northCross.far : g.crossNear
      const crossFar = arm.key === 'N' ? -g.northCross.near : g.crossFar
      // splitter island (raised, kerbed, grass top) with a gap for the crossing
      for (const [z0, z1] of [
        [g.outerR + 1.2, crossNear - 0.3],
        [crossFar + 0.3, crossFar + 4.5],
      ]) {
        if (z1 - z0 < 0.5) continue
        add({ g: worldBox(0, 0.09, (z0 + z1) / 2, g.splitterHalf * 2, 0.18, z1 - z0), m: granite, cast: true })
        add({ g: groundPlane(0, (z0 + z1) / 2, g.splitterHalf * 2 - 0.3, z1 - z0 - 0.3, 0.185), m: envMats().ground, cast: false })
      }
      // sidewalks (east side of the north arm is cut for the bus lay-by)
      const start = g.outerR + 1.0
      if (arm.key === 'N') {
        for (const sd of sidewalkRun('z', a, 1, start, g.outerR + ARM, SW)) add({ ...sd, g: sd.g.translate(0, 0.002, 0) })
        for (const sd of sidewalkRun('z', -a, -1, start, 28, SW)) add({ ...sd, g: sd.g.translate(0, 0.002, 0) })
        for (const sd of sidewalkRun('z', -a, -1, 48, g.outerR + ARM, SW)) add({ ...sd, g: sd.g.translate(0, 0.002, 0) })
      } else for (const side of [-1, 1] as const) for (const sd of sidewalkRun('z', side * a, side, start, g.outerR + ARM, SW)) add({ ...sd, g: sd.g.translate(0, 0.002, 0) })
      // markings
      add({ g: dashedMark('z', 0, crossFar + 5, g.outerR + ARM, 3, 6, 0.12), m: yellow, cast: false })
      for (const s of [-1, 1]) add({ g: lineMark('z', s * (a - 0.25), g.outerR + 3, g.outerR + ARM, 0.1), m: white, cast: false })
      add({ g: yieldTeeth((a + g.splitterHalf) / 2, g.yieldZ, a - g.splitterHalf - 0.2, 0), m: white, cast: false })
      add({ g: zebraMark('x', (crossNear + crossFar) / 2, -a, a, crossFar - crossNear), m: white, cast: false })
    }
    // bus lay-by on the north arm, east side (world coordinates)
    out.push({ g: groundPlane(a + 1.8, -38, 3.6, 20, 0.0012), m: asphalt, cast: false })
    out.push(...sidewalkRun('z', a + 3.6, 1, -48, -28, 2.6))
    out.push({ g: lineMark('z', a + 0.1, -48, -28, 0.12), m: white, cast: false })
    // gang- og sykkelvei west of the south arm
    out.push({ g: groundPlane(-9.6, 72, 2.6, 120, 0.003), m: asphalt, cast: false })
    out.push({ g: dashedMark('z', -9.6, 14, 130, 1, 1, 0.08), m: white, cast: false })
    return out
  }, [])

  const blocks = useMemo<BlockSpec[]>(
    () => [
      { x: 30, z: 30, rot: -Math.PI * 0.75, w: 26, d: 16, floors: 1, color: '#d8cbb0', shop: { text: 'DAGLIGVARE', bg: '#2a6e3f', fg: '#ffffff', awning: '#2a6e3f' } },
      { x: -34, z: -30, rot: Math.PI / 4, w: 18, d: 14, floors: 4, color: '#a65c45', brick: true, balconies: true },
      { x: 32, z: -34, rot: -Math.PI / 4, w: 18, d: 14, floors: 5, color: '#c9d0cd', roof: 'hip', shop: { text: 'KAFÉ', bg: '#7b2d26', fg: '#f6efe2', awning: '#7b2d26' } },
      { x: -40, z: -52, rot: Math.PI / 2, w: 16, d: 13, floors: 5, color: '#d6c9b1' },
      { x: 46, z: -56, rot: -Math.PI / 2, w: 16, d: 13, floors: 4, color: '#bcb3a3', balconies: true },
      { x: 52, z: 8, rot: -Math.PI / 2, w: 18, d: 14, floors: 4, color: '#e3d8c3', roof: 'hip' },
      { x: -54, z: 6, rot: Math.PI / 2, w: 18, d: 14, floors: 5, color: '#9fa6a8', shop: { text: 'APOTEK', bg: '#1f6f50', fg: '#ffffff' } },
      { x: 18, z: -64, rot: Math.PI, w: 14, d: 12, floors: 4, color: '#cfa75a', roof: 'hip' },
    ],
    [],
  )
  const houses = useMemo(
    () => [
      { x: -28, z: 30, rot: Math.PI / 4, color: '#8e2f25', floors: 2 as const },
      { x: -24, z: 50, rot: Math.PI / 2, color: '#e2c46d', floors: 2 as const },
      { x: 22, z: 54, rot: -Math.PI / 2, color: '#7d95a3', floors: 1 as const },
      { x: 24, z: 72, rot: -Math.PI / 2, color: '#f0ece2', floors: 2 as const },
      { x: -24, z: 72, rot: Math.PI / 2, color: '#3f5c4d', floors: 2 as const },
    ],
    [],
  )
  const trees = useMemo<TreeInstance[]>(() => {
    const f = quality.foliage
    return [
      { x: 0, z: 0, kind: 'birch', s: 1.25 },
      { x: 2.6, z: 1.8, kind: 'birch', s: 0.95 },
      { x: -2.4, z: -1.9, kind: 'birch', s: 1.05 },
      { x: -1.2, z: 2.9, kind: 'oak', s: 0.6 },
      { x: 17, z: 17, kind: 'oak' },
      { x: -17.5, z: -16.5, kind: 'oak', s: 1.1 },
      { x: 18, z: -17, kind: 'birch' },
      { x: -18, z: 17, kind: 'birch' },
      { x: -14, z: 46, kind: 'birch' },
      { x: 14, z: 62, kind: 'birch' },
      ...scatter(-150, 150, -220, -110, Math.round(90 * f), 91, { spruce: 0.85, birch: 0.15 }).filter((p) => Math.abs(p.x) > 10),
      ...scatter(-150, -70, -110, 130, Math.round(70 * f), 93, { spruce: 0.8, birch: 0.2 }).filter((p) => Math.abs(p.z) > 10),
      ...scatter(70, 150, -110, 130, Math.round(70 * f), 95, { spruce: 0.8, birch: 0.2 }).filter((p) => Math.abs(p.z) > 10),
    ]
  }, [quality.foliage])

  return (
    <group>
      <ForestHills inner={230} outer={660} seed={17} />
      <MergeStatic>
        <Statics items={statics} />
        {blocks.map((b, i) => (
          <CityBlock key={i} {...b} seed={i + 71} allSides />
        ))}
        {houses.map((h, i) => (
          <NorHouse key={i} {...h} seed={i + 81} />
        ))}
        <StreetLight x={a + 0.45} z={28} rot={-Math.PI / 2} h={7} />
        <StreetLight x={-a - 0.45} z={-30} rot={Math.PI / 2} h={7} />
        <StreetLight x={16} z={-a - 0.45} rot={Math.PI} h={7} />
        <StreetLight x={-16} z={a + 0.45} rot={0} h={7} />
        <StreetLight x={10.2} z={10.2} rot={-Math.PI * 0.75} h={7} />
        <StreetLight x={-10.2} z={-10.2} rot={Math.PI / 4} h={7} />
        <Manhole x={1.6} z={30} />
        <Manhole x={-8} z={-1.5} />
      </MergeStatic>
      {ARMS.map((arm) => (
        <group key={arm.key} rotation-y={arm.rot}>
          {/* 202 Vikeplikt: right-hand side and on the splitter island, facing entering traffic */}
          <Sign x={a + 0.7} z={g.yieldZ + 1.6} kind="vikeplikt" size={0.8} />
          <Sign x={0} z={g.outerR + 2.4} kind="vikeplikt" size={0.6} height={1.6} />
          {arm.key !== 'N' && <Sign x={a + 0.6} z={g.crossFar + 0.6} kind="gangfelt" />}
        </group>
      ))}
      <Sign x={-a - 0.6} z={-g.northCross.far - 0.6} rot={Math.PI} kind="gangfelt" />
      <Trees items={trees} castShadow={quality.shadows} />
      <BusShelter2 x={a + 4.6} z={-38} rot={-Math.PI / 2} />
      <Sign x={a + 3.9} z={-44.5} kind="buss" height={2.6} size={0.6} rot={-Math.PI / 2} />
      <Bench2 x={-a - 1.6} z={-22} rot={Math.PI / 2} />
      <LitterBin x={a + 0.7} z={-26} />
      <Planter x={14} z={14.6} />
      <Planter x={-14.6} z={-14} />
      <BikeRack x={24} z={20} rot={-Math.PI * 0.75} n={5} />
      <ParkedBike x={23.4} z={19.4} rot={-Math.PI * 0.75} variant={0} kick={0} />
      <RoadWear axis="z" at={0} from={g.outerR + 2} to={g.outerR + ARM} width={a * 2} />
      <Sign x={a + 0.6} z={58} kind="fart40" />
    </group>
  )
}

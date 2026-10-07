import { useMemo } from 'react'
import * as THREE from 'three'
import type { EnvironmentId } from '../engine/types'
import { BYGATE, GANGFELT, KRYSS, RETT, RUND } from '../scenarios/layouts'
import {
  Asphalt,
  Block,
  Bench,
  BusShelter,
  C,
  Dashed,
  Fence,
  Ground,
  Gravel,
  Hedge,
  House,
  Lamp,
  Mailboxes,
  Mark,
  Mountains,
  Sidewalk,
  Sign,
  StreetPlate,
  Trees,
  YieldTeeth,
  Zebra,
  forestBand,
  mat,
  type TreeItem,
} from './kit'
import { asphaltTexture, paverTexture } from './textures'

/**
 * Norwegian environments. Geometry comes from scenarios/layouts.ts so the
 * choreography and the world always agree.
 */

export function Environment({ id, haze }: { id: EnvironmentId; haze: string }) {
  return (
    <>
      <Mountains haze={haze} />
      <EnvBody id={id} />
    </>
  )
}

function EnvBody({ id }: { id: EnvironmentId }) {
  switch (id) {
    case 'boliggate-kryss':
    case 'hero':
      return <BoliggateKryss />
    case 'boliggate-rett':
      return <BoliggateRett />
    case 'bygate-sving':
      return <Bygate />
    case 'gangfelt':
      return <GangfeltEnv />
    case 'rundkjoring':
      return <Rundkjoring />
  }
}

const HOUSE_COLORS = ['#8e2b22', '#d9a441', '#ece7dc', '#e3d3a4', '#8ea3b0', '#3e5a4c', '#c9c5bb', '#a8432f']

/* ───────────── Nivå 1: uregulert kryss i boligfelt ───────────── */

function BoliggateKryss() {
  const R = KRYSS.roadHalf
  const trees = useMemo<TreeItem[]>(
    () => [
      { x: 9, z: 24, type: 'birch', s: 1.1 },
      { x: -9, z: 9, type: 'round' },
      { x: 9.5, z: -9, type: 'birch' },
      { x: -8, z: -10, type: 'birch', s: 0.9 },
      { x: 22, z: 9, type: 'round', s: 1.1 },
      { x: -22, z: -8, type: 'spruce' },
      { x: 7, z: 26, type: 'birch' },
      { x: -7.5, z: 34, type: 'round' },
      { x: 8, z: -30, type: 'spruce', s: 1.2 },
      { x: -8, z: -38, type: 'birch' },
      { x: 30, z: -9, type: 'birch' },
      { x: -30, z: 8, type: 'birch', s: 1.2 },
      ...forestBand(-90, 90, -140, -95, 70, 3),
      ...forestBand(-120, -60, -90, 80, 50, 5),
      ...forestBand(60, 120, -90, 80, 50, 9),
    ],
    [],
  )
  return (
    <group>
      <Ground />
      <Asphalt x={0} z={-25} w={R * 2} d={250} />
      <Asphalt x={0} z={0} w={300} d={R * 2} y={0.002} />
      {/* gravel shoulders */}
      <Gravel x={R + 0.5} z={-25} w={1} d={250} />
      <Gravel x={-R - 0.5} z={-25} w={1} d={250} />
      <Gravel x={0} z={R + 0.5} w={300} d={1} />
      <Gravel x={0} z={-R - 0.5} w={300} d={1} />
      {/* SE corner hedge — partly hides traffic from the right */}
      <Hedge x={13} z={5.2} w={16} d={1.2} h={1.45} />
      <Hedge x={5.2} z={13} w={1.2} d={14} h={1.45} />
      {/* fences */}
      <Fence x={-13} z={5} length={16} />
      <Fence x={-5} z={14} length={16} axis="z" />
      <Fence x={13} z={-5} length={16} />
      <Fence x={5} z={-14} length={16} axis="z" />
      <Fence x={-13} z={-5} length={16} />
      <Fence x={-5} z={-14} length={16} axis="z" />
      {/* houses */}
      <House x={23} z={17} rot={Math.PI} color={HOUSE_COLORS[0]} />
      <House x={-14} z={14} rot={Math.PI} color={HOUSE_COLORS[2]} floors={1} w={9} />
      <House x={14} z={-14} color={HOUSE_COLORS[1]} />
      <House x={-14} z={-15} color={HOUSE_COLORS[4]} />
      <House x={13} z={32} rot={-Math.PI / 2} color={HOUSE_COLORS[3]} floors={1} />
      <House x={-13} z={30} rot={Math.PI / 2} color={HOUSE_COLORS[5]} />
      <House x={13} z={-32} rot={-Math.PI / 2} color={HOUSE_COLORS[6]} />
      <House x={-13} z={-34} rot={Math.PI / 2} color={HOUSE_COLORS[7]} floors={1} />
      <House x={36} z={17} rot={Math.PI} color={HOUSE_COLORS[2]} />
      <House x={32} z={-14} color={HOUSE_COLORS[0]} floors={1} />
      <House x={-32} z={14} rot={Math.PI} color={HOUSE_COLORS[3]} />
      <House x={-32} z={-14} color={HOUSE_COLORS[5]} />
      <House x={13} z={50} rot={-Math.PI / 2} color={HOUSE_COLORS[4]} />
      <House x={-13} z={-52} rot={Math.PI / 2} color={HOUSE_COLORS[1]} />
      <House x={50} z={-14} color={HOUSE_COLORS[7]} />
      <House x={-50} z={14} rot={Math.PI} color={HOUSE_COLORS[6]} />
      <Trees items={trees} />
      <Mailboxes x={-4.5} z={26} rot={Math.PI / 2} />
      <Mailboxes x={-4.3} z={-20} rot={Math.PI / 2} />
      <Lamp x={-4.2} z={6} rot={Math.PI / 2} />
      <Lamp x={4.2} z={-26} rot={-Math.PI / 2} />
      <Lamp x={22} z={-4.2} rot={Math.PI} />
      <Sign x={4.4} z={38} kind="fart30" />
      <StreetPlate x={-4.2} z={4.2} name="Bjørkeveien" />
    </group>
  )
}

/* ───────────── Nivå 2: rett boliggate med parkerte biler ───────────── */

function BoliggateRett() {
  const R = RETT.roadHalf
  const S = RETT.sidewalk
  const trees = useMemo<TreeItem[]>(
    () => [
      ...[30, 14, -14, -32, -50].map((z, i) => ({ x: R + S + 1.6, z, type: (i % 2 ? 'birch' : 'round') as TreeItem['type'] })),
      ...[24, 4, -22, -42].map((z, i) => ({ x: -R - S - 1.6, z, type: (i % 2 ? 'round' : 'birch') as TreeItem['type'], s: 1.1 })),
      ...forestBand(-80, 80, -150, -110, 60, 2),
      ...forestBand(-90, -40, -100, 60, 40, 8),
      ...forestBand(40, 90, -100, 60, 40, 4),
    ],
    [R, S],
  )
  return (
    <group>
      <Ground />
      <Asphalt x={0} z={-30} w={R * 2} d={240} />
      <Sidewalk x={R + S / 2} z={-30} w={S} d={240} />
      <Sidewalk x={-R - S / 2} z={-30} w={S} d={240} />
      {/* side driveways */}
      <Asphalt x={R + S + 3} z={-6.5} w={6} d={3} y={0.003} />
      {/* fences & hedges behind sidewalks */}
      {[-60, -40, -20, 0, 20, 40].map((z) => (
        <group key={z}>
          <Fence x={R + S + 0.4} z={z + 7} length={12} axis="z" />
          <Hedge x={-R - S - 0.6} z={z + 3} w={0.9} d={11} h={1.2} />
        </group>
      ))}
      {[-48, -26, -4, 18, 40].map((z, i) => (
        <House key={z} x={R + S + 9} z={z} rot={-Math.PI / 2} color={HOUSE_COLORS[(i * 3) % 8]} floors={i % 2 ? 1 : 2} />
      ))}
      {[-38, -14, 8, 30].map((z, i) => (
        <House key={z} x={-R - S - 9} z={z} rot={Math.PI / 2} color={HOUSE_COLORS[(i * 3 + 1) % 8]} floors={i % 2 ? 2 : 1} />
      ))}
      <Trees items={trees} />
      <Lamp x={R + 0.4} z={22} rot={-Math.PI / 2} />
      <Lamp x={-R - 0.4} z={-12} rot={Math.PI / 2} />
      <Lamp x={R + 0.4} z={-40} rot={-Math.PI / 2} />
      <Sign x={R + 0.5} z={36} kind="fart30" />
      <Mailboxes x={R + S + 0.6} z={-8.5} rot={-Math.PI / 2} />
      <StreetPlate x={-R - 0.4} z={14} name="Lerkeveien" rot={Math.PI} />
    </group>
  )
}

/* ───────────── Nivå 3: bygate med sykkelfelt ───────────── */

function Bygate() {
  const RH = BYGATE.roadHalf
  const B = BYGATE.bike
  const SW = BYGATE.sidewalk
  const SH = BYGATE.sideHalf
  const bikeMat = useMemo(() => {
    const t = asphaltTexture().clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(0.3, 20)
    return new THREE.MeshStandardMaterial({ map: t, color: '#e8826a', roughness: 0.95 })
  }, [])
  const trees = useMemo<TreeItem[]>(
    () => [
      { x: -RH - 1.3, z: 18, type: 'round', s: 0.8 },
      { x: -RH - 1.3, z: -14, type: 'round', s: 0.8 },
      { x: RH + 1.3, z: 22, type: 'birch', s: 0.8 },
      { x: RH + 1.3, z: -20, type: 'birch', s: 0.8 },
    ],
    [RH],
  )
  return (
    <group>
      <Ground color="#d0d0c4" />
      <Asphalt x={0} z={-20} w={RH * 2} d={240} />
      {/* bike lanes (red) — left and right */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={bikeMat} rotation-x={-Math.PI / 2} position={[s * (RH - B / 2), 0.006, s > 0 ? 40 : -20]} scale={[B, s > 0 ? 72 : 200, 1]}>
            <planeGeometry />
          </mesh>
          <Mark x={s * (RH - B)} z={s > 0 ? 40 : -20} w={0.15} d={s > 0 ? 72 : 200} />
        </group>
      ))}
      {/* right bike lane continues north of the side street */}
      <mesh material={bikeMat} rotation-x={-Math.PI / 2} position={[RH - B / 2, 0.006, -64]} scale={[B, 120, 1]}>
        <planeGeometry />
      </mesh>
      <Mark x={RH - B} z={-64} w={0.15} d={120} />
      {/* dashed bike lane across the side street mouth */}
      <Dashed axis="z" at={RH - B} from={-SH} to={SH} dash={0.6} gap={0.6} width={0.15} />
      <mesh material={bikeMat} rotation-x={-Math.PI / 2} position={[RH - B / 2, 0.006, 0]} scale={[B, SH * 2, 1]}>
        <planeGeometry />
      </mesh>
      {/* yellow centre line */}
      <Dashed axis="z" at={0} from={-140} to={100} dash={3} gap={6} width={0.14} color={C.yellow} />
      {/* side street to the east */}
      <Asphalt x={RH + 40} z={0} w={80} d={SH * 2} y={0.002} />
      <Dashed axis="x" at={0} from={RH + 2} to={RH + 80} dash={3} gap={6} width={0.12} color={C.yellow} />
      {/* sidewalks */}
      <Sidewalk x={-RH - SW / 2} z={-20} w={SW} d={240} />
      <Sidewalk x={RH + SW / 2} z={(SH + 1 + 100) / 2} w={SW} d={100 - SH - 1} />
      <Sidewalk x={RH + SW / 2} z={(-SH - 1 - 140) / 2} w={SW} d={140 - SH - 1} />
      <Sidewalk x={RH + 40} z={SH + 1.5} w={80 - 2 * SW + 10} d={3} />
      <Sidewalk x={RH + 40} z={-SH - 1.5} w={80 - 2 * SW + 10} d={3} />
      {/* blocks west side */}
      {[
        { z: 38, w: 16, f: 5, c: '#d9c7a1' },
        { z: 22, w: 15, f: 4, c: '#b65a44' },
        { z: 6, w: 16, f: 5, c: '#e6e0d2', shop: { text: 'BAKERI', bg: '#2f3a33', fg: '#f3e2b8' } },
        { z: -10, w: 15, f: 4, c: '#8fa3a5' },
        { z: -26, w: 16, f: 5, c: '#cfa75a', shop: { text: 'KAFFE', bg: '#7b2d26', fg: '#f6efe2' } },
        { z: -42, w: 15, f: 4, c: '#e3d8c3' },
        { z: -58, w: 16, f: 5, c: '#a4573f' },
      ].map((b, i) => (
        <Block key={i} x={-RH - SW - 7.5} z={b.z} rot={Math.PI / 2} w={b.w} d={14} floors={b.f} color={b.c} shop={b.shop} seed={i + 1} />
      ))}
      {/* blocks east side (gap for the side street) */}
      {[
        { z: 40, w: 16, f: 4, c: '#e9dcc0' },
        { z: 24, w: 15, f: 5, c: '#7e9184', shop: { text: 'BLOMSTER', bg: '#f1ece1', fg: '#2f5a3a' } },
        { z: -24, w: 15, f: 5, c: '#c9b490' },
        { z: -40, w: 16, f: 4, c: '#b04a3a' },
        { z: -56, w: 15, f: 5, c: '#d8d2c4' },
      ].map((b, i) => (
        <Block key={i} x={RH + SW + 7.5} z={b.z} rot={-Math.PI / 2} w={b.w} d={14} floors={b.f} color={b.c} shop={b.shop} seed={i + 11} />
      ))}
      {/* corner blocks along side street */}
      <Block x={RH + SW + 24} z={SH + 3 + 7} w={18} d={14} floors={4} color="#e1cfa8" seed={31} />
      <Block x={RH + SW + 24} z={-SH - 3 - 7} rot={Math.PI} w={18} d={14} floors={5} color="#9db0b8" seed={33} />
      <Block x={RH + SW + 8} z={9.5} rot={-Math.PI / 2} w={6} d={8} floors={4} color="#cfc4ad" seed={35} />
      <Block x={RH + SW + 8} z={-9.5} rot={-Math.PI / 2} w={6} d={8} floors={4} color="#c78a6a" seed={37} />
      <Trees items={trees} />
      <BusShelter x={-RH - SW + 0.6} z={1} rot={Math.PI / 2} />
      <Lamp x={RH + 0.5} z={14} rot={-Math.PI / 2} />
      <Lamp x={-RH - 0.5} z={-6} rot={Math.PI / 2} />
      <Lamp x={RH + 0.5} z={-30} rot={-Math.PI / 2} />
      <Sign x={RH + 0.6} z={32} kind="fart40" />
      <StreetPlate x={RH + 0.7} z={SH + 0.8} name="Kirkegata" />
      <Bench x={-RH - SW + 0.7} z={14} rot={Math.PI / 2} />
    </group>
  )
}

/* ───────────── Nivå 4: gangfelt ───────────── */

function GangfeltEnv() {
  const R = GANGFELT.roadHalf
  const S = GANGFELT.sidewalk
  const H = GANGFELT.crossHalf
  const trees = useMemo<TreeItem[]>(
    () => [
      { x: R + S + 2, z: 14, type: 'birch' },
      { x: -R - S - 2, z: 22, type: 'birch', s: 1.15 },
      { x: R + S + 2.5, z: -18, type: 'round' },
      { x: -R - S - 2, z: -14, type: 'birch' },
      { x: R + S + 2, z: 40, type: 'round', s: 1.1 },
      ...forestBand(-90, 90, -150, -110, 60, 12),
      ...forestBand(-100, -45, -100, 80, 50, 14),
      ...forestBand(45, 100, -100, 80, 50, 16),
    ],
    [R, S],
  )
  return (
    <group>
      <Ground />
      <Asphalt x={0} z={-25} w={R * 2} d={250} />
      <Dashed axis="z" at={0} from={-140} to={-H - 4} dash={3} gap={6} width={0.14} color={C.yellow} />
      <Dashed axis="z" at={0} from={H + 4} to={100} dash={3} gap={6} width={0.14} color={C.yellow} />
      {/* solid centre line near the crossing */}
      <Mark x={0} z={H + 2} w={0.14} d={4} color={C.yellow} />
      <Mark x={0} z={-H - 2} w={0.14} d={4} color={C.yellow} />
      <Zebra axis="z" at={0} from={-R} to={R} depth={H * 2} />
      <Mark x={R - 0.2} z={-25} w={0.12} d={250} />
      <Mark x={-R + 0.2} z={-25} w={0.12} d={250} />
      <Sidewalk x={R + S / 2} z={-25} w={S} d={250} />
      <Sidewalk x={-R - S / 2} z={-25} w={S} d={250} />
      <Sign x={R + 0.55} z={H + 0.5} kind="gangfelt" />
      <Sign x={-R - 0.55} z={-H - 0.5} rot={Math.PI} kind="gangfelt" />
      <Block x={R + S + 8} z={6} rot={-Math.PI / 2} w={14} d={12} floors={2} color="#e3d3a4" shop={{ text: 'BAKERI', bg: '#2f3a33', fg: '#f3e2b8' }} seed={41} />
      <Block x={R + S + 8} z={-14} rot={-Math.PI / 2} w={12} d={12} floors={3} color="#b65a44" seed={42} />
      <Block x={-R - S - 8} z={-4} rot={Math.PI / 2} w={14} d={12} floors={3} color="#cfd5d2" shop={{ text: 'APOTEK', bg: '#1f6f50', fg: '#ffffff' }} seed={43} />
      <House x={-R - S - 9} z={22} rot={Math.PI / 2} color={HOUSE_COLORS[1]} />
      <House x={R + S + 9} z={28} rot={-Math.PI / 2} color={HOUSE_COLORS[2]} />
      <House x={-R - S - 9} z={40} rot={Math.PI / 2} color={HOUSE_COLORS[0]} floors={1} />
      <House x={R + S + 9} z={-34} rot={-Math.PI / 2} color={HOUSE_COLORS[4]} />
      <House x={-R - S - 9} z={-26} rot={Math.PI / 2} color={HOUSE_COLORS[5]} />
      <Trees items={trees} />
      <Lamp x={R + 0.5} z={-H - 1} rot={-Math.PI / 2} />
      <Lamp x={-R - 0.5} z={H + 1} rot={Math.PI / 2} />
      <Lamp x={R + 0.5} z={30} rot={-Math.PI / 2} />
      <Bench x={R + S - 0.4} z={-6} rot={-Math.PI / 2} />
      <Sign x={R + 0.6} z={46} kind="fart30" />
    </group>
  )
}

/* ───────────── Nivå 5: rundkjøring ───────────── */

function Rundkjoring() {
  const g = RUND
  const a = g.armHalf
  const asphaltDisc = useMemo(() => {
    const t = asphaltTexture().clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(3, 3)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })
  }, [])
  const apron = useMemo(() => {
    const t = paverTexture().clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(8, 1)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, color: '#c2b8a6' })
  }, [])
  const trees = useMemo<TreeItem[]>(
    () => [
      { x: 0, z: 0, type: 'birch', s: 1.2 },
      { x: 2.4, z: 1.6, type: 'birch', s: 0.9 },
      { x: -2.2, z: -1.8, type: 'birch', s: 1.0 },
      { x: 16, z: 16, type: 'round' },
      { x: -17, z: -16, type: 'round', s: 1.1 },
      { x: 18, z: -17, type: 'birch' },
      { x: -18, z: 17, type: 'birch' },
      { x: 24, z: 30, type: 'spruce' },
      { x: -26, z: 34, type: 'spruce', s: 1.2 },
      { x: -14, z: 46, type: 'birch' },
      { x: 14, z: 60, type: 'birch' },
      ...forestBand(-110, 110, -170, -120, 80, 21),
      ...forestBand(-130, -60, -110, 110, 60, 23),
      ...forestBand(60, 130, -110, 110, 60, 25),
    ],
    [],
  )
  const arms: Array<{ rot: number; key: string }> = [
    { rot: 0, key: 'S' },
    { rot: Math.PI / 2, key: 'E' },
    { rot: Math.PI, key: 'N' },
    { rot: -Math.PI / 2, key: 'W' },
  ]
  return (
    <group>
      <Ground />
      {/* circulating carriageway */}
      <mesh material={asphaltDisc} rotation-x={-Math.PI / 2} position-y={0.004} receiveShadow>
        <circleGeometry args={[g.outerR + 0.3, 64]} />
      </mesh>
      {/* apron ring + island */}
      <mesh material={apron} rotation-x={-Math.PI / 2} position-y={0.06} receiveShadow>
        <ringGeometry args={[g.islandR, g.apronR, 64]} />
      </mesh>
      <mesh position-y={0.18} receiveShadow castShadow material={mat('#bdb7aa')}>
        <cylinderGeometry args={[g.islandR, g.islandR, 0.36, 48]} />
      </mesh>
      <mesh position-y={0.37} rotation-x={-Math.PI / 2} receiveShadow material={mat('#6f8a4e')}>
        <circleGeometry args={[g.islandR - 0.2, 48]} />
      </mesh>
      {/* outer edge line */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} material={mat(C.line, { rough: 0.7 })}>
        <ringGeometry args={[g.outerR - 0.25, g.outerR - 0.1, 64]} />
      </mesh>
      {arms.map((arm) => (
        <group key={arm.key} rotation-y={arm.rot}>
          {/* arm carriageway (template = south arm, +z) */}
          <Asphalt x={0} z={g.outerR + 50} w={a * 2} d={100} />
          {/* flare into circle */}
          <Asphalt x={0} z={g.outerR + 0.5} w={a * 2 + 2} d={4} y={0.003} />
          {/* splitter island */}
          <mesh position={[0, 0.09, g.outerR + 6.2]} castShadow receiveShadow material={mat('#cfc9bc')}>
            <boxGeometry args={[g.splitterHalf * 2, 0.18, 10]} />
          </mesh>
          <mesh position={[0, 0.19, g.outerR + 6.2]} rotation-x={-Math.PI / 2} material={mat('#6f8a4e')}>
            <planeGeometry args={[g.splitterHalf * 2 - 0.3, 9.6]} />
          </mesh>
          {/* centre line beyond the island */}
          <Dashed axis="z" at={0} from={g.outerR + 12} to={g.outerR + 100} dash={3} gap={6} width={0.14} color={C.yellow} />
          {/* edge lines */}
          <Mark x={a - 0.2} z={g.outerR + 50} w={0.12} d={100} />
          <Mark x={-a + 0.2} z={g.outerR + 50} w={0.12} d={100} />
          {/* give-way teeth across the entry lane (right side, x > 0) */}
          <YieldTeeth x={(a + g.splitterHalf) / 2} z={g.yieldZ} width={a - g.splitterHalf} rotation={0} />
          {/* signs: vikeplikt on the right and on the splitter, facing traffic coming in (+z → facing +z) */}
          <Sign x={a + 0.7} z={g.yieldZ + 1.6} kind="vikeplikt" size={0.8} />
          <Sign x={0} z={g.outerR + 2.2} kind="vikeplikt" size={0.6} height={1.6} />
        </group>
      ))}
      {/* pedestrian crossings: S, E, W at standard distance; N further out by the bus stop */}
      {[0, Math.PI / 2, -Math.PI / 2].map((r) => (
        <group key={r} rotation-y={r}>
          <Zebra axis="x" at={(g.crossNear + g.crossFar) / 2} from={-a} to={a} depth={g.crossFar - g.crossNear} />
          <Sign x={a + 0.6} z={g.crossFar + 0.6} kind="gangfelt" />
          <Sign x={-a - 0.6} z={g.crossNear - 0.6} rot={Math.PI} kind="gangfelt" />
        </group>
      ))}
      <group rotation-y={Math.PI}>
        <Zebra axis="x" at={-(g.northCross.near + g.northCross.far) / 2} from={-a} to={a} depth={g.northCross.far - g.northCross.near} />
        <Sign x={-a - 0.6} z={-g.northCross.far - 0.6} rot={Math.PI} kind="gangfelt" />
        <Sign x={a + 0.6} z={-g.northCross.near + 0.6} kind="gangfelt" />
      </group>
      {/* sidewalks (world coordinates; north-east side is cut for the bus lay-by) */}
      {(() => {
        const sw = g.sidewalk
        const o = a + sw / 2
        const n0 = g.outerR + 3
        const far = n0 + 97
        return (
          <group>
            <Sidewalk x={o} z={(n0 + far) / 2} w={sw} d={far - n0} />
            <Sidewalk x={-o} z={(n0 + far) / 2} w={sw} d={far - n0} />
            <Sidewalk x={-o} z={-(n0 + far) / 2} w={sw} d={far - n0} />
            <Sidewalk x={o} z={(-n0 - 28) / 2} w={sw} d={28 - n0} />
            <Sidewalk x={o} z={(-48 - far) / 2} w={sw} d={far - 48} />
            <Sidewalk x={(a + sw + 9.9) / 2} z={-26} w={9.9 - a - sw} d={4} />
            <Sidewalk x={(n0 + far) / 2} z={o} w={far - n0} d={sw} />
            <Sidewalk x={(n0 + far) / 2} z={-o} w={far - n0} d={sw} />
            <Sidewalk x={-(n0 + far) / 2} z={o} w={far - n0} d={sw} />
            <Sidewalk x={-(n0 + far) / 2} z={-o} w={far - n0} d={sw} />
          </group>
        )
      })()}
      {/* bus lay-by on the north arm (east side) */}
      <Asphalt x={a + 1.8} z={-38} w={3.6} d={20} y={0.003} />
      <Sidewalk x={a + 3.6 + 1.3} z={-38} w={2.6} d={20} />
      <BusShelter x={a + 4.4} z={-38} rot={-Math.PI / 2} />
      {/* gang- og sykkelvei west of the south arm */}
      <Asphalt x={-9.6} z={70} w={2.4} d={120} y={0.003} />
      <Trees items={trees} />
      {/* surrounding buildings */}
      <Block x={30} z={30} rot={-Math.PI / 4} w={20} d={14} floors={3} color="#d8cbb0" shop={{ text: 'DAGLIGVARE', bg: '#2a6e3f', fg: '#ffffff' }} seed={51} />
      <Block x={-34} z={-30} rot={Math.PI / 4} w={18} d={14} floors={4} color="#a65c45" seed={52} />
      <Block x={32} z={-34} rot={(-3 * Math.PI) / 4} w={18} d={14} floors={5} color="#c9d0cd" seed={53} />
      <House x={-28} z={26} rot={Math.PI / 4} color={HOUSE_COLORS[0]} />
      <House x={-24} z={48} rot={Math.PI / 2} color={HOUSE_COLORS[3]} />
      <House x={22} z={52} rot={-Math.PI / 2} color={HOUSE_COLORS[4]} floors={1} />
      <Lamp x={a + 0.5} z={26} rot={-Math.PI / 2} />
      <Lamp x={-a - 0.5} z={-30} rot={Math.PI / 2} />
      <Lamp x={14} z={-a - 0.5} rot={Math.PI} />
      <Lamp x={-14} z={a + 0.5} />
      <Sign x={a + 0.6} z={56} kind="fart40" />
    </group>
  )
}

import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ActorView } from '../engine/sim'
import { Car } from '../three/models'
import { Atmosphere } from '../three/render/Atmosphere'
import { surface } from '../three/render/materials'
import { PostFX } from '../three/render/PostFX'
import { settingsFor } from '../three/render/quality'
import { MailboxStand, NorHouse, StreetLight, groundPlane } from '../three/render/streetkit'
import { Trees } from '../three/render/vegetation'

/**
 * DEV-ONLY asset lab (#/lab?view=…): renders benchmark assets in the
 * benchmark lighting for look-dev and asset review screenshots.
 * Views: car (3/4 front), rear, side, house, trees.
 */
const VIEWS: Record<string, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  car: { pos: [4.2, 1.6, 5.4], look: [0, 0.7, 0], fov: 38 },
  rear: { pos: [-3.2, 1.9, -6.2], look: [0, 0.8, 0], fov: 36 },
  side: { pos: [7.5, 1.2, 0.2], look: [0, 0.7, 0], fov: 34 },
  house: { pos: [14, 4, 18], look: [0, 3, -6], fov: 45 },
  trees: { pos: [0, 3, 22], look: [0, 5, -6], fov: 50 },
}

function Cam({ view }: { view: string }) {
  const { camera } = useThree()
  useEffect(() => {
    const v = VIEWS[view] ?? VIEWS.car
    const c = camera as THREE.PerspectiveCamera
    c.position.set(...v.pos)
    c.lookAt(...v.look)
    c.fov = v.fov
    c.updateProjectionMatrix()
  }, [camera, view])
  return null
}

export default function AssetLab() {
  const view = new URLSearchParams(location.hash.split('?')[1] ?? '').get('view') ?? 'car'
  const q = settingsFor('high')
  const focus = useRef(new THREE.Vector3())
  const still = useMemo<() => ActorView>(() => () => ({ x: 0, z: 0, h: 0, v: 0, a: 0, visible: true, indicator: null, pose: 'idle', face: null }) as ActorView, [])
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows="percentage" dpr={[1, 2]} gl={{ antialias: false }} camera={{ near: 0.1, far: 900 }} onCreated={({ gl }) => (gl.toneMapping = THREE.AgXToneMapping)}>
        <Atmosphere focus={focus} quality={q} />
        <mesh geometry={useMemo(() => groundPlane(0, 0, 60, 60, 0), [])} material={surface('asphalt')} receiveShadow />
        <mesh geometry={useMemo(() => groundPlane(0, -40, 200, 40, -0.01), [])} material={surface('grass')} receiveShadow />
        <group rotation-y={view === 'side' ? 0 : 0.35}>
          <Car get={still} color={view === 'rear' ? '#2f5d8a' : '#c9ccd0'} parked plate="EK 24816" />
        </group>
        <group position={[-4, 0, 2]}>
          <Car get={still} color="#8c2f2a" parked plate="BT 51203" />
        </group>
        <NorHouse x={0} z={-14} color="#8e2f25" />
        <NorHouse x={14} z={-14} color="#e8dcb5" floors={1} roof="red" />
        <StreetLight x={4} z={-4} rot={-Math.PI / 2} />
        <MailboxStand x={6} z={-3} />
        <Trees items={[{ x: -8, z: -8, kind: 'oak' }, { x: -3, z: -9, kind: 'birch' }, { x: 3, z: -9, kind: 'spruce' }, { x: 8, z: -8, kind: 'spruce', s: 1.2 }]} />
        <Cam view={view} />
        <PostFX quality={q} />
      </Canvas>
    </div>
  )
}

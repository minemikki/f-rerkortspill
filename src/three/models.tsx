import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ActorView } from '../engine/sim'
import { blobTexture } from './textures'
import { HATCH, busGeos, destinationTexture, hatchGeos, useHatchMaterials, vanGeos, type BodyType, type BoxVehicleGeos } from './render/vehicles'
import { CyclistModel, Human } from './render/characters'

/**
 * Road users. Each model is driven every frame by an ActorView (position,
 * heading, speed, accel, indicator, pose). Geometry/rigs live in render/.
 */

export type ViewGetter = () => ActorView

const sphere = new THREE.SphereGeometry(1, 16, 12)

/* ───────────── shadow blob ───────────── */

export function Blob({ w, d, opacity = 0.55 }: { w: number; d: number; opacity?: number }) {
  const m = useMemo(
    () => new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity, color: '#000' }),
    [opacity],
  )
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.02} renderOrder={1} material={m}>
      <planeGeometry args={[w, d]} />
    </mesh>
  )
}

/* ───────────── vehicles ───────────── */

interface VehicleParts {
  wheels: THREE.Object3D[]
  body: THREE.Object3D | null
  brake: THREE.MeshStandardMaterial
  indL: THREE.MeshStandardMaterial
  indR: THREE.MeshStandardMaterial
}

function useVehicleAnim(get: ViewGetter, parts: React.MutableRefObject<VehicleParts | null>, wheelR: number, parked?: boolean) {
  const spin = useRef(0)
  const pitch = useRef(0)
  const roll = useRef(0)
  const lastH = useRef<number | null>(null)
  useFrame((state, dt) => {
    const p = parts.current
    if (!p) return
    const v = get()
    spin.current += (v.v * Math.min(dt, 0.05)) / wheelR
    for (const w of p.wheels) w.rotation.x = spin.current
    // body pitch from accel (nose dives when braking), roll from yaw rate
    const targetPitch = THREE.MathUtils.clamp(v.a * 0.0075, -0.06, 0.04)
    pitch.current += (targetPitch - pitch.current) * Math.min(1, dt * 8)
    let yawRate = 0
    if (lastH.current !== null && dt > 0) {
      let d = v.h - lastH.current
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      yawRate = d / dt
    }
    lastH.current = v.h
    const targetRoll = THREE.MathUtils.clamp(-yawRate * v.v * 0.004, -0.04, 0.04)
    roll.current += (targetRoll - roll.current) * Math.min(1, dt * 6)
    if (p.body) {
      p.body.rotation.x = pitch.current
      p.body.rotation.z = roll.current
    }
    const braking = !parked && (v.a < -0.4 || v.v < 0.05)
    p.brake.emissiveIntensity = parked ? 0.02 : braking ? 2.6 : 0.4
    const t = state.clock.elapsedTime
    const on = Math.floor(t * 2.6) % 2 === 0
    const ind = v.indicator
    p.indL.emissiveIntensity = (ind === 'left' || ind === 'hazard') && on ? 6 : 0.05
    p.indR.emissiveIntensity = (ind === 'right' || ind === 'hazard') && on ? 6 : 0.05
  })
}

/** Compact hatchback (procedural, see render/vehicles.tsx). */
export function Car({ get, color, parked, plate = 'EK 24816', body = 'hatch' }: { get: ViewGetter; color: string; parked?: boolean; plate?: string; body?: BodyType }) {
  const parts = useRef<VehicleParts | null>(null)
  const g = hatchGeos(body)
  const m = useHatchMaterials(color, plate)
  const wheels = useRef<THREE.Object3D[]>([])
  const bodyRef = useRef<THREE.Group>(null)
  useVehicleAnim(get, parts, HATCH.wheelR, parked)
  const setWheel = (i: number) => (o: THREE.Object3D | null) => {
    if (o) wheels.current[i] = o
    parts.current = { wheels: wheels.current, body: bodyRef.current, brake: m.brake, indL: m.indL, indR: m.indR }
  }
  const tx = HATCH.track / 2
  return (
    <group>
      <Blob w={2.3} d={4.9} opacity={0.38} />
      <group ref={bodyRef}>
        <mesh geometry={g.body} material={m.paint} castShadow receiveShadow />
        <mesh geometry={g.glass} material={m.glass} />
        <mesh geometry={g.trim} material={m.trim} castShadow receiveShadow />
        <mesh geometry={g.chrome} material={m.chrome} />
        <mesh geometry={g.head} material={m.head} />
        <mesh geometry={g.brake} material={m.brake} />
        <mesh geometry={g.indL} material={m.indL} />
        <mesh geometry={g.indR} material={m.indR} />
        <mesh geometry={g.plates} material={m.plate} />
      </group>
      {[
        [tx, HATCH.frontAxle],
        [-tx, HATCH.frontAxle],
        [tx, HATCH.rearAxle],
        [-tx, HATCH.rearAxle],
      ].map(([x, z], i) => (
        <group key={i} position={[x, HATCH.wheelR, z]}>
          <group ref={setWheel(i)} scale={[x > 0 ? 1 : -1, 1, 1]}>
            <mesh geometry={g.tyre} material={m.tyre} castShadow />
            <mesh geometry={g.rim} material={m.rim} />
          </group>
        </group>
      ))}
    </group>
  )
}

/** Van / bus: same construction and materials as the hatchback (render/vehicles.tsx). */
function BoxVehicle({ g, get, color, parked, plate, sign }: { g: BoxVehicleGeos; get: ViewGetter; color: string; parked?: boolean; plate: string; sign?: boolean }) {
  const parts = useRef<VehicleParts | null>(null)
  const m = useHatchMaterials(color, plate)
  const hg = hatchGeos()
  const wheels = useRef<THREE.Object3D[]>([])
  const bodyRef = useRef<THREE.Group>(null)
  useVehicleAnim(get, parts, g.wheelR, parked)
  const setWheel = (i: number) => (o: THREE.Object3D | null) => {
    if (o) wheels.current[i] = o
    parts.current = { wheels: wheels.current, body: bodyRef.current, brake: m.brake, indL: m.indL, indR: m.indR }
  }
  const ws = g.wheelR / HATCH.wheelR
  const signMat = useMemo(() => (sign ? new THREE.MeshBasicMaterial({ map: destinationTexture(), toneMapped: false }) : null), [sign])
  const len = Math.max(...g.wheels.map(([, z]) => Math.abs(z))) * 2 + 2.2
  return (
    <group>
      <Blob w={2.6 * ws} d={len} opacity={0.38} />
      <group ref={bodyRef}>
        <mesh geometry={g.body} material={m.paint} castShadow receiveShadow />
        <mesh geometry={g.glass} material={m.glass} />
        <mesh geometry={g.trim} material={m.trim} castShadow receiveShadow />
        <mesh geometry={g.head} material={m.head} />
        <mesh geometry={g.brake} material={m.brake} />
        <mesh geometry={g.indL} material={m.indL} />
        <mesh geometry={g.indR} material={m.indR} />
        <mesh geometry={g.plates} material={m.plate} />
        {g.sign && signMat && <mesh geometry={g.sign} material={signMat} />}
      </group>
      {g.wheels.map(([x, z], i) => (
        <group key={i} position={[x, g.wheelR, z]}>
          <group ref={setWheel(i)} scale={[(x > 0 ? 1 : -1) * (0.9 + ws * 0.25), ws, ws]}>
            <mesh geometry={hg.tyre} material={m.tyre} castShadow />
            <mesh geometry={hg.rim} material={m.rim} />
          </group>
        </group>
      ))}
    </group>
  )
}

export function Van({ get, color, parked, plate = 'VB 70412' }: { get: ViewGetter; color: string; parked?: boolean; plate?: string }) {
  return <BoxVehicle g={vanGeos()} get={get} color={color} parked={parked} plate={plate} />
}

export function Bus({ get, color, plate = 'ZE 31031' }: { get: ViewGetter; color: string; plate?: string }) {
  return <BoxVehicle g={busGeos()} get={get} color={color} plate={plate} sign />
}

/* ───────────── people ───────────── */


/** Pedestrian (adult / child / jogger = variant 5) — skinned procedural character, see render/characters.tsx. */
export function Person({ get, variant = 0, child }: { get: ViewGetter; variant?: number; child?: boolean }) {
  return (
    <group>
      <Blob w={child ? 0.6 : 0.8} d={child ? 0.6 : 0.8} opacity={0.3} />
      <Human get={get} variant={variant} child={child} />
    </group>
  )
}

/* ───────────── cyclist ───────────── */

export function Cyclist({ get, variant = 0 }: { get: ViewGetter; variant?: number }) {
  return (
    <group>
      <Blob w={0.7} d={1.9} opacity={0.3} />
      <CyclistModel get={get} variant={variant} />
    </group>
  )
}

/* ───────────── ball ───────────── */

export function Ball({ get }: { get: ViewGetter }) {
  const ref = useRef<THREE.Mesh>(null)
  const bounce = useRef(0)
  const roll = useRef(0)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = '#f4f1ea'
    g.fillRect(0, 0, 128, 64)
    g.fillStyle = '#e8483b'
    for (let i = 0; i < 4; i++) g.fillRect(i * 32, 0, 16, 64)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useFrame((_, dt) => {
    const v = get()
    const d = Math.min(dt, 0.05)
    roll.current += (v.v * d) / 0.17
    bounce.current += d * 7
    if (ref.current) {
      ref.current.rotation.x = roll.current
      ref.current.position.y = 0.17 + Math.abs(Math.sin(bounce.current)) * Math.min(0.25, v.v * 0.06)
    }
  })
  return (
    <group>
      <Blob w={0.55} d={0.55} opacity={0.45} />
      <mesh ref={ref} geometry={sphere} scale={0.17} castShadow>
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
    </group>
  )
}

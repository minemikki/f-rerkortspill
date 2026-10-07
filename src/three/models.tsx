import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { ActorView } from '../engine/sim'
import { blobTexture } from './textures'
import { MergeStatic, mat } from './kit'

/**
 * Stylised low-poly actors. Each model is driven every frame by an
 * ActorView (position, heading, speed, accel, indicator, pose).
 */

export type ViewGetter = () => ActorView

const box = new THREE.BoxGeometry(1, 1, 1)
const sphere = new THREE.SphereGeometry(1, 16, 12)
const capsule = new THREE.CapsuleGeometry(1, 1, 4, 10)
const wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 18).rotateZ(Math.PI / 2)
const torusGeo = new THREE.TorusGeometry(1, 0.08, 6, 24)

const roundCache = new Map<string, THREE.BufferGeometry>()
function rounded(w: number, h: number, d: number, r: number) {
  const k = `${w}-${h}-${d}-${r}`
  let g = roundCache.get(k)
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, r)
    roundCache.set(k, g)
  }
  return g
}

const glass = new THREE.MeshStandardMaterial({ color: '#1b252e', roughness: 0.12, metalness: 0.55 })
const tyre = mat('#1c1d1f', { rough: 0.8 })
const rim = mat('#b9bec4', { rough: 0.3, metal: 0.8 })

function paint(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.35 })
}

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
    p.brake.emissiveIntensity = braking ? 2.6 : 0.5
    const t = state.clock.elapsedTime
    const on = Math.floor(t * 2.6) % 2 === 0
    const ind = v.indicator
    p.indL.emissiveIntensity = (ind === 'left' || ind === 'hazard') && on ? 6 : 0.05
    p.indR.emissiveIntensity = (ind === 'right' || ind === 'hazard') && on ? 6 : 0.05
  })
}

function lightMats() {
  return {
    brake: new THREE.MeshStandardMaterial({ color: '#5a0d0d', emissive: '#ff2a1a', emissiveIntensity: 0.5, roughness: 0.4 }),
    indL: new THREE.MeshStandardMaterial({ color: '#6a3a05', emissive: '#ffa526', emissiveIntensity: 0.05, roughness: 0.4 }),
    indR: new THREE.MeshStandardMaterial({ color: '#6a3a05', emissive: '#ffa526', emissiveIntensity: 0.05, roughness: 0.4 }),
    head: new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff4d0', emissiveIntensity: 0.9, roughness: 0.2 }),
  }
}

export function Car({ get, color, parked }: { get: ViewGetter; color: string; parked?: boolean }) {
  const parts = useRef<VehicleParts | null>(null)
  const lm = useMemo(lightMats, [])
  const body = useMemo(() => paint(color), [color])
  const wheels = useRef<THREE.Object3D[]>([])
  const bodyRef = useRef<THREE.Group>(null)
  useVehicleAnim(get, parts, 0.34, parked)
  const setWheel = (i: number) => (o: THREE.Object3D | null) => {
    if (o) wheels.current[i] = o
    parts.current = { wheels: wheels.current, body: bodyRef.current, brake: lm.brake, indL: lm.indL, indR: lm.indR }
  }
  const W = 1.82
  const L = 4.4
  return (
    <group>
      <Blob w={2.5} d={5.2} />
      <group ref={bodyRef} position-y={0.0}>
        <MergeStatic>
        <mesh geometry={rounded(W, 0.72, L, 0.2)} material={body} position-y={0.66} castShadow receiveShadow />
        {/* cabin glass + roof */}
        <mesh geometry={rounded(W - 0.18, 0.62, 2.35, 0.22)} material={glass} position={[0, 1.27, -0.25]} castShadow />
        <mesh geometry={rounded(W - 0.22, 0.1, 2.0, 0.05)} material={body} position={[0, 1.6, -0.3]} castShadow />
        {/* pillars */}
        <mesh geometry={box} material={body} position={[0, 1.27, -0.25]} scale={[W - 0.12, 0.5, 0.12]} />
        {/* bumpers / grille */}
        <mesh geometry={rounded(W - 0.1, 0.22, 0.2, 0.08)} material={mat('#2a2d31', { rough: 0.6 })} position={[0, 0.42, L / 2 - 0.02]} />
        <mesh geometry={rounded(W - 0.1, 0.22, 0.2, 0.08)} material={mat('#2a2d31', { rough: 0.6 })} position={[0, 0.42, -L / 2 + 0.02]} />
        {/* headlights */}
        {[-0.62, 0.62].map((x) => (
          <mesh key={x} geometry={box} material={lm.head} position={[x, 0.78, L / 2 - 0.02]} scale={[0.42, 0.12, 0.06]} />
        ))}
        {/* tail lights (brake) */}
        <mesh geometry={box} material={lm.brake} position={[0, 0.82, -L / 2 + 0.01]} scale={[W - 0.3, 0.1, 0.05]} />
        {/* indicators (front + rear corners). Left = +x when facing +z */}
        <mesh geometry={box} material={lm.indL} position={[W / 2 - 0.15, 0.78, L / 2 - 0.04]} scale={[0.28, 0.14, 0.08]} />
        <mesh geometry={box} material={lm.indL} position={[W / 2 - 0.15, 0.82, -L / 2 + 0.03]} scale={[0.3, 0.16, 0.08]} />
        <mesh geometry={box} material={lm.indL} position={[W / 2 + 0.02, 0.92, 1.05]} scale={[0.05, 0.09, 0.34]} />
        <mesh geometry={box} material={lm.indR} position={[-W / 2 + 0.15, 0.78, L / 2 - 0.04]} scale={[0.28, 0.14, 0.08]} />
        <mesh geometry={box} material={lm.indR} position={[-W / 2 + 0.15, 0.82, -L / 2 + 0.03]} scale={[0.3, 0.16, 0.08]} />
        <mesh geometry={box} material={lm.indR} position={[-W / 2 - 0.02, 0.92, 1.05]} scale={[0.05, 0.09, 0.34]} />
        {/* mirrors */}
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={box} material={body} position={[s * (W / 2 + 0.1), 1.08, 0.75]} scale={[0.2, 0.14, 0.12]} />
        ))}
        </MergeStatic>
      </group>
      {[
        [0.82, 1.38],
        [-0.82, 1.38],
        [0.82, -1.38],
        [-0.82, -1.38],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.34, z]} ref={setWheel(i)}>
          <mesh geometry={wheelGeo} material={tyre} scale={[0.24, 0.34, 0.34]} castShadow />
          <mesh geometry={wheelGeo} material={rim} scale={[0.25, 0.2, 0.2]} />
        </group>
      ))}
    </group>
  )
}

export function Van({ get, color, parked }: { get: ViewGetter; color: string; parked?: boolean }) {
  const parts = useRef<VehicleParts | null>(null)
  const lm = useMemo(lightMats, [])
  const body = useMemo(() => paint(color), [color])
  const wheels = useRef<THREE.Object3D[]>([])
  const bodyRef = useRef<THREE.Group>(null)
  useVehicleAnim(get, parts, 0.36, parked)
  const setWheel = (i: number) => (o: THREE.Object3D | null) => {
    if (o) wheels.current[i] = o
    parts.current = { wheels: wheels.current, body: bodyRef.current, brake: lm.brake, indL: lm.indL, indR: lm.indR }
  }
  const W = 2.02
  const L = 5.4
  return (
    <group>
      <Blob w={2.8} d={6.2} />
      <group ref={bodyRef}>
        <MergeStatic>
        <mesh geometry={rounded(W, 1.95, L - 0.9, 0.15)} material={body} position={[0, 1.4, -0.45]} castShadow receiveShadow />
        <mesh geometry={rounded(W, 1.0, 1.4, 0.2)} material={body} position={[0, 0.9, L / 2 - 0.75]} castShadow />
        <mesh geometry={rounded(W - 0.1, 0.8, 0.9, 0.12)} material={glass} position={[0, 1.65, L / 2 - 1.15]} rotation-x={-0.35} />
        <mesh geometry={box} material={glass} position={[W / 2 + 0.005, 1.75, 1.2]} scale={[0.02, 0.6, 0.9]} />
        <mesh geometry={box} material={glass} position={[-W / 2 - 0.005, 1.75, 1.2]} scale={[0.02, 0.6, 0.9]} />
        {/* side stripe */}
        <mesh geometry={box} material={mat('#c9a227')} position={[W / 2 + 0.01, 1.2, -0.6]} scale={[0.02, 0.18, 3.6]} />
        <mesh geometry={box} material={mat('#c9a227')} position={[-W / 2 - 0.01, 1.2, -0.6]} scale={[0.02, 0.18, 3.6]} />
        {[-0.68, 0.68].map((x) => (
          <mesh key={x} geometry={box} material={lm.head} position={[x, 0.85, L / 2 - 0.02]} scale={[0.4, 0.14, 0.06]} />
        ))}
        {[-0.8, 0.8].map((x) => (
          <mesh key={x} geometry={box} material={lm.brake} position={[x, 0.9, -L / 2 + 0.01]} scale={[0.22, 0.4, 0.05]} />
        ))}
        <mesh geometry={box} material={lm.indL} position={[W / 2 - 0.1, 1.2, -L / 2 + 0.01]} scale={[0.16, 0.14, 0.05]} />
        <mesh geometry={box} material={lm.indR} position={[-W / 2 + 0.1, 1.2, -L / 2 + 0.01]} scale={[0.16, 0.14, 0.05]} />
        <mesh geometry={box} material={lm.indL} position={[W / 2 - 0.12, 0.72, L / 2 - 0.02]} scale={[0.18, 0.1, 0.06]} />
        <mesh geometry={box} material={lm.indR} position={[-W / 2 + 0.12, 0.72, L / 2 - 0.02]} scale={[0.18, 0.1, 0.06]} />
        </MergeStatic>
      </group>
      {[
        [0.88, 1.7],
        [-0.88, 1.7],
        [0.88, -1.75],
        [-0.88, -1.75],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.36, z]} ref={setWheel(i)}>
          <mesh geometry={wheelGeo} material={tyre} scale={[0.26, 0.36, 0.36]} castShadow />
          <mesh geometry={wheelGeo} material={rim} scale={[0.27, 0.2, 0.2]} />
        </group>
      ))}
    </group>
  )
}

export function Bus({ get, color }: { get: ViewGetter; color: string }) {
  const parts = useRef<VehicleParts | null>(null)
  const lm = useMemo(lightMats, [])
  const body = useMemo(() => paint(color), [color])
  const wheels = useRef<THREE.Object3D[]>([])
  const bodyRef = useRef<THREE.Group>(null)
  useVehicleAnim(get, parts, 0.5)
  const setWheel = (i: number) => (o: THREE.Object3D | null) => {
    if (o) wheels.current[i] = o
    parts.current = { wheels: wheels.current, body: bodyRef.current, brake: lm.brake, indL: lm.indL, indR: lm.indR }
  }
  const W = 2.55
  const L = 12
  return (
    <group>
      <Blob w={3.4} d={13} />
      <group ref={bodyRef}>
        <MergeStatic>
        <mesh geometry={rounded(W, 2.75, L, 0.22)} material={body} position-y={1.75} castShadow receiveShadow />
        {/* window band */}
        <mesh geometry={box} material={glass} position={[0, 2.3, -0.3]} scale={[W + 0.02, 1.05, L - 2.2]} />
        <mesh geometry={box} material={glass} position={[0, 2.0, L / 2 - 0.02]} scale={[W - 0.3, 1.5, 0.06]} />
        <mesh geometry={box} material={mat('#f2efe8')} position={[0, 3.18, 0]} scale={[W - 0.2, 0.08, L - 0.6]} />
        {/* doors (right side = -x when facing +z) */}
        {[3.6, -0.6].map((z) => (
          <mesh key={z} geometry={box} material={glass} position={[-W / 2 - 0.01, 1.55, z]} scale={[0.03, 2.3, 1.2]} />
        ))}
        {[-0.85, 0.85].map((x) => (
          <mesh key={x} geometry={box} material={lm.head} position={[x, 0.75, L / 2 - 0.02]} scale={[0.36, 0.14, 0.06]} />
        ))}
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} geometry={box} material={lm.brake} position={[x, 0.95, -L / 2 + 0.01]} scale={[0.25, 0.45, 0.05]} />
        ))}
        <mesh geometry={box} material={lm.indL} position={[W / 2 - 0.12, 1.5, -L / 2 + 0.01]} scale={[0.2, 0.2, 0.05]} />
        <mesh geometry={box} material={lm.indR} position={[-W / 2 + 0.12, 1.5, -L / 2 + 0.01]} scale={[0.2, 0.2, 0.05]} />
        <mesh geometry={box} material={lm.indL} position={[W / 2 - 0.12, 0.75, L / 2 - 0.02]} scale={[0.2, 0.14, 0.05]} />
        <mesh geometry={box} material={lm.indR} position={[-W / 2 + 0.12, 0.75, L / 2 - 0.02]} scale={[0.2, 0.14, 0.05]} />
        </MergeStatic>
      </group>
      {[
        [1.08, 3.9],
        [-1.08, 3.9],
        [1.08, -3.4],
        [-1.08, -3.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.5, z]} ref={setWheel(i)}>
          <mesh geometry={wheelGeo} material={tyre} scale={[0.3, 0.5, 0.5]} castShadow />
          <mesh geometry={wheelGeo} material={rim} scale={[0.31, 0.26, 0.26]} />
        </group>
      ))}
    </group>
  )
}

/* ───────────── people ───────────── */

const OUTFITS = [
  { top: '#c4553b', bottom: '#2f3540', skin: '#e9c3a0', hair: '#3b2a20' }, // terracotta jacket
  { top: '#2f6f8f', bottom: '#2b2b2b', skin: '#c99a76', hair: '#151515' }, // teal
  { top: '#e2c044', bottom: '#3a4250', skin: '#f0cfb2', hair: '#c79a5a' }, // yellow
  { top: '#5a6b48', bottom: '#4a3f36', skin: '#8f6448', hair: '#1b1410' }, // olive
  { top: '#d9d4c7', bottom: '#30343a', skin: '#e6bf9c', hair: '#6b4a30' }, // beige
  { top: '#e8483b', bottom: '#1e2328', skin: '#d8ab86', hair: '#2a1d16' }, // sporty red (jogger)
]

export function Person({ get, variant = 0, child }: { get: ViewGetter; variant?: number; child?: boolean }) {
  const o = OUTFITS[variant % OUTFITS.length]
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const phase = useRef(variant * 1.7)
  const recoil = useRef(0)
  const childTop = child ? ['#ff7a3d', '#3db5ff', '#ffd23f'][variant % 3] : o.top
  useFrame((state, dt) => {
    const v = get()
    const d = Math.min(dt, 0.05)
    const t = state.clock.elapsedTime + variant
    const moving = v.v > 0.15
    const running = v.pose === 'run' || v.v > 2.2
    phase.current += v.v * d * (running ? 2.6 : 3.2)
    const ph = phase.current
    const amp = moving ? Math.min(0.9, 0.35 + v.v * 0.22) : 0
    let lL = Math.sin(ph) * amp
    let lR = -Math.sin(ph) * amp
    let aL = -Math.sin(ph) * amp * 0.9
    let aR = Math.sin(ph) * amp * 0.9
    let aRz = 0
    let aLz = 0
    let lean = running && moving ? 0.22 : moving ? 0.05 : 0
    let headPitch = 0
    let bob = moving ? Math.abs(Math.sin(ph)) * (running ? 0.08 : 0.035) : Math.sin(t * 1.6) * 0.006
    const pose = v.pose
    recoil.current += ((pose === 'recoil' ? 1 : 0) - recoil.current) * Math.min(1, d * 10)
    if (!moving) {
      if (pose === 'phone') {
        aR = -1.25
        aRz = 0.35
        headPitch = 0.45
      } else if (pose === 'wave') {
        aL = -2.6
        aLz = -0.25 + Math.sin(t * 9) * 0.35
      } else if (pose === 'look') {
        headPitch = -0.05
      }
    } else if (pose === 'wave') {
      aL = -2.5
      aLz = -0.25 + Math.sin(t * 9) * 0.35
    }
    const r = recoil.current
    if (r > 0.01) {
      lean = lean * (1 - r) - 0.32 * r
      aL = aL * (1 - r) - 1.9 * r
      aR = aR * (1 - r) - 1.9 * r
      aLz = 0.5 * r
      aRz = -0.5 * r
      bob += 0.04 * r
      lL *= 1 - r
      lR *= 1 - r
    }
    if (legL.current) legL.current.rotation.x = lL
    if (legR.current) legR.current.rotation.x = lR
    if (armL.current) {
      armL.current.rotation.x = aL
      armL.current.rotation.z = aLz
    }
    if (armR.current) {
      armR.current.rotation.x = aR
      armR.current.rotation.z = aRz
    }
    if (body.current) {
      body.current.rotation.x = lean
      body.current.position.y = bob
    }
    if (head.current) {
      head.current.rotation.x = headPitch
      // head turns towards face heading (relative to body)
      let rel = 0
      if (v.face !== null && root.current) {
        rel = v.face - root.current.rotation.y
        while (rel > Math.PI) rel -= Math.PI * 2
        while (rel < -Math.PI) rel += Math.PI * 2
        rel = THREE.MathUtils.clamp(rel, -1.1, 1.1)
      }
      head.current.rotation.y += (rel - head.current.rotation.y) * Math.min(1, d * 5)
    }
  })
  const s = child ? 0.62 : 1
  const top = useMemo(() => mat(childTop, { rough: 0.85 }), [childTop])
  const bottom = useMemo(() => mat(o.bottom, { rough: 0.9 }), [o.bottom])
  const skin = useMemo(() => mat(o.skin, { rough: 0.7 }), [o.skin])
  const hair = useMemo(() => mat(o.hair, { rough: 0.9 }), [o.hair])
  return (
    <group ref={root} scale={s}>
      <Blob w={0.9} d={0.9} opacity={0.4} />
      <group ref={body}>
        {/* legs pivot at hip (y=0.92) */}
        <group ref={legL} position={[0.11, 0.92, 0]}>
          <mesh geometry={capsule} material={bottom} position-y={-0.44} scale={[0.085, 0.36, 0.085]} castShadow />
          <mesh geometry={box} material={mat('#1d1f22')} position={[0, -0.88, 0.05]} scale={[0.12, 0.08, 0.24]} />
        </group>
        <group ref={legR} position={[-0.11, 0.92, 0]}>
          <mesh geometry={capsule} material={bottom} position-y={-0.44} scale={[0.085, 0.36, 0.085]} castShadow />
          <mesh geometry={box} material={mat('#1d1f22')} position={[0, -0.88, 0.05]} scale={[0.12, 0.08, 0.24]} />
        </group>
        {/* torso */}
        <mesh geometry={capsule} material={top} position-y={1.22} scale={[0.19, 0.3, 0.14]} castShadow />
        {/* arms pivot at shoulder */}
        <group ref={armL} position={[0.25, 1.45, 0]}>
          <mesh geometry={capsule} material={top} position-y={-0.28} scale={[0.065, 0.24, 0.065]} castShadow />
          <mesh geometry={sphere} material={skin} position-y={-0.58} scale={0.06} />
        </group>
        <group ref={armR} position={[-0.25, 1.45, 0]}>
          <mesh geometry={capsule} material={top} position-y={-0.28} scale={[0.065, 0.24, 0.065]} castShadow />
          <mesh geometry={sphere} material={skin} position-y={-0.58} scale={0.06} />
          {variant % 6 === 0 && !child && <mesh geometry={box} material={mat('#111')} position={[0, -0.62, 0.06]} scale={[0.07, 0.13, 0.02]} />}
        </group>
        <group ref={head} position-y={1.62}>
          <mesh geometry={sphere} material={skin} position-y={0.06} scale={[0.13, 0.15, 0.135]} castShadow />
          <mesh geometry={sphere} material={hair} position={[0, 0.12, -0.02]} scale={[0.14, 0.12, 0.14]} />
          {child && <mesh geometry={sphere} material={mat('#e8483b')} position={[0, 0.16, 0]} scale={[0.15, 0.09, 0.15]} />}
        </group>
      </group>
    </group>
  )
}

/* ───────────── cyclist ───────────── */

export function Cyclist({ get, variant = 0 }: { get: ViewGetter; variant?: number }) {
  const o = OUTFITS[(variant + 2) % OUTFITS.length]
  const crank = useRef<THREE.Group>(null)
  const wf = useRef<THREE.Group>(null)
  const wr = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const rider = useRef<THREE.Group>(null)
  const ph = useRef(0)
  useFrame((_, dt) => {
    const v = get()
    const d = Math.min(dt, 0.05)
    ph.current += (v.v * d) / 0.34
    if (wf.current) wf.current.rotation.x = ph.current
    if (wr.current) wr.current.rotation.x = ph.current
    const c = ph.current * 0.45
    if (crank.current) crank.current.rotation.x = c
    if (legL.current) legL.current.rotation.x = Math.sin(c) * 0.55 - 0.2
    if (legR.current) legR.current.rotation.x = -Math.sin(c) * 0.55 - 0.2
    if (rider.current) rider.current.rotation.x = 0.35 + THREE.MathUtils.clamp(-v.a * 0.03, -0.05, 0.15)
  })
  const frame = mat(['#1f8a70', '#d9412f', '#2b2f36'][variant % 3], { rough: 0.4, metal: 0.4 })
  return (
    <group>
      <Blob w={0.9} d={2.0} opacity={0.4} />
      {/* wheels */}
      <group ref={wf} position={[0, 0.34, 0.55]} rotation-y={Math.PI / 2}>
        <mesh geometry={torusGeo} material={tyre} scale={0.34} castShadow />
      </group>
      <group ref={wr} position={[0, 0.34, -0.55]} rotation-y={Math.PI / 2}>
        <mesh geometry={torusGeo} material={tyre} scale={0.34} castShadow />
      </group>
      {/* frame */}
      <mesh geometry={box} material={frame} position={[0, 0.58, 0.02]} rotation-x={0.25} scale={[0.05, 0.05, 1.0]} />
      <mesh geometry={box} material={frame} position={[0, 0.5, -0.2]} rotation-x={-0.9} scale={[0.05, 0.05, 0.6]} />
      <mesh geometry={box} material={frame} position={[0, 0.72, 0.48]} rotation-x={0.3} scale={[0.05, 0.5, 0.05]} />
      <mesh geometry={box} material={mat('#222')} position={[0, 0.98, 0.42]} scale={[0.55, 0.04, 0.04]} />
      <mesh geometry={box} material={mat('#222')} position={[0, 0.86, -0.28]} scale={[0.12, 0.05, 0.24]} />
      <group ref={crank} position={[0, 0.35, -0.05]} />
      {/* rider */}
      <group ref={rider} position={[0, 0.88, -0.25]}>
        <mesh geometry={capsule} material={mat(o.top, { rough: 0.8 })} position={[0, 0.34, 0]} scale={[0.18, 0.26, 0.13]} castShadow />
        <group position={[0, 0.78, 0.04]}>
          <mesh geometry={sphere} material={mat(o.skin)} scale={[0.12, 0.14, 0.13]} castShadow />
          <mesh geometry={sphere} material={mat('#f2efe8', { rough: 0.4 })} position={[0, 0.07, -0.01]} scale={[0.15, 0.1, 0.17]} />
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={capsule} material={mat(o.top)} position={[s * 0.22, 0.38, 0.32]} rotation-x={1.1} scale={[0.055, 0.24, 0.055]} />
        ))}
      </group>
      <group ref={legL} position={[0.12, 0.9, -0.25]}>
        <mesh geometry={capsule} material={mat(o.bottom)} position={[0, -0.25, 0.12]} rotation-x={0.5} scale={[0.07, 0.24, 0.07]} castShadow />
      </group>
      <group ref={legR} position={[-0.12, 0.9, -0.25]}>
        <mesh geometry={capsule} material={mat(o.bottom)} position={[0, -0.25, 0.12]} rotation-x={0.5} scale={[0.07, 0.24, 0.07]} castShadow />
      </group>
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

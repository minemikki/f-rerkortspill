import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ScenarioRunner, UIEvent } from '../engine/runner'
import type { ActorRuntime, SimEvent } from '../engine/sim'
import type { CameraShot, EnvironmentId, ScenarioDef } from '../engine/types'
import { anchorEntries } from './anchors'
import { Environment } from './environments'
import { Ball, Bus, Car, Cyclist, Person, Van, type ViewGetter } from './models'
import { MOODS, type Mood } from './moods'
import { ringTexture } from './textures'

/* ───────────── sky & lights ───────────── */

export function Sky({ mood }: { mood: Mood }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(mood.skyTop) },
          horizon: { value: new THREE.Color(mood.skyHorizon) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vP;
          void main(){ float h = clamp(vP.y*1.6+0.05,0.0,1.0); vec3 c = mix(horizon, top, pow(h,0.75)); gl_FragColor = vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`,
      }),
    [mood],
  )
  return (
    <mesh material={mat} scale={480} renderOrder={-10}>
      <sphereGeometry args={[1, 24, 16]} />
    </mesh>
  )
}

export function Lights({ mood, focus, shadows }: { mood: Mood; focus: React.MutableRefObject<THREE.Vector3>; shadows: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const dir = useMemo(() => new THREE.Vector3(...mood.sunPos).normalize(), [mood])
  useFrame(() => {
    if (!sun.current) return
    const f = focus.current
    // snap to texel-ish grid to reduce shimmering
    const fx = Math.round(f.x)
    const fz = Math.round(f.z)
    sun.current.position.set(fx + dir.x * 80, dir.y * 80, fz + dir.z * 80)
    target.position.set(fx, 0, fz)
    target.updateMatrixWorld()
  })
  return (
    <>
      <hemisphereLight args={[mood.hemiSky, mood.hemiGround, mood.hemiIntensity]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        color={mood.sunColor}
        intensity={mood.sunIntensity}
        target={target}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  )
}

/* ───────────── actors ───────────── */

export function ActorNode({
  rt,
  get,
  onTap,
  tappable,
}: {
  rt: ActorRuntime
  get: ViewGetter
  onTap?: (id: string) => void
  tappable: boolean
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const v = get()
    const g = ref.current
    if (!g) return
    g.visible = v.visible
    g.position.set(v.x, 0, v.z)
    const faceHeading = rt.def.kind === 'pedestrian' || rt.def.kind === 'child' ? v.face : null
    // pedestrians standing still turn their whole body towards `face`
    if (faceHeading !== null && v.v < 0.15) {
      let d = faceHeading - g.rotation.y
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      g.rotation.y += d * 0.08
    } else {
      g.rotation.y = v.h
    }
  })
  const d = rt.def
  const color = d.color ?? '#cccccc'
  let model: React.ReactNode
  let hit: [number, number, number] = [1.4, 2.2, 1.4]
  switch (d.kind) {
    case 'car':
      model = <Car get={get} color={color} parked={d.parked} />
      hit = [2.6, 2.2, 5.0]
      break
    case 'van':
      model = <Van get={get} color={color} parked={d.parked} />
      hit = [2.8, 3, 6]
      break
    case 'bus':
      model = <Bus get={get} color={color} />
      hit = [3.2, 3.6, 12.5]
      break
    case 'cyclist':
      model = <Cyclist get={get} variant={d.variant} />
      hit = [1.6, 2.6, 2.6]
      break
    case 'pedestrian':
      model = <Person get={get} variant={d.variant} />
      hit = [1.5, 2.4, 1.5]
      break
    case 'child':
      model = <Person get={get} variant={d.variant} child />
      hit = [1.4, 1.8, 1.4]
      break
    case 'ball':
      model = <Ball get={get} />
      hit = [0.9, 0.9, 0.9]
      break
  }
  return (
    <group ref={ref}>
      {model}
      {tappable && onTap && (
        <mesh
          position-y={hit[1] / 2}
          onPointerDown={(e) => {
            e.stopPropagation()
            onTap(d.id)
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <boxGeometry args={hit} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

/* ───────────── highlight rings ───────────── */

function Rings({ runner }: { runner: ScenarioRunner }) {
  const group = useRef<THREE.Group>(null)
  const tex = useMemo(() => ringTexture(), [])
  const pool = useMemo(
    () =>
      Array.from({ length: 4 }, () => {
        const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: '#ffd400', toneMapped: false })
        const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m)
        ring.rotation.x = -Math.PI / 2
        ring.renderOrder = 5
        const chev = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), new THREE.MeshBasicMaterial({ color: '#ffd400', toneMapped: false }))
        chev.rotation.x = Math.PI
        const g = new THREE.Group()
        g.add(ring)
        g.add(chev)
        g.visible = false
        return { g, ring, chev, m }
      }),
    [tex],
  )
  useEffect(() => {
    const gr = group.current!
    pool.forEach((p) => gr.add(p.g))
    return () => {
      pool.forEach((p) => gr.remove(p.g))
    }
  }, [pool])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const ids = runner.highlights
    const found = runner.ui.step?.found ?? []
    pool.forEach((p, i) => {
      const id = ids[i]
      if (!id) {
        p.g.visible = false
        return
      }
      const idx = runner.sim.actors.findIndex((a) => a.def.id === id)
      if (idx < 0) {
        p.g.visible = false
        return
      }
      const v = runner.view(idx)
      const rt = runner.sim.actors[idx]
      const size = Math.max(rt.len, rt.wid) + 1.6
      p.g.visible = v.visible
      p.g.position.set(v.x, 0.05, v.z)
      const pulse = 1 + Math.sin(t * 5) * 0.06
      p.ring.scale.set(size * pulse, size * pulse, 1)
      const isFound = found.includes(id)
      const col = isFound ? '#2ee6a6' : runner.phase === 'replay' || runner.phase === 'feedback' || runner.phase === 'impact' ? '#ffd400' : '#2ee6a6'
      p.m.color.set(col)
      ;(p.chev.material as THREE.MeshBasicMaterial).color.set(col)
      const h = rt.def.kind === 'car' ? 2.6 : rt.def.kind === 'bus' ? 4 : rt.def.kind === 'van' ? 3.2 : rt.def.kind === 'ball' ? 1.0 : 2.5
      p.chev.position.set(0, h + 0.4 + Math.sin(t * 4) * 0.15, 0)
    })
  })
  return <group ref={group} />
}

/* ───────────── camera ───────────── */

const tmpV = new THREE.Vector3()

function CameraRig({ runner, focus, events }: { runner: ScenarioRunner; focus: React.MutableRefObject<THREE.Vector3>; events: React.MutableRefObject<{ shake: number }> }) {
  const { camera, size } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const pos = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const hSmooth = useRef<number | null>(null)
  const init = useRef(false)
  const fovRef = useRef(50)
  const offY = useRef(0)
  const playerIdx = useMemo(() => runner.sim.actors.findIndex((a) => a.def.id === 'player'), [runner])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const aspect = size.width / size.height
    const portrait = aspect < 0.9
    const pv = runner.view(playerIdx)
    // smoothed heading for a stable chase cam
    if (hSmooth.current === null) hSmooth.current = pv.h
    let dh = pv.h - hSmooth.current
    while (dh > Math.PI) dh -= Math.PI * 2
    while (dh < -Math.PI) dh += Math.PI * 2
    hSmooth.current += dh * Math.min(1, dt * 2.2)
    const h = hSmooth.current
    const shot: CameraShot = runner.camera ?? runner.def.camera
    const desiredPos = tmpV
    const desiredLook = new THREE.Vector3()
    let fov = 50
    if (shot.kind === 'chase') {
      const k = portrait ? 1.12 : 1
      const back = (shot.back ?? 9) * k
      const up = (shot.up ?? 4.5) * (portrait ? 1.18 : 1)
      const ahead = (shot.ahead ?? 9) * (portrait ? 1.45 : 1)
      const side = shot.side ?? 0
      const fx = Math.sin(h)
      const fz = Math.cos(h)
      const rx = -Math.cos(h)
      const rz = Math.sin(h)
      desiredPos.set(pv.x - fx * back + rx * side, up, pv.z - fz * back + rz * side)
      desiredLook.set(pv.x + fx * ahead, 0.8, pv.z + fz * ahead)
      fov = shot.fov ?? 50
      // Director: keep the step's focus actors in frame. Narrow (portrait) screens
      // swing the look target towards them and pull back a little.
      const step = runner.phase === 'step' || runner.phase === 'outcome' ? currentStepFocus(runner) : null
      if (step && step.length) {
        let cx = 0
        let cz = 0
        let maxD = 0
        for (const id of step) {
          const a = runner.sim.byId.get(id)
          if (!a) continue
          cx += a.view.x
          cz += a.view.z
        }
        cx /= step.length
        cz /= step.length
        for (const id of step) {
          const a = runner.sim.byId.get(id)
          if (a) maxD = Math.max(maxD, Math.hypot(a.view.x - pv.x, a.view.z - pv.z))
        }
        const w = portrait ? 0.55 : 0.25
        desiredLook.x += (cx - desiredLook.x) * w
        desiredLook.z += (cz - desiredLook.z) * w
        if (portrait) {
          const extra = Math.min(10, maxD * 0.35)
          desiredPos.x -= fx * extra
          desiredPos.z -= fz * extra
          desiredPos.y += extra * 0.6
        }
      }
    } else if (shot.kind === 'fixed') {
      desiredPos.set(...shot.pos)
      desiredLook.set(...shot.target)
      fov = shot.fov ?? 45
      if (portrait) {
        // pull back along the view direction so the action fits
        const dir = desiredPos.clone().sub(desiredLook)
        desiredPos.copy(desiredLook).add(dir.multiplyScalar(1.3))
      }
    } else {
      const a = shot.angle + state.clock.elapsedTime * (shot.speed ?? 0.05)
      desiredPos.set(shot.target[0] + Math.cos(a) * shot.radius, shot.height, shot.target[2] + Math.sin(a) * shot.radius)
      desiredLook.set(...shot.target)
      fov = shot.fov ?? 45
    }
    if (runner.phase === 'step') fov -= 3
    if (portrait) {
      // keep a usable horizontal field of view on tall phones
      const minH = THREE.MathUtils.degToRad(46)
      const needed = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(minH / 2) / aspect))
      fov = Math.min(78, Math.max(fov, needed))
    }
    if (!init.current) {
      init.current = true
      // establishing shot: high above, then swoop into position
      pos.current.set(desiredPos.x + 18, desiredPos.y + 26, desiredPos.z + 22)
      look.current.copy(desiredLook)
      fovRef.current = fov + 6
    }
    const isIntro = runner.phase === 'intro'
    const kPos = isIntro ? 1.6 : runner.phase === 'replay' ? 2.2 : 3.2
    const kLook = isIntro ? 2.4 : 5
    pos.current.lerp(desiredPos, 1 - Math.exp(-dt * kPos))
    look.current.lerp(desiredLook, 1 - Math.exp(-dt * kLook))
    fovRef.current += (fov - fovRef.current) * (1 - Math.exp(-dt * 3))
    cam.position.copy(pos.current)
    // shake
    const sh = events.current.shake
    if (sh > 0.001) {
      const t = state.clock.elapsedTime
      cam.position.x += Math.sin(t * 53) * sh * 0.35
      cam.position.y += Math.sin(t * 71 + 1) * sh * 0.25
      events.current.shake *= Math.exp(-dt * 5)
    }
    cam.lookAt(look.current)
    // Portrait: shift the frame so the action sits above the bottom sheet (choices / feedback)
    // or below the prompt (spot). Expressed as a fraction of the viewport height.
    let targetOff = 0
    if (portrait) {
      const ui = runner.ui
      if (runner.phase === 'step' && ui.step?.kind === 'choice') targetOff = 0.2
      else if (runner.phase === 'step' && ui.step?.kind === 'spot') targetOff = -0.06
      else if (runner.phase === 'feedback' && ui.feedback?.blocking) targetOff = 0.2
    }
    offY.current += (targetOff - offY.current) * (1 - Math.exp(-dt * 4))
    const w = size.width
    const hgt = size.height
    if (Math.abs(offY.current) > 0.002) cam.setViewOffset(w, hgt, 0, offY.current * hgt, w, hgt)
    else if (cam.view) cam.clearViewOffset()
    if (Math.abs(cam.fov - fovRef.current) > 0.01 || Math.abs(offY.current) > 0.002 || cam.view) {
      cam.fov = fovRef.current
      cam.updateProjectionMatrix()
    }
    focus.current.set(pv.x, 0, pv.z)
  })
  return null
}

function currentStepFocus(runner: ScenarioRunner): string[] | null {
  const id = runner.ui.step?.id ?? null
  if (!id || runner.phase !== 'step') return null
  const st = runner.def.steps.find((s) => s.id === id)
  return st?.focus ?? null
}

/* ───────────── anchors (DOM labels over actors) ───────────── */

export function AnchorProjector({ viewOf }: { viewOf: (id: string) => { x: number; z: number; visible: boolean; h: number } | null }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    anchorEntries().forEach((el, id) => {
      const view = viewOf(id)
      if (!view) return
      v.set(view.x, view.h, view.z)
      const dist = v.distanceTo(camera.position)
      v.project(camera)
      const x = Math.min(size.width - 64, Math.max(64, (v.x * 0.5 + 0.5) * size.width))
      const y = Math.min(size.height - 40, Math.max(96, (-v.y * 0.5 + 0.5) * size.height))
      const hidden = v.z > 1 || !view.visible || dist > 60
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
      el.style.opacity = hidden ? '0' : '1'
    })
  })
  return null
}

export function labelHeight(kind: string) {
  return kind === 'bus' ? 4.4 : kind === 'van' ? 3.4 : kind === 'car' ? 2.7 : kind === 'ball' ? 1.1 : kind === 'child' ? 1.9 : 2.7
}

/* ───────────── driver ───────────── */

function RunnerDriver({
  runner,
  onSimEvents,
  onUIEvents,
  shake,
}: {
  runner: ScenarioRunner
  onSimEvents: (e: SimEvent[]) => void
  onUIEvents: (e: UIEvent[]) => void
  shake: React.MutableRefObject<{ shake: number }>
}) {
  useFrame((_, dt) => {
    runner.update(dt)
    const se = runner.sim.drainEvents()
    if (se.length) onSimEvents(se)
    const ue = runner.drainUIEvents()
    if (ue.length) {
      for (const e of ue) if (e.type === 'impact') shake.current.shake = 1
      onUIEvents(ue)
    }
  }, -1)
  return null
}

/* ───────────── adaptive quality ───────────── */

export function useQuality() {
  const [q] = useState(() => {
    const mobile = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700)
    return { dpr: (mobile ? [1, 1.75] : [1, 2]) as [number, number], shadows: true, mobile }
  })
  return q
}

const FORCE_HQ = typeof location !== 'undefined' && new URLSearchParams(location.search).has('hq')

export function FrameGuard({ onSlow }: { onSlow: () => void }) {
  const acc = useRef({ t: 0, n: 0, fired: FORCE_HQ })
  useFrame((_, dt) => {
    const a = acc.current
    if (a.fired) return
    a.t += dt
    a.n++
    if (a.t > 3) {
      const fps = a.n / a.t
      if (fps < 34) {
        a.fired = true
        onSlow()
      }
      a.t = 0
      a.n = 0
    }
  })
  return null
}

/* ───────────── public: scenario canvas ───────────── */

export function ScenarioCanvas({
  runner,
  onSimEvents,
  onUIEvents,
}: {
  runner: ScenarioRunner
  onSimEvents: (e: SimEvent[]) => void
  onUIEvents: (e: UIEvent[]) => void
}) {
  const def = runner.def
  const mood = MOODS[def.mood]
  const focus = useRef(new THREE.Vector3())
  const shake = useRef({ shake: 0 })
  const q = useQuality()
  const [lowPower, setLowPower] = useState(false)
  const [spotActive, setSpotActive] = useState(false)
  useEffect(() => {
    const off = runner.subscribe(() => setSpotActive(runner.ui.phase === 'step' && runner.ui.step?.kind === 'spot'))
    return () => {
      off()
    }
  }, [runner])
  const getters = useMemo(() => runner.sim.actors.map((_, i) => () => runner.view(i)), [runner])
  return (
    <Canvas
      shadows={!lowPower && q.shadows ? 'soft' : false}
      dpr={lowPower ? 1 : q.dpr}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 50, near: 0.3, far: 900, position: [20, 30, 40] }}
      onCreated={(state) => {
        state.gl.toneMapping = THREE.ACESFilmicToneMapping
        state.gl.toneMappingExposure = mood.exposure
        if (import.meta.env.DEV) {
          const w = window as unknown as Record<string, unknown>
          w.__r3f = state
          w.__runner = runner
          w.__screenOf = (id: string) => {
            const a = runner.sim.byId.get(id)
            if (!a) return null
            const v = new THREE.Vector3(a.view.x, 1.0, a.view.z).project(state.camera)
            const r = state.gl.domElement.getBoundingClientRect()
            return [r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (-v.y * 0.5 + 0.5) * r.height]
          }
        }
      }}
      onPointerMissed={() => runner.tap(null)}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={[mood.fog]} />
      <fog attach="fog" args={[mood.fog, mood.fogNear, mood.fogFar]} />
      <Sky mood={mood} />
      <Lights mood={mood} focus={focus} shadows={!lowPower} />
      <Environment id={def.environment} haze={mood.skyHorizon} />
      {runner.sim.actors.map((rt, i) => (
        <ActorNode
          key={rt.def.id}
          rt={rt}
          get={getters[i]}
          tappable={spotActive && rt.def.id !== 'player'}
          onTap={(id) => runner.tap(id)}
        />
      ))}
      <Rings runner={runner} />
      <CameraRig runner={runner} focus={focus} events={shake} />
      <AnchorProjector
        viewOf={(id) => {
          const idx = runner.sim.actors.findIndex((a) => a.def.id === id)
          if (idx < 0) return null
          const v = runner.view(idx)
          return { x: v.x, z: v.z, visible: v.visible, h: labelHeight(runner.sim.actors[idx].def.kind) }
        }}
      />
      <RunnerDriver runner={runner} onSimEvents={onSimEvents} onUIEvents={onUIEvents} shake={shake} />
      <FrameGuard onSlow={() => setLowPower(true)} />
    </Canvas>
  )
}

export type { EnvironmentId, ScenarioDef }

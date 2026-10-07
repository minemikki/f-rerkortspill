import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { line } from '../engine/path'
import { Sim } from '../engine/sim'
import type { ActorDef, SpeedCmd } from '../engine/types'
import { KRYSS } from '../scenarios/layouts'
import { ActorNode, AnchorProjector, FrameGuard, labelHeight } from './GameScene'
import { BenchmarkWorld } from './render/BenchmarkWorld'
import { initialTier, lowerTier, settingsFor, type QualityTier } from './render/quality'

/**
 * Landing hero: a living, looping Norwegian residential intersection seen
 * from just behind "your" car waiting at the junction.
 */

function loop(period: number, offset: number, v: number, cycles = 40): SpeedCmd[] {
  const out: SpeedCmd[] = []
  for (let k = 0; k < cycles; k++) out.push({ at: offset + k * period, setS: 0, setV: v, v })
  return out
}

const L = KRYSS.lane

// Loops share a 26 s period so the junction never has two crossing actors at once.
const P = 26
export const HERO_ACTORS: ActorDef[] = [
  { id: 'player', kind: 'car', path: line(L, 45, L, -80), s0: 45 - 7.6, v0: 0, program: [{ at: 0, v: 0 }], color: '#E8E4DA', indicator: 'left' },
  { id: 'hero-car', kind: 'car', path: line(110, -L, -120, -L), v0: 8, program: loop(P, 0, 8), color: '#2F5D8A' },
  { id: 'hero-car3', kind: 'car', path: line(110, -L, -120, -L), v0: 8, program: loop(P, 13, 8), color: '#D9D4C7' },
  { id: 'hero-car2', kind: 'car', path: line(-110, L, 120, L), v0: 7, program: loop(P, 6, 7), color: '#8E2B22' },
  { id: 'hero-car4', kind: 'van', path: line(-110, L, 120, L), v0: 7, program: loop(P, 19, 7), color: '#F2F0EA' },
  { id: 'hero-cyclist', kind: 'cyclist', path: line(-2.4, -60, -2.4, 80), v0: 5, program: loop(P, 17.6, 5), variant: 0 },
  { id: 'hero-walker', kind: 'pedestrian', path: line(-4.4, -30, -4.4, 30), v0: 1.25, program: loop(46, 0, 1.25, 8), variant: 2 },
  { id: 'hero-walker2', kind: 'pedestrian', path: line(4.2, 30, 4.2, -30), s0: 12, v0: 1.15, program: [{ at: 0, v: 1.15 }, ...loop(52, 18, 1.15, 8)], variant: 0 },
  // parked nose-in on a driveway
  { id: 'parked-1', kind: 'car', path: line(-8.6, 26.2, -14, 26.2), parked: true, color: '#3C4A57' },
]

function HeroDriver({ sim }: { sim: Sim }) {
  useFrame((_, dt) => {
    sim.advance(Math.min(dt, 0.05))
    sim.drainEvents()
  }, -1)
  return null
}

function HeroCamera() {
  const { camera, size } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const aspect = size.width / size.height
    const portrait = aspect < 0.9
    const sway = Math.sin(t * 0.18) * 0.9
    if (portrait) {
      cam.position.set(-0.6 + sway * 0.5, 6.2 + Math.sin(t * 0.25) * 0.15, 21)
      cam.lookAt(2.5, 0.2, -4)
      const fov = Math.min(74, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(23)) / aspect)))
      if (Math.abs(cam.fov - fov) > 0.1) {
        cam.fov = fov
        cam.updateProjectionMatrix()
      }
    } else {
      cam.position.set(-2.2 + sway, 3.4 + Math.sin(t * 0.25) * 0.12, 16.5)
      cam.lookAt(5.5, 1.3, -3)
      if (Math.abs(cam.fov - 42) > 0.1) {
        cam.fov = 42
        cam.updateProjectionMatrix()
      }
    }
  })
  return null
}

export function HeroCanvas() {
  const sim = useMemo(() => {
    const s = new Sim(HERO_ACTORS)
    s.advance(P + 9) // start mid-action, after every loop has spawned
    return s
  }, [])
  const focus = useRef(new THREE.Vector3(0, 0, 4))
  const [tier, setTier] = useState<QualityTier>(initialTier)
  const quality = useMemo(() => settingsFor(tier), [tier])
  const getters = useMemo(() => sim.actors.map((a) => () => a.view), [sim])
  return (
    <Canvas
      shadows={quality.shadows ? 'percentage' : false}
      dpr={quality.dpr}
      gl={{ antialias: !quality.post, powerPreference: 'high-performance' }}
      camera={{ fov: 42, near: 0.3, far: 900, position: [-2, 3.4, 16] }}
      style={{ touchAction: 'pan-y' }}
    >
      <BenchmarkWorld id="hero" quality={quality} focus={focus} />
      {sim.actors.map((rt, i) => (
        <ActorNode key={rt.def.id} rt={rt} get={getters[i]} tappable={false} />
      ))}
      <HeroCamera />
      <HeroDriver sim={sim} />
      <AnchorProjector
        viewOf={(id) => {
          const a = sim.byId.get(id)
          if (!a) return null
          // only label things near the junction
          const near = Math.abs(a.view.x) < 22 && Math.abs(a.view.z) < 22
          return { x: a.view.x, z: a.view.z, visible: a.view.visible && near, h: labelHeight(a.def.kind) }
        }}
      />
      <FrameGuard repeat disabled={tier === 'low'} onSlow={() => setTier((t) => lowerTier(t))} />
    </Canvas>
  )
}

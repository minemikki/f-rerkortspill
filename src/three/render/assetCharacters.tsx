import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { ActorView } from '../../engine/sim'

/**
 * Authored (rigged glTF) characters — the drop-in replacement for the
 * procedural people in characters.tsx.
 *
 * Contract for an asset (Meshy / Mixamo / commissioned, humanoid rig):
 *  - one GLB with a skinned mesh, facing +z, feet at y = 0;
 *  - clips named in `clips` (idle / walk / run required, look optional);
 *  - any skeleton: the head bone is found by name for the procedural look.
 *
 * `CHARACTER_ASSETS` is empty in production until real assets land, so the
 * game keeps using the procedural figures. In dev, `?glbtest` maps every
 * adult to the three.js example robot to exercise the pipeline.
 */
export interface CharacterAsset {
  url: string
  /** clip names inside the GLB */
  clips: { idle: string; walk: string; run: string; look?: string }
  /** real height in metres the model is scaled to */
  height: number
  /** walking speed (m/s) at which the walk clip's feet don't slide */
  walkSpeed: number
  runSpeed: number
}

export type CharacterRole = 'adult' | 'child' | 'jogger'

/**
 * Registered authored characters. Generated with Higgsfield (Meshy 6 text→3D,
 * auto-rig, Casual_Walk + Idle clips), clips merged and texture downscaled to
 * 1024² — see docs/ASSET_PIPELINE.md. `?procedural` forces the old figures.
 */
const ADULT_M01: CharacterAsset = {
  url: `${import.meta.env.BASE_URL}assets/characters/adult_m01.glb`,
  clips: { idle: 'Idle', walk: 'Walk', run: 'Walk' },
  height: 1.78,
  walkSpeed: 1.35,
  runSpeed: 3.4,
}

const ADULT_F01: CharacterAsset = {
  url: `${import.meta.env.BASE_URL}assets/characters/adult_f01.glb`,
  clips: { idle: 'Idle', walk: 'Walk', run: 'Walk' },
  height: 1.68,
  walkSpeed: 1.3,
  runSpeed: 3.2,
}

const ASSETS: Partial<Record<CharacterRole, CharacterAsset[]>> = {
  adult: [ADULT_M01, ADULT_F01],
  // child: the first generated child (child_m01) was rejected: the hood made the
  // auto-rig place the head bone badly, so the head sank into the body.
}
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('procedural')) {
  delete ASSETS.adult
  delete ASSETS.child
}

if (import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('glbtest')) {
  const xbot: CharacterAsset = {
    url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/Xbot.glb',
    clips: { idle: 'idle', walk: 'walk', run: 'run' },
    height: 1.76,
    walkSpeed: 1.45,
    runSpeed: 3.6,
  }
  ASSETS.adult = [xbot]
  ASSETS.jogger = [xbot]
}

export function characterAssetFor(role: CharacterRole, variant: number): CharacterAsset | null {
  const list = ASSETS[role]
  return list && list.length ? list[variant % list.length] : null
}

/* ───────────── loading (shared per URL) ───────────── */

const loader = new GLTFLoader()
const cache = new Map<string, Promise<GLTF>>()
function loadAsset(url: string) {
  let p = cache.get(url)
  if (!p) {
    p = loader.loadAsync(url)
    cache.set(url, p)
  }
  return p
}

/** Pick the clip and playback rate for the current motion. Pure (unit-tested). */
export function chooseClip(v: Pick<ActorView, 'v' | 'pose'>, a: Pick<CharacterAsset, 'walkSpeed' | 'runSpeed'>): { clip: 'idle' | 'walk' | 'run'; rate: number } {
  const speed = Math.abs(v.v)
  if (v.pose === 'run' || speed > (a.walkSpeed + a.runSpeed) / 2) return { clip: 'run', rate: THREE.MathUtils.clamp(speed / a.runSpeed, 0.6, 1.6) || 1 }
  if (v.pose === 'walk' || speed > 0.25) return { clip: 'walk', rate: THREE.MathUtils.clamp(speed / a.walkSpeed, 0.5, 1.5) || 1 }
  return { clip: 'idle', rate: 1 }
}

/**
 * Renders an authored character; shows `fallback` (the procedural figure)
 * until the GLB is loaded, and keeps it if loading fails.
 */
export function AssetHuman({ get, asset, fallback }: { get: () => ActorView; asset: CharacterAsset; fallback: React.ReactNode }) {
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    loadAsset(asset.url).then(
      (g) => alive && setGltf(g),
      (e) => {
        console.warn('[character] GLB failed, using procedural figure:', asset.url, e)
        if (alive) setFailed(true)
      },
    )
    return () => {
      alive = false
    }
  }, [asset.url])
  if (!gltf || failed) return <>{fallback}</>
  return <LoadedHuman gltf={gltf} asset={asset} get={get} />
}

function LoadedHuman({ gltf, asset, get }: { gltf: GLTF; asset: CharacterAsset; get: () => ActorView }) {
  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene) as THREE.Object3D
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        m.frustumCulled = false // skinned bounds are unreliable
        // No mipmaps: AI-generated atlases pack hundreds of tiny UV islands edge to edge,
        // so lower mip levels blend neighbouring islands (white shoe/skin into the jacket)
        // and the figure shows white specks at distance. Bilinear on the full texture is clean.
        const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]
        for (const mat of mats) {
          if (mat.map && mat.map.generateMipmaps) {
            mat.map.generateMipmaps = false
            mat.map.minFilter = THREE.LinearFilter
            mat.map.needsUpdate = true
          }
        }
      }
    })
    // scale to the target height, feet on the ground. Measure the SKELETON:
    // mesh bounds of skinned models ignore armature unit scale (cm rigs).
    root.updateMatrixWorld(true)
    let minY = Infinity
    let maxY = -Infinity
    const p = new THREE.Vector3()
    root.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        o.getWorldPosition(p)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      }
    })
    if (!Number.isFinite(minY)) {
      const box = new THREE.Box3().setFromObject(root)
      minY = box.min.y
      maxY = box.max.y
    }
    // the highest bone (head/head-top) sits ~6 % below the crown
    const h = (maxY - minY) * 1.06 || 1
    const s = asset.height / h
    root.scale.multiplyScalar(s)
    root.position.y = -minY * s
    const mixer = new THREE.AnimationMixer(root)
    // Keep bone ROTATIONS (+ root position) only: clips merged from separately rigged
    // copies carry per-bone translations/scales of a different rest pose, which
    // displaces the head and limbs (seen on the child idle).
    const find = (name?: string) => {
      const c = name ? THREE.AnimationClip.findByName(gltf.animations, name) : undefined
      if (!c) return undefined
      const tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion') || /(^|[:|])hips\.position$/i.test(t.name))
      return new THREE.AnimationClip(c.name, c.duration, tracks)
    }
    const actions: Partial<Record<'idle' | 'walk' | 'run', THREE.AnimationAction>> = {}
    for (const k of ['idle', 'walk', 'run'] as const) {
      const clip = find(asset.clips[k])
      if (clip) actions[k] = mixer.clipAction(clip) // run may share the walk action
    }
    let head: THREE.Object3D | null = null
    root.traverse((o) => {
      if (!head && (o as THREE.Bone).isBone && /head/i.test(o.name) && !/top|end/i.test(o.name)) head = o
    })
    return { root, mixer, actions, head: head as THREE.Object3D | null, weights: { idle: 1, walk: 0, run: 0 }, t: Math.random() * 10 }
  }, [gltf, asset])

  // start in the effect (not in useMemo) so StrictMode's mount → cleanup → mount restarts them
  useEffect(() => {
    for (const [k, a] of Object.entries(rig.actions)) {
      a!.reset().play()
      a!.setEffectiveWeight(k === 'idle' ? 1 : 0)
    }
    return () => void rig.mixer.stopAllAction()
  }, [rig])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const v = get()
    rig.root.visible = v.visible
    const { clip, rate } = chooseClip(v, asset)
    // smooth cross-fade between idle / walk / run (frame-rate independent)
    const k = 1 - Math.exp(-dt * 6)
    for (const name of ['idle', 'walk', 'run'] as const) rig.weights[name] += ((name === clip ? 1 : 0) - rig.weights[name]) * k
    // an action shared by two roles (run = walk clip) gets the sum of their weights
    const seen = new Map<THREE.AnimationAction, number>()
    for (const name of ['idle', 'walk', 'run'] as const) {
      const a = rig.actions[name]
      if (a) seen.set(a, (seen.get(a) ?? 0) + rig.weights[name])
    }
    for (const [a, w] of seen) a.setEffectiveWeight(Math.min(1, w))
    const active = rig.actions[clip]
    if (active) active.setEffectiveTimeScale(rate)
    rig.mixer.update(dt)
    // procedural head on top of the clip: scan left/right when looking, otherwise a tiny idle drift
    rig.t += dt
    if (rig.head) {
      const look = v.pose === 'look' ? Math.sin(rig.t * 1.6) * 0.75 : Math.sin(rig.t * 0.4) * 0.08
      rig.head.rotation.y += look
    }
  })
  return <primitive object={rig.root} />
}

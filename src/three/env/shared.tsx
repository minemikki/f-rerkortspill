import * as THREE from 'three'
import { surface } from '../render/materials'
import { curbGeo, groundPlane, withMacroVariation, worldBox } from '../render/streetkit'

/** Shared benchmark-environment helpers (one material instance per surface across all City scenes). */

let groundMat: THREE.MeshStandardMaterial | null = null
let asphaltMat: THREE.MeshStandardMaterial | null = null
let urbanMat: THREE.MeshStandardMaterial | null = null
export function envMats() {
  if (!groundMat) groundMat = withMacroVariation(surface('grass', { tile: 2.6, color: '#d2deb8' }).clone(), 0.02, 0.3, 'macro-grass')
  if (!asphaltMat) asphaltMat = withMacroVariation(surface('asphalt').clone(), 0.03, 0.16, 'macro-asphalt')
  if (!urbanMat) urbanMat = withMacroVariation(surface('pavement', { tile: 2.4, color: '#bdb9b0' }).clone(), 0.025, 0.18, 'macro-pave')
  return { ground: groundMat, asphalt: asphaltMat, urbanPave: urbanMat }
}

export interface Static {
  g: THREE.BufferGeometry
  m: THREE.Material
  cast?: boolean
}

export const KERB_H = 0.13
export const KERB_W = 0.16

/**
 * Sidewalk with granite kerb along a road edge. `edge` is the road-edge
 * coordinate, `side` = +1/-1 is the direction from the road into the
 * sidewalk. Axis = direction of the road.
 */
export function sidewalkRun(axis: 'x' | 'z', edge: number, side: 1 | -1, from: number, to: number, width: number): Static[] {
  const pave = surface('pavement')
  const granite = surface('granite')
  const len = Math.abs(to - from)
  const mid = (from + to) / 2
  const c = edge + (side * width) / 2
  const k = edge + (side * KERB_W) / 2
  return [
    { g: axis === 'z' ? worldBox(c, KERB_H / 2, mid, width, KERB_H, len) : worldBox(mid, KERB_H / 2, c, len, KERB_H, width), m: pave, cast: false },
    { g: curbGeo(axis, k, from, to, KERB_H + 0.01, KERB_W), m: granite, cast: false },
  ]
}

/** Asphalt strip centred on the axis line `at`. */
export function roadStrip(axis: 'x' | 'z', at: number, from: number, to: number, width: number, y = 0): Static {
  const { asphalt } = envMats()
  const len = Math.abs(to - from)
  const mid = (from + to) / 2
  return { g: axis === 'z' ? groundPlane(at, mid, width, len, y) : groundPlane(mid, at, len, width, y), m: asphalt, cast: false }
}

export function groundStatic(cx = 0, cz = -30, size = 760): Static {
  return { g: groundPlane(cx, cz, size, size, -0.02), m: envMats().ground, cast: false }
}

/** Render a list of static geometries (wrap in MergeStatic). */
export function Statics({ items }: { items: Static[] }) {
  return (
    <>
      {items.map((p, i) => (
        <mesh key={i} geometry={p.g} material={p.m} castShadow={p.cast ?? false} receiveShadow />
      ))}
    </>
  )
}

/** Deterministic PRNG for layout variation. */
export function prng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s & 0xffff) / 0xffff
  }
}

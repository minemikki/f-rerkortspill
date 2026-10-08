import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import type { EnvironmentId } from '../../engine/types'
import { CityStreet } from '../env/CityStreet'
import { CrossingStreet } from '../env/CrossingStreet'
import { ResidentialKryss } from '../env/ResidentialKryss'
import { ResidentialStraight } from '../env/ResidentialStraight'
import { Roundabout } from '../env/Roundabout'
import { Atmosphere } from './Atmosphere'
import { enableKTX2, setTextureAnisotropy } from './materials'
import { PostFX } from './PostFX'
import type { QualitySettings } from './quality'

/**
 * Environments on the premium pipeline (HDRI light, PBR materials, post
 * FX). Since phase 3 every City scene is migrated; the classic stylised
 * environments in environments.tsx remain only as a fallback.
 */
export const BENCHMARK_ENVS: ReadonlySet<EnvironmentId> = new Set<EnvironmentId>(['boliggate-kryss', 'hero', 'boliggate-rett', 'bygate-sving', 'gangfelt', 'rundkjoring'])

export function isBenchmark(id: EnvironmentId) {
  return BENCHMARK_ENVS.has(id)
}

export function BenchmarkWorld({ id, quality, focus }: { id: EnvironmentId; quality: QualitySettings; focus: React.MutableRefObject<THREE.Vector3> }) {
  const { gl } = useThree()
  enableKTX2(gl) // synchronous: must precede the children's material creation
  useEffect(() => {
    const prev = gl.toneMapping
    gl.toneMapping = THREE.AgXToneMapping
    return () => {
      gl.toneMapping = prev
    }
  }, [gl])
  useEffect(() => setTextureAnisotropy(quality.anisotropy), [quality.anisotropy])
  return (
    <>
      <Atmosphere focus={focus} quality={quality} />
      {(id === 'boliggate-kryss' || id === 'hero') && <ResidentialKryss quality={quality} />}
      {id === 'boliggate-rett' && <ResidentialStraight quality={quality} />}
      {id === 'bygate-sving' && <CityStreet quality={quality} />}
      {id === 'gangfelt' && <CrossingStreet quality={quality} />}
      {id === 'rundkjoring' && <Roundabout quality={quality} />}
      <PostFX quality={quality} />
    </>
  )
}

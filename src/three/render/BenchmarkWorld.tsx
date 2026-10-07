import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import type { EnvironmentId } from '../../engine/types'
import { ResidentialKryss } from '../env/ResidentialKryss'
import { Atmosphere } from './Atmosphere'
import { setTextureAnisotropy } from './materials'
import { PostFX } from './PostFX'
import type { QualitySettings } from './quality'

/**
 * Environments that already use the premium pipeline (HDRI light, PBR
 * materials, post-processing). The others keep the classic stylised look
 * until they are migrated — the pipeline is the same, only the env differs.
 */
export const BENCHMARK_ENVS: ReadonlySet<EnvironmentId> = new Set<EnvironmentId>(['boliggate-kryss', 'hero'])

export function isBenchmark(id: EnvironmentId) {
  return BENCHMARK_ENVS.has(id)
}

export function BenchmarkWorld({ id, quality, focus }: { id: EnvironmentId; quality: QualitySettings; focus: React.MutableRefObject<THREE.Vector3> }) {
  const { gl } = useThree()
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
      <PostFX quality={quality} />
    </>
  )
}

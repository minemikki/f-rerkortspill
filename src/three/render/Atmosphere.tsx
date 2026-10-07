import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import type { QualitySettings } from './quality'

/**
 * Physically-based daylight rig shared by every "benchmark" scene:
 *  - HDRI image-based lighting (Poly Haven, CC0) via PMREM → scene.environment
 *  - photographic sky background (tonemapped equirect JPG)
 *  - sun directional light aligned with the sun in the HDRI, with a tight,
 *    camera-following shadow frustum (crisp near, cheap)
 *  - subtle sky/ground bounce fill and distance haze matching the horizon
 */
export interface AtmospherePreset {
  hdri: string
  backdrop: string
  /** sun direction (unit-ish) — should match the HDRI sun */
  sunDir: [number, number, number]
  sunColor: string
  sunIntensity: number
  envIntensity: number
  backgroundIntensity: number
  fillSky: string
  fillGround: string
  fillIntensity: number
  haze: string
  hazeNear: number
  hazeFar: number
  exposure: number
}

// HDRI sun for kloofendal_48d: azimuth atan2(z,x) ≈ 0.565 rad, elevation ≈ 47°.
// We drop the light a little (≈38°) for longer, more legible shadows.
const az = 0.565
const el = THREE.MathUtils.degToRad(38)

export const NORDIC_DAY: AtmospherePreset = {
  hdri: 'assets/sky/sky_1k.hdr',
  backdrop: 'assets/sky/sky_4k.jpg',
  sunDir: [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)],
  sunColor: '#fff0dc',
  sunIntensity: 3.4,
  envIntensity: 1.0,
  backgroundIntensity: 1,
  fillSky: '#cfe0f2',
  fillGround: '#5e6650',
  fillIntensity: 0.25,
  haze: '#c8d5e2',
  hazeNear: 110,
  hazeFar: 900,
  exposure: 1.0,
}

const BASE = import.meta.env.BASE_URL ?? '/'
let envPromise: Promise<THREE.DataTexture> | null = null
const backdrops = new Map<string, THREE.Texture>()

/**
 * Loads the HDRI and clamps its sun disc. The directional light IS the sun
 * (with shadows); leaving the HDR sun in the IBL would light every surface
 * from the sun direction a second time, unshadowed, and flatten the image.
 */
function loadHDR(url: string, clamp = 4) {
  if (!envPromise)
    envPromise = new HDRLoader()
      .setDataType(THREE.FloatType)
      .loadAsync(BASE + url)
      .then((t) => {
        const d = t.image.data as Float32Array
        for (let i = 0; i < d.length; i += 4) {
          const m = Math.max(d[i], d[i + 1], d[i + 2])
          if (m > clamp) {
            const k = clamp / m
            d[i] *= k
            d[i + 1] *= k
            d[i + 2] *= k
          }
        }
        t.needsUpdate = true
        return t
      })
  return envPromise
}

export function Atmosphere({
  preset = NORDIC_DAY,
  focus,
  quality,
  background = true,
}: {
  preset?: AtmospherePreset
  focus: React.MutableRefObject<THREE.Vector3>
  quality: QualitySettings
  background?: boolean
}) {
  const { scene, gl } = useThree()
  const sun = useRef<THREE.DirectionalLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const dir = useMemo(() => new THREE.Vector3(...preset.sunDir).normalize(), [preset])

  useEffect(() => {
    let disposed = false
    const pmrem = new THREE.PMREMGenerator(gl)
    let envRT: THREE.WebGLRenderTarget | null = null
    loadHDR(preset.hdri).then((hdr) => {
      if (disposed) return
      hdr.mapping = THREE.EquirectangularReflectionMapping
      envRT = pmrem.fromEquirectangular(hdr)
      scene.environment = envRT.texture
      scene.environmentIntensity = preset.envIntensity
    })
    if (background) {
      // 4k sky ≈ 45 MB of GPU memory with mips — only on the high tier; 2k (≈ 11 MB) otherwise
      const file = quality.tier === 'high' ? preset.backdrop : preset.backdrop.replace('_4k', '_2k')
      let tex = backdrops.get(file)
      if (!tex) {
        tex = new THREE.TextureLoader().load(BASE + file)
        tex.mapping = THREE.EquirectangularReflectionMapping
        tex.colorSpace = THREE.SRGBColorSpace
        backdrops.set(file, tex)
      }
      scene.background = tex
      scene.backgroundIntensity = preset.backgroundIntensity
    }
    scene.fog = new THREE.Fog(preset.haze, preset.hazeNear, preset.hazeFar)
    gl.toneMappingExposure = preset.exposure
    return () => {
      disposed = true
      scene.environment = null
      scene.fog = null
      if (background) scene.background = null
      envRT?.dispose()
      pmrem.dispose()
    }
  }, [scene, gl, preset, background, quality.tier])

  useFrame(({ camera }) => {
    const s = sun.current
    if (!s) return
    // Centre the shadow frustum a little ahead of the camera, snapped to texels
    const f = focus.current
    const fwd = new THREE.Vector3()
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    const span = s.shadow.camera.right - s.shadow.camera.left
    const texel = span / s.shadow.mapSize.x
    const cx = Math.round((f.x + fwd.x * 12) / texel) * texel
    const cz = Math.round((f.z + fwd.z * 12) / texel) * texel
    s.position.set(cx + dir.x * 120, dir.y * 120, cz + dir.z * 120)
    target.position.set(cx, 0, cz)
    target.updateMatrixWorld()
  })

  const r = 34
  return (
    <>
      <hemisphereLight args={[preset.fillSky, preset.fillGround, preset.fillIntensity]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        target={target}
        castShadow={quality.shadows}
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={10}
        shadow-camera-far={260}
        shadow-bias={-0.00025}
        shadow-normalBias={0.025}
        shadow-radius={3}
      />
    </>
  )
}

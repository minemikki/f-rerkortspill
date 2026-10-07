import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { QualitySettings } from './quality'

/**
 * Restrained post-processing. Readability of hazards beats cinematic look:
 *  - N8AO: soft contact/ambient occlusion (grounds cars, kerbs, houses) — high tier only
 *  - Bloom: only for genuinely bright things (sun glints, lamps, brake lights)
 *  - AgX tone mapping (no crushed blacks), light grading, gentle vignette, SMAA
 * No depth of field, no chromatic aberration, no film grain during gameplay.
 */
export function PostFX({ quality }: { quality: QualitySettings }) {
  if (!quality.post) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {quality.ao ? <N8AO halfRes aoRadius={1.6} distanceFalloff={0.8} intensity={2.2} quality="performance" color="#1b2026" /> : <></>}
      {quality.bloom ? <Bloom intensity={0.22} luminanceThreshold={0.95} luminanceSmoothing={0.12} mipmapBlur /> : <></>}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <HueSaturation saturation={0.1} />
      <BrightnessContrast brightness={0.01} contrast={0.06} />
      <Vignette offset={0.32} darkness={0.38} />
      <SMAA />
    </EffectComposer>
  )
}

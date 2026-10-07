/**
 * Adaptive render quality. One place decides what the GPU budget allows:
 * shadows, post-processing, AO, resolution. Tiers step down automatically
 * when the frame rate drops (see FrameGuard), and can be forced with
 * `?quality=high|medium|low` for testing / screenshots (`?hq` = high).
 */
export type QualityTier = 'high' | 'medium' | 'low'

export interface QualitySettings {
  tier: QualityTier
  dpr: [number, number]
  shadows: boolean
  shadowMapSize: number
  /** post-processing chain (AA + grading) */
  post: boolean
  /** screen-space ambient occlusion */
  ao: boolean
  bloom: boolean
  /** anisotropic filtering for ground textures */
  anisotropy: number
  /** vegetation density multiplier */
  foliage: number
}

const SETTINGS: Record<QualityTier, Omit<QualitySettings, 'tier'>> = {
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, post: true, ao: true, bloom: true, anisotropy: 8, foliage: 1 },
  medium: { dpr: [1, 1.5], shadows: true, shadowMapSize: 1024, post: true, ao: false, bloom: false, anisotropy: 4, foliage: 0.75 },
  low: { dpr: [1, 1], shadows: false, shadowMapSize: 512, post: false, ao: false, bloom: false, anisotropy: 2, foliage: 0.5 },
}

export function settingsFor(tier: QualityTier): QualitySettings {
  return { tier, ...SETTINGS[tier] }
}

export function forcedTier(): QualityTier | null {
  if (typeof location === 'undefined') return null
  const p = new URLSearchParams(location.search)
  const q = p.get('quality')
  if (q === 'high' || q === 'medium' || q === 'low') return q
  if (p.has('hq')) return 'high'
  return null
}

export function initialTier(): QualityTier {
  const f = forcedTier()
  if (f) return f
  if (typeof window === 'undefined') return 'high'
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  return coarse || small ? 'medium' : 'high'
}

export function lowerTier(t: QualityTier): QualityTier {
  return t === 'high' ? 'medium' : 'low'
}

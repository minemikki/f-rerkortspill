import * as THREE from 'three'

/**
 * PBR material library.
 *
 * Every surface type is defined ONCE here (asphalt, pavers, granite kerb,
 * grass, siding, roof tiles …) and shared across scenes. Geometry uses
 * world-space UVs in metres (see uv.ts), so a single material instance
 * tiles correctly on any size of surface — which also lets MergeStatic
 * collapse whole environments into a handful of draw calls.
 *
 * Textures: Poly Haven CC0 (see public/assets/LICENSES.json), downscaled
 * to 512–1024 px JPG. Next step for production: KTX2/Basis compression.
 */

export type SurfaceId =
  | 'asphalt'
  | 'pavement'
  | 'granite'
  | 'grass'
  | 'gravel'
  | 'siding'
  | 'roof_dark'
  | 'roof_red'
  | 'concrete'
  | 'bark'
  | 'plaster'
  | 'brick'

const BASE = `${import.meta.env.BASE_URL ?? '/'}assets/tex/`
const loader = new THREE.TextureLoader()
const texCache = new Map<string, THREE.Texture>()
let anisotropy = 8

export function setTextureAnisotropy(a: number) {
  anisotropy = a
  texCache.forEach((t) => {
    if (t.anisotropy === a) return
    t.anisotropy = a
    if (t.image) t.needsUpdate = true
  })
}

export function loadTex(file: string, srgb: boolean, repeat = 1): THREE.Texture {
  const key = `${file}|${repeat}`
  let t = texCache.get(key)
  if (!t) {
    t = loader.load(BASE + file)
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat, repeat)
    t.anisotropy = anisotropy
    texCache.set(key, t)
  }
  return t
}

interface SurfaceOpts {
  /** metres covered by one texture tile */
  tile: number
  color?: string
  roughness?: number
  normalScale?: number
  envMapIntensity?: number
}

const DEFAULTS: Record<SurfaceId, SurfaceOpts> = {
  asphalt: { tile: 3.2, color: '#a3a29e', normalScale: 0.9 },
  pavement: { tile: 2.4, color: '#c9c6bf', normalScale: 0.8 },
  granite: { tile: 1.6, color: '#b9b8b4', normalScale: 0.6 },
  grass: { tile: 2.2, color: '#9fae7c', normalScale: 0.9 },
  gravel: { tile: 1.8, color: '#c4bba9', normalScale: 1 },
  siding: { tile: 2.6, color: '#ffffff', normalScale: 1 },
  roof_dark: { tile: 2.4, color: '#7d7f82', normalScale: 1 },
  roof_red: { tile: 2.4, color: '#c9876b', normalScale: 1 },
  concrete: { tile: 2.2, color: '#c8c5be', normalScale: 0.6 },
  bark: { tile: 1, color: '#bba48c', normalScale: 1 },
  plaster: { tile: 3, color: '#ffffff', normalScale: 0.5 },
  brick: { tile: 1.6, color: '#ffffff', normalScale: 1 },
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()

/** Shared PBR material for a surface type. `color` tints (siding is a neutral white base). */
export function surface(id: SurfaceId, over: Partial<SurfaceOpts> = {}): THREE.MeshStandardMaterial {
  const o = { ...DEFAULTS[id], ...over }
  const key = `${id}|${o.tile}|${o.color}|${o.roughness}|${o.normalScale}|${o.envMapIntensity}`
  let m = matCache.get(key)
  if (m) return m
  const rep = 1 / o.tile
  const arm = loadTex(`${id}_arm.jpg`, false, rep)
  m = new THREE.MeshStandardMaterial({
    map: loadTex(`${id}_diff.jpg`, true, rep),
    normalMap: loadTex(`${id}_nor.jpg`, false, rep),
    normalScale: new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1),
    aoMap: arm,
    aoMapIntensity: 0.9,
    roughnessMap: arm,
    metalnessMap: arm,
    roughness: o.roughness ?? 1,
    metalness: 1, // multiplied by arm.b (≈0 for all of these)
    color: o.color ?? '#ffffff',
    envMapIntensity: o.envMapIntensity ?? 1,
  })
  m.name = `surface:${id}`
  matCache.set(key, m)
  return m
}

/* ───────────── non-textured physical materials ───────────── */

const phys = new Map<string, THREE.Material>()

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = phys.get(key) as T | undefined
  if (!m) {
    m = make()
    m.name = key
    phys.set(key, m)
  }
  return m
}

/** Automotive paint: metallic flake base + clearcoat. */
export function carPaint(color: string, metallic = true) {
  return cached(`paint:${color}:${metallic}`, () =>
    new THREE.MeshPhysicalMaterial({
      color,
      metalness: metallic ? 0.55 : 0.05,
      roughness: metallic ? 0.38 : 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.15,
    }),
  )
}

export function glass(tint = '#121a20', opacity = 0.86) {
  return cached(`glass:${tint}:${opacity}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: tint,
      metalness: 0,
      roughness: 0.04,
      transparent: opacity < 1,
      opacity,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    }),
  )
}

/** House window: dark interior with sky reflection (opaque, cheap). */
export function windowGlass() {
  return cached('windowGlass', () =>
    new THREE.MeshPhysicalMaterial({ color: '#1d2730', metalness: 0.1, roughness: 0.05, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0 }),
  )
}

export function rubber() {
  return cached('rubber', () => new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.92, metalness: 0 }))
}

export function plastic(color = '#1b1c1e', roughness = 0.65) {
  return cached(`plastic:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }))
}

export function metal(color = '#c9ccd0', roughness = 0.25) {
  return cached(`metal:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 1 }))
}

export function paint(color: string, roughness = 0.7) {
  return cached(`paint-matte:${color}:${roughness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }))
}

export function emissive(color: string, intensity: number) {
  return new THREE.MeshStandardMaterial({ color: '#111', emissive: color, emissiveIntensity: intensity, roughness: 0.3 })
}

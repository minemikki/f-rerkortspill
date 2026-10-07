# Visual pipeline (benchmark: S1 «Hvem kjører først?»)

S1 (`boliggate-kryss`) and the landing hero use the new pipeline. S2–S5 still use the
classic stylised environments. They play unchanged and already get the new car. They
move over one environment at a time using the same kit (see *Migrating a scene*).

## Building blocks (`src/three/render/`)

| Module | What it gives you |
|---|---|
| `quality.ts` | Three tiers (`high` / `medium` / `low`): DPR, shadow map size, post FX, AO, bloom, anisotropy, foliage density. Force one with `?quality=high\|medium\|low` (`?hq` = high). `FrameGuard` steps down a tier when FPS stays under 34. |
| `materials.ts` | `surface(id)` returns one shared PBR material per surface type (asphalt, pavement, granite, grass, gravel, siding, roof_dark, roof_red, concrete, bark). Textures are Poly Haven CC0 (diffuse + normal + ARM). Also `carPaint`, `windowGlass`, `metal`, `plastic`, `paint`. |
| `uv.ts` | World-space UVs **in metres** (`boxUV`, `groundPlane`, `worldBox`). One material tiles correctly on any mesh, so `MergeStatic` can merge a whole street into a few draw calls. |
| `Atmosphere.tsx` | HDRI image-based lighting (PMREM), with the HDRI's sun disc clamped out so that the directional light is the only sun and the only shadow caster. Photographic sky backdrop (4k on high, 2k otherwise). Sun aligned with the HDRI sun. Texel-snapped shadow frustum that follows the camera. Distance haze. |
| `PostFX.tsx` | Restrained chain: N8AO (high only), bloom for bright emissives only (high only), AgX tone mapping, light grading, vignette, SMAA. No depth of field, chromatic aberration or film grain in gameplay. |
| `vegetation.tsx` | Card trees (oak, birch, spruce) generated at load, with tapered PBR trunks, alpha-tested leaf clusters, spherical normals and vertex-shader wind. Spruces get crossed silhouette cards, so they read as dense conifers at any distance. Instanced per species and variant. |
| `streetkit.tsx` | Road wear overlay (kerb grime, tyre polish, crack sealing, patches), granite kerbs and rounded corner kerbs, paved corners, drains, manholes, street lights, mailbox stands, utility cabinet, bins, organic hedges, merged picket fences, Norwegian timber house builder (`NorHouse`), and macro colour variation to break up tiling. Also `ForestHills` (forested terrain ring). |
| `vehicles.tsx` | Procedural compact hatchback (4.25 × 1.79 m, real wheelbase and wheel size): body built from Chaikin-smoothed side profiles, tapered glasshouse with inset glass, Norwegian-style number plates, separate brake, indicator and head-light materials, and an IBL fallback for the classic scenes. |
| `BenchmarkWorld.tsx` | Composes Atmosphere + environment + PostFX and switches the renderer to AgX. `BENCHMARK_ENVS` lists the migrated environments. |
| `src/dev/AssetLab.tsx` | Dev-only look-dev page (`/#/lab?view=car\|rear\|side\|house\|trees`), shown in benchmark lighting. It is tree-shaken from production builds. |

Assets live in `public/assets/`, with licences in `public/assets/LICENSES.json`. They are
fetched and processed reproducibly by `scripts/assets/fetch_assets.py`, `foliage.py` and
`lawn.py`.

## Camera

* **Driving:** a low, close chase cam (S1: 7.4 m back, 3.1 m up). It pulls back with speed,
  sags forward when braking, widens the FOV slightly with speed and smooths the heading.
* **Decisions:** the director cranes up and swings the look target toward the step's focus
  actors. On desktop the frame slides left so the hazard stays clear of the decision panel.
  On portrait it shifts vertically.
* **Replay:** an educational top-down view with highlight rings (unchanged signature feature).
* **Practice mode:** its own chase cam, plus a head-check view (Q/E or «Se»-buttons) that
  swings ~60° from just above the bonnet.
* `prefers-reduced-motion` turns off camera shake and the speed-dependent camera motion.

## Performance (measured)

Measured with `window.__perf()` (dev). This renders the scene once through the WebGL
renderer, **including the shadow pass and excluding post FX**. Viewport 1280×720, S1 mid-drive.

| Tier | Draw calls | Triangles | Textures | Programs | Shadows | Post FX |
|---|---|---|---|---|---|---|
| high | 222 | 308 k | 94 | 73 | 2048² PCF | AO + bloom + AgX + SMAA |
| medium | 222 | 276 k | 66 | 62 | 1024² PCF | AgX + SMAA |
| low | 145 | 149 k | 56 | 36 | off | off (renderer AgX) |

* Before optimisation the same view cost 286 / 192 calls (high / low). Merging the picket
  fences into the static batch, merging the car body and cabin, putting the brake disc in the
  rim mesh, and sharing the lamp-lens and manhole materials removed about 60 calls.
* The shadow pass is about 75 calls and doubles the triangle count. That is why `low` disables it.
* Post FX on high adds about 10–15 fullscreen passes (N8AO half-res, mip bloom, SMAA). It is
  the largest fill-rate cost and is off on medium/low.
* **Estimated texture memory** (RGBA8 + mips): asphalt 1k ×3 ≈ 16 MB, 9 other surfaces 512² ×3 ≈ 38 MB,
  foliage ≈ 10–15 MB, sky 4k ≈ 45 MB (high) / 2k ≈ 11 MB (medium/low), PMREM ≈ 6–8 MB,
  shadow map 16 MB (high) / 4 MB (medium). Totals: high ≈ 150 MB, medium ≈ 100 MB.
  **The next win is KTX2/Basis texture compression**, which would cut this 4–6×.
* **FPS:** not measurable in this environment (software WebGL / SwiftShader renders about
  1 fps at any tier). Real-device numbers are still **unmeasured**. The adaptive tier system
  exists so that weak phones degrade gracefully. Measuring on a mid-range Android and an
  iPhone is a top-priority next step.
* Bundle: the 3D chunk (three + R3F + postprocessing) is 408 kB gzip and lazy-loaded. The app shell is 159 kB gzip.
* The canvas stops rendering under full-screen overlays (learning loop, result, report).

## Migrating a scene to the benchmark look

1. Build the environment with `surface()`, `groundPlane`/`worldBox`, the street kit and `Trees`.
2. Add its id to `BENCHMARK_ENVS` and route it in `BenchmarkWorld`.
3. Keep the geometry derived from `scenarios/layouts.ts`, and re-run `npx vitest run`
   (actor gap tests) whenever parked cars or furniture move.
4. Screenshot with `?hq` and `?quality=low`, then check draw calls with `__perf()`.

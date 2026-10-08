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

Measured with `window.__perf()` (dev). It renders the scene once through the WebGL renderer,
**including the shadow pass and excluding post FX**, at 1280×720 in S1 mid-drive, with the tier
forced by `?quality=`.

| Tier | Draw calls | Triangles | Textures (GL) | Programs | Shadows | Post FX |
|---|---|---|---|---|---|---|
| **Phase 2 final** high | 222 | 308 k | 94 | 73 | 2048² PCF | AO + bloom + AgX + SMAA |
| **Phase 2 final** medium | 222 | 276 k | 66 | 62 | 1024² PCF | AgX + SMAA |
| **Phase 2 final** low | 145 | 149 k | 56 | 36 | off | off |
| **Phase 3** high | 271 | 428 k | 136* | 81 | 2048² PCF | AO + bloom + AgX + SMAA |
| **Phase 3** medium | 255 | 384 k | 107* | 70 | 1024² PCF | AgX + SMAA |
| **Phase 3** low | 146 | 202 k | 95* | 40 | off | off |

\* The GL texture count includes the 1×1 KTX2 placeholders (4 bytes each), so it is not
comparable to the phase-2 column. Real texture memory is in the KTX2 table below.

What phase 3 added to S1: skinned people (1 call each), a detailed hatch/estate fleet with
driveway cars, garden storytelling (flower beds, shrubs, trampolines, patio sets, stone walls),
porches and steps, curtains and house numbers. A first measurement after adding them gave
**high 316 calls / 487 k tris**. Three trims brought it to the numbers above (the final numbers also include the road-end forest edges):
* trampolines and patio sets moved into the static merge batch (−46 calls);
* driveway cars capped per tier (3 high / 2 medium / 0 low);
* flower beds: fewer, lower-poly blooms, and they no longer cast shadows (−85 k tris in the
  shadow pass).

Low stays at the phase-2 budget (146 calls).

* **Shadow pass (measured by toggling it off):** high 71 calls / 166 k tris, medium 73 calls /
  148 k tris, which is about 26 % of the calls and 39 % of the triangles. That is why low disables it.
* **Post FX (high only):** 10–15 fullscreen passes (N8AO half-res, mip bloom, SMAA). This is the
  largest fill-rate cost.

### Texture compression (KTX2 / Basis Universal)

All 42 surface and foliage textures now ship as KTX2 (ETC1S + mipmaps, normal maps with the
normal-map preset), transcoded in a worker to the GPU's native block format (BC7/BC3, ETC2 or
ASTC). JPG/PNG remain as the fallback (`?ktx2=0`). Pending textures show a neutral 1×1
placeholder (the tint colour, never black). Foliage stays invisible until loaded.

| | JPG/PNG (decoded RGBA8 + mips) | KTX2 (GPU-compressed) |
|---|---|---|
| S1 surface + foliage textures in VRAM | **64.3 MB** | **16.1 MB** (−75 %) |
| Download, all textures | 3.0 MB | 2.7 MB + 0.5 MB transcoder (wasm, cached, 3D only) |
| Quality (PSNR vs. source) | — | asphalt 30.2 dB, brick normal 31.7 dB, plaster 40.5 dB; no visible difference at gameplay distance |

Measured with `__perf().tex` (sums the actual transcoded mip data). With the sky (4k high / 2k
medium), PMREM and shadow maps, the estimated total GPU texture memory is now **≈ 100 MB high /
≈ 50 MB medium** (was ≈ 150 / 100 MB). Rebuild with `scripts/assets/build_ktx2.sh`.

* **FPS:** not measurable here (SwiftShader software WebGL renders about 1 fps on any tier). It is
  **still unmeasured on real phones**, and that is the top-priority next step. The adaptive tier
  system drops a tier automatically when frames are slow.
* **Bundle (gzip):** app shell 163 kB (+4 kB), 3D vendor chunk (three + R3F + postprocessing)
  408 kB, lazy-loaded; GameScene 50 kB; PracticeScreen 11 kB. KTX2Loader adds ~6 kB to the 3D
  chunk.
* The canvas stops rendering under the result screen. Behind the learning loop it keeps
  rendering the slow orbit of the scene, on purpose ("never leave the game").

## Migrating a scene to the benchmark look

1. Build the environment with `surface()`, `groundPlane`/`worldBox`, the street kit and `Trees`.
2. Add its id to `BENCHMARK_ENVS` and route it in `BenchmarkWorld`.
3. Keep the geometry derived from `scenarios/layouts.ts`, and re-run `npx vitest run`
   (actor gap tests) whenever parked cars or furniture move.
4. Screenshot with `?hq` and `?quality=low`, then check draw calls with `__perf()`.

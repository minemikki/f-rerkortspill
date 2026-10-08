# Three.js vs Unreal: engineering assessment

Written after the S1 visual benchmark. Nothing was migrated.

### 1. Is Three.js currently the actual visual bottleneck?

**No.** The jump from the old S1 to the benchmark S1 used only standard Three.js features:
HDRI IBL (PMREM), PBR textures, PCF shadows, N8AO, AgX tone mapping and SMAA. The engine did not
limit any feature we needed for a daytime residential street. What still looks "game-like" is
on the asset side: faceted procedural cars, capsule people, card trees, one house typology.
Engine limits only appear in features we do not need yet (see 4).

### 2. Or are the assets, materials and art direction the bottleneck?

**Yes, clearly.** The asset audit grades people, cyclists, van, bus and audio as C, and the car as
B−. Every one of them is an authored-content problem, solvable with glTF assets and the same
renderer. Art direction is now defined (reference image, NORDIC_DAY preset, restrained post FX)
and enforced by shared materials, so new content arrives consistent.

### 3. Can this product reach commercially credible visual quality on the web?

**Yes, for this genre.** It needs:
* authored hero assets (one car, people, cyclists) with LODs;
* KTX2/Basis textures, plus Meshopt/Draco geometry;
* the three adaptive tiers that already exist.

It is a small world (one junction per scenario), a fixed time of day, and mostly a chase or
top-down camera. That is the best case for web rendering. Commercial web 3D at this level is
shipping today (vehicle configurators, browser games). The constraint is budget on mid-range
phones: about 150 draw calls and 150–300 k triangles is already fine, but texture memory must
drop through compression.

### 4. What specific features would become materially easier or better in Unreal?

* **Dynamic global illumination and reflections (Lumen):** night driving, tunnels, wet asphalt
  reflecting headlights, and indirect light from the low winter sun. In Three.js these need baked
  lightmaps or approximations.
* **Virtualised geometry (Nanite):** dense city blocks and photoscanned assets without manual LODs.
* **Weather and particles:** volumetric fog, rain and snow with surface wetness, Niagara particles.
  This becomes relevant for the Vinter and Mørket worlds.
* **Vehicle physics:** Chaos Vehicles, if we ever want real tyre and suspension behaviour.
  The practice mode deliberately avoids this.
* **Tooling:** a world editor, Sequencer for cinematic replays, MetaHumans for people, and the
  asset marketplace.

### 5. Is there currently a CONCRETE technical reason to migrate?

**No.** The product's core needs work on the web today:
* instant start from a link, with no install;
* mobile-first play;
* a deterministic, unit-tested scenario simulation in TypeScript, shared by UI, tests and the
  review page;
* fast content iteration.

Unreal on mobile means native apps (store review, about 200 MB+ downloads) or Pixel Streaming
(per-user GPU cost and latency). Both cost more than the remaining visual gap.

**Revisit the decision only if:**
* night, rain or snow with dynamic lighting becomes a core selling point that baked or
  approximated lighting cannot meet; or
* user research shows the target audience expects console-grade visuals and accepts an install.

Even then, the deterministic engine, content, theory and mastery layers are engine-agnostic and
would carry over.

---

## Phase 3 decision gate (after the city-kit, character and vehicle pass)

### 1. How close did S1 get to the art-direction reference?

About **two-thirds of the way.** Composition, light, materials and street dressing now read as
the same *kind* of image as the reference: HDRI daylight, AgX, PBR asphalt and paving, granite
kerbs, Norwegian timber houses with porches, curtains and house numbers, gardens, hedges, worn
markings, believable cars. S2–S5 are on the same pipeline, each with its own identity (boliggate,
bygate with bike lanes, small-town main street with zebra crossing, roundabout with bus lay-by).

### 2. What is the remaining gap?

In order of visibility:
1. **People and cyclists.** Procedural skinned mannequins with no face, hair or cloth detail.
2. **Vehicle detail up close.** Panel shaping, headlight internals, interiors.
3. **Micro-detail and density.** Clutter, decals, foliage variety, close-up tree branches.
4. **Lighting subtlety.** Soft GI bounce and contact shadows, which the reference fakes or bakes.

### 3. Is the cause assets, art direction, performance budget or Three.js?

* **Assets: about 70 %.** Items 1–3 are authored content: rigged characters, modelled cars,
  decals, species trees.
* **Performance budget: about 20 %.** Mid-range phones cap draw calls, shadows and post FX. That is
  why medium drops AO and bloom and low drops shadows.
* **Art direction: about 10 %.** It is defined and enforced. The remaining work is small
  colour/value tuning.
* **Three.js: about 0 %** for this daytime, small-world genre. Nothing in the gap needs a renderer
  feature that Three.js lacks. Baked AO / lightmaps for item 4 are standard in Three.js.

### 4. Could another Three.js pass close most of the gap?

**Yes, if it is an asset pass, not another procedural pass.** Procedural geometry is now at
diminishing returns, especially for humans. Buying or commissioning rigged characters (see
`ASSET_AUDIT.md`) and 2–3 glTF cars, and dropping them into the existing node contract, closes
items 1–2. Baked AO for the static batch closes most of item 4. Estimated: one focused asset
sprint, plus integration that the pipeline (KTX2, tiers, MergeStatic) already supports.

### 5. Is there a concrete reason to migrate now?

**No.** None of the four gap items is engine-bound. Migrating would throw away instant web
start, mobile reach and the tested deterministic simulation, and still leave the same asset
bill. The revisit triggers above (night/rain/snow with dynamic lighting as a core feature;
users accepting an install for console-grade visuals) have not occurred.

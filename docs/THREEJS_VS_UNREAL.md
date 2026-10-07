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

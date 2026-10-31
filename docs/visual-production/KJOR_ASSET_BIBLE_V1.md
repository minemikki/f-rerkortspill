# KJØR — Asset Bible V1 · S2 Ballen

**Status:** Visual concept / production specification. **Not** production-ready 3D geometry, textures, exact orthographic projections, or evidence of visual parity in Unreal.

## Mission
Use the existing Unreal Engine `MyProject` and existing S1–S5 scenario framework. Upgrade the visual fidelity through a non-destructive isolated test, then transfer validated rendering, materials and meshes to existing environments. Preserve S1/S2 frozen timing, geometry, interaction, scoring, replay and test baselines.

## Visual reference
`KJOR_ASSET_BIBLE_OVERVIEW.png` accompanies this document. It is a concept board, not a 3D model. Images generated independently do **not** guarantee the same topology, dimensions or camera geometry; this must be solved in actual meshes.

### Identity
- Norwegian coastal residential neighborhood; everyday credible proportions
- Warm golden-hour sky, restrained contrast and atmospheric depth toward fjord
- Dark slate/navy and signal yellow KJØR UI
- Wet road where appropriate, with recoverable road texture (not white clipped glare)
- Realistic characters with readable silhouettes, especially ball/child hazard

## Current asset and architecture reality
- Existing cream player SUV, blue right-side SUV, and red parked sedan were imported from commercially permitted CC BY models in earlier work. Review `SourceArt/THIRD_PARTY_ASSETS.md` before using or redistributing.
- Do **not** delete these. White Volvo-like station wagon on the board is a *visual direction*, not an instruction to swap a licensed asset blindly.
- Existing S2 event timings and hazard visibility are frozen. Do not relocate actors or change occlusion unless it is proven equivalent in regression tests and explicitly approved.
- High quality can prioritize showcase stills; Laptop remains playable and hazards must remain visible.

## Asset production hierarchy

### 01 · Player car (top priority)
**Target:** understated premium light cream/white family SUV / estate. Photorealistic but ordinary Norway traffic, not a concept supercar.

**Required actual 3D deliverables** (from one source mesh):
- front, rear, left, right true orthographic renders
- top true orthographic render
- front 3/4 and rear 3/4 renders
- cockpit driver-eye, steering wheel, instrument cluster, windscreen view
- exact measured bounds in meters and wheel center locations
- paint, rubber, glass, lamp, chrome, wheel material breakdown
- working front/rear lights and indicators, brake lights, separate wheel rotation
- LODs and practical texture sizes (2K default)

**Rule:** Do not synthesize a new mesh from separate AI perspective illustrations and claim it is identical. Compare these views against existing SUV asset first; then choose material upgrade, licensed replacement or modeled changes.

### 02 · Child and ball
- Natural child proportions, age-appropriate ordinary clothing; cap/hood only if appropriate
- Front/back/profile/3/4 poses generated from one consistent rig
- Idle/turn/look/run/stop animation; foot-to-ground alignment
- Red/white approximately 30 cm ball visible against road surface
- Preserve original S2 hidden-before-reveal logic; no graphic collision

### 03 · Other participants
- Blue SUV; red sedan; adult pedestrian; cyclist on normal commuter bicycle; jogger; bus
- Real dimensions, believable materials and natural animation
- Pick high-fidelity hero replacements only where close-up captures prove need

### 04 · Norwegian environment kit
- 2–3 consistent modular house styles with believable siding, roofs, foundation and windows
- Matching fences, hedges, stone walls, mailboxes, bins, lamp posts, garage doors
- Authentically shaped/placed Norwegian traffic signs and road markings, verified separately
- Birch, maple, fir; low ground-cover variety, believable garden planting
- Asphalt surface with micro-normal/roughness and restrained wet-patch mask; gravel shoulders
- Distant fjord/city/hills via cheap terrain and atmospheric perspective

## Reference camera pack — capture from the same 3D scene
| ID | Shot | Validation purpose |
|---|---|---|
| C01 | Chase, 3/4 slightly elevated behind car | main playable framing |
| C02 | Driver-eye with cockpit | hazard visibility through windscreen |
| C03 | Front 3/4 at 1–1.5 m height | hero vehicle materials and scale |
| C04 | Full side orthographic | body silhouette / wheel spacing |
| C05 | Roof-down 90° | actual scenario geometry and paths |
| C06 | Sidewalk close-up at ball/child | realistic characters, ball scale |
| C07 | High 3/4 replay/X-Ray | sightline/occlusion readability |
| C08 | Street without UI | environment and material evaluation |

## S2 storyboard — no gameplay changes
1. **Approach:** Norwegian neighborhood, realistic sightline to parked car/hedge.
2. **Ball cue:** ball becomes visible before child; naturally readable motion.
3. **Hidden risk:** child is initially occluded; cannot be seen early from canonical player camera.
4. **Reaction:** player brake input; no instructional overlays that reveal the answer too soon.
5. **Child reveal:** character movement and positioning match frozen event times.
6. **Safe response:** avoids conflict and stays controlled.
7. **Late response:** near-miss guardian preserves safe visual presentation.
8. **Review/X-Ray:** demonstrate visibility, hazard timeline and brake point using existing data.

## Visual acceptance criteria
- In the captured runtime, the car is believable from C01–C05, not just one hero still.
- Comparable lighting, wetness and material identity from all camera angles.
- No obvious procedural faceting on any near-field character or hero car.
- No clipped highlights that erase crucial road/hazard details.
- 100% of original S1/S2 deterministic tests still green.
- Laptop remains playable; compare approximate warm FPS before/after.
- All references/licenses documented; no paid or ripped assets.

## Codex workflow — isolated visual proof
1. `git status` / protect user changes; read `KJOR_CODEX_HANDOFF.md`, `S1_FROZEN.md`, `S2_FROZEN.md`, and latest reports.
2. Inspect current imported car and S2 site; record true vehicle scale and geometry.
3. Build a **non-destructive visual test** using the exact current mesh and scene first; render C01–C08 with fixed cameras.
4. Compare C01–C08 to the Asset Bible. Rank mismatches: asset geometry vs material vs lighting vs rendering.
5. Improve one high-impact category at a time, recapture exact cameras, track perf and disk.
6. Do not edit frozen S2 choreography/score/timing. Preserve benchmark captures.
7. Report what was genuinely matched, what remains impossible using current assets, and licensed/free alternatives.
8. Stop for owner review before applying improvements across S1–S5.

## Important
A 2D turnaround board is a *design brief*, not a free downloadable `.fbx`/`.glb` or production-ready mesh. The accurate cross-angle test begins when Codex renders an actual consistent 3D asset in Unreal. Our goal is to improve the visuals **without discarding the functioning game**.


## Production decision — one real car, not mixed concept models
The illustrated boards show **visual exploration** (one uses a Volvo V60 estate aesthetic, another an XC60-style SUV), not a single perfectly consistent 3D car. The existing Unreal imported `MMC Generic Small SUV Car` in cream is the **canonical starting mesh**. Do not interpret any generated branded concept sheet as a mesh replacement instruction. Existing importer analysis previously estimated the generic small SUV at approximately **4.19 m length**; Codex must check current bounds in the project before relying on this value. Wheels, body height, track and cockpit geometry must come from the actual asset, not guessed specifications.

### Eight-view photography capture from existing canonical mesh
Capture the *same asset and unchanged transform/material state* on a neutral turntable stage. No generative reinterpretation between angles.
- **V01** straight front orthographic: symmetry, grille, DRL, windshield.
- **V02** straight rear orthographic: plate, rear lamps, hatch.
- **V03** straight left orthographic: wheelbase, body side, wheels.
- **V04** straight right orthographic: confirm door/mirror differences.
- **V05** true top orthographic: roof geometry, wheel placement.
- **V06** front-left 45° perspective: hero asset read.
- **V07** rear-right 45° perspective: rear material/shadow read.
- **V08** driver-eye cockpit perspective: glass, road visibility and dashboard.

Record focal length/projection, camera rotation, vehicle transform, UE units and capture size for each. A separate 360° turntable video is a bonus, not a replacement for eight views.

## Evidence vs target
`CURRENT_UNREAL_S1_HERO_BEFORE_AFTER.png` is an older actual Unreal capture supplied during previous development, not a newly taken baseline. Codex must make fresh captures from the current build before claiming improvement. Current model's licenced imported mesh must be inspected; no reliable direct asset topology, interior dimensions or source files were attached in this chat.

## Images in this package
- `KJOR_ASSET_BIBLE_OVERVIEW.png`: initial broad character/vehicle/environment conceptual art.
- `KJOR_S2_ASSET_MATERIALS_BOARD.png`: concept vehicle, cockpit, material and neighborhood board.
- `KJOR_S2_ASSET_STUDIO_BOARD.png`: additional visual exploration of SUV exterior/interior/people/environment.
- `CURRENT_UNREAL_S1_HERO_BEFORE_AFTER.png`: older in-engine before/after evidence for contrast with aspirations.

## Acceptance rules for implementation
1. First create eight actual current-mesh captures before editing rendering.
2. Preserve imported meshes, source assets, licenses, frozen scenarios, regression baseline, user changes and packaged alpha.
3. Make a new `VisualProof_S2` scene or test mode; avoid changing canonical S2 traffic logic or geometry.
4. Prioritize visual improvements that truly translate across angles (textures, roughness, reflections, lighting, silhouette, cockpit), not a camera-specific trick.
5. Re-run deterministic tests and measure Laptop/High warm FPS after shared changes.
6. Show same-camera before/after and exact eight-angle turntable as evidence. Stop for approval before applying across all S1–S5.
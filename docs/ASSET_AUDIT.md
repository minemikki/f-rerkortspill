# Asset quality report (phase 3)

Grades: **A** = production quality · **B** = credible prototype, could ship in a beta · **C** = must be replaced before a commercial launch.
Graded against the art-direction reference (premium Nordic driving game) at gameplay camera distance, not in close-up.
Everything below is procedural code or CC0. No asset has a licence restriction.

| Asset | Grade | Today (after phase 3) | Exact next requirement (for every C) |
|---|---|---|---|
| Player car | **B** | Extruded, Chaikin-smoothed hatch profile, clearcoat paint, inset glass, L-shaped tail lights, working brake/indicator lights, Norwegian plate, pitch/roll. No interior. | glTF compact hatch, LOD0 25–40 k / LOD1 8 k / LOD2 2 k tris, 2K PBR atlas + emissive mask, nodes `wheel_*`, `brake_*`, `ind_*`, `head_*`, simple interior. |
| Traffic cars | **B** | Hatch + estate body types, 5 paints, unique plates per id, parked variants on driveways. | 2 more body types (compact SUV, EV saloon) on the same node contract. |
| Bus | **B−** | 12 m low-entry city bus: extruded body, two door sets, wheel arches, destination sign «31 Sentrum via Torget». Tinted glass hides the missing interior. | Authored bus with interior (seats, poles), livery slot, articulated-door animation. |
| Van | **B** | 5.4 m panel van, sliding-door seam, plate, no branding. | Authored van with signage slot and opening rear doors (for the S2 obstruction storytelling). |
| Adult pedestrian | **C** | Procedural skinned mesh (16 bones, one draw call). Smooth lathe body, coat/trousers/shoes in vertex colour, procedural walk/idle/look/wait/step. Reads as a person at distance, mannequin-like up close. No face or hair detail. | 4 rigged adults (m/f, senior, teen), 5–8 k tris, 1K texture, Nordic autumn clothing. Mixamo-compatible skeleton. Clips: idle, walk, look L/R, wait-at-kerb, step-off, recoil, phone. |
| Child | **C** | Same rig scaled to child proportions, bright outfits, ball-chase run. | 2 rigged children (6–9 y) with run, stop-short and look-back clips, and a cap/hood variant. |
| Jogger | **C** | Adult rig, shorts outfit, jog gait. | Jogger model with sportswear texture plus jog and look-over-shoulder clips (can share the adult skeleton). |
| Cyclist | **C** | Skinned rider on a procedural city bike with 2-bone leg IK (pedals turn with speed), helmet. No glowing marker during observation. | Rigged cyclist + city bike + e-bike, clips: pedal (speed-synced), coast, look-back, hand signal L/R, foot-down stop. |
| Trees | **B** | Instanced card trees (oak, birch, spruce) with wind; KTX2 foliage. | 4 authored species with branch cards + LODs + octahedral impostors. |
| Shrubs / hedges | **B−** | Hedge boxes with leaf texture, rounded shrub blobs, flower beds (one vertex-coloured mesh). | Card-based shrub set (3 species) with LOD, and a clipped-hedge model with a real leaf silhouette on top. |
| Houses | **B** | Norwegian timber houses: 10 siding colours, porch, 3 steps, railing, house numbers, curtains, chimneys, gutters. City blocks in plaster/brick with surface-mounted windows, shopfronts, signage. | Modular kit with 3–4 typologies (enebolig, rekkehus, funkis, 4-storey bygård), garages and carports. |
| Road | **B+** | PBR asphalt (KTX2), macro variation, wear overlay, worn markings, drains, manholes. | Decal atlas (patches, oil, sand), parallax asphalt on high. |
| Kerbs / sidewalks | **B+** | Granite kerbs with rounded corners, paving, lowered kerbs and tactile pads at the S4 crossing. | Lowered kerbs at every driveway and tactile paving at S5. |
| Street furniture | **B** | Lights, bus shelters, benches, bike racks, bollards, planters, litter bins, tree grates, mailboxes, wheelie bins. | Authored low-poly set matching Norwegian municipal models. |
| Signs | **B** | Regulation-checked set (202, 362, 512, 516; markings 1002/1004/1008/1012/1022/1024), see `SIGNAGE_AUDIT.md`. Canvas textures. | SVG-exact sign atlas from skiltforskriften geometry, retroreflective material, real mounting heights. |
| Terrain | **B−** | Forested hill ring + instanced spruce belts. | Heightmap terrain with photoscan forest texture and an impostor forest belt. |
| Sky | **B** | CC0 HDRI (Poly Haven) with clamped sun, 4k high / 2k medium. | An overcast and an evening HDRI for variety. |
| Animations | **C** | Procedural gaits and poses; vehicles have wheel spin, steering, pitch/roll and lights. | Comes with the human/cyclist assets above (mocap-quality clips). |
| Sound | **C** | Procedural WebAudio: 4-partial engine with gears and load, tyre noise, brake scrub, ambience bed, UI set, replay «rewind». The voice uses the browser's Norwegian TTS, with a text fallback. | Recorded engine loop set (idle / 2k / 4k rpm × on/off load), tyre roll, indicator relay, ambience (street, birds, distant traffic), and about 40 recorded Norwegian instructor lines (IDs already in `src/audio/voice.ts`). |

**Biggest lever now:** the humans, children and cyclist (all C). The environment is at B/B+
and the cars at B, so the vulnerable road users are what most give away «prototype».
Authored, rigged characters are the single purchase that closes most of the remaining gap.

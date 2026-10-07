# Asset bottleneck report

Grades: **A** = usable for production direction · **B** = acceptable prototype · **C** = must be replaced.
Graded against the S1 benchmark and the art-direction reference (premium Nordic driving simulator).

| Category | Grade | Today | What it takes to get to A |
|---|---|---|---|
| Player car | **B−** | Procedural hatchback (vehicles.tsx). Correct proportions, wheels/tyres, paint with clearcoat, inset glass, working brake lights and indicators, Norwegian plates, body pitch and roll. Faceted, with no interior and no headlight internals. | An authored glTF compact hatchback: LOD0 25–40 k tris, LOD1 8 k, LOD2 2 k; 2K PBR atlas plus an emissive mask; separate nodes `wheel_FL/FR/RL/RR`, `brake_L/R`, `ind_L/R`, `head_L/R`; a simple interior (seats, dashboard, wheel); CC0/CC-BY or purchased licence. |
| Traffic vehicles | **B− (cars) / C (van, bus)** | Cars reuse the hatchback with paint and plate variation. Van and bus are the old box models (C). | **Needed:** a Transit-class van (white, signage-ready) and a 12 m low-entry Norwegian city bus with livery slot, plus 2–3 extra car body types (estate, compact SUV, EV hatch). Same node contract and LODs as above, about 15–30 k tris each. |
| People | **C** | Stylised capsule people with procedural walk/look poses. | **Needed:** 6–8 rigged low-poly humans (adult m/f, senior, teenager, two children), 5–8 k tris, Nordic clothing for the seasons. Animations: idle, walk, run, phone, look-left/right, wave, recoil, crouch, step-off-kerb. A Mixamo-compatible skeleton so the clips can be shared. |
| Cyclists | **C** | Primitive bike and rider. | **Needed:** a rigged cyclist plus a city bike and an e-bike, a helmet variant and a child on a small bike. Clips: pedal cycle (speed-synced), coast, look-back, hand-signal left/right, stop with foot down. |
| Trees | **B** | Card trees (oak, birch, spruce) with wind, instanced. Convincing at gameplay distance; branch detail is weak close up. | 4 authored species (birch, spruce, pine, rowan) with real branch cards and LODs plus an octahedral impostor for far distances (SpeedTree export or CC0 photoscan). |
| Houses | **B** | Procedural Norwegian timber house: PBR siding in 10 colours, white trims, windows with frames and sills, gutters, downpipes, chimney, porch. One typology. | A modular kit of 3–4 typologies (1950s enebolig, 70s split-level, rekkehus, modern funkis), with porches and steps, door hardware, curtains (window interior maps), garages and carports. |
| Road | **B+** | PBR asphalt with macro variation and a wear overlay (kerb grime, tyre polish, crack sealing, patches), drains and manholes. | A decal atlas (oil stains, patches, wet patches, sand in spring), markings for the other scenes as decals, and parallax-occlusion asphalt on high. |
| Curbs / sidewalks | **B+** | Granite kerbs with rounded corners, paved sidewalks, rounded corner paving. | Lowered kerbs at driveways and crossings, tactile paving and gutter strips. |
| Street furniture | **B** | Street lights, mailbox stand, utility cabinet, bins, drains, manholes, picket fences, hedges. | Authored low-poly versions with real details (lamp type used by Norwegian municipalities, Posten mailbox stand), bus stop and bike rack. |
| Signs | **B−** | Canvas-texture signs (30-sone, gangfelt, vikeplikt, buss) and SVG signs in theory questions. | An exact Norwegian sign set from Skiltforskriften geometry (SVG to texture atlas), retroreflective material, correct pole and back-plate hardware and mounting heights. |
| Background terrain | **B−** | Forested hill ring with procedural canopy texture, spruce belts, HDRI sky. | Heightmap terrain with photoscan forest textures, an impostor forest belt, and a mountain silhouette tile matching Norwegian topography (e.g. derived from Kartverket DTM). |
| Animations | **C (humans) / B (vehicles)** | Vehicles have wheel spin, pitch and roll, brake lights and indicators. People use procedural poses. | Come with the people and cyclist assets above; plus vehicle steering-wheel animation and door open/close for the practice mode. |
| Audio | **C** | Procedural WebAudio placeholders. | See *Audio architecture* in `LEARNING_SYSTEMS.md`: recorded engine loops, tyre noise, ambience, footsteps, bike, UI set, and Norwegian instructor VO (about 40 lines). |
| S2–S5 environments | **C (vs benchmark)** | The classic stylised low-poly look. They work, but are visibly below S1. | Migrate with the street kit (bygate, gangfelt, rundkjøring, boliggate). That is mostly composition work; the kit already exists. |

**Biggest single lever:** people and cyclists. Vulnerable road users are the core of the
curriculum, and they are now the least credible thing on screen next to the S1 street.

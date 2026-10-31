# KJØR — CODEX HANDOFF / PRODUCT + VISUAL DIRECTION

**Status:** Continue from the current repository state. Do not restart completed work.
**Primary goal:** Turn KJØR into Norway's most compelling digital driving-learning product: visually premium, highly realistic, genuinely useful for learning to drive, and credible enough that driving schools could recommend it as supplementary training.

## 1. Core product vision

KJØR is not just a theory quiz and not just a driving game.

The product philosophy is:

> **Ikke bare lær svaret. Lær å se situasjonen.**

The intended learning loop is:

**SE → FORSTÅ → HANDLE → FEIL / SUKSESS → REPLAY → FORSTÅ HVORFOR → PRØV IGJEN → HUSK**

Long-term product surfaces:
- LÆR
- KJØR
- TEORI
- TEST
- DAILY
- KJØR BRAIN
- PROGRESJON
- Future driving-school/instructor workflow

Strategic standard:

> **More fun than a theory app. More educational than a normal driving game. Serious enough that a driving instructor could recommend it.**

## 2. Current implementation state

### S1 — frozen
S1 teaches right-of-way / høyre-regelen.
It has deterministic timing, traffic logic, decision UI, retry, replay, scoring, result screen, review/X-Ray concepts, and a frozen regression benchmark.

### S2 — frozen
S2 “Ballen” teaches anticipation:
- ball appears first
- hidden child follows
- reaction timing is measured
- near-miss guardian prevents realistic child collision
- replay/X-Ray explains the lesson
- structured metrics feed future mastery/theory recommendations

### S3 / S4 / S5
Phase 3 expanded the reusable framework with:
- Choice steps
- Hazard/reaction steps
- Spot steps
- curved paths
- multiple actors
- indicators and cues
- replay/timeline markers
- metrics
- Traffic X-Ray primitives
- roundabout/multi-step support
- local World 1 progression
- save/load
- scenario registry
- automated tests/capture harnesses

S3: cyclist/observation.
S4: pedestrian prediction/braking/follower behavior.
S5: multi-step suburban roundabout boss with multiple traffic actors, bus, jogger, scanning and decision traps.

## 3. Playable Alpha

Phase 4 produced a standalone Windows alpha.

Expected executable:
`Saved/Builds/KJOR_Alpha/Windows/KJOR.exe`

Shell includes:
- onboarding
- Home
- World 1
- scenario cards
- Progress
- Settings
- loading transitions
- scenario launch/return
- World completion
- local save
- quality profiles

Quality profiles:
- Laptop
- Balanced
- High

Development Iris Xe warm performance was roughly:
- Laptop: ~28–50 fps
- High: ~11–13 fps

## 4. Regression principle

Existing completed behavior is valuable and must be protected.

Before shared framework changes:
- inspect current tests
- preserve frozen behavior
- rerun relevant suites
- do not change expected frozen behavior to make regressions pass

Detect what already exists and continue from the first genuinely unfinished task.

## 5. Visual ambition

Visual quality is now a major priority.

KJØR should feel like a **premium modern driving game** while remaining believable Norwegian road training.

Do not aim for:
- generic Unreal demo
- low-poly educational software
- cartoon racing game
- sterile government training software
- obvious AI visual slop

Aim for:
- realistic Norwegian roads
- premium cars
- rich vegetation
- believable houses/neighborhoods
- excellent lighting
- crystal-clear rendering
- strong road/material micro-detail
- realistic weather/atmosphere
- cinematic but educational cameras
- cohesive premium UI
- high-quality people/cyclists/pedestrians
- distinctive KJØR identity

Mental target:

**premium racing-game presentation + Norwegian realism + driving-school precision**

Do not copy another game directly.

## 6. Visual design before implementation

Major scenes should not be invented ad hoc in code.

Use this visual design pipeline:
1. Define learning objective
2. Define scenario geography
3. Create top-down map storyboard
4. Create camera storyboard
5. Create hero visual target
6. Create environment/material references
7. Define vehicle/pedestrian positions
8. Define visibility/occlusion
9. Define lighting/weather
10. Implement

Recommended docs:
- `Docs/Visual/WORLD_01_ART_DIRECTION.md`
- `Docs/Visual/WORLD_01_MAP_STORYBOARD.md`
- `Docs/Visual/WORLD_01_CAMERA_STORYBOARD.md`
- `Docs/Visual/WORLD_01_ASSET_LIST.md`
- `Docs/Visual/WORLD_01_MATERIAL_TARGETS.md`
- `Docs/Visual/WORLD_01_LIGHTING_TARGET.md`

Scenario folders:
- `Docs/Visual/S01/`
- `Docs/Visual/S02/`
- etc.

## 7. Storyboard requirement

For every scenario define:

### A. Top-down scenario map
Show:
- player start
- player route
- other traffic routes
- pedestrian/cyclist routes
- critical occluders
- trigger zones
- decision/reaction points
- ideal braking point
- conflict point
- replay camera positions

### B. Player-eye storyboard
Frames:
1. Approach
2. First clue
3. Risk becoming readable
4. Critical decision
5. Correct behavior
6. Wrong/late behavior
7. Replay/X-Ray
8. Result/lesson

### C. Cinematic/marketing storyboard
At least:
- hero chase
- driver-eye
- wide establishing shot
- close hazard shot
- replay shot
- premium UI + world composition

## 8. Map/world philosophy

Do not build a giant open world purely for spectacle.

Build high-density authored training spaces that appear larger than they are.

Use:
- shared Norwegian neighborhood kit
- connected sites/districts
- clever vistas
- terrain layers
- fjord/city/mountains where relevant
- controlled scenario branches
- believable continuity

World 1 should feel like one coherent Norwegian world, not five disconnected test rooms.

Potential future worlds:
- City Center
- School Zone
- Winter/Darkness
- Highway
- Rural Roads
- Complex Intersections

Do not implement future worlds unless requested.

## 9. Norwegian authenticity

The world should visibly feel Norwegian:
- road widths/geometry
- gravel shoulders
- curb styles
- signs and markings
- Norwegian houses
- hedges/garden fences
- mailboxes
- lamp posts
- bus stops
- parked-car behavior
- road wear
- wet weather
- Nordic vegetation
- fjord/terrain silhouettes
- residential scale

Avoid generic American suburb / stock European city appearance.

## 10. Cars

Cars are hero assets.

Requirements:
- real-world scale
- believable paint/glass
- correct wheel proportions
- brake lights/indicators/DRLs
- suspension/body response where appropriate
- good contact shadows
- plausible Norwegian plates where needed
- believable cockpit visibility

Do not use ripped assets.

## 11. Characters

Prototype procedural humans are acceptable only where visually distant.

Future visual work should prioritize:
- believable adult pedestrian
- believable child
- believable cyclist
- jogger
- ordinary Scandinavian clothing
- natural proportions
- readable poses
- animation quality over facial detail

No gratuitous injury.

## 12. Rendering/clarity

Audit before major asset replacement:
- AA/upscaling
- render scale
- motion blur
- DOF
- bloom
- exposure/local exposure
- fog/atmosphere
- texture streaming
- mip bias
- anisotropic filtering
- roughness
- foliage temporal stability
- contact shadows

Gameplay clarity beats cinematics.

## 13. UI/UX identity

KJØR UI:
- dark / near-black
- warm white
- signal yellow
- restrained premium accents
- strong typography
- clean Scandinavian layout
- minimal clutter
- clear hierarchy
- game-quality motion

Avoid:
- generic Unreal UI
- excessive glassmorphism
- rainbow dashboards
- childish gamification
- AI-SaaS dashboard aesthetics

## 14. Learning quality

Every scenario should answer:
1. What should the learner notice?
2. Why?
3. When should they react?
4. What behavior is safe?
5. What mistake can we measure?
6. How does replay explain it?
7. Which theory concept links to it?

Prefer measurable behavior:
- reaction timing
- brake start
- clearance
- speed adaptation
- observation
- positioning
- decisions
- repeated mistakes

## 15. Future theory / learning engine

Do not copy proprietary competitor questions.

Future original KJØR theory should use:
- authoritative Norwegian sources
- reviewed original wording
- structured metadata
- theory ↔ scenario links
- question families
- mistake tags
- mastery skills

Competitive advantage:

**Theory weakness → playable scenario**
and
**Scenario mistake → targeted theory**

## 16. Driving-school ambition

KJØR should eventually be credible enough that an instructor says:

> “Use KJØR between lessons.”

Future architecture should support:
- learner skill summaries
- repeated mistakes
- scenario performance
- theory topic performance
- progress over time
- future assigned practice

Do not claim current endorsement.

## 17. Collaboration model

### ChatGPT / visual design
Primary role:
- art direction
- visual concepts
- storyboard images
- world/map concepts
- UI concepts
- camera composition
- visual critique
- reference boards
- before/after targets

### Codex
Primary role:
- repository understanding
- Unreal/C++ implementation
- architecture
- scenario engine
- tests
- packaging
- performance
- integrating approved visual direction
- documenting implementation decisions

**Codex should not invent a completely new final visual direction without an approved storyboard/reference.**

## 18. Immediate next objective

First:
1. Read current repository efficiently.
2. Read all freeze/checkpoint/handoff docs.
3. Run `git status`.
4. Identify current build/test state.
5. Do NOT redo completed phases.
6. Produce a concise repository map/current-truth summary.

Then create a **Visual Design Planning Pack** — docs only, no destructive gameplay changes.

It must define:
- current visual strengths
- current visual weaknesses
- highest-impact art upgrades
- World 1 coherent map concept
- S1–S5 location relationships
- storyboard requirements
- asset priorities
- character priorities
- rendering/clarity priorities
- camera priorities
- Laptop/Balanced/High target levels
- what stays procedural
- what deserves hero assets

Do not begin a massive rewrite before visual plan approval.

## 19. Anti-redo rule

CRITICAL:
- Do not restart S1.
- Do not restart S2.
- Do not recreate the scenario framework.
- Do not redo Phase 3.
- Do not rebuild the Phase 4 shell from scratch.
- Do not repeat old-repo deep reads already preserved in handoffs.
- Do not replace working systems simply because a different architecture is possible.

Prefer:

**inspect → understand → extend**

## 20. Product north star

KJØR should make a learner think:
> “This is actually fun.”

A parent:
> “This looks serious and useful.”

A driving instructor:
> “This teaches the right behavior.”

And screenshots/trailers:
> “Why did learning to drive never look like this before?”

That is the standard.
# Self-critique loop (phase 3)

Method: capture all 18 required views (desktop 1440×900, phone 390×844 @2x, forced tiers
`?quality=high` / `medium`), compare each to the art-direction reference, list what looks
**cheaper** than the reference, fix, recapture. Screenshots: `docs/screenshots/`.

## Desktop: top 10 «still cheaper than the reference»

| # | Problem (seen in) | Status |
|---|---|---|
| 1 | Roads ran out into an empty flat field at the horizon (S1, S2, S4) | **Fixed.** A dense instanced forest edge past each road end (`roadEndForest`), no extra draw calls |
| 2 | Wing mirrors were spheres, which read as toy-like (every car) | **Fixed.** Rounded housings with mirror glass |
| 3 | S5 approach opened onto an empty lawn | **Fixed.** Grocery car park with bay lines and parked cars, extra trees, closer forest edge |
| 4 | S4 decision camera looked through a lamp post | **Fixed.** Lamp moved out of the crane path |
| 5 | «Tap the hazard» (S3/S5) darkened the whole scene, and on desktop the prompt sat over the road | **Fixed.** Lighter vignette, prompt in a left column on desktop |
| 6 | Landing hero rendered black facades while KTX2 textures were transcoding | **Fixed.** Neutral 1×1 placeholders: surfaces show their tint, never black |
| 7 | Sidewalk paving read brown and dirty | **Fixed.** Lighter neutral paving tint |
| 8 | People read as mannequins (no face, hair or cloth folds) | **Open (asset).** Needs rigged characters, see `ASSET_AUDIT.md` |
| 9 | Player car is boxy from the chase camera (flat rear panel, no interior) | **Open (asset).** Needs an authored glTF car |
| 10 | The S3 street canyon sits in building shadow, so the image is low-key | **Open.** Per-scene sun azimuth or a fill light; deliberately not done this pass, to keep one global light rig |

## Mobile: top 5

| # | Problem | Status |
|---|---|---|
| 1 | The progression map had no sense of travel | **Fixed.** The player's car drives the road to the next level (DOM + rAF, ~1.6 s once), light scroll parallax, START tag moved below the node so it never collides with the car. Reduced motion: static |
| 2 | Map world counter overlapped the parallax skyline | **Fixed.** z-order |
| 3 | Practice header subtitle truncates at 390 px («ikke en offis…») | **Open.** Minor. The full text is on the start sheet and the assessment |
| 4 | Medium-tier textures look soft at DPR 2 | **Accepted.** Medium caps anisotropy and drops post FX for phone GPUs |
| 5 | The decision panel covers the lower half on phones | **Checked.** The hazard (car from the right, pedestrian, cyclist) stays in the upper half in every scenario: the director frames the hazard above the panel |

## Not cheap any more (kept)

Lighting and tone mapping (HDRI + AgX), asphalt and kerbs, Norwegian houses with porches,
curtains and house numbers, garden storytelling, worn markings, the replay
(POV → overhead with a two-line caption), the decision UI, the theory and assessment screens.

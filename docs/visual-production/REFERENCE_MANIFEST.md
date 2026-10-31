# KJØR — Image Reference Manifest

**Status:** Text handoff committed to this repo; binary image files need local import from `KJOR_VISUAL_REFERENCES.zip` (shared in the ChatGPT conversation).

## Image inventory

The archive contains the **original full-resolution PNGs** (not thumbnails):

| File | Role |
|---|---|
| `KJOR_ASSET_BIBLE_OVERVIEW.png` | broad S2 vehicle/character/world asset board |
| `KJOR_S2_ASSET_MATERIALS_BOARD.png` | SUV, cockpit, material and neighborhood exploration |
| `KJOR_S2_ASSET_STUDIO_BOARD.png` | alternate SUV/interior/character design exploration |
| `CURRENT_UNREAL_S1_HERO_BEFORE_AFTER.png` | *older actual Unreal screenshot* for comparison, not final live baseline |
| `kjør_world_1_master_map.png` | concept master map of World 1 (NOT current UE coordinates) |
| `kjør_scenarios_storyboard.png` | S1–S5 storyboard concept |
| `kjør_norske_kjøretøy_og_figurer.png` | vehicles and characters concept board |
| `kjør_norwegian_driving_experience_ui.png` | Home/HUD/X-Ray/result UI concept |
| `kjør_norwegian_streets_golden_hour.png` | Norwegian wet-road lighting/environment target |
| `norsk_kjør_storyboard_fem_trafikksituasjoner.png` | additional five-scenario storyboard |

Also contains `REFERENCE_HASHES.txt` (SHA-256 of each PNG).

## Where to import

Unpack the archive **at the repository root**, preserving the internal paths. Files belong in:

`docs/visual-production/references/`

For a local Windows clone, open PowerShell in the cloned repository:

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\KJOR_VISUAL_REFERENCES.zip" -DestinationPath . -Force
git status --short
```

The `-Force` option overwrites matching reference PNG names only, not gameplay source. Check `git status` before committing.

Then:

```powershell
git add docs/visual-production/references
git commit -m "docs(kjor): add visual reference boards"
git push
```

Use Codex to execute this after checking the archive actually exists.

## Critical truthfulness rules

- These boards are **AI-generated concept illustrations**. They are not consistent 3D assets, orthographic mesh proofs, legally licensed Volvo vehicle meshes, exact street maps, or verified road signs.
- Generated images sometimes show different Volvo-like models and imprecise Norwegian lettering. Do not copy model branding or errors blindly.
- Actual mesh scale, road dimensions, actor locations, hazard timing and accuracy must come from the real Unreal/Three.js project and real regulatory sources.
- The current Unreal game remains a separate LOCAL project; importing these images to this GitHub repo does not import Unreal code.

# Asset inspection plan

A plan for checking every game image in one pass. **Status (2026-10-21): first pass done, report below. Nothing has been changed yet; fixes wait for approval.**

## What gets inspected

233 PNGs in `src/imgs/`, against 219 `.aseprite` sources in `src/media/photos/sprites/`.

| Folder | What | Notes |
| --- | --- | --- |
| `shop/` | 13 supply icons | also drawn small in the orbit and the minigames |
| `boosts/` | 13 boost icons (new) | made by `scripts/boost-icons.lua` from other sprites |
| `achievements/`, `achievements/games/` | trophies, medals, the 9 minigame medals | |
| `misc/` | coin, heart, bandage, apple, Natal Gem | |
| `room/` | 23 My Room items + 3 animated items (4 frames each) | |
| `skins/`, `gems/` | medkit skins, tap-effect particles, background particles | |
| `stickers/` | 18 stickers | saved copies come from `src/constants/sticker-data.ts` |
| `characters/` | patients and staff, with walk frames | |
| `scenes/`, `hospital/` | rooms, hospital tiers, skies, cars, visitors | large art (320 × 240 since 2026-10-21) |
| `medkit.png`, `hospital.png` | the main medkit and the menu hospital | |

## The rules each asset is checked against

1. **Made in Aseprite.** Every game image has a 32 × 32 (or scene-size) `.aseprite` source, and the PNG is its 32× nearest-neighbour export. Today these have no source and need one:
   - `achievements/games/medal_*` (9 minigame medals) and `achievements/trophy_gold`
   - `misc/apple`
   - stickers made from game art: `doctor`, `golden_medkit`, `natal_gem`, `nightingale`, `nurse_pink`, `winged_heart`
   - `skins/dustin_photo` is a photo, so it's exempt
   - the animated room items (`room/aquarium_*`, `lava_lamp_*`, `patient_monitor_*`) have sources, but under `sprites/gems/`. Move them to `sprites/room/` so the paths match.
2. **No missing line pixels.** The outline (a darker shade of the fill, never black) is closed all the way round, with no one-pixel gaps, stray pixels or half-erased edges. Check corners and where two shapes meet.
3. **The item matches its icon.** Wherever one thing is drawn twice, the two must agree in shape, colours and details:
   - shop icon vs. orbit sprite vs. minigame card (syringe, bandage roll, medicines, thermometer)
   - My Room tray tile vs. placed item vs. the Gem Shop listing (aquarium, lava lamp, patient monitor)
   - medkit skin vs. its sticker (golden medkit) vs. its app icon
   - boost icon vs. the sprite it was made from (same shapes, only the colour and the badge differ)
   - patient portrait vs. the ward sprite in My Room
4. **Alignment.** Each 32 × 32 sprite sits centred with the same margin as its siblings, stands on the same baseline (floor items' feet on the bottom row, wall items centred), and has no off-by-one shift between animation frames.
5. **No built-in effect particles.** Sparkles, twinkles and glints drawn into a sprite go: the game adds its own effects (tap bursts, Shine, Sparkles tap effect), and baked-in ones double up or float oddly when the sprite moves. Known so far:
   - the medkit skins (golden, candy, night, crystal): check for sparkle pixels around the case
   - `achievements/trophy_star`: a 4-pixel sparkle top-left
   - `achievements/night_coffee`: three single-pixel twinkles around the mug
   - `achievements/light_off`: check around the bulb
   - (already removed from the boost icons made from these)
   - Keep particles that *are* the asset: `gems/p_sparkle`, `p_heart` and the other particle sprites.

## How the pass runs

1. **Contact sheets.** A script tiles every PNG of a folder at 4× with a pixel grid (ffmpeg `drawgrid`, as used for the room layouts), so each sheet can be reviewed in one look. Matching pairs from rule 3 are placed side by side.
2. **Automatic checks**, one script, report only (it changes nothing):
   - PNG without an `.aseprite` source, and the other way round
   - PNG size isn't 1024 (or the scene size), or it isn't an exact 32× upscale of its source
   - pure black (`#000000`) pixels, which break the no-black-outline rule
   - tiny detached pixel groups (1–4 pixels) away from the main shape: likely sparkles or stray pixels
   - empty margin per side, to flag sprites that are off-centre compared with their folder
   - frame-to-frame bounding-box shifts in animated sprites
3. **Review list.** Results go into a table here (asset, rule, problem, proposed fix), sorted by how often the asset is seen: medkit, shop, boosts, room, then the rest.
4. **Your approval, then fixes.** Before/after previews for each fix. Nothing is overwritten until you approve it (the pixel-art rule from the art plan). Fixes are made in the `.aseprite` source and re-exported, never by editing the PNG.
5. **Re-run** the automatic checks until they come back clean, then rebuild `sticker-data.ts` if a sticker changed (`bun scripts/sticker-data.ts`).

## Results of the first pass (2026-10-21)

The automatic checks found no export problems: every PNG that has a source is an exact upscale of it, and no sprite uses pure black. What's left needs a decision.

| # | Asset(s) | Rule | Problem | Proposed fix |
| --- | --- | --- | --- | --- |
| 1 | My Room floor items | Alignment | Feet sit at different heights: bookshelf, teddy bear and IV stand touch the bottom row; hospital bed, crash cart, flower vase and floor lamp end 1 px up; armchair, wheelchair, waiting bench, vending machine and aquarium 2 px up; potted plant, privacy screen, toy box and lava lamp 3 px up. Placed side by side they float at different heights. | Move each sprite down so every floor item stands on the bottom row. |
| 2 | `room/floor_lamp` | Missing line pixels, effect particles | The pole doesn't reach the shade (a gap with two pale "glow" pixels beside it). | Join the pole to the shade; drop the two glow pixels. |
| 3 | `achievements/trophy_star`, `trophy_diamond` | Effect particles | A 4-pixel sparkle in the top-left corner. | Remove it. |
| 4 | `achievements/night_coffee` | Effect particles | Three single-pixel twinkles around the mug (the steam stays). | Remove them. |
| 5 | `misc/natal_gem` | Effect particles, item matches icon | A pink sparkle top-right; the Natal Gem sticker has none. | Remove it, so icon and sticker match. |
| 6 | `achievements/light_off` (L7 R3), `trophy_star` (L5 R7), `trophy_diamond` (L3 R6), `shop/bandage_roll` (L4 R2), `shop/thermometer` (L4 R2), `shop/microscope` (L3 R5) | Alignment | Off-centre by 2-4 px (empty columns left vs right). | Re-centre. |
| 7 | `shop/gloves`, `syringe`, `facemask`, `medicines` | Alignment | They fill the whole 32 px canvas, while the other supplies keep a 1-10 px margin, so they look bigger in the shop list. | Leave a 1-2 px margin like the rest (a small redraw at 30 px). |
| 8 | `achievements/trophy_gold` | Consistency, made in Aseprite | Bigger and darker-outlined than the bronze, platinum and diamond trophies it sits beside, and it has no source. | Redraw it in the trophy family's style as an `.aseprite`. |
| 9 | 9 minigame medals, `misc/apple`, stickers made from game art (doctor, golden medkit, Natal Gem, Nightingale, nurse, winged heart) | Made in Aseprite | No `.aseprite` source. | Rebuild sources from the PNGs (the medals as one file with a layer per colour). |
| 10 | `room/aquarium_*`, `lava_lamp_*`, `patient_monitor_*` | Made in Aseprite | Sources are in `sprites/gems/`, not `sprites/room/`. | Move them. |
| 11 | `shop/bandage_roll` | Consistency | Pale grey on the white card, with little contrast; it reads weaker than the other supplies. | Your call: a warmer gauze colour or a stronger outline. |
| 12 | `room/sanitizer` | Effect particles | A detached drip below the nozzle. | Your call: keep (it's part of the object) or remove. |
| 13 | `gems/p_firefly` | Consistency | 24 × 24 while the other particles are 32 × 32. | Pad to 32 × 32 (no visual change). |

## Applied (2026-10-21)

Approved and applied, together with your own edits to the floor lamp, flower vase, armchair, microscope, question-mark bulb and reception:
- **Scenes** are 320 × 240 (1280 × 960). Rooms gained 30 rows of wall under the ceiling and 30 rows of floor; the hospital gained 60 rows of sky. Room positions and the no-place areas moved with the art, and items placed in older saves are moved on load. The sky above the hospital art continues the sky's top colour, with clouds by day and stars at night.
- **#1** floor items on one baseline; **#2** floor lamp; **#3-5** sparkles removed; **#6** re-centred; **#8** gold trophy redrawn from the bronze one; **#9-10** sources added and moved; **#11** stronger bandage outline; **#12** sanitizer drip removed; **#13** firefly padded.
- **#7** the four full-canvas supplies are drawn at 90% in the shop and orbit (`iconScale` in `src/constants/items.ts`) rather than redrawn.
- Also: IV bag with two ports (blue lid), even microscope tube, thinner thermometer cap, light bulb without the Z and side bumps, the Children's Ward rainbow standing on fuller clouds.

After applying, the automatic checks pass for every asset with a source (exact exports, no black pixels); the only detached pixels left are the moon's tip and the coffee steam, which belong to their drawings.

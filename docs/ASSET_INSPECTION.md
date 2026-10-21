# Asset inspection plan

A plan for checking every game image in one pass. **Status (2026-10-21): planned, not started.** Nothing below has been inspected yet.

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
| `scenes/`, `hospital/` | rooms, hospital tiers, skies, cars, visitors | large art (320 × 180) |
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

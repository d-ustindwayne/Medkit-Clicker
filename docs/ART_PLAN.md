# Pixel art plan

The brief for polishing the existing sprites and drawing new ones. Read this before any art work.

## Rules

- **Enhance, don't redesign.** Keep each sprite's silhouette, concept and colour identity. Show a before/after preview and wait for approval before overwriting anything.
- **No black outlines.** Outlines are a darker shade of the fill colour, like `trophy.aseprite` and `Apple.aseprite`.
- **32 × 32 for every sprite in this plan.** Never a bigger canvas to fit more detail.
- **Sources and exports:** the `.aseprite` source (32 × 32) lives in `src/media/photos/sprites/`. The game uses a 1024 × 1024 PNG in `src/imgs/`, made by scaling each pixel 32× with nearest-neighbour.
- **Keep originals.** The first git commit (`62c51f2`) has every sprite as it was. Don't rename or delete existing files.
- **Tools:** `/pixel-plugin` with Aseprite (`C:/Program Files/Aseprite/build/bin/aseprite.exe`). If the plugin's server won't connect, use Aseprite's command line with Lua scripts (`aseprite -b --script`).
- **Avoid:** noisy dithering, heavy gradients, uneven outlines, and extra detail that doesn't fit the style.

## Phases

| # | Phase | Status |
| --- | --- | --- |
| 1 | Audit the project, sprites and references | Done (2026-10-19) |
| 2 | Polish existing sprites: the apple first, then remove black outlines from the 7 in-game sprites | Done (2026-10-20), awaiting your review |
| 3 | New 32 × 32 icons (list below) | Done (2026-10-20), awaiting your review |
| 4 | Trophy series, starting from `trophy.aseprite` | Done (2026-10-20), awaiting your approval |
| 5 | Export and verify: 32 × 32 sources, 1024 PNGs, transparency, game paths, `bun run typecheck` | Done (2026-10-20) |
| 6 | Reorder the shop: propose an order and get approval. Items are saved by `id`, so changing the order is safe for saves. | Proposed, waiting for approval |
| 7 | Plan the deferred art (below) | Not started |

## Where the files are

Sprites are grouped by what they're used for. Sources live in `src/media/photos/sprites/<folder>/` and the game PNGs in `src/imgs/<folder>/`, under the same names.

| Folder | Used for | Sprites |
| --- | --- | --- |
| (root) | The main game art | medkit, hospital |
| `shop/` | Shop upgrades | syringe, stethoscope, facemask, gloves, medicines (in the shop now); bandage_roll, thermometer, bp_tester, iv_bag, blood_vial, covid_test, microscope, dna (proposed) |
| `achievements/` | Achievements | trophy_gold (source: the original `trophy.aseprite`), trophy_diamond, trophy_platinum, trophy_bronze, trophy_star, trophy_nurse, trophy_purple, medal, winged_heart, clock_moon |
| `misc/` | Purpose not decided yet | apple (source `Apple.aseprite`), coin, bandage (the plaster), heart |
| `art/` | Large art | nightingale (512 × 512 painting) |
| `characters/` | People (256 × 256) | 01–16, see the table below; staff 11–16 also have `_walk1` / `_walk2` frames |
| `scenes/` | Backgrounds (1280 × 720) | hospital_0 to hospital_9 (the outside, one look per rebirth tier, transparent sky) and hospital_sky (shop page 2); hospital_inside, room_empty, room_lab, room_pharmacy, room_kids (My Room) |
| `hospital/` | Hospital page extras | cars at 32 × 32 (car_red, car_blue, taxi, van_green, ambulance; facing right); visitors at 16 × 16 with 2 walk frames (visitor_woman, visitor_man, visitor_kid, visitor_elder); clouds (cloud_big, cloud_mid, cloud_small), all exported ×4 |
| `room/` | Placeable My Room items (128 × 128, drawn at 32 × 32) | hospital_bed, wheelchair, iv_stand, crash_cart, vending_machine, waiting_bench, potted_plant, privacy_screen, security_camera, aed, xray_viewer, first_aid_cabinet, sanitizer, notice_board |

`Tree.aseprite` and `rock1.aseprite` stay in the sprites root, unused and untouched.

The originals from before this work are in commit `62c51f2`, so any one can be restored with `git checkout 62c51f2 -- <old path>`.

Lighting follows each original. The items, apple, heart and icons are lit from the top-left, with an outline one shade darker than the fill: lighter on the lit edge, darker on the shadow edge. The trophies copy `trophy.aseprite`: no outline, lit from the right, highlight stripes on the right and copper bands on the left.

## Audit findings

- **In-game sprites** (`src/imgs/`): medkit, syringe, stethoscope, facemask, gloves, medicines, hospital. Each is 32 × 32 art saved at 1024 × 1024, with a black outline. **None has an `.aseprite` source**, so sources will be rebuilt from the PNGs.
- **Aseprite sources** (`src/media/photos/sprites/`): Apple, trophy, heart, Tree, rock1. All are 32 × 32 and none is used in the game yet. The heart has a black outline; the others don't.
- **References** (`src/media/photos/references/`):
  - `inspTrophies.jpg`: star and figure trophies
  - the vecteezy image: medals and a winged medal. It's a stock image, so use it for ideas only and don't copy it.
- **Florence Nightingale reference:** `src/media/photos/FlorenceNightingalephotoref.png`.
- **No references yet** for the hospital interior, the sick patient or the standing characters.

## Existing sprites

- **Apple (priority):** add volume with a shadow side, a better highlight and colour steps. Shade the leaf and stem. Keep the silhouette.
- **The 7 in-game sprites:** swap the black outline for a darker shade of each colour and lift the shading. Show before/after first.
- **Heart:** swap the black outline the same way. It's the starting point for the winged heart.
- **Tree, rock1:** leave alone (not medical).

## New 32 × 32 icons

1. Clock with a moon in its upper-right (night or time achievements)
2. Coin with a plus in the middle (health)
3. Microscope
4. Bandage or adhesive plaster (must not look like the gloves or medicine)
5. IV fluid bag, light pale blue (not saturated)
6. COVID rapid antigen test with readable markings
7. Blood vial with visible blood
8. Thermometer
9. Heart with wings
10. Medical medal
11. DNA double helix
12. Manual blood pressure tester: cuff, tubing, gauge and an oval rubber bulb (not electronic)

Which of these become shop items, and at what price and rate, is delegated to Claude. Write the choices into `docs/TASKS.md` for review.

## Trophy series

Every trophy must differ in shape or structure, not just colour. Show the set for approval before finalising.

1. Diamond: facets
2. Platinum: restrained, cool highlights
3. Gold
4. Bronze
5. Gold with a star on top
6. Gold with a nurse figure: a recognisable nurse silhouette, not just a cross
7. Purple base with a small white stripe on part of the base only

## Large art (specs from you, 2026-10-20) — drawn, awaiting your review

**Resolution approach:** each piece is drawn at a native pixel size and scaled up by a whole number with nearest-neighbour, like the 32×32 sprites, so the pixels stay crisp and chunky. The exported canvas is exactly the size you asked for:

| Piece | Exported canvas | Drawn at | Scale |
| --- | --- | --- | --- |
| Hospital, outside | 1280 × 720 | 320 × 180 | ×4 |
| Hospital, inside | 1280 × 720 | 320 × 180 | ×4 |
| Florence Nightingale painting | 512 × 512 | 256 × 256 (for detail) | ×2 |
| Each character | 256 × 256 | 64 × 64 | ×4 |

### Hospital backgrounds (2)
- **Outside:** the hospital building in the middle, a car park on the left, and a beautiful garden on the right (trees, flowers, path).
- **Inside:** a ward or reception, researched from real hospital interiors.
- Walls inside and out are mainly white; everything else is up to Claude.

### Florence Nightingale painting
A faithful pixel-art version of `src/media/photos/FlorenceNightingalephotoref.png`, neat and detailed, presented as a painting (frame, canvas texture).

### Characters (16)
Front-facing standing figures on a 256 × 256 canvas, with expressions, shoes and clothing details added where the description is thin. Which patients are sick was rolled at random: **2, 4, 5, 9 and 10 are sick** (pale or flushed skin, a tired expression, and props such as a thermometer in the mouth, an ice pack or a tissue). The others are healthy visitors or patients.

| # | Description |
| --- | --- |
| 1 | Woman, 20s, red straight hair, fair light skin, Filipino-looking, fit; polo shirt and neat jeans |
| 2 | Man, 30s, curly hair, bodybuilder build, fair skin, Pacific Islander-looking; T-shirt and baggy pants (**sick**) |
| 3 | Woman, 20s, blonde, white, fit; casual clothes with a jacket and simple pants |
| 4 | Man, 60s–70s, bald, glasses, normal build, no cane; casual shirt and shorts (**sick**) |
| 5 | Woman, 30s, black hair, Chinese-looking, a bit chubby; jacket and pants (**sick**) |
| 6 | Woman, 30s, school teacher in a green uniform, glasses |
| 7 | Boy, about 10, Justin Bieber haircut, casual T-shirt, holding a handheld console |
| 8 | Girl, about 15, black hair, hyperpigmentation, casual wear |
| 9 | Man, dad type; details up to Claude (**sick**) |
| 10 | Man, 20s; details up to Claude (**sick**) |
| 11–14 | Female nurses; details up to Claude |
| 15 | Male nurse |
| 16 | Female doctor, blonde; inspired by Professor Juniper (Pokémon) without copying her |

**Status (2026-10-20):**
- **Both hospital scenes** are drawn and shown in the game as the two swipe pages next to the medkit ("Hospital" and "Ward").
  - The outside has the car park on the left, the white hospital in the middle (with an ambulance at the entrance) and a garden with a fountain on the right.
  - The inside has reception, a ward corridor, waiting chairs under a framed mini of the Nightingale painting, and a patient bay with an IV stand, a heart monitor, a curtain and a window.
  - People are left out of both scenes so the game can place characters on top.
- **The Nightingale painting** is drawn from the reference photo: warm ink tones on a dark teal backdrop, in an ornate gold frame with a nameplate.
- **All 16 characters** are drawn. They aren't used in the game yet.

The **sick patient** emoji face (thermometer in the mouth) is still planned.

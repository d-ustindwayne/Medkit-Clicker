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

| What | `.aseprite` source (32 × 32) | Game PNG (1024 × 1024) |
| --- | --- | --- |
| 7 in-game sprites (medkit, syringe, stethoscope, facemask, gloves, medicines, hospital) | `src/media/photos/sprites/items/` | `src/imgs/<name>.png` (same paths as before) |
| Apple, heart (your sources, enhanced in place) | `src/media/photos/sprites/Apple.aseprite`, `heart.aseprite` | `src/imgs/icons/apple.png`, `heart.png` |
| 12 new icons | `src/media/photos/sprites/icons/` | `src/imgs/icons/` |
| Trophies | `src/media/photos/sprites/trophies/` (gold = the original `trophy.aseprite`) | `src/imgs/trophies/` |

The originals from before this work are in commit `62c51f2`, so any one can be restored with `git checkout 62c51f2 -- <path>`.

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

## Deferred (plan only, don't draw yet)

Size, framing and purpose are still to be agreed for each:
- **Hospital background:** see the hospital entry in `ASSETS.md` (currently planned as 1024 × 1024)
- **Florence Nightingale painting:** a pixel portrait from the reference photo
- **Sick patient:** emoji-like face with a thermometer in the mouth
- **Standing characters:** doctors, nurses, patients and staff for tutorials or scenes. Poses, sizes, sprite sheets and animation still undecided.

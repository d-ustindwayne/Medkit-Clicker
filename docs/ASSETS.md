# Assets to draw

The brief for polishing and drawing 32 × 32 sprites (style rules, phases) is in [ART_PLAN.md](ART_PLAN.md).

Everything below is art the game is ready for but doesn't have yet. Until a file exists, the game shows a placeholder. Match the existing sprites in `src/imgs/`: pixel art, transparent PNG, scaled up with nearest-neighbour so the pixels stay sharp.

## How to add one

1. Export the PNG to the path listed.
2. Wire it up where the "Hook" column says. Usually that means swapping a `null` for `require("@/imgs/...")`.
3. Save. The app reloads with the art.

## Hospital (swipe page next to the medkit)

| File | Size | What it is | Hook |
| --- | --- | --- | --- |
| `src/imgs/scenes/hospital.png` | 1024 × 1024 (square), opaque | The inside of the hospital: a single full illustration. It's shown in a square frame about the size of the medkit circle. | `src/constants/scenes.ts`: set `image` for the `hospital` scene |

To add more swipe pages later (a ward, a pharmacy and so on), add another entry to `SCENES` in `src/constants/scenes.ts` with its own 1024 × 1024 PNG. Each entry becomes one more page and one more dot.

If you'd like the hospital to change as the game progresses (for example, rooms lighting up as you buy supplies), draw it as **layers**: one opaque background plus transparent PNGs of the same 1024 × 1024 size for each part. Tell me the layers and when each should appear, and I'll stack them.

## Shop second page

| File | Size | What it is | Hook |
| --- | --- | --- | --- |
| Up to you | n/a | The shop's second swipe page is a "coming soon" placeholder. Decide what goes there (more items, upgrades, cosmetics...) and what art it needs. | `SHOP_PAGES` in `src/components/shop.tsx` |

## Rewards

| File | Size | What it is | Hook |
| --- | --- | --- | --- |
| `src/imgs/rewards/chocolate_box.png` | 256 × 256, transparent | Icon for "Box of chocolates" in Jasmine's Rewards. A drawn pixel gift box is used until then. | Add an `image` field to the reward in `src/constants/rewards.ts` (I'll wire it when the file exists) |

## New shop items (when you design them)

| File | Size | What it is |
| --- | --- | --- |
| `src/imgs/shop/<item>.png` (source in `src/media/photos/sprites/shop/`) | 1024 × 1024, transparent (like `shop/syringe.png`) | One sprite per new item. It's reused automatically for the shop card, the orbit around the medkit and achievement tiles. |

## App icon and splash (release)

| File | Size | Notes |
| --- | --- | --- |
| `assets/images/icon.png` | 1024 × 1024, opaque | Currently the medkit sprite on cream. Replace it if you want final art. |
| `assets/images/android-icon-foreground.png` | 1024 × 1024, transparent | Keep the art inside the middle 66%, because Android crops the edges. |
| `assets/images/splash-icon.png` | 512 × 512, transparent | Shown on the splash screen (rose background in light mode, navy in dark). |

## Already provided (no action)

Sprites: medkit, hospital, syringe, stethoscope, facemask, gloves, medicines; new shop, achievement and misc sprites (32 × 32, see [ART_PLAN.md](ART_PLAN.md)), not wired into the game yet. Fonts: Silkscreen, Mallanna, Inter Bold, Nunito. Sound: click, medkit click, buy, invalid buy, plus the music library.

# My Room

**Status (2026-10-20): built.** Rooms, items, unlocks, limits and bonuses live in `src/constants/room.ts`; the page is `src/components/room/room-page.tsx`. The numbers are placeholders, listed in TASKS.md. The original proposal follows.

Your idea: the second page next to the medkit becomes **your own room**. It starts as an empty background. You collect pixel-art items, then place and arrange them. The more items your room has, the bigger the boosts.

## The loop

1. **Collect** furniture and decorations:
   - win them from sick-patient minigames, which then visit your room instead of the ward
   - find them in a mystery box bought with Care Coins
   - earn them as achievement rewards
2. **Place** them: tap an item in your inventory, then tap a spot in the room. Drag to move, long-press to put it away.
3. **Benefit:** each placed item gives a small passive bonus. Sets give extra (for example, the whole "Cozy Corner" set adds +5% more).

## Room

- **Background:** an empty room, 320 × 240 drawn and exported at 1280 × 960 like the scenes (320 × 180 until 2026-10-21). White walls (your rule for interiors), a wooden floor and one window. Nothing else, so your items are the decoration.
- **Placement:** a coarse grid, with floor tiles in the bottom half and wall slots in the top half. That keeps arrangements neat and pixel-aligned, and makes drag-and-drop easy on a phone.
- **Layering:** items lower on the floor draw in front, so a chair can stand in front of a desk.

## Item ideas (32 × 32, same style as the shop sprites)

| Item | Where | Bonus | Set |
| --- | --- | --- | --- |
| Potted plant | floor | +1% healing per second | Cozy Corner |
| Floor lamp | floor | +1% per tap | Cozy Corner |
| Bean bag | floor | +2% offline earnings | Cozy Corner |
| Bookshelf | floor | +1 Care Coin per 10 patients treated | Study |
| Desk + laptop | floor | +2% healing per second | Study |
| Anatomy poster | wall | minigames 10% easier | Study |
| Nightingale painting (already drawn) | wall | +3% healing per second | Heroes |
| Diploma frame | wall | +1% per tap | Heroes |
| Coffee machine | floor | boosts last 10% longer | Break Room |
| Mini fridge | floor | +2% offline earnings | Break Room |
| Fairy lights | wall | +1% everything | — |
| Cat bed (with a cat) | floor | patients arrive 10% more often | — |

Bonuses stack additively and are capped at +75% in total so the economy stays sane.

## How it fits with the rest

- **Sick patients** then visit your room: they appear in it, and you tap them for the minigame. That's the feature I've just built in the ward. It moves over as-is once the room exists.
- **Care Coins** (from achievements and minigames) buy boosts or mystery boxes.
- **Rebirth points** could unlock bigger rooms or rare items.

## What it needs

- **Art:** the empty room background, plus about 12 furniture sprites. I can draw them in the same style if you'd like, or you can.
- **State:** an inventory (item id → count), placements (item, x, y), and placed-item bonuses folded into `healingRate()`.
- **UI:** an inventory drawer in the room, plus placement mode.

## Decisions for you

- [ ] Room or ward: is the second page a personal room (this doc) or the hospital ward?
- [ ] How items are earned: minigames, mystery boxes, achievements, or a mix.
- [ ] The item list and bonuses above, or your own.
- [ ] Should I draw the room and the furniture?

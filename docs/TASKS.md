# Medkit Clicker: status and task board

Run `bun run tasks` for a progress summary. Tick a box by changing `[ ]` to `[x]`.
Art that's still needed is listed in [ASSETS.md](ASSETS.md). The sprite polish brief and its progress are in [ART_PLAN.md](ART_PLAN.md).

## Where we are (2026-10-19)

The core game is done and was tested on the Android emulator and on web. These all work:
- tapping and buying
- autosave, plus earnings while the app is closed
- 13 shop items and 111 achievements
- music (with a full player) and sound effects
- light and dark themes, and 7 backgrounds
- export/import of saves
- the redeem code and Jasmine's Rewards
- rebirth
- swipe pages for the medkit/Hospital area and the shop

Committed and pushed to GitHub (`main`). Next up: the sprite polish in [ART_PLAN.md](ART_PLAN.md), your decisions below, then content (items, achievements, art), then a standalone build.

## Needs your decision

These are placeholders I invented so the game works. Each one is yours to keep, change or remove.

- [ ] Tap bonus (`TAP_RATE_BONUS`): each tap heals 1 + 2% of per-second. Set it to 0 for a flat +1 per tap.
- [ ] Offline earnings: up to 8 hours at the full rate (`MAX_AWAY_S` in `src/hooks/use-game.tsx`).
- [ ] Locked shop items show as a "???" silhouette until you've earned half their price.
- [ ] Achievement names, descriptions and thresholds (`src/constants/achievements.ts`), 111 in total, including names for the 8 new items' achievements.
- [ ] Rebirth numbers (`src/constants/rebirth.ts`):
  - you need 1 billion patients in a run to rebirth
  - each rebirth pays 1 Natal Gem (the prestige currency, renamed from rebirth points)
  - +2% healing per rebirth
  - nothing to spend Natal Gems on yet (they count towards room and item unlocks)
- [ ] What each rebirth unlocks (`REBIRTH_UNLOCKS`, currently empty)
- [ ] Rewards section title "Jasmine's Rewards", the gift icon, and the wording of the "Tell Dustin" message
- [ ] Background names and colours (Rose Grid, Mint Crosses, Lavender Dots, Peach Stripes, Sky Checker, Candy Hearts, Plain)
- [ ] Playlist display names: "normal" is labelled "Everyday", "favourites" is "My Favs", "filipino_rap" is "Pinoy Rap"
- [ ] Hospital page numbers (`src/constants/hospital.ts`), picked by Claude:
  - an emergency ambulance every 45-90 s, on screen for 7 s
  - tapping it pays 60 s of healing, or 25 taps early on, whichever is more
  - cars every 2.5-6 s; four car designs (red sedan, blue hatchback, taxi, green van) plus the ambulance, all 32x32
- [x] Rebirth moved from the menu to the Hospital page; the menu keeps only non-game things (achievements, settings, redeem, website, about, rewards)
- [x] The shop's second page is now the outside of the hospital; the page next to the medkit is My Room (see [ROOM.md](ROOM.md))
- [ ] How to Play text on the About page
- [ ] Real website URL for "Visit website" (`src/constants/app.ts`). Plan: your own site (Vue, Bulma/SCSS, three.js) on GitHub Pages, built another day
- [ ] Care Coins (`src/constants/achievements.ts` → `coins` on each achievement): the currency name, and the payout per achievement (1–5, harder pays more)
- [ ] The 13 boosts in `src/constants/boosts.ts`: names, effects, durations and coin prices
- [ ] Ward patients (`src/constants/patients.ts`):
  - a patient arrives every 2–5 minutes and waits 3 minutes
  - a win pays 2 minutes of production plus 1 Care Coin
  - a loss pays 10 seconds of production
- [ ] Minigames (`src/components/ward/treat-modal.tsx`):
  - Injection: 2 of 3 shots in the vein
  - Rhythm: 7 of 10 beats at 110 bpm
  - Bandage: 25 wraps in 5 seconds
  - the intro lines for each patient
- [ ] My Room numbers (`src/constants/room.ts`):
  - room limits: 6 / 4 / 6 / 7 / 8
  - room unlocks: 15 achievements, 1 rebirth, 10 patients treated, 40 achievements
  - each item's unlock and bonus
  - the +50% bonus cap
- [ ] Create the Aiven PostgreSQL service, host the API and run `bun run db:setup` (see [DATABASE.md](DATABASE.md))
- [ ] Natal Gem name and icon ("Natal" means "of birth"; alternatives: Cradle Gem, Bloom Gem)
- [ ] Paid background prices: Purple Rain 15, Heart Monitor 15, Night Shift Sky 10, Blood Stream 10 Care Coins

## Shop items (decided by Claude, 2026-10-20)

You handed this over, so it's built. The order follows medical practice: everyday bedside care and infection control first, then vital signs, then treatment, then the lab. Each tier costs about 10× the last and pays back more slowly (the classic clicker curve). Every purchase still raises that item's price by 15%. Saves store items by id, so the reorder and the new items are safe for existing progress.

| # | Item | Price | Heals/s |
| --- | --- | --- | --- |
| 1 | Bandage (roll) | 15 | 0.1 |
| 2 | Gloves | 100 | 1 |
| 3 | Facemask | 1,100 | 8 |
| 4 | Thermometer | 12,000 | 47 |
| 5 | Stethoscope | 130,000 | 260 |
| 6 | BP Cuff | 1.4M | 1,400 |
| 7 | Syringe | 20M | 7,800 |
| 8 | Medicine | 330M | 44,000 |
| 9 | IV Bag | 5.1B | 260,000 |
| 10 | Blood Test | 75B | 1.6M |
| 11 | Rapid Test | 1T | 10M |
| 12 | Microscope | 14T | 65M |
| 13 | DNA Lab | 170T | 430M |

A simulated player tapping once a second unlocks:
- the first 6 items within the first hour
- Medicine at about 5 hours, which is also when the first rebirth (1 billion patients) opens up
- the DNA Lab after about 16 days of nonstop play, sooner with offline earnings

**Achievement art:**
- lifetime-healed milestones climb bronze, gold, platinum and diamond trophies
- tap milestones use the medal
- per-second milestones use the winged heart
- play-time and Night Shift use the clock with moon
- DJ Nurse, Lights Out and Charting Complete use the nurse, star and purple trophies

Still unused:
- `misc/`: apple, coin, plaster bandage, heart
- I'd suggest the coin for rebirth points

## Concerns to address

- [ ] **The last achievements are still out of reach.** 13 items get to about a billion per second after weeks, so the 10^15 healed milestones are reachable but the tail (10^18 and up) needs upgrades or rebirth spending. That's intentional for a long game, but worth a look when rebirth points get a use.
- [ ] **Reward notifications:** built into the server (ntfy.sh alert on every redemption), live once the API is deployed. Until then, redeeming opens the share sheet. Local reminders are still a plan ([NOTIFICATIONS.md](NOTIFICATIONS.md)).
- [ ] **Everything is on-device, so it isn't tamper-proof.** Someone could edit an exported save and import it to give themselves patients. The redeem code is stored only as a hash, so it can't be read from the code, but a determined person could still bypass the check. That's fine for a gift; it would need a server to be secure.
- [ ] **Rewards survive Delete progress and imports on purpose,** so the 3-chocolate limit can't be reset. Reinstalling the app or clearing its data does reset it, because there's no server.
- [ ] **Saving to Download:** Android 11+ won't let apps pick the root of Download. Export asks for a folder once (Documents by default, or a subfolder of Download) and then remembers it.
- [ ] **iOS is untested.** It needs a Mac or a cloud build (`eas build`) to check.
- [x] **Music is copyrighted:** it's no longer in the app or in git. It lives in the database and downloads after the code ([DATABASE.md](DATABASE.md)).
- [ ] **Old native build on the emulator:** `com.dust.dev.mc` is from before the audio and save libraries. Use Expo Go, or run `bunx expo prebuild --clean` then `bun run android` to replace it.
- [x] **Unit tests:** `bun test` runs 27 tests for the shop, saves, Care Coins, boosts, patients, My Room and rebirth (`src/lib/game.test.ts`). The UI is still tested by hand ([TESTING.md](TESTING.md)).
- [x] **Nothing is committed to git.** Done: pushed to https://github.com/d-ustindwayne/Medkit-Clicker (`main`).
- [ ] **Achievement and welcome-back toasts briefly cover the counter.** Consider moving them or making them smaller.

## Roadmap

### Phase 1: Foundation (done)
- [x] Expo 57 + NativeWind v4 + Reanimated 4 wired up
- [x] Game loop, shop, autosave, offline earnings
- [x] Achievements with toasts and progress bars
- [x] Music playlists and sound effects
- [x] Light and dark themes, responsive phone/tablet layouts
- [x] Apache 2.0 license, NOTICE, README

### Phase 2: Polish (done, pending your review)
- [x] Medkit and drawer layout fixed on Android
- [x] Visual effects:
  - heartbeat pulse, sunburst rays, orbiting supplies
  - tap shockwave and particles, confetti
  - drifting backgrounds
  - hard drop shadows, a shine sweep on items you can afford
  - calm slide-in alerts
- [x] Pixel-art icons (arrows, play/pause, speaker...) instead of text characters
- [x] Settings grouped into cards; segmented volume with a mute button
- [x] Music player: play/pause, previous/next track, tap the bar to jump to any point
- [x] 7 backgrounds, each with its own pattern and colours in light and dark mode
- [x] Swipe pages for the medkit area (Hospital) and the shop (placeholder)
- [x] Export saves to a folder (remembered); import fixed for Android
- [x] Numbers up to vigintillion, 111 achievements
- [x] Developer tools in Settings (development builds only)

### Phase 2b: Features added (done)
- [x] Redeem code screen; codes stored as hashes in `.env.local` (`bun run add-code <section> <code>`)
- [x] Jasmine's Rewards: Box of chocolates, 1 million patients, maximum 3, with the share message to Dustin
- [x] Rebirth: new run for rebirth points (a currency) plus a small permanent healing boost

### Phase 3: Pre-release content (your design)
- [x] Hospital art: outside and inside scenes, plus the Nightingale painting and 16 characters (see [ART_PLAN.md](ART_PLAN.md))
- [ ] Decide the shop's second page
- [x] More shop items: 13 in total, with order and prices decided by Claude
- [ ] What rebirth points buy, and the per-rebirth unlocks
- [ ] More achievements and easter eggs
- [ ] More rewards in Jasmine's Rewards (each: name, cost, limit)
- [ ] PHL export (when the PHL project is ready)

### Phase 4: Release
- [x] Unit tests for the game logic (`bun test`)
- [ ] Final app icon and splash art (now using the new outline-free medkit)
- [ ] Commit, then `eas build` for an installable Android APK
- [ ] iOS build (needs an Apple developer account)

## Ideas to brainstorm (not built)

**Mini-games for extra patients** (your idea; these are some directions):
- **CPR rhythm:** tap along at 100–120 beats per minute, and better timing earns more.
- **Triage sort:** swipe patients into the right priority colour before the timer runs out.
- **Med match:** match medications to conditions, memory-card style.
- **Nursing quiz:** NCLEX-style questions. It's study practice that also pays out patients.

**Real-world tasks for rewards** (your idea). These can be checked by the phone:
- a study or focus timer finished while the app is open
- a step count, using the phone's step counter
- a daily check-in streak

These need proof or a server:
- photos
- location
- anything from other apps

**More ideas:**
- **Golden patient:** a rare special patient drifts across the screen; tap it for a short boost.
- **Love notes:** messages from you that unlock at milestones.
- **Seasonal themes:** Valentine's, Nurses Week (May 6–12), her birthday.
- **Rebirth shop:** medkit skins, exclusive backgrounds and songs, rebirth-only supplies.
- **Cloud save:** sync between her phone and another device.
- **Home-screen widget:** shows patients healed.

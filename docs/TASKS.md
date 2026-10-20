# Medkit Clicker: status and task board

Run `bun run tasks` for a progress summary. Tick a box by changing `[ ]` to `[x]`.
Art that's still needed is listed in [ASSETS.md](ASSETS.md). The sprite polish brief and its progress are in [ART_PLAN.md](ART_PLAN.md).

## Where we are (2026-10-19)

The core game is done and was tested on the Android emulator and on web. These all work:
- tapping and buying
- autosave, plus earnings while the app is closed
- 13 shop items and 115 achievements
- music (with a full player) and sound effects
- light and dark themes, and 7 backgrounds
- export/import of saves
- a private, code-locked reward section
- rebirth
- swipe pages for the medkit/Hospital area and the shop

Committed and pushed to GitHub (`main`). Next up: the sprite polish in [ART_PLAN.md](ART_PLAN.md), your decisions below, then content (items, achievements, art), then a standalone build.

## Needs your decision

These are placeholders I invented so the game works. Each one is yours to keep, change or remove.

- [x] Tap bonus (`TAP_RATE_BONUS`): each tap heals 1 + 2% of per-second (kept 2026-10-20)
- [x] Offline earnings: up to 4 hours at the full rate (`MAX_AWAY_S` in `src/hooks/use-game.tsx`; decided 2026-10-20)
- [ ] Locked shop items show as a "???" silhouette until you've earned half their price.
- [ ] Achievement names, descriptions and thresholds (`src/constants/achievements.ts`), 111 in total, including names for the 8 new items' achievements.
- [x] Rebirth numbers (decided 2026-10-20): the first rebirth needs 1 billion patients in a run, each one after needs 2.5x more; 1 Natal Gem per rebirth (name kept); +2% healing per rebirth
- [x] **Natal Gem shop** (built 2026-10-20; the shop's third page, "GEMS"). Upgrades and items beyond the two you named were picked by Claude:
  - upgrades, 5 levels at 1, 2, 3, 5, 8 gems: Steady Hands +10% per tap, Night Owl +1 h offline, Bedside Manner +20% ward rewards, Rapid Response +25% emergency rewards, Bulk Orders -2% shop prices, Head Start +10 bandages and +5 gloves each run
  - medkit skins: Golden (rebirth 1, 2 gems), Candy (2, 2), Night Shift (4, 3), Crystal (8, 5); Dustin pixel and photo (code only, 1 gem each)
  - tap effects: Heart Burst (1, 1), Sparkles (3, 2), Bubbles (6, 3)
  - animated backgrounds: Sakura Breeze (2, 3), Firefly Night (5, 4), First Snow (7, 4), Aurora Ward (10, 6)
  - animated My Room items: Aquarium (3, 3; +4% healing), Lava Lamp (7, 3; +4% tap), Patient Monitor (12, 4; +5% healing)
  - these cosmetics are the rebirth unlocks; the rebirth card shows the next one
- [x] Stickers (2026-10-20): 18 die-cut pixel stickers in the Gem Shop, 1 gem each (Florence Nightingale 2). Once bought, "Save" puts the PNG in your photos. New art: Happy Medkit, Happy Pill, Bandaid Buddy, Love Stethoscope, Stayin' Alive, Grumpy Germ, Fever!, Coffee IV, Sleepy Cap, Zoom Zoom, Heal Yeah!, Need Coffee; from the game: Nightingale, Nurse, Doctor, Winged Heart, Natal Gem, Golden Medkit
- [ ] Alternate app icons: needs `expo-alternate-app-icons`, one adaptive icon per option and a native rebuild (waiting for your go-ahead)
- [x] What each rebirth unlocks: the Gem Shop cosmetics above (`REBIRTH_UNLOCKS` is built from them)
- [x] Background names and colours (Rose Grid, Mint Crosses, Lavender Dots, Peach Stripes, Sky Checker, Candy Hearts, Plain), kept 2026-10-20
- [ ] Hospital page numbers (`src/constants/hospital.ts`), picked by Claude:
  - an emergency ambulance every 2-4 minutes (decided 2026-10-20: rarer, bigger); it parks at the entrance with "Patient: <condition>!" and waits 20 s
  - tapping it pays 3 minutes of healing, or 25 taps early on, whichever is more
  - cars every 2.5-6 s; four car designs (red sedan, blue hatchback, taxi, green van) plus the ambulance, all 32x32
  - visitors (16x16: woman, man, kid, elder with a cane) walk to and from the door; every 9 s with no healing, down to every 2 s when healing is fast
  - three clouds drift behind the buildings
- [x] Hospital looks by rebirth (art by Claude, cosy names chosen 2026-10-20; rebirth itself has no cap): 0 Little Clinic, 1 Neighbourhood Clinic, 3 Sunny Health Center, 6 Community Hospital, 10 Heartwood Hospital, 15 Wellspring Medical Center, 21 Sunrise Medical Center (second tower), 28 Skyline Medical Center (helipad), 36 Meadow Medical Campus, 45 Grand Haven Medical Center (skyline, lit sign, helicopter)
- [x] Rebirth moved from the menu to the Hospital page; the menu keeps only non-game things (achievements, settings, redeem, website, about, rewards)
- [x] The shop's second page is now the outside of the hospital; the page next to the medkit is My Room (see [ROOM.md](ROOM.md))
- [x] How to Play text on the About page (kept)
- [x] "Visit website" links to https://d-ustindwayne.github.io/Medkit-Clicker (see [WEBSITE.md](WEBSITE.md))
- [x] The website code lives in `website/` in this repo and is served at /Medkit-Clicker/ (moved from `Medkit-Clicker-Website` on 2026-10-21)
- [x] Care Coins: each achievement pays half its listed amount, rounded up (1–3 coins; decided 2026-10-20). Boost and background prices may need lowering to match
- [ ] The 13 boosts in `src/constants/boosts.ts`: names, effects and durations (prices kept 2026-10-20)
- [x] Ward patients (`src/constants/patients.ts`; frequency decided 2026-10-20):
  - a patient arrives every 1–3 minutes and waits 3 minutes
  - a win pays 2 minutes of production plus 1 Care Coin
  - a loss pays 10 seconds of production
- [x] Minigames get slightly harder over time (decided 2026-10-20; `minigameTuning` in `src/constants/patients.ts`), reaching the hardest at 100 patients treated:
  - Injection: 2 of 3 shots in the vein; the needle speeds up to 1.2x and the vein narrows from 18% to 15%
  - Rhythm: 7 of 10 beats, 110 bpm rising to 120 bpm, with a tighter timing window
  - Bandage: 25 wraps rising to 30, in 5 seconds
- [x] Six more minigames (2026-10-20), each with a new ward patient: Pulse Check (count the beats), Sort the Meds (tap one colour of pill), Spot the Fracture (X-ray), Germ Buster (tap 7 of 10 germs), Deep Breaths (hold and release at the top, 2 of 3), Match the Meds (3 pairs)
- [x] Nine more My Room items (2026-10-20): Wall Clock, Heart Poster, Teddy Bear, Armchair, Toy Box, Floor Lamp, Flower Vase, Bookshelf, String Lights (bonuses and unlocks picked by Claude)
  - the intro lines for each patient
- [ ] My Room numbers (`src/constants/room.ts`):
  - room limits: 6 / 4 / 6 / 7 / 8
  - room unlocks: 15 achievements, 1 rebirth, 10 patients treated, 40 achievements
  - each item's unlock and bonus
  - the bonus cap, now +75% (decided 2026-10-20)
- [x] Create the Aiven PostgreSQL service, host the API and run `bun run db:setup` (see [DATABASE.md](DATABASE.md))
- [ ] Natal Gem name and icon ("Natal" means "of birth"; alternatives: Cradle Gem, Bloom Gem)
- [x] Paid background prices: Purple Rain 15, Heart Monitor 15, Night Shift Sky 10, Blood Stream 10 Care Coins (kept 2026-10-20)

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
| 10 | Blood Sample | 75B | 1.6M |
| 11 | COVID Test | 1T | 10M |
| 12 | Microscope | 14T | 65M |
| 13 | DNA Strand | 170T | 430M |

A simulated player tapping once a second unlocks:
- the first 6 items within the first hour
- Medicine at about 5 hours, which is also when the first rebirth (1 billion patients) opens up
- the DNA Strand after about 16 days of nonstop play, sooner with offline earnings

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
- [ ] **Rewards survive Delete progress and imports on purpose,** so reward limits can't be reset. Reinstalling the app or clearing its data does reset it, because there's no server.
- [ ] **Saving to Download:** Android 11+ won't let apps pick the root of Download. Export asks for a folder once (Documents by default, or a subfolder of Download) and then remembers it.
- [ ] **iOS is untested.** It needs a Mac or a cloud build (`eas build`) to check.
- [x] **Music is copyrighted:** retired. The app plays only its own BeepBox soundtrack; the code no longer unlocks music (2026-10-20).
- [ ] **Old native build on the emulator:** `com.dust.dev.mc` is from before the audio and save libraries. Use Expo Go, or run `bunx expo prebuild --clean` then `bun run android` to replace it.
- [x] **Unit tests:** `bun test` runs 35 tests for the shop, saves, Care Coins, boosts, patients, My Room and rebirth (`src/lib/game.test.ts`). The UI is still tested by hand ([TESTING.md](TESTING.md)).
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
- [x] Rebirth: new run for rebirth points (a currency) plus a small permanent healing boost

### Phase 3: Pre-release content (your design)
- [x] Hospital art: outside and inside scenes, plus the Nightingale painting and 16 characters (see [ART_PLAN.md](ART_PLAN.md))
- [ ] Decide the shop's second page
- [x] More shop items: 13 in total, with order and prices decided by Claude
- [ ] What rebirth points buy, and the per-rebirth unlocks
- [ ] More achievements and easter eggs
- [x] Private reward section: rewards, prices, limits and cooldowns live in the code only (not documented)
- [x] The redeem code is hidden: five taps on the hospital icon in About. It no longer unlocks music
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

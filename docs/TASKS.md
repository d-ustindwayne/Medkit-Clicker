# Medkit Clicker: status and task board

Run `bun run tasks` for a progress summary. Tick a box by changing `[ ]` to `[x]`.
Art that's still needed is listed in [ASSETS.md](ASSETS.md). The sprite polish brief and its progress are in [ART_PLAN.md](ART_PLAN.md).

## Where we are (2026-10-19)

The core game is done and was tested on the Android emulator and on web. These all work:
- tapping and buying
- autosave, plus earnings while the app is closed
- 71 achievements
- music (with a full player) and sound effects
- light and dark themes, and 7 backgrounds
- export/import of saves
- the redeem code and Jasmine's Rewards
- rebirth
- swipe pages for the medkit/Hospital area and the shop

Committed and pushed to GitHub (`main`). Next up: the sprite polish in [ART_PLAN.md](ART_PLAN.md), your decisions below, then content (items, achievements, art), then a standalone build.

## Needs your decision

These are placeholders I invented so the game works. Each one is yours to keep, change or remove.

- [ ] Shop prices and rates (`src/constants/items.ts`): Syringe 15 at 0.1/s, Stethoscope 100 at 1/s, Facemask 1,100 at 8/s, Gloves 12,000 at 47/s, Medicine 130,000 at 260/s. Each purchase raises the price by 15%.
- [ ] Tap bonus (`TAP_RATE_BONUS`): each tap heals 1 + 2% of per-second. Set it to 0 for a flat +1 per tap.
- [ ] Offline earnings: up to 8 hours at the full rate (`MAX_AWAY_S` in `src/hooks/use-game.tsx`).
- [ ] Locked shop items show as a "???" silhouette until you've earned half their price.
- [ ] Achievement names, descriptions and thresholds (`src/constants/achievements.ts`), 71 in total.
- [ ] Rebirth numbers (`src/constants/rebirth.ts`):
  - you need 1 billion patients in a run to rebirth
  - points = cube root of (run patients ÷ 1 billion)
  - +2% healing per rebirth
  - nothing to spend rebirth points on yet
- [ ] What each rebirth unlocks (`REBIRTH_UNLOCKS`, currently empty)
- [ ] Rewards section title "Jasmine's Rewards", the gift icon, and the wording of the "Tell Dustin" message
- [ ] Background names and colours (Rose Grid, Mint Crosses, Lavender Dots, Peach Stripes, Sky Checker, Candy Hearts, Plain)
- [ ] Playlist display names: "normal" is labelled "Everyday", "favourites" is "My Favs", "filipino_rap" is "Pinoy Rap"
- [ ] What the shop's second swipe page is for (currently "???" / Coming soon)
- [ ] How to Play text on the About page
- [ ] Real website URL for "Visit website" (`src/constants/app.ts`)

## Proposed shop order (waiting for your OK)

This keeps the 5 current items exactly as they are, at the same prices, rates and ids, so saves are safe. It adds 8 items from the new icons: the bandage goes between gloves and medicine, as you suggested, and the rest extend the late game. That also fixes the late-achievement concern below. You delegated the numbers to me; they follow the existing price ladder (each tier costs about 10× the last).

| # | Item | Status | Base price | Heals/s |
| --- | --- | --- | --- | --- |
| 1 | Syringe | existing | 15 | 0.1 |
| 2 | Stethoscope | existing | 100 | 1 |
| 3 | Facemask | existing | 1,100 | 8 |
| 4 | Gloves | existing | 12,000 | 47 |
| 5 | Bandage | new | 40,000 | 120 |
| 6 | Medicine | existing | 130,000 | 260 |
| 7 | Thermometer | new | 1.4M | 1,400 |
| 8 | BP tester | new | 20M | 7,800 |
| 9 | IV bag | new | 330M | 44,000 |
| 10 | Blood vial | new | 5.1B | 260,000 |
| 11 | COVID test | new | 75B | 1.6M |
| 12 | Microscope | new | 1T | 10M |
| 13 | DNA | new | 14T | 65M |

Grouping: bedside tools, then protection, then treatment, then vital signs, then lab and research.

Suggested uses for the icons that aren't shop items:
- coin: the rebirth-points currency
- clock with moon: night-shift and offline achievements
- medal and the 7 trophies: achievement tiers
- winged heart: rebirth
- apple and heart: spare

Nothing is wired in yet. Adding items also means extending `ItemId`, the item achievements and the orbit.

## Concerns to address

- [ ] **Late achievements are out of reach.** With 5 items the rate tops out around tens of thousands per second, so trillion-plus milestones need more items, upgrades or rebirth spending.
- [ ] **Reward notifications are manual.** Redeeming opens the share sheet so Jasmine can send you the message. Automatic alerts need a small server, for example a Discord webhook, ntfy.sh push or Firebase. Decide if that's wanted.
- [ ] **Everything is on-device, so it isn't tamper-proof.** Someone could edit an exported save and import it to give themselves patients. The redeem code is stored only as a hash, so it can't be read from the code, but a determined person could still bypass the check. That's fine for a gift; it would need a server to be secure.
- [ ] **Rewards survive Delete progress and imports on purpose,** so the 3-chocolate limit can't be reset. Reinstalling the app or clearing its data does reset it, because there's no server.
- [ ] **Saving to Download:** Android 11+ won't let apps pick the root of Download. Export asks for a folder once (Documents by default, or a subfolder of Download) and then remembers it.
- [ ] **iOS is untested.** It needs a Mac or a cloud build (`eas build`) to check.
- [ ] **Music is copyrighted and not in git.** A fresh clone needs `bun run music` with your own MP3s. The bundle is about 47 MB.
- [ ] **Old native build on the emulator:** `com.dust.dev.mc` is from before the audio and save libraries. Use Expo Go, or run `bunx expo prebuild --clean` then `bun run android` to replace it.
- [ ] **No unit tests yet** for the reducer, number formatting, rebirth or rewards.
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
- [x] Numbers up to vigintillion, 71 achievements
- [x] Developer tools in Settings (development builds only)

### Phase 2b: Features added (done)
- [x] Redeem code screen; codes stored as hashes in `.env.local` (`bun run add-code <section> <code>`)
- [x] Jasmine's Rewards: Box of chocolates, 1 million patients, maximum 3, with the share message to Dustin
- [x] Rebirth: new run for rebirth points (a currency) plus a small permanent healing boost

### Phase 3: Pre-release content (your design)
- [ ] Hospital interior art ([ASSETS.md](ASSETS.md))
- [ ] Decide the shop's second page
- [ ] More shop items (sprites from you)
- [ ] What rebirth points buy, and the per-rebirth unlocks
- [ ] More achievements and easter eggs
- [ ] More rewards in Jasmine's Rewards (each: name, cost, limit)
- [ ] PHL export (when the PHL project is ready)

### Phase 4: Release
- [ ] Unit tests for the game logic
- [ ] Final app icon and splash art
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

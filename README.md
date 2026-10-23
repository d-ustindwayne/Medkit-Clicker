# Medkit Clicker

**Medkit Clicker is a cozy pixel-art idle game about running a hospital: tap the medkit to heal patients, then spend them on medical supplies, from bandages to a DNA lab, that keep healing for you.** Grow your hospital, unlock over a hundred achievements and rebirth for permanent boosts, all to a soundtrack you pick.

It runs on Android, iOS and the web, built with Expo 57, React Native, React 19, NativeWind v4 and Reanimated 4, by Dustin Dwayne Diaz.

## Features

- **Tap and grow:** every tap heals patients. 13 supplies, from bandages and gloves to IV bags, microscopes and a DNA lab, keep healing while you rest. Each purchase raises the next price by 15%.
- **Offline progress:** your team keeps working for up to 4 hours while the app is closed.
- **115 achievements**, from "First Aid" to healing a vigintillion patients, with progress bars and a few secret ones.
- **Three currencies**, shown top-right: patients (medkits), Care Coins (from achievements) and Natal Gems (one per rebirth).
- **Rebirth:** on the Hospital page, start a new run for a Natal Gem and a small permanent healing boost. Your hospital grows with it, from a little clinic to the Grand Haven Medical Center (10 looks).
- **Emergencies:** cars pass and visitors walk in; when an ambulance pulls up at the door, tap it to admit the patient for a burst of healing.
- **Care Coins and boosts:** achievements pay Care Coins. Spend them in the shop's Boosts tab on 13 power-ups, like 2x per tap for 3 minutes or an instant hour of healing.
- **My Room:** decorate hospital rooms (Empty Room, Reception, Lab, Pharmacy, Children's Ward) with 26 pixel-art items (some animated) you unlock by playing. Each placed item gives a small permanent bonus, and nurses and the doctor walk around.
- **Sick patients** turn up in your room at random. Treat them in one of nine quick minigames (injection timing, CPR rhythm, bandage race, pulse count, pill sorting, X-ray, germ busting, breathing, memory pairs) for patients and coins.
- **Redeem codes** unlock hidden sections, like a rewards shop where patients buy real-life treats (with a limit on each).
- **Original soundtrack:** five chill lo-fi loops made in BeepBox (*Waiting Room*, *Morning Rounds*, *Night Shift*, *Visiting Hours* (a waltz), *Recovery Room*), included for every player.
- **Music player** for the soundtrack: play/pause, track skipping and seeking; sound effects with their own volume; vibration feedback (with an off switch) on phones.
- **Light and dark themes** from the original design, with seven backgrounds, each with its own pattern and colours.
- **Swipe pages:** My Room next to the medkit, and the outside of the hospital next to the shop, drawn as full-width pixel scenes.
- **Saves:** autosaves every 10 seconds and when the app is backgrounded. Export (to a folder you choose) or import a save as JSON or CSV.
- **Responsive layout:** the shop sits beside the medkit on tablets and desktops, and below it on phones.

## Getting started

Requires [Bun](https://bun.sh/) and, to render the soundtrack, [ffmpeg](https://ffmpeg.org/).

```bash
bun install
bun run start
```

### Music

**Soundtrack.** The game's own music is composed in code as BeepBox songs (`scripts/compose-music.ts`). `bun run music:compose` writes the BeepBox files to `src/audio/soundtrack/beepbox/` and renders each one with BeepBox's synth to a seamlessly looping MP3 in `src/audio/soundtrack/`. To open a song in the [BeepBox](https://www.beepbox.co) editor, use File > Import JSON. These files are committed and ship in the app.

## Scripts

| Command                             | What it does                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `bun run start`                     | Start the Expo dev server                                                                                         |
| `bun run android` / `bun run ios`   | Build and run on a device or emulator                                                                             |
| `bun run web`                       | Run in the browser                                                                                                |
| `bun run music:compose` | Compose the soundtrack: BeepBox JSON plus looping MP3s (needs ffmpeg) |
| `bun run db:setup` | Create the database tables and upload codes, rewards and music |
| `bun run server` | Run the API locally (needs `.env`, see `.env.example`) |
| `bun run apk:phone` | Test APK for real phones (arm64 only, minified, debug-signed) → `android/app/build/outputs/apk/release/` |
| `bun run apk:release` | The APK to publish: 32- and 64-bit phones, signed with the release key. Attach it to the GitHub release twice, as `medkit-clicker-<version>.apk` and as `medkit-clicker.apk` (the website's Download button links to that name) |
| `bun run lint`                      | Lint with ESLint                                                                                                  |
| `bun run typecheck`                 | Type-check with TypeScript                                                                                        |
| `bun run test`                      | Unit tests for the game logic (Bun's built-in runner)                                                             |
| `bun run add-code <section> <code>` | Register a redeem code. Only its hash is stored, in `.env.local` (gitignored). Restart the dev server afterwards. |

## Project structure

```
src/
  app/            Expo Router screens (_layout.tsx, index.tsx)
  components/     Medkit button, shop, side menu, toasts, UI controls, room/ (My Room), ward/ (minigames)
  constants/      Shop items, achievements, boosts, patients, rooms, rewards, the soundtrack, theme palettes
  hooks/          Game state provider and audio provider
  lib/            Game reducer, number formatting, storage, save export/import
  imgs/ fonts/ audio/ media/   Sprites, fonts, sound, design references
```

Game balance (prices, rates and growth) lives in `src/constants/items.ts`. Development builds show a **Dev tools** section at the bottom of Settings for testing late-game content (add patients or items, unlock achievements, skip time). Achievements live in `src/constants/achievements.ts`.

## Docs

- [docs/TESTING.md](docs/TESTING.md): the test checklist and the latest results
- [docs/DATABASE.md](docs/DATABASE.md): Aiven PostgreSQL, the API, and how to set them up
- [docs/WEBSITE.md](docs/WEBSITE.md): the website in website/: address, deploy and asset sync

## Redeem codes

Reward sections are defined in `src/constants/rewards.ts`. Each one is unlocked by a code, and the code itself never appears in the source or in git. To set one up:

```bash
bun run add-code jasmine "the-code"
```

This writes the code's SHA-256 hash to `.env.local`. Builds made on another machine need the same `.env.local`, or the code won't match.

## Fun fact

The game started as a gift: Dustin made it for Jasmine Sison Taboy, a nursing student, to relieve her stress. That's why the theme is nursing, and why there's a hidden rewards section.

## License

The code is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for the licenses of bundled fonts. The soundtrack in `src/audio/soundtrack/` is original to this project and covered by the same license.

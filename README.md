# Medkit Clicker

A nursing-themed clicker game for iOS, Android and the web, made by Dustin Dwayne Diaz for Jasmine Sison Taboy, to relieve her stress. Tap the medkit to heal patients, then spend them on supplies that keep healing for you.

Built with Expo 57, React Native, React 19, NativeWind v4 and Reanimated 4.

## Features

- **Tap and grow:** every tap heals patients. Syringes, stethoscopes, facemasks, gloves and medicine keep healing while you rest. Each purchase raises the next price by 15%.
- **Offline progress:** your team keeps working for up to 8 hours while the app is closed.
- **111 achievements**, from "First Aid" to healing a vigintillion patients, with progress bars and a few secret ones.
- **Rebirth:** start a new run for rebirth points and a small permanent healing boost.
- **Redeem codes** unlock hidden sections, like a rewards shop where patients buy real-life treats (with a limit on each).
- **Music player** with six playlists, play/pause, track skipping and seeking; sound effects with their own volume; light haptics on native.
- **Light and dark themes** from the original design, with seven backgrounds, each with its own pattern and colours.
- **Swipe pages** next to the medkit (the hospital) and in the shop.
- **Saves:** autosaves every 10 seconds and when the app is backgrounded. Export (to a folder you choose) or import a save as JSON or CSV.
- **Responsive layout:** the shop sits beside the medkit on tablets and desktops, and below it on phones.

## Getting started

Requires [Bun](https://bun.sh/) and, for the music bundle, [ffmpeg](https://ffmpeg.org/).

```bash
bun install
bun run music    # builds src/audio/bundle from your music library (see below)
bun run start
```

### Music

The songs are copyrighted, so they're not in this repository. To build the app with music:

1. Put your tracks in `src/audio/music/<playlist>/track_N.mp3`. The playlist folders are `cup_of_joe`, `love`, `filipino_rap`, `favourites`, `lo-fi` and `normal`.
2. Run `bun run music`. This compresses the first 3 tracks of each playlist to 64 kbps in `src/audio/bundle/`, which comes to about 47 MB.

Both folders are gitignored. Playlist names and tracks are set in `src/constants/playlists.ts`.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run start` | Start the Expo dev server |
| `bun run android` / `bun run ios` | Build and run on a device or emulator |
| `bun run web` | Run in the browser |
| `bun run music` | Build the trimmed music bundle |
| `bun run lint` | Lint with ESLint |
| `bun run typecheck` | Type-check with TypeScript |
| `bun run tasks` | Progress summary of the task board in `docs/TASKS.md` |
| `bun run add-code <section> <code>` | Register a redeem code. Only its hash is stored, in `.env.local` (gitignored). Restart the dev server afterwards. |

## Project structure

```
src/
  app/            Expo Router screens (_layout.tsx, index.tsx)
  components/     Medkit button, shop, side menu, toasts, UI controls
  constants/      Shop items, achievements, playlists, theme palettes
  hooks/          Game state provider and audio provider
  lib/            Game reducer, number formatting, storage, save export/import
  imgs/ fonts/ audio/ media/   Sprites, fonts, sound, design references
```

Game balance (prices, rates and growth) lives in `src/constants/items.ts`. Development builds show a **Dev tools** section at the bottom of Settings for testing late-game content (add patients or items, unlock achievements, skip time). Achievements live in `src/constants/achievements.ts`.

## Docs

- [docs/TASKS.md](docs/TASKS.md): status, roadmap, open decisions and concerns
- [docs/ASSETS.md](docs/ASSETS.md): art that's still needed, with sizes and where it goes

## Redeem codes

Reward sections are defined in `src/constants/rewards.ts`. Each one is unlocked by a code, and the code itself never appears in the source or in git. To set one up:

```bash
bun run add-code jasmine "the-code"
```

This writes the code's SHA-256 hash to `.env.local`. Builds made on another machine need the same `.env.local`, or the code won't match.

## License

The code is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for the licenses of bundled fonts. Music is not included and is not covered by this license.

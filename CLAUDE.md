# CLAUDE.md - Medkit Clicker (MC)

## 🏗️ Project Overview
Medkit Clicker is a one-page React Native application built with Expo 57, React 19, and NativeWind v4. It's a medical-themed incremental (clicker) game.

## 🛠️ Development Commands
- **Start Project**: `bun run start` (Starts Expo server)
- **Run Android**: `bun run android`
- **Run iOS**: `bun run ios`
- **Run Web**: `bun run web`
- **Linting**: `bun run lint`
- **Typecheck**: `bun run typecheck`
- **Compose the soundtrack**: `bun run music:compose` (BeepBox JSON + looping MP3s in `src/audio/soundtrack/`; needs ffmpeg)

## 🎨 Coding Standards & Style
- **Components**: Use functional components with hooks.
- **Styling**: Use **NativeWind (Tailwind CSS)** classes via the `className` prop. Avoid inline styles or `StyleSheet.create` unless absolutely necessary for dynamic animations.
- **Animations**: Prefer `react-native-reanimated` for performance-critical game animations.
- **Types**: Use TypeScript for all components and logic. Ensure proper typing for state and props.
- **File Structure**:
  - Main entry: `src/app/index.tsx`
  - Reusable logic/hooks: `src/hooks/`
  - Components: `src/components/`
  - Constants/Config: `src/constants/`
  - Pure game logic and storage: `src/lib/`
- **Imports**: Use path aliases defined in `tsconfig.json` (e.g., `@/components/...` instead of `../../components/...`). Prefer grouped imports (React first, then Expo/RN, then local).

## 🎮 Game Logic Guidelines
- **State Management**: For a one-page app, `useState` or `useReducer` is sufficient. If complexity grows, consider Context API or a lightweight store.
- **Performance**: Minimize re-renders on the main clicker component. Optimize list rendering for the shop if it becomes large.
- **Audio**: Use `expo-audio` (`expo-av` is removed in this SDK). Players live in `src/hooks/use-audio.tsx`.
- **React Compiler is on**: don't write refs during render, and set Reanimated shared values with `.set()`/`.get()`.
- **Theme**: colours are CSS variables set by `themeVars` in `src/constants/theme.ts`. Use `bg-primary`, `text-ink` and so on, and re-apply `themeVars` inside any `Modal`. For raw hex values (SVG, text shadows), use `usePalette()`.
- **Reanimated + NativeWind**: `className` on `Animated.View` is ignored on native. Animate an outer `Animated.View` with `style` only, and put classes on an inner `View`.
- **UI building blocks** (`src/components/ui/`): `HardShadow` (offset pixel shadow), `PixelIcon` (7x7 pixel glyphs; add new ones as grids), `PixelButton`, `Pager` (swipe pages with dots), `ConfirmDialog`, and the settings controls in `controls.tsx`.
- **Rates**: always use `healingRate()` / `tapValue()` (they include rebirth, active boosts and placed room items), never bare `perSecond()`. Offline earnings pass state without `boosts`.
- **Time in render**: use `useNow()` for countdowns; the React Compiler rejects `Date.now()` during render.
- **No invented content**: the owner designs items, mechanics and art. Put placeholders in `docs/TASKS.md` under "Needs your decision".
- **Multi-file edits**: hot reload applies each saved file on its own, so a half-applied rename can crash the running app. Apply related edits together.
- **Emulator**: `bun run android` builds and installs a native debug build (`com.dust.dev.mc`) that loads JS from Metro via `adb reverse tcp:8081 tcp:8081`. For a full test (bundled images and audio) build `cd android && ./gradlew assembleRelease` and `adb install -r app/build/outputs/apk/release/app-release.apk`. Debug builds stream assets from Metro, so first loads are slow and audio can time out; that's not a bug. Live reload drops after the app is backgrounded (for example by a file picker), so restart the app if changes don't show.
- **Assets**: Reference images from `src/imgs/` and audio from `src/audio/`.

## 🧪 Testing
- `bun run test` runs the game-logic unit tests (`src/**/*.test.ts`, Bun's built-in runner; `scripts/test-preload.ts` stubs image/audio imports).
- UI is tested by hand on the emulator with `docs/TESTING.md`.

## 📌 Standing rules (from the owner)
- **No co-author or Claude attribution** in commits or PRs.
- **The code-locked reward section:** don't document its content (rewards, music, items) in the repo, and keep its specifics out of commits where possible: per-section data lives in `.env.local` and the database. It appears only as a fun fact in the README, never in credits, the website or app copy.
- **Stage specific paths** (`git add <paths>`), never `git add -A` at the root.
- **Never print DB credentials** (pipe script output through `sed -E 's#postgres(ql)?://[^ ]*#***#g'`). Never reset or re-seed the live database; `bun run db:setup` re-syncs reward sections, so only run it when asked.
- **Promo codes live in the database only**: `bun run add-promo <code> <kind:amount[,...]|background:id> [max-claims] [message]`. Never hard-code codes in the app or docs.
- **Push only after the build works.** Render redeploys the API on every push to `main`; GitHub Actions redeploys the website on every push.
- **Before a build:** `bun run typecheck`, `bun run lint`, `bun run test`.
- **Bash:** keep commands short; write longer scripts or patches to the scratchpad and run them from there. Files mix CRLF and LF line endings, so match on LF-normalised text when patching.
- **Art:** the owner approves art changes from before/after previews before anything is overwritten.

## 📦 Building and installing
- If native modules changed: `CI=1 bunx expo prebuild --platform android --clean`.
- `bun run apk:phone`, then `cd android && ./gradlew --stop` (frees memory), then copy `android/app/build/outputs/apk/release/app-release.apk` to `dist/medkit-clicker-phone.apk`.
- Install with `adb install -r dist/medkit-clicker-phone.apk`, or serve `dist/` on the Wi-Fi and share a QR code. The PC is low on memory, so background servers may be stopped by Claude Code; don't restart them unasked.

## 🎨 Art pipeline
- Every image has an Aseprite source in `src/media/photos/sprites/<same path>.aseprite`; the game uses nearest-neighbour PNG exports in `src/imgs/`: 32×32 sprites ×32 (1024) for `shop/`, `achievements/`, `misc/`, `boosts/`, `skins/`; ×4 (128) for `room/`, `rewards/`; scenes are 320×240 ×4 (1280×960). Style: no black outlines (darker shades of the fill), no built-in sparkles.
- To find sources that changed without a fresh PNG, compare each PNG with its source export; re-export at that folder's scale.
- `scripts/boost-icons.lua` rebuilds the boost icons; `scripts/sticker.lua` turns a sprite into a die-cut sticker (then `bun scripts/sticker-data.ts`).
- Asset checks and history: `docs/ASSET_INSPECTION.md`.

## 🌐 Server, alerts and website
- API: `server/index.ts` on Render (free plan), Postgres on Aiven (free plan, few connection slots: the server pool is capped at 3). `/health` reports whether reward alerts are configured and how the last one went.
- Reward alerts use ntfy.sh. ntfy rate-limits Render's shared IPs (HTTP 429) even with `NTFY_TOKEN`, so when the server is refused, `/redeem` returns the alert and the phone sends it, then confirms with `/alerted`. Failed alerts are retried every 10 minutes for a day (ntfy's free daily quota counts refused attempts too). Rewards with `rewards.silent = true` (set in the database) send no alert.
- A code-locked section can end on a date: `bun run expire-section <section> <ISO date>` (app via `.env.local`, rebuild needed; server via the database).
- Website: `website/` (Vue + Vite), deployed to GitHub Pages by `.github/workflows/website.yml` on every push. After changing game art, run `bun run sync-assets` in `website/`; game facts are mirrored in `website/src/lib/content.ts`.
- iOS isn't built yet; the free AltStore/SideStore plan is in `docs/IOS.md`.

## 🗺️ Where things stand (2026-10-22)
- Early testing on Android. Open decisions and history: `docs/TASKS.md`. Database notes: `docs/DATABASE.md`.

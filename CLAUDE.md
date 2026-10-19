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
- **Build music bundle**: `bun run music` (needs ffmpeg; output in `src/audio/bundle/`, gitignored)

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
- **Rates**: always use `healingRate()` / `tapValue()` (they include the rebirth boost), never bare `perSecond()`.
- **No invented content**: the owner designs items, mechanics and art. Put placeholders in `docs/TASKS.md` under "Needs your decision".
- **Multi-file edits**: hot reload applies each saved file on its own, so a half-applied rename can crash the running app. Apply related edits together.
- **Emulator**: run `adb reverse tcp:8081 tcp:8081` and open `exp://127.0.0.1:8081` in Expo Go. Live reload drops after the app is backgrounded (for example by a file picker), so restart the app if changes don't show.
- **Assets**: Reference images from `src/imgs/` and audio from `src/audio/`.

## 🧪 Testing (Future)
- Use `jest` and `react-native-testing-library` for unit and component tests.

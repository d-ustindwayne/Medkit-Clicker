# Medkit Clicker website

The website for Medkit Clicker, a cosy pixel-art idle game about running a hospital. The game opens it from **Menu → Visit website**.

Built with Vue 3, Vite, Bulma (SCSS) and three.js, and deployed to GitHub Pages.

## How the page works

The home page is one scroll through the game. Behind it, a three.js scene turns the game's own pixel sprites into cubes, one cube per art pixel. Each chapter rebuilds the same cubes into a new sprite: medkit, heart, stethoscope, trophy, nurse, hospital, headphones, then the medkit again. Click the cubes to heal a patient (quick taps build a combo that throws off more cubes), drag sideways to spin the sprite, and on a computer the cubes under the cursor lean out to meet it. Healing 50 patients pops an achievement with a download link. On phones each chapter opens with an empty window that the sprite sits in, so the cards never cover it. The strip under the navbar is a patient monitor that draws as you scroll; its beats link to the chapters.

| Path | What it is |
| --- | --- |
| `src/lib/voxels.ts` | Reads a sprite PNG and returns its cubes |
| `src/lib/stage.ts` | The three.js scene: the rebuild, taps, drifting crosses |
| `src/views/HomeView.vue` | Chapters, the sprite and position for each, scroll tracking |
| `src/views/DocsView.vue` | The how-to-play guide (navbar: Documentation) |
| `src/views/ContactView.vue` | Contact and Support |
| `src/lib/content.ts` | Game facts copied from the game's `src/constants` |
| `src/lib/links.ts` | Download, support and email links |
| `src/styles/main.scss` | Bulma setup and the game's light and dark palettes |

## Commands

```bash
bun install
bun run dev          # http://localhost:5173
bun run build        # type-check and build to dist/
bun run preview      # serve the build
bun run sync-assets  # copy art, fonts and music from the game (when this folder sits inside the game's folder)
```

## Deploying

The site lives in the game repo and is served at https://medkit-clicker.dustindwayn.ee/ (custom domain on GitHub Pages). Pushes to `main` run `.github/workflows/website.yml` (at the repo root), which builds with `BASE_PATH=/`, runs `scripts/route-pages.ts` and `scripts/altstore-source.ts`, and publishes only `website/dist`. One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Accessibility

Respects `prefers-reduced-motion` (cubes swap without flying, the background holds still, the staff stop walking), has visible keyboard focus, a skip link, a button that taps the medkit without a mouse, and alt text on content images. If WebGL isn't available, the hero shows the flat medkit sprite.

## Licence

Code under the Apache License 2.0, like the game. Art and the soundtrack come from the game. Fonts: Silkscreen (Jason Kottke) and Nunito (Vernon Adams), SIL Open Font License 1.1.

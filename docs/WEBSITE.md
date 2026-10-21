# Medkit Clicker website

The game's own website, opened from **Menu → Visit website** in the app.

- **Address:** https://d-ustindwayne.github.io/Medkit-Clicker (set in `src/constants/app.ts`)
- **Code:** `website/` in this repo, its own Vite project (Vue 3, Bulma with SCSS, three.js) with its own `package.json`
- **Hosting:** GitHub Pages, built and published by `.github/workflows/website.yml`
- **Status:** built; see `website/README.md` for how the page works

## Where the code lives

GitHub Pages serves a project site at `https://<user>.github.io/<repo-name>/`. The site moved into this repo on 2026-10-21 so it is served at `/Medkit-Clicker/`, the game repo's own name. It started in a separate repo, `Medkit-Clicker-Website`, which is no longer used.

Pages publishes only the built site (`website/dist`: HTML, scripts, styles, images and music). Nothing else in this repo is served.

## Deploying

The workflow runs on every push to `main`, and can be started by hand from the Actions tab (Run workflow). It builds with `BASE_PATH=/Medkit-Clicker/` and publishes to Pages. One-time setup (done 2026-10-22): in this repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Assets

The site keeps its own copies of the game's art, fonts and soundtrack in `website/src/assets/`. After changing art in the game, run `bun run sync-assets` in `website/` to copy it over again (the list of files is in `website/scripts/sync-assets.ts`).

## Content

Game facts on the site (supplies, boosts, hospital looks, skies, rooms, tracks) are copied into `website/src/lib/content.ts` from `src/constants/`. Update it when those change. Outside links (APK download, issues, GitHub profile, an optional email) are in `website/src/lib/links.ts`.

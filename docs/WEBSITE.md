# Medkit Clicker website

The game's own website, opened from **Menu → Visit website** in the app.

- **Address:** https://medkit-clicker.dustindwayn.ee (set in `src/constants/app.ts` and `website/src/lib/pages.ts`); the old https://d-ustindwayne.github.io/Medkit-Clicker address redirects there
- **Code:** `website/` in this repo, its own Vite project (Vue 3, Bulma with SCSS, three.js) with its own `package.json`
- **Hosting:** GitHub Pages, built and published by `.github/workflows/website.yml`
- **Status:** built; see `website/README.md` for how the page works

## Where the code lives

The site moved into this repo on 2026-10-21. It started in a separate repo, `Medkit-Clicker-Website`, which is no longer used. Since 2026-10-29 it is served from the root of the custom domain `medkit-clicker.dustindwayn.ee` (the owner's domain, `https://<repo-name>.dustindwayn.ee/`; DNS points at GitHub Pages), with the game at `/play/`.

Pages publishes only the built site (`website/dist`: HTML, scripts, styles, images and music). Nothing else in this repo is served.

## Deploying

The workflow runs on every push to `main`, and can be started by hand from the Actions tab (Run workflow). It builds with `BASE_PATH=/`, writes one HTML file per page plus `sitemap.xml` (`website/scripts/route-pages.ts`, from the page list in `website/src/lib/pages.ts`) and the AltStore source `altstore.json` (`website/scripts/altstore-source.ts`, from the GitHub Releases that carry an iPhone build), then publishes to Pages. One-time setup: in this repo's **Settings → Pages**, set **Source** to **GitHub Actions** (done 2026-10-22) and **Custom domain** to `medkit-clicker.dustindwayn.ee` with **Enforce HTTPS** on.

**SEO:** each page has its own title, description, canonical link, Open Graph and Twitter tags (set in the HTML at build time and kept in step by `router.ts`), the home page carries schema.org `VideoGame` data, and `robots.txt` points to the sitemap. Add new pages to `pages.ts`.

## Assets

The site keeps its own copies of the game's art, fonts and soundtrack in `website/src/assets/`. After changing art in the game, run `bun run sync-assets` in `website/` to copy it over again (the list of files is in `website/scripts/sync-assets.ts`).

## Content

Game facts on the site (supplies, boosts, hospital looks, skies, rooms, tracks) are copied into `website/src/lib/content.ts` from `src/constants/`. Update it when those change. Outside links (APK download, issues, GitHub profile, an optional email) are in `website/src/lib/links.ts`.

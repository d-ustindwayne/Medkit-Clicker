# Medkit Clicker website: plan

The game's own website, opened from **Menu → Visit website** in the app. It will be built after the game is finished.

- **Address:** https://d-ustindwayne.github.io/MedkitClicker (set in `src/constants/app.ts`)
- **Stack:** Vue 3 + Vite, Bulma with SCSS, three.js
- **Hosting:** GitHub Pages
- **Status:** not started; the address shows nothing yet

## Where the code lives

GitHub Pages serves a project site at `https://<user>.github.io/<repo-name>/`, so the address decides the repository:

| Option | Address it gives | Good | Not so good |
| --- | --- | --- | --- |
| **A. Its own repo named `MedkitClicker`** (recommended) | `/MedkitClicker` (matches the link in the app) | Website and game stay separate: their own tools, issues, history and deploys. A website agent never touches the game's code. | Two repos; assets the site borrows from the game are copied over. |
| B. A `website/` folder in this repo (`Medkit-Clicker`) | `/Medkit-Clicker` (the app link would change) | One repo; the site can use the game's art directly. | Mixes a Vite/Vue project into the Expo project; separate dependencies and builds in one place. |

With option A, Vite needs `base: "/MedkitClicker/"`, and a GitHub Actions workflow builds and publishes to Pages.

## What the site is for (from our plan so far)

- Introduce the game: what it is, how it plays, screenshots
- A download link for the Android APK (GitHub Releases)
- Credits: made by Dustin Dwayne Diaz; the original soundtrack; fonts
- A small three.js moment that feels like the game, for example a spinning pixel medkit you can click

## Your vision

> Write here what you want the site to contain and how it should look and feel. Anything goes: pages, sections, the mood, sites you like, what the three.js part should do, how a visitor should feel when they open it.
>
> - Pages / sections:
> - Look and feel:
> - The three.js part:
> - Must have:
> - Must not have:
> - Sites I like:

## Starter prompt (for Fable or another agent)

A temporary prompt with sensible defaults. Replace the parts in [brackets] with your vision above before using it.

```text
Build the website for Medkit Clicker, a pixel-art medical idle clicker game for Android.

Stack: Vue 3 + Vite, Bulma with SCSS (customise Bulma's variables; don't use plain Bulma defaults),
and three.js for one interactive 3D element. Deploy to GitHub Pages at
https://d-ustindwayne.github.io/MedkitClicker (Vite base "/MedkitClicker/") with a GitHub Actions workflow.

About the game:
- You tap a medkit to heal patients, buy supplies (bandages, gloves, stethoscope, up to a DNA lab)
  that heal patients for you, earn Care Coins from 111 achievements, spend them on boosts, treat sick
  patients in quick minigames, decorate hospital rooms, and rebirth to grow a small clinic into a
  grand medical center. It has an original lo-fi soundtrack.
- Made by Dustin Dwayne Diaz. The tone is cosy, calm and caring, never clinical or stressful.

Look:
- Use the game's colours:
  light theme: red #dd1122 (primary), cream #fafdf3 (surface), black #000000 (text and outlines),
  pink #ffc0cb (accent), blush #f9e8e8 (background), green #4edb4e (success), coral #f34747 (danger).
  dark theme: crimson #a3182a, navy #172631 (surface), #0f1c24 (background), #eef3f6 (text),
  #24475a (accent), #2f9e4f (success).
- Fonts from the game: Silkscreen for pixel headings, Inter Bold for titles, Nunito for body text.
- Pixel-art style to match the game: hard offset shadows (no blur), thick black outlines, crisp
  pixel images (image-rendering: pixelated). Support light and dark mode.

Content:
- Hero with the game name, a one-line pitch and a download button (link: [APK release URL]).
- How to play, in a few short steps.
- Features (shop, boosts, achievements, minigames, My Room, rebirth and the growing hospital, soundtrack).
- Screenshots: [add files].
- Credits.
- [Anything from "Your vision".]

three.js: [default: a low-poly or voxel medkit that slowly spins; clicking it makes a small
"+1" pop and a soft pulse, like tapping in the game.]

Keep it fast and accessible: responsive down to phone width, keyboard focus visible, respect
prefers-reduced-motion (pause the 3D animation), alt text on every image.
```

## Assets the site can reuse from the game

- Sprites: `src/imgs/` (medkit, shop items, achievements, hospital scenes, characters). Source files in `src/media/photos/sprites/`.
- Soundtrack: `src/audio/soundtrack/*.mp3` (original, same licence as the game).
- Fonts: see `NOTICE` for their licences.

// Asset check (report only, changes nothing): the automatic part of docs/ASSET_INSPECTION.md.
//
//   bun scripts/check-assets.ts [files or folders...]   (default: everything in src/imgs)
//
// Every image is read at its art size (a 1024 px icon is 32 x 32 art blown up 32 times) and checked:
//   - an Aseprite source exists (src/media/photos/sprites/<same path>.aseprite)
//   - it's an exact nearest-neighbour blow-up (no blurred or half-moved pixels)
//   - no pure black (outlines are darker shades of the fill)
//   - no stray pixels: specks of 1-3 pixels apart from the rest
//   - no pinholes: a see-through pixel with art on all four sides
// and, for icons (one object on a 32 x 32 canvas):
//   - centred, and big enough to read (not a speck in the middle)
//   - not too busy for its size (colour count)
//   - its edge shows up on both the light and the dark theme's background
//   - the file isn't bigger than it needs to be (palette PNG, see scripts/optimize-png.ts)
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

import { encodePalette } from "./optimize-png";

const ROOT = "src/imgs";
const SOURCES = "src/media/photos/sprites";
/** Folders of single-object icons, which get the icon checks. */
const ICON_DIRS = ["shop", "achievements", "boosts", "misc", "skins", "minigames", "rewards", "gems/bg_"];
/** Particles are meant to be small; photos and generated looks have no hand-made source. */
const NOT_ICONS = [/gems\/p_/, /dustin_photo/];
const NO_SOURCE_NEEDED = [/dustin_photo/, /characters\/variants\//, /stickers\//];
/** Drawn by scripts (textures/: galaxy-texture.ts), not pixel art: none of these checks apply. */
const NOT_PIXEL_ART = [/textures\//];
const BG = { light: [249, 232, 232], dark: [15, 28, 36] };

type Art = { w: number; h: number; px: Uint8Array; k: number; exact: boolean };
/** Is the image made of k x k blocks of one colour each? */
function blocksOf(png: PNG, k: number) {
  if (png.width % k || png.height % k) return false;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4, si = ((y - (y % k)) * png.width + x - (x % k)) * 4;
      if (png.data[i + 3] === 0 && png.data[si + 3] === 0) continue;
      for (let c = 0; c < 4; c++) if (png.data[i + c] !== png.data[si + c]) return false;
    }
  return true;
}
/**
 * The image at its art size: the biggest block size it's an exact blow-up of (32 for icons, 4 for
 * scenes and characters...). `exact` is false when the size it should have (a 1024 icon = x32) doesn't fit.
 */
function readArt(file: string): Art {
  const png = PNG.sync.read(fs.readFileSync(file));
  const expected = png.width === 1024 && png.height === 1024 ? 32 : 0;
  const k = [64, 32, 16, 8, 4, 2].find((n) => blocksOf(png, n)) ?? 1;
  const w = png.width / k, h = png.height / k;
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set(png.data.subarray((y * k * png.width + x * k) * 4, (y * k * png.width + x * k) * 4 + 4), (y * w + x) * 4);
  return { w, h, px, k, exact: !expected || k % expected === 0 };
}

const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

function check(file: string) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  const issues: string[] = [];
  if (NOT_PIXEL_ART.some((r) => r.test(rel))) return issues;
  const art = readArt(file);
  const { w, h, px } = art;
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 0;
  const rgb = (x: number, y: number) => [...px.subarray((y * w + x) * 4, (y * w + x) * 4 + 3)];

  if (!NO_SOURCE_NEEDED.some((r) => r.test(rel)) && !fs.existsSync(path.join(SOURCES, rel.replace(/\.png$/, ".aseprite")))) issues.push("no Aseprite source");
  if (!art.exact) issues.push(`not an exact x${art.k} blow-up of its art`);

  let black = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (opaque(x, y) && rgb(x, y).every((v) => v === 0)) black++;
  if (black) issues.push(`${black} pure black pixel(s)`);

  // Stray specks: groups of 1-3 pixels (touching corners count) with nothing else within 1 pixel.
  const seen = new Uint8Array(w * h);
  const specks: string[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!opaque(x, y) || seen[y * w + x]) continue;
      const group: [number, number][] = [];
      const todo: [number, number][] = [[x, y]];
      seen[y * w + x] = 1;
      while (todo.length) {
        const [a, b] = todo.pop()!;
        group.push([a, b]);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (opaque(a + dx, b + dy) && !seen[(b + dy) * w + a + dx]) {
              seen[(b + dy) * w + a + dx] = 1;
              todo.push([a + dx, b + dy]);
            }
      }
      if (group.length <= 3) specks.push(`${group[0][0]},${group[0][1]}`);
    }
  if (specks.length && specks.length <= 6) issues.push(`stray pixel(s) at ${specks.join(" ")}`);
  else if (specks.length) issues.push(`${specks.length} stray specks (scattered on purpose?)`);

  const holes: string[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!opaque(x, y) && opaque(x - 1, y) && opaque(x + 1, y) && opaque(x, y - 1) && opaque(x, y + 1)) holes.push(`${x},${y}`);
  if (holes.length) issues.push(`pinhole(s) at ${holes.slice(0, 6).join(" ")}${holes.length > 6 ? "..." : ""}`);

  const isIcon = w === 32 && h === 32 && ICON_DIRS.some((d) => rel.startsWith(d)) && !NOT_ICONS.some((r) => r.test(rel));
  if (isIcon) {
    let x0 = 32, x1 = -1, y0 = 32, y1 = -1;
    const colours = new Set<string>();
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        if (opaque(x, y)) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          colours.add(rgb(x, y).join(","));
        }
    if (x1 < 0) issues.push("empty");
    else {
      const left = x0, right = 31 - x1;
      if (Math.abs(left - right) > 3) issues.push(`off-centre: ${left} px free on the left, ${right} on the right`);
      if (x1 - x0 < 14 && y1 - y0 < 14) issues.push(`small: ${x1 - x0 + 1} x ${y1 - y0 + 1} of 32 x 32`);
      if (colours.size > 24) issues.push(`busy: ${colours.size} colours`);
      // The outermost pixels against each theme's background.
      for (const [theme, bg] of Object.entries(BG)) {
        let low = 0, all = 0;
        for (let y = 0; y < 32; y++)
          for (let x = 0; x < 32; x++)
            if (opaque(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !opaque(x + dx, y + dy))) {
              all++;
              if (contrast(rgb(x, y), bg) < 1.6) low++;
            }
        if (all && low / all > 0.5) issues.push(`hard to see on the ${theme} theme (${Math.round((low / all) * 100)}% of its edge blends in)`);
      }
    }
  }

  const size = fs.statSync(file).size;
  const smaller = encodePalette(PNG.sync.read(fs.readFileSync(file)));
  if (smaller && smaller.length < size * 0.85) issues.push(`file ${(size / 1024).toFixed(1)} KB could be ${(smaller.length / 1024).toFixed(1)} KB (bun scripts/optimize-png.ts --write)`);
  return issues;
}

const walk = (p: string): string[] => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : p.endsWith(".png") ? [p] : []);

if (import.meta.main) {
  const targets = process.argv.slice(2);
  const files = (targets.length ? targets : [ROOT]).flatMap(walk).sort();
  let flagged = 0;
  for (const f of files) {
    const issues = check(f);
    if (!issues.length) continue;
    flagged++;
    console.log(`${path.relative(ROOT, f).replaceAll("\\", "/")}\n  - ${issues.join("\n  - ")}`);
  }
  // Sources without a game image.
  const pngs = new Set(walk(ROOT).map((f) => path.relative(ROOT, f).replaceAll("\\", "/").replace(/\.png$/, "")));
  const orphans = targets.length ? [] : fs.existsSync(SOURCES) ? walkSources(SOURCES).filter((s) => !pngs.has(s)) : [];
  if (orphans.length) console.log(`Aseprite sources with no game image: ${orphans.join(", ")}`);
  console.log(`\n${files.length} images checked, ${flagged} with something to look at.`);
}

function walkSources(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) return walkSources(p);
    return p.endsWith(".aseprite") ? [path.relative(SOURCES, p).replaceAll("\\", "/").replace(/\.aseprite$/, "")] : [];
  });
}

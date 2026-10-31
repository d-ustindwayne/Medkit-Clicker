// Draws the Galaxy background's spiral once into src/imgs/textures/galaxy.png (and a soft glow), so the game turns a
// picture instead of redrawing ~200 SVG gradients and shapes (that made the Galaxy background slow).
// Same layout as the old SVG in components/background-pattern.tsx. Run: bun scripts/galaxy-texture.ts
import fs from "node:fs";
import { PNG } from "pngjs";

const SIZE = 1024;
const r = SIZE / 2;
const GLOWS = 44;
const STARS = 110;
const ARM_COLOURS = ["#ff9ad5", "#c08cff", "#8f7bff", "#6fd6ff"];
const ACCENT = "#7b4dd8";
const STAR = "#ece8ff";

const noise = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 * salt + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// Premultiplied RGBA, 0-1.
const buf = new Float32Array(SIZE * SIZE * 4);
const over = (x: number, y: number, rgb: number[], a: number) => {
  if (a <= 0 || x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  for (let c = 0; c < 3; c++) buf[i + c] = rgb[c] * a + buf[i + c] * (1 - a);
  buf[i + 3] = a + buf[i + 3] * (1 - a);
};

type Stop = [offset: number, color: string, opacity: number];
/** A circle filled with a radial gradient (colour and opacity blended between stops). */
function radial(cx: number, cy: number, rr: number, stops: Stop[]) {
  const s = stops.map(([o, c, a]) => [o, hex(c), a] as const);
  for (let y = Math.floor(cy - rr); y <= Math.ceil(cy + rr); y++)
    for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) {
      const t = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rr;
      if (t >= 1) continue;
      let k = 0;
      while (k < s.length - 2 && t > s[k + 1][0]) k++;
      const [o0, c0, a0] = s[k], [o1, c1, a1] = s[k + 1];
      const f = Math.min(1, Math.max(0, (t - o0) / (o1 - o0)));
      over(x, y, c0.map((v, j) => v + (c1[j] - v) * f), a0 + (a1 - a0) * f);
    }
}

const onArm = (arm: number, k: number, jitter = 0) => {
  const a = arm * Math.PI + k * Math.PI * 2.6 + jitter;
  const dist = r * (0.07 + k * 0.86);
  return { x: r + Math.cos(a) * dist, y: r + Math.sin(a) * dist };
};

radial(r, r, r * 0.62, [[0, ACCENT, 0.45], [0.55, "#3b2c8f", 0.18], [1, "#0b0a2a", 0]]);
for (let i = 0; i < GLOWS * 2; i++) {
  const t = Math.floor(i / 2) / (GLOWS - 1);
  const k = Math.sqrt(t);
  const p = onArm(i % 2, k, (noise(i, 46) - 0.5) * 0.06);
  const j = Math.min(3, Math.floor(t * 4));
  const c = ARM_COLOURS[j];
  radial(p.x, p.y, r * (0.15 - k * 0.07), [[0, c, 0.42 - j * 0.05], [0.55, c, 0.14], [1, c, 0]]);
}
radial(r, r, r * 0.24, [[0, "#ffffff", 1], [0.22, "#ffe2f4", 0.95], [0.55, "#ff9ad5", 0.45], [1, "#9b5cff", 0]]);
for (let i = 0; i < STARS; i++) {
  const k = noise(i, 41);
  const p = onArm(i % 2, k, (noise(i, 42) - 0.5) * (0.5 + k * 0.5));
  const spread = r * 0.06 * (noise(i, 43) - 0.5);
  const s = noise(i, 44) > 0.88 ? 5 : noise(i, 44) > 0.45 ? 3 : 2;
  const x0 = Math.round(p.x + spread), y0 = Math.round(p.y + spread);
  for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) over(x, y, hex(STAR), 0.95 - k * 0.45);
}

const png = new PNG({ width: SIZE, height: SIZE });
for (let i = 0; i < SIZE * SIZE; i++) {
  const a = buf[i * 4 + 3];
  for (let c = 0; c < 3; c++) png.data[i * 4 + c] = a > 0 ? Math.round(Math.min(1, buf[i * 4 + c] / a) * 255) : 0;
  png.data[i * 4 + 3] = Math.round(a * 255);
}
fs.mkdirSync("src/imgs/textures", { recursive: true });
fs.writeFileSync("src/imgs/textures/galaxy.png", PNG.sync.write(png, { colorType: 6 }));
console.log("src/imgs/textures/galaxy.png");

// The soft glow (white, tinted in the game) behind the moon, fireflies and sakura light: a picture
// is much cheaper to move than an SVG gradient.
{
  const G = 128;
  const glow = new PNG({ width: G, height: G });
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      const t = Math.hypot(x + 0.5 - G / 2, y + 0.5 - G / 2) / (G / 2);
      const a = t >= 1 ? 0 : t < 0.5 ? 1 - (t / 0.5) * 0.65 : 0.35 * (1 - (t - 0.5) / 0.5);
      const i = (y * G + x) * 4;
      glow.data[i] = glow.data[i + 1] = glow.data[i + 2] = 255;
      glow.data[i + 3] = Math.round(a * 255);
    }
  fs.writeFileSync("src/imgs/textures/glow.png", PNG.sync.write(glow, { colorType: 6 }));
  console.log("src/imgs/textures/glow.png");
}

// Lossless PNG shrinking for the pixel art: a PNG with 256 colours or fewer is re-encoded as a
// palette PNG (1, 2, 4 or 8 bits a pixel), which is far smaller than full RGBA. The result is
// decoded and compared pixel by pixel before anything is written; photos (more colours) are skipped.
//
//   bun scripts/optimize-png.ts [--write] [files or folders...]   (default: src/imgs, report only)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { PNG } from "pngjs";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** The palette PNG for this image, or null if it has more than 256 colours. */
export function encodePalette(png: PNG): Buffer | null {
  const { width, height, data } = png;
  const index = new Map<number, number>();
  const colours: number[] = [];
  const px = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    // Fully transparent pixels are all the same colour.
    const a = data[i * 4 + 3];
    const key = a === 0 ? 0 : ((data[i * 4] << 24) | (data[i * 4 + 1] << 16) | (data[i * 4 + 2] << 8) | a) >>> 0;
    let k = index.get(key);
    if (k === undefined) {
      if (colours.length === 256) return null;
      k = colours.length;
      index.set(key, k);
      colours.push(key);
    }
    px[i] = k;
  }
  // Transparent entries first, so the tRNS chunk stays short.
  const order = colours.map((c, i) => i).sort((a, b) => (colours[a] & 0xff) - (colours[b] & 0xff) || a - b);
  const remap = new Uint8Array(colours.length);
  order.forEach((old, i) => (remap[old] = i));
  const sorted = order.map((i) => colours[i]);
  const bits = sorted.length <= 2 ? 1 : sorted.length <= 4 ? 2 : sorted.length <= 16 ? 4 : 8;
  const rowBytes = Math.ceil((width * bits) / 8);
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (rowBytes + 1);
    for (let x = 0; x < width; x++) {
      const v = remap[px[y * width + x]];
      const bit = x * bits;
      raw[row + 1 + (bit >> 3)] |= v << (8 - bits - (bit & 7));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bits;
  ihdr[9] = 3;
  const plte = Buffer.from(sorted.flatMap((c) => [c >>> 24, (c >>> 16) & 0xff, (c >>> 8) & 0xff]));
  const alphas = sorted.map((c) => c & 0xff);
  const lastSeeThrough = alphas.findLastIndex((a) => a < 255);
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("PLTE", plte)];
  if (lastSeeThrough >= 0) parts.push(chunk("tRNS", Buffer.from(alphas.slice(0, lastSeeThrough + 1))));
  parts.push(chunk("IDAT", zlib.deflateSync(raw, { level: 9, memLevel: 9 })), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/** Same picture? (Fully transparent pixels match whatever their colour.) */
const samePixels = (a: PNG, b: PNG) => {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] === 0 && b.data[i + 3] === 0) continue;
    for (let c = 0; c < 4; c++) if (a.data[i + c] !== b.data[i + c]) return false;
  }
  return true;
};

const walk = (p: string): string[] => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : p.endsWith(".png") ? [p] : []);

if (import.meta.main) {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const targets = args.filter((a) => a !== "--write");
  const files = (targets.length ? targets : ["src/imgs"]).flatMap(walk);
  let before = 0, after = 0, changed = 0;
  const skipped: string[] = [];
  for (const f of files) {
    const buf = fs.readFileSync(f);
    before += buf.length;
    const png = PNG.sync.read(buf);
    const out = encodePalette(png);
    if (!out || out.length >= buf.length) {
      after += buf.length;
      if (!out) skipped.push(f);
      continue;
    }
    if (!samePixels(png, PNG.sync.read(out))) throw new Error(`${f}: the palette copy doesn't match, left alone`);
    after += out.length;
    changed++;
    if (write) fs.writeFileSync(f, out);
  }
  console.log(`${files.length} PNGs: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB, ${changed} smaller${write ? " (written)" : " (report only; --write to save)"}`);
  if (skipped.length) console.log(`More than 256 colours (left as they are): ${skipped.join(", ")}`);
}

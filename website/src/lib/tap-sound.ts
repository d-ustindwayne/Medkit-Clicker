import { SFX } from "@/lib/content";

// The game's medkit tap sound for the site's medkit. Browsers play sound without asking once the
// visitor has tapped or clicked the page, so the sound is decoded ahead of time and the first tap
// switches the (suspended) audio on.

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let last = 0;
/** Taps closer together than this share one sound. */
const GAP_MS = 45;

/** Fetches and decodes the sound; call once the page has loaded. Safe to call again. */
export function preloadTapSound() {
  if (ctx || typeof AudioContext === "undefined") return;
  try {
    ctx = new AudioContext();
    out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
    fetch(SFX.tap)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx!.decodeAudioData(data))
      .then((b) => (buffer = b))
      .catch(() => {});
  } catch {
    ctx = null;
  }
}

/** Plays the tap sound (from a tap or click handler). */
export function playTapSound() {
  if (!ctx) preloadTapSound();
  if (!ctx || !out) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = performance.now();
  if (!buffer || now - last < GAP_MS) return;
  last = now;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(out);
  source.start();
}

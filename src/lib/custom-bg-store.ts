// The custom background (a photo, a GIF or a short video clip) and how it's framed, shared by the
// backdrop and Settings.
import { useSyncExternalStore } from "react";

/**
 * `aspect`: the media's width / height (0 if unknown: then it just covers the screen). `zoom` (1-3)
 * and `x`, `y` (-1 to 1, from one edge to the other of what's left over) frame it. A video plays the
 * clip from `start` for `length` seconds (3 at most), over and over; `duration` is the whole video's.
 * `veil` (0-0.7) lays the theme's background colour over it, so the counter and buttons stand out.
 */
export type CustomBg = { uri: string; kind: "image" | "video"; aspect: number; duration: number; zoom: number; x: number; y: number; start: number; length: number; veil: number };
/** What the player picked, before it's framed. `duration` in seconds (videos). */
export type PickedMedia = { uri: string; kind: "image" | "video"; aspect: number; duration: number };
/** The longest clip a video background plays. */
export const MAX_CLIP_S = 3;
export const MAX_ZOOM = 3;
export const MAX_VEIL = 0.7;
export const DEFAULT_VEIL = 0.25;
/** A fresh framing for newly picked media: centred, no zoom, the clip from the start. */
export const framingFor = (m: PickedMedia): CustomBg => ({ ...m, zoom: 1, x: 0, y: 0, start: 0, length: m.kind === "video" ? Math.min(MAX_CLIP_S, m.duration || MAX_CLIP_S) : 0, veil: DEFAULT_VEIL });

/** Reads a saved framing (or an old save's bare photo address); null if it isn't one. */
export function parseSaved(raw: string | null): CustomBg | null {
  if (!raw) return null;
  if (!raw.startsWith("{")) return { uri: raw, kind: "image", aspect: 0, duration: 0, zoom: 1, x: 0, y: 0, start: 0, length: 0, veil: DEFAULT_VEIL };
  try {
    const b = JSON.parse(raw) as Partial<CustomBg>;
    if (typeof b.uri !== "string") return null;
    const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
    return {
      uri: b.uri,
      kind: b.kind === "video" ? "video" : "image",
      aspect: num(b.aspect, 0, 100, 0),
      duration: num(b.duration, 0, 1e5, 0),
      zoom: num(b.zoom, 1, MAX_ZOOM, 1),
      x: num(b.x, -1, 1, 0),
      y: num(b.y, -1, 1, 0),
      start: num(b.start, 0, 1e5, 0),
      length: num(b.length, 0, MAX_CLIP_S, MAX_CLIP_S),
      veil: num(b.veil, 0, MAX_VEIL, DEFAULT_VEIL),
    };
  } catch {
    return null;
  }
}

/**
 * Where the media sits in a box `width` x `height`: big enough to cover it, times the zoom, moved
 * by x and y within what spills over.
 */
export function mediaFrame(bg: Pick<CustomBg, "aspect" | "zoom" | "x" | "y">, width: number, height: number) {
  if (!bg.aspect) return { left: 0, top: 0, width, height };
  const cover = width / height > bg.aspect ? { w: width, h: width / bg.aspect } : { w: height * bg.aspect, h: height };
  const w = cover.w * bg.zoom, h = cover.h * bg.zoom;
  return { left: (width - w) / 2 + (bg.x * (w - width)) / 2, top: (height - h) / 2 + (bg.y * (h - height)) / 2, width: w, height: h };
}

let current: CustomBg | null = null;
const listeners = new Set<() => void>();

export const setCustomBackground = (next: CustomBg | null) => {
  current = next;
  listeners.forEach((l) => l());
};

/** The custom background, or null when none has been picked. */
export const useCustomBackground = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );

// Background presets for the clicker area. Pure data: drawn by components/background-pattern.tsx.

export type PatternKind = "grid" | "crosses" | "dots" | "stripes" | "checker" | "hearts" | "plain";
export type AnimatedKind = "rain" | "ecg" | "stars" | "cells";
export type Colors = { bg: string; line: string; accent?: string };

/**
 * Background presets: each has its own pattern and its own colours per theme. Order is saved by
 * index, so add new ones at the end. Animated ones cost Care Coins (`price`).
 */
export const BACKGROUNDS: { id: string; name: string; pattern: PatternKind | AnimatedKind; light: Colors; dark: Colors; price?: number }[] = [
  { id: "rose_grid", name: "Rose Grid", pattern: "grid", light: { bg: "#f9e8e8", line: "#f8cdd4" }, dark: { bg: "#0f1c24", line: "#1b3341" } },
  { id: "mint_crosses", name: "Mint Crosses", pattern: "crosses", light: { bg: "#e5f6ec", line: "#b9e4c9" }, dark: { bg: "#0c1d16", line: "#1a3a2b" } },
  { id: "lavender_dots", name: "Lavender Dots", pattern: "dots", light: { bg: "#eeeafc", line: "#cdc4f4" }, dark: { bg: "#15132a", line: "#2c2752" } },
  { id: "peach_stripes", name: "Peach Stripes", pattern: "stripes", light: { bg: "#fff1e2", line: "#ffd9b3" }, dark: { bg: "#21160c", line: "#3b2914" } },
  { id: "sky_checker", name: "Sky Checker", pattern: "checker", light: { bg: "#e4f2fb", line: "#c6e3f6" }, dark: { bg: "#0b1923", line: "#163142" } },
  { id: "candy_hearts", name: "Candy Hearts", pattern: "hearts", light: { bg: "#fdeef3", line: "#f6c2d4" }, dark: { bg: "#22101a", line: "#43203a" } },
  { id: "plain", name: "Plain", pattern: "plain", light: { bg: "#f9e8e8", line: "#f9e8e8" }, dark: { bg: "#0f1c24", line: "#0f1c24" } },
  { id: "purple_rain", name: "Purple Rain", pattern: "rain", price: 15, light: { bg: "#ece3fb", line: "#a77ee8", accent: "#c9a8f5" }, dark: { bg: "#1a0f2e", line: "#9a6ae0", accent: "#5c3a99" } },
  { id: "heart_monitor", name: "Heart Monitor", pattern: "ecg", price: 15, light: { bg: "#e4f6ec", line: "#2a9d5c", accent: "#c3e8d3" }, dark: { bg: "#04170f", line: "#39e07a", accent: "#0c3321" } },
  { id: "night_sky", name: "Night Shift Sky", pattern: "stars", price: 10, light: { bg: "#dfe4f8", line: "#f2b938", accent: "#b9c3ec" }, dark: { bg: "#0b1030", line: "#fff3b8", accent: "#1c2456" } },
  { id: "blood_stream", name: "Blood Stream", pattern: "cells", price: 10, light: { bg: "#fdecef", line: "#ec7d8f", accent: "#d85a70" }, dark: { bg: "#250a12", line: "#b2384c", accent: "#7f2234" } },
];

/** Free presets are always owned; priced ones once bought. */
export const ownsBackground = (index: number, owned: string[]) => {
  const b = BACKGROUNDS[index % BACKGROUNDS.length];
  return !b.price || owned.includes(b.id);
};


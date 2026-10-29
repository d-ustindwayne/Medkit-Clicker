// Background presets for the clicker area. Pure data: drawn by components/background-pattern.tsx.

/** "photo": the player's own picture (the custom background). */
export type PatternKind = "grid" | "crosses" | "dots" | "stripes" | "checker" | "hearts" | "plain" | "photo";
export type AnimatedKind = "rain" | "ecg" | "stars" | "cells" | "sakura" | "fireflies" | "snowfall" | "aurora" | "galaxy";
export type Colors = { bg: string; line: string; accent?: string };

/**
 * Background presets: each has its own pattern and its own colours per theme. Order is saved by
 * index, so add new ones at the end. Animated ones cost Care Coins (`price`); premium ones are bought
 * with Natal Gems in the Gem Shop (`gems`, see GEM_ITEMS). `darkOnly` ones show only in the dark
 * theme; in the light theme the default background stands in.
 */
export const BACKGROUNDS: { id: string; name: string; pattern: PatternKind | AnimatedKind; light: Colors; dark: Colors; price?: number; gems?: boolean; darkOnly?: boolean }[] = [
  { id: "rose_grid", name: "Rose Grid", pattern: "grid", light: { bg: "#f9e8e8", line: "#f8cdd4" }, dark: { bg: "#0f1c24", line: "#1b3341" } },
  { id: "mint_crosses", name: "Mint Crosses", pattern: "crosses", light: { bg: "#e5f6ec", line: "#b9e4c9" }, dark: { bg: "#0c1d16", line: "#1a3a2b" } },
  { id: "lavender_dots", name: "Lavender Dots", pattern: "dots", light: { bg: "#eeeafc", line: "#cdc4f4" }, dark: { bg: "#15132a", line: "#2c2752" } },
  { id: "peach_stripes", name: "Peach Stripes", pattern: "stripes", light: { bg: "#fff1e2", line: "#ffd9b3" }, dark: { bg: "#21160c", line: "#3b2914" } },
  { id: "sky_checker", name: "Sky Checker", pattern: "checker", light: { bg: "#e4f2fb", line: "#c6e3f6" }, dark: { bg: "#0b1923", line: "#163142" } },
  { id: "candy_hearts", name: "Candy Hearts", pattern: "hearts", light: { bg: "#fdeef3", line: "#f6c2d4" }, dark: { bg: "#22101a", line: "#43203a" } },
  { id: "plain", name: "Plain", pattern: "plain", light: { bg: "#f9e8e8", line: "#f9e8e8" }, dark: { bg: "#0f1c24", line: "#0f1c24" } },
  { id: "purple_rain", name: "Purple Rain", pattern: "rain", price: 15, light: { bg: "#ece3fb", line: "#a77ee8", accent: "#c9a8f5" }, dark: { bg: "#1a0f2e", line: "#9a6ae0", accent: "#5c3a99" } },
  { id: "heart_monitor", name: "Heart Monitor", pattern: "ecg", price: 15, light: { bg: "#eef2f9", line: "#e2475b", accent: "#d5deed" }, dark: { bg: "#0a1220", line: "#ff5d70", accent: "#1a2840" } },
  { id: "night_sky", name: "Night Shift Sky", pattern: "stars", price: 10, light: { bg: "#dfe4f8", line: "#f2b938", accent: "#b9c3ec" }, dark: { bg: "#0b1030", line: "#fff3b8", accent: "#1c2456" } },
  { id: "blood_stream", name: "Blood Stream", pattern: "cells", price: 10, light: { bg: "#fdecef", line: "#ec7d8f", accent: "#d85a70" }, dark: { bg: "#250a12", line: "#b2384c", accent: "#7f2234" } },
  // Premium (Gem Shop)
  { id: "sakura", name: "Sakura Breeze", pattern: "sakura", gems: true, light: { bg: "#fff0f5", line: "#f7c4d6", accent: "#cfe9f7" }, dark: { bg: "#241626", line: "#5a3350", accent: "#1a2a3a" } },
  { id: "fireflies", name: "Firefly Night", pattern: "fireflies", gems: true, light: { bg: "#e3f0e0", line: "#9cc79a", accent: "#c7e2c2" }, dark: { bg: "#08160f", line: "#123323", accent: "#0b2018" } },
  { id: "snowfall", name: "First Snow", pattern: "snowfall", gems: true, light: { bg: "#e6f1fb", line: "#ffffff", accent: "#cfe1f2" }, dark: { bg: "#0d1a2c", line: "#e8f2ff", accent: "#18304d" } },
  { id: "aurora", name: "Aurora Ward", pattern: "aurora", gems: true, light: { bg: "#dfe9f7", line: "#7fe0c4", accent: "#b08cf0" }, dark: { bg: "#070c1f", line: "#4fe0a8", accent: "#8a5cf0" } },
  // Dark theme only (picked by Claude, 2026-10-29: 1 gem, from the first rebirth)
  { id: "galaxy", name: "Galaxy", pattern: "galaxy", gems: true, darkOnly: true, light: { bg: "#05040f", line: "#ece8ff", accent: "#7b4dd8" }, dark: { bg: "#05040f", line: "#ece8ff", accent: "#7b4dd8" } },
  // The player's own photo: unlocked for 5 Natal Gems, then picked in Settings (0.8.0)
  { id: "custom", name: "Your Photo", pattern: "photo", gems: true, light: { bg: "#f9e8e8", line: "#f9e8e8" }, dark: { bg: "#0f1c24", line: "#0f1c24" } },
];

/** Whether a background shows in this theme (a dark-only one doesn't in the light theme). */
export const showsInTheme = (index: number, theme: "light" | "dark") => theme === "dark" || !BACKGROUNDS[index % BACKGROUNDS.length].darkOnly;

/** Free presets are always owned; priced ones once bought. */
export const ownsBackground = (index: number, owned: string[]) => {
  const b = BACKGROUNDS[index % BACKGROUNDS.length];
  return (!b.price && !b.gems) || owned.includes(b.id);
};


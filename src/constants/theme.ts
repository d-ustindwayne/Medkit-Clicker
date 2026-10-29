import { vars } from "nativewind";

export type ThemeName = "light" | "dark";

type Palette = {
  primary: string;
  surface: string;
  ink: string;
  success: string;
  danger: string;
  accent: string;
  backdrop: string;
  outline: string;
  /** Hard drop shadow under cards and the medkit. */
  shadow: string;
  /** Sunburst rays behind the medkit (drawn at low opacity). */
  glow: string;
  /** Hard shadow under big display text. */
  textShadow: string;
  /** Secret achievements' outline and question mark (the confetti's gold, darker on light). */
  gold: string;
};

// Palettes from src/media/photos/plan-and-brainstorm.png
export const palettes: Record<ThemeName, Palette> = {
  light: {
    primary: "#dd1122",
    surface: "#fafdf3",
    ink: "#000000",
    success: "#4edb4e",
    danger: "#f34747",
    accent: "#ffc0cb",
    backdrop: "#f9e8e8",
    outline: "#000000",
    shadow: "#000000",
    glow: "#ffffff",
    textShadow: "#ffb3c1",
    gold: "#c99700",
  },
  // Night shift: deep ward teal with the same red, kept bright enough to read.
  dark: {
    primary: "#a3182a",
    surface: "#172631",
    ink: "#eef3f6",
    success: "#2f9e4f",
    danger: "#cf3a40",
    accent: "#24475a",
    backdrop: "#0f1c24",
    outline: "#d6e1e8",
    shadow: "#05090c",
    glow: "#4f8fae",
    textShadow: "#000000",
    gold: "#ffd23f",
  },
};

const toRgbChannels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const toVars = (p: Palette) =>
  vars({
    "--color-primary": toRgbChannels(p.primary),
    "--color-surface": toRgbChannels(p.surface),
    "--color-ink": toRgbChannels(p.ink),
    "--color-success": toRgbChannels(p.success),
    "--color-danger": toRgbChannels(p.danger),
    "--color-accent": toRgbChannels(p.accent),
    "--color-backdrop": toRgbChannels(p.backdrop),
    "--color-outline": toRgbChannels(p.outline),
    "--color-shadow": toRgbChannels(p.shadow),
    "--color-gold": toRgbChannels(p.gold),
  });

/** NativeWind CSS variables for each theme; apply on the root view. */
export const themeVars: Record<ThemeName, ReturnType<typeof vars>> = {
  light: toVars(palettes.light),
  dark: toVars(palettes.dark),
};

import type { SfxName } from "@/constants/playlists";

// Web: sound effects stay on expo-audio (see use-audio.tsx). Phones use ./sfx.native.ts.

export function initSfx() {}

export function setSfxVolume(_volume: number) {}

export function playSfxFast(_name: SfxName) {
  return false;
}

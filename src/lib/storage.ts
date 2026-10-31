import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ThemeName } from "@/constants/theme";
import { normalizeSave, type GameState } from "@/lib/game";

const GAME_KEY = "mc/game/v1";
const SETTINGS_KEY = "mc/settings/v1";

/** Volumes are stored as steps from 0 (muted) to VOLUME_STEPS. */
export const VOLUME_STEPS = 5;

export type Settings = {
  playlist: number;
  musicVolume: number;
  sfxVolume: number;
  background: number;
  theme: ThemeName;
  /** Vibration on taps, purchases and achievements. */
  haptics: boolean;
  /** Calmer screens: no animated backgrounds, spinning rays, confetti or shakes (on top of the phone's own setting). */
  reduceMotion: boolean;
  /** Letters on coloured pills in the minigames, for colour-blind players. */
  colorLabels: boolean;
  /** The "+N" on taps and "-N" on spending: every one, combined into one running total, or none. */
  numbers: NumbersMode;
  /** Fewer moving bits in the backgrounds and no tilting, for slower phones and calmer screens. */
  lightGraphics: boolean;
};

export type NumbersMode = "all" | "combined" | "off";

export const DEFAULT_SETTINGS: Settings = {
  playlist: 0,
  musicVolume: 3,
  sfxVolume: 4,
  background: 0,
  theme: "light",
  haptics: true,
  reduceMotion: false,
  colorLabels: false,
  numbers: "all",
  lightGraphics: false,
};

type StoredGame = { state: GameState; savedAt: number };

export async function loadGame(): Promise<StoredGame | null> {
  try {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredGame>;
    const state = normalizeSave(parsed.state);
    return state ? { state, savedAt: parsed.savedAt ?? Date.now() } : null;
  } catch {
    return null;
  }
}

export async function saveGame(state: GameState) {
  const stored: StoredGame = { state, savedAt: Date.now() };
  await AsyncStorage.setItem(GAME_KEY, JSON.stringify(stored));
}

export async function clearGame() {
  await AsyncStorage.removeItem(GAME_KEY);
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

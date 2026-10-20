import type { ImageSourcePropType } from "react-native";

// Sick patients who turn up in My Room at random times. Each one has a quick minigame.
// Timings, rewards and wording are PLACEHOLDERS; see docs/TASKS.md "Needs your decision".

export type MinigameId = "injection" | "rhythm" | "bandage";

export type SickPatient = {
  id: string;
  image: ImageSourcePropType;
  condition: string;
  /** Shown when the minigame opens. */
  intro: string;
  game: MinigameId;
};

export const SICK_PATIENTS: SickPatient[] = [
  { id: "fever", image: require("@/imgs/characters/02_islander_man_sick.png"), condition: "High fever", intro: "His fever is spiking. Stop the needle inside the vein!", game: "injection" },
  { id: "collapse", image: require("@/imgs/characters/04_old_man_sick.png"), condition: "Collapsed", intro: "He collapsed in the waiting room. Keep the CPR rhythm!", game: "rhythm" },
  { id: "flu", image: require("@/imgs/characters/05_chinese_woman_sick.png"), condition: "Bad flu", intro: "Time for a flu shot. Stop the needle inside the vein!", game: "injection" },
  { id: "sprain", image: require("@/imgs/characters/09_dad_sick.png"), condition: "Sprained arm", intro: "Wrap that arm before the swelling sets in. Tap fast!", game: "bandage" },
  { id: "breathless", image: require("@/imgs/characters/10_young_man_sick.png"), condition: "Short of breath", intro: "Coach his breathing. Tap in time with the heartbeat!", game: "rhythm" },
];

/** A new patient arrives 1-3 minutes after the last one leaves. */
export const nextPatientDelay = () => (60 + Math.random() * 120) * 1000;

/**
 * Minigames get slightly harder as you treat more patients, reaching the hardest setting at 100.
 * Injection: the needle speeds up to 1.2x and the vein narrows; Rhythm: 110 to 120 bpm with a
 * tighter window; Bandage: 25 to 30 wraps in the same 5 seconds.
 */
export const minigameTuning = (treated: number) => {
  const d = Math.min(1, Math.max(0, treated) / 100);
  const mix = (a: number, b: number) => a + (b - a) * d;
  return {
    needleSpeed: mix(1, 1.2),
    veinWidth: mix(0.18, 0.15),
    beatMs: Math.round(mix(545, 500)),
    beatWindowMs: Math.round(mix(160, 130)),
    wraps: Math.round(mix(25, 30)),
  };
};
export type MinigameTuning = ReturnType<typeof minigameTuning>;
/** How long a patient waits before being transferred elsewhere (no penalty). */
export const PATIENT_WAIT_MS = 3 * 60 * 1000;
/** Rewards: a win pays this many seconds of production (at least 50 taps) and Care Coins. */
export const WIN_SECONDS = 120;
export const WIN_COINS = 1;
export const LOSE_SECONDS = 10;

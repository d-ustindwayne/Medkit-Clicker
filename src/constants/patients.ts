import type { ImageSourcePropType } from "react-native";

// Sick patients who turn up in the ward at random times. Each one has a quick minigame.
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

/** A new patient arrives 2-5 minutes after the last one leaves. */
export const nextPatientDelay = () => (120 + Math.random() * 180) * 1000;
/** How long a patient waits before being transferred elsewhere (no penalty). */
export const PATIENT_WAIT_MS = 3 * 60 * 1000;
/** Rewards: a win pays this many seconds of production (at least 50 taps) and Care Coins. */
export const WIN_SECONDS = 120;
export const WIN_COINS = 1;
export const LOSE_SECONDS = 10;

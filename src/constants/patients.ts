import type { ImageSourcePropType } from "react-native";

// Sick patients who turn up in My Room at random times. Each one has a quick minigame.
// Timings, rewards and wording are PLACEHOLDERS; see docs/TASKS.md "Needs your decision".

export type MinigameId = "injection" | "rhythm" | "bandage" | "pulse" | "pills" | "xray" | "germs" | "breath" | "memory";

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
  { id: "palpitations", image: require("@/imgs/characters/01_red_hair_woman.png"), condition: "Racing heart", intro: "Check her pulse. Count every beat!", game: "pulse" },
  { id: "mixed_meds", image: require("@/imgs/characters/04_old_man_sick.png"), condition: "Mixed-up meds", intro: "His pills got mixed up. Sort out the right ones!", game: "pills" },
  { id: "fall", image: require("@/imgs/characters/07_kid_gamer.png"), condition: "Skateboard fall", intro: "Ouch! Find the fracture on the X-ray.", game: "xray" },
  { id: "tummy_bug", image: require("@/imgs/characters/08_teen_girl.png"), condition: "Tummy bug", intro: "Germs everywhere! Bust them before they spread.", game: "germs" },
  { id: "panic", image: require("@/imgs/characters/03_blonde_woman.png"), condition: "Panic attack", intro: "Help her slow down. Breathe in, then let go at the top.", game: "breath" },
  { id: "allergy", image: require("@/imgs/characters/06_teacher.png"), condition: "Allergy check", intro: "Match the medicines to find the right one.", game: "memory" },
];

/** A new patient arrives 1-3 minutes after the last one leaves. */
export const nextPatientDelay = () => (60 + Math.random() * 120) * 1000;

/**
 * How hard the minigames are, 0 (new player) to 1. It follows both progress measures: patients
 * treated (all the way at 60) and healing per second (all the way at 100 million per second, on a
 * log scale, so it keeps rising through the whole game). Speed counts for more than treatments.
 */
export const minigameLevel = (treated: number, perSecond: number) => {
  const byTreated = Math.min(1, Math.max(0, treated) / 60);
  const byRate = Math.min(1, Math.log10(1 + Math.max(0, perSecond)) / 8);
  return Math.min(1, 0.35 * byTreated + 0.65 * byRate);
};

/** Minigame settings for a level from minigameLevel(); every game reads its numbers from here. */
export const minigameTuning = (level: number) => {
  const d = Math.min(1, Math.max(0, level));
  const mix = (a: number, b: number) => a + (b - a) * d;
  return {
    level: d,
    // Injection: faster needle, narrower vein.
    needleSpeed: mix(1, 1.6),
    veinWidth: mix(0.18, 0.1),
    // Rhythm: 100 bpm up to 128, a tighter window and more beats needed.
    beatMs: Math.round(mix(600, 470)),
    beatWindowMs: Math.round(mix(230, 140)),
    beatsNeeded: Math.round(mix(6, 8)),
    // Bandage: more wraps in the same 5 seconds.
    wraps: Math.round(mix(25, 38)),
    // Pulse Check: more beats, closer together.
    pulseBeats: 5 + Math.round(d * 4),
    pulseGapMs: Math.round(mix(620, 380)),
    // Sort the Meds: less time.
    pillsMs: Math.round(mix(6000, 3500)),
    // Spot the Fracture: 6, 9 or 12 bones, less time.
    bones: d < 0.34 ? 6 : d < 0.67 ? 9 : 12,
    xrayMs: Math.round(mix(5000, 3500)),
    // Germ Buster: germs vanish sooner and more must be caught.
    germShowMs: Math.round(mix(950, 520)),
    germsNeeded: Math.round(mix(7, 8)),
    // Deep Breaths: a quicker breath with a narrower "full" band.
    breathMs: Math.round(mix(1700, 1150)),
    breathLow: mix(0.82, 0.88),
    breathHigh: mix(1.08, 1.03),
    // Match the Meds: a fourth pair from halfway, and less time.
    pairs: d < 0.5 ? 3 : 4,
    memoryMs: Math.round(mix(15000, 11000)) + (d < 0.5 ? 0 : 3000),
  };
};
export type MinigameTuning = ReturnType<typeof minigameTuning>;
/** How long a patient waits before being transferred elsewhere (no penalty). */
export const PATIENT_WAIT_MS = 3 * 60 * 1000;
/** Rewards: a win pays this many seconds of production (at least 50 taps) and Care Coins. */
export const WIN_SECONDS = 150;
export const WIN_COINS = 1;
export const LOSE_SECONDS = 10;

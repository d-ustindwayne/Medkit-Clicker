import type { ImageSourcePropType } from "react-native";

import { PATIENT_VARIANTS, VARIANTS_PER_PATIENT } from "@/constants/patient-variants";

// Sick patients who turn up in My Room at random times. Each one has a quick minigame.
// Timings, rewards and wording are PLACEHOLDERS.

export type MinigameId = "injection" | "rhythm" | "bandage" | "pulse" | "pills" | "xray" | "germs" | "breath" | "memory" | "food" | "colour" | "find" | "maze" | "pipes";

export type SickPatient = {
  id: string;
  image: ImageSourcePropType;
  /** The sprite's file name, for its recoloured looks (constants/patient-variants.ts). */
  sprite: string;
  condition: string;
  /** Shown when the minigame opens. */
  intro: string;
  game: MinigameId;
};

export const SICK_PATIENTS: SickPatient[] = [
  { id: "fever", image: require("@/imgs/characters/02_islander_man_sick.png"), sprite: "02_islander_man_sick", condition: "High fever", intro: "His fever is spiking. Stop the needle inside the vein!", game: "injection" },
  { id: "collapse", image: require("@/imgs/characters/04_old_man_sick.png"), sprite: "04_old_man_sick", condition: "Collapsed", intro: "He collapsed in the waiting room. Keep the CPR rhythm!", game: "rhythm" },
  { id: "flu", image: require("@/imgs/characters/05_chinese_woman_sick.png"), sprite: "05_chinese_woman_sick", condition: "Bad flu", intro: "Time for a flu shot. Stop the needle inside the vein!", game: "injection" },
  { id: "sprain", image: require("@/imgs/characters/09_dad_sick.png"), sprite: "09_dad_sick", condition: "Sprained arm", intro: "Wrap that arm before the swelling sets in. Tap fast!", game: "bandage" },
  { id: "breathless", image: require("@/imgs/characters/10_young_man_sick.png"), sprite: "10_young_man_sick", condition: "Short of breath", intro: "Coach his breathing. Tap in time with the heartbeat!", game: "rhythm" },
  { id: "palpitations", image: require("@/imgs/characters/01_red_hair_woman.png"), sprite: "01_red_hair_woman", condition: "Racing heart", intro: "Check her pulse. Count every beat!", game: "pulse" },
  { id: "mixed_meds", image: require("@/imgs/characters/04_old_man_sick.png"), sprite: "04_old_man_sick", condition: "Mixed-up meds", intro: "His pills got mixed up. Sort out the right ones!", game: "pills" },
  { id: "fall", image: require("@/imgs/characters/07_kid_gamer.png"), sprite: "07_kid_gamer", condition: "Skateboard fall", intro: "Ouch! Find the fracture on the X-ray.", game: "xray" },
  { id: "tummy_bug", image: require("@/imgs/characters/08_teen_girl.png"), sprite: "08_teen_girl", condition: "Tummy bug", intro: "Germs everywhere! Bust them before they spread.", game: "germs" },
  { id: "panic", image: require("@/imgs/characters/03_blonde_woman.png"), sprite: "03_blonde_woman", condition: "Panic attack", intro: "Help her slow down. Breathe in, then let go at the top.", game: "breath" },
  { id: "allergy", image: require("@/imgs/characters/06_teacher.png"), sprite: "06_teacher", condition: "Allergy check", intro: "Match the medicines to find the right one.", game: "memory" },
  { id: "diet", image: require("@/imgs/characters/09_dad_sick.png"), sprite: "09_dad_sick", condition: "Bad diet", intro: "His doctor wants him eating better. Catch the healthy food and dodge the junk!", game: "food" },
  { id: "eye_test", image: require("@/imgs/characters/01_red_hair_woman.png"), sprite: "01_red_hair_woman", condition: "Eye test", intro: "A quick eye test: tap the square that's a different colour.", game: "colour" },
  { id: "lost_item", image: require("@/imgs/characters/07_kid_gamer.png"), sprite: "07_kid_gamer", condition: "Lost something", intro: "He dropped something in the busy ward. Help him find it!", game: "find" },
  { id: "circulation", image: require("@/imgs/characters/04_old_man_sick.png"), sprite: "04_old_man_sick", condition: "Poor circulation", intro: "Guide the blood cell through the veins to the exit.", game: "maze" },
  { id: "dehydrated", image: require("@/imgs/characters/10_young_man_sick.png"), sprite: "10_young_man_sick", condition: "Dehydrated", intro: "Turn the pipes so the IV drip reaches him.", game: "pipes" },
];

/** Every minigame, in the order they were added (the All-Rounder achievement needs a win in each). */
export const MINIGAME_IDS: MinigameId[] = ["injection", "rhythm", "bandage", "pulse", "pills", "xray", "germs", "breath", "memory", "food", "colour", "find", "maze", "pipes"];

/**
 * How this visit's patient looks: the original or one of its recoloured looks (skin tone and
 * clothes), picked from when they arrived, so it stays the same for the whole visit.
 */
export const patientLook = (p: SickPatient, arrivedAt?: number): ImageSourcePropType => {
  if (arrivedAt === undefined) return p.image;
  const k = Math.floor(arrivedAt / 7) % (VARIANTS_PER_PATIENT + 1);
  return (k && PATIENT_VARIANTS[`${p.sprite}_v${k}`]) || p.image;
};

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
    // Pulse Check: more beats, closer together: 5-7 for a new player, 20-30 at the top.
    pulseBeats: Math.round(mix(5, 20)),
    pulseSpread: Math.round(mix(2, 10)),
    pulseGapMs: Math.round(mix(620, 380)),
    // Sort the Meds: 4 of the 6 colours at first, all 6 from halfway; 9 pills, growing to a 5x5 grid
    // of 25 at the top; less time.
    pillColors: d < 0.5 ? 4 : 6,
    pills: d < 0.3 ? 9 : d < 0.5 ? 12 : d < 0.7 ? 16 : d < 0.85 ? 20 : 25,
    pillsMs: Math.round(mix(6500, 4500)),
    // X-ray: a few films in a row (each with its own twist), 6 up to 16 smaller bones, less time per
    // film; from halfway every film must be read right.
    bones: d < 0.25 ? 6 : d < 0.5 ? 9 : d < 0.75 ? 12 : 16,
    xrayMs: Math.round(mix(5500, 4000)),
    xrayFilms: d < 0.4 ? 3 : 4,
    xrayMisses: d < 0.5 ? 1 : 0,
    // Germ Buster: germs vanish sooner and more must be caught; a 4x4 grid from two-thirds up.
    germShowMs: Math.round(mix(950, 560)),
    germsNeeded: Math.round(mix(7, 8)),
    germCells: d < 0.66 ? 9 : 16,
    // Deep Breaths: a quicker breath with a narrower "full" band.
    breathMs: Math.round(mix(1700, 1150)),
    breathLow: mix(0.82, 0.88),
    breathHigh: mix(1.08, 1.03),
    // Match the Meds: 3 pairs, then 4, 6, 8 and 10 (20 cards); each extra pair adds time, the level
    // takes some away.
    pairs: d < 0.2 ? 3 : d < 0.4 ? 4 : d < 0.6 ? 6 : d < 0.8 ? 8 : 10,
    memoryMs: Math.round(mix(15000, 11000)) + ((d < 0.2 ? 3 : d < 0.4 ? 4 : d < 0.6 ? 6 : d < 0.8 ? 8 : 10) - 3) * 3200,
    // Healthy Shopping: more points to catch in 20 seconds, falling faster, with more junk.
    foodTarget: Math.round(mix(12, 24)),
    foodFallMs: Math.round(mix(2600, 1500)),
    foodSpawnMs: Math.round(mix(750, 480)),
    foodJunk: mix(0.3, 0.45),
    // Odd Colour Out: more rounds on a bigger grid, with closer shades.
    colourRounds: d < 0.5 ? 4 : 5,
    colourGrid: d < 0.3 ? 3 : d < 0.7 ? 4 : 5,
    colourDelta: mix(16, 7),
    colourMs: Math.round(mix(14000, 11000)),
    // Find It: more things scattered about.
    findCount: Math.round(mix(14, 34)),
    findMs: Math.round(mix(15000, 12000)),
    // Blood Flow: a bigger maze, a bit more time for it.
    mazeSize: d < 0.3 ? 5 : d < 0.6 ? 6 : d < 0.85 ? 7 : 8,
    mazeMs: Math.round(mix(16000, 22000)),
    // IV Line: a bigger grid of pipes.
    pipeSize: d < 0.35 ? 4 : d < 0.75 ? 5 : 6,
    pipeMs: Math.round(mix(25000, 35000)),
    // Harder games pay more: a win at the top level pays twice as much.
    rewardMult: 1 + d,
  };
};
export type MinigameTuning = ReturnType<typeof minigameTuning>;
/** How long a patient waits before being transferred elsewhere (no penalty). */
export const PATIENT_WAIT_MS = 3 * 60 * 1000;
/**
 * Rewards: a win pays this many seconds of production (at least WIN_TAPS taps), times the level's
 * rewardMult, plus Care Coins (one more from halfway up the difficulty).
 */
export const WIN_SECONDS = 300;
export const WIN_TAPS = 150;
export const WIN_COINS = 2;
export const winCoins = (level: number) => WIN_COINS + (level >= 0.5 ? 1 : 0);
export const LOSE_SECONDS = 30;
export const LOSE_TAPS = 15;

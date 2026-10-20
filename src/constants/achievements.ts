import type { ImageSourcePropType } from "react-native";

import { SHOP_ITEMS, type ItemId } from "@/constants/items";
import { healingRate } from "@/constants/rebirth";
import type { GameState } from "@/lib/game";
import { formatCount } from "@/lib/format";

const MINIGAMES = ["injection", "rhythm", "bandage", "pulse", "pills", "xray", "germs", "breath", "memory"];

export type Achievement = {
  id: string;
  name: string;
  description: string;
  image: ImageSourcePropType;
  /** Hidden until unlocked. */
  secret?: boolean;
  /** Only listed (and counted) once this reward section is unlocked. */
  section?: string;
  /** Care Coins paid when unlocked (spent on boosts). */
  coins: number;
  check: (s: GameState) => boolean;
  /** 0-1 progress towards unlocking, for milestone-style achievements. */
  progress?: (s: GameState) => number;
};

type Milestone = [threshold: number, name: string];

// Lifetime patients healed. The tail is deliberately absurd: the game is meant to run for a long time.
const healedMilestones: Milestone[] = [
  [1, "First Aid"],
  [100, "Clinical Rotation"],
  [1_000, "Triage Nurse"],
  [10_000, "Charge Nurse"],
  [100_000, "Head of the Ward"],
  [1e6, "Chief Nursing Officer"],
  [1e7, "Hospital Director"],
  [1e8, "Hospital Legend"],
  [1e9, "Pandemic Hero"],
  [1e10, "Medical Miracle"],
  [1e12, "Global Health"],
  [1e15, "Planetary Physician"],
  [1e18, "Interstellar Infirmary"],
  [1e21, "Galactic Healer"],
  [1e24, "Universal Remedy"],
  [1e27, "Cosmic Caregiver"],
  [1e30, "Multiverse Medic"],
  [1e33, "Healer of Realities"],
  [1e45, "The Last Patient"],
  [1e63, "Vigintillion Vitals"],
];

const tapMilestones: Milestone[] = [
  [100, "Steady Hands"],
  [1_000, "Chest Compressions"],
  [10_000, "Carpal Tunnel"],
  [50_000, "Iron Fingers"],
  [100_000, "Tendons of Steel"],
  [1e6, "The Tapping Legend"],
  [1e7, "Unstoppable Hand"],
];

const rateMilestones: Milestone[] = [
  [10, "Running Smoothly"],
  [100, "Busy Shift"],
  [1_000, "Code Blue Team"],
  [10_000, "Whole Hospital"],
  [1e5, "City Health Network"],
  [1e6, "National Health Service"],
  [1e9, "Healing at Light Speed"],
  [1e12, "Every Patient, Everywhere"],
];

const totalItemMilestones: Milestone[] = [
  [10, "Stocking Up"],
  [100, "Supply Room"],
  [500, "Warehouse Wing"],
  [1_000, "Logistics Department"],
];

const treatedMilestones: Milestone[] = [
  [1, "Bedside Manner"],
  [10, "Ward Round"],
  [50, "Attending Nurse"],
  [100, "Healing Hands"],
];

const playMilestones: [seconds: number, name: string, description: string][] = [
  [3_600, "Double Shift", "Play for a total of one hour."],
  [36_000, "Residency", "Play for a total of ten hours."],
  [360_000, "Tenure", "Play for a total of one hundred hours."],
];

// Per-item names for owning 1, 25, 100, 250 and 500 of each shop item.
const OWNED_TIERS = [1, 25, 100, 250, 500] as const;
const itemTitles: Record<ItemId, string[]> = {
  bandage: ["Wrapped Up", "Pressure Dressing", "Wound Care Team", "Mummy Mode", "Gauze Galore"],
  gloves: ["Gloved Up", "Double Gloving", "Glove Box Empty", "Latex Legion", "Hands of Healing"],
  facemask: ["Masked Up", "Infection Control", "Sterile Field", "Clean Room", "Airborne Precautions"],
  thermometer: ["Taking Temps", "Fever Check", "Afebrile", "Hot Readings", "Thermal Mastery"],
  stethoscope: ["Heartbeat Heard", "Lub-Dub", "Cardiology Wing", "Listening Closely", "Echo Chamber"],
  bp_cuff: ["Under Pressure", "Systolic Start", "Korotkoff Sounds", "Normotensive", "Pressure Perfect"],
  syringe: ["First Injection", "Vaccine Drive", "Sharps Container", "Needle in a Haystack", "Immunity for All"],
  medicine: ["Prescribed", "Pharmacy Run", "Fully Stocked", "Compounding Lab", "Cure-All Cabinet"],
  iv_bag: ["IV Started", "Fluid Bolus", "Drip Rate", "Hydration Station", "Maintenance Fluids"],
  blood_vial: ["First Draw", "Phlebotomist", "Blood Bank", "Lab Courier", "Order of Draw"],
  covid_test: ["Swabbed", "Two Lines", "Mass Testing", "Contact Tracing", "Negative Again"],
  microscope: ["Under the Lens", "Cell Count", "Gram Stain", "Pathology Lab", "Microbe Hunter"],
  dna: ["Double Helix", "Genome Mapped", "Gene Therapy", "Precision Medicine", "Code of Life"],
};

// Achievement art from src/imgs/achievements. Lifetime milestones climb the trophy tiers.
/** One-off icons so each achievement group has its own art. */
const ICONS = {
  nightCoffee: require("@/imgs/achievements/night_coffee.png"),
  headphones: require("@/imgs/achievements/headphones.png"),
  lightOff: require("@/imgs/achievements/light_off.png"),
  clipboard: require("@/imgs/achievements/clipboard.png"),
  supplyShelf: require("@/imgs/achievements/supply_shelf.png"),
  medkit: require("@/imgs/medkit.png"),
};

const TROPHY = {
  bronze: require("@/imgs/achievements/trophy_bronze.png"),
  gold: require("@/imgs/achievements/trophy_gold.png"),
  platinum: require("@/imgs/achievements/trophy_platinum.png"),
  diamond: require("@/imgs/achievements/trophy_diamond.png"),
  star: require("@/imgs/achievements/trophy_star.png"),
  nurse: require("@/imgs/achievements/trophy_nurse.png"),
  purple: require("@/imgs/achievements/trophy_purple.png"),
};
const MEDAL = require("@/imgs/achievements/medal.png");
const WINGED_HEART = require("@/imgs/achievements/winged_heart.png");
const CLOCK_MOON = require("@/imgs/achievements/clock_moon.png");
// Bronze, then platinum, then gold, then diamond (the order chosen for this game).
const tierTrophy = (i: number, count: number) => [TROPHY.bronze, TROPHY.platinum, TROPHY.gold, TROPHY.diamond][Math.min(3, Math.floor((i / count) * 4))];

const totalOwned = (s: GameState) => Object.values(s.owned).reduce((a, b) => a + b, 0);

const LIST: Achievement[] = [
  ...healedMilestones.map(([n, name], i) => ({
    id: `healed_${n}`,
    name,
    description: n === 1 ? "Heal your first patient." : `Heal ${formatCount(n)} patients.`,
    image: tierTrophy(i, healedMilestones.length),
    coins: 1 + Math.floor(i / 3),
    check: (s: GameState) => s.totalHealed >= n,
    progress: (s: GameState) => s.totalHealed / n,
  })),
  ...tapMilestones.map(([n, name], i) => ({
    id: `taps_${n}`,
    name,
    description: `Tap the medkit ${formatCount(n)} times.`,
    image: MEDAL,
    coins: 1 + i,
    check: (s: GameState) => s.taps >= n,
    progress: (s: GameState) => s.taps / n,
  })),
  ...SHOP_ITEMS.flatMap((item) =>
    OWNED_TIERS.map((n, i) => ({
      id: `${item.id}_${n}`,
      name: itemTitles[item.id][i],
      description: n === 1 ? `Buy your first ${item.name.toLowerCase()}.` : `Own ${n} ${item.name.toLowerCase()}.`,
      image: item.image,
      coins: [1, 1, 2, 3, 4][i],
      check: (s: GameState) => s.owned[item.id] >= n,
      progress: (s: GameState) => s.owned[item.id] / n,
    })),
  ),
  ...totalItemMilestones.map(([n, name], i) => ({
    id: `items_${n}`,
    name,
    description: `Own ${formatCount(n)} supplies in total.`,
    image: ICONS.supplyShelf,
    coins: 2 + i,
    check: (s: GameState) => totalOwned(s) >= n,
    progress: (s: GameState) => totalOwned(s) / n,
  })),
  ...rateMilestones.map(([n, name], i) => ({
    id: `rate_${n}`,
    name,
    description: `Heal ${formatCount(n)} patients per second.`,
    image: WINGED_HEART,
    coins: 1 + i,
    check: (s: GameState) => healingRate(s) >= n,
    progress: (s: GameState) => healingRate(s) / n,
  })),
  ...treatedMilestones.map(([n, name], i) => ({
    id: `treated_${n}`,
    name,
    description: n === 1 ? "Treat your first patient in the ward." : `Treat ${n} patients in the ward.`,
    image: TROPHY.nurse,
    coins: 2 + i,
    check: (s: GameState) => s.treated >= n,
    progress: (s: GameState) => s.treated / n,
  })),
  ...playMilestones.map(([seconds, name, description], i) => ({
    // Keeps the original id for the first tier so existing saves stay unlocked.
    id: i === 0 ? "double_shift" : `play_${seconds}`,
    name,
    description,
    image: CLOCK_MOON,
    coins: 3 + i * 2,
    secret: i === 0,
    check: (s: GameState) => s.playSeconds >= seconds,
    progress: (s: GameState) => s.playSeconds / seconds,
  })),
  {
    id: "night_shift",
    name: "Night Shift",
    description: "Play between midnight and 5 a.m. Go to sleep!",
    image: ICONS.nightCoffee,
    secret: true,
    coins: 3,
    check: () => new Date().getHours() < 5,
  },
  {
    id: "dj_nurse",
    name: "DJ Nurse",
    description: "Listen to the soundtrack.",
    image: ICONS.headphones,
    secret: true,
    coins: 3,
    check: (s) => s.playlistsHeard.includes("soundtrack"),
  },
  {
    id: "lights_out",
    name: "Lights Out",
    description: "Switch between light and dark mode.",
    image: ICONS.lightOff,
    secret: true,
    coins: 3,
    check: (s) => s.themeSwitches >= 1,
  },
  {
    id: "charting_complete",
    name: "Charting Complete",
    description: "Export your save file.",
    image: ICONS.clipboard,
    secret: true,
    coins: 3,
    check: (s) => s.exports >= 1,
  },
  {
    id: "best_nurse",
    name: "Best Nurse in the World",
    description: "Unlock the Care Package.",
    image: TROPHY.nurse,
    secret: true,
    section: "jasmine",
    coins: 5,
    check: (s) => s.unlockedSections.includes("jasmine"),
  },
  {
    id: "the_limit",
    name: "The Edge of Infinity",
    description: "Heal 179.769 uncentillion patients, the most a phone can count.",
    image: TROPHY.diamond,
    secret: true,
    coins: 10,
    check: (s) => s.totalHealed >= Number.MAX_VALUE,
  },
  {
    id: "hidden_medkit",
    name: "Hidden Medkit",
    description: "Find the medkit hiding on the About page.",
    image: ICONS.medkit,
    secret: true,
    coins: 3,
    check: (s) => s.aboutMedkit,
  },
  {
    id: "game_injection",
    name: "Steady Needle",
    description: "Win the injection minigame.",
    image: require("@/imgs/achievements/games/medal_injection.png"),
    coins: 2,
    check: (s) => (s.minigameWins["injection"] ?? 0) >= 1,
  },
  {
    id: "game_rhythm",
    name: "Stayin' Alive",
    description: "Win the CPR rhythm minigame.",
    image: require("@/imgs/achievements/games/medal_rhythm.png"),
    coins: 2,
    check: (s) => (s.minigameWins["rhythm"] ?? 0) >= 1,
  },
  {
    id: "game_bandage",
    name: "Wrap Star",
    description: "Win the bandage minigame.",
    image: require("@/imgs/achievements/games/medal_bandage.png"),
    coins: 2,
    check: (s) => (s.minigameWins["bandage"] ?? 0) >= 1,
  },
  {
    id: "game_pulse",
    name: "Pulse Reader",
    description: "Win the pulse check minigame.",
    image: require("@/imgs/achievements/games/medal_pulse.png"),
    coins: 2,
    check: (s) => (s.minigameWins["pulse"] ?? 0) >= 1,
  },
  {
    id: "game_pills",
    name: "Pill Sorter",
    description: "Win the sort-the-meds minigame.",
    image: require("@/imgs/achievements/games/medal_pills.png"),
    coins: 2,
    check: (s) => (s.minigameWins["pills"] ?? 0) >= 1,
  },
  {
    id: "game_xray",
    name: "Bone Detective",
    description: "Win the X-ray minigame.",
    image: require("@/imgs/achievements/games/medal_xray.png"),
    coins: 2,
    check: (s) => (s.minigameWins["xray"] ?? 0) >= 1,
  },
  {
    id: "game_germs",
    name: "Germ Buster",
    description: "Win the germ minigame.",
    image: require("@/imgs/achievements/games/medal_germs.png"),
    coins: 2,
    check: (s) => (s.minigameWins["germs"] ?? 0) >= 1,
  },
  {
    id: "game_breath",
    name: "Deep Breaths",
    description: "Win the breathing minigame.",
    image: require("@/imgs/achievements/games/medal_breath.png"),
    coins: 2,
    check: (s) => (s.minigameWins["breath"] ?? 0) >= 1,
  },
  {
    id: "game_memory",
    name: "Sharp Memory",
    description: "Win the memory minigame.",
    image: require("@/imgs/achievements/games/medal_memory.png"),
    coins: 2,
    check: (s) => (s.minigameWins["memory"] ?? 0) >= 1,
  },
  {
    id: "game_all",
    name: "All-Rounder",
    description: "Win every ward minigame at least once.",
    image: TROPHY.star,
    coins: 5,
    check: (s) => MINIGAMES.every((g) => (s.minigameWins[g] ?? 0) >= 1),
  },
];

/** Care Coins pay half the listed amount, rounded up (decided 2026-10-20), so coins feel precious. */
export const ACHIEVEMENTS: Achievement[] = LIST.map((a) => ({ ...a, coins: Math.ceil(a.coins / 2) }));

/** The achievements this player can see: section-only ones appear once their section is unlocked. */
export const visibleAchievements = (unlockedSections: string[]) => ACHIEVEMENTS.filter((a) => !a.section || unlockedSections.includes(a.section));

export type AchievementId = string;

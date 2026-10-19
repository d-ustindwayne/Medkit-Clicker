import type { ImageSourcePropType } from "react-native";

import { HOSPITAL_IMAGE, MEDKIT_IMAGE, SHOP_ITEMS } from "@/constants/items";
import { PLAYLISTS } from "@/constants/playlists";
import { healingRate } from "@/constants/rebirth";
import type { GameState } from "@/lib/game";
import { formatCount } from "@/lib/format";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  image: ImageSourcePropType;
  /** Hidden until unlocked. */
  secret?: boolean;
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

const playMilestones: [seconds: number, name: string, description: string][] = [
  [3_600, "Double Shift", "Play for a total of one hour."],
  [36_000, "Residency", "Play for a total of ten hours."],
  [360_000, "Tenure", "Play for a total of one hundred hours."],
];

// Per-item names for owning 1, 25, 100, 250 and 500 of each shop item.
const OWNED_TIERS = [1, 25, 100, 250, 500] as const;
const itemTitles: Record<string, string[]> = {
  syringe: ["First Injection", "Vaccine Drive", "Sharps Container", "Needle in a Haystack", "Immunity for All"],
  stethoscope: ["Heartbeat Heard", "Lub-Dub", "Cardiology Wing", "Listening Closely", "Echo Chamber"],
  facemask: ["Masked Up", "Infection Control", "Sterile Field", "Clean Room", "Airborne Precautions"],
  gloves: ["Gloved Up", "Double Gloving", "Glove Box Empty", "Latex Legion", "Hands of Healing"],
  medicine: ["Prescribed", "Pharmacy Run", "Fully Stocked", "Compounding Lab", "Cure-All Cabinet"],
};

const totalOwned = (s: GameState) => Object.values(s.owned).reduce((a, b) => a + b, 0);

export const ACHIEVEMENTS: Achievement[] = [
  ...healedMilestones.map(([n, name]) => ({
    id: `healed_${n}`,
    name,
    description: n === 1 ? "Heal your first patient." : `Heal ${formatCount(n)} patients.`,
    image: MEDKIT_IMAGE,
    check: (s: GameState) => s.totalHealed >= n,
    progress: (s: GameState) => s.totalHealed / n,
  })),
  ...tapMilestones.map(([n, name]) => ({
    id: `taps_${n}`,
    name,
    description: `Tap the medkit ${formatCount(n)} times.`,
    image: MEDKIT_IMAGE,
    check: (s: GameState) => s.taps >= n,
    progress: (s: GameState) => s.taps / n,
  })),
  ...SHOP_ITEMS.flatMap((item) =>
    OWNED_TIERS.map((n, i) => ({
      id: `${item.id}_${n}`,
      name: itemTitles[item.id][i],
      description: n === 1 ? `Buy your first ${item.name.toLowerCase()}.` : `Own ${n} ${item.name.toLowerCase()}.`,
      image: item.image,
      check: (s: GameState) => s.owned[item.id] >= n,
      progress: (s: GameState) => s.owned[item.id] / n,
    })),
  ),
  ...totalItemMilestones.map(([n, name]) => ({
    id: `items_${n}`,
    name,
    description: `Own ${formatCount(n)} supplies in total.`,
    image: HOSPITAL_IMAGE,
    check: (s: GameState) => totalOwned(s) >= n,
    progress: (s: GameState) => totalOwned(s) / n,
  })),
  ...rateMilestones.map(([n, name]) => ({
    id: `rate_${n}`,
    name,
    description: `Heal ${formatCount(n)} patients per second.`,
    image: HOSPITAL_IMAGE,
    check: (s: GameState) => healingRate(s) >= n,
    progress: (s: GameState) => healingRate(s) / n,
  })),
  ...playMilestones.map(([seconds, name, description], i) => ({
    // Keeps the original id for the first tier so existing saves stay unlocked.
    id: i === 0 ? "double_shift" : `play_${seconds}`,
    name,
    description,
    image: HOSPITAL_IMAGE,
    secret: i === 0,
    check: (s: GameState) => s.playSeconds >= seconds,
    progress: (s: GameState) => s.playSeconds / seconds,
  })),
  {
    id: "night_shift",
    name: "Night Shift",
    description: "Play between midnight and 5 a.m. Go to sleep!",
    image: HOSPITAL_IMAGE,
    secret: true,
    check: () => new Date().getHours() < 5,
  },
  {
    id: "dj_nurse",
    name: "DJ Nurse",
    description: "Listen to every playlist.",
    image: MEDKIT_IMAGE,
    secret: true,
    check: (s) => PLAYLISTS.every((p) => s.playlistsHeard.includes(p.id)),
  },
  {
    id: "lights_out",
    name: "Lights Out",
    description: "Switch between light and dark mode.",
    image: MEDKIT_IMAGE,
    secret: true,
    check: (s) => s.themeSwitches >= 1,
  },
  {
    id: "charting_complete",
    name: "Charting Complete",
    description: "Export your save file.",
    image: MEDKIT_IMAGE,
    secret: true,
    check: (s) => s.exports >= 1,
  },
];

export type AchievementId = string;

import type { ImageSourcePropType } from "react-native";

import { SHOP_ITEMS, type ItemId } from "@/constants/items";
import { MINIGAME_IDS } from "@/constants/patients";
import { ROOM_ITEMS } from "@/constants/room";
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
  /** Only listed (and counted) once this reward section is unlocked. */
  section?: string;
  /** Care Coins paid when unlocked (spent on boosts). */
  coins: number;
  check: (s: GameState) => boolean;
  /** 0-1 progress towards unlocking, for milestone-style achievements. */
  progress?: (s: GameState) => number;
};

type Milestone = [threshold: number, name: string];

// Lifetime medkits earned. The tail is deliberately absurd: the game is meant to run for a long time.
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

/**
 * Past a trillion, a milestone at every second number name: quintillion (10^18), septillion (10^24),
 * nonillion, undecillion and on to 10^306. The ones the list above already has keep their names.
 */
const bigMilestones = Array.from({ length: 49 }, (_, i) => 10 ** (18 + i * 6)).filter((n) => !healedMilestones.some(([m]) => m === n));
const unitName = (n: number) => {
  const unit = formatCount(n).split(" ")[1] ?? "";
  return `${unit.charAt(0).toUpperCase()}${unit.slice(1)} Medkits`;
};

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
/**
 * The lifetime medkit trophies, in order of size (owner's split, 0.8.1): the first 9 bronze (to a
 * billion), the next 12 silver, then 15 each of gold, diamond and purple.
 */
const MEDKIT_TIERS: [count: number, image: ImageSourcePropType][] = [
  [9, TROPHY.bronze],
  [12, TROPHY.platinum],
  [15, TROPHY.gold],
  [15, TROPHY.diamond],
  [Infinity, TROPHY.purple],
];
const medkitThresholds = [...healedMilestones.map(([n]) => n), ...bigMilestones].sort((a, b) => a - b);
const medkitTrophy = (n: number) => {
  let rank = medkitThresholds.indexOf(n);
  for (const [count, image] of MEDKIT_TIERS) {
    if (rank < count) return image;
    rank -= count;
  }
  return TROPHY.purple;
};

const totalOwned = (s: GameState) => Object.values(s.owned).reduce((a, b) => a + b, 0);
const totalWins = (s: GameState) => Object.values(s.minigameWins).reduce((a, b) => a + b, 0);
const totalPerfect = (s: GameState) => Object.values(s.minigamePerfect).reduce((a, b) => a + b, 0);
/** Items placed in all the rooms together (staff don't count). */
const placedItems = (s: GameState) => Object.values(s.room.placed).reduce((n, list) => n + list.filter((p) => !STAFF_IDS.includes(p.item)).length, 0);
const STAFF_IDS = ROOM_ITEMS.filter((i) => i.staff).map((i) => i.id);

/** The 0.8.0 minigames: their medal art is the game's own PLACEHOLDER sprite until medals are drawn. */
const NEW_GAME_MEDALS: [game: string, name: string, description: string, image: ImageSourcePropType][] = [
  ["food", "Healthy Choices", "Win the Healthy Shopping minigame.", require("@/imgs/achievements/games/medal_food.png")],
  ["colour", "Shade Spotter", "Win the Odd Colour Out minigame.", require("@/imgs/achievements/games/medal_colour.png")],
  ["find", "Lost and Found", "Win the Find It minigame.", require("@/imgs/achievements/games/medal_find.png")],
  ["maze", "Good Circulation", "Win the Blood Flow minigame.", require("@/imgs/achievements/games/medal_maze.png")],
  ["pipes", "Plumbing the Depths", "Win the IV Line minigame.", require("@/imgs/achievements/games/medal_pipes.png")],
];

const LIST: Achievement[] = [
  ...healedMilestones.map(([n, name], i) => ({
    id: `healed_${n}`,
    name,
    description: n === 1 ? "Earn your first medkit." : `Earn ${formatCount(n)} medkits.`,
    image: medkitTrophy(n),
    coins: 1 + Math.floor(i / 3),
    check: (s: GameState) => s.totalHealed >= n,
    progress: (s: GameState) => s.totalHealed / n,
  })),
  ...bigMilestones.map((n) => ({
    id: `healed_${n}`,
    name: unitName(n),
    description: `Earn 1 ${formatCount(n).split(" ")[1]} medkits.`,
    image: medkitTrophy(n),
    coins: 6,
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
    description: `Earn ${formatCount(n)} medkits per second.`,
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
    description: "Earn 179.769 uncentillion medkits, the most a phone can count.",
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
  ...NEW_GAME_MEDALS.map(([game, name, description, image]) => ({
    id: `game_${game}`,
    name,
    description,
    image,
    coins: 2,
    check: (s: GameState) => (s.minigameWins[game] ?? 0) >= 1,
  })),
  {
    id: "game_all",
    name: "All-Rounder",
    description: "Win every ward minigame at least once.",
    image: TROPHY.star,
    coins: 5,
    check: (s) => MINIGAME_IDS.every((g) => (s.minigameWins[g] ?? 0) >= 1),
  },
  // Minigame feats (0.8.0)
  {
    id: "game_memory_perfect",
    name: "Photographic Memory",
    description: "Win the memory minigame without a single wrong pair.",
    image: require("@/imgs/achievements/camera.png"),
    coins: 4,
    check: (s) => (s.minigamePerfect["memory"] ?? 0) >= 1,
  },
  {
    id: "game_colour_perfect",
    name: "Eagle Eye",
    description: "Win Odd Colour Out without a wrong tap.",
    image: require("@/imgs/achievements/eye.png"),
    coins: 4,
    check: (s) => (s.minigamePerfect["colour"] ?? 0) >= 1,
  },
  {
    id: "game_food_perfect",
    name: "Clean Eating",
    description: "Win Healthy Shopping without catching any junk food.",
    image: require("@/imgs/achievements/salad.png"),
    coins: 4,
    check: (s) => (s.minigamePerfect["food"] ?? 0) >= 1,
  },
  {
    id: "game_streak_5",
    name: "On a Roll",
    description: "Win 5 ward minigames in a row.",
    image: MEDAL,
    coins: 4,
    check: (s) => s.minigameBestStreak >= 5,
    progress: (s) => s.minigameBestStreak / 5,
  },
  {
    id: "game_streak_15",
    name: "Unbeatable Shift",
    description: "Win 15 ward minigames in a row.",
    image: TROPHY.gold,
    coins: 8,
    check: (s) => s.minigameBestStreak >= 15,
    progress: (s) => s.minigameBestStreak / 15,
  },
  {
    id: "game_wins_25",
    name: "Ward Veteran",
    description: "Win 25 ward minigames.",
    image: require("@/imgs/achievements/ward_badge_silver.png"),
    coins: 4,
    check: (s) => totalWins(s) >= 25,
    progress: (s) => totalWins(s) / 25,
  },
  {
    id: "game_wins_100",
    name: "Ward Legend",
    description: "Win 100 ward minigames.",
    image: require("@/imgs/achievements/ward_badge_gold.png"),
    coins: 8,
    check: (s) => totalWins(s) >= 100,
    progress: (s) => totalWins(s) / 100,
  },
  // Secrets (0.8.0)
  {
    id: "full_house",
    name: "Full House",
    description: "Have three patients waiting in My Room at once.",
    image: require("@/imgs/achievements/waiting_bench.png"),
    secret: true,
    coins: 3,
    check: (s) => s.patients.length >= 3,
  },
  {
    id: "staff_meeting",
    name: "Staff Meeting",
    description: "Put every nurse and the doctor to work in My Room.",
    image: require("@/imgs/achievements/id_badge.png"),
    secret: true,
    coins: 3,
    check: (s) => STAFF_IDS.every((id) => Object.values(s.room.placed).some((list) => list.some((p) => p.item === id))),
  },
  // Absurdly specific, but not secret: the challenge is knowing they exist (0.8.0)
  {
    id: "exactly_777",
    name: "Jackpot",
    description: "Have exactly 777 medkits (not a single one more).",
    image: require("@/imgs/achievements/slot_machine.png"),
    coins: 3,
    check: (s) => Math.floor(s.healed) === 777,
  },
  {
    id: "bandage_hoarder",
    name: "Bandage Hoarder",
    description: "Own 150 bandages and not a single pair of gloves.",
    image: require("@/imgs/achievements/bandage_stack.png"),
    coins: 4,
    check: (s) => s.owned.bandage >= 150 && s.owned.gloves === 0,
  },
  {
    id: "hands_off",
    name: "Hands Off",
    description: "Reach 1,000 medkits per second having tapped the medkit fewer than 100 times, ever.",
    image: require("@/imgs/achievements/hands_off.png"),
    coins: 4,
    check: (s) => s.taps < 100 && healingRate(s) >= 1_000,
  },
  {
    id: "the_answer",
    name: "The Answer",
    description: "Own exactly 42 of four different supplies at the same time.",
    image: require("@/imgs/achievements/answer_42.png"),
    coins: 4,
    check: (s) => Object.values(s.owned).filter((n) => n === 42).length >= 4,
  },
  {
    id: "penny_pincher",
    name: "Penny Pincher",
    description: "Have a trillion medkits in hand while owning fewer than 60 supplies.",
    image: require("@/imgs/achievements/piggy_bank.png"),
    coins: 4,
    check: (s) => s.healed >= 1e12 && totalOwned(s) < 60,
  },
  // 0.8.1: up to 199, each with its own icon.
  {
    id: "week_streak",
    name: "Seven Days Straight",
    description: "Claim the daily gift seven days in a row.",
    image: require("@/imgs/achievements/calendar_7.png"),
    coins: 6,
    check: (s) => s.daily.streak >= 7,
    progress: (s) => s.daily.streak / 7,
  },
  {
    id: "picture_perfect",
    name: "Picture Perfect",
    description: "Set your own photo, GIF or video as the background.",
    image: require("@/imgs/achievements/photo_frame.png"),
    coins: 3,
    check: (s) => s.customBgChanges >= 1,
  },
  {
    id: "heart_catcher",
    name: "Heart Catcher",
    description: "Catch 10 flying hearts.",
    image: require("@/imgs/achievements/heart_net.png"),
    coins: 5,
    check: (s) => s.heartsCaught >= 10,
    progress: (s) => s.heartsCaught / 10,
  },
  {
    id: "flawless_shift",
    name: "Flawless Shift",
    description: "Win 10 minigames without a single mistake.",
    image: require("@/imgs/achievements/rosette.png"),
    coins: 5,
    check: (s) => totalPerfect(s) >= 10,
    progress: (s) => totalPerfect(s) / 10,
  },
  {
    id: "interior_designer",
    name: "Interior Designer",
    description: "Have 10 items placed across your rooms.",
    image: require("@/imgs/achievements/paint_roller.png"),
    coins: 4,
    check: (s) => placedItems(s) >= 10,
    progress: (s) => placedItems(s) / 10,
  },
  {
    id: "big_spender",
    name: "Big Spender",
    description: "Spend 200 Care Coins.",
    image: require("@/imgs/achievements/coin_purse.png"),
    coins: 4,
    check: (s) => s.coinsSpent >= 200,
    progress: (s) => s.coinsSpent / 200,
  },
  {
    id: "gem_collector",
    name: "Gem Collector",
    description: "Spend 10 Natal Gems.",
    image: require("@/imgs/achievements/gem_chest.png"),
    coins: 5,
    check: (s) => s.gemsSpent >= 10,
    progress: (s) => s.gemsSpent / 10,
  },
];

/** Care Coins pay half the listed amount, rounded up (decided 2026-10-20), so coins feel precious. */
export const ACHIEVEMENTS: Achievement[] = LIST.map((a) => ({ ...a, coins: Math.ceil(a.coins / 2) }));

/** The achievements this player can see: section-only ones appear once their section is unlocked. */
export const visibleAchievements = (unlockedSections: string[]) => ACHIEVEMENTS.filter((a) => !a.section || unlockedSections.includes(a.section));

export type AchievementId = string;

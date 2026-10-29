import type { ImageSourcePropType } from "react-native";

export type ItemId =
  | "bandage"
  | "gloves"
  | "facemask"
  | "thermometer"
  | "stethoscope"
  | "bp_cuff"
  | "syringe"
  | "medicine"
  | "iv_bag"
  | "blood_vial"
  | "covid_test"
  | "microscope"
  | "dna";

export type ShopItem = {
  id: ItemId;
  name: string;
  image: ImageSourcePropType;
  baseCost: number;
  /** Medkits per second, per unit owned. */
  rate: number;
  /** Drawn smaller than the others where the art fills its whole canvas, so all supplies look the same size. */
  iconScale?: number;
};

/** Each purchase multiplies the next price by this (1.14 until 0.8.0: buying 100 of anything cost too much). */
export const COST_GROWTH = 1.12;

/** Share of the per-second rate added to every medkit tap. */
export const TAP_RATE_BONUS = 0.05;

/**
 * Tap growth: taps get stronger the more you tap, so tapping carries the early game and stays worth
 * it. Every 100 taps ever made is a step, up to 23 (2,300 taps). Each step adds 1 to every tap and 1%
 * of per-second, so taps top out at 1 + 23 + 25.5% of per-second. It never goes down: rebirth keeps
 * it (only Delete progress resets it). Players see the bigger "+N", not steps or levels.
 * (Tap growth adds 1.5% of per-second per step: taps top out at 1 + 23 + 39.5% of per-second.)
 */
export const TAP_GROWTH_EVERY = 100;
export const TAP_GROWTH_STEPS = 23;
export const TAP_GROWTH_RATE = 0.015;
/** Tap growth steps (0-23) from lifetime taps. */
export const tapGrowth = (taps: number) => Math.min(TAP_GROWTH_STEPS, Math.floor(taps / TAP_GROWTH_EVERY));
/** Medkits a bare tap earns before boosts: 1, plus tap growth, plus a share of per-second. */
export const baseTap = (rate: number, taps = 0) => {
  const steps = tapGrowth(taps);
  return 1 + steps + rate * (TAP_RATE_BONUS + TAP_GROWTH_RATE * steps);
};

// Ordered from everyday bedside care to specialist diagnostics: first aid and infection control,
// then vital signs, then treatment, then the lab. Each tier costs ~10x the last and pays back slower,
// the classic clicker curve. Ids are what saves store, so reordering never touches progress.
export const SHOP_ITEMS: ShopItem[] = [
  { id: "bandage", name: "Bandage", image: require("@/imgs/shop/bandage_roll.png"), baseCost: 15, rate: 0.1 },
  { id: "gloves", name: "Gloves", image: require("@/imgs/shop/gloves.png"), baseCost: 100, rate: 1, iconScale: 0.9 },
  { id: "facemask", name: "Facemask", image: require("@/imgs/shop/facemask.png"), baseCost: 1_100, rate: 8, iconScale: 0.9 },
  { id: "thermometer", name: "Thermometer", image: require("@/imgs/shop/thermometer.png"), baseCost: 12_000, rate: 47 },
  { id: "stethoscope", name: "Stethoscope", image: require("@/imgs/shop/stethoscope.png"), baseCost: 130_000, rate: 260 },
  { id: "bp_cuff", name: "BP Cuff", image: require("@/imgs/shop/bp_tester.png"), baseCost: 1.4e6, rate: 1_400 },
  { id: "syringe", name: "Syringe", image: require("@/imgs/shop/syringe.png"), baseCost: 2e7, rate: 7_800, iconScale: 0.9 },
  { id: "medicine", name: "Medicine", image: require("@/imgs/shop/medicines.png"), baseCost: 3.3e8, rate: 44_000, iconScale: 0.9 },
  { id: "iv_bag", name: "IV Bag", image: require("@/imgs/shop/iv_bag.png"), baseCost: 5.1e9, rate: 260_000 },
  { id: "blood_vial", name: "Blood Sample", image: require("@/imgs/shop/blood_vial.png"), baseCost: 7.5e10, rate: 1.6e6 },
  { id: "covid_test", name: "COVID Test", image: require("@/imgs/shop/covid_test.png"), baseCost: 1e12, rate: 1e7 },
  { id: "microscope", name: "Microscope", image: require("@/imgs/shop/microscope.png"), baseCost: 1.4e13, rate: 6.5e7 },
  { id: "dna", name: "DNA Strand", image: require("@/imgs/shop/dna.png"), baseCost: 1.7e14, rate: 4.3e8 },
];

export const MEDKIT_IMAGE: ImageSourcePropType = require("@/imgs/medkit.png");
export const HOSPITAL_IMAGE: ImageSourcePropType = require("@/imgs/hospital.png");

export const itemCost = (item: ShopItem, owned: number) =>
  Math.ceil(item.baseCost * COST_GROWTH ** owned);

/**
 * Owning more of one item doubles that item's output at each milestone: 10, 25, 50, 75 and 100 owned,
 * then every 50 more. So the first supplies stay worth buying all game: 50 bandages make as much as
 * 40 gloves, and 100 bandages (x32) more than a stethoscope.
 */
export const MILESTONES = [10, 25, 50, 75, 100];
export const MILESTONE_AFTER = 50;
export const milestonesReached = (count: number) => {
  const first = MILESTONES.filter((m) => count >= m).length;
  const last = MILESTONES[MILESTONES.length - 1];
  return first + (count > last ? Math.floor((count - last) / MILESTONE_AFTER) : 0);
};
/** The owned count where this item next doubles. */
export const nextMilestone = (count: number) => MILESTONES.find((m) => m > count) ?? MILESTONES[MILESTONES.length - 1] + MILESTONE_AFTER * (Math.floor((count - MILESTONES[MILESTONES.length - 1]) / MILESTONE_AFTER) + 1);
export const itemMultiplier = (count: number) => 2 ** milestonesReached(count);

export const perSecond = (owned: Record<ItemId, number>) =>
  SHOP_ITEMS.reduce((sum, item) => {
    const n = owned[item.id] ?? 0;
    return sum + item.rate * n * itemMultiplier(n);
  }, 0);

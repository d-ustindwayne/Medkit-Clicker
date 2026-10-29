import type { ImageSourcePropType } from "react-native";

import { eventMultipliers } from "@/lib/event-store";

// Boosts: one-off power-ups bought with Care Coins, the currency achievements pay out.
// Balanced by Claude (0.8.0, made about 2-3x stronger for the same coins); still open to tuning.

export const COIN = {
  name: "Care Coins",
  image: require("@/imgs/misc/coin.png") as ImageSourcePropType,
};

export type BoostEffect =
  /** Multipliers that last `seconds`; buying again extends the timer. */
  | { kind: "timed"; seconds: number; tap?: number; rate?: number; price?: number }
  /** Medkits right away: `rateSeconds` of the per-second rate, or `taps` medkit taps. */
  | { kind: "instant"; rateSeconds?: number; taps?: number }
  /** The next `taps` medkit taps heal `mult` times as much. */
  | { kind: "charges"; taps: number; mult: number };

export type Boost = { id: string; name: string; description: string; cost: number; image: ImageSourcePropType; effect: BoostEffect };

/**
 * Cheapest first. Each boost has its own icon (src/media/photos/sprites/boosts): a recoloured game
 * sprite with a corner badge for its kind (bolt per tap, arrow per second, plus instant, star lucky, % sale).
 */
export const BOOSTS: Boost[] = [
  { id: "emergency_funding", name: "Emergency Funding", description: "Instantly get 1 minute's worth of medkits.", cost: 1, image: require("@/imgs/boosts/emergency_funding.png"), effect: { kind: "instant", rateSeconds: 60 } },
  { id: "adrenaline", name: "Adrenaline Shot", description: "3x medkits per tap for 5 minutes.", cost: 2, image: require("@/imgs/boosts/adrenaline.png"), effect: { kind: "timed", seconds: 300, tap: 3 } },
  { id: "patient_rush", name: "Patient Rush", description: "Instantly get 300 taps' worth of medkits.", cost: 2, image: require("@/imgs/boosts/patient_rush.png"), effect: { kind: "instant", taps: 300 } },
  { id: "double_shift", name: "Double Shift", description: "2x medkits per second for 10 minutes.", cost: 3, image: require("@/imgs/boosts/double_shift.png"), effect: { kind: "timed", seconds: 600, rate: 2 } },
  { id: "code_blue", name: "Code Blue", description: "10x medkits per tap for 90 seconds.", cost: 3, image: require("@/imgs/boosts/code_blue.png"), effect: { kind: "timed", seconds: 90, tap: 10 } },
  { id: "lucky_stethoscope", name: "Lucky Stethoscope", description: "Your next 100 taps earn 25x.", cost: 4, image: require("@/imgs/boosts/lucky_stethoscope.png"), effect: { kind: "charges", taps: 100, mult: 25 } },
  { id: "clearance_sale", name: "Clearance Sale", description: "Shop prices 30% off for 5 minutes.", cost: 4, image: require("@/imgs/boosts/clearance_sale.png"), effect: { kind: "timed", seconds: 300, price: 0.7 } },
  { id: "research_grant", name: "Research Grant", description: "Instantly get 15 minutes' worth of medkits.", cost: 5, image: require("@/imgs/boosts/research_grant.png"), effect: { kind: "instant", rateSeconds: 900 } },
  { id: "flu_season", name: "Flu Season Surge", description: "7x medkits per second for 177 seconds.", cost: 6, image: require("@/imgs/boosts/flu_season.png"), effect: { kind: "timed", seconds: 177, rate: 7 } },
  { id: "triple_espresso", name: "Triple Espresso", description: "3x per tap and per second for 5 minutes.", cost: 8, image: require("@/imgs/boosts/triple_espresso.png"), effect: { kind: "timed", seconds: 300, tap: 3, rate: 3 } },
  { id: "night_crew", name: "Night Shift Crew", description: "2x medkits per second for 45 minutes.", cost: 8, image: require("@/imgs/boosts/night_crew.png"), effect: { kind: "timed", seconds: 2700, rate: 2 } },
  { id: "charity_gala", name: "Charity Gala", description: "Instantly get 2 hours' worth of medkits.", cost: 12, image: require("@/imgs/boosts/charity_gala.png"), effect: { kind: "instant", rateSeconds: 7200 } },
  { id: "time_warp", name: "Time Warp", description: "Instantly get 8 hours' worth of medkits.", cost: 25, image: require("@/imgs/boosts/time_warp.png"), effect: { kind: "instant", rateSeconds: 28_800 } },
];

/**
 * The active timed boosts' multiplier for one stat. `boosts` maps boost id -> end time (ms); `extra`
 * adds other multipliers to the mix (the Lucky Stethoscope's taps). Tap and per-second boosts add up
 * (x2 and x3 make x5; x7, x3 and x2 make x12, not x42), so stacking several, which has no limit,
 * doesn't run away; price discounts multiply. Running timed events (set in the editor) count like
 * boosts too, whenever `boosts` is passed (so offline earnings, which leave boosts out, skip them).
 */
export function boostMultiplier(boosts: Record<string, number> | undefined, stat: "tap" | "rate" | "price", now = Date.now(), extra: number[] = []) {
  const ms = [...extra];
  if (boosts && stat !== "price") ms.push(...eventMultipliers(stat, now));
  for (const b of BOOSTS) {
    if (!boosts || b.effect.kind !== "timed" || (boosts[b.id] ?? 0) <= now) continue;
    const m = b.effect[stat];
    if (m !== undefined) ms.push(m);
  }
  if (ms.length === 0) return 1;
  return stat === "price" ? ms.reduce((a, m) => a * m, 1) : ms.reduce((a, m) => a + m, 0);
}

export const LUCKY_MULT = 25;

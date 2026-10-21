import type { ImageSourcePropType } from "react-native";

// Boosts: one-off power-ups bought with Care Coins, the currency achievements pay out.
// Every number here is a PLACEHOLDER for balancing; see docs/TASKS.md "Needs your decision".

export const COIN = {
  name: "Care Coins",
  image: require("@/imgs/misc/coin.png") as ImageSourcePropType,
};

export type BoostEffect =
  /** Multipliers that last `seconds`; buying again extends the timer. */
  | { kind: "timed"; seconds: number; tap?: number; rate?: number; price?: number }
  /** Patients right away: `rateSeconds` of healing per second, or `taps` medkit taps. */
  | { kind: "instant"; rateSeconds?: number; taps?: number }
  /** The next `taps` medkit taps heal `mult` times as much. */
  | { kind: "charges"; taps: number; mult: number };

export type Boost = { id: string; name: string; description: string; cost: number; image: ImageSourcePropType; effect: BoostEffect };

/**
 * Cheapest first. Each boost has its own icon (src/media/photos/sprites/boosts): a recoloured game
 * sprite with a corner badge for its kind (bolt per tap, arrow per second, plus instant, star lucky, % sale).
 */
export const BOOSTS: Boost[] = [
  { id: "emergency_funding", name: "Emergency Funding", description: "Instantly heal 20 seconds' worth of patients.", cost: 1, image: require("@/imgs/boosts/emergency_funding.png"), effect: { kind: "instant", rateSeconds: 20 } },
  { id: "adrenaline", name: "Adrenaline Shot", description: "2x patients per tap for 3 minutes.", cost: 2, image: require("@/imgs/boosts/adrenaline.png"), effect: { kind: "timed", seconds: 180, tap: 2 } },
  { id: "patient_rush", name: "Patient Rush", description: "Instantly heal 100 taps' worth of patients.", cost: 2, image: require("@/imgs/boosts/patient_rush.png"), effect: { kind: "instant", taps: 100 } },
  { id: "double_shift", name: "Double Shift", description: "2x patients per second for 5 minutes.", cost: 3, image: require("@/imgs/boosts/double_shift.png"), effect: { kind: "timed", seconds: 300, rate: 2 } },
  { id: "code_blue", name: "Code Blue", description: "5x patients per tap for 60 seconds.", cost: 3, image: require("@/imgs/boosts/code_blue.png"), effect: { kind: "timed", seconds: 60, tap: 5 } },
  { id: "lucky_stethoscope", name: "Lucky Stethoscope", description: "Your next 50 taps heal 10x.", cost: 4, image: require("@/imgs/boosts/lucky_stethoscope.png"), effect: { kind: "charges", taps: 50, mult: 10 } },
  { id: "clearance_sale", name: "Clearance Sale", description: "Shop prices 25% off for 3 minutes.", cost: 4, image: require("@/imgs/boosts/clearance_sale.png"), effect: { kind: "timed", seconds: 180, price: 0.75 } },
  { id: "research_grant", name: "Research Grant", description: "Instantly heal 5 minutes' worth of patients.", cost: 5, image: require("@/imgs/boosts/research_grant.png"), effect: { kind: "instant", rateSeconds: 300 } },
  { id: "flu_season", name: "Flu Season Surge", description: "7x patients per second for 77 seconds.", cost: 6, image: require("@/imgs/boosts/flu_season.png"), effect: { kind: "timed", seconds: 77, rate: 7 } },
  { id: "triple_espresso", name: "Triple Espresso", description: "3x per tap and per second for 2 minutes.", cost: 8, image: require("@/imgs/boosts/triple_espresso.png"), effect: { kind: "timed", seconds: 120, tap: 3, rate: 3 } },
  { id: "night_crew", name: "Night Shift Crew", description: "1.5x patients per second for 30 minutes.", cost: 8, image: require("@/imgs/boosts/night_crew.png"), effect: { kind: "timed", seconds: 1800, rate: 1.5 } },
  { id: "charity_gala", name: "Charity Gala", description: "Instantly heal 1 hour's worth of patients.", cost: 12, image: require("@/imgs/boosts/charity_gala.png"), effect: { kind: "instant", rateSeconds: 3600 } },
  { id: "time_warp", name: "Time Warp", description: "Instantly heal 4 hours' worth of patients.", cost: 25, image: require("@/imgs/boosts/time_warp.png"), effect: { kind: "instant", rateSeconds: 14_400 } },
];

/** Product of the active timed boosts' multipliers for one stat. `boosts` maps boost id -> end time (ms). */
export function boostMultiplier(boosts: Record<string, number> | undefined, stat: "tap" | "rate" | "price", now = Date.now()) {
  if (!boosts) return 1;
  let m = 1;
  for (const b of BOOSTS) {
    if (b.effect.kind !== "timed" || (boosts[b.id] ?? 0) <= now) continue;
    m *= b.effect[stat] ?? 1;
  }
  return m;
}

export const LUCKY_MULT = 10;

// Walking rewards (Android): the phone's step counter turned into distance, paid out as you go.
// Every 500 m pays a surprise reward, up to 8 km a day (decided by Claude at the owner's request, 0.8.21):
// medkits, Care Coins or a boost, bigger the further you walk that day; from 4 km a small chance of a
// Natal Gem, and 8 km pays two Natal Gems and 2 hours of medkits. Walking should pay far better than chasing achievements.
import { BOOSTS } from "@/constants/boosts";

/** A typical walking stride. */
export const STEP_M = 0.75;
export const DAILY_CAP_M = 8000;
export const REWARD_EVERY_M = 500;
/** From this many metres a reward can be a Natal Gem. */
export const GEM_FROM_M = 4000;
const GEM_CHANCE = 0.08;

export type WalkReward = { kind: "medkits"; seconds: number } | { kind: "coins"; amount: number } | { kind: "boost"; id: string } | { kind: "gem"; count: number; seconds?: number };

/** A small seeded random generator, so a day's rewards are the same however the readings arrive. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The reward for the `n`th 500 m of `day` (1-based). */
export function walkReward(day: string, n: number): WalkReward {
  const rand = seeded(`${day}#${n}`);
  // The day's last reward: two gems and 2 hours of medkits.
  if (n * REWARD_EVERY_M >= DAILY_CAP_M) return { kind: "gem", count: 2, seconds: 7200 };
  if (n * REWARD_EVERY_M >= GEM_FROM_M && rand() < GEM_CHANCE) return { kind: "gem", count: 1 };
  const roll = rand(), spread = 0.8 + rand() * 0.5;
  // 30 minutes of medkits at the first 500 m, up to about 2.5 hours near 8 km.
  if (roll < 0.4) return { kind: "medkits", seconds: Math.round((1800 * (1 + (n - 1) * 0.25) * spread) / 60) * 60 };
  // 15 coins at first, up to about 60 (an achievement pays 1-10).
  if (roll < 0.75) return { kind: "coins", amount: Math.round((12 + n * 3) * spread) };
  // A boost, pricier ones the further you go.
  const pool = BOOSTS.filter((b) => b.cost <= 3 + n * 1.5);
  return { kind: "boost", id: pool[Math.floor(rand() * pool.length)].id };
}

/** The rewards a reading paid: the milestones after `paidBefore`, up to `paidNow`. */
export const walkRewards = (day: string, paidBefore: number, paidNow: number) =>
  Array.from({ length: Math.max(0, paidNow - paidBefore) }, (_, k) => walkReward(day, paidBefore + k + 1));

export type StepReading = { steps: number; bootTime: number };
/**
 * `on`: the player turned walking rewards on. `day`: the local date the distance counts for.
 * `meters`: walked that day (capped). `paid500`: 500 m rewards already paid that day (`paid1k` is from
 * before 0.8.21, when each kilometre paid coins too; still counted, no longer paid).
 * `last`: the previous sensor reading, to count the steps since.
 */
export type WalkState = { on: boolean; day: string | null; meters: number; paid500: number; paid1k: number; last: StepReading | null };
export const newWalk = (): WalkState => ({ on: false, day: null, meters: 0, paid500: 0, paid1k: 0, last: null });

/** Readings from the same switch-on of the phone have boot times this close (the clock drifts a little). */
const SAME_BOOT_MS = 120_000;

/** Steps taken since the last reading: none for the very first one, all of them after a restart. */
export function stepsSince(last: StepReading | null, now: StepReading) {
  if (!last) return 0;
  const sameBoot = Math.abs(now.bootTime - last.bootTime) < SAME_BOOT_MS && now.steps >= last.steps;
  return Math.max(0, sameBoot ? now.steps - last.steps : now.steps);
}

/**
 * Adds a reading. Returns the new state and the rewards now due. A new day
 * starts the distance over (the steps since the last reading count for the new day).
 */
export function addReading(w: WalkState, reading: StepReading, today: string) {
  const fresh = w.day !== today;
  const base = fresh ? { ...w, day: today, meters: 0, paid500: 0, paid1k: 0 } : w;
  const meters = Math.min(DAILY_CAP_M, base.meters + stepsSince(w.last, reading) * STEP_M);
  const due500 = Math.floor(meters / REWARD_EVERY_M) - base.paid500;
  const due1k = Math.floor(meters / 1000) - base.paid1k;
  const rewards = walkRewards(today, base.paid500, base.paid500 + due500);
  return { walk: { ...base, meters, paid500: base.paid500 + due500, paid1k: base.paid1k + due1k, last: reading }, due500, rewards };
}

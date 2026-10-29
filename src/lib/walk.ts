// Walking rewards (Android): the phone's step counter turned into distance, paid out as you go.
// Picked by Claude with the owner (0.8.0): every 500 m pays 20 minutes of medkits, every 1 km pays
// 20 Care Coins, up to 8 km a day.

/** A typical walking stride. */
export const STEP_M = 0.75;
export const DAILY_CAP_M = 8000;
export const MEDKITS_EVERY_M = 500;
export const MEDKIT_SECONDS = 1200;
export const COINS_EVERY_M = 1000;
export const COINS_PER_KM = 20;

export type StepReading = { steps: number; bootTime: number };
/**
 * `on`: the player turned walking rewards on. `day`: the local date the distance counts for.
 * `meters`: walked that day (capped). `paid500`/`paid1k`: rewards already paid that day.
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
 * Adds a reading. Returns the new state and how many 500 m and 1 km rewards are now due. A new day
 * starts the distance over (the steps since the last reading count for the new day).
 */
export function addReading(w: WalkState, reading: StepReading, today: string) {
  const fresh = w.day !== today;
  const base = fresh ? { ...w, day: today, meters: 0, paid500: 0, paid1k: 0 } : w;
  const meters = Math.min(DAILY_CAP_M, base.meters + stepsSince(w.last, reading) * STEP_M);
  const due500 = Math.floor(meters / MEDKITS_EVERY_M) - base.paid500;
  const due1k = Math.floor(meters / COINS_EVERY_M) - base.paid1k;
  return { walk: { ...base, meters, paid500: base.paid500 + due500, paid1k: base.paid1k + due1k, last: reading }, due500, due1k };
}

// Rebirth (prestige): start a fresh run in exchange for rebirth points, a currency that carries over.
// Every number here is a PLACEHOLDER for balancing; see docs/TASKS.md "Needs your decision".

import { perSecond, type ItemId } from "@/constants/items";

/** Production boost per rebirth, kept deliberately small: 1 rebirth = x1.02, 10 rebirths = x1.2. */
export const REBIRTH_BONUS_PER = 0.02;

export const rebirthMultiplier = (rebirths: number) => 1 + REBIRTH_BONUS_PER * rebirths;

/** Patients healed per second including the rebirth boost. Use this instead of bare perSecond(). */
export const healingRate = (s: { owned: Record<ItemId, number>; rebirths: number }) =>
  perSecond(s.owned) * rebirthMultiplier(s.rebirths);

/** Patients that must be healed in the current run before rebirthing is allowed. */
export const REBIRTH_MIN_HEALED = 1e9;

/** Rebirth points earned for a run: 1 at 1 billion, 2 at 8 billion, 10 at 1 trillion. */
export const rebirthPointsFor = (runHealed: number) =>
  runHealed < REBIRTH_MIN_HEALED ? 0 : Math.floor(Math.cbrt(runHealed / REBIRTH_MIN_HEALED));

/**
 * Content that opens up at each rebirth count. Empty until designed; the Rebirth page lists these
 * so players can see what's next.
 */
export const REBIRTH_UNLOCKS: { rebirths: number; title: string; description: string }[] = [];

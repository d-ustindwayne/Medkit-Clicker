// Rebirth (prestige): start a fresh run and earn a Natal Gem, a currency that carries over.
// Every number here is a PLACEHOLDER for balancing; see docs/TASKS.md "Needs your decision".

import type { ImageSourcePropType } from "react-native";

import { boostMultiplier } from "@/constants/boosts";
import { perSecond, type ItemId } from "@/constants/items";
import { roomBonus, type RoomState } from "@/constants/room";

/** Production boost per rebirth, kept deliberately small: 1 rebirth = x1.02, 10 rebirths = x1.2. */
export const REBIRTH_BONUS_PER = 0.02;

export const rebirthMultiplier = (rebirths: number) => 1 + REBIRTH_BONUS_PER * rebirths;

/**
 * Patients healed per second including the rebirth boost and, when `boosts` is passed, active
 * timed boosts, plus placed room items. Use this instead of bare perSecond(). Offline earnings leave boosts out.
 */
export const healingRate = (s: { owned: Record<ItemId, number>; rebirths: number; boosts?: Record<string, number>; room?: RoomState }) =>
  perSecond(s.owned) * rebirthMultiplier(s.rebirths) * boostMultiplier(s.boosts, "rate") * (1 + roomBonus(s.room, "rate"));

/** Patients that must be healed in the current run before rebirthing is allowed. */
export const REBIRTH_MIN_HEALED = 1e9;

/** Natal Gems: one per rebirth, for every new beginning. A hospital is where life begins. */
export const GEM = {
  name: "Natal Gems",
  one: "Natal Gem",
  image: require("@/imgs/misc/natal_gem.png") as ImageSourcePropType,
};

/** Gems earned by rebirthing now: 1 once the run has healed enough, otherwise 0. */
export const gemsForRebirth = (runHealed: number) => (runHealed < REBIRTH_MIN_HEALED ? 0 : 1);

/**
 * Content that opens up at each rebirth count. Empty until designed; the Rebirth page lists these
 * so players can see what's next.
 */
export const REBIRTH_UNLOCKS: { rebirths: number; title: string; description: string }[] = [];

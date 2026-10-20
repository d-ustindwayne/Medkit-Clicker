// Rebirth (prestige): start a fresh run and earn a Natal Gem, a currency that carries over.
// Every number here is a PLACEHOLDER for balancing; see docs/TASKS.md "Needs your decision".

import type { ImageSourcePropType } from "react-native";

import { boostMultiplier } from "@/constants/boosts";
import { GEM_ITEMS, GEM_KIND_LABEL } from "@/constants/gems";
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

/** Patients the first run must heal before rebirthing; each rebirth after that needs 2.5x more. */
export const REBIRTH_MIN_HEALED = 1e9;
export const REBIRTH_GROWTH = 2.5;
export const rebirthTarget = (rebirths: number) => REBIRTH_MIN_HEALED * REBIRTH_GROWTH ** rebirths;

/** Natal Gems: one per rebirth, for every new beginning. A hospital is where life begins. */
export const GEM = {
  name: "Natal Gems",
  one: "Natal Gem",
  image: require("@/imgs/misc/natal_gem.png") as ImageSourcePropType,
};

/** Gems earned by rebirthing now: 1 once the run has healed enough, otherwise 0. */
export const gemsForRebirth = (runHealed: number, rebirths: number) => (runHealed < rebirthTarget(rebirths) ? 0 : 1);

/** What each rebirth count opens up in the Gem Shop (cosmetics), so players can see what's next. */
export const REBIRTH_UNLOCKS: { rebirths: number; title: string; description: string }[] = GEM_ITEMS.filter((i) => !i.section && i.rebirths > 0)
  .sort((a, b) => a.rebirths - b.rebirths)
  .map((i) => ({ rebirths: i.rebirths, title: i.name, description: `New in the Gem Shop: ${GEM_KIND_LABEL[i.kind].toLowerCase()}` }));

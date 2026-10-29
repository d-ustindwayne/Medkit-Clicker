// Timed events from the server (set in the editor): while one runs, every player gets its multipliers
// (added like boosts) and, once, its gift. Kept here, outside React, so the game's maths can read them.

import type { PromoItem } from "@/lib/game";

export type GameEvent = {
  id: number;
  title: string;
  description: string | null;
  startsAt: number;
  endsAt: number;
  tapMult: number | null;
  rateMult: number | null;
  rewards: PromoItem[];
  /** A small picture as a data: URL, or null. */
  icon: string | null;
};

let events: GameEvent[] = [];
const listeners = new Set<() => void>();

export const getEvents = () => events;
export const setEvents = (next: GameEvent[]) => {
  events = next;
  listeners.forEach((l) => l());
};
export const subscribeEvents = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const isRunning = (e: GameEvent, now = Date.now()) => e.startsAt <= now && now < e.endsAt;

/** The running events' multipliers for one stat (they add up with boosts, like boosts do). */
export const eventMultipliers = (stat: "tap" | "rate", now = Date.now()) =>
  events.flatMap((e) => {
    const m = stat === "tap" ? e.tapMult : e.rateMult;
    return isRunning(e, now) && m && m > 1 ? [m] : [];
  });

/** The hash an event's gift is claimed under (in GameState.promoClaims), so it's given once. */
export const eventClaim = (e: GameEvent) => `event-${e.id}`;

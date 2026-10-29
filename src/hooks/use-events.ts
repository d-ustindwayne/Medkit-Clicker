import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

import { useGameActions, useGameReady, useGameStore } from "@/hooks/use-game";
import { API_URL } from "@/lib/cloud";
import { eventClaim, getEvents, isRunning, setEvents, subscribeEvents, type GameEvent } from "@/lib/event-store";

const CACHE_KEY = "mc/events/v1";
/** Events are fetched at start-up, then every 10 minutes while the game is open. */
const EVERY_MS = 10 * 60 * 1000;

/** The events the server last listed (running and upcoming). */
export const useEvents = () => useSyncExternalStore(subscribeEvents, getEvents, getEvents);

/**
 * Keeps the events up to date and gives each running event's gift once (it's remembered like a
 * promo code). Offline, the last list is used.
 */
export function useEventsSync() {
  const ready = useGameReady();
  const store = useGameStore();
  const { dispatch, pushToast } = useGameActions();
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const giveGifts = () => {
      const claimed = store.get().promoClaims;
      for (const e of getEvents()) {
        if (!isRunning(e) || e.rewards.length === 0 || claimed.includes(eventClaim(e))) continue;
        dispatch({ type: "claimPromo", hash: eventClaim(e), rewards: e.rewards });
        pushToast({ kind: "info", title: e.title, body: "An event gift is in! Check your medkits and coins." });
      }
    };
    const load = async () => {
      try {
        if (!API_URL) return;
        const res = await fetch(`${API_URL}/events`);
        if (!res.ok) return;
        const list = (await res.json()) as GameEvent[];
        if (cancelled) return;
        setEvents(list);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {});
      } catch {
        // Offline: keep what we have.
      } finally {
        if (!cancelled) giveGifts();
      }
    };
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!cancelled && raw && getEvents().length === 0) setEvents(JSON.parse(raw) as GameEvent[]);
      })
      .catch(() => {})
      .finally(load);
    const id = setInterval(load, EVERY_MS);
    const sub = AppState.addEventListener("change", (s) => s === "active" && load());
    return () => {
      cancelled = true;
      clearInterval(id);
      sub.remove();
    };
  }, [ready, store, dispatch, pushToast]);
}

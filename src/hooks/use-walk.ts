import { useEffect } from "react";
import { AppState } from "react-native";

import { useGameActions, useGameReady, useGameSelector, useGameStore } from "@/hooks/use-game";
import { dayKey } from "@/lib/daily";
import { formatCount } from "@/lib/format";
import { dailyAmount } from "@/lib/game";
import { COINS_PER_KM, MEDKIT_SECONDS, addReading } from "@/lib/walk";
import { StepCounter } from "../../modules/step-counter";

/** How often the step counter is read while the game is open (and once each time it's opened). */
const EVERY_MS = 60_000;

/** Reads the step counter while walking rewards are on, and says when a reward is paid. Android only. */
export function useWalkTracker() {
  const on = useGameSelector((s) => s.walk.on);
  const ready = useGameReady();
  const store = useGameStore();
  const { dispatch, pushToast } = useGameActions();
  useEffect(() => {
    if (!ready || !on || !StepCounter) return;
    let cancelled = false;
    const check = async () => {
      const reading = await StepCounter!.read().catch(() => null);
      if (cancelled || !reading) return;
      const s = store.get();
      const today = dayKey();
      // Worked out the same way the game will, to say what was paid.
      const { due500, due1k } = addReading(s.walk, reading, today);
      dispatch({ type: "walkReading", reading, today });
      const parts = [due500 > 0 ? `+${formatCount(dailyAmount(s, MEDKIT_SECONDS * due500))} medkits` : "", due1k > 0 ? `+${due1k * COINS_PER_KM} Care Coins` : ""].filter(Boolean);
      if (parts.length) pushToast({ kind: "info", title: "Nice walk!", body: parts.join(", "), image: require("@/imgs/achievements/winged_heart.png") });
    };
    check();
    const id = setInterval(check, EVERY_MS);
    const sub = AppState.addEventListener("change", (a) => a === "active" && check());
    return () => {
      cancelled = true;
      clearInterval(id);
      sub.remove();
    };
  }, [ready, on, store, dispatch, pushToast]);
}

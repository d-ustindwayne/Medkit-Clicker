import { useEffect } from "react";
import { AppState } from "react-native";

import { useGameActions, useGameReady, useGameSelector, useGameStore } from "@/hooks/use-game";
import { dayKey } from "@/lib/daily";
import { BOOSTS } from "@/constants/boosts";
import { formatCount } from "@/lib/format";
import { dailyAmount } from "@/lib/game";
import { addReading, type WalkReward } from "@/lib/walk";
import type { GameState } from "@/lib/game";
import { StepCounter } from "../../modules/step-counter";

/** How often the step counter is read while the game is open (and once each time it's opened). */
const EVERY_MS = 60_000;
export const WALK_IMAGE = require("@/imgs/achievements/winged_heart.png");

/** What walking rewards paid, for the "Nice walk!" toast ("" if nothing). `s` is the state before them. */
export function describeWalk(s: GameState, rewards: WalkReward[]) {
  let seconds = 0, coins = 0, gems = 0;
  const boosts: string[] = [];
  for (const r of rewards) {
    if (r.kind === "medkits") seconds += r.seconds;
    else if (r.kind === "coins") coins += r.amount;
    else if (r.kind === "gem") {
      gems += r.count;
      seconds += r.seconds ?? 0;
    } else boosts.push(BOOSTS.find((b) => b.id === r.id)?.name ?? "a boost");
  }
  return [
    seconds ? `+${formatCount(dailyAmount(s, seconds))} medkits` : "",
    coins ? `+${coins} Care Coins` : "",
    gems ? `+${gems} Natal Gem${gems > 1 ? "s" : ""}` : "",
    ...boosts,
  ]
    .filter(Boolean)
    .join(", ");
}

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
      const { rewards } = addReading(s.walk, reading, today);
      dispatch({ type: "walkReading", reading, today });
      const body = describeWalk(s, rewards);
      if (body) pushToast({ kind: "info", title: "Nice walk!", body, image: WALK_IMAGE });
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

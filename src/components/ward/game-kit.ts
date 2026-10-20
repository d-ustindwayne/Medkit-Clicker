import { useEffect, useRef } from "react";

import type { MinigameTuning } from "@/constants/patients";

export type GameProps = { onDone: (won: boolean) => void; tuning: MinigameTuning };

/** 0 for a new player, rising to 1 after 100 patients treated (from the shared tuning). */
export const hardness = (t: MinigameTuning) => (t.wraps - 25) / 5;

/** Keeps the latest onDone without re-running timers when the parent re-renders. */
export function useDone(onDone: (won: boolean) => void) {
  const ref = useRef(onDone);
  const finished = useRef(false);
  useEffect(() => {
    ref.current = onDone;
  }, [onDone]);
  return (won: boolean) => {
    if (finished.current) return;
    finished.current = true;
    ref.current(won);
  };
}

/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

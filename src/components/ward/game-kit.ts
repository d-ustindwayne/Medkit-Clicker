import { useEffect, useRef } from "react";
import { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

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

/** Game feel: a little pop when something goes right and a shake when it doesn't. */
export function useJuice() {
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }, { translateX: shakeX.get() }] }));
  return {
    style,
    pop: () => scale.set(withSequence(withTiming(1.12, { duration: 80 }), withSpring(1, { damping: 6, stiffness: 260 }))),
    shake: () => shakeX.set(withSequence(withTiming(-8, { duration: 45 }), withTiming(8, { duration: 70 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 45 }))),
  };
}

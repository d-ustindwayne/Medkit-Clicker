import { useEffect, useRef } from "react";
import { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import type { MinigameTuning } from "@/constants/patients";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

export { pickVariant, shuffle } from "@/lib/random";

/** `perfect`: won without a single mistake (games that can tell; for the achievements). */
export type GameProps = { onDone: (won: boolean, perfect?: boolean) => void; tuning: MinigameTuning };

/** 0 for a new player, rising to 1 with progress (see minigameLevel). */
export const hardness = (t: MinigameTuning) => t.level;

/** Keeps the latest onDone without re-running timers when the parent re-renders. */
export function useDone(onDone: (won: boolean, perfect?: boolean) => void) {
  const ref = useRef(onDone);
  const finished = useRef(false);
  useEffect(() => {
    ref.current = onDone;
  }, [onDone]);
  return (won: boolean, perfect?: boolean) => {
    if (finished.current) return;
    finished.current = true;
    ref.current(won, perfect);
  };
}


/**
 * Game feel: a small pop when something goes right and a short nudge when it doesn't. Kept subtle
 * (no springy overshoot) because it moves the whole game panel. Off with Reduce motion.
 */
export function useJuice() {
  const still = useReduceMotion();
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }, { translateX: shakeX.get() }] }));
  return {
    style,
    pop: () =>
      !still &&
      scale.set(withSequence(withTiming(1.025, { duration: 70, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }))),
    shake: () => !still && shakeX.set(withSequence(withTiming(-3, { duration: 40 }), withTiming(3, { duration: 60 }), withTiming(0, { duration: 40 }))),
  };
}

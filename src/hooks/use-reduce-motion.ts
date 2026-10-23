import { useReducedMotion } from "react-native-reanimated";

import { useSettings } from "@/hooks/use-game";

/** True when the phone asks for less motion, or the player turned on Reduce motion in Settings. */
export function useReduceMotion() {
  const system = useReducedMotion();
  return useSettings().reduceMotion || system;
}

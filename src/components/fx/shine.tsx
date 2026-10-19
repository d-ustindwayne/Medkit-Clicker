import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";

const SWEEP_MS = 700;
const PAUSE_MS = 2600;

/** A light band that sweeps across its parent now and then. Parent needs overflow-hidden. */
export function Shine() {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    x.set(withRepeat(withDelay(PAUSE_MS, withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) })), -1, false));
  }, [x, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -80 + 600 * x.get() }, { rotate: "20deg" }],
  }));

  if (reduceMotion) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", top: -40, bottom: -40, width: 34, backgroundColor: "rgba(255,255,255,0.28)" }, style]}
    />
  );
}

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useReduceMotion } from "@/hooks/use-reduce-motion";

/** Scroll speed (px per second) and the rest at each end. */
const SPEED = 28;
const REST_MS = 1400;

type Props = {
  children: string;
  className?: string;
  /**
   * A line that's too long first shrinks, down to this scale, and scrolls only if it still won't fit.
   * The default only absorbs a few pixels, so a near-fit doesn't scroll (the web has no adjustsFontSizeToFit).
   */
  shrink?: number;
};

/**
 * One line of text that never runs past its box. When it fits it's a plain Text; when it doesn't, it
 * scrolls slowly to its end and back like a music player's title (with Reduce motion it ends in "…").
 */
export function MarqueeText({ children, className = "", shrink = 0.92 }: Props) {
  const still = useReduceMotion();
  const [box, setBox] = useState(0);
  const [natural, setNatural] = useState(0);
  const over = box > 0 && natural > box + 1;
  // Shrunk to fit if that's enough, otherwise scrolled at full size.
  const fitted = over && box / natural >= shrink;
  const scale = fitted ? box / natural : 1;
  const travel = Math.round(natural - box);
  const scroll = over && !fitted && !still;
  const x = useSharedValue(0);
  useEffect(() => {
    if (!scroll) return;
    const ms = (travel / SPEED) * 1000;
    const glide = (to: number) => withDelay(REST_MS, withTiming(to, { duration: ms, easing: Easing.inOut(Easing.quad) }));
    x.set(withRepeat(withSequence(glide(-travel), glide(0)), -1));
    return () => {
      cancelAnimation(x);
      x.set(0);
    };
  }, [scroll, travel, x]);
  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // The copy is shown only while it scrolls or is shrunk; otherwise the plain line is. (No style arrays
  // next to className on these Texts: on the web the class is pushed into a style array, and a reused
  // array would keep every class it was ever given.)
  const copyShown = scroll || fitted;

  return (
    // Hidden until both widths are known, so a long name never shows cut off before it shrinks or scrolls.
    <View className="max-w-full overflow-hidden" style={{ opacity: box > 0 && natural > 0 ? 1 : 0 }} onLayout={(e) => setBox(Math.round(e.nativeEvent.layout.width))}>
      <Text className={`${className} ${copyShown ? "opacity-0" : ""}`} numberOfLines={1}>
        {children}
      </Text>
      {/* Measures the whole line (its row is far wider than any screen), and is what moves. */}
      <Animated.View
        pointerEvents="none"
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={[
          { position: "absolute", top: 0, width: 4000, flexDirection: "row", opacity: copyShown ? 1 : 0 },
          // Shrunk: centred in the box, scaled about its middle.
          fitted ? { left: (box - natural) / 2 } : { left: 0 },
          moving,
        ]}
      >
        <Text className={className} style={fitted ? { transform: [{ scale }] } : undefined} onLayout={(e) => setNatural(Math.round(e.nativeEvent.layout.width))}>
          {children}
        </Text>
      </Animated.View>
    </View>
  );
}

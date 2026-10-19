import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { usePalette } from "@/hooks/use-palette";

export const BURST_MS = 900;
const PARTICLES = 6;

/** One tap's worth of feedback: a shockwave ring, pixel crosses flying out, and the "+N" number. */
export function TapBurst({ size, x, y, label, seed }: { size: number; x: number; y: number; label: string; seed: number }) {
  const palette = usePalette();
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
  }, [t]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.get()),
    transform: [{ scale: 0.85 + 0.45 * t.get() }],
  }));
  const number = useAnimatedStyle(() => ({
    opacity: t.get() < 0.6 ? 1 : 1 - (t.get() - 0.6) / 0.4,
    transform: [{ translateY: -110 * t.get() }, { scale: 1 + 0.25 * Math.sin(Math.min(t.get() * 6, Math.PI)) }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 8, borderColor: palette.glow }, ring]}
      />
      {Array.from({ length: PARTICLES }, (_, i) => (
        <Particle key={i} t={t} size={size} angle={((i + (seed % 7) / 7) / PARTICLES) * Math.PI * 2} color={i % 2 ? palette.primary : palette.success} />
      ))}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - 60, top: y - 24, width: 120 }, number]}>
        <Text
          className="text-center font-display text-3xl text-ink"
          style={{ textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0.1 }}
        >
          {label}
        </Text>
      </Animated.View>
    </>
  );
}

function Particle({ t, size, angle, color }: { t: SharedValue<number>; size: number; angle: number; color: string }) {
  const start = size * 0.42;
  const travel = size * 0.32;
  const style = useAnimatedStyle(() => {
    const d = start + travel * t.get();
    return {
      opacity: 1 - t.get(),
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { rotate: `${t.get() * 180}deg` }],
    };
  });
  // A 3x3-pixel medical cross.
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: size / 2 - 9, top: size / 2 - 9, width: 18, height: 18 }, style]}>
      <View style={{ position: "absolute", left: 6, top: 0, width: 6, height: 18, backgroundColor: color }} />
      <View style={{ position: "absolute", left: 0, top: 6, width: 18, height: 6, backgroundColor: color }} />
    </Animated.View>
  );
}

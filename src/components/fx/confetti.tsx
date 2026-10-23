import { memo, useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { usePalette } from "@/hooks/use-palette";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

const PIECES = 42;
const FALL_MS = 2400;

type Piece = { x: number; delay: number; drift: number; spin: number; w: number; h: number; color: string };

/** Small seeded PRNG (mulberry32) so a burst's layout is a pure function of its seed. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A one-shot shower of pixel confetti. Mount it with a fresh key and seed to fire again. */
export const Confetti = memo(function Confetti({ seed }: { seed: number }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const palette = usePalette();

  const pieces = useMemo<Piece[]>(() => {
    const colors = [palette.primary, palette.success, "#ffd23f", "#4fc3f7", palette.accent, "#ffffff"];
    const random = seeded(seed);
    return Array.from({ length: PIECES }, (_, i) => ({
      x: random() * width,
      delay: random() * 400,
      drift: (random() - 0.5) * 120,
      spin: (random() - 0.5) * 1080,
      w: 6 + Math.round(random() * 6),
      h: 8 + Math.round(random() * 8),
      color: colors[i % colors.length],
    }));
  }, [width, palette, seed]);

  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} height={height} />
      ))}
    </View>
  );
});

function ConfettiPiece({ piece, height }: { piece: Piece; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(piece.delay, withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) })));
  }, [t, piece.delay]);

  const style = useAnimatedStyle(() => ({
    opacity: t.get() > 0.85 ? (1 - t.get()) / 0.15 : 1,
    transform: [
      { translateY: -40 + (height + 80) * t.get() },
      { translateX: piece.drift * Math.sin(t.get() * Math.PI * 2) },
      { rotate: `${piece.spin * t.get()}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: piece.x, top: 0, width: piece.w, height: piece.h, backgroundColor: piece.color }, style]}
    />
  );
}

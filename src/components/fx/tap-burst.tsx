import { useEffect } from "react";
import { Image } from "@/components/ui/image";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { usePalette } from "@/hooks/use-palette";

export const BURST_MS = 900;
const PARTICLES = 6;

/** Gem Shop tap effects: a sprite and how its particles move. */
const EFFECTS = {
  tap_hearts: { image: require("@/imgs/gems/p_heart.png"), count: 7, motion: "float" },
  tap_sparkles: { image: require("@/imgs/gems/p_sparkle.png"), count: 8, motion: "burst" },
  tap_bubbles: { image: require("@/imgs/gems/p_bubble.png"), count: 6, motion: "rise" },
} as const;
type Motion = "float" | "burst" | "rise";

/** One tap's worth of feedback: a shockwave ring, pixel crosses flying out, and the "+N" number. */
export function TapBurst({ size, x, y, label, seed, effect = null }: { size: number; x: number; y: number; label: string; seed: number; effect?: string | null }) {
  const fx = effect && effect in EFFECTS ? EFFECTS[effect as keyof typeof EFFECTS] : null;
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
      {fx
        ? Array.from({ length: fx.count }, (_, i) => (
            <SpriteParticle key={i} t={t} size={size} i={i} seed={seed} count={fx.count} image={fx.image} motion={fx.motion} />
          ))
        : Array.from({ length: PARTICLES }, (_, i) => (
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

/** A pixel sprite particle for the Gem Shop tap effects. */
function SpriteParticle({ t, size, i, seed, count, image, motion }: { t: SharedValue<number>; size: number; i: number; seed: number; count: number; image: number; motion: Motion }) {
  const angle = ((i + (seed % 5) / 5) / count) * Math.PI * 2;
  const jitter = ((seed * 7 + i * 13) % 10) / 10; // 0-1, steady per particle
  const px = 22 + jitter * 10;
  const style = useAnimatedStyle(() => {
    const k = t.get();
    if (motion === "float") {
      // Hearts spurt out of the medkit in every direction, arc and fall a little, popping in big.
      const d = size * (0.28 + 0.5 * k);
      return {
        opacity: k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3,
        transform: [
          { translateX: Math.cos(angle) * d },
          { translateY: Math.sin(angle) * d + size * 0.35 * k * k },
          { scale: (k < 0.15 ? k / 0.15 : 1) * (1.25 - k * 0.45) },
          { rotate: `${Math.cos(angle) * 25 * k}deg` },
        ],
      };
    }
    if (motion === "burst") {
      // Sparkles shoot out, spin and twinkle.
      const d = size * (0.3 + 0.45 * k);
      return {
        opacity: (1 - k) * (0.55 + 0.45 * Math.abs(Math.sin(k * 20 + i))),
        transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { rotate: `${k * 270}deg` }, { scale: 1.2 - k * 0.6 }],
      };
    }
    // Bubbles rise slowly with a wobble, grow, and pop at the end.
    return {
      opacity: k < 0.85 ? 0.95 : (1 - k) / 0.15,
      transform: [{ translateX: Math.cos(angle) * size * 0.28 + Math.sin(k * 12 + i * 2) * 6 }, { translateY: size * 0.1 - k * size * 0.5 }, { scale: 0.5 + k * 0.7 + (k > 0.85 ? (k - 0.85) * 4 : 0) }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: size / 2 - px / 2, top: size / 2 - px / 2, width: px, height: px }, style]}>
      <Image source={image} style={{ width: px, height: px }} contentFit="contain" />
    </Animated.View>
  );
}

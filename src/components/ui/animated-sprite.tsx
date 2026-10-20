import { useEffect } from "react";
import { Image } from "expo-image";
import type { ImageSourcePropType } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";

/**
 * A pixel sprite with a few frames, flipping through them on a loop. All frames stay mounted and
 * only their opacity changes, so nothing re-renders while it plays.
 */
export function AnimatedSprite({ frames, size, frameMs = 220 }: { frames: ImageSourcePropType[]; size: number; frameMs?: number }) {
  const t = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    t.set(withRepeat(withTiming(frames.length, { duration: frames.length * frameMs, easing: Easing.linear }), -1, false));
  }, [t, frames.length, frameMs, reduceMotion]);
  return (
    <>
      {frames.map((f, i) => (
        <Frame key={i} t={t} i={i} count={frames.length} image={f} size={size} />
      ))}
    </>
  );
}

function Frame({ t, i, count, image, size }: { t: SharedValue<number>; i: number; count: number; image: ImageSourcePropType; size: number }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.min(count - 1, Math.floor(t.get())) === i ? 1 : 0 }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, style]}>
      <Image source={image} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}

import { useEffect } from "react";
import { Image } from "@/components/ui/image";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import type { ImageSourcePropType } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";

/**
 * A pixel sprite with a few frames, flipping through them on a loop. All frames stay mounted and
 * only their opacity changes, so nothing re-renders while it plays.
 */
/** `height` is for sprites that aren't square (`size` is then the width). */
export function AnimatedSprite({ frames, size, height = size, frameMs = 220 }: { frames: ImageSourcePropType[]; size: number; height?: number; frameMs?: number }) {
  const t = useSharedValue(0);
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) return;
    t.set(0);
    t.set(withRepeat(withTiming(frames.length, { duration: frames.length * frameMs, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(t);
      t.set(0);
    };
  }, [t, frames.length, frameMs, reduceMotion]);
  return (
    <>
      {frames.map((f, i) => (
        <Frame key={i} t={t} i={i} count={frames.length} image={f} width={size} height={height} />
      ))}
    </>
  );
}

function Frame({ t, i, count, image, width, height }: { t: SharedValue<number>; i: number; count: number; image: ImageSourcePropType; width: number; height: number }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.min(count - 1, Math.floor(t.get())) === i ? 1 : 0 }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height }, style]}>
      <Image source={image} style={{ width, height }} contentFit="contain" />
    </Animated.View>
  );
}

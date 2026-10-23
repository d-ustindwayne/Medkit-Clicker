import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { memo, useEffect } from "react";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";

const RAYS = 18;
const SPIN_MS = 60_000;

/** Slowly turning light rays behind the medkit. `active`: on screen (it stops turning when not). */
export const Sunburst = memo(function Sunburst({ size, color, active = true }: { size: number; color: string; active?: boolean }) {
  const reduceMotion = useReduceMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !active) return;
    // Picks up from wherever it stopped.
    const from = rotation.get() % 360;
    rotation.set(from);
    rotation.set(withRepeat(withTiming(from + 360, { duration: SPIN_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(rotation);
  }, [reduceMotion, rotation, active]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));

  const r = size / 2;
  const half = Math.PI / RAYS / 2;
  const rays = Array.from({ length: RAYS }, (_, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const x1 = r + r * Math.cos(a - half);
    const y1 = r + r * Math.sin(a - half);
    const x2 = r + r * Math.cos(a + half);
    const y2 = r + r * Math.sin(a + half);
    return `M ${r} ${r} L ${x1} ${y1} L ${x2} ${y2} Z`;
  }).join(" ");

  return (
    // Drawn once into a texture on Android and then only rotated, instead of redrawing the gradient
    // every frame.
    <Animated.View pointerEvents="none" renderToHardwareTextureAndroid style={[{ position: "absolute", width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="fade" cx="50%" cy="50%" r="50%">
            <Stop offset="0.35" stopColor={color} stopOpacity={0.7} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={rays} fill="url(#fade)" />
      </Svg>
    </Animated.View>
  );
});

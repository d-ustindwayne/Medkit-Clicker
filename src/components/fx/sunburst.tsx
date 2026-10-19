import { memo, useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";

const RAYS = 18;
const SPIN_MS = 60_000;

/** Slowly turning light rays behind the medkit. */
export const Sunburst = memo(function Sunburst({ size, color }: { size: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    rotation.set(withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1, false));
  }, [reduceMotion, rotation]);

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
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, style]}>
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

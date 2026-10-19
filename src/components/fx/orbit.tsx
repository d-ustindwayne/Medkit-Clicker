import { memo, useEffect } from "react";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { SHOP_ITEMS, type ItemId } from "@/constants/items";

const MAX_SPRITES = 16;
const SPRITE = 30;
const ORBIT_MS = 45_000;

/** Owned supplies circling the medkit, Cookie Clicker style. One sprite per unit, up to MAX_SPRITES. */
export const Orbit = memo(function Orbit({ size, owned }: { size: number; owned: Record<ItemId, number> }) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    rotation.set(withRepeat(withTiming(360, { duration: ORBIT_MS, easing: Easing.linear }), -1, false));
  }, [reduceMotion, rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));

  // Round-robin across item types so a big pile of syringes doesn't hide the rarer supplies.
  const sprites: (typeof SHOP_ITEMS)[number][] = [];
  for (let round = 0; sprites.length < MAX_SPRITES; round++) {
    const before = sprites.length;
    for (const item of SHOP_ITEMS) if (owned[item.id] > round && sprites.length < MAX_SPRITES) sprites.push(item);
    if (sprites.length === before) break;
  }
  if (sprites.length === 0) return null;

  const radius = size / 2;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, style]}>
      {sprites.map((item, i) => {
        const a = (i / sprites.length) * Math.PI * 2;
        return (
          <Image
            key={i}
            source={item.image}
            contentFit="contain"
            style={{
              position: "absolute",
              width: SPRITE,
              height: SPRITE,
              left: radius + radius * Math.cos(a) - SPRITE / 2,
              top: radius + radius * Math.sin(a) - SPRITE / 2,
              // Point each sprite at the medkit.
              transform: [{ rotate: `${(a * 180) / Math.PI + 90}deg` }],
            }}
          />
        );
      })}
    </Animated.View>
  );
});

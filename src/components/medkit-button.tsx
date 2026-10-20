import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Orbit } from "@/components/fx/orbit";
import { Sunburst } from "@/components/fx/sunburst";
import { BURST_MS, TapBurst } from "@/components/fx/tap-burst";
import { MEDKIT_SKINS, ROUND_SKINS } from "@/constants/gems";
import { MEDKIT_IMAGE, type ItemId } from "@/constants/items";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { usePalette } from "@/hooks/use-palette";
import { formatShort } from "@/lib/format";

const MAX_BURSTS = 10;
/** The orbit ring and sunburst extend past the medkit by these factors. */
export const ORBIT_SCALE = 1.32;
const SUNBURST_SCALE = 2.1;

type Burst = { id: number; x: number; y: number; label: string };

/** `skin` and `effect` are equipped Gem Shop items (null = the originals). */
type Props = { size: number; tapAmount: number; owned: Record<ItemId, number>; skin?: string | null; effect?: string | null };

/** The big round medkit with its heartbeat, sunburst and orbiting supplies. Memoized against the 10Hz tick. */
export const MedkitButton = memo(function MedkitButton({ size, tapAmount, owned, skin = null, effect = null }: Props) {
  const image = (skin && MEDKIT_SKINS[skin]) || MEDKIT_IMAGE;
  // Portrait skins fill more of the button than the medkit sprite does.
  const art = size * (skin && ROUND_SKINS.has(skin) ? 0.82 : 0.66);
  const { dispatch } = useGameActions();
  const { playSfx, unlock } = useAudio();
  const haptic = useHaptics();
  const palette = usePalette();
  const reduceMotion = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);
  const press = useSharedValue(1);
  const beat = useSharedValue(1);

  // Idle heartbeat: lub-dub, rest.
  useEffect(() => {
    if (reduceMotion) return;
    beat.set(
      withRepeat(
        withSequence(
          withTiming(1.045, { duration: 140 }),
          withTiming(1, { duration: 160 }),
          withTiming(1.03, { duration: 120 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      ),
    );
  }, [beat, reduceMotion]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() * beat.get() }] }));

  const onPress = useCallback(() => {
    unlock();
    dispatch({ type: "tap" });
    playSfx("medkit");
    haptic.tap();

    // Touch coordinates are relative to whichever child was hit (and differ on web),
    // so scatter the numbers over the top half of the medkit instead.
    const id = nextId.current++;
    const x = size * (0.3 + Math.random() * 0.4);
    const y = size * (0.2 + Math.random() * 0.25);
    setBursts((b) => [...b.slice(-(MAX_BURSTS - 1)), { id, x, y, label: `+${formatShort(tapAmount)}` }]);
    setTimeout(() => setBursts((b) => b.filter((p) => p.id !== id)), BURST_MS);
  }, [dispatch, playSfx, unlock, haptic, tapAmount, size]);

  const box = size * ORBIT_SCALE;
  const sun = size * SUNBURST_SCALE;
  const inset = (box - size) / 2;

  return (
    <View style={{ width: box, height: box }}>
      <View pointerEvents="none" style={{ position: "absolute", left: (box - sun) / 2, top: (box - sun) / 2 }}>
        <Sunburst size={sun} color={palette.glow} />
      </View>
      <Orbit size={box} owned={owned} />

      <View style={{ position: "absolute", left: inset, top: inset, width: size, height: size }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Medkit"
          accessibilityHint="Tap to heal patients"
          onPress={onPress}
          onPressIn={() => {
            press.set(withTiming(0.9, { duration: 50 }));
          }}
          onPressOut={() => {
            press.set(withSpring(1, { damping: 7, stiffness: 320 }));
          }}
          style={{ width: size, height: size }}
        >
          {/* Reanimated views don't take NativeWind classes on native, so style an inner View. */}
          <Animated.View style={[{ width: size, height: size }, scaleStyle]}>
            <View
              style={{ width: size, height: size }}
              className="items-center justify-center rounded-full border-[6px] border-b-[12px] border-outline border-b-shadow bg-surface"
            >
              <Image source={image} style={{ width: art, height: art }} contentFit="contain" />
            </View>
          </Animated.View>
        </Pressable>
        {bursts.map((b) => (
          <TapBurst key={b.id} size={size} x={b.x} y={b.y} label={b.label} seed={b.id} effect={effect} />
        ))}
      </View>
    </View>
  );
});

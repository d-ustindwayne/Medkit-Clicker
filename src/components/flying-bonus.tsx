import { useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { AppState, Pressable, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameStore } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { flyingReward } from "@/lib/game";
import { formatCount } from "@/lib/format";

/** The flying bonus: the winged heart (src/imgs/achievements/winged_heart.png). */
const HEART = require("@/imgs/achievements/winged_heart.png");
const SIZE = 56;
/** First one after 1.5-3 minutes of play, then every 3-7 minutes. */
const FIRST_MS = [90_000, 180_000] as const;
const EVERY_MS = [180_000, 420_000] as const;
/** How long it takes to cross the screen; miss it and it's gone. */
const FLIGHT_MS = 9_000;
/** The tap frenzy: this many medkit taps, a batch at a time. */
export const FRENZY_TAPS = 200;
const FRENZY_STEPS = 10;
const FRENZY_STEP_MS = 600;

const between = ([a, b]: readonly [number, number]) => a + Math.random() * (b - a);

/**
 * A winged heart that flutters across the medkit page now and then. Catch it for a big bonus: a
 * burst of medkits (90 seconds' worth, at least 300 taps), or a frenzy that taps the medkit 200 times
 * for you. `active`: the medkit page is the one showing (it waits otherwise).
 */
export function FlyingBonus({ width, height, active }: { width: number; height: number; active: boolean }) {
  const store = useGameStore();
  const { dispatch, pushToast } = useGameActions();
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [flight, setFlight] = useState<{ id: number; y: number; ltr: boolean } | null>(null);
  const x = useSharedValue(0);
  const bob = useSharedValue(0);
  /** When the next one may fly (0 until the first check sets it). */
  const nextAt = useRef(0);

  // Checked every few seconds rather than one long timer, so time in the background or on another
  // page doesn't count down (and it never appears off screen).
  useEffect(() => {
    const id = setInterval(() => {
      if (!nextAt.current) nextAt.current = Date.now() + between(FIRST_MS);
      if (!active || flight || AppState.currentState !== "active" || Date.now() < nextAt.current) return;
      setFlight({ id: Date.now(), y: 0.15 + Math.random() * 0.45, ltr: Math.random() < 0.5 });
    }, 3000);
    return () => clearInterval(id);
  }, [active, flight]);

  useEffect(() => {
    if (!flight) return;
    const from = flight.ltr ? -SIZE : width, to = flight.ltr ? width : -SIZE;
    x.set(from);
    x.set(withTiming(to, { duration: FLIGHT_MS, easing: Easing.linear }));
    bob.set(withRepeat(withSequence(withTiming(-14, { duration: 520, easing: Easing.inOut(Easing.sin) }), withTiming(14, { duration: 520, easing: Easing.inOut(Easing.sin) })), -1, true));
    const t = setTimeout(() => {
      nextAt.current = Date.now() + between(EVERY_MS);
      setFlight(null);
    }, FLIGHT_MS);
    return () => {
      clearTimeout(t);
      cancelAnimation(x);
      cancelAnimation(bob);
    };
  }, [flight, width, x, bob]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { translateY: bob.get() }] }));

  const catchIt = () => {
    if (!flight) return;
    nextAt.current = Date.now() + between(EVERY_MS);
    setFlight(null);
    haptic.buy();
    playSfx("buy");
    if (Math.random() < 0.5) {
      const amount = flyingReward(store.get());
      dispatch({ type: "earn", amount });
      pushToast({ kind: "info", title: "Lucky heart!", body: `+${formatCount(amount)} medkits`, image: HEART });
      return;
    }
    pushToast({ kind: "info", title: "Tap frenzy!", body: `The medkit taps itself ${FRENZY_TAPS} times.`, image: HEART });
    for (let k = 0; k < FRENZY_STEPS; k++) setTimeout(() => dispatch({ type: "tap", count: FRENZY_TAPS / FRENZY_STEPS }), k * FRENZY_STEP_MS);
  };

  if (!flight) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, width, height, zIndex: 20 }}>
      <Animated.View style={[{ position: "absolute", left: 0, top: flight.y * height, width: SIZE, height: SIZE }, style]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Catch the flying heart for a bonus" hitSlop={16} onPress={catchIt}>
          <Image source={HEART} style={{ width: SIZE, height: SIZE, transform: [{ scaleX: flight.ltr ? 1 : -1 }] }} contentFit="contain" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

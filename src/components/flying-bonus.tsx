import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { AppState, Pressable, Text, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";

import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameStore } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { usePalette } from "@/hooks/use-palette";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { autoTap } from "@/lib/auto-tap";
import { onDevSignal } from "@/lib/dev-signals";
import { flyingReward } from "@/lib/game";
import { formatCount, formatShort } from "@/lib/format";

/** The flying bonus: the winged heart (src/imgs/achievements/winged_heart.png). */
const HEART = require("@/imgs/achievements/winged_heart.png");
const SIZE = 56;
/** First one after 2-3.5 minutes of play, then every 4-8 minutes. */
const FIRST_MS = [120_000, 210_000] as const;
const EVERY_MS = [240_000, 480_000] as const;
/** How long it takes to cross the screen; miss it and it's gone. */
const FLIGHT_MS = 9_000;
/** The tap frenzy: the medkit taps itself this many times, one tap at a time like a fast finger. */
export const FRENZY_TAPS = 200;
const FRENZY_TAP_MS = 40;

const between = ([a, b]: readonly [number, number]) => a + Math.random() * (b - a);
const MINI_HEART = require("@/imgs/gems/p_heart.png");
const POP_MS = 900;
const MINI_HEARTS = 9;

/** One of the little hearts the caught heart bursts into: flies out, arcs down a little and fades. */
function MiniHeart({ t, i }: { t: SharedValue<number>; i: number }) {
  const angle = (i / MINI_HEARTS) * Math.PI * 2 + 0.35;
  const reach = 46 + (i % 3) * 14;
  const style = useAnimatedStyle(() => {
    const k = Math.max(0, (t.get() - 0.25) / 0.75);
    return {
      opacity: k > 0 ? 1 - k * k : 0,
      transform: [{ translateX: Math.cos(angle) * reach * k }, { translateY: Math.sin(angle) * reach * k + 30 * k * k }, { scale: 0.6 + 0.6 * Math.sin(Math.min(1, k * 2) * Math.PI) }, { rotate: `${(i % 2 ? 1 : -1) * 40 * k}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: SIZE / 2 - 9, top: SIZE / 2 - 9, width: 18, height: 18 }, style]}>
      <Image source={MINI_HEART} style={{ width: 18, height: 18 }} contentFit="contain" />
    </Animated.View>
  );
}

/**
 * The catch: the heart squashes like it was poked, springs up big with a happy wiggle, then bursts
 * into little hearts while the reward floats up.
 */
function HeartPop({ x, y, flip, label, onEnd }: { x: number; y: number; flip: boolean; label: string; onEnd: () => void }) {
  const palette = usePalette();
  const t = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const wiggle = useSharedValue(0);
  useEffect(() => {
    sx.set(withSequence(withTiming(1.45, { duration: 90 }), withSpring(1.25, { damping: 6, stiffness: 320 })));
    sy.set(withSequence(withTiming(0.6, { duration: 90 }), withSpring(1.35, { damping: 6, stiffness: 320 })));
    wiggle.set(withSequence(withTiming(0, { duration: 90 }), withTiming(-14, { duration: 70 }), withTiming(14, { duration: 90 }), withTiming(-8, { duration: 70 }), withTiming(0, { duration: 60 })));
    t.set(withTiming(1, { duration: POP_MS, easing: Easing.out(Easing.quad) }));
    const done = setTimeout(onEnd, POP_MS + 50);
    return () => clearTimeout(done);
  }, [t, sx, sy, wiggle, onEnd]);
  const heart = useAnimatedStyle(() => {
    // Bursts (shrinks away) in the last part.
    const gone = Math.max(0, (t.get() - 0.35) / 0.25);
    return { opacity: 1 - Math.min(1, gone), transform: [{ rotate: `${wiggle.get()}deg` }, { scaleX: sx.get() * (1 - Math.min(1, gone) * 0.6) * (flip ? -1 : 1) }, { scaleY: sy.get() * (1 - Math.min(1, gone) * 0.6) }] };
  });
  const text = useAnimatedStyle(() => ({ opacity: t.get() < 0.7 ? 1 : 1 - (t.get() - 0.7) / 0.3, transform: [{ translateY: -20 - 50 * t.get() }, { scale: 0.7 + 0.5 * Math.min(1, t.get() * 4) }] }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: SIZE, height: SIZE }}>
      {Array.from({ length: MINI_HEARTS }, (_, i) => (
        <MiniHeart key={i} t={t} i={i} />
      ))}
      <Animated.View style={heart}>
        <Image source={HEART} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: -70, width: SIZE + 140, alignItems: "center" }, text]}>
        <Text numberOfLines={1} className="font-display text-xl text-ink" style={{ textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0.1 }}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

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
  const still = useReduceMotion();
  const [flight, setFlight] = useState<{ id: number; y: number; ltr: boolean } | null>(null);
  const [pop, setPop] = useState<{ id: number; x: number; y: number; flip: boolean; label: string } | null>(null);
  const endPop = useCallback(() => setPop(null), []);
  const x = useSharedValue(0);
  const bob = useSharedValue(0);
  /** When the next one may fly (0 until the first check sets it). */
  const nextAt = useRef(0);

  // Dev tools: the next check sends one.
  useEffect(() => onDevSignal("heart", () => (nextAt.current = 1)), []);

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
    const at = { x: x.get(), y: flight.y * height + bob.get(), flip: !flight.ltr };
    setFlight(null);
    dispatch({ type: "heartCaught" });
    haptic.buy();
    playSfx("buy");
    if (Math.random() < 0.5) {
      const amount = flyingReward(store.get());
      dispatch({ type: "earn", amount });
      if (!still) setPop({ id: Date.now(), ...at, label: `+${formatShort(amount)}` });
      pushToast({ kind: "info", title: "Lucky heart!", body: `+${formatCount(amount)} medkits`, image: HEART });
      return;
    }
    if (!still) setPop({ id: Date.now(), ...at, label: "FRENZY!" });
    pushToast({ kind: "info", title: "Tap frenzy!", body: `The medkit taps itself ${FRENZY_TAPS} times.`, image: HEART });
    // Each tap goes through the medkit (press, number, sound); if it isn't on screen, it still counts.
    for (let k = 0; k < FRENZY_TAPS; k++) setTimeout(() => autoTap() || dispatch({ type: "tap", count: 1 }), k * FRENZY_TAP_MS);
  };

  if (!flight && !pop) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, width, height, zIndex: 20 }}>
      {pop && <HeartPop key={pop.id} x={pop.x} y={pop.y} flip={pop.flip} label={pop.label} onEnd={endPop} />}
      {flight && (
      <Animated.View style={[{ position: "absolute", left: 0, top: flight.y * height, width: SIZE, height: SIZE }, style]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Catch the flying heart for a bonus" hitSlop={16} onPress={catchIt}>
          <Image source={HEART} style={{ width: SIZE, height: SIZE, transform: [{ scaleX: flight.ltr ? 1 : -1 }] }} contentFit="contain" />
        </Pressable>
      </Animated.View>
      )}
    </View>
  );
}

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";

import { RebirthCard } from "@/components/hospital/rebirth-card";
import { ScenePage } from "@/components/scene-page";
import { AnimatedSprite } from "@/components/ui/animated-sprite";
import { PixelIcon } from "@/components/ui/pixel-icon";
import {
  AMBULANCE,
  AMBULANCE_GAP,
  AMBULANCE_WAIT,
  CARS,
  CAR_CROSS,
  CAR_GAP,
  CLOUDS,
  CLOUD_H,
  DOOR_X,
  LANES,
  MAX_VISITORS,
  VISITORS,
  VISITOR_FEET_Y,
  VISITOR_SPEED,
  SKIES,
  hospitalTier,
  type SkyBalloon,
  visitorGap,
  type DayPhase,
} from "@/constants/hospital";
import { SICK_PATIENTS } from "@/constants/patients";
import { healingRate } from "@/constants/rebirth";
import { HOSPITAL_SCENE } from "@/constants/scenes";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameSelector, useGameStore } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { useNow } from "@/hooks/use-now";
import { onDevSignal } from "@/lib/dev-signals";
import { formatCount } from "@/lib/format";
import { emergencyReward } from "@/lib/game";
import { sunPhase } from "@/lib/sun";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

const ART_W = 320;
const ART_H = 240;
const CAR_PX = 32;
/** The lowest row of the wheels in the 32px car art. */
const WHEEL_BOTTOM = 29;
const VISITOR_PX = 16;

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);

// ---------- clouds ----------

/** A cloud drifting left to right forever, starting part-way across. */
function Cloud({ cloud, width }: { cloud: (typeof CLOUDS)[number]; width: number }) {
  const px = width / ART_W;
  const w = cloud.w * px;
  const span = width + w;
  const x = useSharedValue(cloud.start * span - w);
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const full = cloud.seconds * 1000;
    x.set(
      withSequence(
        withTiming(width, { duration: (1 - cloud.start) * full, easing: Easing.linear }),
        withRepeat(withSequence(withTiming(-w, { duration: 0 }), withTiming(width, { duration: full, easing: Easing.linear })), -1, false),
      ),
    );
    return () => cancelAnimation(x);
  }, [x, width, w, cloud, reduceMotion]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: cloud.y * px, width: w, height: CLOUD_H * px }, move]}>
      <Image source={cloud.image} style={{ width: w, height: CLOUD_H * px }} contentFit="fill" />
    </Animated.View>
  );
}

// ---------- sky balloon ----------

/** A balloon floating over the hospital: drifts slowly side to side and bobs, with a flickering burner. */
function Balloon({ balloon, width }: { balloon: SkyBalloon; width: number }) {
  const px = width / ART_W;
  const sway = useSharedValue(0);
  const bob = useSharedValue(0);
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.sin);
    sway.set(withRepeat(withSequence(withTiming(1, { duration: 4500, easing: ease }), withTiming(-1, { duration: 9000, easing: ease }), withTiming(0, { duration: 4500, easing: ease })), -1, false));
    bob.set(withRepeat(withSequence(withTiming(1, { duration: 1600, easing: ease }), withTiming(0, { duration: 1600, easing: ease })), -1, false));
    return () => {
      cancelAnimation(sway);
      cancelAnimation(bob);
    };
  }, [sway, bob, reduceMotion]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: sway.get() * balloon.drift * px }, { translateY: -bob.get() * 2 * px }] }));
  return (
    <Animated.View pointerEvents="none" accessibilityLabel={balloon.name} style={[{ position: "absolute", left: balloon.x * px, top: balloon.y * px, width: balloon.w * px, height: balloon.h * px }, move]}>
      <AnimatedSprite frames={balloon.frames} size={balloon.w * px} height={balloon.h * px} frameMs={180} />
    </Animated.View>
  );
}

// ---------- traffic ----------

type Car = { id: number; image: ImageSourcePropType; lane: 0 | 1; seconds: number };

/** How dark people and cars are (0-1) and whether headlights are on, from the time of day. */
type Night = { dark: number; lights: boolean };
const NIGHT_COLOUR = "#0a1030";

/** The sprite again in the night colour on top: darkens only its own pixels, not the space around it. */
function Shade({ source, size, dark }: { source: ImageSourcePropType; size: number; dark: number }) {
  if (dark <= 0) return null;
  return <Image source={source} tintColor={NIGHT_COLOUR} style={{ position: "absolute", left: 0, top: 0, width: size, height: size, opacity: dark }} contentFit="contain" />;
}

/** Headlight row in the 32px car art, and how far the beam reaches along the road (art pixels). */
const HEADLIGHT_Y = 18;
const BEAM = 46;
/** A soft beam from the front of a car (drawn facing right) that spreads down onto the road ahead. */
function Headlights({ px, size }: { px: number; size: number }) {
  const len = BEAM * px;
  const y = HEADLIGHT_Y * px;
  const ground = (WHEEL_BOTTOM + 2) * px;
  return (
    <Svg pointerEvents="none" width={len} height={size + 2 * px} style={{ position: "absolute", left: size - px, top: 0 }}>
      <Defs>
        <LinearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#fff1b8" stopOpacity={0.7} />
          <Stop offset="1" stopColor="#fff1b8" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Polygon points={`0,${y - px} 0,${y + 2 * px} ${len},${ground} ${len},${y - 5 * px}`} fill="url(#beam)" />
    </Svg>
  );
}

/** One car driving across the road, then reporting back so it can be removed. */
const PassingCar = memo(function PassingCar({ car, width, onGone, night }: { car: Car; width: number; onGone: (id: number) => void; night: Night }) {
  const px = width / ART_W;
  const size = CAR_PX * px;
  const { y, dir } = LANES[car.lane];
  const x = useSharedValue(dir > 0 ? -size : width);
  useEffect(() => {
    x.set(withTiming(dir > 0 ? width : -size, { duration: car.seconds * 1000, easing: Easing.linear }));
    const timer = setTimeout(() => onGone(car.id), car.seconds * 1000 + 100);
    return () => clearTimeout(timer);
  }, [x, dir, width, size, car, onGone]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { scaleX: dir }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: (y - WHEEL_BOTTOM) * px, width: size, height: size, zIndex: 1 + car.lane }, move]}>
      <Image source={car.image} style={{ width: size, height: size }} contentFit="contain" />
      <Shade source={car.image} size={size} dark={night.dark} />
      {night.lights && <Headlights px={px} size={size} />}
    </Animated.View>
  );
});

type Call = { id: number; condition: string };

/**
 * The emergency: an ambulance drives in, parks at the entrance and waits with a call-out.
 * Tapping it admits the patient; otherwise it leaves after AMBULANCE_WAIT seconds.
 */
function Ambulance({ call, width, onAdmit, onGone, night }: { call: Call; width: number; onAdmit: () => void; onGone: () => void; night: Night }) {
  const px = width / ART_W;
  const size = CAR_PX * px;
  const parkX = (DOOR_X - CAR_PX / 2) * px;
  const [phase, setPhase] = useState<"arriving" | "parked" | "leaving">("arriving");
  const x = useSharedValue(-size);
  const flash = useSharedValue(1);
  const bob = useSharedValue(0);

  useEffect(() => {
    x.set(withTiming(parkX, { duration: 3000, easing: Easing.out(Easing.cubic) }));
    flash.set(withRepeat(withSequence(withTiming(0.2, { duration: 220 }), withTiming(1, { duration: 220 })), -1, false));
    bob.set(withRepeat(withSequence(withTiming(-3, { duration: 450 }), withTiming(0, { duration: 450 })), -1, false));
    const parked = setTimeout(() => setPhase("parked"), 3000);
    const timeout = setTimeout(() => setPhase((p) => (p === "parked" ? "leaving" : p)), 3000 + AMBULANCE_WAIT * 1000);
    return () => {
      clearTimeout(parked);
      clearTimeout(timeout);
    };
  }, [x, flash, bob, parkX]);

  useEffect(() => {
    if (phase !== "leaving") return;
    x.set(withTiming(width, { duration: 2500, easing: Easing.in(Easing.cubic) }));
    const timer = setTimeout(onGone, 2600);
    return () => clearTimeout(timer);
  }, [phase, x, width, onGone]);

  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const glow = useAnimatedStyle(() => ({ opacity: flash.get() }));
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));
  const top = (LANES[1].y - WHEEL_BOTTOM) * px;
  const labelPx = Math.min(22, Math.max(15, px * 7));

  const admit = () => {
    if (phase !== "parked") return;
    setPhase("leaving");
    onAdmit();
  };

  return (
    <>
      <Animated.View style={[{ position: "absolute", left: 0, top, width: size, height: size, zIndex: 3 }, move]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ambulance: ${call.condition}. Tap to admit the patient.`} hitSlop={14} onPress={admit}>
          <Image source={AMBULANCE} style={{ width: size, height: size }} contentFit="contain" />
          <Shade source={AMBULANCE} size={size} dark={night.dark} />
          {night.lights && <Headlights px={px} size={size} />}
          {/* Siren glow over the light bar (art pixels 10-13 on row 7). */}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 9 * px, top: 5.5 * px, width: 6 * px, height: 3 * px, borderRadius: 3 * px, backgroundColor: "rgba(255,90,90,0.75)" }, glow]} />
        </Pressable>
      </Animated.View>
      {phase === "parked" && (
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: top - labelPx * 2.6, alignItems: "center", zIndex: 4 }, float]}>
          <Pressable accessibilityRole="button" onPress={admit} className="items-center rounded-lg border-2 border-outline bg-surface px-3 py-1">
            {/* Grows with the scene, so it stays readable on a big screen. */}
            <Text className="font-display text-danger" style={{ fontSize: labelPx, lineHeight: labelPx * 1.3 }}>Patient: {call.condition}!</Text>
            <Text className="font-body text-ink" style={{ fontSize: labelPx * 0.8, lineHeight: labelPx * 1.05 }}>Tap to admit</Text>
          </Pressable>
        </Animated.View>
      )}
    </>
  );
}

// ---------- visitors ----------

type Visitor = { id: number; frames: [ImageSourcePropType, ImageSourcePropType]; from: number; to: number; seconds: number };

/** A visitor walking along the plaza, to the door (and fading in) or out of it. */
const Walker = memo(function Walker({ v, width, onGone, dark }: { v: Visitor; width: number; onGone: (id: number) => void; dark: number }) {
  const px = width / ART_W;
  const size = VISITOR_PX * px;
  const dir = v.to > v.from ? 1 : -1;
  const x = useSharedValue((v.from - VISITOR_PX / 2) * px);
  const step = useSharedValue(0);
  // Fade in when leaving the door, fade out when entering it.
  const enters = v.to === DOOR_X;
  const fade = useSharedValue(enters ? 1 : 0);
  useEffect(() => {
    const ms = v.seconds * 1000;
    x.set(withTiming((v.to - VISITOR_PX / 2) * px, { duration: ms, easing: Easing.linear }));
    step.set(withRepeat(withTiming(1, { duration: 500, easing: Easing.linear }), -1, false));
    fade.set(enters ? withSequence(withTiming(1, { duration: ms - 300 }), withTiming(0, { duration: 300 })) : withTiming(1, { duration: 300 }));
    const timer = setTimeout(() => onGone(v.id), ms + 100);
    return () => clearTimeout(timer);
  }, [x, step, fade, v, px, enters, onGone]);
  const move = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateX: x.get() }, { scaleX: dir }] }));
  const frameA = useAnimatedStyle(() => ({ opacity: step.get() < 0.5 ? 1 : 0 }));
  const frameB = useAnimatedStyle(() => ({ opacity: step.get() < 0.5 ? 0 : 1 }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: (VISITOR_FEET_Y - VISITOR_PX) * px, width: size, height: size }, move]}>
      <Animated.View style={[{ position: "absolute" }, frameA]}>
        <Image source={v.frames[0]} style={{ width: size, height: size }} contentFit="contain" />
        <Shade source={v.frames[0]} size={size} dark={dark} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute" }, frameB]}>
        <Image source={v.frames[1]} style={{ width: size, height: size }} contentFit="contain" />
        <Shade source={v.frames[1]} size={size} dark={dark} />
      </Animated.View>
    </Animated.View>
  );
});

// ---------- the page ----------

/** Cars, visitors and emergencies. Only spawns while the page is on screen. */
function Street({ width, active, night }: { width: number; active: boolean; night: Night }) {
  const store = useGameStore();
  const { dispatch, pushToast } = useGameActions();
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [cars, setCars] = useState<Car[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [call, setCall] = useState<Call | null>(null);
  const nextId = useRef(0);
  // Read by the timers, so a busy hospital gets more visitors without restarting them.
  const gap = useRef(9);
  const emergency = useRef(false);
  // Rounded so the street doesn't re-render on every tick.
  const visitorEvery = useGameSelector((s) => Math.round(visitorGap(healingRate(s)) * 10) / 10);
  useEffect(() => {
    gap.current = visitorEvery;
  }, [visitorEvery]);
  useEffect(() => {
    emergency.current = call !== null;
  }, [call]);

  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const car = () => {
      // The near lane stays clear while the ambulance is at the door.
      const lane = emergency.current || Math.random() < 0.5 ? 0 : 1;
      setCars((list) => [...list, { id: nextId.current++, image: CARS[Math.floor(Math.random() * CARS.length)], lane, seconds: between(CAR_CROSS) }]);
      timers[0] = setTimeout(car, between(CAR_GAP) * 1000);
    };
    const visitor = () => {
      setVisitors((list) => {
        if (list.length >= MAX_VISITORS) return list;
        const side = Math.random() < 0.5 ? -8 : ART_W + 8;
        const out = Math.random() < 0.3; // some leave the hospital instead
        const from = out ? DOOR_X : side, to = out ? side : DOOR_X;
        const frames = VISITORS[Math.floor(Math.random() * VISITORS.length)];
        return [...list, { id: nextId.current++, frames, from, to, seconds: Math.abs(to - from) / VISITOR_SPEED }];
      });
      timers[1] = setTimeout(visitor, gap.current * 1000 * between([0.7, 1.3]));
    };
    const ambulance = () => {
      if (!emergency.current) setCall({ id: nextId.current++, condition: SICK_PATIENTS[Math.floor(Math.random() * SICK_PATIENTS.length)].condition });
      timers[2] = setTimeout(ambulance, between(AMBULANCE_GAP) * 1000);
    };
    timers[0] = setTimeout(car, 600);
    timers[1] = setTimeout(visitor, 1200);
    timers[2] = setTimeout(ambulance, between([8, 20]) * 1000);
    // Dev tools: an ambulance right now (if none is at the door).
    const off = onDevSignal("ambulance", () => {
      clearTimeout(timers[2]);
      ambulance();
    });
    return () => {
      timers.forEach(clearTimeout);
      off();
    };
  }, [active]);

  const [carGone] = useState(() => (id: number) => setCars((list) => list.filter((c) => c.id !== id)));
  const [visitorGone] = useState(() => (id: number) => setVisitors((list) => list.filter((v) => v.id !== id)));
  const [ambulanceGone] = useState(() => () => setCall(null));
  const admit = () => {
    const amount = emergencyReward(store.get());
    dispatch({ type: "earn", amount });
    haptic.success();
    playSfx("buy");
    pushToast({ kind: "info", title: "Patient admitted", body: `Emergency handled: +${formatCount(amount)} medkits`, image: AMBULANCE });
  };

  return (
    <>
      {visitors.map((v) => (
        <Walker key={v.id} v={v} width={width} onGone={visitorGone} dark={night.dark} />
      ))}
      {cars.map((c) => (
        <PassingCar key={c.id} car={c} width={width} onGone={carGone} night={night} />
      ))}
      {call && <Ambulance key={call.id} call={call} width={width} onAdmit={admit} onGone={ambulanceGone} night={night} />}
    </>
  );
}

/** Deterministic 0-1 noise, so the sky above keeps its layout between renders. */
const noise = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * The sky above the art when the page is taller than it (the shop pulled up): stars at night,
 * scattered clouds otherwise, laid out from the art's top edge upwards.
 */
const SkyAbove = memo(function SkyAbove({ phase, width }: { phase: DayPhase; width: number }) {
  const px = width / ART_W;
  if (phase === "night") {
    return Array.from({ length: 40 }, (_, i) => {
      const s = (noise(i, 3) > 0.85 ? 2 : 1) * px;
      return <View key={i} pointerEvents="none" style={{ position: "absolute", left: noise(i, 1) * width, bottom: noise(i, 2) * 140 * px, width: s, height: s, backgroundColor: noise(i, 4) > 0.7 ? "#fff3b8" : "#ffffff", opacity: 0.5 + noise(i, 5) * 0.5 }} />;
    });
  }
  return Array.from({ length: 6 }, (_, i) => {
    const c = CLOUDS[i % CLOUDS.length];
    return (
      <Image
        key={i}
        source={c.image}
        style={{ position: "absolute", left: noise(i, 6) * width - c.w * px * 0.3, bottom: (10 + i * 22 + noise(i, 7) * 10) * px, width: c.w * px, height: CLOUD_H * px, opacity: phase === "day" ? 0.9 : 0.6 }}
        contentFit="fill"
      />
    );
  });
});

/** The rebirth card's distance from the top of the page. */
const CARD_TOP = 28;
/** The card folds away when less than this share of the art would show below it. */
const FOLD_BELOW = 0.5;
const FOLD_MS = 220;
/** The card's hard shadow offset. */
const SHADOW = 4;

/**
 * The rebirth card over the hospital. On short screens it would hide the whole scene, so there it
 * folds up into a tab at the top that slides it down (and back up) when tapped.
 */
function FoldingRebirthCard({ artH }: { artH: number }) {
  // Rounded: the page's height changes on every frame while the shop is dragged.
  const [pageH, setPageH] = useState(0);
  const [cardH, setCardH] = useState(0);
  const [tabH, setTabH] = useState(0);
  const [open, setOpen] = useState(false);
  const fold = cardH > 0 && pageH - CARD_TOP - cardH < artH * FOLD_BELOW;
  const folded = fold && !open;
  // Opened on a short page, the card gets the room under the tab and scrolls inside it, so its
  // bottom (and the Rebirth button) is never cut off.
  const room = fold && pageH > 0 && tabH > 0 ? pageH - 8 - tabH - SHADOW : undefined;
  const shown = Math.min(cardH + SHADOW, room ?? Infinity);
  const slide = useSharedValue(0);
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    slide.set(withTiming(folded ? 1 : 0, { duration: reduceMotion ? 0 : FOLD_MS, easing: Easing.out(Easing.cubic) }));
  }, [slide, folded, reduceMotion]);
  // Folded, the card hides under the tab (it's clipped at the tab's bottom edge) and slides down from it.
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: -slide.get() * shown }] }));
  return (
    <>
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setPageH(Math.round(e.nativeEvent.layout.height / 8) * 8)} />
    {/* Above the scene: its art is raised (zIndex 1, for My Room), and on Android that would cover the card. */}
    <View pointerEvents="box-none" style={{ position: "absolute", left: 12, right: 12, top: 0, paddingTop: fold ? 8 : CARD_TOP, zIndex: 10 }}>
      {fold && (
        <View className="items-center pb-1.5" onLayout={(e) => setTabH(Math.round(e.nativeEvent.layout.height))}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? "Hide the rebirth card" : "Show the rebirth card"}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
            hitSlop={8}
            className="flex-row items-center gap-1.5 border-2 border-outline bg-surface px-3 py-1 active:translate-y-0.5"
          >
            <Text className="font-pixel text-xs tracking-[2px] text-ink">REBIRTH</Text>
            <PixelIcon name={open ? "up" : "down"} size={10} />
          </Pressable>
        </View>
      )}
      {/* The scroll area leaves room on the right and below for the card's hard shadow. */}
      <View pointerEvents="box-none" style={{ overflow: "hidden", marginRight: -SHADOW }}>
        <Animated.View pointerEvents="box-none" style={move}>
          <ScrollView style={{ maxHeight: room }} contentContainerStyle={{ paddingRight: SHADOW, paddingBottom: SHADOW }} scrollEnabled={room !== undefined && cardH + SHADOW > room} showsVerticalScrollIndicator={false}>
            <View onLayout={(e) => setCardH(Math.round(e.nativeEvent.layout.height))}>
              <RebirthCard />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
    </>
  );
}

/** Second page of the shop area: the hospital from outside. It grows with rebirths. */
export function HospitalPage({ width, active }: { width: number; active: boolean }) {
  const rebirths = useGameSelector((s) => s.rebirths);
  const { tier } = hospitalTier(rebirths);
  // Re-checked every minute, so the sky turns with the clock while the page is open.
  const now = useNow(60_000);
  const phase = sunPhase(new Date(now));
  const sky = SKIES[phase];
  const { dark, lights } = sky;
  // One object per change of time of day, so the memoized cars and visitors don't redraw needlessly.
  const night = useMemo(() => ({ dark, lights }), [dark, lights]);
  const height = width * (ART_H / ART_W);
  return (
    // Clip: clouds and cars start off the page's edges and would otherwise show over the next page.
    <View className="flex-1 overflow-hidden">
      <ScenePage scene={{ ...HOSPITAL_SCENE, image: sky.image, fillTop: sky.fill, anchor: 1 }} width={width} above={<SkyAbove phase={phase} width={width} />}>
        <View pointerEvents="none" style={{ position: "absolute", width, height, opacity: sky.clouds }}>
          {CLOUDS.map((c) => (
            <Cloud key={c.y} cloud={c} width={width} />
          ))}
        </View>
        <Image source={tier.image} style={{ position: "absolute", width, height }} contentFit="cover" accessibilityLabel={tier.name} />
        {tier.balloon && <Balloon balloon={tier.balloon} width={width} />}
        {/* Evening and night light over the buildings; the sky image itself stays bright and starry. */}
        {sky.tint && <View pointerEvents="none" style={{ position: "absolute", width, height, top: 0, backgroundColor: sky.tint }} />}
        <Street width={width} active={active} night={night} />
      </ScenePage>
      <FoldingRebirthCard artH={height} />
    </View>
  );
}

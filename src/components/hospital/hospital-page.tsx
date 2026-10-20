import { memo, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { RebirthCard } from "@/components/hospital/rebirth-card";
import { ScenePage } from "@/components/scene-page";
import { AMBULANCE, AMBULANCE_CROSS, AMBULANCE_GAP, CARS, CAR_CROSS, CAR_GAP, LANES } from "@/constants/hospital";
import { HOSPITAL_SCENE } from "@/constants/scenes";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { formatCount } from "@/lib/format";
import { emergencyReward } from "@/lib/game";

const ART_W = 320;
const CAR_PX = 32;
/** The lowest row of the wheels in the 32px car art. */
const WHEEL_BOTTOM = 29;

type Vehicle = { id: number; image: ImageSourcePropType; lane: 0 | 1; seconds: number; ambulance: boolean };
const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);

/** One vehicle driving across the road, then reporting back so it can be removed. */
const Car = memo(function Car({ v, width, onGone, onTap }: { v: Vehicle; width: number; onGone: (id: number) => void; onTap?: (id: number) => void }) {
  const px = width / ART_W;
  const size = CAR_PX * px;
  const { y, dir } = LANES[v.lane];
  const x = useSharedValue(dir > 0 ? -size : width);
  const flash = useSharedValue(1);
  useEffect(() => {
    x.set(withTiming(dir > 0 ? width : -size, { duration: v.seconds * 1000, easing: Easing.linear }));
    if (v.ambulance) flash.set(withRepeat(withSequence(withTiming(0.2, { duration: 220 }), withTiming(1, { duration: 220 })), -1, false));
    const timer = setTimeout(() => onGone(v.id), v.seconds * 1000 + 100);
    return () => clearTimeout(timer);
  }, [x, flash, dir, width, size, v, onGone]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { scaleX: dir }] }));
  const glow = useAnimatedStyle(() => ({ opacity: flash.get() }));

  const body = (
    <>
      <Image source={v.image} style={{ width: size, height: size }} contentFit="contain" />
      {v.ambulance && (
        // Siren glow over the light bar (art pixels 10-13 on row 7).
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 9 * px, top: 5.5 * px, width: 6 * px, height: 3 * px, borderRadius: 3 * px, backgroundColor: "rgba(255,90,90,0.75)" }, glow]} />
      )}
    </>
  );
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: (y - WHEEL_BOTTOM) * px, width: size, height: size, zIndex: v.ambulance ? 3 : 1 + v.lane }, move]}>
      {onTap ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Emergency ambulance. Tap to admit the patient." hitSlop={12} onPress={() => onTap(v.id)}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </Animated.View>
  );
});

/** Cars passing the hospital, and now and then an ambulance to tap for an emergency admission. */
function Traffic({ width, active }: { width: number; active: boolean }) {
  const state = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const nextId = useRef(0);

  // Ordinary traffic and ambulances only spawn while the page is on screen.
  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const add = (v: Omit<Vehicle, "id">) => setVehicles((list) => [...list, { ...v, id: nextId.current++ }]);
    const car = () => {
      add({ image: CARS[Math.floor(Math.random() * CARS.length)], lane: Math.random() < 0.5 ? 0 : 1, seconds: between(CAR_CROSS), ambulance: false });
      timers[0] = setTimeout(car, between(CAR_GAP) * 1000);
    };
    const ambulance = () => {
      add({ image: AMBULANCE, lane: 1, seconds: AMBULANCE_CROSS, ambulance: true });
      timers[1] = setTimeout(ambulance, between(AMBULANCE_GAP) * 1000);
    };
    timers[0] = setTimeout(car, 600);
    timers[1] = setTimeout(ambulance, between([8, 20]) * 1000);
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const [onGone] = useState(() => (id: number) => setVehicles((list) => list.filter((v) => v.id !== id)));
  const admit = (id: number) => {
    const amount = emergencyReward(state);
    setVehicles((list) => list.filter((v) => v.id !== id));
    dispatch({ type: "earn", amount });
    haptic.success();
    playSfx("buy");
    pushToast({ kind: "info", title: "Emergency admitted", body: `+${formatCount(amount)} patients healed`, image: AMBULANCE });
  };

  const siren = vehicles.some((v) => v.ambulance);
  return (
    <>
      {vehicles.map((v) => (
        <Car key={v.id} v={v} width={width} onGone={onGone} onTap={v.ambulance ? admit : undefined} />
      ))}
      {siren && (
        <View pointerEvents="none" className="absolute bottom-1 left-0 right-0 items-center">
          <View className="rounded-full border-[1.5px] border-outline bg-danger px-3 py-0.5">
            <Text className="font-body text-xs text-surface">Emergency! Tap the ambulance</Text>
          </View>
        </View>
      )}
    </>
  );
}

/** Second page of the shop area: the hospital from outside, with traffic and rebirth. */
export function HospitalPage({ width, active }: { width: number; active: boolean }) {
  return (
    <View className="flex-1">
      <ScenePage scene={{ ...HOSPITAL_SCENE, anchor: 1 }} width={width}>
        <Traffic width={width} active={active} />
      </ScenePage>
      <View className="absolute left-3 right-3 top-7">
        <RebirthCard />
      </View>
    </View>
  );
}

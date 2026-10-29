import { useEffect, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, Text, View } from "react-native";
import { depth } from "@/constants/room";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { TreatModal } from "@/components/ward/treat-modal";
import { SICK_PATIENTS, patientLook, type SickPatient } from "@/constants/patients";
import { useAudio } from "@/hooks/use-audio";
import { useGameSelector } from "@/hooks/use-game";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

/** Where waiting patients stand (fractions of the room art), first to arrive on the right. */
const SPOTS = [
  { x: 0.66, y: 0.76 },
  { x: 0.46, y: 0.79 },
  { x: 0.84, y: 0.73 },
];

/** Sick patients waiting in My Room (up to three), drawn over the room. Tap one to treat them. */
export function WardPatient({ width, height }: { width: number; height: number }) {
  const patients = useGameSelector((s) => s.patients);
  const { playSfx, unlock } = useAudio();
  // Kept separately so the result screen stays up after the patient is treated and leaves.
  const [treating, setTreating] = useState<{ patient: SickPatient; arrivedAt: number } | null>(null);
  const reduceMotion = useReduceMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    bob.set(0);
    bob.set(withRepeat(withSequence(withTiming(-4, { duration: 450 }), withTiming(0, { duration: 450 })), -1, false));
    return () => {
      cancelAnimation(bob);
      bob.set(0);
    };
  }, [bob, reduceMotion]);
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));

  const modal = treating && <TreatModal patient={treating.patient} arrivedAt={treating.arrivedAt} onClose={() => setTreating(null)} />;
  const waiting = patients
    .map((p) => ({ ...p, info: SICK_PATIENTS.find((x) => x.id === p.id) }))
    .filter((p): p is typeof p & { info: SickPatient } => !!p.info);
  if (waiting.length === 0) {
    return (
      <>
        <View className="absolute left-0 right-0 top-2 items-center" pointerEvents="none">
          <View className="rounded-full border-[1.5px] border-outline bg-surface/85 px-3 py-0.5">
            <Text className="font-body text-xs text-ink">No patients waiting</Text>
          </View>
        </View>
        {modal}
      </>
    );
  }
  // The scene is 320x180 and characters are drawn at 64px in the same pixel scale.
  const size = width * (64 / 320);
  return (
    <>
      {waiting.map((p, i) => {
        const spot = SPOTS[i % SPOTS.length];
        return (
          <Pressable
            key={p.arrivedAt}
            accessibilityRole="button"
            accessibilityLabel={`Treat patient: ${p.info.condition}`}
            onPress={() => {
              unlock();
              playSfx("click");
              setTreating({ patient: p.info, arrivedAt: p.arrivedAt });
            }}
            // People lower on screen stand in front (and in front of the furniture).
            style={{ position: "absolute", left: width * spot.x - size / 2, top: height * spot.y - size, width: size, height: size, zIndex: depth(spot.y) }}
          >
            <Image source={patientLook(p.info, p.arrivedAt)} style={{ width: size, height: size }} contentFit="contain" />
            <Animated.View style={[{ position: "absolute", top: -size * 0.12, alignSelf: "center" }, bubble]}>
              <View className="items-center justify-center rounded-full border-2 border-outline bg-primary px-2">
                <Text className="font-pixel text-base text-ink">!</Text>
              </View>
            </Animated.View>
          </Pressable>
        );
      })}
      {modal}
    </>
  );
}

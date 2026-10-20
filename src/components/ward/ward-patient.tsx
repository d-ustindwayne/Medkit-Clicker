import { useEffect, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { TreatModal } from "@/components/ward/treat-modal";
import { SICK_PATIENTS, type SickPatient } from "@/constants/patients";
import { useAudio } from "@/hooks/use-audio";
import { useGameSelector } from "@/hooks/use-game";

/** The sick patient waiting by the ward bed, drawn over the ward scene. Tap to treat. */
export function WardPatient({ width, height }: { width: number; height: number }) {
  const patient = useGameSelector((s) => s.patient);
  const { playSfx, unlock } = useAudio();
  // Kept separately so the result screen stays up after the patient is treated and leaves.
  const [treating, setTreating] = useState<SickPatient | null>(null);
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    bob.set(withRepeat(withSequence(withTiming(-4, { duration: 450 }), withTiming(0, { duration: 450 })), -1, false));
  }, [bob, reduceMotion]);
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));

  const info = patient ? SICK_PATIENTS.find((p) => p.id === patient.id) : undefined;
  const modal = treating && <TreatModal patient={treating} onClose={() => setTreating(null)} />;
  if (!info) {
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Treat patient: ${info.condition}`}
        onPress={() => {
          unlock();
          playSfx("click");
          setTreating(info);
        }}
        style={{ position: "absolute", left: width * 0.66, top: height * 0.79 - size, width: size, height: size }}
      >
        <Image source={info.image} style={{ width: size, height: size }} contentFit="contain" />
        <Animated.View style={[{ position: "absolute", top: -size * 0.12, alignSelf: "center" }, bubble]}>
          <View className="items-center justify-center rounded-full border-2 border-outline bg-primary px-2">
            <Text className="font-pixel text-base text-ink">!</Text>
          </View>
        </Animated.View>
      </Pressable>
      {modal}
    </>
  );
}

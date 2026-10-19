import { useEffect } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Confetti } from "@/components/fx/confetti";
import { HardShadow } from "@/components/ui/hard-shadow";
import { MEDKIT_IMAGE } from "@/constants/items";
import { useGameActions, useToasts, type Toast } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";

const TOAST_MS = 3500;

function ToastCard({ toast }: { toast: Toast }) {
  const { dismissToast } = useGameActions();
  const haptic = useHaptics();
  useEffect(() => {
    const id = setTimeout(() => dismissToast(toast.id), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast.id, dismissToast]);
  // Buzz once when an achievement toast appears.
  const { success } = haptic;
  useEffect(() => {
    if (toast.kind === "achievement") success();
  }, [toast.id, toast.kind, success]);

  return (
    <Animated.View entering={FadeInUp.duration(280).easing(Easing.out(Easing.cubic))} exiting={FadeOutDown.duration(220)}>
      <HardShadow>
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={`${toast.kind === "achievement" ? "Achievement unlocked: " : ""}${toast.title}. ${toast.body}`}
        onPress={() => dismissToast(toast.id)}
        className="w-80 max-w-full flex-row items-center gap-3 border-2 border-outline bg-surface p-3"
      >
        {toast.kind === "achievement" && <Image source={toast.image ?? MEDKIT_IMAGE} style={{ width: 32, height: 32 }} contentFit="contain" />}
        <View className="flex-1">
          {toast.kind === "achievement" && <Text className="font-pixel text-xs tracking-[2px] text-primary">ACHIEVEMENT</Text>}
          <Text className="font-display text-base text-ink">{toast.title}</Text>
          <Text className="font-body text-sm leading-5 text-ink">{toast.body}</Text>
        </View>
      </Pressable>
      </HardShadow>
    </Animated.View>
  );
}

export function ToastStack() {
  const toasts = useToasts();
  const insets = useSafeAreaInsets();
  // Celebrate the newest achievement; keyed so each unlock fires a fresh shower.
  const latestAchievement = toasts.findLast((t) => t.kind === "achievement");
  return (
    <>
      {latestAchievement && <Confetti key={latestAchievement.id} seed={latestAchievement.id} />}
      <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0 items-center gap-2 px-4" style={{ paddingBottom: insets.bottom + 12 }}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </View>
    </>
  );
}

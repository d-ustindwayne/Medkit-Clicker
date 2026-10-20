import { useEffect } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeOutLeft, SlideInLeft } from "react-native-reanimated";
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
    <Animated.View entering={SlideInLeft.duration(300).easing(Easing.out(Easing.cubic))} exiting={FadeOutLeft.duration(220)}>
      <HardShadow>
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={`${toast.kind === "achievement" ? "Achievement unlocked: " : ""}${toast.title}. ${toast.body}`}
        onPress={() => dismissToast(toast.id)}
        className="w-64 flex-row items-center gap-2 border-2 border-outline bg-surface p-2"
      >
        {(toast.kind === "achievement" || toast.image) && <Image source={toast.image ?? MEDKIT_IMAGE} style={{ width: 28, height: 28 }} contentFit="contain" />}
        <View className="flex-1">
          {toast.kind === "achievement" && <Text className="font-pixel text-xs tracking-[2px] text-primary">ACHIEVEMENT</Text>}
          <Text className="font-display text-sm text-ink" numberOfLines={1}>{toast.title}</Text>
          <Text className="font-body text-xs leading-4 text-ink" numberOfLines={3}>{toast.body}</Text>
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
      {/* Top-left, under the menu button: clear of the counter's centre and the shop. */}
      <View pointerEvents="box-none" className="absolute left-0 top-0 max-w-[80%] items-start gap-2 pl-3" style={{ paddingTop: insets.top + 72 }}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </View>
    </>
  );
}

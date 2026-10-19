import { useMemo } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { useSettings } from "@/hooks/use-game";

const supported = Platform.OS !== "web";

/** Vibration feedback for game events, silenced by the Vibration setting. */
export function useHaptics() {
  const { haptics } = useSettings();
  return useMemo(() => {
    const run = (feedback: () => Promise<void>) => {
      if (supported && haptics) feedback().catch(() => {});
    };
    return {
      tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      buy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
      denied: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
      success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    };
  }, [haptics]);
}

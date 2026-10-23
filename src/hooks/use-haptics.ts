import { useMemo } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { useSettings } from "@/hooks/use-game";

const supported = Platform.OS !== "web";
/** Tap buzzes closer together than this are skipped: a phone can't play them that fast anyway. */
const TAP_GAP_MS = 60;
let lastTap = 0;

/** Vibration feedback for game events, silenced by the Vibration setting. */
export function useHaptics() {
  const { haptics } = useSettings();
  return useMemo(() => {
    const run = (feedback: () => Promise<void>) => {
      if (supported && haptics) feedback().catch(() => {});
    };
    return {
      tap: () => {
        const now = Date.now();
        if (now - lastTap < TAP_GAP_MS) return;
        lastTap = now;
        run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      },
      buy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
      denied: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
      success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    };
  }, [haptics]);
}

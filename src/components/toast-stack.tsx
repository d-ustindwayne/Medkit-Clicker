import { useEffect, useRef } from "react";
import { Image } from "@/components/ui/image";
import { Platform, Text, View, type GestureResponderEvent, type PointerEvent, type ViewStyle } from "react-native";
import Animated, { Easing, FadeOutLeft, SlideInLeft, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Confetti } from "@/components/fx/confetti";
import { HardShadow } from "@/components/ui/hard-shadow";
import { MarqueeText } from "@/components/ui/marquee-text";
import { MEDKIT_IMAGE } from "@/constants/items";
import { useGameActions, useToasts, type Toast } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";

const TOAST_MS = 3500;
/** How far a toast must be swiped (either way) to dismiss it; a shorter drag springs back. */
const SWIPE_PX = 60;
/**
 * Web: the browser mustn't claim a drag on a toast as its own gesture: a touch would turn into a
 * cancelled scroll, and a mouse drag into a text selection (Firefox then never reports the release).
 */
const WEB_DRAG = (Platform.OS === "web" ? { touchAction: "none", userSelect: "none", cursor: "grab" } : {}) as ViewStyle;

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

  // Tap to dismiss, or swipe it away with a finger or the mouse.
  const dx = useSharedValue(0);
  const startX = useRef<number | null>(null);
  const swipeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.get() }], opacity: 1 - Math.min(0.6, Math.abs(dx.get()) / 300) }));
  const springBack = () => {
    startX.current = null;
    dx.set(withTiming(0, { duration: 160 }));
  };
  const release = (x: number) => {
    if (startX.current === null) return;
    const moved = x - startX.current;
    startX.current = null;
    if (Math.abs(moved) < 8) return dismissToast(toast.id);
    if (Math.abs(moved) < SWIPE_PX) return springBack();
    dx.set(withTiming(Math.sign(moved) * 320, { duration: 160 }));
    setTimeout(() => dismissToast(toast.id), 160);
  };
  const swipe =
    Platform.OS === "web"
      ? {
          // Pointer events with capture on the web: the touch responder there follows mouse events,
          // and Firefox drops the release at the end of a mouse drag.
          onPointerDown: (e: PointerEvent) => {
            if (e.nativeEvent.button > 0) return;
            (e.currentTarget as unknown as Element).setPointerCapture?.(e.nativeEvent.pointerId);
            startX.current = e.nativeEvent.clientX;
          },
          onPointerMove: (e: PointerEvent) => {
            if (startX.current === null) return;
            // The button came up without a pointerup (Firefox at the end of a drag, or let go outside the window).
            if (e.nativeEvent.pointerType === "mouse" && e.nativeEvent.buttons === 0) return release(e.nativeEvent.clientX);
            dx.set(e.nativeEvent.clientX - startX.current);
          },
          onPointerUp: (e: PointerEvent) => release(e.nativeEvent.clientX),
          onPointerCancel: springBack,
        }
      : {
          onStartShouldSetResponder: () => true,
          onMoveShouldSetResponder: () => true,
          onResponderTerminationRequest: () => false,
          onResponderGrant: (e: GestureResponderEvent) => {
            startX.current = e.nativeEvent.pageX;
          },
          onResponderMove: (e: GestureResponderEvent) => dx.set(e.nativeEvent.pageX - (startX.current ?? e.nativeEvent.pageX)),
          onResponderRelease: (e: GestureResponderEvent) => release(e.nativeEvent.pageX),
          onResponderTerminate: springBack,
        };

  return (
    <Animated.View entering={SlideInLeft.duration(300).easing(Easing.out(Easing.cubic))} exiting={FadeOutLeft.duration(220)}>
      <Animated.View style={swipeStyle}>
      <HardShadow>
      <View
        {...swipe}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${toast.kind === "achievement" ? "Achievement unlocked: " : ""}${toast.title}. ${toast.body}`}
        accessibilityHint="Tap or swipe to dismiss"
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => dismissToast(toast.id)}
        className="w-64 flex-row items-center gap-2 border-2 border-outline bg-surface p-2"
        style={WEB_DRAG}
      >
        {(toast.kind === "achievement" || toast.image) && <Image source={toast.image ?? MEDKIT_IMAGE} style={{ width: 28, height: 28 }} contentFit="contain" />}
        <View className="flex-1">
          {toast.kind === "achievement" && <Text className="font-pixel text-xs tracking-[2px] text-primary">ACHIEVEMENT</Text>}
          <MarqueeText className="font-display text-sm text-ink">{toast.title}</MarqueeText>
          <Text className="font-body text-xs leading-4 text-ink" numberOfLines={3}>{toast.body}</Text>
        </View>
      </View>
      </HardShadow>
      </Animated.View>
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

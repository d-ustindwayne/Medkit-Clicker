import { Platform, Pressable, type GestureResponderEvent, type PointerEvent, type PressableProps } from "react-native";

const fromKeyboard = (e: GestureResponderEvent) => (e.nativeEvent as unknown as { type?: string } | undefined)?.type?.startsWith("key") ?? false;

/**
 * Pressable props that act the moment a finger lands (and, for hold controls, when it lifts).
 * Native: onPressIn/onPressOut. Web: raw pointer events, like the medkit, because RN-web's Pressable
 * reports a press only once it holds the touch responder, and drops a tap that lands while the last
 * one is still held, so fast tapping lost taps. Keyboard presses still go through onPressIn.
 */
export function pressDown(onDown: () => void, onUp?: () => void) {
  if (Platform.OS !== "web") return { onPressIn: onDown, onPressOut: onUp };
  return {
    onPressIn: (e: GestureResponderEvent) => {
      if (fromKeyboard(e)) onDown();
    },
    onPressOut: (e: GestureResponderEvent) => {
      if (fromKeyboard(e)) onUp?.();
    },
    onPointerDown: (e: PointerEvent) => {
      if (e.nativeEvent.button > 0) return;
      // Keep the lift on this control even if the finger or mouse slides off it.
      if (onUp) (e.currentTarget as unknown as Element).setPointerCapture?.(e.nativeEvent.pointerId);
      onDown();
    },
    onPointerUp: onUp,
    onPointerCancel: onUp,
  };
}

/** A Pressable for timing games: `onDown` fires on touch-down (see pressDown), `onUp` on release. */
export function TapPressable({ onDown, onUp, ...props }: Omit<PressableProps, "onPress" | "onPressIn" | "onPressOut"> & { onDown: () => void; onUp?: () => void }) {
  return <Pressable {...props} {...pressDown(onDown, onUp)} />;
}

import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/** A key's action: a function for a press, or `down`/`up` for holding it (like Deep Breaths). */
type KeyAction = (() => void) | { down?: () => void; up?: () => void };

/** Whether this build has keyboard controls for the minigames (the web version). */
export const HAS_KEYS = Platform.OS === "web";

/**
 * Whether to show the minigames' key guides: the web version on a computer, not in a phone's or
 * tablet's browser (a touch screen with no mouse). The keys themselves still work there, for a
 * tablet with a keyboard.
 */
export const SHOW_KEY_HINTS = HAS_KEYS && typeof matchMedia === "function" && !matchMedia("(hover: none) and (pointer: coarse)").matches;

/**
 * Keyboard controls for the web version; does nothing on phones. Keys are `KeyboardEvent.key`
 * values (" " is Space). A held key fires once, not on every repeat. Handlers are read fresh on
 * each press, so they can use the latest state.
 */
export function useKeys(keys: Record<string, KeyAction>, enabled = true) {
  const latest = useRef(keys);
  useEffect(() => {
    latest.current = keys;
  });
  useEffect(() => {
    if (!HAS_KEYS || !enabled) return;
    const down = (e: KeyboardEvent) => {
      const action = latest.current[e.key];
      if (!action) return;
      // Space would also press a focused button (the one just tapped, so every press counted
      // twice or not at all), and the arrows would scroll the page. Caught on the way down, so
      // the button never sees it.
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (typeof action === "function") action();
      else action.down?.();
    };
    const up = (e: KeyboardEvent) => {
      const action = latest.current[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof action !== "function") action.up?.();
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
    };
  }, [enabled]);
}

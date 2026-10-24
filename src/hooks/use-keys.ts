import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/** A key's action: a function for a press, or `down`/`up` for holding it (like Deep Breaths). */
type KeyAction = (() => void) | { down?: () => void; up?: () => void };

/** Whether this build has keyboard controls for the minigames (the web version). */
export const HAS_KEYS = Platform.OS === "web";

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
      // Space would also press a focused button, and the arrows would scroll the page.
      e.preventDefault();
      if (e.repeat) return;
      if (typeof action === "function") action();
      else action.down?.();
    };
    const up = (e: KeyboardEvent) => {
      const action = latest.current[e.key];
      if (!action) return;
      e.preventDefault();
      if (typeof action !== "function") action.up?.();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled]);
}

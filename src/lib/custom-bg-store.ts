// Where the custom background photo is, shared by the backdrop and Settings.
import { useSyncExternalStore } from "react";

let uri: string | null = null;
const listeners = new Set<() => void>();

export const setCustomBackground = (next: string | null) => {
  uri = next;
  listeners.forEach((l) => l());
};

/** The custom photo's address, or null when none has been picked. */
export const useCustomBackground = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => uri,
    () => uri,
  );

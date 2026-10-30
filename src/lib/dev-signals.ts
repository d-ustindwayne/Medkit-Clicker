// Dev tools asking parts of the screen to do something now (a flying heart, an ambulance), the
// same way auto-tap reaches the medkit: plain module state, listeners added while those are mounted.

export type DevSignal = "heart" | "ambulance";
const listeners = new Map<DevSignal, Set<() => void>>();

export function onDevSignal(signal: DevSignal, listener: () => void) {
  const set = listeners.get(signal) ?? new Set();
  listeners.set(signal, set);
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

/** False if nothing on screen is listening (the page isn't open). */
export function devSignal(signal: DevSignal) {
  const set = listeners.get(signal);
  set?.forEach((l) => l());
  return !!set?.size;
}

// Taps made by the game itself (the flying heart's tap frenzy), sent to the medkit button so they look
// and count like real taps: the press, the "+N" number and the sound. Plain module state: there's one
// medkit on screen at a time.

type Listener = () => void;
const listeners = new Set<Listener>();

/** The medkit button listens while it's mounted. */
export function onAutoTap(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** One tap of the medkit. False if no medkit is listening, so the caller can count it some other way. */
export function autoTap() {
  for (const l of listeners) l();
  return listeners.size > 0;
}

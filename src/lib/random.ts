/** A random whole number from 0 to n - 1. */
export const rand = (n: number) => Math.floor(Math.random() * n);

/**
 * Each minigame has a few variants. One is picked at random from those the player's level has
 * reached (`from`, 0-1), so new players learn the basic game first and the twists come later.
 */
export function pickVariant<T extends string>(level: number, variants: { id: T; from: number }[]): T {
  const open = variants.filter((v) => level >= v.from);
  return open[Math.floor(Math.random() * open.length)].id;
}

/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

import { rand, shuffle } from "@/lib/random";

// Sort the Meds: the pills and the rules for a round. The game itself is in components/ward/more-games.

export const PILL_COLORS = [
  { name: "RED", hex: "#e2372b" },
  { name: "BLUE", hex: "#3a8fe0" },
  { name: "YELLOW", hex: "#f2c14e" },
  { name: "GREEN", hex: "#43b04a" },
  { name: "PURPLE", hex: "#8e5bd6" },
  { name: "ORANGE", hex: "#f08a24" },
];
/** Small, regular and big pills, as a share of the cell's width. */
export const PILL_SIZES = [0.42, 0.68, 0.94];
export const SIZE_NAMES = ["SMALL", "REGULAR", "BIG"];
/** A pill: two halves, coloured (index into PILL_COLORS) or white (null), and a size (index into PILL_SIZES). */
export type PillSpec = { a: number; b: number | null; size: number };

export type PillsVariant = "color" | "except" | "capsule" | "size" | "sizeColor" | "sizeExcept" | "capsuleSize";
export const PILL_VARIANTS: { id: PillsVariant; from: number }[] = [
  { id: "color", from: 0 },
  { id: "except", from: 0.2 },
  { id: "size", from: 0.3 },
  { id: "capsule", from: 0.4 },
  { id: "sizeColor", from: 0.5 },
  { id: "sizeExcept", from: 0.6 },
  { id: "capsuleSize", from: 0.7 },
];
/** Rounds with two rules at once (a colour or capsule, and a size). */
export const TWO_RULES: PillsVariant[] = ["sizeColor", "sizeExcept", "capsuleSize"];

/**
 * Lays out a round: the pills, which of them are right, the colours named in the instruction (x, y)
 * and the size (s: small or big). Wrong pills are mostly near misses that break just one rule.
 * `mixedSizes` gives pills random sizes even when size isn't a rule, as a distraction.
 */
export function dealPills(variant: PillsVariant, colors: number, cells: number, mixedSizes: boolean) {
  const inPlay = shuffle(PILL_COLORS.map((_, k) => k)).slice(0, colors);
  const [x, y] = inPlay;
  const others = inPlay.slice(1);
  const s = rand(2) ? 2 : 0;
  const otherSize = () => [0, 1, 2].filter((k) => k !== s)[rand(2)];
  const anySize = () => (mixedSizes ? rand(3) : 1);
  const targets = cells <= 9 ? 4 : cells <= 12 ? 5 : cells <= 16 ? 6 : cells <= 20 ? 7 : 8;
  const any = (list: number[]) => list[rand(list.length)];
  const single = (a: number, size = anySize()): PillSpec => ({ a, b: null, size });
  const xy = (size = anySize()): PillSpec => (rand(2) ? { a: x, b: y, size } : { a: y, b: x, size });
  const isXY = (p: PillSpec) => p.b !== null && ((p.a === x && p.b === y) || (p.a === y && p.b === x));
  /** A capsule sharing one colour with the x-y capsule, or any two colours. */
  const lookAlike = (size = anySize()): PillSpec => {
    const half = rand(2) ? x : y;
    return rand(3) ? (rand(2) ? { a: half, b: any(inPlay), size } : { a: any(inPlay), b: half, size }) : { a: any(inPlay), b: any(inPlay), size };
  };
  const rules: Record<PillsVariant, { right: (p: PillSpec) => boolean; target: () => PillSpec; near: () => PillSpec }> = {
    color: { right: (p) => p.a === x, target: () => single(x), near: () => single(any(others)) },
    // Most pills are colour x; tap all the others.
    except: { right: (p) => p.a !== x, target: () => single(any(others)), near: () => single(x) },
    capsule: { right: isXY, target: () => xy(), near: () => lookAlike() },
    size: { right: (p) => p.size === s, target: () => single(any(inPlay), s), near: () => single(any(inPlay), otherSize()) },
    sizeColor: {
      right: (p) => p.a === x && p.size === s,
      target: () => single(x, s),
      near: () => (rand(2) ? single(x, otherSize()) : single(any(others), s)),
    },
    sizeExcept: {
      right: (p) => p.size === s && p.a !== x,
      target: () => single(any(others), s),
      near: () => (rand(2) ? single(x, s) : single(any(others), otherSize())),
    },
    capsuleSize: {
      right: (p) => isXY(p) && p.size !== s,
      target: () => xy(otherSize()),
      near: () => (rand(2) ? xy(s) : lookAlike(rand(3))),
    },
  };
  const { right, target, near } = rules[variant];
  const pills = Array.from({ length: targets }, target);
  while (pills.length < cells) {
    const p = near();
    if (!right(p)) pills.push(p);
  }
  return { x, y, s, pills: shuffle(pills), right };
}

// Short-scale names; index 0 is 10^6. They run all the way to the largest number JavaScript can
// hold (about 1.8 x 10^308, "uncentillion"), so even an endless grind always reads as words.
const ONES = ["", "un", "duo", "tre", "quattuor", "quin", "sex", "septen", "octo", "novem"];
const TENS = ["", "dec", "vigint", "trigint", "quadragint", "quinquagint", "sexagint", "septuagint", "octogint", "nonagint"];
const SMALL = ["million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", "octillion", "nonillion"];
const ONES_SHORT = ["", "U", "D", "T", "Qa", "Qi", "Sx", "Sp", "O", "N"];
const TENS_SHORT = ["", "Dc", "Vg", "Tg", "Qag", "Qig", "Sxg", "Spg", "Og", "Ng"];
/** Name of 10^(3n+3): n = 1 is million, 10 decillion, 21 unvigintillion, 100 centillion. */
const illion = (n: number) =>
  n <= 9 ? SMALL[n - 1] : n === 100 ? "centillion" : n === 101 ? "uncentillion" : `${ONES[n % 10]}${TENS[Math.floor(n / 10)]}illion`;
const LARGE_UNITS = Array.from({ length: 101 }, (_, i) => illion(i + 1));
const SHORT_UNITS = [
  "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No",
  ...Array.from({ length: 92 }, (_, i) => {
    const n = i + 10; // decillion onwards
    return n === 100 ? "Ce" : n === 101 ? "UCe" : `${ONES_SHORT[n % 10]}${TENS_SHORT[Math.floor(n / 10)]}`;
  }),
];

const withCommas = (n: number) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const trim = (s: string) => s.replace(/\.?0+$/, "");
const scientific = (n: number) => n.toExponential(3).replace("e+", "e");

/** Divides n into a 1-999 mantissa and its power-of-1000 tier. */
const tierOf = (n: number) => {
  const tier = Math.floor(Math.log10(n) / 3);
  return { tier, scaled: n / 10 ** (tier * 3) };
};

/** Rounds to at most two decimals, dropping trailing zeros: 3.6999999 -> "3.7", 2.005 -> "2.01". */
export const formatDecimal = (n: number) => trim((Math.round(n * 100) / 100).toFixed(2));

/** A multiplier such as x3.7, rounded to two decimals. */
export const formatMult = (n: number) => `x${formatDecimal(n)}`;

/**
 * Scaled to its unit with two decimals, rounded down so it never shows more than there is:
 * 1,492 is 1.49K (not 1.5K) and 1,683,525 is 1.68M.
 */
const scaleTo = (n: number) => {
  const { tier, scaled } = tierOf(n);
  // The small nudge keeps float error (2.3 stored as 2.2999...) from dropping a whole hundredth.
  return { tier, value: trim((Math.floor(scaled * 100 + 1e-6) / 100).toFixed(2)) };
};

/** 123,456 below a million, then "1.23 million", "56.78 billion"... up to uncentillion. */
export const formatCount = (n: number) => {
  if (!Number.isFinite(n)) return "∞";
  if (n < 1e6) return withCommas(n);
  const { tier, value } = scaleTo(n);
  const name = LARGE_UNITS[tier - 2];
  return name ? `${value} ${name}` : scientific(n);
};

/** Like formatCount, but keeps up to two decimals below 1,000, for rates such as 0.3/s or 12.45/s. */
export const formatRate = (n: number) => (n < 1_000 ? formatDecimal(n) : formatCount(n));

/** Short form for tight spaces: 1.23K, 3.4M, 5.67B, 7.8T, 9.1Qa (two decimals, rounded down). */
export const formatShort = (n: number) => {
  if (!Number.isFinite(n)) return "∞";
  if (n < 1_000) return formatDecimal(n);
  const { tier, value } = scaleTo(n);
  const unit = SHORT_UNITS[tier - 1];
  return unit ? `${value}${unit}` : scientific(n);
};

export const formatDuration = (seconds: number) => {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
};

// Short-scale names; index 0 is 10^6. Past the last name we fall back to scientific notation.
const LARGE_UNITS = [
  "million",
  "billion",
  "trillion",
  "quadrillion",
  "quintillion",
  "sextillion",
  "septillion",
  "octillion",
  "nonillion",
  "decillion",
  "undecillion",
  "duodecillion",
  "tredecillion",
  "quattuordecillion",
  "quindecillion",
  "sexdecillion",
  "septendecillion",
  "octodecillion",
  "novemdecillion",
  "vigintillion",
];
const SHORT_UNITS = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc", "Vg"];

const withCommas = (n: number) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const trim = (s: string) => s.replace(/\.?0+$/, "");
const scientific = (n: number) => n.toExponential(3).replace("e+", "e");

/** Divides n into a 1-999 mantissa and its power-of-1000 tier. */
const tierOf = (n: number) => {
  const tier = Math.floor(Math.log10(n) / 3);
  return { tier, scaled: n / 10 ** (tier * 3) };
};

/** 123,456 below a million, then "1.234 million", "56.78 billion"... up to vigintillion. */
export const formatCount = (n: number) => {
  if (!Number.isFinite(n)) return "∞";
  if (n < 1e6) return withCommas(n);
  const { tier, scaled } = tierOf(n);
  const name = LARGE_UNITS[tier - 2];
  return name ? `${trim(scaled.toFixed(3))} ${name}` : scientific(n);
};

/** Like formatCount, but keeps one decimal for small rates such as 0.3/s. */
export const formatRate = (n: number) => (n < 10 ? trim(n.toFixed(1)) : formatCount(n));

/** Short form for tight spaces: 1.2K, 3.4M, 5.6B, 7.8Qa. */
export const formatShort = (n: number) => {
  if (!Number.isFinite(n)) return "∞";
  if (n < 1_000) return n < 10 ? formatRate(n) : withCommas(n);
  let { tier, scaled } = tierOf(n);
  // 999,999 rounds to "1000.0K"; carry it into the next unit instead.
  if (Number(scaled.toFixed(1)) >= 1000) {
    tier += 1;
    scaled /= 1000;
  }
  const unit = SHORT_UNITS[tier - 1];
  return unit ? `${trim(scaled.toFixed(1))}${unit}` : scientific(n);
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

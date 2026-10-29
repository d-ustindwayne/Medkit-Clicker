// Daily login: a 7-day streak of gifts. Miss a day and it starts over at day 1; after day 7 it loops.

export type DailyGift = { day: number; label: string; seconds?: number; coins?: number; gems?: number };

/** Picked by Claude (0.8.0), generous on purpose. `seconds` pays that much production (at least 10 taps per minute of it). */
export const DAILY_GIFTS: DailyGift[] = [
  { day: 1, label: "10 minutes of medkits", seconds: 600 },
  { day: 2, label: "5 Care Coins", coins: 5 },
  { day: 3, label: "30 minutes of medkits", seconds: 1800 },
  { day: 4, label: "10 Care Coins", coins: 10 },
  { day: 5, label: "1 hour of medkits", seconds: 3600 },
  { day: 6, label: "20 Care Coins", coins: 20 },
  { day: 7, label: "A Natal Gem + 2 hours of medkits", gems: 1, seconds: 7200 },
];

/** `streak`: the last day claimed (1-7, 0 = none yet); `last`: the local date it was claimed on. */
export type DailyState = { streak: number; last: string | null };

/** The local calendar date as YYYY-MM-DD (a new day starts at the player's midnight). */
export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Days from one YYYY-MM-DD to another (calendar days, ignoring daylight-saving shifts). */
export const daysBetween = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);

/** Today's gift: null if already claimed today; otherwise the next day of the streak (day 1 after a missed day). */
export function todaysGift(daily: DailyState, today = dayKey()): DailyGift | null {
  if (daily.last === today) return null;
  const gap = daily.last ? daysBetween(daily.last, today) : Infinity;
  // A clock turned back gets nothing until the date passes the last claim again.
  if (gap < 0) return null;
  const day = gap === 1 ? (daily.streak % DAILY_GIFTS.length) + 1 : 1;
  return DAILY_GIFTS[day - 1];
}

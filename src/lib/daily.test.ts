import { describe, expect, test } from "bun:test";

import { DAILY_GIFTS, dayKey, daysBetween, todaysGift } from "@/lib/daily";
import { gameReducer, newGame } from "@/lib/game";

describe("daily login", () => {
  test("the streak counts up day by day, loops after 7 and resets after a missed day", () => {
    expect(todaysGift({ streak: 0, last: null }, "2026-10-29")?.day).toBe(1);
    expect(todaysGift({ streak: 1, last: "2026-10-29" }, "2026-10-29")).toBeNull();
    expect(todaysGift({ streak: 1, last: "2026-10-29" }, "2026-10-30")?.day).toBe(2);
    expect(todaysGift({ streak: 7, last: "2026-10-29" }, "2026-10-30")?.day).toBe(1);
    expect(todaysGift({ streak: 4, last: "2026-10-27" }, "2026-10-29")?.day).toBe(1);
    // A clock turned back gets nothing.
    expect(todaysGift({ streak: 3, last: "2026-10-29" }, "2026-10-20")).toBeNull();
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(dayKey(new Date(2026, 0, 5).getTime())).toBe("2026-01-05");
  });
  test("claiming pays the gift once a day", () => {
    let s = gameReducer(newGame(), { type: "claimDaily", today: "2026-10-29" });
    expect(s.daily).toEqual({ streak: 1, last: "2026-10-29" });
    expect(s.healed).toBeGreaterThan(0);
    const again = gameReducer(s, { type: "claimDaily", today: "2026-10-29" });
    expect(again).toBe(s);
    s = gameReducer(s, { type: "claimDaily", today: "2026-10-30" });
    expect(s.bonusCoins).toBe(DAILY_GIFTS[1].coins!);
  });
});

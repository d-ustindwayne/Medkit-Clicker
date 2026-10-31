import { describe, expect, test } from "bun:test";

import { TIMEZONE_PLACES } from "@/constants/timezones";
import { sunPhase } from "@/lib/sun";

const AUCKLAND = TIMEZONE_PLACES["Pacific/Auckland"];
const LONDON = TIMEZONE_PLACES["Europe/London"];

describe("sunPhase", () => {
  test("follows the real sun in Auckland (daylight saving, summer)", () => {
    // 2026-12-21, NZDT (UTC+13): sunrise about 5:55, sunset about 20:40.
    const at = (h: number, m = 0) => new Date(Date.UTC(2026, 11, 21, h - 13, m));
    expect(sunPhase(at(3), AUCKLAND)).toBe("night");
    expect(sunPhase(at(6), AUCKLAND)).toBe("sunrise");
    expect(sunPhase(at(12), AUCKLAND)).toBe("day");
    // 7 pm is still full day in a New Zealand summer (the clock rule called it night).
    expect(sunPhase(at(19), AUCKLAND)).toBe("day");
    expect(sunPhase(at(20, 40), AUCKLAND)).toBe("sunset");
    expect(sunPhase(at(23), AUCKLAND)).toBe("night");
  });

  test("short winter days in London", () => {
    // 2026-12-21, GMT: sunrise about 8:04, sunset about 15:54.
    const at = (h: number) => new Date(Date.UTC(2026, 11, 21, h));
    expect(sunPhase(at(7), LONDON)).toBe("night");
    expect(sunPhase(at(12), LONDON)).toBe("day");
    expect(sunPhase(at(17), LONDON)).toBe("night");
  });

  test("no sunset in the Arctic summer, and the clock without a place", () => {
    expect(sunPhase(new Date(Date.UTC(2026, 5, 21, 23)), [78.2, 15.6])).toBe("day");
    expect(sunPhase(new Date(2026, 0, 1, 18), null)).toBe("sunset");
  });

  test("every time zone has a usable place", () => {
    for (const [lat, lng] of Object.values(TIMEZONE_PLACES)) {
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lng)).toBeLessThanOrEqual(180);
    }
  });
});

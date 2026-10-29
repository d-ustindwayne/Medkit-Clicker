import { describe, expect, test } from "bun:test";

import { boostMultiplier } from "@/constants/boosts";
import { setEvents } from "@/lib/event-store";
import { parseRewards, formatRewards } from "@/lib/rewards-text";

describe("timed events", () => {
  test("a running event multiplies like a boost, but not offline earnings", () => {
    const now = Date.now();
    setEvents([{ id: 1, title: "Double Day", description: null, startsAt: now - 1000, endsAt: now + 60_000, tapMult: 2, rateMult: 3, rewards: [], icon: null }]);
    expect(boostMultiplier({}, "tap", now)).toBe(2);
    expect(boostMultiplier({}, "rate", now)).toBe(3);
    expect(boostMultiplier({ adrenaline: now + 1000 }, "tap", now)).toBe(5);
    expect(boostMultiplier(undefined, "rate", now)).toBe(1);
    expect(boostMultiplier({}, "rate", now + 120_000)).toBe(1);
    setEvents([]);
  });
});

describe("rewards as text", () => {
  test("reads and writes the add-promo format", () => {
    const r = parseRewards("coins:20, gems:1,background:purple_rain");
    expect("rewards" in r && formatRewards(r.rewards)).toBe("coins:20, gems:1, background:purple_rain");
    expect("error" in parseRewards("coins:zero")).toBe(true);
    expect("error" in parseRewards("background:nope")).toBe(true);
  });
});

import { describe, expect, test } from "bun:test";

import { gameReducer, newGame } from "@/lib/game";
import { DAILY_CAP_M, STEP_M, addReading, newWalk, stepsSince } from "@/lib/walk";

const boot = 1_000_000;
describe("walking rewards", () => {
  test("steps are counted between readings, across a restart too", () => {
    expect(stepsSince(null, { steps: 500, bootTime: boot })).toBe(0);
    expect(stepsSince({ steps: 500, bootTime: boot }, { steps: 900, bootTime: boot + 30_000 })).toBe(400);
    // Restarted: the counter began again from 0.
    expect(stepsSince({ steps: 5000, bootTime: boot }, { steps: 300, bootTime: boot + 86_400_000 })).toBe(300);
  });
  test("500 m and 1 km rewards come due once each, up to 8 km a day", () => {
    let w = { ...newWalk(), on: true };
    ({ walk: w } = addReading(w, { steps: 0, bootTime: boot }, "2026-10-29"));
    const r = addReading(w, { steps: Math.ceil(1000 / STEP_M), bootTime: boot }, "2026-10-29");
    expect(r.due500).toBe(2);
    expect(r.due1k).toBe(1);
    const again = addReading(r.walk, { steps: Math.ceil(1000 / STEP_M) + 10, bootTime: boot }, "2026-10-29");
    expect(again.due500 + again.due1k).toBe(0);
    const far = addReading(r.walk, { steps: 100_000, bootTime: boot }, "2026-10-29");
    expect(far.walk.meters).toBe(DAILY_CAP_M);
    expect(far.walk.paid1k).toBe(8);
    // A new day starts over.
    const next = addReading(far.walk, { steps: 100_000 + 700, bootTime: boot }, "2026-10-30");
    expect(next.walk.meters).toBeCloseTo(700 * STEP_M);
    expect(next.due500).toBe(1);
  });
  test("the game pays them out only while turned on", () => {
    let s = gameReducer(newGame(), { type: "walkReading", reading: { steps: 0, bootTime: boot }, today: "2026-10-29" });
    expect(s.walk.last).toBeNull();
    s = gameReducer(s, { type: "setWalk", on: true });
    s = gameReducer(s, { type: "walkReading", reading: { steps: 0, bootTime: boot }, today: "2026-10-29" });
    s = gameReducer(s, { type: "walkReading", reading: { steps: 1400, bootTime: boot }, today: "2026-10-29" });
    expect(s.bonusCoins).toBe(20);
    expect(s.healed).toBeGreaterThan(0);
  });
});

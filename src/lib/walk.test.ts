import { describe, expect, test } from "bun:test";

import { gameReducer, newGame } from "@/lib/game";
import { DAILY_CAP_M, STEP_M, addReading, newWalk, stepsSince, walkReward, walkRewards } from "@/lib/walk";

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
    expect(r.rewards).toHaveLength(2);
    const again = addReading(r.walk, { steps: Math.ceil(1000 / STEP_M) + 10, bootTime: boot }, "2026-10-29");
    expect(again.rewards.length).toBe(0);
    const far = addReading(r.walk, { steps: 100_000, bootTime: boot }, "2026-10-29");
    expect(far.walk.meters).toBe(DAILY_CAP_M);
    expect(far.walk.paid500).toBe(16);
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
    // 1,050 m: the first two 500 m rewards.
    expect(s.walk.paid500).toBe(2);
    const coins = walkRewards("2026-10-29", 0, 2).reduce((n, r) => n + (r.kind === "coins" ? r.amount : 0), 0);
    expect(s.bonusCoins).toBe(coins);
  });
  test("rewards are a fixed surprise per day, grow with distance, and 8 km pays a gem", () => {
    expect(walkRewards("2026-10-29", 0, 16)).toEqual(walkRewards("2026-10-29", 0, 16));
    for (let d = 1; d <= 60; d++) {
      const day = `2026-11-${String(d).padStart(2, "0")}`;
      expect(walkReward(day, 16)).toEqual({ kind: "gem", count: 2, seconds: 7200 });
      for (let n = 1; n < 8; n++) expect(walkReward(day, n).kind).not.toBe("gem");
    }
    const avg = (n: number, kind: "coins" | "medkits") => {
      let sum = 0, count = 0;
      for (let d = 0; d < 400; d++) {
        const r = walkReward(`day${d}`, n);
        if (r.kind !== kind) continue;
        sum += r.kind === "coins" ? r.amount : r.kind === "medkits" ? r.seconds : 0;
        count++;
      }
      return sum / count;
    };
    expect(avg(15, "coins")).toBeGreaterThan(avg(1, "coins") * 2);
    expect(avg(15, "medkits")).toBeGreaterThan(avg(1, "medkits") * 2);
  });
});

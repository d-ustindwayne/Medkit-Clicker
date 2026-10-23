import { describe, expect, test } from "bun:test";

import { minigameTuning } from "@/constants/patients";
import { PILL_COLORS, PILL_VARIANTS, dealPills } from "@/lib/pills";

const TARGETS: Record<number, number> = { 9: 4, 12: 5, 16: 6, 20: 7, 25: 8 };

describe("Sort the Meds", () => {
  test("every variant deals a full grid with the right number of pills to tap", () => {
    for (const { id } of PILL_VARIANTS) {
      for (const cells of [9, 12, 16, 20, 25]) {
        for (const colors of [4, 6]) {
          for (let round = 0; round < 60; round++) {
            const deal = dealPills(id, colors, cells, round % 2 === 0);
            expect(deal.pills.length).toBe(cells);
            expect(deal.pills.filter(deal.right).length).toBe(TARGETS[cells]);
            for (const p of deal.pills) {
              expect(p.a).toBeGreaterThanOrEqual(0);
              expect(p.a).toBeLessThan(PILL_COLORS.length);
              expect(p.size).toBeGreaterThanOrEqual(0);
              expect(p.size).toBeLessThanOrEqual(2);
            }
          }
        }
      }
    }
  });

  test("the named size is small or big, never regular", () => {
    for (let round = 0; round < 100; round++) expect([0, 2]).toContain(dealPills("size", 6, 16, true).s);
  });

  test("two-rule rounds need both rules: a pill matching only one is wrong", () => {
    for (let round = 0; round < 100; round++) {
      const d = dealPills("sizeColor", 6, 25, true);
      for (const p of d.pills) expect(d.right(p)).toBe(p.a === d.x && p.size === d.s);
      const e = dealPills("sizeExcept", 6, 25, true);
      for (const p of e.pills) expect(e.right(p)).toBe(p.size === e.s && p.a !== e.x);
    }
  });

  test("pills stay one size until sizes are in play", () => {
    for (let round = 0; round < 50; round++) {
      for (const p of dealPills("color", 4, 9, false).pills) expect(p.size).toBe(1);
    }
  });

  test("the grid grows from 3x3 to 5x5", () => {
    expect(minigameTuning(0).pills).toBe(9);
    expect(minigameTuning(1).pills).toBe(25);
  });
});

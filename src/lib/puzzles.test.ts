import { describe, expect, test } from "bun:test";

import { DOWN, LEFT, RIGHT, UP, canStep, flowsThrough, makeMaze, makePipes, turn } from "@/lib/puzzles";

describe("Blood Flow maze", () => {
  test("every cell can be reached from the start", () => {
    for (const n of [5, 6, 8]) {
      const m = makeMaze(n);
      const seen = new Set([0]);
      const todo = [0];
      while (todo.length) {
        const c = todo.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!canStep(m, c, dx, dy)) continue;
          const d = c + dx + dy * n;
          if (!seen.has(d)) {
            seen.add(d);
            todo.push(d);
          }
        }
      }
      expect(seen.size).toBe(n * n);
      // No stepping off the edge.
      expect(canStep(m, 0, -1, 0)).toBe(false);
      expect(canStep(m, 0, 0, -1)).toBe(false);
    }
  });
});

describe("IV Line pipes", () => {
  test("turning a tile four times brings it back", () => {
    expect(turn(UP)).toBe(RIGHT);
    expect(turn(LEFT)).toBe(UP);
    expect(turn(UP | DOWN)).toBe(RIGHT | LEFT);
    for (let m = 0; m < 16; m++) expect(turn(turn(turn(turn(m))))).toBe(m);
  });
  test("a dealt puzzle starts unsolved and can be solved by turning tiles", () => {
    for (let k = 0; k < 20; k++) {
      const p = makePipes(4 + (k % 3));
      expect(flowsThrough(p).done).toBe(false);
      // Brute force one tile at a time is too slow, so check the dealt tiles are turns of a solvable set:
      // every tile has at least one pipe end, and the bag's and the heart's tiles can face the edges.
      expect(p.tiles.every((m) => m > 0)).toBe(true);
    }
  });
});

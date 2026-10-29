// The maze and pipe puzzles for the Blood Flow and IV Line minigames (pure logic, unit-tested).
import { shuffle } from "@/lib/random";

/** Walls of each cell: right and bottom (the top and left ones belong to the neighbours). */
export type Maze = { n: number; right: boolean[]; down: boolean[] };
/** A random maze with one path between any two cells (depth-first carving). */
export function makeMaze(n: number): Maze {
  const right = Array(n * n).fill(true), down = Array(n * n).fill(true);
  const seen = Array(n * n).fill(false);
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const x = c % n, y = Math.floor(c / n);
    const next = shuffle([
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]).find(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen[b * n + a]);
    if (!next) {
      stack.pop();
      continue;
    }
    const [a, b] = next;
    const d = b * n + a;
    if (a > x) right[c] = false;
    else if (a < x) right[d] = false;
    else if (b > y) down[c] = false;
    else down[d] = false;
    seen[d] = true;
    stack.push(d);
  }
  return { n, right, down };
}
/** Whether the maze lets you step from cell `c` by dx, dy (one cell). */
export const canStep = (m: Maze, c: number, dx: number, dy: number) => {
  const x = c % m.n, y = Math.floor(c / m.n);
  const a = x + dx, b = y + dy;
  if (a < 0 || b < 0 || a >= m.n || b >= m.n) return false;
  if (dx === 1) return !m.right[c];
  if (dx === -1) return !m.right[c - 1];
  if (dy === 1) return !m.down[c];
  return !m.down[c - m.n];
};

/** Pipe ends on a tile as bits: up 1, right 2, down 4, left 8. */
export const UP = 1, RIGHT = 2, DOWN = 4, LEFT = 8;
export const turn = (m: number) => ((m << 1) | (m >> 3)) & 15;
export type Pipes = { n: number; tiles: number[]; start: number; end: number };
/** A random spanning tree of pipes from the left edge (row `start`) to the right edge (row `end`), each tile turned at random. */
export function makePipes(n: number): Pipes {
  const tiles = Array(n * n).fill(0);
  const seen = Array(n * n).fill(false);
  const stack = [Math.floor(Math.random() * n) * n];
  seen[stack[0]] = true;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const x = c % n, y = Math.floor(c / n);
    const opts = shuffle([
      [1, 0, RIGHT, LEFT],
      [-1, 0, LEFT, RIGHT],
      [0, 1, DOWN, UP],
      [0, -1, UP, DOWN],
    ]).filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < n && y + dy < n && !seen[(y + dy) * n + x + dx]);
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [dx, dy, out, back] = opts[0];
    const d = (y + dy) * n + x + dx;
    tiles[c] |= out;
    tiles[d] |= back;
    seen[d] = true;
    stack.push(d);
  }
  const start = Math.floor(Math.random() * n), end = Math.floor(Math.random() * n);
  tiles[start * n] |= LEFT;
  tiles[end * n + n - 1] |= RIGHT;
  const solved = [...tiles];
  let turned = solved;
  // Turn every tile at random, and again if that happens to leave it solved.
  for (let k = 0; k < 10; k++) {
    turned = solved.map((m) => {
      let t = m;
      for (let r = Math.floor(Math.random() * 4); r > 0; r--) t = turn(t);
      return t;
    });
    if (!flowsThrough({ n, tiles: turned, start, end }).done) break;
  }
  return { n, tiles: turned, start, end };
}
/** Which tiles the drip reaches from the bag, and whether it gets out to the patient. */
export function flowsThrough(p: Pipes) {
  const { n, tiles } = p;
  const wet = new Set<number>();
  const first = p.start * n;
  if (!(tiles[first] & LEFT)) return { wet, done: false };
  const todo = [first];
  wet.add(first);
  while (todo.length) {
    const c = todo.pop()!;
    const x = c % n, y = Math.floor(c / n);
    for (const [bit, dx, dy, back] of [[UP, 0, -1, DOWN], [RIGHT, 1, 0, LEFT], [DOWN, 0, 1, UP], [LEFT, -1, 0, RIGHT]]) {
      if (!(tiles[c] & bit)) continue;
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= n || b >= n) continue;
      const d = b * n + a;
      if (wet.has(d) || !(tiles[d] & back)) continue;
      wet.add(d);
      todo.push(d);
    }
  }
  const last = p.end * n + n - 1;
  return { wet, done: wet.has(last) && !!(tiles[last] & RIGHT) };
}

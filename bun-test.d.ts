// Minimal types for Bun's built-in test runner (`bun test`), so tsc can check *.test.ts without @types/bun.
declare module "bun:test" {
  type Matchers = {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toContain(item: unknown): void;
    toHaveLength(length: number): void;
    toBeGreaterThan(n: number): void;
    toBeGreaterThanOrEqual(n: number): void;
    toBeLessThan(n: number): void;
    toBeLessThanOrEqual(n: number): void;
    toBeCloseTo(n: number, digits?: number): void;
    not: Matchers;
  };
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: unknown): Matchers;
}

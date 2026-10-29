import { describe, expect, test } from "bun:test";

import { isNewer, parseVersion } from "@/lib/updates";

describe("update check", () => {
  test("reads versions with or without a v", () => {
    expect(parseVersion("v0.7.10")).toEqual([0, 7, 10]);
    expect(parseVersion("1.2")).toEqual([1, 2, 0]);
    expect(parseVersion("nightly")).toBeNull();
  });

  test("compares numerically, not as text", () => {
    expect(isNewer("0.7.10", "0.7.9")).toBe(true);
    expect(isNewer("0.8.0", "0.7.12")).toBe(true);
    expect(isNewer("0.7.6", "0.7.6")).toBe(false);
    expect(isNewer("0.7.5", "0.7.6")).toBe(false);
    expect(isNewer("garbage", "0.7.6")).toBe(false);
  });
});

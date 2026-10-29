import { describe, expect, test } from "bun:test";

import { CUSTOM_BG_COINS, coinBalance, customBgPrice, gameReducer, newGame, roundDownToLeading } from "@/lib/game";

describe("custom background", () => {
  test("a change costs 20% of the run's best balance, rounded down to its first digit", () => {
    expect(roundDownToLeading(213_532)).toBe(200_000);
    expect(roundDownToLeading(413_131_411)).toBe(400_000_000);
    expect(roundDownToLeading(0.5)).toBe(0);
    expect(customBgPrice(1e12)).toBe(2e11);
    expect(customBgPrice(4_131_314_117)).toBe(800_000_000);
  });
  test("the first photo is free, later ones cost coins and medkits", () => {
    let s = { ...newGame(), ownedBackgrounds: ["custom"], healed: 1000, runPeak: 5000, bonusCoins: 30 };
    s = gameReducer(s, { type: "changeCustomBg" });
    expect(s.customBgChanges).toBe(1);
    expect(s.healed).toBe(1000);
    const coins = coinBalance(s);
    s = gameReducer(s, { type: "changeCustomBg" });
    expect(s.healed).toBe(0);
    expect(coinBalance(s)).toBe(coins - CUSTOM_BG_COINS);
    // Can't afford it again.
    expect(gameReducer(s, { type: "changeCustomBg" })).toBe(s);
  });
  test("earning tracks the run's highest balance", () => {
    const s = gameReducer({ ...newGame(), healed: 10, runPeak: 10 }, { type: "earn", amount: 90 });
    expect(s.runPeak).toBe(100);
  });
});

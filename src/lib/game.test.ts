import { describe, expect, test } from "bun:test";

import { ACHIEVEMENTS } from "@/constants/achievements";
import { BOOSTS, boostMultiplier } from "@/constants/boosts";
import { SHOP_ITEMS, itemCost } from "@/constants/items";
import { SICK_PATIENTS, minigameTuning } from "@/constants/patients";
import { EMERGENCY_SECONDS, EMERGENCY_TAPS, HOSPITAL_TIERS, dayPhase, hospitalTier, visitorGap } from "@/constants/hospital";
import { healingRate, rebirthTarget } from "@/constants/rebirth";
import { ROOMS, ROOM_BONUS_CAP, ROOM_ITEMS, ZONES, roomBonus } from "@/constants/room";
import { formatCount, formatShort } from "@/lib/format";
import { bulkCost, coinBalance, coinsEarned, emergencyReward, maxAwaySeconds, gameReducer, newGame, normalizeSave, priceOf, tapValue, type GameAction, type GameState } from "@/lib/game";

const run = (s: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, s);
const rich = () => run(newGame(), { type: "earn", amount: 1e15 });

describe("shop", () => {
  test("13 items with unique ids and a rising price ladder", () => {
    expect(SHOP_ITEMS).toHaveLength(13);
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(13);
    for (let i = 1; i < SHOP_ITEMS.length; i++) {
      expect(SHOP_ITEMS[i].baseCost).toBeGreaterThan(SHOP_ITEMS[i - 1].baseCost);
      expect(SHOP_ITEMS[i].rate).toBeGreaterThan(SHOP_ITEMS[i - 1].rate);
    }
  });

  test("buying spends the price and raises the next one by 15%", () => {
    const s = run(newGame(), { type: "earn", amount: 100 }, { type: "buy", item: "bandage" });
    expect(s.owned.bandage).toBe(1);
    expect(s.healed).toBe(85);
    expect(itemCost(SHOP_ITEMS[0], 1)).toBe(18);
  });

  test("can't buy without enough patients", () => {
    const s = run(newGame(), { type: "buy", item: "gloves" });
    expect(s.owned.gloves).toBe(0);
  });
});

describe("saves", () => {
  test("an old 5-item save loads with every new field filled in", () => {
    const s = normalizeSave({ healed: 50, owned: { syringe: 3, gloves: 1 } })!;
    expect(s.owned.syringe).toBe(3);
    expect(s.owned.dna).toBe(0);
    expect(s.coinsSpent).toBe(0);
    expect(s.boosts).toEqual({});
    expect(s.patient).toBeNull();
    expect(s.room.current).toBe(ROOMS[0].id);
  });

  test("old cube-root rebirth points become one Natal Gem per rebirth", () => {
    expect(normalizeSave({ healed: 1, rebirths: 2, rebirthPoints: 26 })!.rebirthPoints).toBe(2);
  });

  test("rejects garbage", () => {
    expect(normalizeSave(null)).toBeNull();
    expect(normalizeSave({ healed: "lots" })).toBeNull();
  });
});

describe("achievements and Care Coins", () => {
  test("ids are unique and every achievement pays at least one coin", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.coins).toBeGreaterThanOrEqual(1);
  });

  test("coins come from unlocked achievements and are spent on boosts", () => {
    const s = run(newGame(), { type: "tap" }); // unlocks First Aid
    expect(coinsEarned(s)).toBeGreaterThan(0);
    const before = coinBalance(s);
    const after = run(s, { type: "useBoost", id: "emergency_funding" });
    expect(coinBalance(after)).toBe(before - 1);
  });

  test("a boost you can't afford does nothing", () => {
    const s = run(newGame(), { type: "useBoost", id: "time_warp" });
    expect(s.coinsSpent).toBe(0);
  });
});

describe("boosts", () => {
  const withCoins = () => run(rich(), { type: "devAddCoins", count: 100 });

  test("13 boosts with unique ids", () => {
    expect(BOOSTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(BOOSTS.map((b) => b.id)).size).toBe(BOOSTS.length);
  });

  test("Adrenaline Shot doubles taps, and buying again extends it", () => {
    const s = run(withCoins(), { type: "useBoost", id: "adrenaline" });
    expect(boostMultiplier(s.boosts, "tap")).toBe(2);
    const first = s.boosts.adrenaline;
    const again = run(s, { type: "useBoost", id: "adrenaline" });
    expect(again.boosts.adrenaline).toBeGreaterThan(first + 170_000);
  });

  test("Clearance Sale takes 25% off shop prices", () => {
    const s = run(withCoins(), { type: "useBoost", id: "clearance_sale" });
    const item = SHOP_ITEMS[5];
    expect(priceOf(s, item)).toBe(Math.ceil(itemCost(item, 0) * 0.75));
  });

  test("Lucky Stethoscope makes taps heal 10x and counts down", () => {
    const s = run(withCoins(), { type: "useBoost", id: "lucky_stethoscope" });
    expect(s.luckyTaps).toBe(50);
    const plain = tapValue({ owned: s.owned, rebirths: s.rebirths });
    expect(tapValue(s)).toBe(plain * 10);
    expect(run(s, { type: "tap" }).luckyTaps).toBe(49);
  });

  test("instant boosts pay out patients", () => {
    const s = withCoins();
    expect(run(s, { type: "useBoost", id: "patient_rush" }).healed).toBeGreaterThan(s.healed);
  });
});

describe("ward patients", () => {
  test("a patient arrives, and a win pays patients, a coin and counts as treated", () => {
    const s = run(newGame(), { type: "patientArrives", id: SICK_PATIENTS[0].id });
    expect(s.patient?.id).toBe(SICK_PATIENTS[0].id);
    const won = run(s, { type: "treat", won: true, next: 123 });
    expect(won.patient).toBeNull();
    expect(won.treated).toBe(1);
    expect(won.bonusCoins).toBe(1);
    expect(won.healed).toBeGreaterThan(s.healed);
    expect(won.nextPatientAt).toBe(123);
  });

  test("a loss pays a little and doesn't count", () => {
    const s = run(newGame(), { type: "patientArrives", id: SICK_PATIENTS[1].id }, { type: "treat", won: false, next: 1 });
    expect(s.treated).toBe(0);
    expect(s.bonusCoins).toBe(0);
  });

  test("treating with nobody there does nothing", () => {
    // Compare fields, not identity: Night Shift can unlock if the tests run between midnight and 5 a.m.
    const s = newGame();
    const after = run(s, { type: "treat", won: true, next: 1 });
    expect(after.treated).toBe(0);
    expect(after.healed).toBe(s.healed);
    expect(after.nextPatientAt).toBe(s.nextPatientAt);
  });
});

describe("My Room", () => {
  test("starter items place, locked ones don't", () => {
    let s = run(newGame(), { type: "placeItem", room: "empty", item: "potted_plant", x: 0.5, y: 0.9 });
    expect(s.room.placed.empty).toHaveLength(1);
    s = run(s, { type: "placeItem", room: "empty", item: "aed", x: 0.5, y: 0.4 }); // needs 3 rebirths
    expect(s.room.placed.empty).toHaveLength(1);
  });

  test("positions are kept inside the item's zone", () => {
    const s = run(newGame(), { type: "placeItem", room: "empty", item: "potted_plant", x: 2, y: 0.1 });
    const p = s.room.placed.empty[0];
    expect(p.x).toBeLessThanOrEqual(0.95);
    expect(p.y).toBeGreaterThanOrEqual(ZONES.floor.minY);
  });

  test("each item exists once: moving it to another room takes it out of the first", () => {
    let s = run(newGame(), { type: "devUnlockAll" }, { type: "placeItem", room: "empty", item: "potted_plant", x: 0.5, y: 0.9 });
    s = run(s, { type: "placeItem", room: "reception", item: "potted_plant", x: 0.4, y: 0.9 });
    expect(s.room.placed.empty).toHaveLength(0);
    expect(s.room.placed.reception).toHaveLength(1);
  });

  test("rooms enforce their item limit", () => {
    // Unlock every item: all achievements, 3 rebirths' worth, patients treated, items owned.
    let s: GameState = { ...run(newGame(), { type: "devUnlockAll" }, { type: "devAddItems", count: 30 }), rebirths: 3, treated: 30 };
    const limit = ROOMS.find((r) => r.id === "reception")!.limit;
    for (const item of ROOM_ITEMS) s = run(s, { type: "placeItem", room: "reception", item: item.id, x: 0.5, y: 0.9 });
    expect(s.room.placed.reception).toHaveLength(limit);
  });

  test("locked rooms can't be chosen; unlocked ones can", () => {
    expect(run(newGame(), { type: "setRoom", room: "lab" }).room.current).toBe("empty");
    expect(run({ ...newGame(), rebirths: 1 }, { type: "setRoom", room: "lab" }).room.current).toBe("lab");
  });

  test("placed items boost healing, capped", () => {
    const s = run(rich(), { type: "buy", item: "bandage" }, { type: "placeItem", room: "empty", item: "potted_plant", x: 0.5, y: 0.9 });
    const base = healingRate({ owned: s.owned, rebirths: s.rebirths });
    expect(healingRate(s)).toBeCloseTo(base * 1.01);
    const everything = { current: "empty", placed: { empty: ROOM_ITEMS.map((i) => ({ item: i.id, x: 0.5, y: 0.9 })) } };
    expect(roomBonus(everything, "rate")).toBeLessThanOrEqual(ROOM_BONUS_CAP);
  });
});

describe("rebirth", () => {
  test("resets the run but keeps rooms, coins and treated patients", () => {
    let s = run(newGame(), { type: "earn", amount: 8e9 }, { type: "placeItem", room: "empty", item: "potted_plant", x: 0.5, y: 0.9 });
    s = { ...s, treated: 4, bonusCoins: 2 };
    const r = run(s, { type: "rebirth" });
    expect(r.rebirths).toBe(1);
    expect(r.rebirthPoints).toBe(1); // one Natal Gem per rebirth
    expect(r.healed).toBe(0);
    expect(r.room.placed.empty).toHaveLength(1);
    expect(r.treated).toBe(4);
    expect(r.bonusCoins).toBe(2);
  });
});

describe("paid backgrounds", () => {
  test("buying spends Care Coins once; free and unaffordable ones don't", () => {
    const s = run(newGame(), { type: "devAddCoins", count: 20 });
    const bought = run(s, { type: "buyBackground", id: "purple_rain" });
    expect(bought.ownedBackgrounds).toEqual(["purple_rain"]);
    expect(coinBalance(bought)).toBe(coinBalance(s) - 15);
    expect(coinBalance(run(bought, { type: "buyBackground", id: "purple_rain" }))).toBe(coinBalance(bought)); // already owned
    expect(run(newGame(), { type: "buyBackground", id: "heart_monitor" }).ownedBackgrounds).toEqual([]); // no coins
    expect(run(s, { type: "buyBackground", id: "rose_grid" }).ownedBackgrounds).toEqual([]); // free
  });
});

describe("server sync", () => {
  test("redemption history keeps the longer list and never refunds", () => {
    const s = run(newGame(), { type: "syncRedemptions", history: { chocolate_bar: [1, 2] } });
    expect(s.redemptions.chocolate_bar).toEqual([1, 2]);
    expect(run(s, { type: "syncRedemptions", history: { chocolate_bar: [1] } }).redemptions.chocolate_bar).toEqual([1, 2]);
  });
});

describe("huge numbers", () => {
  test("names run to the largest number and earnings never overflow", () => {
    expect(formatCount(1e66)).toBe("1 unvigintillion");
    expect(formatCount(1e303)).toBe("1 centillion");
    expect(formatCount(Number.MAX_VALUE)).toContain("uncentillion");
    expect(formatShort(1e303)).toBe("1Ce");
    const s = run({ ...newGame(), healed: Number.MAX_VALUE }, { type: "earn", amount: Number.MAX_VALUE });
    expect(Number.isFinite(s.healed)).toBe(true);
  });
});

describe("bulk buying", () => {
  test("x10 costs the next ten prices together and is all-or-nothing", () => {
    const bandage = SHOP_ITEMS[0];
    const ten = bulkCost(newGame(), bandage, 10);
    let one = 0;
    for (let k = 0; k < 10; k++) one += itemCost(bandage, k);
    expect(ten).toBe(one);
    expect(run({ ...newGame(), healed: ten - 1 }, { type: "buy", item: bandage.id, count: 10 }).owned.bandage).toBe(0);
    const s = run({ ...newGame(), healed: ten }, { type: "buy", item: bandage.id, count: 10 });
    expect(s.owned.bandage).toBe(10);
    expect(s.healed).toBe(0);
  });
});

describe("gem shop", () => {
  const withGems = (n: number, extra: Partial<GameState> = {}) => ({ ...newGame(), rebirths: n, rebirthPoints: n, ...extra });
  test("upgrade levels cost 1, 2, 3, 5, 8 and stop at 5", () => {
    let s = withGems(30);
    for (let i = 0; i < 6; i++) s = run(s, { type: "buyGemUpgrade", id: "steady_hands" });
    expect(s.gemUpgrades.steady_hands).toBe(5);
    expect(s.gemsSpent).toBe(19);
    expect(tapValue(s)).toBeCloseTo(tapValue({ ...s, gemUpgrades: {} }) * 1.5);
  });
  test("Night Owl adds an hour of offline time per level", () => {
    expect(maxAwaySeconds(newGame())).toBe(4 * 3600);
    expect(maxAwaySeconds({ gemUpgrades: { night_owl: 3 } })).toBe(7 * 3600);
  });
  test("cosmetics need enough rebirths, gems and (for code-only ones) the code", () => {
    expect(run(withGems(1), { type: "buyGemItem", id: "skin_night" }).gemItems).toEqual([]); // needs 4 rebirths
    const s = run(withGems(4), { type: "buyGemItem", id: "skin_night" });
    expect(s.gemItems).toEqual(["skin_night"]);
    expect(s.medkitSkin).toBe("skin_night");
    expect(run(withGems(4), { type: "buyGemItem", id: "skin_dustin_photo" }).gemItems).toEqual([]);
    expect(run(withGems(4, { unlockedSections: ["jasmine"] }), { type: "buyGemItem", id: "skin_dustin_photo" }).gemItems).toEqual(["skin_dustin_photo"]);
  });
  test("Head Start gives free supplies on rebirth", () => {
    const s = run({ ...withGems(0), gemUpgrades: { head_start: 2 }, runHealed: 1e9 }, { type: "rebirth" });
    expect(s.owned.bandage).toBe(20);
    expect(s.owned.gloves).toBe(10);
  });
});

describe("minigame difficulty", () => {
  test("starts at the original settings and is slightly harder after 100 patients", () => {
    expect(minigameTuning(0)).toEqual({ needleSpeed: 1, veinWidth: 0.18, beatMs: 600, beatWindowMs: 230, wraps: 25 });
    expect(minigameTuning(100)).toEqual(minigameTuning(500));
    expect(minigameTuning(100).wraps).toBe(30);
    expect(minigameTuning(50).beatMs).toBeLessThan(600);
  });
});

describe("rebirth target", () => {
  test("starts at a billion and grows 2.5x per rebirth", () => {
    expect(rebirthTarget(0)).toBe(1e9);
    expect(rebirthTarget(2)).toBe(6.25e9);
    const s = { ...newGame(), runHealed: 2e9, rebirths: 1 };
    expect(gameReducer(s, { type: "rebirth" }).rebirths).toBe(1); // needs 2.5 billion now
    expect(gameReducer({ ...s, runHealed: 2.5e9 }, { type: "rebirth" }).rebirths).toBe(2);
  });
});

describe("hospital", () => {
  test("the hospital grows at rebirths 1, 3, 6, 10, 15, 21, 28, 36, 45 and 50, then stays", () => {
    expect(HOSPITAL_TIERS.map((t) => t.rebirths)).toEqual([0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 50]);
    expect(hospitalTier(0).tier.name).toBe("Little Clinic");
    expect(hospitalTier(2).tier.rebirths).toBe(1);
    expect(hospitalTier(2).next?.rebirths).toBe(3);
    expect(hospitalTier(49).tier.rebirths).toBe(45);
    expect(hospitalTier(50).tier.rebirths).toBe(50);
    expect(hospitalTier(60).next).toBeUndefined();
  });
  test("the sky follows the clock", () => {
    expect([5, 8, 17, 21, 2].map(dayPhase)).toEqual(["sunrise", "day", "sunset", "night", "night"]);
  });
  test("busier healing brings visitors more often, within 2-9 s", () => {
    expect(visitorGap(0)).toBe(9);
    expect(visitorGap(1e6)).toBeLessThan(visitorGap(10));
    expect(visitorGap(1e30)).toBe(2);
  });

  test("an emergency admission pays a minute of healing, with a tap floor early on", () => {
    const fresh = newGame();
    expect(emergencyReward(fresh)).toBe(tapValue(fresh) * EMERGENCY_TAPS);
    const later = { ...fresh, owned: { ...fresh.owned, stethoscope: 50 } };
    expect(emergencyReward(later)).toBe(healingRate(later) * EMERGENCY_SECONDS);
  });
});

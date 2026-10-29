import { describe, expect, test } from "bun:test";

import { MAX_CLIP_S, MAX_VEIL, MAX_ZOOM, framingFor, mediaFrame, parseSaved } from "@/lib/custom-bg-store";
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

describe("custom background framing", () => {
  test("an older save's bare photo address still loads, centred", () => {
    const old = parseSaved("file:///photo.jpg")!;
    expect([old.uri, old.kind, old.zoom, old.x, old.y]).toEqual(["file:///photo.jpg", "image", 1, 0, 0]);
    expect(parseSaved(null)).toBeNull();
    expect(parseSaved("{broken")).toBeNull();
  });
  test("saved numbers are kept in range", () => {
    const bg = parseSaved(JSON.stringify({ uri: "u", kind: "video", aspect: 0.5, zoom: 9, x: -4, y: 0.5, start: 2, length: 10, veil: 2 }))!;
    expect([bg.kind, bg.zoom, bg.x, bg.y, bg.start, bg.length, bg.veil]).toEqual(["video", MAX_ZOOM, -1, 0.5, 2, MAX_CLIP_S, MAX_VEIL]);
  });
  test("a new video plays its first 3 seconds (or all of a shorter one)", () => {
    expect(framingFor({ uri: "u", kind: "video", aspect: 1, duration: 12 }).length).toBe(3);
    expect(framingFor({ uri: "u", kind: "video", aspect: 1, duration: 1.5 }).length).toBe(1.5);
  });
  test("the media always covers the box, and x/y move it from edge to edge", () => {
    // A wide photo on a tall screen: as tall as the box, wider than it.
    const f = mediaFrame({ aspect: 2, zoom: 1, x: 0, y: 0 }, 100, 200);
    expect(f).toEqual({ left: -150, top: 0, width: 400, height: 200 });
    expect(mediaFrame({ aspect: 2, zoom: 1, x: 1, y: 0 }, 100, 200).left).toBe(0);
    expect(mediaFrame({ aspect: 2, zoom: 1, x: -1, y: 0 }, 100, 200).left).toBe(-300);
    // Zoomed in twice: twice as big, still centred.
    expect(mediaFrame({ aspect: 0.5, zoom: 2, x: 0, y: 0 }, 100, 200)).toEqual({ left: -50, top: -100, width: 200, height: 400 });
  });
});

import { describe, expect, mock, test } from "bun:test";

// The file pickers and storage are phone modules. The hash stands in for SHA-256: what's tested is
// that the signed data matches, so the plain text works as well.
mock.module("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_: string, s: string) => s,
}));
mock.module("@react-native-async-storage/async-storage", () => ({ default: {} }));
mock.module("expo-document-picker", () => ({}));
mock.module("expo-file-system", () => ({ Directory: class {}, File: class {}, Paths: {} }));
mock.module("expo-sharing", () => ({}));
mock.module("react-native", () => ({ Platform: { OS: "android" } }));

const { readSave, saveText } = await import("@/lib/save-file");
const { newGame } = await import("@/lib/game");
const { DEFAULT_SETTINGS } = await import("@/lib/storage");

const save = { state: { ...newGame(), healed: 1.5e40, bonusCoins: 12, ownedBackgrounds: ["custom"] }, settings: DEFAULT_SETTINGS, appIcon: null };

describe("signed saves", () => {
  for (const format of ["json", "csv", "phl"] as const) {
    test(`${format}: an exported save loads back`, async () => {
      const back = await readSave(`save.${format}`, await saveText(save, format));
      expect(back.state.healed).toBe(1.5e40);
      expect(back.state.bonusCoins).toBe(12);
      expect(back.settings).toEqual(DEFAULT_SETTINGS);
    });

    test(`${format}: a changed value is refused`, async () => {
      const text = await saveText(save, format);
      const edited = text.replace(/("?bonusCoins"?[:,]\s*)12/, "$199999");
      expect(edited).not.toBe(text);
      await expect(readSave(`save.${format}`, edited)).rejects.toThrow("changed outside the game");
    });
  }

  test("an unsigned (older) save is refused", async () => {
    const old = JSON.stringify({ ...save.state, settings: save.settings });
    await expect(readSave("save.json", old)).rejects.toThrow("changed outside the game");
  });
});

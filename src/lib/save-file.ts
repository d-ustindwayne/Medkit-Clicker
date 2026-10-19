import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { normalizeSave, type GameState } from "@/lib/game";

export type SaveFormat = "json" | "csv";

const MIME: Record<SaveFormat, string> = { json: "application/json", csv: "text/csv" };

const toCsv = (state: GameState) => {
  const rows: [string, string | number][] = [
    ["healed", state.healed],
    ["totalHealed", state.totalHealed],
    ["runHealed", state.runHealed],
    ["rebirths", state.rebirths],
    ["rebirthPoints", state.rebirthPoints],
    ["taps", state.taps],
    ["playSeconds", state.playSeconds],
    ["themeSwitches", state.themeSwitches],
    ["exports", state.exports],
    ["startedAt", state.startedAt],
    ["playlistsHeard", state.playlistsHeard.join(";")],
    ["coinsSpent", state.coinsSpent],
    ["luckyTaps", state.luckyTaps],
    ["bonusCoins", state.bonusCoins],
    ["treated", state.treated],
    ...Object.entries(state.boosts).map(([k, v]) => [`boosts.${k}`, v] as [string, number]),
    ...Object.entries(state.owned).map(([k, v]) => [`owned.${k}`, v] as [string, number]),
    ...Object.entries(state.achievements).map(([k, v]) => [`achievements.${k}`, v ?? 0] as [string, number]),
  ];
  return ["key,value", ...rows.map(([k, v]) => `${k},${v}`)].join("\n");
};

const fromCsv = (text: string): unknown => {
  const out: Record<string, unknown> = { owned: {}, achievements: {}, boosts: {} };
  for (const line of text.split(/\r?\n/).slice(1)) {
    const [key, value] = line.split(",");
    if (!key || value === undefined) continue;
    const [group, sub] = key.split(".");
    if (sub && (group === "owned" || group === "achievements" || group === "boosts")) {
      (out[group] as Record<string, number>)[sub] = Number(value);
    } else if (key === "playlistsHeard") {
      out.playlistsHeard = value ? value.split(";") : [];
    } else {
      out[key] = Number(value);
    }
  }
  return out;
};

/**
 * Android's folder picker opens here. (Android 11+ won't let apps pick the root of Download, so
 * Documents is the friendliest default; a subfolder of Download also works.)
 */
const ANDROID_START_FOLDER = "content://com.android.externalstorage.documents/tree/primary%3ADocuments";
/** Remembers the folder the player picked so later exports save in one tap. */
const EXPORT_FOLDER_KEY = "mc/exportFolder/v1";

async function writeToRememberedFolder(name: string, mime: string, content: string) {
  const uri = await AsyncStorage.getItem(EXPORT_FOLDER_KEY);
  if (!uri) return false;
  try {
    new Directory(uri).createFile(name, mime).write(content);
    return true;
  } catch (e) {
    console.warn("[export] remembered folder failed", uri, e);
    // Permission revoked or folder deleted: forget it and ask again.
    await AsyncStorage.removeItem(EXPORT_FOLDER_KEY);
    return false;
  }
}

/**
 * Saves the game to a file. Web downloads it; Android asks for a folder (Downloads by default) and
 * writes it there; iOS has no Downloads folder, so it opens the share sheet's "Save to Files".
 * Resolves to false if the user backed out.
 */
export async function exportSave(state: GameState, format: SaveFormat): Promise<boolean> {
  const content = format === "json" ? JSON.stringify(state, null, 2) : toCsv(state);
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const name = `medkit-clicker-save-${day}.${format}`;

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([content], { type: MIME[format] }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }

  if (Platform.OS === "android") {
    if (await writeToRememberedFolder(name, MIME[format], content)) return true;
    let folder: Directory;
    try {
      folder = await Directory.pickDirectoryAsync(ANDROID_START_FOLDER);
    } catch {
      return false; // picker dismissed
    }
    folder.createFile(name, MIME[format]).write(content);
    await AsyncStorage.setItem(EXPORT_FOLDER_KEY, folder.uri);
    return true;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: MIME[format], UTI: format === "json" ? "public.json" : "public.comma-separated-values-text" });
  return true;
}

const IMPORT_TYPES = ["application/json", "text/csv", "text/comma-separated-values", "text/plain", "application/octet-stream"];

/** Lets the player choose a save file and returns its name and text, or null if they cancelled. */
async function pickSaveText(): Promise<{ name: string; text: string } | null> {
  if (Platform.OS === "web") {
    const result = await DocumentPicker.getDocumentAsync({ type: IMPORT_TYPES });
    if (result.canceled || !result.assets[0].file) return null;
    return { name: result.assets[0].name, text: await result.assets[0].file.text() };
  }
  // File.pickFileAsync grants read access to the chosen file itself. (expo-document-picker's
  // cached copy can't be read inside Expo Go's sandbox.)
  const picked = await File.pickFileAsync({ mimeTypes: IMPORT_TYPES });
  if (picked.canceled) return null;
  return { name: picked.result.name, text: await picked.result.text() };
}

/** Opens a file picker; resolves to the save inside, or null if cancelled. Throws on unreadable files. */
export async function importSave(): Promise<GameState | null> {
  const picked = await pickSaveText();
  if (!picked) return null;
  const isCsv = picked.name.toLowerCase().endsWith(".csv") || picked.text.startsWith("key,value");
  let raw: unknown;
  try {
    raw = isCsv ? fromCsv(picked.text) : JSON.parse(picked.text);
  } catch {
    raw = null;
  }
  const state = normalizeSave(raw);
  if (!state) throw new Error("That file isn't a Medkit Clicker save. Choose a .json or .csv file exported from Settings.");
  return state;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { parse as parsePhl, stringify as stringifyPhl } from "phl-file";
import { Platform } from "react-native";

import { normalizeSave, type GameState } from "@/lib/game";
import { DEFAULT_SETTINGS, VOLUME_STEPS, type Settings } from "@/lib/storage";

export type SaveFormat = "json" | "csv" | "phl";

// PHL has no registered type, so it's sent as plain text.
const MIME: Record<SaveFormat, string> = { json: "application/json", csv: "text/csv", phl: "text/plain" };
const UTI: Record<SaveFormat, string> = { json: "public.json", csv: "public.comma-separated-values-text", phl: "public.plain-text" };

/** Everything a save file carries: the game, the settings (look, audio, vibration) and the app icon. */
export type SaveData = {
  state: GameState;
  settings: Partial<Settings> | null;
  /** The home-screen icon (null for the original); undefined in saves from before icons were saved. */
  appIcon?: string | null;
};

/** A CSV value: numbers as they are, anything else as URI-encoded JSON (no commas to break the CSV). */
const cell = (v: unknown) => (typeof v === "number" ? String(v) : encodeURIComponent(JSON.stringify(v)));
/** Every field gets a row. */
const toCsv = ({ state, settings, appIcon }: SaveData) => {
  const rows = [...Object.entries(state), ["settings", settings], ["appIcon", appIcon]].map(([k, v]) => `${k},${cell(v)}`);
  return ["key,value", ...rows].join("\n");
};

const fromCsv = (text: string): unknown => {
  const out: Record<string, unknown> = { owned: {}, achievements: {}, boosts: {} };
  for (const line of text.split(/\r?\n/).slice(1)) {
    const [key, value] = line.split(",");
    if (!key || value === undefined) continue;
    const [group, sub] = key.split(".");
    // Older CSV saves had one row per shop item, achievement and boost.
    if (sub && (group === "owned" || group === "achievements" || group === "boosts")) {
      (out[group] as Record<string, number>)[sub] = Number(value);
    } else if (value !== "" && !Number.isNaN(Number(value))) {
      out[key] = Number(value);
    } else {
      try {
        out[key] = JSON.parse(decodeURIComponent(value));
      } catch {
        // Older saves listed playlists as a;b;c. Anything else damaged is dropped; normalizeSave fills defaults.
        if (key === "playlistsHeard") out.playlistsHeard = value ? value.split(";") : [];
      }
    }
  }
  return out;
};

/**
 * Reads a PHL save. PHL has no true, false or null, so they're written as "true", "false" and "nil";
 * only those exact spellings are turned back (the library's own reading would also turn strings
 * such as "none", a game value, into null).
 */
const fromPhl = (text: string): unknown => {
  const back = (v: unknown): unknown =>
    v === "true" ? true : v === "false" ? false : v === "nil" ? null : Array.isArray(v) ? v.map(back) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, back(x)])) : v;
  return back(parsePhl(text, { coerce: false }));
};

/** A save's text read back into data, by its format. */
const readAs = (format: SaveFormat, text: string): unknown => (format === "csv" ? fromCsv(text) : format === "phl" ? fromPhl(text) : JSON.parse(text));

/**
 * Save files are signed, so a value changed by hand (medkits, coins, a background) is refused on
 * import. The signature is a SHA-256 of the key and the save's data as it reads back (keys sorted),
 * so it's the same for JSON, CSV and PHL. The key is set when the game is built (.env.local, and a
 * GitHub Actions secret for the web version). It ships inside the game, so this stops editing a file,
 * not someone who digs the key out of the game.
 */
const SAVE_KEY = process.env.EXPO_PUBLIC_SAVE_KEY ?? "";
const sorted = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted((v as Record<string, unknown>)[k])])) : v;
const signatureOf = (data: unknown) => digestStringAsync(CryptoDigestAlgorithm.SHA256, `${SAVE_KEY}\n${JSON.stringify(sorted(data))}`);

/** Keeps only settings fields of the right type and range, so a hand-edited file can't break the app. */
const readSettings = (raw: unknown): Partial<Settings> | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (typeof r[key] === typeof DEFAULT_SETTINGS[key]) (out as Record<string, unknown>)[key] = r[key];
  }
  if (out.theme !== undefined && out.theme !== "light" && out.theme !== "dark") delete out.theme;
  // Indexes and volume steps must be whole numbers in range (the background is checked against the
  // list where it's used, which wraps it).
  const whole = (v: number | undefined, max = Infinity) => v !== undefined && Number.isInteger(v) && v >= 0 && v <= max;
  if (out.background !== undefined && !whole(out.background)) delete out.background;
  if (out.playlist !== undefined && !whole(out.playlist)) delete out.playlist;
  if (out.musicVolume !== undefined && !whole(out.musicVolume, VOLUME_STEPS)) delete out.musicVolume;
  if (out.sfxVolume !== undefined && !whole(out.sfxVolume, VOLUME_STEPS)) delete out.sfxVolume;
  return out;
};

/**
 * Android's folder picker opens here. (Android 11+ won't let apps pick the root of Download, so
 * Documents is the friendliest default; a subfolder of Download also works.)
 */
const ANDROID_START_FOLDER = "content://com.android.externalstorage.documents/tree/primary%3ADocuments";
/** Older builds remembered the export folder; every export now asks, so the old entry is cleared. */
const OLD_EXPORT_FOLDER_KEY = "mc/exportFolder/v1";

/** The save as a file's text in `format`, signed. */
export async function saveText(data: SaveData, format: SaveFormat): Promise<string> {
  // JSON keeps the game fields at the top level, as older saves had them. PHL (github.com/d-ustindwayne/PHL)
  // holds the same fields; going through JSON first drops what JSON drops (undefined), which PHL can't write.
  const flat = JSON.parse(JSON.stringify({ ...data.state, settings: data.settings, appIcon: data.appIcon }));
  const write = (extra: Record<string, unknown>) => (format === "json" ? JSON.stringify({ ...flat, ...extra }, null, 2) : stringifyPhl({ ...flat, ...extra }));
  // Signed as it will read back, then written again with the signature as one more field (a last row in CSV).
  const signature = await signatureOf(readAs(format, format === "csv" ? toCsv(data) : write({})));
  return format === "csv" ? `${toCsv(data)}\nsignature,${cell(signature)}` : write({ signature });
}

/**
 * Saves the game to a file. Web downloads it; Android asks for a folder every time (Documents by default) and
 * writes it there; iOS has no Downloads folder, so it opens the share sheet's "Save to Files".
 * Resolves to false if the user backed out.
 */
export async function exportSave(data: SaveData, format: SaveFormat): Promise<boolean> {
  const content = await saveText(data, format);
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
    AsyncStorage.removeItem(OLD_EXPORT_FOLDER_KEY).catch(() => {});
    let folder: Directory;
    try {
      folder = await Directory.pickDirectoryAsync(ANDROID_START_FOLDER);
    } catch {
      return false; // picker dismissed
    }
    folder.createFile(name, MIME[format]).write(content);
    return true;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: MIME[format], UTI: UTI[format] });
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

/** Reads a save file's text (`name` tells its format). Throws if it isn't a save, or isn't signed by this game. */
export async function readSave(fileName: string, text: string): Promise<SaveData> {
  const name = fileName.toLowerCase();
  const isCsv = name.endsWith(".csv") || text.startsWith("key,value");
  // A PHL save by its name, or by not being JSON (a JSON save starts with "{").
  const isPhl = !isCsv && (name.endsWith(".phl") || name.endsWith(".pll") || !text.trimStart().startsWith("{"));
  let raw: unknown;
  try {
    raw = readAs(isCsv ? "csv" : isPhl ? "phl" : "json", text);
  } catch {
    raw = null;
  }
  // Only a save exactly as the game exported it is loaded: no signature (older saves too) or one
  // that doesn't match (a value was changed) is refused.
  if (raw && typeof raw === "object") {
    const { signature, ...data } = raw as Record<string, unknown>;
    if (typeof signature !== "string" || signature !== (await signatureOf(data))) {
      throw new Error("This save was changed outside the game, or comes from an older version, so it can't be loaded. Only saves exported from this version work.");
    }
    raw = data;
  }
  // The settings and icon ride along in the file but aren't part of the game state.
  const { settings: _settings, appIcon: _icon, ...game } = (raw ?? {}) as Record<string, unknown>;
  const state = normalizeSave(raw && typeof raw === "object" ? game : raw);
  if (!state) throw new Error("That file isn't a Medkit Clicker save. Choose a .json, .csv or .phl file exported from Settings.");
  const extra = raw as { settings?: unknown; appIcon?: unknown };
  // Without settings or an icon in the save, those stay as they are on this phone.
  return { state, settings: readSettings(extra.settings), appIcon: typeof extra.appIcon === "string" || extra.appIcon === null ? extra.appIcon : undefined };
}

/** Opens a file picker; resolves to the save inside, or null if cancelled. Throws on unreadable files. */
export async function importSave(): Promise<SaveData | null> {
  const picked = await pickSaveText();
  if (!picked) return null;
  return readSave(picked.name, picked.text);
}

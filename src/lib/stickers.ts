import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Asset as MediaAsset, getPermissionsAsync, requestPermissionsAsync } from "expo-media-library";
import { Platform } from "react-native";

import { STICKER_PNG } from "@/constants/sticker-data";

const FOLDER_KEY = "mc/stickers/folder/v1";
const ASKED_KEY = "mc/stickers/asked/v1";

/** The sticker PNG's bytes, from the copy kept in code (bundled images can't be read as files in release builds). */
function stickerBytes(id: string) {
  const b64 = STICKER_PNG[id];
  if (!b64) throw new Error("This sticker can't be saved yet.");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Asks for permission to add photos once, the first time the app opens, so saving a sticker just works later. */
export async function askPhotosOnce() {
  try {
    if (await AsyncStorage.getItem(ASKED_KEY)) return;
    await AsyncStorage.setItem(ASKED_KEY, "1");
    const now = await getPermissionsAsync(true, ["photo"]);
    if (!now.granted && now.canAskAgain) await requestPermissionsAsync(true, ["photo"]);
  } catch {
    // not available on this device: stickers fall back to a folder
  }
}

/**
 * Saves a sticker PNG (`id` is its file name in src/imgs/stickers).
 * 1. To the phone's photos, when the photo permission is given.
 * 2. Otherwise (Android), into a folder the player picks once (Pictures, Downloads...), written
 *    directly, so no photo permission is needed. The folder is remembered for next time.
 * Returns where it went, or "cancelled" if no folder was picked.
 */
export async function saveSticker(id: string, name: string): Promise<"photos" | "folder" | "cancelled"> {
  const bytes = stickerBytes(id);
  const fileName = `medkit-clicker-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  try {
    const permission = await requestPermissionsAsync(true, ["photo"]);
    if (permission.granted) {
      const file = new File(Paths.cache, `${fileName}.png`);
      file.create({ overwrite: true });
      file.write(bytes);
      await MediaAsset.create(file.uri);
      return "photos";
    }
  } catch {
    // fall back to a folder below
  }
  if (Platform.OS !== "android") throw new Error("Photos access is needed to save stickers.");

  const write = (dir: Directory) => dir.createFile(fileName, "image/png").write(bytes);
  const saved = await AsyncStorage.getItem(FOLDER_KEY);
  if (saved) {
    try {
      write(new Directory(saved));
      return "folder";
    } catch {
      await AsyncStorage.removeItem(FOLDER_KEY); // folder gone or access revoked: ask again
    }
  }
  try {
    const dir = await Directory.pickDirectoryAsync();
    write(dir);
    await AsyncStorage.setItem(FOLDER_KEY, dir.uri);
    return "folder";
  } catch {
    return "cancelled";
  }
}

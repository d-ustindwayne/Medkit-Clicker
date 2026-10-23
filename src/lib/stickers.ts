import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Album, Asset as MediaAsset, getPermissionsAsync, requestPermissionsAsync } from "expo-media-library";
import { Platform } from "react-native";

import { STICKER_PNG } from "@/constants/sticker-data";

const FOLDER_KEY = "mc/stickers/folder/v1";
const ASKED_KEY = "mc/stickers/asked/v1";
/** Saved stickers go in their own album (Pictures/mcstickers on Android). */
export const STICKER_ALBUM = "mcstickers";

/** Adds a picture file to the sticker album, making the album the first time. */
async function addToAlbum(uri: string) {
  if (Platform.OS === "android") {
    // Writes the file into Pictures/mcstickers; works whether or not the album exists yet.
    await Album.create(STICKER_ALBUM, [uri]);
    return;
  }
  const asset = await MediaAsset.create(uri);
  const album = await Album.get(STICKER_ALBUM);
  if (album) await album.add(asset);
  else await Album.create(STICKER_ALBUM, [asset], false);
}

/** The sticker PNG's bytes, from the copy kept in code (bundled images can't be read as files in release builds). */
function stickerBytes(id: string) {
  const b64 = STICKER_PNG[id];
  if (!b64) throw new Error("This sticker can't be saved yet.");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Android 11+ lets an app add its own pictures to the gallery without any permission, and asking for
 * one there is pointless: the storage permission is retired, so the system denies it without asking.
 */
const needsPermission = Platform.OS !== "android" || Number(Platform.Version) < 30;

/** Asks for permission to add photos once, the first time the app opens, so saving a sticker just works later. */
export async function askPhotosOnce() {
  if (!needsPermission) return;
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
 * 1. To the phone's photos, in the "mcstickers" album: no permission needed on Android 11+, otherwise
 *    when the photo permission is given.
 * 2. Otherwise (Android), into a folder the player picks once (Pictures, Downloads...), written
 *    directly, so no photo permission is needed. The folder is remembered for next time.
 * Returns where it went, or "cancelled" if no folder was picked.
 */
export async function saveSticker(id: string, name: string): Promise<"photos" | "folder" | "download" | "cancelled"> {
  const bytes = stickerBytes(id);
  const fileName = `medkit-clicker-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  let problem: unknown = null;
  try {
    const allowed = !needsPermission || (await requestPermissionsAsync(true, ["photo"])).granted;
    if (allowed) {
      const file = new File(Paths.cache, `${fileName}.png`);
      file.create({ overwrite: true });
      file.write(bytes);
      try {
        await addToAlbum(file.uri);
      } finally {
        file.delete();
      }
      return "photos";
    }
  } catch (e) {
    problem = e; // fall back to a folder below
  }
  if (Platform.OS !== "android") throw problem instanceof Error ? problem : new Error("Photos access is needed to save stickers.");

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

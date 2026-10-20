import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { Directory, File } from "expo-file-system";
import { Asset as MediaAsset, requestPermissionsAsync } from "expo-media-library";
import { Platform } from "react-native";

const FOLDER_KEY = "mc/stickers/folder/v1";

/** A bundled image copied to a real file in the app's cache (bundled images live inside the app). */
async function stickerFile(source: number) {
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

/**
 * Saves a bundled sticker PNG.
 * 1. To the phone's photos, when the photo permission is given.
 * 2. Otherwise (Android), into a folder the player picks once (Pictures, Downloads...), written
 *    directly, so no photo permission is needed. The folder is remembered for next time.
 * Returns where it went, or "cancelled" if no folder was picked.
 */
export async function saveSticker(source: number, name: string): Promise<"photos" | "folder" | "cancelled"> {
  const uri = await stickerFile(source);
  try {
    const permission = await requestPermissionsAsync(true, ["photo"]);
    if (permission.granted) {
      await MediaAsset.create(uri);
      return "photos";
    }
  } catch {
    // fall back to a folder below
  }
  if (Platform.OS !== "android") throw new Error("Photos access is needed to save stickers.");

  const bytes = await new File(uri).bytes();
  const fileName = `medkit-clicker-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
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

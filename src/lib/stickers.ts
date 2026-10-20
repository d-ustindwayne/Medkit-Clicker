import { Asset } from "expo-asset";
import { Asset as MediaAsset, requestPermissionsAsync } from "expo-media-library";
import * as Sharing from "expo-sharing";

/**
 * Saves a bundled sticker PNG to the phone's photos. If that isn't possible (permission refused,
 * or this Android version won't take the file), it opens the share sheet instead, where "Save
 * image" or a gallery app works too. Returns how it went.
 */
export async function saveSticker(source: number): Promise<"saved" | "shared" | "failed"> {
  // Bundled images live inside the app; this copies one to a real file in the cache first.
  const file = Asset.fromModule(source);
  await file.downloadAsync();
  const uri = file.localUri ?? file.uri;
  try {
    const permission = await requestPermissionsAsync(true, ["photo"]);
    if (permission.granted) {
      await MediaAsset.create(uri);
      return "saved";
    }
  } catch {
    // fall through to sharing
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Save sticker" });
    return "shared";
  }
  return "failed";
}

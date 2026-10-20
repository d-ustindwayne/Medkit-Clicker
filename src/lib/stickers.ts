import { Asset } from "expo-asset";
import { Asset as MediaAsset, requestPermissionsAsync } from "expo-media-library";

/**
 * Saves a bundled sticker PNG to the phone's photos. Asks for write-only access to photos the first
 * time. Returns false if permission was refused.
 */
export async function saveSticker(source: number) {
  const permission = await requestPermissionsAsync(true, ["photo"]);
  if (!permission.granted) return false;
  const file = Asset.fromModule(source);
  await file.downloadAsync();
  await MediaAsset.create(file.localUri ?? file.uri);
  return true;
}

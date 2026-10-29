// The player's own background photo (phones): picked from the gallery, copied into the app's files,
// and its address kept in storage. The web version is custom-bg.web.ts.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { setCustomBackground } from "@/lib/custom-bg-store";

const KEY = "mc/custom-bg/v1";

/** Loads the saved photo (if any) into the store; called once at start-up. */
export async function loadCustomBackground() {
  try {
    const uri = await AsyncStorage.getItem(KEY);
    setCustomBackground(uri && new File(uri).exists ? uri : null);
  } catch {
    setCustomBackground(null);
  }
}

/** Lets the player pick a photo and keeps a copy. Resolves to false if they cancelled. */
export async function pickCustomBackground(): Promise<boolean> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return false;
  const old = await AsyncStorage.getItem(KEY).catch(() => null);
  // A new name each time, so the image cache never shows the previous photo.
  const copy = new File(Paths.document, `custom-bg-${Date.now()}.jpg`);
  new File(asset.uri).copy(copy);
  await AsyncStorage.setItem(KEY, copy.uri);
  setCustomBackground(copy.uri);
  if (old && old !== copy.uri) {
    try {
      new File(old).delete();
    } catch {}
  }
  return true;
}

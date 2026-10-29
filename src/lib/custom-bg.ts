// The player's own background (phones): a photo, GIF or video picked from the gallery, copied into
// the app's files, with its framing kept in storage. The web version is custom-bg.web.ts.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { parseSaved, setCustomBackground, type CustomBg, type PickedMedia } from "@/lib/custom-bg-store";

const KEY = "mc/custom-bg/v1";
/** Bigger videos are turned away: only a 3-second clip of them is ever shown. */
const MAX_VIDEO_MB = 60;

/** Loads the saved background (if any) into the store; called once at start-up. */
export async function loadCustomBackground() {
  try {
    const bg = parseSaved(await AsyncStorage.getItem(KEY));
    setCustomBackground(bg && new File(bg.uri).exists ? bg : null);
  } catch {
    setCustomBackground(null);
  }
}

/** Lets the player pick a photo, GIF or video. Resolves to null if they cancelled. */
export async function pickCustomMedia(): Promise<PickedMedia | null> {
  // No editing or re-compressing: that would flatten a GIF to one frame. Framing is done in the game.
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 1, allowsEditing: false });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  const video = asset.type === "video";
  if (video && (asset.fileSize ?? 0) > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`That video is too big. Pick one under ${MAX_VIDEO_MB} MB.`);
  return { uri: asset.uri, kind: video ? "video" : "image", aspect: asset.width && asset.height ? asset.width / asset.height : 0, duration: (asset.duration ?? 0) / 1000 };
}

/**
 * Keeps the background: newly picked media is copied into the app's files (a new name each time, so
 * the image cache never shows the old one); a re-framed one just saves its new framing.
 */
export async function saveCustomBackground(bg: CustomBg) {
  const old = parseSaved(await AsyncStorage.getItem(KEY).catch(() => null));
  let uri = bg.uri;
  if (!old || old.uri !== bg.uri) {
    const ext = bg.uri.split("?")[0].match(/\.(\w{2,5})$/)?.[1]?.toLowerCase() ?? (bg.kind === "video" ? "mp4" : "jpg");
    const copy = new File(Paths.document, `custom-bg-${Date.now()}.${ext}`);
    new File(bg.uri).copy(copy);
    uri = copy.uri;
  }
  const saved = { ...bg, uri };
  await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  setCustomBackground(saved);
  if (old && old.uri !== uri) {
    try {
      new File(old.uri).delete();
    } catch {}
  }
}

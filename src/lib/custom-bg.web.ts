// The player's own background photo (web): picked with the browser's file chooser, scaled down to
// at most 1600 px and kept in the browser's storage as a JPEG data URL.
import { setCustomBackground } from "@/lib/custom-bg-store";

const KEY = "mc/custom-bg/v1";
const MAX_SIDE = 1600;

export async function loadCustomBackground() {
  try {
    setCustomBackground(localStorage.getItem(KEY));
  } catch {
    setCustomBackground(null);
  }
}

const chooseFile = () =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // No change event fires when the chooser is cancelled; focus coming back is the sign.
    window.addEventListener("focus", () => setTimeout(() => resolve(null), 800), { once: true });
    input.click();
  });

/** Scales a picked image down and encodes it as a JPEG data URL. */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function pickCustomBackground(): Promise<boolean> {
  const file = await chooseFile();
  if (!file) return false;
  const url = await shrink(file);
  try {
    localStorage.setItem(KEY, url);
  } catch {
    // Storage full: it still shows until the page is closed.
  }
  setCustomBackground(url);
  return true;
}

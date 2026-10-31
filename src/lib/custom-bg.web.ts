// The player's own background (web): a photo, GIF or video picked with the browser's file chooser.
// Photos are scaled down to at most 1600 px; the file is kept in the browser's IndexedDB (too big
// for localStorage) and its framing in localStorage.
import { parseSaved, setCustomBackground, type CustomBg, type PickedMedia } from "@/lib/custom-bg-store";

const KEY = "mc/custom-bg/v1";
const MAX_SIDE = 1600;
const MAX_VIDEO_MB = 40;
/** Where the file is kept: this marker in the saved framing, the file itself in IndexedDB. */
const STORED = "idb:custom-bg";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("mc-media", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction("files", mode).objectStore("files"));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export async function loadCustomBackground() {
  try {
    const bg = parseSaved(localStorage.getItem(KEY));
    if (!bg) return setCustomBackground(null);
    if (bg.uri !== STORED) return setCustomBackground(bg); // an older save's photo, kept as a data URL
    const blob = await idb<Blob | undefined>("readonly", (s) => s.get("custom-bg"));
    setCustomBackground(blob ? { ...bg, uri: URL.createObjectURL(blob) } : null);
  } catch {
    setCustomBackground(null);
  }
}

const chooseFile = () =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // No change event fires when the chooser is cancelled; focus coming back is the sign.
    window.addEventListener("focus", () => setTimeout(() => resolve(null), 800), { once: true });
    input.click();
  });

/** Picture types that can be see-through; they're kept see-through instead of turning black as a JPEG. */
const SEE_THROUGH = ["image/png", "image/webp", "image/avif", "image/svg+xml", "image/apng"];

/**
 * Scales a photo down. A see-through one is encoded as a WebP (a PNG in browsers without WebP),
 * so the backing colour shows through it; anything else as a JPEG.
 */
async function shrink(bitmap: ImageBitmap, seeThrough: boolean) {
  const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), seeThrough ? "image/webp" : "image/jpeg", 0.85));
}

/** A video's size and length, read from its metadata. */
const videoInfo = (url: string) =>
  new Promise<{ aspect: number; duration: number }>((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve({ aspect: v.videoHeight ? v.videoWidth / v.videoHeight : 0, duration: v.duration || 0 });
    v.onerror = () => reject(new Error("Couldn't play that video. Try an MP4 or WebM."));
    v.src = url;
  });

/** Picked files waiting to be kept, by their preview address. */
const pending = new Map<string, Blob>();

export async function pickCustomMedia(): Promise<PickedMedia | null> {
  const file = await chooseFile();
  if (!file) return null;
  if (file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`That video is too big. Pick one under ${MAX_VIDEO_MB} MB.`);
    const uri = URL.createObjectURL(file);
    pending.set(uri, file);
    return { uri, kind: "video", ...(await videoInfo(uri)) };
  }
  const bitmap = await createImageBitmap(file);
  const aspect = bitmap.height ? bitmap.width / bitmap.height : 0;
  // A GIF is kept as it is, so it stays animated.
  const blob = file.type === "image/gif" ? file : await shrink(bitmap, SEE_THROUGH.includes(file.type));
  const uri = URL.createObjectURL(blob);
  pending.set(uri, blob);
  return { uri, kind: "image", aspect, duration: 0 };
}

export async function saveCustomBackground(bg: CustomBg) {
  const blob = pending.get(bg.uri);
  if (blob) {
    await idb("readwrite", (s) => s.put(blob, "custom-bg"));
    pending.clear();
  }
  // A re-framed older photo (a data URL) keeps its address; everything else lives in IndexedDB.
  const stored = bg.uri.startsWith("data:") ? bg : { ...bg, uri: STORED };
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Storage full: it still shows until the page is closed.
  }
  setCustomBackground(bg);
}

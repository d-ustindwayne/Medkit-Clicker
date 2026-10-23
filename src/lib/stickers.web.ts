import { STICKER_PNG } from "@/constants/sticker-data";

// The web version (the website's play page): there's no photo library, so a sticker is downloaded
// as a PNG instead. Phones use ./stickers.ts.

export const STICKER_ALBUM = "mcstickers";

export async function askPhotosOnce() {}

export async function saveSticker(id: string, name: string): Promise<"photos" | "folder" | "download" | "cancelled"> {
  const b64 = STICKER_PNG[id];
  if (!b64) throw new Error("This sticker can't be saved yet.");
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${b64}`;
  link.download = `medkit-clicker-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return "download";
}

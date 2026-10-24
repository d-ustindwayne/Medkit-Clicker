// The web version (the website's play page) has no file system, so downloaded songs are kept in the
// browser's Cache Storage, which holds large files and survives closing the tab. Phones use
// ./music-store.ts. A song is known by a key (a made-up URL inside the cache), and is played from a
// blob: address made from the stored copy each time the game loads.

const CACHE = "mc-music-v1";
const keyFor = (playlistId: string, name: string) => new URL(`/mc-music/${playlistId}/${name}`, location.origin).href;

/** Asks the browser not to clear the songs when space runs low (it may still say no). */
const keepStored = () => navigator.storage?.persist?.().catch(() => false);

/** Deletes every downloaded song. */
export async function clearMusicStore() {
  try {
    await caches.delete(CACHE);
  } catch {
    // storage blocked (a private window)
  }
}

/** The songs (by key) that are really stored, as addresses the player can open, in order. */
export async function playableTracks(keys: string[]): Promise<string[]> {
  try {
    const cache = await caches.open(CACHE);
    const urls: string[] = [];
    for (const key of keys) {
      const hit = await cache.match(key);
      if (hit) urls.push(URL.createObjectURL(await hit.blob()));
    }
    return urls;
  } catch {
    return [];
  }
}

/** Downloads one song unless it's already stored at the right size, and returns its key. */
export async function storeTrack(playlistId: string, name: string, size: number, url: string, token: string): Promise<string> {
  const key = keyFor(playlistId, name);
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key);
  if (hit && (await hit.clone().blob()).size === size) return key;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Couldn't download a song (server error ${res.status}).`);
  const blob = await res.blob();
  await cache.put(key, new Response(blob, { headers: { "content-type": res.headers.get("content-type") ?? "audio/mp4" } }));
  void keepStored();
  return key;
}

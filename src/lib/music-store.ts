import { Directory, File, Paths } from "expo-file-system";

// Where downloaded songs live on the phone: files in the app's documents folder. The web version
// keeps them in the browser instead (./music-store.web.ts). A song is known by a key: here, its file URI.

const musicDir = () => new Directory(Paths.document, "music");

/** Deletes every downloaded song. */
export async function clearMusicStore() {
  try {
    const dir = musicDir();
    if (dir.exists) dir.delete();
  } catch {
    // already gone
  }
}

/** The songs (by key) that are really stored, as addresses the player can open, in order. */
export async function playableTracks(keys: string[]): Promise<string[]> {
  return keys.filter((uri) => new File(uri).exists);
}

/**
 * Downloads one song unless it's already stored at the right size, and returns its key. The name
 * carries the song's checksum, so a changed song downloads again.
 */
export async function storeTrack(playlistId: string, name: string, size: number, url: string, token: string): Promise<string> {
  const dir = new Directory(musicDir(), playlistId);
  if (!dir.exists) dir.create({ intermediates: true });
  const file = new File(dir, name);
  if (!file.exists || file.size !== size) {
    if (file.exists) file.delete();
    await File.downloadFileAsync(url, file, { headers: { authorization: `Bearer ${token}` }, idempotent: true });
  }
  return file.uri;
}

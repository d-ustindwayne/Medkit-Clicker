import type { AudioSource } from "expo-audio";

import { TRACKS } from "@/audio/bundle";

export type Playlist = { id: string; name: string; tracks: AudioSource[] };

// Every track of each playlist, from the bundle built by `bun run music` (src/audio/bundle, gitignored).
// Playlists with no tracks in the bundle are left out.
const PLAYLIST_NAMES: [id: string, name: string][] = [
  ["cup_of_joe", "Cup of Joe"],
  ["love", "Love Songs"],
  ["filipino_rap", "Pinoy Rap"],
  ["favourites", "My Favs"],
  ["lo-fi", "Lo-fi"],
  ["normal", "Everyday"],
];

export const PLAYLISTS: Playlist[] = PLAYLIST_NAMES.map(([id, name]) => ({ id, name, tracks: TRACKS[id] ?? [] })).filter((p) => p.tracks.length > 0);

export const SFX = {
  click: require("@/audio/sfx/click.mp3"),
  medkit: require("@/audio/sfx/click_medkit.mp3"),
  buy: require("@/audio/sfx/buy_valid.mp3"),
  invalid: require("@/audio/sfx/buy_invalid.mp3"),
} satisfies Record<string, AudioSource>;

export type SfxName = keyof typeof SFX;

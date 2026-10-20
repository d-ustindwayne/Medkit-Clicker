import type { AudioSource } from "expo-audio";

import { TRACKS } from "@/audio/bundle";
import { PLAYLIST_NAMES } from "@/constants/playlist-names";

export type Playlist = { id: string; name: string; tracks: AudioSource[] };

// Music normally downloads from the server after Jasmine's code (src/lib/cloud.ts). Songs bundled
// with `BUNDLE=1 bun run music` (src/audio/bundle, gitignored) are for offline testing only.
export const BUNDLED_PLAYLISTS: Playlist[] = PLAYLIST_NAMES.map(([id, name]) => ({ id, name, tracks: TRACKS[id] ?? [] })).filter((p) => p.tracks.length > 0);

// The game's own soundtrack, made in BeepBox (sources in src/audio/soundtrack/beepbox), ships with
// every install and plays first. Each track is a seamless 2-minute loop.
export const SOUNDTRACK: Playlist = {
  id: "soundtrack",
  name: "Medkit Clicker OST",
  tracks: [require("@/audio/soundtrack/waiting_room.mp3"), require("@/audio/soundtrack/night_shift.mp3"), require("@/audio/soundtrack/recovery_room.mp3")],
};

export const SFX = {
  click: require("@/audio/sfx/click.mp3"),
  medkit: require("@/audio/sfx/click_medkit.mp3"),
  buy: require("@/audio/sfx/buy_valid.mp3"),
  invalid: require("@/audio/sfx/buy_invalid.mp3"),
};

export type SfxName = keyof typeof SFX;

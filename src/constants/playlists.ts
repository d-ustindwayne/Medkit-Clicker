import type { AudioSource } from "expo-audio";

export type Playlist = { id: string; name: string; tracks: AudioSource[] };

// Tracks come from src/audio/bundle, which is built (and gitignored) by `bun run music`.
export const PLAYLISTS: Playlist[] = [
  {
    id: "cup_of_joe",
    name: "Cup of Joe",
    tracks: [
      require("@/audio/bundle/cup_of_joe/track_1.mp3"),
      require("@/audio/bundle/cup_of_joe/track_2.mp3"),
      require("@/audio/bundle/cup_of_joe/track_3.mp3"),
    ],
  },
  {
    id: "love",
    name: "Love Songs",
    tracks: [
      require("@/audio/bundle/love/track_1.mp3"),
      require("@/audio/bundle/love/track_2.mp3"),
      require("@/audio/bundle/love/track_3.mp3"),
    ],
  },
  {
    id: "filipino_rap",
    name: "Pinoy Rap",
    tracks: [
      require("@/audio/bundle/filipino_rap/track_1.mp3"),
      require("@/audio/bundle/filipino_rap/track_2.mp3"),
      require("@/audio/bundle/filipino_rap/track_3.mp3"),
    ],
  },
  {
    id: "favourites",
    name: "My Favs",
    tracks: [
      require("@/audio/bundle/favourites/track_1.mp3"),
      require("@/audio/bundle/favourites/track_2.mp3"),
      require("@/audio/bundle/favourites/track_3.mp3"),
    ],
  },
  {
    id: "lo-fi",
    name: "Lo-fi",
    tracks: [require("@/audio/bundle/lo-fi/track_1.mp3"), require("@/audio/bundle/lo-fi/track_2.mp3")],
  },
  {
    id: "normal",
    name: "Everyday",
    tracks: [
      require("@/audio/bundle/normal/track_1.mp3"),
      require("@/audio/bundle/normal/track_2.mp3"),
      require("@/audio/bundle/normal/track_3.mp3"),
    ],
  },
];

export const SFX = {
  click: require("@/audio/sfx/click.mp3"),
  medkit: require("@/audio/sfx/click_medkit.mp3"),
  buy: require("@/audio/sfx/buy_valid.mp3"),
  invalid: require("@/audio/sfx/buy_invalid.mp3"),
} satisfies Record<string, AudioSource>;

export type SfxName = keyof typeof SFX;

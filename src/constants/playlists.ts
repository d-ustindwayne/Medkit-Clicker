import type { AudioSource } from "expo-audio";

export type Playlist = { id: string; name: string; tracks: AudioSource[] };

// The game's own soundtrack, made in BeepBox (sources in src/audio/soundtrack/beepbox), ships with
// every install and plays first. Each track is a seamless 2-minute loop.
export const SOUNDTRACK: Playlist = {
  id: "soundtrack",
  name: "Medkit Clicker OST",
  tracks: [
    require("@/audio/soundtrack/waiting_room.mp3"),
    require("@/audio/soundtrack/morning_rounds.mp3"),
    require("@/audio/soundtrack/night_shift.mp3"),
    require("@/audio/soundtrack/visiting_hours.mp3"),
    require("@/audio/soundtrack/recovery_room.mp3"),
  ],
};

export const SFX = {
  click: require("@/audio/sfx/click.mp3"),
  medkit: require("@/audio/sfx/click_medkit.mp3"),
  // Gem Shop tap effects play their own tap sound instead of the medkit's.
  tap_hearts: require("@/audio/sfx/tap_hearts.mp3"),
  tap_sparkles: require("@/audio/sfx/tap_sparkles.mp3"),
  tap_bubbles: require("@/audio/sfx/tap_bubbles.mp3"),
  buy: require("@/audio/sfx/buy_valid.mp3"),
  invalid: require("@/audio/sfx/buy_invalid.mp3"),
};

export type SfxName = keyof typeof SFX;

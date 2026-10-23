import { AppState } from "react-native";
import { AudioContext, type AudioBuffer, type GainNode } from "react-native-audio-api";

import { SFX, type SfxName } from "@/constants/playlists";

// Sound effects on phones go through react-native-audio-api: each sound is decoded once, then
// every play is a tiny buffer node mixed on the audio engine's own thread. expo-audio, which still
// plays the music, runs every play and seek on Android's main thread, which made fast tapping
// drop frames. (Web uses ./sfx.ts, which leaves sound effects to expo-audio.)

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
const buffers: Partial<Record<SfxName, AudioBuffer>> = {};

/** Starts the engine and decodes every sound effect. Safe to call more than once. */
export function initSfx() {
  if (ctx) return;
  try {
    ctx = new AudioContext();
    out = ctx.createGain();
    out.connect(ctx.destination);
    for (const name of Object.keys(SFX) as SfxName[]) {
      ctx
        .decodeAudioData(SFX[name])
        .then((b) => {
          if (b) buffers[name] = b;
        })
        .catch(() => {});
    }
    // The engine keeps an audio stream open; let it sleep while the app is in the background.
    AppState.addEventListener("change", (s) => {
      if (s === "active") ctx?.resume().catch(() => {});
      else ctx?.suspend().catch(() => {});
    });
  } catch {
    ctx = null;
    out = null;
  }
}

export function setSfxVolume(volume: number) {
  if (out) out.gain.value = volume;
}

/** Plays a sound effect. False when the engine or that sound isn't ready (the caller falls back). */
export function playSfxFast(name: SfxName) {
  const buffer = buffers[name];
  if (!ctx || !out || !buffer) return false;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(out);
  source.start();
  return true;
}

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

import PixelIcon from "@/components/PixelIcon.vue";
import { audioLevel } from "@/lib/audioLevel";
import { TRACKS } from "@/lib/content";

const BARS = 7;
const playing = ref<number | null>(null);
const progress = ref(0);
const bars = ref<number[]>(new Array(BARS).fill(0));
let audio: HTMLAudioElement | null = null;

// The equaliser reads the music itself, so the bars move with the song.
let context: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let data: Uint8Array<ArrayBuffer> | null = null;
let frame = 0;

function listen(el: HTMLAudioElement) {
  try {
    context ??= new AudioContext();
    if (!analyser) {
      analyser = context.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      analyser.connect(context.destination);
      data = new Uint8Array(analyser.frequencyBinCount);
    }
    context.createMediaElementSource(el).connect(analyser);
    void context.resume();
  } catch {
    // Without Web Audio the music still plays; the bars just stay flat.
  }
}

function tick() {
  frame = requestAnimationFrame(tick);
  if (!analyser || !data) return;
  analyser.getByteFrequencyData(data);
  // Group the low and middle frequencies into a few chunky bars, snapped to 5 steps like pixels.
  const next: number[] = [];
  let sum = 0;
  for (let b = 0; b < BARS; b++) {
    const v = (data[b * 2 + 1] + data[b * 2 + 2]) / 510;
    sum += v;
    next.push(Math.round(v * 5) / 5);
  }
  bars.value = next;
  audioLevel.value = Math.min(1, (sum / BARS) * 1.4);
}

function stop() {
  cancelAnimationFrame(frame);
  bars.value = new Array(BARS).fill(0);
  audioLevel.value = 0;
}

function toggle(i: number) {
  if (playing.value === i && audio) {
    audio.pause();
    playing.value = null;
    stop();
    return;
  }
  audio?.pause();
  audio = new Audio(TRACKS[i].src);
  audio.loop = true;
  audio.volume = 0.7;
  audio.addEventListener("timeupdate", () => {
    if (audio?.duration) progress.value = audio.currentTime / audio.duration;
  });
  listen(audio);
  progress.value = 0;
  playing.value = i;
  cancelAnimationFrame(frame);
  tick();
  audio.play().catch(() => {
    playing.value = null;
    stop();
  });
}

onBeforeUnmount(() => {
  audio?.pause();
  stop();
  void context?.close();
});
</script>

<template>
  <ol class="tracks">
    <li v-for="(t, i) in TRACKS" :key="t.title" class="track" :class="{ on: playing === i }">
      <button type="button" class="play" :aria-label="playing === i ? `Pause ${t.title}` : `Play ${t.title}`" @click="toggle(i)">
        <PixelIcon :name="playing === i ? 'pause' : 'play'" :size="14" />
      </button>
      <span class="title">{{ t.title }}<span v-if="t.note" class="note">, {{ t.note }}</span></span>
      <span v-if="playing === i" class="eq" aria-hidden="true">
        <span v-for="(h, b) in bars" :key="b" :style="{ height: `${Math.max(0.2, h) * 100}%` }"></span>
      </span>
      <span class="bar" aria-hidden="true"><span :style="{ width: playing === i ? `${progress * 100}%` : '0%' }"></span></span>
    </li>
  </ol>
</template>

<style scoped lang="scss">
.tracks {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
  border: 3px solid var(--outline);
}
.track {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.25rem 0.9rem;
  padding: 0.6rem 0.8rem;
  background: var(--surface);
  & + & {
    border-top: 2px solid var(--outline);
  }
  &.on {
    background: var(--accent);
  }
}
.play {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border: 2px solid var(--outline);
  box-shadow: 2px 2px 0 var(--shadow);
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  &:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
}
.title {
  font-weight: 700;
}
.note {
  font-weight: 400;
  color: var(--muted);
}
.bar {
  grid-column: 2 / 4;
  height: 4px;
  background: color-mix(in srgb, var(--outline) 15%, transparent);
  span {
    display: block;
    height: 100%;
    background: var(--ink);
  }
}
.track:not(.on) .bar {
  display: none;
}
.eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 20px;
  span {
    width: 4px;
    background: var(--ink);
  }
}
</style>

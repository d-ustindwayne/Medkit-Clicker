<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { useInView } from "@/composables/useInView";
import { useReducedMotion } from "@/composables/useReducedMotion";
import { dayPhase, HOSPITAL_TIERS, SCENE, SKIES, STREET, type DayPhase } from "@/lib/content";

// The game's Hospital page in miniature: the look for each rebirth, a sky that follows the visitor's clock,
// drifting clouds, two lanes of traffic, visitors walking to the door, and now and then an ambulance to admit.

const emit = defineEmits<{ admit: [x: number, y: number] }>();

const W = SCENE.w;
const H = SCENE.h;
const pctX = (x: number) => `${(x / W) * 100}%`;
const pctY = (y: number) => `${(y / H) * 100}%`;

const tier = ref(0);
const current = computed(() => HOSPITAL_TIERS[tier.value]);
const phase = ref<DayPhase>(dayPhase(new Date().getHours()));
const sky = computed(() => SKIES[phase.value]);

const root = ref<HTMLElement>();
const { visible } = useInView(root, 0.1);
const reduced = useReducedMotion();
const live = computed(() => visible.value && !reduced.value);

type Mover = { id: number; img: string; frames?: readonly [string, string]; y: number; from: number; to: number; seconds: number; flip: boolean };
const cars = ref<Mover[]>([]);
const walkers = ref<Mover[]>([]);
let nextId = 0;
const timers: number[] = [];
const later = (fn: () => void, seconds: number) => timers.push(window.setTimeout(fn, seconds * 1000));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function spawnCar() {
  if (!live.value) return;
  const lane = pick(STREET.lanes);
  const seconds = rand(5, 8);
  const car: Mover = { id: nextId++, img: pick(STREET.cars), y: lane.y, from: lane.dir > 0 ? -40 : W + 8, to: lane.dir > 0 ? W + 8 : -40, seconds, flip: lane.dir < 0 };
  cars.value.push(car);
  later(() => (cars.value = cars.value.filter((c) => c.id !== car.id)), seconds + 0.2);
  later(spawnCar, rand(2.5, 6));
}

function spawnVisitor() {
  if (!live.value) return;
  const fromLeft = Math.random() < 0.5;
  const from = fromLeft ? -16 : W;
  const to = STREET.doorX - 8;
  const seconds = Math.abs(to - from) / STREET.visitorSpeed;
  const frames = pick(STREET.visitors);
  const v: Mover = { id: nextId++, img: frames[0], frames, y: STREET.visitorFeetY, from, to, seconds, flip: !fromLeft };
  walkers.value.push(v);
  later(() => (walkers.value = walkers.value.filter((w) => w.id !== v.id)), seconds + 0.6);
  later(spawnVisitor, rand(4, 8));
}

// Ambulance: drives in to the door, waits with its lights going, then leaves. Tapping it admits the patient.
type AmbulanceState = "away" | "arriving" | "waiting" | "leaving";
const ambulance = ref<AmbulanceState>("away");
const admitted = ref(false);
let ambulanceTimer = 0;

function scheduleAmbulance(seconds = rand(10, 18)) {
  window.clearTimeout(ambulanceTimer);
  ambulanceTimer = window.setTimeout(() => {
    if (!live.value) return scheduleAmbulance();
    admitted.value = false;
    ambulance.value = "arriving";
    later(() => ambulance.value === "arriving" && (ambulance.value = "waiting"), 2.4);
    later(() => ambulance.value === "waiting" && leave(), 2.4 + 9);
  }, seconds * 1000);
}

function leave() {
  ambulance.value = "leaving";
  later(() => {
    ambulance.value = "away";
    scheduleAmbulance();
  }, 2.2);
}

function admit(e: MouseEvent) {
  if (ambulance.value !== "waiting" && ambulance.value !== "arriving") return;
  admitted.value = true;
  emit("admit", e.clientX, e.clientY);
  later(leave, 0.9);
}

watch(
  live,
  (on) => {
    if (!on) return;
    if (cars.value.length === 0) spawnCar();
    if (walkers.value.length === 0) spawnVisitor();
    if (ambulance.value === "away") scheduleAmbulance(rand(3, 6));
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  timers.forEach(clearTimeout);
  window.clearTimeout(ambulanceTimer);
});
</script>

<template>
  <figure ref="root" class="growth">
    <div class="scene" :style="{ background: sky.fill }">
      <img class="pixel layer" :src="sky.img" alt="" width="1280" height="960" />
      <img
        v-for="(c, i) in STREET.clouds"
        :key="i"
        class="pixel cloud"
        :class="{ still: !live }"
        :src="c.img"
        alt=""
        :style="{ '--cross': `${(W / c.w) * 100}%`, width: pctX(c.w), top: pctY(c.y), opacity: sky.clouds, animationDuration: `${c.seconds}s`, animationDelay: `${-c.start * c.seconds}s` }"
      />
      <img
        v-for="(t, i) in HOSPITAL_TIERS"
        :key="t.name"
        class="pixel layer building"
        :class="{ shown: i === tier }"
        :src="t.img"
        :alt="i === tier ? `${t.name}, the hospital after ${t.rebirths} rebirths` : ''"
        width="1280"
        height="960"
      />

      <div
        v-for="v in walkers"
        :key="v.id"
        class="mover walker"
        :style="{ '--from': pctX(v.from), '--to': pctX(v.to), top: pctY(v.y - 16), width: pctX(16), animationDuration: `${v.seconds}s` }"
      >
        <div class="frames" :class="{ flip: v.flip }" :style="{ filter: sky.dark ? `brightness(${1 - sky.dark})` : undefined }">
          <img class="pixel" :src="v.frames![0]" alt="" />
          <img class="pixel" :src="v.frames![1]" alt="" />
        </div>
      </div>

      <div
        v-for="c in cars"
        :key="c.id"
        class="mover car"
        :style="{ '--from': pctX(c.from), '--to': pctX(c.to), top: pctY(c.y - 28), width: pctX(32), animationDuration: `${c.seconds}s`, zIndex: c.y }"
      >
        <div class="body" :class="{ flip: c.flip }">
          <img class="pixel" :src="c.img" alt="" />
          <span v-if="sky.dark" class="shade" :style="{ '--sprite': `url(${c.img})`, opacity: sky.dark }"></span>
          <span v-if="sky.lights" class="beam"></span>
        </div>
      </div>

      <button
        v-if="ambulance !== 'away'"
        type="button"
        class="ambulance"
        :class="[ambulance, { admitted }]"
        :style="{ '--door': pctX(STREET.doorX - 16), top: pctY(STREET.lanes[1].y - 28), width: pctX(32) }"
        :aria-label="admitted ? 'Patient admitted' : 'Admit the patient from the ambulance'"
        :disabled="admitted"
        @click="admit"
      >
        <div class="body">
          <img class="pixel" :src="STREET.ambulance" alt="" />
          <span v-if="sky.dark" class="shade" :style="{ '--sprite': `url(${STREET.ambulance})`, opacity: sky.dark }"></span>
          <span v-if="sky.lights" class="beam"></span>
        </div>
        <span v-if="ambulance === 'waiting' && !admitted" class="alert" aria-hidden="true">!</span>
      </button>

      <div v-if="sky.tint" class="tint" :style="{ background: sky.tint }"></div>
    </div>

    <div class="skies" role="group" aria-label="Time of day">
      <button
        v-for="(s, key) in SKIES"
        :key="key"
        type="button"
        class="sky-button"
        :aria-pressed="phase === key"
        @click="phase = key"
      >
        {{ s.label }}
      </button>
    </div>

    <figcaption>
      <label class="slider-label" for="tier">
        <span class="tier-name">{{ current.name }}</span>
        <span class="tier-at">{{ current.rebirths === 0 ? "Where you start" : `After ${current.rebirths} rebirth${current.rebirths === 1 ? "" : "s"}` }}</span>
      </label>
      <input id="tier" v-model.number="tier" type="range" min="0" :max="HOSPITAL_TIERS.length - 1" step="1" :aria-valuetext="current.name" />
    </figcaption>
  </figure>
</template>

<style scoped lang="scss">
.growth {
  margin: 1.5rem 0 0;
}
.scene {
  position: relative;
  aspect-ratio: 4 / 3;
  border: 3px solid var(--outline);
  overflow: hidden;
  isolation: isolate;
  transition: background 600ms ease;
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.cloud {
  position: absolute;
  left: 0;
  height: auto;
  animation: drift linear infinite;
  transition: opacity 600ms ease;
  &.still {
    animation-play-state: paused;
  }
}
@keyframes drift {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(var(--cross));
  }
}
// Changing the look: the new building fades in on top while the old one stays solid underneath,
// and only then disappears, so the sky never shows through mid-change.
.building {
  opacity: 0;
  transition: opacity 0s linear 240ms;
  &.shown {
    z-index: 1;
    opacity: 1;
    transition: opacity 240ms steps(4);
  }
}

.mover {
  position: absolute;
  left: 0;
  aspect-ratio: 1;
  animation: travel linear forwards;
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
}
@keyframes travel {
  from {
    left: var(--from);
  }
  to {
    left: var(--to);
  }
}
.flip {
  transform: scaleX(-1);
}
// Cars and the ambulance (art facing right; .flip turns the whole car, lights included).
.body {
  position: relative;
  width: 100%;
  height: 100%;
}
// Evening and night: the sprite again in the night colour over its own pixels, like the game's Shade.
.shade {
  position: absolute;
  inset: 0;
  background: #0a1030;
  pointer-events: none;
  -webkit-mask: var(--sprite) center / 100% 100% no-repeat;
  mask: var(--sprite) center / 100% 100% no-repeat;
  transition: opacity 600ms ease;
}
// Headlights: a soft beam from the front of the car (headlight row 18 of the 32px art) spreading
// down to the road 46px ahead, the same shape as the game's.
.beam {
  position: absolute;
  left: 96.875%;
  top: 0;
  width: 143.75%;
  height: 106.25%;
  pointer-events: none;
  background: linear-gradient(to right, rgba(255, 241, 184, 0.7), rgba(255, 241, 184, 0));
  clip-path: polygon(0 50%, 100% 38.2%, 100% 91.2%, 0 58.8%);
}
.walker {
  z-index: 150;
  animation-name: travel, arrive;
  animation-timing-function: linear, steps(3);
  // Fade out at the door.
  @keyframes arrive {
    0%,
    95% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
}
.frames {
  position: relative;
  width: 100%;
  height: 100%;
  img {
    position: absolute;
    inset: 0;
  }
  img:nth-child(2) {
    animation: step 0.5s steps(1) infinite;
  }
}
@keyframes step {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

.ambulance {
  position: absolute;
  left: var(--door);
  z-index: 170;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
  &.arriving {
    animation: pull-in 2.4s cubic-bezier(0.2, 0.8, 0.3, 1) both;
  }
  &.waiting:not(.admitted) img {
    animation: idle 0.9s steps(2) infinite;
  }
  &.leaving {
    animation: pull-out 2.2s cubic-bezier(0.6, 0, 0.9, 0.5) both;
  }
  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline-offset: 0;
  }
}
@keyframes pull-in {
  from {
    left: -12%;
  }
  to {
    left: var(--door);
  }
}
@keyframes pull-out {
  from {
    left: var(--door);
  }
  to {
    left: 112%;
  }
}
@keyframes idle {
  50% {
    transform: translateY(-1px);
  }
}
.alert {
  position: absolute;
  left: 50%;
  bottom: 92%;
  translate: -50% 0;
  min-width: 1.4em;
  padding: 0 0.25em;
  font-family: "Silkscreen", monospace;
  font-size: clamp(0.625rem, 1.6vw, 0.875rem);
  line-height: 1.4;
  color: #fff;
  background: #dd1122;
  border: 2px solid #000;
  animation: blink 0.6s steps(1) infinite;
}
@keyframes blink {
  50% {
    background: #ffffff;
    color: #dd1122;
  }
}

// Evening and night light over the buildings. People and cars draw above it, shaded on their own
// (and their headlights stay bright), as in the game.
.tint {
  position: absolute;
  inset: 0;
  z-index: 140;
  pointer-events: none;
}

.skies {
  display: flex;
  margin-top: 0.75rem;
  border: 2px solid var(--outline);
  width: fit-content;
  max-width: 100%;
}
.sky-button {
  font-family: "Silkscreen", monospace;
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
  background: var(--surface);
  color: var(--ink);
  border: 0;
  cursor: pointer;
  & + & {
    border-left: 2px solid var(--outline);
  }
  &[aria-pressed="true"] {
    background: var(--primary);
    color: #fff;
  }
}

figcaption {
  margin-top: 0.9rem;
}
.slider-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}
.tier-name {
  font-family: "Silkscreen", monospace;
  font-size: 1.125rem;
}
.tier-at {
  color: var(--muted);
  font-size: 0.9375rem;
}
input[type="range"] {
  appearance: none;
  width: 100%;
  height: 28px;
  margin-top: 0.4rem;
  background: transparent;
  cursor: pointer;
  &::-webkit-slider-runnable-track {
    height: 10px;
    background: var(--backdrop);
    border: 2px solid var(--outline);
  }
  &::-moz-range-track {
    height: 6px;
    background: var(--backdrop);
    border: 2px solid var(--outline);
  }
  &::-webkit-slider-thumb {
    appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -8px;
    background: var(--primary);
    border: 3px solid var(--outline);
    box-shadow: 3px 3px 0 var(--shadow);
  }
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 0;
    background: var(--primary);
    border: 3px solid var(--outline);
    box-shadow: 3px 3px 0 var(--shadow);
  }
}
@media (prefers-reduced-motion: reduce) {
  .building,
  .scene,
  .cloud {
    transition: none;
  }
  .cloud {
    animation-play-state: paused;
  }
}
</style>

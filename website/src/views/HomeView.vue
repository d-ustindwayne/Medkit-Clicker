<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import BoostSlips from "@/components/BoostSlips.vue";
import EcgMonitor from "@/components/EcgMonitor.vue";
import { playTapSound, preloadTapSound } from "@/lib/tap-sound";
import FrameSprite from "@/components/FrameSprite.vue";
import HospitalGrowth from "@/components/HospitalGrowth.vue";
import PixelIcon from "@/components/PixelIcon.vue";
import SoundtrackPlayer from "@/components/SoundtrackPlayer.vue";
import StaffParade from "@/components/StaffParade.vue";
import MilestoneToast from "@/components/MilestoneToast.vue";
import SupplyShelf from "@/components/SupplyShelf.vue";
import { useReducedMotion } from "@/composables/useReducedMotion";
import { useTheme } from "@/composables/useTheme";
import { GAME, HOSPITAL_TIERS, MINIGAMES, ROOMS, ROOM_ITEMS, SPRITES } from "@/lib/content";
import { LINKS, PROMO } from "@/lib/links";
import { VoxelStage, type Pose } from "@/lib/stage";
import { spriteToVoxels, type SpriteSpec } from "@/lib/voxels";

// One entry per chapter, in page order: the sprite the cubes become, and where it sits.
const CHAPTERS: { id: string; label: string; sprite: SpriteSpec; wide: Pose; narrow: Pose }[] = [
  { id: "top", label: "Medkit Clicker", sprite: { url: SPRITES.medkit, grid: 32, depth: 6 }, wide: { x: 0.2, y: -0.02, size: 0.56, turn: -0.4 }, narrow: { x: 0, y: 0.25, size: 0.3, turn: -0.3 } },
  { id: "tap", label: "Tap to heal", sprite: { url: SPRITES.heart, grid: 32, depth: 5 }, wide: { x: -0.22, y: 0, size: 0.46, turn: 0.4 }, narrow: { x: 0, y: 0.25, size: 0.28, turn: 0.3 } },
  { id: "supplies", label: "Supplies", sprite: { url: SPRITES.stethoscope, grid: 32, depth: 3 }, wide: { x: 0.24, y: 0, size: 0.5, turn: -0.4 }, narrow: { x: 0, y: 0.25, size: 0.28, turn: -0.3 } },
  { id: "achievements", label: "Achievements", sprite: { url: SPRITES.trophy, grid: 32, depth: 4 }, wide: { x: -0.24, y: 0, size: 0.52, turn: 0.4 }, narrow: { x: 0, y: 0.25, size: 0.28, turn: 0.3 } },
  { id: "ward", label: "Your ward", sprite: { url: SPRITES.nurse, grid: 64, depth: 5 }, wide: { x: 0.24, y: 0.02, size: 0.62, turn: -0.35 }, narrow: { x: 0, y: 0.24, size: 0.32, turn: -0.3 } },
  { id: "rebirth", label: "Rebirth", sprite: { url: SPRITES.hospital, grid: 32, depth: 6 }, wide: { x: -0.25, y: 0, size: 0.5, turn: 0.45 }, narrow: { x: 0, y: 0.25, size: 0.28, turn: 0.3 } },
  { id: "soundtrack", label: "Soundtrack", sprite: { url: SPRITES.headphones, grid: 32, depth: 4 }, wide: { x: 0.24, y: 0, size: 0.46, turn: -0.4 }, narrow: { x: 0, y: 0.25, size: 0.28, turn: -0.3 } },
  { id: "download", label: "Download", sprite: { url: SPRITES.medkit, grid: 32, depth: 6 }, wide: { x: 0, y: 0.2, size: 0.34, turn: 0 }, narrow: { x: 0, y: 0.25, size: 0.28, turn: 0 } },
];

const canvas = ref<HTMLCanvasElement>();
const chapterList = ref<HTMLElement>();
const ready = ref(false);
const noWebgl = ref(false);
const progress = ref(0);
const beats = ref(CHAPTERS.map((c, i) => ({ id: c.id, label: c.label, at: i / (CHAPTERS.length - 1) })));
const reduced = useReducedMotion();
const { theme } = useTheme();

const healed = ref(readHealed());
const showMilestone = ref(false);
/** Shown once per visit when the visitor scrolls to the bottom of the page. */
const showPromo = ref(false);
let promoShown = false;
/** Heals that unlock the download nudge. */
const MILESTONE = 50;
/** Patients healed by admitting the ambulance in the hospital scene. */
const ADMIT = 5;
const floaters = ref<{ id: number; x: number; y: number; amount: number }[]>([]);
let floaterId = 0;

function readHealed() {
  try {
    return Number(localStorage.getItem("mc-healed")) || 0;
  } catch {
    return 0;
  }
}

function heal(x: number, y: number, amount = 1) {
  playTapSound();
  const before = healed.value;
  healed.value += amount;
  try {
    localStorage.setItem("mc-healed", String(healed.value));
  } catch {
    // Storage can be blocked; the count still works for this visit.
  }
  if (before < MILESTONE && healed.value >= MILESTONE) {
    showMilestone.value = true;
    stage?.celebrate();
  }
  const id = ++floaterId;
  floaters.value.push({ id, x, y, amount });
  setTimeout(() => (floaters.value = floaters.value.filter((f) => f.id !== id)), 900);
}

function tapFromButton(e: MouseEvent) {
  stage?.tap();
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  heal(r.left + r.width / 2, r.top);
}

let stage: VoxelStage | null = null;
let centers: number[] = [];
const narrowQuery = window.matchMedia("(max-aspect-ratio: 9/10)");
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
let frame = 0;

function measure() {
  const sections = [...(chapterList.value?.querySelectorAll<HTMLElement>(":scope > section") ?? [])];
  centers = sections.map((el) => el.getBoundingClientRect().top + window.scrollY + el.offsetHeight / 2);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  beats.value = CHAPTERS.map((c, i) => ({
    id: c.id,
    label: c.label,
    at: max > 0 ? Math.min(1, Math.max(0, (centers[i] - window.innerHeight / 2) / max)) : 0,
  }));
}

function onScroll() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.value = max > 0 ? window.scrollY / max : 0;
    if (!promoShown && max > 0 && progress.value > 0.98) {
      promoShown = true;
      showPromo.value = true;
    }
    if (!stage || centers.length === 0) return;
    stage.setScroll(window.scrollY);
    if (narrowQuery.matches) {
      followSlots(stage);
      return;
    }
    stage.setAnchor(null);
    // Hold each sprite while its chapter is centred; rebuild in the stretch between two chapters.
    const mid = window.scrollY + window.innerHeight / 2;
    let k = 0;
    while (k < centers.length - 1 && mid >= centers[k + 1]) k++;
    const span = (centers[k + 1] ?? centers[k]) - centers[k];
    const t = span > 0 ? Math.min(1, Math.max(0, (mid - centers[k]) / span)) : 0;
    stage.setChapter(k + Math.min(1, Math.max(0, (t - 0.22) / 0.56)));
  });
}

// Phones: each chapter has an empty slot above its card, and the sprite rides in the slot that is on screen.
// As the next slot rises into view the sprite rebuilds into the next chapter's shape and moves across to it.
function followSlots(s: VoxelStage) {
  const slots = [...(chapterList.value?.querySelectorAll<HTMLElement>(".sprite-slot") ?? [])].map((el) => el.getBoundingClientRect());
  if (slots.length === 0) return;
  const h = window.innerHeight;
  const slotH = slots[0].height;
  const ys = slots.map((r) => r.top + r.height / 2);
  const enter = h + slotH / 2;
  let j = 0;
  while (j < ys.length - 1 && ys[j + 1] < enter) j++;
  const size = (slotH * 0.72) / h;
  if (j === 0) {
    s.setChapter(0);
    s.setAnchor({ y: ys[0], size });
    return;
  }
  const m = clamp01((enter - ys[j]) / (h * 0.55));
  const e = easeInOut(m);
  // While the previous slot is still on screen, fly between the two; once it has left, follow the new one.
  const stay = clamp01(ys[j - 1] / slotH);
  const y = ys[j] + (ys[j - 1] + (ys[j] - ys[j - 1]) * e - ys[j]) * stay;
  s.setChapter(j - 1 + m);
  s.setAnchor({ y, size });
}

function onResize() {
  measure();
  onScroll();
}

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduced.value ? "auto" : "smooth", block: "center" });
}

watch(theme, (t) => stage?.setTheme(t));
watch(reduced, (r) => stage?.setReducedMotion(r));

onMounted(async () => {
  preloadTapSound();
  measure();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  // Images and fonts change section heights after first paint.
  document.fonts?.ready.then(onResize);
  window.addEventListener("load", onResize);

  try {
    const sets = await Promise.all(CHAPTERS.map((c) => spriteToVoxels(c.sprite)));
    if (!canvas.value) return;
    stage = new VoxelStage(canvas.value, sets, { wide: CHAPTERS.map((c) => c.wide), narrow: CHAPTERS.map((c) => c.narrow) }, {
      reducedMotion: reduced.value,
      onTap: heal,
    });
    ready.value = true;
    onResize();
  } catch (err) {
    console.warn("3D scene unavailable, showing the flat medkit instead.", err);
    noWebgl.value = true;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("load", onResize);
  cancelAnimationFrame(frame);
  stage?.dispose();
  stage = null;
});
</script>

<template>
  <EcgMonitor :progress="progress" :chapters="beats" :healed="healed" @go="go" />
  <MilestoneToast
    v-if="showMilestone"
    :title="`${MILESTONE} patients healed!`"
    text="You've got the touch. Keep healing in the full game, on Android or in your browser."
    @close="showMilestone = false"
  />
  <MilestoneToast
    v-else-if="showPromo"
    kicker="A gift for reaching the end"
    :title="`Code: ${PROMO.code}`"
    :text="PROMO.text"
    :image="SPRITES.medkit"
    :code="PROMO.code"
    @close="showPromo = false"
  />

  <canvas ref="canvas" class="stage" :class="{ ready }" aria-hidden="true"></canvas>
  <div class="floaters" aria-hidden="true">
    <span v-for="f in floaters" :key="f.id" class="floater" :class="{ big: f.amount > 1 }" :style="{ left: `${f.x}px`, top: `${f.y}px` }">+{{ f.amount }}</span>
  </div>

  <div ref="chapterList" class="chapters">
    <section id="top" class="chapter is-hero text-left" aria-labelledby="title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap">
        <div class="columns">
          <div class="column is-6-desktop is-6-widescreen">
            <h1 id="title" class="title-mark">Medkit<br />Clicker</h1>
            <p class="pitch">
              A cosy pixel-art idle game about running a hospital. Tap the medkit to heal patients, stock up on
              supplies, and grow a little clinic into a grand medical center.
            </p>
            <div class="actions">
              <a class="button pixel-button is-primary" :href="LINKS.download" rel="noopener">
                <PixelIcon name="download" :size="16" />
                Download for Android
              </a>
              <a class="button pixel-button" :href="LINKS.play">
                <PixelIcon name="play" :size="16" />
                Play in browser
              </a>
              <RouterLink class="button pixel-button" to="/docs">Read the guide</RouterLink>
            </div>
            <p class="tap-hint">
              <button type="button" class="tap-button" @click="tapFromButton">Tap the medkit</button>
              to heal a patient.
            </p>
            <img v-if="noWebgl" class="pixel flat-medkit" :src="SPRITES.medkit" alt="The Medkit Clicker medkit" width="320" height="320" />
          </div>
        </div>
      </div>
    </section>

    <section id="tap" class="chapter text-right" aria-labelledby="tap-title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap">
        <div class="columns">
          <div class="column is-6-desktop is-5-widescreen is-offset-6-desktop is-offset-7-widescreen">
            <article class="panel-card">
              <p class="step"><PixelIcon name="cross" :size="12" /> Step 1 of 5</p>
              <h2 id="tap-title">Tap to heal</h2>
              <p>
                Every tap on the medkit heals a patient, and healed patients are what you spend. Keep an eye on the
                road outside: when an ambulance pulls up at the door, tap it to admit the patient for a burst of healing.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="supplies" class="chapter text-left" aria-labelledby="supplies-title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap">
        <div class="columns">
          <div class="column is-6-desktop is-6-widescreen">
            <article class="panel-card">
              <p class="step"><PixelIcon name="cross" :size="12" /> Step 2 of 5</p>
              <h2 id="supplies-title">Stock the supply room</h2>
              <p>
                Spend patients on supplies that heal for you, from a bandage to a DNA strand. Each one you buy costs 14%
                more than the last, and your team keeps working for up to {{ GAME.offlineHours }} hours while the app is
                closed.
              </p>
              <SupplyShelf />
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="achievements" class="chapter text-right" aria-labelledby="achievements-title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap">
        <div class="columns">
          <div class="column is-6-desktop is-6-widescreen is-offset-6-desktop is-offset-6-widescreen">
            <article class="panel-card">
              <p class="step"><PixelIcon name="cross" :size="12" /> Step 3 of 5</p>
              <h2 id="achievements-title">Earn Care Coins</h2>
              <p>
                {{ GAME.achievements }} achievements, from First Aid to healing a vigintillion patients, a few of them
                secret. Each one pays Care Coins, and coins buy boosts in the shop.
              </p>
              <BoostSlips />
              <p class="more"><RouterLink to="/docs#boosts">See all 13 boosts</RouterLink></p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="ward" class="chapter text-left has-parade" aria-labelledby="ward-title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap">
        <div class="columns">
          <div class="column is-6-desktop is-5-widescreen">
            <article class="panel-card">
              <p class="step"><PixelIcon name="cross" :size="12" /> Step 4 of 5</p>
              <h2 id="ward-title">Care for your ward</h2>
              <p>
                Sick patients turn up in your room now and then. Treat them in a quick minigame for patients and coins:
              </p>
              <ul class="minigames">
                <li v-for="g in MINIGAMES" :key="g">{{ g }}</li>
              </ul>
              <p>
                Between visits, decorate {{ ROOMS.length }} rooms, from Reception to the Children's Ward, with pixel-art
                hospital items. Every item you place adds a small permanent bonus.
              </p>
              <ul class="room-items">
                <li v-for="(r, i) in ROOM_ITEMS" :key="r.name" :style="{ '--i': i }">
                  <FrameSprite :frames="r.frames" :alt="r.name" :size="56" />
                </li>
              </ul>
            </article>
          </div>
        </div>
      </div>
      <StaffParade class="parade" />
    </section>

    <section id="rebirth" class="chapter text-right" aria-labelledby="rebirth-title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap">
        <div class="columns">
          <div class="column is-6-desktop is-6-widescreen is-offset-6-desktop is-offset-6-widescreen">
            <article class="panel-card">
              <p class="step"><PixelIcon name="cross" :size="12" /> Step 5 of 5</p>
              <h2 id="rebirth-title">Rebirth and grow</h2>
              <p>
                When you're ready, start a new run for a Natal Gem and a small permanent healing boost. Your hospital
                grows with every rebirth: drag the slider to see all {{ HOSPITAL_TIERS.length }} looks. When an ambulance pulls up, tap it
                to admit the patient.
              </p>
              <HospitalGrowth @admit="(x, y) => heal(x, y, ADMIT)" />
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="soundtrack" class="chapter text-left" aria-labelledby="soundtrack-title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap">
        <div class="columns">
          <div class="column is-6-desktop is-5-widescreen">
            <article class="panel-card">
              <h2 id="soundtrack-title">Original soundtrack</h2>
              <p>Five calm lo-fi loops made for the game in BeepBox. Pick one in the game's music player, or listen here.</p>
              <SoundtrackPlayer />
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="download" class="chapter is-finale" aria-labelledby="download-title">
      <div class="sprite-slot" aria-hidden="true"></div>
      <div class="page-wrap finale">
        <h2 id="download-title" class="finale-title">Open your clinic</h2>
        <p class="finale-text">
          Medkit Clicker is an Android app. The APK is on GitHub Releases; your phone may ask you to allow installs from
          your browser first. iPhones can install it for free with AltStore or SideStore. On any other device, play it
          right here in your browser.
        </p>
        <div class="actions is-centered">
          <a class="button pixel-button is-primary heartbeat" :href="LINKS.download" rel="noopener">
            <PixelIcon name="download" :size="16" />
            Download for Android
          </a>
          <a class="button pixel-button" :href="LINKS.play">
            <PixelIcon name="play" :size="16" />
            Play in browser
          </a>
          <RouterLink class="button pixel-button" to="/iphone">Play on iPhone</RouterLink>
          <RouterLink class="button pixel-button" to="/docs">Read the guide</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.stage {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  // The visible height right now (it changes as a phone's address bar comes and goes), so the
  // picture isn't stretched; 100vh is the fallback for older browsers.
  height: 100vh;
  height: 100dvh;
  z-index: 1;
  opacity: 0;
  transition: opacity 400ms ease;
  // Sideways drags spin the sprite; vertical ones still scroll the page.
  touch-action: pan-y;
  &.ready {
    opacity: 1;
  }
}

// Sections let clicks fall through to the 3D medkit; only their content catches them.
.chapters {
  position: relative;
  z-index: 2;
  pointer-events: none;
}
.chapter :deep(.panel-card),
.chapter .actions,
.chapter .tap-hint,
.chapter .finale,
.chapter .parade {
  pointer-events: auto;
}
.chapter {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 8rem 0 6rem;
  > .page-wrap {
    width: 100%;
  }
}

.title-mark {
  font-size: clamp(3.5rem, 9vw, 8rem);
  line-height: 0.95;
  color: var(--primary);
  text-shadow: 0.06em 0.06em 0 var(--text-shadow);
  margin-bottom: 1.75rem;
}
[data-theme="dark"] .title-mark {
  color: #ff4d5e;
}
.pitch {
  font-size: 1.375rem;
  line-height: 1.55;
  max-width: 30rem;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
  &.is-centered {
    justify-content: center;
  }
}
.tap-hint {
  margin-top: 1.75rem;
  color: var(--muted);
}
.tap-button {
  font: inherit;
  font-weight: 700;
  color: var(--ink);
  background: none;
  border: 0;
  padding: 0;
  border-bottom: 3px solid var(--primary);
  cursor: pointer;
}
.flat-medkit {
  display: block;
  margin-top: 2rem;
  width: min(320px, 70vw);
  height: auto;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Silkscreen", monospace;
  font-size: 0.875rem;
  color: var(--primary);
  margin-bottom: 0.75rem;
}
[data-theme="dark"] .step {
  color: #ff8a96;
}
h2 {
  font-size: clamp(1.75rem, 3.4vw, 2.5rem);
  margin-bottom: 1rem;
}
.panel-card p + p {
  margin-top: 0.85rem;
}
.more {
  margin-top: 1rem;
  font-weight: 700;
}
.minigames {
  margin: 0.6rem 0 0.9rem;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  li {
    font-size: 0.9375rem;
    font-weight: 700;
    padding: 0.2rem 0.65rem;
    background: var(--accent);
    border: 2px solid var(--outline);
  }
}
.room-items {
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  li {
    transition: transform 120ms steps(2);
  }
  // Items hop when you point at them, like picking one up in My Room.
  li:hover {
    transform: translateY(-6px);
  }
}

// The last download button beats like a heart: two quick rings, then a rest.
.heartbeat::after {
  content: "";
  position: absolute;
  inset: -3px;
  border: 3px solid var(--primary);
  pointer-events: none;
  animation: lub-dub 1.6s steps(6) infinite;
}
@keyframes lub-dub {
  0%,
  30%,
  100% {
    opacity: 0;
    transform: scale(1);
  }
  10% {
    opacity: 1;
    transform: scale(1.06, 1.18);
  }
  20% {
    opacity: 0.4;
    transform: scale(1.12, 1.4);
  }
  25% {
    opacity: 0.9;
    transform: scale(1.04, 1.12);
  }
}

.has-parade {
  flex-direction: column;
  justify-content: center;
  padding-bottom: 0;
  .parade {
    width: 100%;
    margin-top: 4rem;
  }
}

.is-finale {
  align-items: flex-end;
  padding-bottom: 10vh;
}
.finale {
  text-align: center;
  max-width: 40rem;
}
.finale-title {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  color: var(--primary);
  text-shadow: 0.06em 0.06em 0 var(--text-shadow);
}
[data-theme="dark"] .finale-title {
  color: #ff4d5e;
}
.finale-text {
  margin: 1.25rem auto 0;
  max-width: 34rem;
}

.floaters {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}
.floater {
  position: absolute;
  translate: -50% -100%;
  font-family: "Silkscreen", monospace;
  font-size: 2rem;
  color: var(--primary);
  text-shadow: 3px 3px 0 var(--text-shadow);
  animation: rise 900ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}
[data-theme="dark"] .floater {
  color: #ff4d5e;
}
// Admitting an ambulance heals several patients at once.
.floater.big {
  font-size: 2.75rem;
  color: #2f9e4f;
}
@media (prefers-reduced-motion: reduce) {
  .heartbeat::after {
    animation: none;
  }
  .room-items li:hover {
    transform: none;
  }
}
@keyframes rise {
  from {
    transform: translateY(0) scale(0.7);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  to {
    transform: translateY(-80px) scale(1.1);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .floater {
    animation: fade 900ms linear forwards;
  }
  @keyframes fade {
    to {
      opacity: 0;
    }
  }
}

// Portrait screens: the 3D sprite sits in the top part of the screen and the text scrolls up below it.
.sprite-slot {
  display: none;
}

// Portrait screens: each chapter opens with an empty window where the 3D sprite sits, so cards never cover it.
@media (max-aspect-ratio: 9/10) {
  .chapter,
  .is-finale,
  .has-parade {
    display: block;
    min-height: 0;
    padding: 0 0 3.5rem;
  }
  .sprite-slot {
    display: block;
    height: 38vh;
    min-height: 220px;
    max-height: 360px;
  }
  // The first window starts below the monitor strip.
  .is-hero {
    padding-top: 34px;
  }
  .has-parade .parade {
    margin-top: 2.5rem;
  }
  .title-mark {
    font-size: clamp(2.75rem, 13vw, 5rem);
  }
  .pitch {
    font-size: 1.1875rem;
  }
  .is-finale {
    padding-bottom: 5rem;
  }
}
</style>

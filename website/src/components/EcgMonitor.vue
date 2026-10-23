<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import { useReducedMotion } from "@/composables/useReducedMotion";

// A patient-monitor strip under the navbar. The trace draws as the page scrolls, with a heartbeat at each
// chapter; the beats double as chapter links, and the readout counts the patients this visitor healed.

const props = defineProps<{
  progress: number;
  chapters: { id: string; label: string; at: number }[];
  healed: number;
}>();
const emit = defineEmits<{ go: [id: string] }>();

// A bright pulse runs along the drawn part of the trace, like the sweep on a real monitor.
const SWEEP_SECONDS = 2.2;
const sweep = ref(-100);
const reduced = useReducedMotion();
let frame = 0;
onMounted(() => {
  const start = performance.now();
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (reduced.value || document.hidden) return;
    const t = ((now - start) / 1000 / SWEEP_SECONDS) % 1;
    sweep.value = t * Math.max(props.progress * W, 120);
  };
  frame = requestAnimationFrame(loop);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));

const W = 1000;
const BASE = 22;

const path = computed(() => {
  let d = `M0 ${BASE}`;
  for (const c of props.chapters) {
    const x = Math.max(24, Math.min(W - 24, c.at * W));
    d += ` L${x - 20} ${BASE} L${x - 16} ${BASE - 3} L${x - 12} ${BASE} L${x - 6} ${BASE} L${x - 4} ${BASE + 4} L${x} ${BASE - 18} L${x + 4} ${BASE + 8} L${x + 7} ${BASE} L${x + 13} ${BASE} L${x + 17} ${BASE - 5} L${x + 22} ${BASE}`;
  }
  return `${d} L${W} ${BASE}`;
});
</script>

<template>
  <div class="ecg">
    <!-- The trace fills everything up to the readout, however wide the healed count gets. -->
    <div class="strip">
    <svg class="trace" :viewBox="`0 0 ${W} 32`" preserveAspectRatio="none" aria-hidden="true">
      <clipPath id="ecg-drawn">
        <rect x="0" y="0" :width="progress * W" height="32" />
      </clipPath>
      <path :d="path" class="faint" />
      <clipPath id="ecg-sweep">
        <rect :x="Math.min(sweep, progress * W) - 70" y="0" width="70" height="32" />
      </clipPath>
      <path :d="path" class="live" clip-path="url(#ecg-drawn)" />
      <path v-if="!reduced" :d="path" class="glow" clip-path="url(#ecg-sweep)" />
    </svg>
    <nav class="beats" aria-label="Chapters">
      <button
        v-for="c in chapters"
        :key="c.id"
        type="button"
        class="beat"
        :class="{ passed: progress >= c.at - 0.001 }"
        :style="{ left: `${Math.max(2.4, Math.min(97.6, c.at * 100))}%` }"
        :title="c.label"
        @click="emit('go', c.id)"
      >
        <span class="sr-only">{{ c.label }}</span>
      </button>
    </nav>
    </div>
    <p class="readout" aria-live="polite">
      <span class="readout-label">Healed</span> <span class="readout-value">{{ healed.toLocaleString() }}</span>
    </p>
  </div>
</template>

<style scoped lang="scss">
.ecg {
  position: sticky;
  top: 4rem;
  z-index: 25;
  height: 34px;
  margin-bottom: -34px;
  background: #0b161d;
  border-bottom: 3px solid var(--outline);
  display: flex;
  align-items: center;
}
.strip {
  position: relative;
  flex: 1;
  align-self: stretch;
  min-width: 0;
}
.trace {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
path {
  fill: none;
  stroke-width: 2px;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: miter;
}
.faint {
  stroke: #1f3b2a;
}
.live {
  stroke: #4edb4e;
}
.glow {
  stroke: #d8ffd8;
  stroke-width: 3px;
}
.beats {
  position: absolute;
  inset: 0;
}
.beat {
  position: absolute;
  top: 50%;
  width: 22px;
  height: 22px;
  translate: -50% -50%;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.readout {
  flex: none;
  padding: 0 0.75rem 0 0.6rem;
  text-align: right;
  font-family: "Silkscreen", monospace;
  color: #4edb4e;
  font-size: 0.8125rem;
  line-height: 1;
  white-space: nowrap;
}
.readout-label {
  color: #7fa58a;
}
</style>

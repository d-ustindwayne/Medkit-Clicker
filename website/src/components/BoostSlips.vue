<script setup lang="ts">
import { ref } from "vue";

import { useInView } from "@/composables/useInView";
import { BOOSTS, SPRITES } from "@/lib/content";

const picks = ["Adrenaline Shot", "Code Blue", "Lucky Stethoscope", "Time Warp"];
const shown = BOOSTS.filter((b) => picks.includes(b.name));

// Slips tear off the pad one after another the first time they come into view.
const pad = ref<HTMLElement>();
const { seen } = useInView(pad);
</script>

<template>
  <ul ref="pad" class="slips" :class="{ torn: seen }">
    <li v-for="(b, i) in shown" :key="b.name" class="slip" :style="{ '--i': i }">
      <div class="slip-head">
        <span class="slip-name">{{ b.name }}</span>
        <span class="slip-cost">
          <img class="pixel" :src="SPRITES.coin" width="18" height="18" alt="" />
          {{ b.cost }} <span class="sr-only">Care Coins</span>
        </span>
      </div>
      <p>{{ b.description }}</p>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.slips {
  list-style: none;
  padding: 0;
  margin: 1.25rem 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.75rem;
}
// Prescription slips: a pad sheet with a perforated top edge.
.slip {
  background: var(--backdrop);
  border: 2px solid var(--outline);
  border-top: 4px dashed var(--outline);
  padding: 0.7rem 0.85rem 0.8rem;
  font-size: 1rem;
  line-height: 1.45;
  p {
    margin-top: 0.3rem;
    color: var(--muted);
  }
}
.slip-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}
.slip-name {
  font-weight: 700;
}
.slip-cost {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: "Silkscreen", monospace;
  font-size: 0.875rem;
  white-space: nowrap;
}
.slips:not(.torn) .slip {
  opacity: 0;
}
.torn .slip {
  animation: tear 600ms steps(6, end) both;
  animation-delay: calc(var(--i) * 140ms);
  transform-origin: top left;
}
@keyframes tear {
  0% {
    opacity: 0;
    transform: translateY(-14px) rotate(-5deg);
  }
  60% {
    opacity: 1;
    transform: translateY(2px) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .slips:not(.torn) .slip {
    opacity: 1;
  }
  .torn .slip {
    animation: none;
  }
}
</style>

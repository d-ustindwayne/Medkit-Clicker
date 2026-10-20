<script setup lang="ts">
import { ref } from "vue";

import { useInView } from "@/composables/useInView";
import { SUPPLIES } from "@/lib/content";

// The shelf restocks the first time it scrolls into view: supplies drop onto it one by one, cheapest first.
const shelf = ref<HTMLElement>();
const { seen } = useInView(shelf);
</script>

<template>
  <!-- The shop's order, cheapest first. -->
  <ol ref="shelf" class="shelf" :class="{ stocked: seen }" aria-label="The 13 supplies, from cheapest to most expensive">
    <li v-for="(s, i) in SUPPLIES" :key="s.name" class="slot" :style="{ '--i': i }">
      <img class="pixel" :src="s.img" :alt="''" width="48" height="48" loading="lazy" />
      <span class="name">{{ s.name }}</span>
    </li>
  </ol>
</template>

<style scoped lang="scss">
.shelf {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.75rem, 1fr));
  gap: 0.5rem;
}
.slot {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem 0.4rem;
  background: var(--backdrop);
  border: 2px solid var(--outline);
  text-align: center;
  transition: transform 120ms ease;
  &:hover {
    transform: translateY(-3px);
  }
}
.name {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
}
.shelf:not(.stocked) .slot img {
  opacity: 0;
}
.stocked .slot img {
  animation: restock 520ms steps(6, end) both;
  animation-delay: calc(var(--i) * 70ms);
}
@keyframes restock {
  0% {
    opacity: 0;
    transform: translateY(-28px);
  }
  55% {
    opacity: 1;
    transform: translateY(3px) scale(1.08, 0.9);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .slot:hover {
    transform: none;
  }
  .shelf:not(.stocked) .slot img {
    opacity: 1;
  }
  .stocked .slot img {
    animation: none;
  }
}
</style>

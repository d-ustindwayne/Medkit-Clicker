<script setup lang="ts">
import { STAFF } from "@/lib/content";
</script>

<template>
  <!-- The game's nurses and doctor on their rounds, walking with their own two-frame cycle. -->
  <div class="corridor" aria-hidden="true">
    <div v-for="(p, i) in STAFF" :key="p.name" class="walker" :style="{ '--i': i, '--n': STAFF.length }">
      <div class="frames">
        <img v-for="(f, k) in p.frames" :key="k" class="pixel" :src="f" alt="" width="128" height="128" :style="{ '--k': k }" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.corridor {
  position: relative;
  height: 132px;
  overflow: hidden;
  border-bottom: 6px solid var(--outline);
  pointer-events: none;
}
.walker {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 128px;
  height: 128px;
  animation: walk 36s linear infinite;
  animation-delay: calc(var(--i) * -6s);
}
.frames {
  position: relative;
  width: 128px;
  height: 128px;
  img {
    position: absolute;
    inset: 0;
    opacity: 0;
    animation: frame 0.8s steps(1) infinite;
    animation-delay: calc(var(--k) * 0.2s);
  }
}
@keyframes walk {
  from {
    transform: translateX(-140px);
  }
  to {
    transform: translateX(calc(100vw + 20px));
  }
}
@keyframes frame {
  0% {
    opacity: 1;
  }
  25%,
  100% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .walker {
    animation: none;
    transform: translateX(calc(var(--i) * 140px + 16px));
  }
  .frames img {
    animation: none;
  }
  .frames img:nth-child(2) {
    opacity: 1;
  }
}
</style>

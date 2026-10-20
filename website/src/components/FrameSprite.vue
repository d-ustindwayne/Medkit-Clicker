<script setup lang="ts">
// A sprite that plays its frames in a loop, like the game's animated room items. One frame is just an image.
withDefaults(defineProps<{ frames: readonly string[]; alt: string; size?: number; fps?: number }>(), { size: 56, fps: 4 });
</script>

<template>
  <span class="frame-sprite" :style="{ width: `${size}px`, height: `${size}px`, '--n': frames.length, '--fps': fps }">
    <img
      v-for="(f, k) in frames"
      :key="k"
      class="pixel"
      :src="f"
      :alt="k === 0 ? alt : ''"
      :title="k === 0 ? alt : undefined"
      :width="size"
      :height="size"
      loading="lazy"
      :style="{ '--k': k }"
    />
  </span>
</template>

<style scoped lang="scss">
.frame-sprite {
  position: relative;
  display: block;
  img {
    position: absolute;
    inset: 0;
    display: block;
  }
  // Each frame shows for 1/n of the loop; the first frame stays underneath so there is never a gap.
  img + img {
    opacity: 0;
    animation: show calc(var(--n) / var(--fps) * 1s) steps(1) infinite;
    animation-delay: calc(var(--k) / var(--fps) * 1s);
  }
}
@keyframes show {
  0% {
    opacity: 1;
  }
  25% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .frame-sprite img + img {
    animation: none;
  }
}
</style>

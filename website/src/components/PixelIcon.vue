<script setup lang="ts">
import { computed } from "vue";

// 7x7 pixel glyphs, like PixelIcon in the game. "#" is a filled pixel.
const GLYPHS = {
  sun: ["#..#..#", ".#...#.", "..###..", "#.###.#", "..###..", ".#...#.", "#..#..#"],
  moon: ["..###..", ".##....", "##.....", "##.....", "##.....", ".##...#", "..####."],
  cross: ["..###..", "..###..", "#######", "#######", "#######", "..###..", "..###.."],
  play: [".#.....", ".##....", ".###...", ".####..", ".###...", ".##....", ".#....."],
  pause: [".##.##.", ".##.##.", ".##.##.", ".##.##.", ".##.##.", ".##.##.", ".##.##."],
  download: ["...#...", "...#...", "...#...", ".#####.", "..###..", "...#...", "#######"],
  arrow: ["...#...", "....#..", ".....#.", "#######", ".....#.", "....#..", "...#..."],
} as const;

export type GlyphName = keyof typeof GLYPHS;

const props = withDefaults(defineProps<{ name: GlyphName; size?: number }>(), { size: 14 });

const cells = computed(() =>
  GLYPHS[props.name].flatMap((row, y) => [...row].map((c, x) => (c === "#" ? { x, y } : null)).filter((c) => c !== null)),
);
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <rect v-for="c in cells" :key="`${c.x}-${c.y}`" :x="c.x" :y="c.y" width="1" height="1" fill="currentColor" />
  </svg>
</template>

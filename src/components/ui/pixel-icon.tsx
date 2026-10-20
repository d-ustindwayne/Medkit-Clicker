import { memo } from "react";
import Svg, { Path } from "react-native-svg";

import { usePalette } from "@/hooks/use-palette";

// 7x7 pixel grids; "#" is a filled pixel.
const GRIDS = {
  // Chevrons are centred in the grid (columns 1-5) so they sit in the middle of square buttons.
  left: ["....##.", "...##..", "..##...", ".##....", "..##...", "...##..", "....##."],
  right: [".##....", "..##...", "...##..", "....##.", "...##..", "..##...", ".##...."],
  warning: ["...#...", "..#.#..", "..#.#..", ".##.##.", ".#####.", "###.###", "#######"],
  close: ["##...##", "###.###", ".#####.", "..###..", ".#####.", "###.###", "##...##"],
  lock: ["..###..", ".#...#.", ".#...#.", "#######", "###.###", "###.###", "#######"],
  gift: ["##.#.##", ".#####.", "#######", "#..#..#", "#######", "#..#..#", "#######"],
  speaker: ["..#....", ".##..#.", "###...#", "###.#.#", "###...#", ".##..#.", "..#...."],
  mute: ["..#....", ".##....", "###.#.#", "###..#.", "###.#.#", ".##....", "..#...."],
  note: ["..#####", "..#...#", "..#...#", "..#...#", "###.###", "###.###", "......."],
  sun: ["...#...", ".#...#.", "..###..", "#.###.#", "..###..", ".#...#.", "...#..."],
  moon: ["..###..", ".##....", "##.....", "##.....", "##.....", ".##....", "..###.."],
  save: ["######.", "#.##.##", "#.##..#", "#.....#", "#.###.#", "#.###.#", "#######"],
  play: [".#.....", ".##....", ".###...", ".####..", ".###...", ".##....", ".#....."],
  pause: [".##.##.", ".##.##.", ".##.##.", ".##.##.", ".##.##.", ".##.##.", ".##.##."],
  prev: ["#....#.", "#...##.", "#..###.", "#.####.", "#..###.", "#...##.", "#....#."],
  next: [".#....#", ".##...#", ".###..#", ".####.#", ".###..#", ".##...#", ".#....#"],
  heart: [".......", ".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."],
  edit: [".....##", "....###", "...###.", "..###..", ".###...", "##.....", "##....."],
  check: [".......", "......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."],
} as const;

export type PixelIconName = keyof typeof GRIDS;

/** SVG path for a pixel grid ("#" = filled), one unit per pixel. Also used by background patterns. */
export const pixelPath = (grid: readonly string[]) =>
  grid.flatMap((row, y) => [...row].map((c, x) => (c === "#" ? `M${x} ${y}h1v1h-1z` : ""))).join("");

const PATHS = Object.fromEntries(Object.entries(GRIDS).map(([k, g]) => [k, pixelPath(g)])) as Record<PixelIconName, string>;

/** Crisp pixel-art glyphs that match the Silkscreen font. */
export const PixelIcon = memo(function PixelIcon({ name, size = 16, color }: { name: PixelIconName; size?: number; color?: string }) {
  const palette = usePalette();
  return (
    <Svg width={size} height={size} viewBox="0 0 7 7">
      <Path d={PATHS[name]} fill={color ?? palette.ink} />
    </Svg>
  );
});

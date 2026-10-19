import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from "react-native-svg";

import { pixelPath } from "@/components/ui/pixel-icon";
import type { ThemeName } from "@/constants/theme";

type PatternKind = "grid" | "crosses" | "dots" | "stripes" | "checker" | "hearts" | "plain";
type Colors = { bg: string; line: string };

/** Background presets: each has its own pattern and its own colours per theme. Order is saved by index. */
export const BACKGROUNDS: { name: string; pattern: PatternKind; light: Colors; dark: Colors }[] = [
  { name: "Rose Grid", pattern: "grid", light: { bg: "#f9e8e8", line: "#f8cdd4" }, dark: { bg: "#0f1c24", line: "#1b3341" } },
  { name: "Mint Crosses", pattern: "crosses", light: { bg: "#e5f6ec", line: "#b9e4c9" }, dark: { bg: "#0c1d16", line: "#1a3a2b" } },
  { name: "Lavender Dots", pattern: "dots", light: { bg: "#eeeafc", line: "#cdc4f4" }, dark: { bg: "#15132a", line: "#2c2752" } },
  { name: "Peach Stripes", pattern: "stripes", light: { bg: "#fff1e2", line: "#ffd9b3" }, dark: { bg: "#21160c", line: "#3b2914" } },
  { name: "Sky Checker", pattern: "checker", light: { bg: "#e4f2fb", line: "#c6e3f6" }, dark: { bg: "#0b1923", line: "#163142" } },
  { name: "Candy Hearts", pattern: "hearts", light: { bg: "#fdeef3", line: "#f6c2d4" }, dark: { bg: "#22101a", line: "#43203a" } },
  { name: "Plain", pattern: "plain", light: { bg: "#f9e8e8", line: "#f9e8e8" }, dark: { bg: "#0f1c24", line: "#0f1c24" } },
];

const TILE = 28;
/** Time to drift one tile diagonally; the loop is seamless because the pattern repeats every tile. */
const DRIFT_MS = 3_500;
const HEART = pixelPath([".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]);

function Tile({ kind, color }: { kind: PatternKind; color: string }) {
  const h = TILE / 2;
  switch (kind) {
    case "grid":
      return <Path d={`M ${TILE} 0 L 0 0 0 ${TILE}`} fill="none" stroke={color} strokeWidth={4} />;
    case "crosses":
      return <Path d={`M ${h - 2} ${h - 6} h 4 v 4 h 4 v 4 h -4 v 4 h -4 v -4 h -4 v -4 h 4 z`} fill={color} />;
    case "dots":
      return <Circle cx={h} cy={h} r={3.5} fill={color} />;
    case "stripes":
      // Three segments so the diagonal stays continuous across tile edges.
      return (
        <Path
          d={`M 0 ${TILE} L ${TILE} 0 M ${-h} ${h} L ${h} ${-h} M ${h} ${TILE + h} L ${TILE + h} ${h}`}
          stroke={color}
          strokeWidth={7}
        />
      );
    case "checker":
      return (
        <>
          <Rect x={0} y={0} width={h} height={h} fill={color} />
          <Rect x={h} y={h} width={h} height={h} fill={color} />
        </>
      );
    case "hearts":
      return (
        <G transform={`translate(${h - 7} ${h - 6}) scale(2)`}>
          <Path d={HEART} fill={color} />
        </G>
      );
    default:
      return null;
  }
}

type Props = { index: number; theme: ThemeName; width: number; height: number };

/** Tiled, slowly drifting backdrop behind the medkit, coloured by the chosen preset. */
export const BackgroundPattern = memo(function BackgroundPattern({ index, theme, width, height }: Props) {
  const preset = BACKGROUNDS[index % BACKGROUNDS.length];
  const colors = preset[theme];
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drift.set(withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1, false));
  }, [drift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -TILE * drift.get() }, { translateY: -TILE * drift.get() }],
  }));

  // Oversized by one tile so the drift never exposes an edge.
  const w = width + TILE;
  const h = height + TILE;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: colors.bg }]}>
      {preset.pattern !== "plain" && (
        <Animated.View style={style}>
          <Svg width={w} height={h}>
            <Defs>
              <Pattern id="bg" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
                <Tile kind={preset.pattern} color={colors.line} />
              </Pattern>
            </Defs>
            <Rect width={w} height={h} fill="url(#bg)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
});

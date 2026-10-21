import { memo, useEffect } from "react";
import { Image } from "@/components/ui/image";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from "react-native-svg";

import { pixelPath } from "@/components/ui/pixel-icon";
import { BACKGROUNDS, type AnimatedKind, type Colors, type PatternKind } from "@/constants/backgrounds";
import type { ThemeName } from "@/constants/theme";

const TILE = 28;
/** Time to drift one tile diagonally; the loop is seamless because the pattern repeats every tile. */
const DRIFT_MS = 3_500;
const HEART = pixelPath([".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]);
const MOON = pixelPath(["..###..", ".##....", "##.....", "##.....", "##.....", ".##....", "..###.."]);

const ANIMATED = new Set<string>(["rain", "ecg", "stars", "cells", "sakura", "fireflies", "snowfall", "aurora"]);
const isAnimated = (k: PatternKind | AnimatedKind): k is AnimatedKind => ANIMATED.has(k);

const SPRITES = {
  petal: require("@/imgs/gems/p_petal.png"),
  petal2: require("@/imgs/gems/p_petal2.png"),
  firefly: require("@/imgs/gems/p_firefly.png"),
  snow: require("@/imgs/gems/p_snow.png"),
};

/** Deterministic 0-1 noise per index, so layouts don't jump between renders. */
const noise = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 * salt + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

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

/** Purple Rain: a streak falling at its own speed. */
const Drop = memo(function Drop({ i, height, left, color }: { i: number; height: number; left: number; color: string }) {
  const y = useSharedValue(0);
  const len = 10 + noise(i, 2) * 14;
  const ms = 900 + noise(i, 3) * 900;
  useEffect(() => {
    y.set(withDelay(noise(i, 4) * ms, withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)));
  }, [y, i, ms]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -len + y.get() * (height + len * 2) }] }));
  return <Animated.View style={[{ position: "absolute", left, top: 0, width: 2, height: len, backgroundColor: color, opacity: 0.35 + noise(i, 5) * 0.5 }, style]} />;
});

/** Night Shift Sky: a twinkling star. */
const Star = memo(function Star({ i, left, top, color }: { i: number; left: number; top: number; color: string }) {
  const o = useSharedValue(0.25);
  const ms = 1200 + noise(i, 6) * 1800;
  useEffect(() => {
    o.set(withDelay(noise(i, 7) * ms, withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) }), -1, true)));
  }, [o, i, ms]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  const s = noise(i, 8) > 0.8 ? 4 : 2;
  return <Animated.View style={[{ position: "absolute", left, top, width: s, height: s, backgroundColor: color }, style]} />;
});

/** Blood Stream: a red cell drifting across with a gentle wobble. */
const Cell = memo(function Cell({ i, width, top, colors }: { i: number; width: number; top: number; colors: Colors }) {
  const x = useSharedValue(noise(i, 13));
  const r = 7 + noise(i, 11) * 6;
  const ms = 9000 + noise(i, 12) * 9000;
  useEffect(() => {
    // Start part-way across, then loop from the left edge.
    const start = noise(i, 13);
    x.set(withSequence(withTiming(1, { duration: ms * (1 - start), easing: Easing.linear }), withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: ms, easing: Easing.linear })), -1, false)));
  }, [x, i, ms]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -r * 3 + x.get() * (width + r * 6) }, { translateY: Math.sin(x.get() * 12.56 + i) * 8 }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top, width: r * 2.4, height: r * 1.6 }, style]}>
      <View style={{ flex: 1, borderRadius: r, backgroundColor: colors.line, alignItems: "center", justifyContent: "center", opacity: 0.75 }}>
        <View style={{ width: r * 1.1, height: r * 0.55, borderRadius: r, backgroundColor: colors.accent }} />
      </View>
    </Animated.View>
  );
});

/** Sakura Breeze and First Snow: a sprite drifting down and sideways, swaying and turning. */
const Faller = memo(function Faller({ i, width, height, image, px, wind, spin }: { i: number; width: number; height: number; image: number; px: number; wind: number; spin: boolean }) {
  const y = useSharedValue(0);
  const ms = 6000 + noise(i, 21) * 6000;
  useEffect(() => {
    y.set(withDelay(noise(i, 22) * ms, withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)));
  }, [y, i, ms]);
  const x0 = noise(i, 23) * width;
  const style = useAnimatedStyle(() => {
    const k = y.get();
    return {
      transform: [
        { translateX: x0 + wind * k * width * 0.35 + Math.sin(k * 6.28 * 2 + i) * 14 },
        { translateY: -px + k * (height + px * 2) },
        { rotate: spin ? `${k * 360 * (i % 2 ? 1 : -1)}deg` : "0deg" },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: px, height: px, opacity: 0.6 + noise(i, 24) * 0.4 }, style]}>
      <Image source={image} style={{ width: px, height: px }} contentFit="contain" />
    </Animated.View>
  );
});

/** Firefly Night: a firefly wandering slowly and glowing on and off. */
const Firefly = memo(function Firefly({ i, width, height }: { i: number; width: number; height: number }) {
  const t = useSharedValue(0);
  const glow = useSharedValue(0.2);
  const ms = 7000 + noise(i, 31) * 7000;
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true));
    glow.set(withDelay(noise(i, 32) * 2000, withRepeat(withTiming(1, { duration: 900 + noise(i, 33) * 900, easing: Easing.inOut(Easing.quad) }), -1, true)));
  }, [t, glow, i, ms]);
  const cx = noise(i, 34) * width;
  const cy = height * (0.3 + noise(i, 35) * 0.65);
  const rx = 30 + noise(i, 36) * 50;
  const ry = 20 + noise(i, 37) * 30;
  const style = useAnimatedStyle(() => ({
    opacity: glow.get(),
    transform: [{ translateX: cx + Math.cos(t.get() * 6.28 + i) * rx }, { translateY: cy + Math.sin(t.get() * 6.28 * 1.5 + i) * ry }, { scale: 0.8 + glow.get() * 0.5 }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: 18, height: 18 }, style]}>
      <Image source={SPRITES.firefly} style={{ width: 18, height: 18 }} contentFit="contain" />
    </Animated.View>
  );
});

/** Aurora Ward: a wide ribbon of light that waves and breathes. */
const AuroraBand = memo(function AuroraBand({ i, width, height, color }: { i: number; width: number; height: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 9000 + i * 2500, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, i]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.18 + 0.22 * t.get(),
    transform: [{ translateX: -width * 0.25 + t.get() * width * 0.25 * (i % 2 ? -1 : 1) }, { rotate: `${-12 + i * 9 + t.get() * 6}deg` }, { scaleY: 0.8 + t.get() * 0.4 }],
  }));
  return <Animated.View style={[{ position: "absolute", left: -width * 0.25, top: height * (0.12 + i * 0.13), width: width * 1.5, height: height * 0.14, borderRadius: height * 0.07, backgroundColor: color }, style]} />;
});

const ECG_PERIOD = 160;
/** One heartbeat of trace from x0: flat, P wave, QRS spike, T wave, flat. `spike` sets the R height. */
const beatPath = (x0: number, y: number, spike: number) =>
  `L ${x0 + 30} ${y} Q ${x0 + 38} ${y - 8} ${x0 + 46} ${y} L ${x0 + 56} ${y} L ${x0 + 60} ${y + 6} L ${x0 + 66} ${y - spike} L ${x0 + 72} ${y + 16} L ${x0 + 77} ${y} L ${x0 + 92} ${y} Q ${x0 + 104} ${y - 14} ${x0 + 116} ${y} L ${x0 + ECG_PERIOD} ${y}`;

/** Heart Monitor: a scrolling ECG trace over a monitor grid, with a heart pulsing on each beat. */
function Ecg({ width, height, colors }: { width: number; height: number; colors: Colors }) {
  const t = useSharedValue(0);
  const beat = useSharedValue(1);
  useEffect(() => {
    // ~70 bpm: one period per beat.
    t.set(withRepeat(withTiming(1, { duration: 860, easing: Easing.linear }), -1, false));
    beat.set(withRepeat(withSequence(withTiming(1.15, { duration: 120 }), withTiming(1, { duration: 740 })), -1, false));
  }, [t, beat]);
  const scroll = useAnimatedStyle(() => ({ transform: [{ translateX: -ECG_PERIOD * t.get() }] }));
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: beat.get() }] }));
  const w = width + ECG_PERIOD * 2;
  const y1 = height * 0.42, y2 = height * 0.8;
  let d = `M 0 ${y1}`, d2 = `M 0 ${y2}`;
  for (let x = 0; x < w; x += ECG_PERIOD) {
    d += " " + beatPath(x, y1, 42);
    d2 += " " + beatPath(x, y2, 20);
  }
  const hs = Math.min(width, height) * 0.05;
  return (
    <>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="ecg-grid" width={20} height={20} patternUnits="userSpaceOnUse">
            <Path d="M 20 0 L 0 0 0 20" fill="none" stroke={colors.accent} strokeWidth={1.5} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#ecg-grid)" />
      </Svg>
      <Animated.View style={[{ position: "absolute", left: (width - hs * 7) / 2, top: (height - hs * 6) / 2, opacity: 0.18 }, pulse]}>
        <Svg width={hs * 7} height={hs * 6}>
          <G transform={`scale(${hs})`}>
            <Path d={HEART} fill={colors.line} />
          </G>
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, scroll]}>
        <Svg width={w} height={height}>
          <Path d={d} fill="none" stroke={colors.line} strokeWidth={3} strokeLinejoin="round" />
          <Path d={d2} fill="none" stroke={colors.line} strokeWidth={2} strokeLinejoin="round" opacity={0.4} />
        </Svg>
      </Animated.View>
    </>
  );
}

function AnimatedBackdrop({ kind, width, height, colors }: { kind: AnimatedKind; width: number; height: number; colors: Colors }) {
  const many = (n: number) => Array.from({ length: n }, (_, i) => i);
  switch (kind) {
    case "rain":
      return (
        <>
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.35, backgroundColor: colors.accent, opacity: 0.3 }} />
          {many(24).map((i) => (
            <Drop key={i} i={i} height={height} left={noise(i) * width} color={i % 3 ? colors.line : (colors.accent ?? colors.line)} />
          ))}
        </>
      );
    case "ecg":
      return <Ecg width={width} height={height} colors={colors} />;
    case "stars":
      return (
        <>
          {many(30).map((i) => (
            <Star key={i} i={i} left={noise(i, 9) * width} top={noise(i, 10) * height} color={colors.line} />
          ))}
          <Svg width={42} height={42} style={{ position: "absolute", right: width * 0.12, top: height * 0.12 }}>
            <G transform="scale(6)">
              <Path d={MOON} fill={colors.line} />
            </G>
          </Svg>
        </>
      );
    case "cells":
      return (
        <>
          {many(14).map((i) => (
            <Cell key={i} i={i} width={width} top={noise(i, 14) * height} colors={colors} />
          ))}
        </>
      );
    case "sakura":
      return (
        <>
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: height * 0.45, backgroundColor: colors.accent, opacity: 0.35 }} />
          {many(16).map((i) => (
            <Faller key={i} i={i} width={width} height={height} image={i % 3 ? SPRITES.petal : SPRITES.petal2} px={14 + noise(i, 25) * 10} wind={0.8} spin />
          ))}
        </>
      );
    case "fireflies":
      return (
        <>
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.22, backgroundColor: colors.line }} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: height * 0.22, height: height * 0.06, backgroundColor: colors.accent }} />
          {many(14).map((i) => (
            <Firefly key={i} i={i} width={width} height={height} />
          ))}
        </>
      );
    case "snowfall":
      return (
        <>
          <View style={{ position: "absolute", left: -20, right: -20, bottom: -height * 0.05, height: height * 0.16, borderTopLeftRadius: height * 0.2, borderTopRightRadius: height * 0.3, backgroundColor: colors.line, opacity: 0.85 }} />
          {many(22).map((i) => (
            <Faller key={i} i={i} width={width} height={height} image={SPRITES.snow} px={10 + noise(i, 26) * 10} wind={-0.3} spin={false} />
          ))}
        </>
      );
    case "aurora":
      return (
        <>
          {many(3).map((i) => (
            <AuroraBand key={i} i={i} width={width} height={height} color={i === 1 ? (colors.accent ?? colors.line) : colors.line} />
          ))}
          {many(20).map((i) => (
            <Star key={i} i={i} left={noise(i, 9) * width} top={noise(i, 10) * height} color={colors.line} />
          ))}
        </>
      );
  }
}

type Props = { index: number; theme: ThemeName; width: number; height: number };

/** Backdrop behind the medkit: a slowly drifting tiled pattern, or one of the animated scenes. */
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
  const pattern = preset.pattern;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: colors.bg }]}>
      {isAnimated(pattern) && !reduceMotion && <AnimatedBackdrop kind={pattern} width={width} height={height} colors={colors} />}
      {!isAnimated(pattern) && pattern !== "plain" && (
        <Animated.View style={style}>
          <Svg width={w} height={h}>
            <Defs>
              <Pattern id="bg" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
                <Tile kind={pattern} color={colors.line} />
              </Pattern>
            </Defs>
            <Rect width={w} height={h} fill="url(#bg)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
});

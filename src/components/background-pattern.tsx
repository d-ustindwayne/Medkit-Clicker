import { createContext, memo, use, useEffect, useState } from "react";
import { Image } from "@/components/ui/image";
import { AppState, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";

import { CustomMedia } from "@/components/custom-media";
import { pixelPath } from "@/components/ui/pixel-icon";
import { BACKGROUNDS, type AnimatedKind, type Colors, type PatternKind } from "@/constants/backgrounds";
import type { ThemeName } from "@/constants/theme";
import { useCustomBackground } from "@/lib/custom-bg-store";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

const TILE = 28;
/** Time to drift one tile diagonally; the loop is seamless because the pattern repeats every tile. */
const DRIFT_MS = 3_500;
const HEART = pixelPath([".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]);
const MOON = pixelPath(["..###..", ".##....", "##.....", "##.....", "##.....", ".##....", "..###.."]);

const ANIMATED = new Set<string>(["rain", "ecg", "stars", "cells", "sakura", "fireflies", "snowfall", "aurora", "galaxy"]);
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

/** Tilting the phone: -1 to 1 each way, eased, relative to how the phone is usually held. */
type Tilt = SharedValue<{ x: number; y: number }>;
const TiltContext = createContext<Tilt | null>(null);
/** The backdrop is drawn this much bigger on every side, so shifting it never shows an edge. */
const TILT_PAD = 28;
/** How far the whole backdrop shifts at full tilt. */
const TILT_BASE_PX = 12;
/** How far a layer shifts on top of that at full tilt, times its depth (0 far, 1 near). */
const TILT_LAYER_PX = 16;
/** A layer's extra tilt shift; call inside an animated style. */
const tiltShift = (tilt: Tilt | null, depth: number) => {
  "worklet";
  const t = tilt ? tilt.get() : { x: 0, y: 0 };
  return [{ translateX: t.x * depth * TILT_LAYER_PX }, { translateY: t.y * depth * TILT_LAYER_PX }];
};

/**
 * Reads the gravity sensor into `tilt`. The rest position slowly follows how the phone is held, so
 * only tilting it moves the backdrop. Mounted only while motion is allowed.
 */
function TiltSensor({ tilt }: { tilt: Tilt }) {
  const sensor = useAnimatedSensor(SensorType.GRAVITY);
  const rest = useSharedValue<{ x: number; y: number } | null>(null);
  useAnimatedReaction(
    () => sensor.sensor.get(),
    (g) => {
      const r0 = rest.get() ?? { x: g.x, y: g.y };
      const r = { x: r0.x + (g.x - r0.x) * 0.004, y: r0.y + (g.y - r0.y) * 0.004 };
      rest.set(r);
      // About 25 degrees of tilt is full tilt. (Written out, not as a helper: a function made here
      // can end up outside the worklet and crash the UI thread.)
      const tx = Math.max(-1, Math.min(1, (r.x - g.x) / 4));
      const ty = Math.max(-1, Math.min(1, (g.y - r.y) / 4));
      const t = tilt.get();
      tilt.set({ x: t.x + (tx - t.x) * 0.15, y: t.y + (ty - t.y) * 0.15 });
    },
  );
  useEffect(() => () => tilt.set({ x: 0, y: 0 }), [tilt]);
  return null;
}

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

/** A tint that fades out towards the middle of the screen, with no hard edge. `from` is the solid side. */
function Wash({ width, height, color, opacity, from }: { width: number; height: number; color: string; opacity: number; from: "top" | "bottom" }) {
  const id = `wash-${from}`;
  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, [from]: 0 }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1={from === "top" ? "0" : "1"} x2="0" y2={from === "top" ? "1" : "0"}>
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Purple Rain: a streak falling at its own speed. */
const Drop = memo(function Drop({ i, height, left, color }: { i: number; height: number; left: number; color: string }) {
  const y = useSharedValue(0);
  const len = 10 + noise(i, 2) * 14;
  const ms = 900 + noise(i, 3) * 900;
  useEffect(() => {
    y.set(withDelay(noise(i, 4) * ms, withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)));
  }, [y, i, ms]);
  const tilt = use(TiltContext);
  const depth = (len - 10) / 14;
  const style = useAnimatedStyle(() => ({ transform: [...tiltShift(tilt, depth), { translateY: -len + y.get() * (height + len * 2) }] }));
  return <Animated.View style={[{ position: "absolute", left, top: 0, width: 2, height: len, backgroundColor: color, opacity: 0.35 + noise(i, 5) * 0.5 }, style]} />;
});

/** Night Shift Sky: a twinkling star. */
const Star = memo(function Star({ i, left, top, color }: { i: number; left: number; top: number; color: string }) {
  const o = useSharedValue(0.25);
  const ms = 1200 + noise(i, 6) * 1800;
  useEffect(() => {
    o.set(withDelay(noise(i, 7) * ms, withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) }), -1, true)));
  }, [o, i, ms]);
  const tilt = use(TiltContext);
  const s = noise(i, 8) > 0.8 ? 4 : 2;
  const style = useAnimatedStyle(() => ({ opacity: o.get(), transform: tiltShift(tilt, s === 4 ? 0.25 : 0.1) }));
  return <Animated.View style={[{ position: "absolute", left, top, width: s, height: s, backgroundColor: color }, style]} />;
});

/**
 * Blood Stream: a red blood cell drifting across with a gentle wobble. It's a disc with a darker rim
 * and a pale dimple in the middle, and it slowly tumbles (squashing to its edge and back). Smaller
 * cells are fainter and slower, so they read as further away.
 */
const Cell = memo(function Cell({ i, width, top, colors }: { i: number; width: number; top: number; colors: Colors }) {
  const x = useSharedValue(noise(i, 13));
  const turn = useSharedValue(0);
  const depth = noise(i, 11);
  const r = 6 + depth * 9;
  const ms = (9000 + noise(i, 12) * 9000) * (1.4 - depth * 0.6);
  useEffect(() => {
    // Start part-way across, then loop from the left edge.
    const start = noise(i, 13);
    x.set(withSequence(withTiming(1, { duration: ms * (1 - start), easing: Easing.linear }), withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: ms, easing: Easing.linear })), -1, false)));
    turn.set(withDelay(noise(i, 15) * 3000, withRepeat(withTiming(1, { duration: 2600 + noise(i, 16) * 2600, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [x, turn, i, ms]);
  const angle = (noise(i, 17) - 0.5) * 70;
  const tilt = use(TiltContext);
  const style = useAnimatedStyle(() => ({
    transform: [
      ...tiltShift(tilt, depth),
      { translateX: -r * 3 + x.get() * (width + r * 6) },
      { translateY: Math.sin(x.get() * 12.56 + i) * 8 },
      { rotate: `${angle}deg` },
      { scaleX: 1 - turn.get() * 0.55 },
    ],
  }));
  const d = r * 2;
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top, width: d, height: d, opacity: 0.45 + depth * 0.45 }, style]}>
      <View style={{ width: d, height: d, borderRadius: r, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: d * 0.74, height: d * 0.74, borderRadius: r, backgroundColor: colors.line, alignItems: "center", justifyContent: "center" }}>
          {/* The dimple: paler still in the middle. */}
          <View style={{ width: d * 0.38, height: d * 0.38, borderRadius: r, backgroundColor: "#ffffff", opacity: 0.22 }} />
        </View>
        {/* A small shine on the upper rim. */}
        <View style={{ position: "absolute", left: d * 0.2, top: d * 0.12, width: d * 0.22, height: d * 0.1, borderRadius: r, backgroundColor: "#ffffff", opacity: 0.35 }} />
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
  const tilt = use(TiltContext);
  const depth = noise(i, 24);
  const style = useAnimatedStyle(() => {
    const k = y.get();
    return {
      transform: [
        ...tiltShift(tilt, depth),
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
  const tilt = use(TiltContext);
  const depth = 0.3 + noise(i, 38) * 0.7;
  const style = useAnimatedStyle(() => ({
    opacity: glow.get(),
    transform: [...tiltShift(tilt, depth), { translateX: cx + Math.cos(t.get() * 6.28 + i) * rx }, { translateY: cy + Math.sin(t.get() * 6.28 * 1.5 + i) * ry }, { scale: 0.8 + glow.get() * 0.5 }],
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
  const tilt = use(TiltContext);
  const style = useAnimatedStyle(() => ({
    opacity: 0.18 + 0.22 * t.get(),
    transform: [...tiltShift(tilt, 0.15 + i * 0.2), { translateX: -width * 0.25 + t.get() * width * 0.25 * (i % 2 ? -1 : 1) }, { rotate: `${-12 + i * 9 + t.get() * 6}deg` }, { scaleY: 0.8 + t.get() * 0.4 }],
  }));
  return <Animated.View style={[{ position: "absolute", left: -width * 0.25, top: height * (0.12 + i * 0.13), width: width * 1.5, height: height * 0.14, borderRadius: height * 0.07, backgroundColor: color }, style]} />;
});

/** Galaxy: one turn of the spiral takes this long. */
const GALAXY_TURN_MS = 240_000;
/** Soft glows laid along each arm, and the pixel stars scattered over them. */
const GALAXY_GLOWS = 44;
const GALAXY_STARS = 110;
/** The arms' colours from the core outwards: rose, violet, then teal at the tips. */
const ARM_COLOURS = ["#ff9ad5", "#c08cff", "#8f7bff", "#6fd6ff"];
/**
 * Galaxy: a two-armed spiral drawn as soft overlapping glows (rose near the core, violet, then
 * teal at the tips) around a bright pink-white core, with square pixel stars sprinkled along the
 * arms, seen at a slant and slowly turning. Not a real galaxy, a pretty one. It's drawn once and
 * only turned: on Android it's kept as a texture, so the turning costs no redrawing.
 */
const GalaxySpiral = memo(function GalaxySpiral({ width, height, colors }: { width: number; height: number; colors: Colors }) {
  // Wider than the screen, so the arms sweep out well past the medkit in the middle.
  const d = Math.max(width, height) * 1.25;
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(withRepeat(withTiming(1, { duration: GALAXY_TURN_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(spin);
  }, [spin]);
  const tilt = use(TiltContext);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  const lean = useAnimatedStyle(() => ({ transform: [...tiltShift(tilt, 0.3), { rotate: "-18deg" }, { scaleY: 0.58 }] }));
  const r = d / 2;
  // A point on arm `arm` (0 or 1), `k` of the way out (0 core, 1 tip).
  const onArm = (arm: number, k: number, jitter = 0) => {
    const a = arm * Math.PI + k * Math.PI * 2.6 + jitter;
    const dist = r * (0.07 + k * 0.86);
    return { x: r + Math.cos(a) * dist, y: r + Math.sin(a) * dist };
  };
  const glows = Array.from({ length: GALAXY_GLOWS * 2 }, (_, i) => {
    const arm = i % 2;
    // Spaced evenly along the arm (the arm gets longer per turn further out), so the tips don't break up.
    const t = Math.floor(i / 2) / (GALAXY_GLOWS - 1);
    const k = Math.sqrt(t);
    return { ...onArm(arm, k, (noise(i, 46) - 0.5) * 0.06), rr: r * (0.15 - k * 0.07), fill: `url(#gxArm${Math.min(3, Math.floor(t * 4))})` };
  });
  const stars = Array.from({ length: GALAXY_STARS }, (_, i) => {
    const k = noise(i, 41);
    const p = onArm(i % 2, k, (noise(i, 42) - 0.5) * (0.5 + k * 0.5));
    const spread = r * 0.06 * (noise(i, 43) - 0.5);
    const s = noise(i, 44) > 0.88 ? 5 : noise(i, 44) > 0.45 ? 3 : 2;
    return { x: p.x + spread, y: p.y + spread, s, o: 0.95 - k * 0.45 };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: (width - d) / 2, top: (height - d) / 2, width: d, height: d }, lean]}>
      <Animated.View style={[{ width: d, height: d }, turn]} renderToHardwareTextureAndroid>
        <Svg width={d} height={d}>
          <Defs>
            <RadialGradient id="gxHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.accent ?? colors.line} stopOpacity={0.45} />
              <Stop offset="0.55" stopColor="#3b2c8f" stopOpacity={0.18} />
              <Stop offset="1" stopColor="#0b0a2a" stopOpacity={0} />
            </RadialGradient>
            {ARM_COLOURS.map((c, j) => (
              <RadialGradient key={c} id={`gxArm${j}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={c} stopOpacity={0.42 - j * 0.05} />
                <Stop offset="0.55" stopColor={c} stopOpacity={0.14} />
                <Stop offset="1" stopColor={c} stopOpacity={0} />
              </RadialGradient>
            ))}
            <RadialGradient id="gxCore" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={1} />
              <Stop offset="0.22" stopColor="#ffe2f4" stopOpacity={0.95} />
              <Stop offset="0.55" stopColor="#ff9ad5" stopOpacity={0.45} />
              <Stop offset="1" stopColor="#9b5cff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r * 0.62} fill="url(#gxHalo)" />
          {glows.map((g, i) => (
            <Circle key={i} cx={g.x} cy={g.y} r={g.rr} fill={g.fill} />
          ))}
          <Circle cx={r} cy={r} r={r * 0.24} fill="url(#gxCore)" />
          {stars.map((p, i) => (
            <Rect key={i} x={Math.round(p.x)} y={Math.round(p.y)} width={p.s} height={p.s} fill={colors.line} opacity={p.o} />
          ))}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

/** How fast the monitor's cursor sweeps across, in px per second (about 70 bpm at the usual beat gap). */
const ECG_SPEED = 190;
type Trace = { d: string; d2: string; spikes: number[] };

/** One heartbeat of trace from x0: flat, P wave, QRS spike, T wave. `spike` sets the R height; `t` the T wave's. */
const beatPath = (x0: number, y: number, spike: number, t: number) =>
  `L ${x0} ${y} Q ${x0 + 8} ${y - 8} ${x0 + 16} ${y} L ${x0 + 26} ${y} L ${x0 + 30} ${y + 6} L ${x0 + 36} ${y - spike} L ${x0 + 42} ${y + spike * 0.38} L ${x0 + 47} ${y} L ${x0 + 62} ${y} Q ${x0 + 74} ${y - t} ${x0 + 86} ${y}`;

/**
 * One sweep's trace, made up fresh each time: beats come at uneven gaps (now and then a quick extra
 * one), each with its own height, so the monitor never repeats a loop.
 */
function makeTrace(width: number, y1: number, y2: number): Trace {
  let d = `M 0 ${y1}`, d2 = `M 0 ${y2}`;
  const spikes: number[] = [];
  let x = 20 + Math.random() * 80;
  while (x < width) {
    const spike = 26 + Math.random() * 30;
    const t = 9 + Math.random() * 9;
    d += " " + beatPath(x, y1, spike, t);
    d2 += " " + beatPath(x, y2, spike * 0.45, t * 0.6);
    spikes.push(x + 36);
    // Usually 120-200 px to the next beat; sometimes an early one.
    x += Math.random() < 0.12 ? 95 + Math.random() * 15 : 120 + Math.random() * 80;
  }
  d += ` L ${width} ${y1}`;
  d2 += ` L ${width} ${y2}`;
  return { d, d2, spikes };
}

/** One sweep of trace, clipped to one side of the cursor (screen x, read on the UI thread). */
function TraceLayer({ trace, width, height, color, side, cursor }: { trace: Trace; width: number; height: number; color: string; side: "new" | "old"; cursor: SharedValue<number> }) {
  // The new sweep shows left of the cursor and the old one right of it, meeting with no gap. The
  // outer view slides to the edge and clips; the inner one slides back so the trace stays put on screen.
  const outer = useAnimatedStyle(() => ({ transform: [{ translateX: side === "new" ? cursor.get() - width : cursor.get() }] }));
  const inner = useAnimatedStyle(() => ({ transform: [{ translateX: side === "new" ? width - cursor.get() : -cursor.get() }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden" }, outer]}>
      <Animated.View style={inner}>
        <Svg width={width} height={height}>
          <Path d={trace.d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
          <Path d={trace.d2} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" opacity={0.4} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** The sweep bar's width, and how far it runs ahead of the fresh trace. */
const ECG_BAR_W = 5;
const ECG_BAR_LEAD = 3;

/**
 * Heart Monitor: a bedside monitor. A cursor sweeps left to right drawing a fresh trace over the
 * last one, with uneven beats, and the heart behind it pulses as each spike is drawn. Like a real
 * monitor's cursor, a bar (white in light theme, black in dark) runs just ahead of the new trace.
 */
function Ecg({ width, height, colors, theme }: { width: number; height: number; colors: Colors; theme: ThemeName }) {
  const y1 = height * 0.42, y2 = height * 0.8;
  const [traces, setTraces] = useState(() => ({ old: makeTrace(width, y1, y2), now: makeTrace(width, y1, y2) }));
  const cursor = useSharedValue(0);
  const spikes = useSharedValue<number[]>([]);
  // The sweep covers only what can be seen (the backdrop runs past the screen for tilting), so one
  // pass follows the next with no pause off-screen.
  const from = TILT_PAD - TILT_BASE_PX;
  const to = width - from;
  const ms = ((to - from) / ECG_SPEED) * 1000;
  const tilt = use(TiltContext);
  useEffect(() => {
    spikes.set(traces.now.spikes);
    cursor.set(from);
    cursor.set(withTiming(to, { duration: ms, easing: Easing.linear }));
    // At the end of the sweep this one becomes the old trace and a new one starts.
    const id = setTimeout(() => setTraces((tr) => ({ old: tr.now, now: makeTrace(width, y1, y2) })), ms);
    return () => clearTimeout(id);
  }, [traces, cursor, spikes, width, ms, y1, y2, from, to]);
  // The heart swells as the cursor draws a spike and settles over the next ~100 px.
  const pulse = useAnimatedStyle(() => {
    const c = cursor.get();
    let k = 0;
    for (const s of spikes.get()) if (c >= s && c - s < 100) k = Math.max(k, 1 - (c - s) / 100);
    return { transform: [...tiltShift(tilt, 0.25), { scale: 1 + 0.15 * k * k }] };
  });
  const traceShift = useAnimatedStyle(() => ({ transform: tiltShift(tilt, 0.7) }));
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: cursor.get() + ECG_BAR_LEAD }] }));
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
      <Animated.View style={[StyleSheet.absoluteFill, traceShift]}>
        <TraceLayer trace={traces.old} width={width} height={height} color={colors.line} side="old" cursor={cursor} />
        <TraceLayer trace={traces.now} width={width} height={height} color={colors.line} side="new" cursor={cursor} />
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", left: 0, top: 0, width: ECG_BAR_W, height, backgroundColor: theme === "dark" ? "#000000" : "#ffffff", opacity: 0.85 }, bar]}
        />
      </Animated.View>
    </>
  );
}

function AnimatedBackdrop({ kind, width, height, colors, theme }: { kind: AnimatedKind; width: number; height: number; colors: Colors; theme: ThemeName }) {
  const many = (n: number) => Array.from({ length: n }, (_, i) => i);
  switch (kind) {
    case "rain":
      return (
        <>
          <Wash width={width} height={height * 0.45} color={colors.accent ?? colors.line} opacity={0.35} from="bottom" />
          {many(24).map((i) => (
            <Drop key={i} i={i} height={height} left={noise(i) * width} color={i % 3 ? colors.line : (colors.accent ?? colors.line)} />
          ))}
        </>
      );
    case "ecg":
      return <Ecg width={width} height={height} colors={colors} theme={theme} />;
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
          <Wash width={width} height={height * 0.55} color={colors.accent ?? colors.line} opacity={0.4} from="top" />
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
    case "galaxy":
      return (
        <>
          <Wash width={width} height={height * 0.6} color={colors.accent ?? colors.line} opacity={0.22} from="top" />
          {many(24).map((i) => (
            <Star key={i} i={i} left={noise(i, 9) * width} top={noise(i, 10) * height} color={colors.line} />
          ))}
          <GalaxySpiral width={width} height={height} colors={colors} />
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

/** The player's own photo, GIF or video clip, framed as they chose, covering the backdrop. */
function CustomPhoto({ width, height, theme }: { width: number; height: number; theme: ThemeName }) {
  const bg = useCustomBackground();
  return bg ? <CustomMedia bg={bg} width={width} height={height} theme={theme} /> : null;
}

/** Backdrop behind the medkit: a slowly drifting tiled pattern, or one of the animated scenes. */
export const BackgroundPattern = memo(function BackgroundPattern({ index, theme, width, height }: Props) {
  const preset = BACKGROUNDS[index % BACKGROUNDS.length];
  const colors = preset[theme];
  const reduceMotion = useReduceMotion();
  // The tilt sensor only runs while the game is on screen, not in the background.
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);
  const drift = useSharedValue(0);
  const tilt = useSharedValue({ x: 0, y: 0 });
  const base = useAnimatedStyle(() => ({ transform: [{ translateX: tilt.get().x * TILT_BASE_PX }, { translateY: tilt.get().y * TILT_BASE_PX }] }));

  useEffect(() => {
    if (reduceMotion) return;
    // Always from 0: a loop restarted part-way would only cover the rest of the tile and look stuck.
    drift.set(0);
    drift.set(withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(drift);
      drift.set(0);
    };
  }, [drift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -TILE * drift.get() }, { translateY: -TILE * drift.get() }],
  }));

  // The backdrop is drawn past every edge (TILT_PAD) so tilting never shows one; the tiled pattern
  // is one tile bigger again so its drift doesn't either.
  const bw = width + TILT_PAD * 2;
  const bh = height + TILT_PAD * 2;
  const w = bw + TILE;
  const h = bh + TILE;
  const pattern = preset.pattern;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", backgroundColor: colors.bg }]}>
      {!reduceMotion && active && <TiltSensor tilt={tilt} />}
      <TiltContext value={tilt}>
        <Animated.View style={[{ position: "absolute", left: -TILT_PAD, top: -TILT_PAD, width: bw, height: bh }, base]}>
          {isAnimated(pattern) && !reduceMotion && <AnimatedBackdrop kind={pattern} width={bw} height={bh} colors={colors} theme={theme} />}
          {pattern === "photo" && <CustomPhoto width={bw} height={bh} theme={theme} />}
          {!isAnimated(pattern) && pattern !== "plain" && pattern !== "photo" && (
            // Drawn once into a texture on Android and then only moved, not redrawn every frame. The view
            // is sized to the whole pattern: the texture is cut to the view, and a screen-sized one left a
            // bare strip on the right as the pattern drifted left.
            <Animated.View style={[{ width: w, height: h }, style]} renderToHardwareTextureAndroid>
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
        </Animated.View>
      </TiltContext>
    </View>
  );
});

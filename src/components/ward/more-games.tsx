import { memo, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Text, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { PixelButton } from "@/components/ui/pixel-button";
import { TapPressable } from "@/components/ui/press-down";
import { hardness, pickVariant, shuffle, useDone, useJuice, type GameProps } from "@/components/ward/game-kit";
import { SHOP_ITEMS } from "@/constants/items";
import { useAudio } from "@/hooks/use-audio";
import { useSettings } from "@/hooks/use-game";
import { PILL_COLORS, PILL_SIZES, PILL_VARIANTS, SIZE_NAMES, TWO_RULES, dealPills, type PillSpec, type PillsVariant } from "@/lib/pills";
import { rand } from "@/lib/random";
import { useHaptics } from "@/hooks/use-haptics";
import { SHOW_KEY_HINTS, useKeys } from "@/hooks/use-keys";

// Six more quick ward minigames, each a few seconds long, with a bit of life: things bob, pop
// and flip. They get harder with progress (see minigameLevel and minigameTuning), and each has a
// few variants that open up as the player's level rises (see pickVariant).

/** A countdown in seconds that calls `onEnd` once at zero. */
export function useCountdown(ms: number, onEnd: () => void) {
  const [left, setLeft] = useState(ms);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    const stop = Date.now() + ms;
    const id = setInterval(() => {
      const l = stop - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(id);
        end.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [ms]);
  return left;
}

export const Hint = ({ children }: { children: string }) => <Text className="text-center font-body text-sm text-ink opacity-70">{children}</Text>;
/** The keyboard controls, shown only where there are any (the web version). */
export const KeyHint = ({ children }: { children: string }) => (SHOW_KEY_HINTS ? <Text className="text-center font-pixel text-[10px] tracking-[1px] text-ink opacity-60">KEYS: {children}</Text> : null);

/** A thin timer bar that drains as time runs out and turns red near the end. */
export function TimeBar({ left, total }: { left: number; total: number }) {
  const k = Math.max(0, left / total);
  return (
    <View className="h-2 w-full border-[1.5px] border-outline bg-surface">
      <View className={`h-full ${k < 0.3 ? "bg-danger" : "bg-success"}`} style={{ width: `${k * 100}%` }} />
    </View>
  );
}

// ---------- Pulse Check: count the beats (steady or irregular), or spot the faster heart ----------
function Ripple({ beat }: { beat: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(0);
    t.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [beat, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - t.get()), transform: [{ scale: 0.8 + t.get() * 0.9 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: "#e2372b" }, style]} />;
}
/** Quiet time before the first beat, so the count starts cleanly. */
const PULSE_LEAD_MS = 1200;
/** Each beat animates for 240 ms; this leaves at least 0.1 s of rest before the next one. */
const PULSE_MIN_GAP_MS = 340;
const HEART = require("@/imgs/misc/heart.png");
const heartbeat = () => withSequence(withTiming(1.18, { duration: 70, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 170, easing: Easing.in(Easing.quad) }));

type PulseVariant = "count" | "irregular" | "faster";
function PulseGame(props: GameProps) {
  const [variant] = useState(() =>
    pickVariant<PulseVariant>(props.tuning.level, [
      { id: "count", from: 0 },
      { id: "irregular", from: 0.2 },
      { id: "faster", from: 0.4 },
    ]),
  );
  return variant === "faster" ? <FasterPulse {...props} /> : <CountPulse {...props} irregular={variant === "irregular"} />;
}

/** Count the beats. Irregular: the gaps between beats vary, so you can't count on the rhythm. */
function CountPulse({ onDone, tuning, irregular }: GameProps & { irregular: boolean }) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [setup] = useState(() => {
    // 5-7 beats for a new player, up to 20-30 later on.
    const beats = tuning.pulseBeats + rand(tuning.pulseSpread + 1);
    // Three answers in a row, with the right one anywhere among them (not always the middle).
    const first = beats - rand(3);
    let t = PULSE_LEAD_MS;
    const times = Array.from({ length: beats }, (_, k) => {
      if (k > 0) t += irregular ? Math.max(PULSE_MIN_GAP_MS, tuning.pulseGapMs * (0.55 + Math.random() * 0.9)) : tuning.pulseGapMs;
      return t;
    });
    return { beats, options: [first, first + 1, first + 2], times };
  });
  const [asking, setAsking] = useState(false);
  const [beat, setBeat] = useState(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    const timers = setup.times.map((at, k) =>
      setTimeout(() => {
        pulse.set(heartbeat());
        setBeat(k + 1);
      }, at),
    );
    timers.push(setTimeout(() => setAsking(true), setup.times[setup.times.length - 1] + 650));
    return () => timers.forEach(clearTimeout);
  }, [setup, pulse]);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  const [answered, setAnswered] = useState(false);
  const answer = (n: number) => {
    if (answered) return;
    setAnswered(true);
    const ok = n === setup.beats;
    if (ok) juice.pop();
    else juice.shake();
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    setTimeout(() => done(ok), 350);
  };
  const option = (k: number) => () => answer(setup.options[k]);
  useKeys({ ArrowLeft: option(0), ArrowDown: option(1), ArrowRight: option(2), "1": option(0), "2": option(1), "3": option(2) }, asking);
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <View className="h-36 w-36 items-center justify-center">
          {beat > 0 && <Ripple key={beat} beat={beat} />}
          <Animated.View style={heart}>
            <Image source={HEART} style={{ width: 110, height: 110 }} contentFit="contain" />
          </Animated.View>
        </View>
        {asking ? (
          <>
            <Text className="font-display text-base text-ink">How many beats?</Text>
            <View className="flex-row gap-3">
              {setup.options.map((n) => (
                <PixelButton key={n} label={String(n)} onPress={() => answer(n)} />
              ))}
            </View>
            <KeyHint>← ↓ → OR 1 2 3</KeyHint>
          </>
        ) : (
          <Hint>{beat === 0 ? (irregular ? "An irregular pulse. Get ready..." : "Get ready...") : irregular ? "Count every beat, however uneven..." : "Count the heartbeats..."}</Hint>
        )}
      </View>
    </Animated.View>
  );
}

/** Two patients' hearts beat side by side; tap the faster one. The gap narrows as the level rises. */
const LISTEN_MS = 4200;
function FasterPulse({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [setup] = useState(() => {
    const slow = tuning.pulseGapMs * 1.3;
    // The fast heart beats 45% quicker for a new player, only 18% quicker at the top.
    const fast = Math.max(PULSE_MIN_GAP_MS, slow / (1.45 - 0.27 * tuning.level));
    const fastSide = rand(2);
    return { fastSide, gaps: fastSide === 0 ? [fast, slow] : [slow, fast] };
  });
  const [asking, setAsking] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const left = useSharedValue(1);
  const right = useSharedValue(1);
  useEffect(() => {
    const beats = [setInterval(() => left.set(heartbeat()), setup.gaps[0]), setInterval(() => right.set(heartbeat()), setup.gaps[1])];
    const stop = setTimeout(() => setAsking(true), LISTEN_MS);
    return () => {
      beats.forEach(clearInterval);
      clearTimeout(stop);
    };
  }, [setup, left, right]);
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ scale: left.get() }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ scale: right.get() }] }));
  const pick = (side: number) => {
    if (!asking || picked !== null) return;
    const ok = side === setup.fastSide;
    setPicked(side);
    if (ok) juice.pop();
    else juice.shake();
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    setTimeout(() => done(ok), 400);
  };
  useKeys({ ArrowLeft: () => pick(0), ArrowRight: () => pick(1) });
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-display text-base text-ink">{asking ? "Which heart is faster?" : "Watch both hearts..."}</Text>
        <View className="flex-row gap-4">
          {[leftStyle, rightStyle].map((style, side) => (
            <TapPressable
              key={side}
              accessibilityRole="button"
              accessibilityLabel={side === 0 ? "Left heart" : "Right heart"}
              onDown={() => pick(side)}
              className={`h-32 w-32 items-center justify-center border-2 border-outline ${picked === side ? (side === setup.fastSide ? "bg-success/30" : "bg-danger/30") : "bg-surface"}`}
            >
              <Animated.View style={style}>
                <Image source={HEART} style={{ width: 84, height: 84 }} contentFit="contain" />
              </Animated.View>
            </TapPressable>
          ))}
        </View>
        <Hint>{asking ? "Tap the heart that beats faster." : "One pulse is racing. Which one?"}</Hint>
        <KeyHint>← OR →</KeyHint>
      </View>
    </Animated.View>
  );
}

// ---------- Sort the Meds: tap the pills that match: by colour, size, capsule, or two rules at once ----------
/**
 * One pill half; with Colour labels on, it shows its colour's first letter, black on a white badge
 * so it reads on every colour.
 */
function PillHalf({ color, label, size }: { color: string; label?: string; size: number }) {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: color }}>
      {label && (
        <View className="items-center justify-center rounded-full bg-white/90" style={{ minWidth: size + 6, height: size + 4 }}>
          <Text className="font-pixel text-black" style={{ fontSize: size, lineHeight: size + 2 }}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}
/** With Colour labels on, pills are bigger and fatter so their letters can be read; the sizes still differ clearly. */
const LABELLED_PILL_SIZES = [0.56, 0.76, 0.96];
const WHITE_HALF = "#ffffff";
/** A pill that sways slightly and pops away when taken. */
const Pill = memo(function Pill({ spec, i, taken, cell }: { spec: PillSpec; i: number; taken: boolean; cell: number }) {
  const wobble = useSharedValue(0);
  const gone = useSharedValue(0);
  useEffect(() => {
    wobble.set(withDelay(i * 90, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, true)));
  }, [wobble, i]);
  useEffect(() => {
    if (taken) gone.set(withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }));
  }, [taken, gone]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - gone.get(),
    transform: [{ rotate: `${wobble.get() * 3}deg` }, { scale: 1 + gone.get() * 0.4 }],
  }));
  const { colorLabels } = useSettings();
  const w = Math.round(cell * (colorLabels ? LABELLED_PILL_SIZES : PILL_SIZES)[spec.size]);
  const h = Math.round(w * (colorLabels ? 0.6 : 0.5));
  const font = Math.max(colorLabels ? 10 : 6, Math.round(h * 0.5));
  return (
    <Animated.View style={style}>
      <View className="flex-row overflow-hidden rounded-full border-2 border-outline" style={{ width: w, height: h }}>
        <PillHalf color={PILL_COLORS[spec.a].hex} label={colorLabels ? PILL_COLORS[spec.a].name[0] : undefined} size={font} />
        <PillHalf color={spec.b === null ? WHITE_HALF : PILL_COLORS[spec.b].hex} label={colorLabels && spec.b !== null ? PILL_COLORS[spec.b].name[0] : undefined} size={font} />
      </View>
    </Animated.View>
  );
});
const pillName = (spec: PillSpec) =>
  `${SIZE_NAMES[spec.size].toLowerCase()} ${spec.b === null ? `${PILL_COLORS[spec.a].name.toLowerCase()} pill` : `${PILL_COLORS[spec.a].name.toLowerCase()} and ${PILL_COLORS[spec.b].name.toLowerCase()} capsule`}`;

const ColorWord = ({ k }: { k: number }) => <Text style={{ color: PILL_COLORS[k].hex }}>{PILL_COLORS[k].name}</Text>;
/** The instruction for a round, with each colour named in its own colour. */
function PillsRule({ variant, x, y, s }: { variant: PillsVariant; x: number; y: number; s: number }) {
  const size = SIZE_NAMES[s];
  switch (variant) {
    case "except":
      return <>Tap every pill that ISN&apos;T <ColorWord k={x} /></>;
    case "capsule":
      return <>Tap every <ColorWord k={x} />-<ColorWord k={y} /> capsule</>;
    case "size":
      return <>Tap every {size} pill</>;
    case "sizeColor":
      return <>Tap every {size} <ColorWord k={x} /> pill</>;
    case "sizeExcept":
      return <>Tap every {size} pill that ISN&apos;T <ColorWord k={x} /></>;
    case "capsuleSize":
      return <>Tap every <ColorWord k={x} />-<ColorWord k={y} /> capsule that ISN&apos;T {size}</>;
    default:
      return <>Tap every <ColorWord k={x} /> pill</>;
  }
}

const PILL_GAP = 8;
function PillsGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [round] = useState(() => {
    const variant = pickVariant<PillsVariant>(tuning.level, PILL_VARIANTS);
    return { variant, ...dealPills(variant, tuning.pillColors, tuning.pills, tuning.level >= 0.4) };
  });
  // Odd ones out, capsules and sizes take a little longer to read, two rules longer still, and a
  // bigger grid adds a little time per pill.
  const total = tuning.pillsMs + (round.variant === "color" ? 0 : TWO_RULES.includes(round.variant) ? 2500 : 1500) + (round.pills.length - 9) * 150;
  const [taken, setTaken] = useState<number[]>([]);
  const left = useCountdown(total, () => done(false));
  const need = round.pills.filter(round.right).length;
  const tap = (i: number) => {
    if (taken.includes(i)) return;
    if (!round.right(round.pills[i])) {
      juice.shake();
      haptic.denied();
      playSfx("invalid");
      return setTimeout(() => done(false), 300);
    }
    const next = [...taken, i];
    setTaken(next);
    juice.pop();
    haptic.tap();
    playSfx("click");
    if (next.length >= need) setTimeout(() => done(true), 250);
  };
  // 3x3, then 4 across (12 and 16 pills), then 5 across (20 and 25) in smaller cells.
  const cols = round.pills.length <= 9 ? 3 : round.pills.length <= 16 ? 4 : 5;
  const cell = cols === 5 ? 48 : 64;
  const gap = cols === 5 ? 6 : PILL_GAP;
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="text-center font-display text-base text-ink">
          <PillsRule variant={round.variant} x={round.x} y={round.y} s={round.s} />
        </Text>
        <TimeBar left={left} total={total} />
        <View className="flex-row flex-wrap" style={{ width: cols * cell + (cols - 1) * gap, gap }}>
          {round.pills.map((p, i) => (
            <TapPressable key={i} accessibilityRole="button" accessibilityLabel={pillName(p)} onDown={() => tap(i)} className="items-center justify-center border-2 border-outline bg-surface" style={{ width: cell, height: cell }}>
              <Pill spec={p} i={i} taken={taken.includes(i)} cell={cell - 4} />
            </TapPressable>
          ))}
        </View>
        <Hint>{"One wrong pill and it's a mix-up!"}</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- X-ray: several films in a row: fractures, a swallowed coin, a dislocated joint, counting breaks ----------
const BONE = "#e8f2ff";
const FILM = "#0d1a2c";
/**
 * A pixel bone: two knobs, a shaft, two knobs. `crack` draws a break across it that wide; `shift`
 * slides the lower half sideways (a dislocated joint).
 */
function Bone({ crack, shift = 0 }: { crack?: number; shift?: number }) {
  const knobs = (
    <View className="flex-row gap-1">
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: BONE }} />
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: BONE }} />
    </View>
  );
  return (
    <View className="items-center">
      {knobs}
      <View className="h-4 w-3" style={{ backgroundColor: BONE }}>
        {crack !== undefined && <View className="absolute top-3 h-[3px]" style={{ left: (12 - crack) / 2, width: crack, backgroundColor: FILM, transform: [{ rotate: "-25deg" }] }} />}
      </View>
      <View className="items-center" style={{ transform: [{ translateX: shift }] }}>
        <View className="h-4 w-3" style={{ backgroundColor: BONE }} />
        {knobs}
      </View>
    </View>
  );
}

/** A tummy on the film with a few gas bubbles (hollow rings), or a swallowed coin (a solid disc). */
function Tummy({ coin, bubbles, faint }: { coin: boolean; bubbles: { x: number; y: number }[]; faint: number }) {
  return (
    <View className="h-12 w-12 rounded-full border-2" style={{ borderColor: "rgba(232,242,255,0.25)" }}>
      {bubbles.map((b, k) => (
        <View key={k} className="absolute h-3.5 w-3.5 rounded-full border-2" style={{ left: b.x, top: b.y, borderColor: BONE, opacity: faint }} />
      ))}
      {coin && <View className="absolute h-3.5 w-3.5 rounded-full border-2" style={{ left: 16, top: 16, backgroundColor: BONE, borderColor: "#b9c7d8" }} />}
    </View>
  );
}

type XrayVariant = "fracture" | "coin" | "joint" | "double" | "count";
const XRAY_TEXT: Record<XrayVariant, { title: string; hint: string }> = {
  fracture: { title: "Find the fracture", hint: "Tap the bone with the crack." },
  coin: { title: "Find the swallowed coin", hint: "Gas bubbles are hollow. The coin is solid." },
  joint: { title: "Find the dislocated joint", hint: "Tap the bone that's out of line." },
  double: { title: "Find both fractures", hint: "Two bones are cracked. Tap them both." },
  count: { title: "How many fractures?", hint: "Look over the whole film, then answer." },
};
const XRAY_VARIANTS: { id: XrayVariant; from: number }[] = [
  { id: "fracture", from: 0 },
  { id: "coin", from: 0.15 },
  { id: "joint", from: 0.3 },
  { id: "double", from: 0.4 },
  { id: "count", from: 0.55 },
];

/**
 * X-ray: a few films in a row, each with its own twist (the first is always a plain one). A miss
 * is allowed early on; from halfway every film must be read right.
 */
function XrayGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const level = hardness(tuning);
  const [plan] = useState(() =>
    Array.from({ length: tuning.xrayFilms }, (_, i) => pickVariant<XrayVariant>(level, i === 0 ? XRAY_VARIANTS.slice(0, 2) : XRAY_VARIANTS)),
  );
  const [film, setFilm] = useState(0);
  const [misses, setMisses] = useState(0);
  const next = (ok: boolean) => {
    const m = misses + (ok ? 0 : 1);
    if (m > tuning.xrayMisses) return done(false);
    if (film + 1 >= plan.length) return done(true);
    setMisses(m);
    setFilm(film + 1);
  };
  return (
    <View className="gap-2">
      <Text className="text-center font-pixel text-[10px] tracking-[2px] text-ink opacity-70">
        FILM {film + 1} OF {plan.length}
        {tuning.xrayMisses > 0 ? ` · ${tuning.xrayMisses - misses} MISS LEFT` : " · NO MISSES"}
      </Text>
      <XrayFilm key={film} variant={plan[film]} tuning={tuning} onResult={next} />
    </View>
  );
}

function XrayFilm({ variant, tuning, onResult }: { variant: XrayVariant; tuning: GameProps["tuning"]; onResult: (ok: boolean) => void }) {
  const result = useDone(onResult);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const level = hardness(tuning);
  const total = tuning.xrayMs + (variant === "count" ? 1500 : variant === "double" ? 800 : 0);
  const [film] = useState(() => {
    // The coin film uses fewer, bigger tummies; bones go up to 16, drawn smaller the more there are.
    const count = variant === "coin" ? Math.min(12, tuning.bones) : tuning.bones;
    const cells = Array.from({ length: count }, () => ({
      angle: rand(71) - 35,
      bubbles: Array.from({ length: 1 + rand(3) }, () => ({ x: 4 + rand(26), y: 4 + rand(26) })),
    }));
    // The bones that are "it": one, two (double), or 0-3 cracked ones to count.
    const howMany = variant === "double" ? 2 : variant === "count" ? rand(4) : 1;
    const odd = new Set(shuffle(Array.from({ length: count }, (_, i) => i)).slice(0, howMany));
    return { count, odd, cells };
  });
  const [picked, setPicked] = useState<number[]>([]);
  const [answered, setAnswered] = useState<number | null>(null);
  const left = useCountdown(total, () => result(false));
  // A scan line sweeps down the film, like a light box.
  const scan = useSharedValue(0);
  useEffect(() => {
    scan.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true)); // sweeps down and back up
  }, [scan]);
  const [filmH, setFilmH] = useState(0);
  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scan.get() * filmH }] }));
  const feedback = (ok: boolean) => {
    if (ok) juice.pop();
    else juice.shake();
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
  };
  const pick = (i: number) => {
    if (variant === "count" || picked.includes(i) || picked.some((p) => !film.odd.has(p))) return;
    const now = [...picked, i];
    setPicked(now);
    const ok = film.odd.has(i);
    feedback(ok);
    if (!ok) return setTimeout(() => result(false), 450);
    if (now.length >= film.odd.size) setTimeout(() => result(true), 450);
  };
  const answer = (n: number) => {
    if (answered !== null) return;
    setAnswered(n);
    const ok = n === film.odd.size;
    feedback(ok);
    setTimeout(() => result(ok), 450);
  };
  useKeys({ "0": () => answer(0), "1": () => answer(1), "2": () => answer(2), "3": () => answer(3) }, variant === "count");
  const cols = film.count > 9 ? 4 : 3;
  const scale = film.count <= 6 ? 1 : film.count <= 9 ? 0.9 : film.count <= 12 ? 0.78 : 0.66;
  // The crack gets finer and the joint shifts less as the game gets harder.
  const crackW = Math.round(16 - level * 6);
  const shift = Math.round(5 - level * 2);
  const cracked = variant === "fracture" || variant === "double" || variant === "count";
  const text = XRAY_TEXT[variant];
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">{text.title}</Text>
        <TimeBar left={left} total={total} />
        <View onLayout={(e) => setFilmH(e.nativeEvent.layout.height)} className={`${cols === 4 ? "w-72" : "w-60"} flex-row flex-wrap justify-between gap-y-2 overflow-hidden border-2 border-outline p-2`} style={{ backgroundColor: FILM }}>
          {film.cells.map((c, i) => {
            const odd = film.odd.has(i);
            const glow = picked.includes(i) ? (odd ? "bg-success/30" : "bg-danger/30") : "";
            return (
              <TapPressable key={i} accessibilityRole="button" accessibilityLabel={`${variant === "coin" ? "Tummy" : "Bone"} ${i + 1}`} onDown={() => pick(i)} className={`${cols === 4 ? "h-14 w-[23%]" : "h-16 w-[30%]"} items-center justify-center ${glow}`}>
                {variant === "coin" ? (
                  // Gas bubbles get brighter (closer to the coin) as the game gets harder.
                  <Tummy coin={odd} bubbles={odd ? c.bubbles.slice(0, 1) : c.bubbles} faint={0.35 + level * 0.35} />
                ) : (
                  <View style={{ transform: [{ rotate: `${c.angle}deg` }, { scale }] }}>
                    <Bone crack={cracked && odd ? crackW : undefined} shift={variant === "joint" && odd ? shift : 0} />
                  </View>
                )}
              </TapPressable>
            );
          })}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, height: 6, backgroundColor: "rgba(127,224,196,0.35)" }, scanStyle]} />
        </View>
        {variant === "count" ? (
          <View className="flex-row gap-2">
            {[0, 1, 2, 3].map((n) => (
              <PixelButton key={n} label={String(n)} tone={answered === n ? (n === film.odd.size ? "success" : "danger") : undefined} onPress={() => answer(n)} />
            ))}
          </View>
        ) : null}
        {variant === "count" ? (
          <KeyHint>0 1 2 3</KeyHint>
        ) : (
          <Hint>{text.hint}</Hint>
        )}
      </View>
    </Animated.View>
  );
}

// ---------- Germ Buster: tap the germs before they slip away (and leave the good bacteria be) ----------
const GERMS = 10;
const GERM_IMAGE = require("@/imgs/stickers/grumpy_germ.png");
const GOOD_IMAGE = require("@/imgs/misc/good_bacteria.png");
/** A germ (or a good bacterium) that springs up out of its hole, wiggles, and bursts when tapped. */
function Germ({ busted, good }: { busted: boolean; good: boolean }) {
  const t = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const burst = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(1, { damping: 14, stiffness: 260 }));
    wiggle.set(withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(-1, { duration: 260 })), -1, true));
  }, [t, wiggle]);
  useEffect(() => {
    if (busted) burst.set(withTiming(1, { duration: 200 }));
  }, [busted, burst]);
  // Busted, it squashes flat and fades while the splat flies out.
  const style = useAnimatedStyle(() => {
    const b = burst.get();
    return {
      opacity: 1 - b,
      transform: [{ scaleX: t.get() * (1 + b * 0.6) }, { scaleY: t.get() * (1 - b * 0.7) }, { rotate: `${wiggle.get() * 4 * (1 - b)}deg` }],
    };
  });
  return (
    <Animated.View style={style}>
      <Image source={good ? GOOD_IMAGE : GERM_IMAGE} style={{ width: 52, height: 52 }} contentFit="contain" />
    </Animated.View>
  );
}

const SPLAT_MS = 450;
const SPLAT_BITS = 8;
const GERM_GOO = ["#7ccf5a", "#3f8a2e", "#b4ea8c"];
const GOOD_GOO = ["#8fd3f5", "#3b7fb0", "#d4f0ff"];
/** One pixel of goo flying out of a busted germ, falling a little as it goes. */
function SplatBit({ t, i, color }: { t: SharedValue<number>; i: number; color: string }) {
  const angle = (i / SPLAT_BITS) * Math.PI * 2 + (i % 2) * 0.35;
  const reach = 22 + (i % 3) * 8;
  const style = useAnimatedStyle(() => {
    const k = t.get();
    return { opacity: 1 - k, transform: [{ translateX: Math.cos(angle) * reach * k }, { translateY: Math.sin(angle) * reach * k + 12 * k * k }, { scale: 1 - 0.5 * k }] };
  });
  return <Animated.View style={[{ position: "absolute", width: 7, height: 7, backgroundColor: color }, style]} />;
}
/** A germ's death: a ring, a splat of goo and a "+1" (or "-1" for a good bacterium, in blue). */
function Splat({ good }: { good: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: SPLAT_MS, easing: Easing.out(Easing.quad) }));
  }, [t]);
  const goo = good ? GOOD_GOO : GERM_GOO;
  const ring = useAnimatedStyle(() => ({ opacity: 0.8 * (1 - t.get()), transform: [{ scale: 0.4 + t.get() * 1.1 }] }));
  const label = useAnimatedStyle(() => ({ opacity: 1 - t.get() * t.get(), transform: [{ translateY: -22 * t.get() }] }));
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <Animated.View style={[{ position: "absolute", width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: goo[0] }, ring]} />
      {Array.from({ length: SPLAT_BITS }, (_, i) => (
        <SplatBit key={i} t={t} i={i} color={goo[i % goo.length]} />
      ))}
      <Animated.View style={[{ position: "absolute", top: 2 }, label]}>
        <Text className="font-pixel text-sm" style={{ color: good ? "#e2372b" : "#2f7d22" }}>
          {good ? "-1" : "+1"}
        </Text>
      </Animated.View>
    </View>
  );
}
/** The pause before the first germ: time to get ready, and for the pictures to load. */
const GERM_LEAD_MS = 1200;
/** A tap this soon after a germ moves on still counts for it, so a busy phone doesn't cost a hit. */
const GERM_GRACE_MS = 180;
type Spawn = { n: number; cell: number; good: boolean; busted: boolean };
type GermVariant = "bust" | "friends" | "double";
/**
 * The order things pop up in: GERMS germs, plus good bacteria in the "friends" and "double"
 * variants, one at a time or (double) two at once. Never the same hole twice in a row.
 */
function planWaves(variant: GermVariant, cells: number) {
  const goods = variant === "bust" ? 0 : variant === "friends" ? 4 : 3;
  const things = shuffle([...Array.from({ length: GERMS }, () => false), ...Array.from({ length: goods }, () => true)]);
  const size = variant === "double" ? 2 : 1;
  const waves: Spawn[][] = [];
  let last: number[] = [];
  for (let i = 0; i < things.length; i += size) {
    const free = shuffle(Array.from({ length: cells }, (_, c) => c).filter((c) => !last.includes(c)));
    const wave = things.slice(i, i + size).map((good, k) => ({ n: i + k, cell: free[k], good, busted: false }));
    last = wave.map((s) => s.cell);
    waves.push(wave);
  }
  return waves;
}
function GermGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [plan] = useState(() => {
    const variant = pickVariant<GermVariant>(tuning.level, [
      { id: "bust", from: 0 },
      { id: "friends", from: 0.2 },
      { id: "double", from: 0.45 },
    ]);
    return { variant, waves: planWaves(variant, tuning.germCells) };
  });
  const [wave, setWave] = useState<Spawn[]>([]);
  const [started, setStarted] = useState(false);
  const [busted, setBusted] = useState(0);
  /** Splats still playing; they outlive the germ, which may move on before its splat is done. */
  const [splats, setSplats] = useState<{ n: number; cell: number; good: boolean }[]>([]);
  const hits = useRef(0);
  // The live wave and the one before it, read by taps straight away (state can lag a frame behind).
  const current = useRef<Spawn[]>([]);
  const previous = useRef<Spawn[]>([]);
  /** Numbers of the germs and bacteria already tapped. */
  const gone = useRef(new Set<number>());
  const need = tuning.germsNeeded;
  useEffect(() => {
    // Two at once stay up a little longer.
    const show = tuning.germShowMs * (plan.variant === "double" ? 1.35 : 1);
    let timer: ReturnType<typeof setTimeout>;
    // Each wave is scheduled after the last one has had its full time on screen, so a slow phone
    // stretches the game instead of skipping germs.
    const next = (w: number) => {
      const last = current.current;
      if (last.length) {
        previous.current = last;
        setTimeout(() => {
          if (previous.current === last) previous.current = [];
        }, GERM_GRACE_MS);
      }
      if (w >= plan.waves.length) {
        current.current = [];
        setWave([]);
        timer = setTimeout(() => done(hits.current >= need), GERM_GRACE_MS);
        return;
      }
      current.current = plan.waves[w];
      setStarted(true);
      setWave(plan.waves[w]);
      timer = setTimeout(() => next(w + 1), show);
    };
    timer = setTimeout(() => next(0), GERM_LEAD_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);
  const bust = (cell: number) => {
    const find = (list: Spawn[]) => list.find((g) => g.cell === cell && !gone.current.has(g.n));
    const target = find(current.current) ?? find(previous.current);
    if (!target) return haptic.denied();
    gone.current.add(target.n);
    if (target.good) {
      // Good bacteria help the patient: tapping one costs a hit.
      hits.current = Math.max(0, hits.current - 1);
      juice.shake();
      haptic.denied();
      playSfx("invalid");
    } else {
      hits.current += 1;
      haptic.tap();
      playSfx("medkit");
    }
    setBusted(hits.current);
    setSplats((list) => [...list, { n: target.n, cell, good: target.good }]);
    setTimeout(() => setSplats((list) => list.filter((s) => s.n !== target.n)), SPLAT_MS + 50);
    if (current.current.includes(target)) {
      const popped = current.current.map((g) => (g === target ? { ...g, busted: true } : g));
      current.current = popped;
      setWave(popped);
    }
  };
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">{started ? `Busted ${busted} (need ${need} of ${GERMS})` : "Get ready..."}</Text>
        {/* Loaded (unseen) during the pause: a germ whose picture is still loading pops up with no spring. */}
        {!started && (
          <View pointerEvents="none" style={{ position: "absolute", opacity: 0 }}>
            <Image source={GERM_IMAGE} style={{ width: 52, height: 52 }} contentFit="contain" />
            <Image source={GOOD_IMAGE} style={{ width: 52, height: 52 }} contentFit="contain" />
          </View>
        )}
        {/* 3x3 holes, or 4x4 at the top levels. */}
        <View className={`${tuning.germCells > 9 ? "w-72" : "w-56"} flex-row flex-wrap justify-between gap-y-2`}>
          {Array.from({ length: tuning.germCells }, (_, i) => {
            const g = wave.find((s) => s.cell === i);
            return (
              <TapPressable key={i} accessibilityRole="button" accessibilityLabel={g && !g.busted ? (g.good ? "Good bacteria" : "Germ") : "Empty"} onDown={() => bust(i)} className="h-16 w-16 items-center justify-center border-2 border-outline bg-surface">
                {g && <Germ key={g.n} busted={g.busted} good={g.good} />}
                {splats.map((s) => s.cell === i && <Splat key={s.n} good={s.good} />)}
              </TapPressable>
            );
          })}
        </View>
        <Hint>{plan.variant === "bust" ? "Tap each germ before it slips away!" : "Bust the green germs. Leave the blue good bacteria alone!"}</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Deep Breaths: hold to breathe in (or out), let go when the circle meets the ring ----------
const BREATHS = 3;
/** The circle's size at fill f (1 = the standard ring). */
const breathScale = (f: number) => {
  // Also called inside an animated style, which runs on the UI thread: without this the game crashed.
  "worklet";
  return 0.4 + f * 0.75;
};
/** Breathing out, the circle starts this full and shrinks as the breath goes on. */
const EXHALE_FROM = 1.3;
/**
 * Steady: three equal breaths. Varied: each has its own length, shown by the size of the ring.
 * Exhale: breathe out, so the circle shrinks down to the ring. Hidden: the circle fades out halfway,
 * so the breath is timed by feel.
 */
type BreathVariant = "steady" | "varied" | "exhale" | "hidden";
function BreathGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [{ variant, goals }] = useState(() => {
    const v = pickVariant<BreathVariant>(tuning.level, [
      { id: "steady", from: 0 },
      { id: "varied", from: 0.25 },
      { id: "exhale", from: 0.35 },
      { id: "hidden", from: 0.5 },
    ]);
    return { variant: v, goals: v === "varied" ? shuffle([0.7, 1, 1.3]) : [1, 1, 1] };
  });
  const exhaling = variant === "exhale";
  const hidden = variant === "hidden";
  const fill = useSharedValue(0);
  const goal = useSharedValue(goals[0]);
  const ring = useSharedValue(0);
  const start = useRef(0);
  const [round, setRound] = useState(0);
  const [good, setGood] = useState(0);
  const [note, setNote] = useState(exhaling ? "Hold to breathe out..." : hidden ? "Hold to breathe in. The air fades: go by feel!" : "Hold to breathe in...");
  const ms = tuning.breathMs;
  const low = tuning.breathLow, high = tuning.breathHigh;
  const f = goals[Math.min(round, BREATHS - 1)];
  useEffect(() => {
    ring.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [ring]);
  useEffect(() => {
    goal.set(f);
  }, [goal, f]);
  // The air fills from blue to green as it reaches the target ring, and turns red past it.
  const circle = useAnimatedStyle(() => {
    const k = fill.get() / goal.get();
    return {
      transform: [{ scale: breathScale(exhaling ? Math.max(0, EXHALE_FROM - fill.get()) : fill.get()) }],
      // Hidden: the air fades from halfway, so the ring has to be met by feel.
      opacity: hidden ? interpolate(k, [0, 0.4, 0.6], [0.85, 0.85, 0], "clamp") : 0.85,
      backgroundColor: interpolateColor(Math.min(1.25, k), [0, 0.82, 1, 1.25], ["#8fd3f5", "#7fe0c4", "#4edb4e", "#f34747"]),
    };
  });
  const target = useAnimatedStyle(() => ({ opacity: interpolate(ring.get(), [0, 1], [0.45, 1]), transform: [{ scale: interpolate(ring.get(), [0, 1], [0.98, 1.03]) }] }));
  const ringSize = 120 * breathScale(exhaling ? EXHALE_FROM - f : f) + 6;
  const inhale = () => {
    start.current = Date.now();
    fill.set(0);
    fill.set(withTiming(f * 1.3, { duration: ms * f * 1.3, easing: Easing.linear }));
  };
  const exhale = () => {
    if (!start.current) return;
    cancelAnimation(fill);
    const k = (Date.now() - start.current) / ms / f;
    start.current = 0;
    const ok = k >= low && k <= high;
    const total = good + (ok ? 1 : 0);
    if (ok) juice.pop();
    else juice.shake();
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    setNote(ok ? "Perfect breath!" : k < low ? (exhaling ? "Too short, breathe all the way out." : "Too short, breathe deeper.") : "Too long, let go sooner.");
    fill.set(withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    setGood(total);
    if (round + 1 >= BREATHS) return setTimeout(() => done(total >= 2), 450);
    setRound(round + 1);
  };
  useKeys({ " ": { down: inhale, up: exhale } }, round < BREATHS);
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">
          Breath {Math.min(round + 1, BREATHS)} of {BREATHS} · {good} good (need 2)
        </Text>
        <TapPressable accessibilityRole="button" accessibilityLabel={exhaling ? "Hold to breathe out" : "Hold to breathe in"} onDown={inhale} onUp={exhale} className="h-52 w-52 items-center justify-center">
          <Animated.View style={[{ position: "absolute", width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderWidth: 4, borderStyle: "dashed", borderColor: "#4edb4e" }, target]} />
          <Animated.View style={[{ width: 120, height: 120, borderRadius: 60 }, circle]} />
        </TapPressable>
        <Hint>{variant === "varied" && round === 0 && note.startsWith("Hold") ? "Each breath is different: fill the ring, then let go." : note}</Hint>
        <KeyHint>HOLD SPACE, LET GO TO RELEASE</KeyHint>
      </View>
    </Animated.View>
  );
}

// ---------- Match the Meds: flip cards to find the pairs (with a quick peek in the harder variant) ----------
const MEDS: ImageSourcePropType[] = SHOP_ITEMS.map((i) => i.image);
/** A card that flips over in 3D: the red back with a cross, or the medicine on the front. */
const FlipCard = memo(function FlipCard({ image, faceUp, matched, w, onPress }: { image: ImageSourcePropType; faceUp: boolean; matched: boolean; w: number; onPress: () => void }) {
  const flip = useSharedValue(0);
  const bounce = useSharedValue(1);
  useEffect(() => {
    flip.set(withTiming(faceUp ? 1 : 0, { duration: 260, easing: Easing.inOut(Easing.cubic) }));
  }, [faceUp, flip]);
  useEffect(() => {
    if (matched) bounce.set(withDelay(200, withSequence(withTiming(1.06, { duration: 100 }), withTiming(1, { duration: 140 }))));
  }, [matched, bounce]);
  const back = useAnimatedStyle(() => ({ opacity: flip.get() < 0.5 ? 1 : 0, transform: [{ perspective: 400 }, { rotateY: `${flip.get() * 180}deg` }, { scale: bounce.get() }] }));
  const front = useAnimatedStyle(() => ({ opacity: flip.get() >= 0.5 ? 1 : 0, transform: [{ perspective: 400 }, { rotateY: `${flip.get() * 180 - 180}deg` }, { scale: bounce.get() }] }));
  const h = Math.round(w * 1.25);
  return (
    <TapPressable accessibilityRole="button" accessibilityLabel={faceUp ? "Card" : "Hidden card"} onDown={onPress} style={{ width: w, height: h }}>
      <Animated.View style={[{ position: "absolute", width: w, height: h }, back]}>
        <View className="flex-1 items-center justify-center border-2 border-outline bg-primary">
          <Text className="font-pixel text-2xl text-surface">+</Text>
        </View>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", width: w, height: h }, front]}>
        <View className={`flex-1 items-center justify-center border-2 border-outline ${matched ? "bg-success/30" : "bg-surface"}`}>
          <Image source={image} style={{ width: w * 0.75, height: w * 0.75 }} contentFit="contain" />
        </View>
      </Animated.View>
    </TapPressable>
  );
});
/** How long every card shows face up at the start of the "peek" variant. */
const PEEK_MS = 1600;
const CARD_GAP = 8;
type MemoryVariant = "classic" | "peek";
function MemoryGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  // 3 pairs for a new player, up to 10 (20 cards) later on, drawn from all the shop's supplies.
  const [deal] = useState(() => {
    const variant = pickVariant<MemoryVariant>(tuning.level, [
      { id: "classic", from: 0 },
      { id: "peek", from: 0.3 },
    ]);
    const faces = shuffle(MEDS.map((_, k) => k)).slice(0, tuning.pairs);
    return { variant, cards: shuffle(faces.flatMap((f) => [f, f])) };
  });
  const cards = deal.cards;
  // Peek: a quick look at every card first, then less time to match them.
  const peek = deal.variant === "peek";
  const total = peek ? Math.round(tuning.memoryMs * 0.75) + PEEK_MS : tuning.memoryMs;
  const [peeking, setPeeking] = useState(peek);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  // Picks live in a ref too, so two quick taps can't both count as "the second card", and nothing
  // can be flipped while a wrong pair is turning back over.
  const picks = useRef<number[]>([]);
  const busy = useRef(peek);
  const mistakes = useRef(0);
  useEffect(() => {
    if (!peek) return;
    const t = setTimeout(() => {
      setPeeking(false);
      busy.current = false;
    }, PEEK_MS);
    return () => clearTimeout(t);
  }, [peek]);
  const left = useCountdown(total, () => done(false));
  const flip = (i: number) => {
    if (busy.current || picks.current.includes(i) || matched.includes(i)) return;
    const now = [...picks.current, i];
    picks.current = now;
    setOpen(now);
    haptic.tap();
    playSfx("click");
    if (now.length < 2) return;
    busy.current = true;
    if (cards[now[0]] === cards[now[1]]) {
      const m = [...matched, ...now];
      setTimeout(() => {
        setMatched(m);
        picks.current = [];
        setOpen([]);
        busy.current = false;
        juice.pop();
        playSfx("buy");
        if (m.length === cards.length) setTimeout(() => done(true, mistakes.current === 0), 450);
      }, 300);
    } else {
      mistakes.current += 1;
      setTimeout(() => {
        juice.shake();
        playSfx("invalid");
      }, 300);
      setTimeout(() => {
        picks.current = [];
        setOpen([]);
        busy.current = false;
      }, 850);
    }
  };
  // 6 cards in 3 columns, up to 16 in 4, and 20 in 5; cards shrink as there are more, so even 20
  // fit the treatment window.
  const cols = cards.length <= 6 ? 3 : cards.length <= 16 ? 4 : 5;
  const w = cards.length <= 8 ? 64 : cards.length <= 12 ? 58 : cards.length <= 16 ? 54 : 50;
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">{peeking ? "Remember them!" : "Find the pairs"}</Text>
        <TimeBar left={left} total={total} />
        <View className="flex-row flex-wrap" style={{ width: cols * w + (cols - 1) * CARD_GAP, gap: CARD_GAP }}>
          {cards.map((c, i) => (
            <FlipCard key={i} image={MEDS[c]} w={w} faceUp={peeking || open.includes(i) || matched.includes(i)} matched={matched.includes(i)} onPress={() => flip(i)} />
          ))}
        </View>
        <Hint>{peek ? "A quick peek, then flip two cards at a time." : "Flip two cards at a time."}</Hint>
      </View>
    </Animated.View>
  );
}

export const MORE_GAMES = { pulse: PulseGame, pills: PillsGame, xray: XrayGame, germs: GermGame, breath: BreathGame, memory: MemoryGame };

import { memo, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, Text, View, type GestureResponderEvent, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { TapPressable } from "@/components/ui/press-down";
import { pickVariant, shuffle, useDone, useJuice, type GameProps } from "@/components/ward/game-kit";
import { Hint, KeyHint, TimeBar, useCountdown } from "@/components/ward/more-games";
import { SHOP_ITEMS } from "@/constants/items";
import { ROOM_ITEMS } from "@/constants/room";
import { useAudio } from "@/hooks/use-audio";
import { useHaptics } from "@/hooks/use-haptics";
import { useKeys } from "@/hooks/use-keys";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { DOWN, LEFT, RIGHT, UP, canStep, flowsThrough, makeMaze, makePipes, solutionPath, turn, turnsTo } from "@/lib/puzzles";
/** A random number between a and b. */
const between = (a: number, b: number) => a + Math.random() * (b - a);
const pickOne = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// Five more ward minigames (0.8.0): Healthy Shopping, Odd Colour Out, Find It, Blood Flow and IV Line.
// Numbers come from minigameTuning, like the others; each has twists that open up with the player's
// level (pickVariant), so a returning player doesn't play the same round every time.

/**
 * Measures a box's width, so a game can size itself to the treatment window. `shown` hides the game until
 * then, so it never draws at the fallback size and jumps.
 */
function useWidth(fallback = 300) {
  const [w, setW] = useState<number | null>(null);
  return [w ?? fallback, (e: { nativeEvent: { layout: { width: number } } }) => setW(Math.max(160, e.nativeEvent.layout.width)), { opacity: w === null ? 0 : 1 }] as const;
}

/** A "+2" (or "-3") that floats up from where it happened and fades. */
function FloatUp({ text, good, left, bottom }: { text: string; good: boolean; left: number; bottom: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - t.get() * t.get(), transform: [{ translateY: -46 * t.get() }, { scale: 1.3 - 0.3 * t.get() }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left, bottom, width: 48, alignItems: "center" }, style]}>
      <Text className={`font-display text-xl ${good ? "text-success" : "text-danger"}`}>{text}</Text>
    </Animated.View>
  );
}

/** A quick bounce (1 -> big -> 1), for something that just went right. */
const bounce = (to = 1.18) => withSequence(withTiming(to, { duration: 90, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 9, stiffness: 260 }));

// ---------- Healthy Shopping: move the cart, catch the healthy food, dodge the junk ----------
type Food = { image: ImageSourcePropType; points: number; name: string; golden?: boolean };
/** Healthy food scores; junk takes points away. The art is PLACEHOLDER (drawn by Claude, src/media/photos/sprites/minigames). */
const HEALTHY: Food[] = [
  { name: "apple", image: require("@/imgs/misc/apple.png"), points: 1 },
  { name: "banana", image: require("@/imgs/minigames/banana.png"), points: 2 },
  { name: "carrot", image: require("@/imgs/minigames/carrot.png"), points: 2 },
  { name: "broccoli", image: require("@/imgs/minigames/broccoli.png"), points: 3 },
];
const JUNK: Food[] = [
  { name: "burger", image: require("@/imgs/minigames/burger.png"), points: -3 },
  { name: "fries", image: require("@/imgs/minigames/fries.png"), points: -2 },
  { name: "soda", image: require("@/imgs/minigames/soda.png"), points: -2 },
  { name: "donut", image: require("@/imgs/minigames/donut.png"), points: -3 },
];
/** The golden apple (Golden Hour twist): the apple with a glow behind it. */
const GOLDEN: Food = { ...HEALTHY[0], name: "golden apple", points: 5, golden: true };
const CART = require("@/imgs/minigames/cart.png");
const FOOD_MS = 20_000;
const FOOD_SIZE = 34;
const CART_W = 64;
const FIELD_H = 250;
/**
 * Classic; Golden Hour (rare golden apples worth 5); Breezy (food sways as it falls); Rush (some food
 * drops much faster than the rest).
 */
type FoodVariant = "classic" | "golden" | "windy" | "rush";
const FOOD_VARIANTS: { id: FoodVariant; from: number }[] = [
  { id: "classic", from: 0 },
  { id: "golden", from: 0.2 },
  { id: "windy", from: 0.4 },
  { id: "rush", from: 0.6 },
];
const FOOD_HINT: Record<FoodVariant, string> = {
  classic: "Drag the cart. Catch fruit and veg, skip the junk food!",
  golden: "Golden hour! A shining apple is worth 5.",
  windy: "It's breezy: the food sways as it falls.",
  rush: "Rush hour: some food drops much faster!",
};
/**
 * `k`: how far it has fallen, 0 (top) to 1 (the floor). `x` is where it started; `at` is where it is
 * now (Breezy food sways). `spin`: degrees turned per fall; `speed`: Rush food falls up to twice as fast.
 */
type Falling = { id: number; food: Food; x: number; at: number; born: number; k: number; spin: number; speed: number; phase: number };

function FoodGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const still = useReduceMotion();
  const [variant] = useState(() => pickVariant(tuning.level, FOOD_VARIANTS));
  const [w, onLayout, shown] = useWidth();
  const [cartX, setCartX] = useState(0.5);
  const cart = useRef(0.5);
  const [items, setItems] = useState<Falling[]>([]);
  const [score, setScore] = useState(0);
  const [pops, setPops] = useState<{ id: number; text: string; x: number; good: boolean }[]>([]);
  const scoreRef = useRef(0);
  const junkCaught = useRef(false);
  const steer = useRef(0);
  const nextId = useRef(0);
  const cartScale = useSharedValue(1);
  const cartTilt = useSharedValue(0);
  const left = useCountdown(FOOD_MS, () => done(false));
  const moveCart = (to: number) => {
    const next = Math.min(1, Math.max(0, to));
    // The cart leans the way it's moving and settles back upright.
    if (!still) cartTilt.set(withSequence(withTiming(Math.max(-12, Math.min(12, (next - cart.current) * 400)), { duration: 60 }), withTiming(0, { duration: 260 })));
    cart.current = next;
    setCartX(next);
  };

  // One loop moves everything: new food appears, falling food lands in the cart or on the floor.
  // The list lives in a ref, so scoring and sounds happen once per catch (not inside a state update).
  const falling = useRef<Falling[]>([]);
  useEffect(() => {
    let lastSpawn = 0;
    const id = setInterval(() => {
      const now = Date.now();
      if (steer.current) moveCart(cart.current + steer.current * 0.04);
      if (now - lastSpawn > tuning.foodSpawnMs) {
        lastSpawn = now;
        const food = variant === "golden" && Math.random() < 0.12 ? GOLDEN : pickOne(Math.random() < tuning.foodJunk ? JUNK : HEALTHY);
        const x = between(0.08, 0.92);
        falling.current = [
          ...falling.current,
          { id: nextId.current++, food, x, at: x, born: now, k: 0, spin: between(-220, 220), speed: variant === "rush" && Math.random() < 0.35 ? between(1.5, 2) : 1, phase: between(0, 6.28) },
        ];
      }
      const kept: Falling[] = [];
      for (const it of falling.current) {
        const k = ((now - it.born) / tuning.foodFallMs) * it.speed;
        const at = variant === "windy" ? Math.min(0.96, Math.max(0.04, it.x + Math.sin(k * 6.28 * 1.2 + it.phase) * 0.12)) : it.x;
        // The cart's basket is the last 40 px of the field.
        const inBasket = k >= (FIELD_H - 40) / FIELD_H && k < 1 && Math.abs(at - cart.current) < (CART_W / 2 + FOOD_SIZE / 3) / w;
        if (!inBasket) {
          if (k < 1.12) kept.push({ ...it, k, at });
          continue;
        }
        const p = it.food.points;
        scoreRef.current = Math.max(0, scoreRef.current + p);
        setScore(scoreRef.current);
        setPops((list) => [...list.slice(-3), { id: it.id, text: p > 0 ? `+${p}` : `${p}`, x: at, good: p > 0 }]);
        if (p > 0) {
          haptic.tap();
          playSfx(it.food.golden ? "buy" : "click");
          if (!still) cartScale.set(bounce(it.food.golden ? 1.3 : 1.15));
        } else {
          junkCaught.current = true;
          haptic.denied();
          playSfx("invalid");
          juice.shake();
          if (!still) cartScale.set(withSequence(withTiming(0.85, { duration: 80 }), withSpring(1, { damping: 8 })));
        }
        if (scoreRef.current >= tuning.foodTarget) done(true, !junkCaught.current);
      }
      falling.current = kept;
      setItems(kept);
    }, 33);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one loop per game
  }, [w]);

  useKeys({
    ArrowLeft: { down: () => (steer.current = -1), up: () => (steer.current = 0) },
    ArrowRight: { down: () => (steer.current = 1), up: () => (steer.current = 0) },
    a: { down: () => (steer.current = -1), up: () => (steer.current = 0) },
    d: { down: () => (steer.current = 1), up: () => (steer.current = 0) },
  });
  const drag = useRef<{ x: number; at: number } | null>(null);
  const cartStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${cartTilt.get()}deg` }, { scaleX: 2 - cartScale.get() }, { scaleY: cartScale.get() }] }));
  const progress = Math.min(1, score / tuning.foodTarget);
  return (
    <Animated.View style={juice.style}>
      <View className="gap-2" style={shown} onLayout={onLayout}>
        <View className="flex-row items-center gap-2">
          <Text className="font-number text-base text-ink">
            {score} / {tuning.foodTarget}
          </Text>
          {/* How close the cart is to full. */}
          <View className="h-3 flex-1 border-[1.5px] border-outline bg-surface">
            <View className="h-full bg-success" style={{ width: `${progress * 100}%` }} />
          </View>
        </View>
        <TimeBar left={left} total={FOOD_MS} />
        <View
          className="overflow-hidden border-2 border-outline bg-[#e9f6ff]"
          style={{ height: FIELD_H }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e: GestureResponderEvent) => (drag.current = { x: e.nativeEvent.pageX, at: cart.current })}
          onResponderMove={(e: GestureResponderEvent) => {
            const d = drag.current;
            if (d) moveCart(d.at + (e.nativeEvent.pageX - d.x) / w);
          }}
          onResponderRelease={() => (drag.current = null)}
        >
          {/* The shop floor. */}
          <View pointerEvents="none" className="absolute bottom-0 left-0 right-0 h-3 bg-[#cfe3f2]" />
          {items.map((it) => {
            // Missed food lands, squashes and fades on the floor.
            const landed = Math.max(0, it.k - 1) / 0.12;
            return (
              <View
                key={it.id}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: FOOD_SIZE,
                  height: FOOD_SIZE,
                  left: it.at * w - FOOD_SIZE / 2,
                  top: Math.min(it.k, 1) * FIELD_H - FOOD_SIZE,
                  opacity: 1 - landed,
                  transform: still ? undefined : [{ rotate: `${landed ? 0 : it.k * it.spin}deg` }, { scaleY: 1 - landed * 0.5 }],
                }}
              >
                {it.food.golden && <View className="absolute rounded-full bg-[#ffd84a]" style={{ left: -6, top: -6, width: FOOD_SIZE + 12, height: FOOD_SIZE + 12, opacity: 0.45 + 0.25 * Math.sin(it.k * 30) }} />}
                <Image source={it.food.image} style={{ width: FOOD_SIZE, height: FOOD_SIZE }} contentFit="contain" />
              </View>
            );
          })}
          {pops.map((p) => (
            <FloatUp key={p.id} text={p.text} good={p.good} left={p.x * w - 24} bottom={50} />
          ))}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", bottom: 0, left: cartX * w - CART_W / 2, width: CART_W, height: CART_W, transformOrigin: "bottom" }, cartStyle]}>
            <Image source={CART} style={{ width: CART_W, height: CART_W }} contentFit="contain" />
          </Animated.View>
        </View>
        <Hint>{FOOD_HINT[variant]}</Hint>
        <KeyHint>← → OR A D</KeyHint>
      </View>
    </Animated.View>
  );
}

// ---------- Odd Colour Out: one square is a slightly different colour ----------
/** Shade (lighter or darker), Hue (a slightly different colour), Vivid (more or less colourful), or a mix. */
type ColourVariant = "shade" | "hue" | "vivid" | "mixed";
type ColourKind = Exclude<ColourVariant, "mixed">;
const COLOUR_VARIANTS: { id: ColourVariant; from: number }[] = [
  { id: "shade", from: 0 },
  { id: "hue", from: 0.25 },
  { id: "vivid", from: 0.45 },
  { id: "mixed", from: 0.65 },
];
const COLOUR_HINT: Record<ColourKind, string> = {
  shade: "Tap the square that's a different shade.",
  hue: "One square is a slightly different colour.",
  vivid: "One square is a little more (or less) colourful.",
};

/** One square of the grid: bounces when right, shakes when wrong. The whole grid shows at once. */
const ColourTile = memo(function ColourTile({ i, size, colour, onPick, result }: { i: number; size: number; colour: string; onPick: (i: number) => void; result: "right" | "wrong" | null }) {
  const still = useReduceMotion();
  const s = useSharedValue(1);
  const x = useSharedValue(0);
  useEffect(() => {
    if (still || !result) return;
    if (result === "right") s.set(bounce(1.25));
    else x.set(withSequence(withTiming(-4, { duration: 40 }), withTiming(4, { duration: 60 }), withTiming(-3, { duration: 50 }), withTiming(0, { duration: 40 })));
  }, [result, still, s, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { scale: s.get() }], zIndex: result === "right" ? 2 : 0 }));
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <TapPressable accessibilityRole="button" accessibilityLabel={`Square ${i + 1}`} onDown={() => onPick(i)} style={{ width: size, height: size, backgroundColor: colour }} className="border-[1.5px] border-outline">
        {result === "wrong" && <View className="absolute inset-0 items-center justify-center bg-black/25"><Text className="font-display text-lg text-white">×</Text></View>}
        {result === "right" && <View className="absolute inset-0 border-[3px] border-white" />}
      </TapPressable>
    </Animated.View>
  );
});

function ColourGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [variant] = useState(() => pickVariant(tuning.level, COLOUR_VARIANTS));
  const [w, onLayout, shown] = useWidth();
  const [round, setRound] = useState(0);
  const mistakes = useRef(0);
  const busy = useRef(false);
  const [marks, setMarks] = useState<Record<number, "right" | "wrong">>({});
  // Each round: a colour, which square is odd, and the grid (one bigger on the last rounds). The
  // difference gets smaller every round.
  const deal = (r: number) => {
    const n = Math.min(6, tuning.colourGrid + (r >= tuning.colourRounds - 2 ? 1 : 0));
    const kind: ColourKind = variant === "mixed" ? pickOne<ColourKind>(["shade", "hue", "vivid"]) : variant;
    const hue = Math.floor(between(0, 360));
    const light = between(40, 58);
    const delta = tuning.colourDelta * (1 - r * 0.08);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const base = kind === "vivid" ? `hsl(${hue}, 50%, ${light}%)` : `hsl(${hue}, 65%, ${light}%)`;
    const odd =
      kind === "shade" ? `hsl(${hue}, 65%, ${light + delta}%)` : kind === "hue" ? `hsl(${hue + sign * delta * 1.7}, 65%, ${light}%)` : `hsl(${hue}, ${50 + sign * delta * 2.4}%, ${light}%)`;
    return { n, kind, odd: Math.floor(Math.random() * n * n), base, oddColour: odd };
  };
  const [grid, setGrid] = useState(() => deal(0));
  const left = useCountdown(tuning.colourMs, () => done(false));
  const pick = (i: number) => {
    if (busy.current) return;
    if (i !== grid.odd) {
      mistakes.current += 1;
      setMarks((m) => ({ ...m, [i]: "wrong" }));
      haptic.denied();
      playSfx("invalid");
      juice.shake();
      return;
    }
    haptic.tap();
    playSfx("buy");
    juice.pop();
    setMarks((m) => ({ ...m, [i]: "right" }));
    busy.current = true;
    // A moment to see it, then the next grid pops in.
    setTimeout(() => {
      busy.current = false;
      if (round + 1 >= tuning.colourRounds) return done(true, mistakes.current === 0);
      setMarks({});
      setRound(round + 1);
      setGrid(deal(round + 1));
    }, 320);
  };
  const gap = 4;
  const size = Math.floor((Math.min(w, 300) - gap * (grid.n - 1)) / grid.n);
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3" style={shown} onLayout={onLayout}>
        <View className="flex-row gap-1.5">
          {Array.from({ length: tuning.colourRounds }, (_, r) => (
            <View key={r} className={`h-2.5 w-6 border-[1.5px] border-outline ${r < round ? "bg-success" : r === round ? "bg-primary" : "bg-surface"}`} />
          ))}
        </View>
        <TimeBar left={left} total={tuning.colourMs} />
        <View className="flex-row flex-wrap" style={{ width: size * grid.n + gap * (grid.n - 1), gap }}>
          {Array.from({ length: grid.n * grid.n }, (_, i) => (
            <ColourTile key={`${round}-${i}`} i={i} size={size} colour={i === grid.odd ? grid.oddColour : grid.base} onPick={pick} result={marks[i] ?? null} />
          ))}
        </View>
        <Hint>{COLOUR_HINT[grid.kind]}</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Find It: a busy ward full of things; find the one asked for ----------
const FINDABLE: { name: string; image: ImageSourcePropType }[] = [
  ...SHOP_ITEMS.map((i) => ({ name: i.name, image: i.image })),
  ...ROOM_ITEMS.filter((i) => !i.frames && !i.staff).map((i) => ({ name: i.name, image: i.image })),
];
const FIND_ROUNDS = 3;
/** Each round's pictures load out of sight first; if some never report back, show the round anyway after this long. */
const FIND_LOAD_MS = 6000;
/** Plain; Jumbled (everything turned every which way); Pair (find both); Drifting (it all floats about). */
type FindVariant = "plain" | "spun" | "pair" | "drift";
const FIND_VARIANTS: { id: FindVariant; from: number }[] = [
  { id: "plain", from: 0 },
  { id: "spun", from: 0.25 },
  { id: "pair", from: 0.45 },
  { id: "drift", from: 0.65 },
];
type Scatter = { image: ImageSourcePropType; x: number; y: number; size: number; target: boolean; angle: number };

/**
 * One thing in the scene: maybe floats about (and settles once found). `onLoad` says its picture is
 * ready. The callbacks take its index, so they stay the same while the timer ticks and it doesn't redraw.
 * It's never scaled or re-layered: the "found" ring is drawn separately (FindMark), since scaling a
 * turned picture made it jump and spin on some phones.
 */
const FindThing = memo(function FindThing({ i, t, w, h, drift, found, label, onPick, onLoad }: { i: number; t: Scatter; w: number; h: number; drift: boolean; found: boolean; label: string; onPick: (i: number) => void; onLoad: (i: number) => void }) {
  const still = useReduceMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (!drift || still) return;
    if (found) {
      cancelAnimation(bob);
      bob.set(withTiming(0, { duration: 150 }));
      return;
    }
    const ms = 1600 + Math.random() * 1400;
    bob.set(withDelay(Math.random() * 600, withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => cancelAnimation(bob);
  }, [drift, still, found, bob]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(bob.get() * 6.28) * 7 }, { translateY: Math.sin(bob.get() * 3.14) * -8 }, { rotate: `${t.angle}deg` }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: t.x * w - t.size / 2, top: t.y * h - t.size / 2, width: t.size, height: t.size }, style]}>
      <TapPressable accessibilityRole="button" accessibilityLabel={label} onDown={() => onPick(i)} style={{ width: t.size, height: t.size }}>
        <Image source={t.image} style={{ width: t.size, height: t.size }} contentFit="contain" onLoad={() => onLoad(i)} onError={() => onLoad(i)} />
      </TapPressable>
    </Animated.View>
  );
});

/** The ring around a thing that was found: it opens out and settles, drawn above everything. */
function FindMark({ t, w, h }: { t: Scatter; w: number; h: number }) {
  const still = useReduceMotion();
  const k = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (!still) k.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [still, k]);
  const style = useAnimatedStyle(() => ({ opacity: k.get(), transform: [{ scale: 1.5 - 0.5 * k.get() }] }));
  const d = t.size + 14;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: t.x * w - d / 2, top: t.y * h - d / 2, width: d, height: d }, style]}>
      <View className="h-full w-full rounded-full border-[3px] border-success bg-success/20" />
    </Animated.View>
  );
}

function FindGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [variant] = useState(() => pickVariant(tuning.level, FIND_VARIANTS));
  const [w, onLayout, shown] = useWidth();
  const h = Math.round(w * 0.85);
  const still = useReduceMotion();
  const [round, setRound] = useState(0);
  const mistakes = useRef(0);
  const deal = () => {
    const [target, ...rest] = shuffle(FINDABLE);
    const others = rest.slice(0, 12);
    const angle = () => (variant === "spun" ? between(0, 360) : 0);
    const things = Array.from({ length: tuning.findCount }, () => ({ image: pickOne(others).image, x: between(0.06, 0.94), y: between(0.08, 0.92), size: between(30, 44), target: false, angle: angle() }));
    // Drawn last, so nothing can cover them completely (two of them in the Pair twist).
    for (let k = variant === "pair" ? 2 : 1; k > 0; k--) things.push({ image: target.image, x: between(0.08, 0.92), y: between(0.1, 0.9), size: 36, target: true, angle: angle() });
    return { target, things: things as Scatter[] };
  };
  const [scene, setScene] = useState(deal);
  const [found, setFound] = useState<number[]>([]);
  // The scene stays hidden until every picture in it (and the one asked for) has loaded, then shows
  // all at once; the clock starts then too, so nothing appears while the player is already looking.
  const loaded = useRef(new Set<number>());
  const [ready, setReady] = useState(false);
  const markLoaded = (i: number) => {
    loaded.current.add(i);
    if (loaded.current.size >= scene.things.length + 1) setReady(true);
  };
  useEffect(() => {
    const id = setTimeout(() => setReady(true), FIND_LOAD_MS);
    return () => clearTimeout(id);
  }, [scene]);
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.set(!ready ? 0 : still ? 1 : withTiming(1, { duration: 260, easing: Easing.inOut(Easing.quad) }));
  }, [ready, still, reveal]);
  // A plain fade: the whole scene comes up together, nothing wobbles or grows.
  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.get() }));
  const left = useCountdown(tuning.findMs, () => done(false), ready);
  const targets = scene.things.filter((t) => t.target).length;
  const pick = (i: number) => {
    if (!ready || found.includes(i)) return;
    if (!scene.things[i].target) {
      mistakes.current += 1;
      haptic.denied();
      playSfx("invalid");
      juice.shake();
      return;
    }
    const now = [...found, i];
    setFound(now);
    haptic.buy();
    playSfx("buy");
    juice.pop();
    if (now.length < targets) return;
    setTimeout(() => {
      if (round + 1 >= FIND_ROUNDS) return done(true, mistakes.current === 0);
      setRound(round + 1);
      setFound([]);
      loaded.current = new Set();
      setReady(false);
      setScene(deal());
    }, 450);
  };
  return (
    <Animated.View style={juice.style}>
      <View className="gap-2" style={shown} onLayout={onLayout}>
        <View className="flex-row items-center justify-center gap-2">
          <Text className="font-number text-base text-ink">{targets > 1 ? `Find both (${found.length}/2)` : "Find the"}</Text>
          <Image key={round} source={scene.target.image} style={{ width: 28, height: 28 }} contentFit="contain" onLoad={() => markLoaded(-1)} onError={() => markLoaded(-1)} />
          <Text className="font-display text-base text-ink">{scene.target.name}</Text>
          <Text className="font-number text-sm text-ink opacity-70">
            ({round + 1}/{FIND_ROUNDS})
          </Text>
        </View>
        <TimeBar left={left} total={tuning.findMs} />
        <View className="overflow-hidden border-2 border-outline bg-[#f4efe6]" style={{ height: h }}>
          <Animated.View pointerEvents={ready ? "auto" : "none"} style={[{ position: "absolute", left: 0, top: 0, width: w, height: h }, revealStyle]}>
            {scene.things.map((t, i) => (
              <FindThing key={`${round}-${i}`} i={i} t={t} w={w} h={h} drift={variant === "drift"} found={found.includes(i)} label={t.target ? scene.target.name : "Something else"} onPick={pick} onLoad={markLoaded} />
            ))}
            {found.map((i) => (
              <FindMark key={`${round}-mark-${i}`} t={scene.things[i]} w={w} h={h} />
            ))}
          </Animated.View>
        </View>
        <Hint>{!ready ? "Get ready..." : variant === "spun" ? "Everything's jumbled up. Spot it anyway!" : variant === "drift" ? "Things are floating about. Tap it when you spot it!" : "Tap it as soon as you spot it."}</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Blood Flow: drag the blood cell through the maze to the exit ----------
/** Plain; Oxygen (pick up the oxygen bubble before the exit opens); Dark (only the nearby veins show). */
type MazeVariant = "plain" | "oxygen" | "dark";
const MAZE_VARIANTS: { id: MazeVariant; from: number }[] = [
  { id: "plain", from: 0 },
  { id: "oxygen", from: 0.3 },
  { id: "dark", from: 0.55 },
];
const WALL = "#7a1f2b";
/** The exit's colour (an animated view takes no colour classes on phones). */
const EXIT_OPEN = "#3fae5a";
const EXIT_SHUT = "#8d8d8d";

function MazeGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const still = useReduceMotion();
  const [w, onLayout, shown] = useWidth();
  const [setup] = useState(() => {
    const maze = makeMaze(tuning.mazeSize);
    const n = maze.n;
    // Start in any corner, finish in the opposite one.
    const start = pickOne([0, n - 1, n * (n - 1), n * n - 1]);
    const exit = n * n - 1 - start;
    const variant = pickVariant(tuning.level, MAZE_VARIANTS);
    // The oxygen bubble sits well away from both ends.
    const far = Array.from({ length: n * n }, (_, c) => c).filter((c) => {
      const d = (a: number) => Math.abs((c % n) - (a % n)) + Math.abs(Math.floor(c / n) - Math.floor(a / n));
      return d(start) >= n - 1 && d(exit) >= 2;
    });
    return { maze, start, exit, variant, oxygen: variant === "oxygen" ? pickOne(far) : -1 };
  });
  const { maze, exit, variant } = setup;
  const [pos, setPos] = useState(setup.start);
  const at = useRef(setup.start);
  const [visited, setVisited] = useState(() => new Set([setup.start]));
  const [hasOxygen, setHasOxygen] = useState(setup.oxygen < 0);
  const oxygen = useRef(setup.oxygen < 0);
  const left = useCountdown(tuning.mazeMs, () => done(false));
  const side = Math.min(w, 300);
  const cell = side / maze.n;
  // The cell glides from square to square and beats like a heart; the exit glows.
  const gx = useSharedValue(setup.start % maze.n);
  const gy = useSharedValue(Math.floor(setup.start / maze.n));
  const beat = useSharedValue(1);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    beat.set(withRepeat(withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 200 }), withDelay(450, withTiming(1, { duration: 0 }))), -1));
    glow.set(withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(beat);
      cancelAnimation(glow);
    };
  }, [still, beat, glow]);
  const step = (dx: number, dy: number) => {
    if (!canStep(maze, at.current, dx, dy)) return false;
    const next = at.current + dx + dy * maze.n;
    // The exit stays shut until the oxygen is picked up.
    if (next === exit && !oxygen.current) {
      haptic.denied();
      return false;
    }
    at.current = next;
    setPos(next);
    setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
    gx.set(still ? next % maze.n : withTiming(next % maze.n, { duration: 90 }));
    gy.set(still ? Math.floor(next / maze.n) : withTiming(Math.floor(next / maze.n), { duration: 90 }));
    haptic.tap();
    if (next === setup.oxygen && !oxygen.current) {
      oxygen.current = true;
      setHasOxygen(true);
      playSfx("click");
    }
    if (next === exit) {
      playSfx("buy");
      setTimeout(() => done(true), 200);
    }
    return true;
  };
  useKeys({
    ArrowUp: () => step(0, -1), ArrowDown: () => step(0, 1), ArrowLeft: () => step(-1, 0), ArrowRight: () => step(1, 0),
    w: () => step(0, -1), s: () => step(0, 1), a: () => step(-1, 0), d: () => step(1, 0),
  });
  // Dragging: the cell follows the finger one cell at a time, only through open passages.
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const follow = (e: GestureResponderEvent) => {
    const d = drag.current;
    if (!d) return;
    const tx = Math.floor((d.cx + e.nativeEvent.pageX - d.x) / cell), ty = Math.floor((d.cy + e.nativeEvent.pageY - d.y) / cell);
    for (let k = 0; k < 4; k++) {
      const x = at.current % maze.n, y = Math.floor(at.current / maze.n);
      if (x === tx && y === ty) break;
      const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
      // Try the longer way first, then the other.
      const first: [number, number] = Math.abs(tx - x) >= Math.abs(ty - y) ? [dx, 0] : [0, dy];
      const second: [number, number] = first[0] ? [0, dy] : [dx, 0];
      if (!(first[0] || first[1]) || !step(...first)) if (!(second[0] || second[1]) || !step(...second)) break;
    }
  };
  const px = pos % maze.n, py = Math.floor(pos / maze.n);
  const cellStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (gx.get() + 0.18) * cell }, { translateY: (gy.get() + 0.18) * cell }, { scale: beat.get() }] }));
  const exitStyle = useAnimatedStyle(() => ({ opacity: 0.35 + glow.get() * 0.4 }));
  const ex = exit % maze.n, ey = Math.floor(exit / maze.n);
  return (
    <View className="items-center gap-3" style={shown} onLayout={onLayout}>
      <TimeBar left={left} total={tuning.mazeMs} />
      <View
        style={{ width: side, height: side }}
        className="overflow-hidden border-2 border-[#7a1f2b] bg-[#ffd9d9]"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => (drag.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, cx: (px + 0.5) * cell, cy: (py + 0.5) * cell })}
        onResponderMove={follow}
        onResponderRelease={() => (drag.current = null)}
      >
        {/* The way it has come: a faint trail. */}
        {[...visited].map((c) => (
          <View key={`t${c}`} pointerEvents="none" className="absolute bg-[#f7b3b8]" style={{ left: (c % maze.n) * cell + cell * 0.3, top: Math.floor(c / maze.n) * cell + cell * 0.3, width: cell * 0.4, height: cell * 0.4, borderRadius: cell * 0.2 }} />
        ))}
        {/* The exit, in the corner opposite the start: glowing, or grey until the oxygen is in. */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: ex * cell, top: ey * cell, width: cell, height: cell, backgroundColor: hasOxygen ? EXIT_OPEN : EXIT_SHUT }, exitStyle]} />
        {setup.oxygen >= 0 && !hasOxygen && (
          <View pointerEvents="none" className="absolute items-center justify-center rounded-full border-2 border-[#2f7fc4] bg-[#bfe3ff]" style={{ left: (setup.oxygen % maze.n + 0.2) * cell, top: (Math.floor(setup.oxygen / maze.n) + 0.2) * cell, width: cell * 0.6, height: cell * 0.6 }}>
            <Text className="font-display text-[#2f7fc4]" style={{ fontSize: Math.max(9, cell * 0.28) }}>
              O₂
            </Text>
          </View>
        )}
        {maze.right.map((wall, c) =>
          wall && c % maze.n < maze.n - 1 ? <View key={`r${c}`} pointerEvents="none" className="absolute" style={{ backgroundColor: WALL, left: ((c % maze.n) + 1) * cell - 1.5, top: Math.floor(c / maze.n) * cell - 1.5, width: 3, height: cell + 3 }} /> : null,
        )}
        {maze.down.map((wall, c) =>
          wall && Math.floor(c / maze.n) < maze.n - 1 ? <View key={`d${c}`} pointerEvents="none" className="absolute" style={{ backgroundColor: WALL, left: (c % maze.n) * cell - 1.5, top: (Math.floor(c / maze.n) + 1) * cell - 1.5, width: cell + 3, height: 3 }} /> : null,
        )}
        {/* Dark twist: only the veins next to the cell show; the ones it has been through stay dim. */}
        {variant === "dark" &&
          Array.from({ length: maze.n * maze.n }, (_, c) => {
            const near = Math.max(Math.abs((c % maze.n) - px), Math.abs(Math.floor(c / maze.n) - py)) <= 1;
            if (near || c === exit) return null;
            return <View key={`f${c}`} pointerEvents="none" className="absolute bg-[#2a0a10]" style={{ left: (c % maze.n) * cell, top: Math.floor(c / maze.n) * cell, width: cell + 0.5, height: cell + 0.5, opacity: visited.has(c) ? 0.55 : 0.94 }} />;
          })}
        {/* The blood cell: a red disc with a paler middle. */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: cell * 0.64, height: cell * 0.64 }, cellStyle]}>
          <View className="flex-1 items-center justify-center rounded-full bg-[#d6283a]">
            <View className="rounded-full bg-[#f06a77]" style={{ width: cell * 0.28, height: cell * 0.28 }} />
          </View>
        </Animated.View>
      </View>
      <Hint>{variant === "oxygen" ? (hasOxygen ? "Got the oxygen! Now to the green exit." : "Pick up the oxygen bubble first, then find the exit.") : variant === "dark" ? "It's dark in the veins. Feel your way to the exit." : "Drag the blood cell to the green exit."}</Hint>
      <KeyHint>ARROW KEYS OR W A S D</KeyHint>
    </View>
  );
}

// ---------- IV Line: turn the pipes so the drip runs from the bag to the patient ----------
const IV_BAG = require("@/imgs/shop/iv_bag.png");
const HEART = require("@/imgs/misc/heart.png");
/** Plain; Few Turns (a limited number of turns); Contrary (purple pipes turn the other way). */
type PipeVariant = "plain" | "budget" | "reverse";
const PIPE_VARIANTS: { id: PipeVariant; from: number }[] = [
  { id: "plain", from: 0 },
  { id: "budget", from: 0.35 },
  { id: "reverse", from: 0.55 },
];
const PIPE_DRY = "#9aa6b4";
const PIPE_WET = "#4fb3ff";

/**
 * One pipe tile. Its pipes are drawn as first dealt and the whole tile is turned (animated), so a tap
 * swings it round instead of snapping. Water fills it in order along the flow (`order`).
 */
const PipeTile = memo(function PipeTile({ base, spins, size, wet, order, reverse, onPress }: { base: number; spins: number; size: number; wet: boolean; order: number; reverse: boolean; onPress: () => void }) {
  const still = useReduceMotion();
  const rot = useSharedValue(spins * 90);
  const water = useSharedValue(wet ? 1 : 0);
  useEffect(() => {
    rot.set(still ? spins * 90 : withTiming(spins * 90, { duration: 170, easing: Easing.out(Easing.cubic) }));
  }, [spins, still, rot]);
  useEffect(() => {
    water.set(still ? (wet ? 1 : 0) : wet ? withDelay(order * 45, withTiming(1, { duration: 160 })) : withTiming(0, { duration: 120 }));
  }, [wet, order, still, water]);
  const turnStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.get()}deg` }] }));
  const waterStyle = useAnimatedStyle(() => ({ opacity: water.get() }));
  const t = Math.max(6, Math.round(size * 0.26));
  const mid = (size - t) / 2;
  const arms = [UP, RIGHT, DOWN, LEFT].filter((bit) => base & bit);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={reverse ? "Turn this pipe (it turns the other way)" : "Turn this pipe"}
      onPress={onPress}
      style={{ width: size, height: size }}
      className={`border border-outline/30 ${reverse ? "bg-[#ece2fb]" : "bg-surface"}`}
    >
      <Animated.View pointerEvents="none" style={[{ width: size, height: size }, turnStyle]}>
        <PipeShape arms={arms} size={size} t={t} mid={mid} colour={PIPE_DRY} />
        {/* The same pipes in water blue on top, faded in as the drip reaches them. */}
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, waterStyle]}>
          <PipeShape arms={arms} size={size} t={t} mid={mid} colour={PIPE_WET} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});
/** A tile's pipes: an arm out to each open side, joined in the middle, with a paler stripe along each. */
function PipeShape({ arms, size, t, mid, colour }: { arms: number[]; size: number; t: number; mid: number; colour: string }) {
  const long = size / 2 + t / 2;
  return (
    <>
      {arms.map((bit) => {
        const box = bit === UP ? { left: mid, top: 0, width: t, height: long } : bit === DOWN ? { left: mid, top: mid, width: t, height: long } : bit === LEFT ? { left: 0, top: mid, width: long, height: t } : { left: mid, top: mid, width: long, height: t };
        const across = bit === LEFT || bit === RIGHT;
        return (
          <View key={bit} style={{ position: "absolute", backgroundColor: colour, ...box }}>
            <View style={{ position: "absolute", backgroundColor: "#ffffff", opacity: 0.35, ...(across ? { left: 0, right: 0, top: t * 0.2, height: Math.max(1, t * 0.18) } : { top: 0, bottom: 0, left: t * 0.2, width: Math.max(1, t * 0.18) }) }} />
          </View>
        );
      })}
      <View style={{ position: "absolute", left: mid - 1, top: mid - 1, width: t + 2, height: t + 2, backgroundColor: colour }} />
    </>
  );
}

function PipesGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const still = useReduceMotion();
  const [w, onLayout, shown] = useWidth();
  const [setup] = useState(() => {
    const p = makePipes(tuning.pipeSize);
    const variant = pickVariant(tuning.level, PIPE_VARIANTS);
    // Contrary: about a third of the tiles turn anticlockwise.
    const reverse = p.tiles.map(() => variant === "reverse" && Math.random() < 0.35);
    // Few Turns: the fewest turns that solve it (along the laid path), plus a few spare.
    const fewest = solutionPath(p).reduce((sum, i) => sum + turnsTo(p.tiles[i], p.solved![i], reverse[i]), 0);
    return { first: p, variant, reverse, budget: variant === "budget" ? fewest + tuning.pipeSlack : Infinity };
  });
  const [pipes, setPipes] = useState(setup.first);
  const [spins, setSpins] = useState(() => setup.first.tiles.map(() => 0));
  const [used, setUsed] = useState(0);
  const left = useCountdown(tuning.pipeMs, () => done(false));
  const flow = flowsThrough(pipes);
  const order = new Map([...flow.wet].map((c, k) => [c, k]));
  const icon = 28;
  const size = Math.floor((Math.min(w, 320) - icon * 2 - 8) / pipes.n);
  // The heart beats once the drip gets through; the bag sways a little the whole time.
  const heart = useSharedValue(1);
  const sway = useSharedValue(0);
  useEffect(() => {
    if (!still) sway.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(sway);
  }, [still, sway]);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.get() }] }));
  const bagStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${(sway.get() - 0.5) * 10}deg` }] }));
  const rotate = (i: number) => {
    if (flow.done || used >= setup.budget) return;
    const back = setup.reverse[i];
    const tiles = [...pipes.tiles];
    tiles[i] = back ? turn(turn(turn(tiles[i]))) : turn(tiles[i]);
    const next = { ...pipes, tiles };
    setPipes(next);
    setSpins((s) => s.map((v, k) => (k === i ? v + (back ? -1 : 1) : v)));
    setUsed(used + 1);
    haptic.tap();
    playSfx("click");
    if (flowsThrough(next).done) {
      playSfx("buy");
      if (!still) heart.set(withSequence(bounce(1.35), bounce(1.2)));
      setTimeout(() => done(true), 650);
    } else if (used + 1 >= setup.budget) {
      haptic.denied();
      playSfx("invalid");
      setTimeout(() => done(false), 500);
    }
  };
  return (
    <View className="items-center gap-3" style={shown} onLayout={onLayout}>
      <TimeBar left={left} total={tuning.pipeMs} />
      {setup.budget < Infinity && (
        <Text className={`font-number text-sm ${setup.budget - used <= 2 ? "text-danger" : "text-ink"}`}>
          {setup.budget - used} {setup.budget - used === 1 ? "turn" : "turns"} left
        </Text>
      )}
      <View className="flex-row items-start">
        <View style={{ width: icon + 4, height: size * pipes.n }}>
          <Animated.View style={[{ position: "absolute", top: pipes.start * size + (size - icon) / 2, width: icon, height: icon, transformOrigin: "top" }, bagStyle]}>
            <Image source={IV_BAG} style={{ width: icon, height: icon }} contentFit="contain" />
          </Animated.View>
        </View>
        <View className="flex-row flex-wrap border-2 border-outline" style={{ width: size * pipes.n + 4 }}>
          {pipes.tiles.map((_, i) => (
            <PipeTile key={i} base={setup.first.tiles[i]} spins={spins[i]} size={size} wet={flow.wet.has(i)} order={order.get(i) ?? 0} reverse={setup.reverse[i]} onPress={() => rotate(i)} />
          ))}
        </View>
        <View style={{ width: icon + 4, height: size * pipes.n }}>
          <Animated.View style={[{ position: "absolute", left: 4, top: pipes.end * size + (size - icon) / 2, width: icon, height: icon, opacity: flow.done ? 1 : 0.5 }, heartStyle]}>
            <Image source={HEART} style={{ width: icon, height: icon }} contentFit="contain" />
          </Animated.View>
        </View>
      </View>
      <Hint>
        {setup.variant === "budget"
          ? "Only a few turns to spare: think before you tap!"
          : setup.variant === "reverse"
            ? "Purple pipes turn the other way."
            : "Tap pipes to turn them, so the drip runs from the bag to the heart."}
      </Hint>
    </View>
  );
}

export const NEW_GAMES = { food: FoodGame, colour: ColourGame, find: FindGame, maze: MazeGame, pipes: PipesGame };

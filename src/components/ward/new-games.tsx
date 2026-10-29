import { useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, Text, View, type GestureResponderEvent, type ImageSourcePropType } from "react-native";
import Animated from "react-native-reanimated";

import { TapPressable } from "@/components/ui/press-down";
import { shuffle, useDone, useJuice, type GameProps } from "@/components/ward/game-kit";
import { Hint, KeyHint, TimeBar, useCountdown } from "@/components/ward/more-games";
import { SHOP_ITEMS } from "@/constants/items";
import { ROOM_ITEMS } from "@/constants/room";
import { useAudio } from "@/hooks/use-audio";
import { useHaptics } from "@/hooks/use-haptics";
import { useKeys } from "@/hooks/use-keys";
import { DOWN, LEFT, RIGHT, UP, canStep, flowsThrough, makeMaze, makePipes, turn } from "@/lib/puzzles";
/** A random number between a and b. */
const between = (a: number, b: number) => a + Math.random() * (b - a);

// Five more ward minigames (0.8.0): Healthy Shopping, Odd Colour Out, Find It, Blood Flow and IV Line.
// Numbers come from minigameTuning, like the others.

/** Measures a box's width, so a game can size itself to the treatment window. */
function useWidth(fallback = 300) {
  const [w, setW] = useState(fallback);
  return [w, (e: { nativeEvent: { layout: { width: number } } }) => setW(Math.max(160, e.nativeEvent.layout.width))] as const;
}

// ---------- Healthy Shopping: move the cart, catch the healthy food, dodge the junk ----------
type Food = { image: ImageSourcePropType; points: number; name: string };
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
const CART = require("@/imgs/minigames/cart.png");
const FOOD_MS = 20_000;
const FOOD_SIZE = 34;
const CART_W = 64;
const FIELD_H = 250;
/** `k`: how far it has fallen, 0 (top) to 1 (the floor). */
type Falling = { id: number; food: Food; x: number; born: number; k: number };

function FoodGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [w, onLayout] = useWidth();
  const [cartX, setCartX] = useState(0.5);
  const cart = useRef(0.5);
  const [items, setItems] = useState<Falling[]>([]);
  const [score, setScore] = useState(0);
  const [pop, setPop] = useState<{ id: number; text: string; x: number; good: boolean } | null>(null);
  const scoreRef = useRef(0);
  const junkCaught = useRef(false);
  const steer = useRef(0);
  const nextId = useRef(0);
  const left = useCountdown(FOOD_MS, () => done(false));
  const moveCart = (to: number) => {
    cart.current = Math.min(1, Math.max(0, to));
    setCartX(cart.current);
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
        const list = Math.random() < tuning.foodJunk ? JUNK : HEALTHY;
        falling.current = [...falling.current, { id: nextId.current++, food: list[Math.floor(Math.random() * list.length)], x: between(0.05, 0.95), born: now, k: 0 }];
      }
      const kept: Falling[] = [];
      for (const it of falling.current) {
        const k = (now - it.born) / tuning.foodFallMs;
        // The cart's basket is the last 40 px of the field.
        const inBasket = k >= (FIELD_H - 40) / FIELD_H && k < 1 && Math.abs(it.x - cart.current) < (CART_W / 2 + FOOD_SIZE / 3) / w;
        if (!inBasket) {
          if (k < 1.05) kept.push({ ...it, k });
          continue;
        }
        const p = it.food.points;
        scoreRef.current = Math.max(0, scoreRef.current + p);
        setScore(scoreRef.current);
        setPop({ id: it.id, text: p > 0 ? `+${p}` : `${p}`, x: it.x, good: p > 0 });
        if (p > 0) {
          haptic.tap();
          playSfx("click");
        } else {
          junkCaught.current = true;
          haptic.denied();
          playSfx("invalid");
          juice.shake();
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
  return (
    <Animated.View style={juice.style}>
      <View className="gap-2" onLayout={onLayout}>
        <Text className="text-center font-number text-base text-ink">
          {score} / {tuning.foodTarget} points
        </Text>
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
          {items.map((it) => (
            <Image
              key={it.id}
              source={it.food.image}
              style={{ position: "absolute", width: FOOD_SIZE, height: FOOD_SIZE, left: it.x * w - FOOD_SIZE / 2, top: it.k * FIELD_H - FOOD_SIZE }}
              contentFit="contain"
            />
          ))}
          {pop && (
            <Text key={pop.id} className={`absolute font-display text-lg ${pop.good ? "text-success" : "text-danger"}`} style={{ left: pop.x * w - 12, bottom: 54 }}>
              {pop.text}
            </Text>
          )}
          <Image source={CART} style={{ position: "absolute", bottom: 0, left: cartX * w - CART_W / 2, width: CART_W, height: CART_W }} contentFit="contain" />
        </View>
        <Hint>Drag the cart. Catch fruit and veg, skip the junk food!</Hint>
        <KeyHint>← → OR A D</KeyHint>
      </View>
    </Animated.View>
  );
}

// ---------- Odd Colour Out: one square is a slightly different shade ----------
function ColourGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [w, onLayout] = useWidth();
  const [round, setRound] = useState(0);
  const mistakes = useRef(0);
  // Each round: a colour, which square is odd, and the grid (one bigger on the last rounds).
  const deal = (r: number) => {
    const n = Math.min(6, tuning.colourGrid + (r >= tuning.colourRounds - 2 ? 1 : 0));
    const hue = Math.floor(between(0, 360));
    const light = between(38, 58);
    const delta = tuning.colourDelta * (1 - r * 0.08);
    return { n, odd: Math.floor(Math.random() * n * n), base: `hsl(${hue}, 65%, ${light}%)`, oddColour: `hsl(${hue}, 65%, ${light + delta}%)` };
  };
  const [grid, setGrid] = useState(() => deal(0));
  const left = useCountdown(tuning.colourMs, () => done(false));
  const pick = (i: number) => {
    if (i !== grid.odd) {
      mistakes.current += 1;
      haptic.denied();
      playSfx("invalid");
      juice.shake();
      return;
    }
    haptic.tap();
    playSfx("buy");
    juice.pop();
    if (round + 1 >= tuning.colourRounds) return done(true, mistakes.current === 0);
    setRound(round + 1);
    setGrid(deal(round + 1));
  };
  const gap = 4;
  const size = Math.floor((Math.min(w, 300) - gap * (grid.n - 1)) / grid.n);
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3" onLayout={onLayout}>
        <Text className="font-number text-base text-ink">
          Round {round + 1} of {tuning.colourRounds}
        </Text>
        <TimeBar left={left} total={tuning.colourMs} />
        <View className="flex-row flex-wrap" style={{ width: size * grid.n + gap * (grid.n - 1), gap }}>
          {Array.from({ length: grid.n * grid.n }, (_, i) => (
            <TapPressable
              key={`${round}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Square ${i + 1}`}
              onDown={() => pick(i)}
              style={{ width: size, height: size, backgroundColor: i === grid.odd ? grid.oddColour : grid.base }}
              className="border-[1.5px] border-outline"
            />
          ))}
        </View>
        <Hint>{"Tap the square that's a different shade."}</Hint>
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
type Scatter = { image: ImageSourcePropType; x: number; y: number; size: number; target: boolean };

function FindGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [w, onLayout] = useWidth();
  const h = Math.round(w * 0.85);
  const [round, setRound] = useState(0);
  const mistakes = useRef(0);
  const deal = () => {
    const [target, ...rest] = shuffle(FINDABLE);
    const others = rest.slice(0, 12);
    const things: Scatter[] = Array.from({ length: tuning.findCount }, () => ({ image: others[Math.floor(Math.random() * others.length)].image, x: between(0.06, 0.94), y: between(0.08, 0.92), size: between(30, 44), target: false }));
    // Drawn last, so nothing can cover it completely.
    things.push({ image: target.image, x: between(0.08, 0.92), y: between(0.1, 0.9), size: 36, target: true });
    return { target, things };
  };
  const [scene, setScene] = useState(deal);
  const left = useCountdown(tuning.findMs, () => done(false));
  const pick = (target: boolean) => {
    if (!target) {
      mistakes.current += 1;
      haptic.denied();
      playSfx("invalid");
      juice.shake();
      return;
    }
    haptic.buy();
    playSfx("buy");
    juice.pop();
    if (round + 1 >= FIND_ROUNDS) return done(true, mistakes.current === 0);
    setRound(round + 1);
    setScene(deal());
  };
  return (
    <Animated.View style={juice.style}>
      <View className="gap-2" onLayout={onLayout}>
        <View className="flex-row items-center justify-center gap-2">
          <Text className="font-number text-base text-ink">Find the</Text>
          <Image source={scene.target.image} style={{ width: 28, height: 28 }} contentFit="contain" />
          <Text className="font-display text-base text-ink">{scene.target.name}</Text>
          <Text className="font-number text-sm text-ink opacity-70">
            ({round + 1}/{FIND_ROUNDS})
          </Text>
        </View>
        <TimeBar left={left} total={tuning.findMs} />
        <View className="overflow-hidden border-2 border-outline bg-[#f4efe6]" style={{ height: h }}>
          {scene.things.map((t, i) => (
            <TapPressable
              key={`${round}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={t.target ? scene.target.name : "Something else"}
              onDown={() => pick(t.target)}
              style={{ position: "absolute", left: t.x * w - t.size / 2, top: t.y * h - t.size / 2, width: t.size, height: t.size }}
            >
              <Image source={t.image} style={{ width: t.size, height: t.size }} contentFit="contain" />
            </TapPressable>
          ))}
        </View>
        <Hint>Tap it as soon as you spot it.</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Blood Flow: drag the blood cell through the maze to the exit ----------
function MazeGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [w, onLayout] = useWidth();
  const [maze] = useState(() => makeMaze(tuning.mazeSize));
  const [pos, setPos] = useState(0);
  const at = useRef(0);
  const exit = maze.n * maze.n - 1;
  const left = useCountdown(tuning.mazeMs, () => done(false));
  const side = Math.min(w, 300);
  const cell = side / maze.n;
  const step = (dx: number, dy: number) => {
    if (!canStep(maze, at.current, dx, dy)) return false;
    at.current += dx + dy * maze.n;
    setPos(at.current);
    haptic.tap();
    if (at.current === exit) {
      playSfx("buy");
      done(true);
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
  return (
    <View className="items-center gap-3" onLayout={onLayout}>
      <TimeBar left={left} total={tuning.mazeMs} />
      <View
        style={{ width: side, height: side }}
        className="border-2 border-[#7a1f2b] bg-[#ffd9d9]"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => (drag.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, cx: (px + 0.5) * cell, cy: (py + 0.5) * cell })}
        onResponderMove={follow}
        onResponderRelease={() => (drag.current = null)}
      >
        {/* The exit, bottom right. */}
        <View pointerEvents="none" className="absolute bg-success/40" style={{ left: (maze.n - 1) * cell, top: (maze.n - 1) * cell, width: cell, height: cell }} />
        {maze.right.map((wall, c) =>
          wall && c % maze.n < maze.n - 1 ? <View key={`r${c}`} pointerEvents="none" className="absolute bg-[#7a1f2b]" style={{ left: ((c % maze.n) + 1) * cell - 1.5, top: Math.floor(c / maze.n) * cell - 1.5, width: 3, height: cell + 3 }} /> : null,
        )}
        {maze.down.map((wall, c) =>
          wall && Math.floor(c / maze.n) < maze.n - 1 ? <View key={`d${c}`} pointerEvents="none" className="absolute bg-[#7a1f2b]" style={{ left: (c % maze.n) * cell - 1.5, top: (Math.floor(c / maze.n) + 1) * cell - 1.5, width: cell + 3, height: 3 }} /> : null,
        )}
        {/* The blood cell: a red disc with a paler middle. */}
        <View pointerEvents="none" className="absolute items-center justify-center rounded-full bg-[#d6283a]" style={{ left: (px + 0.18) * cell, top: (py + 0.18) * cell, width: cell * 0.64, height: cell * 0.64 }}>
          <View className="rounded-full bg-[#f06a77]" style={{ width: cell * 0.28, height: cell * 0.28 }} />
        </View>
      </View>
      <Hint>Drag the blood cell to the green exit.</Hint>
      <KeyHint>ARROW KEYS OR W A S D</KeyHint>
    </View>
  );
}

// ---------- IV Line: turn the pipes so the drip runs from the bag to the patient ----------
const IV_BAG = require("@/imgs/shop/iv_bag.png");
const HEART = require("@/imgs/misc/heart.png");

function PipeTile({ mask, size, wet, onPress }: { mask: number; size: number; wet: boolean; onPress: () => void }) {
  const t = Math.max(6, Math.round(size * 0.26));
  const colour = wet ? "#4fb3ff" : "#9aa6b4";
  const arm = (bit: number) => {
    if (!(mask & bit)) return null;
    const mid = (size - t) / 2;
    const style = bit === UP ? { left: mid, top: 0, width: t, height: size / 2 + t / 2 } : bit === DOWN ? { left: mid, top: mid, width: t, height: size / 2 + t / 2 } : bit === LEFT ? { left: 0, top: mid, width: size / 2 + t / 2, height: t } : { left: mid, top: mid, width: size / 2 + t / 2, height: t };
    return <View key={bit} pointerEvents="none" style={{ position: "absolute", backgroundColor: colour, ...style }} />;
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Turn this pipe" onPress={onPress} style={{ width: size, height: size }} className="border border-outline/30 bg-surface">
      {[UP, RIGHT, DOWN, LEFT].map(arm)}
    </Pressable>
  );
}

function PipesGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [w, onLayout] = useWidth();
  const [pipes, setPipes] = useState(() => makePipes(tuning.pipeSize));
  const left = useCountdown(tuning.pipeMs, () => done(false));
  const flow = flowsThrough(pipes);
  const icon = 28;
  const size = Math.floor((Math.min(w, 320) - icon * 2 - 8) / pipes.n);
  const rotate = (i: number) => {
    const tiles = [...pipes.tiles];
    tiles[i] = turn(tiles[i]);
    const next = { ...pipes, tiles };
    setPipes(next);
    haptic.tap();
    playSfx("click");
    if (flowsThrough(next).done) {
      playSfx("buy");
      setTimeout(() => done(true), 350);
    }
  };
  return (
    <View className="items-center gap-3" onLayout={onLayout}>
      <TimeBar left={left} total={tuning.pipeMs} />
      <View className="flex-row items-start">
        <View style={{ width: icon + 4, height: size * pipes.n }}>
          <Image source={IV_BAG} style={{ position: "absolute", top: pipes.start * size + (size - icon) / 2, width: icon, height: icon }} contentFit="contain" />
        </View>
        <View className="flex-row flex-wrap border-2 border-outline" style={{ width: size * pipes.n + 4 }}>
          {pipes.tiles.map((m, i) => (
            <PipeTile key={i} mask={m} size={size} wet={flow.wet.has(i)} onPress={() => rotate(i)} />
          ))}
        </View>
        <View style={{ width: icon + 4, height: size * pipes.n }}>
          <Image source={HEART} style={{ position: "absolute", left: 4, top: pipes.end * size + (size - icon) / 2, width: icon, height: icon, opacity: flow.done ? 1 : 0.5 }} contentFit="contain" />
        </View>
      </View>
      <Hint>Tap pipes to turn them, so the drip runs from the bag to the heart.</Hint>
    </View>
  );
}

export const NEW_GAMES = { food: FoodGame, colour: ColourGame, find: FindGame, maze: MazeGame, pipes: PipesGame };

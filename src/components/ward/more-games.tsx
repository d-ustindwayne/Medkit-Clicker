import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { PixelButton } from "@/components/ui/pixel-button";
import { hardness, shuffle, useDone, type GameProps } from "@/components/ward/game-kit";
import { useAudio } from "@/hooks/use-audio";
import { useHaptics } from "@/hooks/use-haptics";

// Six more quick ward minigames, each a few seconds long. They get a little harder as you treat
// more patients (see minigameTuning).

/** A countdown in seconds that calls `onEnd` once at zero. */
function useCountdown(ms: number, onEnd: () => void) {
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

const Hint = ({ children }: { children: string }) => <Text className="text-center font-body text-sm text-ink opacity-70">{children}</Text>;

// ---------- Pulse Check: count the heartbeats, then pick the number ----------
function PulseGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [beats] = useState(() => 5 + Math.floor(Math.random() * 4));
  const [options] = useState(() => shuffle([beats - 1, beats, beats + 1]));
  const [asking, setAsking] = useState(false);
  const pulse = useSharedValue(1);
  useEffect(() => {
    const gap = 620 - hardness(tuning) * 120;
    const timers = Array.from({ length: beats }, (_, k) =>
      setTimeout(() => pulse.set(withSequence(withTiming(1.3, { duration: 90 }), withTiming(1, { duration: 250 }))), 900 + k * gap),
    );
    timers.push(setTimeout(() => setAsking(true), 900 + beats * gap + 400));
    return () => timers.forEach(clearTimeout);
  }, [beats, pulse, tuning]);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  const answer = (n: number) => {
    const ok = n === beats;
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    done(ok);
  };
  return (
    <View className="items-center gap-3">
      <Animated.View style={heart}>
        <Image source={require("@/imgs/misc/heart.png")} style={{ width: 110, height: 110 }} contentFit="contain" />
      </Animated.View>
      {asking ? (
        <>
          <Text className="font-display text-base text-ink">How many beats?</Text>
          <View className="flex-row gap-3">
            {options.map((n) => (
              <PixelButton key={n} label={String(n)} onPress={() => answer(n)} />
            ))}
          </View>
        </>
      ) : (
        <Hint>Count the heartbeats...</Hint>
      )}
    </View>
  );
}

// ---------- Sort the Meds: tap every pill of one colour, nothing else ----------
const PILL_COLORS = [
  { name: "RED", a: "#e2372b", b: "#ffffff" },
  { name: "BLUE", a: "#3a8fe0", b: "#ffffff" },
  { name: "YELLOW", a: "#f2c14e", b: "#ffffff" },
];
function PillsGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [pills] = useState(() => {
    const target = Math.floor(Math.random() * 3);
    const colors = shuffle([target, target, target, target, (target + 1) % 3, (target + 1) % 3, (target + 2) % 3, (target + 2) % 3, (target + 1) % 3]);
    return { target, colors };
  });
  const [taken, setTaken] = useState<number[]>([]);
  const left = useCountdown(6000 - hardness(tuning) * 1000, () => done(false));
  const need = pills.colors.filter((c) => c === pills.target).length;
  const tap = (i: number) => {
    if (taken.includes(i)) return;
    if (pills.colors[i] !== pills.target) {
      haptic.denied();
      playSfx("invalid");
      return done(false);
    }
    const next = [...taken, i];
    setTaken(next);
    haptic.tap();
    playSfx("click");
    if (next.length >= need) done(true);
  };
  const t = PILL_COLORS[pills.target];
  return (
    <View className="items-center gap-3">
      <Text className="font-display text-base text-ink">
        Tap every <Text style={{ color: t.a }}>{t.name}</Text> pill · {(left / 1000).toFixed(1)}s
      </Text>
      <View className="w-56 flex-row flex-wrap justify-between gap-y-2">
        {pills.colors.map((c, i) => {
          const pill = PILL_COLORS[c];
          return (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${pill.name.toLowerCase()} pill`} onPress={() => tap(i)} className="h-16 w-16 items-center justify-center border-2 border-outline bg-surface">
              {!taken.includes(i) && (
                <View className="h-6 w-12 flex-row overflow-hidden rounded-full border-2 border-outline">
                  <View className="flex-1" style={{ backgroundColor: pill.a }} />
                  <View className="flex-1" style={{ backgroundColor: pill.b }} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Hint>{"One wrong pill and it's a mix-up!"}</Hint>
    </View>
  );
}

// ---------- Spot the Fracture: find the cracked bone on the X-ray ----------
function XrayGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const count = hardness(tuning) > 0.5 ? 9 : 6;
  const [cracked] = useState(() => Math.floor(Math.random() * count));
  const left = useCountdown(5000, () => done(false));
  const pick = (i: number) => {
    const ok = i === cracked;
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    done(ok);
  };
  return (
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">Find the fracture · {(left / 1000).toFixed(1)}s</Text>
      <View className="w-60 flex-row flex-wrap justify-between gap-y-2 border-2 border-outline bg-[#0d1a2c] p-2">
        {Array.from({ length: count }, (_, i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Bone ${i + 1}`} onPress={() => pick(i)} className="h-16 w-[30%] items-center justify-center">
            {/* A pixel bone: two knobs and a shaft; the cracked one has a dark break across it. */}
            <View className="items-center" style={{ transform: [{ rotate: `${(i % 3) * 20 - 20}deg` }] }}>
              <View className="flex-row gap-1">
                <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
                <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
              </View>
              <View className="h-8 w-3 bg-[#e8f2ff]">
                {i === cracked && <View className="absolute left-[-2px] top-3 h-[3px] w-[16px] bg-[#0d1a2c]" style={{ transform: [{ rotate: "-25deg" }] }} />}
              </View>
              <View className="flex-row gap-1">
                <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
                <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      <Hint>Tap the bone with the crack.</Hint>
    </View>
  );
}

// ---------- Germ Buster: tap the germs before they slip away ----------
const GERMS = 10;
function GermGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [germ, setGerm] = useState<{ n: number; cell: number } | null>(null);
  const [busted, setBusted] = useState(0);
  const hits = useRef(0);
  useEffect(() => {
    const show = 950 - hardness(tuning) * 250;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let n = 0; n < GERMS; n++) {
      timers.push(setTimeout(() => setGerm({ n, cell: Math.floor(Math.random() * 9) }), 700 + n * show));
    }
    timers.push(setTimeout(() => done(hits.current >= 7), 700 + GERMS * show));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);
  const bust = (cell: number) => {
    if (!germ || germ.cell !== cell) return;
    hits.current += 1;
    setBusted(hits.current);
    setGerm(null);
    haptic.tap();
    playSfx("medkit");
  };
  return (
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">Busted {busted} (need 7 of {GERMS})</Text>
      <View className="w-56 flex-row flex-wrap justify-between gap-y-2">
        {Array.from({ length: 9 }, (_, i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={germ?.cell === i ? "Germ" : "Empty"} onPress={() => bust(i)} className="h-16 w-16 items-center justify-center border-2 border-outline bg-surface">
            {germ?.cell === i && <Image source={require("@/imgs/stickers/grumpy_germ.png")} style={{ width: 52, height: 52 }} contentFit="contain" />}
          </Pressable>
        ))}
      </View>
      <Hint>Tap each germ before it slips away!</Hint>
    </View>
  );
}

// ---------- Deep Breaths: hold to breathe in, let go when the circle is full ----------
const BREATHS = 3;
function BreathGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const fill = useSharedValue(0);
  const start = useRef(0);
  const [round, setRound] = useState(0);
  const [good, setGood] = useState(0);
  const [note, setNote] = useState("Hold to breathe in...");
  const ms = 1700 - hardness(tuning) * 300;
  const circle = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + fill.get() * 0.75 }] }));
  const inhale = () => {
    start.current = Date.now();
    fill.set(0);
    fill.set(withTiming(1.25, { duration: ms * 1.25, easing: Easing.linear }));
  };
  const exhale = () => {
    if (!start.current) return;
    cancelAnimation(fill);
    const k = (Date.now() - start.current) / ms;
    start.current = 0;
    const ok = k >= 0.82 && k <= 1.08;
    const total = good + (ok ? 1 : 0);
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    setNote(ok ? "Perfect breath!" : k < 0.82 ? "Too short, breathe deeper." : "Too long, let go sooner.");
    fill.set(withTiming(0, { duration: 400 }));
    setGood(total);
    if (round + 1 >= BREATHS) return done(total >= 2);
    setRound(round + 1);
  };
  return (
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">
        Breath {Math.min(round + 1, BREATHS)} of {BREATHS} · {good} good (need 2)
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Hold to breathe in" onPressIn={inhale} onPressOut={exhale} className="h-40 w-40 items-center justify-center">
        <View className="absolute h-36 w-36 rounded-full border-4 border-dashed border-success" />
        <Animated.View style={[{ width: 120, height: 120, borderRadius: 60, backgroundColor: "#8fd3f5", opacity: 0.85 }, circle]} />
      </Pressable>
      <Hint>{note}</Hint>
    </View>
  );
}

// ---------- Match the Meds: find the three pairs ----------
const MEDS: ImageSourcePropType[] = [require("@/imgs/shop/syringe.png"), require("@/imgs/shop/bandage_roll.png"), require("@/imgs/shop/medicines.png")];
function MemoryGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [cards] = useState(() => shuffle([0, 0, 1, 1, 2, 2]));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const busy = useRef(false);
  const left = useCountdown(15000 - hardness(tuning) * 3000, () => done(false));
  const flip = (i: number) => {
    if (busy.current || open.includes(i) || matched.includes(i)) return;
    const now = [...open, i];
    setOpen(now);
    haptic.tap();
    if (now.length < 2) return;
    if (cards[now[0]] === cards[now[1]]) {
      const m = [...matched, ...now];
      setMatched(m);
      setOpen([]);
      playSfx("buy");
      if (m.length === cards.length) done(true);
    } else {
      busy.current = true;
      playSfx("invalid");
      setTimeout(() => {
        setOpen([]);
        busy.current = false;
      }, 650);
    }
  };
  return (
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">Find the pairs · {(left / 1000).toFixed(1)}s</Text>
      <View className="w-56 flex-row flex-wrap justify-between gap-y-2">
        {cards.map((c, i) => {
          const shown = open.includes(i) || matched.includes(i);
          return (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={shown ? "Card" : "Hidden card"} onPress={() => flip(i)} className={`h-20 w-16 items-center justify-center border-2 border-outline ${shown ? "bg-surface" : "bg-primary"}`}>
              {shown ? <Image source={MEDS[c]} style={{ width: 48, height: 48 }} contentFit="contain" /> : <Text className="font-pixel text-2xl text-surface">+</Text>}
            </Pressable>
          );
        })}
      </View>
      <Hint>Flip two cards at a time.</Hint>
    </View>
  );
}

export const MORE_GAMES = { pulse: PulseGame, pills: PillsGame, xray: XrayGame, germs: GermGame, breath: BreathGame, memory: MemoryGame };

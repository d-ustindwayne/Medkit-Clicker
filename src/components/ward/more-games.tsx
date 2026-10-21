import { memo, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, Text, View, type ImageSourcePropType } from "react-native";
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
} from "react-native-reanimated";

import { PixelButton } from "@/components/ui/pixel-button";
import { hardness, shuffle, useDone, useJuice, type GameProps } from "@/components/ward/game-kit";
import { useAudio } from "@/hooks/use-audio";
import { useHaptics } from "@/hooks/use-haptics";

// Six more quick ward minigames, each a few seconds long, with a bit of life: things bob, pop
// and flip. They get harder with progress (see minigameLevel and minigameTuning).

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

/** A thin timer bar that drains as time runs out and turns red near the end. */
function TimeBar({ left, total }: { left: number; total: number }) {
  const k = Math.max(0, left / total);
  return (
    <View className="h-2 w-full border-[1.5px] border-outline bg-surface">
      <View className={`h-full ${k < 0.3 ? "bg-danger" : "bg-success"}`} style={{ width: `${k * 100}%` }} />
    </View>
  );
}

// ---------- Pulse Check: count the heartbeats, then pick the number ----------
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
function PulseGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  // 5-7 beats for a new player, up to 9-11 later on.
  const [beats] = useState(() => tuning.pulseBeats + Math.floor(Math.random() * 3));
  const [options] = useState(() => shuffle([beats - 1, beats, beats + 1]));
  const [asking, setAsking] = useState(false);
  const [beat, setBeat] = useState(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    const gap = tuning.pulseGapMs;
    // A "get ready" pause before the first beat, and each beat (240 ms) leaves a clear rest before the next.
    const timers = Array.from({ length: beats }, (_, k) =>
      setTimeout(() => {
        pulse.set(withSequence(withTiming(1.18, { duration: 70, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 170, easing: Easing.in(Easing.quad) })));
        setBeat(k + 1);
      }, PULSE_LEAD_MS + k * gap),
    );
    timers.push(setTimeout(() => setAsking(true), PULSE_LEAD_MS + beats * gap + 400));
    return () => timers.forEach(clearTimeout);
  }, [beats, pulse, tuning]);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  const answer = (n: number) => {
    const ok = n === beats;
    if (ok) juice.pop();
    else juice.shake();
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    setTimeout(() => done(ok), 350);
  };
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <View className="h-36 w-36 items-center justify-center">
          {beat > 0 && <Ripple key={beat} beat={beat} />}
          <Animated.View style={heart}>
            <Image source={require("@/imgs/misc/heart.png")} style={{ width: 110, height: 110 }} contentFit="contain" />
          </Animated.View>
        </View>
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
          <Hint>{beat === 0 ? "Get ready..." : "Count the heartbeats..."}</Hint>
        )}
      </View>
    </Animated.View>
  );
}

// ---------- Sort the Meds: tap every pill of one colour, nothing else ----------
const PILL_COLORS = [
  { name: "RED", a: "#e2372b", b: "#ffffff" },
  { name: "BLUE", a: "#3a8fe0", b: "#ffffff" },
  { name: "YELLOW", a: "#f2c14e", b: "#ffffff" },
];
/** A pill that sways slightly and pops away when taken. */
const Pill = memo(function Pill({ color, i, taken }: { color: (typeof PILL_COLORS)[number]; i: number; taken: boolean }) {
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
  return (
    <Animated.View style={style}>
      <View className="h-6 w-12 flex-row overflow-hidden rounded-full border-2 border-outline">
        <View className="flex-1" style={{ backgroundColor: color.a }} />
        <View className="flex-1" style={{ backgroundColor: color.b }} />
      </View>
    </Animated.View>
  );
});
function PillsGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const total = tuning.pillsMs;
  const [pills] = useState(() => {
    const target = Math.floor(Math.random() * 3);
    const colors = shuffle([target, target, target, target, (target + 1) % 3, (target + 1) % 3, (target + 2) % 3, (target + 2) % 3, (target + 1) % 3]);
    return { target, colors };
  });
  const [taken, setTaken] = useState<number[]>([]);
  const left = useCountdown(total, () => done(false));
  const need = pills.colors.filter((c) => c === pills.target).length;
  const tap = (i: number) => {
    if (taken.includes(i)) return;
    if (pills.colors[i] !== pills.target) {
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
  const t = PILL_COLORS[pills.target];
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-display text-base text-ink">
          Tap every <Text style={{ color: t.a }}>{t.name}</Text> pill
        </Text>
        <TimeBar left={left} total={total} />
        <View className="w-56 flex-row flex-wrap justify-between gap-y-2">
          {pills.colors.map((c, i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${PILL_COLORS[c].name.toLowerCase()} pill`} onPress={() => tap(i)} className="h-16 w-16 items-center justify-center border-2 border-outline bg-surface">
              <Pill color={PILL_COLORS[c]} i={i} taken={taken.includes(i)} />
            </Pressable>
          ))}
        </View>
        <Hint>{"One wrong pill and it's a mix-up!"}</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Spot the Fracture: find the cracked bone on the X-ray ----------
function XrayGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const count = tuning.bones;
  const total = tuning.xrayMs;
  // The crack gets finer as the game gets harder.
  const crackW = Math.round(16 - hardness(tuning) * 6);
  const [cracked] = useState(() => Math.floor(Math.random() * count));
  const [picked, setPicked] = useState<number | null>(null);
  const left = useCountdown(total, () => done(false));
  // A scan line sweeps down the film, like a light box.
  const scan = useSharedValue(0);
  useEffect(() => {
    scan.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true)); // sweeps down and back up
  }, [scan]);
  const [filmH, setFilmH] = useState(0);
  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scan.get() * filmH }] }));
  const pick = (i: number) => {
    if (picked !== null) return;
    const ok = i === cracked;
    setPicked(i);
    if (ok) juice.pop();
    else juice.shake();
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    setTimeout(() => done(ok), 450);
  };
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">Find the fracture</Text>
        <TimeBar left={left} total={total} />
        <View onLayout={(e) => setFilmH(e.nativeEvent.layout.height)} className="w-60 flex-row flex-wrap justify-between gap-y-2 overflow-hidden border-2 border-outline bg-[#0d1a2c] p-2">
          {Array.from({ length: count }, (_, i) => {
            const glow = picked === i ? (i === cracked ? "bg-success/30" : "bg-danger/30") : "";
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Bone ${i + 1}`} onPress={() => pick(i)} className={`h-16 w-[30%] items-center justify-center ${glow}`}>
                {/* A pixel bone: two knobs and a shaft; the cracked one has a dark break across it. */}
                <View className="items-center" style={{ transform: [{ rotate: `${(i % 3) * 20 - 20}deg` }] }}>
                  <View className="flex-row gap-1">
                    <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
                    <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
                  </View>
                  <View className="h-8 w-3 bg-[#e8f2ff]">
                    {i === cracked && <View className="absolute top-3 h-[3px] bg-[#0d1a2c]" style={{ left: (12 - crackW) / 2, width: crackW, transform: [{ rotate: "-25deg" }] }} />}
                  </View>
                  <View className="flex-row gap-1">
                    <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
                    <View className="h-3 w-3 rounded-full bg-[#e8f2ff]" />
                  </View>
                </View>
              </Pressable>
            );
          })}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, height: 6, backgroundColor: "rgba(127,224,196,0.35)" }, scanStyle]} />
        </View>
        <Hint>Tap the bone with the crack.</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Germ Buster: tap the germs before they slip away ----------
const GERMS = 10;
/** A germ that springs up out of its hole, wiggles, and bursts when tapped. */
function Germ({ busted }: { busted: boolean }) {
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
  const style = useAnimatedStyle(() => ({
    opacity: 1 - burst.get(),
    transform: [{ scale: t.get() * (1 + burst.get() * 0.5) }, { rotate: `${wiggle.get() * 4}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Image source={require("@/imgs/stickers/grumpy_germ.png")} style={{ width: 52, height: 52 }} contentFit="contain" />
    </Animated.View>
  );
}
function GermGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const [germ, setGerm] = useState<{ n: number; cell: number; busted: boolean } | null>(null);
  const [busted, setBusted] = useState(0);
  const hits = useRef(0);
  const need = tuning.germsNeeded;
  useEffect(() => {
    const show = tuning.germShowMs;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let n = 0; n < GERMS; n++) {
      timers.push(setTimeout(() => setGerm({ n, cell: Math.floor(Math.random() * 9), busted: false }), 700 + n * show));
    }
    timers.push(setTimeout(() => done(hits.current >= need), 700 + GERMS * show));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);
  const bust = (cell: number) => {
    if (!germ || germ.cell !== cell || germ.busted) {
      juice.shake();
      return;
    }
    hits.current += 1;
    setBusted(hits.current);
    setGerm({ ...germ, busted: true });
    juice.pop();
    haptic.tap();
    playSfx("medkit");
  };
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">
          Busted {busted} (need {need} of {GERMS})
        </Text>
        <View className="w-56 flex-row flex-wrap justify-between gap-y-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={germ?.cell === i && !germ.busted ? "Germ" : "Empty"} onPress={() => bust(i)} className="h-16 w-16 items-center justify-center border-2 border-outline bg-surface">
              {germ?.cell === i && <Germ key={germ.n} busted={germ.busted} />}
            </Pressable>
          ))}
        </View>
        <Hint>Tap each germ before it slips away!</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Deep Breaths: hold to breathe in, let go when the circle is full ----------
const BREATHS = 3;
function BreathGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const fill = useSharedValue(0);
  const ring = useSharedValue(0);
  const start = useRef(0);
  const [round, setRound] = useState(0);
  const [good, setGood] = useState(0);
  const [note, setNote] = useState("Hold to breathe in...");
  const ms = tuning.breathMs;
  const low = tuning.breathLow, high = tuning.breathHigh;
  useEffect(() => {
    ring.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [ring]);
  // The air fills from blue to green as it reaches the target ring.
  const circle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + fill.get() * 0.75 }],
    backgroundColor: interpolateColor(Math.min(1.25, fill.get()), [0, 0.82, 1, 1.25], ["#8fd3f5", "#7fe0c4", "#4edb4e", "#f34747"]),
  }));
  const target = useAnimatedStyle(() => ({ opacity: interpolate(ring.get(), [0, 1], [0.45, 1]), transform: [{ scale: interpolate(ring.get(), [0, 1], [0.98, 1.03]) }] }));
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
    const ok = k >= low && k <= high;
    const total = good + (ok ? 1 : 0);
    if (ok) juice.pop();
    else juice.shake();
    haptic[ok ? "buy" : "denied"]();
    playSfx(ok ? "buy" : "invalid");
    setNote(ok ? "Perfect breath!" : k < low ? "Too short, breathe deeper." : "Too long, let go sooner.");
    fill.set(withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    setGood(total);
    if (round + 1 >= BREATHS) return setTimeout(() => done(total >= 2), 450);
    setRound(round + 1);
  };
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">
          Breath {Math.min(round + 1, BREATHS)} of {BREATHS} · {good} good (need 2)
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Hold to breathe in" onPressIn={inhale} onPressOut={exhale} className="h-40 w-40 items-center justify-center">
          <Animated.View style={[{ position: "absolute", width: 144, height: 144, borderRadius: 72, borderWidth: 4, borderStyle: "dashed", borderColor: "#4edb4e" }, target]} />
          <Animated.View style={[{ width: 120, height: 120, borderRadius: 60, opacity: 0.85 }, circle]} />
        </Pressable>
        <Hint>{note}</Hint>
      </View>
    </Animated.View>
  );
}

// ---------- Match the Meds: flip cards to find the three pairs ----------
const MEDS: ImageSourcePropType[] = [require("@/imgs/shop/syringe.png"), require("@/imgs/shop/bandage_roll.png"), require("@/imgs/shop/medicines.png"), require("@/imgs/shop/thermometer.png")];
/** A card that flips over in 3D: the red back with a cross, or the medicine on the front. */
const FlipCard = memo(function FlipCard({ image, faceUp, matched, onPress }: { image: ImageSourcePropType; faceUp: boolean; matched: boolean; onPress: () => void }) {
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
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={faceUp ? "Card" : "Hidden card"} onPress={onPress} className="h-20 w-16">
      <Animated.View style={[{ position: "absolute", width: 64, height: 80 }, back]}>
        <View className="flex-1 items-center justify-center border-2 border-outline bg-primary">
          <Text className="font-pixel text-2xl text-surface">+</Text>
        </View>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", width: 64, height: 80 }, front]}>
        <View className={`flex-1 items-center justify-center border-2 border-outline ${matched ? "bg-success/30" : "bg-surface"}`}>
          <Image source={image} style={{ width: 48, height: 48 }} contentFit="contain" />
        </View>
      </Animated.View>
    </Pressable>
  );
});
function MemoryGame({ onDone, tuning }: GameProps) {
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const total = tuning.memoryMs;
  // Three pairs, or four later on.
  const [cards] = useState(() => shuffle(Array.from({ length: tuning.pairs * 2 }, (_, i) => i >> 1)));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  // Picks live in a ref too, so two quick taps can't both count as "the second card", and nothing
  // can be flipped while a wrong pair is turning back over.
  const picks = useRef<number[]>([]);
  const busy = useRef(false);
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
        if (m.length === cards.length) setTimeout(() => done(true), 450);
      }, 300);
    } else {
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
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">Find the pairs</Text>
        <TimeBar left={left} total={total} />
        <View className={`${cards.length > 6 ? "w-72" : "w-56"} flex-row flex-wrap justify-between gap-y-2`}>
          {cards.map((c, i) => (
            <FlipCard key={i} image={MEDS[c]} faceUp={open.includes(i) || matched.includes(i)} matched={matched.includes(i)} onPress={() => flip(i)} />
          ))}
        </View>
        <Hint>Flip two cards at a time.</Hint>
      </View>
    </Animated.View>
  );
}

export const MORE_GAMES = { pulse: PulseGame, pills: PillsGame, xray: XrayGame, germs: GermGame, breath: BreathGame, memory: MemoryGame };

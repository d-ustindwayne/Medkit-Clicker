import { useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Modal, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { NEW_GAMES } from "@/components/ward/new-games";
import { KeyHint, MORE_GAMES } from "@/components/ward/more-games";
import { pickVariant, shuffle, useDone, useJuice, type GameProps } from "@/components/ward/game-kit";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { TapPressable } from "@/components/ui/press-down";
import { COIN } from "@/constants/boosts";
import { minigameTuning, patientLook, type SickPatient } from "@/constants/patients";
import { themeVars } from "@/constants/theme";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameStore, useSettings } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { useKeys } from "@/hooks/use-keys";
import { usePalette } from "@/hooks/use-palette";
import { formatCount, formatMult } from "@/lib/format";
import { treatCoins, treatReward, wardLevel } from "@/lib/game";

// ---------- Injection: stop the sliding needle in the vein's dark core, 2 of 3 (the vein may drift too) ----------
const ZONES = [0.55, 0.22, 0.64];
/** How far a drifting vein wanders either way, as a share of the arm. */
const DRIFT = 0.16;
/** The vein drawn around the core: twice the core's width, so a near miss lands in the vein but not the core. */
const VEIN_PER_CORE = 2;
function InjectionGame({ onDone, tuning }: GameProps) {
  // The core is the target (the old vein's width); the lighter vein around it is a near miss.
  const CORE_W = tuning.veinWidth;
  const ZONE_W = CORE_W * VEIN_PER_CORE;
  const palette = usePalette();
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [moving] = useState(() => pickVariant(tuning.level, [{ id: "steady", from: 0 }, { id: "moving", from: 0.25 }]) === "moving");
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [trackW, setTrackW] = useState(0);
  const x = useSharedValue(0);
  const zone = ZONES[round];
  // Where the vein starts, as a share of the arm; a drifting vein sways around it.
  const z = useSharedValue(zone);
  useEffect(() => {
    x.set(0);
    x.set(withRepeat(withTiming(1, { duration: (1100 - round * 220) / tuning.needleSpeed, easing: Easing.linear }), -1, true));
  }, [round, x, tuning.needleSpeed]);
  useEffect(() => {
    const lo = Math.max(0, zone - DRIFT), hi = Math.min(1 - ZONE_W, zone + DRIFT);
    z.set(lo);
    if (moving) z.set(withRepeat(withTiming(hi, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true));
    else z.set(zone);
  }, [zone, moving, z, ZONE_W]);
  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * Math.max(0, trackW - 10) }] }));
  const vein = useAnimatedStyle(() => ({ transform: [{ translateX: z.get() * trackW }] }));
  const juice = useJuice();

  const inject = () => {
    const v = x.get();
    const at = z.get();
    const core = at + (ZONE_W - CORE_W) / 2;
    const hit = v >= core && v <= core + CORE_W;
    setNote(hit ? "Right in the vein!" : v >= at && v <= at + ZONE_W ? "Close! Aim for the dark centre." : "Missed the vein.");
    if (hit) {
      haptic.buy();
      juice.pop();
    } else {
      haptic.denied();
      juice.shake();
    }
    playSfx(hit ? "buy" : "invalid");
    const total = hits + (hit ? 1 : 0);
    if (round + 1 >= ZONES.length) return done(total >= 2);
    setHits(total);
    setRound(round + 1);
  };
  useKeys({ " ": inject, Enter: inject });

  return (
    <Animated.View style={juice.style}>
    <View className="gap-4">
      <Text className="text-center font-number text-base text-ink">
        Shot {round + 1} of {ZONES.length} · {hits} in the vein
      </Text>
      <View className="h-10 justify-center border-2 border-outline bg-[#f3c9a3]" onLayout={(e) => setTrackW(e.nativeEvent.layout.width - 4)}>
        <Animated.View style={[{ position: "absolute", left: 0, height: "100%", width: ZONE_W * trackW, backgroundColor: "rgba(123,92,214,0.35)", alignItems: "center", justifyContent: "center" }, vein]}>
          <View style={{ width: CORE_W * trackW, height: "100%", backgroundColor: "rgba(92,52,184,0.85)" }} />
        </Animated.View>
        {/* Style, not className: NativeWind classes don't apply to Animated.View on native. */}
        <Animated.View style={[{ position: "absolute", height: "100%", width: 10, backgroundColor: palette.ink }, marker]} />
      </View>
      <PixelButton label="INJECT" tone="success" instant onPress={inject} />
      <Text className="text-center font-body text-sm text-ink opacity-70">{note ?? (moving ? "The vein is moving. Hit its dark centre!" : "Stop the needle in the vein's dark centre.")}</Text>
      <KeyHint>SPACE</KeyHint>
    </View>
    </Animated.View>
  );
}

/** A ring that ripples out from the heart on each on-time tap. */
function HeartRipple() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - t.get()), transform: [{ scale: 0.8 + t.get() * 0.8 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 130, height: 130, borderRadius: 65, borderWidth: 5, borderColor: "#4edb4e" }, style]} />;
}

// ---------- Rhythm: tap with the heartbeat, 6-8 on time (steady, speeding up, or with skipped beats) ----------
const BEATS = 10;
type RhythmVariant = "steady" | "speedup" | "skips";
/** Beat times (ms after the start) and which are skipped beats, which mustn't be tapped. */
function planBeats(variant: RhythmVariant, beatMs: number) {
  if (variant === "speedup") {
    // From 20% slower to 25% faster than the level's tempo.
    let t = 0;
    const times = Array.from({ length: BEATS }, (_, k) => {
      if (k > 0) t += beatMs * (1.2 - (0.45 * k) / (BEATS - 1));
      return t;
    });
    return { times, skip: times.map(() => false) };
  }
  if (variant === "skips") {
    // 12 beats, 3 of them skipped (never the first two), so 9 real beats.
    const skipAt = new Set(shuffle(Array.from({ length: 10 }, (_, k) => k + 2)).slice(0, 3));
    return { times: Array.from({ length: 12 }, (_, k) => k * beatMs), skip: Array.from({ length: 12 }, (_, k) => skipAt.has(k)) };
  }
  return { times: Array.from({ length: BEATS }, (_, k) => k * beatMs), skip: Array.from({ length: BEATS }, () => false) };
}
function RhythmGame({ onDone, tuning }: GameProps) {
  // 100 bpm at first, rising with progress; the timing window narrows and more beats are needed.
  const WINDOW_MS = tuning.beatWindowMs;
  const [plan] = useState(() => {
    const variant = pickVariant<RhythmVariant>(tuning.level, [
      { id: "steady", from: 0 },
      { id: "speedup", from: 0.25 },
      { id: "skips", from: 0.45 },
    ]);
    return { variant, ...planBeats(variant, tuning.beatMs) };
  });
  const count = plan.times.length;
  // Skips: one fewer needed (there are 9 real beats instead of 10).
  const NEED_BEATS = tuning.beatsNeeded - (plan.variant === "skips" ? 1 : 0);
  const juice = useJuice();
  const [ripple, setRipple] = useState(0);
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const start = useRef(0);
  const [hitCount, setHitCount] = useState(0);
  const [beat, setBeat] = useState(-1);
  /** Beats tapped on time (each counts once). */
  const hits = useRef<number[]>([]);
  /**
   * Every other tap (off the beat, twice on one beat, or on a skipped beat) takes one away, so mashing
   * can't win. Slips never outnumber hits, so the next on-time tap always counts (no running debt).
   */
  const slips = useRef(0);
  const pulse = useSharedValue(1);
  const score = () => Math.max(0, hits.current.length - slips.current);
  useEffect(() => {
    const s = Date.now() + 1200;
    start.current = s;
    const timers: ReturnType<typeof setTimeout>[] = [];
    plan.times.forEach((at, k) => {
      timers.push(
        setTimeout(() => {
          setBeat(k);
          // A short, steady beat: the heart swells and settles, with no wobble. A skipped beat barely moves.
          const peak = plan.skip[k] ? 1.03 : 1.12;
          pulse.set(withSequence(withTiming(peak, { duration: 70, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 180, easing: Easing.in(Easing.quad) })));
        }, s - Date.now() + at),
      );
    });
    timers.push(setTimeout(() => done(score() >= NEED_BEATS), s - Date.now() + plan.times[count - 1] + tuning.beatMs + 250));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  const press = () => {
    const t = Date.now() - start.current;
    // The nearest beat to this tap.
    let k = 0;
    for (let i = 1; i < count; i++) if (Math.abs(t - plan.times[i]) < Math.abs(t - plan.times[k])) k = i;
    const near = start.current > 0 && Math.abs(t - plan.times[k]) < WINDOW_MS;
    if (near && !plan.skip[k] && !hits.current.includes(k)) {
      hits.current.push(k);
      setHitCount(score());
      haptic.tap();
      playSfx("medkit");
      // The ripple is the "on time" signal; the panel itself stays still.
      setRipple((n) => n + 1);
      return;
    }
    slips.current = Math.min(slips.current + 1, hits.current.length);
    setHitCount(score());
    playSfx("invalid");
    haptic.denied();
    juice.shake();
  };
  useKeys({ " ": press });
  const skipped = beat >= 0 && plan.skip[beat];
  const hint = `${plan.variant === "skips" ? "Tap with the beat, but not when the heart goes grey!" : plan.variant === "speedup" ? "The heart is speeding up. Keep with it!" : "Tap the heart every time it beats."} Extra taps cost you a beat.`;

  return (
    <Animated.View style={juice.style}>
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">
        {beat < 0 ? "Get ready..." : `Beat ${beat + 1} of ${count}`} · {hitCount} on time (need {NEED_BEATS})
      </Text>
      <TapPressable accessibilityRole="button" accessibilityLabel="Tap with the heartbeat" onDown={press} className="h-36 w-36 items-center justify-center">
        {ripple > 0 && <HeartRipple key={ripple} />}
        <Animated.View style={heart}>
          <Image source={require("@/imgs/misc/heart.png")} style={{ width: 120, height: 120, opacity: skipped ? 0.4 : 1 }} contentFit="contain" tintColor={skipped ? "#8a94a3" : undefined} />
        </Animated.View>
      </TapPressable>
      <Text className="text-center font-body text-sm text-ink opacity-70">{hint}</Text>
      <KeyHint>SPACE</KeyHint>
    </View>
    </Animated.View>
  );
}

// ---------- Bandage: tap fast, 25-38 wraps in 5 seconds (or left and right in turn, or follow the arrows) ----------
const WRAP_MS = 5000;
const BANDAGE = require("@/imgs/shop/bandage_roll.png");
type BandageVariant = "fast" | "alternate" | "arrows";
function BandageGame(props: GameProps) {
  const [variant] = useState(() =>
    pickVariant<BandageVariant>(props.tuning.level, [
      { id: "fast", from: 0 },
      { id: "alternate", from: 0.25 },
      { id: "arrows", from: 0.35 },
    ]),
  );
  return variant === "arrows" ? <BandageArrows {...props} /> : <BandageTaps {...props} alternate={variant === "alternate"} />;
}

/** Arrows: wrap the way the arrow points. Each right press is a wrap; a wrong one undoes one. */
const ARROWS = ["up", "right", "down", "left"] as const;
type Arrow = (typeof ARROWS)[number];
/** 7.5 s: the extra half second gives room to read each new arrow. */
const ARROWS_MS = 7500;
function BandageArrows({ onDone, tuning }: GameProps) {
  const WRAPS = Math.round(tuning.wraps * 0.5);
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const juice = useJuice();
  const pick = (not?: Arrow) => {
    const options = ARROWS.filter((a) => a !== not);
    return options[Math.floor(Math.random() * options.length)];
  };
  const [arrow, setArrow] = useState<Arrow>(() => pick());
  const [wraps, setWraps] = useState(0);
  const [left, setLeft] = useState(ARROWS_MS);
  const count = useRef(0);
  const spin = useSharedValue(0);
  const rollStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  useEffect(() => {
    const end = Date.now() + ARROWS_MS;
    const id = setInterval(() => {
      const l = end - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(id);
        done(count.current >= WRAPS);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);
  const press = (a: Arrow) => {
    if (left <= 0) return;
    if (a !== arrow) {
      count.current = Math.max(0, count.current - 1);
      setWraps(count.current);
      haptic.denied();
      playSfx("invalid");
      juice.shake();
      return;
    }
    count.current += 1;
    spin.set(withTiming(count.current * 90, { duration: 120 }));
    setWraps(count.current);
    setArrow(pick(arrow));
    haptic.tap();
    playSfx("click");
    if (count.current >= WRAPS) done(true);
  };
  useKeys({ ArrowUp: () => press("up"), ArrowRight: () => press("right"), ArrowDown: () => press("down"), ArrowLeft: () => press("left"), w: () => press("up"), d: () => press("right"), s: () => press("down"), a: () => press("left") });
  const pad = (a: Arrow) => (
    <TapPressable key={a} accessibilityRole="button" accessibilityLabel={`Wrap ${a}`} onDown={() => press(a)} className="h-14 w-14 items-center justify-center border-2 border-outline bg-accent active:scale-95">
      <PixelIcon name={a} size={22} />
    </TapPressable>
  );
  return (
    <Animated.View style={juice.style}>
      <View className="items-center gap-3">
        <Text className="font-number text-base text-ink">
          {(left / 1000).toFixed(1)}s · {wraps} / {WRAPS} wraps
        </Text>
        <View className="h-4 w-full border-2 border-outline bg-surface">
          <View className="h-full bg-success" style={{ width: `${Math.min(1, wraps / WRAPS) * 100}%` }} />
        </View>
        <View className="flex-row items-center gap-4">
          <View className="items-center">
            <Animated.View style={rollStyle}>
              <Image source={BANDAGE} style={{ width: 56, height: 56 }} contentFit="contain" />
            </Animated.View>
            {/* The arrow to press now. */}
            <View className="mt-1 h-14 w-14 items-center justify-center border-2 border-outline bg-primary">
              <PixelIcon name={arrow} size={28} />
            </View>
          </View>
          {/* A d-pad: up on top, left / right in the middle, down below. */}
          <View className="items-center gap-1">
            {pad("up")}
            <View className="flex-row gap-1">
              {pad("left")}
              <View className="h-14 w-14" />
              {pad("right")}
            </View>
            {pad("down")}
          </View>
        </View>
        <Text className="text-center font-body text-sm text-ink opacity-70">Press the arrow shown. A wrong one unwinds a wrap!</Text>
        <KeyHint>ARROW KEYS OR W A S D</KeyHint>
      </View>
    </Animated.View>
  );
}

function BandageTaps({ onDone, tuning, alternate }: GameProps & { alternate: boolean }) {
  const WRAPS = alternate ? Math.round(tuning.wraps * 0.8) : tuning.wraps;
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [wraps, setWraps] = useState(0);
  const [left, setLeft] = useState(WRAP_MS);
  /** The side to tap next in the alternate variant (-1: either). */
  const [nextSide, setNextSide] = useState(-1);
  const count = useRef(0);
  const lastSide = useRef(-1);
  const spin = useSharedValue(0);
  const rollStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  useEffect(() => {
    const end = Date.now() + WRAP_MS;
    const id = setInterval(() => {
      const l = end - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(id);
        done(count.current >= WRAPS);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);
  const wrap = (side: number) => {
    if (left <= 0) return;
    if (alternate && side === lastSide.current) return haptic.denied();
    lastSide.current = side;
    if (alternate) setNextSide(1 - side);
    count.current += 1;
    spin.set(withTiming(count.current * 90, { duration: 120 }));
    setWraps(count.current);
    haptic.tap();
    if (count.current % 3 === 0) playSfx("click");
    if (count.current >= WRAPS) done(true);
  };
  useKeys(alternate ? { ArrowLeft: () => wrap(0), ArrowRight: () => wrap(1), a: () => wrap(0), d: () => wrap(1) } : { " ": () => wrap(0) });
  const roll = (size: number) => (
    <Animated.View style={rollStyle}>
      <Image source={BANDAGE} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
  const side = (s: number) => (
    <TapPressable
      accessibilityRole="button"
      accessibilityLabel={s === 0 ? "Wrap from the left" : "Wrap from the right"}
      onDown={() => wrap(s)}
      className={`h-28 w-20 items-center justify-center border-2 border-outline ${nextSide === -1 || nextSide === s ? "bg-accent" : "bg-surface opacity-60"} active:scale-95`}
    >
      <Text className="font-pixel text-2xl text-ink">{s === 0 ? "<" : ">"}</Text>
    </TapPressable>
  );
  return (
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">
        {(left / 1000).toFixed(1)}s · {wraps} / {WRAPS} wraps
      </Text>
      <View className="h-4 w-full border-2 border-outline bg-surface">
        <View className="h-full bg-success" style={{ width: `${Math.min(1, wraps / WRAPS) * 100}%` }} />
      </View>
      {alternate ? (
        <View className="flex-row items-center gap-2">
          {side(0)}
          {roll(72)}
          {side(1)}
        </View>
      ) : (
        <TapPressable accessibilityRole="button" accessibilityLabel="Wrap the bandage" onDown={() => wrap(0)} className="h-32 w-32 items-center justify-center border-2 border-outline bg-accent active:scale-95">
          {roll(96)}
        </TapPressable>
      )}
      <Text className="text-center font-body text-sm text-ink opacity-70">{alternate ? "Tap left, right, left, right... as fast as you can!" : "Tap as fast as you can!"}</Text>
      <KeyHint>{alternate ? "← → OR A D" : "SPACE"}</KeyHint>
    </View>
  );
}

const GAMES = { injection: InjectionGame, rhythm: RhythmGame, bandage: BandageGame, ...MORE_GAMES, ...NEW_GAMES };

/** Treating a ward patient: intro, the patient's minigame, then the result. */
/** `arrivedAt` is the waiting patient being treated; leave it out to just play (Dev Tools). */
export function TreatModal({ patient, arrivedAt, onClose }: { patient: SickPatient; arrivedAt?: number; onClose: () => void }) {
  const { theme } = useSettings();
  // Read on demand, not subscribed: the game shouldn't re-render with every tick while it's played.
  const store = useGameStore();
  const { dispatch, setFocusMode } = useGameActions();
  const [phase, setPhase] = useState<"intro" | "play" | "result">("intro");
  // The game behind the modal slows its updates while a minigame is played, so taps land on time.
  useEffect(() => {
    setFocusMode(phase === "play");
    return () => setFocusMode(false);
  }, [phase, setFocusMode]);
  const [result, setResult] = useState<{ won: boolean; amount: number; coins: number } | null>(null);
  const Game = GAMES[patient.game];
  // Fixed for the whole game, so treating this patient doesn't change the rules mid-play. Harder as
  // more patients are treated and healing per second grows.
  const [tuning] = useState(() => minigameTuning(wardLevel(store.get())));

  const finish = (won: boolean, perfect?: boolean) => {
    // Worked out before the treat action, which counts the patient and so could raise the level.
    const s = store.get();
    const amount = treatReward(s, won);
    const coins = won ? treatCoins(s) : 0;
    if (arrivedAt !== undefined) dispatch({ type: "treat", won, arrivedAt });
    dispatch(won ? { type: "minigameWon", game: patient.game, perfect } : { type: "minigameLost" });
    setResult({ won, amount, coins });
    setPhase("result");
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      {/* Modals render outside the themed root, so re-apply the theme variables. */}
      <View style={themeVars[theme]} className="flex-1 items-center justify-center p-6">
        <View className="absolute inset-0 bg-black/60" />
        <HardShadow offset={6} className="w-full max-w-sm">
          <View accessibilityViewIsModal className="gap-4 border-2 border-outline bg-surface p-5">
            <View className="flex-row items-center gap-3">
              <Image source={patientLook(patient, arrivedAt)} style={{ width: 64, height: 64 }} contentFit="contain" />
              <View className="flex-1">
                <Text className="font-pixel text-xs tracking-[2px] text-primary">PATIENT</Text>
                <Text accessibilityRole="header" className="font-display text-xl text-ink">
                  {patient.condition}
                </Text>
              </View>
            </View>
            {phase === "intro" && (
              <>
                <Text className="font-body text-base leading-6 text-ink">{patient.intro}</Text>
                <View className="flex-row gap-3">
                  <PixelButton label="Later" onPress={onClose} className="flex-1" />
                  <PixelButton label="Treat" tone="success" onPress={() => setPhase("play")} className="flex-1" />
                </View>
              </>
            )}
            {phase === "play" && <Game onDone={finish} tuning={tuning} />}
            {phase === "result" && result && (
              <>
                <Text className="font-display text-lg text-ink">{result.won ? "Patient stabilized!" : "Transferred to another ward"}</Text>
                <Text className="font-body text-base leading-6 text-ink">
                  {result.won ? `Great work. You earned ${formatCount(result.amount)} medkits.` : `They'll be fine. You still earned ${formatCount(result.amount)} medkits.`}
                </Text>
                {result.won && (
                  <View className="gap-1.5">
                    <View className="flex-row items-center gap-2">
                      <Image source={COIN.image} style={{ width: 20, height: 20 }} contentFit="contain" />
                      <Text className="font-number text-base text-ink">
                        +{result.coins} Care {result.coins === 1 ? "Coin" : "Coins"}
                      </Text>
                    </View>
                    {tuning.rewardMult > 1.005 && (
                      <Text className="font-body text-sm text-ink opacity-70">Difficulty bonus: {formatMult(tuning.rewardMult)} medkits</Text>
                    )}
                  </View>
                )}
                <PixelButton label="Done" tone="success" onPress={onClose} />
              </>
            )}
          </View>
        </HardShadow>
      </View>
    </Modal>
  );
}

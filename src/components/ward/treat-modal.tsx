import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { MORE_GAMES } from "@/components/ward/more-games";
import { useDone, useJuice, type GameProps } from "@/components/ward/game-kit";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { COIN } from "@/constants/boosts";
import { WIN_COINS, minigameTuning, nextPatientDelay, type SickPatient } from "@/constants/patients";
import { themeVars } from "@/constants/theme";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameState, useSettings } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { usePalette } from "@/hooks/use-palette";
import { formatCount } from "@/lib/format";
import { treatReward } from "@/lib/game";

// ---------- Injection: stop the sliding needle inside the vein, 2 of 3 ----------
const ZONES = [0.55, 0.22, 0.64];
function InjectionGame({ onDone, tuning }: GameProps) {
  const ZONE_W = tuning.veinWidth;
  const palette = usePalette();
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [trackW, setTrackW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    x.set(0);
    x.set(withRepeat(withTiming(1, { duration: (1100 - round * 220) / tuning.needleSpeed, easing: Easing.linear }), -1, true));
  }, [round, x, tuning.needleSpeed]);
  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * Math.max(0, trackW - 10) }] }));
  const zone = ZONES[round];
  const juice = useJuice();

  const inject = () => {
    const v = x.get();
    const hit = v >= zone && v <= zone + ZONE_W;
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

  return (
    <Animated.View style={juice.style}>
    <View className="gap-4">
      <Text className="text-center font-number text-base text-ink">
        Shot {round + 1} of {ZONES.length} · {hits} in the vein
      </Text>
      <View className="h-10 justify-center border-2 border-outline bg-[#f3c9a3]" onLayout={(e) => setTrackW(e.nativeEvent.layout.width - 4)}>
        <View className="absolute h-full bg-[#7b5cd6]/60" style={{ left: `${zone * 100}%`, width: `${ZONE_W * 100}%` }} />
        {/* Style, not className: NativeWind classes don't apply to Animated.View on native. */}
        <Animated.View style={[{ position: "absolute", height: "100%", width: 10, backgroundColor: palette.ink }, marker]} />
      </View>
      <PixelButton label="INJECT" tone="success" onPress={inject} />
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

// ---------- Rhythm: tap with the heartbeat, 6 of 10 on time ----------
const BEATS = 10;
const NEED_BEATS = 6;
function RhythmGame({ onDone, tuning }: GameProps) {
  // 100 bpm at first, up to 110 (the CPR rate); a forgiving timing window.
  const BEAT_MS = tuning.beatMs;
  const WINDOW_MS = tuning.beatWindowMs;
  const juice = useJuice();
  const [ripple, setRipple] = useState(0);
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const start = useRef(0);
  const [hitCount, setHitCount] = useState(0);
  const [beat, setBeat] = useState(-1);
  const hits = useRef<number[]>([]);
  const pulse = useSharedValue(1);
  useEffect(() => {
    const s = Date.now() + 1200;
    start.current = s;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 0; k < BEATS; k++) {
      timers.push(
        setTimeout(() => {
          setBeat(k);
          pulse.set(withSequence(withTiming(1.25, { duration: 80 }), withTiming(1, { duration: 260 })));
        }, s - Date.now() + k * BEAT_MS),
      );
    }
    timers.push(setTimeout(() => done(hits.current.length >= NEED_BEATS), s - Date.now() + BEATS * BEAT_MS + 250));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per game
  }, []);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  const press = () => {
    const t = Date.now();
    const s = start.current;
    const k = Math.round((t - s) / BEAT_MS);
    const onTime = s > 0 && k >= 0 && k < BEATS && Math.abs(t - (s + k * BEAT_MS)) < WINDOW_MS && !hits.current.includes(k);
    if (onTime) {
      hits.current.push(k);
      setHitCount(hits.current.length);
      haptic.tap();
      playSfx("medkit");
      juice.pop();
      setRipple((n) => n + 1);
    } else {
      haptic.denied();
      juice.shake();
    }
  };

  return (
    <Animated.View style={juice.style}>
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">
        {beat < 0 ? "Get ready..." : `Beat ${beat + 1} of ${BEATS}`} · {hitCount} on time (need {NEED_BEATS})
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tap with the heartbeat" onPress={press} className="h-36 w-36 items-center justify-center">
        {ripple > 0 && <HeartRipple key={ripple} />}
        <Animated.View style={heart}>
          <Image source={require("@/imgs/misc/heart.png")} style={{ width: 120, height: 120 }} contentFit="contain" />
        </Animated.View>
      </Pressable>
      <Text className="font-body text-sm text-ink opacity-70">Tap the heart every time it beats.</Text>
    </View>
    </Animated.View>
  );
}

// ---------- Bandage: tap fast, 25-30 wraps in 5 seconds ----------
const WRAP_MS = 5000;
function BandageGame({ onDone, tuning }: GameProps) {
  const WRAPS = tuning.wraps;
  const done = useDone(onDone);
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const [wraps, setWraps] = useState(0);
  const [left, setLeft] = useState(WRAP_MS);
  const count = useRef(0);
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
  const wrap = () => {
    if (left <= 0) return;
    count.current += 1;
    spin.set(withTiming(count.current * 90, { duration: 120 }));
    setWraps(count.current);
    haptic.tap();
    if (count.current % 3 === 0) playSfx("click");
    if (count.current >= WRAPS) done(true);
  };
  return (
    <View className="items-center gap-3">
      <Text className="font-number text-base text-ink">
        {(left / 1000).toFixed(1)}s · {wraps} / {WRAPS} wraps
      </Text>
      <View className="h-4 w-full border-2 border-outline bg-surface">
        <View className="h-full bg-success" style={{ width: `${Math.min(1, wraps / WRAPS) * 100}%` }} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Wrap the bandage" onPress={wrap} className="h-32 w-32 items-center justify-center border-2 border-outline bg-accent active:scale-95">
        <Animated.View style={rollStyle}>
          <Image source={require("@/imgs/shop/bandage_roll.png")} style={{ width: 96, height: 96 }} contentFit="contain" />
        </Animated.View>
      </Pressable>
      <Text className="font-body text-sm text-ink opacity-70">Tap as fast as you can!</Text>
    </View>
  );
}

const GAMES = { injection: InjectionGame, rhythm: RhythmGame, bandage: BandageGame, ...MORE_GAMES };

/** Treating a ward patient: intro, the patient's minigame, then the result. */
export function TreatModal({ patient, onClose }: { patient: SickPatient; onClose: () => void }) {
  const { theme } = useSettings();
  const state = useGameState();
  const { dispatch } = useGameActions();
  const [phase, setPhase] = useState<"intro" | "play" | "result">("intro");
  const [result, setResult] = useState<{ won: boolean; amount: number } | null>(null);
  const Game = GAMES[patient.game];
  // Fixed for the whole game, so treating this patient doesn't change the rules mid-play.
  const [tuning] = useState(() => minigameTuning(state.treated));

  const finish = (won: boolean) => {
    const amount = treatReward(state, won);
    dispatch({ type: "treat", won, next: Date.now() + nextPatientDelay() });
    if (won) dispatch({ type: "minigameWon", game: patient.game });
    setResult({ won, amount });
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
              <Image source={patient.image} style={{ width: 64, height: 64 }} contentFit="contain" />
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
                  {result.won ? `Great work. You healed ${formatCount(result.amount)} patients` : `They'll be fine. You still healed ${formatCount(result.amount)} patients.`}
                </Text>
                {result.won && (
                  <View className="flex-row items-center gap-2">
                    <Image source={COIN.image} style={{ width: 20, height: 20 }} contentFit="contain" />
                    <Text className="font-number text-base text-ink">
                      +{WIN_COINS} Care {WIN_COINS === 1 ? "Coin" : "Coins"}
                    </Text>
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

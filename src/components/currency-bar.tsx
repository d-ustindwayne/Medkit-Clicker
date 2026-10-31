import { memo, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { Image } from "@/components/ui/image";

import { COIN } from "@/constants/boosts";
import { gemBalance } from "@/constants/gems";
import { MEDKIT_IMAGE } from "@/constants/items";
import { GEM } from "@/constants/rebirth";
import { useGameSelector, useGameStore, useSettings } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { formatCount, formatShort } from "@/lib/format";
import { coinBalance } from "@/lib/game";

/** Tablets and computers get chips half as big again, so they don't look tiny on a large screen. */
const WIDE = 768;

type Currency = "medkits" | "coins" | "gems";
/** Numbers on screen at once per currency ("Every one"); later ones reuse the oldest. */
const SLOTS = 3;
/** Combined numbers: spends closer together than this add to the same total. */
const COMBO_MS = 900;
/** The pop up, then the fall. */
const POP_MS = 110;
const FALL_MS = 520;

type SlotHandle = { fire: (text: string) => void };
type Spender = { spent: (n: number) => void };

/**
 * One "-N" beside a chip: it pops up and swells a little, then drops away under gravity, tipping
 * as it goes, and fades. It stays mounted and is reused, so spending never adds or removes views.
 */
const SpendSlot = memo(function SpendSlot({ ref, big }: { ref: Ref<SlotHandle>; big: boolean }) {
  const palette = usePalette();
  const [shot, setShot] = useState({ n: 0, text: "" });
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const o = useSharedValue(0);
  const s = useSharedValue(1);
  const r = useSharedValue(0);
  useImperativeHandle(ref, () => ({ fire: (text) => setShot((p) => ({ n: p.n + 1, text })) }), []);
  // Started once the new text is on screen, so the old one never flashes.
  useEffect(() => {
    if (!shot.n) return;
    const tip = shot.n % 2 ? 1 : -1;
    y.set(withSequence(withTiming(-9, { duration: POP_MS, easing: Easing.out(Easing.quad) }), withTiming(30, { duration: FALL_MS, easing: Easing.in(Easing.quad) })));
    x.set(withSequence(withTiming(0, { duration: 0 }), withDelay(POP_MS, withTiming(-5 - 4 * Math.random(), { duration: FALL_MS, easing: Easing.out(Easing.quad) }))));
    r.set(withSequence(withTiming(0, { duration: 0 }), withDelay(POP_MS, withTiming(tip * 12, { duration: FALL_MS, easing: Easing.in(Easing.quad) }))));
    s.set(withSequence(withTiming(1.3, { duration: 0 }), withSpring(1, { damping: 10, stiffness: 420 })));
    o.set(withSequence(withTiming(1, { duration: 0 }), withDelay(POP_MS + FALL_MS * 0.45, withTiming(0, { duration: FALL_MS * 0.55 }))));
  }, [shot, y, x, r, s, o]);
  const style = useAnimatedStyle(() => ({
    opacity: o.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${r.get()}deg` }, { scale: s.get() }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", right: "100%", top: 0, marginRight: 6 }, style]}>
      <Text
        numberOfLines={1}
        className={`font-display text-danger ${big ? "text-lg" : "text-sm"}`}
        style={{ textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0.1 }}
      >
        {shot.text}
      </Text>
    </Animated.View>
  );
});

/** The numbers beside one chip, following the Floating numbers setting. */
function SpendNumbers({ ref, big, format }: { ref: Ref<Spender>; big: boolean; format: (n: number) => string }) {
  const { numbers } = useSettings();
  const slots = useRef<(SlotHandle | null)[]>([]);
  const next = useRef(0);
  const combo = useRef({ total: 0, at: 0 });
  useImperativeHandle(
    ref,
    () => ({
      spent: (n) => {
        if (numbers === "off") return;
        if (numbers === "combined") {
          const now = Date.now(), c = combo.current;
          c.total = now - c.at < COMBO_MS ? c.total + n : n;
          c.at = now;
          slots.current[0]?.fire(`-${format(c.total)}`);
          return;
        }
        slots.current[next.current++ % SLOTS]?.fire(`-${format(n)}`);
      },
    }),
    [numbers, format],
  );
  if (numbers === "off") return null;
  return Array.from({ length: numbers === "combined" ? 1 : SLOTS }, (_, i) => (
    <SpendSlot
      key={i}
      big={big}
      ref={(h) => {
        slots.current[i] = h;
      }}
    />
  ));
}

/**
 * Tells each chip what was just spent. Cheap on every game tick: only the spent counters and the
 * medkits are compared. A medkit drop at a rebirth (which empties them on purpose) isn't a purchase.
 */
function useSpendWatch(chips: Record<Currency, Spender | null>) {
  const store = useGameStore();
  useEffect(() => {
    let prev = store.get();
    return store.subscribe(() => {
      const s = store.get();
      const was = prev;
      prev = s;
      if (s === was || s.rebirths !== was.rebirths) return;
      if (s.healed < was.healed) chips.medkits?.spent(was.healed - s.healed);
      if (s.coinsSpent > was.coinsSpent) chips.coins?.spent(s.coinsSpent - was.coinsSpent);
      const gems = (s.gemsSpent ?? 0) - (was.gemsSpent ?? 0);
      if (gems > 0) chips.gems?.spent(gems);
    });
  }, [store, chips]);
}

function Chip({ image, value, label, big, spender, format }: { image: number; value: string; label: string; big: boolean; spender: Ref<Spender>; format: (n: number) => string }) {
  const icon = big ? 24 : 16;
  return (
    <View accessibilityLabel={label} className={`flex-row items-center self-end rounded-full border-[1.5px] border-outline bg-surface/90 ${big ? "gap-1.5 py-1 pl-1.5 pr-3" : "gap-1 py-0.5 pl-1 pr-2"}`}>
      <Image source={image} style={{ width: icon, height: icon }} contentFit="contain" />
      <Text className={`font-number text-ink ${big ? "text-lg" : "text-xs"}`}>{value}</Text>
      <SpendNumbers ref={spender} big={big} format={format} />
    </View>
  );
}

/** The three currencies, stacked at the top-right: patients (medkits), Care Coins and Natal Gems. */
export function CurrencyBar() {
  // Patients use short units (1.23K, 4.5M, 6.78T) to keep the chip narrow; the text only changes when
  // the short form does, so the chips don't redraw on every tick. Care Coins and Natal Gems are
  // counted one by one, so they show the exact amount (1,234).
  const state = useGameSelector((s) => ({ healed: formatShort(s.healed), coins: coinBalance(s), gems: gemBalance(s) }));
  const coins = state.coins;
  const big = useWindowDimensions().width >= WIDE;
  // Each chip's numbers, filled in by their refs (a plain object made once, read only when spending).
  const [chips] = useState<Record<Currency, Spender | null>>(() => ({ medkits: null, coins: null, gems: null }));
  useSpendWatch(chips);
  const [setters] = useState(() => {
    const set = (c: Currency) => (h: Spender | null) => {
      chips[c] = h;
    };
    return { medkits: set("medkits"), coins: set("coins"), gems: set("gems") };
  });
  return (
    <View className={big ? "gap-1.5" : "gap-1"} pointerEvents="none">
      <Chip big={big} image={MEDKIT_IMAGE as number} value={state.healed} label={`${state.healed} medkits`} spender={setters.medkits} format={formatShort} />
      <Chip big={big} image={COIN.image as number} value={formatCount(coins)} label={`${coins} ${COIN.name}`} spender={setters.coins} format={formatCount} />
      <Chip big={big} image={GEM.image as number} value={formatCount(state.gems)} label={`${state.gems} ${GEM.name}`} spender={setters.gems} format={formatCount} />
    </View>
  );
}

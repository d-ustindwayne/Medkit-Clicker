import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Image } from "@/components/ui/image";

import { COIN } from "@/constants/boosts";
import { gemBalance } from "@/constants/gems";
import { MEDKIT_IMAGE } from "@/constants/items";
import { GEM } from "@/constants/rebirth";
import { useGameSelector, useGameStore } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { formatCount, formatShort } from "@/lib/format";
import { coinBalance } from "@/lib/game";

/** Tablets and computers get chips half as big again, so they don't look tiny on a large screen. */
const WIDE = 768;

type Currency = "medkits" | "coins" | "gems";
type Drop = { id: number; text: string };
const DROP_MS = 1000;

/** "-N" falling away beside a chip when that currency is spent, like the "+N" on a tap. */
function SpendDrop({ text, big }: { text: string; big: boolean }) {
  const palette = usePalette();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: DROP_MS, easing: Easing.in(Easing.quad) }));
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() < 0.45 ? 1 : 1 - (t.get() - 0.45) / 0.55,
    transform: [{ translateY: 34 * t.get() }, { rotate: `${-8 * t.get()}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", right: "100%", top: 0, marginRight: 6 }, style]}>
      <Text
        numberOfLines={1}
        className={`font-display text-danger ${big ? "text-lg" : "text-sm"}`}
        style={{ textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0.1 }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * Watches the balances and returns what was just spent of each. A drop that isn't a rebirth (which
 * empties the medkits on purpose) is a purchase.
 */
function useSpends() {
  const store = useGameStore();
  const [drops, setDrops] = useState<Record<Currency, Drop[]>>({ medkits: [], coins: [], gems: [] });
  useEffect(() => {
    const read = () => {
      const s = store.get();
      return { medkits: s.healed, coins: coinBalance(s), gems: gemBalance(s), rebirths: s.rebirths };
    };
    let prev = read();
    let next = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const unsubscribe = store.subscribe(() => {
      const now = read();
      const was = prev;
      prev = now;
      if (now.rebirths !== was.rebirths) return;
      for (const c of ["medkits", "coins", "gems"] as const) {
        const spent = was[c] - now[c];
        if (!(spent > 0)) continue;
        const drop = { id: next++, text: `-${c === "medkits" ? formatShort(spent) : formatCount(spent)}` };
        setDrops((d) => ({ ...d, [c]: [...d[c].slice(-3), drop] }));
        const timer = setTimeout(() => {
          timers.delete(timer);
          setDrops((d) => ({ ...d, [c]: d[c].filter((x) => x.id !== drop.id) }));
        }, DROP_MS);
        timers.add(timer);
      }
    });
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [store]);
  return drops;
}

function Chip({ image, value, label, big, drops }: { image: number; value: string; label: string; big: boolean; drops: Drop[] }) {
  const icon = big ? 24 : 16;
  return (
    <View accessibilityLabel={label} className={`flex-row items-center self-end rounded-full border-[1.5px] border-outline bg-surface/90 ${big ? "gap-1.5 py-1 pl-1.5 pr-3" : "gap-1 py-0.5 pl-1 pr-2"}`}>
      <Image source={image} style={{ width: icon, height: icon }} contentFit="contain" />
      <Text className={`font-number text-ink ${big ? "text-lg" : "text-xs"}`}>{value}</Text>
      {drops.map((d) => (
        <SpendDrop key={d.id} text={d.text} big={big} />
      ))}
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
  const drops = useSpends();
  return (
    <View className={big ? "gap-1.5" : "gap-1"} pointerEvents="none">
      <Chip big={big} image={MEDKIT_IMAGE as number} value={state.healed} label={`${state.healed} medkits`} drops={drops.medkits} />
      <Chip big={big} image={COIN.image as number} value={formatCount(coins)} label={`${coins} ${COIN.name}`} drops={drops.coins} />
      <Chip big={big} image={GEM.image as number} value={formatCount(state.gems)} label={`${state.gems} ${GEM.name}`} drops={drops.gems} />
    </View>
  );
}

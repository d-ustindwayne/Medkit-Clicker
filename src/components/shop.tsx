import { memo, useEffect, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { BOOSTS, COIN, type Boost } from "@/constants/boosts";
import { MEDKIT_IMAGE, MILESTONE_EVERY, SHOP_ITEMS, itemCost, itemMultiplier, type ShopItem } from "@/constants/items";
import { HOSPITAL_SCENE } from "@/constants/scenes";
import { Shine } from "@/components/fx/shine";
import { GemShop } from "@/components/hospital/gem-shop";
import { HospitalPage } from "@/components/hospital/hospital-page";
import { HardShadow } from "@/components/ui/hard-shadow";
import { Pager } from "@/components/ui/pager";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { useNow } from "@/hooks/use-now";
import { usePalette } from "@/hooks/use-palette";
import { formatCount, formatRate } from "@/lib/format";
import { bulkCost, coinBalance, priceOf } from "@/lib/game";

type CardProps = {
  item: ShopItem;
  owned: number;
  cost: number;
  affordable: boolean;
  /** 0-1 towards affording the next one, in 2% steps so cards don't re-render every tick. */
  progress: number;
  /** Not yet affordable and never bought: shown as a silhouette. */
  hidden: boolean;
  /** How many one tap buys (x1 / x10 / x100). */
  qty: number;
};

const ShopCard = memo(function ShopCard({ item, owned, cost, affordable, progress, hidden, qty }: CardProps) {
  const { dispatch } = useGameActions();
  const { playSfx, unlock } = useAudio();
  const haptic = useHaptics();
  const palette = usePalette();
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }, { translateX: shake.get() }] }));

  return (
    <Animated.View style={[{ marginBottom: 10 }, style]}>
      <HardShadow offset={5}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hidden ? "Unknown item" : `Buy ${qty > 1 ? `${qty} ` : ""}${item.name} for ${formatCount(cost)}. You own ${owned}.`}
        accessibilityState={{ disabled: !affordable }}
        onPress={() => {
          unlock();
          if (!affordable) {
            shake.set(withSequence(withTiming(-6, { duration: 40 }), withTiming(6, { duration: 60 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 40 })));
            haptic.denied();
            return playSfx("invalid");
          }
          dispatch({ type: "buy", item: item.id, count: qty });
          playSfx("buy");
          haptic.buy();
          scale.set(withSequence(withTiming(1.05, { duration: 70 }), withSpring(1, { damping: 8, stiffness: 300 })));
        }}
        className={`overflow-hidden border-[3px] border-outline bg-surface active:translate-x-0.5 active:translate-y-0.5 ${affordable ? "" : "opacity-80"}`}
      >
        <View className="flex-row items-center gap-3 px-3 py-2">
          <Image
            source={item.image}
            style={{ width: 48, height: 48, opacity: hidden ? 0.45 : 1 }}
            contentFit="contain"
            tintColor={hidden ? palette.ink : undefined}
          />
          <View className="flex-1">
            <Text className="font-pixel text-base tracking-[3px] text-ink" numberOfLines={1}>
              {hidden ? "???" : item.name.toUpperCase()}
            </Text>
            <View className="flex-row items-center gap-1">
              <Image source={MEDKIT_IMAGE} style={{ width: 16, height: 16 }} contentFit="contain" />
              <Text className="font-number text-base leading-5 text-ink">{formatCount(cost)}{qty > 1 ? ` for ${qty}` : ""}</Text>
            </View>
            {!hidden && (
              <Text className="font-body text-xs text-ink opacity-70">
                +{formatRate(item.rate * itemMultiplier(owned))} per second each
                {` · x${itemMultiplier(owned + MILESTONE_EVERY - (owned % MILESTONE_EVERY))} at ${owned + MILESTONE_EVERY - (owned % MILESTONE_EVERY)}`}
              </Text>
            )}
          </View>
          <Text className="self-end font-number text-2xl leading-7 text-ink" accessibilityLabel={`${owned} owned`}>
            {owned}
          </Text>
        </View>
        {!hidden && (
          <View className="h-1.5 bg-ink/10">
            <View className={`h-full ${affordable ? "bg-success" : "bg-primary"}`} style={{ width: `${progress * 100}%` }} />
          </View>
        )}
        {affordable && <Shine />}
      </Pressable>
      </HardShadow>
    </Animated.View>
  );
});

// Pages you can swipe to in the shop panel: the shop, the outside of the hospital, then the Gem Shop.
const SHOP_PAGES = [
  { id: "supplies", title: "SHOP", label: "Supplies" },
  { id: HOSPITAL_SCENE.id, title: HOSPITAL_SCENE.title.toUpperCase(), label: HOSPITAL_SCENE.title },
  { id: "gems", title: "GEMS", label: "Gem Shop" },
];

function SuppliesList({ qty }: { qty: number }) {
  const state = useGameState();
  const { healed, totalHealed, owned } = state;
  return (
    <>
      {SHOP_ITEMS.map((item) => {
        const cost = qty === 1 ? priceOf(state, item) : bulkCost(state, item, qty);
        return (
          <ShopCard
            qty={qty}
            key={item.id}
            item={item}
            owned={owned[item.id]}
            cost={cost}
            affordable={healed >= cost}
            progress={Math.min(1, Math.floor((healed / cost) * 50) / 50)}
            hidden={owned[item.id] === 0 && totalHealed < itemCost(item, owned[item.id]) * 0.5}
          />
        );
      })}
    </>
  );
}

const formatLeft = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
};

/** A boost bought with Care Coins. Memoized; `activeMs` only changes while the boost runs. */
const BoostCard = memo(function BoostCard({ boost, affordable, activeMs }: { boost: Boost; affordable: boolean; activeMs: number }) {
  const { dispatch } = useGameActions();
  const { playSfx, unlock } = useAudio();
  const haptic = useHaptics();
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }, { translateX: shake.get() }] }));
  return (
    <Animated.View style={[{ marginBottom: 10 }, style]}>
      <HardShadow offset={5}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${boost.name}: ${boost.description} Costs ${boost.cost} Care Coins.`}
          accessibilityState={{ disabled: !affordable }}
          onPress={() => {
            unlock();
            if (!affordable) {
              shake.set(withSequence(withTiming(-6, { duration: 40 }), withTiming(6, { duration: 60 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 40 })));
              haptic.denied();
              return playSfx("invalid");
            }
            dispatch({ type: "useBoost", id: boost.id });
            playSfx("buy");
            haptic.success();
            scale.set(withSequence(withTiming(1.05, { duration: 70 }), withSpring(1, { damping: 8, stiffness: 300 })));
          }}
          className={`overflow-hidden border-[3px] border-outline bg-surface active:translate-x-0.5 active:translate-y-0.5 ${affordable ? "" : "opacity-80"}`}
        >
          <View className="flex-row items-center gap-3 px-3 py-2">
            <Image source={boost.image} style={{ width: 40, height: 40 }} contentFit="contain" />
            <View className="flex-1">
              <Text className="font-pixel text-sm tracking-[2px] text-ink" numberOfLines={1}>
                {boost.name.toUpperCase()}
              </Text>
              <Text className="font-body text-xs leading-4 text-ink opacity-80">{boost.description}</Text>
            </View>
            <View className="items-end gap-1">
              <View className="flex-row items-center gap-1">
                <Image source={COIN.image} style={{ width: 16, height: 16 }} contentFit="contain" />
                <Text className="font-number text-lg leading-5 text-ink">{boost.cost}</Text>
              </View>
              {activeMs > 0 && (
                <View className="rounded-full bg-success px-2">
                  <Text className="font-number text-xs text-ink">{formatLeft(activeMs)}</Text>
                </View>
              )}
            </View>
          </View>
          {affordable && <Shine />}
        </Pressable>
      </HardShadow>
    </Animated.View>
  );
});

function BoostsList() {
  const state = useGameState();
  const coins = coinBalance(state);
  const now = useNow();
  return (
    <>
      <View className="mb-3 flex-row items-center justify-between border-2 border-outline bg-accent px-3 py-2">
        <View className="flex-row items-center gap-2">
          <Image source={COIN.image} style={{ width: 24, height: 24 }} contentFit="contain" />
          <Text className="font-number text-xl text-ink">{coins}</Text>
          <Text className="font-body text-sm text-ink">{COIN.name}</Text>
        </View>
        <Text className="flex-1 pl-3 text-right font-body text-xs text-ink opacity-70">Earn them from achievements</Text>
      </View>
      {BOOSTS.map((b) => {
        const left = b.effect.kind === "timed" ? Math.max(0, (state.boosts[b.id] ?? 0) - now) : 0;
        // Round to whole seconds so cards only re-render once a second while active.
        return <BoostCard key={b.id} boost={b} affordable={coins >= b.cost} activeMs={Math.ceil(left / 1000) * 1000} />;
      })}
    </>
  );
}

/** The shop page: a Supplies / Boosts switch above the list. */
function ShopPage() {
  const [tab, setTab] = useState<"supplies" | "boosts">("supplies");
  const [qty, setQty] = useState(1);
  // The x1 / x10 / x100 box slides shut on the Boosts tab and the tabs stretch into its space.
  const [qtyW, setQtyW] = useState(0);
  const open = useSharedValue(1);
  useEffect(() => {
    open.set(withTiming(tab === "supplies" ? 1 : 0, { duration: 220 }));
  }, [tab, open]);
  const qtyStyle = useAnimatedStyle(() => ({ width: qtyW ? qtyW * open.get() : undefined, opacity: open.get(), marginLeft: -8 * (1 - open.get()) }));
  const { playSfx } = useAudio();
  return (
    <View className="flex-1">
      {/* The Supplies / Boosts switch stays put while the list scrolls; x1 / x10 / x100 sits on its right. */}
      <View className="mx-4 mb-2 flex-row gap-2">
      {/* The tabs grow smoothly to the full width when x1 / x10 / x100 fades out (Boosts tab). */}
      <View className="flex-1 flex-row border-2 border-outline" accessibilityRole="tablist">
        {(["supplies", "boosts"] as const).map((id) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            onPress={() => {
              if (tab !== id) playSfx("click");
              setTab(id);
            }}
            className={`flex-1 items-center py-1.5 ${tab === id ? "bg-ink" : "bg-surface"}`}
          >
            <Text className={`font-pixel text-sm tracking-[3px] ${tab === id ? "text-surface" : "text-ink"}`}>{id.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <Animated.View style={[{ overflow: "hidden" }, qtyStyle]} pointerEvents={tab === "supplies" ? "auto" : "none"}>
        <View
          onLayout={(e) => setQtyW(e.nativeEvent.layout.width)}
          className="flex-row self-start border-2 border-outline"
          accessibilityRole="radiogroup"
          accessibilityLabel="How many to buy"
        >
          {[1, 10, 100].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ checked: qty === n }}
              accessibilityLabel={`Buy ${n} at a time`}
              onPress={() => {
                if (qty !== n) playSfx("click");
                setQty(n);
              }}
              className={`items-center justify-center px-1.5 ${qty === n ? "bg-ink" : "bg-surface"}`}
            >
              <Text className={`font-pixel text-xs ${qty === n ? "text-surface" : "text-ink"}`}>x{n}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
      </View>
      <ScrollView contentContainerClassName="px-4 pb-4">{tab === "supplies" ? <SuppliesList qty={qty} /> : <BoostsList />}</ScrollView>
    </View>
  );
}

export function Shop({ compact, width }: { compact: boolean; width: number }) {
  const [page, setPage] = useState(0);

  return (
    <View className="flex-1 bg-primary">
      <Text
        accessibilityRole="header"
        className={`text-center font-pixel tracking-[2px] text-ink ${compact ? "pt-2 text-3xl" : "pt-5 text-5xl"}`}
        style={{ textShadowColor: "rgba(0,0,0,0.28)", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0.1 }}
      >
        {SHOP_PAGES[page].title}
      </Text>
      <Pager
        width={width}
        dots="top"
        className="flex-1"
        onPageChange={setPage}
        pages={SHOP_PAGES.map((p) => ({
          key: p.id,
          label: p.label,
          content: p.id === "supplies" ? <ShopPage /> : p.id === "gems" ? <GemShop /> : <HospitalPage width={width} active={page === 1} />,
        }))}
      />
    </View>
  );
}

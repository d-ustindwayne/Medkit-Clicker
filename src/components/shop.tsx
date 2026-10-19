import { memo, useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { MEDKIT_IMAGE, SHOP_ITEMS, itemCost, type ShopItem } from "@/constants/items";
import { Shine } from "@/components/fx/shine";
import { HardShadow } from "@/components/ui/hard-shadow";
import { Pager } from "@/components/ui/pager";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { usePalette } from "@/hooks/use-palette";
import { formatCount, formatRate } from "@/lib/format";

type CardProps = {
  item: ShopItem;
  owned: number;
  cost: number;
  affordable: boolean;
  /** 0-1 towards affording the next one, in 2% steps so cards don't re-render every tick. */
  progress: number;
  /** Not yet affordable and never bought: shown as a silhouette. */
  hidden: boolean;
};

const ShopCard = memo(function ShopCard({ item, owned, cost, affordable, progress, hidden }: CardProps) {
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
        accessibilityLabel={hidden ? "Unknown item" : `Buy ${item.name} for ${formatCount(cost)}. You own ${owned}.`}
        accessibilityState={{ disabled: !affordable }}
        onPress={() => {
          unlock();
          if (!affordable) {
            shake.set(withSequence(withTiming(-6, { duration: 40 }), withTiming(6, { duration: 60 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 40 })));
            haptic.denied();
            return playSfx("invalid");
          }
          dispatch({ type: "buy", item: item.id });
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
              <Text className="font-number text-base leading-5 text-ink">{formatCount(cost)}</Text>
            </View>
            {!hidden && <Text className="font-body text-xs text-ink opacity-70">+{formatRate(item.rate)} per second each</Text>}
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

// Pages you can swipe to in the shop panel. Only "supplies" exists so far; the rest are
// placeholders until their content is designed (see docs/TASKS.md).
const SHOP_PAGES = [
  { id: "supplies", title: "SHOP" },
  { id: "coming-soon", title: "???" },
];

function SuppliesList() {
  const { healed, totalHealed, owned } = useGameState();
  return (
    <ScrollView contentContainerClassName="px-4 pb-4">
      {SHOP_ITEMS.map((item) => {
        const cost = itemCost(item, owned[item.id]);
        return (
          <ShopCard
            key={item.id}
            item={item}
            owned={owned[item.id]}
            cost={cost}
            affordable={healed >= cost}
            progress={Math.min(1, Math.floor((healed / cost) * 50) / 50)}
            hidden={owned[item.id] === 0 && totalHealed < cost * 0.5}
          />
        );
      })}
    </ScrollView>
  );
}

function ComingSoonPage() {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6">
      <View className="h-20 w-20 items-center justify-center border-2 border-dashed border-ink/60">
        <PixelIcon name="lock" size={36} />
      </View>
      <Text className="text-center font-pixel text-base tracking-[3px] text-ink">COMING SOON</Text>
    </View>
  );
}

export function Shop({ compact, width }: { compact: boolean; width: number }) {
  const [page, setPage] = useState(0);

  return (
    <View className="flex-1 bg-primary">
      <Text
        accessibilityRole="header"
        className={`text-center font-pixel tracking-[6px] text-ink ${compact ? "pt-2 text-3xl" : "pt-5 text-5xl"}`}
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
          label: p.id === "supplies" ? "Supplies" : "Coming soon",
          content: p.id === "supplies" ? <SuppliesList /> : <ComingSoonPage />,
        }))}
      />
    </View>
  );
}

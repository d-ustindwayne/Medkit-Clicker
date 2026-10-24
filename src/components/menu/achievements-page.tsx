import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { visibleAchievements } from "@/constants/achievements";
import { COIN } from "@/constants/boosts";
import { HardShadow } from "@/components/ui/hard-shadow";
import { useGameSelector } from "@/hooks/use-game";
import type { GameState } from "@/lib/game";

/** Tiny progress (like 1e-20 of the way to a vigintillion) still reads as something, not 0%. */
const formatPercent = (p: number) => {
  const pct = Math.min(1, p) * 100;
  if (pct >= 1 || pct === 0) return `${Math.floor(pct)}%`;
  return "<1%";
};

/** Badge tiles are about this size; they grow a little so each row fills the width exactly. */
const TILE = 56;
const GAP = 8;

/** The chosen achievement's progress, redrawn only when it moves a step (the bar in 0.5% steps). */
function Progress({ of }: { of: (s: GameState) => number }) {
  const { bar, text } = useGameSelector((s) => {
    const p = of(s);
    return { bar: Math.floor(Math.min(1, p) * 200) / 200, text: formatPercent(p) };
  });
  return (
    <View className="mt-2 flex-row items-center gap-2">
      <View className="h-2.5 flex-1 border-[1.5px] border-outline bg-surface">
        <View className="h-full bg-success" style={{ width: `${bar * 100}%` }} />
      </View>
      <Text className="w-12 text-right font-number text-sm text-ink">{text}</Text>
    </View>
  );
}

export function AchievementsPage() {
  // Only what the page shows, not the whole state: the 127 badges would otherwise redraw on every
  // game tick (five times a second) while the page is open.
  const { achievements, unlockedSections } = useGameSelector((s) => ({ achievements: s.achievements, unlockedSections: s.unlockedSections }));
  const ACHIEVEMENTS = visibleAchievements(unlockedSections);
  const [selected, setSelected] = useState(ACHIEVEMENTS[0].id);
  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements[a.id] !== undefined).length;
  const current = ACHIEVEMENTS.find((a) => a.id === selected) ?? ACHIEVEMENTS[0];
  const currentUnlocked = achievements[current.id] !== undefined;
  const [gridW, setGridW] = useState(0);
  const cols = Math.max(1, Math.floor((gridW + GAP) / (TILE + GAP)));
  // Rounded down, so rounding can never push the last tile of a row onto the next one. The web reports
  // whole-pixel widths, rounded either way, so there a pixel is kept spare.
  const tile = gridW ? Math.floor((gridW - (Platform.OS === "web" ? 1 : 0) - GAP * (cols - 1)) / cols) : TILE;

  return (
    <View className="flex-1">
      <View className="gap-4 p-4 pb-3">
      <View className="gap-1">
        <Text className="font-number text-lg text-ink">
          {unlockedCount} of {ACHIEVEMENTS.length} unlocked
        </Text>
        <View className="h-3 border-[1.5px] border-outline bg-surface">
          <View className="h-full bg-primary" style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }} />
        </View>
      </View>

      <HardShadow offset={5}>
      <View className="min-h-24 border-2 border-outline bg-accent p-3">
        <Text className="font-display text-base text-ink">
          {currentUnlocked || !current.secret ? current.name : "Secret achievement"}
        </Text>
        <Text className="font-body text-sm leading-5 text-ink">
          {currentUnlocked || !current.secret ? current.description : "Keep playing to find out."}
        </Text>
        {(currentUnlocked || !current.secret) && (
          <View className="mt-1 flex-row items-center gap-1">
            <Image source={COIN.image} style={{ width: 14, height: 14 }} contentFit="contain" />
            <Text className="font-body text-xs text-ink">
              {current.coins} {current.coins === 1 ? "Care Coin" : "Care Coins"}
            </Text>
          </View>
        )}
        {currentUnlocked ? (
          <Text className="mt-1 font-body text-xs text-ink opacity-70">
            Unlocked {new Date(achievements[current.id]!).toLocaleDateString()}
          </Text>
        ) : (
          current.progress && !current.secret && <Progress key={current.id} of={current.progress} />
        )}
      </View>
      </HardShadow>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-4 pt-1">
      <View className="flex-row flex-wrap gap-2" onLayout={(e) => setGridW(Math.floor(e.nativeEvent.layout.width))}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = achievements[a.id] !== undefined;
          const isSelected = a.id === selected;
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={unlocked || !a.secret ? a.name : "Secret achievement"}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelected(a.id)}
              style={{ width: tile, height: tile }}
              className={`items-center justify-center border-2 border-outline ${isSelected ? "bg-primary" : unlocked ? "bg-surface" : "bg-ink/20"}`}
            >
              {unlocked ? (
                <Image source={a.image} style={{ width: tile * 0.64, height: tile * 0.64 }} contentFit="contain" />
              ) : (
                <Text className="font-pixel text-xl text-ink opacity-50">?</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      </ScrollView>
    </View>
  );
}

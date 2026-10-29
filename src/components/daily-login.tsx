import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Modal, Text, View } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { COIN } from "@/constants/boosts";
import { MEDKIT_IMAGE } from "@/constants/items";
import { GEM } from "@/constants/rebirth";
import { themeVars } from "@/constants/theme";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameReady, useGameSelector, useGameStore, useSettings } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { DAILY_GIFTS, dayKey, todaysGift, type DailyGift } from "@/lib/daily";
import { formatCount } from "@/lib/format";
import { dailyAmount } from "@/lib/game";

const giftImage = (g: DailyGift) => (g.gems ? GEM.image : g.coins ? COIN.image : MEDKIT_IMAGE);

/**
 * The daily gift: the first thing shown when the game opens on a new day (after the first-launch
 * intro). Seven days in a row, each bigger than the last; a missed day starts over.
 */
export function DailyLogin() {
  const ready = useGameReady();
  const { introSeen, daily } = useGameSelector((s) => ({ introSeen: s.introSeen, daily: s.daily }));
  const store = useGameStore();
  const { dispatch, pushToast } = useGameActions();
  const { theme } = useSettings();
  const { playSfx, unlock } = useAudio();
  const haptic = useHaptics();
  // The date is read once when the game opens; a game left open past midnight offers it next time.
  const [today] = useState(() => dayKey());
  const gift = ready && introSeen ? todaysGift(daily, today) : null;
  if (!gift) return null;

  const claim = () => {
    unlock();
    const amount = gift.seconds ? dailyAmount(store.get(), gift.seconds) : 0;
    dispatch({ type: "claimDaily", today });
    haptic.buy();
    playSfx("buy");
    const parts = [amount ? `+${formatCount(amount)} medkits` : "", gift.coins ? `+${gift.coins} Care Coins` : "", gift.gems ? `+${gift.gems} ${GEM.one}` : ""].filter(Boolean);
    pushToast({ kind: "info", title: `Day ${gift.day} gift`, body: parts.join(", "), image: giftImage(gift) });
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={claim}>
      <View style={themeVars[theme]} className="flex-1 items-center justify-center p-6">
        <View className="absolute inset-0 bg-black/60" />
        <HardShadow offset={6} className="w-full max-w-sm">
          <View accessibilityViewIsModal className="gap-4 border-2 border-outline bg-surface p-5">
            <View className="gap-1">
              <Text className="font-pixel text-xs tracking-[2px] text-primary">DAILY GIFT</Text>
              <Text accessibilityRole="header" className="font-display text-xl text-ink">
                Day {gift.day} of 7
              </Text>
              <Text className="font-body text-sm text-ink opacity-70">Come back every day for a bigger gift. Miss a day and it starts over.</Text>
            </View>
            <View className="flex-row flex-wrap justify-center gap-2">
              {DAILY_GIFTS.map((g) => {
                const done = g.day < gift.day;
                const now = g.day === gift.day;
                return (
                  <View
                    key={g.day}
                    accessibilityLabel={`Day ${g.day}: ${g.label}${done ? ", claimed" : now ? ", today" : ""}`}
                    className={`${g.day === 7 ? "w-[152px]" : "w-[72px]"} items-center gap-1 border-2 p-1.5 ${now ? "border-success bg-success/20" : done ? "border-outline/40 bg-surface opacity-50" : "border-outline bg-surface"}`}
                  >
                    <Text className="font-pixel text-[9px] tracking-[1px] text-ink">DAY {g.day}</Text>
                    <Image source={giftImage(g)} style={{ width: 28, height: 28 }} contentFit="contain" />
                    <Text className="text-center font-body text-[10px] leading-3 text-ink" numberOfLines={3}>
                      {done ? "Claimed" : g.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <PixelButton label={`Claim day ${gift.day}`} tone="success" onPress={claim} />
          </View>
        </HardShadow>
      </View>
    </Modal>
  );
}

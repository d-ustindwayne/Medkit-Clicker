import { Image } from "expo-image";
import { Text, View } from "react-native";

import { COIN } from "@/constants/boosts";
import { MEDKIT_IMAGE } from "@/constants/items";
import { GEM } from "@/constants/rebirth";
import { useGameState } from "@/hooks/use-game";
import { formatShort } from "@/lib/format";
import { coinBalance } from "@/lib/game";

function Chip({ image, value, label }: { image: number; value: string; label: string }) {
  return (
    <View accessibilityLabel={label} className="flex-row items-center gap-1 self-end rounded-full border-[1.5px] border-outline bg-surface/90 py-0.5 pl-1 pr-2">
      <Image source={image} style={{ width: 16, height: 16 }} contentFit="contain" />
      <Text className="font-number text-xs text-ink">{value}</Text>
    </View>
  );
}

/** The three currencies, stacked at the top-right: patients (medkits), Care Coins and Natal Gems. */
export function CurrencyBar() {
  const state = useGameState();
  const coins = coinBalance(state);
  return (
    <View className="gap-1" pointerEvents="none">
      <Chip image={MEDKIT_IMAGE as number} value={formatShort(state.healed)} label={`${Math.floor(state.healed)} patients`} />
      <Chip image={COIN.image as number} value={formatShort(coins)} label={`${coins} ${COIN.name}`} />
      <Chip image={GEM.image as number} value={formatShort(state.rebirthPoints)} label={`${state.rebirthPoints} ${GEM.name}`} />
    </View>
  );
}

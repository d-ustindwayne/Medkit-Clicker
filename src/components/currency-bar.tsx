import { Image } from "@/components/ui/image";
import { Text, View } from "react-native";

import { COIN } from "@/constants/boosts";
import { gemBalance } from "@/constants/gems";
import { MEDKIT_IMAGE } from "@/constants/items";
import { GEM } from "@/constants/rebirth";
import { useGameSelector } from "@/hooks/use-game";
import { formatCount, formatShort } from "@/lib/format";
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
  // Patients use short units (1.23K, 4.5M, 6.78T) to keep the chip narrow; the text only changes when
  // the short form does, so the chips don't redraw on every tick. Care Coins and Natal Gems are
  // counted one by one, so they show the exact amount (1,234).
  const state = useGameSelector((s) => ({ healed: formatShort(s.healed), coins: coinBalance(s), gems: gemBalance(s) }));
  const coins = state.coins;
  return (
    <View className="gap-1" pointerEvents="none">
      <Chip image={MEDKIT_IMAGE as number} value={state.healed} label={`${state.healed} patients`} />
      <Chip image={COIN.image as number} value={formatCount(coins)} label={`${coins} ${COIN.name}`} />
      <Chip image={GEM.image as number} value={formatCount(state.gems)} label={`${state.gems} ${GEM.name}`} />
    </View>
  );
}

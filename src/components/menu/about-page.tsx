import { Image } from "expo-image";
import Constants from "expo-constants";
import { Text, View } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { APP_INFO, CREDIT } from "@/constants/app";
import { HOSPITAL_IMAGE } from "@/constants/items";
import { useGameState } from "@/hooks/use-game";
import { formatCount, formatDuration } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b-2 border-outline/20 py-1.5">
      <Text className="font-body text-sm text-ink">{label}</Text>
      <Text className="font-number text-base leading-5 text-ink">{value}</Text>
    </View>
  );
}

export function AboutPage() {
  const s = useGameState();
  return (
    <View className="gap-5">
      <View className="items-center gap-2">
        <Image source={HOSPITAL_IMAGE} style={{ width: 72, height: 72 }} contentFit="contain" />
        <Text className="font-display text-xl text-ink">{APP_INFO.name}</Text>
        <Text className="font-body text-xs text-ink opacity-70">Version {Constants.expoConfig?.version ?? "1.0.0"}</Text>
      </View>

      <Text className="font-body text-base leading-6 text-ink">
        Tap the medkit to heal patients. Spend them in the shop on supplies that keep healing for you. Your progress saves on
        its own, and your team keeps working for up to 4 hours while the app is closed.
      </Text>

      <HardShadow offset={5}>
      <View className="border-2 border-outline bg-surface px-3 py-1">
        <Stat label="Patients healed, all time" value={formatCount(s.totalHealed)} />
        <Stat label="Medkit taps" value={formatCount(s.taps)} />
        <Stat label="Rebirths" value={formatCount(s.rebirths)} />
        <Stat label="Time played" value={formatDuration(s.playSeconds)} />
        <Stat label="Playing since" value={new Date(s.startedAt).toLocaleDateString()} />
      </View>
      </HardShadow>

      <Text className="font-body text-sm leading-5 text-ink">
        {CREDIT} Code released under the {APP_INFO.license}. Original soundtrack made in BeepBox; songs in unlocked playlists belong to their artists.
      </Text>
    </View>
  );
}

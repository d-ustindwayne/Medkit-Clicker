import { PermissionsAndroid, Platform, Text, View } from "react-native";

import { SettingsGroup, Toggle } from "@/components/ui/controls";
import { useGameActions, useGameSelector } from "@/hooks/use-game";
import { dayKey } from "@/lib/daily";
import { DAILY_CAP_M, GEM_FROM_M, REWARD_EVERY_M } from "@/lib/walk";
import { StepCounter } from "../../../modules/step-counter";

const km = (m: number) => `${(m / 1000).toFixed(m < 10_000 ? 2 : 1)} km`;

/** Whether this phone can count steps (Android with a step counter sensor). */
export const canWalk = () => Platform.OS === "android" && !!StepCounter?.isAvailable();

/** Walking rewards: turn step counting on, see today's distance and what's next. */
export function WalkPage() {
  const walk = useGameSelector((s) => s.walk);
  const { dispatch, pushToast } = useGameActions();
  // Distance from an earlier day doesn't count for today.
  const meters = walk.day === dayKey() ? walk.meters : 0;
  const nextReward = Math.min(DAILY_CAP_M, (Math.floor(meters / REWARD_EVERY_M) + 1) * REWARD_EVERY_M);
  const done = meters >= DAILY_CAP_M;

  const toggle = async (on: boolean) => {
    if (on && Platform.OS === "android" && Number(Platform.Version) >= 29) {
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION).catch(() => PermissionsAndroid.RESULTS.DENIED);
      if (res !== PermissionsAndroid.RESULTS.GRANTED) {
        pushToast({ kind: "info", title: "Steps not allowed", body: "Allow Physical activity for Medkit Clicker in your phone's settings to count your steps." });
        return;
      }
    }
    dispatch({ type: "setWalk", on });
  };

  if (!canWalk()) {
    return <Text className="font-body text-base leading-6 text-ink">Walking rewards need a phone with a step counter. This one doesn&apos;t have one.</Text>;
  }
  return (
    <View className="gap-4">
      <Text className="font-body text-base leading-6 text-ink">
        Go for a walk and your hospital gets a reward. Every {REWARD_EVERY_M} m pays a surprise: medkits, Care Coins or a boost, bigger the further you walk that day. From {GEM_FROM_M / 1000} km one might be a Natal Gem, and reaching {DAILY_CAP_M / 1000} km pays two Natal Gems and 2 hours of medkits.
      </Text>
      <SettingsGroup title="WALKING" icon="heart">
        <Toggle label="Count my steps" value={walk.on} onChange={toggle} />
        {walk.on && (
          <View className="gap-2">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-display text-2xl text-ink">{km(meters)}</Text>
              <Text className="font-number text-sm text-ink opacity-70">of {km(DAILY_CAP_M)} today</Text>
            </View>
            {/* One block per kilometre: filled as you go. */}
            <View className="flex-row gap-1">
              {Array.from({ length: DAILY_CAP_M / 1000 }, (_, k) => {
                const fill = Math.min(1, Math.max(0, (meters - k * 1000) / 1000));
                return (
                  <View key={k} className="h-4 flex-1 border-[1.5px] border-outline bg-surface">
                    <View className="h-full bg-success" style={{ width: `${fill * 100}%` }} />
                  </View>
                );
              })}
            </View>
            <Text className="font-body text-sm text-ink">
              {done ? "That's the most for today. See you tomorrow!" : `Next reward at ${km(nextReward)}.`}
            </Text>
            <Text className="font-body text-xs text-ink opacity-70">Steps are read by your phone even while the game is closed; rewards arrive the next time you open it. A step counts as about 75 cm.</Text>
          </View>
        )}
      </SettingsGroup>
    </View>
  );
}

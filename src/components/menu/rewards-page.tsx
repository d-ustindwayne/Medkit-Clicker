import { useState } from "react";
import { Image } from "expo-image";
import { Share, Text, View } from "react-native";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { MEDKIT_IMAGE } from "@/constants/items";
import { REWARD_SECTIONS, type Reward, type RewardSection } from "@/constants/rewards";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { formatCount } from "@/lib/format";

const shareRedemption = (section: RewardSection, reward: Reward, index: number, at: number) =>
  Share.share({
    message:
      `Medkit Clicker reward redeemed!\n` +
      `${reward.name} (${index + 1} of ${reward.limit})\n` +
      `Redeemed on ${new Date(at).toLocaleString()}.\n` +
      `${section.notify}, time to deliver!`,
  }).catch(() => {});

function RewardCard({ section, reward }: { section: RewardSection; reward: Reward }) {
  const { healed, redemptions } = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const [confirming, setConfirming] = useState(false);
  const history = redemptions[reward.id] ?? [];
  const left = reward.limit - history.length;
  const affordable = healed >= reward.cost;

  const redeem = () => {
    setConfirming(false);
    const at = Date.now();
    dispatch({ type: "redeem", rewardId: reward.id });
    pushToast({ kind: "info", title: "Redeemed", body: `${reward.name}. Let ${section.notify} know!` });
    shareRedemption(section, reward, history.length, at);
  };

  return (
    <HardShadow offset={5}>
      <View className="gap-3 border-[3px] border-outline bg-surface p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center border-2 border-dashed border-outline">
            <PixelIcon name="gift" size={24} />
          </View>
          <View className="flex-1">
            <Text className="font-display text-lg text-ink">{reward.name}</Text>
            <View className="flex-row items-center gap-1">
              <Image source={MEDKIT_IMAGE} style={{ width: 16, height: 16 }} contentFit="contain" />
              <Text className="font-number text-base leading-5 text-ink">{formatCount(reward.cost)} patients</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2" accessibilityLabel={`${left} of ${reward.limit} left`}>
          {Array.from({ length: reward.limit }, (_, i) => (
            <View key={i} className={`h-4 w-4 border-[1.5px] border-outline ${i < left ? "bg-success" : "bg-ink/20"}`} />
          ))}
          <Text className="ml-1 font-body text-sm text-ink">
            {left > 0 ? `${left} of ${reward.limit} left` : "All redeemed"}
          </Text>
        </View>

        {left > 0 && (
          <PixelButton tone="success" disabled={!affordable} onPress={() => setConfirming(true)} label="Redeem" />
        )}
        {left > 0 && !affordable && (
          <Text className="font-body text-xs text-ink opacity-70">You need {formatCount(reward.cost - healed)} more patients.</Text>
        )}

        {history.length > 0 && (
          <View className="gap-2 border-t-[1.5px] border-dashed border-outline pt-3">
            {history.map((at, i) => (
              <View key={at} className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-body text-sm text-ink">
                  #{i + 1} · {new Date(at).toLocaleDateString()}
                </Text>
                <PixelButton label={`Tell ${section.notify}`} onPress={() => shareRedemption(section, reward, i, at)} />
              </View>
            ))}
          </View>
        )}
      </View>

      <ConfirmDialog
        visible={confirming}
        title={`Redeem ${reward.name.toLowerCase()}?`}
        body={`This spends ${formatCount(reward.cost)} patients. You can redeem it ${left - 1 === 0 ? "no more times" : `${left - 1} more time${left - 1 === 1 ? "" : "s"}`} after this.`}
        cancelLabel="Not yet"
        confirmLabel="Redeem"
        confirmTone="success"
        onCancel={() => setConfirming(false)}
        onConfirm={redeem}
      />
    </HardShadow>
  );
}

export function RewardsPage({ sectionId }: { sectionId: string }) {
  const { healed } = useGameState();
  const section = REWARD_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between border-2 border-outline bg-accent px-3 py-2">
        <Text className="font-body text-sm text-ink">Your patients</Text>
        <Text className="font-number text-lg text-ink">{formatCount(healed)}</Text>
      </View>
      <Text className="font-body text-sm leading-5 text-ink">
        Spend patients on real rewards. After redeeming, send the message to {section.notify} so it can be delivered.
      </Text>
      {section.rewards.map((r) => (
        <RewardCard key={r.id} section={section} reward={r} />
      ))}
    </View>
  );
}

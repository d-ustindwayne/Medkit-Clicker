import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Text, View } from "react-native";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { hospitalTier } from "@/constants/hospital";
import { GEM, REBIRTH_UNLOCKS, gemsForRebirth, rebirthMultiplier, rebirthTarget } from "@/constants/rebirth";
import { useGameActions, useGameSelector } from "@/hooks/use-game";
import { formatCount, formatDecimal } from "@/lib/format";

/** Rebirth, on the Hospital page: a fresh start for a Natal Gem and a permanent healing boost. */
export function RebirthCard() {
  // Only what the card shows, so it redraws only when its text or bar (in 0.5% steps) changes.
  const { rebirths, rebirthPoints, healedText, gain, progress } = useGameSelector((s) => ({
    rebirths: s.rebirths,
    rebirthPoints: s.rebirthPoints,
    healedText: formatCount(s.runHealed),
    gain: gemsForRebirth(s.runHealed, s.rebirths),
    progress: Math.min(1, Math.floor((s.runHealed / rebirthTarget(s.rebirths)) * 200) / 200),
  }));
  const { dispatch, pushToast } = useGameActions();
  const [confirming, setConfirming] = useState(false);
  const target = rebirthTarget(rebirths);
  const next = REBIRTH_UNLOCKS.find((u) => u.rebirths > rebirths);
  const look = hospitalTier(rebirths);

  const rebirth = () => {
    setConfirming(false);
    dispatch({ type: "rebirth" });
    pushToast({ kind: "info", title: `Rebirth ${rebirths + 1}`, body: `You earned a ${GEM.one}. A fresh start!`, image: GEM.image });
  };

  return (
    <HardShadow offset={4}>
      <View className="gap-2 border-[3px] border-outline bg-surface/95 p-3">
        <View className="flex-row items-center gap-2">
          <Image source={GEM.image} style={{ width: 28, height: 28 }} contentFit="contain" />
          <View className="flex-1">
            <Text className="font-display text-base text-ink">{look.tier.name}</Text>
            <Text className="font-body text-xs text-ink opacity-70">
              {formatCount(rebirths)} done · {formatCount(rebirthPoints)} {GEM.name} earned · healing ×{formatDecimal(rebirthMultiplier(rebirths))}
            </Text>
          </View>
        </View>
        {gain > 0 ? (
          <PixelButton tone="success" label={`Rebirth for +1 ${GEM.one}`} onPress={() => setConfirming(true)} />
        ) : (
          <View className="gap-1">
            <View className="h-3 border-[1.5px] border-outline bg-backdrop">
              <View className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
            </View>
            <Text className="font-body text-xs text-ink opacity-70">
              {healedText} / {formatCount(target)} healed this run
            </Text>
          </View>
        )}
        <Text className="font-body text-xs text-ink">
          {look.next ? `Rebirth ${look.next.rebirths}: the hospital grows into a ${look.next.name}` : "Your hospital is fully grown."}
        </Text>
        {next && (
          <Text className="font-body text-xs text-ink">
            Rebirth {next.rebirths}: {next.title}
          </Text>
        )}
      </View>

      <ConfirmDialog
        visible={confirming}
        title="Rebirth now?"
        body={`Your ${healedText} medkits and all shop supplies reset. You keep achievements, rewards and settings, get a ${GEM.one}, and earn ×${formatDecimal(rebirthMultiplier(rebirths + 1))} for good.`}
        cancelLabel="Keep playing"
        confirmLabel="Rebirth"
        confirmTone="success"
        onCancel={() => setConfirming(false)}
        onConfirm={rebirth}
      />
    </HardShadow>
  );
}

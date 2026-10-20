import { useState } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { hospitalTier } from "@/constants/hospital";
import { GEM, REBIRTH_UNLOCKS, gemsForRebirth, rebirthMultiplier, rebirthTarget } from "@/constants/rebirth";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { formatCount } from "@/lib/format";

/** Rebirth, on the Hospital page: a fresh start for a Natal Gem and a permanent healing boost. */
export function RebirthCard() {
  const { rebirths, rebirthPoints, runHealed } = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const [confirming, setConfirming] = useState(false);
  const gain = gemsForRebirth(runHealed, rebirths);
  const target = rebirthTarget(rebirths);
  const progress = Math.min(1, runHealed / target);
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
              {formatCount(rebirths)} done · {formatCount(rebirthPoints)} {GEM.name} earned · healing ×{rebirthMultiplier(rebirths).toFixed(2)}
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
              {formatCount(runHealed)} / {formatCount(target)} healed this run
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
        body={`Your ${formatCount(runHealed)} patients and all shop supplies reset. You keep achievements, rewards and settings, get a ${GEM.one}, and heal ×${rebirthMultiplier(rebirths + 1).toFixed(2)} for good.`}
        cancelLabel="Keep playing"
        confirmLabel="Rebirth"
        confirmTone="success"
        onCancel={() => setConfirming(false)}
        onConfirm={rebirth}
      />
    </HardShadow>
  );
}

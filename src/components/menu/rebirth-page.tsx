import { useState } from "react";
import { Text, View } from "react-native";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { GEM, REBIRTH_MIN_HEALED, REBIRTH_UNLOCKS, gemsForRebirth, rebirthMultiplier } from "@/constants/rebirth";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { formatCount } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center border-2 border-outline bg-surface px-2 py-3">
      <Text className="font-number text-2xl text-ink">{value}</Text>
      <Text className="font-body text-xs text-ink opacity-70">{label}</Text>
    </View>
  );
}

export function RebirthPage({ onDone }: { onDone: () => void }) {
  const { rebirths, rebirthPoints, runHealed } = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const [confirming, setConfirming] = useState(false);
  const gain = gemsForRebirth(runHealed);
  const progress = Math.min(1, runHealed / REBIRTH_MIN_HEALED);

  const rebirth = () => {
    setConfirming(false);
    dispatch({ type: "rebirth" });
    pushToast({ kind: "info", title: `Rebirth ${rebirths + 1}`, body: `You earned a ${GEM.one}. A fresh start!`, image: GEM.image });
    onDone();
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <Stat label="Rebirths" value={formatCount(rebirths)} />
        <Stat label={GEM.name} value={formatCount(rebirthPoints)} />
        <Stat label="Healing boost" value={`×${rebirthMultiplier(rebirths).toFixed(2)}`} />
      </View>

      <HardShadow offset={5}>
        <View className="gap-3 border-[3px] border-outline bg-surface p-4">
          <Text className="font-display text-lg text-ink">Start a new run</Text>
          <Text className="font-body text-sm leading-5 text-ink">
            Your patients and shop supplies reset. You keep achievements, lifetime stats, rewards, settings and every rebirth
            point, and your healing gets a small permanent boost (×{rebirthMultiplier(rebirths + 1).toFixed(2)} after this one).
          </Text>
          <Text className="font-body text-sm text-ink">This run: {formatCount(runHealed)} patients healed</Text>
          {gain > 0 ? (
            <PixelButton tone="success" label={`Rebirth for +1 ${GEM.one}`} onPress={() => setConfirming(true)} />
          ) : (
            <View className="gap-1">
              <View className="h-3 border-[1.5px] border-outline bg-backdrop">
                <View className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
              </View>
              <Text className="font-body text-xs text-ink opacity-70">
                Heal {formatCount(REBIRTH_MIN_HEALED)} patients in this run to rebirth.
              </Text>
            </View>
          )}
        </View>
      </HardShadow>

      <View className="gap-2">
        <Text className="font-pixel text-sm tracking-[2px] text-ink">UNLOCKS</Text>
        {REBIRTH_UNLOCKS.length === 0 ? (
          <Text className="font-body text-sm text-ink opacity-70">New content for each rebirth is coming soon.</Text>
        ) : (
          REBIRTH_UNLOCKS.map((u) => (
            <View key={u.rebirths} className={`border-2 border-outline p-3 ${rebirths >= u.rebirths ? "bg-surface" : "bg-ink/10"}`}>
              <Text className="font-display text-base text-ink">
                Rebirth {u.rebirths}: {u.title}
              </Text>
              <Text className="font-body text-sm text-ink">{u.description}</Text>
            </View>
          ))
        )}
      </View>

      <ConfirmDialog
        visible={confirming}
        title="Rebirth now?"
        body={`Your ${formatCount(runHealed)} patients and all shop supplies will reset. You'll get a ${GEM.one}.`}
        cancelLabel="Keep playing"
        confirmLabel="Rebirth"
        confirmTone="success"
        onCancel={() => setConfirming(false)}
        onConfirm={rebirth}
      />
    </View>
  );
}

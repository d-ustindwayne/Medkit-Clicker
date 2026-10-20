import { useState } from "react";
import { Text, View } from "react-native";

import { PixelButton } from "@/components/ui/pixel-button";
import { TreatModal } from "@/components/ward/treat-modal";
import { SICK_PATIENTS, type SickPatient } from "@/constants/patients";
import { useGameActions, useGameState } from "@/hooks/use-game";

/** Shortcuts for testing. Shown in development builds, or after entering the developer code. */
export function DevTools() {
  const { dispatch, simulateAway } = useGameActions();
  const { healed } = useGameState();
  const [playing, setPlaying] = useState<SickPatient | null>(null);

  const buttons: [label: string, onPress: () => void][] = [
    ["+1 million", () => dispatch({ type: "earn", amount: 1e6 })],
    ["+1 billion", () => dispatch({ type: "earn", amount: 1e9 })],
    ["×1000 patients", () => dispatch({ type: "earn", amount: Math.max(1000, healed * 999) })],
    ["+10 of each item", () => dispatch({ type: "devAddItems", count: 10 })],
    ["Skip 1 hour away", () => simulateAway(3600)],
    ["Unlock all achievements", () => dispatch({ type: "devUnlockAll" })],
    ["+20 Care Coins", () => dispatch({ type: "devAddCoins", count: 20 })],
    ["Call a patient", () => dispatch({ type: "patientArrives", id: SICK_PATIENTS[Math.floor(Math.random() * SICK_PATIENTS.length)].id })],
    ["+1 rebirth", () => dispatch({ type: "devRebirth" })],
    ["+10 Natal Gems", () => dispatch({ type: "claimPromo", hash: `dev-${Date.now()}`, kind: "gems", amount: 10 })],
  ];
  // One button per minigame (the first patient that plays it).
  const games = SICK_PATIENTS.filter((p, i, all) => all.findIndex((q) => q.game === p.game) === i);

  return (
    <View className="gap-2 border-[1.5px] border-dashed border-outline p-3">
      <Text className="font-pixel text-sm tracking-[2px] text-ink">DEV TOOLS</Text>
      <Text className="font-body text-xs text-ink opacity-70">For testing. Changes your real save.</Text>
      <View className="flex-row flex-wrap gap-2">
        {buttons.map(([label, onPress]) => (
          <PixelButton key={label} label={label} onPress={onPress} tone="accent" />
        ))}
      </View>
      <Text className="font-pixel text-xs tracking-[2px] text-ink">PLAY A MINIGAME</Text>
      <View className="flex-row flex-wrap gap-2">
        {games.map((p) => (
          <PixelButton key={p.id} label={p.game} onPress={() => setPlaying(p)} />
        ))}
      </View>
      {playing && <TreatModal patient={playing} onClose={() => setPlaying(null)} />}
    </View>
  );
}

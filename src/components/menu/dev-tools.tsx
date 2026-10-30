import { useState } from "react";
import { Text, View } from "react-native";

import { PixelButton } from "@/components/ui/pixel-button";
import { TreatModal } from "@/components/ward/treat-modal";
import { GEM_LEVEL_COSTS, GEM_UPGRADES } from "@/constants/gems";
import { SICK_PATIENTS, type SickPatient } from "@/constants/patients";
import { useGameActions, useGameState, useGameStore } from "@/hooks/use-game";
import { WALK_IMAGE, describeWalk } from "@/hooks/use-walk";
import { dayKey } from "@/lib/daily";
import { devSignal } from "@/lib/dev-signals";
import { DAILY_CAP_M, REWARD_EVERY_M, walkRewards } from "@/lib/walk";

/** Shortcuts for testing. Shown in development builds, or after entering the developer code. */
export function DevTools() {
  const { dispatch, simulateAway, pushToast } = useGameActions();
  const { healed } = useGameState();
  const store = useGameStore();
  const note = (title: string, body: string) => pushToast({ kind: "info", title, body });

  const walk = (meters: number) => {
    const s = store.get(), today = dayKey();
    const w = s.walk.day === today ? s.walk : { meters: 0, paid500: 0 };
    const paid = Math.floor(Math.min(DAILY_CAP_M, w.meters + meters) / REWARD_EVERY_M);
    dispatch({ type: "devWalk", meters, today });
    const body = describeWalk(s, walkRewards(today, w.paid500, paid));
    pushToast({ kind: "info", title: "Nice walk!", body: body || "Nothing more today: 8 km is the most.", image: WALK_IMAGE });
  };
  const maxLevels = Object.fromEntries(GEM_UPGRADES.map((u) => [u.id, GEM_LEVEL_COSTS.length]));
  const [playing, setPlaying] = useState<SickPatient | null>(null);

  const buttons: [label: string, onPress: () => void][] = [
    ["+1 million", () => dispatch({ type: "earn", amount: 1e6 })],
    ["+1 billion", () => dispatch({ type: "earn", amount: 1e9 })],
    ["×1000 medkits", () => dispatch({ type: "earn", amount: Math.max(1000, healed * 999) })],
    ["+10 of each item", () => dispatch({ type: "devAddItems", count: 10 })],
    ["Skip 1 hour away", () => simulateAway(3600)],
    ["Unlock all achievements", () => dispatch({ type: "devUnlockAll" })],
    ["+20 Care Coins", () => dispatch({ type: "devAddCoins", count: 20 })],
    ["Call a patient", () => dispatch({ type: "patientArrives", id: SICK_PATIENTS[Math.floor(Math.random() * SICK_PATIENTS.length)].id, next: Date.now() + 60_000 })],
    ["+1 rebirth", () => dispatch({ type: "devRebirth" })],
    ["+10 Natal Gems", () => dispatch({ type: "claimPromo", hash: `dev-${Date.now()}`, rewards: [{ kind: "gems", amount: 10 }] })],
    ["Walk 500 m", () => walk(REWARD_EVERY_M)],
    ["Walk to 8 km", () => walk(DAILY_CAP_M)],
    ["Flying heart now", () => devSignal("heart") || note("Open the medkit page", "The heart flies over the medkit page.")],
    ["Ambulance now", () => devSignal("ambulance") || note("Open the hospital page", "Swipe to the hospital outside, then try again.")],
    ["Daily gift again", () => dispatch({ type: "devPatch", patch: { daily: { ...store.get().daily, last: dayKey(Date.now() - 86_400_000) } } })],
    ["Max Gem upgrades", () => dispatch({ type: "devPatch", patch: { gemUpgrades: maxLevels } })],
    ["Reset Gem upgrades", () => dispatch({ type: "devPatch", patch: { gemUpgrades: {} } })],
    ["Skip 8 hours away", () => simulateAway(8 * 3600)],
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

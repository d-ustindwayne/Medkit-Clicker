import { Text, View } from "react-native";

import { PixelButton } from "@/components/ui/pixel-button";
import { useGameActions, useGameState } from "@/hooks/use-game";

/** Shortcuts for testing late-game content. Only rendered in development builds. */
export function DevTools() {
  const { dispatch, simulateAway } = useGameActions();
  const { healed } = useGameState();

  const buttons: [label: string, onPress: () => void][] = [
    ["+1 million", () => dispatch({ type: "earn", amount: 1e6 })],
    ["+1 billion", () => dispatch({ type: "earn", amount: 1e9 })],
    ["×1000 patients", () => dispatch({ type: "earn", amount: Math.max(1000, healed * 999) })],
    ["+10 of each item", () => dispatch({ type: "devAddItems", count: 10 })],
    ["Skip 1 hour away", () => simulateAway(3600)],
    ["Unlock all achievements", () => dispatch({ type: "devUnlockAll" })],
  ];

  return (
    <View className="gap-2 border-[1.5px] border-dashed border-outline p-3">
      <Text className="font-pixel text-sm tracking-[2px] text-ink">DEV TOOLS</Text>
      <Text className="font-body text-xs text-ink opacity-70">Only visible in development builds.</Text>
      <View className="flex-row flex-wrap gap-2">
        {buttons.map(([label, onPress]) => (
          <PixelButton key={label} label={label} onPress={onPress} tone="accent" />
        ))}
      </View>
    </View>
  );
}

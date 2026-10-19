import { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { PixelButton } from "@/components/ui/pixel-button";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { sectionForCode } from "@/lib/codes";

/** Enter a code to unlock a hidden section. Codes are checked by hash; see src/constants/rewards.ts. */
export function RedeemPage({ onUnlocked }: { onUnlocked: (sectionId: string) => void }) {
  const { unlockedSections } = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const palette = usePalette();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setChecking(true);
    setError(null);
    try {
      const section = await sectionForCode(code);
      if (!section) {
        setError("That code didn't match anything. Check the spelling and try again.");
        return;
      }
      if (!unlockedSections.includes(section.id)) {
        dispatch({ type: "unlockSection", id: section.id });
        pushToast({ kind: "info", title: "Unlocked", body: `${section.title} is now in the menu.` });
      }
      setCode("");
      onUnlocked(section.id);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View className="gap-4">
      <Text className="font-body text-base leading-6 text-ink">Got a secret code? Enter it here to unlock something special.</Text>
      <TextInput
        accessibilityLabel="Code"
        value={code}
        onChangeText={(t) => {
          setCode(t);
          setError(null);
        }}
        onSubmitEditing={submit}
        placeholder="Enter code"
        placeholderTextColor={`${palette.ink}80`}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="done"
        className="min-h-12 border-2 border-outline bg-surface px-3 font-rounded text-lg tracking-[2px] text-ink"
      />
      {error && <Text className="font-body text-sm text-danger">{error}</Text>}
      <PixelButton tone="success" onPress={submit} disabled={!code.trim() || checking} accessibilityLabel="Unlock">
        {checking ? <ActivityIndicator color={palette.ink} /> : <Text className="font-rounded text-base text-ink">Unlock</Text>}
      </PixelButton>
    </View>
  );
}

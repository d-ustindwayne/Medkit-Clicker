import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { PixelButton } from "@/components/ui/pixel-button";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { useMusic } from "@/hooks/use-audio";
import { cloudEnabled, unlockOnline, wakeServer } from "@/lib/cloud";
import { sectionForCode } from "@/lib/codes";
import { REWARD_SECTIONS } from "@/constants/rewards";

/** Enter a code to unlock a hidden section. Codes are checked by hash; see src/constants/rewards.ts. */
export function RedeemPage({ onUnlocked }: { onUnlocked: (sectionId: string) => void }) {
  const { unlockedSections } = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const palette = usePalette();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const music = useMusic();
  // Wake the server while the code is being typed; show a note if it's still slow.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    wakeServer();
  }, []);
  useEffect(() => {
    if (!checking) return;
    const id = setTimeout(() => setSlow(true), 3000);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [checking]);

  const submit = async () => {
    setChecking(true);
    setError(null);
    try {
      // The server is the source of truth; the local hash check covers offline and server-less builds.
      let online = false;
      let section = null;
      if (cloudEnabled) {
        try {
          const res = await unlockOnline(code);
          section = res ? (REWARD_SECTIONS.find((s) => s.id === res.section) ?? null) : null;
          online = !!res;
        } catch {
          // offline or server down: fall through to the local check
        }
      }
      section ??= await sectionForCode(code);
      if (!section) {
        setError("That code didn't match anything. Check the spelling and try again.");
        return;
      }
      if (!unlockedSections.includes(section.id)) {
        dispatch({ type: "unlockSection", id: section.id });
        pushToast({ kind: "info", title: "Unlocked", body: `${section.title} is now in the menu.` });
      }
      setCode("");
      if (online) {
        pushToast({ kind: "info", title: "Downloading your music", body: "Your playlists are on their way. They'll show up in Settings." });
        music.fetchMusic();
      }
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
      {checking && slow && <Text className="font-body text-sm text-ink opacity-70">Waking up the server. The first check after a break can take up to a minute.</Text>}
      <PixelButton tone="success" onPress={submit} disabled={!code.trim() || checking} accessibilityLabel="Unlock">
        {checking ? <ActivityIndicator color={palette.ink} /> : <Text className="font-rounded text-base text-ink">Unlock</Text>}
      </PixelButton>
    </View>
  );
}

import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { PixelButton } from "@/components/ui/pixel-button";
import { useMusic } from "@/hooks/use-audio";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { OFFLINE_MESSAGE, claimPromoOnline, cloudEnabled, isOffline, savePendingCode, unlockOnline, wakeServer } from "@/lib/cloud";
import { formatCount } from "@/lib/format";
import { codeHash, isDevCode, sectionForCode } from "@/lib/codes";
import { BACKGROUNDS } from "@/constants/backgrounds";
import { REWARD_SECTIONS } from "@/constants/rewards";
import type { PromoItem } from "@/lib/game";

/** "+20 Care Coins, Purple Rain background" */
const describe = (rewards: PromoItem[]) =>
  rewards
    .map((r) => {
      if (r.kind === "background") return `${BACKGROUNDS.find((b) => b.id === r.id)?.name ?? "A new"} background`;
      if (r.kind === "seconds") return `${r.amount} seconds of patients`;
      return `+${formatCount(r.amount)} ${r.kind === "medkits" ? "patients" : r.kind === "coins" ? "Care Coins" : "Natal Gems"}`;
    })
    .join(", ");

/** Enter a code to unlock a hidden section. Codes are checked by hash; see src/constants/rewards.ts. */
export function RedeemPage({ onUnlocked }: { onUnlocked: (sectionId: string) => void }) {
  const { unlockedSections, promoClaims } = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const palette = usePalette();
  const music = useMusic();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      // 1. The developer code turns on Dev Tools (in Settings).
      if (await isDevCode(code)) {
        dispatch({ type: "unlockDevTools" });
        pushToast({ kind: "info", title: "Developer tools on", body: "Find them at the bottom of Settings." });
        setCode("");
        return;
      }
      // 2. A reward section's code. The server is the source of truth; the local hash check covers
      // offline and server-less builds.
      let section = null;
      let online = false;
      let unreachable = false;
      if (cloudEnabled) {
        try {
          const res = await unlockOnline(code);
          section = res ? (REWARD_SECTIONS.find((s) => s.id === res.section) ?? null) : null;
          online = !!res;
        } catch {
          // offline or server down: fall through to the local check
          unreachable = true;
        }
      }
      section ??= await sectionForCode(code);
      if (!section) {
        // 3. A promo code released later: patients, Care Coins, gems, backgrounds or a mix, once per phone.
        const hash = await codeHash(code);
        if (promoClaims.includes(hash)) return setError("You've already used that code on this phone.");
        // Promo codes are only checked online.
        if (unreachable) return setError(OFFLINE_MESSAGE);
        let reward = null;
        try {
          reward = cloudEnabled ? await claimPromoOnline(code) : null;
        } catch (e) {
          return setError(isOffline(e) ? OFFLINE_MESSAGE : e instanceof Error ? e.message : "Couldn't check the code. Try again in a minute.");
        }
        if (!reward) {
          setError("That code didn't match anything. Check the spelling and try again.");
          return;
        }
        const rewards: PromoItem[] = reward.rewards ?? (reward.kind === "bundle" ? [] : [{ kind: reward.kind, amount: reward.amount }]);
        dispatch({ type: "claimPromo", hash, rewards });
        const unlocked = rewards.some((r) => r.kind === "background") ? " Pick the background in Settings." : "";
        pushToast({ kind: "info", title: "Code redeemed", body: `${reward.message ? `${reward.message} ` : ""}${describe(rewards)}.${unlocked}` });
        setCode("");
        return;
      }
      if (!unlockedSections.includes(section.id)) {
        dispatch({ type: "unlockSection", id: section.id });
        pushToast({ kind: "info", title: "Unlocked", body: `${section.title} is now in the menu.` });
      }
      setCode("");
      if (cloudEnabled && unreachable) {
        // Unlocked from the local check: the server part (music, synced rewards) finishes once online.
        await savePendingCode(code);
        pushToast({ kind: "info", title: "Unlocked offline", body: "Your music and rewards will finish setting up the next time you're online." });
      }
      if (online) {
        // Her playlists download in the background and show up in Settings.
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
      <Text className="font-body text-base leading-6 text-ink">Got a code? Enter it here to unlock something special.</Text>
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

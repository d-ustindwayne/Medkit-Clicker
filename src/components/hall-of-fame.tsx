import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { GEM } from "@/constants/rebirth";
import { themeVars } from "@/constants/theme";
import { useGameActions, useGameSelector, useSettings } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { cloudEnabled, sendHallOfFame } from "@/lib/cloud";

export const FAME_REBIRTHS = 50;

/** Rebirth 50: a prompt asking for a name, an email and feedback, saved on the server. */
export function HallOfFame() {
  const { rebirths, fame } = useGameSelector((s) => ({ rebirths: s.rebirths, fame: s.fame }));
  const { dispatch, pushToast } = useGameActions();
  const { theme } = useSettings();
  const palette = usePalette();
  const [later, setLater] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (rebirths < FAME_REBIRTHS || fame !== "none" || later || !cloudEnabled) return null;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await sendHallOfFame({ name, email, feedback, rebirths });
      dispatch({ type: "setFame", fame: "sent" });
      pushToast({ kind: "info", title: "Thank you!", body: "You're in the Medkit Clicker hall of fame.", image: GEM.image });
    } catch (e) {
      if ((e as { status?: number }).status === 409) dispatch({ type: "setFame", fame: "sent" });
      else setError(e instanceof Error ? e.message : "Couldn't send. Try again in a minute.");
    } finally {
      setSending(false);
    }
  };
  const field = "min-h-11 border-2 border-outline bg-surface px-3 font-rounded text-base text-ink";
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => setLater(true)}>
      <View style={themeVars[theme]} className="flex-1 items-center justify-center p-6">
        <View className="absolute inset-0 bg-black/60" />
        <HardShadow offset={6} className="w-full max-w-sm">
          <ScrollView className="max-h-[560px] border-2 border-outline bg-surface" contentContainerClassName="gap-3 p-5" keyboardShouldPersistTaps="handled">
            <View className="items-center gap-1">
              <Image source={GEM.image} style={{ width: 48, height: 48 }} contentFit="contain" />
              <Text accessibilityRole="header" className="text-center font-display text-xl text-ink">
                {FAME_REBIRTHS} rebirths!
              </Text>
              <Text className="text-center font-body text-sm leading-5 text-ink">
                {"You've grown the Grand Haven Medical Center. Leave your name for the hall of fame, and tell us what you think."}
              </Text>
            </View>
            <TextInput accessibilityLabel="Name" value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={`${palette.ink}80`} maxLength={60} className={field} />
            <TextInput accessibilityLabel="Email (optional)" value={email} onChangeText={setEmail} placeholder="Email (optional)" placeholderTextColor={`${palette.ink}80`} maxLength={120} autoCapitalize="none" keyboardType="email-address" className={field} />
            <TextInput
              accessibilityLabel="Feedback"
              value={feedback}
              onChangeText={setFeedback}
              placeholder="What did you like? What should change?"
              placeholderTextColor={`${palette.ink}80`}
              maxLength={2000}
              multiline
              textAlignVertical="top"
              className={`${field} min-h-24 py-2`}
            />
            {error && <Text className="font-body text-xs text-danger">{error}</Text>}
            <PixelButton tone="success" label={sending ? "Sending..." : "Send"} disabled={sending || !name.trim()} onPress={send} />
            <View className="flex-row gap-3">
              <PixelButton label="Not now" className="flex-1" onPress={() => setLater(true)} />
              <PixelButton label="No thanks" className="flex-1" onPress={() => dispatch({ type: "setFame", fame: "declined" })} />
            </View>
          </ScrollView>
        </HardShadow>
      </View>
    </Modal>
  );
}

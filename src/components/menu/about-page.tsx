import { useState } from "react";
import { Image } from "@/components/ui/image";
import Constants from "expo-constants";
import { Linking, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { APP_INFO, CREDIT } from "@/constants/app";
import { HOSPITAL_IMAGE, MEDKIT_IMAGE } from "@/constants/items";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { formatCount, formatDuration } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b-2 border-outline/20 py-1.5">
      <Text className="font-body text-sm text-ink">{label}</Text>
      <Text className="font-number text-base leading-5 text-ink">{value}</Text>
    </View>
  );
}

const CODE_TAPS = 5;

/**
 * The About icon hides a few things. The first tap: the hospital spins away and the medkit pops out
 * (an achievement). Keep tapping and code entry unlocks at five taps; after that, one tap opens it.
 */
export function AboutPage({ onSecret }: { onSecret?: () => void }) {
  const s = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  // The transform counts as the first tap.
  const [taps, setTaps] = useState(s.aboutMedkit ? 1 : 0);
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }, { scale: pop.get() }] }));

  const tapIcon = () => {
    if (s.codeEntry) return onSecret?.();
    const n = taps + 1;
    setTaps(n);
    haptic.tap();
    if (!s.aboutMedkit) {
      // Poof: spin and shrink away, swap to the medkit, then bounce back in.
      playSfx("buy");
      spin.set(withTiming(360, { duration: 380, easing: Easing.in(Easing.cubic) }));
      pop.set(withSequence(withTiming(0, { duration: 380, easing: Easing.in(Easing.back(2)) }), withSpring(1, { damping: 6, stiffness: 220 })));
      setTimeout(() => dispatch({ type: "revealAboutMedkit" }), 380);
      return;
    }
    pop.set(withSequence(withTiming(1.15, { duration: 80 }), withSpring(1, { damping: 7, stiffness: 300 })));
    if (n >= CODE_TAPS) {
      dispatch({ type: "unlockCodeEntry" });
      playSfx("buy");
      pushToast({ kind: "info", title: "Code entry unlocked", body: "Tap the medkit here any time to enter a code." });
      onSecret?.();
    } else if (n >= 2) {
      playSfx("click");
      const left = CODE_TAPS - n;
      pushToast({ kind: "info", title: "Keep going...", body: `${left} more ${left === 1 ? "tap" : "taps"} to unlock code entry.` });
    }
  };
  return (
    <View className="gap-5">
      <View className="items-center gap-2">
        <Pressable onPress={tapIcon} accessibilityRole={s.codeEntry ? "button" : undefined} accessibilityLabel={s.codeEntry ? "Enter a code" : undefined} accessible={s.codeEntry}>
          <Animated.View style={iconStyle}>
            <Image source={s.aboutMedkit ? MEDKIT_IMAGE : HOSPITAL_IMAGE} style={{ width: 72, height: 72 }} contentFit="contain" />
          </Animated.View>
        </Pressable>
        <Text className="font-display text-xl text-ink">{APP_INFO.name}</Text>
        <Text className="font-body text-xs text-ink opacity-70">Version {Constants.expoConfig?.version ?? "0.7.5"}</Text>
      </View>

      <Text className="font-body text-base leading-6 text-ink">
        Tap the medkit to heal patients. Spend them in the shop on supplies that keep healing for you. Your progress saves on
        its own, and your team keeps working for up to 4 hours while the app is closed.
      </Text>
      <View className="flex-row gap-3">
        <PixelButton label="How to play" onPress={() => dispatch({ type: "setIntroSeen", seen: false })} className="flex-1" />
        <PixelButton label="Visit website" onPress={() => Linking.openURL(APP_INFO.website)} className="flex-1" />
      </View>

      <HardShadow offset={5}>
      <View className="border-2 border-outline bg-surface px-3 py-1">
        <Stat label="Patients healed, all time" value={formatCount(s.totalHealed)} />
        <Stat label="Medkit taps" value={formatCount(s.taps)} />
        <Stat label="Ward patients treated" value={formatCount(s.treated)} />
        <Stat label="Rebirths" value={formatCount(s.rebirths)} />
        <Stat label="Time played" value={formatDuration(s.playSeconds)} />
        <Stat label="Playing since" value={new Date(s.startedAt).toLocaleDateString()} />
      </View>
      </HardShadow>

      <Text className="font-body text-sm leading-5 text-ink">
        {CREDIT} Code released under the {APP_INFO.license}. Original soundtrack made in BeepBox.
      </Text>
    </View>
  );
}

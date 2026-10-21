import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Modal, Text, View, type ImageSourcePropType } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { COIN } from "@/constants/boosts";
import { MEDKIT_IMAGE, SHOP_ITEMS } from "@/constants/items";
import { GEM } from "@/constants/rebirth";
import { themeVars } from "@/constants/theme";
import { useGameActions, useGameReady, useGameSelector, useSettings } from "@/hooks/use-game";

/** How to play, one idea per step. */
const STEPS: { title: string; body: string; image: ImageSourcePropType }[] = [
  { title: "Tap the medkit", body: "Every tap heals patients. The big number at the top is how many you've healed.", image: MEDKIT_IMAGE },
  {
    title: "Stock up on supplies",
    body: "Spend patients in the shop below. Supplies keep healing for you every second, even for up to 4 hours while the app is closed. Drag the shop's top edge up for a longer list.",
    image: SHOP_ITEMS[1].image,
  },
  {
    title: "My Room",
    body: "Swipe the medkit sideways to reach My Room. Decorate it for small bonuses, and treat the patients who turn up with a quick minigame.",
    image: require("@/imgs/misc/decorate.png"),
  },
  { title: "Care Coins", body: "Achievements pay Care Coins. Spend them on boosts in the shop's Boosts tab.", image: COIN.image },
  {
    title: "Grow the hospital",
    body: `Swipe the shop over to see your hospital. Once you've healed enough, rebirth there for a ${GEM.one} and a permanent healing boost.`,
    image: GEM.image,
  },
];

/** A short how-to-play shown on the first launch (and again from About). */
export function Intro() {
  const seen = useGameSelector((s) => s.introSeen);
  const ready = useGameReady();
  const { dispatch } = useGameActions();
  const { theme } = useSettings();
  const [step, setStep] = useState(0);
  if (!ready || seen) return null;

  const close = () => {
    setStep(0);
    dispatch({ type: "setIntroSeen", seen: true });
  };
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      {/* Modals render outside the themed root, so re-apply the theme variables. */}
      <View style={themeVars[theme]} className="flex-1 items-center justify-center p-6">
        <View className="absolute inset-0 bg-black/60" />
        <HardShadow offset={6} className="w-full max-w-sm">
          <View accessibilityViewIsModal className="items-center gap-4 border-2 border-outline bg-surface p-5">
            <Text className="font-pixel text-xs tracking-[2px] text-primary">
              HOW TO PLAY · {step + 1}/{STEPS.length}
            </Text>
            <Image source={s.image} style={{ width: 72, height: 72 }} contentFit="contain" />
            <Text accessibilityRole="header" className="text-center font-display text-xl text-ink">
              {s.title}
            </Text>
            <Text className="text-center font-body text-base leading-6 text-ink">{s.body}</Text>
            <View className="flex-row gap-2" accessibilityElementsHidden>
              {STEPS.map((x, i) => (
                <View key={x.title} className={`h-2.5 border-[1.5px] border-outline ${i === step ? "w-7 bg-ink" : "w-2.5 bg-surface"}`} />
              ))}
            </View>
            <View className="w-full flex-row gap-3">
              <PixelButton label={step === 0 ? "Skip" : "Back"} onPress={step === 0 ? close : () => setStep(step - 1)} className="flex-1" />
              <PixelButton label={last ? "Let's go!" : "Next"} tone="success" onPress={last ? close : () => setStep(step + 1)} className="flex-1" />
            </View>
          </View>
        </HardShadow>
      </View>
    </Modal>
  );
}

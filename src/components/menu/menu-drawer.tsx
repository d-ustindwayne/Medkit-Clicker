import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, SlideInLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FAME_REBIRTHS } from "@/components/hall-of-fame";
import { AboutPage } from "@/components/menu/about-page";
import { AchievementsPage } from "@/components/menu/achievements-page";
import { RedeemPage } from "@/components/menu/redeem-page";
import { RewardsPage } from "@/components/menu/rewards-page";
import { SettingsPage } from "@/components/menu/settings-page";
import { ToastStack } from "@/components/toast-stack";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { visibleAchievements } from "@/constants/achievements";
import { APP_INFO } from "@/constants/app";
import { REWARD_SECTIONS } from "@/constants/rewards";
import { themeVars } from "@/constants/theme";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameState, useSettings } from "@/hooks/use-game";

type Page = "menu" | "achievements" | "settings" | "about" | "redeem" | `rewards:${string}`;

const TITLES: Record<string, string> = {
  menu: "MENU",
  achievements: "AWARDS",
  settings: "SETTINGS",
  about: "ABOUT",
  redeem: "CODE",
};
const titleFor = (page: Page) => (page.startsWith("rewards:") ? "REWARDS" : TITLES[page]);

function MenuLink({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  const { playSfx } = useAudio();
  return (
    <HardShadow>
      <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        playSfx("click");
        onPress();
      }}
      className="min-h-14 flex-row items-center justify-between border-2 border-outline bg-surface px-4 active:translate-x-0.5 active:translate-y-0.5"
      >
        <Text className="font-display text-lg text-ink">{label}</Text>
        {detail && <Text className="font-number text-base text-ink opacity-70">{detail}</Text>}
      </Pressable>
    </HardShadow>
  );
}

export function MenuDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [page, setPage] = useState<Page>("menu");
  const { theme } = useSettings();
  const { achievements, unlockedSections, rebirths, fame } = useGameState();
  const visible = visibleAchievements(unlockedSections);
  const { dispatch } = useGameActions();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const close = () => {
    onClose();
    setPage("menu");
  };

  return (
    <Modal transparent statusBarTranslucent navigationBarTranslucent visible={visible} animationType="none" onRequestClose={() => (page === "menu" ? close() : setPage("menu"))}>
      <View style={themeVars[theme]} className="flex-1 flex-row">
        <Animated.View entering={FadeIn.duration(150)} style={StyleSheet.absoluteFill}>
          <Pressable accessibilityLabel="Close menu" onPress={close} className="flex-1 bg-black/50" />
        </Animated.View>

        <Animated.View entering={SlideInLeft.duration(220)} accessibilityViewIsModal style={{ width: Math.min(400, width * 0.88), height: "100%" }}>
          <View className="flex-1 border-r-[3px] border-outline bg-backdrop" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="flex-row items-center gap-3 bg-primary px-4 py-4">
            <PixelButton
              accessibilityLabel={page === "menu" ? "Close menu" : "Back to menu"}
              onPress={page === "menu" ? close : () => setPage("menu")}
              className="w-11"
            >
              <PixelIcon name={page === "menu" ? "close" : "left"} size={16} />
            </PixelButton>
            <Text accessibilityRole="header" className="flex-1 font-pixel text-3xl tracking-[4px] text-ink">
              {titleFor(page)}
            </Text>
          </View>

          <ScrollView contentContainerClassName="gap-3 p-4">
            {page === "menu" && (
              <>
                {REWARD_SECTIONS.filter((s) => unlockedSections.includes(s.id)).map((s) => (
                  <MenuLink key={s.id} label={s.title} onPress={() => setPage(`rewards:${s.id}`)} />
                ))}
                <MenuLink label="Achievements" detail={`${visible.filter((a) => achievements[a.id] !== undefined).length}/${visible.length}`} onPress={() => setPage("achievements")} />
                <MenuLink label="Settings" onPress={() => setPage("settings")} />
                <MenuLink label="Visit website" onPress={() => Linking.openURL(APP_INFO.website)} />
                <MenuLink label="About" onPress={() => setPage("about")} />
                {rebirths >= FAME_REBIRTHS && fame !== "sent" && (
                  <MenuLink
                    label="Hall of Fame"
                    onPress={() => {
                      dispatch({ type: "setFame", fame: "none" });
                      close();
                    }}
                  />
                )}
              </>
            )}
            {page === "achievements" && <AchievementsPage />}
            {page === "settings" && <SettingsPage onDone={close} />}
            {page === "about" && <AboutPage onSecret={() => setPage("redeem")} />}
            {page === "redeem" && <RedeemPage onUnlocked={(id) => setPage(`rewards:${id}`)} />}
            {page.startsWith("rewards:") && <RewardsPage sectionId={page.slice("rewards:".length)} />}
          </ScrollView>

          <Text className="px-4 pb-3 pt-2 font-body text-xs text-ink opacity-70">
            © {APP_INFO.year} {APP_INFO.author}. {APP_INFO.license}.
          </Text>
          </View>
        </Animated.View>
        {/* The modal covers the game screen's toasts, so show them here too. */}
        <ToastStack />
      </View>
    </Modal>
  );
}

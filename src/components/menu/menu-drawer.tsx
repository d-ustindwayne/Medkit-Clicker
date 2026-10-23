import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
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
import { REWARD_SECTIONS, openSections } from "@/constants/rewards";
import { themeVars } from "@/constants/theme";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameSelector, useSettings } from "@/hooks/use-game";
import { useNow } from "@/hooks/use-now";

/** How long the drawer takes to slide in, and back out. */
const SLIDE_IN_MS = 220;
const SLIDE_OUT_MS = 200;

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
  // Pages opened from other pages stack up, so Back returns to the one before (About -> Code -> Rewards).
  const [history, setHistory] = useState<Page[]>(["menu"]);
  const page = history[history.length - 1];
  const setPage = (next: Page) => setHistory((h) => [...h, next]);
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const { theme } = useSettings();
  // A slice, not the whole state: the drawer is always mounted and shouldn't redraw on every tick.
  const { achievements, unlockedSections, rebirths, fame } = useGameSelector((s) => ({ achievements: s.achievements, unlockedSections: s.unlockedSections, rebirths: s.rebirths, fame: s.fame }));
  // Achievements stay listed after a section ends; its rewards page doesn't.
  const shownAch = visibleAchievements(unlockedSections);
  const open = openSections(unlockedSections, useNow(60_000));
  const { dispatch } = useGameActions();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const close = () => onClose();
  const drawerW = Math.min(400, width * 0.88);
  // The Modal stays up after `visible` turns false until the drawer has slid back out (closing the
  // Modal at once would make it vanish). It opens back on the menu page.
  const [shown, setShown] = useState(visible);
  if (visible && !shown) setShown(true);
  const slide = useSharedValue(0);
  useEffect(() => {
    if (!shown) return;
    slide.set(withTiming(visible ? 1 : 0, { duration: visible ? SLIDE_IN_MS : SLIDE_OUT_MS, easing: Easing.out(Easing.cubic) }));
    if (visible) return;
    const t = setTimeout(() => {
      setShown(false);
      setHistory(["menu"]);
    }, SLIDE_OUT_MS);
    return () => clearTimeout(t);
  }, [visible, shown, slide]);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: slide.get() }));
  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (slide.get() - 1) * drawerW }] }));

  return (
    <Modal transparent statusBarTranslucent navigationBarTranslucent visible={shown} animationType="none" onRequestClose={() => (page === "menu" ? close() : back())}>
      <View style={themeVars[theme]} className="flex-1 flex-row">
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable accessibilityLabel="Close menu" onPress={close} className="flex-1 bg-black/50" />
        </Animated.View>

        <Animated.View accessibilityViewIsModal style={[{ width: drawerW, height: "100%" }, drawerStyle]}>
          <View className="flex-1 border-r-[3px] border-outline bg-backdrop" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="flex-row items-center gap-3 bg-primary px-4 py-4">
            <PixelButton
              accessibilityLabel={page === "menu" ? "Close menu" : "Back"}
              onPress={page === "menu" ? close : back}
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
                {REWARD_SECTIONS.filter((s) => open.includes(s.id)).map((s) => (
                  <MenuLink key={s.id} label={s.title} onPress={() => setPage(`rewards:${s.id}`)} />
                ))}
                <MenuLink label="Achievements" detail={`${shownAch.filter((a) => achievements[a.id] !== undefined).length}/${shownAch.length}`} onPress={() => setPage("achievements")} />
                <MenuLink label="Settings" onPress={() => setPage("settings")} />
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

import "@/global.css";

import { useCallback } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { themeVars } from "@/constants/theme";
import { AudioProvider } from "@/hooks/use-audio";
import { GameProvider, useSettings } from "@/hooks/use-game";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web on a computer: text is a little bigger (112.5%), so it reads well on a large screen. The styles
// are in rem, so spacing grows with it; art and pixel sizes don't.
// It also plays like the app: a mouse drag never selects text or picks up a picture (which broke
// swiping between pages), and a long press doesn't open the image menu. Text boxes stay selectable.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = [
    "@media (min-width: 1024px) { html { font-size: 112.5%; } }",
    "html, body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }",
    "input, textarea { -webkit-user-select: text; user-select: text; }",
    "img { -webkit-user-drag: none; }",
  ].join(" ");
  document.head.appendChild(style);
  // Firefox ignores -webkit-user-drag.
  window.addEventListener("dragstart", (e) => e.preventDefault(), true);
}

function ThemedRoot() {
  const { theme } = useSettings();
  return (
    <View style={themeVars[theme]} className="flex-1 bg-backdrop">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Silkscreen: require("@/fonts/slkscr.ttf"),
    Mallanna: require("@/fonts/mallanna-regular.min.ttf"),
    "Inter-Bold": require("@/fonts/inter_24pt-bold.min.ttf"),
    "Nunito-Bold": require("@/fonts/nunito-bold.min.ttf"),
    "Nunito-Regular": require("@/fonts/nunito-regular.min.ttf"),
  });
  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GameProvider onReady={hideSplash}>
        <AudioProvider>
          <ThemedRoot />
        </AudioProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}

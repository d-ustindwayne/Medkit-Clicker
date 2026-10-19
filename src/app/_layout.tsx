import "@/global.css";

import { useCallback } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { themeVars } from "@/constants/theme";
import { AudioProvider } from "@/hooks/use-audio";
import { GameProvider, useSettings } from "@/hooks/use-game";

SplashScreen.preventAutoHideAsync().catch(() => {});

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
    Mallanna: require("@/fonts/mallanna-regular.ttf"),
    "Inter-Bold": require("@/fonts/inter_24pt-bold.ttf"),
    "Nunito-Bold": require("@/fonts/nunito-bold.ttf"),
    "Nunito-Regular": require("@/fonts/nunito-regular.ttf"),
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

import { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackgroundPattern } from "@/components/background-pattern";
import { MedkitButton, ORBIT_SCALE } from "@/components/medkit-button";
import { MenuDrawer } from "@/components/menu/menu-drawer";
import { ScenePage } from "@/components/scene-page";
import { Shop } from "@/components/shop";
import { HardShadow } from "@/components/ui/hard-shadow";
import { Pager } from "@/components/ui/pager";
import { ToastStack } from "@/components/toast-stack";
import { healingRate } from "@/constants/rebirth";
import { HOSPITAL_SCENE } from "@/constants/scenes";
import { useAudio } from "@/hooks/use-audio";
import { useGameState, useSettings } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { formatCount, formatRate } from "@/lib/format";
import { tapValue } from "@/lib/game";

/** Above this width the shop sits beside the medkit (PC & tablet view). */
const WIDE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 380;

function MenuButton({ onPress }: { onPress: () => void }) {
  const { playSfx, unlock } = useAudio();
  return (
    <HardShadow>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        onPress={() => {
          unlock();
          playSfx("click");
          onPress();
        }}
        className="h-12 w-12 items-center justify-center gap-1.5 border-2 border-outline bg-surface active:translate-x-0.5 active:translate-y-0.5"
      >
        {[0, 1, 2].map((i) => (
          <View key={i} className="h-1 w-6 bg-ink" />
        ))}
      </Pressable>
    </HardShadow>
  );
}

function Counter({ compact }: { compact: boolean }) {
  const { healed, owned, rebirths } = useGameState();
  const palette = usePalette();
  const rate = healingRate({ owned, rebirths });
  const label = `${Math.floor(healed) === 1 ? "Patient" : "Patients"} Healed`;
  // Hard pixel drop shadow; NativeWind has no text-shadow utilities.
  const shadow = { textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0.1 };
  return (
    // Wide layouts pad past the menu button so long numbers never run under it.
    <View className={`items-center ${compact ? "px-6" : "px-20"}`} accessibilityLiveRegion="none">
      {compact ? (
        <View accessibilityRole="header" className="items-center">
          <Text className="text-center font-display text-5xl text-ink" style={shadow} adjustsFontSizeToFit numberOfLines={1}>
            {formatCount(healed)}
          </Text>
          <Text className="text-center font-display text-xl text-ink">{label}</Text>
        </View>
      ) : (
        <Text accessibilityRole="header" className="text-center font-display text-5xl text-ink" style={shadow} numberOfLines={2} adjustsFontSizeToFit>
          {formatCount(healed)} {label}
        </Text>
      )}
      <View className="mt-2 flex-row items-center gap-2">
        <View className="rounded-full border-[1.5px] border-outline bg-surface px-4 py-1">
          <Text className={`text-center font-display text-ink ${compact ? "text-sm" : "text-lg"}`}>
            {formatRate(rate)} {rate === 1 ? "Medkit" : "Medkits"} per second
          </Text>
        </View>
        {rebirths > 0 && (
          <View className="rounded-full border-[1.5px] border-outline bg-primary px-3 py-1" accessibilityLabel={`Rebirth ${rebirths}`}>
            <Text className={`font-pixel text-ink ${compact ? "text-xs" : "text-sm"}`}>R{rebirths}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Swipeable stage: the medkit, then the outside of the hospital. */
function Clicker({ width, height, compact }: { width: number; height: number; compact: boolean }) {
  const { owned, rebirths } = useGameState();
  // Leave room for the orbiting supplies around the medkit.
  const size = Math.min((width * (compact ? 0.72 : 0.55)) / ORBIT_SCALE, (height * (compact ? 0.52 : 0.58)) / ORBIT_SCALE, 420);

  return (
    <View className={`flex-1 items-center ${compact ? "pt-12" : "justify-center pt-4"}`}>
      <Counter compact={compact} />
      <Pager
        width={width}
        className="flex-1 pb-2"
        pages={[
          {
            key: "medkit",
            label: "Medkit",
            content: (
              <View className="flex-1 items-center justify-center">
                <MedkitButton size={size} tapAmount={tapValue({ owned, rebirths })} owned={owned} />
              </View>
            ),
          },
          { key: HOSPITAL_SCENE.id, label: HOSPITAL_SCENE.title, content: <ScenePage scene={HOSPITAL_SCENE} width={width} /> },
        ]}
      />
    </View>
  );
}

export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const wide = width >= WIDE_BREAKPOINT;
  const clickerWidth = wide ? width - SIDEBAR_WIDTH : width;
  const clickerHeight = wide ? height : height * 0.56;

  return (
    <View className={`flex-1 bg-backdrop ${wide ? "flex-row" : "flex-col"}`}>
      <View
        className="relative overflow-hidden"
        style={{ width: clickerWidth, height: clickerHeight, paddingTop: insets.top, paddingLeft: insets.left }}
      >
        <BackgroundPattern index={settings.background} theme={settings.theme} width={clickerWidth} height={clickerHeight} />
        <View className="absolute left-4 z-10" style={{ top: insets.top + 12 }}>
          <MenuButton onPress={() => setMenuOpen(true)} />
        </View>
        <Clicker width={clickerWidth} height={clickerHeight - insets.top} compact={!wide} />
      </View>

      <View
        className={wide ? "border-l-[3px] border-outline" : "flex-1 border-t-[3px] border-outline"}
        style={wide ? { width: SIDEBAR_WIDTH, paddingTop: insets.top, paddingRight: insets.right } : { paddingBottom: insets.bottom }}
      >
        <Shop compact={!wide} width={wide ? SIDEBAR_WIDTH : width} />
      </View>

      <ToastStack />
      <MenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

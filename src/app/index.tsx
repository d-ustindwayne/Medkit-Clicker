import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackgroundPattern } from "@/components/background-pattern";
import { CurrencyBar } from "@/components/currency-bar";
import { MedkitButton, ORBIT_SCALE } from "@/components/medkit-button";
import { MenuDrawer } from "@/components/menu/menu-drawer";
import { Shop } from "@/components/shop";
import { HardShadow } from "@/components/ui/hard-shadow";
import { Pager } from "@/components/ui/pager";
import { ToastStack } from "@/components/toast-stack";
import { RoomPage } from "@/components/room/room-page";
import { ownsBackground } from "@/constants/backgrounds";
import { BOOSTS, LUCKY_MULT } from "@/constants/boosts";
import { healingRate } from "@/constants/rebirth";
import { useAudio } from "@/hooks/use-audio";
import { useGameState, useSettings } from "@/hooks/use-game";
import { useNow } from "@/hooks/use-now";
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

/** Countdown chips for running boosts and Lucky Stethoscope taps. */
function ActiveBoosts() {
  const { boosts, luckyTaps } = useGameState();
  const now = useNow();
  const active = BOOSTS.filter((b) => (boosts[b.id] ?? 0) > now);
  if (active.length === 0 && luckyTaps === 0) return null;
  const left = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <View className="mt-1.5 flex-row flex-wrap justify-center gap-1.5">
      {active.map((b) => (
        <View key={b.id} className="flex-row items-center gap-1 rounded-full border-[1.5px] border-outline bg-accent px-2 py-0.5" accessibilityLabel={`${b.name} active`}>
          <Image source={b.image} style={{ width: 14, height: 14 }} contentFit="contain" />
          <Text className="font-number text-xs text-ink">{left(boosts[b.id] - now)}</Text>
        </View>
      ))}
      {luckyTaps > 0 && (
        <View className="flex-row items-center gap-1 rounded-full border-[1.5px] border-outline bg-accent px-2 py-0.5" accessibilityLabel={`${luckyTaps} lucky taps left`}>
          <Image source={BOOSTS.find((b) => b.effect.kind === "charges")!.image} style={{ width: 14, height: 14 }} contentFit="contain" />
          <Text className="font-number text-xs text-ink">x{LUCKY_MULT} · {luckyTaps}</Text>
        </View>
      )}
    </View>
  );
}

function Counter({ compact }: { compact: boolean }) {
  const { healed, owned, rebirths, boosts, room } = useGameState();
  const palette = usePalette();
  const rate = healingRate({ owned, rebirths, boosts, room });
  const label = `${Math.floor(healed) === 1 ? "Patient" : "Patients"} Healed`;
  // Hard pixel drop shadow; NativeWind has no text-shadow utilities.
  const shadow = { textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0.1 };
  return (
    // Side padding clears the menu button (left) and the currency chips (right).
    <View className={`items-center ${compact ? "px-20" : "px-24"}`} accessibilityLiveRegion="none">
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
      <ActiveBoosts />
    </View>
  );
}

/** The chosen background; an unbought paid one falls back to the default until it's bought. */
function Backdrop({ width, height }: { width: number; height: number }) {
  const settings = useSettings();
  const { ownedBackgrounds } = useGameState();
  const index = ownsBackground(settings.background, ownedBackgrounds) ? settings.background : 0;
  return <BackgroundPattern index={index} theme={settings.theme} width={width} height={height} />;
}

/** Swipeable stage: the medkit, then My Room. */
function Clicker({ width, height, compact }: { width: number; height: number; compact: boolean }) {
  const { owned, rebirths, boosts, luckyTaps, patient, room, gemUpgrades, medkitSkin, tapEffect } = useGameState();
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(0);
  // Leave room for the orbiting supplies around the medkit.
  const size = Math.min((width * (compact ? 0.72 : 0.55)) / ORBIT_SCALE, (height * (compact ? 0.52 : 0.58)) / ORBIT_SCALE, 420);

  return (
    <View className={`flex-1 items-center ${compact ? "pt-12" : "justify-center pt-4"}`}>
      {/* The counter belongs to the medkit; My Room gets the full height. */}
      {page === 0 && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Counter compact={compact} />
        </Animated.View>
      )}
      <Pager
        width={width}
        dots="overlay"
        scrollEnabled={!editing}
        onPageChange={setPage}
        className="flex-1"
        pages={[
          {
            key: "medkit",
            label: "Medkit",
            content: (
              <View className="flex-1 items-center justify-center">
                <MedkitButton size={size} tapAmount={tapValue({ owned, rebirths, boosts, luckyTaps, room, gemUpgrades })} owned={owned} skin={medkitSkin} effect={tapEffect} />
              </View>
            ),
          },
          {
            key: "room",
            label: patient ? "My Room, a patient is waiting" : "My Room",
            badge: !!patient,
            content: <RoomPage width={width} editing={editing} onEditingChange={setEditing} />,
          },
        ]}
      />
    </View>
  );
}

export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
        <Backdrop width={clickerWidth} height={clickerHeight} />
        <View className="absolute left-4 z-10" style={{ top: insets.top + 12 }}>
          <MenuButton onPress={() => setMenuOpen(true)} />
        </View>
        <View className="absolute right-3 z-10" style={{ top: insets.top + 12 }}>
          <CurrencyBar />
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

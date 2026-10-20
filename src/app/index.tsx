import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import { PanResponder, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
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
import { useGameSelector, useSettings } from "@/hooks/use-game";
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
  const { boosts, luckyTaps } = useGameSelector((s) => ({ boosts: s.boosts, luckyTaps: s.luckyTaps }));
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
  const { healed, owned, rebirths, boosts, room } = useGameSelector((s) => ({ healed: s.healed, owned: s.owned, rebirths: s.rebirths, boosts: s.boosts, room: s.room }));
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
  const ownedBackgrounds = useGameSelector((s) => s.ownedBackgrounds);
  const index = ownsBackground(settings.background, ownedBackgrounds) ? settings.background : 0;
  return <BackgroundPattern index={index} theme={settings.theme} width={width} height={height} />;
}

/** Swipeable stage: the medkit, then My Room. */
function Clicker({ width, height, compact }: { width: number; height: number; compact: boolean }) {
  // Only what the medkit area shows, so it doesn't redraw on every tick.
  const { owned, rebirths, boosts, luckyTaps, patient, room, gemUpgrades, medkitSkin, tapEffect } = useGameSelector((s) => ({
    owned: s.owned, rebirths: s.rebirths, boosts: s.boosts, luckyTaps: s.luckyTaps, patient: s.patient, room: s.room,
    gemUpgrades: s.gemUpgrades, medkitSkin: s.medkitSkin, tapEffect: s.tapEffect,
  }));
  const [editing, setEditing] = useState(false);
  // Leave room for the orbiting supplies around the medkit.
  const size = Math.min((width * (compact ? 0.72 : 0.55)) / ORBIT_SCALE, (height * (compact ? 0.52 : 0.58)) / ORBIT_SCALE, 420);

  return (
    <View className={`flex-1 items-center ${compact ? "pt-12" : "justify-center pt-4"}`}>
      {/* The counter stays while you swipe between the medkit and My Room, so progress is always in view. */}
      <Counter compact={compact} />
      <Pager
        width={width}
        dots="overlay"
        scrollEnabled={!editing}
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

/** Drag the shop's top edge up to give the shop more room (and down to give it back); a tap toggles. */
function ShopGrip({ expanded, onChange }: { expanded: boolean; onChange: (expanded: boolean) => void }) {
  // The responder is created once; it reads the latest values through this ref.
  const latest = useRef({ expanded, onChange });
  useEffect(() => {
    latest.current = { expanded, onChange };
  }, [expanded, onChange]);
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderRelease: (_, g) => {
        const { expanded: up, onChange: set } = latest.current;
        if (g.dy < -24) set(true);
        else if (g.dy > 24) set(false);
        else if (Math.abs(g.dy) < 6) set(!up);
      },
    }),
  );
  return (
    <View {...responder.panHandlers} accessibilityRole="button" accessibilityLabel={expanded ? "Shrink the shop" : "Expand the shop"} className="absolute left-0 right-0 top-0 z-20 h-6 items-center justify-center">
      <View className="h-1.5 w-12 rounded-full bg-ink/40" />
    </View>
  );
}

export default function GameScreen() {
  // Keep the phone awake while the game is open (idle games are watched, not tapped).
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const wide = width >= WIDE_BREAKPOINT;
  const clickerWidth = wide ? width - SIDEBAR_WIDTH : width;
  // Phones: the shop can be pulled up for a longer list; the medkit area shrinks to match.
  const [shopUp, setShopUp] = useState(false);
  const clickerHeight = wide ? height : height * (shopUp ? 0.36 : 0.56);
  const animatedHeight = useSharedValue(clickerHeight);
  useEffect(() => {
    animatedHeight.set(withTiming(clickerHeight, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [animatedHeight, clickerHeight]);
  const clickerStyle = useAnimatedStyle(() => ({ height: animatedHeight.get() }));

  return (
    <View className={`flex-1 bg-backdrop ${wide ? "flex-row" : "flex-col"}`}>
      <Animated.View style={[{ width: clickerWidth, paddingTop: insets.top, paddingLeft: insets.left, position: "relative", overflow: "hidden" }, clickerStyle]}>
        <Backdrop width={clickerWidth} height={clickerHeight} />
        <View className="absolute left-4 z-10" style={{ top: insets.top + 12 }}>
          <MenuButton onPress={() => setMenuOpen(true)} />
        </View>
        <View className="absolute right-3 z-10" style={{ top: insets.top + 12 }}>
          <CurrencyBar />
        </View>
        <Clicker width={clickerWidth} height={clickerHeight - insets.top} compact={!wide} />
      </Animated.View>

      <View
        className={wide ? "border-l-[3px] border-outline" : "flex-1 border-t-[3px] border-outline"}
        style={wide ? { width: SIDEBAR_WIDTH, paddingTop: insets.top, paddingRight: insets.right } : { paddingBottom: insets.bottom }}
      >
        {!wide && <ShopGrip expanded={shopUp} onChange={setShopUp} />}
        <Shop compact={!wide} width={wide ? SIDEBAR_WIDTH : width} />
      </View>

      <ToastStack />
      <MenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

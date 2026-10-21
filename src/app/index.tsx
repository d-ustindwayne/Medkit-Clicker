import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { useKeepAwake } from "expo-keep-awake";
import { AppState, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, Extrapolation, type SharedValue, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackgroundPattern } from "@/components/background-pattern";
import { CurrencyBar } from "@/components/currency-bar";
import { HallOfFame } from "@/components/hall-of-fame";
import { Intro } from "@/components/intro";
import { MedkitButton, ORBIT_SCALE } from "@/components/medkit-button";
import { MenuDrawer } from "@/components/menu/menu-drawer";
import { Shop } from "@/components/shop";
import { HardShadow } from "@/components/ui/hard-shadow";
import { Pager } from "@/components/ui/pager";
import { ToastStack } from "@/components/toast-stack";
import { RoomPage } from "@/components/room/room-page";
import { ownsBackground } from "@/constants/backgrounds";
import { GEM_ITEMS } from "@/constants/gems";
import { sectionOpen } from "@/constants/rewards";
import { BOOSTS, LUCKY_MULT } from "@/constants/boosts";
import { healingRate } from "@/constants/rebirth";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameSelector, useSettings } from "@/hooks/use-game";
import { appIcon, iconFromPending, setAppIcon } from "@/lib/app-icon";
import { askPhotosOnce } from "@/lib/stickers";
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
    // Side padding clears the menu button (left) and the currency chips (right). Drawn above the
    // pager, so the medkit's shine passes behind the text.
    <View className={`items-center ${compact ? "px-24" : "px-28"}`} style={{ zIndex: 1 }} accessibilityLiveRegion="none">
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

/** Swipeable stage: the medkit, then My Room. `onEditing` hears when decorating starts or stops. */
/** The shop's drag on phones: the medkit area's live height and its two resting heights. */
type ShopDrag = { value: SharedValue<number>; low: number; high: number; top: number };

function Clicker({ width, height, compact, shopUp, drag, onEditing }: { width: number; height: number; compact: boolean; shopUp: boolean; drag?: ShopDrag; onEditing: (on: boolean) => void }) {
  // Only what the medkit area shows, so it doesn't redraw on every tick.
  const { owned, rebirths, boosts, luckyTaps, waiting, room, gemUpgrades, medkitSkin: chosenSkin, tapEffect } = useGameSelector((s) => ({
    owned: s.owned, rebirths: s.rebirths, boosts: s.boosts, luckyTaps: s.luckyTaps, waiting: s.patients.length, room: s.room,
    gemUpgrades: s.gemUpgrades, medkitSkin: s.medkitSkin, tapEffect: s.tapEffect,
  }));
  // A skin from a code-locked section falls back to the original medkit once the section ends.
  const now = useNow(60_000);
  const skinSection = GEM_ITEMS.find((i) => i.id === chosenSkin)?.section;
  const medkitSkin = skinSection && !sectionOpen(skinSection, now) ? null : chosenSkin;
  const [editing, setEditingState] = useState(false);
  const setEditing = (on: boolean) => {
    setEditingState(on);
    onEditing(on);
  };
  // Leave room for the orbiting supplies around the medkit.
  // With the shop pulled up the counter steps aside, so the medkit can use the space it leaves.
  const showCounter = !editing && !shopUp;
  const fit = (h: number, share: number) => Math.min((width * (compact ? 0.72 : 0.55)) / ORBIT_SCALE, (h * share) / ORBIT_SCALE, 420);
  // On phones the medkit is drawn at its bigger size and scaled with the shop's drag, so it zooms in
  // and out with the finger instead of jumping when the drag ends.
  const sizeDown = drag ? fit(drag.high - drag.top, 0.52) : fit(height, compact ? (showCounter ? 0.52 : 0.62) : 0.58);
  const sizeUp = drag ? fit(drag.low - drag.top, 0.62) : sizeDown;
  const size = Math.max(sizeDown, sizeUp);
  const zoom = useAnimatedStyle(() => {
    if (!drag) return {};
    return { transform: [{ scale: interpolate(drag.value.get(), [drag.low, drag.high], [sizeUp / size, sizeDown / size], Extrapolation.CLAMP) }] };
  });

  return (
    // Decorating: start below the menu button and currency chips, since the counter is hidden.
    <View className={`flex-1 items-center ${editing ? "pt-[92px]" : compact ? "pt-12" : "justify-center pt-4"}`}>
      {/* The counter stays while you swipe between the medkit and My Room, so progress is always in view.
          It steps aside while decorating, so the room, its buttons and the item tray all fit. */}
      {showCounter && <Counter compact={compact} />}
      <Pager
        // The medkit's shine reaches up behind the counter instead of stopping at the page edge.
        overflowVisible
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
                <Animated.View style={zoom}>
                  <MedkitButton size={size} tapAmount={tapValue({ owned, rebirths, boosts, luckyTaps, room, gemUpgrades })} owned={owned} skin={medkitSkin} effect={tapEffect} />
                </Animated.View>
              </View>
            ),
          },
          {
            key: "room",
            label: waiting ? `My Room, ${waiting} ${waiting === 1 ? "patient is" : "patients are"} waiting` : "My Room",
            badge: waiting > 0,
            content: <RoomPage width={width} editing={editing} onEditingChange={setEditing} hideControls={shopUp} />,
          },
        ]}
      />
    </View>
  );
}

/** Drag the shop's top edge up to give the shop more room (and down to give it back); a tap toggles. */
/**
 * The handle on top of the shop. The medkit area follows the finger while dragging, then settles
 * expanded or not on release (a tap toggles).
 */
function ShopGrip({ expanded, onChange, height, low, high }: { expanded: boolean; onChange: (expanded: boolean) => void; height: SharedValue<number>; low: number; high: number }) {
  // Touch-responder props; the start point is only read inside the handlers.
  const start = useRef({ y: 0, h: 0 });
  const settle = (up: boolean) => {
    height.set(withTiming(up ? low : high, { duration: 220, easing: Easing.out(Easing.cubic) }));
    onChange(up);
  };
  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        start.current = { y: e.nativeEvent.pageY, h: height.get() };
      }}
      onResponderMove={(e) => {
        const h = start.current.h + e.nativeEvent.pageY - start.current.y;
        height.set(Math.min(high, Math.max(low, h)));
      }}
      onResponderRelease={(e) => {
        const dy = e.nativeEvent.pageY - start.current.y;
        if (Math.abs(dy) < 6) settle(!expanded);
        else if (dy < -24) settle(true);
        else if (dy > 24) settle(false);
        else settle(height.get() < (low + high) / 2);
      }}
      onResponderTerminate={() => settle(expanded)}
      accessibilityRole="button"
      accessibilityLabel={expanded ? "Shrink the shop" : "Expand the shop"}
      // The bar sits at the top of the touch strip, clear of the shop title below it.
      className="absolute left-0 right-0 top-0 z-20 h-7 items-center pt-2"
    >
      <View className="h-1.5 w-12 rounded-full bg-ink/40" />
    </View>
  );
}

/** Applies an app icon chosen in the Gem Shop once the player leaves the app. */
function PendingIcon() {
  const pending = useGameSelector((s) => s.pendingIcon);
  const { dispatch } = useGameActions();
  // An icon from a code-locked section that has ended goes back to the original next time.
  useEffect(() => {
    const current = appIcon();
    const item = GEM_ITEMS.find((i) => i.kind === "icon" && i.name === current);
    if (item?.section && !sectionOpen(item.section)) dispatch({ type: "setPendingIcon", icon: "default" });
  }, [dispatch]);
  useEffect(() => {
    if (!pending) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "background") return;
      dispatch({ type: "setPendingIcon", icon: null });
      setAppIcon(iconFromPending(pending)).catch(() => {});
    });
    return () => sub.remove();
  }, [pending, dispatch]);
  return null;
}

export default function GameScreen() {
  // Keep the phone awake while the game is open (idle games are watched, not tapped).
  useKeepAwake();
  useEffect(() => {
    // Ask for photo access once, a moment after the first launch, so saving stickers works later.
    const t = setTimeout(() => void askPhotosOnce(), 4000);
    return () => clearTimeout(t);
  }, []);
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
  const drag = useMemo(() => (wide ? undefined : { value: animatedHeight, low: height * 0.36, high: height * 0.56, top: insets.top }), [wide, animatedHeight, height, insets.top]);

  return (
    <View className={`flex-1 bg-backdrop ${wide ? "flex-row" : "flex-col"}`}>
      <Animated.View style={[{ width: clickerWidth, paddingTop: insets.top, paddingLeft: insets.left, position: "relative", overflow: "hidden" }, clickerStyle]}>
        {/* Drawn at the tallest the area gets, so dragging the shop down never shows a bare edge. */}
        <Backdrop width={clickerWidth} height={wide ? height : height * 0.56} />
        <View className="absolute left-4 z-10" style={{ top: insets.top + 12 }}>
          <MenuButton onPress={() => setMenuOpen(true)} />
        </View>
        <View className="absolute right-3 z-10" style={{ top: insets.top + 12 }}>
          <CurrencyBar />
        </View>
        {/* Decorating needs the space: the shop folds down while the room is edited. */}
        <Clicker width={clickerWidth} height={clickerHeight - insets.top} compact={!wide} shopUp={shopUp && !wide} drag={drag} onEditing={(on) => on && setShopUp(false)} />
      </Animated.View>

      <View
        className={wide ? "border-l-[3px] border-outline" : "flex-1 border-t-[3px] border-outline"}
        style={wide ? { width: SIDEBAR_WIDTH, paddingTop: insets.top, paddingRight: insets.right } : { paddingBottom: insets.bottom }}
      >
        {!wide && <ShopGrip expanded={shopUp} onChange={setShopUp} height={animatedHeight} low={height * 0.36} high={height * 0.56} />}
        <Shop compact={!wide} width={wide ? SIDEBAR_WIDTH : width} />
      </View>

      <ToastStack />
      <HallOfFame />
      <Intro />
      <PendingIcon />
      <MenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

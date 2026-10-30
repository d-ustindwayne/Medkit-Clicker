import { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { useKeepAwake } from "expo-keep-awake";
import { AppState, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
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
import { MarqueeText } from "@/components/ui/marquee-text";
import { Pager } from "@/components/ui/pager";
import { ToastStack } from "@/components/toast-stack";
import { DailyLogin } from "@/components/daily-login";
import { FlyingBonus } from "@/components/flying-bonus";
import { loadCustomBackground } from "@/lib/custom-bg";
import { useWalkTracker } from "@/hooks/use-walk";
import { useEvents, useEventsSync } from "@/hooks/use-events";
import { isRunning } from "@/lib/event-store";
import { updateWidget } from "@/widget/sync";
import { UpdatePrompt } from "@/components/update-prompt";
import { RoomPage } from "@/components/room/room-page";
import { ownsBackground, showsInTheme } from "@/constants/backgrounds";
import { GEM_ITEMS } from "@/constants/gems";
import { TAP_GROWTH_EVERY, tapGrowth } from "@/constants/items";
import { sectionOpen } from "@/constants/rewards";
import { BOOSTS, LUCKY_MULT } from "@/constants/boosts";
import { healingRate } from "@/constants/rebirth";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameReady, useGameSelector, useGameStore, useSettings } from "@/hooks/use-game";
import { appIcon, iconFromPending, setAppIcon } from "@/lib/app-icon";
import { askPhotosOnce } from "@/lib/stickers";
import { useNow } from "@/hooks/use-now";
import { usePalette } from "@/hooks/use-palette";
import { formatCount, formatRate } from "@/lib/format";
import { tapValue } from "@/lib/game";

/** Above this width the shop sits beside the medkit (PC & tablet view). */
const WIDE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 380;
/** The sidebar's left border (border-l-[3px]), which the shop's pages must leave room for. */
const SIDEBAR_BORDER = 3;

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

/** An event without its own picture shows the winged heart. */
const EVENT_ICON = require("@/imgs/achievements/winged_heart.png");

/** How many boost chips show; more running than this fold into a "..." box with a count. */
const SHOWN_BOOSTS = 3;

/**
 * Countdown chips for running boosts and Lucky Stethoscope taps, stacked at the left edge just above
 * the shop, clear of the medkit and the page dots. With more than three running, the rest fold into a
 * "..." box with a count.
 */
function ActiveBoosts() {
  const { boosts, luckyTaps } = useGameSelector((s) => ({ boosts: s.boosts, luckyTaps: s.luckyTaps }));
  const events = useEvents();
  const now = useNow();
  const left = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const chips = [
    // Running events first: they're for everyone, and they end on their own.
    ...events.filter((e) => isRunning(e, now) && (e.tapMult || e.rateMult)).map((e) => ({
      key: `event-${e.id}`,
      image: e.icon ? { uri: e.icon } : EVENT_ICON,
      text: `${e.tapMult ? `x${e.tapMult} tap ` : ""}${e.rateMult ? `x${e.rateMult}/s ` : ""}${left(e.endsAt - now)}`,
      label: `${e.title} event on`,
    })),
    ...BOOSTS.filter((b) => (boosts[b.id] ?? 0) > now).map((b) => ({ key: b.id, image: b.image, text: left(boosts[b.id] - now), label: `${b.name} active` })),
    ...(luckyTaps > 0 ? [{ key: "lucky", image: BOOSTS.find((b) => b.effect.kind === "charges")!.image, text: `x${LUCKY_MULT} · ${luckyTaps}`, label: `${luckyTaps} lucky taps left` }] : []),
  ];
  if (chips.length === 0) return null;
  const more = chips.length - SHOWN_BOOSTS;
  return (
    <View pointerEvents="none" className="absolute bottom-3 left-3 z-10 items-start gap-1.5">
      {chips.slice(0, SHOWN_BOOSTS).map((c) => (
        <View key={c.key} className="flex-row items-center gap-1 rounded-full border-[1.5px] border-outline bg-accent px-2 py-0.5" accessibilityLabel={c.label}>
          <Image source={c.image} style={{ width: 14, height: 14 }} contentFit="contain" />
          <Text className="font-number text-xs text-ink">{c.text}</Text>
        </View>
      ))}
      {more > 0 && (
        <View className="h-[22px] w-7 items-center justify-center border-[1.5px] border-outline bg-surface" accessibilityLabel={`${more} more ${more === 1 ? "boost" : "boosts"} active`}>
          <Text className="font-pixel text-[10px] leading-[12px] text-ink">...</Text>
          <View className="absolute -right-2 -top-2 h-4 min-w-4 items-center justify-center rounded-full border border-outline bg-primary px-0.5">
            <Text className="font-pixel text-[8px] leading-[10px] text-white">{more}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** Inter Bold averages a little under this many ems per character. */
const CHAR_EM = 0.64;
const COUNTER_PX = 48;
/** Computers: one line ("1,234 Medkits"), a little bigger with the web's larger text. */
const WIDE_COUNTER_PX = Platform.OS === "web" ? 54 : 48;
/** The one-line count never gets smaller than this; past it, the count and its name stack. */
const MIN_LINE_PX = 36;

function Counter({ compact }: { compact: boolean }) {
  const { healed, owned, rebirths, boosts, room } = useGameSelector((s) => ({ healed: s.healed, owned: s.owned, rebirths: s.rebirths, boosts: s.boosts, room: s.room }));
  const palette = usePalette();
  const rate = healingRate({ owned, rebirths, boosts, room });
  const label = Math.floor(healed) === 1 ? "Medkit" : "Medkits";
  const rateText = `${formatRate(rate)} ${rate === 1 ? "Medkit" : "Medkits"} per second`;
  // Hard pixel drop shadow; NativeWind has no text-shadow utilities.
  const shadow = { textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0.1 };
  // The count shrinks to fit by its length. adjustsFontSizeToFit would re-measure the text on every
  // change, many times a second while tapping, which costs frames on slower phones. Its line keeps
  // the full height whatever the size, so the medkit and the hospital below never move as it changes.
  const [boxW, setBoxW] = useState(0);
  const count = formatCount(healed);
  const maxPx = compact ? COUNTER_PX : WIDE_COUNTER_PX;
  const fit = (text: string) => (boxW ? Math.min(maxPx, Math.floor(boxW / (text.length * CHAR_EM))) : maxPx);
  // In between phone and computer sizes (a tablet, a narrow browser window) the one-line count got
  // tiny, so once it would drop below MIN_LINE_PX the name goes on its own line under the number.
  // Decided on the widest number of the same size ("999.99 million" for any millions), so it doesn't
  // flip back and forth as the digits change; that changed the counter's height on every tick, and
  // the room below grew and shrank with it.
  const widest = healed < 1e6 ? "999,999" : count.replace(/[\d.]+/, "999.99");
  const stacked = compact || fit(`${widest} ${label}`) < MIN_LINE_PX;
  const line = stacked ? count : `${count} ${label}`;
  const countPx = fit(line);
  return (
    // Side padding clears the menu button (left) and the currency chips (right). The counter draws
    // above the pager, so the medkit and its orbit never cover the numbers (the shine goes behind them).
    <View className={`z-10 items-center ${compact ? "px-24" : "px-28"}`} accessibilityLiveRegion="none">
      <View accessibilityRole="header" className="items-center self-stretch" onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
        <View className="justify-center" style={{ height: maxPx + 6 }}>
          <Text className="text-center font-display text-ink" style={[shadow, { fontSize: countPx, lineHeight: countPx + 6, opacity: boxW ? 1 : 0 }]} numberOfLines={1}>
            {line}
          </Text>
        </View>
        {stacked && <Text className={`text-center font-display text-ink ${compact ? "text-xl" : "text-2xl"}`}>{label}</Text>}
      </View>
      <View className="mt-2 max-w-full flex-row items-center gap-2">
        <View className="max-w-full rounded-full border-[1.5px] border-outline bg-surface px-4 py-1">
          {/* One line that shrinks to fit, so a long rate ("350.23 million") is never cut off. The web
              has no adjustsFontSizeToFit, so there it's scaled down (and scrolls if it still won't fit). */}
          {Platform.OS === "web" ? (
            <MarqueeText shrink={0.8} className={`text-center font-display text-ink ${compact ? "text-base" : "text-xl"}`}>{rateText}</MarqueeText>
          ) : (
            <Text className={`text-center font-display text-ink ${compact ? "text-sm" : "text-lg"}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {rateText}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

/** The chosen background; an unbought paid one falls back to the default until it's bought. */
function Backdrop({ width, height }: { width: number; height: number }) {
  const settings = useSettings();
  // Walking rewards: read the step counter while they're on (Android).
  useWalkTracker();
  // Timed events from the server, and their gifts.
  useEventsSync();
  // The home-screen widget (Android) gets the latest numbers whenever the game is left.
  const store = useGameStore();
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") updateWidget(store.get(), settings.theme);
    });
    return () => sub.remove();
  }, [store, settings.theme]);
  // The custom background photo, if one was picked.
  useEffect(() => {
    loadCustomBackground();
  }, []);
  const ownedBackgrounds = useGameSelector((s) => s.ownedBackgrounds);
  const index = ownsBackground(settings.background, ownedBackgrounds) && showsInTheme(settings.background, settings.theme) ? settings.background : 0;
  return <BackgroundPattern index={index} theme={settings.theme} width={width} height={height} />;
}

/** Swipeable stage: the medkit, then My Room. `onEditing` hears when decorating starts or stops. */
/** The shop's drag on phones: the medkit area's live height and its two resting heights. */
type ShopDrag = { value: SharedValue<number>; low: number; high: number; top: number };

function Clicker({ width, height, compact, shopUp, drag, onEditing }: { width: number; height: number; compact: boolean; shopUp: boolean; drag?: ShopDrag; onEditing: (on: boolean) => void }) {
  // Only what the medkit area shows, so it doesn't redraw on every tick.
  // Tap growth changes every 100 taps, so the step is selected rather than the tap count.
  const { owned, rebirths, boosts, luckyTaps, waiting, room, gemUpgrades, medkitSkin: chosenSkin, tapEffect, growth } = useGameSelector((s) => ({
    growth: tapGrowth(s.taps),
    owned: s.owned, rebirths: s.rebirths, boosts: s.boosts, luckyTaps: s.luckyTaps, waiting: s.patients.length, room: s.room,
    gemUpgrades: s.gemUpgrades, medkitSkin: s.medkitSkin, tapEffect: s.tapEffect,
  }));
  // A skin from a code-locked section falls back to the original medkit once the section ends.
  const now = useNow(60_000);
  const skinSection = GEM_ITEMS.find((i) => i.id === chosenSkin)?.section;
  const medkitSkin = skinSection && !sectionOpen(skinSection, now) ? null : chosenSkin;
  const [editing, setEditingState] = useState(false);
  // The medkit's idle animations pause while My Room is shown.
  const [page, setPage] = useState(0);
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
  // The counter fades and folds away as the shop is dragged up, and comes back as it's dragged down.
  const [counterH, setCounterH] = useState(0);
  const counterFade = useAnimatedStyle(() => {
    if (!drag) return {};
    const h = drag.value.get();
    return {
      opacity: interpolate(h, [drag.low, drag.low + (drag.high - drag.low) * 0.6, drag.high], [0, 0.2, 1], Extrapolation.CLAMP),
      height: counterH ? interpolate(h, [drag.low, drag.high], [0, counterH], Extrapolation.CLAMP) : undefined,
    };
  });

  return (
    // Decorating: start below the menu button and currency chips, since the counter is hidden (wide
    // screens have bigger chips, about 140 px tall; in rem on the web, where computers get bigger text).
    <View className={`flex-1 items-center ${editing ? (compact ? "pt-[92px]" : Platform.OS === "web" ? "pt-[9.5rem]" : "pt-[152px]") : compact ? "pt-12" : "justify-center pt-4"}`}>
      {/* The counter stays while you swipe between the medkit and My Room, so progress is always in view.
          It steps aside while decorating, so the room, its buttons and the item tray all fit. */}
      {drag
        ? !editing && (
            <Animated.View style={[{ overflow: "hidden", alignSelf: "stretch", zIndex: 10 }, counterFade]}>
              {/* Measured once at full height, so the fold knows how far to go. */}
              <View onLayout={(e) => setCounterH((h) => h || e.nativeEvent.layout.height)}>
                <Counter compact={compact} />
              </View>
            </Animated.View>
          )
        : showCounter && <Counter compact={compact} />}
      <Pager
        // The medkit's shine reaches up over the counter instead of stopping at the page edge.
        overflowVisible
        width={width}
        dots="overlay"
        onPageChange={setPage}
        scrollEnabled={!editing}
        className="flex-1"
        pages={[
          {
            key: "medkit",
            label: "Medkit",
            content: (
              <View className="flex-1 items-center justify-center">
                <Animated.View style={zoom}>
                  <MedkitButton size={size} tapAmount={tapValue({ owned, rebirths, boosts, luckyTaps, room, gemUpgrades, taps: growth * TAP_GROWTH_EVERY })} owned={owned} skin={medkitSkin} effect={tapEffect} active={page === 0} />
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
      {/* Running boosts, above the shop; decorating needs that space for the item tray. */}
      {!editing && <ActiveBoosts />}
      <FlyingBonus width={width} height={height * 0.7} active={page === 0 && !editing} />
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
  const { pending, gemItems } = useGameSelector((s) => ({ pending: s.pendingIcon, gemItems: s.gemItems }));
  const ready = useGameReady();
  const { dispatch } = useGameActions();
  // The home-screen icon outlives the app's data (clearing it keeps the icon), so once the save has
  // loaded, an icon this save doesn't own, or one from a code-locked section that has ended, goes back
  // to the original the next time the app is left.
  useEffect(() => {
    if (!ready) return;
    const current = appIcon();
    if (!current) return;
    const item = GEM_ITEMS.find((i) => i.kind === "icon" && i.name === current);
    const keep = item && gemItems.includes(item.id) && (!item.section || sectionOpen(item.section));
    if (!keep) dispatch({ type: "setPendingIcon", icon: "default" });
  }, [ready, gemItems, dispatch]);
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
        <Shop compact={!wide} width={wide ? SIDEBAR_WIDTH - SIDEBAR_BORDER - insets.right : width} />
      </View>

      <ToastStack />
      <HallOfFame />
      <Intro />
      <PendingIcon />
      <DailyLogin />
      <UpdatePrompt />
      <MenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

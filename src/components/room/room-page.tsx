import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Backed } from "@/components/ui/backed";
import { Image } from "@/components/ui/image";
import { Pressable, ScrollView, Text, View, useWindowDimensions, type GestureResponderEvent, type ImageSourcePropType } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown, type SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { ScenePage } from "@/components/scene-page";
import { HardShadow } from "@/components/ui/hard-shadow";
import { MarqueeText } from "@/components/ui/marquee-text";
import { AnimatedSprite } from "@/components/ui/animated-sprite";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { WardPatient } from "@/components/ward/ward-patient";
import { CHARACTER_PX, DRAG_DEPTH, ITEM_PX, ROOMS, STAFF_PER_ROOM, depth, ROOM_BONUS_CAP, ROOM_ITEMS, ZONES, isUnlocked, itemUnlocked, roomBonus, spotFor, unlockHint, type Placement, type RoomItem } from "@/constants/room";
import { STAFF_FRAMES, WALK_FRAME_MS, WALK_SEQUENCE } from "@/constants/staff";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameSelector } from "@/hooks/use-game";
import { roomCount } from "@/lib/game";
import { useHaptics } from "@/hooks/use-haptics";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

const ART_W = 320;
/** The decorate button: a pencil (src/media/photos/sprites/misc/decorate.aseprite). */
const DECORATE_ICON = require("@/imgs/misc/decorate.png");
/** Room buttons and the item tray draw above every placed item (DRAG_DEPTH included). */
const CONTROLS_DEPTH = DRAG_DEPTH + 10;
/** Holding a tray tile this long picks it up, so it can be dragged out in any direction. */
const HOLD_MS = 220;
/** Decorating: the top bar fades in and the item tray rises from the bottom (and back on Done). */
const BAR_IN = FadeIn.duration(320);
const BAR_OUT = FadeOut.duration(220);
const TRAY_IN = SlideInDown.duration(420).easing(Easing.out(Easing.cubic));
const TRAY_OUT = SlideOutDown.duration(280).easing(Easing.in(Easing.cubic));
/** The first tiles rise one after another behind the tray; the rest are off screen anyway. */
const TILE_STAGGER = 10;
type Box = { x: number; y: number; w: number; h: number };

/** One frame of a walk cycle: visible only on its steps (animated on the UI thread, no re-renders). */
function WalkFrame({ step, index, image, size }: { step: SharedValue<number>; index: number; image: ImageSourcePropType; size: number }) {
  const style = useAnimatedStyle(() => ({ opacity: WALK_SEQUENCE[Math.min(WALK_SEQUENCE.length - 1, Math.floor(step.get()))] === index ? 1 : 0 }));
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size }, style]}>
      <Image source={image} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}

/** A placed nurse or doctor pacing a short way either side of their spot, with a 3-frame walk cycle. */
const Pacing = memo(function Pacing({ id, size, seed }: { id: string; size: number; seed: number }) {
  const reduceMotion = useReduceMotion();
  const x = useSharedValue(0);
  const step = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    // Each one paces at its own speed so they don't march in step.
    x.set(-1);
    step.set(0);
    x.set(withRepeat(withTiming(1, { duration: 3200 + (seed % 5) * 700, easing: Easing.inOut(Easing.quad) }), -1, true));
    step.set(withRepeat(withTiming(WALK_SEQUENCE.length, { duration: WALK_SEQUENCE.length * WALK_FRAME_MS, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(x);
      cancelAnimation(step);
    };
  }, [x, step, seed, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * size * 0.35 }] }));
  const frames = STAFF_FRAMES[id];
  if (reduceMotion || !frames) return <Image source={frames?.[0]} style={{ width: size, height: size }} contentFit="contain" />;
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      {frames.map((src, i) => (
        <WalkFrame key={i} step={step} index={i} image={src} size={size} />
      ))}
    </Animated.View>
  );
});

/** How big an item is drawn in a room `width` wide: staff at character size, the rest at 1.5x their 32px. */
const itemSize = (item: RoomItem, width: number) => (item.staff ? width * (CHARACTER_PX / ART_W) : width * (ITEM_PX / ART_W) * 1.5);

/**
 * A placed item; draggable (and removable) in edit mode. Its position lives in animation values, so
 * a drag follows the finger without re-rendering, and a drop hands over to the new spot in the
 * same frame (no jump back to the old one first).
 */
function PlacedItem({ p, item, width, height, editing, onMove, onRemove, onDragChange }: {
  p: Placement; item: RoomItem; width: number; height: number; editing: boolean;
  /** Where the item ends up if dropped at x, y (fractions of the room), or null if it can't go there. */
  onMove: (x: number, y: number) => { x: number; y: number } | null; onRemove: () => void;
  /**
   * The item is picked up or let go. iOS scroll views keep scrolling under a touch the item has
   * claimed, so the room around it must stop scrolling itself.
   */
  onDragChange?: (dragging: boolean) => void;
}) {
  const size = itemSize(item, width);
  const left = p.x * width - size / 2;
  const top = p.y * height - size;
  const baseX = useSharedValue(left);
  const baseY = useSharedValue(top);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  // The saved spot changed (dropped, snapped, or the room resized): move there and clear the drag.
  useLayoutEffect(() => {
    baseX.set(left);
    baseY.set(top);
    dx.set(0);
    dy.set(0);
  }, [left, top, baseX, baseY, dx, dy]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: baseX.get() + dx.get() }, { translateY: baseY.get() + dy.get() }] }));
  const finish = (x: number, y: number) => {
    const s0 = start.current;
    start.current = null;
    last.current = null;
    setDragging(false);
    onDragChange?.(false);
    if (!s0) return;
    const spot = onMove(p.x + (x - s0.x) / width, p.y + (y - s0.y) / height);
    if (!spot || (spot.x === p.x && spot.y === p.y)) {
      // Not moved (or it can't go there): glide back.
      dx.set(withTiming(0, { duration: 160 }));
      dy.set(withTiming(0, { duration: 160 }));
      return;
    }
    // Sit exactly on the snapped spot until the saved position catches up (then the layout effect
    // swaps the offset for the new base without anything visible changing).
    dx.set(spot.x * width - size / 2 - left);
    dy.set(spot.y * height - size - top);
  };
  // View touch-responder props: refs are only read inside these event handlers.
  const dragHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    // Returning true keeps the room from sliding while an item is dragged.
    onResponderGrant: (e: GestureResponderEvent) => {
      start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      setDragging(true);
      onDragChange?.(true);
      return true;
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const s0 = start.current;
      if (!s0) return;
      last.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      dx.set(e.nativeEvent.pageX - s0.x);
      dy.set(e.nativeEvent.pageY - s0.y);
    },
    onResponderRelease: (e: GestureResponderEvent) => finish(e.nativeEvent.pageX, e.nativeEvent.pageY),
    // Taken away mid-drag: still drop it where the finger last was.
    onResponderTerminate: () => {
      const l = last.current;
      if (l) finish(l.x, l.y);
      else {
        start.current = null;
        setDragging(false);
        onDragChange?.(false);
        dx.set(0);
        dy.set(0);
      }
    },
  };
  return (
    <Animated.View
      {...(editing ? dragHandlers : {})}
      accessibilityLabel={item.name}
      style={[{ position: "absolute", left: 0, top: 0, width: size, height: size, zIndex: dragging ? DRAG_DEPTH : depth(p.y) }, style]}
    >
      {item.staff && !editing ? (
        <Pacing id={item.staff} size={size} seed={Math.round(p.x * 100)} />
      ) : item.frames ? (
        <AnimatedSprite frames={item.frames} size={size} />
      ) : (
        <Image source={item.image} style={{ width: size, height: size }} contentFit="contain" />
      )}
      {editing && (
        <>
          <View pointerEvents="none" className="absolute inset-0 border border-dashed border-ink/60" />
          <Pressable accessibilityRole="button" accessibilityLabel={`Put away ${item.name}`} hitSlop={8} onPress={onRemove} className="absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full border border-outline bg-primary">
            <PixelIcon name="close" size={8} />
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}

/** "My Room": decorate hospital rooms with unlocked items and staff; patients turn up. */
/** `hideControls`: the shop is pulled up, so the room is small; its decorate button steps aside. */
export function RoomPage({ width, editing, onEditingChange, hideControls = false }: { width: number; editing: boolean; onEditingChange: (on: boolean) => void; hideControls?: boolean }) {
  const state = useGameSelector((s) => ({ room: s.room, achievements: s.achievements, rebirths: s.rebirths, treated: s.treated, owned: s.owned, gemItems: s.gemItems }));
  const { dispatch, pushToast } = useGameActions();
  const { playSfx, unlock } = useAudio();
  const haptic = useHaptics();
  const room = ROOMS.find((r) => r.id === state.room.current) ?? ROOMS[0];
  const placed = state.room.placed[room.id] ?? [];
  // While decorating, the room shrinks (centred) to fit between the top bar and the item tray, so
  // the whole floor stays in view: an item placed low down is never hidden behind the tray.
  const [box, setBox] = useState({ root: 0, bar: 0, tray: 0 });
  const measured = (key: keyof typeof box) => (h: number) => setBox((b) => (b[key] === h ? b : { ...b, [key]: h }));
  // On a wide, short screen (a computer) the room also shrinks to fit the page's height, with its side
  // art filling in left and right; phones are tall enough that it always spans the width.
  const roomW = !box.root ? width : editing ? Math.min(width, Math.max(width * 0.5, (box.root - box.bar - box.tray) * room.aspect)) : Math.min(width, box.root * room.aspect);
  const narrow = !editing && roomW < width;
  // Big screens show bigger currency chips at the top right, so the decorate button moves to the bottom.
  const wideScreen = useWindowDimensions().width >= 768;
  const height = roomW / room.aspect;
  // The room and its sides (a quarter of its width each), at least as wide as the page.
  const stripW = Math.max(width, roomW * 1.5);
  const panRef = useRef<ScrollView>(null);
  const rate = roomBonus(state.room, "rate"), tap = roomBonus(state.room, "tap");

  const cycleRoom = (delta: number) => {
    const i = ROOMS.findIndex((r) => r.id === room.id);
    const next = ROOMS[(i + delta + ROOMS.length) % ROOMS.length];
    playSfx("click");
    if (isUnlocked(next.unlock, state)) dispatch({ type: "setRoom", room: next.id });
    else pushToast({ kind: "info", title: `${next.title} is locked`, body: unlockHint(next.unlock) });
  };

  const tapItem = (item: RoomItem) => {
    unlock();
    if (!itemUnlocked(item, state)) {
      haptic.denied();
      playSfx("invalid");
      return pushToast({ kind: "info", title: `${item.name} is locked`, body: unlockHint(item.unlock), image: item.image });
    }
    if (placed.some((p) => p.item === item.id)) {
      playSfx("click");
      return dispatch({ type: "removeItem", room: room.id, item: item.id });
    }
    if (roomCount(placed, !!item.staff) >= (item.staff ? STAFF_PER_ROOM : room.limit)) {
      haptic.denied();
      playSfx("invalid");
      return pushToast(item.staff
        ? { kind: "info", title: "Enough staff here", body: `${room.title} has room for ${STAFF_PER_ROOM} staff. Send one away first.` }
        : { kind: "info", title: "Room is full", body: `${room.title} holds ${room.limit} items. Put one away first.` });
    }
    // Spread new items out so they don't all land in one spot.
    const x = 0.15 + ((placed.length * 0.37) % 0.7);
    const y = item.place === "floor" ? ZONES.floor.maxY - 0.03 : (ZONES.wall.minY + ZONES.wall.maxY) / 2 + 0.06;
    if (!spotFor(room, placed, item, x, y)) return wallFull(item);
    dispatch({ type: "placeItem", room: room.id, item: item.id, x, y });
    haptic.buy();
    playSfx("buy");
  };

  /** Wall items can't hide each other, so a crowded wall can run out of space. */
  const wallFull = (item: RoomItem) => {
    haptic.denied();
    playSfx("invalid");
    pushToast({ kind: "info", title: "No space on the wall", body: `Move or put away a wall item to make room for the ${item.name}.`, image: item.image });
  };

  const ghostSizeOf = (item: RoomItem) => itemSize(item, roomW);
  // Drag-and-drop from the tray: drag a tile upward and a ghost follows the finger; drop it on the room.
  const rootRef = useRef<View>(null);
  const sceneRef = useRef<View>(null);
  const boxes = useRef<{ root: Box; scene: Box } | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  /** The dragged tile's image, positioned inside this page. */
  const [ghost, setGhost] = useState<{ item: RoomItem; left: number; top: number } | null>(null);
  /**
   * A tile or a placed item is being dragged: the tray and the room stop scrolling so they don't
   * slide along with the finger.
   */
  const [dragging, setDragging] = useState(false);
  /** The tray shows furniture or staff, one at a time. */
  const [trayTab, setTrayTab] = useState<"items" | "staff">("items");
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const measure = () => {
    rootRef.current?.measureInWindow((x, y, w, h) => {
      const root = { x, y, w, h };
      sceneRef.current?.measureInWindow((sx, sy, sw, sh) => {
        boxes.current = { root, scene: { x: sx, y: sy, w: sw, h: sh } };
      });
    });
  };
  const dragHandlers = (item: RoomItem) => ({
    onTouchStart: (e: GestureResponderEvent) => {
      touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      measure();
      // Holding a tile still for a moment picks it up, whichever way it's then dragged.
      if (holdTimer.current) clearTimeout(holdTimer.current);
      held.current = false;
      holdTimer.current = setTimeout(() => {
        held.current = true;
      }, HOLD_MS);
    },
    // A held tile, or a mostly-upward drag, picks the tile up; quick sideways swipes scroll the tray.
    onMoveShouldSetResponderCapture: (e: GestureResponderEvent) => {
      const t = touch.current;
      if (!t) return false;
      const dx = e.nativeEvent.pageX - t.x, dy = e.nativeEvent.pageY - t.y;
      const pick = held.current || (dy < -6 && Math.abs(dy) > Math.abs(dx) * 0.6);
      if (!pick && Math.abs(dx) > 8 && holdTimer.current) clearTimeout(holdTimer.current); // it's a scroll
      if (pick) setDragging(true);
      return pick;
    },
    onStartShouldSetResponderCapture: () => held.current,
    // Returning true keeps the tray from scrolling away with the dragged tile.
    onResponderGrant: () => {
      setDragging(true);
      return true;
    },
    onResponderTerminationRequest: () => false,
    onResponderMove: (e: GestureResponderEvent) => {
      const root = boxes.current?.root;
      lastPoint.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      if (root) setGhost({ item, left: e.nativeEvent.pageX - root.x - ghostSizeOf(item) / 2, top: e.nativeEvent.pageY - root.y - ghostSizeOf(item) });
    },
    onResponderRelease: (e: GestureResponderEvent) => drop(item, e.nativeEvent.pageX, e.nativeEvent.pageY),
    // Taken away mid-drag (the tray tried to scroll): still drop it where the finger last was.
    onResponderTerminate: () => {
      const l = lastPoint.current;
      if (l) drop(item, l.x, l.y);
      else endDrag();
    },
    onTouchEnd: () => letGo(),
    onTouchCancel: () => letGo(),
  });
  /** The finger lifted: a tap still places the item (the tile's own onPress). */
  const letGo = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    held.current = false;
    setDragging(false);
  };
  const endDrag = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    held.current = false;
    setGhost(null);
    setDragging(false);
    touch.current = null;
    lastPoint.current = null;
  };
  const drop = (item: RoomItem, pageX: number, pageY: number) => {
    endDrag();
    const b = boxes.current?.scene;
    // Dropped back on the tray: cancel. Anywhere else (even on another item, or partly outside the
    // room) places it in the room.
    if (!b || pageY > b.y + b.h) return;
    if (!itemUnlocked(item, state)) return tapItem(item); // shows the unlock hint
    if (!placed.some((p) => p.item === item.id) && roomCount(placed, !!item.staff) >= (item.staff ? STAFF_PER_ROOM : room.limit)) return tapItem(item); // "room is full"
    // Items stand on their feet, so the drop point is the bottom of the item.
    const fx = Math.min(0.95, Math.max(0.05, (pageX - b.x) / b.w));
    const fy = Math.min(1, Math.max(0, (pageY - b.y) / b.h + 0.045));
    if (!spotFor(room, placed, item, fx, fy)) return wallFull(item);
    dispatch({ type: "placeItem", room: room.id, item: item.id, x: fx, y: fy });
    haptic.buy();
    playSfx("buy");
  };

  const placedSorted = [...placed].sort((a, b) => a.y - b.y);
  const toggle = (
    <HardShadow offset={3}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={editing ? "Done decorating" : "Decorate room"}
        onPress={() => {
          unlock();
          playSfx("click");
          onEditingChange(!editing);
        }}
        className={`h-10 w-10 items-center justify-center border-2 border-outline ${editing ? "bg-success" : "bg-surface"}`}
      >
        {editing ? <PixelIcon name="check" size={16} /> : <Image source={DECORATE_ICON} style={{ width: 28, height: 28 }} contentFit="contain" />}
      </Pressable>
    </HardShadow>
  );
  return (
    <View ref={rootRef} className="flex-1" onLayout={(e) => measured("root")(e.nativeEvent.layout.height)}>
      {/* Decorating: the room switcher and Done button sit in a row above the room, never over it. */}
      {editing && (
        <Animated.View entering={BAR_IN} exiting={BAR_OUT} style={{ zIndex: CONTROLS_DEPTH }} onLayout={(e) => measured("bar")(e.nativeEvent.layout.height)}>
        <View className="flex-row items-center justify-between gap-2 px-3 pb-2">
          <View className="flex-1 flex-row items-center self-stretch border-2 border-outline bg-surface">
            <Pressable accessibilityRole="button" accessibilityLabel="Previous room" onPress={() => cycleRoom(-1)} className="h-9 w-8 items-center justify-center">
              <PixelIcon name="left" size={12} />
            </Pressable>
            <View className="flex-1 items-center px-1">
              <MarqueeText className="font-pixel text-[10px] tracking-[1px] text-ink">{room.title.toUpperCase()}</MarqueeText>
              <MarqueeText className="font-number text-xs text-ink">{`${roomCount(placed, false)}/${room.limit} items · ${roomCount(placed, true)}/${STAFF_PER_ROOM} staff · +${Math.round(rate * 100)}%/s +${Math.round(tap * 100)}%/tap`}</MarqueeText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Next room" onPress={() => cycleRoom(1)} className="h-9 w-8 items-center justify-center">
              <PixelIcon name="right" size={12} />
            </Pressable>
          </View>
          {toggle}
        </View>
        </Animated.View>
      )}

      {/* While decorating, the room sits at the top so the item tray fits in the space below it, and
          its side art carries on left and right: slide to see it (it starts centred on the room). */}
      {editing ? (
        <ScrollView
          ref={panRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!dragging}
          contentContainerStyle={{ width: stripW }}
          onContentSizeChange={(w) => panRef.current?.scrollTo({ x: Math.max(0, (w - width) / 2), animated: false })}
        >
          <View style={{ width: stripW }}>
          <ScenePage scene={editing ? { ...room, anchor: 0 } : room} width={roomW} contentRef={sceneRef} sides={editing ? room.sides : undefined}>
            {placedSorted.map((p) => {
              const item = ROOM_ITEMS.find((i) => i.id === p.item);
              if (!item) return null;
              return (
                <PlacedItem
                  key={p.item}
                  p={p}
                  item={item}
                  width={roomW}
                  height={height}
                  editing={editing}
                  onMove={(x, y) => {
                    const spot = spotFor(room, placed, item, x, y);
                    if (spot) dispatch({ type: "placeItem", room: room.id, item: p.item, x, y });
                    else wallFull(item);
                    return spot;
                  }}
                  onRemove={() => dispatch({ type: "removeItem", room: room.id, item: p.item })}
                  onDragChange={setDragging}
                />
              );
            })}
            {!editing && <WardPatient width={width} height={height} />}
          </ScenePage>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 overflow-hidden">
        <ScenePage scene={room} width={roomW} contentRef={sceneRef} sides={narrow ? room.sides : undefined}>
          {placedSorted.map((p) => {
            const item = ROOM_ITEMS.find((i) => i.id === p.item);
            if (!item) return null;
            return (
              <PlacedItem
                key={p.item}
                p={p}
                item={item}
                width={roomW}
                height={height}
                editing={editing}
                onMove={(x, y) => {
                  const spot = spotFor(room, placed, item, x, y);
                  if (spot) dispatch({ type: "placeItem", room: room.id, item: p.item, x, y });
                  else wallFull(item);
                  return spot;
                }}
                onRemove={() => dispatch({ type: "removeItem", room: room.id, item: p.item })}
              />
            );
          })}
          {!editing && <WardPatient width={roomW} height={height} />}
        </ScenePage>
        </View>
      )}

      {/* Decorate button, drawn above everything in the room. */}
      {!editing && !hideControls && (
        <View className={`absolute right-3 ${wideScreen ? "bottom-3" : "top-2"}`} style={{ zIndex: CONTROLS_DEPTH }}>
          {toggle}
        </View>
      )}

      {/* Item tray: a swipe row under the room. Drag a tile up into the room, or tap it. */}
      {editing && (
        <Animated.View entering={TRAY_IN} exiting={TRAY_OUT} style={{ zIndex: CONTROLS_DEPTH }} onLayout={(e) => measured("tray")(e.nativeEvent.layout.height)}>
        <View className="gap-1.5 border-t-2 border-outline bg-surface py-1.5" accessibilityHint={`Drag placed items to move them. Bonuses are capped at +${Math.round(ROOM_BONUS_CAP * 100)}% each.`}>
          <View className="flex-row gap-1.5 px-3" accessibilityRole="tablist">
            {(["items", "staff"] as const).map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: trayTab === tab }}
                onPress={() => setTrayTab(tab)}
                className={`border-2 border-outline px-3 py-0.5 ${trayTab === tab ? "bg-primary" : "bg-surface"}`}
              >
                <Text className={`font-pixel text-[10px] tracking-[2px] ${trayTab === tab ? "text-white" : "text-ink"}`}>{tab === "items" ? "ITEMS" : "STAFF"}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView key={trayTab} horizontal scrollEnabled={!dragging} showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-3">
            {ROOM_ITEMS.filter((item) => !!item.staff === (trayTab === "staff")).map((item, i) => {
              const open = itemUnlocked(item, state);
              const here = placed.some((p) => p.item === item.id);
              const elsewhere = !here && Object.entries(state.room.placed).some(([rid, list]) => rid !== room.id && list.some((p) => p.item === item.id));
              const bonus = item.bonus.rate ? `+${Math.round(item.bonus.rate * 100)}%/s` : `+${Math.round((item.bonus.tap ?? 0) * 100)}%/tap`;
              return (
                <Animated.View key={item.id} entering={i < TILE_STAGGER ? FadeInDown.delay(120 + i * 45).duration(360) : undefined} {...dragHandlers(item)}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={open ? `${item.name}, ${bonus}${here ? ", placed" : ""}` : `${item.name}, locked: ${unlockHint(item.unlock)}`}
                    onPress={() => tapItem(item)}
                    className={`w-14 items-center border-2 p-0.5 ${here ? "border-success bg-success/20" : "border-outline bg-surface"}`}
                  >
                    <Backed size={32}>
                      <Image source={item.image} style={{ width: 32, height: 32, opacity: open ? 1 : 0.35 }} contentFit="contain" tintColor={open ? undefined : "#5f6b7b"} />
                    </Backed>
                    <Text className="font-body text-[9px] leading-3 text-ink" numberOfLines={1}>
                      {open ? bonus : "locked"}
                    </Text>
                    {here && <View className="absolute right-0.5 top-0.5"><PixelIcon name="check" size={8} /></View>}
                    {elsewhere && <Text className="absolute left-0.5 top-0.5 font-pixel text-[7px] text-ink">IN USE</Text>}
                    {!open && <View className="absolute right-0.5 top-0.5"><PixelIcon name="lock" size={8} /></View>}
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
        </Animated.View>
      )}

      {ghost && (
        <View pointerEvents="none" style={{ position: "absolute", left: ghost.left, top: ghost.top, width: ghostSizeOf(ghost.item), height: ghostSizeOf(ghost.item), opacity: 0.85, zIndex: DRAG_DEPTH + 1 }}>
          <Image source={ghost.item.image} style={{ width: ghostSizeOf(ghost.item), height: ghostSizeOf(ghost.item) }} contentFit="contain" />
        </View>
      )}
    </View>
  );
}

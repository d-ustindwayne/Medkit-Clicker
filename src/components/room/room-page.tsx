import { memo, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Pressable, ScrollView, Text, View, type GestureResponderEvent, type ImageSourcePropType } from "react-native";
import Animated, { Easing, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { ScenePage } from "@/components/scene-page";
import { HardShadow } from "@/components/ui/hard-shadow";
import { AnimatedSprite } from "@/components/ui/animated-sprite";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { WardPatient } from "@/components/ward/ward-patient";
import { CHARACTER_PX, DRAG_DEPTH, ITEM_PX, ROOMS, depth, ROOM_BONUS_CAP, ROOM_ITEMS, ZONES, isUnlocked, roomBonus, unlockHint, type Placement, type RoomItem } from "@/constants/room";
import { STAFF_FRAMES, WALK_FRAME_MS, WALK_SEQUENCE } from "@/constants/staff";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameSelector } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";

const ART_W = 320;
/** Room buttons and the item tray draw above every placed item (DRAG_DEPTH included). */
const CONTROLS_DEPTH = DRAG_DEPTH + 10;
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

/** One staff member pacing the floor with a 3-frame walk cycle. */
const Walker = memo(function Walker({ id, width, height, lane }: { id: string; width: number; height: number; lane: number }) {
  const reduceMotion = useReducedMotion();
  const size = width * (CHARACTER_PX / ART_W);
  const x = useSharedValue(0);
  const step = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    // Each lane walks a different stretch at a different pace so they don't march in step.
    x.set(withRepeat(withTiming(1, { duration: 9000 + lane * 2600, easing: Easing.inOut(Easing.quad) }), -1, true));
    step.set(withRepeat(withTiming(WALK_SEQUENCE.length, { duration: WALK_SEQUENCE.length * WALK_FRAME_MS, easing: Easing.linear }), -1, false));
  }, [x, step, lane, reduceMotion]);
  const span = width - size * 1.2;
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (lane % 2 ? 1 - x.get() : x.get()) * span }] }));
  const frames = STAFF_FRAMES[id];
  const footY = 0.97 - lane * 0.035;
  return (
    // Sorted with the furniture by where their feet are: a nurse walks behind a bed that stands lower
    // on screen and in front of one that stands higher.
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: size * 0.1, top: height * footY - size, width: size, height: size, zIndex: depth(footY) }, style]}>
      {frames.map((src, i) => (
        <WalkFrame key={i} step={step} index={i} image={src} size={size} />
      ))}
    </Animated.View>
  );
});

function Staff({ ids, width, height }: { ids: string[]; width: number; height: number }) {
  return ids.map((s, i) => <Walker key={s} id={s} width={width} height={height} lane={i} />);
}

/** A placed item; draggable (and removable) in edit mode. */
function PlacedItem({ p, item, width, height, editing, onMove, onRemove }: {
  p: Placement; item: RoomItem; width: number; height: number; editing: boolean;
  onMove: (x: number, y: number) => void; onRemove: () => void;
}) {
  const size = width * (ITEM_PX / ART_W) * 1.5;
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const finish = (x: number, y: number) => {
    const s0 = start.current;
    start.current = null;
    last.current = null;
    setDrag(null);
    if (s0) onMove(p.x + (x - s0.x) / width, p.y + (y - s0.y) / height);
  };
  // View touch-responder props: refs are only read inside these event handlers.
  const dragHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      if (!start.current) return;
      last.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      setDrag({ dx: e.nativeEvent.pageX - start.current.x, dy: e.nativeEvent.pageY - start.current.y });
    },
    onResponderRelease: (e: GestureResponderEvent) => finish(e.nativeEvent.pageX, e.nativeEvent.pageY),
    // Taken away mid-drag: still drop it where the finger last was.
    onResponderTerminate: () => {
      const l = last.current;
      if (l) finish(l.x, l.y);
      else {
        start.current = null;
        setDrag(null);
      }
    },
  };
  const left = p.x * width - size / 2 + (drag?.dx ?? 0);
  const top = p.y * height - size + (drag?.dy ?? 0);
  return (
    <View
      {...(editing ? dragHandlers : {})}
      accessibilityLabel={item.name}
      style={{ position: "absolute", left, top, width: size, height: size, zIndex: drag ? DRAG_DEPTH : depth(p.y) }}
    >
      {item.frames ? <AnimatedSprite frames={item.frames} size={size} /> : <Image source={item.image} style={{ width: size, height: size }} contentFit="contain" />}
      {editing && (
        <>
          <View pointerEvents="none" className="absolute inset-0 border border-dashed border-ink/60" />
          <Pressable accessibilityRole="button" accessibilityLabel={`Put away ${item.name}`} hitSlop={8} onPress={onRemove} className="absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full border border-outline bg-primary">
            <PixelIcon name="close" size={8} />
          </Pressable>
        </>
      )}
    </View>
  );
}

/** "My Room": decorate hospital rooms with unlocked items; staff walk around and patients turn up. */
export function RoomPage({ width, editing, onEditingChange }: { width: number; editing: boolean; onEditingChange: (on: boolean) => void }) {
  const state = useGameSelector((s) => ({ room: s.room, achievements: s.achievements, rebirths: s.rebirths, treated: s.treated, owned: s.owned, gemItems: s.gemItems }));
  const { dispatch, pushToast } = useGameActions();
  const { playSfx, unlock } = useAudio();
  const haptic = useHaptics();
  const room = ROOMS.find((r) => r.id === state.room.current) ?? ROOMS[0];
  const placed = state.room.placed[room.id] ?? [];
  const height = width / room.aspect;
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
    if (!isUnlocked(item.unlock, state)) {
      haptic.denied();
      playSfx("invalid");
      return pushToast({ kind: "info", title: `${item.name} is locked`, body: unlockHint(item.unlock), image: item.image });
    }
    if (placed.some((p) => p.item === item.id)) {
      playSfx("click");
      return dispatch({ type: "removeItem", room: room.id, item: item.id });
    }
    if (placed.length >= room.limit) {
      haptic.denied();
      playSfx("invalid");
      return pushToast({ kind: "info", title: "Room is full", body: `${room.title} holds ${room.limit} items. Put one away first.` });
    }
    // Spread new items out so they don't all land in one spot.
    const x = 0.15 + ((placed.length * 0.37) % 0.7);
    const y = item.place === "floor" ? ZONES.floor.maxY - 0.03 : (ZONES.wall.minY + ZONES.wall.maxY) / 2 + 0.08;
    dispatch({ type: "placeItem", room: room.id, item: item.id, x, y });
    haptic.buy();
    playSfx("buy");
  };

  const ghostSize = width * (ITEM_PX / ART_W) * 1.5;
  // Drag-and-drop from the tray: drag a tile upward and a ghost follows the finger; drop it on the room.
  const rootRef = useRef<View>(null);
  const sceneRef = useRef<View>(null);
  const boxes = useRef<{ root: Box; scene: Box } | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  /** The dragged tile's image, positioned inside this page. */
  const [ghost, setGhost] = useState<{ item: RoomItem; left: number; top: number } | null>(null);
  /** A tile is being dragged: the tray stops scrolling so it doesn't slide along with the finger. */
  const [dragging, setDragging] = useState(false);
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
    },
    // Only a mostly-upward drag picks the tile up; sideways drags scroll the tray.
    onMoveShouldSetResponderCapture: (e: GestureResponderEvent) => {
      const t = touch.current;
      if (!t) return false;
      const dx = e.nativeEvent.pageX - t.x, dy = e.nativeEvent.pageY - t.y;
      const pick = dy < -10 && Math.abs(dy) > Math.abs(dx) * 0.8;
      if (pick) setDragging(true);
      return pick;
    },
    onResponderGrant: () => setDragging(true),
    onResponderTerminationRequest: () => false,
    onResponderMove: (e: GestureResponderEvent) => {
      const root = boxes.current?.root;
      lastPoint.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      if (root) setGhost({ item, left: e.nativeEvent.pageX - root.x - ghostSize / 2, top: e.nativeEvent.pageY - root.y - ghostSize });
    },
    onResponderRelease: (e: GestureResponderEvent) => drop(item, e.nativeEvent.pageX, e.nativeEvent.pageY),
    // Taken away mid-drag (the tray tried to scroll): still drop it where the finger last was.
    onResponderTerminate: () => {
      const l = lastPoint.current;
      if (l) drop(item, l.x, l.y);
      else endDrag();
    },
    onTouchEnd: () => setDragging(false),
    onTouchCancel: () => setDragging(false),
  });
  const endDrag = () => {
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
    if (!isUnlocked(item.unlock, state)) return tapItem(item); // shows the unlock hint
    if (!placed.some((p) => p.item === item.id) && placed.length >= room.limit) return tapItem(item); // "room is full"
    // Items stand on their feet, so the drop point is the bottom of the item.
    const fx = Math.min(0.95, Math.max(0.05, (pageX - b.x) / b.w));
    const fy = Math.min(1, Math.max(0, (pageY - b.y) / b.h + 0.06));
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
        <PixelIcon name={editing ? "check" : "edit"} size={16} />
      </Pressable>
    </HardShadow>
  );
  return (
    <View ref={rootRef} className="flex-1">
      {/* Decorating: the room switcher and Done button sit in a row above the room, never over it. */}
      {editing && (
        <View className="flex-row items-center justify-between gap-2 px-3 pb-2" style={{ zIndex: CONTROLS_DEPTH }}>
          <View className="flex-1 flex-row items-center self-stretch border-2 border-outline bg-surface">
            <Pressable accessibilityRole="button" accessibilityLabel="Previous room" onPress={() => cycleRoom(-1)} className="h-9 w-8 items-center justify-center">
              <PixelIcon name="left" size={12} />
            </Pressable>
            <View className="flex-1 items-center px-1">
              <Text className="font-pixel text-[10px] tracking-[1px] text-ink">{room.title.toUpperCase()}</Text>
              <Text className="font-number text-xs text-ink" numberOfLines={1}>
                {placed.length}/{room.limit} items · +{Math.round(rate * 100)}%/s +{Math.round(tap * 100)}%/tap
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Next room" onPress={() => cycleRoom(1)} className="h-9 w-8 items-center justify-center">
              <PixelIcon name="right" size={12} />
            </Pressable>
          </View>
          {toggle}
        </View>
      )}

      {/* While decorating, the room sits at the top so the item tray fits in the space below it. */}
      <ScenePage scene={editing ? { ...room, anchor: 0 } : room} width={width} contentRef={sceneRef}>
        {placedSorted.map((p) => {
          const item = ROOM_ITEMS.find((i) => i.id === p.item);
          if (!item) return null;
          return (
            <PlacedItem
              key={p.item}
              p={p}
              item={item}
              width={width}
              height={height}
              editing={editing}
              onMove={(x, y) => dispatch({ type: "placeItem", room: room.id, item: p.item, x, y })}
              onRemove={() => dispatch({ type: "removeItem", room: room.id, item: p.item })}
            />
          );
        })}
        {!editing && <Staff ids={room.staff} width={width} height={height} />}
        {!editing && <WardPatient width={width} height={height} />}
      </ScenePage>

      {/* Decorate button, drawn above everything in the room. */}
      {!editing && (
        <View className="absolute right-3 top-2" style={{ zIndex: CONTROLS_DEPTH }}>
          {toggle}
        </View>
      )}

      {/* Item tray: a swipe row under the room. Drag a tile up into the room, or tap it. */}
      {editing && (
        <View className="border-t-2 border-outline bg-surface py-1.5" style={{ zIndex: CONTROLS_DEPTH }} accessibilityHint={`Drag placed items to move them. Bonuses are capped at +${Math.round(ROOM_BONUS_CAP * 100)}% each.`}>
          <ScrollView horizontal scrollEnabled={!dragging} showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-3">
            {ROOM_ITEMS.map((item) => {
              const open = isUnlocked(item.unlock, state);
              const here = placed.some((p) => p.item === item.id);
              const elsewhere = !here && Object.entries(state.room.placed).some(([rid, list]) => rid !== room.id && list.some((p) => p.item === item.id));
              const bonus = item.bonus.rate ? `+${Math.round(item.bonus.rate * 100)}%/s` : `+${Math.round((item.bonus.tap ?? 0) * 100)}%/tap`;
              return (
                <View key={item.id} {...dragHandlers(item)}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={open ? `${item.name}, ${bonus}${here ? ", placed" : ""}` : `${item.name}, locked: ${unlockHint(item.unlock)}`}
                    onPress={() => tapItem(item)}
                    className={`w-14 items-center border-2 p-0.5 ${here ? "border-success bg-success/20" : "border-outline bg-surface"}`}
                  >
                    <Image source={item.image} style={{ width: 32, height: 32, opacity: open ? 1 : 0.35 }} contentFit="contain" tintColor={open ? undefined : "#5f6b7b"} />
                    <Text className="font-body text-[9px] leading-3 text-ink" numberOfLines={1}>
                      {open ? bonus : "locked"}
                    </Text>
                    {here && <View className="absolute right-0.5 top-0.5"><PixelIcon name="check" size={8} /></View>}
                    {elsewhere && <Text className="absolute left-0.5 top-0.5 font-pixel text-[7px] text-ink">IN USE</Text>}
                    {!open && <View className="absolute right-0.5 top-0.5"><PixelIcon name="lock" size={8} /></View>}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {ghost && (
        <View pointerEvents="none" style={{ position: "absolute", left: ghost.left, top: ghost.top, width: ghostSize, height: ghostSize, opacity: 0.85, zIndex: DRAG_DEPTH + 1 }}>
          <Image source={ghost.item.image} style={{ width: ghostSize, height: ghostSize }} contentFit="contain" />
        </View>
      )}
    </View>
  );
}

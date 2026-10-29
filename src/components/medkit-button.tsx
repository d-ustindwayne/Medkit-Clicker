import { memo, useEffect, useRef } from "react";
import { Image } from "@/components/ui/image";
import { Platform, View, type GestureResponderEvent } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Orbit } from "@/components/fx/orbit";
import { Sunburst } from "@/components/fx/sunburst";
import { TapBurst, type BurstHandle } from "@/components/fx/tap-burst";
import { MEDKIT_SKINS, ROUND_SKINS } from "@/constants/gems";
import { SFX, type SfxName } from "@/constants/playlists";
import { MEDKIT_IMAGE, type ItemId } from "@/constants/items";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { usePalette } from "@/hooks/use-palette";
import { formatShort } from "@/lib/format";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

/**
 * Tap bursts on screen at once. They're a fixed pool of slots that stay mounted and are reused in
 * turn, so tapping fast restarts an animation instead of mounting and unmounting a stack of views.
 */
const BURST_SLOTS = 5;
/** The orbit ring and sunburst extend past the medkit by these factors. */
export const ORBIT_SCALE = 1.32;
const SUNBURST_SCALE = 2.1;
/** Fast taps closer together than this share one tap sound. */
const SOUND_GAP_MS = 45;

/**
 * `skin` and `effect` are equipped Gem Shop items (null = the originals). `active`: the medkit page
 * is on screen; off screen its idle animations stop, so they don't cost frames on other pages.
 */
type Props = { size: number; tapAmount: number; owned: Record<ItemId, number>; skin?: string | null; effect?: string | null; active?: boolean };

/** The big round medkit with its heartbeat, sunburst and orbiting supplies. Memoized against the game tick. */
export const MedkitButton = memo(function MedkitButton({ size, tapAmount, owned, skin = null, effect = null, active = true }: Props) {
  const image = (skin && MEDKIT_SKINS[skin]) || MEDKIT_IMAGE;
  // Portrait skins fill more of the button than the medkit sprite does.
  const art = size * (skin && ROUND_SKINS.has(skin) ? 0.82 : 0.66);
  const { tap } = useGameActions();
  const { playSfx, unlock } = useAudio();
  const haptic = useHaptics();
  const palette = usePalette();
  const reduceMotion = useReduceMotion();
  const slots = useRef<(BurstHandle | null)[]>([]);
  const nextId = useRef(0);
  const lastSound = useRef(0);
  const press = useSharedValue(1);
  const beat = useSharedValue(1);
  const animate = active && !reduceMotion;

  // Idle heartbeat: lub-dub, rest.
  useEffect(() => {
    if (!animate) return;
    beat.set(
      withRepeat(
        withSequence(
          withTiming(1.045, { duration: 140 }),
          withTiming(1, { duration: 160 }),
          withTiming(1.03, { duration: 120 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(beat);
      beat.set(1);
    };
  }, [beat, animate]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() * beat.get() }] }));

  /** `count` fingers came down at once (several fingers tapping count as several taps). */
  const hit = (count: number) => {
    unlock();
    tap(count);
    const now = Date.now();
    if (now - lastSound.current >= SOUND_GAP_MS) {
      lastSound.current = now;
      playSfx(effect && effect in SFX ? (effect as SfxName) : "medkit");
    }
    haptic.tap();
    press.set(withTiming(0.9, { duration: 50 }));

    // Touch coordinates are relative to whichever child was hit (and differ on web),
    // so scatter the numbers over the top half of the medkit instead.
    const id = nextId.current++;
    slots.current[id % BURST_SLOTS]?.fire(size * (0.3 + Math.random() * 0.4), size * (0.2 + Math.random() * 0.25), `+${formatShort(tapAmount * count)}`);
  };
  const release = () => press.set(withSpring(1, { damping: 7, stiffness: 320 }));

  const box = size * ORBIT_SCALE;
  const sun = size * SUNBURST_SCALE;
  const inset = (box - size) / 2;

  const face = (
    // Reanimated views don't take NativeWind classes on native, so style an inner View.
    <Animated.View style={[{ width: size, height: size }, scaleStyle]}>
      <View style={{ width: size, height: size }} className="items-center justify-center rounded-full border-[6px] border-b-[12px] border-outline bg-surface">
        <Image source={image} style={{ width: art, height: art }} contentFit="contain" />
      </View>
    </Animated.View>
  );
  const a11y = { accessibilityRole: "button", accessibilityLabel: "Medkit", accessibilityHint: "Tap to earn medkits" } as const;

  return (
    <View style={{ width: box, height: box }}>
      <View pointerEvents="none" style={{ position: "absolute", left: (box - sun) / 2, top: (box - sun) / 2 }}>
        <Sunburst size={sun} color={palette.glow} active={active} />
      </View>
      <Orbit size={box} owned={owned} active={active} />

      <View style={{ position: "absolute", left: inset, top: inset, width: size, height: size }}>
        {Platform.OS === "web" ? (
          // Pointer events, not Pressable: inside the swipe pager a Pressable waits to rule out a
          // scroll before it reports a press, so quick clicks and taps were lost on the web.
          <View {...a11y} accessible onPointerDown={() => hit(1)} onPointerUp={release} onPointerCancel={release} style={{ width: size, height: size, cursor: "pointer" }}>
            {face}
          </View>
        ) : (
          // Raw touches instead of Pressable: a tap counts the moment a finger lands, every finger
          // counts (Pressable handles one at a time and waits for the release), and nothing is lost
          // when taps come faster than a press can finish.
          <View
            {...a11y}
            accessible
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={() => hit(1)}
            onTouchStart={(e: GestureResponderEvent) => hit(Math.max(1, e.nativeEvent.changedTouches?.length ?? 1))}
            // Owns its touches: a press that starts on the medkit never turns into a swipe to My Room,
            // however fast or sloppy the tapping (returning true from the grant blocks the pager).
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponderCapture={() => true}
            onResponderGrant={() => true}
            onResponderTerminationRequest={() => false}
            onTouchEnd={(e: GestureResponderEvent) => {
              if ((e.nativeEvent.touches?.length ?? 0) === 0) release();
            }}
            onTouchCancel={release}
            style={{ width: size, height: size }}
          >
            {face}
          </View>
        )}
        {Array.from({ length: BURST_SLOTS }, (_, i) => (
          <TapBurst
            key={i}
            slot={i}
            size={size}
            effect={effect}
            ref={(h) => {
              slots.current[i] = h;
            }}
          />
        ))}
      </View>
    </View>
  );
});

import { useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View, type GestureResponderEvent } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelIcon, type PixelIconName } from "@/components/ui/pixel-icon";
import { useAudio } from "@/hooks/use-audio";

/** A titled card that groups related settings. */
export function SettingsGroup({ title, icon, children }: { title: string; icon: PixelIconName; children: ReactNode }) {
  return (
    <HardShadow offset={5}>
      <View className="gap-4 border-2 border-outline bg-surface p-4">
        <View className="flex-row items-center gap-2 border-b-[1.5px] border-dashed border-outline/50 pb-2">
          <PixelIcon name={icon} size={14} />
          <Text className="font-pixel text-sm tracking-[3px] text-ink">{title}</Text>
        </View>
        {children}
      </View>
    </HardShadow>
  );
}

/**
 * Touch handlers for a bar you can press and drag along: `onSlide` gets the finger's position as
 * 0-1 across the bar on touch, while dragging, and (with `done`) on release. Positions come from
 * the finger's place on screen, so the value keeps following it even when it strays above, below
 * or past the ends of the bar. The bar keeps the touch, so a scrolling page doesn't take over
 * mid-drag. Its children should be pointerEvents "none" (the bar's left edge is found from the
 * first touch).
 */
export function useSlide(width: number, onSlide: (k: number, done: boolean) => void) {
  const left = useRef(0);
  const at = (e: GestureResponderEvent) => Math.min(1, Math.max(0, (e.nativeEvent.pageX - left.current) / Math.max(1, width)));
  return {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      left.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
      onSlide(at(e), false);
      return true;
    },
    onResponderMove: (e: GestureResponderEvent) => onSlide(at(e), false),
    onResponderRelease: (e: GestureResponderEvent) => onSlide(at(e), true),
    onResponderTerminate: (e: GestureResponderEvent) => onSlide(at(e), true),
  };
}

/** Label above a control. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-rounded text-sm text-ink">{label}</Text>
      {children}
    </View>
  );
}

/** "< Value >" picker for playlist and background. */
export function Stepper({ label, value, onPrev, onNext }: { label: string; value: string; onPrev: () => void; onNext: () => void }) {
  return (
    <View className="flex-row items-stretch border-[1.5px] border-outline bg-accent">
      <PixelButton accessibilityLabel={`Previous ${label}`} onPress={onPrev} tone="accent" bare className="w-11 border-r-[1.5px] border-outline">
        <PixelIcon name="left" size={14} />
      </PixelButton>
      <View className="flex-1 items-center justify-center">
        <Text className="font-rounded text-sm text-ink" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <PixelButton accessibilityLabel={`Next ${label}`} onPress={onNext} tone="accent" bare className="w-11 border-l-[1.5px] border-outline">
        <PixelIcon name="right" size={14} />
      </PixelButton>
    </View>
  );
}

/**
 * Speaker button (tap to mute/unmute) and a segmented level bar: tap a segment, or press and drag
 * along the bar (all the way left is off). Unmuting restores the level from before muting.
 */
export function VolumeControl({ label, value, steps, onChange }: { label: string; value: number; steps: number; onChange: (v: number) => void }) {
  const { playSfx } = useAudio();
  const [beforeMute, setBeforeMute] = useState(Math.max(1, Math.ceil(steps / 2)));
  const [barW, setBarW] = useState(0);
  const [held, setHeld] = useState(false);
  const set = (v: number) => {
    onChange(v);
    playSfx("click");
  };
  // A segment's level is set anywhere inside it; one click per step while dragging.
  const slide = useSlide(barW, (k, done) => {
    const v = Math.min(steps, Math.max(0, Math.ceil(k * steps)));
    if (v !== value) set(v);
    setHeld(!done);
  });

  return (
    <View
      className="flex-row items-center gap-2"
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: steps, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => set(Math.min(steps, Math.max(0, value + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value === 0 ? `Unmute ${label}` : `Mute ${label}`}
        onPress={() => {
          if (value === 0) set(beforeMute);
          else {
            setBeforeMute(value);
            set(0);
          }
        }}
        className="h-10 w-10 items-center justify-center border-[1.5px] border-outline bg-accent active:opacity-80"
      >
        <PixelIcon name={value === 0 ? "mute" : "speaker"} size={18} />
      </Pressable>
      <View
        {...slide}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
        className={`h-10 flex-1 flex-row gap-[3px] border-outline p-[3px] ${held ? "border-2 bg-accent" : "border-[1.5px] bg-backdrop"}`}
      >
        {Array.from({ length: steps }, (_, i) => (
          <View
            key={i}
            pointerEvents="none"
            // The level the finger is on stands out while dragging.
            className={`flex-1 ${i < value ? "bg-primary" : "bg-ink/10"} ${held && i === value - 1 ? "border-2 border-outline" : ""}`}
          />
        ))}
      </View>
      <Text className="w-11 text-right font-number text-base text-ink">{value === 0 ? "Off" : `${Math.round((value / steps) * 100)}%`}</Text>
    </View>
  );
}

/** Pill switch with an optional icon. */
export function Toggle({ label, icon, value, onChange }: { label: string; icon?: PixelIconName; value: boolean; onChange: (v: boolean) => void }) {
  const { playSfx } = useAudio();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        onChange(!value);
        playSfx("click");
      }}
      className="min-h-11 flex-row items-center justify-between border-[1.5px] border-outline bg-accent px-3"
    >
      <View className="flex-row items-center gap-2">
        {icon && <PixelIcon name={icon} size={14} />}
        <Text className="font-rounded text-sm text-ink">{label}</Text>
      </View>
      <View className={`h-6 w-12 justify-center rounded-full border-[1.5px] border-outline px-0.5 ${value ? "bg-ink" : "bg-surface"}`}>
        <View className={`h-4 w-4 rounded-full ${value ? "self-end bg-surface" : "self-start bg-ink"}`} />
      </View>
    </Pressable>
  );
}

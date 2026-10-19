import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

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
 * Speaker button (tap to mute/unmute) and a segmented level bar (tap a segment to set the level).
 * Unmuting restores the level from before muting.
 */
export function VolumeControl({ label, value, steps, onChange }: { label: string; value: number; steps: number; onChange: (v: number) => void }) {
  const { playSfx } = useAudio();
  const [beforeMute, setBeforeMute] = useState(Math.max(1, Math.ceil(steps / 2)));
  const set = (v: number) => {
    onChange(v);
    playSfx("click");
  };

  return (
    <View className="flex-row items-center gap-2" accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: steps, now: value }}>
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
      <View className="h-10 flex-1 flex-row gap-[3px] border-[1.5px] border-outline bg-backdrop p-[3px]">
        {Array.from({ length: steps }, (_, i) => (
          <Pressable
            key={i}
            accessibilityLabel={`${label} ${i + 1} of ${steps}`}
            onPress={() => set(i + 1)}
            className={`flex-1 ${i < value ? "bg-primary" : "bg-ink/10"}`}
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

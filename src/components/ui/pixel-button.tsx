import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

import { useAudio } from "@/hooks/use-audio";

type Tone = "plain" | "accent" | "success" | "danger";

const toneClass: Record<Tone, string> = {
  plain: "bg-surface",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
};

type Props = {
  label?: string;
  children?: ReactNode;
  tone?: Tone;
  onPress: () => void;
  className?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Drop the outline, for buttons that sit inside another bordered control. */
  bare?: boolean;
};

/** Square, black-outlined button from the prototype's settings panel. */
export function PixelButton({ label, children, tone = "plain", onPress, className = "", accessibilityLabel, disabled, bare }: Props) {
  const { playSfx, unlock } = useAudio();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => {
        unlock();
        playSfx("click");
        onPress();
      }}
      className={`min-h-11 items-center justify-center px-3 py-2 ${bare ? "" : "border-[1.5px] border-outline"} active:translate-y-0.5 active:opacity-80 ${toneClass[tone]} ${disabled ? "opacity-40" : ""} ${className}`}
    >
      {children ?? <Text className="font-rounded text-sm text-ink">{label}</Text>}
    </Pressable>
  );
}

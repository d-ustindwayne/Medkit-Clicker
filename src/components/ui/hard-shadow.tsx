import type { ReactNode } from "react";
import { View } from "react-native";

/**
 * Solid offset block behind its child, for the pixel-art "sticker" look.
 * The child needs an opaque background. Reserves room for the shadow so it isn't clipped.
 */
export function HardShadow({ offset = 4, className = "", children }: { offset?: number; className?: string; children: ReactNode }) {
  return (
    <View className={className} style={{ marginRight: offset, marginBottom: offset }}>
      <View className="absolute bg-shadow" style={{ left: offset, top: offset, right: -offset, bottom: -offset }} />
      {children}
    </View>
  );
}

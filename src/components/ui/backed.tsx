import type { ReactNode } from "react";
import { View } from "react-native";

import { imageBacking } from "@/constants/backgrounds";
import { useSettings } from "@/hooks/use-game";

/** A square with the Classic Grid's colour behind an icon, so see-through parts don't show the tile. */
export function Backed({ size, children }: { size: number; children: ReactNode }) {
  const { theme } = useSettings();
  return <View style={{ width: size, height: size, backgroundColor: imageBacking(theme), alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

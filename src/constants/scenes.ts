import type { ImageSourcePropType } from "react-native";

// Art for the swipeable pages next to the medkit. Each is null until it's drawn; drop the PNG in
// src/imgs/scenes/ and swap null for require("@/imgs/scenes/<file>.png"). See docs/ASSETS.md.
export const SCENES: { id: string; title: string; image: ImageSourcePropType | null }[] = [
  { id: "hospital", title: "Hospital", image: null },
];

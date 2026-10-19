import type { ImageSourcePropType } from "react-native";

// Art for the swipeable pages next to the medkit, in page order. Drop a PNG in src/imgs/scenes/
// and add an entry (null shows a "coming soon" frame). See docs/ASSETS.md.
export const SCENES: { id: string; title: string; image: ImageSourcePropType | null; aspect: number }[] = [
  { id: "hospital", title: "Hospital", image: require("@/imgs/scenes/hospital_outside.png"), aspect: 16 / 9 },
  { id: "ward", title: "Ward", image: require("@/imgs/scenes/hospital_inside.png"), aspect: 16 / 9 },
];

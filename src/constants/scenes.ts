import type { ImageSourcePropType } from "react-native";

export type Scene = {
  id: string;
  title: string;
  image: ImageSourcePropType;
  /** Width / height of the art. */
  aspect: number;
  /** The art's top and bottom edge colours, used to fill the page above and below it. */
  fillTop: string;
  fillBottom: string;
  /** Where the art sits in a taller page: 0 = top, 1 = bottom. */
  anchor: number;
};

/** Second page of the shop area: the outside of the hospital. */
export const HOSPITAL_SCENE: Scene = {
  id: "hospital",
  title: "Hospital",
  // The sky only: the building on top depends on rebirths (HOSPITAL_TIERS in hospital.ts).
  image: require("@/imgs/scenes/hospital_sky.png"),
  aspect: 4 / 3,
  fillTop: "#58b5ee",
  fillBottom: "#45963a",
  anchor: 0.85,
};

// The rooms next to the medkit (My Room) live in src/constants/room.ts.

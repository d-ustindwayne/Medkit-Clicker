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
  image: require("@/imgs/scenes/hospital_outside.png"),
  aspect: 16 / 9,
  fillTop: "#8fcff5",
  fillBottom: "#45963a",
  anchor: 0.85,
};

/** Second page of the clicker area, next to the medkit: the ward, where sick patients show up. */
export const WARD_SCENE: Scene = {
  id: "ward",
  title: "Ward",
  image: require("@/imgs/scenes/hospital_inside.png"),
  aspect: 16 / 9,
  fillTop: "#eef1f5",
  fillBottom: "#dfe6ee",
  anchor: 0.55,
};

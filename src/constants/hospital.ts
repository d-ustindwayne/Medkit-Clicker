import type { ImageSourcePropType } from "react-native";

// Traffic on the road in front of the hospital (the Hospital page). Vehicles are 32x32 art,
// exported at 128px, drawn at the scene's pixel scale (the scene is 320x180 art pixels).

export const CARS: ImageSourcePropType[] = [
  require("@/imgs/hospital/car_red.png"),
  require("@/imgs/hospital/car_blue.png"),
  require("@/imgs/hospital/taxi.png"),
  require("@/imgs/hospital/van_green.png"),
];
export const AMBULANCE: ImageSourcePropType = require("@/imgs/hospital/ambulance.png");

/** Two lanes: the far one drives left, the near one right. `y` is where the wheels touch, in art pixels. */
export const LANES = [
  { y: 158, dir: -1 },
  { y: 165, dir: 1 },
] as const;

/** Seconds between ordinary cars, and how long one takes to cross the screen. */
export const CAR_GAP: [number, number] = [2.5, 6];
export const CAR_CROSS: [number, number] = [5, 8];

/** Emergency admissions: an ambulance with its lights on; tap it before it leaves to admit the patient. */
export const AMBULANCE_GAP: [number, number] = [45, 90];
export const AMBULANCE_CROSS = 7;
/** Reward: this many seconds of healing, or this many taps early in the game, whichever is more. */
export const EMERGENCY_SECONDS = 60;
export const EMERGENCY_TAPS = 25;

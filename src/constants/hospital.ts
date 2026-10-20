import type { ImageSourcePropType } from "react-native";

// The Hospital page (shop, page 2). Everything here is drawn on the scene's 320x180 art-pixel grid.

/** The hospital grows with rebirths. Each look is a 320x180 scene with a transparent sky. */
export type HospitalTier = { rebirths: number; name: string; image: ImageSourcePropType };
export const HOSPITAL_TIERS: HospitalTier[] = [
  { rebirths: 0, name: "Small Clinic", image: require("@/imgs/scenes/hospital_0.png") },
  { rebirths: 1, name: "Community Clinic", image: require("@/imgs/scenes/hospital_1.png") },
  { rebirths: 3, name: "Health Center", image: require("@/imgs/scenes/hospital_2.png") },
  { rebirths: 6, name: "District Hospital", image: require("@/imgs/scenes/hospital_3.png") },
  { rebirths: 10, name: "General Hospital", image: require("@/imgs/scenes/hospital_4.png") },
  { rebirths: 15, name: "Regional Medical Center", image: require("@/imgs/scenes/hospital_5.png") },
  { rebirths: 21, name: "Teaching Hospital", image: require("@/imgs/scenes/hospital_6.png") },
  { rebirths: 28, name: "Specialist Hospital", image: require("@/imgs/scenes/hospital_7.png") },
  { rebirths: 36, name: "Medical Campus", image: require("@/imgs/scenes/hospital_8.png") },
  { rebirths: 45, name: "Grand Medical Center", image: require("@/imgs/scenes/hospital_9.png") },
];
export const HOSPITAL_SKY: ImageSourcePropType = require("@/imgs/scenes/hospital_sky.png");

/** The look for this many rebirths, and the next one (undefined once fully grown). */
export const hospitalTier = (rebirths: number) => {
  const i = HOSPITAL_TIERS.findLastIndex((t) => rebirths >= t.rebirths);
  return { tier: HOSPITAL_TIERS[i], next: HOSPITAL_TIERS[i + 1] as HospitalTier | undefined };
};

/** Clouds drift left to right behind the buildings. `y` is the cloud's top, `seconds` one full crossing. */
export const CLOUDS = [
  { image: require("@/imgs/hospital/cloud_big.png") as ImageSourcePropType, w: 60, y: 8, seconds: 140, start: 0.1 },
  { image: require("@/imgs/hospital/cloud_mid.png") as ImageSourcePropType, w: 46, y: 28, seconds: 110, start: 0.7 },
  { image: require("@/imgs/hospital/cloud_small.png") as ImageSourcePropType, w: 35, y: 44, seconds: 90, start: 0.4 },
];
export const CLOUD_H = 14;

export const CARS: ImageSourcePropType[] = [
  require("@/imgs/hospital/car_red.png"),
  require("@/imgs/hospital/car_blue.png"),
  require("@/imgs/hospital/taxi.png"),
  require("@/imgs/hospital/van_green.png"),
];
export const AMBULANCE: ImageSourcePropType = require("@/imgs/hospital/ambulance.png");

/** Two lanes: the far one drives left, the near one right. `y` is where the wheels touch. */
export const LANES = [
  { y: 158, dir: -1 },
  { y: 165, dir: 1 },
] as const;
/** Every look keeps its entrance centred here. */
export const DOOR_X = 160;

/** Seconds between ordinary cars, and how long one takes to cross the screen. */
export const CAR_GAP: [number, number] = [2.5, 6];
export const CAR_CROSS: [number, number] = [5, 8];

/** Emergencies: an ambulance pulls up at the entrance; tap it while it waits to admit the patient. */
export const AMBULANCE_GAP: [number, number] = [45, 90];
export const AMBULANCE_WAIT = 15;
/** Reward: this many seconds of healing, or this many taps early in the game, whichever is more. */
export const EMERGENCY_SECONDS = 60;
export const EMERGENCY_TAPS = 25;

/** Visitors (16x16, 2 walk frames) stroll along the plaza to the door. Busier healing, more visitors. */
export const VISITORS: [ImageSourcePropType, ImageSourcePropType][] = [
  [require("@/imgs/hospital/visitor_woman_1.png"), require("@/imgs/hospital/visitor_woman_2.png")],
  [require("@/imgs/hospital/visitor_man_1.png"), require("@/imgs/hospital/visitor_man_2.png")],
  [require("@/imgs/hospital/visitor_kid_1.png"), require("@/imgs/hospital/visitor_kid_2.png")],
  [require("@/imgs/hospital/visitor_elder_1.png"), require("@/imgs/hospital/visitor_elder_2.png")],
];
export const VISITOR_FEET_Y = 151;
/** Art pixels per second. */
export const VISITOR_SPEED = 14;
export const MAX_VISITORS = 6;
/** Seconds between visitors: 9 s with no healing, down to 2 s at a billion patients a second. */
export const visitorGap = (rate: number) => Math.max(2, 9 - 0.8 * Math.log10(1 + rate));

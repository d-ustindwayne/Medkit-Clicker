import type { ImageSourcePropType } from "react-native";

import { CAR_SPRITES } from "@/constants/cars";

// The Hospital page (shop, page 2). Everything here is drawn on the scene's 320x240 art-pixel grid.

/** The hospital grows with rebirths. Each look is a 320x240 scene with a transparent sky. */
export type HospitalTier = { rebirths: number; name: string; image: ImageSourcePropType; balloon?: SkyBalloon };
/** Something floating over a hospital look: its frames, size and resting spot (art pixels), and how far it drifts. */
export type SkyBalloon = { name: string; frames: ImageSourcePropType[]; x: number; y: number; w: number; h: number; drift: number };
/** The Sky Medical Centre: a clinic under a hot-air balloon, over Grand Haven Reborn. */
const SKY_MEDICAL: SkyBalloon = {
  name: "Sky Medical Centre",
  frames: [require("@/imgs/hospital/sky_medical_1.png"), require("@/imgs/hospital/sky_medical_2.png")],
  x: 22, y: 6, w: 48, h: 76, drift: 12,
};
export const HOSPITAL_TIERS: HospitalTier[] = [
  { rebirths: 0, name: "Little Clinic", image: require("@/imgs/scenes/hospital_0.png") },
  { rebirths: 1, name: "Neighbourhood Clinic", image: require("@/imgs/scenes/hospital_1.png") },
  { rebirths: 3, name: "Sunny Health Center", image: require("@/imgs/scenes/hospital_2.png") },
  { rebirths: 6, name: "Community Hospital", image: require("@/imgs/scenes/hospital_3.png") },
  { rebirths: 10, name: "Heartwood Hospital", image: require("@/imgs/scenes/hospital_4.png") },
  { rebirths: 15, name: "Wellspring Medical Center", image: require("@/imgs/scenes/hospital_5.png") },
  { rebirths: 21, name: "Sunrise Medical Center", image: require("@/imgs/scenes/hospital_6.png") },
  { rebirths: 28, name: "Skyline Medical Center", image: require("@/imgs/scenes/hospital_7.png") },
  { rebirths: 36, name: "Meadow Medical Campus", image: require("@/imgs/scenes/hospital_8.png") },
  { rebirths: 45, name: "Grand Haven Medical Center", image: require("@/imgs/scenes/hospital_9.png") },
  { rebirths: 50, name: "Grand Haven Reborn", image: require("@/imgs/scenes/hospital_10.png"), balloon: SKY_MEDICAL },
];
export const HOSPITAL_SKY: ImageSourcePropType = require("@/imgs/scenes/hospital_sky.png");

/** The sky follows the phone's clock. `tint` darkens or warms the buildings to match. */
export type DayPhase = "sunrise" | "day" | "sunset" | "night";
export const SKIES: Record<DayPhase, { image: ImageSourcePropType; tint: string | null; clouds: number; fill: string; dark: number; lights: boolean }> = {
  // `fill` is the sky image's top colour, so the sky carries on above the art without a seam.
  // `dark` shades the people and cars (0-1); `lights` turns the headlights on.
  sunrise: { image: require("@/imgs/scenes/hospital_sky_sunrise.png"), tint: "rgba(255,170,150,0.12)", clouds: 0.9, fill: "#008ed8", dark: 0.1, lights: false },
  day: { image: HOSPITAL_SKY, tint: null, clouds: 1, fill: "#58b5ee", dark: 0, lights: false },
  sunset: { image: require("@/imgs/scenes/hospital_sky_sunset.png"), tint: "rgba(255,120,60,0.16)", clouds: 0.8, fill: "#002978", dark: 0.2, lights: true },
  night: { image: require("@/imgs/scenes/hospital_sky_night.png"), tint: "rgba(10,16,48,0.42)", clouds: 0.25, fill: "#080c28", dark: 0.45, lights: true },
};
/** By the clock: sunrise 5-7, day 7-17, sunset 17-19, night 19-5. The game uses the real sun (sunPhase in src/lib/sun.ts) and this where the place isn't known. */
export const dayPhase = (hour: number): DayPhase => (hour >= 5 && hour < 7 ? "sunrise" : hour >= 7 && hour < 17 ? "day" : hour >= 17 && hour < 19 ? "sunset" : "night");

/** The look for this many rebirths, and the next one (undefined once fully grown). */
export const hospitalTier = (rebirths: number) => {
  const i = HOSPITAL_TIERS.findLastIndex((t) => rebirths >= t.rebirths);
  return { tier: HOSPITAL_TIERS[i], next: HOSPITAL_TIERS[i + 1] as HospitalTier | undefined };
};

/** Clouds drift left to right behind the buildings. `y` is the cloud's top, `seconds` one full crossing. */
export const CLOUDS = [
  { image: require("@/imgs/hospital/cloud_mid.png") as ImageSourcePropType, w: 46, y: 14, seconds: 160, start: 0.35 },
  { image: require("@/imgs/hospital/cloud_small.png") as ImageSourcePropType, w: 35, y: 40, seconds: 120, start: 0.85 },
  { image: require("@/imgs/hospital/cloud_big.png") as ImageSourcePropType, w: 60, y: 68, seconds: 140, start: 0.1 },
  { image: require("@/imgs/hospital/cloud_mid.png") as ImageSourcePropType, w: 46, y: 88, seconds: 110, start: 0.7 },
  { image: require("@/imgs/hospital/cloud_small.png") as ImageSourcePropType, w: 35, y: 104, seconds: 90, start: 0.4 },
];
export const CLOUD_H = 14;

/** Every model in every colour, so traffic rarely repeats (see src/constants/cars.ts). */
export const CARS: ImageSourcePropType[] = CAR_SPRITES;
export const AMBULANCE: ImageSourcePropType = require("@/imgs/hospital/ambulance.png");

/** Two lanes: the far one drives left, the near one right. `y` is where the wheels touch. */
export const LANES = [
  { y: 218, dir: -1 },
  { y: 225, dir: 1 },
] as const;
/** Every look keeps its entrance centred here. */
export const DOOR_X = 160;

/** Seconds between ordinary cars, and how long one takes to cross the screen. */
export const CAR_GAP: [number, number] = [2.5, 6];
export const CAR_CROSS: [number, number] = [5, 8];

/** Emergencies: an ambulance pulls up at the entrance; tap it while it waits to admit the patient. */
export const AMBULANCE_GAP: [number, number] = [120, 240];
export const AMBULANCE_WAIT = 20;
/** Reward: this many seconds of healing, or this many taps early in the game, whichever is more. */
export const EMERGENCY_SECONDS = 180;
export const EMERGENCY_TAPS = 25;

/** Visitors (16x16, 2 walk frames) stroll along the plaza to the door. Busier healing, more visitors. */
export const VISITORS: [ImageSourcePropType, ImageSourcePropType][] = [
  [require("@/imgs/hospital/visitor_woman_1.png"), require("@/imgs/hospital/visitor_woman_2.png")],
  [require("@/imgs/hospital/visitor_man_1.png"), require("@/imgs/hospital/visitor_man_2.png")],
  [require("@/imgs/hospital/visitor_kid_1.png"), require("@/imgs/hospital/visitor_kid_2.png")],
  [require("@/imgs/hospital/visitor_elder_1.png"), require("@/imgs/hospital/visitor_elder_2.png")],
];
export const VISITOR_FEET_Y = 211;
/** Art pixels per second. */
export const VISITOR_SPEED = 14;
export const MAX_VISITORS = 6;
/** Seconds between visitors: 9 s with no healing, down to 2 s at a billion patients a second. */
export const visitorGap = (rate: number) => Math.max(2, 9 - 0.8 * Math.log10(1 + rate));

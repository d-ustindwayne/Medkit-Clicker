import type { ImageSourcePropType } from "react-native";

// Walk cycles for the staff: standing frame, then left-foot and right-foot steps (src/imgs/characters).
export const STAFF_FRAMES: Record<string, ImageSourcePropType[]> = {
  "11_nurse_teal": [require("@/imgs/characters/11_nurse_teal.png"), require("@/imgs/characters/11_nurse_teal_walk1.png"), require("@/imgs/characters/11_nurse_teal_walk2.png")],
  "12_nurse_pink": [require("@/imgs/characters/12_nurse_pink.png"), require("@/imgs/characters/12_nurse_pink_walk1.png"), require("@/imgs/characters/12_nurse_pink_walk2.png")],
  "13_nurse_navy": [require("@/imgs/characters/13_nurse_navy.png"), require("@/imgs/characters/13_nurse_navy_walk1.png"), require("@/imgs/characters/13_nurse_navy_walk2.png")],
  "14_nurse_lavender": [require("@/imgs/characters/14_nurse_lavender.png"), require("@/imgs/characters/14_nurse_lavender_walk1.png"), require("@/imgs/characters/14_nurse_lavender_walk2.png")],
  "15_male_nurse": [require("@/imgs/characters/15_male_nurse.png"), require("@/imgs/characters/15_male_nurse_walk1.png"), require("@/imgs/characters/15_male_nurse_walk2.png")],
  "16_doctor": [require("@/imgs/characters/16_doctor.png"), require("@/imgs/characters/16_doctor_walk1.png"), require("@/imgs/characters/16_doctor_walk2.png")],
};

/** Frame order for one step cycle: stand, left, stand, right. */
export const WALK_SEQUENCE = [0, 1, 0, 2];
export const WALK_FRAME_MS = 200;

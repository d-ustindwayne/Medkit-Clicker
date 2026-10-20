import type { ImageSourcePropType } from "react-native";

import type { ItemId } from "@/constants/items";
import type { Scene } from "@/constants/scenes";

// "My Room": hospital rooms you decorate with items unlocked by playing. Placed items give small
// permanent bonuses. Rooms, limits, unlocks and bonuses are PLACEHOLDERS; see docs/TASKS.md.

/** What unlocks a room or an item. `null` = available from the start. */
export type Unlock =
  | null
  | { achievements: number }
  | { rebirths: number }
  | { treated: number }
  | { item: ItemId; owned: number };

export type Room = Scene & { unlock: Unlock; /** How many items fit. */ limit: number; /** Staff who walk around in it (character file numbers). */ staff: string[] };

const shell = { aspect: 16 / 9, fillTop: "#eef1f5", anchor: 0.55 };

export const ROOMS: Room[] = [
  { id: "empty", title: "Empty Room", image: require("@/imgs/scenes/room_empty.png"), ...shell, fillBottom: "#e9dcc8", unlock: null, limit: 6, staff: ["11_nurse_teal", "15_male_nurse"] },
  { id: "reception", title: "Reception", image: require("@/imgs/scenes/hospital_inside.png"), ...shell, fillBottom: "#dfe6ee", unlock: { achievements: 15 }, limit: 4, staff: ["12_nurse_pink", "16_doctor"] },
  { id: "lab", title: "Lab", image: require("@/imgs/scenes/room_lab.png"), ...shell, fillBottom: "#cfe3ee", unlock: { rebirths: 1 }, limit: 6, staff: ["16_doctor", "14_nurse_lavender"] },
  { id: "pharmacy", title: "Pharmacy", image: require("@/imgs/scenes/room_pharmacy.png"), ...shell, fillBottom: "#efe4cf", unlock: { treated: 10 }, limit: 7, staff: ["13_nurse_navy", "11_nurse_teal"] },
  { id: "kids", title: "Children's Ward", image: require("@/imgs/scenes/room_kids.png"), ...shell, fillBottom: "#fde7ef", unlock: { achievements: 40 }, limit: 8, staff: ["12_nurse_pink", "15_male_nurse", "14_nurse_lavender"] },
];

export type RoomItem = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  /** Floor items stand on the floor; wall items hang on the wall. */
  place: "floor" | "wall";
  /** Permanent bonus while placed, as a fraction (0.02 = +2%). */
  bonus: { rate?: number; tap?: number };
  unlock: Unlock;
};

export const ROOM_ITEMS: RoomItem[] = [
  { id: "potted_plant", name: "Potted Plant", image: require("@/imgs/room/potted_plant.png"), place: "floor", bonus: { rate: 0.01 }, unlock: null },
  { id: "waiting_bench", name: "Waiting Bench", image: require("@/imgs/room/waiting_bench.png"), place: "floor", bonus: { rate: 0.01 }, unlock: { item: "bandage", owned: 10 } },
  { id: "sanitizer", name: "Sanitizer", image: require("@/imgs/room/sanitizer.png"), place: "wall", bonus: { tap: 0.01 }, unlock: { achievements: 5 } },
  { id: "notice_board", name: "Notice Board", image: require("@/imgs/room/notice_board.png"), place: "wall", bonus: { rate: 0.01 }, unlock: { achievements: 10 } },
  { id: "iv_stand", name: "IV Stand", image: require("@/imgs/room/iv_stand.png"), place: "floor", bonus: { rate: 0.02 }, unlock: { item: "iv_bag", owned: 1 } },
  { id: "wheelchair", name: "Wheelchair", image: require("@/imgs/room/wheelchair.png"), place: "floor", bonus: { tap: 0.02 }, unlock: { treated: 1 } },
  { id: "first_aid_cabinet", name: "First-Aid Cabinet", image: require("@/imgs/room/first_aid_cabinet.png"), place: "wall", bonus: { rate: 0.02 }, unlock: { achievements: 20 } },
  { id: "privacy_screen", name: "Privacy Screen", image: require("@/imgs/room/privacy_screen.png"), place: "floor", bonus: { rate: 0.02 }, unlock: { treated: 5 } },
  { id: "hospital_bed", name: "Hospital Bed", image: require("@/imgs/room/hospital_bed.png"), place: "floor", bonus: { rate: 0.03 }, unlock: { rebirths: 1 } },
  { id: "security_camera", name: "Security Camera", image: require("@/imgs/room/security_camera.png"), place: "wall", bonus: { tap: 0.02 }, unlock: { achievements: 30 } },
  { id: "vending_machine", name: "Vending Machine", image: require("@/imgs/room/vending_machine.png"), place: "floor", bonus: { tap: 0.03 }, unlock: { item: "medicine", owned: 25 } },
  { id: "xray_viewer", name: "X-ray Viewer", image: require("@/imgs/room/xray_viewer.png"), place: "wall", bonus: { rate: 0.03 }, unlock: { item: "microscope", owned: 1 } },
  { id: "crash_cart", name: "Crash Cart", image: require("@/imgs/room/crash_cart.png"), place: "floor", bonus: { tap: 0.04 }, unlock: { treated: 25 } },
  { id: "aed", name: "AED", image: require("@/imgs/room/aed.png"), place: "wall", bonus: { rate: 0.04 }, unlock: { rebirths: 3 } },
];

/** Total room bonuses are capped so decorating stays a nice extra, not the whole economy. */
export const ROOM_BONUS_CAP = 0.75;
/** Items are drawn at their native 32px in the room's 320px-wide pixel scale. */
export const ITEM_PX = 32;
export const CHARACTER_PX = 64;
/** Where things can go, as fractions of the room art (floor starts at y = 119/180). */
export const ZONES = { floor: { minY: 0.72, maxY: 0.98 }, wall: { minY: 0.24, maxY: 0.58 } } as const;

export const unlockHint = (u: Unlock) => {
  if (!u) return "Available from the start";
  if ("achievements" in u) return `Unlock ${u.achievements} achievements`;
  if ("rebirths" in u) return u.rebirths === 1 ? "Rebirth once" : `Rebirth ${u.rebirths} times`;
  if ("treated" in u) return u.treated === 1 ? "Treat a ward patient" : `Treat ${u.treated} ward patients`;
  return `Own ${u.owned} ${u.item.replace("_", " ")}`;
};

type Progress = { achievements: Record<string, number | undefined>; rebirths: number; treated: number; owned: Record<ItemId, number> };
export const isUnlocked = (u: Unlock, s: Progress) => {
  if (!u) return true;
  if ("achievements" in u) return Object.keys(s.achievements).length >= u.achievements;
  if ("rebirths" in u) return s.rebirths >= u.rebirths;
  if ("treated" in u) return s.treated >= u.treated;
  return (s.owned[u.item] ?? 0) >= u.owned;
};

export type Placement = { item: string; x: number; y: number };
export type RoomState = { current: string; placed: Record<string, Placement[]> };

/** Sum of bonuses from every placed item (any room), capped. */
export function roomBonus(room: RoomState | undefined, stat: "rate" | "tap") {
  if (!room) return 0;
  let sum = 0;
  for (const list of Object.values(room.placed)) for (const p of list) sum += ROOM_ITEMS.find((i) => i.id === p.item)?.bonus[stat] ?? 0;
  return Math.min(ROOM_BONUS_CAP, sum);
}

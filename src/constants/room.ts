import type { ImageSourcePropType } from "react-native";

import type { ItemId } from "@/constants/items";
import type { Scene } from "@/constants/scenes";

// "My Room": hospital rooms you decorate with items unlocked by playing. Placed items give small
// permanent bonuses. Rooms, limits, unlocks and bonuses are PLACEHOLDERS.

/** What unlocks a room or an item. `null` = available from the start. */
export type Unlock =
  | null
  | { achievements: number }
  | { rebirths: number }
  | { treated: number }
  | { item: ItemId; owned: number }
  | { gem: string };

/** A box in the room art as fractions: [left, top, right, bottom]. */
export type Rect = [number, number, number, number];

export type Room = Scene & {
  unlock: Unlock;
  /** How many items fit. */
  limit: number;
  /** Staff who walk around in it (character file numbers). */
  staff: string[];
  /**
   * Where items can't go because the art already has something there: `wall` boxes (signs, windows,
   * doors, furniture) keep wall items off them; `floor` boxes are where furniture stands, so floor
   * items can't stand inside it. An item dropped on one snaps to the nearest free spot.
   */
  blocked: { wall: Rect[]; floor: Rect[] };
  /**
   * The room carried on to the left and right (80x240 art each, made by scripts/room-sides.lua),
   * shown while decorating when the room is zoomed out, and slid to.
   */
  sides: { left: ImageSourcePropType; right: ImageSourcePropType };
};

/** The rooms are 320x240 (4:3), exported at 1280x960. */
const shell = { aspect: 4 / 3, fillTop: "#eef1f5", anchor: 0.55 };

/**
 * The blocked areas were measured on the earlier 320x180 art. The art then gained 30 rows of wall
 * under the ceiling and 30 rows of floor, so a height measured then sits at 0.75 y + 0.125 now.
 */
export const fromOldArt = (y: number) => 0.75 * y + 0.125;
const measured = (b: { wall: Rect[]; floor: Rect[] }) => {
  const move = (r: Rect): Rect => [r[0], fromOldArt(r[1]), r[2], fromOldArt(r[3])];
  return { wall: b.wall.map(move), floor: b.floor.map(move) };
};

export const ROOMS: Room[] = [
  {
    id: "empty", title: "Empty Room", image: require("@/imgs/scenes/room_empty.png"), ...shell, fillBottom: "#e9dcc8", unlock: null, limit: 6, staff: ["11_nurse_teal", "15_male_nurse"],
    sides: { left: require("@/imgs/scenes/room_empty_left.png"), right: require("@/imgs/scenes/room_empty_right.png") },
    blocked: measured({ wall: [[0.06, 0.22, 0.17, 0.66] /* door */, [0.72, 0.15, 0.93, 0.45] /* window */], floor: [] }),
  },
  {
    id: "reception", title: "Reception", image: require("@/imgs/scenes/hospital_inside.png"), ...shell, fillBottom: "#dfe6ee", unlock: { achievements: 15 }, limit: 4, staff: ["12_nurse_pink", "16_doctor"],
    sides: { left: require("@/imgs/scenes/room_reception_left.png"), right: require("@/imgs/scenes/room_reception_right.png") },
    blocked: measured({
      wall: [
        [0.05, 0.13, 0.28, 0.21], // RECEPTION sign
        [0, 0.44, 0.34, 0.8], // desk, monitor and plant
        [0.43, 0.11, 0.58, 0.17], // WARD 1 sign
        [0.4, 0.17, 0.61, 0.66], // corridor doors
        [0.33, 0.22, 0.39, 0.42], // small frames
        [0.62, 0.09, 0.67, 0.18], // clock
        [0.62, 0.2, 0.75, 0.45], // Nightingale painting
        [0.75, 0.2, 0.8, 0.34], // heart monitor
        [0.8, 0.1, 1, 0.45], // window and curtain
        [0.79, 0.45, 1, 0.8], // bed and IV stand
        [0.57, 0.49, 0.77, 0.66], // waiting chairs and plant
      ],
      floor: [[0, 0.6, 0.34, 0.84] /* desk */, [0.79, 0.6, 1, 0.82] /* bed and IV stand */],
    }),
  },
  {
    id: "lab", title: "Lab", image: require("@/imgs/scenes/room_lab.png"), ...shell, fillBottom: "#cfe3ee", unlock: { rebirths: 1 }, limit: 6, staff: ["16_doctor", "14_nurse_lavender"],
    sides: { left: require("@/imgs/scenes/room_lab_left.png"), right: require("@/imgs/scenes/room_lab_right.png") },
    blocked: measured({ wall: [[0.12, 0.14, 0.29, 0.31] /* LAB board */, [0.33, 0.13, 0.45, 0.36] /* window */, [0.47, 0.36, 0.98, 0.66] /* counter */], floor: [] }),
  },
  {
    id: "pharmacy", title: "Pharmacy", image: require("@/imgs/scenes/room_pharmacy.png"), ...shell, fillBottom: "#efe4cf", unlock: { treated: 10 }, limit: 7, staff: ["13_nurse_navy", "11_nurse_teal"],
    sides: { left: require("@/imgs/scenes/room_pharmacy_left.png"), right: require("@/imgs/scenes/room_pharmacy_right.png") },
    blocked: measured({ wall: [[0.03, 0.12, 0.35, 0.5] /* shelves */, [0.65, 0.12, 0.97, 0.5] /* shelves */, [0.45, 0.13, 0.56, 0.38] /* PHARMACY sign */], floor: [] }),
  },
  {
    id: "kids", title: "Children's Ward", image: require("@/imgs/scenes/room_kids.png"), ...shell, fillBottom: "#fde7ef", unlock: { achievements: 40 }, limit: 8, staff: ["12_nurse_pink", "15_male_nurse", "14_nurse_lavender"],
    sides: { left: require("@/imgs/scenes/room_kids_left.png"), right: require("@/imgs/scenes/room_kids_right.png") },
    blocked: measured({ wall: [[0.11, 0.28, 0.66, 0.62] /* rainbow and its clouds */, [0.76, 0.14, 0.97, 0.46] /* window */], floor: [] }),
  },
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
  /** Animation frames (the first is `image`), for items bought in the Gem Shop. */
  frames?: ImageSourcePropType[];
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
  { id: "wall_clock", name: "Wall Clock", image: require("@/imgs/room/wall_clock.png"), place: "wall", bonus: { rate: 0.01 }, unlock: { achievements: 3 } },
  { id: "heart_poster", name: "Heart Poster", image: require("@/imgs/room/heart_poster.png"), place: "wall", bonus: { tap: 0.01 }, unlock: { treated: 2 } },
  { id: "teddy_bear", name: "Teddy Bear", image: require("@/imgs/room/teddy_bear.png"), place: "floor", bonus: { tap: 0.02 }, unlock: { treated: 3 } },
  { id: "armchair", name: "Armchair", image: require("@/imgs/room/armchair.png"), place: "floor", bonus: { rate: 0.01 }, unlock: { achievements: 8 } },
  { id: "toy_box", name: "Toy Box", image: require("@/imgs/room/toy_box.png"), place: "floor", bonus: { tap: 0.02 }, unlock: { treated: 8 } },
  { id: "floor_lamp", name: "Floor Lamp", image: require("@/imgs/room/floor_lamp.png"), place: "floor", bonus: { tap: 0.01 }, unlock: { item: "bandage", owned: 25 } },
  { id: "flower_vase", name: "Flower Vase", image: require("@/imgs/room/flower_vase.png"), place: "floor", bonus: { rate: 0.02 }, unlock: { item: "thermometer", owned: 5 } },
  { id: "bookshelf", name: "Bookshelf", image: require("@/imgs/room/bookshelf.png"), place: "floor", bonus: { rate: 0.02 }, unlock: { achievements: 25 } },
  { id: "string_lights", name: "String Lights", image: require("@/imgs/room/string_lights.png"), place: "wall", bonus: { rate: 0.02 }, unlock: { rebirths: 2 } },
  // Animated, from the Gem Shop
  { id: "aquarium", name: "Aquarium", image: require("@/imgs/room/aquarium_1.png"), frames: [require("@/imgs/room/aquarium_1.png"), require("@/imgs/room/aquarium_2.png"), require("@/imgs/room/aquarium_3.png"), require("@/imgs/room/aquarium_4.png")], place: "floor", bonus: { rate: 0.04 }, unlock: { gem: "aquarium" } },
  { id: "lava_lamp", name: "Lava Lamp", image: require("@/imgs/room/lava_lamp_1.png"), frames: [require("@/imgs/room/lava_lamp_1.png"), require("@/imgs/room/lava_lamp_2.png"), require("@/imgs/room/lava_lamp_3.png"), require("@/imgs/room/lava_lamp_4.png")], place: "floor", bonus: { tap: 0.04 }, unlock: { gem: "lava_lamp" } },
  { id: "patient_monitor", name: "Patient Monitor", image: require("@/imgs/room/patient_monitor_1.png"), frames: [require("@/imgs/room/patient_monitor_1.png"), require("@/imgs/room/patient_monitor_2.png"), require("@/imgs/room/patient_monitor_3.png"), require("@/imgs/room/patient_monitor_4.png")], place: "wall", bonus: { rate: 0.05 }, unlock: { gem: "patient_monitor" } },
];

/** Total room bonuses are capped so decorating stays a nice extra, not the whole economy. */
export const ROOM_BONUS_CAP = 0.75;
/** Items are drawn at their native 32px in the room's 320px-wide pixel scale. */
export const ITEM_PX = 32;
export const CHARACTER_PX = 64;
/**
 * Draw order in a room from where something touches the floor (0 top, 1 bottom of the room):
 * whatever stands lower on screen is nearer the viewer, so it's drawn in front.
 */
export const depth = (footY: number) => Math.round(footY * 1000);
/** Above everything in the room, for an item being dragged. */
export const DRAG_DEPTH = 5000;

// Fractions of the 320x240 art. The floor starts at 149/240; wall items start low enough that
// their tops stay inside the room art (and clear of its buttons).
export const ZONES = { floor: { minY: 0.665, maxY: 0.98 }, wall: { minY: 0.35, maxY: 0.56 } } as const;

/** An item's hitbox around its placement point (x centre, y feet), as fractions of the room art. */
const hitbox = (place: "floor" | "wall", x: number, y: number): Rect =>
  // Wall items: the middle of the sprite. Floor items: just where they stand.
  // (An item is 48/320 of the width wide, so 0.2 of the 4:3 room's height tall.)
  place === "wall" ? [x - 0.04, y - 0.16, x + 0.04, y - 0.03] : [x - 0.04, y - 0.04, x + 0.04, y];
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/**
 * The space a wall item's sprite takes (48/320 of the width, 0.2 of the room's height), trimmed by
 * WALL_OVERLAP on each side: two wall items may overlap at their edges, but never enough for one to
 * hide another.
 */
const WALL_OVERLAP = 0.1;
export const wallBox = (x: number, y: number): Rect => {
  const w = 0.15 * (1 - 2 * WALL_OVERLAP), h = 0.2 * (1 - 2 * WALL_OVERLAP);
  return [x - w / 2, y - 0.2 * WALL_OVERLAP - h, x + w / 2, y - 0.2 * WALL_OVERLAP];
};

/**
 * Whether an item may stand at x, y in a room: inside its zone, clear of the room's blocked areas
 * and, for wall items, of the `others` (the other wall items' wallBox).
 */
export const canPlace = (room: Room, place: "floor" | "wall", x: number, y: number, others: Rect[] = []) => {
  const zone = ZONES[place];
  if (x < 0.05 || x > 0.95 || y < zone.minY || y > zone.maxY) return false;
  const box = hitbox(place, x, y);
  if (room.blocked[place].some((r) => overlaps(box, r))) return false;
  if (place === "wall" && others.length > 0) {
    const sprite = wallBox(x, y);
    if (others.some((r) => overlaps(sprite, r))) return false;
  }
  return true;
};

/** The allowed spot nearest to x, y (on screen distance), or null when there's none left. */
export function findSpot(room: Room, place: "floor" | "wall", x: number, y: number, others: Rect[] = []) {
  const zone = ZONES[place];
  const cx = Math.min(0.95, Math.max(0.05, x)), cy = Math.min(zone.maxY, Math.max(zone.minY, y));
  if (canPlace(room, place, cx, cy, others)) return { x: cx, y: cy };
  let best: { x: number; y: number } | null = null, bestD = Infinity;
  for (let gx = 0.05; gx <= 0.951; gx += 0.01) {
    for (let gy = zone.minY; gy <= zone.maxY + 0.001; gy += 0.01) {
      if (!canPlace(room, place, gx, gy, others)) continue;
      const d = ((gx - cx) * room.aspect) ** 2 + (gy - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: Math.round(gx * 100) / 100, y: Math.round(gy * 100) / 100 };
      }
    }
  }
  return best;
}

/** The allowed spot nearest to x, y, so a drop on a sign or desk slides just clear of it. */
export const snapPlacement = (room: Room, place: "floor" | "wall", x: number, y: number) => {
  const zone = ZONES[place];
  return findSpot(room, place, x, y) ?? { x: Math.min(0.95, Math.max(0.05, x)), y: Math.min(zone.maxY, Math.max(zone.minY, y)) };
};

/** Where `item` would go if dropped at x, y among the room's `placed` items (null: no free spot on the wall). */
export const spotFor = (room: Room, placed: Placement[], item: RoomItem, x: number, y: number) => {
  const others = item.place !== "wall" ? [] : placed
    .filter((p) => p.item !== item.id && ROOM_ITEMS.find((i) => i.id === p.item)?.place === "wall")
    .map((p) => wallBox(p.x, p.y));
  return findSpot(room, item.place, x, y, others);
};

export const unlockHint = (u: Unlock) => {
  if (!u) return "Available from the start";
  if ("achievements" in u) return `Unlock ${u.achievements} achievements`;
  if ("rebirths" in u) return u.rebirths === 1 ? "Rebirth once" : `Rebirth ${u.rebirths} times`;
  if ("treated" in u) return u.treated === 1 ? "Treat a ward patient" : `Treat ${u.treated} ward patients`;
  if ("gem" in u) return "Buy it in the Gem Shop";
  return `Own ${u.owned} ${u.item.replace("_", " ")}`;
};

type Progress = { achievements: Record<string, number | undefined>; rebirths: number; treated: number; owned: Record<ItemId, number>; gemItems?: string[] };
export const isUnlocked = (u: Unlock, s: Progress) => {
  if (!u) return true;
  if ("achievements" in u) return Object.keys(s.achievements).length >= u.achievements;
  if ("rebirths" in u) return s.rebirths >= u.rebirths;
  if ("treated" in u) return s.treated >= u.treated;
  if ("gem" in u) return s.gemItems?.includes(u.gem) ?? false;
  return (s.owned[u.item] ?? 0) >= u.owned;
};

export type Placement = { item: string; x: number; y: number };
/** `layout` 2 = positions on the 320x240 rooms; saves without it are from the 320x180 ones. */
export type RoomState = { current: string; placed: Record<string, Placement[]>; layout?: 2 };

/** Sum of bonuses from every placed item (any room), capped. */
export function roomBonus(room: RoomState | undefined, stat: "rate" | "tap") {
  if (!room) return 0;
  let sum = 0;
  for (const list of Object.values(room.placed)) for (const p of list) sum += ROOM_ITEMS.find((i) => i.id === p.item)?.bonus[stat] ?? 0;
  return Math.min(ROOM_BONUS_CAP, sum);
}

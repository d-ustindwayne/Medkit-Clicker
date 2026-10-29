import type { ImageSourcePropType } from "react-native";

// The Natal Gem shop: permanent upgrades bought in levels, and cosmetics that rebirths unlock.
// Gems come from rebirthing (1 each). Decided with Dustin on 2026-10-20.

/** Every upgrade has 5 levels; level n costs GEM_LEVEL_COSTS[n - 1]. */
export const GEM_LEVEL_COSTS = [1, 2, 3, 5, 8];

export type GemUpgrade = { id: string; name: string; description: string; per: string; image: ImageSourcePropType };
export const GEM_UPGRADES: GemUpgrade[] = [
  { id: "steady_hands", name: "Steady Hands", description: "Each tap earns more.", per: "+10% per tap", image: require("@/imgs/shop/gloves.png") },
  { id: "night_owl", name: "Night Owl", description: "Your team works longer while you're away.", per: "+1 h offline", image: require("@/imgs/achievements/clock_moon.png") },
  { id: "bedside_manner", name: "Bedside Manner", description: "Ward patients pay more.", per: "+20% ward rewards", image: require("@/imgs/room/hospital_bed.png") },
  { id: "rapid_response", name: "Rapid Response", description: "Emergencies pay more.", per: "+25% emergency rewards", image: require("@/imgs/hospital/ambulance.png") },
  { id: "bulk_orders", name: "Bulk Orders", description: "Supplies cost less.", per: "-2% shop prices", image: require("@/imgs/gems/bulk_orders.png") },
  { id: "head_start", name: "Head Start", description: "Each new run starts with free supplies.", per: "+10 bandages, +5 gloves", image: require("@/imgs/shop/bandage_roll.png") },
];
export type GemUpgradeId = "steady_hands" | "night_owl" | "bedside_manner" | "rapid_response" | "bulk_orders" | "head_start";

/** Level of an upgrade (0-5) in a save. */
export const gemLevel = (s: { gemUpgrades?: Record<string, number> }, id: GemUpgradeId) => s.gemUpgrades?.[id] ?? 0;

export type GemItemKind = "skin" | "tap" | "background" | "room" | "icon" | "sticker";
export type GemItem = {
  id: string;
  name: string;
  kind: GemItemKind;
  cost: number;
  /** Rebirths needed before it can be bought. */
  rebirths: number;
  /** Only for whoever unlocked this reward section with its code. */
  section?: string;
  image: ImageSourcePropType;
};

export const GEM_ITEMS: GemItem[] = [
  // Medkit skins
  { id: "skin_gold", name: "Golden Medkit", kind: "skin", cost: 2, rebirths: 1, image: require("@/imgs/skins/skin_gold.png") },
  { id: "skin_candy", name: "Candy Medkit", kind: "skin", cost: 2, rebirths: 2, image: require("@/imgs/skins/skin_candy.png") },
  { id: "skin_night", name: "Night Shift Medkit", kind: "skin", cost: 3, rebirths: 4, image: require("@/imgs/skins/skin_night.png") },
  { id: "skin_crystal", name: "Crystal Medkit", kind: "skin", cost: 5, rebirths: 8, image: require("@/imgs/skins/skin_crystal.png") },
  { id: "skin_dustin_photo", name: "Dustin", kind: "skin", cost: 1, rebirths: 0, section: "jasmine", image: require("@/imgs/skins/dustin_photo.png") },
  // Tap effects
  { id: "tap_hearts", name: "Heart Burst", kind: "tap", cost: 1, rebirths: 1, image: require("@/imgs/gems/p_heart.png") },
  { id: "tap_sparkles", name: "Sparkles", kind: "tap", cost: 2, rebirths: 3, image: require("@/imgs/gems/p_sparkle.png") },
  { id: "tap_bubbles", name: "Bubbles", kind: "tap", cost: 3, rebirths: 6, image: require("@/imgs/gems/p_bubble.png") },
  // Premium animated backgrounds (listed in BACKGROUNDS with the same ids)
  { id: "sakura", name: "Sakura Breeze", kind: "background", cost: 3, rebirths: 2, image: require("@/imgs/gems/p_petal.png") },
  { id: "fireflies", name: "Firefly Night", kind: "background", cost: 4, rebirths: 5, image: require("@/imgs/gems/p_firefly.png") },
  { id: "snowfall", name: "First Snow", kind: "background", cost: 4, rebirths: 7, image: require("@/imgs/gems/p_snow.png") },
  { id: "aurora", name: "Aurora Ward", kind: "background", cost: 6, rebirths: 10, image: require("@/imgs/gems/p_sparkle.png") },
  // PLACEHOLDER icon (the sparkle) until the Galaxy gets its own sprite
  { id: "galaxy", name: "Galaxy", kind: "background", cost: 1, rebirths: 1, image: require("@/imgs/gems/p_sparkle.png") },
  // Your own photo as the background: unlock it here, pick the photo in Settings. PLACEHOLDER icon
  { id: "custom", name: "Your Photo", kind: "background", cost: 5, rebirths: 1, image: require("@/imgs/misc/decorate.png") },
  // Animated My Room items (listed in ROOM_ITEMS with the same ids)
  { id: "aquarium", name: "Aquarium", kind: "room", cost: 3, rebirths: 3, image: require("@/imgs/room/aquarium_1.png") },
  { id: "lava_lamp", name: "Lava Lamp", kind: "room", cost: 3, rebirths: 7, image: require("@/imgs/room/lava_lamp_1.png") },
  { id: "patient_monitor", name: "Patient Monitor", kind: "room", cost: 4, rebirths: 12, image: require("@/imgs/room/patient_monitor_1.png") },
  // App icons: change the icon on the phone's home screen (names match app.json's expo-alternate-app-icons)
  { id: "icon_gold", name: "Gold", kind: "icon", cost: 2, rebirths: 1, image: require("../../assets/images/icons/gold.png") },
  { id: "icon_candy", name: "Candy", kind: "icon", cost: 2, rebirths: 2, image: require("../../assets/images/icons/candy.png") },
  { id: "icon_night", name: "Night", kind: "icon", cost: 2, rebirths: 4, image: require("../../assets/images/icons/night.png") },
  { id: "icon_crystal", name: "Crystal", kind: "icon", cost: 3, rebirths: 8, image: require("../../assets/images/icons/crystal.png") },
  { id: "icon_dustin", name: "Dustin", kind: "icon", cost: 1, rebirths: 0, section: "jasmine", image: require("../../assets/images/icons/dustin.png") },
  // Stickers: once bought, save the PNG to your photos
  ...(
    [
      ["nightingale", "Florence Nightingale", 2, require("@/imgs/stickers/nightingale.png")],
      ["kawaii_medkit", "Happy Medkit", 1, require("@/imgs/stickers/kawaii_medkit.png")],
      ["happy_pill", "Happy Pill", 1, require("@/imgs/stickers/happy_pill.png")],
      ["bandaid_buddy", "Bandaid Buddy", 1, require("@/imgs/stickers/bandaid_buddy.png")],
      ["love_stetho", "Love Stethoscope", 1, require("@/imgs/stickers/love_stetho.png")],
      ["stayin_alive", "Stayin' Alive", 1, require("@/imgs/stickers/stayin_alive.png")],
      ["grumpy_germ", "Grumpy Germ", 1, require("@/imgs/stickers/grumpy_germ.png")],
      ["fever_thermo", "Fever!", 1, require("@/imgs/stickers/fever_thermo.png")],
      ["coffee_iv", "Coffee IV", 1, require("@/imgs/stickers/coffee_iv.png")],
      ["sleepy_cap", "Sleepy Cap", 1, require("@/imgs/stickers/sleepy_cap.png")],
      ["ambulance_zoom", "Zoom Zoom", 1, require("@/imgs/stickers/ambulance_zoom.png")],
      ["heal_yeah", "Heal Yeah!", 1, require("@/imgs/stickers/heal_yeah.png")],
      ["need_coffee", "Need Coffee", 1, require("@/imgs/stickers/need_coffee.png")],
      ["nurse_pink", "Nurse", 1, require("@/imgs/stickers/nurse_pink.png")],
      ["doctor", "Doctor", 1, require("@/imgs/stickers/doctor.png")],
      ["winged_heart", "Winged Heart", 1, require("@/imgs/stickers/winged_heart.png")],
      ["natal_gem", "Natal Gem", 1, require("@/imgs/stickers/natal_gem.png")],
      ["golden_medkit", "Golden Medkit", 1, require("@/imgs/stickers/golden_medkit.png")],
    ] as const
  ).map(([id, name, cost, image]): GemItem => ({ id: `sticker_${id}`, name, kind: "sticker", cost, rebirths: 1, image })),
];

export const GEM_KIND_LABEL: Record<GemItemKind, string> = { skin: "Medkit skin", tap: "Tap effect", background: "Animated background", room: "My Room item", icon: "App icon", sticker: "Sticker" };

export const MEDKIT_SKINS: Record<string, ImageSourcePropType> = Object.fromEntries(GEM_ITEMS.filter((i) => i.kind === "skin").map((i) => [i.id, i.image]));
/** Skins drawn as photos/portraits fill the button; pixel medkits keep the medkit's proportions. */
export const ROUND_SKINS = new Set(["skin_dustin_photo"]);

/** Gems available to spend. */
export const gemBalance = (s: { rebirthPoints: number; gemsSpent?: number; bonusGems?: number }) => s.rebirthPoints + (s.bonusGems ?? 0) - (s.gemsSpent ?? 0);

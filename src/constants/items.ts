import type { ImageSourcePropType } from "react-native";

export type ItemId =
  | "bandage"
  | "gloves"
  | "facemask"
  | "thermometer"
  | "stethoscope"
  | "bp_cuff"
  | "syringe"
  | "medicine"
  | "iv_bag"
  | "blood_vial"
  | "covid_test"
  | "microscope"
  | "dna";

export type ShopItem = {
  id: ItemId;
  name: string;
  image: ImageSourcePropType;
  baseCost: number;
  /** Patients healed per second, per unit owned. */
  rate: number;
};

/** Each purchase multiplies the next price by this. */
export const COST_GROWTH = 1.15;

/** Share of the per-second rate added to every medkit tap. */
export const TAP_RATE_BONUS = 0.02;

// Ordered from everyday bedside care to specialist diagnostics: first aid and infection control,
// then vital signs, then treatment, then the lab. Each tier costs ~10x the last and pays back slower,
// the classic clicker curve. Ids are what saves store, so reordering never touches progress.
export const SHOP_ITEMS: ShopItem[] = [
  { id: "bandage", name: "Bandage", image: require("@/imgs/shop/bandage_roll.png"), baseCost: 15, rate: 0.1 },
  { id: "gloves", name: "Gloves", image: require("@/imgs/shop/gloves.png"), baseCost: 100, rate: 1 },
  { id: "facemask", name: "Facemask", image: require("@/imgs/shop/facemask.png"), baseCost: 1_100, rate: 8 },
  { id: "thermometer", name: "Thermometer", image: require("@/imgs/shop/thermometer.png"), baseCost: 12_000, rate: 47 },
  { id: "stethoscope", name: "Stethoscope", image: require("@/imgs/shop/stethoscope.png"), baseCost: 130_000, rate: 260 },
  { id: "bp_cuff", name: "BP Cuff", image: require("@/imgs/shop/bp_tester.png"), baseCost: 1.4e6, rate: 1_400 },
  { id: "syringe", name: "Syringe", image: require("@/imgs/shop/syringe.png"), baseCost: 2e7, rate: 7_800 },
  { id: "medicine", name: "Medicine", image: require("@/imgs/shop/medicines.png"), baseCost: 3.3e8, rate: 44_000 },
  { id: "iv_bag", name: "IV Bag", image: require("@/imgs/shop/iv_bag.png"), baseCost: 5.1e9, rate: 260_000 },
  { id: "blood_vial", name: "Blood Test", image: require("@/imgs/shop/blood_vial.png"), baseCost: 7.5e10, rate: 1.6e6 },
  { id: "covid_test", name: "Rapid Test", image: require("@/imgs/shop/covid_test.png"), baseCost: 1e12, rate: 1e7 },
  { id: "microscope", name: "Microscope", image: require("@/imgs/shop/microscope.png"), baseCost: 1.4e13, rate: 6.5e7 },
  { id: "dna", name: "DNA Lab", image: require("@/imgs/shop/dna.png"), baseCost: 1.7e14, rate: 4.3e8 },
];

export const MEDKIT_IMAGE: ImageSourcePropType = require("@/imgs/medkit.png");
export const HOSPITAL_IMAGE: ImageSourcePropType = require("@/imgs/hospital.png");

export const itemCost = (item: ShopItem, owned: number) =>
  Math.ceil(item.baseCost * COST_GROWTH ** owned);

export const perSecond = (owned: Record<ItemId, number>) =>
  SHOP_ITEMS.reduce((sum, item) => sum + item.rate * (owned[item.id] ?? 0), 0);

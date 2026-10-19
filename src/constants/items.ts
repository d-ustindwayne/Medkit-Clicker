import type { ImageSourcePropType } from "react-native";

export type ItemId = "syringe" | "stethoscope" | "facemask" | "gloves" | "medicine";

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

export const SHOP_ITEMS: ShopItem[] = [
  { id: "syringe", name: "Syringe", image: require("@/imgs/syringe.png"), baseCost: 15, rate: 0.1 },
  { id: "stethoscope", name: "Stethoscope", image: require("@/imgs/stethoscope.png"), baseCost: 100, rate: 1 },
  { id: "facemask", name: "Facemask", image: require("@/imgs/facemask.png"), baseCost: 1_100, rate: 8 },
  { id: "gloves", name: "Gloves", image: require("@/imgs/gloves.png"), baseCost: 12_000, rate: 47 },
  { id: "medicine", name: "Medicine", image: require("@/imgs/medicines.png"), baseCost: 130_000, rate: 260 },
];

export const MEDKIT_IMAGE: ImageSourcePropType = require("@/imgs/medkit.png");
export const HOSPITAL_IMAGE: ImageSourcePropType = require("@/imgs/hospital.png");

export const itemCost = (item: ShopItem, owned: number) =>
  Math.ceil(item.baseCost * COST_GROWTH ** owned);

export const perSecond = (owned: Record<ItemId, number>) =>
  SHOP_ITEMS.reduce((sum, item) => sum + item.rate * (owned[item.id] ?? 0), 0);

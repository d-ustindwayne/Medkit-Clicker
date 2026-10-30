// Rewards written as text, the same way scripts/add-promo.ts takes them: "coins:20,gems:1",
// "seconds:600" (that much production), "medkits:5000", "background:purple_rain".
// describeRewards puts any reward (the Console's picked items too) in words for players.
import { BACKGROUNDS } from "@/constants/backgrounds";
import { BOOSTS } from "@/constants/boosts";
import { GEM_ITEMS } from "@/constants/gems";
import { SHOP_ITEMS } from "@/constants/items";
import { ROOM_ITEMS } from "@/constants/room";
import { formatCount } from "@/lib/format";
import type { PromoItem } from "@/lib/game";

const AMOUNTS = ["medkits", "coins", "gems", "seconds"] as const;

/** The rewards in `text`, or an error message saying which part is wrong. */
export function parseRewards(text: string): { rewards: PromoItem[] } | { error: string } {
  const rewards: PromoItem[] = [];
  for (const part of text.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [kind, value = ""] = part.split(":").map((p) => p.trim());
    if (kind === "background") {
      if (!BACKGROUNDS.some((b) => b.id === value)) return { error: `Unknown background "${value}".` };
      rewards.push({ kind, id: value });
      continue;
    }
    const amount = Number(value);
    if (!(AMOUNTS as readonly string[]).includes(kind) || !(amount > 0)) return { error: `"${part}" isn't a reward. Try coins:20, gems:1, seconds:600, medkits:5000 or background:<id>.` };
    rewards.push({ kind: kind as (typeof AMOUNTS)[number], amount });
  }
  return { rewards };
}

/** The other way round, for showing saved rewards. */
export const formatRewards = (rewards: PromoItem[]) =>
  rewards.map((r) => ("amount" in r ? `${r.kind}:${r.amount}` : "count" in r ? `${r.kind}:${r.id}:${r.count}` : `${r.kind}:${r.id}`)).join(", ");

/** The name of the thing a reward gives, from the game's own lists. */
export function rewardName(r: PromoItem) {
  if (r.kind === "background") return `${BACKGROUNDS.find((b) => b.id === r.id)?.name ?? "A new"} background`;
  if (r.kind === "cosmetic") return GEM_ITEMS.find((i) => i.id === r.id)?.name ?? r.id;
  if (r.kind === "room") return ROOM_ITEMS.find((i) => i.id === r.id)?.name ?? r.id;
  if (r.kind === "item") return SHOP_ITEMS.find((i) => i.id === r.id)?.name ?? r.id;
  if (r.kind === "boost") return BOOSTS.find((b) => b.id === r.id)?.name ?? r.id;
  return r.kind === "medkits" ? "medkits" : r.kind === "coins" ? "Care Coins" : r.kind === "gems" ? "Natal Gems" : "seconds of medkits";
}

/** "+20 Care Coins, Purple Rain background, 3x Adrenaline Shot" */
export const describeRewards = (rewards: PromoItem[]) =>
  rewards
    .map((r) => {
      if (r.kind === "seconds") return `${r.amount} ${rewardName(r)}`;
      if ("amount" in r) return `+${formatCount(r.amount)} ${rewardName(r)}`;
      if ("count" in r) return `${r.count}x ${rewardName(r)}`;
      return rewardName(r);
    })
    .join(", ");

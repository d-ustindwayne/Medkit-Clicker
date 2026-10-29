// Rewards written as text, the same way scripts/add-promo.ts takes them: "coins:20,gems:1",
// "seconds:600" (that much production), "medkits:5000", "background:purple_rain".
import { BACKGROUNDS } from "@/constants/backgrounds";
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
export const formatRewards = (rewards: PromoItem[]) => rewards.map((r) => ("id" in r ? `background:${r.id}` : `${r.kind}:${r.amount}`)).join(", ");

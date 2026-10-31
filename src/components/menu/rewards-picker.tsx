import { Pressable, Text, TextInput, View, type ImageSourcePropType } from "react-native";

import { Image } from "@/components/ui/image";
import { PixelButton } from "@/components/ui/pixel-button";
import { BACKGROUNDS } from "@/constants/backgrounds";
import { BOOSTS } from "@/constants/boosts";
import { GEM_ITEMS, GEM_KIND_LABEL } from "@/constants/gems";
import { SHOP_ITEMS } from "@/constants/items";
import { ROOM_ITEMS } from "@/constants/room";
import { usePalette } from "@/hooks/use-palette";
import type { PromoItem } from "@/lib/game";

// The Console's reward picker (web only): pick a kind of reward, the item, and how many, as many
// rows as you like. Every list comes from the game's own constants, so new items show up by themselves.

type Kind = PromoItem["kind"];
type Option = { id: string; name: string; image?: ImageSourcePropType };
const KINDS: { kind: Kind; label: string; options?: Option[]; qty: boolean }[] = [
  { kind: "medkits", label: "Medkits", qty: true },
  { kind: "coins", label: "Care Coins", qty: true },
  { kind: "gems", label: "Natal Gems", qty: true },
  { kind: "seconds", label: "Seconds of medkits", qty: true },
  { kind: "item", label: "Shop item", options: SHOP_ITEMS, qty: true },
  { kind: "boost", label: "Boost", options: BOOSTS, qty: true },
  // Backgrounds bought with Care Coins (and Custom); the Gem Shop ones are under Gem Shop item.
  { kind: "background", label: "Background", options: BACKGROUNDS.filter((b) => (b.price || b.gems) && !GEM_ITEMS.some((g) => g.id === b.id)), qty: false },
  { kind: "cosmetic", label: "Gem Shop item", options: GEM_ITEMS.map((g) => ({ id: g.id, name: `${GEM_KIND_LABEL[g.kind]}: ${g.name}`, image: g.image })), qty: false },
  // The Gem Shop's room items come with their cosmetic; these are the ones unlocked by playing.
  { kind: "room", label: "My Room item", options: ROOM_ITEMS.filter((i) => !(i.unlock && "gem" in i.unlock)), qty: false },
];
const kindOf = (kind: Kind) => KINDS.find((k) => k.kind === kind)!;

export type RewardRow = { kind: Kind; id: string; qty: string };
export const newRow = (): RewardRow => ({ kind: "coins", id: "", qty: "1" });

/** The picked rows as rewards, or what's missing. */
export function rowsToRewards(rows: RewardRow[]): { rewards: PromoItem[] } | { error: string } {
  const rewards: PromoItem[] = [];
  for (const r of rows) {
    const k = kindOf(r.kind);
    const qty = Number(r.qty);
    if (k.options && !r.id) return { error: `Pick which ${k.label.toLowerCase()}.` };
    if (k.qty && !(qty > 0)) return { error: `Give ${k.label} a quantity above 0.` };
    if (r.kind === "item" || r.kind === "boost") {
      if (qty > 1000) return { error: `Up to 1000 of a ${k.label.toLowerCase()}.` };
      rewards.push({ kind: r.kind, id: r.id, count: Math.floor(qty) });
    } else if (r.kind === "background" || r.kind === "cosmetic" || r.kind === "room") rewards.push({ kind: r.kind, id: r.id });
    else rewards.push({ kind: r.kind, amount: qty });
  }
  return { rewards };
}

export function RewardsPicker({ label, rows, onChange }: { label: string; rows: RewardRow[]; onChange: (rows: RewardRow[]) => void }) {
  const palette = usePalette();
  const box = "min-h-11 border-2 border-outline bg-surface px-2 py-2 font-body text-base text-ink";
  const set = (i: number, row: RewardRow) => onChange(rows.map((r, j) => (j === i ? row : r)));
  return (
    <View className="gap-2">
      <Text className="font-body text-sm text-ink">{label}</Text>
      {rows.map((r, i) => {
        const k = kindOf(r.kind);
        const picked = k.options?.find((o) => o.id === r.id);
        return (
          <View key={i} className="flex-row flex-wrap items-center gap-2">
            <select aria-label={`Reward ${i + 1}: kind`} value={r.kind} onChange={(e) => set(i, { kind: e.target.value as Kind, id: "", qty: "1" })} className={box}>
              {KINDS.map((o) => (
                <option key={o.kind} value={o.kind}>
                  {o.label}
                </option>
              ))}
            </select>
            {k.options && (
              <select aria-label={`Reward ${i + 1}: which`} value={r.id} onChange={(e) => set(i, { ...r, id: e.target.value })} className={`${box} min-w-40 flex-1`}>
                <option value="">Choose...</option>
                {k.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
            {picked?.image && <Image source={picked.image} style={{ width: 32, height: 32 }} contentFit="contain" />}
            {k.qty && (
              <TextInput
                accessibilityLabel={`Reward ${i + 1}: how many`}
                value={r.qty}
                onChangeText={(qty) => set(i, { ...r, qty: qty.replace(/[^\d.]/g, "") })}
                inputMode="decimal"
                placeholderTextColor={`${palette.ink}80`}
                className={`${box} w-28`}
              />
            )}
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove reward ${i + 1}`} onPress={() => onChange(rows.filter((_, j) => j !== i))} className="h-11 w-11 items-center justify-center border-2 border-outline bg-surface">
              <Text className="font-display text-lg text-danger">×</Text>
            </Pressable>
          </View>
        );
      })}
      <PixelButton label="Add a reward" onPress={() => onChange([...rows, newRow()])} />
    </View>
  );
}

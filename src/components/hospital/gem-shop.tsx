import { Image } from "expo-image";
import { ScrollView, Text, View } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { BACKGROUNDS } from "@/constants/backgrounds";
import { GEM_ITEMS, GEM_KIND_LABEL, GEM_LEVEL_COSTS, GEM_UPGRADES, gemBalance, type GemItem, type GemItemKind, type GemUpgrade } from "@/constants/gems";
import { GEM } from "@/constants/rebirth";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameState, useSettings } from "@/hooks/use-game";
import { useHaptics } from "@/hooks/use-haptics";
import { saveSticker } from "@/lib/stickers";

const MAX_LEVEL = GEM_LEVEL_COSTS.length;

function GemCost({ cost }: { cost: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Image source={GEM.image} style={{ width: 16, height: 16 }} contentFit="contain" />
      <Text className="font-number text-base leading-5 text-ink">{cost}</Text>
    </View>
  );
}

function UpgradeCard({ upgrade }: { upgrade: GemUpgrade }) {
  const state = useGameState();
  const { dispatch } = useGameActions();
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const level = state.gemUpgrades[upgrade.id] ?? 0;
  const cost = GEM_LEVEL_COSTS[level];
  const maxed = cost === undefined;
  const affordable = !maxed && gemBalance(state) >= cost;
  const buy = () => {
    dispatch({ type: "buyGemUpgrade", id: upgrade.id });
    haptic.buy();
    playSfx("buy");
  };
  return (
    <HardShadow offset={4}>
      <View className="flex-row items-center gap-3 border-[3px] border-outline bg-surface p-3">
        <Image source={upgrade.image} style={{ width: 40, height: 40 }} contentFit="contain" />
        <View className="flex-1 gap-1">
          <Text className="font-display text-base text-ink">{upgrade.name}</Text>
          <Text className="font-body text-xs text-ink opacity-70">
            {upgrade.description} {upgrade.per} per level.
          </Text>
          <View className="flex-row gap-1" accessibilityLabel={`Level ${level} of ${MAX_LEVEL}`}>
            {Array.from({ length: MAX_LEVEL }, (_, i) => (
              <View key={i} className={`h-3 w-5 border-[1.5px] border-outline ${i < level ? "bg-primary" : "bg-ink/10"}`} />
            ))}
          </View>
        </View>
        {maxed ? (
          <Text className="font-pixel text-xs text-ink">MAX</Text>
        ) : (
          <View className="items-center gap-1">
            <GemCost cost={cost} />
            <PixelButton label="Buy" tone="success" disabled={!affordable} onPress={buy} />
          </View>
        )}
      </View>
    </HardShadow>
  );
}

function ItemTile({ item }: { item: GemItem }) {
  const state = useGameState();
  const settings = useSettings();
  const { dispatch, updateSettings, pushToast } = useGameActions();
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const owned = state.gemItems.includes(item.id);
  const locked = state.rebirths < item.rebirths;
  const affordable = gemBalance(state) >= item.cost;
  const bgIndex = BACKGROUNDS.findIndex((b) => b.id === item.id);
  const equipped =
    (item.kind === "skin" && state.medkitSkin === item.id) ||
    (item.kind === "tap" && state.tapEffect === item.id) ||
    (item.kind === "background" && settings.background === bgIndex);

  const buy = () => {
    dispatch({ type: "buyGemItem", id: item.id });
    haptic.buy();
    playSfx("buy");
    if (item.kind === "background") updateSettings({ background: bgIndex });
    if (item.kind === "room") pushToast({ kind: "info", title: item.name, body: "It's in your My Room tray now. Swipe the medkit to My Room to place it.", image: item.image });
  };
  const save = () => {
    saveSticker(item.image as number)
      .then((ok) =>
        pushToast(ok ? { kind: "info", title: "Sticker saved", body: `${item.name} is in your photos.`, image: item.image } : { kind: "info", title: "Can't save yet", body: "Allow saving to photos to keep stickers." }),
      )
      .catch(() => pushToast({ kind: "info", title: "Couldn't save", body: "Something went wrong saving the sticker. Try again." }));
  };
  const use = () => {
    if (item.kind === "skin") dispatch({ type: "equip", slot: "skin", id: equipped ? null : item.id });
    else if (item.kind === "tap") dispatch({ type: "equip", slot: "tap", id: equipped ? null : item.id });
    else if (item.kind === "background") updateSettings({ background: equipped ? 0 : bgIndex });
  };

  return (
    <View className="w-[48%]">
      <HardShadow offset={3}>
        <View className={`items-center gap-1 border-2 border-outline p-2 ${equipped ? "bg-accent" : "bg-surface"}`}>
          <Image source={item.image} style={{ width: 52, height: 52, opacity: locked ? 0.35 : 1 }} contentFit="contain" />
          <Text className="text-center font-display text-sm text-ink" numberOfLines={1}>
            {item.name}
          </Text>
          {locked ? (
            <Text className="text-center font-body text-xs text-ink opacity-70">Rebirth {item.rebirths} to unlock</Text>
          ) : owned ? (
            item.kind === "room" ? (
              <Text className="text-center font-body text-xs text-ink opacity-70">In your My Room tray</Text>
            ) : item.kind === "sticker" ? (
              <PixelButton label="Save" tone="success" onPress={save} />
            ) : (
              <PixelButton label={equipped ? "Using" : "Use"} tone={equipped ? "plain" : "success"} onPress={use} />
            )
          ) : (
            <View className="items-center gap-1">
              <GemCost cost={item.cost} />
              <PixelButton label="Buy" tone="success" disabled={!affordable} onPress={buy} />
            </View>
          )}
        </View>
      </HardShadow>
    </View>
  );
}

const KINDS: GemItemKind[] = ["skin", "tap", "background", "room", "sticker"];
const SECTION_TITLE: Record<GemItemKind, string> = { skin: "MEDKIT SKINS", tap: "TAP EFFECTS", background: "ANIMATED BACKGROUNDS", room: "ANIMATED ROOM ITEMS", sticker: "STICKERS" };

/** Third page of the shop: spend Natal Gems on permanent upgrades and cosmetics. */
export function GemShop() {
  const state = useGameState();
  // Code-only items (like the Dustin skins) only exist for whoever unlocked their section.
  const items = GEM_ITEMS.filter((i) => !i.section || state.unlockedSections.includes(i.section));
  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-6">
      <View className="flex-row items-center justify-between border-2 border-outline bg-accent px-3 py-2">
        <Text className="font-body text-sm text-ink">Your {GEM.name}</Text>
        <View className="flex-row items-center gap-1">
          <Image source={GEM.image} style={{ width: 20, height: 20 }} contentFit="contain" />
          <Text className="font-number text-lg text-ink">{gemBalance(state)}</Text>
        </View>
      </View>
      <Text className="font-body text-sm leading-5 text-ink">
        Rebirth on the Hospital page to earn {GEM.name}. Upgrades last forever; each rebirth opens new cosmetics.
      </Text>

      <Text className="font-pixel text-sm tracking-[2px] text-ink">UPGRADES</Text>
      {GEM_UPGRADES.map((u) => (
        <UpgradeCard key={u.id} upgrade={u} />
      ))}

      {KINDS.map((kind) => (
        <View key={kind} className="gap-2">
          <Text className="font-pixel text-sm tracking-[2px] text-ink" accessibilityLabel={GEM_KIND_LABEL[kind]}>
            {SECTION_TITLE[kind]}
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {items
              .filter((i) => i.kind === kind)
              .map((i) => (
                <ItemTile key={i.id} item={i} />
              ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

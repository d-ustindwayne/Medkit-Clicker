import { useState } from "react";
import { Image } from "@/components/ui/image";
import { BackHandler, ScrollView, Text, View } from "react-native";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { BACKGROUNDS } from "@/constants/backgrounds";
import { GEM_ITEMS, GEM_KIND_LABEL, GEM_LEVEL_COSTS, GEM_UPGRADES, gemBalance, type GemItem, type GemItemKind, type GemUpgrade } from "@/constants/gems";
import { GEM } from "@/constants/rebirth";
import { useAudio } from "@/hooks/use-audio";
import { useGameActions, useGameSelector, useSettings } from "@/hooks/use-game";
import type { GameState } from "@/lib/game";
import { useHaptics } from "@/hooks/use-haptics";
import { appIcon, iconFromPending, setAppIcon } from "@/lib/app-icon";
import { saveSticker } from "@/lib/stickers";

const MAX_LEVEL = GEM_LEVEL_COSTS.length;
const pickGems = (s: GameState) => ({
  gemUpgrades: s.gemUpgrades, gemItems: s.gemItems, medkitSkin: s.medkitSkin, tapEffect: s.tapEffect,
  rebirths: s.rebirths, rebirthPoints: s.rebirthPoints, gemsSpent: s.gemsSpent, bonusGems: s.bonusGems, unlockedSections: s.unlockedSections,
});

function GemCost({ cost }: { cost: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Image source={GEM.image} style={{ width: 16, height: 16 }} contentFit="contain" />
      <Text className="font-number text-base leading-5 text-ink">{cost}</Text>
    </View>
  );
}

function UpgradeCard({ upgrade }: { upgrade: GemUpgrade }) {
  const state = useGameSelector(pickGems);
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
  const state = useGameSelector(pickGems);
  const settings = useSettings();
  const { dispatch, updateSettings, pushToast } = useGameActions();
  const { playSfx } = useAudio();
  const haptic = useHaptics();
  const owned = state.gemItems.includes(item.id);
  const locked = state.rebirths < item.rebirths;
  const affordable = gemBalance(state) >= item.cost;
  const bgIndex = BACKGROUNDS.findIndex((b) => b.id === item.id);
  const [iconName, setIconName] = useState(appIcon);
  const equipped =
    (item.kind === "skin" && state.medkitSkin === item.id) ||
    (item.kind === "tap" && state.tapEffect === item.id) ||
    (item.kind === "background" && settings.background === bgIndex) ||
    (item.kind === "icon" && iconName === item.name);

  const buy = () => {
    dispatch({ type: "buyGemItem", id: item.id });
    haptic.buy();
    playSfx("buy");
    if (item.kind === "background") updateSettings({ background: bgIndex });
    if (item.kind === "room") pushToast({ kind: "info", title: item.name, body: "It's in your My Room tray now. Swipe the medkit to My Room to place it.", image: item.image });
  };
  const save = () => {
    saveSticker(item.image as number)
      .then((how) => {
        if (how === "saved") pushToast({ kind: "info", title: "Sticker saved", body: `${item.name} is in your photos.`, image: item.image });
        else if (how === "failed") pushToast({ kind: "info", title: "Couldn't save", body: "This phone won't let the app save images." });
      })
      .catch(() => pushToast({ kind: "info", title: "Couldn't save", body: "Something went wrong saving the sticker. Try again." }));
  };
  // Changing the icon can close the app on Android, so it waits: restart now, or it's applied the
  // next time the app is left.
  const [askRestart, setAskRestart] = useState(false);
  const chosen = equipped ? "default" : item.name;
  const restartNow = () => {
    setAskRestart(false);
    setAppIcon(iconFromPending(chosen))
      .then(() => BackHandler.exitApp())
      .catch(() => pushToast({ kind: "info", title: "Couldn't change the icon", body: "This phone doesn't allow changing the app icon." }));
  };
  const later = () => {
    setAskRestart(false);
    dispatch({ type: "setPendingIcon", icon: chosen });
    setIconName(iconFromPending(chosen));
    pushToast({ kind: "info", title: "App icon saved", body: "The new icon appears after you close and reopen the app." });
  };
  const switchIcon = () => setAskRestart(true);
  const use = () => {
    if (item.kind === "icon") return switchIcon();
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
      {item.kind === "icon" && (
        <ConfirmDialog
          visible={askRestart}
          title="Change the app icon?"
          body={`The ${equipped ? "original" : item.name} icon shows after the app restarts. Restart now, or keep playing and it changes next time you open the game.`}
          cancelLabel="Later"
          confirmLabel="Restart now"
          confirmTone="success"
          onCancel={later}
          onConfirm={restartNow}
        />
      )}
    </View>
  );
}

const KINDS: GemItemKind[] = ["skin", "tap", "background", "room", "icon", "sticker"];
const SECTION_TITLE: Record<GemItemKind, string> = { skin: "MEDKIT SKINS", tap: "TAP EFFECTS", background: "ANIMATED BACKGROUNDS", room: "ANIMATED ROOM ITEMS", icon: "APP ICONS", sticker: "STICKERS" };

/** Third page of the shop: spend Natal Gems on permanent upgrades and cosmetics. */
export function GemShop() {
  const state = useGameSelector(pickGems);
  // Code-only items (like the Dustin skins) only exist for whoever unlocked their section.
  const items = GEM_ITEMS.filter((i) => !i.section || state.unlockedSections.includes(i.section));
  const locked = state.rebirths < 1;
  return (
    <View className="flex-1">
    <ScrollView contentContainerClassName="gap-4 px-4 pb-6" scrollEnabled={!locked}>
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
      {/* Until the first rebirth the whole Gem Shop is a preview behind a lock. */}
      {locked && (
        <View className="absolute inset-0 items-center justify-center bg-ink/55 px-8">
          <HardShadow offset={4}>
            <View className="items-center gap-2 border-[3px] border-outline bg-surface px-5 py-4">
              <PixelIcon name="lock" size={24} />
              <Text className="font-pixel text-sm tracking-[2px] text-ink">REBIRTH TO ACCESS</Text>
              <Text className="text-center font-body text-sm leading-5 text-ink">
                Rebirth on the Hospital page to earn your first {GEM.one} and open the Gem Shop.
              </Text>
            </View>
          </HardShadow>
        </View>
      )}
    </View>
  );
}

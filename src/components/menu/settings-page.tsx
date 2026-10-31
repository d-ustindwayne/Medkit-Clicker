import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Platform, Text, View } from "react-native";

import { BACKGROUNDS, ownsBackground } from "@/constants/backgrounds";
import { DevTools } from "@/components/menu/dev-tools";
import { MusicPlayer } from "@/components/menu/music-player";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, SettingsGroup, Stepper, Toggle, VolumeControl } from "@/components/ui/controls";
import { PixelButton } from "@/components/ui/pixel-button";
import { useMusic } from "@/hooks/use-audio";
import { openSections } from "@/constants/rewards";
import { useGameActions, useGameSelector, useGameStore, useSettings } from "@/hooks/use-game";
import { useNow } from "@/hooks/use-now";
import { COIN } from "@/constants/boosts";
import { CUSTOM_BG_COINS, coinBalance, customBgPrice } from "@/lib/game";
import { formatCount } from "@/lib/format";
import { CustomBgEditor } from "@/components/menu/custom-bg-editor";
import { pickCustomMedia, saveCustomBackground } from "@/lib/custom-bg";
import { framingFor, useCustomBackground, type CustomBg } from "@/lib/custom-bg-store";
import { appIcon } from "@/lib/app-icon";
import { cloudEnabled } from "@/lib/cloud";
import { exportSave, importSave, type SaveFormat } from "@/lib/save-file";
import { VOLUME_STEPS, type NumbersMode } from "@/lib/storage";

const cycle = (i: number, delta: number, length: number) => (i + delta + length) % length;

const NUMBERS: NumbersMode[] = ["all", "combined", "off"];
const NUMBERS_LABEL: Record<NumbersMode, string> = { all: "Every one", combined: "Combined", off: "Off" };

export function SettingsPage({ onDone }: { onDone: () => void }) {
  const settings = useSettings();
  // Only what the page shows, so it doesn't redraw on every game tick while it's open.
  const state = useGameSelector((s) => ({ ownedBackgrounds: s.ownedBackgrounds, unlockedSections: s.unlockedSections, devTools: s.devTools, coins: coinBalance(s), healed: Math.floor(s.healed), bgPrice: customBgPrice(s.runPeak), bgChanges: s.customBgChanges }));
  const store = useGameStore();
  const now = useNow(60_000);
  const music = useMusic();
  const { updateSettings, setTheme, replaceSave, resetProgress, dispatch, pushToast } = useGameActions();
  const [confirmReset, setConfirmReset] = useState(false);
  const background = BACKGROUNDS[settings.background % BACKGROUNDS.length];
  const owned = ownsBackground(settings.background, state.ownedBackgrounds);
  const coins = state.coins;
  const photo = useCustomBackground();
  // The first one is free; each change after that costs Care Coins and 20% of the run's best balance.
  // Re-framing the one already set (moving, zooming, the clip, the contrast) is free.
  const firstPhoto = state.bgChanges === 0;
  const affordable = (s: { customBgChanges: number; healed: number; runPeak: number } & Parameters<typeof coinBalance>[0]) =>
    s.customBgChanges === 0 || (coinBalance(s) >= CUSTOM_BG_COINS && s.healed >= customBgPrice(s.runPeak));
  const canChange = firstPhoto || (coins >= CUSTOM_BG_COINS && state.healed >= state.bgPrice);
  const [framing, setFraming] = useState<{ bg: CustomBg; fresh: boolean } | null>(null);
  const failed = (e: unknown) => pushToast({ kind: "info", title: "Couldn't use that", body: e instanceof Error ? e.message : "Try another one." });
  const onPickPhoto = async () => {
    if (!canChange) return;
    try {
      const picked = await pickCustomMedia();
      if (picked) setFraming({ bg: framingFor(picked), fresh: true });
    } catch (e) {
      failed(e);
    }
  };
  const onFramed = async (bg: CustomBg) => {
    const fresh = framing?.fresh;
    setFraming(null);
    try {
      if (!fresh) {
        await saveCustomBackground(bg);
        return pushToast({ kind: "info", title: "Background adjusted", body: "Saved the new framing." });
      }
      // Checked again now: the balance may have changed while it was being framed.
      const s = store.get();
      if (!affordable(s)) return pushToast({ kind: "info", title: "Not enough to change it", body: `It costs ${CUSTOM_BG_COINS} ${COIN.name} and ${formatCount(customBgPrice(s.runPeak))} medkits.` });
      const free = s.customBgChanges === 0;
      await saveCustomBackground(bg);
      dispatch({ type: "changeCustomBg" });
      pushToast({ kind: "info", title: "Background set", body: free ? "It's your background now." : `Changed for ${CUSTOM_BG_COINS} ${COIN.name} and ${formatCount(customBgPrice(s.runPeak))} medkits.` });
    } catch (e) {
      failed(e);
    }
  };

  const onExport = async (format: SaveFormat) => {
    try {
      const saved = await exportSave({ state: store.get(), settings, appIcon: appIcon() }, format);
      if (!saved) return;
      dispatch({ type: "exported" });
      pushToast({ kind: "info", title: "Save exported", body: `Saved your progress as a .${format} file.` });
    } catch (e) {
      pushToast({ kind: "info", title: "Export failed", body: e instanceof Error ? e.message : "Try again." });
    }
  };

  const onImport = async () => {
    try {
      const save = await importSave();
      if (!save) return;
      // The icon switches when the app is left, like one chosen in the Gem Shop.
      const icon = save.appIcon === undefined || save.appIcon === appIcon() ? null : (save.appIcon ?? "default");
      replaceSave({ ...save.state, pendingIcon: icon ?? save.state.pendingIcon });
      if (save.settings) updateSettings(save.settings);
      pushToast({ kind: "info", title: "Save imported", body: "Your progress has been restored." });
      onDone();
    } catch (e) {
      pushToast({
        kind: "info",
        title: "Import failed",
        body: e instanceof Error ? e.message : "Choose a .json or .csv save exported from Medkit Clicker.",
      });
    }
  };

  return (
    <View className="gap-5">
      <SettingsGroup title="AUDIO" icon="note">
        {music.library.length > 0 && (
          <>
            <MusicPlayer />
            {music.library.length > 1 && (
            <Field label="Playlist">
              <Stepper
                label="playlist"
                value={music.library[settings.playlist % music.library.length].name}
                onPrev={() => updateSettings({ playlist: cycle(settings.playlist, -1, music.library.length) })}
                onNext={() => updateSettings({ playlist: cycle(settings.playlist, 1, music.library.length) })}
              />
            </Field>
            )}
            <Field label="Music">
              <VolumeControl label="Music volume" value={settings.musicVolume} steps={VOLUME_STEPS} onChange={(v) => updateSettings({ musicVolume: v })} />
            </Field>
          </>
        )}
        {music.canDownload && (
          <View className="gap-2">
            {music.download ? (
              <Text className="font-body text-sm text-ink">
                Downloading music: {music.download.done} of {music.download.total} songs...
              </Text>
            ) : (
              <PixelButton label={music.library.length > 0 ? "Check for new songs" : "Download your music"} onPress={() => music.fetchMusic()} />
            )}
            {music.downloadError && <Text className="font-body text-xs text-danger">{music.downloadError}</Text>}
          </View>
        )}
        {/* A section unlocked without the server (an older build, offline): the code has to be checked online once. */}
        {cloudEnabled && !music.canDownload && openSections(state.unlockedSections, now).length > 0 && (
          <Text className="font-body text-xs text-ink opacity-70">{"Missing your music? Enter your code again on the code page while you're online."}</Text>
        )}
        <Field label="Sound effects">
          <VolumeControl label="Sound effects volume" value={settings.sfxVolume} steps={VOLUME_STEPS} onChange={(v) => updateSettings({ sfxVolume: v })} />
        </Field>
        {/* Browsers can't vibrate the way the app does, so the web version has no switch for it. */}
        {Platform.OS !== "web" && <Toggle label="Vibration" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />}
      </SettingsGroup>

      <SettingsGroup title="LOOK" icon={settings.theme === "dark" ? "moon" : "sun"}>
        <Field label="Background">
          <Stepper
            label="background"
            value={`${background.name}${owned ? "" : " (locked)"}`}
            onPrev={() => updateSettings({ background: cycle(settings.background, -1, BACKGROUNDS.length) })}
            onNext={() => updateSettings({ background: cycle(settings.background, 1, BACKGROUNDS.length) })}
          />
        </Field>
        {owned && background.darkOnly && settings.theme !== "dark" && (
          <Text className="font-body text-sm text-ink">{background.name} shows only in the dark theme.</Text>
        )}
        {owned && background.pattern === "photo" && (
          <View className="gap-2">
            <Text className="font-body text-sm text-ink">
              {firstPhoto
                ? "Pick a photo, a GIF or a short video for your background. The first one is free."
                : `Changing it costs ${CUSTOM_BG_COINS} ${COIN.name} and ${formatCount(state.bgPrice)} medkits.`}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <PixelButton label={photo ? "Change" : "Choose"} tone="success" disabled={!canChange} onPress={onPickPhoto} />
              </View>
              {photo && (
                <View className="flex-1">
                  <PixelButton label="Adjust" onPress={() => setFraming({ bg: photo, fresh: false })} />
                </View>
              )}
            </View>
            {framing && <CustomBgEditor initial={framing.bg} saveLabel={framing.fresh ? "Set it" : "Save"} onCancel={() => setFraming(null)} onSave={onFramed} />}
          </View>
        )}
        {!owned && background.gems && (
          <Text className="font-body text-sm text-ink">Premium background: get it in the Gem Shop (swipe the shop to Gems).</Text>
        )}
        {!owned && !background.gems && (
          <View className="flex-row items-center gap-3">
            <Image source={COIN.image} style={{ width: 20, height: 20 }} contentFit="contain" />
            <Text className="flex-1 font-body text-sm text-ink">
              Animated background. You have {coins} {COIN.name}.
            </Text>
            <PixelButton
              label={`Buy ${background.price}`}
              tone="success"
              disabled={coins < (background.price ?? 0)}
              onPress={() => dispatch({ type: "buyBackground", id: background.id })}
            />
          </View>
        )}
        <Toggle label="Dark mode" icon="moon" value={settings.theme === "dark"} onChange={(dark) => setTheme(dark ? "dark" : "light")} />
      </SettingsGroup>

      <SettingsGroup title="ACCESSIBILITY" icon="eye">
        <Toggle label="Reduce motion" value={settings.reduceMotion} onChange={(reduceMotion) => updateSettings({ reduceMotion })} />
        <Text className="font-body text-xs text-ink opacity-70">Stops animated backgrounds, spinning rays, confetti and screen shakes. On by itself if your phone asks for less motion.</Text>
        <Toggle label="Colour labels" value={settings.colorLabels} onChange={(colorLabels) => updateSettings({ colorLabels })} />
        <Text className="font-body text-xs text-ink opacity-70">Puts a letter on each pill colour in the minigames, for colour-blind players.</Text>
        <Stepper
          label="Floating numbers"
          value={NUMBERS_LABEL[settings.numbers]}
          onPrev={() => updateSettings({ numbers: NUMBERS[(NUMBERS.indexOf(settings.numbers) + NUMBERS.length - 1) % NUMBERS.length] })}
          onNext={() => updateSettings({ numbers: NUMBERS[(NUMBERS.indexOf(settings.numbers) + 1) % NUMBERS.length] })}
        />
        <Text className="font-body text-xs text-ink opacity-70">The numbers that pop up when you tap or spend. Combined keeps one running total instead of many, so fast tapping and buying stay tidy.</Text>
        <Toggle label="Lighter graphics" value={settings.lightGraphics} onChange={(lightGraphics) => updateSettings({ lightGraphics })} />
        <Text className="font-body text-xs text-ink opacity-70">Fewer moving bits in the backgrounds and no tilting with the phone. Helps slower phones and the battery.</Text>
      </SettingsGroup>

      <SettingsGroup title="SAVE DATA" icon="save">
        <Field label="Export save">
          <View className="flex-row gap-2">
            <PixelButton label="JSON" accessibilityLabel="Export as JSON" tone="success" onPress={() => onExport("json")} className="flex-1" />
            <PixelButton label="CSV" accessibilityLabel="Export as CSV" tone="success" onPress={() => onExport("csv")} className="flex-1" />
            {/* PHL export is planned; the format comes from a separate project. */}
            <PixelButton label="PHL" accessibilityLabel="Export as PHL, coming soon" tone="success" onPress={() => {}} disabled className="flex-1" />
          </View>
          <Text className="font-body text-xs text-ink opacity-70">PHL export is coming soon.</Text>
        </Field>
        <PixelButton label="Import save" onPress={onImport} />
      </SettingsGroup>

      <SettingsGroup title="DANGER ZONE" icon="warning">
        <Text className="font-body text-xs text-ink opacity-70">Wipes the progress on this device. Export a save first if you might want it back.</Text>
        <PixelButton label="Delete progress" tone="danger" onPress={() => setConfirmReset(true)} />
      </SettingsGroup>

      {(__DEV__ || state.devTools) && <DevTools />}

      <ConfirmDialog
        visible={confirmReset}
        title="Delete all progress?"
        body="This erases everything on this device: medkits, shop items, rebirths, achievements, codes you've entered and downloaded music. It can't be undone, so export a save first if you might want it back."
        cancelLabel="Keep playing"
        confirmLabel="Delete progress"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          await resetProgress();
          await music.forget();
          onDone();
        }}
      />
    </View>
  );
}

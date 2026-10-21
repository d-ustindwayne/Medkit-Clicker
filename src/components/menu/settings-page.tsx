import { useState } from "react";
import { Image } from "@/components/ui/image";
import { Text, View } from "react-native";

import { BACKGROUNDS, ownsBackground } from "@/constants/backgrounds";
import { DevTools } from "@/components/menu/dev-tools";
import { MusicPlayer } from "@/components/menu/music-player";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, SettingsGroup, Stepper, Toggle, VolumeControl } from "@/components/ui/controls";
import { PixelButton } from "@/components/ui/pixel-button";
import { useMusic } from "@/hooks/use-audio";
import { openSections } from "@/constants/rewards";
import { useGameActions, useGameState, useSettings } from "@/hooks/use-game";
import { useNow } from "@/hooks/use-now";
import { COIN } from "@/constants/boosts";
import { coinBalance } from "@/lib/game";
import { cloudEnabled } from "@/lib/cloud";
import { exportSave, importSave, type SaveFormat } from "@/lib/save-file";
import { VOLUME_STEPS } from "@/lib/storage";

const cycle = (i: number, delta: number, length: number) => (i + delta + length) % length;

export function SettingsPage({ onDone }: { onDone: () => void }) {
  const settings = useSettings();
  const state = useGameState();
  const now = useNow(60_000);
  const music = useMusic();
  const { updateSettings, setTheme, replaceSave, resetProgress, dispatch, pushToast } = useGameActions();
  const [confirmReset, setConfirmReset] = useState(false);
  const background = BACKGROUNDS[settings.background % BACKGROUNDS.length];
  const owned = ownsBackground(settings.background, state.ownedBackgrounds);
  const coins = coinBalance(state);

  const onExport = async (format: SaveFormat) => {
    try {
      const saved = await exportSave(state, format);
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
      replaceSave(save);
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
        <Toggle label="Vibration" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
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
        body="This erases your patients, shop items, rebirths and achievements. Rewards you've already redeemed stay redeemed. It can't be undone, so export a save first if you might want it back."
        cancelLabel="Keep playing"
        confirmLabel="Delete progress"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          await resetProgress();
          onDone();
        }}
      />
    </View>
  );
}

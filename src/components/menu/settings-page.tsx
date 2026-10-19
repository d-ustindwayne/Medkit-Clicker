import { useState } from "react";
import { Text, View } from "react-native";

import { BACKGROUNDS } from "@/components/background-pattern";
import { DevTools } from "@/components/menu/dev-tools";
import { MusicPlayer } from "@/components/menu/music-player";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, SettingsGroup, Stepper, Toggle, VolumeControl } from "@/components/ui/controls";
import { PixelButton } from "@/components/ui/pixel-button";
import { PLAYLISTS } from "@/constants/playlists";
import { useGameActions, useGameState, useSettings } from "@/hooks/use-game";
import { exportSave, importSave, type SaveFormat } from "@/lib/save-file";
import { VOLUME_STEPS } from "@/lib/storage";

const cycle = (i: number, delta: number, length: number) => (i + delta + length) % length;

export function SettingsPage({ onDone }: { onDone: () => void }) {
  const settings = useSettings();
  const state = useGameState();
  const { updateSettings, setTheme, replaceSave, resetProgress, dispatch, pushToast } = useGameActions();
  const [confirmReset, setConfirmReset] = useState(false);

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
        <MusicPlayer />
        <Field label="Playlist">
          <Stepper
            label="playlist"
            value={PLAYLISTS[settings.playlist % PLAYLISTS.length].name}
            onPrev={() => updateSettings({ playlist: cycle(settings.playlist, -1, PLAYLISTS.length) })}
            onNext={() => updateSettings({ playlist: cycle(settings.playlist, 1, PLAYLISTS.length) })}
          />
        </Field>
        <Field label="Music">
          <VolumeControl label="Music volume" value={settings.musicVolume} steps={VOLUME_STEPS} onChange={(v) => updateSettings({ musicVolume: v })} />
        </Field>
        <Field label="Sound effects">
          <VolumeControl label="Sound effects volume" value={settings.sfxVolume} steps={VOLUME_STEPS} onChange={(v) => updateSettings({ sfxVolume: v })} />
        </Field>
      </SettingsGroup>

      <SettingsGroup title="LOOK" icon={settings.theme === "dark" ? "moon" : "sun"}>
        <Field label="Background">
          <Stepper
            label="background"
            value={BACKGROUNDS[settings.background % BACKGROUNDS.length].name}
            onPrev={() => updateSettings({ background: cycle(settings.background, -1, BACKGROUNDS.length) })}
            onNext={() => updateSettings({ background: cycle(settings.background, 1, BACKGROUNDS.length) })}
          />
        </Field>
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

      <SettingsGroup title="DANGER ZONE" icon="close">
        <Text className="font-body text-xs text-ink opacity-70">Wipes the progress on this device. Export a save first if you might want it back.</Text>
        <PixelButton label="Delete progress" tone="danger" onPress={() => setConfirmReset(true)} />
      </SettingsGroup>

      {__DEV__ && <DevTools />}

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

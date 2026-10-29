import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { APP_INFO } from "@/constants/app";
import { useGameReady } from "@/hooks/use-game";
import { isNewer, latestVersion } from "@/lib/updates";

const KEY = "mc/update-check/v1";
/** GitHub is asked at most this often. */
const EVERY_MS = 12 * 60 * 60 * 1000;
/** After start-up, once the first screen has settled. */
const DELAY_MS = 8000;

/** What was checked: when, and a version the player said "Later" to (not asked about again). */
type Checked = { at: number; skipped?: string };

/**
 * Phones: tells the player when a newer version is on GitHub Releases. Android downloads the APK;
 * iPhones update in AltStore/SideStore, so they get the instructions page. Not on the web (it's
 * always the latest) or in development builds.
 */
export function UpdatePrompt() {
  const ready = useGameReady();
  const [latest, setLatest] = useState<string | null>(null);
  const current = Constants.expoConfig?.version ?? "0.0.0";
  useEffect(() => {
    if (!ready || Platform.OS === "web" || __DEV__) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      let saved: Checked | null = null;
      try {
        saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null") as Checked | null;
      } catch {}
      if (saved && Date.now() - saved.at < EVERY_MS) return;
      const v = await latestVersion(APP_INFO.latestRelease);
      if (cancelled || !v) return;
      AsyncStorage.setItem(KEY, JSON.stringify({ ...saved, at: Date.now() })).catch(() => {});
      if (isNewer(v, current) && v !== saved?.skipped) setLatest(v);
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, current]);

  const close = (skip: boolean) => {
    if (skip && latest) AsyncStorage.setItem(KEY, JSON.stringify({ at: Date.now(), skipped: latest } satisfies Checked)).catch(() => {});
    setLatest(null);
  };
  const ios = Platform.OS === "ios";
  return (
    <ConfirmDialog
      visible={latest !== null}
      title={`Version ${latest} is out`}
      body={ios ? `You have ${current}. Update it in AltStore or SideStore.` : `You have ${current}. Download the update? Your progress stays.`}
      confirmLabel={ios ? "How to update" : "Download"}
      confirmTone="success"
      cancelLabel="Later"
      onConfirm={() => {
        Linking.openURL(ios ? APP_INFO.iphone : APP_INFO.androidApk).catch(() => {});
        close(false);
      }}
      onCancel={() => close(true)}
    />
  );
}

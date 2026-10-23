import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

import type { PromoItem } from "@/lib/game";

// Talks to the Medkit Clicker server (server/index.ts). Nothing here logs anyone in: a redeem code
// is traded once for a token, and the token opens that section's rewards and music.
// Turned off unless EXPO_PUBLIC_API_URL is set at build time.

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
export const cloudEnabled = !!API_URL;

const TOKEN_KEY = "mc/cloud/token/v1";
const DEVICE_KEY = "mc/device/v1";
const LIBRARY_KEY = "mc/music/library/v1";
/** A section code entered while offline, kept until the server can trade it for a token. */
const PENDING_CODE_KEY = "mc/cloud/pending-code/v1";
/** A hall of fame entry written while offline, sent when the connection is back. */
const PENDING_FAME_KEY = "mc/fame/pending/v1";

/** Shown whenever something online is used without a connection. */
export const OFFLINE_MESSAGE = "You're offline. This needs an internet connection; try again once you're connected.";

/** Whether an error from the server calls means there was no connection at all. */
export const isOffline = (e: unknown) => (e as { offline?: boolean } | null)?.offline === true;

export type CloudReward = { id: string; name: string; cost: number; limit: number | null; redeemed: number[] };
export type CachedPlaylist = { id: string; name: string; tracks: string[] };
type Manifest = { id: string; name: string; tracks: { id: number; position: number; size: number; sha256: string }[] }[];

/** The free server sleeps when idle and takes up to about a minute to wake, so allow that, but no more. */
const TIMEOUT_MS = 75_000;

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  if (!API_URL) throw new Error("No server configured.");
  const { token, ...rest } = init;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    signal: abort.signal,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...rest.headers },
  })
    .catch(() => {
      // No answer at all: a timeout (the server is waking up) or no connection.
      if (abort.signal.aborted) throw new Error("The server took too long to answer. Try again in a minute.");
      throw Object.assign(new Error(OFFLINE_MESSAGE), { offline: true });
    })
    .finally(() => clearTimeout(timer));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Server error ${res.status}`), { status: res.status });
  return body as T;
}

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);

/** Keeps a section code that was unlocked offline, so ensureToken() can finish the job later. */
export const savePendingCode = (code: string) => AsyncStorage.setItem(PENDING_CODE_KEY, code.trim());
export const hasPendingCode = async () => !!(await AsyncStorage.getItem(PENDING_CODE_KEY));

/**
 * The section token, fetching it first if the code was entered while offline. Returns null when
 * there is no code, or when the server still can't be reached (the code stays saved for next time).
 */
export async function ensureToken() {
  const token = await getToken();
  if (token || !API_URL) return token;
  const pending = await AsyncStorage.getItem(PENDING_CODE_KEY);
  if (!pending) return null;
  try {
    const res = await unlockOnline(pending);
    // A code the server doesn't know (404) is dropped; it would never work.
    await AsyncStorage.removeItem(PENDING_CODE_KEY);
    return res?.token ?? null;
  } catch (e) {
    // An expired code (410) won't work later either.
    if ((e as { status?: number }).status === 410) await AsyncStorage.removeItem(PENDING_CODE_KEY);
    return null;
  }
}

/** Pokes the server so it's awake by the time it's needed (the free plan sleeps when idle). */
export function wakeServer() {
  if (API_URL) fetch(`${API_URL}/health`).catch(() => {});
}

/** A random id for this install, sent with redemptions so Dustin can tell devices apart. Not a login. */
export async function deviceId() {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Trades a redeem code for a token. Returns the section it unlocks, or null if the code is wrong. */
export async function unlockOnline(code: string) {
  try {
    const res = await call<{ token: string; section: string; title: string }>("/unlock", { method: "POST", body: JSON.stringify({ code }) });
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    return res;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

export const fetchRewards = (token: string) => call<CloudReward[]>("/rewards", { token });

/** Redeems on the server, which checks the limit and alerts Dustin. `note` is the answer to the reward's question, if any. */
export const redeemOnline = async (token: string, rewardId: string, note?: string) => {
  const res = await call<{ ok: true; at: number; used: number; limit: number | null; notified: boolean; alert?: { url: string; title: string; text: string; id: number } }>("/redeem", {
    method: "POST",
    token,
    body: JSON.stringify({ rewardId, deviceId: await deviceId(), note }),
  });
  // The server's alert was refused (its host shares IPs, so ntfy rate-limits it): send it from the
  // phone instead, then tell the server so it doesn't retry.
  if (!res.notified && res.alert) {
    const { url, title, text, id } = res.alert;
    const sent = await fetch(url, { method: "POST", body: text, headers: { Title: title, Tags: "gift" } }).then((r) => r.ok).catch(() => false);
    if (sent) {
      await call("/alerted", { method: "POST", token, body: JSON.stringify({ id }) }).catch(() => {});
      return { ...res, notified: true };
    }
  }
  return res;
};

const musicDir = () => new Directory(Paths.document, "music");

/** Deleting progress: forgets the code's token, a code waiting to go online, and the downloaded music. */
export async function forgetCloud() {
  await AsyncStorage.multiRemove([TOKEN_KEY, PENDING_CODE_KEY, LIBRARY_KEY]);
  try {
    const dir = musicDir();
    if (dir.exists) dir.delete();
  } catch {
    // no music folder (web) or already gone
  }
}

/** Playlists already downloaded to this phone (only files that are really there). */
export async function loadCachedPlaylists(): Promise<CachedPlaylist[]> {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    const list = raw ? (JSON.parse(raw) as CachedPlaylist[]) : [];
    return list.map((p) => ({ ...p, tracks: p.tracks.filter((uri) => new File(uri).exists) })).filter((p) => p.tracks.length > 0);
  } catch {
    return [];
  }
}

/**
 * Downloads every song the token can open into the app's documents folder, skipping files it
 * already has. `onProgress` gets (done, total) in songs. Returns the playlists ready to play.
 */
export async function downloadMusic(token: string, onProgress: (done: number, total: number) => void): Promise<CachedPlaylist[]> {
  const manifest = await call<Manifest>("/music", { token });
  const total = manifest.reduce((n, p) => n + p.tracks.length, 0);
  let done = 0;
  onProgress(done, total);
  const root = musicDir();
  if (!root.exists) root.create({ intermediates: true });
  const library: CachedPlaylist[] = [];
  for (const p of manifest) {
    const dir = new Directory(root, p.id);
    if (!dir.exists) dir.create({ intermediates: true });
    const tracks: string[] = [];
    for (const t of p.tracks) {
      // The file name carries the checksum, so a changed song downloads again.
      const file = new File(dir, `${t.position}-${t.sha256.slice(0, 12)}.m4a`);
      if (!file.exists || file.size !== t.size) {
        if (file.exists) file.delete();
        await File.downloadFileAsync(`${API_URL}/music/track/${t.id}`, file, { headers: { authorization: `Bearer ${token}` }, idempotent: true });
      }
      tracks.push(file.uri);
      onProgress(++done, total);
    }
    library.push({ id: p.id, name: p.name, tracks });
    // Saved after every playlist, so a download cut off halfway keeps what it already got.
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify([...library, ...(await loadCachedPlaylists()).filter((c) => !library.some((l) => l.id === c.id))]));
  }
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  return library;
}

/** `rewards` lists every part of a bundle; older servers send only `kind` and `amount`. */
export type PromoReward = { kind: "medkits" | "coins" | "gems" | "bundle"; amount: number; message: string | null; rewards?: PromoItem[] };

/**
 * Claims a promo code (released later by Dustin; see scripts/add-promo.ts). The server allows one
 * claim per phone. Returns the reward, or null if the code doesn't exist, has run out or was used here.
 */
export async function claimPromoOnline(code: string): Promise<PromoReward | null> {
  try {
    return await call<PromoReward>("/promo", { method: "POST", body: JSON.stringify({ code, deviceId: await deviceId() }) });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404 || status === 409) return null;
    throw e;
  }
}

export type FameEntry = { name: string; email: string; feedback: string; rebirths: number };

/** Rebirth 50: send the player's details and feedback (once per phone). */
export async function sendHallOfFame(entry: FameEntry) {
  return call<{ ok: true }>("/fame", { method: "POST", body: JSON.stringify({ ...entry, deviceId: await deviceId() }) });
}

/** Holds a hall of fame entry written offline; sendPendingFame() delivers it later. */
export const holdFame = (entry: FameEntry) => AsyncStorage.setItem(PENDING_FAME_KEY, JSON.stringify(entry));

/** Sends a held hall of fame entry. True once it's delivered (or the server already has one), false if still waiting. */
export async function sendPendingFame() {
  const raw = await AsyncStorage.getItem(PENDING_FAME_KEY);
  if (!raw || !API_URL) return false;
  try {
    await sendHallOfFame(JSON.parse(raw) as FameEntry);
  } catch (e) {
    if ((e as { status?: number }).status !== 409) return false;
  }
  await AsyncStorage.removeItem(PENDING_FAME_KEY);
  return true;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Directory, Paths } from "expo-file-system";

// Talks to the Medkit Clicker server (server/index.ts). Nothing here logs anyone in: a redeem code
// is traded once for a token, and the token opens that section's rewards.
// Turned off unless EXPO_PUBLIC_API_URL is set at build time.

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
export const cloudEnabled = !!API_URL;

const TOKEN_KEY = "mc/cloud/token/v1";
const DEVICE_KEY = "mc/device/v1";
/** Where downloaded songs were listed (no longer used; cleared on launch). */
const LIBRARY_KEY = "mc/music/library/v1";

export type CloudReward = { id: string; name: string; cost: number; limit: number | null; redeemed: number[] };

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
    .catch((e) => {
      throw new Error(abort.signal.aborted ? "The server took too long to answer. Try again in a minute." : e instanceof Error ? e.message : "No connection.");
    })
    .finally(() => clearTimeout(timer));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Server error ${res.status}`), { status: res.status });
  return body as T;
}

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);

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
export const redeemOnline = async (token: string, rewardId: string, note?: string) =>
  call<{ ok: true; at: number; used: number; limit: number | null; notified: boolean }>("/redeem", { method: "POST", token, body: JSON.stringify({ rewardId, deviceId: await deviceId(), note }) });

/** Songs used to download after a code unlock; that's gone, so free the space they took. */
export function clearDownloadedMusic() {
  try {
    const dir = new Directory(Paths.document, "music");
    if (dir.exists) dir.delete();
    AsyncStorage.removeItem(LIBRARY_KEY).catch(() => {});
  } catch {
    // nothing to clean up
  }
}

export type PromoReward = { kind: "medkits" | "coins" | "gems"; amount: number; message: string | null };

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

/** Rebirth 50: send the player's details and feedback (once per phone). */
export async function sendHallOfFame(entry: { name: string; email: string; feedback: string; rebirths: number }) {
  return call<{ ok: true }>("/fame", { method: "POST", body: JSON.stringify({ ...entry, deviceId: await deviceId() }) });
}

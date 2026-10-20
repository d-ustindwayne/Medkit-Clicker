import * as Crypto from "expo-crypto";

import { REWARD_SECTIONS, type RewardSection } from "@/constants/rewards";

/** Codes are case-insensitive and ignore surrounding spaces. Must match scripts/add-code.ts. */
export const normalizeCode = (code: string) => code.trim().toLowerCase();

/** Returns the section a code unlocks, or null if it matches none. */
export async function sectionForCode(code: string): Promise<RewardSection | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
  return REWARD_SECTIONS.find((s) => s.codeHash && s.codeHash.toLowerCase() === hash) ?? null;
}

const sha = (normalized: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);

/** The developer code turns on Dev Tools. Only its hash is in the build (EXPO_PUBLIC_CODE_DEV, see add-code). */
export async function isDevCode(code: string) {
  const hash = process.env.EXPO_PUBLIC_CODE_DEV;
  const normalized = normalizeCode(code);
  return !!hash && !!normalized && (await sha(normalized)) === hash.toLowerCase();
}

/** The SHA-256 of a normalised code, as the server stores promo codes. */
export const codeHash = (code: string) => sha(normalizeCode(code));

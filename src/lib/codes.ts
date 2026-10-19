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

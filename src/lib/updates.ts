// The phone app's update check: is there a newer GitHub Release than this build?

/** "v0.7.10" or "0.7.10" → [0, 7, 10]; anything that isn't a version → null. */
export function parseVersion(v: string): number[] | null {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
}

/** Whether `latest` is a newer version than `current` (false when either can't be read). */
export function isNewer(latest: string, current: string) {
  const a = parseVersion(latest), b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** The newest release's version ("0.7.7"), or null when it can't be fetched. */
export async function latestVersion(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/vnd.github+json" } });
    if (!res.ok) return null;
    const tag = ((await res.json()) as { tag_name?: string }).tag_name;
    return tag ? tag.replace(/^v/, "") : null;
  } catch {
    return null;
  }
}

// After `vite build`: writes dist/altstore.json, the AltStore/SideStore source players add on their
// iPhone (https://faq.altstore.io/developers/make-a-source). Each version comes from a GitHub
// Release that the iOS workflow attached medkit-clicker-<version>.ipa and ios-build.json to
// (ios-build.json lists the build's version, minimum iOS and the permissions AltStore checks).
// Run from website/ with GITHUB_REPOSITORY (owner/name) and GITHUB_TOKEN set, as the deploy does;
// without them, or with no iOS release yet, it writes the source with no versions.
import { writeFileSync } from "node:fs";

import { DEFAULT_DESCRIPTION, SITE_URL } from "../src/lib/pages";

type Asset = { name: string; size: number; browser_download_url: string };
type Release = { tag_name: string; published_at: string; body: string | null; draft: boolean; prerelease: boolean; assets: Asset[] };
type BuildInfo = { version: string; buildVersion: string; minOSVersion?: string; entitlements: string[]; privacy: Record<string, string> };

const repo = process.env.GITHUB_REPOSITORY;
const headers: Record<string, string> = { accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function releases(): Promise<Release[]> {
  if (!repo) return [];
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, { headers });
  if (!res.ok) throw new Error(`GitHub releases: HTTP ${res.status}`);
  return (await res.json()) as Release[];
}

const versions = [];
let latest: BuildInfo | undefined;
// Newest first, as the API lists them. Pre-releases stay out, like the Android download.
for (const r of (await releases()).filter((r) => !r.draft && !r.prerelease)) {
  const info = r.assets.find((a) => a.name === "ios-build.json");
  const ipa = r.assets.find((a) => /^medkit-clicker-.+\.ipa$/.test(a.name));
  if (!info || !ipa) continue;
  const build = (await (await fetch(info.browser_download_url)).json()) as BuildInfo;
  latest ??= build;
  versions.push({
    version: build.version,
    buildVersion: build.buildVersion,
    date: r.published_at,
    localizedDescription: r.body?.trim() || `Medkit Clicker ${build.version}`,
    downloadURL: ipa.browser_download_url,
    size: ipa.size,
    ...(build.minOSVersion ? { minOSVersion: build.minOSVersion } : {}),
  });
}

const source = {
  name: "Medkit Clicker",
  identifier: "ee.dustindwayn.medkit-clicker.source",
  subtitle: "A cosy pixel-art hospital idle game",
  description: DEFAULT_DESCRIPTION,
  iconURL: `${SITE_URL}/og-icon.png`,
  website: `${SITE_URL}/`,
  tintColor: "#dd1122",
  apps: [
    {
      name: "Medkit Clicker",
      bundleIdentifier: "com.medkitclicker.app",
      developerName: "Dustin Dwayne Diaz",
      subtitle: "A cosy pixel-art hospital idle game",
      localizedDescription: DEFAULT_DESCRIPTION,
      iconURL: `${SITE_URL}/og-icon.png`,
      tintColor: "#dd1122",
      category: "games",
      screenshots: [],
      versions,
      // AltStore refuses an app whose permissions aren't listed here, so they come from the newest build.
      appPermissions: { entitlements: latest?.entitlements ?? [], privacy: latest?.privacy ?? {} },
    },
  ],
  news: [],
};

writeFileSync(new URL("../dist/altstore.json", import.meta.url), `${JSON.stringify(source, null, 2)}\n`);
console.log(`Wrote altstore.json with ${versions.length} iOS version(s)`);

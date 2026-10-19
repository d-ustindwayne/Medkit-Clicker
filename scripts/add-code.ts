// Registers a redeem code for a section without putting the code itself in the repo.
// Usage: bun run add-code <section-id> <code>
// Writes the code's SHA-256 hash to .env.local (gitignored) as EXPO_PUBLIC_CODE_<SECTION>.
// Restart `bun run start` afterwards so Expo picks up the new variable.
import { createHash } from "node:crypto";

const [section, code] = process.argv.slice(2);
if (!section || !code) {
  console.error("Usage: bun run add-code <section-id> <code>");
  process.exit(1);
}

// Must match normalizeCode() in src/lib/codes.ts.
const hash = createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
const key = `EXPO_PUBLIC_CODE_${section.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;

const file = Bun.file(new URL("../.env.local", import.meta.url));
const lines = (await file.exists()) ? (await file.text()).split(/\r?\n/).filter((l) => l && !l.startsWith(`${key}=`)) : [];
lines.push(`${key}=${hash}`);
await Bun.write(file, lines.join("\n") + "\n");

console.log(`Saved ${key} to .env.local. Restart the dev server to use it.`);

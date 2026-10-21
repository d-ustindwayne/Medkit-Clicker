// Sets when a code-locked section ends: its code stops working and its rewards, music and items go
// (achievements already earned stay). Usage: bun run expire-section <section-id> <date>
//   <date> is an ISO time with its zone, e.g. 2027-01-31T00:00:00+08:00, or "none" to clear it.
// Writes EXPO_PUBLIC_CODE_<SECTION>_EXPIRES to .env.local (gitignored; rebuild the app to use it)
// and access_codes.expires_at in the database (the server checks it). Needs DATABASE_URL in .env.
import { SQL } from "bun";
import { readFileSync } from "node:fs";

const [section, when] = process.argv.slice(2);
const clear = when === "none";
if (!section || !when || (!clear && !Number.isFinite(Date.parse(when)))) {
  console.error("Usage: bun run expire-section <section-id> <ISO date with zone | none>");
  process.exit(1);
}

const key = `EXPO_PUBLIC_CODE_${section.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_EXPIRES`;
const file = Bun.file(new URL("../.env.local", import.meta.url));
const lines = (await file.exists()) ? (await file.text()).split(/\r?\n/).filter((l) => l && !l.startsWith(`${key}=`)) : [];
if (!clear) lines.push(`${key}=${when}`);
await Bun.write(file, lines.join("\n") + "\n");

const raw = process.env.DATABASE_CA;
const ca = raw ? (raw.includes("BEGIN CERTIFICATE") ? raw.replace(/\\n/g, "\n") : readFileSync(raw, "utf8")) : undefined;
const url = process.env.DATABASE_URL!;
const sql = ca ? new SQL({ url: url.replace(/\?.*$/, ""), tls: { ca, rejectUnauthorized: true } }) : new SQL(url);
await sql.unsafe("ALTER TABLE access_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ");
const rows = await sql`UPDATE access_codes SET expires_at = ${clear ? null : new Date(when)} WHERE section = ${section} RETURNING section`;
await sql.close();
console.log(rows.length ? `${section}: ${clear ? "no end date" : `ends ${new Date(when).toISOString()}`} (app: ${key}, server: database).` : `No section "${section}" in the database; .env.local was updated.`);

// Sets up the database: creates the tables, then uploads the redeem code hash and the rewards.
// Safe to run again: everything is upserted, and rewards removed from the app are removed here too.
//
// Usage: bun run db:setup
// Needs DATABASE_URL in .env (gitignored) and the code hash in .env.local (bun run add-code).
import { SQL } from "bun";
import { readFileSync } from "node:fs";

import { REWARD_SECTIONS } from "../src/constants/rewards";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env (Aiven: Service > Overview > Service URI).");
/**
 * Connects with TLS. Aiven signs its certificates with a per-project CA: DATABASE_CA is either that
 * certificate's text (on Render) or a path to it (locally), so the connection is verified.
 */
function connect() {
  const raw = process.env.DATABASE_CA;
  // Env vars often hold the certificate on one line with literal "\n"; turn those back into newlines.
  const ca = raw ? (raw.includes("BEGIN CERTIFICATE") ? raw.replace(/\\n/g, "\n") : readFileSync(raw, "utf8")) : undefined;
  const url = process.env.DATABASE_URL!;
  return ca ? new SQL({ url: url.replace(/\?.*$/, ""), tls: { ca, rejectUnauthorized: true } }) : new SQL(url);
}
const sql = connect();

await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
console.log("tables ready");

// Reward sections and their rewards.
for (const section of REWARD_SECTIONS) {
  const hash = process.env[`EXPO_PUBLIC_CODE_${section.id.toUpperCase()}`];
  if (!hash) {
    console.warn(`skip section ${section.id}: no code hash (run: bun run add-code ${section.id} <code>)`);
    continue;
  }
  await sql`INSERT INTO access_codes (section, code_sha256, title, notify_name) VALUES (${section.id}, ${hash.toLowerCase()}, ${section.title}, ${section.notify})
    ON CONFLICT (section) DO UPDATE SET code_sha256 = EXCLUDED.code_sha256, title = EXCLUDED.title, notify_name = EXCLUDED.notify_name`;
  for (const [i, r] of section.rewards.entries()) {
    await sql`INSERT INTO rewards (id, section, name, cost, max_uses, sort) VALUES (${r.id}, ${section.id}, ${r.name}, ${r.cost}, ${r.limit}, ${i})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, cost = EXCLUDED.cost, max_uses = EXCLUDED.max_uses, sort = EXCLUDED.sort`;
  }
  const ids = section.rewards.map((r) => r.id);
  await sql`DELETE FROM rewards WHERE section = ${section.id} AND id NOT IN ${sql(ids)}`;
  console.log(`section ${section.id}: ${section.rewards.length} rewards`);
}

const [{ mb }] = await sql`SELECT round(pg_database_size(current_database()) / 1e6) AS mb`;
console.log(`done; database is ${mb} MB`);
await sql.close();

// Sets up the database: creates the tables, then uploads the redeem code hash, the rewards and the
// encoded music. Safe to run again: everything is upserted, and unchanged songs are skipped.
//
// Usage: bun run db:setup
// Needs DATABASE_URL in .env (gitignored), the code hash in .env.local (bun run add-code), and the
// encoded songs in src/audio/encoded (bun run music).
import { SQL } from "bun";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PLAYLIST_NAMES } from "../src/constants/playlist-names";
import { REWARD_SECTIONS } from "../src/constants/rewards";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env (Aiven: Service > Overview > Service URI).");
const sql = new SQL(process.env.DATABASE_URL);
const ENCODED = "src/audio/encoded";

await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
console.log("tables ready");

// Reward sections and their rewards. Music belongs to the first section (Jasmine's).
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
  console.log(`section ${section.id}: ${section.rewards.length} rewards`);
}

const musicSection = REWARD_SECTIONS[0]?.id;
if (!existsSync(ENCODED)) {
  console.warn(`no ${ENCODED}; run bun run music first`);
} else {
  for (const [i, [id, name]] of PLAYLIST_NAMES.entries()) {
    const dir = join(ENCODED, id);
    if (!existsSync(dir)) continue;
    await sql`INSERT INTO playlists (id, section, name, sort) VALUES (${id}, ${musicSection}, ${name}, ${i})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort, section = EXCLUDED.section`;
    const files = readdirSync(dir).filter((f) => /^track_\d+\.m4a$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6)));
    for (const f of files) {
      const position = parseInt(f.slice(6));
      const data = readFileSync(join(dir, f));
      const sha = createHash("sha256").update(data).digest("hex");
      const [existing] = await sql`SELECT sha256 FROM tracks WHERE playlist_id = ${id} AND position = ${position}`;
      if (existing?.sha256 === sha) continue;
      await sql`INSERT INTO tracks (playlist_id, position, size_bytes, sha256, data) VALUES (${id}, ${position}, ${data.length}, ${sha}, ${data})
        ON CONFLICT (playlist_id, position) DO UPDATE SET size_bytes = EXCLUDED.size_bytes, sha256 = EXCLUDED.sha256, data = EXCLUDED.data`;
      console.log(`uploaded ${id}/${f} (${(data.length / 1e6).toFixed(1)} MB)`);
    }
  }
}
const [{ mb }] = await sql`SELECT round(pg_database_size(current_database()) / 1e6) AS mb`;
console.log(`done; database is ${mb} MB`);
await sql.close();

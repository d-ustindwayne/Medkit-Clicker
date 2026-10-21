// Releases a promo code: anyone can enter it in the game (once per phone) for a reward.
// Usage: bun run add-promo <code> <rewards> [max-claims] [message...]
//   <rewards> is one reward or several joined by commas:
//     medkits:<n>  coins:<n>  gems:<n>  seconds:<n> (that many seconds of healing)  background:<id>
//   e.g. coins:20,background:purple_rain   or the older form: <code> <medkits|coins|gems> <amount>
// Only the code's SHA-256 is stored. Needs DATABASE_URL (and DATABASE_CA) in .env.
import { SQL } from "bun";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { BACKGROUNDS } from "../src/constants/backgrounds";

type Reward = { kind: "medkits" | "coins" | "gems" | "seconds"; amount: number } | { kind: "background"; id: string };
const usage = () => {
  console.error("Usage: bun run add-promo <code> <kind:amount[,kind:amount|background:id...]> [max-claims] [message...]");
  process.exit(1);
};

const args = process.argv.slice(2);
const code = args.shift();
if (!code || args.length === 0) usage();
// The older form: <kind> <amount>.
if (["medkits", "coins", "gems"].includes(args[0]) && /^\d+(\.\d+)?$/.test(args[1] ?? "")) args.splice(0, 2, `${args[0]}:${args[1]}`);
const rewards: Reward[] = args.shift()!.split(",").map((part) => {
  const [kind, value] = part.split(":");
  if (kind === "background") {
    if (!BACKGROUNDS.some((b) => b.id === value)) throw new Error(`Unknown background "${value}". Ids: ${BACKGROUNDS.map((b) => b.id).join(", ")}`);
    return { kind, id: value };
  }
  const amount = Number(value);
  if (!["medkits", "coins", "gems", "seconds"].includes(kind) || !(amount > 0)) usage();
  return { kind: kind as "medkits", amount };
});
const max = args[0] && /^\d+$/.test(args[0]) ? Number(args.shift()) : null;
const message = args.join(" ") || null;
// A single medkits/coins/gems reward keeps the old columns, so older app versions understand it.
const single = rewards.length === 1 && rewards[0].kind !== "background" && rewards[0].kind !== "seconds" ? rewards[0] : null;

const raw = process.env.DATABASE_CA;
const ca = raw ? (raw.includes("BEGIN CERTIFICATE") ? raw.replace(/\\n/g, "\n") : readFileSync(raw, "utf8")) : undefined;
const url = process.env.DATABASE_URL!;
const sql = ca ? new SQL({ url: url.replace(/\?.*$/, ""), tls: { ca, rejectUnauthorized: true } }) : new SQL(url);
// Bundles need the rewards column (also in db/schema.sql); safe to run every time.
await sql.unsafe(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS rewards JSONB;
  ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_kind_check;
  ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_kind_check CHECK (kind IN ('medkits', 'coins', 'gems', 'bundle'));`);
// Must match normalizeCode() in src/lib/codes.ts and normalize() in server/index.ts.
const hash = createHash("sha256").update(code!.trim().toLowerCase()).digest("hex");
const kind = single?.kind ?? "bundle";
const amount = single && "amount" in single ? single.amount : 1;
const json = single ? null : JSON.stringify(rewards);
await sql`INSERT INTO promo_codes (code_sha256, kind, amount, rewards, max_claims, message) VALUES (${hash}, ${kind}, ${amount}, ${json}::jsonb, ${max}, ${message})
  ON CONFLICT (code_sha256) DO UPDATE SET kind = EXCLUDED.kind, amount = EXCLUDED.amount, rewards = EXCLUDED.rewards, max_claims = EXCLUDED.max_claims, message = EXCLUDED.message`;
const what = rewards.map((r) => ("id" in r ? `background ${r.id}` : `${r.amount} ${r.kind}`)).join(" + ");
console.log(`Promo saved: ${what}${max ? `, up to ${max} phones` : ""}${message ? ` ("${message}")` : ""}.`);
await sql.close();

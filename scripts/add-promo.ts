// Releases a promo code: anyone can enter it in the game (once per phone) for a reward.
// Usage: bun run add-promo <code> <medkits|coins|gems> <amount> [max-claims] [message...]
// Only the code's SHA-256 is stored. Needs DATABASE_URL (and DATABASE_CA) in .env.
import { SQL } from "bun";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const [code, kind, amountText, maxText, ...messageWords] = process.argv.slice(2);
const amount = Number(amountText);
if (!code || !["medkits", "coins", "gems"].includes(kind) || !(amount > 0)) {
  console.error("Usage: bun run add-promo <code> <medkits|coins|gems> <amount> [max-claims] [message...]");
  process.exit(1);
}
const raw = process.env.DATABASE_CA;
const ca = raw ? (raw.includes("BEGIN CERTIFICATE") ? raw.replace(/\n/g, "\n") : readFileSync(raw, "utf8")) : undefined;
const url = process.env.DATABASE_URL!;
const sql = ca ? new SQL({ url: url.replace(/\?.*$/, ""), tls: { ca, rejectUnauthorized: true } }) : new SQL(url);
// Must match normalizeCode() in src/lib/codes.ts and normalize() in server/index.ts.
const hash = createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
const max = maxText && /^\d+$/.test(maxText) ? Number(maxText) : null;
const message = (max === null && maxText ? [maxText, ...messageWords] : messageWords).join(" ") || null;
await sql`INSERT INTO promo_codes (code_sha256, kind, amount, max_claims, message) VALUES (${hash}, ${kind}, ${amount}, ${max}, ${message})
  ON CONFLICT (code_sha256) DO UPDATE SET kind = EXCLUDED.kind, amount = EXCLUDED.amount, max_claims = EXCLUDED.max_claims, message = EXCLUDED.message`;
console.log(`Promo saved: ${amount} ${kind}${max ? `, up to ${max} phones` : ""}${message ? ` ("${message}")` : ""}.`);
await sql.close();

// Medkit Clicker API: a tiny Bun server between the app and PostgreSQL.
// The app never sees the database password. There are no user accounts: POST /unlock trades a
// redeem code for a token (an HMAC of the section), and that token opens the section's
// rewards. Run locally with `bun run server`; deploy with server/Dockerfile.
//
// Env: DATABASE_URL (Postgres), DATABASE_CA (Aiven's CA certificate text, or a path to it),
// SERVER_SECRET (any long random string), NTFY_TOPIC (optional: ntfy.sh topic Dustin subscribes
// to), PORT (default 8787).
import { SQL } from "bun";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

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
const SECRET = process.env.SERVER_SECRET ?? "";
const NTFY_TOPIC = process.env.NTFY_TOPIC;
if (!process.env.DATABASE_URL || SECRET.length < 16) throw new Error("Set DATABASE_URL and SERVER_SECRET (16+ chars).");

/** Same normalisation as the app (src/lib/codes.ts) and scripts/add-code.ts: trim and lowercase. */
const normalize = (code: string) => code.trim().toLowerCase();
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const tokenFor = (section: string) => `${section}.${createHmac("sha256", SECRET).update(section).digest("hex")}`;

/** The section a token opens, or null. */
function sectionOf(req: Request): string | null {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const section = token.split(".")[0];
  if (!section) return null;
  const a = Buffer.from(token), b = Buffer.from(tokenFor(section));
  return a.length === b.length && timingSafeEqual(a, b) ? section : null;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function notify(text: string) {
  if (!NTFY_TOPIC) return false;
  const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: "POST", body: text, headers: { Title: "Medkit Clicker", Tags: "gift" } }).catch(() => null);
  return !!res?.ok;
}

Bun.serve({
  port: Number(process.env.PORT ?? 8787),
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/health") return json({ ok: true });

    // Trade a redeem code for a token. Rate-limiting is left to the host (codes are long enough).
    if (path === "/unlock" && req.method === "POST") {
      const { code } = (await req.json().catch(() => ({}))) as { code?: string };
      if (!code) return json({ error: "Missing code" }, 400);
      const [row] = await sql`SELECT section, title, notify_name FROM access_codes WHERE code_sha256 = ${sha256(normalize(code))}`;
      if (!row) return json({ error: "That code didn't match anything." }, 404);
      return json({ token: tokenFor(row.section), section: row.section, title: row.title, notify: row.notify_name });
    }

    const section = sectionOf(req);
    if (!section) return json({ error: "Enter your code first." }, 401);

    // Rewards with how many times each has been used.
    if (path === "/rewards" && req.method === "GET") {
      const rows = await sql`
        SELECT r.id, r.name, r.cost, r.max_uses, COALESCE(array_agg(EXTRACT(EPOCH FROM d.redeemed_at) * 1000 ORDER BY d.redeemed_at) FILTER (WHERE d.id IS NOT NULL), '{}') AS times
        FROM rewards r LEFT JOIN redemptions d ON d.reward_id = r.id
        WHERE r.section = ${section} GROUP BY r.id ORDER BY r.sort, r.id`;
      return json(rows.map((r: { id: string; name: string; cost: string; max_uses: number | null; times: number[] }) => ({ id: r.id, name: r.name, cost: Number(r.cost), limit: r.max_uses, redeemed: r.times.map(Number) })));
    }

    // Redeem: the server enforces the limit, records it and alerts Dustin.
    if (path === "/redeem" && req.method === "POST") {
      const { rewardId, deviceId, note } = (await req.json().catch(() => ({}))) as { rewardId?: string; deviceId?: string; note?: string };
      const answer = typeof note === "string" ? note.trim().slice(0, 200) : "";
      const [reward] = await sql`SELECT r.id, r.name, r.max_uses, a.title FROM rewards r JOIN access_codes a ON a.section = r.section WHERE r.id = ${rewardId ?? ""} AND r.section = ${section}`;
      if (!reward) return json({ error: "Unknown reward" }, 404);
      const result = await sql.begin(async (tx) => {
        const [{ used }] = await tx`SELECT count(*)::int AS used FROM redemptions WHERE reward_id = ${reward.id} FOR UPDATE`;
        // max_uses NULL means no limit.
        if (reward.max_uses !== null && used >= reward.max_uses) return null;
        const [row] = await tx`INSERT INTO redemptions (reward_id, device_id, note) VALUES (${reward.id}, ${deviceId ?? "unknown"}, ${answer || null}) RETURNING id, EXTRACT(EPOCH FROM redeemed_at) * 1000 AS at`;
        return { id: row.id, at: Number(row.at), used: used + 1 };
      });
      if (!result) return json({ error: "No redemptions left for this reward." }, 409);
      const count = reward.max_uses === null ? `#${result.used}` : `${result.used}/${reward.max_uses}`;
      const sent = await notify(`${reward.title}: "${reward.name}" was redeemed (${count}).${answer ? ` Note: ${answer}` : ""}`);
      if (sent) await sql`UPDATE redemptions SET notified_at = now() WHERE id = ${result.id}`;
      return json({ ok: true, at: result.at, used: result.used, limit: reward.max_uses, notified: sent });
    }

    return json({ error: "Not found" }, 404);
  },
});
console.log(`Medkit Clicker API on :${process.env.PORT ?? 8787}`);

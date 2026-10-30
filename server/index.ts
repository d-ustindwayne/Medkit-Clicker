// Medkit Clicker API: a tiny Bun server between the app and PostgreSQL.
// The app never sees the database password. There are no user accounts: POST /unlock trades a
// redeem code for a token (an HMAC of the section), and that token opens the section's
// rewards. Run locally with `bun run server`; deploy with server/Dockerfile.
//
// Env: DATABASE_URL (Postgres), DATABASE_CA (Aiven's CA certificate text, or a path to it),
// SERVER_SECRET (any long random string), NTFY_TOPIC (optional: ntfy.sh topic Dustin subscribes
// to), NTFY_TOKEN (optional: an ntfy.sh access token, so alerts aren't rate-limited by shared IPs),
// PORT (default 8787). The editor (events and promo codes, in the web game's Dev Tools) also needs
// GOOGLE_CLIENT_ID (the OAuth client's ID) and ADMIN_EMAIL (the one Google account allowed in).
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
  // A small pool: the free database has only a few connection slots, shared with deploys and scripts.
  return ca ? new SQL({ url: url.replace(/\?.*$/, ""), tls: { ca, rejectUnauthorized: true }, max: 3 }) : new SQL({ url, max: 3 });
}
const sql = connect();
const SECRET = process.env.SERVER_SECRET ?? "";
const NTFY_TOPIC = process.env.NTFY_TOPIC;
// An ntfy.sh access token (optional, recommended): without one, ntfy limits by IP, and hosts like
// Render share their IPs with other apps, so alerts get refused (HTTP 429).
const NTFY_TOKEN = process.env.NTFY_TOKEN;
if (!process.env.DATABASE_URL || SECRET.length < 16) throw new Error("Set DATABASE_URL and SERVER_SECRET (16+ chars).");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

// Tables added after the first schema (also in db/schema.sql). Only ever adds; safe on every start.
await sql.unsafe(`CREATE TABLE IF NOT EXISTS events (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    tap_mult    NUMERIC,
    rate_mult   NUMERIC,
    rewards     JSONB,
    icon        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS label TEXT;`);

/**
 * The editor's Google sign-in: the browser sends Google's ID token, Google confirms it, and only
 * ADMIN_EMAIL gets in. Confirmed tokens are remembered until they expire (an hour at most).
 */
const confirmed = new Map<string, number>();
async function isAdmin(req: Request) {
  if (!GOOGLE_CLIENT_ID || !ADMIN_EMAIL) return false;
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!token) return false;
  const until = confirmed.get(token);
  if (until && until > Date.now()) return true;
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`).catch(() => null);
  if (!res?.ok) return false;
  const info = (await res.json()) as { aud?: string; email?: string; email_verified?: string | boolean; exp?: string };
  const ok = info.aud === GOOGLE_CLIENT_ID && info.email?.toLowerCase() === ADMIN_EMAIL && String(info.email_verified) === "true";
  if (ok) confirmed.set(token, Number(info.exp) * 1000);
  return ok;
}

/**
 * Rewards as the game reads them (see PromoItem in src/lib/game.ts); anything else is dropped. Ids
 * aren't checked here: the game skips ones it doesn't know.
 */
type Reward =
  | { kind: "medkits" | "coins" | "gems" | "seconds"; amount: number }
  | { kind: "background" | "cosmetic" | "room"; id: string }
  | { kind: "item" | "boost"; id: string; count: number };
const cleanRewards = (list: unknown): Reward[] =>
  (Array.isArray(list) ? list : []).flatMap((r) => {
    const x = r as { kind?: string; amount?: unknown; id?: unknown; count?: unknown };
    const id = typeof x.id === "string" ? x.id.slice(0, 40) : "";
    if ((x.kind === "background" || x.kind === "cosmetic" || x.kind === "room") && id) return [{ kind: x.kind, id }];
    const count = Math.floor(Number(x.count));
    if ((x.kind === "item" || x.kind === "boost") && id && count > 0 && count <= 1000) return [{ kind: x.kind, id, count }];
    const amount = Number(x.amount);
    return ["medkits", "coins", "gems", "seconds"].includes(x.kind ?? "") && amount > 0 && Number.isFinite(amount) ? [{ kind: x.kind as "coins", amount }] : [];
  });
/** A multiplier between 1 and 100, or null. */
const mult = (v: unknown) => {
  const n = Number(v);
  return n > 1 && n <= 100 ? n : null;
};

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

/**
 * Whether a section has ended: its `expires_at` (set with scripts/expire-section.ts) is in the past.
 * to_jsonb(...) ->> reads the column if the database has it, and null otherwise.
 */
async function sectionEnded(section: string) {
  const [row] = await sql`SELECT to_jsonb(a) ->> 'expires_at' AS expires FROM access_codes a WHERE section = ${section}`;
  return !!row?.expires && new Date(row.expires) <= new Date();
}
const ENDED = "That code has expired.";

/** How the last alert went, for /health (never the topic itself). */
let lastAlert: { at: string; ok: boolean; detail: string } | null = null;

async function notify(text: string) {
  if (!NTFY_TOPIC) {
    lastAlert = { at: new Date().toISOString(), ok: false, detail: "NTFY_TOPIC is not set" };
    console.error("Alert not sent: NTFY_TOPIC is not set.");
    return false;
  }
  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: "POST", body: text, headers: { Title: "Medkit Clicker", Tags: "gift", ...(NTFY_TOKEN ? { Authorization: `Bearer ${NTFY_TOKEN}` } : {}) }, signal: AbortSignal.timeout(10_000) });
    // ntfy's own error text (e.g. "limit reached: too many requests") is safe to show; the topic isn't in it.
    const why = res.ok ? "" : (await res.text().catch(() => "")).replace(NTFY_TOPIC, "***").slice(0, 200);
    lastAlert = { at: new Date().toISOString(), ok: res.ok, detail: `HTTP ${res.status}${why ? ` ${why}` : ""}` };
    if (!res.ok) console.error(`Alert not sent: ntfy answered ${res.status} ${why}`);
    return res.ok;
  } catch (e) {
    lastAlert = { at: new Date().toISOString(), ok: false, detail: e instanceof Error ? e.message : "request failed" };
    console.error("Alert not sent:", e);
    return false;
  }
}

/**
 * Alerts that didn't go out (ntfy down or busy) are tried again every 10 minutes for a day, so a
 * redemption is never silently missed. Each one says it's late.
 */
async function retryAlerts() {
  const rows = await sql`
    SELECT d.id, d.note, r.name, r.max_uses, a.title,
      (SELECT count(*)::int FROM redemptions e WHERE e.reward_id = d.reward_id AND e.redeemed_at <= d.redeemed_at) AS nth
    FROM redemptions d JOIN rewards r ON r.id = d.reward_id JOIN access_codes a ON a.section = r.section
    -- The phone gets the first two minutes to send it itself (see /redeem).
    WHERE d.notified_at IS NULL AND d.redeemed_at > now() - interval '1 day' AND d.redeemed_at < now() - interval '2 minutes'
    ORDER BY d.redeemed_at LIMIT 10`;
  for (const row of rows) {
    const count = row.max_uses === null ? `#${row.nth}` : `${row.nth}/${row.max_uses}`;
    const sent = await notify(`${row.name} was redeemed (${count}, alert delayed).${row.note ? ` Note: ${row.note}` : ""}`);
    if (!sent) break;
    await sql`UPDATE redemptions SET notified_at = now() WHERE id = ${row.id}`;
  }
}
// Every 10 minutes: ntfy counts refused attempts against the daily quota too, so retrying faster burns it.
setInterval(() => void retryAlerts().catch((e) => console.error("Alert retry failed:", e)), 10 * 60_000);

/**
 * The web version of the game (GitHub Pages) calls the API from another site, so browsers need CORS
 * headers. The phone app sends no Origin and is unaffected. Nothing uses cookies: access is by token.
 */
// The custom domain, plus the old github.io address (it now redirects there, but cached pages may still call from it).
const WEB_ORIGINS = ["https://medkit-clicker.dustindwayn.ee", "https://d-ustindwayne.github.io"];
const allowedOrigin = (origin: string | null) => (origin && (WEB_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) ? origin : null);

Bun.serve({
  port: Number(process.env.PORT ?? 8787),
  async fetch(req) {
    const origin = allowedOrigin(req.headers.get("origin"));
    const cors: Record<string, string> = origin
      ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS", "access-control-allow-headers": "content-type, authorization", "access-control-max-age": "86400", vary: "Origin" }
      : {};
    if (req.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: cors });
    const res = await route(req);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
});

async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // Also says whether reward alerts are set up and how the last one went.
    if (path === "/health") return json({ ok: true, alerts: { configured: !!NTFY_TOPIC, token: !!NTFY_TOKEN, last: lastAlert } });

    // Trade a redeem code for a token. Rate-limiting is left to the host (codes are long enough).
    if (path === "/unlock" && req.method === "POST") {
      const { code } = (await req.json().catch(() => ({}))) as { code?: string };
      if (!code) return json({ error: "Missing code" }, 400);
      const [row] = await sql`SELECT section, title, notify_name FROM access_codes WHERE code_sha256 = ${sha256(normalize(code))}`;
      if (!row) return json({ error: "That code didn't match anything." }, 404);
      if (await sectionEnded(row.section)) return json({ error: ENDED }, 410);
      return json({ token: tokenFor(row.section), section: row.section, title: row.title, notify: row.notify_name });
    }

    // Promo codes: anyone can claim one, once per phone. Rewards are set with scripts/add-promo.ts.
    if (path === "/promo" && req.method === "POST") {
      const { code, deviceId } = (await req.json().catch(() => ({}))) as { code?: string; deviceId?: string };
      if (!code || !deviceId || deviceId.length > 100) return json({ error: "Missing code" }, 400);
      const hash = sha256(normalize(code));
      const result = await sql.begin(async (tx) => {
        // to_jsonb(...) -> 'rewards' reads the bundle column if the database has it (add-promo adds it), and null otherwise.
        const [promo] = await tx`SELECT code_sha256, kind, amount, to_jsonb(p) -> 'rewards' AS rewards, max_claims, message, expires_at FROM promo_codes p WHERE code_sha256 = ${hash} FOR UPDATE`;
        if (!promo || (promo.expires_at && new Date(promo.expires_at) < new Date())) return { status: 404 } as const;
        const [{ used }] = await tx`SELECT count(*)::int AS used FROM promo_claims WHERE code_sha256 = ${hash}`;
        if (promo.max_claims !== null && used >= promo.max_claims) return { status: 409 } as const;
        const rows = await tx`INSERT INTO promo_claims (code_sha256, device_id) VALUES (${hash}, ${deviceId}) ON CONFLICT DO NOTHING RETURNING code_sha256`;
        if (rows.length === 0) return { status: 409 } as const;
        // `rewards` lists a bundle's parts (coins plus a background...); `kind`/`amount` stay for older app versions.
        // Rows saved as a JSON string (an early add-promo bug) are parsed too.
        const saved = typeof promo.rewards === "string" ? JSON.parse(promo.rewards) : promo.rewards;
        const rewards = Array.isArray(saved) ? saved : [{ kind: promo.kind, amount: Number(promo.amount) }];
        return { status: 200, body: { kind: promo.kind, amount: Number(promo.amount), message: promo.message, rewards } } as const;
      });
      if (result.status !== 200) return json({ error: result.status === 404 ? "That code didn't match anything." : "That code was already used." }, result.status);
      return json(result.body);
    }

    // Timed events: what's on now and in the next week, for every player.
    if (path === "/events" && req.method === "GET") {
      const rows = await sql`SELECT id, title, description, starts_at, ends_at, tap_mult, rate_mult, rewards, icon FROM events
        WHERE ends_at > now() AND starts_at < now() + interval '7 days' ORDER BY starts_at LIMIT 20`;
      return json(rows.map(eventJson));
    }

    // The editor (Google sign-in, ADMIN_EMAIL only): events and promo codes.
    if (path.startsWith("/admin/")) {
      if (!(await isAdmin(req))) return json({ error: "Sign in with the Console's Google account." }, 401);
      if (path === "/admin/whoami") return json({ ok: true });
      if (path === "/admin/events" && req.method === "GET") {
        const rows = await sql`SELECT id, title, description, starts_at, ends_at, tap_mult, rate_mult, rewards, icon FROM events ORDER BY starts_at DESC LIMIT 100`;
        return json(rows.map(eventJson));
      }
      if (path === "/admin/events" && req.method === "POST") {
        const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const title = String(b.title ?? "").trim().slice(0, 80);
        const starts = new Date(String(b.startsAt)), ends = new Date(String(b.endsAt));
        if (!title || Number.isNaN(+starts) || Number.isNaN(+ends) || ends <= starts) return json({ error: "Give it a title, a start and an end after the start." }, 400);
        const icon = typeof b.icon === "string" && b.icon.startsWith("data:image/") && b.icon.length < 300_000 ? b.icon : null;
        const rewards = cleanRewards(b.rewards);
        const [row] = await sql`INSERT INTO events (title, description, starts_at, ends_at, tap_mult, rate_mult, rewards, icon)
          VALUES (${title}, ${String(b.description ?? "").slice(0, 300) || null}, ${starts}, ${ends}, ${mult(b.tapMult)}, ${mult(b.rateMult)}, ${rewards.length ? JSON.stringify(rewards) : null}::text::jsonb, ${icon}) RETURNING id`;
        return json({ ok: true, id: Number(row.id) });
      }
      const ev = path.match(/^\/admin\/events\/(\d+)$/);
      if (ev && req.method === "DELETE") {
        await sql`DELETE FROM events WHERE id = ${Number(ev[1])}`;
        return json({ ok: true });
      }
      if (path === "/admin/promos" && req.method === "GET") {
        const rows = await sql`SELECT p.code_sha256, p.label, p.kind, p.amount, p.rewards, p.max_claims, p.message, p.expires_at, p.created_at,
          (SELECT count(*)::int FROM promo_claims c WHERE c.code_sha256 = p.code_sha256) AS claims FROM promo_codes p ORDER BY p.created_at DESC LIMIT 200`;
        return json(rows.map((r: Record<string, unknown>) => ({
          hash: r.code_sha256, label: r.label, maxClaims: r.max_claims, claims: r.claims, message: r.message, expiresAt: r.expires_at, createdAt: r.created_at,
          rewards: Array.isArray(r.rewards) ? r.rewards : typeof r.rewards === "string" ? JSON.parse(r.rewards) : [{ kind: r.kind, amount: Number(r.amount) }],
        })));
      }
      if (path === "/admin/promos" && req.method === "POST") {
        const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const code = String(b.code ?? "").trim();
        const name = String(b.name ?? "").trim().slice(0, 80) || code;
        const rewards = cleanRewards(b.rewards);
        if (code.length < 4 || code.length > 60 || rewards.length === 0) return json({ error: "A code of 4-60 characters and at least one reward." }, 400);
        const max = Number(b.maxClaims) > 0 ? Math.floor(Number(b.maxClaims)) : null;
        const expires = b.expiresAt ? new Date(String(b.expiresAt)) : null;
        if (expires && Number.isNaN(+expires)) return json({ error: "That end date doesn't look right." }, 400);
        // Same as scripts/add-promo.ts: one medkits/coins/gems reward keeps the old columns for older app versions.
        const first = rewards[0];
        const single = rewards.length === 1 && "amount" in first && first.kind !== "seconds" ? first : null;
        await sql`INSERT INTO promo_codes (code_sha256, label, kind, amount, rewards, max_claims, message, expires_at)
          VALUES (${sha256(normalize(code))}, ${name}, ${single?.kind ?? "bundle"}, ${single?.amount ?? 1}, ${single ? null : JSON.stringify(rewards)}::text::jsonb, ${max}, ${String(b.message ?? "").slice(0, 200) || null}, ${expires})
          ON CONFLICT (code_sha256) DO UPDATE SET label = EXCLUDED.label, kind = EXCLUDED.kind, amount = EXCLUDED.amount, rewards = EXCLUDED.rewards,
            max_claims = EXCLUDED.max_claims, message = EXCLUDED.message, expires_at = EXCLUDED.expires_at`;
        return json({ ok: true });
      }
      const promo = path.match(/^\/admin\/promos\/([0-9a-f]{64})$/);
      // A name to keep track of a code by (codes from add-promo before 0.8.3 only had their hash).
      if (promo && req.method === "PATCH") {
        const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        await sql`UPDATE promo_codes SET label = ${String(b.name ?? "").trim().slice(0, 80) || null} WHERE code_sha256 = ${promo[1]}`;
        return json({ ok: true });
      }
      if (promo && req.method === "DELETE") {
        await sql`DELETE FROM promo_codes WHERE code_sha256 = ${promo[1]}`;
        return json({ ok: true });
      }
      return json({ error: "Not found" }, 404);
    }

    // Rebirth 50: players can leave their name, email and feedback (once per phone).
    if (path === "/fame" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; feedback?: string; deviceId?: string; rebirths?: number };
      const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
      const name = clip(body.name, 60), email = clip(body.email, 120), feedback = clip(body.feedback, 2000), device = clip(body.deviceId, 100);
      if (!name || !device || (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return json({ error: "Please add your name (and a valid email, if you give one)." }, 400);
      const rebirths = Math.max(0, Math.floor(Number(body.rebirths) || 0));
      const rows = await sql`INSERT INTO hall_of_fame (device_id, name, email, feedback, rebirths) VALUES (${device}, ${name}, ${email || null}, ${feedback || null}, ${rebirths})
        ON CONFLICT (device_id) DO NOTHING RETURNING id`;
      if (rows.length === 0) return json({ error: "Already saved for this phone." }, 409);
      await notify(`Hall of fame: ${name} reached rebirth ${rebirths}!${feedback ? ` Feedback: ${feedback.slice(0, 300)}` : ""}`);
      return json({ ok: true });
    }

    const section = sectionOf(req);
    if (!section) return json({ error: "Enter your code first." }, 401);
    // Everything behind the code (rewards, redemptions, music) ends with it.
    if (await sectionEnded(section)) return json({ error: ENDED }, 410);

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
      // `silent` rewards (rewards.silent, set in the database) are recorded but send no alert.
      const [reward] = await sql`SELECT r.id, r.name, r.max_uses, r.per_year, r.cooldown_hours, a.title, (to_jsonb(r) ->> 'silent') = 'true' AS silent FROM rewards r JOIN access_codes a ON a.section = r.section WHERE r.id = ${rewardId ?? ""} AND r.section = ${section}`;
      if (!reward) return json({ error: "Unknown reward" }, 404);
      const result = await sql.begin(async (tx) => {
        // Lock the reward's row so two redemptions at once can't both slip under the limit. (Postgres
        // can't lock an aggregate, so FOR UPDATE goes on the reward, and the count runs after it.)
        await tx`SELECT id FROM rewards WHERE id = ${reward.id} FOR UPDATE`;
        const [{ used }] = await tx`SELECT count(*)::int AS used FROM redemptions WHERE reward_id = ${reward.id}`;
        // max_uses NULL means no limit.
        if (reward.max_uses !== null && used >= reward.max_uses) return null;
        if (reward.cooldown_hours !== null) {
          const [{ recent }] = await tx`SELECT count(*)::int AS recent FROM redemptions WHERE reward_id = ${reward.id} AND redeemed_at > now() - make_interval(hours => ${reward.cooldown_hours})`;
          if (recent > 0) return null;
        }
        if (reward.per_year !== null) {
          const [{ year }] = await tx`SELECT count(*)::int AS year FROM redemptions WHERE reward_id = ${reward.id} AND redeemed_at >= date_trunc('year', now())`;
          if (year >= reward.per_year) return null;
        }
        const [row] = await tx`INSERT INTO redemptions (reward_id, device_id, note) VALUES (${reward.id}, ${deviceId ?? "unknown"}, ${answer || null}) RETURNING id, EXTRACT(EPOCH FROM redeemed_at) * 1000 AS at`;
        return { id: row.id, at: Number(row.at), used: used + 1 };
      });
      if (!result) return json({ error: "No redemptions left for this reward." }, 409);
      const count = reward.max_uses === null ? `#${result.used}` : `${result.used}/${reward.max_uses}`;
      const text = `${reward.name} was redeemed (${count}).${answer ? ` Note: ${answer}` : ""}`;
      const sent = reward.silent ? true : await notify(text);
      if (sent) await sql`UPDATE redemptions SET notified_at = now() WHERE id = ${result.id}`;
      // ntfy can refuse the server (hosts share IPs, so the rate limit runs out); then the phone, which has
      // the section's token, sends the same alert itself and confirms it with /alerted.
      const alert = !sent && NTFY_TOPIC ? { url: `https://ntfy.sh/${NTFY_TOPIC}`, title: "Medkit Clicker", text, id: result.id } : undefined;
      return json({ ok: true, at: result.at, used: result.used, limit: reward.max_uses, notified: sent, alert });
    }

    // The phone sent a redemption's alert itself: mark it, so the server's retries don't send it again.
    if (path === "/alerted" && req.method === "POST") {
      const { id } = (await req.json().catch(() => ({}))) as { id?: number };
      await sql`UPDATE redemptions d SET notified_at = now() FROM rewards r WHERE d.id = ${Number(id) || 0} AND r.id = d.reward_id AND r.section = ${section} AND d.notified_at IS NULL`;
      return json({ ok: true });
    }

    // Music manifest: playlists and track metadata (no audio).
    if (path === "/music" && req.method === "GET") {
      const rows = await sql`
        SELECT p.id, p.name, json_agg(json_build_object('id', t.id, 'position', t.position, 'size', t.size_bytes, 'sha256', t.sha256) ORDER BY t.position) AS tracks
        FROM playlists p JOIN tracks t ON t.playlist_id = p.id WHERE p.section = ${section} GROUP BY p.id ORDER BY p.sort, p.id`;
      return json(rows);
    }

    // One song's audio.
    const track = path.match(/^\/music\/track\/(\d+)$/);
    if (track && req.method === "GET") {
      const [row] = await sql`SELECT t.mime, t.data FROM tracks t JOIN playlists p ON p.id = t.playlist_id WHERE t.id = ${Number(track[1])} AND p.section = ${section}`;
      if (!row) return json({ error: "Not found" }, 404);
      return new Response(row.data, { headers: { "content-type": row.mime, "cache-control": "private, max-age=31536000, immutable" } });
    }

    return json({ error: "Not found" }, 404);
}
/** An event row as the game and the editor read it. */
function eventJson(r: Record<string, unknown>) {
  return {
    id: Number(r.id), title: r.title, description: r.description,
    startsAt: new Date(r.starts_at as string).getTime(), endsAt: new Date(r.ends_at as string).getTime(),
    tapMult: r.tap_mult === null ? null : Number(r.tap_mult), rateMult: r.rate_mult === null ? null : Number(r.rate_mult),
    rewards: typeof r.rewards === "string" ? JSON.parse(r.rewards) : (r.rewards ?? []), icon: r.icon,
  };
}
console.log(`Medkit Clicker API on :${process.env.PORT ?? 8787}`);

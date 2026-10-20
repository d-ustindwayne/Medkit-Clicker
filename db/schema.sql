-- Medkit Clicker database (PostgreSQL, e.g. Aiven free tier).
-- Holds only what can't or shouldn't ship inside the app: the private music library,
-- the code-locked reward sections, and the redemptions that trigger an alert to Dustin.
-- There are no user accounts: a redeem code is the only key (see server/index.ts).
-- Apply with: bun run db:setup

-- A reward section that a redeem code unlocks (e.g. "jasmine").
-- Only the SHA-256 of the normalised code is stored, never the code itself.
CREATE TABLE IF NOT EXISTS access_codes (
  section      TEXT PRIMARY KEY,
  code_sha256  TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,          -- shown in the menu, e.g. "Care Package"
  notify_name  TEXT NOT NULL,          -- who gets the alert, e.g. "Dustin"
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Real-life rewards in a section: cost in patients, how many times it can ever be redeemed.
CREATE TABLE IF NOT EXISTS rewards (
  id         TEXT PRIMARY KEY,
  section    TEXT NOT NULL REFERENCES access_codes(section) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  cost       BIGINT NOT NULL CHECK (cost >= 0),
  max_uses   INT NOT NULL CHECK (max_uses > 0),
  sort       INT NOT NULL DEFAULT 0
);

-- One row per redemption. The server checks max_uses here, so the limit survives reinstalls.
CREATE TABLE IF NOT EXISTS redemptions (
  id           BIGSERIAL PRIMARY KEY,
  reward_id    TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  device_id    TEXT NOT NULL,          -- random id the app makes on first launch (not a login)
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at  TIMESTAMPTZ             -- set once the alert to Dustin was sent
);
CREATE INDEX IF NOT EXISTS redemptions_reward_idx ON redemptions (reward_id);

-- Playlists, unlocked by a section's code. Kept out of the app so the songs never ship publicly.
CREATE TABLE IF NOT EXISTS playlists (
  id       TEXT PRIMARY KEY,           -- e.g. "cup_of_joe"
  section  TEXT NOT NULL REFERENCES access_codes(section) ON DELETE CASCADE,
  name     TEXT NOT NULL,              -- e.g. "Cup of Joe"
  sort     INT NOT NULL DEFAULT 0
);

-- The songs themselves: 64 kbps AAC (.m4a), about 108 MB for the whole library.
CREATE TABLE IF NOT EXISTS tracks (
  id           SERIAL PRIMARY KEY,
  playlist_id  TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position     INT NOT NULL,
  mime         TEXT NOT NULL DEFAULT 'audio/mp4',
  size_bytes   INT NOT NULL,
  sha256       TEXT NOT NULL,          -- lets the app skip files it already has
  data         BYTEA NOT NULL,
  UNIQUE (playlist_id, position)
);

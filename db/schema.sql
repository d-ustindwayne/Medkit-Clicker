-- Medkit Clicker database (PostgreSQL, e.g. Aiven free tier).
-- Holds only what can't or shouldn't ship inside the app: the code-locked reward section and the
-- redemptions that trigger an alert to Dustin.
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

-- Real-life rewards in a section: cost in patients, how many times it can ever be redeemed (NULL = no limit).
CREATE TABLE IF NOT EXISTS rewards (
  id         TEXT PRIMARY KEY,
  section    TEXT NOT NULL REFERENCES access_codes(section) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  cost       BIGINT NOT NULL CHECK (cost >= 0),
  max_uses   INT CHECK (max_uses > 0),
  sort       INT NOT NULL DEFAULT 0
);

-- One row per redemption. The server checks max_uses here, so the limit survives reinstalls.
CREATE TABLE IF NOT EXISTS redemptions (
  id           BIGSERIAL PRIMARY KEY,
  reward_id    TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  device_id    TEXT NOT NULL,          -- random id the app makes on first launch (not a login)
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at  TIMESTAMPTZ,            -- set once the alert to Dustin was sent
  note         TEXT                    -- the answer given when redeeming (a title, a date...)
);
CREATE INDEX IF NOT EXISTS redemptions_reward_idx ON redemptions (reward_id);

-- Upgrades for databases created before these changes.
ALTER TABLE rewards ALTER COLUMN max_uses DROP NOT NULL;
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS note TEXT;   -- the answer given when redeeming (a title, a date...)

-- The old code-unlocked music (playlists, tracks) is retired. If those tables are still there,
-- they can be removed with: DROP TABLE tracks, playlists;

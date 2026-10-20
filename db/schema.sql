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
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS per_year INT CHECK (per_year > 0);   -- at most this many per calendar year
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS cooldown_hours INT CHECK (cooldown_hours > 0);   -- wait this long between redemptions   -- the answer given when redeeming (a title, a date...)

-- The old code-unlocked music (playlists, tracks) is retired. If those tables are still there,
-- they can be removed with: DROP TABLE tracks, playlists;

-- Promo codes released later (bun run add-promo): what one pays, how many phones can claim it.
CREATE TABLE IF NOT EXISTS promo_codes (
  code_sha256  TEXT PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('medkits', 'coins', 'gems')),
  amount       NUMERIC NOT NULL CHECK (amount > 0),
  max_claims   INT CHECK (max_claims > 0),   -- NULL = no limit
  message      TEXT,                          -- shown to the player, e.g. "Happy holidays!"
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One claim per phone per code.
CREATE TABLE IF NOT EXISTS promo_claims (
  code_sha256  TEXT NOT NULL REFERENCES promo_codes(code_sha256) ON DELETE CASCADE,
  device_id    TEXT NOT NULL,
  claimed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (code_sha256, device_id)
);

-- Players who reached rebirth 50 and left their details (one entry per phone).
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id         BIGSERIAL PRIMARY KEY,
  device_id  TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT,
  feedback   TEXT,
  rebirths   INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

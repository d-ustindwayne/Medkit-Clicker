# Database: Aiven PostgreSQL + a small API

**Status (2026-10-20):**
- The Aiven database is set up: tables created, Jasmine's code, the rewards and all 53 songs uploaded (123 MB of 1 GB).
- The API was tested end to end against it from this laptop.
- The API is live on Render (free plan) and was tested end to end from outside: wrong codes rejected, rewards and music served.
- The app reads its address from `EXPO_PUBLIC_API_URL` in `.env.local`.

## What goes in the database (and what doesn't)

The database holds only what shouldn't ship inside the app:

| Data | Why it's in the database |
| --- | --- |
| **Your music library** (53 songs, about 108 MB) | The songs may be copyrighted, so they no longer ship in the public app. Only someone who enters the code downloads them. This also makes the APK about 108 MB smaller. |
| **Redeem codes** (hash only) and **reward sections** | The code check moves to the server. |
| **Rewards and redemptions** | The server enforces limits, so a reinstall can't reset the 3 chocolates. Each redemption alerts you. |

The game itself (progress, items, achievements, rooms) stays on the phone, so the game works offline and for anyone. Everyone without the code gets the normal game with no music. With Jasmine's code, the app unlocks her rewards and downloads all the music.

**No user accounts:** the redeem code is the only key. `POST /unlock` trades the code for a token (an HMAC signature of the section name), and that token opens the section's music and rewards. Each phone also sends a random device id with redemptions, so you can tell phones apart. It's not a login.

## Which Aiven service

From your screenshot:
- **PostgreSQL ✅ use this.** Reliable relational storage that stores the song files fine (`BYTEA`), with transactions for the "max 3 redemptions" rule. It's also the best documented.
- MySQL would also work, but Postgres is the safer default.
- Valkey (key/value cache), Kafka (event streaming), OpenSearch (search), ClickHouse (analytics) and Grafana (dashboards) don't fit this job.
- **Aiven Runtime** is the natural place to host the API container (`server/Dockerfile`), if your plan includes it. Otherwise any container host works (Render, Fly.io, Railway), or run `bun run server` on any machine.

**Size:** music is about 108 MB, and everything else is a few KB, so 8 GB is plenty.

**Free-tier caveat:** free services can be powered off after a long period without use (Aiven emails a warning first). Opening the app keeps it in use.

## Tables (`db/schema.sql`)

| Table | Holds |
| --- | --- |
| `access_codes` | section, SHA-256 of the code, title ("Care Package"), who to notify |
| `rewards` | id, section, name, cost in patients, max uses |
| `redemptions` | reward, device id, when, when the alert was sent |
| `playlists` | id, section, display name, order |
| `tracks` | playlist, position, size, checksum, the audio (`BYTEA`, 64 kbps AAC) |

## API (`server/index.ts`, Bun, no dependencies)

| Endpoint | Does |
| --- | --- |
| `POST /unlock` `{code}` | returns a token and the section, or 404 for a wrong code |
| `GET /rewards` | rewards with their redemption history |
| `POST /redeem` `{rewardId, deviceId}` | checks the limit inside a transaction, records the redemption, **sends you an ntfy alert** |
| `GET /music` | playlists and track list (no audio) |
| `GET /music/track/:id` | one song's audio |

## App size

Moving the game's own art into the database was considered and rejected: all of it (items, rooms, characters, scenes, achievements) is about **0.5 MB**, so it would save almost nothing and would break playing offline on first launch. What made the APK big was:
- native code for 4 CPU types: 88 MB
- unminified app code: 49 MB
- the music: now in the database

`bun run apk:phone` builds for real phones only (arm64) with Android's code shrinker on. Expect roughly 40 MB instead of about 230 MB.

**Future idea:** a "live content" table, so new items, achievements or backgrounds can be added from the database without shipping an app update.

## Deploying the API on Render (free)

1. Go to **render.com** and sign up with **GitHub**. Allow it to see the `Medkit-Clicker` repo.
2. Choose **New + → Blueprint**, then pick `Medkit-Clicker`. Render reads `render.yaml` and proposes one free web service, `medkit-clicker-api`.
3. Render asks for 4 values. Open `render-env.txt` in the project folder (made locally, gitignored) and paste each value into the field of the same name:
   - `DATABASE_URL`
   - `DATABASE_CA` (one long line)
   - `SERVER_SECRET`
   - `NTFY_TOPIC`
4. Click **Apply**. The first build takes a few minutes.
5. When it shows **Live**, copy the address (like `https://medkit-clicker-api.onrender.com`). Opening `/health` on it should show `{"ok":true}`.
6. Give the address to Claude, or put `EXPO_PUBLIC_API_URL=<address>` in `.env.local` and run `bun run apk:phone`.

The free plan sleeps after 15 minutes without requests. The first request after that takes about 30–60 seconds, which only matters the first time Jasmine opens the music or rewards after a break.

## Setting it up

1. **Aiven:** create a PostgreSQL service, then copy its Service URI (it ends in `?sslmode=require`).
2. Copy `.env.example` to `.env` (gitignored) and fill in:
   - `DATABASE_URL`
   - `SERVER_SECRET`: a long random string
   - `NTFY_TOPIC`: a hard-to-guess topic name; install the ntfy app on your phone and subscribe to it
3. `bun run music` encodes the songs into `src/audio/encoded/`. This is already done.
4. `bun run db:setup` creates the tables and uploads the code hash, the rewards and the songs. It's safe to run again; unchanged songs are skipped.
5. **Host the API:** build `server/Dockerfile`, or run `bun run server`, using the same `.env` values.
6. In `.env.local`, add `EXPO_PUBLIC_API_URL=https://your-api-host` and rebuild the app.

With the server running, Jasmine opens **Redeem code** and enters the code. Her rewards unlock, the music downloads (with progress in Settings), and every redemption buzzes your phone.

**Offline and server-less builds still work:**
- the code is checked against the local hash
- redemptions fall back to the share sheet
- for offline testing with music, `BUNDLE=1 bun run music` bundles the songs into the app again

# The Console: timed events and promo codes

The web version of the game has a Console for timed events and promo codes, saved in the database.
It shows in the menu as **Console** once the dev code has been entered. On a phone that menu entry
opens the web version instead, because Google sign-in runs there.

Signing in with Google proves it's you. The server asks Google to confirm the sign-in and lets in
only one email address (`ADMIN_EMAIL`).

## One-time setup

### 1. Google Cloud: the OAuth client

Open <https://console.cloud.google.com/>, choose or create a project (for example "Medkit Clicker"), then:

**OAuth consent screen** (APIs & Services → OAuth consent screen, or "Google Auth Platform" → Branding):

| Field | What to put |
| --- | --- |
| App name | Medkit Clicker Editor |
| User support email | your email |
| Audience / User type | **External** |
| Publishing status | leave it in **Testing** |
| Test users | add your own Google email (the one that will sign in) |
| Developer contact email | your email |
| Scopes | none to add: sign-in only uses `openid`, `email` and `profile`, which are allowed by default |

**Credentials** (APIs & Services → Credentials → Create credentials → OAuth client ID, or "Google Auth Platform" → Clients → Create client):

| Field | What to put |
| --- | --- |
| Application type | **Web application** |
| Name | Medkit Clicker editor |
| Authorised JavaScript origins | `https://medkit-clicker.dustindwayn.ee` and, for testing on your PC, `http://localhost:8081` and `http://localhost` |
| Authorised redirect URIs | leave empty (the sign-in button uses a popup, not a redirect) |

Click **Create** and copy the **Client ID** (it ends in `.apps.googleusercontent.com`). The client secret
isn't used: don't put it anywhere.

### 2. The web game's build (GitHub)

Repository → Settings → Secrets and variables → Actions → **Variables** → New repository variable:

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = the Client ID

For testing locally, add the same line to `.env.local`.

### 3. The server (Render)

Render dashboard → the API service → Environment → add:

- `GOOGLE_CLIENT_ID` = the same Client ID
- `ADMIN_EMAIL` = your Google email

Saving redeploys the server. On its first start it adds the `events` table and a `label` column for promo
codes (it only adds; nothing is removed or reset).

## Using it

- **Events:** a title, a start and an end (date and time pickers, your local time; no end time means 23:59), and any of:
  - a per-tap multiplier and a per-second multiplier, which add up with boosts while the event runs
  - a gift each player gets once while it runs, picked from lists: medkits, Care Coins, Natal Gems, seconds of
    medkits, shop items, boosts, backgrounds, Gem Shop items and My Room items (as many rows as you like).
    Shop items, boosts, Gem Shop items and My Room items need 0.8.8 or later; older versions skip them.
  - an icon: drop a picture on the box, or click it to choose one (shrunk to 64×64)

  Players' games check for events at start-up and every 10 minutes.
- **Codes:** the code, a name only you see (empty: the code itself), its rewards (same picker), how many
  players can use it (empty: no limit), an end date (empty: never) and a message shown when it's used.
  **Rename** gives any code a new name. Codes made with `bun run add-promo` before 0.8.8 stored only their
  hash, so they show "No name yet" until you rename them; add-promo now saves the code as the name.

A Google sign-in lasts an hour; after that the editor asks you to sign in again.

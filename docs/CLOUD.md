# Cloud plan: MongoDB Atlas + alerts (plan only)

Goal: move the save to the cloud and get a notification on Dustin's phone when Jasmine redeems a real-life reward or buys something that matters.

## Will it fit the free tier? Yes.

| | Size |
| --- | --- |
| A new save | ~0.6 KB |
| A maxed late-game save (all achievements, 500 of every item, rewards redeemed) | ~4 KB |
| Atlas M0 free tier | 512 MB |

That's room for over 100,000 full saves. Even keeping a daily snapshot for years uses only a few MB. Music and images ship inside the app and never go in the database.

## Why there has to be a small API in between

The app must **never hold the database password**. Anything in the app, including `EXPO_PUBLIC_*` values, can be read out of the APK. MongoDB has also retired its "talk to the database straight from the app" services: the Atlas Data API, HTTPS Endpoints and Device Sync reached end of life in September 2025. So the setup is:

```
Medkit Clicker app  ──HTTPS──▶  small API (serverless)  ──driver──▶  MongoDB Atlas (free M0 cluster)
                                      │
                                      └──▶ push alert to Dustin (ntfy.sh or Expo push)
```

**API host options (free tiers):**
- Vercel or Netlify functions
- Cloudflare Workers, using MongoDB's driver over TCP or an Atlas-compatible HTTP proxy
- Render

I'd pick **Vercel functions + the official MongoDB Node driver**. It's the simplest and well documented.

## Data model

| Collection | Document |
| --- | --- |
| `players` | `{ _id, name, deviceIds[], createdAt }` |
| `saves` | `{ playerId, state (the GameState JSON), savedAt, appVersion }` (latest only, or the last N for rollback) |
| `redemptions` | `{ playerId, rewardId, at, notifiedAt }`: **the server becomes the source of truth**, so the 3-chocolate limit survives reinstalls and can't be faked by editing a save |
| `events` | `{ playerId, type: "purchase" \| "achievement" \| "rebirth", data, at }` (optional, for a feed of what she's doing) |

## API endpoints

| Endpoint | Does |
| --- | --- |
| `POST /pair` | Links a device to a player using a one-time pairing code (no passwords) and returns a device token |
| `PUT /save` | Uploads the save: debounced, every ~60 s and when the app goes to the background |
| `GET /save` | Restores the save on a new phone |
| `POST /redeem` | Checks the limit and cost **on the server**, records the redemption, **sends Dustin an alert** and returns OK. The app only marks it redeemed after OK. |

**Auth:** each request carries the device token. The API keeps a hash of it, the same idea as the redeem codes.

## Alerts to Dustin

- **ntfy.sh:** Dustin installs the ntfy app and subscribes to a secret topic. The API (not the app) posts "Jasmine redeemed Box of chocolates (2/3)". The topic stays secret because it lives on the server.
- **Or Expo push:** Dustin runs the app with an "admin" pairing, and the API sends to his Expo push token.
- See [NOTIFICATIONS.md](NOTIFICATIONS.md) for the local reminders, which stay on the device.

## Migration steps

1. Create the Atlas M0 cluster and a database user (Dustin). Put the connection string only in the API host's environment variables.
2. Build the API with the 4 endpoints above, plus tests.
3. App: add `src/lib/cloud.ts`, with pairing, upload and download, and an offline queue.
   - **AsyncStorage stays as the local cache**, so the game still works offline.
4. Move redemptions to `POST /redeem`. Existing local redemptions are uploaded once on first pairing.
5. Add a "Cloud save" card in Settings, with pairing, last synced time and "restore from cloud".

## Decisions for you

- [ ] API host (I suggest Vercel).
- [ ] Alerts via ntfy.sh or Expo push.
- [ ] Which events count as "bought something" for alerts: only real-life rewards, or also big in-game purchases?
- When you've made the Atlas account, I can scaffold the API in an `api/` folder in this repo.

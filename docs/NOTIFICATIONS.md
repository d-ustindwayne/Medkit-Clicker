# Notification plan

**Update:** part 1 (reward alerts to Dustin via ntfy.sh) is built into the server; see [DATABASE.md](DATABASE.md). Part 2 (local reminders) is still a plan.

There are two kinds of notification:
- **For Dustin:** a remote alert when Jasmine redeems a reward.
- **For Jasmine:** local reminders from the game itself.

## 1. Reward alerts to Dustin (remote)

Today, redeeming a reward opens the share sheet, and Jasmine has to send the message herself. The goal is for Dustin's phone to buzz automatically.

| Option | How it works | Cost | Setup | Verdict |
| --- | --- | --- | --- | --- |
| **ntfy.sh** | The game sends an HTTP POST to `https://ntfy.sh/<secret-topic>`; Dustin installs the ntfy app and subscribes to that topic | Free | ~10 min, no server | **Recommended** |
| Discord webhook | The game posts to a webhook URL; Dustin gets a Discord ping | Free | Needs a Discord server | Fine if Discord is already used |
| Expo push + a small server | Dustin's phone registers an Expo push token; a backend (Firebase Functions, Supabase) relays the alert | Free tier | Hours, plus a server to maintain | Overkill for one user |

**Recommended flow (ntfy):**
1. Dustin picks a long random topic name, for example `mc-7f3k...`, and subscribes to it in the ntfy app.
2. Store it like the redeem code: `bun run add-code` gets a sibling that writes `EXPO_PUBLIC_NTFY_TOPIC` to `.env.local` (gitignored).
3. On redeem, `rewards-page.tsx` sends `fetch("https://ntfy.sh/<topic>", { method: "POST", body: "<reward> was redeemed" })` alongside the existing share sheet.
4. Offline-safe: if the POST fails, queue the message in AsyncStorage and retry on the next app start. The share-sheet button stays as a backup.
5. Settings gets a "Notify Dustin automatically" toggle, on by default.

**Caveat:** `EXPO_PUBLIC_*` values are bundled into the app, so someone who unpacks the APK can read the topic. The worst they can do is send Dustin fake alerts. That's acceptable for a gift app; a server-side relay would be needed to hide it.

## 2. Local reminders for Jasmine (on-device)

These use `expo-notifications` scheduled local notifications. No server is needed, and local notifications still work in Expo Go.

| Reminder | When | Default |
| --- | --- | --- |
| Offline earnings are full | 4 h after the app was closed (`MAX_AWAY_S`), so nothing is wasted | On |
| Daily check-in | Once a day at a time she picks, gentle wording | Off |
| Take a break | After about 45 min of continuous play: a stress-relief nudge to rest | On |
| Achievement unlocked while away | Not possible: achievements are checked inside the app | n/a |

**Implementation steps:**
1. Install `expo-notifications` and add its config plugin in `app.json`.
2. Create `src/hooks/use-notifications.tsx`. It asks permission the first time a reminder is turned on (Android 13+ needs `POST_NOTIFICATIONS`). It creates an Android channel called "Reminders".
3. When the app goes to the background (the autosave already runs then): cancel the old "offline full" reminder and schedule a new one 4 h ahead.
4. When the app returns to the foreground: cancel pending one-shot reminders.
5. Add a "Notifications" card in Settings, with one toggle per reminder and a time picker for the daily check-in.
6. Use the game's voice and the pixel icon as the notification icon. This needs a monochrome 96×96 PNG of the medkit; I'll list it in `ASSETS.md` when we build this.

## Decisions for you

- [ ] Use ntfy.sh for reward alerts? (Or Discord, or none.)
- [ ] Which local reminders to keep, and their wording.
- [ ] Should the "take a break" reminder exist at all? It fits the "relieve her stress" goal, but it could feel naggy.

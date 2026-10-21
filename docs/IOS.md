# iOS without the App Store (plan)

**Status (2026-10-22): plan only, nothing built yet.** Goal: iPhone players can install and update Medkit Clicker for free through **AltStore** or **SideStore**, from a source we host ourselves. When it works, the website gets a link to the instructions.

## How it works for a player

1. They install AltStore or SideStore (free, open source) on their iPhone, signed with their own free Apple ID.
2. They add our **source**: a URL to a small JSON file on our GitHub Pages site.
3. Medkit Clicker shows up in that store. They tap install; AltStore/SideStore downloads our `.ipa` from GitHub Releases and signs it with *their* Apple ID.
4. New versions appear in the store as updates when we publish a new release and update the source.

**Limits of free Apple IDs (worth saying on the website):** an app signed this way must be refreshed every 7 days (AltStore/SideStore do it automatically when they can, SideStore without a computer), and a free Apple ID can have at most 3 sideloaded apps at a time. Nothing to pay on our side or theirs.

## What we need to build

### 1. An unsigned `.ipa`
AltStore and SideStore re-sign the app themselves, so we don't need a paid Apple Developer account or a certificate.
- iOS apps can only be compiled on macOS. Our repo is public, so **GitHub Actions' macOS runners are free**; no Mac needed.
- A workflow (`.github/workflows/ios.yml`, run by hand or on a version tag) would: install Bun and CocoaPods, run `bunx expo prebuild --platform ios --clean`, then `xcodebuild` the Release configuration for real iPhones with signing turned off (`CODE_SIGNING_ALLOWED=NO`).
- Package it: put `Medkit Clicker.app` inside a `Payload/` folder and zip that as `MedkitClicker.ipa`.
- EAS Build (Expo's cloud) is the alternative, but iOS device builds there expect Apple credentials, so the plain Xcode route fits better.

### 2. Host the `.ipa`
- Upload it to a **GitHub Release** on this repo (the workflow can create the release and attach the file). Its download URL is stable and free.

### 3. The AltStore source (JSON)
- A file like `website/public/altstore.json`, published by the existing website deploy at `https://d-ustindwayne.github.io/Medkit-Clicker/altstore.json`.
- It lists the app: name, bundle id (`com.dust.dev.mc` today; worth choosing the final one first, since changing it later looks like a different app), developer name, description, icon URL, screenshots, and a `versions` list with each version's number, date, notes, `.ipa` download URL and file size.
- The iOS workflow could update this file automatically with the new version and size, so a release is one click.

### 4. A page on the website
- "Play on iPhone": what AltStore/SideStore is, links to their official install guides, our source URL with a copy button (and an "Add to AltStore" link, `altstore://source?url=...`), the 7-day and 3-app limits, and that it's free.

## Things to check in the app first (iOS is untested)

- **Build it for the simulator first** (same macOS workflow) and try it there before any player sees it.
- **Native modules:** `expo-alternate-app-icons` (iOS has its own icon-change prompt), `expo-media-library` (sticker saving asks for Photos permission; the iOS permission text is already in `app.json`), `expo-document-picker` / `expo-sharing` (save export and import), `expo-audio` (playing in silent mode), haptics.
- **Signing quirks:** apps re-signed with a free Apple ID can't use some capabilities (for example push notifications or app groups). The game uses neither today; keep it that way or check first.
- **Layout:** safe areas on notched iPhones and the Dynamic Island, and the shop drag gesture against iOS's swipe-to-go-home.
- **Server:** the app talks to the Render API over HTTPS, which iOS allows by default.

## Order of work (another day)

1. Choose the final bundle id and version numbering.
2. Write the iOS workflow; get a simulator build working, then an unsigned device `.ipa`.
3. Test on one iPhone with AltStore/SideStore.
4. Add the GitHub Release step and `altstore.json`.
5. Add the "Play on iPhone" page to the website and link it from the home page.

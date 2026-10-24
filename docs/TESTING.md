# Test checklist

Run through this before a release or after big changes. Items marked 📱 need a real phone: the emulator can't show how vibration feels or how the audio sounds. Results of the latest run are at the bottom.

## Start-up and saving
- [ ] The app opens to the medkit with the splash fading out, and no error screen appears
- [ ] Close the app with the system back button or from recents, reopen it: patients, items and settings are kept
- [ ] Close it for a minute or more, reopen it: a "Welcome back" toast shows the earnings (max 4 h)
- [ ] An old save (from before the 13 items) loads: its syringes, gloves and other items are still owned

## Medkit (main button)
- [ ] Tapping adds patients, shows "+N", a shockwave and particles, and plays the click
- [ ] 📱 Each tap gives a light vibration (and none when Vibration is off in Settings)
- [ ] The heartbeat pulse and rotating sunburst run while idle
- [ ] Owned supplies orbit the medkit (up to 16, mixed across item types), and none is cut off at the ring's edge
- [ ] Swiping the medkit area goes to the Hospital page and back; the dots follow

## Shop
- [ ] Items appear in order (Bandage, Gloves, Facemask, Thermometer, Stethoscope, BP Cuff, Syringe, Medicine, IV Bag, Blood Sample, COVID Test, Microscope, DNA Strand), but a new game lists only the first 3; each item you discover brings in one more "???" (always 2 ahead)
- [ ] Unaffordable items you've never bought show as "???" silhouettes until you've earned half their price
- [ ] Tap growth: every 100 taps the "+N" per tap grows a little; it stops growing at 2,300 taps and stays after a rebirth
- [ ] Buying: the price goes up 15%, the count goes up, there's a bounce, a buy sound and a 📱 medium vibration
- [ ] Can't afford: the card shakes, plays the invalid sound and gives a 📱 warning vibration
- [ ] The progress bar fills toward the next purchase; the shine sweeps over affordable items
- [ ] The list scrolls smoothly with all 13 cards
- [ ] Swiping the shop goes to the "???" page and back; swiping the SHOP / HOSPITAL / GEMS title does too

## Achievements
- [ ] The first tap unlocks "First Aid" with a toast showing the bronze trophy, confetti and a 📱 success vibration
- [ ] The Achievements page lists 111, with progress bars and trophy, medal, heart and clock art
- [ ] Secret achievements stay hidden until unlocked
- [ ] Scrolled to the bottom of the badges, the chosen achievement's name and description are still shown at the top
- [ ] Germ Buster starts with "Get ready..." and the first germ springs up like the rest
## Menu and navigation
- [ ] The menu opens and closes; every page opens (Achievements, Redeem, Settings, About) and back works
- [ ] Closing the menu slides it out to the left (it doesn't vanish), and it opens again on the menu page
- [ ] Back returns to the page before, one step at a time (Rewards → Code → About → Menu)
- [ ] About shows the ward patients treated and a Visit website button
- [ ] The Android system back button closes the menu or page before leaving the app

## Settings
- [ ] Music player: play/pause, previous/next, tapping the bar seeks, the time updates
- [ ] 📱 Music sounds right and stops when the app is in the background
- [ ] The soundtrack plays all five songs in turn
- [ ] The music and sound-effect volume bars work; the mute button silences them
- [ ] The Vibration toggle turns all vibration off and on
- [ ] The background stepper cycles all 7 patterns; dark mode switches the palette everywhere, including dialogs
- [ ] Export JSON/CSV saves a file (it asks for a folder every time); import restores it, with the settings and app icon
- [ ] Reduce motion stops the background, rays, confetti and shakes at once; turning it off brings the motion back
- [ ] Colour labels put a letter on each pill colour in Sort the Meds
- [ ] Delete progress asks for confirmation, then resets (rewards stay redeemed)
- [ ] Dev tools (development builds only): add items, unlock all achievements, simulate time away

## Rebirth and rewards
- [ ] Rebirth stays locked until 1 billion patients in a run; after rebirthing, items reset and the boost shows
- [ ] Hospital page (shop, swipe right): clouds drift behind the building; cars drive both ways; visitors walk to and from the door; every minute or so an ambulance parks at the door with a "Patient: ...!" bubble; tapping it shows "Patient admitted" and adds patients, and it drives off after 15 s if ignored; the rebirth card shows the hospital's name and the next look
- [ ] Redeem: a wrong code is rejected; the right code opens the private section; redeeming spends patients; the limit is enforced

## Care Coins and boosts
- [ ] An achievement toast says "+N Care Coins"; the Boosts tab balance goes up
- [ ] Buying a boost spends coins; a countdown chip appears under the rate and on the card
- [ ] Timed boosts run out on time; Lucky Stethoscope counts down per tap
- [ ] Can't afford: shake, invalid sound, warning vibration
- [ ] Two tap (or per-second) boosts at once add up: Adrenaline 2x + Code Blue 5x = 7x

## My Room and patients
- [ ] Staff walk back and forth with a 3-frame step
- [ ] The pencil button opens decorate mode: page swiping stops, the item tray and room switcher appear
- [ ] Tap an item to place it, drag to move it, tap the × or the tray item again to put it away
- [ ] A full room says it's full; locked items and rooms say how to unlock them
- [ ] A patient arrives with a "!" on the page dot and a toast; tapping them opens their minigame
- [ ] Injection, rhythm and bandage minigames can be won and lost; a win shows the reward and +1 coin
- [ ] At a high level (Dev Tools: +10 of each item a few times), the harder rounds show up: pills in three sizes and with two rules (up to 5x5), exhale and hidden breaths, a 20-30 beat pulse, the injection's dark core
- [ ] Rhythm: mashing never leaves the count stuck at 0 after an on-time tap; Bandage arrows give 7.5 s

## Web version (phone browser and computer)
- [ ] One swipe turns one page, however short and fast (medkit/My Room and the shop)
- [ ] A toast goes away when tapped, swiped either way (finger or mouse), and springs back from a short drag
- [ ] Minigames count every tap when tapping fast with two thumbs (Bandage, Germ Buster, Rhythm)
- [ ] The page never widens or zooms out when a toast or confetti appears
- [ ] Long names (shop items, boosts, Gem Shop, the music track, toasts, background names) scroll slowly when they don't fit, and end in "…" with Reduce motion; nothing runs past its box at phone widths
- [ ] Decorating: an item at the far right of the room shows its whole ✕; on a computer the ✓ button sits below the currency chips
- [ ] Dragging with the mouse over the hospital, the medkit or any picture never lifts out a ghost image, and never selects text (the website too); text boxes can still be selected
- [ ] Settings has no Vibration switch, and the Gem Shop has no App Icons section (the app on a phone still has both)
- [ ] The browser offers Install / Add to Home Screen; the installed game opens full screen with the medkit icon. About shows "Get the Android app" (web only)
- [ ] Minigame keys on a computer: Space (Injection, Rhythm, fast Bandage), arrows or WASD (arrow Bandage), ← → (left/right Bandage, faster heart), ← ↓ → or 1 2 3 (beat count), 0-3 (X-ray count), hold Space (Deep Breaths); each game shows its keys
- [ ] With the code entered, "Check for new songs" downloads the music in the browser; after closing and reopening the tab the playlists are still there and play
- [ ] While tapping and buying, the medkit and the hospital never move up or down as the patients number changes
## Layout and looks
- [ ] Phone portrait: the shop sits under the medkit and nothing is cut off; toasts don't hide important buttons
- [ ] Tablet or landscape: the shop sits beside the medkit
- [ ] With Heart Monitor (and any background), after opening My Room, the Hospital and the Gem Shop once, the main screen stays smooth; `adb shell dumpsys gfxinfo com.medkitclicker.app` shows few janky frames
- [ ] Hospital page on a short shop (phone, shop pulled down): the rebirth card folds into a REBIRTH tab and the hospital and road show; the tab slides the card down and back up. With the shop pulled up, or beside the medkit, the full card shows
- [ ] Opened from the tab on a short phone, the rebirth card never runs off the page: it scrolls inside the space under the tab, and the Rebirth button can always be reached
- [ ] Web: dragging the pages with the mouse and letting go outside the browser window (or double-click and drag) never leaves the pages stuck following the mouse
- [ ] All sprites are crisp (not blurry) at every size
- [ ] Backgrounds reach every edge (no bare strip on the right); tilting the phone shifts them a little, near layers more than far ones
- [ ] Heart Monitor sweeps smoothly with random beats; Blood Stream cells tumble; in decorate mode the reception's side floor carries on the tile grid

## Latest run

### 2026-10-24: web build, Playwright (Chrome, Edge, Firefox at 1366x768 and 390x844)

Local web export served from the scratchpad (no API). Each check was also run against the unfixed 0.7.2 build to confirm it caught the bug.

**Passed in all six browser/size runs (92 checks):** medkit taps; the menu slides out on close; the pages are snap points the browser can't fling past; mouse drag pages the shop; the shop list scrolls; toasts dismiss on tap, on a touch swipe (Chromium) and on a mouse drag, and spring back from a short drag; an item at the far right keeps its ✕ on top of the side art; the ✓ button clears the chips; the dots follow the page; the page never got wider than the screen (0.7.2: 434 px at 390); fast overlapping two-thumb taps all count in the Bandage game (0.7.2: 1 of 20); Delete progress starts over; no page errors.
**Overflow sweep at 390, 360 and 320 px:** nothing runs past its box; long names scroll; the awards grid fills its rows at 320 px.
**Not provable here:** the feel of a real fling (headless Chrome's synthetic touches have no momentum), touch swipes in Firefox (its touch simulation can't scroll), anything on the Android app (no phone connected; the Android bundle compiles).

### 2026-10-23: Samsung phone, release build (arm64)

**Passed:** start-up (after fixing a crash in the tilt code), backgrounds reach the right edge, Reduce motion on and off,
Heart Monitor at 120 fps with 0.25% late frames, Blood Stream cells, the reception's sides in decorate mode, swiping the
shop title, About (website button, ward count), Back from Code to About, the dev code, a 4x4 two-rule pills round.
**Not checked yet:** tilt by hand, the other hard minigame rounds (owner is testing them).

### 2026-10-20: Android emulator (Pixel-class, Android 16), debug build

**Passed:**
- Start-up and loading the save
- Autosave plus restart keeps patients and items
- Medkit tap: counter, particles, "Patient Healed" singular, First Aid unlock
- Shop: the "???" reveal at half price
- Buying: +15% price, count, orbit sprite
- Refused buy when you can't afford it
- Bandage: 1 of 13 items in order with correct prices
- All 13 item types orbit the medkit (dev tools: +10 each)
- Swipe pages:
  - medkit → Hospital
  - shop → "???"
- Menu, and the back button from a page to the menu
- Achievements page:
  - 111 total, the counter and the detail card
  - trophy art loads (slowly in debug, see below)
- Settings:
  - Vibration toggle
  - dark mode across the menu
  - background stepper (Mint Crosses)
  - "Lights Out" secret achievement
- Dev tools:
  - +1 billion, +10 each, skip 1 h away: 18.5 trillion at 5.07 billion/s, as expected
- Rebirth:
  - 26 points (cube root of 18,727), confirmation dialog
  - reset items, R1 badge, toast
- Redeem: a wrong code is rejected with a message
- Visit website opens the browser

**Found and fixed:**
- Toasts covered the counter; they now sit at the bottom, 2 at most.
- Haptics only fired on the medkit; they now fire on buy, failed buy and achievements, with a Vibration toggle.
- Achievement toasts always showed the medkit; they now show the achievement's art.
- The splash screen and app icons showed the old black-outlined medkit.

**Debug-only, not bugs:**
- In debug builds, images and audio stream from Metro on first use.
  - The first trophy took about 25 s to appear.
  - The 5 audio players timed out at start-up while Metro was busy.
- Release builds pack images and audio into the app.

**Still to check on a real phone:**
- 📱 how the vibration feels
- 📱 music and sound quality, and that it stops in the background
- the right redeem code
- export and import through the Android folder picker

### 2026-10-20: Android emulator, release APK

**Passed:**
- Installs over the debug build and keeps the save (rebirth, settings, items)
- Opens instantly with the new splash
- Music:
  - plays with no errors
  - next track, tap-to-seek and playlist switch all work
  - pauses when the app goes to the background and resumes on return
- Haptics: the system vibration log shows the app's taps (50 ms) and stronger pulses
- Swipe pages: medkit → Hospital (outside scene) → Ward (inside scene), with 3 dots
- Toasts: "Welcome back" shows at the bottom and the counter stays visible
- Offline earnings: 0.2/s for 13 s = 2 patients

### 2026-10-20, 04:30: automated tests

- **`bun run test`: 23 tests, 192 checks, all pass.** They cover:
  - the shop price ladder and buying
  - loading old saves
  - Care Coins
  - every boost type
  - ward patients (win, loss, nobody there)
  - My Room: unlocks, zones, one-of-each items, room limits, locked rooms, the bonus cap
  - rebirth keeping rooms and coins
- Typecheck and lint are clean.
- **Not done:** the on-screen pass of the new features (Boosts tab, My Room, minigames, top-left toasts) on the emulator. Claude Code shut the emulator down for low memory overnight. Rerun the "Care Coins and boosts" and "My Room and patients" sections above.

### 2026-10-20, 15:00: emulator, minified release APK talking to the live server

**Size:** 162 MB → 40 MB (emulator, x86_64) and **38 MB** (phone, arm64). Both minified.

**Passed:**
- Startup with no crashes, minified
- Currency chips top-right: patients, Care Coins and Natal Gems
- 120 taps earned 3 Care Coins from achievements
- Adrenaline Shot: spent 2 coins, showed a 3:00 countdown chip and card timer
- A patient arrived after 1 minute, with a top-left toast showing their picture and a "!" badge on the page dot
- My Room: 2 nurses walking with step frames, the patient with a bouncing "!"
- Treatment dialog, then the injection minigame (vein zone, sliding needle, 3 shots)
- The loss result; the room then shows "No patients waiting"
- Decorate mode:
  - room switcher with bonus summary
  - item tray, with locked items showing a lock
  - placing the plant gives a +1%/s bonus
  - dragging the plant moves it and pages don't swipe
  - a locked room gives "Unlock 15 achievements"
- Settings:
  - no music player without the code (sound effects and vibration only)
  - a locked paid background shows its price, your balance and a disabled Buy
- Redeem against the live server: a wrong code is rejected. The server was asleep and took about 40 s to wake, so a timeout, a "waking up" note and an early wake-up were added.

**Found and fixed:**
- the stale `.mp3`/`.m4a` resource clash
- a missing CPU filter (the APK still held every CPU type)
- the tray covering the floor in decorate mode
- "You still healed 0 patients" after an early loss

**Still for you to test** (they need the real code or more coins):
- entering the private code (code entry from the About icon): the private section unlocks
- a real redemption, which should send an ntfy alert to your phone
- the 4 animated backgrounds (15 / 10 coins)
- the rhythm and bandage minigames and a minigame win

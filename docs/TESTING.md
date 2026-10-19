# Test checklist

Run through this before a release or after big changes. Items marked 📱 need a real phone: the emulator can't show how vibration feels or how the audio sounds. Results of the latest run are at the bottom.

## Start-up and saving
- [ ] The app opens to the medkit with the splash fading out, and no error screen appears
- [ ] Close the app with the system back button or from recents, reopen it: patients, items and settings are kept
- [ ] Close it for a minute or more, reopen it: a "Welcome back" toast shows the earnings (max 8 h)
- [ ] An old save (from before the 13 items) loads: its syringes, gloves and other items are still owned

## Medkit (main button)
- [ ] Tapping adds patients, shows "+N", a shockwave and particles, and plays the click
- [ ] 📱 Each tap gives a light vibration (and none when Vibration is off in Settings)
- [ ] The heartbeat pulse and rotating sunburst run while idle
- [ ] Owned supplies orbit the medkit (up to 16, mixed across item types)
- [ ] Swiping the medkit area goes to the Hospital page and back; the dots follow

## Shop
- [ ] All 13 items appear in order: Bandage, Gloves, Facemask, Thermometer, Stethoscope, BP Cuff, Syringe, Medicine, IV Bag, Blood Test, Rapid Test, Microscope, DNA Lab
- [ ] Unaffordable items you've never bought show as "???" silhouettes until you've earned half their price
- [ ] Buying: the price goes up 15%, the count goes up, there's a bounce, a buy sound and a 📱 medium vibration
- [ ] Can't afford: the card shakes, plays the invalid sound and gives a 📱 warning vibration
- [ ] The progress bar fills toward the next purchase; the shine sweeps over affordable items
- [ ] The list scrolls smoothly with all 13 cards
- [ ] Swiping the shop goes to the "???" page and back

## Achievements
- [ ] The first tap unlocks "First Aid" with a toast showing the bronze trophy, confetti and a 📱 success vibration
- [ ] The Achievements page lists 111, with progress bars and trophy, medal, heart and clock art
- [ ] Secret achievements stay hidden until unlocked

## Menu and navigation
- [ ] The menu opens and closes; every page opens (Achievements, Rebirth, Redeem, Settings, About) and back works
- [ ] The Android system back button closes the menu or page before leaving the app

## Settings
- [ ] Music player: play/pause, previous/next, tapping the bar seeks, the time updates
- [ ] 📱 Music sounds right and stops when the app is in the background
- [ ] Playlist stepper switches playlists, and the track resets to 1
- [ ] The music and sound-effect volume bars work; the mute button silences them
- [ ] The Vibration toggle turns all vibration off and on
- [ ] The background stepper cycles all 7 patterns; dark mode switches the palette everywhere, including dialogs
- [ ] Export JSON/CSV saves a file (the first time, it asks for a folder); import restores it
- [ ] Delete progress asks for confirmation, then resets (rewards stay redeemed)
- [ ] Dev tools (development builds only): add items, unlock all achievements, simulate time away

## Rebirth and rewards
- [ ] Rebirth stays locked until 1 billion patients in a run; after rebirthing, items reset and the boost shows
- [ ] Redeem: a wrong code is rejected; the right code opens Jasmine's Rewards; redeeming spends patients and opens the share sheet; the limit is enforced

## Layout and looks
- [ ] Phone portrait: the shop sits under the medkit and nothing is cut off; toasts don't hide important buttons
- [ ] Tablet or landscape: the shop sits beside the medkit
- [ ] All sprites are crisp (not blurry) at every size

## Latest run

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
  - next track, tap-to-seek and playlist switch (Cup of Joe → Love Songs) all work
  - pauses when the app goes to the background and resumes on return
- Haptics: the system vibration log shows the app's taps (50 ms) and stronger pulses
- Swipe pages: medkit → Hospital (outside scene) → Ward (inside scene), with 3 dots
- Toasts: "Welcome back" shows at the bottom and the counter stays visible
- Offline earnings: 0.2/s for 13 s = 2 patients

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

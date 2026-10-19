# Scene mechanics (proposal, not built yet)

The two scene pages get real gameplay, using the characters and scene art that already exist. Together they form one loop: **patients arrive outside → you triage them → they recover in the ward → they're discharged with a reward.** Everything stays cozy: nothing is lost if you ignore it.

## 1. Hospital page (outside): Arrivals

- Every 45–120 s a patient walks in toward the entrance, using one of the 10 patient sprites.
  - Healthy patients come from the car park.
  - Sick ones (2, 4, 5, 9, 10) are dropped off by the ambulance.
- **Tap a patient to triage them** before they reach the door (about 10 s of walking).
  - Healthy patient: an instant bonus of **30 s of production**.
  - Sick patient: urgent, **double the bonus**, and a little siren flash on the ambulance.
  - Triaged patients go to the ward, if a bed is free.
- A missed patient just walks in with no reward, and nothing is lost.
- While you're on the medkit page, the pager dot shows a small **!** when someone is arriving, so you know to swipe over.

## 2. Ward page (inside): Beds

- The ward starts with **1 bed** and can grow to 4, plus waiting chairs as a queue of up to 3.
- Patients in bed recover over 1–3 min.
  - Each one in bed gives a **+5% care bonus** to healing per second, shown as a chip next to the rate.
- **Tap a patient to check their vitals:** recovery speeds up by 10 s, and the heart monitor blips.
  - Each patient has a short cooldown so it isn't just spam-tapping.
- When recovered, the patient stands up healthy, says "Thank you, nurse!" in a speech bubble, and walks out.
  - Discharge reward: **2 min of production**.
- **The Nightingale painting:** tap it once a day for the "Lamp of Hope", +25% healing for 10 min, with a real Florence Nightingale quote.

## 3. Staff and upgrades (rebirth points finally get a use)

Bought with rebirth points, and kept across rebirths:

| Upgrade | Effect |
| --- | --- |
| Extra bed (×3) | Up to 4 beds |
| Nurse (×5: characters 11–15) | Checks vitals automatically, one every 15 s; stands in the ward |
| Doctor (character 16) | Discharges pay double |
| Ambulance radio | Patients arrive 25% more often |

## 4. Achievement hooks

First triage, first discharge, full ward, 100 / 1,000 discharges, hire every nurse, and 30 days of the Lamp of Hope.

## Technical notes

- **New state:** ward beds (patient, progress, sick), the queue, discharge count, staff owned, and the last Lamp of Hope time. Arrivals are temporary, not saved.
- **The care bonus and the Lamp of Hope go inside `healingRate()`**, so every rate display and offline earnings include them.
- **Offline:** beds keep recovering while the app is closed, and discharges are paid out on return, inside the existing 8 h cap.
- **Characters:** the 256×256 PNGs are drawn at about 48–64 dp inside the scenes.
  - "Walking" is a gentle bob and slide (Reanimated). A real walk cycle would need extra frames.
- **Placeholders:** every number above is my placeholder and goes in TASKS.md under "Needs your decision".

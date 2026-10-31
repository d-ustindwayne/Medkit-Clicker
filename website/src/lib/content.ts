// Game facts shown on the site, copied from the game's src/constants. Keep in sync when the game changes.

import { getPosition, getTimes } from "suncalc";

import { TIMEZONE_PLACES } from "@/lib/timezones";

const files = import.meta.glob<string>("../assets/**/*.{png,mp3}", { eager: true, query: "?url", import: "default" });
const sprite = (path: string) => {
  const url = files[`../assets/${path}`];
  if (!url) throw new Error(`Missing asset: ${path}`);
  return url;
};

export const GAME = {
  name: "Medkit Clicker",
  author: "Dustin Dwayne Diaz",
  year: 2026,
  license: "Apache License 2.0",
  // Everyone's achievements, as the game's menu counts them (the code-locked one isn't included).
  achievements: 199,
  offlineHours: 4,
};

export const SUPPLIES = [
  { name: "Bandage", img: sprite("sprites/shop/bandage_roll.png") },
  { name: "Gloves", img: sprite("sprites/shop/gloves.png") },
  { name: "Facemask", img: sprite("sprites/shop/facemask.png") },
  { name: "Thermometer", img: sprite("sprites/shop/thermometer.png") },
  { name: "Stethoscope", img: sprite("sprites/shop/stethoscope.png") },
  { name: "BP Cuff", img: sprite("sprites/shop/bp_tester.png") },
  { name: "Syringe", img: sprite("sprites/shop/syringe.png") },
  { name: "Medicine", img: sprite("sprites/shop/medicines.png") },
  { name: "IV Bag", img: sprite("sprites/shop/iv_bag.png") },
  { name: "Blood Sample", img: sprite("sprites/shop/blood_vial.png") },
  { name: "COVID Test", img: sprite("sprites/shop/covid_test.png") },
  { name: "Microscope", img: sprite("sprites/shop/microscope.png") },
  { name: "DNA Strand", img: sprite("sprites/shop/dna.png") },
];

export const BOOSTS = [
  { name: "Emergency Funding", cost: 1, description: "Instantly get 1 minute's worth of medkits." },
  { name: "Adrenaline Shot", cost: 2, description: "3x medkits per tap for 5 minutes." },
  { name: "Patient Rush", cost: 2, description: "Instantly get 300 taps' worth of medkits." },
  { name: "Double Shift", cost: 3, description: "2x medkits per second for 10 minutes." },
  { name: "Code Blue", cost: 3, description: "10x medkits per tap for 90 seconds." },
  { name: "Lucky Stethoscope", cost: 4, description: "Your next 100 taps earn 25x." },
  { name: "Clearance Sale", cost: 4, description: "Shop prices 30% off for 5 minutes." },
  { name: "Research Grant", cost: 5, description: "Instantly get 15 minutes' worth of medkits." },
  { name: "Flu Season Surge", cost: 6, description: "7x medkits per second for 177 seconds." },
  { name: "Triple Espresso", cost: 8, description: "3x per tap and per second for 5 minutes." },
  { name: "Night Shift Crew", cost: 8, description: "2x medkits per second for 45 minutes." },
  { name: "Charity Gala", cost: 12, description: "Instantly get 2 hours' worth of medkits." },
  { name: "Time Warp", cost: 25, description: "Instantly get 8 hours' worth of medkits." },
];

export const HOSPITAL_TIERS = [
  { rebirths: 0, name: "Little Clinic" },
  { rebirths: 1, name: "Neighbourhood Clinic" },
  { rebirths: 3, name: "Sunny Health Center" },
  { rebirths: 6, name: "Community Hospital" },
  { rebirths: 10, name: "Heartwood Hospital" },
  { rebirths: 15, name: "Wellspring Medical Center" },
  { rebirths: 21, name: "Sunrise Medical Center" },
  { rebirths: 28, name: "Skyline Medical Center" },
  { rebirths: 36, name: "Meadow Medical Campus" },
  { rebirths: 45, name: "Grand Haven Medical Center" },
  { rebirths: 50, name: "Grand Haven Reborn" },
].map((t, i) => ({ ...t, img: sprite(`scenes/hospital_${i}.png`) }));

/** The sky follows the real sun, as in the game (sunPhase in src/lib/sun.ts): `tint` darkens or warms the buildings, `clouds` is cloud opacity. */
export type DayPhase = "sunrise" | "day" | "sunset" | "night";
// `dark` shades the people and cars (0-1) and `lights` turns the headlights on, as in the game
// (SKIES in src/constants/hospital.ts).
export const SKIES: Record<DayPhase, { label: string; img: string; tint: string | null; clouds: number; fill: string; dark: number; lights: boolean }> = {
  sunrise: { label: "Sunrise", img: sprite("scenes/hospital_sky_sunrise.png"), tint: "rgba(255,170,150,0.12)", clouds: 0.9, fill: "#008ed8", dark: 0.1, lights: false },
  day: { label: "Day", img: sprite("scenes/hospital_sky.png"), tint: null, clouds: 1, fill: "#58b5ee", dark: 0, lights: false },
  sunset: { label: "Sunset", img: sprite("scenes/hospital_sky_sunset.png"), tint: "rgba(255,120,60,0.16)", clouds: 0.8, fill: "#002978", dark: 0.2, lights: true },
  night: { label: "Night", img: sprite("scenes/hospital_sky_night.png"), tint: "rgba(10,16,48,0.42)", clouds: 0.25, fill: "#080c28", dark: 0.45, lights: true },
};
/** By the clock: sunrise 5-7, day 7-17, sunset 17-19, night 19-5. Used where the time zone isn't a place. */
export const dayPhase = (hour: number): DayPhase =>
  hour >= 5 && hour < 7 ? "sunrise" : hour >= 7 && hour < 17 ? "day" : hour >= 17 && hour < 19 ? "sunset" : "night";

/**
 * Sunrise, day, sunset or night now, from the real sun at the visitor's time zone's main city, like
 * the game: night while the sun is 6 degrees or more below the horizon, day once it's 6 above.
 */
export function sunPhase(date = new Date()): DayPhase {
  let place: [number, number] | undefined;
  try {
    place = TIMEZONE_PLACES[Intl.DateTimeFormat().resolvedOptions().timeZone];
  } catch {}
  if (!place) return dayPhase(date.getHours());
  const [lat, lng] = place;
  const { altitude } = getPosition(date, lat, lng);
  if (altitude <= -6) return "night";
  if (altitude >= 6) return "day";
  return date.getTime() < getTimes(date, lat, lng).solarNoon.getTime() ? "sunrise" : "sunset";
}

/** The scene's art-pixel grid: 320x240, like the game since 2026-10-21 (src/constants/hospital.ts). */
export const SCENE = { w: 320, h: 240 };

// The street in front of the hospital, on the scene's art-pixel grid (src/constants/hospital.ts).
export const STREET = {
  clouds: [
    { img: sprite("street/cloud_mid.png"), w: 46, y: 14, seconds: 160, start: 0.35 },
    { img: sprite("street/cloud_small.png"), w: 35, y: 40, seconds: 120, start: 0.85 },
    { img: sprite("street/cloud_big.png"), w: 60, y: 68, seconds: 140, start: 0.1 },
    { img: sprite("street/cloud_mid.png"), w: 46, y: 88, seconds: 110, start: 0.7 },
    { img: sprite("street/cloud_small.png"), w: 35, y: 104, seconds: 90, start: 0.4 },
  ],
  cars: ["hatch_red", "sedan_blue", "taxi", "van_green", "pickup_orange", "mini_pink", "sedan_white", "hatch_teal"].map((c) => sprite(`street/cars/${c}.png`)),
  ambulance: sprite("street/ambulance.png"),
  visitors: ["woman", "man", "kid", "elder"].map((v) => [sprite(`street/visitor_${v}_1.png`), sprite(`street/visitor_${v}_2.png`)] as const),
  /** Two lanes: the far one drives left, the near one right. `y` is where the wheels touch. */
  lanes: [
    { y: 218, dir: -1 },
    { y: 225, dir: 1 },
  ],
  doorX: 160,
  visitorFeetY: 211,
  /** Art pixels per second. */
  visitorSpeed: 14,
};

export const ROOMS = ["Empty Room", "Reception", "Lab", "Pharmacy", "Children's Ward"];

const item = (name: string, id: string, animated = false) => ({
  name,
  frames: animated ? [1, 2, 3, 4].map((k) => sprite(`room/${id}_${k}.png`)) : [sprite(`room/${id}.png`)],
});

export const ROOM_ITEMS = [
  item("Hospital Bed", "hospital_bed"),
  item("IV Stand", "iv_stand"),
  item("Wheelchair", "wheelchair"),
  item("Potted Plant", "potted_plant"),
  item("Patient Monitor", "patient_monitor", true),
  item("Waiting Bench", "waiting_bench"),
  item("Crash Cart", "crash_cart"),
  item("AED", "aed"),
  item("First-Aid Cabinet", "first_aid_cabinet"),
  item("X-ray Viewer", "xray_viewer"),
  item("Vending Machine", "vending_machine"),
  item("Sanitizer", "sanitizer"),
  item("Aquarium", "aquarium", true),
  item("Lava Lamp", "lava_lamp", true),
];

// Each has variants that open up as you progress (a drifting vein, skipped beats, look-alike capsules...).
export const MINIGAMES = [
  "Injection timing",
  "CPR rhythm",
  "Bandage-wrap tap race",
  "Pulse check",
  "Sort the meds",
  "Spot the fracture on the X-ray",
  "Germ buster",
  "Deep breaths",
  "Match the meds",
  "Healthy shopping (catch the good food)",
  "Odd colour out",
  "Find it in the busy ward",
  "Blood-cell maze",
  "IV pipe puzzle",
];

const staff = (id: string, name: string) => ({
  name,
  frames: [sprite(`characters/${id}_walk1.png`), sprite(`characters/${id}.png`), sprite(`characters/${id}_walk2.png`), sprite(`characters/${id}.png`)],
});

export const STAFF = [
  staff("11_nurse_teal", "Nurse in teal scrubs"),
  staff("16_doctor", "Doctor"),
  staff("12_nurse_pink", "Nurse in pink scrubs"),
  staff("15_male_nurse", "Male nurse"),
  staff("13_nurse_navy", "Nurse in navy scrubs"),
  staff("14_nurse_lavender", "Nurse in lavender scrubs"),
];

export const TRACKS: { title: string; note?: string; src: string }[] = [
  { title: "Waiting Room", src: sprite("audio/waiting_room.mp3") },
  { title: "Morning Rounds", src: sprite("audio/morning_rounds.mp3") },
  { title: "Night Shift", src: sprite("audio/night_shift.mp3") },
  { title: "Visiting Hours", src: sprite("audio/visiting_hours.mp3") },
  { title: "Recovery Room", src: sprite("audio/recovery_room.mp3") },
];

/** Sound effects from the game. */
export const SFX = { tap: sprite("audio/tap.mp3") };

export const SPRITES = {
  medkit: sprite("sprites/medkit.png"),
  heart: sprite("sprites/heart.png"),
  coin: sprite("sprites/coin.png"),
  gem: sprite("sprites/natal_gem.png"),
  trophy: sprite("sprites/trophy_gold.png"),
  headphones: sprite("sprites/headphones.png"),
  hospital: sprite("sprites/hospital.png"),
  stethoscope: sprite("sprites/shop/stethoscope.png"),
  nurse: sprite("characters/11_nurse_teal.png"),
};

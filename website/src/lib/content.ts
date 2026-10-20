// Game facts shown on the site, copied from the game's src/constants. Keep in sync when the game changes.

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
  achievements: 111,
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
  { name: "Blood Test", img: sprite("sprites/shop/blood_vial.png") },
  { name: "Rapid Test", img: sprite("sprites/shop/covid_test.png") },
  { name: "Microscope", img: sprite("sprites/shop/microscope.png") },
  { name: "DNA Lab", img: sprite("sprites/shop/dna.png") },
];

export const BOOSTS = [
  { name: "Emergency Funding", cost: 1, description: "Instantly heal 20 seconds' worth of patients." },
  { name: "Adrenaline Shot", cost: 2, description: "2x patients per tap for 3 minutes." },
  { name: "Patient Rush", cost: 2, description: "Instantly heal 100 taps' worth of patients." },
  { name: "Double Shift", cost: 3, description: "2x patients per second for 5 minutes." },
  { name: "Code Blue", cost: 3, description: "5x patients per tap for 60 seconds." },
  { name: "Lucky Stethoscope", cost: 4, description: "Your next 50 taps heal 10x." },
  { name: "Clearance Sale", cost: 4, description: "Shop prices 25% off for 3 minutes." },
  { name: "Research Grant", cost: 5, description: "Instantly heal 5 minutes' worth of patients." },
  { name: "Flu Season Surge", cost: 6, description: "7x patients per second for 77 seconds." },
  { name: "Triple Espresso", cost: 8, description: "3x per tap and per second for 2 minutes." },
  { name: "Night Shift Crew", cost: 8, description: "1.5x patients per second for 30 minutes." },
  { name: "Charity Gala", cost: 12, description: "Instantly heal 1 hour's worth of patients." },
  { name: "Time Warp", cost: 25, description: "Instantly heal 4 hours' worth of patients." },
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

/** The sky follows the clock, as in the game: `tint` darkens or warms the buildings, `clouds` is cloud opacity. */
export type DayPhase = "sunrise" | "day" | "sunset" | "night";
export const SKIES: Record<DayPhase, { label: string; img: string; tint: string | null; clouds: number; fill: string }> = {
  sunrise: { label: "Sunrise", img: sprite("scenes/hospital_sky_sunrise.png"), tint: "rgba(255,170,150,0.12)", clouds: 0.9, fill: "#7f9fd8" },
  day: { label: "Day", img: sprite("scenes/hospital_sky.png"), tint: null, clouds: 1, fill: "#8fcff5" },
  sunset: { label: "Sunset", img: sprite("scenes/hospital_sky_sunset.png"), tint: "rgba(255,120,60,0.16)", clouds: 0.8, fill: "#4a4f9a" },
  night: { label: "Night", img: sprite("scenes/hospital_sky_night.png"), tint: "rgba(10,16,48,0.42)", clouds: 0.25, fill: "#0b1030" },
};
/** Sunrise 5-7, day 7-17, sunset 17-19, night 19-5. */
export const dayPhase = (hour: number): DayPhase =>
  hour >= 5 && hour < 7 ? "sunrise" : hour >= 7 && hour < 17 ? "day" : hour >= 17 && hour < 19 ? "sunset" : "night";

// The street in front of the hospital, on the scene's 320x180 art-pixel grid (src/constants/hospital.ts).
export const STREET = {
  clouds: [
    { img: sprite("street/cloud_big.png"), w: 60, y: 8, seconds: 140, start: 0.1 },
    { img: sprite("street/cloud_mid.png"), w: 46, y: 28, seconds: 110, start: 0.7 },
    { img: sprite("street/cloud_small.png"), w: 35, y: 44, seconds: 90, start: 0.4 },
  ],
  cars: ["hatch_red", "sedan_blue", "taxi", "van_green", "pickup_orange", "mini_pink", "sedan_white", "hatch_teal"].map((c) => sprite(`street/cars/${c}.png`)),
  ambulance: sprite("street/ambulance.png"),
  visitors: ["woman", "man", "kid", "elder"].map((v) => [sprite(`street/visitor_${v}_1.png`), sprite(`street/visitor_${v}_2.png`)] as const),
  /** Two lanes: the far one drives left, the near one right. `y` is where the wheels touch. */
  lanes: [
    { y: 158, dir: -1 },
    { y: 165, dir: 1 },
  ],
  doorX: 160,
  visitorFeetY: 151,
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

export const MINIGAMES = ["Injection timing", "CPR rhythm", "Bandage-wrap tap race"];

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

export const TRACKS = [
  { title: "Waiting Room", src: sprite("audio/waiting_room.mp3") },
  { title: "Morning Rounds", src: sprite("audio/morning_rounds.mp3") },
  { title: "Night Shift", src: sprite("audio/night_shift.mp3") },
  { title: "Visiting Hours", note: "a waltz", src: sprite("audio/visiting_hours.mp3") },
  { title: "Recovery Room", src: sprite("audio/recovery_room.mp3") },
];

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

// Copies the art, fonts and soundtrack this site uses from the game's repo.
// Run from website/ while it sits inside the game's folder: `bun run sync-assets`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const game = join(import.meta.dir, "..", "..", "src");
const out = join(import.meta.dir, "..", "src", "assets");

if (!existsSync(game)) {
  console.error(`Game sources not found at ${game}. Run this from website/ inside the game folder.`);
  process.exit(1);
}

const files: Record<string, string> = {
  "fonts/silkscreen.ttf": "fonts/slkscr.ttf",
  "fonts/nunito-regular.ttf": "fonts/nunito-regular.ttf",
  "fonts/nunito-bold.ttf": "fonts/nunito-bold.ttf",
  "sprites/medkit.png": "imgs/medkit.png",
  "sprites/hospital.png": "imgs/hospital.png",
  "sprites/heart.png": "imgs/misc/heart.png",
  "sprites/coin.png": "imgs/misc/coin.png",
  "sprites/natal_gem.png": "imgs/misc/natal_gem.png",
  "sprites/trophy_gold.png": "imgs/achievements/trophy_gold.png",
  "sprites/headphones.png": "imgs/achievements/headphones.png",
  "sprites/medal.png": "imgs/achievements/medal.png",
  "audio/waiting_room.mp3": "audio/soundtrack/waiting_room.mp3",
  "audio/morning_rounds.mp3": "audio/soundtrack/morning_rounds.mp3",
  "audio/night_shift.mp3": "audio/soundtrack/night_shift.mp3",
  "audio/visiting_hours.mp3": "audio/soundtrack/visiting_hours.mp3",
  "audio/recovery_room.mp3": "audio/soundtrack/recovery_room.mp3",
};

const shop = ["bandage_roll", "gloves", "facemask", "thermometer", "stethoscope", "bp_tester", "syringe", "medicines", "iv_bag", "blood_vial", "covid_test", "microscope", "dna"];
for (const s of shop) files[`sprites/shop/${s}.png`] = `imgs/shop/${s}.png`;
for (let i = 0; i < 11; i++) files[`scenes/hospital_${i}.png`] = `imgs/scenes/hospital_${i}.png`;
for (const sky of ["", "_sunrise", "_sunset", "_night"]) files[`scenes/hospital_sky${sky}.png`] = `imgs/scenes/hospital_sky${sky}.png`;
// The street in front of the hospital: clouds, traffic and visitors.
for (const c of ["cloud_big", "cloud_mid", "cloud_small", "ambulance"]) files[`street/${c}.png`] = `imgs/hospital/${c}.png`;
for (const c of ["hatch_red", "sedan_blue", "taxi", "van_green", "pickup_orange", "mini_pink", "sedan_white", "hatch_teal"]) {
  files[`street/cars/${c}.png`] = `imgs/hospital/cars/${c}.png`;
}
for (const v of ["woman", "man", "kid", "elder"]) for (const n of [1, 2]) files[`street/visitor_${v}_${n}.png`] = `imgs/hospital/visitor_${v}_${n}.png`;
for (const n of ["11_nurse_teal", "12_nurse_pink", "13_nurse_navy", "14_nurse_lavender", "15_male_nurse", "16_doctor"]) {
  for (const f of ["", "_walk1", "_walk2"]) files[`characters/${n}${f}.png`] = `imgs/characters/${n}${f}.png`;
}
for (const r of ["hospital_bed", "iv_stand", "wheelchair", "potted_plant", "aed", "crash_cart", "vending_machine", "xray_viewer", "waiting_bench", "first_aid_cabinet", "sanitizer", "notice_board", "privacy_screen", "security_camera"]) {
  files[`room/${r}.png`] = `imgs/room/${r}.png`;
}
// Room items that animate in the game, frame by frame.
for (const r of ["aquarium", "lava_lamp", "patient_monitor"]) for (let k = 1; k <= 4; k++) files[`room/${r}_${k}.png`] = `imgs/room/${r}_${k}.png`;

for (const [to, from] of Object.entries(files)) {
  const dest = join(out, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(game, from), dest);
}
console.log(`Copied ${Object.keys(files).length} files into src/assets.`);

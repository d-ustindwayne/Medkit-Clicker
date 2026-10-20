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
for (let i = 0; i < 10; i++) files[`scenes/hospital_${i}.png`] = `imgs/scenes/hospital_${i}.png`;
files["scenes/hospital_sky.png"] = "imgs/scenes/hospital_sky.png";
for (const n of ["11_nurse_teal", "12_nurse_pink", "13_nurse_navy", "14_nurse_lavender", "15_male_nurse", "16_doctor"]) {
  for (const f of ["", "_walk1", "_walk2"]) files[`characters/${n}${f}.png`] = `imgs/characters/${n}${f}.png`;
}
for (const r of ["hospital_bed", "iv_stand", "wheelchair", "potted_plant", "patient_monitor_1", "aed", "crash_cart", "vending_machine", "xray_viewer", "aquarium_1", "lava_lamp_1", "waiting_bench"]) {
  files[`room/${r}.png`] = `imgs/room/${r}.png`;
}

for (const [to, from] of Object.entries(files)) {
  const dest = join(out, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(game, from), dest);
}
console.log(`Copied ${Object.keys(files).length} files into src/assets.`);

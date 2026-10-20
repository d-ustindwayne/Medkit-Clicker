// Sound effects, composed as tiny BeepBox songs and rendered with BeepBox's synth (like the
// soundtrack). Writes src/audio/sfx/beepbox/<name>.json (open in beepbox.co: File > Import JSON)
// and src/audio/sfx/<file>.mp3, trimmed to length with a short fade so they don't click.
// Requires ffmpeg. Usage: bun run sfx:compose
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { Config, Song, Synth } from "beepbox";

const OUT = "src/audio/sfx";
mkdirSync(`${OUT}/beepbox`, { recursive: true });
const TPB = 8; // ticks per beat
const BPM = 150; // one tick = 50 ms

type Note = { pitches: number[]; start: number; len: number; vol?: number; bend?: number };
const lp = (hz: number) => ({ type: "low-pass", cutoffHz: hz, linearGain: 1 });

function sfx(name: string, file: string, seconds: number, instrument: object, notes: Note[]) {
  const json = {
    format: "BeepBox", version: 9, scale: "expert", key: "C", introBars: 0, loopBars: 1, beatsPerBar: 4, ticksPerBeat: TPB, beatsPerMinute: BPM,
    layeredInstruments: false, patternInstruments: false,
    channels: [
      {
        type: "pitch", instruments: [instrument], octaveScrollBar: 4, sequence: [1],
        patterns: [{ notes: notes.map((n) => ({ pitches: n.pitches, points: [{ tick: n.start, pitchBend: 0, volume: n.vol ?? 100 }, { tick: n.start + n.len, pitchBend: n.bend ?? 0, volume: 0 }] })) }],
      },
    ],
  };
  const song = new Song();
  song.fromJsonObject(json);
  writeFileSync(`${OUT}/beepbox/${name}.json`, JSON.stringify(song.toJsonObject(), null, 1));

  const synth = new Synth(song);
  synth.loopRepeatCount = 0;
  const n = Math.round(synth.samplesPerSecond * seconds);
  const L = new Float32Array(n), R = new Float32Array(n);
  synth.synthesize(L, R, n);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gain = 0.7 / Math.max(peak, 1e-6); // about -3 dBFS, a touch quieter than the music's peaks
  const fade = Math.round(synth.samplesPerSecond * 0.03);
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(synth.samplesPerSecond, 24); buf.writeUInt32LE(synth.samplesPerSecond * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const env = i > n - fade ? (n - i) / fade : 1;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain * env)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain * env)) * 32767), 46 + i * 4);
  }
  const wav = `${OUT}/${file}.wav`;
  writeFileSync(wav, buf);
  Bun.spawnSync(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "2", `${OUT}/${file}.mp3`]);
  rmSync(wav);
  console.log(`${name}: ${seconds}s`);
}

const P = (midi: number) => midi - 12; // BeepBox pitch from MIDI

// Medkit tap: a soft, round "boop" that rises a little. Pleasant even after a thousand taps.
sfx("medkit_tap", "click_medkit", 0.18, {
  type: "chip", volume: 60, eqFilter: [lp(3000)], effects: ["reverb"], reverb: 15, fadeInSeconds: 0, fadeOutTicks: 3, wave: "rounded", unison: "none",
  envelopes: [{ target: "noteVolume", envelope: "decay 1" }],
}, [{ pitches: [P(76)], start: 0, len: 3, bend: 4 }]);

// Valid buy: a bright little bell arpeggio going up.
sfx("buy_valid", "buy_valid", 0.55, {
  type: "FM", volume: 60, eqFilter: [lp(5000)], effects: ["reverb"], reverb: 30, fadeInSeconds: 0, fadeOutTicks: 12,
  algorithm: Config.algorithms[0].name, feedbackType: "1⟲", feedbackAmplitude: 0,
  operators: [{ frequency: "1×", amplitude: 15 }, { frequency: "4×", amplitude: 5 }, { frequency: "1×", amplitude: 0 }, { frequency: "1×", amplitude: 0 }],
  envelopes: [{ target: "noteVolume", envelope: "decay 2" }, { target: "operatorAmplitude", envelope: "decay 1", index: 1 }],
}, [
  { pitches: [P(72)], start: 0, len: 2 },
  { pitches: [P(76)], start: 1, len: 2 },
  { pitches: [P(79)], start: 2, len: 2 },
  { pitches: [P(84)], start: 3, len: 6 },
]);

// Invalid buy: a soft, low two-note "bonk" going down. Says "not yet" without being harsh.
sfx("buy_invalid", "buy_invalid", 0.32, {
  type: "chip", volume: 60, eqFilter: [lp(1400)], effects: [], fadeInSeconds: 0, fadeOutTicks: 3, wave: "triangle", unison: "none",
  envelopes: [{ target: "noteVolume", envelope: "decay 1" }],
}, [
  { pitches: [P(55)], start: 0, len: 2 },
  { pitches: [P(50)], start: 2, len: 3, bend: -1 },
]);

// UI click: a tiny, quick pop.
sfx("ui_click", "click", 0.09, {
  type: "chip", volume: 40, eqFilter: [lp(4000)], effects: [], fadeInSeconds: 0, fadeOutTicks: 1, wave: "rounded", unison: "none",
  envelopes: [{ target: "noteVolume", envelope: "decay 1" }],
}, [{ pitches: [P(84)], start: 0, len: 1, bend: -5 }]);

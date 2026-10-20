// The game's soundtrack: three loopable 2-minute lo-fi tracks, composed here as BeepBox songs.
// Writes src/audio/soundtrack/beepbox/<track>.json (open in beepbox.co: File > Import JSON) and
// renders each with BeepBox's own synth to src/audio/soundtrack/<track>.mp3.
// The render keeps the second pass of the loop, so reverb tails wrap around and the MP3 loops
// without a seam. Requires ffmpeg. Usage: bun run music:compose
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { Config, Song, Synth } from "beepbox";

const OUT = "src/audio/soundtrack";
mkdirSync(`${OUT}/beepbox`, { recursive: true });

// ---------- notation ----------
const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "Bb3" -> BeepBox pitch (MIDI - 12; 48 is middle C). */
const p = (n: string) => {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(n);
  if (!m) throw new Error("bad note " + n);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0) - 12;
};
const chord = (s: string) => s.split(" ").map(p);

const TPB = 6; // ticks per beat (÷6, so swung 8ths sit on ticks 0 and 4)
const BAR = 4 * TPB;
type Note = { pitches: number[]; start: number; len: number; vol?: number; bend?: number };
type Bar = Note[];

/** Melody shorthand: "A4 0 6, Bb4 6 4" = pitch, start tick, length; "-" lines are rests. */
const mel = (s: string): Bar =>
  s.trim() === "-" ? [] : s.split(",").map((t) => { const [n, a, b, v] = t.trim().split(/\s+/); return { pitches: [p(n)], start: +a, len: +b, vol: v ? +v : 100 }; });

// Seeded random so renders are repeatable.
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- parts ----------
type Section = {
  chords: { v: number[]; root: number }[]; // one per bar (repeats if shorter than bars)
  bars: number;
  keys: "pad" | "comp" | "sparse";
  bass: boolean;
  drums: "none" | "hats" | "light" | "full";
  melody?: string[]; // one per bar
};

function keysBar(c: number[], style: Section["keys"], i: number): Bar {
  if (style === "pad") return [{ pitches: c, start: 0, len: BAR, vol: 67 }];
  if (style === "sparse") return [{ pitches: c, start: 0, len: 16, vol: 67 }];
  // Lo-fi comp: on the one, then a swung push before beat 3; every 4th bar lingers.
  return i % 4 === 3 ? [{ pitches: c, start: 0, len: 22, vol: 100 }] : [{ pitches: c, start: 0, len: 10, vol: 100 }, { pitches: c, start: 16, len: 8, vol: 67 }];
}
function bassBar(root: number, next: number, i: number): Bar {
  const fifth = root + 7;
  const approach = next + (next > root ? -1 : 1);
  const n: Bar = [{ pitches: [root], start: 0, len: 9, vol: 100 }, { pitches: [root], start: 10, len: 4, vol: 67 }, { pitches: [fifth], start: 16, len: 5, vol: 67 }];
  if (i % 2 === 1) n.push({ pitches: [approach], start: 22, len: 2, vol: 67 });
  return n;
}
function kickBar(style: Section["drums"], i: number): Bar {
  if (style === "none" || style === "hats") return [];
  const k = (start: number): Note => ({ pitches: [p("E2")], start, len: 3, vol: 100, bend: -14 });
  if (style === "light") return [k(0)];
  return i % 4 === 3 ? [k(0), k(10), k(22)] : [k(0), k(10)];
}
function snareBar(style: Section["drums"]): Bar {
  if (style === "full") return [{ pitches: [6], start: 6, len: 4, vol: 100 }, { pitches: [6], start: 18, len: 4, vol: 100 }];
  if (style === "light") return [{ pitches: [4], start: 18, len: 3, vol: 67 }]; // soft rim on 4
  return [];
}
function hatBar(style: Section["drums"]): Bar {
  if (style === "none") return [];
  const n: Bar = [];
  for (let b = 0; b < 4; b++) {
    n.push({ pitches: [11], start: b * TPB, len: 1, vol: 67 });
    n.push({ pitches: [11], start: b * TPB + 4, len: 1, vol: 33 }); // swung, softer offbeat
  }
  return n;
}
function vinylBar(): Bar {
  // Quiet hiss under everything, plus a few random crackles.
  const n: Bar = [];
  const ticks = new Set<number>();
  while (ticks.size < 3) ticks.add(1 + Math.floor(rand() * (BAR - 2)));
  let at = 0;
  for (const t of [...ticks].sort((a, b) => a - b)) {
    if (t > at) n.push({ pitches: [3], start: at, len: t - at, vol: 33 });
    n.push({ pitches: [11], start: t, len: 1, vol: 33 });
    at = t + 1;
  }
  if (at < BAR) n.push({ pitches: [3], start: at, len: BAR - at, vol: 33 });
  return n;
}

// ---------- instruments ----------
const lp = (hz: number, gain = 1) => ({ type: "low-pass", cutoffHz: hz, linearGain: gain });
const hp = (hz: number) => ({ type: "high-pass", cutoffHz: hz, linearGain: 1 });
const INST = {
  epiano: (vol: number) => ({
    type: "FM", volume: vol, eqFilter: [lp(2400)], effects: ["chord type", "chorus", "reverb"], chord: "strum", chorus: 40, reverb: 45,
    fadeInSeconds: 0, fadeOutTicks: 24, algorithm: Config.algorithms[5].name, feedbackType: "1⟲", feedbackAmplitude: 0,
    operators: [{ frequency: "1×", amplitude: 15 }, { frequency: "1×", amplitude: 10 }, { frequency: "1×", amplitude: 5 }, { frequency: "~2×", amplitude: 3 }],
    envelopes: [{ target: "noteVolume", envelope: "decay 3" }, { target: "operatorAmplitude", envelope: "twang 2", index: 2 }],
  }),
  softKeys: (vol: number) => ({
    type: "harmonics", volume: vol, eqFilter: [lp(1800)], effects: ["chord type", "chorus", "reverb"], chord: "strum", chorus: 50, reverb: 55,
    fadeInSeconds: 0.01, fadeOutTicks: 48, unison: "none",
    harmonics: [100, 43, 29, 14, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    envelopes: [{ target: "noteVolume", envelope: "decay 3" }],
  }),
  flute: (vol: number) => ({
    type: "chip", volume: vol, eqFilter: [lp(2200)], effects: ["vibrato", "echo", "reverb"], vibrato: "delayed", echoSustain: 30, echoDelayBeats: 1, reverb: 50,
    fadeInSeconds: 0.03, fadeOutTicks: 12, wave: "triangle", unison: "none", envelopes: [],
  }),
  bell: (vol: number) => ({
    type: "FM", volume: vol, eqFilter: [lp(3500)], effects: ["echo", "reverb"], echoSustain: 40, echoDelayBeats: 0.667, reverb: 60,
    fadeInSeconds: 0, fadeOutTicks: 48, algorithm: Config.algorithms[0].name, feedbackType: "1⟲", feedbackAmplitude: 0,
    operators: [{ frequency: "1×", amplitude: 15 }, { frequency: "4×", amplitude: 4 }, { frequency: "1×", amplitude: 0 }, { frequency: "1×", amplitude: 0 }],
    envelopes: [{ target: "noteVolume", envelope: "decay 2" }, { target: "operatorAmplitude", envelope: "decay 1", index: 1 }],
  }),
  guitar: (vol: number) => ({
    type: "Picked String", volume: vol, eqFilter: [lp(2600)], effects: ["echo", "reverb"], echoSustain: 25, echoDelayBeats: 1, reverb: 45,
    fadeInSeconds: 0, fadeOutTicks: 24, unison: "none", stringSustain: 55,
    harmonics: [100, 71, 43, 29, 14, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    envelopes: [],
  }),
  bass: (vol: number) => ({
    type: "chip", volume: vol, eqFilter: [lp(500)], effects: [], fadeInSeconds: 0, fadeOutTicks: 12, wave: "rounded", unison: "none", envelopes: [],
  }),
  kick: (vol: number) => ({
    type: "chip", volume: vol, eqFilter: [lp(300)], effects: ["transition type"], transition: "normal", fadeInSeconds: 0, fadeOutTicks: 6, wave: "rounded", unison: "none",
    envelopes: [{ target: "noteVolume", envelope: "decay 1" }],
  }),
  snare: (vol: number) => ({ type: "noise", volume: vol, eqFilter: [lp(3000), hp(200)], effects: ["reverb"], reverb: 35, fadeInSeconds: 0, fadeOutTicks: 6, wave: "white", envelopes: [{ target: "noteVolume", envelope: "decay 2" }] }),
  hat: (vol: number) => ({ type: "noise", volume: vol, eqFilter: [hp(6000), lp(9000)], effects: [], fadeInSeconds: 0, fadeOutTicks: 3, wave: "white", envelopes: [{ target: "noteVolume", envelope: "decay 1" }] }),
  vinyl: (vol: number) => ({ type: "noise", volume: vol, eqFilter: [lp(4000), hp(800)], effects: [], fadeInSeconds: 0, fadeOutTicks: 0, wave: "retro", envelopes: [] }),
};

// ---------- song builder ----------
type Track = { file: string; title: string; bpm: number; key: string; sections: Section[]; keys: object; lead: object; seed: number };

function build(t: Track) {
  seed = t.seed;
  const ch = { keys: [] as Bar[], lead: [] as Bar[], bass: [] as Bar[], kick: [] as Bar[], snare: [] as Bar[], hat: [] as Bar[], vinyl: [] as Bar[] };
  // Flatten all bars first so the bass can approach the next bar's root (wrapping to the start).
  const flat: { s: Section; i: number; c: { v: number[]; root: number } }[] = [];
  for (const s of t.sections) for (let i = 0; i < s.bars; i++) flat.push({ s, i, c: s.chords[i % s.chords.length] });
  flat.forEach(({ s, i, c }, k) => {
    const next = flat[(k + 1) % flat.length].c.root;
    ch.keys.push(keysBar(c.v, s.keys, i));
    ch.lead.push(s.melody ? mel(s.melody[i % s.melody.length]) : []);
    ch.bass.push(s.bass ? bassBar(c.root, next, i) : []);
    ch.kick.push(kickBar(s.drums, i));
    ch.snare.push(snareBar(s.drums));
    ch.hat.push(hatBar(s.drums));
    ch.vinyl.push(vinylBar());
  });
  const channel = (type: "pitch" | "drum", inst: object, bars: Bar[], octave = 3) => {
    const patterns: string[] = [];
    const sequence = bars.map((b) => {
      if (b.length === 0) return 0;
      const json = JSON.stringify({
        notes: b.map((n) => ({
          pitches: n.pitches,
          points: [
            { tick: n.start, pitchBend: 0, volume: n.vol ?? 100 },
            { tick: n.start + n.len, pitchBend: n.bend ?? 0, volume: n.bend ? 0 : (n.vol ?? 100) },
          ],
        })),
      });
      let idx = patterns.indexOf(json);
      if (idx < 0) idx = patterns.push(json) - 1;
      return idx + 1;
    });
    return { type, instruments: [inst], patterns: patterns.map((s) => JSON.parse(s)), sequence, ...(type === "pitch" ? { octaveScrollBar: octave } : {}) };
  };
  const json = {
    format: "BeepBox", version: 9, scale: "expert", key: t.key, introBars: 0, loopBars: flat.length, beatsPerBar: 4, ticksPerBeat: TPB,
    beatsPerMinute: t.bpm, layeredInstruments: false, patternInstruments: false,
    channels: [
      channel("pitch", t.keys, ch.keys, 3),
      channel("pitch", t.lead, ch.lead, 4),
      channel("pitch", INST.bass(20), ch.bass, 1),
      channel("pitch", INST.kick(60), ch.kick, 1),
      channel("drum", INST.snare(20), ch.snare),
      channel("drum", INST.hat(0), ch.hat),
      channel("drum", INST.vinyl(-20), ch.vinyl),
    ],
  };
  // Round-trip through BeepBox so the saved file is exactly what BeepBox itself writes.
  const song = new Song();
  song.fromJsonObject(json);
  const saved = song.toJsonObject();
  writeFileSync(`${OUT}/beepbox/${t.file}.json`, JSON.stringify(saved, null, 1));

  // Render two passes and keep the second: its start already carries the first pass's reverb tail,
  // so the file loops without a seam.
  const synth = new Synth(song);
  synth.loopRepeatCount = -1;
  const loop = Math.round(synth.getSamplesPerBar() * flat.length);
  const L = new Float32Array(loop * 2), R = new Float32Array(loop * 2);
  synth.synthesize(L, R, loop * 2);
  const l = L.subarray(loop), r = R.subarray(loop);
  let peak = 0, sum = 0;
  for (let i = 0; i < loop; i++) { peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i])); sum += l[i] * l[i] + r[i] * r[i]; }
  const rms = Math.sqrt(sum / (2 * loop));
  const gain = 0.89 / peak; // normalise to about -1 dBFS
  const buf = Buffer.alloc(44 + loop * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + loop * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(synth.samplesPerSecond, 24); buf.writeUInt32LE(synth.samplesPerSecond * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(loop * 4, 40);
  for (let i = 0; i < loop; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(l[i] * gain * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(r[i] * gain * 32767))), 46 + i * 4);
  }
  const wav = `${OUT}/${t.file}.wav`;
  writeFileSync(wav, buf);
  Bun.spawnSync(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "2", `${OUT}/${t.file}.mp3`]);
  rmSync(wav);
  console.log(`${t.title}: ${flat.length} bars, ${(loop / synth.samplesPerSecond).toFixed(1)} s, peak ${peak.toFixed(3)}, rms ${(20 * Math.log10(rms * gain)).toFixed(1)} dBFS after normalising`);
}

// ---------- 1. Waiting Room (F major, 80 bpm) ----------
{
  const A = [
    { v: chord("Bb3 D4 F4 A4"), root: p("G2") }, // Gm9
    { v: chord("Bb3 D4 E4 A4"), root: p("C2") }, // C13
    { v: chord("A3 C4 E4 G4"), root: p("F2") }, // Fmaj9
    { v: chord("C4 E4 F4 A4"), root: p("D2") }, // Dm9
  ];
  const B = [
    { v: chord("Bb3 D4 F4 A4"), root: p("Bb1") }, // Bbmaj7
    { v: chord("G3 C4 E4 A4"), root: p("A1") }, // Am7
    { v: chord("F3 Bb3 D4 A4"), root: p("G1") }, // Gm9
    { v: chord("Bb3 C4 F4 G4"), root: p("C2") }, // C7sus4
  ];
  const m1 = [
    "A4 0 6, Bb4 6 4, D5 10 8, C5 18 6",
    "A4 0 12, G4 16 8 67",
    "A4 0 4, G4 4 2 67, F4 6 6, E4 12 4 67, F4 16 8",
    "A4 0 18 67",
    "D5 0 6, C5 6 4, A4 10 8, F4 18 6 67",
    "G4 0 10, E4 10 6 67, D4 16 8 67",
    "F4 0 4, A4 4 2 67, C5 6 10, E5 16 8",
    "D5 0 18, C5 18 6 67",
  ];
  const m2 = [
    "F5 0 8, D5 8 4 67, A4 12 12",
    "C5 0 6, E5 6 10, D5 16 8 67",
    "Bb4 0 8, A4 8 4 67, G4 12 12",
    "E4 0 6 67, G4 6 6, Bb4 12 6, C5 18 6",
    "F5 0 4, G5 4 4 67, F5 8 4, D5 12 12",
    "E5 0 12, C5 12 12 67",
    "D5 0 6, Bb4 6 6 67, G4 12 12",
    "C5 0 20 67",
  ];
  build({
    file: "waiting_room", title: "Waiting Room", bpm: 80, key: "C", seed: 7,
    keys: INST.epiano(80), lead: INST.flute(60),
    sections: [
      { chords: A, bars: 4, keys: "pad", bass: false, drums: "none" },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full" },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full", melody: m1 },
      { chords: B, bars: 8, keys: "comp", bass: true, drums: "light", melody: m2 },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full", melody: m1 },
      { chords: A, bars: 4, keys: "sparse", bass: true, drums: "hats" },
    ],
  });
}

// ---------- 2. Night Shift (D minor, 72 bpm) ----------
{
  const A = [
    { v: chord("C4 E4 F4 A4"), root: p("D2") }, // Dm9
    { v: chord("A3 D4 F4 A4"), root: p("Bb1") }, // Bbmaj7
    { v: chord("Bb3 D4 F4 A4"), root: p("G1") }, // Gm9
    { v: chord("G3 C#4 E4 G4"), root: p("A1") }, // A7
  ];
  const B = [
    { v: chord("A3 C4 E4 G4"), root: p("F2") }, // Fmaj9
    { v: chord("G3 B3 E4 G4"), root: p("E2") }, // Cmaj7/E
    { v: chord("A3 D4 F4 A4"), root: p("Bb1") }, // Bbmaj7
    { v: chord("G3 D4 E4 A4"), root: p("A1") }, // A7sus
  ];
  const m1 = [
    "A4 0 10, F4 10 2 67, E4 12 4 67, D4 16 8",
    "F4 0 6 67, A4 6 6, D5 12 12",
    "C5 0 6, Bb4 6 4 67, A4 10 8, G4 18 6 67",
    "A4 0 6, E4 6 6 67, C#5 12 12",
    "D5 0 10, C5 10 2 67, A4 12 12",
    "F4 0 4 67, G4 4 2 67, A4 6 10, D5 16 8",
    "Bb4 0 10, A4 10 6 67, G4 16 8",
    "E4 0 6 67, G4 6 6 67, A4 12 12",
  ];
  const m2 = [
    "C5 0 12, E5 12 12",
    "B4 0 12, G4 12 12 67",
    "A4 0 6, D5 6 10, C5 16 8 67",
    "A4 0 20 67",
  ];
  build({
    file: "night_shift", title: "Night Shift", bpm: 72, key: "C", seed: 3,
    keys: INST.softKeys(60), lead: INST.flute(60),
    sections: [
      { chords: A, bars: 4, keys: "pad", bass: false, drums: "none" },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full" },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full", melody: m1 },
      { chords: B, bars: 8, keys: "comp", bass: true, drums: "light", melody: m2 },
      { chords: A, bars: 4, keys: "comp", bass: true, drums: "hats" },
      { chords: A, bars: 4, keys: "pad", bass: false, drums: "none" },
    ],
  });
}

// ---------- 3. Recovery Room (Eb major, 76 bpm) ----------
{
  const A = [
    { v: chord("G3 Bb3 D4 F4"), root: p("Eb2") }, // Ebmaj9
    { v: chord("G3 Bb3 Eb4 D4").sort((a, b) => a - b), root: p("C2") }, // Cm9 (no root)
    { v: chord("G3 C4 Eb4 Bb4"), root: p("Ab1") }, // Abmaj9
    { v: chord("Ab3 C4 Eb4 G4"), root: p("Bb1") }, // Bb13sus
  ];
  const B = [
    { v: chord("Ab3 C4 Eb4 G4"), root: p("F2") }, // Fm9
    { v: chord("Ab3 D4 F4 G4"), root: p("Bb1") }, // Bb13
    { v: chord("F3 Bb3 D4 F4"), root: p("G1") }, // Gm7
    { v: chord("G3 Bb3 Eb4 D4").sort((a, b) => a - b), root: p("C2") }, // Cm9
  ];
  const m1 = [
    "Bb4 0 6, G4 6 4 67, F4 10 2 67, G4 12 12",
    "-",
    "Eb5 0 6, D5 6 4 67, C5 10 8, Bb4 18 6 67",
    "C5 0 16, Bb4 16 8 67",
    "G4 0 6, Bb4 6 6, Eb5 12 12",
    "D5 0 6 67, C5 6 6, G4 12 12 67",
    "Ab4 0 4 67, Bb4 4 2 67, C5 6 10, Eb5 16 8",
    "D5 0 20 67",
  ];
  const m2 = [
    "C5 0 6, Eb5 6 6, G5 12 12",
    "F5 0 12, D5 12 12 67",
    "Bb4 0 6, D5 6 6 67, F5 12 12",
    "Eb5 0 6, D5 6 4 67, C5 10 14",
  ];
  build({
    file: "recovery_room", title: "Recovery Room", bpm: 76, key: "C", seed: 11,
    keys: INST.epiano(80), lead: INST.guitar(80),
    sections: [
      { chords: A, bars: 4, keys: "pad", bass: false, drums: "none" },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full" },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full", melody: m1 },
      { chords: B, bars: 8, keys: "comp", bass: true, drums: "light", melody: m2 },
      { chords: A, bars: 8, keys: "comp", bass: true, drums: "full", melody: m1 },
      { chords: A, bars: 2, keys: "pad", bass: false, drums: "none" },
    ],
  });
}

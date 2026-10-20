// The game's soundtrack: five loopable 2-minute lo-fi tracks, composed here as BeepBox songs.
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
let BEATS = 4; // beats per bar, set per track (3 for a waltz)
const bar = () => BEATS * TPB;
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
  keys: "pad" | "comp" | "sparse" | "comp2" | "arp" | "waltz";
  bass: boolean | "walk" | "waltz";
  drums: "none" | "hats" | "light" | "full" | "brush" | "waltz";
  melody?: string[]; // one per bar
  /** A small snare fill in the section's last bar, leading into the next one. */
  fill?: boolean;
};

function keysBar(c: number[], style: Section["keys"], i: number): Bar {
  if (style === "pad") return [{ pitches: c, start: 0, len: bar(), vol: 67 }];
  if (style === "arp") {
    // Broken chord in swung 8ths, rising one bar and falling the next.
    const order = i % 2 ? [3, 2, 1, 2, 0, 1, 2, 3] : [0, 1, 2, 3, 2, 1, 2, 1];
    const n: Bar = [];
    for (let b = 0; b < BEATS; b++) {
      n.push({ pitches: [c[order[(2 * b) % 8] % c.length]], start: b * TPB, len: 4, vol: 100 });
      n.push({ pitches: [c[order[(2 * b + 1) % 8] % c.length]], start: b * TPB + 4, len: 2, vol: 67 });
    }
    return n;
  }
  if (style === "comp2") {
    // Four comping rhythms in turn, so no two bars in a row hit the same way.
    const rhythms: [number, number, number][][] = [
      [[0, 6, 100], [10, 6, 67], [18, 6, 67]],
      [[0, 4, 100], [6, 10, 67], [16, 8, 100]],
      [[0, 12, 100], [16, 4, 67], [22, 2, 67]],
      [[0, 22, 67]],
    ];
    return rhythms[i % 4].map(([start, len, vol]) => ({ pitches: c, start, len, vol }));
  }
  if (style === "waltz") return i % 4 === 3 ? [{ pitches: c, start: 0, len: 18, vol: 67 }] : [{ pitches: c, start: 6, len: 5, vol: 67 }, { pitches: c, start: 12, len: 5, vol: 67 }];
  if (style === "sparse") return [{ pitches: c, start: 0, len: 16, vol: 67 }];
  // Lo-fi comp: on the one, then a swung push before beat 3; every 4th bar lingers.
  return i % 4 === 3 ? [{ pitches: c, start: 0, len: 22, vol: 100 }] : [{ pitches: c, start: 0, len: 10, vol: 100 }, { pitches: c, start: 16, len: 8, vol: 67 }];
}
function bassBar(root: number, next: number, i: number, style: Section["bass"] = true, c: number[] = []): Bar {
  const fifth = root + 7;
  if (style === "waltz") return i % 2 ? [{ pitches: [root], start: 0, len: 6, vol: 100 }, { pitches: [fifth], start: 12, len: 5, vol: 67 }] : [{ pitches: [root], start: 0, len: 16, vol: 100 }];
  if (style === "walk") {
    // Quarter notes: root, the chord's third, fifth, then a step into the next root.
    const third = c.some((x) => (x - root + 1200) % 12 === 3) ? root + 3 : root + 4;
    const step = next + (next > root ? -1 : 1);
    return [root, third, fifth, step].map((pitch, b) => ({ pitches: [pitch], start: b * TPB, len: 5, vol: b === 0 ? 100 : 67 }));
  }
  const approach = next + (next > root ? -1 : 1);
  const n: Bar = [{ pitches: [root], start: 0, len: 9, vol: 100 }, { pitches: [root], start: 10, len: 4, vol: 67 }, { pitches: [fifth], start: 16, len: 5, vol: 67 }];
  if (i % 2 === 1) n.push({ pitches: [approach], start: 22, len: 2, vol: 67 });
  return n;
}
function kickBar(style: Section["drums"], i: number): Bar {
  if (style === "none" || style === "hats") return [];
  const k = (start: number): Note => ({ pitches: [p("E2")], start, len: 3, vol: 100, bend: -14 });
  if (style === "light") return [k(0)];
  if (style === "brush") return i % 4 === 0 ? [{ ...k(0), vol: 67 }] : [];
  if (style === "waltz") return i % 4 === 3 ? [k(0), k(10)] : [k(0)];
  return i % 4 === 3 ? [k(0), k(10), k(22)] : [k(0), k(10)];
}
function snareBar(style: Section["drums"], fill = false): Bar {
  if (fill && style === "waltz") return [{ pitches: [6], start: 12, len: 2, vol: 33 }, { pitches: [6], start: 14, len: 2, vol: 67 }, { pitches: [6], start: 16, len: 2, vol: 67 }];
  if (fill && (style === "full" || style === "brush"))
    return [{ pitches: [6], start: 6, len: 4, vol: style === "full" ? 100 : 33 }, { pitches: [6], start: 15, len: 2, vol: 33 }, { pitches: [6], start: 18, len: 2, vol: 67 }, { pitches: [6], start: 20, len: 2, vol: 33 }, { pitches: [6], start: 22, len: 2, vol: 67 }];
  if (style === "brush") return [{ pitches: [4], start: 6, len: 3, vol: 33 }, { pitches: [4], start: 18, len: 3, vol: 33 }];
  if (style === "waltz") return [{ pitches: [4], start: 6, len: 3, vol: 33 }, { pitches: [4], start: 12, len: 3, vol: 33 }];
  if (style === "full") return [{ pitches: [6], start: 6, len: 4, vol: 100 }, { pitches: [6], start: 18, len: 4, vol: 100 }];
  if (style === "light") return [{ pitches: [4], start: 18, len: 3, vol: 67 }]; // soft rim on 4
  return [];
}
function hatBar(style: Section["drums"]): Bar {
  if (style === "none") return [];
  const n: Bar = [];
  for (let b = 0; b < BEATS; b++) {
    n.push({ pitches: [11], start: b * TPB, len: 1, vol: style === "brush" ? 33 : 67 });
    n.push({ pitches: [11], start: b * TPB + 4, len: 1, vol: 33 }); // swung, softer offbeat
  }
  return n;
}
function vinylBar(): Bar {
  // Quiet hiss under everything, plus a few random crackles.
  const n: Bar = [];
  const ticks = new Set<number>();
  while (ticks.size < 3) ticks.add(1 + Math.floor(rand() * (bar() - 2)));
  let at = 0;
  for (const t of [...ticks].sort((a, b) => a - b)) {
    if (t > at) n.push({ pitches: [3], start: at, len: t - at, vol: 33 });
    n.push({ pitches: [11], start: t, len: 1, vol: 33 });
    at = t + 1;
  }
  if (at < bar()) n.push({ pitches: [3], start: at, len: bar() - at, vol: 33 });
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
  // Warm reed, like a clarinet: odd harmonics only, with a gentle vibrato.
  hum: (vol: number) => ({
    type: "harmonics", volume: vol, eqFilter: [lp(2000)], effects: ["vibrato", "echo", "reverb"], vibrato: "light", echoSustain: 25, echoDelayBeats: 1, reverb: 55,
    fadeInSeconds: 0.04, fadeOutTicks: 12, unison: "none",
    harmonics: [100, 0, 43, 0, 21, 0, 10, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
type Track = { file: string; title: string; bpm: number; key: string; sections: Section[]; keys: object; lead: object; seed: number; beats?: number };

function build(t: Track) {
  seed = t.seed;
  BEATS = t.beats ?? 4;
  const ch = { keys: [] as Bar[], lead: [] as Bar[], bass: [] as Bar[], kick: [] as Bar[], snare: [] as Bar[], hat: [] as Bar[], vinyl: [] as Bar[] };
  // Flatten all bars first so the bass can approach the next bar's root (wrapping to the start).
  const flat: { s: Section; i: number; c: { v: number[]; root: number } }[] = [];
  for (const s of t.sections) for (let i = 0; i < s.bars; i++) flat.push({ s, i, c: s.chords[i % s.chords.length] });
  flat.forEach(({ s, i, c }, k) => {
    const next = flat[(k + 1) % flat.length].c.root;
    ch.keys.push(keysBar(c.v, s.keys, i));
    ch.lead.push(s.melody ? mel(s.melody[i % s.melody.length]) : []);
    ch.bass.push(s.bass ? bassBar(c.root, next, i, s.bass, c.v) : []);
    ch.kick.push(kickBar(s.drums, i));
    ch.snare.push(snareBar(s.drums, !!s.fill && i === s.bars - 1));
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
    format: "BeepBox", version: 9, scale: "expert", key: t.key, introBars: 0, loopBars: flat.length, beatsPerBar: BEATS, ticksPerBeat: TPB,
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
  // Same loudness for every track (-17.5 dBFS RMS), never louder than -1 dBFS peak.
  const gain = Math.min(0.89 / peak, 10 ** (-17.5 / 20) / rms);
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

// ---------- 4. Morning Rounds (G major, 84 bpm): guitar arpeggios, music-box bell, walking bass ----------
{
  const A = [
    { v: chord("C3 G3 B3 E4"), root: p("C2") }, // Cmaj7
    { v: chord("B2 F#3 A3 D4"), root: p("B1") }, // Bm7
    { v: chord("E3 B3 D4 G4"), root: p("E2") }, // Em7
    { v: chord("D3 G3 B3 E4"), root: p("D2") }, // Em7/D
    { v: chord("A2 E3 G3 C4"), root: p("A1") }, // Am7
    { v: chord("D3 A3 C4 G4"), root: p("D2") }, // D7sus
    { v: chord("G3 B3 D4 F#4"), root: p("G2") }, // Gmaj7
    { v: chord("G3 B3 D4 E4"), root: p("G2") }, // G6
  ];
  const B = [
    { v: chord("A3 C4 G4 B4"), root: p("A1") }, // Am9
    { v: chord("D3 C4 E4 F#4"), root: p("D2") }, // D9
    { v: chord("B2 F#3 A3 D4"), root: p("B1") }, // Bm7
    { v: chord("E3 G#3 B3 D4"), root: p("E2") }, // E7
    { v: chord("A2 E3 G3 C4"), root: p("A1") }, // Am7
    { v: chord("C3 G3 A3 Eb4"), root: p("C2") }, // Cm6, the borrowed "comfort" chord
    { v: chord("G3 B3 D4 F#4"), root: p("G2") }, // Gmaj7
    { v: chord("D3 A3 C4 G4"), root: p("D2") }, // D7sus
  ];
  const m1 = [
    "E5 0 6, D5 6 4 67, B4 10 8, G4 18 6 67",
    "A4 0 4 67, B4 4 2 67, D5 6 12, F#5 18 6",
    "G5 0 10, F#5 10 2 67, E5 12 12",
    "D5 0 6 67, B4 6 6, G4 12 6 67, A4 18 6",
    "C5 0 6, E5 6 10, D5 16 8 67",
    "C5 0 4 67, A4 4 8, G4 12 12 67",
    "F#4 0 6 67, G4 6 4, B4 10 8, D5 18 6",
    "E5 0 20 67",
  ];
  const m2 = [
    "B5 0 8 67, A5 8 4 67, G5 12 6, E5 18 6",
    "F#5 0 12, E5 12 4 67, C5 16 8",
    "D5 0 6, F#5 6 6 67, A5 12 12",
    "G#5 0 10, F#5 10 2 67, D5 12 6, B4 18 6 67",
    "C5 0 12, E5 12 6 67, G5 18 6",
    "Eb5 0 12, D5 12 6 67, C5 18 6 67",
    "B4 0 6, D5 6 6 67, F#5 12 12",
    "A5 0 8 67, G5 8 16",
  ];
  const m3 = [
    "G5 0 4 67, E5 4 6, D5 10 2 67, E5 12 6, B4 18 6 67",
    "D5 0 10, A4 10 2 67, B4 12 4 67, D5 16 8",
    "B5 0 6 67, G5 6 10, E5 16 8 67",
    "F#5 0 6, E5 6 6 67, D5 12 12",
    "E5 0 4 67, G5 4 8, A5 12 6, C6 18 6 67",
    "B5 0 12, A5 12 12 67",
    "G5 0 6 67, F#5 6 6, D5 12 6 67, B4 18 6",
    "G4 0 18 67",
  ];
  const m4 = ["E5 0 12 67", "F#5 0 12 67", "D5 0 12 67", "B4 0 18 67"];
  build({
    file: "morning_rounds", title: "Morning Rounds", bpm: 84, key: "C", seed: 21,
    keys: INST.guitar(20), lead: INST.bell(100),
    sections: [
      { chords: [A[4], A[5]], bars: 2, keys: "arp", bass: false, drums: "none" },
      { chords: A, bars: 8, keys: "arp", bass: "walk", drums: "brush", fill: true },
      { chords: A, bars: 8, keys: "arp", bass: "walk", drums: "full", melody: m1 },
      { chords: B, bars: 8, keys: "arp", bass: "walk", drums: "full", melody: m2, fill: true },
      { chords: A, bars: 8, keys: "arp", bass: "walk", drums: "full", melody: m3 },
      { chords: B.slice(0, 4), bars: 4, keys: "arp", bass: "walk", drums: "brush", melody: m4 },
      { chords: B.slice(4), bars: 4, keys: "arp", bass: false, drums: "none" },
    ],
  });
}

// ---------- 5. Visiting Hours (A minor to C major, 3/4 waltz, 66 bpm): soft keys and a warm reed ----------
{
  const A = [
    { v: chord("C4 E4 G4 B4"), root: p("A2") }, // Am9
    { v: chord("C4 E4 F4 A4"), root: p("F2") }, // Fmaj7
    { v: chord("C4 E4 G4"), root: p("C3") }, // C
    { v: chord("B3 D4 E4 G4"), root: p("G2") }, // G6
    { v: chord("C4 E4 G4 A4"), root: p("A2") }, // Am7
    { v: chord("C4 E4 F4 A4"), root: p("F2") }, // Fmaj7
    { v: chord("C4 D4 F4 A4"), root: p("D2") }, // Dm7
    { v: chord("B3 D4 E4 G#4"), root: p("E2") }, // E7
  ];
  const B = [
    { v: chord("C4 E4 F4 A4"), root: p("F2") }, // Fmaj7
    { v: chord("B3 D4 G4"), root: p("G2") }, // G
    { v: chord("B3 D4 E4 G4"), root: p("E2") }, // Em7
    { v: chord("C4 E4 G4 A4"), root: p("A2") }, // Am7
    { v: chord("C4 E4 F4 A4"), root: p("D2") }, // Dm9
    { v: chord("B3 D4 F4 G4"), root: p("G2") }, // G7
    { v: chord("B3 C4 E4 G4"), root: p("C3") }, // Cmaj7
    { v: chord("B3 D4 E4 G#4"), root: p("E2") }, // E7
  ];
  const m1 = [
    "E5 0 12, D5 12 6 67",
    "C5 0 6 67, A4 6 12",
    "G4 0 6 67, C5 6 6, E5 12 6",
    "D5 0 18 67",
    "E5 0 6, A5 6 8, G5 14 4 67",
    "F5 0 6 67, E5 6 6, C5 12 6 67",
    "D5 0 6, F5 6 6 67, A5 12 6",
    "G#5 0 18 67",
  ];
  const m2 = [
    "A5 0 12, G5 12 6 67",
    "G5 0 6 67, D5 6 12",
    "E5 0 6, G5 6 6 67, B5 12 6",
    "A5 0 18 67",
    "F5 0 6, E5 6 4 67, D5 10 8",
    "B4 0 6 67, D5 6 6, F5 12 6 67",
    "E5 0 12, G5 12 6 67",
    "D5 0 6 67, B4 6 6, G#4 12 6 67",
  ];
  const m3 = [
    "A5 0 6, G5 6 4 67, E5 10 8",
    "F5 0 12 67, C5 12 6",
    "E5 0 6 67, G5 6 12",
    "B4 0 6, D5 6 6 67, G5 12 6",
    "C6 0 12, B5 12 6 67",
    "A5 0 6, G5 6 6 67, F5 12 6",
    "E5 0 6 67, D5 6 6, C5 12 6 67",
    "B4 0 18 67",
  ];
  const m4 = ["A5 0 12 67", "G5 0 12 67", "E5 0 12 67", "C5 0 18 67"];
  build({
    file: "visiting_hours", title: "Visiting Hours", bpm: 66, key: "C", seed: 5, beats: 3,
    keys: INST.softKeys(80), lead: INST.hum(40),
    sections: [
      { chords: A.slice(0, 4), bars: 4, keys: "pad", bass: false, drums: "none" },
      { chords: A, bars: 8, keys: "waltz", bass: "waltz", drums: "hats" },
      { chords: A, bars: 8, keys: "waltz", bass: "waltz", drums: "waltz", melody: m1 },
      { chords: B, bars: 8, keys: "waltz", bass: "waltz", drums: "waltz", melody: m2, fill: true },
      { chords: A, bars: 8, keys: "waltz", bass: "waltz", drums: "waltz", melody: m3 },
      { chords: B.slice(0, 4), bars: 4, keys: "waltz", bass: "waltz", drums: "hats", melody: m4 },
      { chords: B.slice(4), bars: 4, keys: "pad", bass: false, drums: "none" },
    ],
  });
}

// ─── THE BEAT ──────────────────────────────────────────────────────────────
// A real beat, made in the browser. Every beat is its own: the drum pattern,
// chord progression, key, tempo, bass line, lead instrument and melody are
// picked per beat from big pools, and the song moves — an intro, the drop,
// fills at the end of phrases, a counter-melody on the second half. Each
// producer leans a certain way (their kit, their swing, their favourite
// instrument, a three-note tag at the start), and better producers add more
// layers and mix cleaner. Same beat id, same beat — so a take you recorded is
// always played back over exactly what you heard.

export type BeatStyle = 'boom' | 'trap' | 'drill' | 'afro' | 'amapiano' | 'dembow' | 'rnb';
export type Lead = 'keys' | 'pluck' | 'bell' | 'pad' | 'flute' | 'brass' | 'choir' | 'guitar';

/** A producer's sound: the same producer always sounds like themselves. */
export interface Signature { kick: number; kickDecay: number; clap: boolean; hats: 0 | 1 | 2; saw: boolean; glide: number; lead: Lead; swing: number; perc: boolean; tag: number[] }

export interface BeatSpec {
  bpm: number; style: BeatStyle; seed: number; quality: number; root: number; major: boolean; sig: Signature;
  kick: number[]; snare: number[]; hats: 'eighth' | 'sixteenth' | 'offbeat' | 'triplet' | 'rolls'; prog: number[]; lead: Lead; rhythm: number[]; snareKind: 'snare' | 'clap' | 'rim';
}

export const STYLE_LABEL: Record<BeatStyle, string> = { boom: 'Boom-bap', trap: 'Trap', drill: 'Drill', afro: 'Afrobeats', amapiano: 'Amapiano', dembow: 'Dancehall', rnb: 'R&B / slow jam' };
export const LEAD_LABEL: Record<Lead, string> = { keys: 'keys', pluck: 'pluck', bell: 'bells', pad: 'pads', flute: 'flute', brass: 'brass', choir: 'choir', guitar: 'guitar' };

function hash(s: string): number { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function rngOf(seed: number) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickR = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];

const KICKS: Record<BeatStyle, number[][]> = {
  boom: [[0, 10], [0, 7, 10], [0, 3, 10], [0, 8, 10, 13], [0, 6, 10], [0, 9, 11], [0, 2, 10, 14]],
  trap: [[0, 7, 10], [0, 6, 9, 14], [0, 3, 10, 13], [0, 10, 11], [0, 6, 8, 14], [0, 4, 7, 10], [0, 11, 14]],
  drill: [[0, 6, 10], [0, 3, 6, 11], [0, 10, 13], [0, 7, 11, 14], [0, 5, 10]],
  afro: [[0, 3, 6, 8, 11, 14], [0, 3, 8, 11], [0, 6, 8, 14], [0, 4, 8, 12], [0, 3, 7, 10, 12], [0, 5, 8, 13]],
  amapiano: [[0, 4, 8, 12], [0, 4, 8, 11, 12]],
  dembow: [[0, 8], [0, 4, 8, 12], [0, 7, 8]],
  rnb: [[0, 7, 10], [0, 9], [0, 3, 10], [0, 6, 11]],
};
const SNARES: Record<BeatStyle, number[][]> = {
  boom: [[4, 12], [4, 12, 15], [4, 11, 12]], trap: [[8], [8, 15], [8, 14]], drill: [[8, 13], [8, 14], [8, 15]],
  afro: [[4, 12], [7, 15], [4, 11, 14]], amapiano: [[4, 12], [6, 14]], dembow: [[3, 6, 11, 14]], rnb: [[8], [4, 12]],
};
const HATS: Record<BeatStyle, BeatSpec['hats'][]> = {
  boom: ['eighth', 'sixteenth', 'offbeat'], trap: ['rolls', 'sixteenth', 'triplet'], drill: ['triplet', 'rolls'],
  afro: ['sixteenth', 'offbeat'], amapiano: ['sixteenth', 'offbeat'], dembow: ['eighth', 'offbeat'], rnb: ['eighth', 'triplet', 'sixteenth'],
};
const PROG_MIN = [[0, 8, 3, 10], [0, 5, 8, 7], [0, 3, 8, 7], [0, 10, 8, 7], [0, 8, 10, 7], [0, 7, 8, 10], [0, 0, 8, 8], [0, 5, 10, 3], [0, 3, 5, 8]];
const PROG_MAJ = [[0, 5, 9, 7], [0, 7, 9, 5], [0, 9, 5, 7], [0, 5, 7, 5], [0, 4, 5, 7], [0, 2, 5, 7]];
const RHYTHMS = [[1, 0, 1, 0, 1, 1, 0, 0], [1, 0, 0, 1, 0, 0, 1, 0], [1, 1, 0, 1, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0, 1, 0], [1, 0, 0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0, 0, 1]];
const LEADS: Lead[] = ['keys', 'pluck', 'bell', 'pad', 'flute', 'brass', 'choir', 'guitar'];
const SCALE_MIN = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];
const SCALE_MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function signatureOf(producer: string): Signature {
  const h = hash(`sig|${producer}`);
  const b = (n: number, k: number) => (h >>> n) % k;
  return {
    kick: 120 + b(1, 50), kickDecay: 0.25 + b(4, 25) / 100, clap: b(7, 2) === 1, hats: b(9, 3) as 0 | 1 | 2,
    saw: b(11, 3) === 0, glide: b(13, 3) / 2, lead: LEADS[b(15, LEADS.length)], swing: b(17, 4) * 0.05, perc: b(19, 2) === 1,
    tag: [72 + b(21, 6), 76 + b(23, 5), 79 + b(25, 7)],
  };
}

function styleOf(genre: string, r: () => number): BeatStyle {
  const g = genre.toLowerCase();
  if (/drill|grime/.test(g)) return 'drill';
  if (/trap/.test(g)) return 'trap';
  if (/amapiano|gqom|kwaito/.test(g)) return 'amapiano';
  if (/dancehall|reggae|dembow|latin/.test(g)) return 'dembow';
  if (/alte/.test(g)) return r() < 0.5 ? 'rnb' : 'afro';
  if (/afro|highlife|azonto|bongo|hiplife/.test(g)) return r() < 0.15 ? 'amapiano' : 'afro';
  if (/rnb|r&b|soul|pop|gospel/.test(g)) return 'rnb';
  return r() < 0.55 ? 'boom' : 'trap';
}
const TEMPO: Record<BeatStyle, [number, number]> = { boom: [82, 96], trap: [130, 150], drill: [138, 146], afro: [98, 115], amapiano: [108, 116], dembow: [88, 100], rnb: [64, 82] };

export function beatSpecFor(genre: string, bpm: number | undefined, seed: string, quality: number, producer?: string, mood?: string): BeatSpec {
  const h = hash(seed);
  const r = rngOf(h);
  const sig = signatureOf(producer ?? seed);
  const style = styleOf(genre, r);
  const [lo, hi] = TEMPO[style];
  // The roll is always taken, so the same beat comes out the same whether or not a tempo was given.
  const rolled = Math.round(lo + r() * (hi - lo));
  const tempo = bpm && bpm >= lo - 12 && bpm <= hi + 12 ? bpm : rolled;
  const major = /love|romantic|joy|happy|uplift|celebrat|party/.test(String(mood ?? '').toLowerCase()) ? r() < 0.8 : r() < 0.18;
  return {
    bpm: Math.round(tempo), style, seed: h, quality: Math.max(20, Math.min(99, quality)), root: Math.floor(r() * 12), major, sig,
    kick: pickR(r, KICKS[style]), snare: pickR(r, SNARES[style]), hats: pickR(r, HATS[style]),
    prog: pickR(r, major ? PROG_MAJ : PROG_MIN),
    // The producer reaches for their favourite instrument most of the time.
    lead: r() < 0.6 ? sig.lead : pickR(r, LEADS),
    rhythm: pickR(r, RHYTHMS),
    snareKind: style === 'afro' || style === 'amapiano' ? (r() < 0.5 ? 'rim' : 'clap') : sig.clap ? 'clap' : r() < 0.3 ? 'clap' : 'snare',
  };
}

export class BeatPlayer {
  private ctx: AudioContext;
  private out: GainNode;
  private noise: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private step = 0;
  private spec: BeatSpec;
  private rand: () => number;
  private motif: number[];
  private counter: number[];
  constructor(ctx: AudioContext, spec: BeatSpec, dest: AudioNode, volume = 0.8) {
    this.ctx = ctx;
    this.spec = spec;
    this.out = ctx.createGain();
    this.out.gain.value = volume;
    // A weak producer's mix is muddy; a great one is open and bright.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2500 + (spec.quality / 100) * 15000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    // A brick wall at the end so a heavy 808 never clips.
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -4; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.1;
    this.out.connect(tone).connect(comp).connect(limit).connect(dest);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.rand = rngOf(spec.seed ^ 0x9e3779b9);
    this.motif = Array.from({ length: 16 }, () => Math.floor(this.rand() * 7));
    this.counter = Array.from({ length: 8 }, () => Math.floor(this.rand() * 5) + 2);
  }
  setVolume(v: number) { this.out.gain.value = v; }
  get stepDur() { return 60 / this.spec.bpm / 4; }
  start(when: number) {
    this.next = when;
    this.step = 0;
    this.spec.sig.tag.forEach((n, i) => this.tone(when + i * 0.07, midi(n), 0.08, 'sine', 0.1));
    const tick = () => { while (this.next < this.ctx.currentTime + 0.12) { this.play(this.step, this.next); this.step++; this.next += this.stepDur; } };
    tick();
    this.timer = window.setInterval(tick, 25);
  }
  stop() { if (this.timer !== null) window.clearInterval(this.timer); this.timer = null; this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); }

  private play(step: number, t0: number) {
    const sp = this.spec;
    const sig = sp.sig;
    const s = step % 16;
    const barAbs = Math.floor(step / 16);
    const bar = barAbs % 4;
    const phrase = barAbs % 16;
    const q = sp.quality / 100;
    // The first bar is the count-in: chords and melody, then the drums drop as you start.
    const intro = barAbs < 1;
    const fill = phrase % 8 === 7 && s >= 12;
    const second = phrase >= 8;
    const swing = s % 2 === 1 ? this.stepDur * ((sp.style === 'boom' ? 0.16 : sp.style === 'rnb' ? 0.1 : 0) + sig.swing * 0.5) : 0;
    const t = t0 + swing + (this.rand() - 0.5) * (1 - q) * 0.014;
    const chordRoot = 36 + sp.root + sp.prog[bar];
    const scale = sp.major ? SCALE_MAJ : SCALE_MIN;
    // Drums (the intro is just the chords and the melody).
    if (!intro) {
      if (sp.kick.includes(s) && !(fill && s > 12)) {
        this.kick(t);
        if (sp.style === 'trap' || sp.style === 'drill' || sp.style === 'rnb') this.bass(t, midi(chordRoot), this.stepDur * (sp.style === 'drill' ? 4 : 6), (sp.style === 'drill' && s !== 0) || (s === 14 && this.rand() < 0.3 + sig.glide * 0.4));
      }
      if (sp.snare.includes(s)) this.snare(t, sp.snareKind);
      if (fill && s % 1 === 0 && s >= 12) this.snare(t + (s % 2) * this.stepDur * 0.5, sp.snareKind, 0.25 + (s - 12) * 0.06);
      this.hats(t, s);
      if (sp.style === 'afro' || sp.style === 'amapiano') { if (s % 4 === 2) this.shaker(t, 0.12); if (sig.perc && (s === 6 || s === 14)) this.conga(t); }
      if (sp.style === 'boom' || sp.style === 'afro' || sp.style === 'dembow') { if ((sp.style === 'afro' ? [2, 6, 10, 14] : sp.style === 'dembow' ? [0, 3, 8, 11] : [0, 10]).includes(s)) this.bass(t, midi(chordRoot + (s % 8 === 6 ? 7 : 0)), this.stepDur * 1.8, false); }
      if (sp.style === 'amapiano' && [2, 5, 7, 10, 13, 15].includes(s)) this.logDrum(t, midi(chordRoot + (s === 13 ? 7 : 0)));
      if (phrase % 8 === 0 && s === 0 && barAbs > 0 && q >= 0.5) this.crash(t);
    }
    // Chords.
    if (s === 0 && q >= 0.4) { const third = this.isMajorChord(sp.prog[bar]) ? 4 : 3; this.chord(t, [chordRoot + 24, chordRoot + 24 + third, chordRoot + 31], this.stepDur * 16); }
    // The melody: a two-bar motif in the producer's instrument, answered on the second half.
    if (q >= 0.5 && s % 2 === 0 && sp.rhythm[(s / 2) % 8]) {
      const i = this.motif[(s / 2 + (bar % 2) * 8) % 16];
      this.lead(t, midi(60 + sp.root + scale[i] + (sp.prog[bar] > 6 ? -12 : 0) + (sp.prog[bar] % 12 > 0 && i < 3 ? sp.prog[bar] % 5 : 0)), this.stepDur * (sp.lead === 'pad' || sp.lead === 'choir' ? 3 : 1.7));
    }
    if (second && q >= 0.7 && s % 4 === 2 && !intro) this.tone(t, midi(72 + sp.root + scale[this.counter[(s / 4 + bar) % 8]]), this.stepDur * 1.2, 'sine', 0.035);
  }
  private isMajorChord(off: number) {
    return this.spec.major ? [0, 5, 7].includes(off) : [3, 8, 10].includes(off);
  }
  private env(g: GainNode, t: number, peak: number, dur: number) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  private tone(t: number, f: number, dur: number, type: OscillatorType, peak: number) { const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = type; o.frequency.value = f; this.env(g, t, peak, dur); o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05); }
  private kick(t: number) { const k = this.spec.sig; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(k.kick, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); this.env(g, t, 1, k.kickDecay + 0.1); o.connect(g).connect(this.out); o.start(t); o.stop(t + k.kickDecay + 0.15); }
  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, dur: number) { const src = this.ctx.createBufferSource(); src.buffer = this.noise; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = this.ctx.createGain(); this.env(g, t, peak, dur); src.connect(f).connect(g).connect(this.out); src.start(t, this.rand() * 0.5); src.stop(t + dur + 0.02); }
  private snare(t: number, kind: BeatSpec['snareKind'], peak = 0.55) {
    if (kind === 'clap') { this.noiseHit(t, 'bandpass', 1300, peak * 0.85, 0.12); this.noiseHit(t + 0.012, 'bandpass', 1500, peak * 0.6, 0.14); return; }
    if (kind === 'rim') { this.tone(t, 1700, 0.03, 'square', peak * 0.35); this.noiseHit(t, 'highpass', 3000, peak * 0.3, 0.04); return; }
    this.noiseHit(t, 'bandpass', 1900, peak, 0.18); this.tone(t, 190, 0.09, 'triangle', peak * 0.5);
  }
  private hats(t: number, s: number) {
    const mode = this.spec.hats;
    const bright = 6500 + this.spec.sig.hats * 1200;
    const hit = (tt: number, p: number, open = false) => this.noiseHit(tt, 'highpass', bright, p, open ? 0.2 : 0.045);
    if (mode === 'eighth') { if (s % 2 === 0) hit(t, s % 4 === 2 ? 0.13 : 0.18, s === 14 && this.rand() < 0.25); }
    else if (mode === 'offbeat') { if (s % 4 === 2) hit(t, 0.2, this.rand() < 0.3); else if (s % 2 === 1 && this.spec.quality > 60) hit(t, 0.07); }
    else if (mode === 'sixteenth') hit(t, s % 2 === 0 ? 0.14 : 0.08);
    else if (mode === 'triplet') { if (s % 4 === 0) { const d = (this.stepDur * 4) / 3; hit(t, 0.14); hit(t + d, 0.09); hit(t + 2 * d, 0.11); } }
    else { hit(t, 0.12); if ((s === 7 || s === 15) && this.rand() < 0.55) { for (let k = 1; k < 4; k++) hit(t + (this.stepDur / 3) * k, 0.08); } }
  }
  private shaker(t: number, p: number) { this.noiseHit(t, 'highpass', 5200, p * 0.8, 0.05); }
  private conga(t: number) { const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.08); this.env(g, t, 0.22, 0.14); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.18); }
  private crash(t: number) { this.noiseHit(t, 'highpass', 4000, 0.14, 1.1); }
  private bass(t: number, f: number, dur: number, slide: boolean) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = this.spec.sig.saw && (this.spec.style === 'boom' || this.spec.style === 'afro') ? 'sawtooth' : 'sine';
    o.frequency.setValueAtTime(slide ? f * 0.75 : f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    this.env(g, t, this.spec.style === 'afro' || this.spec.style === 'dembow' ? 0.45 : 0.75, dur);
    o.connect(lp).connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  }
  private logDrum(t: number, f: number) { const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 2, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); this.env(g, t, 0.55, 0.32); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.36); }
  private chord(t: number, notes: number[], dur: number) {
    const kind = this.spec.lead;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'choir' ? 1800 : 1300;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.08); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(this.out);
    for (const n of notes) for (const det of kind === 'choir' || kind === 'pad' ? [-6, 6] : [0]) { const o = this.ctx.createOscillator(); o.type = kind === 'choir' ? 'sawtooth' : 'triangle'; o.frequency.value = midi(n); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.05); }
  }
  private lead(t: number, f: number, dur: number) {
    const kind = this.spec.lead;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); const fl = this.ctx.createBiquadFilter();
    const type: Record<Lead, OscillatorType> = { keys: 'triangle', pluck: 'square', bell: 'sine', pad: 'triangle', flute: 'sine', brass: 'sawtooth', choir: 'sawtooth', guitar: 'sawtooth' };
    o.type = type[kind];
    o.frequency.value = kind === 'bell' ? f * 2 : f;
    if (kind === 'flute') { const lfo = this.ctx.createOscillator(); const lg = this.ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = 4; lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(kind === 'pluck' || kind === 'guitar' ? 3200 : kind === 'brass' ? 2400 : 3800, t);
    if (kind === 'pluck' || kind === 'guitar') fl.frequency.exponentialRampToValueAtTime(500, t + dur);
    const peak = kind === 'pad' || kind === 'choir' ? 0.045 : kind === 'brass' ? 0.06 : 0.085;
    this.env(g, t, peak, kind === 'bell' ? dur * 1.8 : dur);
    o.connect(fl).connect(g).connect(this.out); o.start(t); o.stop(t + dur * 1.9 + 0.05);
  }
}

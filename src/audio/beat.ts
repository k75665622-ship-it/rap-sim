// ─── THE BEAT ──────────────────────────────────────────────────────────────
// A real beat, made in the browser: drums, an 808 or bassline, chords. Each
// producer's records sound like their genre and tempo; better producers get
// more layers and a tighter groove. Same seed, same beat — so a take you
// record can always be played back over exactly what you heard.

export type BeatStyle = 'boom' | 'trap' | 'afro';
/** A producer's sound: the same producer always sounds like themselves. */
export interface Signature { kick: number; kickDecay: number; clap: boolean; hats: 0 | 1 | 2; saw: boolean; glide: number; lead: 'keys' | 'pluck' | 'bell' | 'pad'; swing: number; perc: boolean; tag: number[] }
export interface BeatSpec { bpm: number; style: BeatStyle; seed: number; quality: number; root: number; major: boolean; sig: Signature }

export const STYLE_LABEL: Record<BeatStyle, string> = { boom: 'Boom-bap', trap: 'Trap / drill', afro: 'Afro groove' };

function hash(s: string): number { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }

export function signatureOf(producer: string): Signature {
  const h = hash(`sig|${producer}`);
  const b = (n: number, k: number) => (h >>> n) % k;
  const leads: Signature['lead'][] = ['keys', 'pluck', 'bell', 'pad'];
  return {
    kick: 120 + b(1, 50), kickDecay: 0.25 + b(4, 25) / 100, clap: b(7, 2) === 1, hats: b(9, 3) as 0 | 1 | 2,
    saw: b(11, 3) === 0, glide: b(13, 3) / 2, lead: leads[b(15, 4)], swing: b(17, 4) * 0.05, perc: b(19, 2) === 1,
    tag: [72 + b(21, 6), 76 + b(23, 5), 79 + b(25, 7)],
  };
}

export function beatSpecFor(genre: string, bpm: number | undefined, seed: string, quality: number, producer?: string, mood?: string): BeatSpec {
  const g = genre.toLowerCase();
  const style: BeatStyle = /drill|trap/.test(g) ? 'trap' : /afro|amapiano|dancehall|highlife|reggae|azonto|bongo|gqom|kwaito/.test(g) ? 'afro' : 'boom';
  const h = hash(seed);
  const range = style === 'trap' ? [138, 150] : style === 'afro' ? [100, 114] : [84, 96];
  const tempo = bpm && bpm >= range[0] - 20 && bpm <= range[1] + 20 ? bpm : range[0] + (h % (range[1] - range[0]));
  return { bpm: Math.round(tempo), style, seed: h, quality: Math.max(20, Math.min(99, quality)), root: h % 7, major: /love|romantic|joy|happy|uplift|celebrat/.test(String(mood ?? '').toLowerCase()), sig: signatureOf(producer ?? seed) };
}

const PROG = [0, 8, 3, 10]; // minor: i – VI – III – VII
const PROG_MAJ = [0, 5, 9, 7]; // major: I – IV – vi – V
const SCALE_MIN = [0, 3, 5, 7, 10, 12, 15];
const SCALE_MAJ = [0, 2, 4, 7, 9, 12, 14];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class BeatPlayer {
  private ctx: AudioContext;
  private out: GainNode;
  private noise: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private step = 0;
  private spec: BeatSpec;
  private kicks: number[];
  private rand: () => number;
  constructor(ctx: AudioContext, spec: BeatSpec, dest: AudioNode, volume = 0.8) {
    this.ctx = ctx;
    this.spec = spec;
    this.out = ctx.createGain();
    this.out.gain.value = volume;
    // A weak producer's mix is muddy; a great one is open and bright.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2500 + (spec.quality / 100) * 15000;
    this.out.connect(tone).connect(dest);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let s = spec.seed || 1;
    this.rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // The groove is decided once, from the seed.
    const base = spec.style === 'trap' ? [0, 10] : spec.style === 'afro' ? [0, 3, 8, 11] : [0, 10];
    const extra = spec.style === 'trap' ? [6, 7, 14] : spec.style === 'afro' ? [6, 14] : [7, 8, 15];
    this.kicks = [...base, ...extra.filter(() => this.rand() < 0.45)];
    // The hook melody: eight notes from the scale, decided by the seed.
    this.motif = Array.from({ length: 8 }, () => (this.rand() < 0.25 ? -1 : Math.floor(this.rand() * 7)));
  }
  private motif: number[];
  setVolume(v: number) { this.out.gain.value = v; }
  get stepDur() { return 60 / this.spec.bpm / 4; }
  start(when: number) {
    this.next = when;
    this.step = 0;
    // The producer tag: three notes you learn to recognise.
    this.spec.sig.tag.forEach((n, i) => this.blip(when + i * 0.07, midi(n), 0.08));
    const tick = () => {
      while (this.next < this.ctx.currentTime + 0.12) { this.play(this.step, this.next); this.step++; this.next += this.stepDur * (this.spec.style === 'trap' ? 1 : 1); }
    };
    tick();
    this.timer = window.setInterval(tick, 25);
  }
  stop() { if (this.timer !== null) window.clearInterval(this.timer); this.timer = null; this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); }

  private play(step: number, t0: number) {
    const sp = this.spec;
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const q = sp.quality / 100;
    const sig = sp.sig;
    const swing = s % 2 === 1 ? this.stepDur * ((sp.style === 'boom' ? 0.18 : 0) + sig.swing * 0.5) : 0;
    const t = t0 + swing + (this.rand() - 0.5) * (1 - q) * 0.014;
    const prog = sp.major ? PROG_MAJ : PROG;
    const root = 36 + sp.root + prog[bar];
    const third = sp.major && bar !== 2 ? 4 : 3;
    if (this.kicks.includes(s)) { this.kick(t); if (sp.style !== 'boom' || q >= 0.6) this.bass(t, midi(root), sp.style === 'trap' ? this.stepDur * 6 : this.stepDur * 2.5, sp.style === 'trap' && s === 14 && this.rand() < 0.3 + sig.glide * 0.4); }
    if (sp.style === 'trap') { if (s === 8) this.snare(t); }
    else if (s === 4 || s === 12) this.snare(t);
    if (sp.style === 'afro') { if (s % 2 === 1 || s === 0) this.shaker(t); if (s === 6 || s === 14) this.rim(t); }
    else if (sp.style === 'trap') { if (sig.hats > 0 || s % 2 === 0) this.hat(t, 0.15); if (s === 15 && this.rand() < 0.4 * q + 0.2) { this.hat(t + this.stepDur / 3, 0.1); this.hat(t + (2 * this.stepDur) / 3, 0.1); } }
    else if (s % 2 === 0 || sig.hats === 2) this.hat(t, s % 4 === 2 ? 0.14 : 0.2, s === 14 && this.rand() < 0.3);
    if (s === 0 && q >= 0.45) this.pad(t, [root + 24, root + 24 + third, root + 31], this.stepDur * 16);
    // The hook: better producers write one, in their own sound.
    if (q >= 0.55 && s % 2 === 0) { const n = this.motif[(s / 2 + bar * 3) % 8]; if (n >= 0) this.lead(t, midi(48 + sp.root + (sp.major ? SCALE_MAJ : SCALE_MIN)[n]), this.stepDur * (sig.lead === 'pad' ? 3 : 1.6)); }
    if (sig.perc && q >= 0.65 && s % 4 === 2 && sp.style !== 'afro') this.rim(t + this.stepDur * 0.5, 0.05);
  }
  private env(g: GainNode, t: number, peak: number, dur: number) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  private kick(t: number) { const k = this.spec.sig; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(k.kick, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); this.env(g, t, 1, k.kickDecay + 0.1); o.connect(g).connect(this.out); o.start(t); o.stop(t + k.kickDecay + 0.15); }
  private blip(t: number, f: number, dur: number) { const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.value = f; this.env(g, t, 0.12, dur); o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02); }
  private lead(t: number, f: number, dur: number) {
    const kind = this.spec.sig.lead;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); const fl = this.ctx.createBiquadFilter();
    o.type = kind === 'pluck' ? 'square' : kind === 'bell' ? 'sine' : kind === 'pad' ? 'triangle' : 'triangle';
    o.frequency.value = kind === 'bell' ? f * 2 : f;
    fl.type = 'lowpass'; fl.frequency.value = kind === 'pluck' ? 1800 : 3500;
    this.env(g, t, kind === 'pad' ? 0.05 : 0.09, kind === 'bell' ? dur * 1.6 : dur);
    o.connect(fl).connect(g).connect(this.out); o.start(t); o.stop(t + dur * 1.7 + 0.05);
  }
  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, dur: number) { const src = this.ctx.createBufferSource(); src.buffer = this.noise; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = this.ctx.createGain(); this.env(g, t, peak, dur); src.connect(f).connect(g).connect(this.out); src.start(t, this.rand() * 0.5); src.stop(t + dur + 0.02); }
  private snare(t: number) { if (this.spec.sig.clap) { this.noiseHit(t, 'bandpass', 1300, 0.45, 0.12); this.noiseHit(t + 0.012, 'bandpass', 1500, 0.35, 0.14); return; } this.noiseHit(t, 'bandpass', 1900, 0.55, 0.18); const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'triangle'; o.frequency.value = 190; this.env(g, t, 0.3, 0.09); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.12); }
  private hat(t: number, peak: number, open = false) { this.noiseHit(t, 'highpass', 7500, peak, open ? 0.22 : 0.045); }
  private shaker(t: number) { this.noiseHit(t, 'highpass', 5200, 0.09, 0.05); }
  private rim(t: number, peak = 0.18) { const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'square'; o.frequency.value = 1100; this.env(g, t, peak, 0.03); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.05); }
  private bass(t: number, f: number, dur: number, slide: boolean) { const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = this.spec.sig.saw && this.spec.style !== 'trap' ? 'sawtooth' : 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur * 0.6); this.env(g, t, this.spec.style === 'afro' ? 0.5 : 0.75, dur); o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05); }
  private pad(t: number, notes: number[], dur: number) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.08); g.gain.linearRampToValueAtTime(0.0001, t + dur); f.connect(g).connect(this.out); for (const n of notes) { const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = midi(n); o.connect(f); o.start(t); o.stop(t + dur + 0.05); } }
}

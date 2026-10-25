// ─── THE VOCAL CHAIN ───────────────────────────────────────────────────────
// What an engineer does to a raw vocal, done in the browser: level it so every
// take sits right against the beat, shape the tone, squeeze it, add a little
// dirt, double it for width, an echo locked to the tempo and a room around it.
// Every knob moves live while the song plays, and the same chain renders the
// finished song to a file you can keep.

import type { VocalFx } from '../types/game';
import { BeatPlayer, type BeatSpec } from './beat';

export const DEFAULT_FX: VocalFx = { preset: 'clean', voice: 0.9, beat: 0.85, reverb: 12, echo: 0, echoTime: '1/8', double: false, tone: 0, punch: 35, grit: 0, lofi: false, nudgeMs: 0 };

export const FX_PRESETS: { id: string; label: string; emoji: string; blurb: string; fx: Partial<VocalFx> }[] = [
  { id: 'clean', label: 'Clean', emoji: '🎤', blurb: 'Natural and upfront', fx: { reverb: 12, echo: 0, double: false, tone: 0, punch: 35, grit: 0, lofi: false } },
  { id: 'radio', label: 'Radio', emoji: '📻', blurb: 'Loud, bright, in your face', fx: { reverb: 14, echo: 12, echoTime: '1/8', double: false, tone: 22, punch: 75, grit: 8, lofi: false } },
  { id: 'trap', label: 'Trap star', emoji: '💎', blurb: 'Glossy double, 1/8 echo', fx: { reverb: 24, echo: 34, echoTime: '1/8', double: true, tone: 30, punch: 62, grit: 0, lofi: false } },
  { id: 'drill', label: 'Drill dark', emoji: '🌑', blurb: 'Dark, gritty, cold', fx: { reverb: 16, echo: 22, echoTime: '3/16', double: true, tone: -18, punch: 78, grit: 35, lofi: false } },
  { id: 'afro', label: 'Afro warm', emoji: '🌴', blurb: 'Warm, soft big space', fx: { reverb: 38, echo: 24, echoTime: '1/4', double: false, tone: 8, punch: 45, grit: 0, lofi: false } },
  { id: 'lofi', label: 'Lo-fi tape', emoji: '📼', blurb: 'Dusty old tape', fx: { reverb: 20, echo: 10, echoTime: '1/4', double: false, tone: -30, punch: 40, grit: 28, lofi: true } },
  { id: 'stadium', label: 'Stadium', emoji: '🏟️', blurb: 'Huge hall, wide', fx: { reverb: 70, echo: 28, echoTime: '1/4', double: true, tone: 14, punch: 55, grit: 0, lofi: false } },
  { id: 'phone', label: 'Phone call', emoji: '📞', blurb: 'For a skit or an intro', fx: { reverb: 0, echo: 0, double: false, tone: 18, punch: 50, grit: 18, lofi: true } },
];

export function withPreset(fx: VocalFx, id: string): VocalFx {
  const p = FX_PRESETS.find((x) => x.id === id);
  return p ? { ...fx, ...p.fx, preset: id } : fx;
}

/** The preset that suits a beat style best — what an engineer would reach for first. */
export function suggestedPreset(style: string): string {
  return style === 'trap' ? 'trap' : style === 'drill' ? 'drill' : style === 'afro' || style === 'amapiano' || style === 'rnb' ? 'afro' : style === 'dembow' ? 'radio' : 'clean';
}

const echoSeconds = (t: VocalFx['echoTime'], bpm: number) => (60 / bpm) * (t === '1/4' ? 1 : t === '3/16' ? 0.75 : 0.5);

function impulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}

function gritCurve(amount: number): Float32Array<ArrayBuffer> {
  const k = (amount / 100) * 8;
  const n = 1024;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
  return c;
}

const levels = new WeakMap<AudioBuffer, number>();
/** How much to turn a raw take up or down so every take sits at the same level against the beat. */
export function levelFor(buf: AudioBuffer): number {
  const known = levels.get(buf);
  if (known) return known;
  const d = buf.getChannelData(0);
  const hop = Math.max(64, Math.round(buf.sampleRate * 0.01));
  const frames: number[] = [];
  for (let i = 0; i + hop <= d.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += d[j] * d[j]; frames.push(Math.sqrt(s / hop)); }
  const sorted = [...frames].sort((a, b) => a - b);
  // Only the parts where you're actually rapping count.
  const gate = Math.max(0.004, (sorted[Math.floor(sorted.length * 0.2)] ?? 0) * 2.5);
  let sum = 0; let n = 0;
  for (const f of frames) if (f > gate) { sum += f * f; n++; }
  const rms = n ? Math.sqrt(sum / n) : 0.05;
  const g = Math.max(0.2, Math.min(10, 0.12 / rms));
  levels.set(buf, g);
  return g;
}

/** The master bus: everything sums here and a limiter keeps it from clipping. */
export function createBus(ctx: BaseAudioContext, dest: AudioNode): GainNode {
  const bus = ctx.createGain();
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.15;
  bus.connect(lim).connect(dest);
  return bus;
}

export class VocalChain {
  readonly input: GainNode;
  private ctx: BaseAudioContext;
  private bpm: number;
  private lofiDry: GainNode; private lofiWet: GainNode;
  private low: BiquadFilterNode; private high: BiquadFilterNode; private pres: BiquadFilterNode;
  private shaper: WaveShaperNode; private comp: DynamicsCompressorNode; private makeup: GainNode;
  private level: GainNode; private verb: GainNode; private echo: GainNode; private delay: DelayNode; private fb: GainNode; private dbl: GainNode;
  private lfos: OscillatorNode[] = [];
  private grit = -1;

  constructor(ctx: BaseAudioContext, dest: AudioNode, bpm: number, fx: VocalFx, gain = 1) {
    this.ctx = ctx; this.bpm = bpm;
    const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const f = (type: BiquadFilterType, freq: number, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = freq; n.Q.value = q; return n; };
    this.input = g(gain);
    // Lo-fi is a narrow band; crossfaded so it can switch live.
    const sum = g();
    this.lofiDry = g(1); this.lofiWet = g(0);
    this.input.connect(this.lofiDry).connect(sum);
    this.input.connect(f('highpass', 420)).connect(f('lowpass', 3000)).connect(this.lofiWet).connect(sum);
    const rumble = f('highpass', 90);
    this.low = f('lowshelf', 220); this.high = f('highshelf', 5200); this.pres = f('peaking', 3000, 1);
    this.shaper = ctx.createWaveShaper(); this.shaper.oversample = '2x';
    this.comp = ctx.createDynamicsCompressor(); this.comp.attack.value = 0.004; this.comp.release.value = 0.12; this.comp.knee.value = 6;
    this.makeup = g();
    this.level = g();
    sum.connect(rumble).connect(this.low).connect(this.high).connect(this.pres).connect(this.shaper).connect(this.comp).connect(this.makeup).connect(this.level).connect(dest);
    // The room.
    const conv = ctx.createConvolver(); conv.buffer = impulse(ctx, 2.6, 2.4);
    this.verb = g(0);
    this.level.connect(this.verb).connect(f('highpass', 250)).connect(conv).connect(dest);
    // The echo, locked to the tempo.
    this.echo = g(0); this.delay = ctx.createDelay(2); this.fb = g(0.25);
    const dark = f('lowpass', 3200);
    this.level.connect(this.echo).connect(this.delay);
    this.delay.connect(dark).connect(this.fb).connect(this.delay);
    dark.connect(dest);
    // The double: two slightly moving copies, one each side.
    this.dbl = g(0);
    for (const [base, rate, pan] of [[0.019, 0.33, -0.75], [0.028, 0.47, 0.75]] as const) {
      const d = ctx.createDelay(0.1); d.delayTime.value = base;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate;
      const depth = g(0.0022); lfo.connect(depth).connect(d.delayTime); lfo.start();
      this.lfos.push(lfo);
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      this.level.connect(d).connect(p).connect(this.dbl);
    }
    this.dbl.connect(dest);
    this.update(fx, true);
  }

  update(fx: VocalFx, now = false) {
    const t = this.ctx.currentTime;
    const set = (p: AudioParam, v: number) => { if (now) p.value = v; else p.setTargetAtTime(v, t, 0.03); };
    set(this.level.gain, fx.voice);
    set(this.lofiWet.gain, fx.lofi ? 1 : 0); set(this.lofiDry.gain, fx.lofi ? 0 : 1);
    set(this.low.gain, -fx.tone * 0.16); set(this.high.gain, fx.tone * 0.2); set(this.pres.gain, Math.max(0, fx.tone) * 0.06);
    if (fx.grit !== this.grit) { this.shaper.curve = gritCurve(fx.grit); this.grit = fx.grit; }
    set(this.comp.threshold, -8 - fx.punch * 0.26); set(this.comp.ratio, 1.5 + fx.punch * 0.065); set(this.makeup.gain, 1 + fx.punch * 0.012);
    set(this.verb.gain, (fx.reverb / 100) * 0.55);
    set(this.echo.gain, (fx.echo / 100) * 0.5); set(this.delay.delayTime, echoSeconds(fx.echoTime, this.bpm)); set(this.fb.gain, Math.min(0.5, 0.18 + fx.echo * 0.0032));
    set(this.dbl.gain, fx.double ? 0.42 : 0);
  }

  dispose() { for (const l of this.lfos) { try { l.stop(); } catch { /* stopped */ } } this.lfos = []; try { this.input.disconnect(); } catch { /* gone */ } }
}

/** Where the vocal starts against the beat, after the count-in and the timing nudge. */
function startVoice(src: AudioBufferSourceNode, at: number, lead: number, fx: VocalFx, take: AudioBuffer) {
  const vs = lead + fx.nudgeMs / 1000;
  if (vs >= 0) src.start(at + vs); else src.start(at, Math.min(take.duration - 0.01, -vs));
}

export interface Mix { stop(): void; setFx(fx: VocalFx): void }

/** Play the beat and a take together through the chain, live. */
export function playMix(ctx: AudioContext, spec: BeatSpec, take: AudioBuffer, fx: VocalFx, lead: number, onEnd?: () => void): Mix {
  const at = ctx.currentTime + 0.08;
  const bus = createBus(ctx, ctx.destination);
  const beat = new BeatPlayer(ctx, spec, bus, fx.beat);
  beat.start(at);
  const chain = new VocalChain(ctx, bus, spec.bpm, fx, levelFor(take));
  const src = ctx.createBufferSource(); src.buffer = take; src.connect(chain.input);
  startVoice(src, at, lead, fx, take);
  let done = false;
  let tail: number | null = null;
  const stop = () => {
    if (done) return; done = true;
    if (tail !== null) window.clearTimeout(tail);
    beat.stop(); try { src.stop(); } catch { /* ended */ }
    window.setTimeout(() => { chain.dispose(); try { bus.disconnect(); } catch { /* gone */ } }, 800);
  };
  // Let the last words ring out over a bar of beat before it stops.
  src.onended = () => { if (done) return; tail = window.setTimeout(() => { stop(); onEnd?.(); }, (60 / spec.bpm) * 4 * 1000); };
  return { stop, setFx: (f) => { chain.update(f); beat.setVolume(f.beat); } };
}

/** Render the finished song — beat, vocal and every effect — to a WAV file. */
export async function renderSong(spec: BeatSpec, take: AudioBuffer, fx: VocalFx, lead: number): Promise<Blob> {
  const sr = 44100;
  const vs = Math.max(0, lead + fx.nudgeMs / 1000);
  const bar = (60 / spec.bpm) * 4;
  const music = vs + take.duration + bar;
  const oc = new OfflineAudioContext(2, Math.ceil(sr * (music + 2.5)), sr);
  const bus = createBus(oc, oc.destination);
  new BeatPlayer(oc, spec, bus, fx.beat).scheduleAll(0.05, music);
  const chain = new VocalChain(oc, bus, spec.bpm, fx, levelFor(take));
  const src = oc.createBufferSource(); src.buffer = take; src.connect(chain.input);
  startVoice(src, 0.05, lead, fx, take);
  const out = await oc.startRendering();
  return wav(out);
}

function wav(b: AudioBuffer): Blob {
  const ch = b.numberOfChannels; const len = b.length; const sr = b.sampleRate;
  const v = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * ch * 2, true);
  const data = Array.from({ length: ch }, (_, i) => b.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
  return new Blob([v.buffer], { type: 'audio/wav' });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'song.wav';
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── THE VOCAL CHAIN ───────────────────────────────────────────────────────
// What an engineer does to a raw vocal, done in the browser: level it so every
// take sits right against the beat, tune it into the beat's key, shape the
// tone, squeeze it, add a little dirt, double it for width, an echo locked to
// the tempo and a room around it — and make the hook hit harder with a stack
// and a harmony. Every knob moves live while the song plays, and the same
// chain renders the finished song to a file you can keep. A real engineer's
// mix adds a master on top: louder, clearer, glued.

import type { VocalFx } from '../types/game';
import { BeatPlayer, type BeatSpec } from './beat';
import { tuneBuffer } from './autotune';

export const DEFAULT_FX: VocalFx = { preset: 'clean', voice: 0.9, beat: 0.85, reverb: 12, echo: 0, echoTime: '1/8', double: false, tone: 0, punch: 35, grit: 0, lofi: false, nudgeMs: 0, tune: 0, tuneSpeed: 50, hook: 0, harmony: 0 };

export const FX_PRESETS: { id: string; label: string; emoji: string; blurb: string; fx: Partial<VocalFx> }[] = [
  { id: 'clean', label: 'Clean', emoji: '🎤', blurb: 'Natural and upfront', fx: { reverb: 12, echo: 0, double: false, tone: 0, punch: 35, grit: 0, lofi: false, tune: 0 } },
  { id: 'radio', label: 'Radio', emoji: '📻', blurb: 'Loud, bright, in your face', fx: { reverb: 14, echo: 12, echoTime: '1/8', double: false, tone: 22, punch: 75, grit: 8, lofi: false, tune: 10, tuneSpeed: 40 } },
  { id: 'trap', label: 'Trap star', emoji: '💎', blurb: 'Glossy double, 1/8 echo, a touch of tune', fx: { reverb: 24, echo: 34, echoTime: '1/8', double: true, tone: 30, punch: 62, grit: 0, lofi: false, tune: 35, tuneSpeed: 65 } },
  { id: 'melodic', label: 'Melodic', emoji: '🎶', blurb: 'Tuned and smooth — sing-rap', fx: { reverb: 34, echo: 26, echoTime: '1/4', double: true, tone: 12, punch: 48, grit: 0, lofi: false, tune: 70, tuneSpeed: 55, hook: 50, harmony: 40 } },
  { id: 'hardtune', label: 'Hard tune', emoji: '🤖', blurb: 'Full auto-tune, robotic snap', fx: { reverb: 22, echo: 24, echoTime: '1/8', double: true, tone: 20, punch: 60, grit: 0, lofi: false, tune: 100, tuneSpeed: 100 } },
  { id: 'drill', label: 'Drill dark', emoji: '🌑', blurb: 'Dark, gritty, cold', fx: { reverb: 16, echo: 22, echoTime: '3/16', double: true, tone: -18, punch: 78, grit: 35, lofi: false, tune: 0 } },
  { id: 'afro', label: 'Afro warm', emoji: '🌴', blurb: 'Warm, soft big space, light tune', fx: { reverb: 38, echo: 24, echoTime: '1/4', double: false, tone: 8, punch: 45, grit: 0, lofi: false, tune: 40, tuneSpeed: 45 } },
  { id: 'lofi', label: 'Lo-fi tape', emoji: '📼', blurb: 'Dusty old tape', fx: { reverb: 20, echo: 10, echoTime: '1/4', double: false, tone: -30, punch: 40, grit: 28, lofi: true, tune: 0 } },
  { id: 'stadium', label: 'Stadium', emoji: '🏟️', blurb: 'Huge hall, wide', fx: { reverb: 70, echo: 28, echoTime: '1/4', double: true, tone: 14, punch: 55, grit: 0, lofi: false } },
  { id: 'phone', label: 'Phone call', emoji: '📞', blurb: 'For a skit or an intro', fx: { reverb: 0, echo: 0, double: false, tone: 18, punch: 50, grit: 18, lofi: true, tune: 0 } },
];

export function withPreset(fx: VocalFx, id: string): VocalFx {
  const p = FX_PRESETS.find((x) => x.id === id);
  return p ? { ...fx, ...p.fx, preset: id } : fx;
}

/** The preset that suits a beat style best — what an engineer would reach for first. */
export function suggestedPreset(style: string): string {
  return style === 'trap' ? 'trap' : style === 'drill' ? 'drill' : style === 'afro' || style === 'amapiano' ? 'afro' : style === 'rnb' ? 'melodic' : style === 'dembow' ? 'radio' : 'clean';
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
  const gate = Math.max(0.004, Math.min((sorted[Math.floor(sorted.length * 0.2)] ?? 0) * 2.5, (sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 0.3));
  let sum = 0; let n = 0;
  for (const f of frames) if (f > gate) { sum += f * f; n++; }
  const rms = n ? Math.sqrt(sum / n) : 0.05;
  const g = Math.max(0.2, Math.min(10, 0.12 / rms));
  levels.set(buf, g);
  return g;
}

/** The master bus: everything sums here. An engineer's polish adds a master; a limiter keeps it from clipping. */
export function createBus(ctx: BaseAudioContext, dest: AudioNode, polish = 0): GainNode {
  const bus = ctx.createGain();
  const p = Math.max(0, Math.min(100, polish)) / 100;
  let node: AudioNode = bus;
  if (p > 0) {
    const mud = ctx.createBiquadFilter(); mud.type = 'peaking'; mud.frequency.value = 320; mud.Q.value = 0.8; mud.gain.value = -p * 2.5;
    const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 9000; air.gain.value = p * 3.5;
    const glue = ctx.createDynamicsCompressor(); glue.threshold.value = -10 - p * 8; glue.ratio.value = 1.5 + p * 1.5; glue.attack.value = 0.02; glue.release.value = 0.2; glue.knee.value = 10;
    const make = ctx.createGain(); make.gain.value = 1 + p * 0.45;
    node.connect(mud); mud.connect(air); air.connect(glue); glue.connect(make);
    node = make;
  }
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.15;
  node.connect(lim).connect(dest);
  return bus;
}

type Ranges = [number, number][];
function toRanges(bars: number[] | undefined): Ranges {
  const s = [...new Set(bars ?? [])].filter((b) => b >= 0).sort((a, b) => a - b);
  const out: Ranges = [];
  for (const b of s) { const last = out[out.length - 1]; if (last && last[1] === b) last[1] = b + 1; else out.push([b, b + 1]); }
  return out;
}

export class VocalChain {
  readonly input: GainNode;
  readonly harmonyIn: GainNode;
  private ctx: BaseAudioContext;
  private bpm: number;
  private fx: VocalFx;
  private plan: { at: number; bar: number; ranges: Ranges } | null = null;
  private lofiDry: GainNode; private lofiWet: GainNode;
  private low: BiquadFilterNode; private high: BiquadFilterNode; private pres: BiquadFilterNode;
  private shaper: WaveShaperNode; private comp: DynamicsCompressorNode; private makeup: GainNode;
  private level: GainNode; private verb: GainNode; private echo: GainNode; private delay: DelayNode; private fb: GainNode; private dbl: GainNode;
  private lfos: OscillatorNode[] = [];
  private grit = -1;

  constructor(ctx: BaseAudioContext, dest: AudioNode, bpm: number, fx: VocalFx, gain = 1) {
    this.ctx = ctx; this.bpm = bpm; this.fx = fx;
    const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const f = (type: BiquadFilterType, freq: number, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = freq; n.Q.value = q; return n; };
    this.input = g(gain);
    // The harmony only speaks on the hook.
    this.harmonyIn = g(0);
    this.harmonyIn.connect(this.input);
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

  /** Tell the chain where the hook bars fall, counted from the beat's first downbeat at `at`. */
  hookPlan(at: number, bar: number, hookBars: number[] | undefined) {
    // Bar 0 of the vocal is the first bar after the one-bar count-in.
    this.plan = { at, bar, ranges: toRanges(hookBars).map(([s, e]) => [s + 1, e + 1] as [number, number]) };
    this.update(this.fx, true);
  }

  private auto(p: AudioParam, base: number, hook: number, now: boolean) {
    const t = this.ctx.currentTime;
    const plan = this.plan;
    if (!plan || !plan.ranges.length || Math.abs(hook - base) < 1e-4) {
      if (now) { p.cancelScheduledValues(0); p.value = base; } else { p.cancelScheduledValues(t); p.setTargetAtTime(base, t, 0.03); }
      return;
    }
    p.cancelScheduledValues(now ? 0 : t);
    const inHook = plan.ranges.some(([s, e]) => t >= plan.at + s * plan.bar && t < plan.at + e * plan.bar);
    if (now) p.value = inHook ? hook : base; else p.setTargetAtTime(inHook ? hook : base, t, 0.03);
    for (const [s, e] of plan.ranges) {
      const ts = plan.at + s * plan.bar; const te = plan.at + e * plan.bar;
      if (ts > t) p.setTargetAtTime(hook, ts, 0.02);
      if (te > t) p.setTargetAtTime(base, te, 0.06);
    }
  }

  update(fx: VocalFx, now = false) {
    this.fx = fx;
    const t = this.ctx.currentTime;
    const set = (p: AudioParam, v: number) => { if (now) p.value = v; else p.setTargetAtTime(v, t, 0.03); };
    const hook = (fx.hook ?? 0) / 100;
    this.auto(this.level.gain, fx.voice, fx.voice * (1 + hook * 0.15), now);
    set(this.lofiWet.gain, fx.lofi ? 1 : 0); set(this.lofiDry.gain, fx.lofi ? 0 : 1);
    set(this.low.gain, -fx.tone * 0.16); set(this.high.gain, fx.tone * 0.2); set(this.pres.gain, Math.max(0, fx.tone) * 0.06);
    if (fx.grit !== this.grit) { this.shaper.curve = gritCurve(fx.grit); this.grit = fx.grit; }
    set(this.comp.threshold, -8 - fx.punch * 0.26); set(this.comp.ratio, 1.5 + fx.punch * 0.065); set(this.makeup.gain, 1 + fx.punch * 0.012);
    const verb = (fx.reverb / 100) * 0.55;
    this.auto(this.verb.gain, verb, verb + hook * 0.2, now);
    set(this.echo.gain, (fx.echo / 100) * 0.5); set(this.delay.delayTime, echoSeconds(fx.echoTime, this.bpm)); set(this.fb.gain, Math.min(0.5, 0.18 + fx.echo * 0.0032));
    const dbl = fx.double ? 0.42 : 0;
    this.auto(this.dbl.gain, dbl, hook > 0 ? Math.max(dbl, 0.25 + hook * 0.3) : dbl, now);
    this.auto(this.harmonyIn.gain, 0, ((fx.harmony ?? 0) / 100) * 0.55, now);
  }

  dispose() { for (const l of this.lfos) { try { l.stop(); } catch { /* stopped */ } } this.lfos = []; try { this.input.disconnect(); } catch { /* gone */ } }
}

/** A take, ready to play: tuned if asked, a harmony if the hook needs one, and how loud to make it. */
export interface Prepared { main: AudioBuffer; harmony: AudioBuffer | null; gain: number }

export async function prepareVocal(ctx: BaseAudioContext, take: AudioBuffer, fx: VocalFx, key: { root: number; major: boolean }, hookBars: number[] | undefined, onProgress?: (p: number) => void): Promise<Prepared> {
  const gain = levelFor(take);
  const tune = fx.tune ?? 0;
  const main = tune > 0 ? await tuneBuffer(ctx, take, { root: key.root, major: key.major, amount: tune, speed: fx.tuneSpeed ?? 50 }, onProgress) : take;
  const harmony = (fx.harmony ?? 0) > 0 && hookBars?.length ? await tuneBuffer(ctx, take, { root: key.root, major: key.major, amount: 100, speed: 100, degrees: 2 }, onProgress) : null;
  return { main, harmony, gain };
}

/** Where the vocal starts against the beat, after the count-in and the timing nudge. */
function startVoice(src: AudioBufferSourceNode, at: number, lead: number, fx: VocalFx, take: AudioBuffer) {
  const vs = lead + fx.nudgeMs / 1000;
  if (vs >= 0) src.start(at + vs); else src.start(at, Math.min(take.duration - 0.01, -vs));
}

export interface Mix { stop(): void; setFx(fx: VocalFx): void; startedAt: number }

/** Play the beat and a take together through the chain, live. */
export function playMix(ctx: AudioContext, spec: BeatSpec, v: Prepared, fx: VocalFx, lead: number, hookBars: number[] | undefined, onEnd?: () => void): Mix {
  const at = ctx.currentTime + 0.08;
  const bar = (60 / spec.bpm) * 4;
  const bus = createBus(ctx, ctx.destination, fx.polish ?? 0);
  const beat = new BeatPlayer(ctx, spec, bus, fx.beat, fx.polish ?? 0);
  beat.start(at);
  const chain = new VocalChain(ctx, bus, spec.bpm, fx, v.gain);
  chain.hookPlan(at, bar, hookBars);
  const src = ctx.createBufferSource(); src.buffer = v.main; src.connect(chain.input);
  startVoice(src, at, lead, fx, v.main);
  let hs: AudioBufferSourceNode | null = null;
  if (v.harmony) { hs = ctx.createBufferSource(); hs.buffer = v.harmony; hs.connect(chain.harmonyIn); startVoice(hs, at, lead, fx, v.harmony); }
  let done = false;
  let tail: number | null = null;
  const stop = () => {
    if (done) return; done = true;
    if (tail !== null) window.clearTimeout(tail);
    beat.stop(); try { src.stop(); } catch { /* ended */ } try { hs?.stop(); } catch { /* ended */ }
    window.setTimeout(() => { chain.dispose(); try { bus.disconnect(); } catch { /* gone */ } }, 800);
  };
  // Let the last words ring out over a bar of beat before it stops.
  src.onended = () => { if (done) return; tail = window.setTimeout(() => { stop(); onEnd?.(); }, bar * 1000); };
  return { stop, setFx: (f) => { chain.update(f); beat.setVolume(f.beat); }, startedAt: at };
}

/** Render the finished song — beat, vocal, every effect and the master — to a WAV file. */
export async function renderSong(spec: BeatSpec, v: Prepared, fx: VocalFx, lead: number, hookBars: number[] | undefined): Promise<Blob> {
  const sr = 44100;
  const vs = Math.max(0, lead + fx.nudgeMs / 1000);
  const bar = (60 / spec.bpm) * 4;
  const music = vs + v.main.duration + bar;
  const oc = new OfflineAudioContext(2, Math.ceil(sr * (music + 2.5)), sr);
  const bus = createBus(oc, oc.destination, fx.polish ?? 0);
  new BeatPlayer(oc, spec, bus, fx.beat, fx.polish ?? 0).scheduleAll(0.05, music);
  const chain = new VocalChain(oc, bus, spec.bpm, fx, v.gain);
  chain.hookPlan(0.05, bar, hookBars);
  const src = oc.createBufferSource(); src.buffer = v.main; src.connect(chain.input);
  startVoice(src, 0.05, lead, fx, v.main);
  if (v.harmony) { const hs = oc.createBufferSource(); hs.buffer = v.harmony; hs.connect(chain.harmonyIn); startVoice(hs, 0.05, lead, fx, v.harmony); }
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

/** Which sound a song plays with: the engineer's mix once one is back, unless you kept your rough. */
export function soundOf(song: { vocalFx?: VocalFx; engineerMix?: { fx: VocalFx; status: string } }): VocalFx {
  const m = song.engineerMix;
  if (m && m.status !== 'rough') return m.fx;
  return song.vocalFx ?? DEFAULT_FX;
}

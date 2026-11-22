// Reproduces "non-finite AudioParam" errors without a browser.
// A fake Web Audio context throws exactly like Chrome does when a NaN/Infinity
// reaches an AudioParam, then renders many beats through BeatPlayer.scheduleAll.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const out = path.resolve('_test/.beat.bundle.mjs');
await build({ entryPoints: ['src/audio/beat.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'silent' });
const { BeatPlayer, beatSpecFor } = await import(pathToFileURL(out).href);

const fin = (v, what) => { if (!Number.isFinite(v)) throw new TypeError(`non-finite AudioParam: ${what} = ${v}`); };
class Param {
  constructor(n, v = 0) { this.n = n; this._v = v; }
  get value() { return this._v; }
  set value(v) { fin(v, `${this.n}.value`); this._v = v; }
  setValueAtTime(v, t) { fin(v, `${this.n}.setValueAtTime value`); fin(t, `${this.n}.setValueAtTime time`); return this; }
  linearRampToValueAtTime(v, t) { fin(v, `${this.n}.linearRamp value`); fin(t, `${this.n}.linearRamp time`); return this; }
  exponentialRampToValueAtTime(v, t) { fin(v, `${this.n}.expRamp value`); fin(t, `${this.n}.expRamp time`); return this; }
  setTargetAtTime(v, t, c) { fin(v, `${this.n}.setTarget value`); fin(t, `${this.n}.setTarget time`); fin(c, `${this.n}.setTarget tc`); return this; }
}
class Node { connect(x) { return x; } disconnect() {} }
class Gain extends Node { gain = new Param('gain', 1); }
class Filter extends Node { type = 'lowpass'; frequency = new Param('freq', 350); Q = new Param('Q', 1); gain = new Param('fgain'); }
class Comp extends Node { threshold = new Param('thr'); knee = new Param('knee'); ratio = new Param('ratio'); attack = new Param('att'); release = new Param('rel'); }
class Osc extends Node { type = 'sine'; frequency = new Param('osc.freq', 440); detune = new Param('detune'); start(t) { fin(t, 'osc.start'); } stop(t) { fin(t, 'osc.stop'); } }
class Src extends Node { buffer = null; playbackRate = new Param('playbackRate', 1); start(t, o) { fin(t, 'src.start'); if (o !== undefined) fin(o, 'src.offset'); } stop(t) { fin(t, 'src.stop'); } }
class Ctx {
  sampleRate = 44100; currentTime = 0; destination = new Node();
  createGain() { return new Gain(); } createBiquadFilter() { return new Filter(); }
  createDynamicsCompressor() { return new Comp(); } createOscillator() { return new Osc(); }
  createBufferSource() { return new Src(); }
  createBuffer(c, len) { const d = new Float32Array(len); return { getChannelData: () => d }; }
}
globalThis.window = globalThis;

const genres = ['hip_hop', 'trap', 'drill', 'afrobeats', 'amapiano', 'dancehall', 'rnb', 'highlife', 'boom bap', 'gospel', 'alte', 'pop'];
const qualities = [20, 45, 60, 70, 85, 99];
const errors = new Map();
let runs = 0;
for (const g of genres) for (const q of qualities) for (let i = 0; i < 6; i++) {
  const spec = beatSpecFor(g, undefined, `seed-${g}-${q}-${i}`, q, `producer-${i}`);
  try { new BeatPlayer(new Ctx(), spec, new Node(), 0.8, 0).scheduleAll(0, 120); }
  catch (e) { const k = String(e.message); errors.set(k, (errors.get(k) ?? 0) + 1); }
  runs++;
}
console.log(`${runs} beats rendered, ${[...errors.values()].reduce((a, b) => a + b, 0)} failed`);
for (const [k, n] of errors) console.log(` ${n}x  ${k}`);
process.exit(errors.size ? 1 : 0);

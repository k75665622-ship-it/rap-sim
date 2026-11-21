// ─── EDITING TAKES: punch-ins and layers ───────────────────────────────────
// Everything works on the mono voice, lined up on the main take's timeline
// (second 0 of a layer is second 0 of the take).

import { wav, levelFor } from './vocalfx';

export const LAYER_KINDS = { adlib: { label: 'Ad-libs', emoji: '🗣️', gain: 0.55 }, harmony: { label: 'Harmony', emoji: '🎼', gain: 0.7 } } as const;
export type LayerKind = keyof typeof LAYER_KINDS;

const mono = (b: AudioBuffer) => b.getChannelData(0);
const XF = 0.01; // 10 ms crossfade so a join never clicks

/** Drop `fresh` into `old` starting `at` seconds in — a punch-in. What comes after the new part is kept. */
export function splice(ctx: BaseAudioContext, old: AudioBuffer, fresh: AudioBuffer, at: number): AudioBuffer {
  const sr = old.sampleRate;
  const a = Math.max(0, Math.round(at * sr));
  const o = mono(old), n = mono(fresh);
  const len = Math.max(o.length, a + n.length);
  const out = ctx.createBuffer(1, len, sr);
  const d = out.getChannelData(0);
  d.set(o.subarray(0, Math.min(o.length, len)));
  const xf = Math.round(XF * sr);
  for (let i = 0; i < n.length; i++) {
    const j = a + i;
    let w = 1;
    if (i < xf) w = i / xf; else if (i > n.length - xf) w = (n.length - i) / xf;
    d[j] = (j < o.length ? o[j] : 0) * (1 - w) + n[i] * w;
  }
  return out;
}

/** Put a freshly recorded layer on the main take's timeline: `shift` seconds from the take's start, cut to `length` samples. */
export function alignLayer(ctx: BaseAudioContext, layer: AudioBuffer, shift: number, length: number): AudioBuffer {
  const sr = layer.sampleRate;
  const s = Math.round(shift * sr);
  const l = mono(layer);
  const out = ctx.createBuffer(1, length, sr);
  const d = out.getChannelData(0);
  for (let i = 0; i < l.length; i++) { const j = i + s; if (j >= 0 && j < length) d[j] = l[i]; }
  return out;
}

/** The take with its layers folded in — what gets saved as the song's vocal. */
export function bake(ctx: BaseAudioContext, main: AudioBuffer, layers: { buf: AudioBuffer; kind: LayerKind }[]): AudioBuffer {
  const out = ctx.createBuffer(1, main.length, main.sampleRate);
  const d = out.getChannelData(0);
  d.set(mono(main));
  const base = levelFor(main);
  for (const l of layers) {
    const g = LAYER_KINDS[l.kind].gain * (levelFor(l.buf) / Math.max(1e-6, base));
    const x = mono(l.buf);
    for (let i = 0; i < Math.min(x.length, d.length); i++) d[i] += x[i] * g;
  }
  let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0.98) { const k = 0.98 / peak; for (let i = 0; i < d.length; i++) d[i] *= k; }
  return out;
}

export const toWav = (b: AudioBuffer): Blob => wav(b);

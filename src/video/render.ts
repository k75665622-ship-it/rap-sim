// Draws an Edit onto a canvas, and records it. Preview and export share one
// code path: the audio clock drives the picture, so what you see is what is
// printed. Export is real-time (MediaRecorder), so a 20s video takes ~20s.
import { BeatPlayer, type BeatSpec } from '../audio/beat';
import { createBus, DEFAULT_FX, prepareVocal, renderSongBuffer } from '../audio/vocalfx';
import type { VocalFx } from '../types/game';
import { cutSec, startOf, totalSec, type Cut, type Edit, type Filter } from './edl';
import { ANGLE_SEC } from '../world/shootcam';
import type { Shoot } from './clipstore';

/** Decoded frames, kept in a small LRU so four angles of JPEGs never sit in memory at once. */
export class FrameBank {
  private cache = new Map<string, ImageBitmap>();
  private pending = new Map<string, Promise<ImageBitmap>>();
  constructor(public shoot: Shoot, private max = 70) {}
  get w() { return this.shoot.meta.w; }
  get h() { return this.shoot.meta.h; }
  index(angle: number, u: number): number {
    const n = this.shoot.frames[angle]?.length ?? 1;
    // ping-pong so a cut longer than the angle's coverage plays forward then back
    const d = ANGLE_SEC;
    let x = ((u % (2 * d)) + 2 * d) % (2 * d);
    if (x > d) x = 2 * d - x;
    return Math.max(0, Math.min(n - 1, Math.floor((x / d) * n)));
  }
  peek(angle: number, i: number): ImageBitmap | null {
    const k = `${angle}:${i}`; const b = this.cache.get(k);
    if (b) { this.cache.delete(k); this.cache.set(k, b); }
    return b ?? null;
  }
  ready(angle: number, i: number): Promise<ImageBitmap> {
    const k = `${angle}:${i}`;
    const hit = this.peek(angle, i); if (hit) return Promise.resolve(hit);
    let p = this.pending.get(k);
    if (!p) {
      const blob = this.shoot.frames[angle]?.[i];
      p = (blob ? createImageBitmap(blob) : Promise.reject(new Error('no frame'))).then((b) => {
        this.cache.set(k, b); this.pending.delete(k);
        while (this.cache.size > this.max) { const old = this.cache.keys().next().value as string; this.cache.get(old)?.close(); this.cache.delete(old); }
        return b;
      });
      this.pending.set(k, p);
    }
    return p;
  }
  /** Which (angle, frame) pairs the picture at time t needs. */
  need(e: Edit, t: number): [number, number][] {
    const out: [number, number][] = [];
    const { i, lt } = locate(e, t);
    const c = e.cuts[i];
    out.push([c.angle, this.index(c.angle, c.from + lt)]);
    if (i > 0 && lt < 0.6) { const p = e.cuts[i - 1]; out.push([p.angle, this.index(p.angle, p.from + cutSec(e, p) + lt)]); }
    return out;
  }
  close() { this.cache.forEach((b) => b.close()); this.cache.clear(); }
}

export function locate(e: Edit, t: number): { i: number; lt: number } {
  let acc = 0;
  for (let i = 0; i < e.cuts.length; i++) {
    const d = cutSec(e, e.cuts[i]);
    if (t < acc + d || i === e.cuts.length - 1) return { i, lt: Math.max(0, t - acc) };
    acc += d;
  }
  return { i: 0, lt: 0 };
}

const LOOK: Record<Filter, { css: string; tint?: [string, number, GlobalCompositeOperation]; scan?: boolean }> = {
  none: { css: 'none' },
  noir: { css: 'grayscale(1) contrast(1.25) brightness(0.95)' },
  vhs: { css: 'saturate(1.3) contrast(1.05) blur(0.4px)', tint: ['#ff2a6d', 0.1, 'screen'], scan: true },
  film: { css: 'sepia(0.28) contrast(1.1) saturate(1.1)', tint: ['#ffb36b', 0.08, 'soft-light'] },
  neon: { css: 'saturate(1.5) contrast(1.15)', tint: ['#7a2bff', 0.22, 'soft-light'] },
  sunset: { css: 'saturate(1.25) contrast(1.05)', tint: ['#ff7a2f', 0.22, 'soft-light'] },
  cold: { css: 'saturate(0.8) contrast(1.15)', tint: ['#2f7bff', 0.2, 'soft-light'] },
  pop: { css: 'saturate(1.7) contrast(1.1) brightness(1.05)' },
};
const ease = (x: number) => x * x * (3 - 2 * x);
let noise: HTMLCanvasElement | null = null;
function grainTile(): HTMLCanvasElement {
  if (noise) return noise;
  noise = document.createElement('canvas'); noise.width = noise.height = 128;
  const g = noise.getContext('2d')!; const d = g.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return noise;
}

function drawCut(g: CanvasRenderingContext2D, e: Edit, bank: FrameBank, c: Cut, lt: number, w: number, h: number, extra = 1) {
  const i = bank.index(c.angle, c.from + lt);
  const img = bank.peek(c.angle, i);
  if (!img) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); return; }
  const dur = cutSec(e, c);
  const k = c.move === 'in' ? 1 + 0.14 * (lt / dur) : c.move === 'out' ? 1.14 - 0.14 * (lt / dur) : 1;
  const s = k * extra;
  g.save();
  g.translate(w / 2, h / 2); g.scale(s, s);
  const look = LOOK[c.filter ?? e.filter];
  if (look.css !== 'none' && 'filter' in g) g.filter = look.css;
  g.drawImage(img, -w / 2, -h / 2, w, h);
  g.restore();
  if ('filter' in g) g.filter = 'none';
}

/** Draw the picture at time t. Frames not yet decoded hold the black/previous frame. */
export function drawEdit(g: CanvasRenderingContext2D, e: Edit, bank: FrameBank, t: number) {
  const w = g.canvas.width, h = g.canvas.height;
  const { i, lt } = locate(e, t);
  const c = e.cuts[i];
  const bs = 60 / e.bpm;
  const tl = Math.min(0.5, bs * 0.75);
  const p = i > 0 && c.trans !== 'cut' ? Math.min(1, lt / (c.trans === 'flash' ? 0.25 : tl)) : 1;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const prev = i > 0 ? e.cuts[i - 1] : null;
  const prevLt = prev ? cutSec(e, prev) + lt : 0;
  if (p >= 1 || !prev) {
    if (i === 0 && c.trans === 'fade') g.globalAlpha = Math.min(1, lt / 0.6);
    drawCut(g, e, bank, c, lt, w, h); g.globalAlpha = 1;
  } else if (c.trans === 'fade') {
    drawCut(g, e, bank, prev, prevLt, w, h);
    g.globalAlpha = ease(p); drawCut(g, e, bank, c, lt, w, h); g.globalAlpha = 1;
  } else if (c.trans === 'flash') {
    drawCut(g, e, bank, c, lt, w, h);
    g.fillStyle = `rgba(255,255,255,${(1 - p) * 0.95})`; g.fillRect(0, 0, w, h);
  } else if (c.trans === 'whip') {
    const q = ease(p);
    g.save(); g.translate(-q * w * 0.5, 0); if ('filter' in g) g.filter = `blur(${Math.round((1 - q) * 14)}px)`; drawCut(g, e, bank, prev, prevLt, w, h); g.restore();
    g.save(); g.translate((1 - q) * w, 0); if ('filter' in g) g.filter = `blur(${Math.round((1 - q) * 14)}px)`; drawCut(g, e, bank, c, lt, w, h); g.restore();
    if ('filter' in g) g.filter = 'none';
  } else if (c.trans === 'zoom') {
    drawCut(g, e, bank, prev, prevLt, w, h, 1 + p * 0.5);
    g.globalAlpha = ease(p); drawCut(g, e, bank, c, lt, w, h, 1.45 - p * 0.45); g.globalAlpha = 1;
  } else { // glitch
    drawCut(g, e, bank, c, lt, w, h);
    const seed = Math.floor(t * 30);
    for (let n = 0; n < 7; n++) {
      const y = ((seed * 37 + n * 61) % 100) / 100 * h, hh = h * 0.05 + ((seed + n * 7) % 5) * 4, dx = (((seed * 13 + n * 29) % 40) - 20) * (1 - p) * 2;
      g.drawImage(g.canvas, 0, y, w, hh, dx, y, w, hh);
    }
    g.fillStyle = `rgba(255,0,80,${(1 - p) * 0.2})`; g.fillRect(0, 0, w, h);
  }
  // filter tint, scanlines, grain, vignette
  const look = LOOK[e.filter];
  if (look.tint) { g.globalCompositeOperation = look.tint[2]; g.globalAlpha = look.tint[1] * 3; g.fillStyle = look.tint[0]; g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  if (look.scan) { g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1.5); }
  if (e.grain || e.filter === 'film' || e.filter === 'vhs') {
    g.globalAlpha = 0.09; g.globalCompositeOperation = 'overlay';
    g.drawImage(grainTile(), -Math.random() * 128, -Math.random() * 128, w + 128, h + 128);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  // per-cut caption, pops in on the beat
  const fs = Math.round(Math.min(w, h) * 0.085);
  if (c.text?.trim()) {
    const pop = Math.min(1, lt / 0.18), sc = 0.8 + 0.2 * ease(pop);
    g.save(); g.translate(w / 2, h * 0.78); g.scale(sc, sc); g.globalAlpha = pop;
    g.font = `900 ${fs}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = fs * 0.14; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineJoin = 'round'; g.strokeText(c.text.toUpperCase(), 0, 0);
    g.fillStyle = '#fff'; g.fillText(c.text.toUpperCase(), 0, 0); g.restore();
  }
  // title lower-third for the first 3 seconds
  if (e.title.trim() && t < 3.2) {
    const a = Math.min(1, t / 0.4) * Math.min(1, (3.2 - t) / 0.4);
    g.globalAlpha = a; g.fillStyle = '#ffb020'; g.fillRect(w * 0.06, h * 0.80, w * 0.012, fs * 1.2);
    g.fillStyle = '#fff'; g.font = `800 ${Math.round(fs * 0.75)}px system-ui, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(e.title, w * 0.09, h * 0.80); g.globalAlpha = 1;
  }
  // end card over the last two seconds
  const total = totalSec(e);
  if (e.endCard.trim() && t > total - 2) {
    const a = Math.min(1, (t - (total - 2)) / 0.5);
    g.fillStyle = `rgba(0,0,0,${a * 0.6})`; g.fillRect(0, 0, w, h);
    g.globalAlpha = a; g.fillStyle = '#fff'; g.font = `900 ${Math.round(fs * 1.1)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(e.endCard.toUpperCase(), w / 2, h / 2); g.globalAlpha = 1;
  }
  if (e.bars) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h * 0.07); g.fillRect(0, h * 0.93, w, h * 0.07); }
  void startOf;
}

/** The song's audio for the video: the beat, with your vocal if there is a take. */
export async function videoAudio(spec: BeatSpec, seconds: number, take?: { blob: Blob; lead: number; fx?: VocalFx; hookBars?: number[] } | null): Promise<AudioBuffer> {
  const sr = 44100;
  if (take) {
    try {
      const tmp = new AudioContext();
      const buf = await tmp.decodeAudioData(await take.blob.arrayBuffer());
      const fx = take.fx ?? DEFAULT_FX;
      const v = await prepareVocal(tmp, buf, fx, { root: spec.root, major: spec.major }, take.hookBars);
      const full = await renderSongBuffer(spec, v, fx, take.lead, take.hookBars);
      tmp.close().catch(() => {});
      return full;
    } catch { /* fall through to the beat alone */ }
  }
  const oc = new OfflineAudioContext(2, Math.ceil(sr * (seconds + 1)), sr);
  const bus = createBus(oc, oc.destination, 0);
  new BeatPlayer(oc, spec, bus, 0.8).scheduleAll(0.05, seconds + 0.5);
  return oc.startRendering();
}

export interface Run { stop(): void; done: Promise<Blob | null> }

/** Play the edit on `canvas` against `audio`. With `record`, also capture it to a video file. */
export function runEdit(o: { canvas: HTMLCanvasElement; edit: Edit; bank: FrameBank; audio: AudioBuffer; record?: boolean; offset?: number; onTime?: (t: number) => void; onEnd?: () => void }): Run {
  const { canvas, edit, bank } = o;
  const g = canvas.getContext('2d')!;
  const ctx = new AudioContext();
  ctx.resume().catch(() => {});
  const total = totalSec(edit);
  const src = ctx.createBufferSource(); src.buffer = o.audio;
  const gain = ctx.createGain(); gain.gain.value = 1;
  src.connect(gain); gain.connect(ctx.destination);
  let rec: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  let mime = 'video/webm';
  if (o.record && typeof MediaRecorder !== 'undefined' && (canvas as HTMLCanvasElement & { captureStream?: unknown }).captureStream) {
    const dest = ctx.createMediaStreamDestination(); gain.connect(dest);
    const vs = canvas.captureStream(30);
    const stream = new MediaStream([...vs.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
  }
  let stopped = false, finish: (b: Blob | null) => void = () => {};
  const done = new Promise<Blob | null>((r) => { finish = r; });
  const t0 = ctx.currentTime + 0.12;
  src.start(t0, 0.05 + Math.max(0, o.offset ?? 0));
  rec?.start(250);
  const end = () => {
    if (stopped) return; stopped = true;
    try { src.stop(); } catch { /* done */ }
    const wrap = () => { ctx.close().catch(() => {}); o.onEnd?.(); };
    if (rec && rec.state !== 'inactive') { rec.onstop = () => { wrap(); finish(new Blob(chunks, { type: mime.split(';')[0] })); }; rec.stop(); }
    else { wrap(); finish(null); }
  };
  let busy = false;
  const tick = async () => {
    if (stopped) return;
    const t = Math.max(0, ctx.currentTime - t0);
    if (t >= total) { end(); return; }
    if (!busy) {
      busy = true;
      try { await Promise.all(bank.need(edit, t).map(([a, i]) => bank.ready(a, i))); } catch { /* hold */ }
      if (!stopped) { drawEdit(g, edit, bank, Math.max(0, ctx.currentTime - t0)); o.onTime?.(t); }
      busy = false;
    }
    window.setTimeout(tick, 1000 / 30);
  };
  tick();
  return { stop: end, done };
}

/** Draw one still of the edit (for scrubbing / thumbnails). */
export async function stillAt(canvas: HTMLCanvasElement, edit: Edit, bank: FrameBank, t: number) {
  await Promise.all(bank.need(edit, t).map(([a, i]) => bank.ready(a, i))).catch(() => {});
  drawEdit(canvas.getContext('2d')!, edit, bank, t);
}

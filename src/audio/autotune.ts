// ─── AUTO-TUNE ─────────────────────────────────────────────────────────────
// Real pitch correction. Every 10 ms the pitch of your voice is measured
// (YIN), pulled toward the nearest note in the beat's key, and the vocal is
// rebuilt one pitch period at a time (TD-PSOLA) so the timing never moves.
// A little, slowly, is invisible polish; all of it at full speed is the hard,
// robotic sound. The same engine makes a harmony: every note moved up two
// steps of the scale.

export interface TuneOpts { root: number; major: boolean; amount: number; speed: number; degrees?: number }

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const yieldUI = () => new Promise<void>((r) => setTimeout(r, 0));

interface Track { D: number; H: number; W: number; f0: Float32Array; voiced: Uint8Array }

async function pitchTrack(x: Float32Array, sr: number, onProgress?: (p: number) => void): Promise<Track> {
  const D = Math.max(1, Math.round(sr / 16000));
  const fs = sr / D;
  const n = Math.floor(x.length / D);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < D; j++) s += x[i * D + j]; y[i] = s / D; }
  const W = Math.round(fs * 0.025);
  const H = Math.round(fs * 0.01);
  const tMin = Math.floor(fs / 600);
  const tMax = Math.ceil(fs / 70);
  const frames = Math.max(0, Math.floor((n - W - tMax) / H));
  const f0 = new Float32Array(frames);
  const voiced = new Uint8Array(frames);
  const rms = new Float32Array(frames);
  const d = new Float32Array(tMax + 2);
  for (let f = 0; f < frames; f++) {
    const s = f * H;
    let e = 0; for (let j = 0; j < W; j++) e += y[s + j] * y[s + j];
    rms[f] = Math.sqrt(e / W);
    // Difference function, then the cumulative-mean-normalised version.
    let run = 0; d[0] = 1;
    let best = -1;
    for (let tau = 1; tau <= tMax; tau++) {
      let acc = 0;
      for (let j = 0; j < W; j++) { const v = y[s + j] - y[s + j + tau]; acc += v * v; }
      run += acc;
      d[tau] = run > 0 ? (acc * tau) / run : 1;
    }
    for (let tau = tMin; tau <= tMax; tau++) {
      if (d[tau] < 0.15) { while (tau + 1 <= tMax && d[tau + 1] < d[tau]) tau++; best = tau; break; }
    }
    if (best < 0) {
      let m = tMin; for (let tau = tMin; tau <= tMax; tau++) if (d[tau] < d[m]) m = tau;
      if (d[m] < 0.3) best = m;
    }
    if (best > 0) {
      // Parabolic interpolation for a finer period.
      const a = d[best - 1] ?? d[best]; const b = d[best]; const c = d[best + 1] ?? d[best];
      const den = a - 2 * b + c;
      const t = den !== 0 ? best + (0.5 * (a - c)) / den : best;
      f0[f] = fs / t;
      voiced[f] = 1;
    }
    if (f % 300 === 299) { onProgress?.(f / frames * 0.7); await yieldUI(); }
  }
  // Silence isn't a note.
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const gate = Math.max(0.004, Math.min((sorted[Math.floor(sorted.length * 0.2)] ?? 0) * 2.5, (sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 0.3));
  for (let f = 0; f < frames; f++) if (rms[f] < gate) voiced[f] = 0;
  // A median over five frames kills the odd octave jump.
  const g = new Float32Array(f0);
  for (let f = 2; f < frames - 2; f++) {
    if (!voiced[f]) continue;
    const win = [f0[f - 2], f0[f - 1], f0[f], f0[f + 1], f0[f + 2]].filter((_v, k) => voiced[f - 2 + k]).sort((a, b) => a - b);
    const med = win[Math.floor(win.length / 2)];
    let v = f0[f];
    if (v > med * 1.7) v /= 2; else if (v < med * 0.6) v *= 2;
    g[f] = v;
  }
  return { D, H, W, f0: g, voiced };
}

/** Semitones to move each frame so it lands where it should. */
function shifts(tr: Track, o: TuneOpts): Float32Array {
  const scale = o.major ? MAJ : MIN;
  const inKey = (nn: number) => scale.includes((((nn - o.root) % 12) + 12) % 12);
  const out = new Float32Array(tr.f0.length);
  const k = 0.04 + Math.pow(Math.max(0, Math.min(100, o.speed)) / 100, 2) * 0.96;
  const amt = Math.max(0, Math.min(100, o.amount)) / 100;
  let s = 0;
  for (let f = 0; f < tr.f0.length; f++) {
    if (!tr.voiced[f] || !(tr.f0[f] > 0)) { s += (0 - s) * 0.3; out[f] = 0; continue; }
    const m = 69 + 12 * Math.log2(tr.f0[f] / 440);
    let target = Math.round(m); let bd = 99;
    for (let nn = Math.floor(m) - 2; nn <= Math.ceil(m) + 2; nn++) if (inKey(nn) && Math.abs(nn - m) < bd) { bd = Math.abs(nn - m); target = nn; }
    if (o.degrees) { let left = Math.abs(o.degrees); const dir = Math.sign(o.degrees); while (left > 0) { target += dir; if (inKey(target)) left--; } }
    const want = (target - m) * (o.degrees ? 1 : amt);
    s += (want - s) * (o.degrees ? 0.5 : k);
    out[f] = s;
  }
  return out;
}

function psola(x: Float32Array, sr: number, tr: Track, semis: Float32Array): Float32Array {
  const N = x.length;
  const frameAt = (t: number) => Math.max(0, Math.min(tr.f0.length - 1, Math.round((t / tr.D - tr.W / 2) / tr.H)));
  const marks: number[] = []; const periods: number[] = []; const vox: boolean[] = [];
  const quiet = Math.round(sr * 0.005);
  let t = 0;
  while (t < N) {
    const fi = frameAt(t);
    if (tr.f0.length && tr.voiced[fi] && tr.f0[fi] > 0) {
      const P = Math.max(16, Math.round(sr / tr.f0[fi]));
      let best = t; let bv = -Infinity;
      const lo = Math.max(0, t - (P >> 2)); const hi = Math.min(N - 1, t + (P >> 2));
      for (let j = lo; j <= hi; j++) if (x[j] > bv) { bv = x[j]; best = j; }
      if (marks.length && best <= marks[marks.length - 1] + (P >> 1)) best = marks[marks.length - 1] + P;
      if (best >= N) break;
      marks.push(best); periods.push(P); vox.push(true); t = best + P;
    } else { marks.push(t); periods.push(quiet); vox.push(false); t += quiet; }
  }
  const pad = 4096;
  const y = new Float32Array(N + pad);
  const norm = new Float32Array(N + pad);
  if (!marks.length) return x;
  let ts = marks[0]; let k = 0;
  while (ts < N) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - ts) <= Math.abs(marks[k] - ts)) k++;
    const P = periods[k]; const m = marks[k];
    const r = vox[k] ? Math.pow(2, semis[frameAt(m)] / 12) : 1;
    const at = Math.round(ts);
    for (let j = -P; j <= P; j++) {
      const si = m + j; const di = at + j;
      if (si < 0 || si >= N || di < 0 || di >= y.length) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / P);
      y[di] += x[si] * w; norm[di] += w;
    }
    ts += P / r;
  }
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = y[i] / Math.max(1, norm[i]);
  return out;
}

const cache = new WeakMap<AudioBuffer, Map<string, Promise<AudioBuffer>>>();
const tracks = new WeakMap<AudioBuffer, Promise<Track>>();

/** Tune a recorded vocal into the beat's key. Cached per take and setting. */
export function tuneBuffer(ctx: BaseAudioContext, buf: AudioBuffer, o: TuneOpts, onProgress?: (p: number) => void): Promise<AudioBuffer> {
  const key = `${o.root}|${o.major}|${Math.round(o.amount)}|${Math.round(o.speed)}|${o.degrees ?? 0}`;
  let m = cache.get(buf);
  if (!m) { m = new Map(); cache.set(buf, m); }
  const hit = m.get(key);
  if (hit) return hit;
  const job = (async () => {
    const x = buf.getChannelData(0);
    let tr = tracks.get(buf);
    if (!tr) { tr = pitchTrack(x, buf.sampleRate, onProgress); tracks.set(buf, tr); }
    const t = await tr;
    onProgress?.(0.8);
    await yieldUI();
    const y = psola(x, buf.sampleRate, t, shifts(t, o));
    const out = ctx.createBuffer(1, y.length, buf.sampleRate);
    out.getChannelData(0).set(y);
    onProgress?.(1);
    return out;
  })();
  m.set(key, job);
  return job;
}

/** For tests: the pitch of a buffer over time. */
export async function measurePitch(buf: AudioBuffer): Promise<number[]> {
  const t = await pitchTrack(buf.getChannelData(0), buf.sampleRate);
  return Array.from(t.f0).filter((_, i) => t.voiced[i]);
}

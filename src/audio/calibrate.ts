// ─── VOX SETUP: headphone check + latency calibration ─────────────────────
// Headphone check: play a short tone and listen on the mic. If the mic hears
// it, the beat is coming out of the speakers and will bleed into your vocal.
// Latency: tap along to a click; how late your taps land is how late the
// whole chain (output, Bluetooth, you) runs. Saved on this device.

const KEY = 'rl_vox_cal_v1';
const DONE = 'rl_vox_setup_v1';

export interface Calibration { ms: number; at: number; headphones?: boolean }

export function loadCalibration(): Calibration | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v.ms === 'number' ? v : null; } catch { return null; }
}
export function saveCalibration(c: Calibration) { try { localStorage.setItem(KEY, JSON.stringify(c)); localStorage.setItem(DONE, '1'); } catch { /* storage blocked */ } }
export function clearCalibration() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function setupSeen(): boolean { try { return localStorage.getItem(DONE) === '1'; } catch { return true; } }
export function markSetupSeen() { try { localStorage.setItem(DONE, '1'); } catch { /* ignore */ } }

/** The voice-timing nudge (ms, negative = earlier) this device needs. Small delays are already handled, so only a real lag counts. */
export function calibrationNudge(): number {
  const c = loadCalibration();
  if (!c || c.ms < 60) return 0;
  return -Math.min(300, Math.round(c.ms / 10) * 10);
}

const rms = (a: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, a.length)); };

/** Plays three tone bursts and listens. `heard` is how much louder the room got while the tone played. */
export async function headphoneCheck(ctx: AudioContext): Promise<{ ok: boolean; heard: number; micDenied?: boolean }> {
  let stream: MediaStream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
  catch { return { ok: false, heard: 0, micDenied: true }; }
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    const an = ctx.createAnalyser(); an.fftSize = 2048;
    const src = ctx.createMediaStreamSource(stream); src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const samples: { t: number; v: number }[] = [];
    const t0 = ctx.currentTime;
    const poll = window.setInterval(() => { an.getFloatTimeDomainData(buf); samples.push({ t: ctx.currentTime - t0, v: rms(buf) }); }, 40);
    // quiet for 0.4s, then 3 bursts of 0.3s with 0.2s gaps
    const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1000; o.connect(g); o.start(t0 + 0.4);
    for (let i = 0; i < 3; i++) { const a = t0 + 0.4 + i * 0.5; g.gain.setValueAtTime(0.6, a); g.gain.setValueAtTime(0, a + 0.3); }
    o.stop(t0 + 2.1);
    await new Promise((r) => window.setTimeout(r, 2300));
    window.clearInterval(poll); src.disconnect();
    const base = samples.filter((s) => s.t < 0.35).map((s) => s.v);
    const loud = samples.filter((s) => [0, 1, 2].some((i) => s.t > 0.55 + i * 0.5 && s.t < 0.65 + i * 0.5)).map((s) => s.v);
    const b = base.reduce((a, c) => a + c, 0) / Math.max(1, base.length);
    const l = loud.reduce((a, c) => a + c, 0) / Math.max(1, loud.length);
    const heard = l / Math.max(0.002, b);
    return { ok: heard < 3.5, heard: Math.round(heard * 10) / 10 };
  } finally { stream.getTracks().forEach((t) => t.stop()); }
}

/** Schedules `n` clicks at `bpm`; returns when each lands on the audio clock. */
export function playClicks(ctx: AudioContext, n: number, bpm: number): { times: number[]; stop: () => void } {
  const step = 60 / bpm;
  const start = ctx.currentTime + 0.6;
  const times: number[] = [];
  const nodes: OscillatorNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = start + i * step;
    times.push(t);
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = i % 4 === 0 ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.09);
    nodes.push(o);
  }
  return { times, stop: () => nodes.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } }) };
}

/** Median tap offset (ms) against the clicks, ignoring the first two warm-up taps. */
export function medianOffset(taps: number[], clicks: number[]): number | null {
  const off: number[] = [];
  taps.forEach((t) => {
    let best = clicks[0], d = Infinity;
    clicks.forEach((c) => { const x = Math.abs(t - c); if (x < d) { d = x; best = c; } });
    if (d < 0.4) off.push((t - best) * 1000);
  });
  const use = off.slice(2);
  if (use.length < 3) return null;
  use.sort((a, b) => a - b);
  return Math.round(use[Math.floor(use.length / 2)]);
}

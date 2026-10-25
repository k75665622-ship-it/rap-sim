// ─── YOUR TAKE ─────────────────────────────────────────────────────────────
// Recordings stay on this device (IndexedDB). The score reads the audio
// itself: how much of the beat you actually rapped over, how consistently
// your words land on the beat's grid (independent of mic delay), and how
// steady your energy is.

const DB = 'rl-booth';
const STORE = 'takes';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveTake(songId: string, blob: Blob): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(blob, songId); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function loadTake(songId: string): Promise<Blob | null> {
  try {
    const db = await open();
    return await new Promise((res) => { const tx = db.transaction(STORE, 'readonly'); const q = tx.objectStore(STORE).get(songId); q.onsuccess = () => res((q.result as Blob) ?? null); q.onerror = () => res(null); });
  } catch { return null; }
}

export interface TakeScore { score: number; timing: number; presence: number; energy: number; seconds: number; phase: number; R: number }

export async function scoreTake(ctx: BaseAudioContext, buf: AudioBuffer, bpm: number): Promise<TakeScore> {
  const data = buf.getChannelData(0);
  const hop = Math.round(buf.sampleRate * 0.01);
  const rms: number[] = [];
  for (let i = 0; i + hop <= data.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += data[j] * data[j]; rms.push(Math.sqrt(s / hop)); }
  const sorted = [...rms].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
  const th = Math.max(0.012, floor * 3);
  const voiced = rms.filter((v) => v > th);
  const presence = rms.length ? voiced.length / rms.length : 0;
  // Onsets: where the voice jumps up.
  const onsets: number[] = [];
  let last = -99;
  for (let i = 3; i < rms.length; i++) {
    const prev = (rms[i - 1] + rms[i - 2] + rms[i - 3]) / 3;
    if (rms[i] > th && rms[i] > prev * 1.6 && i - last >= 8) { onsets.push(i * 0.01); last = i; }
  }
  // How consistently they land on the same spot of the 16th-note grid.
  const grid = 60 / bpm / 4;
  let cx = 0, cy = 0;
  for (const t of onsets) { const a = ((t % grid) / grid) * Math.PI * 2; cx += Math.cos(a); cy += Math.sin(a); }
  const R = onsets.length >= 6 ? Math.sqrt(cx * cx + cy * cy) / onsets.length : 0;
  const chance = onsets.length ? 1 / Math.sqrt(onsets.length) : 1;
  const timing = Math.round(Math.max(0, Math.min(1, (R - chance * 0.6) / (1 - chance * 0.6))) * 100);
  const mean = voiced.reduce((a, b) => a + b, 0) / Math.max(1, voiced.length);
  const sd = Math.sqrt(voiced.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, voiced.length));
  const energy = Math.round(Math.max(0, Math.min(100, 100 - (sd / Math.max(1e-6, mean)) * 55)));
  const pres = Math.round(Math.min(100, (presence / 0.6) * 100) * (presence > 0.95 ? 0.85 : 1));
  const score = presence < 0.12 ? Math.round(pres * 0.6) : Math.round(pres * 0.35 + (40 + timing * 0.6) * 0.45 + energy * 0.2);
  void ctx;
  // Where, on average, your words land inside a 16th — what an engineer uses to line the vocal up.
  let phase = Math.atan2(cy, cx) / (Math.PI * 2) * grid;
  if (phase < 0) phase += grid;
  return { score: Math.max(5, Math.min(99, score)), timing, presence: pres, energy, seconds: Math.round(buf.duration), phase, R };
}

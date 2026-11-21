// ─── THE SAMPLE KIT ────────────────────────────────────────────────────────
// Real drum hits and instrument notes (public/music/kit/, all CC0 from
// Freesound except the pad, which is CC BY 4.0 — credited on the Studio page).
// They load once, quietly, after the game opens. Until they are in (or if a
// file is missing, or the game is opened straight from a file), the beat
// engine falls back to the built-in synth sounds, so nothing ever breaks.

/** Real pitch of each pitched sample, in Hz (the file names carry the source's own note labels). */
const PITCH: Record<string, number> = { '808-C': 32.7, 'bell-C3': 261.63, 'pluck-C3': 130.81, 'pad-C3': 130.81, 'xylophone-C3': 1046.5 };
/** Peak of each file as shipped, so every hit can be levelled to the same loudness. */
const PEAK: Record<string, number> = { 'kick-1': 1, 'kick-2': 0.93, 'kick-3': 0.93, 'snare-1': 1, 'snare-2': 1, 'snare-3': 0.97, 'clap-1': 0.52, 'rim-1': 0.41, 'hat-closed-1': 0.26, 'hat-closed-2': 0.71, 'hat-open-1': 0.3, '808-C': 0.99, 'bell-C3': 0.29, 'pluck-C3': 0.19, 'pad-C3': 0.59, 'xylophone-C3': 0.71 };

const buffers = new Map<string, AudioBuffer>();
let loading: Promise<void> | null = null;

export function loadKit(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    if (typeof location === 'undefined' || location.protocol === 'file:' || typeof OfflineAudioContext === 'undefined') return;
    const dec = new OfflineAudioContext(1, 1, 44100);
    await Promise.all(Object.keys(PEAK).map(async (name) => {
      try {
        const res = await fetch(`music/kit/${name}.wav`);
        if (!res.ok) return;
        buffers.set(name, await dec.decodeAudioData(await res.arrayBuffer()));
      } catch { /* missing file: that sound stays synthesised */ }
    }));
  })();
  return loading;
}

export const kitHas = (name: string) => buffers.has(name);
export const kitPitch = (name: string) => PITCH[name] ?? 0;

/** One hit or note. `rate` re-pitches it, `gain` is on top of the levelled sample, `hold` fades it out after that many seconds. Returns false if the sample isn't loaded. */
export function playSample(ctx: BaseAudioContext, dest: AudioNode, name: string, t: number, o: { gain?: number; rate?: number; hold?: number; attack?: number; from?: number } = {}): boolean {
  const buf = buffers.get(name);
  if (!buf) return false;
  const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = o.rate ?? 1;
  // A slide: start lower (or higher) and glide into the note.
  if (o.from) { src.playbackRate.setValueAtTime((o.rate ?? 1) * o.from, t); src.playbackRate.exponentialRampToValueAtTime(o.rate ?? 1, t + 0.09); }
  const g = ctx.createGain();
  const peak = (o.gain ?? 1) * (0.9 / (PEAK[name] ?? 1));
  const a = o.attack ?? 0.002;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
  const len = buf.duration / (o.rate ?? 1);
  src.connect(g).connect(dest); src.start(t);
  if (o.hold !== undefined && o.hold < len) { g.gain.setValueAtTime(peak, t + o.hold); g.gain.exponentialRampToValueAtTime(0.0001, t + o.hold + 0.12); src.stop(t + o.hold + 0.15); }
  return true;
}

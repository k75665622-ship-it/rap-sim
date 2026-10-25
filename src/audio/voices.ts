// ─── REAL VOICES ───────────────────────────────────────────────────────────
// Kokoro: a small open text-to-speech model (Apache-2.0) that runs inside the
// browser. It is downloaded once, only when a player turns it on (roughly
// 80–90 MB), then cached by the browser. If it can't load, the game falls
// back to the phone's built-in voice.

type TTS = { generate: (text: string, o: { voice: string }) => Promise<{ audio?: Float32Array; data?: Float32Array; sampling_rate?: number; toBlob?: () => Blob }> };
let ttsPromise: Promise<TTS> | null = null;

export function voicesEnabled(): boolean { try { return localStorage.getItem('rl-voices') === 'ai'; } catch { return false; } }
export function setVoicesEnabled(on: boolean): void { try { localStorage.setItem('rl-voices', on ? 'ai' : 'robot'); } catch { /* private mode */ } }

export async function loadVoices(onProgress?: (pct: number) => void): Promise<TTS> {
  if (!ttsPromise) {
    ttsPromise = (async () => {
      const url = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm';
      const mod = await import(/* @vite-ignore */ url);
      return mod.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8', device: 'wasm',
        progress_callback: (p: { progress?: number }) => { if (typeof p?.progress === 'number') onProgress?.(Math.round(p.progress)); },
      }) as Promise<TTS>;
    })();
  }
  try { return await ttsPromise; } catch (e) { ttsPromise = null; throw e; }
}

const FEMALE = ['af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'af_nova', 'af_jessica', 'bf_emma', 'bf_isabella', 'bf_lily'];
const MALE = ['am_michael', 'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_onyx', 'am_puck', 'bm_george', 'bm_lewis', 'bm_daniel', 'bm_fable'];
export const VOICE_IDS = [...MALE, ...FEMALE];

/** Every person keeps the same voice. */
export function voiceFor(p: { id: string; gender?: string; voice?: string }): string {
  if (p.voice && VOICE_IDS.includes(p.voice)) return p.voice;
  let x = 0; for (let i = 0; i < p.id.length; i++) x = (x * 31 + p.id.charCodeAt(i)) >>> 0;
  const pool = p.gender === 'female' ? FEMALE : MALE;
  return pool[x % pool.length];
}

const cache = new Map<string, AudioBuffer>();
export async function renderLine(ctx: AudioContext, text: string, voice: string): Promise<AudioBuffer | null> {
  const key = `${voice}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tts = await loadVoices();
  const out = await tts.generate(text, { voice });
  let buf: AudioBuffer | null = null;
  const data = out.audio ?? out.data;
  if (data && data.length) {
    buf = ctx.createBuffer(1, data.length, out.sampling_rate ?? 24000);
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  } else if (out.toBlob) {
    buf = await ctx.decodeAudioData(await out.toBlob().arrayBuffer());
  }
  if (buf) { cache.set(key, buf); if (cache.size > 200) cache.delete(cache.keys().next().value as string); }
  return buf;
}

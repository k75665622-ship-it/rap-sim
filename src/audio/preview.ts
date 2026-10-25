// One beat plays at a time, anywhere in the game.
import { useSyncExternalStore } from 'react';
import { BeatPlayer, type BeatSpec } from './beat';

let ctx: AudioContext | null = null;
let player: BeatPlayer | null = null;
let current: string | null = null;
let line: string | null = null;
let timers: number[] = [];
let voice: AudioBufferSourceNode | null = null;
export interface SongLine { bar: number; text: string; pitch: number }
let timer: number | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function stopPreview(): void {
  player?.stop(); player = null;
  timers.forEach((t) => window.clearTimeout(t)); timers = [];
  try { voice?.stop(); } catch { /* done */ } voice = null;
  try { window.speechSynthesis?.cancel(); } catch { /* none */ }
  line = null;
  if (timer !== null) window.clearTimeout(timer); timer = null;
  current = null; emit();
}

/** Play (or stop) a beat. Previews run for 30 seconds. */
export function togglePreview(key: string, spec: BeatSpec, seconds = 30): void {
  if (current === key) { stopPreview(); return; }
  stopPreview();
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  player = new BeatPlayer(ctx, spec, ctx.destination, 0.8);
  player.start(ctx.currentTime + 0.05);
  current = key;
  timer = window.setTimeout(stopPreview, seconds * 1000);
  emit();
}

export function usePreviewing(): string | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current, () => null);
}

/**
 * Play a whole song: the beat, plus your recorded take or the written bars
 * performed by the device's voice (fictional people only).
 */
export async function playSong(key: string, spec: BeatSpec, o: { take?: Blob | null; lines?: SongLine[]; seconds?: number }): Promise<void> {
  if (current === key) { stopPreview(); return; }
  stopPreview();
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  const c = ctx;
  const at = c.currentTime + 0.1;
  player = new BeatPlayer(c, spec, c.destination, o.take ? 0.6 : 0.75);
  player.start(at);
  current = key;
  const bar = (60 / spec.bpm) * 4;
  if (o.take) {
    try {
      const buf = await c.decodeAudioData(await o.take.arrayBuffer());
      if (current !== key) return;
      const src = c.createBufferSource(); src.buffer = buf; src.connect(c.destination); src.start(at + bar); voice = src;
    } catch { /* play the beat alone */ }
  } else if (o.lines?.length) {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    for (const l of o.lines) {
      timers.push(window.setTimeout(() => {
        if (current !== key) return;
        line = l.text; emit();
        if (synth) { try { const u = new SpeechSynthesisUtterance(l.text); u.rate = 1.25; u.pitch = l.pitch; synth.cancel(); synth.speak(u); } catch { /* no voice */ } }
      }, (0.1 + l.bar * bar) * 1000));
    }
  }
  timer = window.setTimeout(stopPreview, (o.seconds ?? 90) * 1000);
  emit();
}

export function useNowLine(): string | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => line, () => null);
}

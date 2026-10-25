// One beat plays at a time, anywhere in the game.
import { useSyncExternalStore } from 'react';
import { BeatPlayer, type BeatSpec } from './beat';

let ctx: AudioContext | null = null;
let player: BeatPlayer | null = null;
let current: string | null = null;
let timer: number | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function stopPreview(): void {
  player?.stop(); player = null;
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

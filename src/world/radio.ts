// ─── THE CITY: CAR RADIO ───────────────────────────────────────────────────
//
// HOT 101.9 in your car: the songs on the charts where you live, 90 seconds
// each, one after another, like a real station's rotation. Every song is the
// game's own recording of it (or a real file, once one has been added — see
// audio/library.ts). Your own releases come round when they chart.

import { useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { findSong, playSongById, songKey, stopPreview } from '../audio/quickPlay';
import { nowPlaying, usePreviewing } from '../audio/preview';

export interface RadioState { on: boolean; songId: string | null; title: string; artist: string }

let state: RadioState = { on: false, songId: null, title: '', artist: '' };
/** The player switched it off: stays off until they switch it back on. */
let wanted = true;
let queue: string[] = [];
let history: string[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const setState = (p: Partial<RadioState>) => { state = { ...state, ...p }; emit(); };

export const STATION = 'HOT 101.9';

function buildQueue(): string[] {
  const s = useGameStore.getState();
  const country = s.player?.country;
  const chart = (country && s.charts?.[country]?.length ? s.charts[country] : Object.values(s.charts ?? {}).find((c) => c.length)) ?? [];
  let ids = chart.slice(0, 20).map((e) => e.songId);
  if (ids.length < 5) {
    const top = [...(s.npcSongs ?? [])].sort((a, b) => (b.totalStreams ?? 0) - (a.totalStreams ?? 0)).slice(0, 20).map((x) => x.id);
    ids = [...new Set([...ids, ...top])];
  }
  // Shuffle, but don't repeat the last few.
  const recent = new Set(history.slice(-4));
  const fresh = ids.filter((id) => !recent.has(id));
  for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
  return fresh.length ? fresh : ids;
}

async function playNext(): Promise<void> {
  if (!queue.length) queue = buildQueue();
  const id = queue.shift();
  if (!id) { setState({ on: false, songId: null }); return; }
  const song = findSong(id);
  if (!song) { void playNext(); return; }
  const s = useGameStore.getState();
  const artist = song.ownerId
    ? s.npcs.find((n) => n.id === song.ownerId)?.name ?? 'Unknown'
    : s.player?.artistName ?? 'You';
  history.push(id);
  if (history.length > 20) history = history.slice(-20);
  setState({ on: true, songId: id, title: song.title, artist });
  const thisId = id;
  await playSongById(id, { seconds: 90, onEnd: () => { if (state.on && state.songId === thisId) void playNext(); } });
}

export const radio = {
  get: () => state,
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
  /** You got in the car. */
  start() { if (wanted && !state.on) void playNext(); },
  /** You got out, or left the city. Keeps the player's on/off choice. */
  pause() {
    if (state.on && state.songId && nowPlaying() === songKey(state.songId)) stopPreview();
    setState({ on: false });
  },
  next() { wanted = true; void playNext(); },
  toggle() {
    if (state.on) { wanted = false; radio.pause(); } else { wanted = true; void playNext(); }
  },
};

/** The radio's state, and whether it is really the thing playing right now. */
export function useRadio(): RadioState & { live: boolean } {
  const r = useSyncExternalStore(radio.subscribe, radio.get);
  const playing = usePreviewing();
  // Something else took the speakers (a ▶ in the phone): the radio is quiet.
  const live = r.on && !!r.songId && playing === songKey(r.songId);
  return { ...r, live };
}

// ─── PLAY A SONG FROM ANYWHERE ─────────────────────────────────────────────
//
// One call to play any song in the game by id — the ▶ on a chart row, the car
// radio. It plays a real recording if one has been added (audio/library.ts);
// otherwise the song's own beat, with the artist's voice when AI voices are
// switched on. With AI voices off it plays as an instrumental rather than
// reading the bars out in the phone's robot voice.

import { useGameStore } from '../store/gameStore';
import { trackById } from '../store/musicSelectors';
import { beatSpecFor } from './beat';
import { soundOf } from './vocalfx';
import { playSong, stopPreview } from './preview';
import { voicesEnabled } from './voices';
import { realTrackFor } from './library';
import { songLines } from '../components/studio/Listen';
import { isRealId } from '../sim/realPeople';
import type { NPC, Song } from '../types/game';

/** The same key the Listen buttons use, so every play button agrees. */
export const songKey = (songId: string) => `song|${songId}|`;

export function findSong(songId: string): Song | undefined {
  const s = useGameStore.getState();
  return trackById(s, songId)?.song ?? s.songs.find((x) => x.id === songId) ?? s.npcSongs.find((x) => x.id === songId);
}

export async function playSongById(songId: string, o: { seconds?: number; onEnd?: () => void } = {}): Promise<boolean> {
  const song = findSong(songId);
  if (!song) return false;
  const s = useGameStore.getState();
  const owned = s.beats?.library?.find((b) => b.id === song.beatId || b.usedOnSongId === song.id);
  const spec = owned
    ? beatSpecFor(String(owned.genre), owned.bpm, owned.id, owned.quality, owned.producerId ?? owned.producerName, owned.mood)
    : beatSpecFor(String(song.genre), song.bpm, song.beatId ?? song.id, song.beatQuality ?? song.productionQuality ?? song.quality, song.producerId ?? song.producerName ?? song.ownerId, song.mood);
  const real = await realTrackFor(song);
  const instrumental = (song.ownerId ? isRealId(song.ownerId) : false) || !voicesEnabled();
  const lines = instrumental ? [] : songLines(song, s.npcs as NPC[], s.player?.id ?? 'player', s.player?.city ?? 'the city', undefined, s.songNotes?.[song.id]);
  await playSong(songKey(song.id), spec, { lines, seconds: o.seconds ?? 90, fx: soundOf(song), hookBars: song.hookBars, real, onEnd: o.onEnd });
  return true;
}

export { stopPreview };

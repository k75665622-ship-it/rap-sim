// ▶ Listen: any song in the game — the beat, plus your recorded take, or the
// written bars performed by the device's voice. Real artists play as an
// instrumental: the game never puts words or a voice on a real person.

import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { beatSpecFor } from '../../audio/beat';
import { playSong, usePreviewing, useNowLine, type SongLine } from '../../audio/preview';
import { loadTake } from '../../audio/take';
import { linesFor, hookFor } from '../../audio/lyrics';
import { defaultArrangement, PART_BARS } from '../../sim/arrangement';
import { isRealId } from '../../sim/realPeople';
import { cn } from '@/utils/cn';
import type { NPC, Song } from '../../types/game';
import type { SongNote } from '../../sim/songNotes';

export function songLines(song: Song, npcs: NPC[], playerId: string, city: string, only?: string, note?: SongNote): SongLine[] {
  const owner = song.ownerId ?? 'player';
  const guests = (song.featuredArtists ?? []).filter((id) => id !== owner);
  const arr = song.arrangement ?? (owner === 'player' ? defaultArrangement(guests) : defaultArrangement([]).map((s) => ({ ...s, who: s.who === 'player' ? owner : s.who })).concat(guests.map((g) => ({ part: 'verse' as const, who: g }))));
  const pitchOf = (who: string) => { if (who === 'player' || who === playerId) return 1; const n = npcs.find((x) => x.id === who); return n?.gender === 'female' ? 1.35 : 0.75 + ((who.length % 5) / 20); };
  const out: SongLine[] = [];
  let bar = 1;
  const own = (song.lyrics ?? '').split('\n').map((l) => l.trim()).filter((l) => l && !/^\[/.test(l));
  let ownAt = 0;
  for (const s of arr) {
    const who = s.who === 'player' && owner !== 'player' ? owner : s.who;
    const silent = isRealId(who) || (only && who !== only);
    if (!silent && (s.part === 'verse' || s.part === 'hook' || s.part === 'bridge')) {
      const ownerWords = note && who === owner;
      const lines = s.part === 'hook' ? (note?.hook.length ? [...note.hook, ...note.hook].slice(0, 4) : hookFor(`${song.id}|hook`, song.title)) : (who === 'player' && own.length ? own.slice(ownAt, ownAt + 8) : ownerWords && s.part === 'verse' ? note!.verse : linesFor(`${song.id}|${who}|${bar}`, s.part === 'bridge' ? 4 : 8, { city, title: song.title }));
      if (who === 'player' && own.length && s.part === 'verse') ownAt += 8;
      const step = s.part === 'verse' ? 1 : 1;
      lines.forEach((t, i) => out.push({ bar: bar + i * step, text: t, pitch: pitchOf(who) }));
    }
    bar += PART_BARS[s.part];
    if (only && out.length && who !== only) break;
  }
  return only ? out.map((l, i) => ({ ...l, bar: 1 + i })) : out;
}

export function ListenButton({ song, only, label }: { song: Song; only?: string; label?: string }) {
  const npcs = useGameStore((s) => s.npcs);
  const player = useGameStore((s) => s.player);
  const library = useGameStore((s) => s.beats?.library);
  const note = useGameStore((s) => s.songNotes?.[song.id]);
  const playing = usePreviewing();
  const now = useNowLine();
  const [take, setTake] = useState<Blob | null>(null);
  const key = `song|${song.id}|${only ?? ''}`;
  const mine = !song.ownerId;
  useEffect(() => { let on = true; if (mine && !only) loadTake(song.id).then((b) => { if (on) setTake(b); }); return () => { on = false; }; }, [song.id, mine, only]);
  const spec = useMemo(() => {
    const owned = library?.find((b) => b.id === song.beatId || b.usedOnSongId === song.id);
    return owned ? beatSpecFor(String(owned.genre), owned.bpm, owned.id, owned.quality, owned.producerId ?? owned.producerName, owned.mood)
      : beatSpecFor(String(song.genre), song.bpm, song.beatId ?? song.id, song.beatQuality ?? song.productionQuality ?? song.quality, song.producerId ?? song.producerName ?? song.ownerId, song.mood);
  }, [song, library]);
  const on = playing === key;
  const instrumental = song.ownerId ? isRealId(song.ownerId) : false;
  const go = () => {
    const lines = instrumental ? [] : songLines(song, npcs as NPC[], player?.id ?? 'player', player?.city ?? 'the city', only, note);
    playSong(key, spec, { take: take && !only ? take : null, lines, seconds: only ? Math.ceil((lines.length + 2) * (240 / spec.bpm)) : 90 });
  };
  return (
    <span className="inline-flex flex-col items-start gap-1 max-w-full">
      <button onClick={go} className={cn('h-8 px-3 rounded-full border text-[12px] font-semibold transition', on ? 'border-amber bg-amber text-black' : 'border-line text-ink2 hover:text-ink hover:border-amber/60')}>
        {on ? '■ Stop' : `▶ ${label ?? 'Listen'}`}{!on && take && !only ? ' · your take' : ''}{!on && instrumental ? ' · instrumental' : ''}
      </button>
      {on && now && <span className="text-[11px] text-amber italic truncate max-w-[280px]">♪ {now}</span>}
    </span>
  );
}

// What the song is about, why it's moving, and "make one like this".
import { useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { trackTotals } from '../../store/musicSelectors';
import { gameNote, whyTrending } from '../../sim/songNotes';
import { writeSongNote } from '../../ai/bridge';
import { aiSettings } from '../../sim/ai';
import { isRealId } from '../../sim/realPeople';
import { dateToSerial } from '../../sim/gameClock';
import { ListenButton } from './Listen';
import type { Song } from '../../types/game';

function serialOf(d?: string): number | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d ?? '');
  return m ? Math.floor(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) / 86400000) : undefined;
}

export function SongAbout({ song, forVerse }: { song: Song; forVerse?: boolean }) {
  const state = useGameStore();
  const inspire = useGameStore((s) => s.inspireStudio);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const p = state.player;
  if (!p) return null;
  const ownerId = song.ownerId ?? 'player';
  const real = isRealId(ownerId);
  const ownerName = ownerId === 'player' ? p.artistName : state.npcs.find((n) => n.id === ownerId)?.name ?? song.ownerName ?? 'They';
  const note = real ? null : state.songNotes?.[song.id] ?? gameNote(song, ownerName, state.npcs.find((n) => n.id === ownerId)?.city ?? p.city);
  const t = trackTotals(state, song.id);
  const featured = (song.featuredArtists ?? []).map((id) => (id === p.id ? p.artistName : state.npcs.find((n) => n.id === id)?.name)).filter((x): x is string => !!x);
  const why = isSongReleased(song) ? whyTrending(song, { growth: t?.growth ?? 0, country: p.country, serialNow: dateToSerial(state.gameDate), releaseSerial: serialOf(song.releaseDate), featuredNames: featured }) : [];
  const ai = aiSettings().enabled && !real && note?.by !== 'ai';
  return (
    <div className="rounded-[14px] border border-line bg-card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13px] font-semibold text-ink">📖 About “{song.title}”{note?.by === 'ai' ? <span className="text-[10px] text-rise font-normal"> · written by the AI</span> : null}</div>
        <ListenButton song={song} />
      </div>
      {real ? <div className="text-[12px] text-ink3">Their team hasn't shared the lyrics — you can hear the instrumental.</div> : note && (
        <>
          <div className="text-[12px] text-ink2 leading-snug">{note.about}</div>
          {note.hook.length > 0 && <div className="text-[12px] text-amber italic">Hook: “{note.hook.join(' / ')}”</div>}
          <button onClick={() => setOpen(!open)} className="text-[11px] text-ink3 hover:text-ink">{open ? 'Hide the verse' : 'Read the verse'}</button>
          {open && <div className="text-[12px] text-ink2 leading-relaxed border-l-2 border-line pl-3">{note.verse.map((l, i) => <div key={i}>{l}</div>)}</div>}
          {(forVerse || ownerId !== 'player') && note.fit && <div className="text-[12px] text-ink2"><b className="text-ink">What verse fits:</b> {note.fit}</div>}
        </>
      )}
      {why.length > 0 && (
        <div className="rounded-[10px] bg-white/[0.03] p-2.5">
          <div className="text-[11px] font-semibold text-ink mb-0.5">📈 Why it's moving</div>
          {why.map((w) => <div key={w} className="text-[11px] text-ink2">• {w}</div>)}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {ai && <button disabled={busy} onClick={async () => { setBusy(true); await writeSongNote(song.id); setBusy(false); }} className="h-8 px-3 rounded-full border border-rise/50 text-rise text-[12px] font-semibold disabled:opacity-50">{busy ? 'Writing…' : '✨ Get the real words (AI)'}</button>}
        {ownerId !== 'player' && <button onClick={() => inspire(song.id)} className="h-8 px-3 rounded-full border border-amber/50 text-amber text-[12px] font-semibold">🎙️ Make one like this</button>}
      </div>
    </div>
  );
}

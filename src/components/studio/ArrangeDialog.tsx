// Lay the song out: intro, hooks, verses, bridge, outro — and who takes each part.
import { useMemo, useState } from 'react';
import { useGameStore, blendedFame } from '../../store/gameStore';
import { arrangementEffect, defaultArrangement, PART_LABEL, PART_BARS, type Part, type Section } from '../../sim/arrangement';
import { ListenButton } from './Listen';
import type { NPC } from '../../types/game';

const PARTS: Part[] = ['intro', 'hook', 'verse', 'bridge', 'outro'];

export function ArrangeDialog({ songId, onClose }: { songId: string; onClose: () => void }) {
  const song = useGameStore((s) => s.songs.find((x) => x.id === songId));
  const npcs = useGameStore((s) => s.npcs);
  const player = useGameStore((s) => s.player);
  const save = useGameStore((s) => s.setArrangement);
  const guests = useMemo(() => (song?.featuredArtists ?? []).map((id) => npcs.find((n) => n.id === id)).filter((n): n is NPC => !!n), [song, npcs]);
  const [arr, setArr] = useState<Section[]>(() => song?.arrangement ?? defaultArrangement(guests.map((g) => g.id)));
  const [msg, setMsg] = useState<string | null>(null);
  if (!song || !player) return null;
  const g2 = guests.map((n) => ({ id: n.id, name: n.name, fame: n.fame, singer: /afro|rnb|r&b|dancehall|highlife|pop|soul|gospel|reggae/i.test(String(n.genre ?? '')) }));
  const preview = arrangementEffect(arr, g2, { playerFame: blendedFame(player), genre: String(song.genre) });
  const nameOf = (who: string) => (who === 'player' ? 'You' : guests.find((g) => g.id === who)?.name.split(' ')[0] ?? '?');
  const set = (i: number, patch: Partial<Section>) => setArr((a) => a.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => setArr((a) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });
  const bars = arr.reduce((t, s) => t + PART_BARS[s.part], 0);
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full sm:max-w-[480px] max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-line bg-[#0c0d12] p-5 space-y-3">
        <div className="flex items-center justify-between"><div><div className="text-[17px] font-bold text-ink">🎛️ Arrange "{song.title}"</div><div className="text-[11px] text-ink3">{arr.length} parts · {bars} bars · about {Math.round((bars * 4 * 60) / (song.bpm ?? 95))}s</div></div><button onClick={onClose} className="w-9 h-9 rounded-full border border-line text-ink2">✕</button></div>
        <div className="space-y-1.5">
          {arr.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-[10px] border border-line px-2 py-1.5">
              <span className="text-[11px] text-ink3 w-5 text-right">{i + 1}</span>
              <select value={s.part} onChange={(e) => set(i, { part: e.target.value as Part })} className="h-8 rounded-[8px] bg-sidebar border border-line px-1.5 text-[12px] text-ink">{PARTS.map((p) => <option key={p} value={p}>{PART_LABEL[p]}</option>)}</select>
              <select value={s.who} onChange={(e) => set(i, { who: e.target.value })} className="h-8 flex-1 min-w-0 rounded-[8px] bg-sidebar border border-line px-1.5 text-[12px] text-ink"><option value="player">You</option>{guests.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              <button onClick={() => move(i, -1)} className="w-7 h-7 rounded-full border border-line text-[11px] text-ink2">↑</button>
              <button onClick={() => move(i, 1)} className="w-7 h-7 rounded-full border border-line text-[11px] text-ink2">↓</button>
              <button onClick={() => setArr((a) => a.filter((_, k) => k !== i))} className="w-7 h-7 rounded-full border border-line text-[11px] text-ink3">✕</button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">{PARTS.map((p) => <button key={p} onClick={() => setArr((a) => [...a, { part: p, who: 'player' }])} className="h-7 px-2.5 rounded-full border border-line text-[11px] text-ink2">+ {PART_LABEL[p]}</button>)}</div>
        <div className="rounded-[12px] border border-line bg-black/30 p-3 space-y-1">
          <div className="text-[12px] font-semibold text-ink">What your team hears <span className={preview.quality + preview.commercial / 2 >= 0 ? 'text-rise' : 'text-fall'}>({preview.quality >= 0 ? '+' : ''}{preview.quality} quality · {preview.commercial >= 0 ? '+' : ''}{preview.commercial} hit potential)</span></div>
          {preview.notes.length ? preview.notes.map((n) => <div key={n} className="text-[11px] text-ink2">• {n}</div>) : <div className="text-[11px] text-ink3">A clean, standard layout.</div>}
          <div className="text-[11px] text-ink3 pt-1">{arr.map((s) => `${PART_LABEL[s.part]} (${nameOf(s.who)})`).join(' → ')}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { const r = save(song.id, arr); setMsg(r.message); }} className="h-10 px-4 rounded-full bg-amber text-black text-[13px] font-bold">Save layout</button>
          <ListenButton song={{ ...song, arrangement: arr }} label="Hear the layout" />
        </div>
        {msg && <div className="text-[12px] text-ink2">{msg}</div>}
        <div className="text-[10px] text-ink3">Guests' parts are voiced by your phone's speech voice so you can hear the shape of the song. Your own part uses your booth take if you recorded one.</div>
      </div>
    </div>
  );
}

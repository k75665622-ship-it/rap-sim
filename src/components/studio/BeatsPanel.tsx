// ─── STUDIO: BEATS ─────────────────────────────────────────────────────────
// Your library (what the team made, what you bought, what you ordered), the
// weekly beat store, and the order desk where you ask for a beat to a brief.

import { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { Button, Segmented } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import { beatGrade, orderQuote, type OwnedBeat } from '../../sim/beats';
import { producerSkillOf, producerPriceBand } from '../../sim/studio';
import { GENRE_LIST, GENRE_BY_ID } from '../../data/genres';
import { dateToSerial } from '../../sim/gameClock';
import type { Genre, NPC, SongMood } from '../../types/game';

const MOODS: { id: SongMood; label: string; emoji: string }[] = [
  { id: 'aggressive', label: 'Aggressive', emoji: '😤' },
  { id: 'defiant', label: 'Defiant', emoji: '✊' },
  { id: 'celebratory', label: 'Celebratory', emoji: '🥂' },
  { id: 'sensual', label: 'Sensual', emoji: '🌹' },
  { id: 'introspective', label: 'Introspective', emoji: '🌙' },
  { id: 'melancholy', label: 'Melancholy', emoji: '🌧️' },
];

function qColor(q: number): string {
  if (q >= 78) return '#2ECC71';
  if (q >= 62) return '#F5B301';
  if (q >= 45) return '#9AA0AE';
  return '#FF5C5C';
}

export function BeatTile({ beat, onUse, onRedo, onDiscard, compact }: { beat: OwnedBeat; onUse?: () => void; onRedo?: () => void; onDiscard?: () => void; compact?: boolean }) {
  const g = GENRE_BY_ID[beat.genre];
  const used = !!beat.usedOnSongId;
  return (
    <div className={cn('rounded-[14px] border border-line bg-card p-3 flex flex-col gap-2', used && 'opacity-55')}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[11px] font-black text-black shrink-0" style={{ background: qColor(beat.quality) }}>{beat.quality}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink truncate">{beat.name}</div>
          <div className="text-[11px] text-ink3 truncate">prod. {beat.producerName}</div>
          <div className="text-[11px] text-ink3 mt-0.5">{g?.emoji} {g?.label ?? beat.genre} · {beat.bpm} BPM · {beat.mood}</div>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-1">
          <span className="px-1.5 h-[18px] rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/5 text-ink3 flex items-center">{beatGrade(beat.quality)}</span>
          <span className={cn('px-1.5 h-[18px] rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center', beat.license === 'inhouse' ? 'bg-new/15 text-new' : beat.license === 'exclusive' ? 'bg-amber/15 text-amber' : 'bg-white/10 text-ink2')}>
            {beat.license === 'inhouse' ? 'Your team' : beat.license === 'exclusive' ? 'Exclusive' : 'Lease'}
          </span>
          {beat.forTitle && <span className="px-1.5 h-[18px] rounded-full text-[10px] font-semibold bg-[#4DA3FF]/15 text-[#4DA3FF] flex items-center truncate max-w-[160px]">for "{beat.forTitle}"</span>}
          {(beat.redos ?? 0) > 0 && <span className="px-1.5 h-[18px] rounded-full text-[10px] font-semibold bg-white/5 text-ink3 flex items-center">redo {beat.redos}</span>}
        </div>
      )}
      {used ? (
        <div className="text-[11px] text-ink3">On "{beat.usedOnTitle}"</div>
      ) : (onUse || onRedo || onDiscard) && (
        <div className="flex gap-1.5 mt-auto">
          {onUse && <Button size="sm" onClick={onUse} className="flex-1">Use on a song</Button>}
          {onRedo && beat.source !== 'store' && <Button size="sm" variant="secondary" onClick={onRedo} title="Ask for another version">↻ Redo</Button>}
          {onDiscard && <Button size="sm" variant="ghost" onClick={onDiscard} title="Delete">✕</Button>}
        </div>
      )}
    </div>
  );
}

type View = 'library' | 'store' | 'order';

export function BeatsPanel({ onUseBeat, initialView = 'library' }: { onUseBeat: (beat: OwnedBeat) => void; initialView?: View }) {
  const player = useGameStore((s) => s.player);
  const beats = useGameStore((s) => s.beats);
  const crew = useGameStore((s) => s.crew);
  const npcs = useGameStore((s) => s.npcs);
  const gameDate = useGameStore((s) => s.gameDate);
  const buyBeat = useGameStore((s) => s.buyBeat);
  const orderBeat = useGameStore((s) => s.orderBeat);
  const redoBeat = useGameStore((s) => s.redoBeat);
  const discardBeat = useGameStore((s) => s.discardBeat);
  const [view, setView] = useState<View>(initialView);
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null);
  const [filter, setFilter] = useState<'unused' | 'all'>('unused');

  // Order form
  const team = (crew ?? []).filter((c) => c.role === 'producer' || c.role === 'engineer');
  const [producerId, setProducerId] = useState<string>(team[0]?.npcId ?? '');
  const [genre, setGenre] = useState<Genre>(player?.genre ?? 'hip_hop');
  const [bpm, setBpm] = useState(GENRE_BY_ID[player?.genre ?? 'hip_hop']?.bpm ?? 95);
  const [mood, setMood] = useState<SongMood>('defiant');
  const [forTitle, setForTitle] = useState('');
  const [search, setSearch] = useState('');

  const nowSerial = dateToSerial(gameDate);
  const library = beats?.library ?? [];
  const shown = filter === 'unused' ? library.filter((b) => !b.usedOnSongId) : library;
  const orders = beats?.orders ?? [];
  const money = player?.career.money ?? 0;

  const outside = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list: NPC[] = [];
    for (const n of npcs) {
      if (n.role !== 'producer' && n.role !== 'engineer') continue;
      if (n.id.endsWith('_real')) continue;
      if (q ? !n.name.toLowerCase().includes(q) : n.country !== player?.country) continue;
      list.push(n);
      if (list.length >= 200) break;
    }
    return list.map((n) => ({ n, skill: producerSkillOf(n) })).sort((a, b) => (q ? b.skill - a.skill : a.skill - b.skill)).slice(0, 12);
  }, [npcs, search, player?.country]);

  const chosen = npcs.find((n) => n.id === producerId);
  const chosenMember = team.find((c) => c.npcId === producerId);
  const quote = chosen ? orderQuote(chosenMember ? chosenMember.skill : producerSkillOf(chosen), !!chosenMember) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { id: 'library', label: 'Your beats', badge: String(library.filter((b) => !b.usedOnSongId).length) },
            { id: 'store', label: 'Beat store' },
            { id: 'order', label: 'Order a beat', badge: orders.length ? String(orders.length) : undefined },
          ]}
        />
        <div className="text-[12px] text-ink3">{team.length ? `${team.map((t) => t.npcName).join(' & ')} ${team.length > 1 ? 'are' : 'is'} making beats for you.` : 'Hire a producer or engineer and they will send you beats every week.'}</div>
      </div>

      {flash && <div className={cn('rounded-[12px] px-4 py-2.5 text-[12px]', flash.ok ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall')}>{flash.message}</div>}

      {view === 'library' && (
        <>
          <div className="flex gap-1.5">
            {(['unused', 'all'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn('h-8 px-3 rounded-full text-[12px] font-semibold border', filter === f ? 'border-ink2 text-ink bg-white/[0.05]' : 'border-line text-ink3')}>{f === 'unused' ? 'Ready to use' : 'Everything'}</button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-line p-8 text-center text-[13px] text-ink3">
              No beats yet. Buy one in the store, order one to a brief, or put a producer on your team.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {shown.slice(0, 30).map((b) => (
                <BeatTile key={b.id} beat={b} onUse={() => onUseBeat(b)} onRedo={() => setFlash(redoBeat(b.id))} onDiscard={() => discardBeat(b.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'store' && (
        <div className="rounded-[14px] border border-line bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-line text-[12px] text-ink3">New beats every week. <b className="text-ink2">Lease</b>: cheap, somebody else may have it too (−4 freshness). <b className="text-ink2">Exclusive</b>: yours alone.</div>
          {(beats?.store ?? []).length === 0 && <div className="p-6 text-[13px] text-ink3 text-center">The store restocks with the next day.</div>}
          {(beats?.store ?? []).map((l) => (
            <div key={l.id} className={cn('flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 flex-wrap sm:flex-nowrap', l.sold && 'opacity-50')}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[11px] font-black text-black shrink-0" style={{ background: qColor(l.quality) }}>{l.quality}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink truncate">{l.name} <span className="text-ink3 font-normal">· {beatGrade(l.quality)}</span></div>
                <div className="text-[11px] text-ink3 truncate">prod. {l.producerName} · {GENRE_BY_ID[l.genre]?.label ?? l.genre} · {l.bpm} BPM · {l.mood}</div>
              </div>
              {l.sold ? <span className="text-[12px] text-ink3">Bought</span> : (
                <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                  <Button size="sm" variant="secondary" disabled={money < l.lease} onClick={() => setFlash(buyBeat(l.id, 'lease'))}>Lease ${l.lease.toLocaleString()}</Button>
                  <Button size="sm" disabled={money < l.exclusive} onClick={() => setFlash(buyBeat(l.id, 'exclusive'))}>Own ${l.exclusive.toLocaleString()}</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'order' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div className="rounded-[14px] border border-line bg-card p-4 space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">Who makes it</div>
              {team.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {team.map((c) => (
                    <button key={c.id} onClick={() => setProducerId(c.npcId)} className={cn('rounded-[12px] border px-3 py-2 text-left', producerId === c.npcId ? 'border-amber bg-amber/10' : 'border-line hover:bg-cardhover')}>
                      <div className="text-[13px] font-semibold text-ink">{c.npcName}</div>
                      <div className="text-[11px] text-ink3">Your {c.role} · skill {c.skill} · free</div>
                    </button>
                  ))}
                </div>
              )}
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Or search any producer…" className="w-full h-9 rounded-[10px] bg-sidebar border border-line px-3 text-[12px] text-ink outline-none focus:border-amber" />
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {outside.map(({ n, skill }) => {
                  const q = orderQuote(skill, false);
                  return (
                    <button key={n.id} onClick={() => setProducerId(n.id)} className={cn('w-full flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left', producerId === n.id ? 'bg-amber/10 ring-1 ring-amber/60' : 'hover:bg-white/[0.03]')}>
                      <span className="flex-1 min-w-0 text-[12px] text-ink truncate">{n.name} <span className="text-ink3">· {producerPriceBand(skill)} · {n.country}</span></span>
                      <span className="text-[12px] text-amber shrink-0">${q.fee.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">The brief</div>
              <input value={forTitle} onChange={(e) => setForTitle(e.target.value)} maxLength={60} placeholder="Song it's for (optional) — e.g. Gold Teeth" className="w-full h-9 rounded-[10px] bg-sidebar border border-line px-3 text-[12px] text-ink outline-none focus:border-amber mb-2" />
              <div className="grid grid-cols-2 gap-2">
                <select value={genre} onChange={(e) => { const g = e.target.value as Genre; setGenre(g); setBpm(GENRE_BY_ID[g]?.bpm ?? bpm); }} className="h-9 rounded-[10px] bg-sidebar border border-line px-2 text-[12px] text-ink">
                  {GENRE_LIST.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
                </select>
                <div className="flex items-center gap-2 h-9 rounded-[10px] bg-sidebar border border-line px-2">
                  <input type="range" min={60} max={180} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="flex-1 accent-amber" />
                  <span className="text-[12px] text-ink num w-16 text-right whitespace-nowrap">{bpm} bpm</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {MOODS.map((m) => <button key={m.id} onClick={() => setMood(m.id)} className={cn('h-8 px-3 rounded-full text-[12px] border', mood === m.id ? 'border-amber text-amber bg-amber/10' : 'border-line text-ink2')}>{m.emoji} {m.label}</button>)}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-[12px] text-ink3">{chosen && quote ? <>From <b className="text-ink2">{chosen.name}</b> · {quote.fee ? `$${quote.fee.toLocaleString()}` : 'free'} · about {quote.days} days. Built to fit: a little better than what's in their folder.</> : 'Pick who makes it.'}</div>
              <Button disabled={!chosen || (quote ? money < quote.fee : true)} onClick={() => setFlash(orderBeat({ producerId, genre, bpm, mood, forTitle }))}>Order beat</Button>
            </div>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-4">
            <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">On the way</div>
            {orders.length === 0 ? <div className="text-[12px] text-ink3">Nothing ordered.</div> : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-[10px] bg-white/[0.03] px-3 py-2">
                    <div className="text-[12px] text-ink">{o.producerName}{o.redoOf ? ' · redo' : ''}</div>
                    <div className="text-[11px] text-ink3">{o.forTitle ? `for "${o.forTitle}" · ` : ''}{GENRE_BY_ID[o.genre]?.label} · {o.bpm} BPM · ready in {Math.max(0, o.dueSerial - nowSerial)}d</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

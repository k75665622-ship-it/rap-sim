// ─── JOURNAL ───────────────────────────────────────────────────────────────
// Everything the career remembers: what happened, who was there. People in
// the game read the same journal when the AI writes for them, so standing
// someone up, or showing up for them, follows you.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Chips } from '../money/shared';
import { Button } from '../ui/kit';
import { Avatar } from '../social/shared';
import { cn } from '@/utils/cn';
import { dateToSerial, serialToDate } from '../../sim/gameClock';
import { MEMORY_KINDS, MEMORY_ICON, agoLabel, type MemoryKind } from '../../sim/memories';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function JournalScreen() {
  const memories = useGameStore((s) => s.memories);
  const npcs = useGameStore((s) => s.npcs);
  const gameDate = useGameStore((s) => s.gameDate);
  const pin = useGameStore((s) => s.pinMemory);
  const note = useGameStore((s) => s.addJournalNote);
  const openArtist = useGameStore((s) => s.openArtist);
  const [kind, setKind] = useState<MemoryKind | 'all' | 'pinned'>('all');
  const [person, setPerson] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const today = dateToSerial(gameDate);
  const byId = useMemo(() => new Map(npcs.map((n) => [n.id, n])), [npcs]);

  const list = (memories ?? []).filter((m) => (kind === 'all' || (kind === 'pinned' ? m.pinned : m.kind === kind)) && (!person || m.npcIds?.includes(person)));
  const people = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of memories ?? []) for (const id of m.npcIds ?? []) count.set(id, (count.get(id) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, n]) => ({ id, n, name: byId.get(id)?.name ?? 'Someone' }));
  }, [memories, byId]);

  // Group by month.
  const groups: { label: string; items: typeof list }[] = [];
  for (const m of list) {
    const d = serialToDate(m.serial);
    const label = `${MONTHS[d.month - 1]} ${d.year}`;
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(m); else groups.push({ label, items: [m] });
  }

  return (
    <div className="max-w-[820px] mx-auto pb-12 space-y-4">
      <div>
        <h1 className="text-[26px] font-black text-ink">Journal</h1>
        <div className="text-[13px] text-ink2">{(memories ?? []).length} memories. Saved with your career, and read by the people in it.</div>
      </div>

      <Card className="p-3 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { note(draft); setDraft(''); } }} placeholder="Write something down…" className="flex-1 h-9 rounded-[10px] bg-black/30 border border-line px-3 text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-amber" />
        <Button size="sm" disabled={!draft.trim()} onClick={() => { note(draft); setDraft(''); }}>Add</Button>
      </Card>

      <Chips options={[{ id: 'all' as const, label: 'Everything' }, { id: 'pinned' as const, label: '📌 Pinned' }, ...MEMORY_KINDS.map((k) => ({ id: k.id, label: `${k.icon} ${k.label}` }))]} value={kind} onChange={setKind} />
      {people.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {people.map((p) => (
            <button key={p.id} onClick={() => setPerson(person === p.id ? null : p.id)} className={cn('shrink-0 flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border text-[12px]', person === p.id ? 'border-amber bg-amber/10 text-amber' : 'border-line bg-card text-ink2')}>
              <Avatar name={p.name} seed={p.id} size={26} /><span className="truncate max-w-[110px]">{p.name.split(' ')[0]}</span><span className="text-ink3 num">{p.n}</span>
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && <Card className="p-8 text-center text-[13px] text-ink3">Nothing written down here yet. Live a little.</Card>}
      {groups.map((g) => (
        <section key={g.label}>
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink3 mb-2">{g.label}</div>
          <div className="relative pl-5">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-line" />
            {g.items.map((m) => (
              <div key={m.id} className="relative mb-2.5">
                <span className={cn('absolute -left-5 top-2.5 w-[15px] h-[15px] rounded-full border-2 border-[#0A0B10]', m.tone === 'good' ? 'bg-rise' : m.tone === 'bad' ? 'bg-fall' : m.weight >= 4 ? 'bg-amber' : 'bg-white/25')} />
                <Card className={cn('px-3.5 py-2.5', m.weight >= 4 && 'border-amber/30')}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[16px] leading-6 shrink-0">{MEMORY_ICON[m.kind]}</span>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[13px] leading-snug', m.weight >= 4 ? 'text-ink font-semibold' : 'text-ink2')}>{m.text}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-ink3">
                        <span>{agoLabel(m.serial, today)}</span>
                        {(m.npcIds ?? []).map((id) => byId.get(id)).filter(Boolean).slice(0, 3).map((n) => (
                          <button key={n!.id} onClick={() => openArtist(n!.id)} className="text-ink2 hover:text-amber">· {n!.name}</button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => pin(m.id, !m.pinned)} className={cn('text-[13px] shrink-0', m.pinned ? 'opacity-100' : 'opacity-30 hover:opacity-80')} title={m.pinned ? 'Unpin' : 'Pin: the AI treats pinned memories as defining moments'}>📌</button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

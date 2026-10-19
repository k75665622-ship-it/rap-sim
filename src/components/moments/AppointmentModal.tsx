// ─── IT'S TIME ─────────────────────────────────────────────────────────────
// When the clock reaches a plan, you're there. The clock pauses while you
// decide what to do — or whether to bail.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { sceneChoices, fmtMinute, KIND_LABEL } from '../../sim/appointments';
import { personaOf } from '../../sim/persona';
import { isSongReleased } from '../../sim/release';
import { Avatar } from '../social/shared';
import { Button } from '../ui/kit';
import type { Appointment } from '../../types/game';

const BG: Record<Appointment['kind'], string> = {
  studio: 'radial-gradient(120% 90% at 50% 0%, rgba(255,184,0,0.28), rgba(10,11,16,0) 60%), linear-gradient(180deg, #1a1408, #0c0d12)',
  party: 'radial-gradient(120% 90% at 50% 0%, rgba(181,123,255,0.32), rgba(10,11,16,0) 60%), linear-gradient(180deg, #170d24, #0c0d12)',
  linkup: 'radial-gradient(120% 90% at 50% 0%, rgba(46,213,115,0.25), rgba(10,11,16,0) 60%), linear-gradient(180deg, #0b1a12, #0c0d12)',
  meeting: 'radial-gradient(120% 90% at 50% 0%, rgba(77,163,255,0.28), rgba(10,11,16,0) 60%), linear-gradient(180deg, #0b1422, #0c0d12)',
};

export function AppointmentModal() {
  const activeId = useGameStore((s) => s.activeAppointment);
  const appointments = useGameStore((s) => s.appointments);
  const npcs = useGameStore((s) => s.npcs);
  const songs = useGameStore((s) => s.songs);
  const energy = useGameStore((s) => s.player?.energy ?? 0);
  const attend = useGameStore((s) => s.attendAppointment);
  const bail = useGameStore((s) => s.bailAppointment);
  const [done, setDone] = useState<{ id: string; message: string } | null>(null);
  const [confirmBail, setConfirmBail] = useState(false);

  const id = activeId ?? done?.id;
  const a = id ? (appointments ?? []).find((x) => x.id === id) : undefined;
  if (!a) return null;
  const npc = npcs.find((n) => n.id === a.npcId);
  const persona = npc ? personaOf(npc) : null;
  const hasUnreleased = songs.some((s) => !isSongReleased(s) && !s.archivedAt);
  const choices = sceneChoices(a, hasUnreleased);
  const label = KIND_LABEL[a.kind];
  const finished = !!done;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/75 rl-fade" />
      <div className="relative w-full sm:max-w-[460px] max-h-[92vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-line rl-rise" style={{ background: BG[a.kind] }}>
        <div className="p-5 pb-4 text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink3">{fmtMinute(a.atMinute)} · {label.label}</div>
          <div className="text-[44px] leading-none mt-3">{label.emoji}</div>
          <div className="text-[20px] font-bold text-ink mt-3 leading-tight">{finished ? 'How it went' : `You're at ${a.place}`}</div>
          {npc && (
            <div className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 pl-1 pr-3 py-1">
              <Avatar name={npc.name} seed={npc.id} size={28} />
              <span className="text-[13px] font-semibold text-ink">{npc.name}</span>
              {persona && <span className="text-[11px] text-ink3">{persona.temperament}</span>}
            </div>
          )}
        </div>

        {!finished ? (
          <div className="px-5 pb-5 space-y-2.5">
            {(a.outcome || a.lateBy) ? (
              <div className="rounded-[12px] bg-black/30 border border-white/10 px-3.5 py-2.5 text-[13px] text-ink2 leading-snug text-center">
                {a.outcome ? `${a.outcome} ` : ''}{a.lateBy ? `${npc?.name.split(' ')[0] ?? 'They'}'s running ${a.lateBy} minutes late.` : ''}
              </div>
            ) : null}
            {choices.map((c) => (
              <button
                key={c.id}
                disabled={energy < c.energy}
                onClick={() => { const r = attend(c.id); if (r.ok) setDone({ id: a.id, message: r.message }); }}
                className="w-full text-left rounded-[14px] border border-white/10 bg-black/35 hover:bg-black/55 hover:border-amber/60 transition px-4 py-3 disabled:opacity-40"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] font-semibold text-ink">{c.label}</span>
                  <span className="text-[11px] text-amber num shrink-0">⚡{c.energy}</span>
                </div>
                <div className="text-[12px] text-ink3 mt-0.5">{c.hint}{energy < c.energy ? ' · too tired' : ''}</div>
              </button>
            ))}
            <div className="pt-1 text-center">
              {confirmBail ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[12px] text-ink2">{persona && persona.forgiveness < 0.35 ? 'They won\'t forget this.' : 'Sure?'}</span>
                  <Button size="sm" variant="secondary" onClick={() => { const r = bail(); setDone({ id: a.id, message: r.message }); setConfirmBail(false); }}>Bail</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmBail(false)}>Stay</Button>
                </div>
              ) : (
                <button onClick={() => setConfirmBail(true)} className="text-[12px] text-ink3 hover:text-fall">Something came up — bail</button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            <div className="rounded-[14px] bg-black/35 border border-white/10 px-4 py-3 text-[14px] text-ink leading-snug">{a.outcome ?? done?.message}</div>
            {!!a.chips?.length && <div className="flex flex-wrap gap-1.5 justify-center">{a.chips.map((c) => <span key={c} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-ink2">{c}</span>)}</div>}
            <Button className="w-full" onClick={() => setDone(null)}>Continue</Button>
          </div>
        )}
      </div>
    </div>
  );
}

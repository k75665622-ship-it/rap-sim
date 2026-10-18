// ─── A DECISION ────────────────────────────────────────────────────────────
// One text or team problem, with what you can do about it. After you choose,
// it shows what happened.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Moment } from '../../types/game';
import { dateToSerial } from '../../sim/gameClock';

export function MomentCard({ moment, compact }: { moment: Moment; compact?: boolean }) {
  const { answerMoment, gameDate, player } = useGameStore();
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const today = dateToSerial(gameDate);
  const left = Math.max(0, moment.expiresSerial - today);
  const open = moment.status === 'open';

  return (
    <div className={`rounded-2xl border p-3 space-y-2 ${open ? 'border-yellow-500/40 bg-yellow-500/[0.06]' : 'border-gray-800 bg-gray-900/60'}`}>
      {!compact && (
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-bold text-white">{moment.title}</div>
          {open && <span className={`text-[10px] font-bold shrink-0 ${left <= 1 ? 'text-red-300' : 'text-gray-500'}`}>{left <= 0 ? 'answer today' : `${left}d to answer`}</span>}
        </div>
      )}
      {!compact && moment.channel === 'team' && <p className="text-xs text-gray-300 leading-relaxed">{moment.body}</p>}
      {open ? (
        <div className="flex flex-col gap-1.5">
          {moment.options.map((o) => {
            const broke = !!o.cost && (player?.career.money ?? 0) < o.cost;
            const tired = !!o.energy && (player?.energy ?? 0) < o.energy;
            return (
              <button
                key={o.id}
                disabled={broke || tired}
                onClick={() => { const r = answerMoment(moment.id, o.id); setFlash({ ok: r.ok, text: r.message }); }}
                className="text-left rounded-xl border border-gray-700 bg-gray-900 hover:border-yellow-500/60 hover:bg-gray-800 px-3 py-2 disabled:opacity-40 transition-colors"
              >
                <div className="text-xs font-semibold text-white">{o.label}</div>
                {(o.hint || o.energy) && (
                  <div className="text-[10px] text-gray-500">
                    {o.hint}{o.hint && o.energy ? ' · ' : ''}{o.energy ? `${o.energy} energy` : ''}{broke ? ' · not enough money' : ''}{tired ? ' · too tired' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px]">
          {moment.resolution?.label && <div className="text-gray-500">You: <span className="text-gray-300">{moment.resolution.label}</span></div>}
          <div className={moment.status === 'expired' ? 'text-gray-500 italic' : 'text-yellow-100/90'}>{moment.resolution?.text}</div>
        </div>
      )}
      {flash && !open && !moment.resolution && <div className="text-[11px] text-gray-300">{flash.text}</div>}
      {flash && !flash.ok && open && <div className="text-[11px] text-red-300">{flash.text}</div>}
    </div>
  );
}

/** Everything waiting on the player, for the dashboard. */
export function MomentsInbox() {
  const { moments, setScreen, selectNPC } = useGameStore();
  const open = (moments ?? []).filter((m) => m.status === 'open');
  if (open.length === 0) return null;
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.04] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-white">⚡ Waiting on you ({open.length})</div>
        <div className="text-[11px] text-gray-500">Every choice has a consequence. Ignoring one is a choice too.</div>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {open.slice(0, 6).map((m) => (
          <button
            key={m.id}
            onClick={() => {
              if (m.channel === 'dm' && m.npcId) { selectNPC(m.npcId); setScreen('pingchat'); }
              else setScreen('team');
            }}
            className="text-left rounded-xl border border-gray-800 bg-gray-900 hover:border-yellow-500/50 px-3 py-2"
          >
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{m.channel === 'dm' ? '💬 PingChat' : '👥 Your team'}</div>
            <div className="text-xs text-white font-semibold truncate">{m.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

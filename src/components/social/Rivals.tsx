// ─── SOCIAL: RIVALS ────────────────────────────────────────────────────────
// Fan wars (your fanbase against theirs) and beefs (you against them). Both
// start on their own as well as on purpose, both cool if nobody feeds them,
// and both are where the attention — and the damage — comes from.

import { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import { FANWAR_ACTIONS, fanbaseNameFor, type FanWarAction } from '../../sim/social';
import { BEEF_RUNGS, readBeef, RESOLUTION_LABEL, beefRung, type ChosenResolution } from '../../sim/beef';
import type { BeefState, FanWar, NPC } from '../../types/game';
import { Avatar } from './shared';
import { dateToSerial } from '../../sim/gameClock';

function Meter({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-ink3 uppercase tracking-wider mb-1"><span>{label}</span><span className="num">{Math.round(value)}</span></div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} /></div>
    </div>
  );
}

/** Who is winning: their side on the left, yours on the right. */
function EdgeBar({ edge, us, them }: { edge: number; us: string; them: string }) {
  const pct = 50 + edge; // edge is -50..50
  return (
    <div>
      <div className="flex justify-between text-[10px] text-ink3 mb-1"><span>{them}</span><span>{us}</span></div>
      <div className="relative h-2 rounded-full bg-fall/30 overflow-hidden">
        <div className="absolute right-0 top-0 h-full bg-rise/80 transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/40" />
      </div>
      <div className="text-[11px] mt-1 text-center">{edge > 8 ? <span className="text-rise">Your fans are winning</span> : edge < -8 ? <span className="text-fall">Their fans are winning</span> : <span className="text-ink3">Dead even</span>}</div>
    </div>
  );
}

function FanWarCard({ war, us, onAct }: { war: FanWar; us: string; onAct: (a: FanWarAction) => void }) {
  const active = war.status === 'active';
  return (
    <div className={cn('rounded-[14px] border border-line bg-card p-4', !active && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <Avatar name={war.npcName} seed={war.npcId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink truncate">{us} <span className="text-ink3 font-normal">vs</span> {war.theirFans}</div>
          <div className="text-[11px] text-ink3 truncate">{war.npcName}'s fanbase · {active ? 'live' : 'over'}</div>
        </div>
        {active && war.intensity >= 60 && <span className="px-2 h-[20px] rounded-full bg-fall/15 text-fall text-[10px] font-bold flex items-center">🔥 HOT</span>}
      </div>
      <div className="text-[12px] text-ink2 mt-3 leading-snug">{war.cause}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
        <Meter value={war.intensity} color={war.intensity >= 60 ? '#FF5C5C' : '#F5B301'} label="Intensity" />
        <EdgeBar edge={war.edge} us={us} them={war.theirFans} />
      </div>
      {war.log.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-line pl-3">
          {war.log.slice(0, 3).map((l, i) => <li key={i} className={cn('text-[12px] leading-snug', i === 0 ? 'text-ink2' : 'text-ink3')}>{l}</li>)}
        </ul>
      )}
      {active && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          {(Object.keys(FANWAR_ACTIONS) as FanWarAction[]).map((a) => (
            <button key={a} onClick={() => onAct(a)} className="rounded-[10px] border border-line px-3 py-2 text-left hover:bg-cardhover transition">
              <div className="text-[12px] font-semibold text-ink">{FANWAR_ACTIONS[a].emoji} {FANWAR_ACTIONS[a].label}</div>
              <div className="text-[10px] text-ink3 leading-snug mt-0.5">{FANWAR_ACTIONS[a].blurb}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BeefCard({ beef, npc, nowSerial, money, energy, onMove, onEnd }: {
  beef: BeefState; npc?: NPC; nowSerial: number; money: number; energy: number;
  onMove: (level: number) => void; onEnd: (k: ChosenResolution) => void;
}) {
  const r = readBeef(beef, nowSerial, { fame: npc?.fame ?? 30, relationshipScore: npc?.relationshipScore ?? 0 });
  const next = beefRung(beef.rung + 1);
  const heatOk = next ? next.requiresHeat <= r.heat : false;
  const affordable = next ? next.cost <= money && next.energy <= energy : false;
  const over = !!beef.resolution;
  const statusColor = r.status === 'hot' ? 'text-fall' : r.status === 'warm' ? 'text-amber' : 'text-ink3';
  return (
    <div className={cn('rounded-[14px] border border-line bg-card p-4', over && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <Avatar name={beef.npcName} seed={beef.npcId} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink truncate">You vs {beef.npcName}</div>
          <div className="text-[11px] text-ink3">Record {r.record} · {over ? RESOLUTION_LABEL[beef.resolution!.kind] : <span className={statusColor}>{r.status}</span>}</div>
        </div>
      </div>
      <div className="mt-3"><Meter value={r.heat} color={r.heat >= 70 ? '#FF5C5C' : r.heat >= 35 ? '#F5B301' : '#6B7280'} label="Heat" /></div>
      <div className="mt-3 flex items-center gap-1" aria-label={`Rung ${beef.rung} of 9`}>
        {BEEF_RUNGS.map((g) => (
          <div key={g.level} title={`${g.emoji} ${g.name}`} className={cn('flex-1 h-6 rounded-[6px] flex items-center justify-center text-[11px]', g.level <= beef.rung ? 'bg-fall/25' : g.level === beef.rung + 1 ? 'bg-white/[0.08] ring-1 ring-white/20' : 'bg-white/[0.03] opacity-50')}>{g.emoji}</div>
        ))}
      </div>
      <div className="text-[11px] text-ink3 mt-2">{r.note}</div>
      {beef.moves.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-line pl-3">
          {beef.moves.slice(0, 3).map((m, i) => <li key={i} className={cn('text-[12px] leading-snug', m.by === 'player' ? 'text-ink2' : 'text-ink3')}>{m.by === 'player' ? 'You: ' : ''}{m.line}</li>)}
        </ul>
      )}
      {!over && (
        <div className="mt-3 space-y-2">
          {next ? (
            <div className="rounded-[10px] border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink">{next.emoji} {next.verb}</div>
                  <div className="text-[11px] text-ink3 leading-snug">{next.what}</div>
                </div>
                <Button size="sm" onClick={() => onMove(next.level)} disabled={!heatOk || !affordable}>Go</Button>
              </div>
              <div className="text-[10px] text-ink3 mt-1.5">
                ⚡ {next.energy}{next.cost ? ` · $${next.cost.toLocaleString()}` : ''} · {heatOk ? `Risk: ${next.risk}` : `Needs ${next.requiresHeat} heat — ${Math.ceil(next.requiresHeat - r.heat)} more. Let them hit you, or tag them.`}
              </div>
            </div>
          ) : <div className="text-[12px] text-ink3">This is the top of the ladder. All that is left is how it ends.</div>}
          <div className="flex flex-wrap gap-2">
            {r.resolutions.map((k) => (
              <Button key={k} size="sm" variant="secondary" onClick={() => onEnd(k)}>
                {k === 'truce' ? '🕊️ Offer a truce' : k === 'concession' ? '🏳️ Make them concede' : '🥊 Call the knockout'}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RivalsTab({ onFlash }: { onFlash: (r: { ok: boolean; message: string }) => void }) {
  const fanWars = useGameStore((s) => s.fanWars);
  const beefs = useGameStore((s) => s.beefs);
  const npcs = useGameStore((s) => s.npcs);
  const player = useGameStore((s) => s.player);
  const gameDate = useGameStore((s) => s.gameDate);
  const fanbaseName = useGameStore((s) => s.fanbaseName);
  const fanWarAction = useGameStore((s) => s.fanWarAction);
  const beefMove = useGameStore((s) => s.beefMove);
  const endBeef = useGameStore((s) => s.endBeef);
  const startBeef = useGameStore((s) => s.startBeef);
  const [showPast, setShowPast] = useState(false);
  const nowSerial = dateToSerial(gameDate);

  const byId = useMemo(() => {
    const ids = new Set([...(fanWars ?? []).map((w) => w.npcId), ...beefs.map((b) => b.npcId)]);
    const m = new Map<string, NPC>();
    for (const n of npcs) if (ids.has(n.id)) m.set(n.id, n);
    return m;
  }, [npcs, fanWars, beefs]);

  const enemies = useMemo(() => npcs.filter((n) => n.role === 'artist' && n.relationshipScore <= -20 && !beefs.some((b) => b.npcId === n.id && !b.resolution)).sort((a, b) => a.relationshipScore - b.relationshipScore).slice(0, 4), [npcs, beefs]);

  const us = fanbaseName ?? (player ? fanbaseNameFor(player.artistName, player.id) : 'Your fans');
  const liveWars = (fanWars ?? []).filter((w) => w.status === 'active');
  const pastWars = (fanWars ?? []).filter((w) => w.status !== 'active');
  const liveBeefs = beefs.filter((b) => !b.resolution);
  const pastBeefs = beefs.filter((b) => b.resolution);

  return (
    <div className="p-3 space-y-5">
      <details className="rounded-[14px] border border-line bg-white/[0.02] p-4" open={liveWars.length + liveBeefs.length === 0}>
        <summary className="text-[13px] font-semibold text-ink cursor-pointer">How rivalry works</summary>
        <div className="grid sm:grid-cols-2 gap-4 mt-3 text-[12px] text-ink2 leading-relaxed">
          <div>
            <div className="font-semibold text-ink mb-1">📣 Fan wars — your fans vs theirs</div>
            Start when you and another artist fight for the same chart spot, when a blog pits you against a peer, or when a beef spills into the comments. Two at a time at most. They cool by themselves; <b>Rally</b> heats it up and pushes your side, <b>Call for peace</b> ends it and earns respect, <b>Quote a hater</b> is a gamble. A war at boiling point can drag the two artists into a beef.
          </div>
          <div>
            <div className="font-semibold text-ink mb-1">⚔️ Beef — you vs them</div>
            Starts when somebody who can't stand you (relationship −35 or worse) finally says it, when you insult or quote-tweet someone, when you tag a rival in a fight, or when a fan war gets out of hand. Heat is the fuel: each rung of the ladder needs more of it. Their replies add heat too. Stop feeding it for a month and it fizzles.
          </div>
        </div>
      </details>

      <section>
        <div className="text-[12px] font-semibold text-ink2 uppercase tracking-wider mb-2">Fan wars {liveWars.length > 0 && <span className="text-fall">· {liveWars.length} live</span>}</div>
        {liveWars.length === 0 ? <div className="text-[13px] text-ink3">No fan wars right now. Get close to somebody on the chart and one will find you.</div> : (
          <div className="space-y-3">{liveWars.map((w) => <FanWarCard key={w.id} war={w} us={us} onAct={(a) => onFlash(fanWarAction(w.id, a))} />)}</div>
        )}
      </section>

      <section>
        <div className="text-[12px] font-semibold text-ink2 uppercase tracking-wider mb-2">Beef {liveBeefs.length > 0 && <span className="text-fall">· {liveBeefs.length} live</span>}</div>
        {liveBeefs.length === 0 ? <div className="text-[13px] text-ink3">Nobody is at war with you.</div> : (
          <div className="space-y-3">
            {liveBeefs.map((b) => (
              <BeefCard key={b.id} beef={b} npc={byId.get(b.npcId)} nowSerial={nowSerial} money={player?.career.money ?? 0} energy={player?.energy ?? 0}
                onMove={(lvl) => { const r = beefMove(b.id, lvl); onFlash({ ok: r.ok, message: r.result ? `${r.result.line} ${r.result.headline}` : r.message }); }}
                onEnd={(k) => onFlash(endBeef(b.id, k))} />
            ))}
          </div>
        )}
        {enemies.length > 0 && (
          <div className="mt-3 rounded-[14px] border border-dashed border-line p-3">
            <div className="text-[12px] text-ink2 mb-2">People who can't stand you</div>
            <div className="space-y-1.5">
              {enemies.map((n) => (
                <div key={n.id} className="flex items-center gap-2.5">
                  <Avatar name={n.name} seed={n.id} size={26} />
                  <div className="min-w-0 flex-1 text-[12px] text-ink truncate">{n.name} <span className="text-fall text-[11px]">{Math.round(n.relationshipScore)}</span></div>
                  <Button size="sm" variant="ghost" onClick={() => onFlash(startBeef(n.id))}>Start beef</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {(pastWars.length > 0 || pastBeefs.length > 0) && (
        <section>
          <button onClick={() => setShowPast((v) => !v)} className="text-[12px] text-ink3 hover:text-ink">{showPast ? '▾' : '▸'} History ({pastWars.length + pastBeefs.length})</button>
          {showPast && (
            <div className="space-y-3 mt-2">
              {pastWars.map((w) => <FanWarCard key={w.id} war={w} us={us} onAct={() => {}} />)}
              {pastBeefs.map((b) => <BeefCard key={b.id} beef={b} npc={byId.get(b.npcId)} nowSerial={nowSerial} money={0} energy={0} onMove={() => {}} onEnd={() => {}} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

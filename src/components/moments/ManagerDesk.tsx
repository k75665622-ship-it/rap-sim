// ─── THE MANAGER'S DESK ────────────────────────────────────────────────────
// Everything your manager is handling for you: show offers, feature asks,
// interview requests — each with the details they dug out and what they would
// do. One tap to take it, pass, or counter at their number.

import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import type { ManagerBrief } from '../../types/game';
import { PITCH_LABEL, specialtyOf, managerReach, type PitchKind } from '../../sim/managerStyle';
import { dateToSerial } from '../../sim/gameClock';

const KIND: Record<ManagerBrief['kind'], { emoji: string; label: string }> = {
  show: { emoji: '🎤', label: 'Show offer' },
  feature: { emoji: '🤝', label: 'Feature ask' },
  interview: { emoji: '🎙️', label: 'Interview' },
  fyi: { emoji: '📌', label: 'FYI' },
  pitch: { emoji: '✨', label: 'Opportunity' },
};

function kindOf(b: ManagerBrief): { emoji: string; label: string } {
  if (b.pitch && PITCH_LABEL[b.pitch as PitchKind]) return PITCH_LABEL[b.pitch as PitchKind];
  return KIND[b.kind];
}

function acceptLabel(b: ManagerBrief): string {
  const fee = Number(b.data?.fee ?? 0);
  if (b.kind === 'interview') return 'Do the interview';
  if (b.kind !== 'pitch') return 'Accept';
  switch (b.pitch) {
    case 'big_feature': case 'abroad_feature': return `Pay $${fee.toLocaleString()} — book the verse`;
    case 'brand': return `Sign it — $${fee.toLocaleString()}`;
    case 'sync': return `License it — $${fee.toLocaleString()}`;
    case 'producer': return `Order the beat — $${fee.toLocaleString()}`;
    default: return 'Accept';
  }
}
const ADVICE: Record<ManagerBrief['advice'], { label: string; cls: string }> = {
  take: { label: 'Take it', cls: 'bg-rise/15 text-rise' },
  pass: { label: 'Pass', cls: 'bg-fall/15 text-fall' },
  counter: { label: 'Counter', cls: 'bg-amber/15 text-amber' },
  'your call': { label: 'Your call', cls: 'bg-white/10 text-ink2' },
};

export function BriefCard({ b, managerName, onDone }: { b: ManagerBrief; managerName: string; onDone?: (msg: { ok: boolean; message: string }) => void }) {
  const actOnBrief = useGameStore((s) => s.actOnBrief);
  const setScreen = useGameStore((s) => s.setScreen);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const done = b.status === 'done';
  const today = useGameStore((st) => dateToSerial(st.gameDate));
  const left = b.expiresSerial !== undefined ? b.expiresSerial - today : undefined;
  const k = kindOf(b);
  const act = (a: 'accept' | 'decline' | 'counter') => {
    const r = actOnBrief(b.id, a);
    setMsg(r);
    onDone?.(r);
    if (r.ok && a === 'accept' && b.kind === 'interview') setScreen('interviews');
  };
  return (
    <div className={cn('rounded-[14px] border p-4', done ? 'border-line bg-white/[0.02] opacity-70' : b.status === 'new' ? 'border-amber/40 bg-amber/[0.04]' : 'border-line bg-card')}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-white/[0.05] flex items-center justify-center text-[20px] shrink-0">{k.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-ink3">{k.label}</span>
            {b.status === 'new' && <span className="text-[10px] font-bold text-amber">NEW</span>}
            {!done && left !== undefined && <span className={cn('text-[10px] font-semibold', left <= 2 ? 'text-fall' : 'text-ink3')}>{left <= 0 ? 'last day' : `${left}d left`}</span>}
          </div>
          <div className="text-[14px] font-semibold text-ink leading-snug mt-0.5">{b.title}</div>
        </div>
        <span className={cn('px-2 h-[22px] rounded-full text-[11px] font-bold flex items-center shrink-0', ADVICE[b.advice].cls)}>{ADVICE[b.advice].label}</span>
      </div>
      <ul className="mt-3 space-y-1">
        {b.details.map((d, i) => <li key={i} className="text-[12px] text-ink2 leading-snug">• {d}</li>)}
      </ul>
      <div className="mt-3 rounded-[10px] bg-black/25 px-3 py-2 text-[12px] text-ink">
        <span className="text-ink3">{managerName}:</span> “{b.reason}{b.counterAt ? ` I'd go back at $${b.counterAt.toLocaleString()}.` : ''}”
      </div>
      {done ? (
        <div className="mt-2 text-[12px] text-ink3">✓ {b.outcome ?? 'Handled.'}</div>
      ) : (
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => act('accept')}>{acceptLabel(b)}</Button>
          {b.counterAt && <Button size="sm" variant="secondary" onClick={() => act('counter')}>Counter ${b.counterAt.toLocaleString()}</Button>}
          <Button size="sm" variant="ghost" onClick={() => act('decline')}>Pass</Button>
          {b.kind === 'show' && <Button size="sm" variant="ghost" onClick={() => setScreen('shows')}>Negotiate myself</Button>}
        </div>
      )}
      {msg && <div className={cn('mt-2 text-[12px]', msg.ok ? 'text-rise' : 'text-fall')}>{msg.message}</div>}
    </div>
  );
}

export function ManagerDesk({ compact }: { compact?: boolean }) {
  const desk = useGameStore((s) => s.managerDesk);
  const contracts = useGameStore((s) => s.contracts);
  const npcs = useGameStore((s) => s.npcs);
  const c = contracts.find((x) => x.type === 'management' && x.active);
  const manager = c ? npcs.find((n) => n.id === c.npcId) : undefined;
  const pushManager = useGameStore((s) => s.pushManager);
  const push = useGameStore((s) => s.managerPush);
  const today = useGameStore((s) => dateToSerial(s.gameDate));
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const open = (desk ?? []).filter((b) => b.status !== 'done');
  const done = (desk ?? []).filter((b) => b.status === 'done').slice(0, compact ? 0 : 6);
  if (!manager) {
    return (
      <div className="rounded-[14px] border border-dashed border-line p-4 text-[12px] text-ink3">
        <div className="text-[13px] font-semibold text-ink mb-1">📋 No manager</div>
        Every show offer, feature ask and interview request lands in your DMs and mailbox. Sign a manager and they'll handle the business — reading the small print and telling you what to take.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">📋 {manager.name}'s desk</div>
        <div className="text-[11px] text-ink3">{open.length} waiting</div>
      </div>
      {(() => {
        const sp = specialtyOf(manager);
        if (!sp) return null;
        const active = push && push.until >= today ? push : null;
        return (
          <div className="rounded-[12px] border border-line bg-card px-3 py-2.5">
            <div className="text-[12px] text-ink"><span className="font-semibold">{sp.emoji} {sp.label}</span> <span className="text-ink3">· {sp.tagline} · {managerReach(manager).label}</span></div>
            {!compact && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-ink3">Ask them to push for:</span>
                {(['shows', 'features', 'deals'] as const).map((k) => (
                  <button key={k} onClick={() => { const r = pushManager(k); setPushMsg(r.message); }} className={cn('h-7 px-2.5 rounded-full border text-[11px] font-semibold', active?.kind === k ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink2 hover:text-ink')}>{k === 'shows' ? '🎟️ Shows' : k === 'features' ? '🤝 Features' : '💼 Deals'}</button>
                ))}
                {active && <span className="text-[11px] text-ink3">Pushing {active.kind} · {active.until - today}d left</span>}
              </div>
            )}
            {pushMsg && <div className="mt-1 text-[11px] text-rise">{pushMsg}</div>}
          </div>
        );
      })()}
      {open.length === 0 && <div className="rounded-[14px] border border-line bg-card p-4 text-[12px] text-ink3">Nothing waiting. {manager.name} will brief you when something comes in.</div>}
      {open.map((b) => <BriefCard key={b.id} b={b} managerName={manager.name.split(' ')[0]} />)}
      {done.length > 0 && (
        <details>
          <summary className="text-[12px] text-ink3 cursor-pointer">Handled ({done.length})</summary>
          <div className="space-y-2 mt-2">{done.map((b) => <BriefCard key={b.id} b={b} managerName={manager.name.split(' ')[0]} />)}</div>
        </details>
      )}
    </div>
  );
}

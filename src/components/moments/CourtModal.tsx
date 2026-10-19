// ─── IN COURT ──────────────────────────────────────────────────────────────
// When the clock reaches a hearing: you're at the courthouse. Let your lawyer
// lead, take the stand yourself, or walk out (your lawyer carries on — or
// nobody speaks for you).

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { Avatar } from '../social/shared';
import { CASE_LABEL } from '../../sim/court';
import { fmtMinute } from '../../sim/appointments';

export function CourtModal() {
  const active = useGameStore((s) => s.activeHearing);
  const cases = useGameStore((s) => s.cases);
  const attend = useGameStore((s) => s.attendHearing);
  const [done, setDone] = useState<{ title: string; text: string } | null>(null);
  if (!active && !done) return null;
  if (done) {
    return (
      <Shell>
        <div className="p-5 text-center">
          <div className="text-[44px]">⚖️</div>
          <div className="text-[20px] font-bold text-ink mt-2">{done.title}</div>
          <div className="rounded-[14px] bg-black/35 border border-white/10 px-4 py-3 text-[14px] text-ink leading-snug mt-4 text-left">{done.text}</div>
          <Button className="w-full mt-4" onClick={() => setDone(null)}>Continue</Button>
        </div>
      </Shell>
    );
  }
  const [cid, hid] = (active ?? '').split('|');
  const c = (cases ?? []).find((x) => x.id === cid);
  const h = c?.hearings.find((x) => x.id === hid);
  if (!c || !h) return null;
  const them = c.side === 'plaintiff' ? c.defendant : c.plaintiff;
  const trial = h.kind === 'trial';
  const go = (mode: 'lawyer' | 'testify' | 'leave') => {
    const r = attend(mode);
    setDone({ title: trial ? 'The verdict' : 'The hearing', text: r.message });
  };
  return (
    <Shell>
      <div className="p-5 pb-4 text-center">
        <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink3">{fmtMinute(h.atMinute)} · {c.court}</div>
        <div className="text-[44px] leading-none mt-3">⚖️</div>
        <div className="text-[20px] font-bold text-ink mt-3 leading-tight">{trial ? 'The trial' : 'First hearing'}: {c.plaintiff.name} v. {c.defendant.name}</div>
        <div className="text-[13px] text-ink2 mt-1">{CASE_LABEL[c.kind].title} · ${c.claim.toLocaleString()}</div>
        <div className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 pl-1 pr-3 py-1">
          <Avatar name={them.name} seed={them.id} size={28} />
          <span className="text-[13px] font-semibold text-ink">{them.name}</span>
          <span className="text-[11px] text-ink3">with {c.theirLawyer.name}</span>
        </div>
      </div>
      <div className="px-5 pb-5 space-y-2.5">
        <div className="rounded-[12px] bg-black/30 border border-white/10 px-3.5 py-2.5 text-[12px] text-ink2 leading-snug text-center">
          {c.ourLawyer && c.ourLawyer.source !== 'self' ? `${c.ourLawyer.name} is beside you.` : 'Nobody is beside you. You speak for yourself.'}
          {trial ? ' The judge hears the evidence today and rules.' : ' The judge will set a trial date and push both sides to settle.'}
        </div>
        {c.ourLawyer && c.ourLawyer.source !== 'self' && (
          <button onClick={() => go('lawyer')} className="w-full text-left rounded-[14px] border border-white/10 bg-black/35 hover:border-amber/60 px-4 py-3">
            <div className="text-[14px] font-semibold text-ink">Let {c.ourLawyer.name} lead</div>
            <div className="text-[12px] text-ink3">Skill {c.ourLawyer.skill} against {c.theirLawyer.skill}.</div>
          </button>
        )}
        <button onClick={() => go('testify')} className="w-full text-left rounded-[14px] border border-white/10 bg-black/35 hover:border-amber/60 px-4 py-3">
          <div className="text-[14px] font-semibold text-ink">{trial ? 'Take the stand' : 'Speak to the judge yourself'}</div>
          <div className="text-[12px] text-ink3">Charisma and discipline matter. Cross-examination can go either way.</div>
        </button>
        <button onClick={() => go('leave')} className="w-full text-left rounded-[14px] border border-fall/30 bg-black/35 hover:bg-fall/10 px-4 py-3">
          <div className="text-[14px] font-semibold text-fall">Leave</div>
          <div className="text-[12px] text-ink3">{c.ourLawyer && c.ourLawyer.source !== 'self' ? 'Your lawyer carries on without you.' : c.side === 'plaintiff' ? 'Your case gets struck out.' : 'The court rules without you.'}</div>
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/75 rl-fade" />
      <div className="relative w-full sm:max-w-[460px] max-h-[92vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-line rl-rise" style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(201,162,39,0.25), rgba(10,11,16,0) 60%), linear-gradient(180deg, #17150c, #0c0d12)' }}>
        {children}
      </div>
    </div>
  );
}

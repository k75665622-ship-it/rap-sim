// ─── THE COURTHOUSE ────────────────────────────────────────────────────────
// Your cases (either side), what you could sue over, and who represents you.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { Avatar } from '../social/shared';
import { cn } from '@/utils/cn';
import { dateToSerial } from '../../sim/gameClock';
import { CASE_LABEL, lawyerOptions, type LegalCase, type Lawyer, type CaseKind } from '../../sim/court';
import { fmtMinute } from '../../sim/appointments';

type Tab = 'cases' | 'file' | 'closed';

const STATUS: Record<LegalCase['status'], { t: string; c: string }> = {
  served: { t: 'Served', c: 'text-amber' },
  hearing: { t: 'In court', c: 'text-amber' },
  settled: { t: 'Settled', c: 'text-ink2' },
  won: { t: 'Won', c: 'text-rise' },
  lost: { t: 'Lost', c: 'text-fall' },
  dismissed: { t: 'Dismissed', c: 'text-ink3' },
  withdrawn: { t: 'Dropped', c: 'text-ink3' },
};

export function CourtScreen() {
  const cases = useGameStore((s) => s.cases);
  const crew = useGameStore((s) => s.crew);
  const [tab, setTab] = useState<Tab>('cases');
  const [openId, setOpenId] = useState<string | null>(null);
  const active = (cases ?? []).filter((c) => c.status === 'served' || c.status === 'hearing');
  const closed = (cases ?? []).filter((c) => !(c.status === 'served' || c.status === 'hearing'));
  const lawyer = (crew ?? []).find((c) => c.role === 'lawyer');
  const grievances = useGrievances();
  const openCase = (cases ?? []).find((c) => c.id === openId);

  return (
    <div className="max-w-[880px] mx-auto space-y-4 pb-12">
      <div className="rounded-[20px] border border-line p-5 overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 100% 0%, rgba(201,162,39,0.22), rgba(10,11,16,0) 60%), linear-gradient(135deg, #15140f, #14161e)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-amber">Courthouse</div>
            <h1 className="text-[26px] font-bold text-ink leading-tight mt-1">Law & disputes</h1>
            <div className="text-[13px] text-ink2 mt-1 max-w-lg">When a deal goes wrong and the DMs don't fix it. Cases take weeks, hearings happen on the clock, and lawyers make the difference.</div>
          </div>
          <div className="text-[44px] leading-none">⚖️</div>
        </div>
        <div className="mt-3 text-[12px] text-ink2">{lawyer ? <>Your lawyer: <b className="text-ink">{lawyer.npcName}</b> · skill {lawyer.skill}</> : <>No lawyer on your team — you can hire one for any case, or <span className="text-amber">add one in Team</span> so you're covered.</>}</div>
      </div>

      <div className="flex gap-1.5">
        {([['cases', `Active${active.length ? ` · ${active.length}` : ''}`], ['file', `File a case${grievances.length ? ` · ${grievances.length}` : ''}`], ['closed', 'Closed']] as [Tab, string][]).map(([id, l]) => (
          <button key={id} onClick={() => { setTab(id); setOpenId(null); }} className={cn('h-9 px-4 rounded-full border text-[13px] font-semibold', tab === id ? 'border-amber bg-amber/15 text-amber' : 'border-line bg-card text-ink2')}>{l}</button>
        ))}
      </div>

      {openCase ? <CaseView c={openCase} onBack={() => setOpenId(null)} /> : tab === 'cases' ? (
        active.length === 0 ? <Empty text="No open cases. Keep it that way." /> : <div className="space-y-2">{active.map((c) => <CaseRow key={c.id} c={c} onOpen={() => setOpenId(c.id)} />)}</div>
      ) : tab === 'closed' ? (
        closed.length === 0 ? <Empty text="Nothing on record." /> : <div className="space-y-2">{closed.map((c) => <CaseRow key={c.id} c={c} onOpen={() => setOpenId(c.id)} />)}</div>
      ) : <FileCase grievances={grievances} onFiled={() => setTab('cases')} />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[14px] border border-dashed border-line p-8 text-center text-[13px] text-ink3">{text}</div>;
}

function CaseRow({ c, onOpen }: { c: LegalCase; onOpen: () => void }) {
  const next = c.hearings.find((h) => !h.done);
  const them = c.side === 'plaintiff' ? c.defendant : c.plaintiff;
  const offers = c.offers.filter((o) => o.status === 'open' && o.from === 'them').length;
  return (
    <button onClick={onOpen} className="w-full text-left rounded-[16px] border border-line bg-card hover:bg-cardhover p-4 flex items-center gap-3">
      <Avatar name={them.name} seed={them.id} size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-ink truncate">{c.plaintiff.name} v. {c.defendant.name}</div>
        <div className="text-[12px] text-ink2">{CASE_LABEL[c.kind].emoji} {CASE_LABEL[c.kind].title} · ${c.claim.toLocaleString()}</div>
        <div className="text-[11px] text-ink3 mt-0.5">{c.side === 'plaintiff' ? 'You are suing' : 'You are being sued'}{next ? ` · next: ${next.kind === 'trial' ? 'trial' : 'hearing'} ${fmtMinute(next.atMinute)}` : ''}{offers ? ` · ${offers} offer waiting` : ''}</div>
      </div>
      <span className={cn('text-[11px] font-bold uppercase', STATUS[c.status].c)}>{STATUS[c.status].t}</span>
    </button>
  );
}

function CaseView({ c, onBack }: { c: LegalCase; onBack: () => void }) {
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const today = useGameStore((s) => dateToSerial(s.gameDate));
  const hire = useGameStore((s) => s.hireLawyer);
  const answer = useGameStore((s) => s.answerCase);
  const offer = useGameStore((s) => s.offerSettlement);
  const accept = useGameStore((s) => s.acceptSettlement);
  const reject = useGameStore((s) => s.rejectSettlement);
  const withdraw = useGameStore((s) => s.withdrawCase);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [amount, setAmount] = useState('');
  const live = c.status === 'served' || c.status === 'hearing';
  const them = c.side === 'plaintiff' ? c.defendant : c.plaintiff;
  const next = c.hearings.find((h) => !h.done);
  const strength = c.side === 'plaintiff' ? c.evidence : 100 - c.evidence;
  const strengthWord = strength >= 75 ? 'Strong' : strength >= 55 ? 'Decent' : strength >= 40 ? 'Coin flip' : 'Weak';
  const options = lawyerOptions(c.claim, 0);
  const teamLawyer = (crew ?? []).find((x) => x.role === 'lawyer');
  const openOffers = c.offers.filter((o) => o.status === 'open' && o.from === 'them');
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-[13px] text-ink2 hover:text-ink">← All cases</button>
      <div className="rounded-[18px] border border-line bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-ink3">{c.court}</div>
          <span className={cn('text-[11px] font-bold uppercase', STATUS[c.status].c)}>{STATUS[c.status].t}</span>
        </div>
        <div className="flex items-center justify-center gap-4 my-4">
          <div className="text-center w-[120px]"><Avatar name={c.plaintiff.name} seed={c.plaintiff.id === 'player' ? 'player' : c.plaintiff.id} size={56} /><div className="text-[13px] font-semibold text-ink mt-1 truncate">{c.plaintiff.name}</div><div className="text-[10px] uppercase tracking-wider text-ink3">Claimant</div></div>
          <div className="text-[20px] font-black text-ink3">v.</div>
          <div className="text-center w-[120px]"><Avatar name={c.defendant.name} seed={c.defendant.id === 'player' ? 'player' : c.defendant.id} size={56} /><div className="text-[13px] font-semibold text-ink mt-1 truncate">{c.defendant.name}</div><div className="text-[10px] uppercase tracking-wider text-ink3">Defendant</div></div>
        </div>
        <div className="text-center text-[14px] text-ink">{CASE_LABEL[c.kind].emoji} {CASE_LABEL[c.kind].title} · <b>${c.claim.toLocaleString()}</b></div>
        <ul className="mt-3 space-y-1">{c.facts.map((f, i) => <li key={i} className="text-[12px] text-ink2">• {f}</li>)}</ul>
        {live && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            <div className="rounded-[12px] bg-sidebar border border-line p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Your position</div><div className={cn('text-[16px] font-bold', strength >= 55 ? 'text-rise' : strength >= 40 ? 'text-amber' : 'text-fall')}>{strengthWord}</div></div>
            <div className="rounded-[12px] bg-sidebar border border-line p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Their lawyer</div><div className="text-[13px] font-semibold text-ink truncate">{c.theirLawyer.name}</div><div className="text-[11px] text-ink3">skill {c.theirLawyer.skill}</div></div>
            <div className="rounded-[12px] bg-sidebar border border-line p-3"><div className="text-[10px] uppercase tracking-wider text-ink3">Next</div><div className="text-[13px] font-semibold text-ink">{next ? `${next.kind === 'trial' ? 'Trial' : 'Hearing'}` : c.side === 'defendant' && c.status === 'served' ? 'Your answer' : 'Their answer'}</div><div className="text-[11px] text-ink3">{next ? fmtMinute(next.atMinute) : c.answerBy ? `within ${Math.max(0, c.answerBy - today)} days` : 'this week'}</div></div>
          </div>
        )}
        {c.outcome && <div className="mt-4 rounded-[12px] border border-line bg-sidebar px-4 py-3 text-[13px] text-ink">{c.outcome.text}</div>}
      </div>

      {msg && <div className={cn('rounded-[12px] border px-4 py-2.5 text-[13px]', msg.ok ? 'border-rise/40 text-rise' : 'border-fall/40 text-fall')}>{msg.message}</div>}

      {live && c.side === 'defendant' && c.status === 'served' && (
        <div className="rounded-[16px] border border-amber/40 bg-amber/5 p-4">
          <div className="text-[14px] font-semibold text-ink">Answer the claim{c.answerBy ? ` — ${Math.max(0, c.answerBy - today)} days left` : ''}</div>
          <div className="text-[12px] text-ink2 mt-0.5">Ignore it and the court decides without you.</div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="secondary" disabled={money < c.claim} onClick={() => setMsg(answer(c.id, 'pay'))}>Pay ${c.claim.toLocaleString()}</Button>
            <Button size="sm" variant="secondary" onClick={() => setMsg(answer(c.id, 'settle'))}>Try to settle</Button>
            <Button size="sm" onClick={() => setMsg(answer(c.id, 'fight'))}>Fight it</Button>
          </div>
        </div>
      )}

      {live && (
        <div className="rounded-[16px] border border-line bg-card p-4">
          <div className="text-[14px] font-semibold text-ink">Representation</div>
          {c.ourLawyer ? (
            <div className="text-[13px] text-ink2 mt-1">{c.ourLawyer.source === 'self' ? 'You are representing yourself.' : <><b className="text-ink">{c.ourLawyer.name}</b> · skill {c.ourLawyer.skill}{c.ourLawyer.perHearing ? ` · $${c.ourLawyer.perHearing.toLocaleString()} per hearing` : ''}. They can go to hearings for you.</>}</div>
          ) : <div className="text-[13px] text-fall mt-1">Nobody represents you. Miss a hearing without a lawyer and you lose by default.</div>}
          {(!c.ourLawyer || c.ourLawyer.source === 'self' || c.ourLawyer.source === 'legal_aid') && (
            <div className="grid sm:grid-cols-3 gap-2 mt-3">
              {teamLawyer && <button onClick={() => setMsg(hire(c.id, 'team'))} className="text-left rounded-[12px] border border-rise/40 bg-rise/5 p-3"><div className="text-[13px] font-semibold text-ink">{teamLawyer.npcName}</div><div className="text-[11px] text-ink3">Your team lawyer · skill {teamLawyer.skill} · no extra fee</div></button>}
              {options.filter((o) => o.source !== c.ourLawyer?.source).map((o) => (
                <button key={o.source} disabled={money < o.retainer} onClick={() => setMsg(hire(c.id, o.source))} className="text-left rounded-[12px] border border-line bg-sidebar hover:border-amber/50 p-3 disabled:opacity-40">
                  <div className="text-[13px] font-semibold text-ink">{o.name}</div>
                  <div className="text-[11px] text-ink3">skill {o.skill} · ${o.retainer.toLocaleString()} + ${o.perHearing.toLocaleString()}/hearing</div>
                  <div className="text-[11px] text-ink2 mt-0.5">{o.blurb}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {live && (
        <div className="rounded-[16px] border border-line bg-card p-4">
          <div className="text-[14px] font-semibold text-ink">Settle</div>
          {openOffers.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-2 mt-2 rounded-[12px] bg-sidebar border border-line px-3 py-2.5">
              <span className="text-[13px] text-ink flex-1">{c.side === 'plaintiff' ? `${them.name} offers` : `${them.name} would settle for`} <b>${o.amount.toLocaleString()}</b></span>
              <Button size="sm" onClick={() => setMsg(accept(c.id, o.id))}>Accept</Button>
              <Button size="sm" variant="ghost" onClick={() => setMsg(reject(c.id, o.id))}>Reject</Button>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder={c.side === 'plaintiff' ? 'What you\'d accept' : 'What you\'d pay'} className="flex-1 min-w-0 h-9 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink" />
            <Button size="sm" variant="secondary" disabled={!amount} onClick={() => setMsg(offer(c.id, Number(amount)))}>Offer</Button>
            {c.side === 'plaintiff' && <Button size="sm" variant="ghost" onClick={() => setMsg(withdraw(c.id))}>Drop the case</Button>}
          </div>
        </div>
      )}

      <div className="rounded-[16px] border border-line bg-card p-4">
        <div className="text-[14px] font-semibold text-ink mb-2">Record</div>
        <div className="space-y-1.5">{[...c.log].reverse().map((l, i) => <div key={i} className="text-[12px] text-ink2"><span className="text-ink3">{l.serial === today ? 'Today' : `${today - l.serial}d ago`} · </span>{l.text}</div>)}</div>
        {c.costs > 0 && <div className="text-[11px] text-ink3 mt-2">Your legal costs so far: ${c.costs.toLocaleString()}</div>}
      </div>
    </div>
  );
}

interface Grievance { kind: CaseKind; refId: string; npcId: string; npcName: string; claim: number; text: string; ready: boolean; wait?: string }

/** What the player could take to court right now. */
function useGrievances(): Grievance[] {
  const fr = useGameStore((s) => s.featureRequests);
  const ir = useGameStore((s) => s.inboundRequests);
  const cases = useGameStore((s) => s.cases);
  const today = useGameStore((s) => dateToSerial(s.gameDate));
  return useMemo(() => {
    const open = new Set((cases ?? []).filter((c) => c.status === 'served' || c.status === 'hearing').map((c) => c.refId));
    const out: Grievance[] = [];
    for (const r of fr) {
      if (r.status !== 'paid_waiting' || open.has(r.id) || r.verseDueSerial === undefined || today <= r.verseDueSerial) continue;
      const late = today - r.verseDueSerial;
      out.push({ kind: 'breach_feature', refId: r.id, npcId: r.npcId, npcName: r.npcName, claim: Math.round((r.fee - (r.refunded ?? 0)) * 1.5), text: `You paid $${r.fee.toLocaleString()} for a verse on "${r.songTitle}". It's ${late} day${late > 1 ? 's' : ''} late.`, ready: late >= 7, wait: late < 7 ? `You can file in ${7 - late} days` : undefined });
    }
    for (const r of ir) {
      if (r.status !== 'delivered' || !(r.balanceDue ?? 0) || open.has(r.id)) continue;
      const since = today - (r.deliveredSerial ?? today);
      out.push({ kind: 'unpaid_fee', refId: r.id, npcId: r.npcId, npcName: r.npcName, claim: Math.round((r.balanceDue ?? 0) * 1.3), text: `You delivered a verse on "${r.npcSongTitle}"; $${(r.balanceDue ?? 0).toLocaleString()} is unpaid (${since} days).`, ready: since >= 14, wait: since < 14 ? `You can file in ${14 - since} days` : undefined });
    }
    return out;
  }, [fr, ir, cases, today]);
}

function FileCase({ grievances, onFiled }: { grievances: Grievance[]; onFiled: () => void }) {
  const crew = useGameStore((s) => s.crew);
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const file = useGameStore((s) => s.fileCase);
  const [pick, setPick] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const team = (crew ?? []).find((c) => c.role === 'lawyer');
  if (!grievances.length) return <Empty text="Nothing to sue over right now. When someone takes your money and doesn't deliver — or doesn't pay you — it shows up here." />;
  return (
    <div className="space-y-2">
      {msg && <div className={cn('rounded-[12px] border px-4 py-2.5 text-[13px]', msg.ok ? 'border-rise/40 text-rise' : 'border-fall/40 text-fall')}>{msg.message}</div>}
      {grievances.map((g) => (
        <div key={g.refId} className="rounded-[16px] border border-line bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar name={g.npcName} seed={g.npcId} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-ink">{CASE_LABEL[g.kind].emoji} {CASE_LABEL[g.kind].title} — {g.npcName}</div>
              <div className="text-[12px] text-ink2">{g.text}</div>
              <div className="text-[11px] text-ink3">Claim: ${g.claim.toLocaleString()} (what you're owed plus damages) · filing fee $120</div>
            </div>
          </div>
          {!g.ready ? <div className="text-[12px] text-ink3 mt-2">{g.wait} — give them a chance first.</div> : pick === g.refId ? (
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              {team && <LawyerPick label={`${team.npcName} (your lawyer)`} sub={`skill ${team.skill} · no extra fee`} onPick={() => { const r = file({ kind: g.kind, refId: g.refId, lawyer: 'team' as Lawyer['source'] }); setMsg(r); if (r.ok) onFiled(); }} />}
              {lawyerOptions(g.claim, 0).map((o) => <LawyerPick key={o.source} label={o.name} sub={`skill ${o.skill} · $${o.retainer.toLocaleString()} retainer + $${o.perHearing.toLocaleString()}/hearing`} disabled={money < o.retainer + 120} onPick={() => { const r = file({ kind: g.kind, refId: g.refId, lawyer: o.source }); setMsg(r); if (r.ok) onFiled(); }} />)}
              <LawyerPick label="Represent yourself" sub="Free. Judges are patient; opposing lawyers aren't." onPick={() => { const r = file({ kind: g.kind, refId: g.refId, lawyer: 'self' }); setMsg(r); if (r.ok) onFiled(); }} />
            </div>
          ) : <div className="mt-3"><Button size="sm" onClick={() => setPick(g.refId)}>File this case</Button></div>}
        </div>
      ))}
    </div>
  );
}

function LawyerPick({ label, sub, onPick, disabled }: { label: string; sub: string; onPick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onPick} className="text-left rounded-[12px] border border-line bg-sidebar hover:border-amber/50 p-3 disabled:opacity-40">
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <div className="text-[11px] text-ink3">{sub}</div>
    </button>
  );
}

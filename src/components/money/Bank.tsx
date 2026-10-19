// ─── MONEY: THE BANK ───────────────────────────────────────────────────────
// Your credit score and why, what the bank will lend you and at what rate,
// and every loan you have: what's left, what's due and when.

import { useState } from 'react';
import { useGameStore, creditOf, monthlyIncomeOf } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { personalOffer, paymentFor, scoreBand } from '../../sim/bank';
import { serialToDate, formatMedium } from '../../sim/gameClock';
import { usd } from './shared';

export function BankPanel() {
  const p = useGameStore((s) => s.player);
  const score = useGameStore((s) => creditOf(s));
  const income = useGameStore((s) => monthlyIncomeOf(s));
  const loans = useGameStore((s) => s.loans) ?? [];
  const creditRec = useGameStore((s) => s.credit);
  const takeLoan = useGameStore((s) => s.takeLoan);
  const repayLoan = useGameStore((s) => s.repayLoan);
  const setScreen = useGameStore((s) => s.setScreen);
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null);
  const band = scoreBand(score);
  const offer = p ? personalOffer(score, income, p.country) : null;
  const [amount, setAmount] = useState(() => Math.min(offer?.max ?? 1000, 5000));
  if (!p) return null;
  const active = loans.filter((l) => l.status === 'active');
  const shown = loans.filter((l) => l.status === 'active' || l.status === 'default');
  const credit = creditRec ?? { missedEver: 0, defaults: 0, paidOff: 0 };
  const amt = Math.min(offer?.max ?? 0, Math.max(500, amount));

  return (
    <div className="space-y-4">
      <div className="rounded-[16px] border border-line bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink3">Credit score</div>
            <div className="flex items-baseline gap-2 mt-0.5"><span className="text-[34px] font-black text-ink num leading-none">{score}</span><span className={cn('text-[13px] font-semibold', band.tone === 'good' ? 'text-rise' : band.tone === 'ok' ? 'text-amber' : 'text-fall')}>{band.label}</span></div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-ink3">You earn about</div>
            <div className="text-[18px] font-bold text-ink num">{usd(income)}<span className="text-[12px] text-ink3 font-normal">/month</span></div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className={cn('h-full', band.tone === 'good' ? 'bg-rise' : band.tone === 'ok' ? 'bg-amber' : 'bg-fall')} style={{ width: `${((score - 300) / 550) * 100}%` }} /></div>
        <div className="mt-2 text-[12px] text-ink3">Built from what you earn, how long you've been earning, what you own and whether you pay. {credit.paidOff ? `${credit.paidOff} loan${credit.paidOff > 1 ? 's' : ''} paid off. ` : ''}{credit.missedEver ? `${credit.missedEver} missed payment${credit.missedEver > 1 ? 's' : ''} on record. ` : ''}{credit.defaults ? `${credit.defaults} default${credit.defaults > 1 ? 's' : ''} — that follows you.` : ''}</div>
      </div>

      {flash && <div className={cn('rounded-[12px] px-4 py-2.5 text-[13px]', flash.ok ? 'bg-rise/10 text-rise border border-rise/30' : 'bg-fall/10 text-fall border border-fall/30')}>{flash.message}</div>}

      {shown.length > 0 && (
        <section className="rounded-[16px] border border-line bg-card p-4">
          <h3 className="text-[14px] font-semibold text-ink mb-2">Your loans</h3>
          <div className="space-y-2">
            {shown.map((l) => (
              <div key={l.id} className={cn('rounded-[12px] border px-3 py-2.5', l.missed || l.status === 'default' ? 'border-fall/50 bg-fall/[0.05]' : 'border-line')}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-ink">{l.kind === 'mortgage' ? '🏠 Mortgage' : '💳 Personal loan'} · {l.lender}</div>
                    <div className="text-[11px] text-ink3">{usd(l.monthly)}/month · {(l.apr * 100).toFixed(1)}% · {l.paidMonths}/{l.months} paid · next due {formatMedium(serialToDate(l.nextDue))}{l.missed ? ` · ${l.missed} missed` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-ink num">{usd(l.balance)}</div>
                    <div className="text-[10px] text-ink3">left to pay</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">{l.status === 'default'
                  ? <Button size="sm" variant="ghost" onClick={() => setScreen('court')}>Called in — see the case →</Button>
                  : <Button size="sm" variant="ghost" disabled={p.career.money < l.balance} onClick={() => setFlash(repayLoan(l.id))}>Pay it all off</Button>}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-ink3">Payments come out on their due date. Miss three in a row and the bank calls the loan in — and takes you to court for it. A mortgage is secured on the house.</div>
        </section>
      )}

      <section className="rounded-[16px] border border-line bg-card p-4">
        <h3 className="text-[14px] font-semibold text-ink">Borrow</h3>
        {offer && !active.some((l) => l.kind === 'personal') ? (
          <>
            <div className="text-[12px] text-ink3 mt-0.5">Up to {usd(offer.max)} over {offer.months} months at {(offer.apr * 100).toFixed(1)}% a year.</div>
            <input type="range" min={500} max={offer.max} step={100} value={amt} onChange={(e) => setAmount(Number(e.target.value))} className="w-full mt-3 accent-amber" />
            <div className="flex items-center justify-between text-[13px] mt-1">
              <span className="text-ink font-semibold num">{usd(amt)}</span>
              <span className="text-ink3">{usd(paymentFor(amt, offer.apr, offer.months))}/month · {usd(paymentFor(amt, offer.apr, offer.months) * offer.months - amt)} interest</span>
            </div>
            <Button className="mt-3 w-full sm:w-auto" onClick={() => setFlash(takeLoan(amt))}>Take the loan</Button>
          </>
        ) : (
          <div className="text-[12px] text-ink3 mt-1">{active.some((l) => l.kind === 'personal') ? 'You already have a personal loan running. Pay it down first.' : loans.some((l) => l.status === 'default') ? 'No bank will lend to you with a default on your record.' : income < 150 ? 'Banks want to see steady income first. Release music, play shows — then come back.' : `Declined at a score of ${score}.`}</div>
        )}
        <div className="mt-3 pt-3 border-t border-line text-[12px] text-ink3">Want a house? Mortgages are in <button onClick={() => setScreen('lifestyle')} className="text-amber font-semibold">Home & Life</button> — 20% down, the bank lends the rest.</div>
      </section>
    </div>
  );
}

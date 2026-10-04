// ─── THE TURN REPORT ────────────────────────────────────────────────────────
//
// What the last press of +1 Day / +1 Week / +1 Month actually did.
//
// Until now the balance changed and nothing said why, which is the same
// experience as a bug — and this codebase turned out to have one (streaming
// revenue banked twice), which nobody could see precisely because there was no
// account of the money. So this is not decoration: it is the screen that makes
// the economy checkable.
//
// It reads a report the tick already built (`sim/ledger.ts`) and invents
// nothing. The headline totals come from the real change in the balance; the
// itemised lines are the breakdown of it; and if the breakdown does not add up
// the card says so out loud instead of quietly rounding the difference away.

import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Button } from './ui/Card';
import { money, money4, full } from '../utils/format';
import type { LedgerLine } from '../types/game';

/** Money amounts here can be fractions of a cent (per-stream rates), so the
 *  small end of the formatter is used when rounding would print "$0". */
function amount(n: number): string {
  return n > 0 && n < 1 ? money4(n) : money(n);
}

const UNIT_TITLE: Record<string, string> = {
  day: '+1 Day',
  week: '+1 Week',
  month: '+1 Month',
};

function LineRow({ line }: { line: LedgerLine }) {
  const income = line.kind === 'income';
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line/60 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink truncate">{line.label}</div>
        {line.note && (
          <div className="text-[11px] text-ink3 mt-0.5 leading-relaxed">{line.note}</div>
        )}
      </div>
      <div className={`text-[13px] font-bold tabular-nums shrink-0 ${income ? 'text-rise' : 'text-fall'}`}>
        {income ? '+' : '−'}{amount(line.amount)}
      </div>
    </div>
  );
}

export function TurnReportModal() {
  const report = useGameStore((s) => s.lastTurnReport);
  const dismiss = useGameStore((s) => s.dismissTurnReport);

  // Escape closes it, like every other overlay in the app.
  useEffect(() => {
    if (!report) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [report, dismiss]);

  if (!report) return null;

  const incomeLines = report.lines.filter((l) => l.kind === 'income');
  const expenseLines = report.lines.filter((l) => l.kind === 'expense');
  const netUp = report.net >= 0;
  const energyMoved = Math.round(report.energyAfter) !== Math.round(report.energyBefore);
  const nothingMoved = report.lines.length === 0 && Math.abs(report.net) < 0.5;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-lg rounded-[16px] border border-line bg-card my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-line">
          <div>
            <h2 className="text-[17px] font-bold text-ink">
              {UNIT_TITLE[report.unit] ?? `+1 ${report.unit}`}
              <span className="text-ink3 font-medium">
                {' '}· {report.days} {report.days === 1 ? 'day' : 'days'}
              </span>
            </h2>
            <p className="text-[12px] text-ink3 mt-1">
              {report.fromDate} → {report.toDate}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-ink3 hover:text-ink text-[20px] leading-none px-1 -mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── the two totals ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 p-5 pb-4">
          <div className="rounded-[12px] border border-line bg-bg p-3.5">
            <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">Income</div>
            <div className="text-[20px] font-black text-rise mt-1 tabular-nums">
              {amount(report.income)}
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-bg p-3.5">
            <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">Expenses</div>
            <div className="text-[20px] font-black text-fall mt-1 tabular-nums">
              {amount(report.expenses)}
            </div>
          </div>
        </div>

        {/* ── net, and the balance it landed on ──────────────────── */}
        <div className="mx-5 rounded-[12px] border border-line bg-cardhover px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">
              Net this {report.unit}
            </div>
            <div className={`text-[18px] font-black tabular-nums ${netUp ? 'text-rise' : 'text-fall'}`}>
              {netUp ? '+' : '−'}{amount(Math.abs(report.net))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">Balance</div>
            <div className="text-[15px] font-bold text-ink tabular-nums">
              {money(report.moneyAfter)}
            </div>
            <div className="text-[10px] text-ink3 tabular-nums">
              was {money(report.moneyBefore)}
            </div>
          </div>
        </div>

        {/* ── the breakdown ──────────────────────────────────────── */}
        <div className="p-5 pt-4">
          {nothingMoved ? (
            <p className="text-[12px] text-ink3 text-center py-3">
              No money moved this {report.unit}.
            </p>
          ) : (
            <div className="space-y-4">
              {incomeLines.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase mb-1">
                    Money in
                  </div>
                  <div className="rounded-[12px] border border-line bg-bg px-3.5">
                    {incomeLines.map((l) => <LineRow key={`in-${l.key}`} line={l} />)}
                  </div>
                </div>
              )}
              {expenseLines.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase mb-1">
                    Money out
                  </div>
                  <div className="rounded-[12px] border border-line bg-bg px-3.5">
                    {expenseLines.map((l) => <LineRow key={`out-${l.key}`} line={l} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* If the itemised lines did not explain the whole movement, say so
              rather than let the numbers quietly disagree. */}
          {!report.reconciled && (
            <p className="mt-3 text-[11px] text-amber leading-relaxed">
              ⚠ The itemised lines do not fully account for the change in balance — see
              “Other” above.
            </p>
          )}

          {/* ── context: the turn was more than money ───────────── */}
          <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-ink2">
            <span>
              <span className="text-ink3">Streams</span>{' '}
              <span className="font-semibold text-ink tabular-nums">{full(report.streams)}</span>
            </span>
            <span>
              <span className="text-ink3">Fans</span>{' '}
              <span className={`font-semibold tabular-nums ${report.fans >= 0 ? 'text-ink' : 'text-fall'}`}>
                {report.fans >= 0 ? '+' : '−'}{full(Math.abs(report.fans))}
              </span>
            </span>
            {energyMoved && (
              <span>
                <span className="text-ink3">Energy</span>{' '}
                <span className="font-semibold text-ink tabular-nums">
                  {Math.round(report.energyBefore)} → {Math.round(report.energyAfter)}
                </span>
              </span>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" onClick={dismiss}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

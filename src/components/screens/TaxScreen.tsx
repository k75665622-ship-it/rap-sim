// ─── TAX ────────────────────────────────────────────────────────────────────
//
// The bill, in full, with the arithmetic shown.
//
// Tax is the one cost in this game that the player cannot avoid, cannot
// negotiate, and cannot see coming unless somebody shows them. A charge that
// appears in the ledger with no explanation is indistinguishable from a bug —
// and this codebase has already had one of those — so the screen exists to make
// the number checkable: the brackets are printed, the player's position in them
// is marked, and the three components of the bill are added up in front of them.

import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Badge } from '../ui/Card';
import { money, pct } from '@/utils/format';
import {
  FEDERAL_BRACKETS,
  PROPERTY_TAX_RATE,
  STANDARD_DEDUCTION,
  STATE_LOCAL_RATE,
  holdingsValue,
  incomeTaxBill,
  money0,
  pct0,
  propertyTax,
  taxVerdict,
  type TaxableHolding,
} from '../../sim/tax';

export function TaxScreen() {
  const player = useGameStore((s) => s.player);
  const gameDate = useGameStore((s) => s.gameDate);
  const yearIncome = useGameStore((s) => s.taxYearIncome ?? 0);
  const paidThisYear = useGameStore((s) => s.taxPaidThisYear ?? 0);
  const paidLifetime = useGameStore((s) => s.taxPaidLifetime ?? 0);
  const ownedAssets = useGameStore((s) => s.ownedAssets);
  const businesses = useGameStore((s) => s.businesses);
  const investments = useGameStore((s) => s.investments);

  const bill = useMemo(() => incomeTaxBill(yearIncome), [yearIncome]);

  const holdings = useMemo<TaxableHolding[]>(
    () => [
      ...ownedAssets.map((a) => ({ label: a.name, value: a.cost })),
      ...businesses.map((b) => ({ label: b.name, value: b.monthlyRevenue * 24 })),
      ...investments.map((i) => ({ label: i.name, value: i.currentValue })),
    ],
    [ownedAssets, businesses, investments],
  );
  const totalHoldings = holdingsValue(holdings);
  const annualProperty = propertyTax(holdings);

  if (!player) return null;

  const outstanding = Math.max(0, bill.total - paidThisYear);
  const money1 = player.career.money;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-black text-ink">Tax</h1>
        <p className="text-[12px] text-ink3 mt-1">
          Modelled on United States federal income tax. Charged as you earn, on
          the cumulative method — the bill is worked out on everything you have
          made this year, and only the gap against what you have already paid is
          taken.
        </p>
      </div>

      {/* ── the year at a glance ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">
            Earned in {gameDate.year}
          </div>
          <div className="text-[18px] font-black text-ink mt-1 tabular-nums">
            {money(yearIncome)}
          </div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">Tax charged</div>
          <div className="text-[18px] font-black text-fall mt-1 tabular-nums">
            {money(paidThisYear)}
          </div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">Effective rate</div>
          <div className="text-[18px] font-black text-amber mt-1 tabular-nums">
            {bill.total > 0 ? pct0(bill.effectiveRate) : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold tracking-wider text-ink3 uppercase">Still owed</div>
          <div className="text-[18px] font-black text-ink mt-1 tabular-nums">
            {money(outstanding)}
          </div>
        </Card>
      </div>

      <p className="text-[12px] text-ink2">{taxVerdict(bill, money1)}</p>

      {/* ── the bracket table ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-bold text-ink text-sm">Federal brackets</h2>
          <Badge color="gray">standard deduction {money(STANDARD_DEDUCTION)}</Badge>
        </div>

        <div className="space-y-1">
          {FEDERAL_BRACKETS.map((band, i) => {
            const prev = i === 0 ? 0 : FEDERAL_BRACKETS[i - 1].upTo;
            // Which band the player's last dollar actually falls in.
            const active = bill.breakdown.marginalRate === band.rate && bill.breakdown.taxable > prev;
            const filled = Math.max(0, Math.min(band.upTo, bill.breakdown.taxable) - prev);
            return (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 border ${
                  active ? 'border-amber bg-amber/10' : 'border-line bg-bg'
                }`}
              >
                <div className="text-[12px] tabular-nums text-ink2">
                  {band.upTo === Infinity ? 'Above' : money(prev)} –{' '}
                  {band.upTo === Infinity ? 'no limit' : money(band.upTo)}
                </div>
                <div className="flex items-center gap-3">
                  {filled > 0 && (
                    <span className="text-[11px] text-ink3 tabular-nums">
                      {money(filled)} taxed
                    </span>
                  )}
                  <span className={`text-[13px] font-bold tabular-nums ${active ? 'text-amber' : 'text-ink'}`}>
                    {pct(band.rate, 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-ink3 mt-3 leading-relaxed">
          Each band only taxes the part of your income that falls inside it, so
          moving up a bracket never costs you money. Your next dollar is taxed at{' '}
          <span className="text-amber font-semibold">{pct0(bill.marginalRate)}</span>.
        </p>
      </Card>

      {/* ── the bill, added up ───────────────────────────────────────── */}
      <Card>
        <h2 className="font-bold text-ink text-sm mb-3">This year's bill</h2>
        <div className="space-y-2">
          <Row label="Federal income tax" value={bill.federal} note="the bracket table above" />
          <Row
            label="State and local"
            value={bill.stateLocal}
            note={`a flat ${pct(STATE_LOCAL_RATE, 0)} — real states vary, this does not pretend to`}
          />
          <Row
            label="Self-employment tax"
            value={bill.selfEmployment}
            note="both halves of Social Security and Medicare, because nobody employs you"
          />
          <div className="flex items-center justify-between pt-2 border-t border-line">
            <span className="text-[13px] font-bold text-ink">Total</span>
            <span className="text-[15px] font-black text-fall tabular-nums">{money(bill.total)}</span>
          </div>
        </div>
        <p className="text-[11px] text-ink3 mt-3">
          Paid to date <span className="text-ink font-semibold">{money(paidThisYear)}</span> ·
          paid all time <span className="text-ink font-semibold">{money(paidLifetime)}</span>
        </p>
      </Card>

      {/* ── property ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-bold text-ink text-sm">What you own</h2>
          <Badge color="gray">{pct(PROPERTY_TAX_RATE, 1)} a year</Badge>
        </div>

        {holdings.length === 0 ? (
          <p className="text-[12px] text-ink3">
            Nothing taxable. No cars, no property, no businesses — nothing for the
            tax office to come after.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {holdings.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[12px]">
                  <span className="text-ink2 truncate">{h.label}</span>
                  <span className="text-ink tabular-nums shrink-0">{money(h.value)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-line">
              <span className="text-[12px] text-ink3">
                {money(totalHoldings)} held → {money0(annualProperty)} a year
              </span>
              <span className="text-[13px] font-bold text-fall tabular-nums">
                −{money(annualProperty)}
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] text-ink">{label}</div>
        <div className="text-[11px] text-ink3 mt-0.5">{note}</div>
      </div>
      <div className="text-[13px] font-semibold text-ink tabular-nums shrink-0">{money(value)}</div>
    </div>
  );
}

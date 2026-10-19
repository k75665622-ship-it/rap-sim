// ─── THE LEDGER ─────────────────────────────────────────────────────────────
//
// Where the money went. The tick moves cash in half a dozen places — streams,
// management cuts, payroll, investments, businesses — and until now the player
// only ever saw the balance change with no account of why. A number that moves
// without an explanation is indistinguishable from a bug, and this codebase has
// already had one of those (streaming revenue was banked twice).
//
// The design is deliberately dumb, because the alternative is a second copy of
// the arithmetic:
//
//   · The tick opens a ledger, calls `ledgerAdd(key, amount)` next to each
//     money write it already makes, and drains it at the end.
//   · The report's TOTAL is not computed from the lines. It is the real
//     difference in the player's balance. The lines are only a breakdown.
//   · Whatever the lines fail to explain lands in an explicit "Other" row, and
//     `reconciled` says whether the breakdown adds up.
//
// So the total can never be wrong, and the breakdown can never silently lie —
// if a future money write is added to the tick and not instrumented, it shows
// up as "Other" instead of vanishing.
//
// This is a module-level accumulator rather than a field on the state because
// the tick runs inside a single `set()` producer: the buffer has to be visible
// to every money site inside that one synchronous pass, and it must never be
// persisted. Only the finished report is written into the save.

import type { LedgerKind, LedgerLine, TurnReport } from '../types/game';

export type { LedgerKind, LedgerLine, TurnReport };

/**
 * The one table. A key that is not here still shows up in the report — it is
 * titled from its key rather than dropped — but it loses its nice label, which
 * is the signal to come back and name it properly.
 */
const LEDGER_LABELS: Record<string, { label: string; kind: LedgerKind; note?: string }> = {
  streams: {
    label: 'Streaming royalties',
    kind: 'income',
    note: 'What the platforms actually paid out this turn.',
  },
  shows: {
    label: 'Live shows',
    kind: 'income',
    note: 'Door, fees and merch from booked dates.',
  },
  investments: {
    label: 'Investment income',
    kind: 'income',
    note: 'Monthly distributions from what you hold.',
  },
  business: {
    label: 'Business profit',
    kind: 'income',
    note: 'Revenue minus running costs.',
  },
  management: {
    label: 'Management',
    kind: 'expense',
    note: 'Commission on income, or the flat retainer.',
  },
  payroll: {
    label: 'Team payroll',
    kind: 'expense',
    note: 'Monthly wages for everyone on the payroll.',
  },
  tax: {
    label: 'Tax',
    kind: 'expense',
    note: 'Federal, state and local withholding on what you have earned this year.',
  },
  property_tax: {
    label: 'Property tax',
    kind: 'expense',
    note: 'The annual charge on what you own.',
  },
  studio_upkeep: {
    label: 'Studio upkeep',
    kind: 'expense',
    note: 'Rent, power and insurance on the studio building.',
  },
  studio_rent: {
    label: 'Studio rentals',
    kind: 'income',
    note: 'Other artists booking your room.',
  },
  beats: {
    label: 'Beats',
    kind: 'expense',
    note: 'Leases, exclusives and commissioned beats.',
  },
  ventures: {
    label: 'Your businesses',
    kind: 'income',
    note: 'What the businesses you run made (or lost) this month.',
  },
  dividends: {
    label: 'Dividends',
    kind: 'income',
    note: 'Quarterly payouts from the shares you hold.',
  },
  advisor: {
    label: 'Advisor returns',
    kind: 'income',
    note: 'What your financial advisor squeezed out of the portfolio.',
  },
  rent: {
    label: 'Rent',
    kind: 'income',
    note: 'Tenants in the buildings you developed.',
  },
  casino: {
    label: 'Sports book',
    kind: 'income',
    note: 'Winning bets paid out.',
  },
  team_work: {
    label: 'Team side work',
    kind: 'income',
    note: 'Royalties chased, beats and songs sold, brand posts.',
  },
  other: {
    label: 'Other',
    kind: 'income',
    note: 'Movements the itemised lines do not account for.',
  },
};

function labelFor(key: string): { label: string; kind: LedgerKind; note?: string } {
  const hit = LEDGER_LABELS[key];
  if (hit) return hit;
  // Unknown key: title-case it rather than hide the money.
  return {
    label: key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    kind: 'income',
  };
}

// ─── THE ACCUMULATOR ────────────────────────────────────────────────────────

let buffer: Map<string, number> | null = null;

/** Begin collecting for one turn. Safe to call when one is already open. */
export function openTurnLedger(): void {
  buffer = new Map();
}

/**
 * Record a money movement. `amount` is signed: positive is money in, negative
 * is money out. Zero is ignored so a no-op branch never creates a line.
 */
export function ledgerAdd(key: string, amount: number): void {
  if (!buffer) return;
  if (!Number.isFinite(amount) || amount === 0) return;
  buffer.set(key, (buffer.get(key) ?? 0) + amount);
}

/** Read and clear. Always call this, even on a turn nobody will be shown. */
export function drainTurnLedger(): Map<string, number> {
  const b = buffer ?? new Map<string, number>();
  buffer = null;
  return b;
}

/** True while a turn is collecting — lets a caller avoid opening twice. */
export function ledgerOpen(): boolean {
  return buffer !== null;
}

// ─── THE REPORT ─────────────────────────────────────────────────────────────

export interface BuildReportArgs {
  turnCount: number;
  unit: 'day' | 'week' | 'month';
  days: number;
  fromDate: string;
  toDate: string;
  moneyBefore: number;
  moneyAfter: number;
  entries: Map<string, number>;
  streams: number;
  fans: number;
  energyBefore: number;
  energyAfter: number;
}

/**
 * Turn the collected movements into the report the popup renders.
 *
 * The total is the real balance delta, never the sum of the lines. If the lines
 * do not add up to it, the difference is shown as "Other" and `reconciled` goes
 * false — a visible prompt to go and instrument whatever was missed.
 */
export function buildTurnReport(args: BuildReportArgs): TurnReport {
  const lines: LedgerLine[] = [];
  let income = 0;
  let expenses = 0;
  let labelledNet = 0;

  for (const [key, amount] of args.entries) {
    if (amount === 0) continue;
    const meta = labelFor(key);
    const magnitude = Math.abs(amount);
    // The direction is taken from the sign of the money, not from the table —
    // a "management" line can only be an expense, but an unknown key could be
    // either, and the sign is the fact.
    const kind: LedgerKind = amount > 0 ? 'income' : 'expense';
    if (kind === 'income') income += magnitude;
    else expenses += magnitude;
    labelledNet += amount;
    lines.push({
      key,
      label: meta.label,
      kind,
      amount: magnitude,
      note: meta.note,
    });
  }

  const net = args.moneyAfter - args.moneyBefore;
  const residual = net - labelledNet;

  // Anything the lines missed becomes an explicit row. The half-dollar
  // threshold is there because per-stream rates are fractional and a rounding
  // crumb is not an unexplained movement.
  if (Math.abs(residual) >= 0.5) {
    const kind: LedgerKind = residual > 0 ? 'income' : 'expense';
    const magnitude = Math.abs(residual);
    if (kind === 'income') income += magnitude;
    else expenses += magnitude;
    lines.push({
      key: 'other',
      label: LEDGER_LABELS.other.label,
      kind,
      amount: magnitude,
      note: LEDGER_LABELS.other.note,
    });
  }

  // Biggest first inside each group — the line that matters is the one read.
  lines.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'income' ? -1 : 1;
    return b.amount - a.amount;
  });

  return {
    turnCount: args.turnCount,
    unit: args.unit,
    days: args.days,
    fromDate: args.fromDate,
    toDate: args.toDate,
    income,
    expenses,
    net,
    moneyBefore: args.moneyBefore,
    moneyAfter: args.moneyAfter,
    lines,
    reconciled: Math.abs(residual) < 0.5,
    streams: args.streams,
    fans: args.fans,
    energyBefore: args.energyBefore,
    energyAfter: args.energyAfter,
  };
}

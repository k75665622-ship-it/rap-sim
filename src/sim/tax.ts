// ─── TAX ────────────────────────────────────────────────────────────────────
//
// You do not keep what you earn. This is modelled on United States federal
// income tax, because that is the code the request named, and it is the one
// most players will recognise the shape of:
//
//   · a progressive federal bracket table — the more you make, the higher the
//     rate on the *last* dollar, not on all of them
//   · a standard deduction, taken off the top before any bracket applies
//   · self-employment tax, because an artist is not an employee: nobody is
//     withholding for them, so they owe both halves of it
//   · a flat state-and-local rate, which in reality varies by state and here is
//     one number, stated plainly rather than pretended to be exact
//   · property tax on what you own, charged once a game year
//
// The collection method is cumulative withholding, which is how payroll
// actually works: every month the game works out what you *should* have paid on
// everything you have earned so far this year, and charges the difference
// between that and what you have already paid. That is self-correcting — a
// month that was under-charged is made up the next month, and a year that ends
// badly does not leave you having overpaid on a good spring.
//
// Every number here is derived from saved state. Nothing is stored except the
// year-to-date totals the method needs.

/** One row of the bracket table. `upTo` is the top of the band, inclusive. */
export interface TaxBracket {
  upTo: number;
  rate: number;
}

/**
 * US federal income tax brackets, single filer. The top band is open-ended, so
 * a career that goes stratospheric keeps paying the top rate on the excess
 * rather than falling off the end of the table.
 */
export const FEDERAL_BRACKETS: TaxBracket[] = [
  { upTo: 11_600, rate: 0.10 },
  { upTo: 47_150, rate: 0.12 },
  { upTo: 100_525, rate: 0.22 },
  { upTo: 191_950, rate: 0.24 },
  { upTo: 243_725, rate: 0.32 },
  { upTo: 609_350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

/** Taken off the top before any bracket applies. */
export const STANDARD_DEDUCTION = 14_600;

/** State and local, as one flat number. Real states vary; this does not pretend to. */
export const STATE_LOCAL_RATE = 0.05;

/**
 * Self-employment: both halves of Social Security and Medicare.
 *
 * These two rates are the WHOLE of the self-employment charge and must not be
 * added together anywhere — 12.4% + 2.9% is the familiar 15.3%, and an earlier
 * version of this file applied 15.3% to the Social Security base and then added
 * 2.9% again on top, which charged Medicare twice. Two terms, one charge.
 */
export const SE_SOCIAL_SECURITY_RATE = 0.124;
export const SE_SOCIAL_SECURITY_CAP = 168_600;
export const SE_MEDICARE_RATE = 0.029;

/** Annual property tax on what you own — assets, businesses and holdings. */
export const PROPERTY_TAX_RATE = 0.012;

/** The bottom of the scale, where the game stops charging anything at all. */
export const FILING_THRESHOLD = 12_000;

// ─── THE BRACKET WALK ───────────────────────────────────────────────────────

export interface BracketSlice {
  rate: number;
  /** How much of the income fell in this band. */
  amount: number;
  tax: number;
}

export interface BracketBreakdown {
  slices: BracketSlice[];
  /** Income actually taxed, after the standard deduction. */
  taxable: number;
  tax: number;
  /** What the whole bill comes to as a share of gross income. */
  effectiveRate: number;
  /** The rate on the last dollar — what the next dollar would cost. */
  marginalRate: number;
}

/**
 * Walk the brackets.
 *
 * This is the honest version: each band only taxes the part of the income that
 * falls inside it, so moving up a bracket never costs you money. A flat-rate
 * approximation here would make the tax screen a lie, and the whole reason to
 * show the table is that the player can check it.
 */
export function federalTax(grossIncome: number): BracketBreakdown {
  const slices: BracketSlice[] = [];
  const income = Math.max(0, grossIncome);
  const taxable = Math.max(0, income - STANDARD_DEDUCTION);

  let cursor = 0;
  let tax = 0;
  let marginalRate = 0;

  for (const band of FEDERAL_BRACKETS) {
    if (cursor >= taxable) break;
    const amount = Math.min(taxable, band.upTo) - cursor;
    if (amount <= 0) continue;
    const sliceTax = amount * band.rate;
    tax += sliceTax;
    slices.push({ rate: band.rate, amount, tax: sliceTax });
    marginalRate = band.rate;
    cursor += amount;
  }

  return {
    slices,
    taxable,
    tax,
    effectiveRate: income > 0 ? tax / income : 0,
    marginalRate: taxable > 0 ? marginalRate : 0,
  };
}

/**
 * Self-employment tax. Social Security stops at the cap; Medicare does not.
 * An employee would see half of this on a payslip and their employer paying
 * the other half — an artist pays both, which is the entire point of the line.
 */
export function selfEmploymentTax(grossIncome: number): number {
  const income = Math.max(0, grossIncome);
  // Social Security is capped; Medicare is not. Each rate appears exactly once.
  const socialSecurity = Math.min(income, SE_SOCIAL_SECURITY_CAP) * SE_SOCIAL_SECURITY_RATE;
  const medicare = income * SE_MEDICARE_RATE;
  return socialSecurity + medicare;
}

export interface TaxBill {
  /** Income the bill was worked out on. */
  grossIncome: number;
  federal: number;
  stateLocal: number;
  selfEmployment: number;
  /** Everything except property tax. */
  total: number;
  effectiveRate: number;
  marginalRate: number;
  breakdown: BracketBreakdown;
}

/** The full income-tax bill on a year-to-date figure. */
export function incomeTaxBill(grossIncome: number): TaxBill {
  const income = Math.max(0, grossIncome);
  if (income < FILING_THRESHOLD) {
    return {
      grossIncome: income,
      federal: 0,
      stateLocal: 0,
      selfEmployment: 0,
      total: 0,
      effectiveRate: 0,
      marginalRate: 0,
      breakdown: federalTax(income),
    };
  }
  const breakdown = federalTax(income);
  const stateLocal = income * STATE_LOCAL_RATE;
  const selfEmployment = selfEmploymentTax(income);
  const total = breakdown.tax + stateLocal + selfEmployment;
  return {
    grossIncome: income,
    federal: breakdown.tax,
    stateLocal,
    selfEmployment,
    total,
    effectiveRate: income > 0 ? total / income : 0,
    marginalRate: breakdown.marginalRate + STATE_LOCAL_RATE,
    breakdown,
  };
}

// ─── PROPERTY ───────────────────────────────────────────────────────────────

export interface TaxableHolding {
  /** What it is, for the screen. */
  label: string;
  value: number;
}

/**
 * What you own, priced for the tax screen. Only things with a resale value —
 * a car you drive is taxed, a night out is not.
 */
export function holdingsValue(holdings: TaxableHolding[]): number {
  return holdings.reduce((a, h) => a + Math.max(0, h.value), 0);
}

export function propertyTax(holdings: TaxableHolding[]): number {
  return holdingsValue(holdings) * PROPERTY_TAX_RATE;
}

// ─── WITHHOLDING ────────────────────────────────────────────────────────────

export interface WithholdingInput {
  /** Income earned so far this game year, including this month. */
  yearToDateIncome: number;
  /** Tax already charged this game year. */
  yearToDatePaid: number;
}

export interface WithholdingResult {
  /** Charge this month. Never negative — an overpayment is not a refund here. */
  due: number;
  /** The full bill the year is currently tracking toward. */
  bill: TaxBill;
  /** What is still owed on the year so far. */
  outstanding: number;
}

/**
 * How much to charge this month.
 *
 * Cumulative: the bill is worked out on everything earned so far, and the
 * charge is the gap between that and what has already been taken. So a strong
 * month is taxed in the month it happens, and a quiet one costs nothing —
 * which is what makes the tax line in the turn report move around instead of
 * being a flat percentage of whatever just came in.
 */
export function monthlyWithholding(input: WithholdingInput): WithholdingResult {
  const bill = incomeTaxBill(input.yearToDateIncome);
  const outstanding = Math.max(0, bill.total - Math.max(0, input.yearToDatePaid));
  return { due: outstanding, bill, outstanding };
}

// ─── READING IT BACK ────────────────────────────────────────────────────────

export function money0(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function pct0(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** One line for the turn report, so the charge explains itself where it lands. */
export function taxLine(due: number, yearToDateIncome: number, bill: TaxBill): string {
  if (due <= 0) return 'Nothing owed on what you have earned so far this year.';
  return (
    `Withholding on ${money0(yearToDateIncome)} earned this year — ` +
    `federal ${money0(bill.federal)}, state and local ${money0(bill.stateLocal)}, ` +
    `self-employment ${money0(bill.selfEmployment)}.`
  );
}

/**
 * The honest read on the situation, for the tax screen. Says the uncomfortable
 * thing when it is true rather than dressing it up.
 */
export function taxVerdict(bill: TaxBill, money: number): string {
  if (bill.total <= 0) return 'You are below the filing threshold. Nothing is owed yet.';
  if (money < bill.total * 0.25) {
    return 'You do not have the money for this bill. That is how artists end up owing the IRS more than they have.';
  }
  if (bill.effectiveRate > 0.45) {
    return 'Over 45% of everything you earn is going out in tax. An accountant is cheaper than this.';
  }
  return `You are keeping about ${pct0(1 - bill.effectiveRate)} of what you earn.`;
}

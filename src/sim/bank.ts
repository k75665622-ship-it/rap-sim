// ─── THE BANK ──────────────────────────────────────────────────────────────
// Borrowing money the way it really works: a credit score built from what you
// earn and whether you pay, an interest rate that depends on where you live
// (borrowing in Accra is not borrowing in London), a monthly payment that comes
// out whether the month was good or not, and a court case when you stop
// paying. A mortgage is secured on the house: default and they take it.
//
// The banks are fictional. Pure: the store owns the state.

export type LoanKind = 'personal' | 'mortgage';

export interface Loan {
  id: string;
  kind: LoanKind;
  lender: string;
  principal: number;
  /** What's still owed, interest accrued monthly. */
  balance: number;
  /** Annual rate, e.g. 0.28. */
  apr: number;
  months: number;
  monthly: number;
  startSerial: number;
  nextDue: number;
  paidMonths: number;
  /** Payments missed in a row. */
  missed: number;
  status: 'active' | 'paid' | 'default';
  /** The home it's secured on. */
  homeId?: string;
  /** The court case, once the bank sues. */
  caseId?: string;
}

export interface CreditInput {
  /** Average monthly income over the last few months. */
  monthlyIncome: number;
  reputation: number;
  /** Missed payments, ever. */
  missedEver: number;
  defaults: number;
  /** Loans paid off in full. */
  paidOff: number;
  /** Months since you started out. */
  monthsActive: number;
  netWorth: number;
}

/** 300..850, like the real thing. */
export function creditScore(i: CreditInput): number {
  let s = 560;
  s += Math.min(110, Math.log10(1 + Math.max(0, i.monthlyIncome)) * 28);
  s += Math.min(60, i.monthsActive * 2.5);
  s += Math.min(50, i.paidOff * 25);
  s += Math.min(60, Math.log10(1 + Math.max(0, i.netWorth)) * 9);
  s += (i.reputation - 50) * 0.4;
  s -= i.missedEver * 18;
  s -= i.defaults * 140;
  return Math.round(Math.max(300, Math.min(850, s)));
}

export function scoreBand(score: number): { label: string; tone: 'good' | 'ok' | 'bad' } {
  if (score >= 740) return { label: 'Excellent', tone: 'good' };
  if (score >= 670) return { label: 'Good', tone: 'good' };
  if (score >= 580) return { label: 'Fair', tone: 'ok' };
  return { label: 'Poor', tone: 'bad' };
}

/** Base rates by market, before your score moves them. */
const BASE: Record<string, { personal: number; mortgage: number }> = {
  Ghana: { personal: 0.29, mortgage: 0.21 },
  Nigeria: { personal: 0.31, mortgage: 0.23 },
  Kenya: { personal: 0.17, mortgage: 0.135 },
  'South Africa': { personal: 0.16, mortgage: 0.115 },
  Egypt: { personal: 0.26, mortgage: 0.2 },
  'United States': { personal: 0.12, mortgage: 0.068 },
  'United Kingdom': { personal: 0.095, mortgage: 0.052 },
  Canada: { personal: 0.105, mortgage: 0.055 },
  France: { personal: 0.07, mortgage: 0.04 },
  Germany: { personal: 0.075, mortgage: 0.042 },
  Japan: { personal: 0.06, mortgage: 0.018 },
  Brazil: { personal: 0.4, mortgage: 0.12 },
  Jamaica: { personal: 0.2, mortgage: 0.09 },
};

export function rateFor(kind: LoanKind, country: string | undefined, score: number): number {
  const b = BASE[country ?? ''] ?? { personal: 0.15, mortgage: 0.08 };
  const base = kind === 'mortgage' ? b.mortgage : b.personal;
  // Every 50 points below 740 costs about a point and a half.
  const adj = Math.max(-0.01, ((740 - score) / 50) * 0.015);
  return Math.round((base + adj) * 1000) / 1000;
}

/** Fully amortised monthly payment. */
export function paymentFor(principal: number, apr: number, months: number): number {
  const r = apr / 12;
  if (r <= 0) return Math.ceil(principal / months);
  return Math.ceil((principal * r) / (1 - Math.pow(1 + r, -months)));
}

export const LENDERS = ['Coastline Bank', 'Unity Trust', 'Savanna Capital', 'Harbour Savings & Loans'];

/** What they'll lend you, and on what terms. */
export function personalOffer(score: number, monthlyIncome: number, country: string | undefined): { max: number; apr: number; months: number } | null {
  if (score < 520 || monthlyIncome < 150) return null;
  const mult = score >= 740 ? 6 : score >= 670 ? 4.5 : score >= 600 ? 3 : 1.5;
  const max = Math.floor((monthlyIncome * mult) / 100) * 100;
  return max >= 500 ? { max, apr: rateFor('personal', country, score), months: 12 } : null;
}

export function mortgageOffer(score: number, monthlyIncome: number, price: number, country: string | undefined): { loan: number; down: number; apr: number; months: number; monthly: number } | null {
  if (score < 600) return null;
  const apr = rateFor('mortgage', country, score);
  const months = (country === 'Ghana' || country === 'Nigeria') ? 120 : 240;
  const loan = Math.round(price * 0.8);
  const monthly = paymentFor(loan, apr, months);
  // Banks want the payment under about 40% of what you earn.
  if (monthly > monthlyIncome * 0.4) return null;
  return { loan, down: price - loan, apr, months, monthly };
}

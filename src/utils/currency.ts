// ─── LOCAL CURRENCY ────────────────────────────────────────────────────────
// The game keeps every amount in dollars underneath. What you SEE follows
// where you are: cedis in Accra, naira in Lagos, pounds in London. The same
// number, shown in the money of the country you're standing in.

import { getCountry } from '../data/locations';

/** Units per 1 US dollar (rough, stable game rates) and the symbol to show. */
const TABLE: Record<string, { rate: number; sym: string }> = {
  USD: { rate: 1, sym: '$' }, EUR: { rate: 0.92, sym: '€' }, GBP: { rate: 0.79, sym: '£' }, GHS: { rate: 15, sym: 'GH₵' }, NGN: { rate: 1500, sym: '₦' },
  ZAR: { rate: 18, sym: 'R' }, KES: { rate: 129, sym: 'KSh' }, XOF: { rate: 600, sym: 'CFA' }, XAF: { rate: 600, sym: 'FCFA' }, ZMW: { rate: 27, sym: 'ZK' },
  VND: { rate: 25000, sym: '₫' }, UGX: { rate: 3700, sym: 'USh' }, TZS: { rate: 2600, sym: 'TSh' }, TTD: { rate: 6.8, sym: 'TT$' }, TND: { rate: 3.1, sym: 'DT' },
  THB: { rate: 35, sym: '฿' }, SEK: { rate: 10.5, sym: 'kr' }, SAR: { rate: 3.75, sym: 'SR' }, RWF: { rate: 1350, sym: 'FRw' }, RUB: { rate: 92, sym: '₽' },
  PLN: { rate: 4, sym: 'zł' }, PKR: { rate: 280, sym: 'Rs' }, PHP: { rate: 57, sym: '₱' }, PEN: { rate: 3.7, sym: 'S/' }, NZD: { rate: 1.65, sym: 'NZ$' },
  NOK: { rate: 10.7, sym: 'kr' }, NAD: { rate: 18, sym: 'N$' }, MZN: { rate: 64, sym: 'MT' }, MYR: { rate: 4.5, sym: 'RM' }, MXN: { rate: 18, sym: 'MX$' },
  MAD: { rate: 10, sym: 'DH' }, KRW: { rate: 1350, sym: '₩' }, JPY: { rate: 150, sym: '¥' }, JMD: { rate: 157, sym: 'J$' }, INR: { rate: 83, sym: '₹' },
  IDR: { rate: 15800, sym: 'Rp' }, HTG: { rate: 132, sym: 'G' }, ETB: { rate: 120, sym: 'Br' }, EGP: { rate: 48, sym: 'E£' }, DZD: { rate: 135, sym: 'DA' },
  DOP: { rate: 59, sym: 'RD$' }, DKK: { rate: 6.9, sym: 'kr' }, CUP: { rate: 24, sym: '₱' }, COP: { rate: 4000, sym: 'COL$' }, CNY: { rate: 7.2, sym: '¥' },
  CLP: { rate: 950, sym: 'CLP$' }, CHF: { rate: 0.88, sym: 'CHF' }, CDF: { rate: 2800, sym: 'FC' }, CAD: { rate: 1.36, sym: 'C$' }, BWP: { rate: 13.6, sym: 'P' },
  BRL: { rate: 5.1, sym: 'R$' }, BDT: { rate: 117, sym: '৳' }, BBD: { rate: 2, sym: 'Bds$' }, AUD: { rate: 1.52, sym: 'A$' }, ARS: { rate: 900, sym: 'AR$' },
  AOA: { rate: 850, sym: 'Kz' }, AED: { rate: 3.67, sym: 'AED' },
};

let code = 'USD';
let off = false;
const listeners = new Set<() => void>();
try { off = localStorage.getItem('rl_currency') === 'usd'; } catch { /* storage unavailable */ }

/** Show amounts in the money of this country. */
export function setCurrencyCountry(country: string | undefined): void {
  const next = (country && getCountry(country)?.currency) || 'USD';
  if (next === code) return;
  code = next;
  listeners.forEach((l) => l());
}
export function setUseLocalCurrency(on: boolean): void {
  off = !on;
  try { localStorage.setItem('rl_currency', on ? 'local' : 'usd'); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export const usingLocalCurrency = () => !off;
export const onCurrencyChange = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

const cur = () => (off ? TABLE.USD : TABLE[code] ?? TABLE.USD);
export const currencyCode = () => (off ? 'USD' : code);
export const currencySymbol = () => cur().sym;
export const isUsd = () => cur().rate === 1;
/** Dollars → the local amount. */
export const toLocal = (usd: number) => usd * cur().rate;

// ─── FEATURE DEALS ─────────────────────────────────────────────────────────
//
// A verse is a small contract: who pays, when, and by when the verse is due.
// Money only moves when the terms say it does, every payment leaves a
// receipt, and people keep (or break) their side according to who they are:
// professionals deliver and pay on time; flaky people run late; a few take
// the money and disappear — which is what the courthouse is for.
//
// Pure: the store owns the state.

import type { Persona } from './persona';

export type PayTerms = 'upfront' | 'half' | 'on_delivery' | 'free';

export const TERMS_LABEL: Record<PayTerms, string> = {
  upfront: 'Paid in full up front',
  half: 'Half now, half on delivery',
  on_delivery: 'Paid when the verse is delivered',
  free: 'No fee — for the love',
};

/** Days to deliver a verse once a deal is agreed. */
export const VERSE_DEADLINE_DAYS = 21;
/** Days past the deadline before the other side gives up on the deal. */
export const GRACE_DAYS = 10;

/** How the paying side structures the money. */
export function payTermsFor(p: Persona, npcFame: number, playerFame: number, fee: number, roll: number): PayTerms {
  if (fee <= 0) return 'free';
  // Stars and professionals pay up front; careful or tight people hold money
  // back until the work is in; the rest split it.
  const trust = p.reliability * 0.5 + p.warmth * 0.2 + (npcFame - playerFame) / 200 + roll * 0.3;
  if (trust > 0.68) return 'upfront';
  if (trust < 0.38) return 'on_delivery';
  return 'half';
}

/** What they pay at signing. */
export function upfrontShare(terms: PayTerms, fee: number): number {
  return terms === 'upfront' ? fee : terms === 'half' ? Math.round(fee / 2) : 0;
}

export type DeliveryOutcome = 'on_time' | 'late' | 'ghost';

/** When the verse YOU paid for actually arrives (decided when you pay; hidden). */
export function planDelivery(p: Persona, roll: number, roll2: number): { outcome: DeliveryOutcome; days: number; lateBy: number } {
  const days = 3 + Math.round((1 - p.punctuality) * 6 + roll2 * 3);
  const ghost = Math.pow(1 - p.reliability, 2.2) * 0.55;
  const late = (1 - p.reliability) * 0.55 + (1 - p.punctuality) * 0.2;
  if (roll < ghost) return { outcome: 'ghost', days, lateBy: 0 };
  if (roll < ghost + late) return { outcome: 'late', days, lateBy: 4 + Math.round(roll2 * 12) };
  return { outcome: 'on_time', days, lateBy: 0 };
}

export type PayOutcome = 'on_time' | 'late' | 'never';

/** When they pay YOU the balance after you deliver (decided at delivery; hidden). */
export function planPayment(p: Persona, roll: number): { outcome: PayOutcome; days: number } {
  const never = Math.pow(1 - p.reliability, 2.4) * 0.45;
  const late = (1 - p.reliability) * 0.45;
  if (roll < never) return { outcome: 'never', days: 0 };
  if (roll < never + late) return { outcome: 'late', days: 6 + Math.round(roll * 40) % 18 };
  return { outcome: 'on_time', days: 0 };
}

/** You asked for your money back. */
export function refundResponse(p: Persona, roll: number): 'full' | 'partial' | 'ignore' {
  const honest = p.reliability * 0.6 + p.warmth * 0.25 + p.forgiveness * 0.15;
  if (roll < honest * 0.85) return 'full';
  if (roll < honest * 0.85 + 0.2) return 'partial';
  return 'ignore';
}

/** They paid you and got nothing: do they take you to court? */
export function suesForUndelivered(p: Persona, paid: number, roll: number): boolean {
  if (paid < 300) return false;
  return roll < p.litigious * (paid >= 5000 ? 1.1 : 0.8);
}

/** A friendly reminder, a firm one, or a threat — by who they are and what they paid. */
export function chaseLine(p: Persona, paid: number, daysLeft: number, seed: number): string {
  const lines = paid > 0
    ? (p.warmth > 0.6
      ? [`Hey, how's the verse coming? I already sent the $${paid.toLocaleString()} 🙏`, `Any update on the verse? Payment went through on my end.`]
      : [`I paid $${paid.toLocaleString()} for that verse. Where is it?`, `Still waiting on the verse I paid for.`])
    : (daysLeft > 0
      ? [`How far with the verse? We said ${daysLeft} more day${daysLeft === 1 ? '' : 's'}.`, `Need that verse soon — mixing ${daysLeft <= 3 ? 'this week' : 'soon'} 🎚️`]
      : [`The deadline passed. You still sending the verse?`, `We're past the date. Is the verse coming or not?`]);
  return lines[seed % lines.length];
}

/** Their excuse when the verse you paid for is late. */
export function lateExcuse(seed: number): string {
  const lines = ['My bad, been crazy busy — give me a few more days', 'Studio was booked out, I\'m on it this week 🙏🏾', 'Had to travel, verse is coming, I promise', 'Rewrote it, wasn\'t happy with the first one. Soon.'];
  return lines[seed % lines.length];
}

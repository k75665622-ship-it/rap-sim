// ─── TICKETING: A SHOW YOU SELL, NOT A BUTTON YOU PRESS ───────────────────
//
// A show is announced for a date. Tickets go on sale and sell DAY BY DAY until
// the night; on the night the room plays to exactly the seats that were sold.
//
// Everything here is pure. It takes numbers and returns numbers, which is what
// lets the store tick call it for a thirty-day jump without any of it knowing
// about React, immer or the clock.
//
// The rule from the shows rebuild still holds: money comes from seats sold,
// and seats sold come from a room and a price. Nothing in this file invents a
// ticket — it only decides WHEN the seats that demand already justified sell.

import type { VenueClass } from '../types/game';

/** Fewest days between announcing a show and playing it, by room. */
export const MIN_LEAD_DAYS: Record<VenueClass, number> = {
  club: 3,
  theatre: 7,
  hall: 14,
  arena: 28,
  stadium: 49,
};

/** Furthest ahead a date can be set. */
export const MAX_LEAD_DAYS = 180;

/** How many announced-but-unplayed shows the player can carry at once. */
export const MAX_OPEN_SHOWS = 6;

/** Postponing is a favour, not a habit. */
export const MAX_POSTPONEMENTS = 2;

/** The days-out at which the desk sends a reminder. */
export const REMINDER_DAYS = [14, 7, 3, 1] as const;

// ─── THE SALES CURVE ───────────────────────────────────────────────────────

/**
 * Share of the final crowd that has bought by `p` of the way to the night.
 *
 * Three phases, because that is how real on-sales behave:
 *   0 → 10%  the PRESALE — fans who have been waiting, a fast spike (0 → 28%)
 *   10 → 80% the long middle — slow and steady (28% → 62%)
 *   80 → 100% the final-week surge — everyone who "will sort it later" (62% → 100%)
 */
export function salesCurve(p: number): number {
  const x = Math.max(0, Math.min(1, p));
  if (x <= 0.1) return (x / 0.1) * 0.28;
  if (x <= 0.8) return 0.28 + ((x - 0.1) / 0.7) * 0.34;
  return 0.62 + ((x - 0.8) / 0.2) * 0.38;
}

/** Marketing money turned into a sales multiplier, with diminishing returns. */
export function marketingMult(spend: number, capacity: number, price: number): number {
  const scale = Math.max(500, capacity * price * 0.08);
  return 1 + 0.2 * (1 - Math.exp(-Math.max(0, spend) / scale));
}

export interface MarketingTier {
  id: 'social' | 'radio' | 'blitz';
  label: string;
  emoji: string;
  /** Cost as a share of the room's full-house door. */
  share: number;
  blurb: string;
}

export const MARKETING_TIERS: MarketingTier[] = [
  { id: 'social', label: 'Social push', emoji: '📣', share: 0.015, blurb: 'Paid posts and fan shout-outs.' },
  { id: 'radio', label: 'Radio & DJ spots', emoji: '📻', share: 0.04, blurb: 'Station ads and DJ drops in the city.' },
  { id: 'blitz', label: 'Press blitz', emoji: '📰', share: 0.09, blurb: 'Billboards, interviews and a street team.' },
];

export function marketingCost(tier: MarketingTier, capacity: number, price: number): number {
  return Math.max(100, Math.round((capacity * price * tier.share) / 10) * 10);
}

// ─── DAILY SALES ───────────────────────────────────────────────────────────

export interface SalesState {
  announcedSerial: number;
  serial: number;
  ticketsSold: number;
  capacity: number;
}

/**
 * Tickets sold by the end of `day`, given today's demand target.
 *
 * `target` is the crowd demand supports RIGHT NOW (already capped at the
 * room). Sales never go backwards — nobody un-buys a ticket because the price
 * went up — so a falling target simply stalls the on-sale.
 */
export function soldBy(s: SalesState, day: number, target: number): number {
  const span = Math.max(1, s.serial - s.announcedSerial);
  const p = (day - s.announcedSerial) / span;
  const byCurve = Math.round(Math.min(s.capacity, target) * salesCurve(p));
  return Math.max(s.ticketsSold, Math.min(s.capacity, byCurve));
}

export type SalesMood = 'sold_out' | 'hot' | 'on_track' | 'slow' | 'at_risk';

/** How the on-sale is going, judged against where it should be by now. */
export function salesMood(s: SalesState, today: number, target: number): SalesMood {
  if (s.ticketsSold >= s.capacity) return 'sold_out';
  const span = Math.max(1, s.serial - s.announcedSerial);
  const expectedNow = Math.min(s.capacity, target) * salesCurve((today - s.announcedSerial) / span);
  const pace = expectedNow > 0 ? s.ticketsSold / expectedNow : 1;
  const fill = s.ticketsSold / Math.max(1, s.capacity);
  const daysOut = s.serial - today;
  if (daysOut <= 14 && fill < 0.3) return 'at_risk';
  if (daysOut <= 21 && fill < 0.45 && target < s.capacity * 0.6) return 'at_risk';
  if (pace < 0.8) return 'slow';
  if (pace > 1.15 || fill > 0.85) return 'hot';
  return 'on_track';
}

export const MOOD_LABEL: Record<SalesMood, string> = {
  sold_out: 'Sold out',
  hot: 'Selling fast',
  on_track: 'On track',
  slow: 'Slow',
  at_risk: 'At risk',
};

// ─── CANCELLING ────────────────────────────────────────────────────────────

export type CancelReason = 'low_sales' | 'health' | 'conflict';

export const CANCEL_REASONS: { id: CancelReason; label: string; blurb: string }[] = [
  { id: 'low_sales', label: 'Low ticket sales', blurb: 'The room is not going to fill. Fans get refunds.' },
  { id: 'health', label: 'Illness or exhaustion', blurb: 'Only believed if you are genuinely run down.' },
  { id: 'conflict', label: 'Scheduling conflict', blurb: 'Something else came up. Promoters hate this one.' },
];

export interface CancelTerms {
  daysOut: number;
  /** Cash that is lost: the deposit and any share of the hire still owed. */
  penalty: number;
  /** What it does to standing, 0 or negative. */
  reputation: number;
  /** Chirp noise: how loud the fans are about it. */
  backlash: 'none' | 'mild' | 'loud';
  /** Plain-language reason the number is what it is. */
  explain: string;
  /** Tickets refunded to fans. */
  refunded: number;
}

/**
 * What walking away from a night costs.
 *
 * Early is cheap and late is brutal — exactly like real life. A cancellation
 * four weeks out costs the deposit; a cancellation the week of costs the whole
 * hire and a public shaming. A believable illness halves the standing damage
 * and the cash penalty, because the insurance and the venue both understand.
 */
export function cancelTerms(input: {
  daysOut: number;
  deposit: number;
  hireCost: number;
  ticketsSold: number;
  reason: CancelReason;
  /** 0-1: how run down the artist really is. */
  energyRatio: number;
  /** Lawyer's clawback, 0-0.6. */
  cutRelief: number;
}): CancelTerms {
  const { daysOut, deposit, hireCost, ticketsSold, reason } = input;

  let hireShare: number;
  let rep: number;
  let backlash: CancelTerms['backlash'];
  if (daysOut >= 28) {
    hireShare = 0; rep = 0; backlash = 'none';
  } else if (daysOut >= 14) {
    hireShare = 0.1; rep = -1; backlash = 'mild';
  } else if (daysOut >= 7) {
    hireShare = 0.25; rep = -2; backlash = 'mild';
  } else {
    hireShare = 1; rep = -5; backlash = 'loud';
  }

  let note = '';
  const believable = reason === 'health' && input.energyRatio < 0.5;
  if (reason === 'health' && !believable) {
    // Crying wolf. They can see you are fine.
    rep -= 2;
    note = ' Nobody believes you are ill — you were seen out last night.';
  } else if (believable) {
    hireShare *= 0.5;
    rep = Math.ceil(rep / 2);
    if (backlash === 'loud') backlash = 'mild';
    note = ' The venue accepts you are genuinely unwell.';
  } else if (reason === 'conflict') {
    rep -= daysOut < 14 ? 1 : 0;
  }
  // Fans forgive a cancellation they were told about early.
  if (reason === 'low_sales' && daysOut >= 14) backlash = 'none';

  const relief = Math.max(0, Math.min(0.6, input.cutRelief));
  const penalty = Math.round(
    (deposit + hireCost * hireShare) * (1 - relief * 0.5) / 10,
  ) * 10;

  const when =
    daysOut >= 28 ? 'more than four weeks out' :
    daysOut >= 14 ? 'inside four weeks' :
    daysOut >= 7 ? 'inside two weeks' : 'the week of the show';

  return {
    daysOut,
    penalty,
    reputation: rep,
    backlash,
    refunded: ticketsSold,
    explain: `Cancelling ${when}: you lose the deposit${hireShare > 0 ? ` and ${Math.round(hireShare * 100)}% of the hire` : ''}.${note}`,
  };
}

// ─── POSTPONING ────────────────────────────────────────────────────────────

export interface PostponeTerms {
  /** Cash fee to move the night. */
  fee: number;
  /** Tickets handed back because the fan cannot make the new date. */
  refunds: number;
  reputation: number;
  explain: string;
}

/**
 * What moving a night costs.
 *
 * Roughly one in ten ticket-holders cannot make the new date, more the further
 * it moves and the second time you do it. A short-notice move also costs a
 * little standing: the promoter had told people.
 */
export function postponeTerms(input: {
  daysOut: number;
  moveDays: number;
  hireCost: number;
  ticketsSold: number;
  postponements: number;
}): PostponeTerms {
  const fee = Math.round((input.hireCost * (0.08 + 0.05 * input.postponements)) / 10) * 10;
  const share = Math.min(0.5, 0.06 + input.moveDays / 400 + input.postponements * 0.08);
  const refunds = Math.min(input.ticketsSold, Math.round(input.ticketsSold * share));
  const rep = input.daysOut < 7 ? -2 : input.daysOut < 14 ? -1 : 0;
  return {
    fee,
    refunds,
    reputation: rep,
    explain:
      `Moving ${input.moveDays} days costs $${fee.toLocaleString()} in re-booking fees. ` +
      `About ${Math.round(share * 100)}% of ticket-holders will want refunds.` +
      (rep < 0 ? ' Short notice dents your reputation.' : ''),
  };
}

// ─── REMINDERS ─────────────────────────────────────────────────────────────

/**
 * The reminder to send after the clock has moved to `today`.
 *
 * A thirty-day jump can step over several thresholds at once; the player
 * should hear about the NEAREST one, once, rather than get four stale emails.
 * Returns the threshold, or null when nothing new has been crossed.
 */
export function dueReminder(daysOut: number, alreadySent: number[]): number | null {
  if (daysOut <= 0) return null;
  const crossed = REMINDER_DAYS.filter((d) => daysOut <= d && !alreadySent.includes(d));
  if (crossed.length === 0) return null;
  return Math.min(...crossed);
}

export function reminderTone(daysOut: number): string {
  if (daysOut <= 1) return 'Tomorrow night. Rest up.';
  if (daysOut <= 3) return 'Three days. Final rehearsals.';
  if (daysOut <= 7) return 'One week to go.';
  return 'Two weeks out — the push starts now.';
}

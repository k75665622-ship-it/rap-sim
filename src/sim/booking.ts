// ─── BOOKING ────────────────────────────────────────────────────────────────
//
// A room is not a button.
//
// The complaint this answers is "booking of venue should not be easy, you need
// to make inquiries first, because maybe an artist has already booked the venue
// for his own event". So a room has a diary, and the diary is not empty.
//
// The diary is DERIVED, not stored — the same room on the same night is always
// the same answer, hashed from `venueId|serial`. That matters for the same
// reason the venues themselves are derived: a save/reload must not quietly
// free up a night somebody else is already holding, and nothing has to be
// persisted or migrated to make the world feel booked.
//
// Who is holding the night is always a NEUTRAL DESCRIPTION — "a wedding party",
// "another act's tour date". Never a real artist's name, because inventing a
// real person's diary is not something this game gets to do.

import type { VenueClass } from '../types/game';
import type { Venue } from './shows';

/** How far ahead the diary is legible at all. */
export const DIARY_DAYS = 45;

/** What the player pays in energy to have somebody work the phones. */
export const INQUIRY_ENERGY = 4;
export const INQUIRY_ENERGY_WITH_TEAM = 2;

export type NightStatus = 'free' | 'taken';

export interface Night {
  serial: number;
  status: NightStatus;
  /** Who has it, when somebody does. A description, never a name. */
  heldBy?: string;
}

/** A stable 32-bit hash, same shape as the one `venuesInCity` uses. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * What has the room when the player does not.
 *
 * Deliberately mundane. A room is mostly taken by the unglamorous stuff —
 * weddings, graduations, corporate nights — which is also why a promoter who
 * knows the room is worth paying.
 */
const HOLDERS = [
  'a private hire',
  'a wedding party',
  'a corporate awards night',
  "a local promoter's showcase",
  'a church convention',
  'a boxing bill',
  'a comedy night',
  'a school graduation',
  "another act's tour date",
  'a DJ residency',
  'a fashion show',
  'a birthday party',
  'a talent show final',
  'a record-label showcase',
];

/**
 * How full a room's diary runs.
 *
 * This is the whole reason a stadium is hard to get and a 300-cap club is not:
 * a stadium is booked months out by things that are not you, and a club is
 * whoever called last. It rises with the class tier.
 */
export function occupancyChance(cls: VenueClass): number {
  switch (cls) {
    case 'club': return 0.18;
    case 'theatre': return 0.26;
    case 'hall': return 0.36;
    case 'arena': return 0.52;
    case 'stadium': return 0.66;
  }
}

/** What is happening in this room on this night. Deterministic. */
export function nightAt(venue: Venue, serial: number): Night {
  const h = hash(`${venue.id}|${serial}`);
  const roll = (h % 10000) / 10000;
  if (roll >= occupancyChance(venue.cls)) return { serial, status: 'free' };
  return { serial, status: 'taken', heldBy: HOLDERS[(h >>> 9) % HOLDERS.length] };
}

export function isNightFree(venue: Venue, serial: number): boolean {
  return nightAt(venue, serial).status === 'free';
}

/** The room's diary, from a night forward. */
export function diary(venue: Venue, fromSerial: number, days: number = DIARY_DAYS): Night[] {
  const out: Night[] = [];
  for (let i = 0; i < days; i++) out.push(nightAt(venue, fromSerial + i));
  return out;
}

/** The free nights in a window, soonest first. */
export function freeNights(venue: Venue, fromSerial: number, within: number = DIARY_DAYS): number[] {
  const out: number[] = [];
  for (let i = 0; i < within; i++) {
    if (isNightFree(venue, fromSerial + i)) out.push(fromSerial + i);
  }
  return out;
}

/** The next night the room is actually free. `null` if the diary is full. */
export function nextFreeNight(
  venue: Venue,
  fromSerial: number,
  within: number = DIARY_DAYS,
): number | null {
  for (let i = 0; i < within; i++) {
    if (isNightFree(venue, fromSerial + i)) return fromSerial + i;
  }
  return null;
}

// ─── THE INQUIRY ────────────────────────────────────────────────────────────

export interface InquiryInput {
  venue: Venue;
  /** The night the player wants. */
  wantedSerial: number;
  /**
   * Whether anybody on the payroll actually books rooms — a promoter or a
   * booking agent. This is the "much easier if you have a team" half: the ask
   * costs less, and the answer covers a much longer stretch of the diary.
   */
  hasBooker: boolean;
  /**
   * The earliest night the player is allowed to play this city at all —
   * normally the far side of their own cooldown.
   *
   * This exists because a suggestion the player cannot take is not a
   * suggestion. Before it was here, the report would answer "Free nearby:
   * 05/04, 08/04" for a city the player had played three days ago, and
   * tapping 05/04 was refused by the cooldown two gates further down. The
   * alternatives are now filtered to nights that are actually bookable.
   */
  earliestSerial?: number;
}

export interface InquiryResult {
  wantedSerial: number;
  free: boolean;
  /** Who has the wanted night, when it is gone. */
  heldBy?: string;
  /** How many nights ahead the answer actually covers. */
  horizon: number;
  /** Free nights inside the horizon, soonest first. Never includes `wanted`. */
  alternatives: number[];
  throughTheTeam: boolean;
  energyCost: number;
  /** Set when the player's own cooldown rules the wanted night out. */
  tooSoonUntil?: number;
  /** Whether the player could actually take the wanted night right now. */
  bookable: boolean;
}

/**
 * Work the phones.
 *
 * Solo, the artist is ringing the venue themselves: a short horizon, a couple
 * of alternatives, and it costs a morning. With somebody who does this for a
 * living, the answer covers a month and a half of the diary and costs half as
 * much — which is the entire argument for paying a promoter.
 */
export function inquire(input: InquiryInput): InquiryResult {
  const { venue, wantedSerial, hasBooker } = input;
  const horizon = hasBooker ? 45 : 12;
  const shown = hasBooker ? 8 : 3;

  // The diary is read from the wanted night, but never before the player is
  // free to play the city at all.
  const earliest = input.earliestSerial ?? wantedSerial;
  const from = Math.max(wantedSerial, earliest);

  const night = nightAt(venue, wantedSerial);
  const alternatives = freeNights(venue, from, horizon)
    .filter((s) => s !== wantedSerial)
    .slice(0, shown);

  const tooSoonUntil = wantedSerial < earliest ? earliest : undefined;

  return {
    wantedSerial,
    free: night.status === 'free',
    heldBy: night.heldBy,
    horizon,
    alternatives,
    throughTheTeam: hasBooker,
    energyCost: hasBooker ? INQUIRY_ENERGY_WITH_TEAM : INQUIRY_ENERGY,
    tooSoonUntil,
    bookable: tooSoonUntil === undefined && night.status === 'free',
  };
}

/**
 * The line the player reads after working the phones.
 *
 * It names who has the night and what the alternatives are, because a refusal
 * without the next step is just a dead end. Every date it offers has already
 * been filtered past the player's own cooldown, so nothing here is a night
 * they would then be refused.
 */
export function inquiryReport(
  result: InquiryResult,
  venue: Venue,
  formatDate: (s: number) => string,
): string {
  const by = result.throughTheTeam
    ? `Your promoter had a look at ${venue.name}.`
    : `You rang ${venue.name} yourself.`;

  const soon = result.tooSoonUntil;
  const soonNote =
    soon === undefined
      ? ''
      : ` You cannot play this city again until ${formatDate(soon)}, so nothing before then counts.`;

  const alts = result.alternatives.length
    ? ` ${soon === undefined ? 'Free nearby' : 'Free after that'}: ${result.alternatives
        .map(formatDate)
        .join(', ')}.`
    : ` Nothing free in the next ${result.horizon} days.`;

  if (result.free) {
    // The room is open. Whether the player may take it is the cooldown's
    // business, but the sentence has to say so — otherwise the player reads
    // "open", taps it, and is refused by the next gate down.
    return result.bookable
      ? `${by} ${formatDate(result.wantedSerial)} is open — take it before somebody else does.`
      : `${by} ${formatDate(result.wantedSerial)} is open, but not to you yet.${soonNote}${alts}`;
  }

  return (
    `${by} ${formatDate(result.wantedSerial)} is gone — ` +
    `${result.heldBy ?? 'somebody else'} has it.${soonNote}${alts}`
  );
}

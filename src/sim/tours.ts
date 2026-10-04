// ─── TOURS ──────────────────────────────────────────────────────────────────
//
// A tour is a RUN OF DATES, not a bigger show.
//
// That distinction is the whole design. Every leg is planned and settled by the
// same engine a single show uses, so a tour can never pay differently from a
// show on the same night in the same room — the thing the old code got wrong
// everywhere it had a second formula for the same event.
//
// What a tour adds is the three things a single date cannot have:
//
//   1. ROUTING. You cannot play Lagos on Tuesday and London on Wednesday. The
//      gap between two dates is DERIVED from where they are, not chosen.
//   2. THE ALBUM BUZZ. A run of dates in the weeks after a record lands draws
//      better than the same run in a dead month, which is exactly why an album
//      and a tour belong together.
//   3. THE REPORT. Planning five cities means finding out that two of them
//      cannot have you — and being told which, and why, BEFORE you commit.
//
// Point 3 is the one that matters most. A planner that only ever says "yes"
// is not a planner; it is a button, and the player finds out the truth on the
// second night of a five-city run.

import type { ShowType } from '../types/game';
import { getCountry } from '../data/locations';
import { nightAt, isNightFree, DIARY_DAYS } from './booking';
import {
  checkCooldown,
  planShow,
  slotRequirement,
  venueLockReason,
  type ShowPlan,
  type ShowPlanInput,
  type Venue,
} from './shows';

// ─── ROUTING ────────────────────────────────────────────────────────────────

/** How many nights it takes to move the production from one city to the next. */
const TRAVEL_SAME_COUNTRY = 1;
const TRAVEL_SAME_CONTINENT = 2;
const TRAVEL_CROSS_CONTINENT = 3;

export interface Place {
  city: string;
  country: string;
}

function sameContinent(a: string, b: string): boolean {
  const ca = getCountry(a)?.continent;
  const cb = getCountry(b)?.continent;
  return !!ca && ca === cb;
}

/**
 * Nights of travel between two stops. 0 for the first, because you are already
 * where you live.
 *
 * Derived from the two countries rather than stored, so a save cannot invent a
 * tour that teleports — the same reason venues and the venue diary are derived.
 */
export function travelDays(from: Place | null, to: Place): number {
  if (!from) return 0;
  if (from.city === to.city) return 0;
  if (from.country === to.country) return TRAVEL_SAME_COUNTRY;
  if (sameContinent(from.country, to.country)) return TRAVEL_SAME_CONTINENT;
  return TRAVEL_CROSS_CONTINENT;
}

/**
 * What it costs to move the show from one stop to the next.
 *
 * Charged ON TOP of each night's own freight line, because they are different
 * bills: `computeCosts` pays to get the rig to a city, and this pays to get it
 * out again and on to the next one. It scales with the room being moved, which
 * is why a stadium run abroad is a serious commitment and a club run is not.
 *
 * The tour manager's `logisticsMult` applies, the same way it does inside
 * `computeCosts` — one lever, not two.
 */
export function hopCost(
  from: Place | null,
  to: Place,
  capacity: number,
  logisticsMult: number,
): number {
  if (!from) return 0;
  if (from.city === to.city) return 0;
  const band = from.country === to.country
    ? 1
    : sameContinent(from.country, to.country)
      ? 2.2
      : 7.5;
  const raw = (1_200 + capacity * 0.9) * band * Math.max(0.4, Math.min(1.4, logisticsMult));
  return Math.round(raw / 50) * 50;
}

// ─── ALBUM BUZZ ─────────────────────────────────────────────────────────────

/** How long a record keeps a tour hot. */
export const BUZZ_WINDOW_DAYS = 60;

/** Full strength in the first fortnight, then a straight fade to nothing. */
const BUZZ_PEAK_DAYS = 14;
const BUZZ_MAX = 1.45;

/**
 * The lift a recent release gives a run of dates.
 *
 * 1.0 means no record is doing anything for you. The value multiplies the
 * legs' `promo`, which is the same lever a promoter pulls, so the effect is
 * visible in the plan's drivers rather than hidden in a private number.
 *
 * `daysSinceRelease` is null when nothing has come out, and negative values are
 * ignored rather than clamped — a record cannot be released in the future, and
 * a save that says otherwise should not mint free buzz.
 */
export function tourBuzz(daysSinceRelease: number | null): number {
  if (daysSinceRelease === null || daysSinceRelease < 0) return 1;
  if (daysSinceRelease > BUZZ_WINDOW_DAYS) return 1;
  if (daysSinceRelease <= BUZZ_PEAK_DAYS) return BUZZ_MAX;
  const fade =
    1 - (daysSinceRelease - BUZZ_PEAK_DAYS) / (BUZZ_WINDOW_DAYS - BUZZ_PEAK_DAYS);
  return 1 + (BUZZ_MAX - 1) * Math.max(0, fade);
}

/** How the buzz reads to the player. */
export function buzzLabel(buzz: number): string {
  if (buzz <= 1.0001) return 'no record in the window';
  return `+${Math.round((buzz - 1) * 100)}% from the release`;
}

// ─── THE PLAN ───────────────────────────────────────────────────────────────

/** How far the planner will slide a date to find a free room. */
const SLIP_DAYS = 3;

export interface TourStopRequest {
  /** What kind of date this is. Home legs are not `international_tour`. */
  type: ShowType;
  venue: Venue;
  price: number;
  /** The night the player wants. `undefined` means "route it". */
  wantedSerial?: number;
  /** The city's memory of the player, read off the save. */
  lastShowSerial?: number;
  /** Everything the show engine needs for this room, minus venue and price. */
  base: Omit<ShowPlanInput, 'venue' | 'price'>;
}

export interface TourPlanInput {
  stops: TourStopRequest[];
  /** The night the run would set off. */
  startSerial: number;
  /** Days since the last release, or null when there is nothing recent. */
  daysSinceRelease: number | null;
}

export interface TourLegPlan {
  index: number;
  type: ShowType;
  venue: Venue;
  city: string;
  country: string;
  /** The night this leg actually plays. */
  serial: number;
  /** The night the player asked for, when they asked for one. */
  wantedSerial?: number;
  /** How many nights the date slid to find a free room. 0 is normal. */
  slippedDays: number;
  /** Nights of travel before this leg. 0 for the first. */
  travelDays: number;
  /** Moving the production here, on top of the night's own freight line. */
  travelCost: number;
  price: number;
  plan: ShowPlan;
}

export interface TourUnavailable {
  index: number;
  type: ShowType;
  venueName: string;
  city: string;
  country: string;
  /** The night the player asked for, when they asked for one. */
  wantedSerial?: number;
  /** The night the room IS free, when the diary was the problem. */
  nextFreeSerial?: number;
  /** The earliest night this city will have you again, when the cooldown was. */
  earliestLegalSerial?: number;
  /** Who is holding the night, when somebody is. */
  heldBy?: string;
  /** The rule or the room that stopped it. */
  reason: string;
}

export interface TourPlan {
  legs: TourLegPlan[];
  /** The stops that could not be had, and why. Never silently dropped. */
  unavailable: TourUnavailable[];
  /** Two dates is a tour. One is a show, and the planner says so. */
  isTour: boolean;
  firstNight: number | null;
  lastNight: number | null;
  /** Nights from the first date to the last, travel included. */
  span: number;
  cities: string[];
  countries: string[];
  /** Dates outside the artist's own country. */
  internationalDates: number;
  buzz: number;
  totalTravel: number;
  projected: {
    tickets: number;
    gross: number;
    merch: number;
    costs: number;
    /** Sum of the legs' own nets, before the hops between them. */
    net: number;
    travel: number;
    /** What the run leaves after the hops are paid for. */
    netAfterTravel: number;
  };
  warnings: string[];
}

/**
 * Plan a run of dates without committing to anything.
 *
 * Returns the dates it can get, the dates it cannot, and what the run is worth
 * — all from the same engine `bookShow` uses, so the number the player reads is
 * the number the nights were planned against.
 */
export function planTour(input: TourPlanInput): TourPlan {
  const buzz = tourBuzz(input.daysSinceRelease);
  const legs: TourLegPlan[] = [];
  const unavailable: TourUnavailable[] = [];
  const warnings: string[] = [];
  /** Every stop on a run is played by the same artist, so one read is enough. */
  const artistCountry = input.stops[0]?.base.artistCountry;

  // What each city has already seen. Seeded from the save and UPDATED as the
  // run is routed, so a city visited twice on one tour still has to respect its
  // own gap — the cooldown is per city, not per tour.
  const lastIn = new Map<string, number | undefined>();
  for (const s of input.stops) lastIn.set(s.venue.city, s.lastShowSerial);

  let cursor = input.startSerial;
  let prev: Place | null = null;

  input.stops.forEach((stop, index) => {
    const city = stop.venue.city;
    const country = stop.venue.country;
    const travel = travelDays(prev, stop.venue);
    const hop = hopCost(prev, stop.venue, stop.venue.capacity, stop.base.logisticsMult);

    const refuse = (reason: string, extra?: Partial<TourUnavailable>) => {
      unavailable.push({
        index,
        type: stop.type,
        venueName: stop.venue.name,
        city,
        country,
        wantedSerial: stop.wantedSerial,
        reason,
        ...extra,
      });
    };

    // ── The slot ─────────────────────────────────────────────────────────
    const slot = slotRequirement(
      stop.type,
      stop.venue,
      stop.base.artistCountry,
      stop.base.fame,
      stop.base.promoterPct,
      stop.base.logisticsMult,
    );
    if (slot) {
      refuse(slot);
      return;
    }

    // ── The room's own access tier ───────────────────────────────────────
    const lock = venueLockReason(stop.venue, stop.base.fame);
    if (lock) {
      refuse(lock);
      return;
    }

    // ── The earliest this leg can possibly be ────────────────────────────
    const earliest = cursor + travel;
    let night = Math.max(stop.wantedSerial ?? earliest, earliest);

    // ── The city's cooldown ──────────────────────────────────────────────
    const cd = checkCooldown(stop.venue.cls, lastIn.get(city), night);
    if (!cd.ok) {
      refuse(cd.reason, { earliestLegalSerial: night + cd.daysLeft });
      return;
    }

    // ── The room's diary ─────────────────────────────────────────────────
    // A taken night slides the date rather than killing the run, because that
    // is what a real promoter does — but it slides by days, never silently,
    // and never far enough to break the routing.
    const asked = night;
    let slipped = 0;
    while (slipped < SLIP_DAYS && !isNightFree(stop.venue, night)) {
      night += 1;
      slipped += 1;
    }
    if (!isNightFree(stop.venue, night)) {
      const held = nightAt(stop.venue, asked);
      let next: number | undefined;
      for (let d = 0; d < DIARY_DAYS; d++) {
        if (isNightFree(stop.venue, asked + d)) { next = asked + d; break; }
      }
      refuse(`${stop.venue.name} is already taken that night`, {
        heldBy: held.heldBy,
        nextFreeSerial: next,
      });
      return;
    }

    // ── It is on ─────────────────────────────────────────────────────────
    const plan = planShow({
      ...stop.base,
      venue: stop.venue,
      price: stop.price,
      // The release, folded into the same promotion lever a promoter pulls, so
      // the effect shows up in the plan's drivers instead of hiding.
      promo: stop.base.promo * buzz,
    });

    legs.push({
      index,
      type: stop.type,
      venue: stop.venue,
      city,
      country,
      serial: night,
      wantedSerial: stop.wantedSerial,
      slippedDays: night - asked,
      travelDays: travel,
      travelCost: hop,
      price: stop.price,
      plan,
    });

    cursor = night;
    lastIn.set(city, night);
    prev = stop.venue;
  });

  const sum = legs.reduce(
    (a, l) => ({
      tickets: a.tickets + l.plan.tickets.likely,
      gross: a.gross + l.plan.gross.likely,
      merch: a.merch + l.plan.merch,
      costs: a.costs + l.plan.totalCosts,
      net: a.net + l.plan.net.likely,
    }),
    { tickets: 0, gross: 0, merch: 0, costs: 0, net: 0 },
  );
  const totalTravel = legs.reduce((s, l) => s + l.travelCost, 0);

  const firstNight = legs.length ? legs[0].serial : null;
  const lastNight = legs.length ? legs[legs.length - 1].serial : null;
  const cities = Array.from(new Set(legs.map((l) => l.city)));
  const countries = Array.from(new Set(legs.map((l) => l.country)));
  const internationalDates = legs.filter((l) => l.country !== artistCountry).length;

  // ── What the player needs to be told before they commit ────────────────
  if (legs.length < 2) {
    warnings.push('A tour is two dates or more. Add another city.');
  }
  if (unavailable.length) {
    warnings.push(
      `${unavailable.length} of ${input.stops.length} date${input.stops.length === 1 ? '' : 's'} could not be had — see below.`,
    );
  }
  if (buzz > 1) {
    warnings.push(`The record is still doing work: ${buzzLabel(buzz)} on every night.`);
  } else if (input.stops.length >= 2) {
    warnings.push('Nothing is out at the moment. A release inside two months would fill these rooms better.');
  }
  const thin = legs.filter((l) => l.plan.fill < 0.45);
  if (thin.length) {
    warnings.push(
      `${thin.length} night${thin.length === 1 ? '' : 's'} look${thin.length === 1 ? 's' : ''} under half full — a smaller room would earn more.`,
    );
  }
  if (countries.length > 1 && (input.stops[0]?.base.logisticsMult ?? 1) >= 1) {
    warnings.push('A run across borders needs a tour manager. Nobody is booking the freight or the visas.');
  }
  if (totalTravel > 0) {
    warnings.push(
      `Moving the show between cities costs about $${totalTravel.toLocaleString()} on top of each night's own freight.`,
    );
  }

  return {
    legs,
    unavailable,
    isTour: legs.length >= 2,
    firstNight,
    lastNight,
    span: firstNight !== null && lastNight !== null ? lastNight - firstNight : 0,
    cities,
    countries,
    internationalDates,
    buzz,
    totalTravel,
    projected: {
      ...sum,
      travel: totalTravel,
      netAfterTravel: sum.net - totalTravel,
    },
    warnings,
  };
}

/**
 * The run, in words.
 *
 * Names the dates that could not be had and the nights that ARE free instead,
 * because a refusal without the next step is a dead end — the same rule the
 * single-show inquiry report follows.
 */
export function tourReport(plan: TourPlan, formatDate: (s: number) => string): string {
  if (!plan.legs.length) {
    const first = plan.unavailable[0];
    return first
      ? `Nothing on this run can be booked. ${first.city}: ${first.reason}.`
      : 'Nothing on this run can be booked.';
  }

  const where = plan.countries.length > 1
    ? `${plan.legs.length} dates across ${plan.countries.join(' and ')}`
    : `${plan.legs.length} dates in ${plan.countries[0] ?? 'the country'}`;

  const money =
    `$${plan.projected.netAfterTravel.toLocaleString()} projected after travel` +
    (plan.projected.netAfterTravel < 0 ? ' — this run loses money.' : '.');

  const lines = plan.legs
    .map(
      (l) =>
        `${formatDate(l.serial)} — ${l.venue.name}, ${l.city} — ` +
        `${l.plan.tickets.likely.toLocaleString()} of ${l.venue.capacity.toLocaleString()}` +
        (l.slippedDays ? ` (moved ${l.slippedDays} night${l.slippedDays === 1 ? '' : 's'})` : ''),
    )
    .join(' · ');

  const lost = plan.unavailable.length
    ? ` Could not be had: ${plan.unavailable
        .map((u) => {
          const when = u.wantedSerial === undefined
            ? 'the night you asked for'
            : formatDate(u.wantedSerial);
          const who = u.heldBy ? ` (${u.heldBy})` : '';
          const instead = u.nextFreeSerial !== undefined
            ? `, free on ${formatDate(u.nextFreeSerial)}`
            : u.earliestLegalSerial !== undefined
              ? `, and the city will have you again from ${formatDate(u.earliestLegalSerial)}`
              : '';
          return `${u.city} on ${when} — ${u.reason}${who}${instead}`;
        })
        .join('; ')}.`
    : '';

  return `A ${where}: ${formatDate(plan.firstNight!)} to ${formatDate(plan.lastNight!)}. ${money} ${lines}.${lost}`;
}

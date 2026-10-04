// ─── LIVE SHOWS ────────────────────────────────────────────────────────────
//
// A show is a room, a price and a crowd. Everything else follows.
//
// This module exists because the old booking was three lines of arithmetic that
// the player could drive straight off a cliff, and a probe (`_vt/shows12.js`)
// pinned down exactly what it did:
//
//   * `capacity` was a CONSTANT per show type — 50,000 for an international
//     date — and the store never validated it. A "Local Club" could be booked
//     with a 250,000 capacity and it filled 205,000 seats.
//   * attendance was `capacity * (fame/100 * 0.8 + random*0.2)`. Ticket price
//     did not appear in it AT ALL, so 41,000 people paid $10 and 41,000 people
//     paid $500, and the takings scaled 50.6x. The slider's own helper text
//     ("Higher price = less attendance") was a lie printed next to the control.
//   * there was no venue, no cooldown, no per-city memory and no lifecycle:
//     `bookShow` set `completed: true` on the same tick it created the row.
//   * two of the 29 roles touched a show, both as a multiplier on the takings.
//     A top-skill promoter sold exactly zero extra tickets.
//
// So the rule here is the one the spec states: **money comes from seats sold,
// and seats sold come from a room and a price.** No multiplier may invent
// revenue that no ticket paid for.
//
// Everything in this file is pure. It takes plain numbers, returns a plan, and
// knows nothing about the store, the clock or React — which is what makes it
// testable without a browser.

import { affinity } from './affinity';
import type { VenueClass, ShowCostLine, ShowType } from '../types/game';

export type { VenueClass, ShowCostLine };

// ─── ROOMS ─────────────────────────────────────────────────────────────────

export interface VenueClassSpec {
  label: string;
  emoji: string;
  /** Access tier required to book a room of this class. */
  tier: number;
  /** Capacity band, before the city's market size is applied. */
  min: number;
  max: number;
  /**
   * Minimum days between two shows for the same artist in the same city.
   *
   * This is a RULE, not a side effect. The old code moved the calendar forward
   * a day per booking, which produced a one-day gap and looked like a cooldown
   * while refusing nothing at all — four shows in one city on four consecutive
   * days all went through.
   */
  cooldownDays: number;
}

export const VENUE_CLASSES: Record<VenueClass, VenueClassSpec> = {
  club: { label: 'Club', emoji: '🎤', tier: 0, min: 120, max: 450, cooldownDays: 3 },
  theatre: { label: 'Theatre', emoji: '🎭', tier: 1, min: 500, max: 2000, cooldownDays: 4 },
  hall: { label: 'Concert Hall', emoji: '🏛️', tier: 2, min: 2500, max: 8000, cooldownDays: 7 },
  arena: { label: 'Arena', emoji: '🏟️', tier: 3, min: 10000, max: 25000, cooldownDays: 14 },
  stadium: { label: 'Stadium', emoji: '🏟️', tier: 4, min: 35000, max: 80000, cooldownDays: 30 },
};

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  cls: VenueClass;
  capacity: number;
  /** Flat fee to hire the room. Scales with the size of the room. */
  hireCost: number;
  tier: number;
}

/**
 * How big a music market a city actually is.
 *
 * This is why a stadium in Tema is not a thing. The old code gave every city
 * the same 50,000-seat "international" room, which is how a show in Tema drew
 * 48,924 people.
 */
const CITY_MARKET_SIZE: Record<string, number> = {
  // Ghana — Accra carries the national stadium, which is why it is the only
  // Ghanaian city that can host one.
  Accra: 1.5, Kumasi: 0.6, Tema: 0.42,
  // Nigeria
  Lagos: 1.6, Abuja: 1.05, Ibadan: 0.7,
  // USA
  'New York': 2.0, 'Los Angeles': 1.85, Atlanta: 1.4,
  // UK
  London: 1.9, Manchester: 0.9, Birmingham: 0.85,
  // South Africa
  Johannesburg: 1.25, 'Cape Town': 1.1, Durban: 0.7,
};

export function cityMarketSize(city: string): number {
  return CITY_MARKET_SIZE[city] ?? 0.5;
}

/** The largest class of room a city can actually support. */
export function largestVenueClass(city: string): VenueClass {
  const size = cityMarketSize(city);
  if (size >= 1.5) return 'stadium';
  if (size >= 1.0) return 'arena';
  if (size >= 0.55) return 'hall';
  if (size >= 0.35) return 'theatre';
  return 'club';
}

const CLASS_ORDER: VenueClass[] = ['club', 'theatre', 'hall', 'arena', 'stadium'];

const ROOM_NAMES: Record<VenueClass, string[]> = {
  club: ['The Basement', 'Neon Room', 'The Cellar', 'Backstage', 'Ground Floor'],
  theatre: ['The Playhouse', 'Grand Theatre', 'Civic Theatre', 'The Auditorium'],
  hall: ['Convention Hall', 'Exhibition Hall', 'Grand Hall', 'Assembly Hall'],
  arena: ['Sports Arena', 'Central Arena', 'The Dome'],
  stadium: ['National Stadium', 'City Stadium', 'Riverside Stadium'],
};

/** A stable 32-bit hash, so a city always gets the same rooms. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], h: number, salt: number): T {
  return arr[(h + salt * 2654435761) % arr.length];
}

/**
 * The rooms in a city.
 *
 * Derived, not stored: the same city always produces the same venues, so this
 * costs nothing to persist and cannot drift between saves.
 */
export function venuesInCity(city: string, country: string): Venue[] {
  const h = hash(city);
  const size = cityMarketSize(city);
  const biggest = CLASS_ORDER.indexOf(largestVenueClass(city));
  const out: Venue[] = [];

  for (let i = 0; i <= biggest; i++) {
    const cls = CLASS_ORDER[i];
    const spec = VENUE_CLASSES[cls];
    // Two rooms in the small classes, one in the big ones — you do not get a
    // choice of stadium.
    const count = i <= 1 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const span = spec.max - spec.min;
      const raw = spec.min + (span * ((h + i * 7919 + k * 104729) % 1000) / 1000);
      // Big rooms scale with the market; small rooms barely do.
      const scale = i >= 2 ? 0.55 + 0.45 * Math.min(2, size) : 0.85 + 0.15 * Math.min(1.5, size);
      const capacity = Math.max(spec.min, Math.round(raw * scale / 50) * 50);
      const base = pick(ROOM_NAMES[cls], h, i * 3 + k + 1);
      out.push({
        id: `${city}-${cls}-${k}`,
        name: i >= 2 ? `${city} ${base}` : base,
        city,
        country,
        cls,
        capacity,
        // A room costs roughly what it seats to open: staff, power, the lease.
        hireCost: Math.round((900 + capacity * 3.1) / 50) * 50,
        tier: spec.tier,
      });
    }
  }
  return out;
}

// ─── ACCESS ────────────────────────────────────────────────────────────────

/**
 * The cities with a live scene.
 *
 * One source of truth: the store resolves a venue id through this list and the
 * Shows screen builds its country/city pickers from it. The old screen had its
 * own private copy of the city map, which is the kind of duplication that ends
 * with the UI offering a city the engine has never heard of.
 */
export const SHOW_CITIES: { city: string; country: string }[] = [
  { city: 'Accra', country: 'Ghana' },
  { city: 'Kumasi', country: 'Ghana' },
  { city: 'Tema', country: 'Ghana' },
  { city: 'Lagos', country: 'Nigeria' },
  { city: 'Abuja', country: 'Nigeria' },
  { city: 'Ibadan', country: 'Nigeria' },
  { city: 'New York', country: 'USA' },
  { city: 'Los Angeles', country: 'USA' },
  { city: 'Atlanta', country: 'USA' },
  { city: 'London', country: 'UK' },
  { city: 'Manchester', country: 'UK' },
  { city: 'Birmingham', country: 'UK' },
  { city: 'Johannesburg', country: 'South Africa' },
  { city: 'Cape Town', country: 'South Africa' },
  { city: 'Durban', country: 'South Africa' },
];

/** Every room in the game, derived. */
export function allVenues(): Venue[] {
  return SHOW_CITIES.flatMap((c) => venuesInCity(c.city, c.country));
}

/** Resolve a venue id back to the room. Ids are derived, so this is a lookup. */
export function findVenue(venueId: string): Venue | undefined {
  return allVenues().find((v) => v.id === venueId);
}

/**
 * The tier of room an artist can walk into.
 *
 * Fame, not money. A rich unknown cannot hire a stadium — nobody would come,
 * and the venue would not take the booking.
 */
export function accessTier(fame: number): number {
  if (fame >= 82) return 4;
  if (fame >= 60) return 3;
  if (fame >= 35) return 2;
  if (fame >= 15) return 1;
  return 0;
}

export const TIER_LABEL = [
  'Open mic circuit',
  'Local draw',
  'Regional draw',
  'National draw',
  'Global draw',
];

/** Why a room is out of reach, in words the UI can print. */
export function venueLockReason(venue: Venue, fame: number): string | null {
  const have = accessTier(fame);
  if (venue.tier <= have) return null;
  const need = [15, 35, 60, 82][venue.tier - 1] ?? 82;
  return `Requires ${TIER_LABEL[venue.tier]} — ${Math.round(need)} fame`;
}

/**
 * The requirement a slot carries ON TOP of the room's own access tier.
 *
 * A festival is not a room you hire — it is a slot somebody gives you, and
 * nobody hands one to an artist with no promoter. An international date is a
 * freight, visa and customs problem, which is a tour manager's entire job.
 * These are the gates the spec asks for by name: "Festival or International
 * slot cannot be booked below the required tier."
 *
 * Lives here rather than in the store because the TOUR PLANNER has to ask the
 * same question of every leg before the player commits to a run of dates. A
 * planner that could not say "this date cannot happen" would let a player book
 * a five-city tour that dies on the second night.
 */
export function slotRequirement(
  type: ShowType,
  venue: Venue,
  artistCountry: string,
  fame: number,
  promoterCut: number,
  logisticsMult: number,
): string | null {
  if (type === 'festival') {
    // The room first. A missing promoter is the fixable problem; a 500-cap club
    // is not, and sending a player off to hire someone for a show that still
    // could not happen is worse than saying nothing.
    if (venue.cls === 'club' || venue.cls === 'theatre') {
      return 'A festival slot is not played in a room this size.';
    }
    if (promoterCut <= 0) {
      return 'A festival slot comes through a promoter, and there is nobody on your team to get you one.';
    }
  }
  if (type === 'international_tour') {
    if (venue.country === artistCountry) {
      return 'An international date has to be outside your own country.';
    }
    if (logisticsMult >= 1) {
      return 'An international date needs a tour manager — nobody else is booking the freight and the visas.';
    }
    if (accessTier(fame) < 3) {
      return 'International promoters do not book artists below a national draw.';
    }
  }
  if (type === 'university' && (venue.cls === 'arena' || venue.cls === 'stadium')) {
    return 'A university show is not played in a room this size.';
  }
  return null;
}

// ─── DEMAND ────────────────────────────────────────────────────────────────

/** The ticket price this artist's audience considers fair, right now. */
export function perceivedTicketPrice(fame: number): number {
  return Math.round(8 + Math.max(0, fame) * 1.15);
}

export interface DemandInput {
  /** Blended fame, 0-100. */
  fame: number;
  /** Career momentum, roughly -100..100. */
  momentum: number;
  /** The artist's home country. */
  artistCountry: string;
  /** The country the room is in. */
  cityCountry: string;
  /** The room's capacity. */
  capacity: number;
  /** Ticket price. */
  price: number;
  /**
   * Sales multiplier from the promotion team. 1 = nobody is promoting this.
   * A promoter, a publicist, radio, DJs and press all fold in here.
   */
  promo: number;
  /**
   * 0 = this city has forgotten you, 1 = they saw you last week.
   * See `decayedFatigue` — it is derived from the city's memory, not a flag.
   */
  fatigue: number;
}

export interface DemandResult {
  /** People who would come at a fair price, before price and saturation. */
  draw: number;
  /** How price changes that, 0.02..1. */
  elasticity: number;
  /** How recent shows in this city change that, 0.25..1. */
  saturation: number;
  /** The fair price used for the elasticity curve. */
  fairPrice: number;
}

/** Half-life of a city's memory of you: ~11 days. Refills in 4-8 weeks. */
export const FATIGUE_DECAY_PER_DAY = 0.94;

/**
 * How hard a full room bites into the next show's sales.
 *
 * Tuned against the spam test rather than by feel. At 0.45 a bot playing the
 * same city every three days settled at 24% of its normal crowd — which is a
 * big penalty, but still a PROFITABLE one, so spamming out-earned a sensible
 * plan and acceptance test 8 failed. The room has to empty faster than the
 * fixed costs fall, or the strategy is not actually punished: the hire, the
 * production and the security are the same bill whether 400 people or 4,000
 * turn up.
 */
const SATURATION_WEIGHT = 0.85;

/** Above 1 the audience is price-sensitive; 1.6 means doubling the price ~thirds the room. */
const PRICE_ELASTICITY = 1.6;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Who would come, at a fair price, if this city had not seen you recently.
 *
 * Anchored on fame rather than raw fanbase because fame is the number the rest
 * of the game reasons about, and because a fanbase figure can be inflated by a
 * single viral track that never converted into people who leave the house.
 *
 * The curve is fitted so that at each tier the artist fills roughly half to
 * two-thirds of the LARGEST room that tier unlocks:
 *
 *   fame  0 →   ~150   (a club holds 120-450)
 *   fame 15 →   ~700   (a theatre holds 500-2,000)
 *   fame 35 → ~2,900   (a hall holds 2,500-8,000)
 *   fame 60 → ~10,300  (an arena holds 10,000-25,000)
 *   fame 82 → ~24,000  (a stadium holds 35,000+)
 *
 * That headroom is the point. An earlier version of this curve let the artist
 * sell out their tier's biggest room at every fame level, which quietly made
 * price, saturation and the promoter invisible — a sold-out room cannot show
 * you that you priced it wrong, and it is the same "the lever does nothing"
 * bug the rebuild exists to kill.
 */
export function fairDraw(fame: number, momentum: number, artistCountry: string, cityCountry: string, promo: number): number {
  const reach = affinity(artistCountry, cityCountry);
  const base = 150 * Math.pow(1 + Math.max(0, fame) / 32, 4);
  const hype = 1 + clamp(momentum, -40, 100) / 140;
  return Math.max(0, base * (0.35 + 0.65 * reach) * hype * Math.max(0.4, promo));
}

export function computeDemand(input: DemandInput): DemandResult {
  const fairPrice = perceivedTicketPrice(input.fame);
  const ratio = fairPrice / Math.max(1, input.price);
  const elasticity = clamp(Math.pow(ratio, PRICE_ELASTICITY), 0.02, 1);
  const saturation = clamp(1 / (1 + input.fatigue * SATURATION_WEIGHT), 0.25, 1);
  return {
    draw: fairDraw(input.fame, input.momentum, input.artistCountry, input.cityCountry, input.promo),
    elasticity,
    saturation,
    fairPrice,
  };
}

// ─── COSTS ─────────────────────────────────────────────────────────────────

export interface CostInput {
  venue: Venue;
  tickets: number;
  gross: number;
  artistCountry: string;
  cityCountry: string;
  /** Manager's commission on the door, 0 when unsigned. */
  managerPct: number;
  /** Promoter's cut of ticket revenue, 0 when there is no promoter. */
  promoterPct: number;
  /** Lawyer's clawback against everyone else's cut, 0-1. */
  cutRelief: number;
  /** Tour manager's effect on logistics. Below 1 is a good one. */
  logisticsMult: number;
  /** Venue owner's effect on the rental terms. Below 1 is a good one. */
  venueHireMult: number;
}

export interface CostResult {
  lines: ShowCostLine[];
  total: number;
}

/**
 * Every dollar that leaves the building, named.
 *
 * The old code subtracted one number called `bookingCost` and called it a day.
 * The spec is explicit that costs scale with the event, and the settlement has
 * to itemise them or the player cannot see where a good night went.
 */
export function computeCosts(input: CostInput): CostResult {
  const cap = input.venue.capacity;
  const reach = affinity(input.artistCountry, input.cityCountry);
  // Getting the show to a city that is not your own is the expensive part, and
  // it is the tour manager's whole job to keep it from being worse.
  const travel = (input.cityCountry === input.artistCountry ? 350 : 900 + (1 - reach) * 5200)
    * input.logisticsMult;

  const lines: ShowCostLine[] = [
    {
      key: 'venue',
      label: 'Venue hire',
      amount: Math.round(input.venue.hireCost * input.venueHireMult / 50) * 50,
      to: input.venue.name,
    },
    { key: 'production', label: 'Production & staging', amount: Math.round(cap * 5.2) },
    { key: 'crew', label: 'Crew, sound & lighting', amount: Math.round(cap * 3.4) },
    { key: 'security', label: 'Security & stewarding', amount: Math.round(cap * 2.3) },
    { key: 'travel', label: 'Travel & freight', amount: Math.round(travel) },
    { key: 'insurance', label: 'Insurance & licences', amount: Math.round(cap * 0.9 + 250) },
  ];

  const relief = clamp(input.cutRelief, 0, 0.6);

  if (input.promoterPct > 0) {
    lines.push({
      key: 'promoter',
      label: `Promoter's cut (${Math.round(input.promoterPct * 100)}% of the door)`,
      amount: Math.round(input.gross * input.promoterPct * (1 - relief)),
      to: 'Promoter',
    });
  }
  if (input.managerPct > 0) {
    lines.push({
      key: 'manager',
      label: `Manager's commission (${Math.round(input.managerPct * 100)}%)`,
      amount: Math.round(input.gross * input.managerPct * (1 - relief)),
      to: 'Manager',
    });
  }

  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0) };
}

/** Average merch spend per head. A club crowd buys more than a stadium. */
export function merchPerHead(venue: Venue, visualMult: number): number {
  const room = venue.cls === 'club' ? 9.5 : venue.cls === 'theatre' ? 8 : venue.cls === 'hall' ? 6.5 : 5;
  return room * clamp(visualMult, 0.5, 2.5);
}

// ─── THE PLAN ──────────────────────────────────────────────────────────────

export interface ShowPlanInput extends DemandInput {
  venue: Venue;
  /** Visual/marketing multiplier from the stylist and photographer. */
  visualMult: number;
  managerPct: number;
  promoterPct: number;
  cutRelief: number;
  logisticsMult: number;
  venueHireMult: number;
}

export interface ShowPlan {
  venue: Venue;
  price: number;
  tickets: { low: number; likely: number; high: number };
  /** Share of the room sold at the likely figure, 0-1. */
  fill: number;
  demand: DemandResult;
  costs: ShowCostLine[];
  totalCosts: number;
  gross: { low: number; likely: number; high: number };
  merch: number;
  net: { low: number; likely: number; high: number };
  warnings: string[];
  /** Plain-language reasons, so the estimate is explainable rather than magic. */
  drivers: { label: string; value: string }[];
}

/**
 * The three-point estimate.
 *
 * `roll` is the spread the room introduces — weather, a competing show, how
 * the week went. The player is shown a range because a single number is a
 * promise, and a show cannot make one.
 */
const ROLL_LOW = 0.82;
const ROLL_HIGH = 1.18;

/**
 * Seats sold, given the demand and the night's luck.
 *
 * The `min(capacity, ...)` is the whole point: this is the line the old code
 * did not have, and it is why a "Local Club" could hold 205,000 people.
 */
export function ticketsFor(demand: DemandResult, capacity: number, roll: number): number {
  const raw = demand.draw * demand.elasticity * demand.saturation * roll;
  return Math.max(0, Math.min(capacity, Math.round(raw)));
}

export interface ShowSettlement {
  tickets: number;
  /** Share of the room sold, 0-1. */
  fill: number;
  gross: number;
  merch: number;
  costs: ShowCostLine[];
  totalCosts: number;
  /** What actually lands in the account. Can be negative — a show can flop. */
  net: number;
}

/**
 * What the night actually paid.
 *
 * Separate from `planShow` on purpose: the plan is a three-point estimate the
 * player reads, and this is the single outcome that happened. Both come out of
 * the same demand model, so the estimate cannot be a different show.
 */
export function settleShow(input: ShowPlanInput, roll: number): ShowSettlement {
  const demand = computeDemand(input);
  const capacity = input.venue.capacity;
  const tickets = ticketsFor(demand, capacity, roll);
  const gross = tickets * input.price;
  const merch = Math.round(tickets * merchPerHead(input.venue, input.visualMult));
  const costs = computeCosts({
    venue: input.venue,
    tickets,
    gross,
    artistCountry: input.artistCountry,
    cityCountry: input.cityCountry,
    managerPct: input.managerPct,
    promoterPct: input.promoterPct,
    cutRelief: input.cutRelief,
    logisticsMult: input.logisticsMult,
    venueHireMult: input.venueHireMult,
  });
  return {
    tickets,
    fill: capacity > 0 ? tickets / capacity : 0,
    gross,
    merch,
    costs: costs.lines,
    totalCosts: costs.total,
    net: gross + merch - costs.total,
  };
}

/**
 * The night as it actually played, when the seats were sold DAY BY DAY.
 *
 * `settleShow` decides the crowd from demand in one go. A scheduled show has
 * already sold its tickets over weeks, so the crowd is a fact by the time the
 * doors open and this only works out what that crowd paid and cost. Anything
 * already paid (deposit, promotion) comes in as `prepaid` cost lines, so the
 * settlement shows the true profit and the caller credits the cash back.
 */
export function settleSoldShow(
  input: ShowPlanInput,
  tickets: number,
  prepaid: ShowCostLine[] = [],
): ShowSettlement {
  const capacity = input.venue.capacity;
  const sold = Math.max(0, Math.min(capacity, Math.round(tickets)));
  const gross = sold * input.price;
  const merch = Math.round(sold * merchPerHead(input.venue, input.visualMult));
  const costs = computeCosts({
    venue: input.venue,
    tickets: sold,
    gross,
    artistCountry: input.artistCountry,
    cityCountry: input.cityCountry,
    managerPct: input.managerPct,
    promoterPct: input.promoterPct,
    cutRelief: input.cutRelief,
    logisticsMult: input.logisticsMult,
    venueHireMult: input.venueHireMult,
  });
  const lines = [...costs.lines, ...prepaid.filter((l) => l.amount > 0)];
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return {
    tickets: sold,
    fill: capacity > 0 ? sold / capacity : 0,
    gross,
    merch,
    costs: lines,
    totalCosts: total,
    net: gross + merch - total,
  };
}

export function planShow(input: ShowPlanInput): ShowPlan {
  const demand = computeDemand(input);
  const capacity = input.venue.capacity;

  const likely = ticketsFor(demand, capacity, 1);
  const low = ticketsFor(demand, capacity, ROLL_LOW);
  const high = ticketsFor(demand, capacity, ROLL_HIGH);

  const grossOf = (t: number) => t * input.price;
  const merch = Math.round(likely * merchPerHead(input.venue, input.visualMult));

  const costs = computeCosts({
    venue: input.venue,
    tickets: likely,
    gross: grossOf(likely),
    artistCountry: input.artistCountry,
    cityCountry: input.cityCountry,
    managerPct: input.managerPct,
    promoterPct: input.promoterPct,
    cutRelief: input.cutRelief,
    logisticsMult: input.logisticsMult,
    venueHireMult: input.venueHireMult,
  });

  // Merch is not in the fixed cost base, so the range moves only with tickets.
  const netOf = (t: number, m: number) => Math.round(grossOf(t) + m - costs.total);

  const warnings: string[] = [];
  const fair = demand.fairPrice;
  if (input.price > fair * 1.6) {
    warnings.push(
      `$${input.price} is well above the $${fair} this room expects to pay. You will sell far fewer seats.`,
    );
  } else if (input.price < fair * 0.7) {
    warnings.push(
      `$${input.price} is well under the $${fair} this room would pay. You are leaving money on the table.`,
    );
  }
  if (demand.saturation < 0.85) {
    warnings.push(`This city has seen you recently — expect about ${Math.round(demand.saturation * 100)}% of the usual turnout.`);
  }
  if (demand.draw > capacity * 1.5) {
    warnings.push(`You could fill a bigger room than this.`);
  }
  if (demand.draw < capacity * 0.45) {
    warnings.push(`You are unlikely to fill this room — consider somewhere smaller.`);
  }
  if (likely === 0) {
    warnings.push(`At this price, nobody is coming.`);
  }

  const drivers = [
    { label: 'Would come at a fair price', value: Math.round(demand.draw).toLocaleString() },
    { label: 'Fair ticket price', value: `$${fair}` },
    { label: 'Price effect', value: `${Math.round(demand.elasticity * 100)}%` },
    { label: 'City memory', value: `${Math.round(demand.saturation * 100)}%` },
    { label: 'Promotion', value: `${Math.round(input.promo * 100)}%` },
  ];

  return {
    venue: input.venue,
    price: input.price,
    tickets: { low, likely, high },
    fill: capacity > 0 ? likely / capacity : 0,
    demand,
    costs: costs.lines,
    totalCosts: costs.total,
    gross: { low: grossOf(low), likely: grossOf(likely), high: grossOf(high) },
    merch,
    net: { low: netOf(low, merch), likely: netOf(likely, merch), high: netOf(high, merch) },
    warnings,
    drivers,
  };
}

// ─── COOLDOWN ──────────────────────────────────────────────────────────────

/**
 * A city's memory of the player, brought up to date.
 *
 * Decayed lazily rather than in the tick: the tick would have to walk every
 * city in the world every day to keep this honest, and a value that is only
 * ever read when a show is planned can just be aged on read. The stored figure
 * is therefore always "as of `fatigueSerial`", and this is the only correct way
 * to read it.
 */
export function decayedFatigue(
  market: { fatigue: number; fatigueSerial: number } | undefined,
  nowSerial: number,
): number {
  if (!market) return 0;
  const days = Math.max(0, nowSerial - market.fatigueSerial);
  return market.fatigue * Math.pow(FATIGUE_DECAY_PER_DAY, days);
}

/**
 * Fold a finished show into a city's memory.
 *
 * A full room tires a city more than a half-empty one, because more of the
 * people who would come next time already came.
 */
export function addFatigue(current: number, fill: number): number {
  return current + 0.5 + 0.7 * clamp(fill, 0, 1);
}

export interface CooldownCheck {
  ok: boolean;
  /** Days still to wait. 0 when ok. */
  daysLeft: number;
  reason: string;
}

/**
 * Whether the artist can play this city again yet.
 *
 * A refusal, not a reschedule. The old code moved the date forward and let the
 * booking through, which is not a cooldown — four shows went through on four
 * consecutive days in the same city.
 */
export function checkCooldown(
  cls: VenueClass,
  lastShowSerial: number | undefined,
  nowSerial: number,
): CooldownCheck {
  if (lastShowSerial === undefined) return { ok: true, daysLeft: 0, reason: '' };
  const gap = VENUE_CLASSES[cls].cooldownDays;
  const since = nowSerial - lastShowSerial;
  if (since >= gap) return { ok: true, daysLeft: 0, reason: '' };
  const left = gap - since;
  const label = VENUE_CLASSES[cls].label.toLowerCase();
  // "A arena" was the reason string the player actually read. It starts a
  // sentence, so the article has to be capitalised too.
  const article = /^[aeiou]/.test(label) ? 'An' : 'A';
  return {
    ok: false,
    daysLeft: left,
    reason: `You played this city ${since === 0 ? 'today' : `${since} day${since === 1 ? '' : 's'} ago`}. ${article} ${label} needs ${gap} days between shows — ${left} to go.`,
  };
}

// ─── PERFORMANCE ───────────────────────────────────────────────────────────

export interface PerformanceInput {
  stagePresence: number;
  performance: number;
  charisma: number;
  consistency: number;
  /** Points added by the live band, choreography and the front-of-house mix. */
  stageBonus: number;
  /** 0-1 of the energy ceiling the artist is at on the night. */
  energyRatio: number;
  /** 0-1 of the room sold. A full room lifts a set. */
  fill: number;
}

/**
 * How the night actually went.
 *
 * Deliberately NOT the average of four stats the way it used to be — a tired
 * artist in a half-empty room should visibly underperform, and that is the
 * whole reason energy and the team matter.
 */
export function performanceScore(input: PerformanceInput): number {
  const craft = (input.stagePresence + input.performance + input.charisma + input.consistency) / 4;
  const energyFactor = 0.7 + 0.3 * clamp(input.energyRatio, 0, 1);
  // A full room gives the set something to push against; an empty one takes it away.
  const crowdFactor = 0.82 + 0.28 * clamp(input.fill, 0, 1);
  return Math.round(clamp((craft + input.stageBonus) * energyFactor * crowdFactor, 0, 100));
}

// ─── WHERE YOU LIVE ────────────────────────────────────────────────────────
// Everybody lives somewhere and everybody pays for it. You start in the family
// house; you can move out to a room, an apartment, a place with a gate, a villa
// or a mansion — renting, or buying when you can. Each one costs what it costs
// in your country (rent in Accra is not rent in London), and in Ghana and
// Nigeria the landlord wants a year up front, like in real life.
//
// It matters: a better place is better sleep (more energy), a bigger image, and
// a bigger bill every month. Fall behind on rent and you get a notice; ignore
// the notice and you're back at your mum's.

export type HomeTier = 'family' | 'room' | 'apartment' | 'luxury' | 'villa' | 'mansion';

export interface HomeDef {
  id: HomeTier;
  name: string;
  emoji: string;
  /** Monthly rent in USD at Accra prices. */
  rent: number;
  /** Food, power, water, data and getting around, per month at Accra prices. */
  living: number;
  /** Buying it outright, at Accra prices. 0 = not for sale. */
  price: number;
  /** Max energy from how well you sleep there. */
  energy: number;
  /** How it reads from the outside, 0..5. */
  image: number;
  blurb: string;
}

export const HOMES: HomeDef[] = [
  { id: 'family', name: 'The family house', emoji: '🏠', rent: 0, living: 70, price: 0, energy: -5, image: 0, blurb: 'Your old room. Free, loud, and your mum knows when you come in.' },
  { id: 'room', name: 'Single room', emoji: '🚪', rent: 70, living: 130, price: 0, energy: 0, image: 1, blurb: 'Your own door, a shared compound, a fan that rattles.' },
  { id: 'apartment', name: 'One-bed apartment', emoji: '🏢', rent: 320, living: 260, price: 55_000, energy: 3, image: 2, blurb: 'Your own place. Quiet enough to write, close enough to the city.' },
  { id: 'luxury', name: 'Gated apartment', emoji: '🏙️', rent: 1_400, living: 650, price: 240_000, energy: 6, image: 3, blurb: 'Security at the gate, a pool on the roof, generator backup.' },
  { id: 'villa', name: 'Villa', emoji: '🏡', rent: 4_000, living: 1_600, price: 750_000, energy: 8, image: 4, blurb: 'A compound of your own. A studio room, a cook, a driver.' },
  { id: 'mansion', name: 'Mansion', emoji: '🏰', rent: 11_000, living: 4_200, price: 2_600_000, energy: 10, image: 5, blurb: 'Gates, staff, security and a driveway people film.' },
];

export const homeDef = (t: HomeTier | undefined): HomeDef => HOMES.find((h) => h.id === t) ?? HOMES[0];

/** What things cost here, relative to Accra. */
const COST: Record<string, number> = {
  Ghana: 1, Nigeria: 1.1, 'Ivory Coast': 1, Senegal: 1, Togo: 0.9, Cameroon: 0.95, Kenya: 1.1, Tanzania: 0.9, Uganda: 0.85, Ethiopia: 0.8, Rwanda: 0.9,
  'South Africa': 1.5, Egypt: 0.8, Morocco: 1, Algeria: 0.8, Tunisia: 0.8, Zimbabwe: 1, Zambia: 0.9, Angola: 1.3,
  'United States': 3.2, Canada: 2.8, 'United Kingdom': 3, Ireland: 2.9, France: 2.7, Germany: 2.6, Netherlands: 2.8, Belgium: 2.5, Sweden: 2.6, Norway: 3, Denmark: 2.9, Switzerland: 3.6, Italy: 2.3, Spain: 2.1, Portugal: 1.9,
  Japan: 2.5, 'South Korea': 2.3, China: 1.8, India: 0.7, Indonesia: 0.8, Philippines: 0.8, Australia: 2.9, 'New Zealand': 2.6,
  Brazil: 1.3, Mexico: 1.2, Colombia: 1, Argentina: 1, Chile: 1.4, Jamaica: 1.6, 'Trinidad and Tobago': 1.6, 'Puerto Rico': 2.2,
  'United Arab Emirates': 2.9, 'Saudi Arabia': 2.2, Turkey: 1.2, Russia: 1.5,
  // The game's own names for these countries. Without them an American, a
  // Briton or an Emirati paid Accra-plus prices for everything.
  USA: 3.2, UK: 3, UAE: 2.9,
  'DR Congo': 0.9, Mali: 0.75, 'Burkina Faso': 0.75, Botswana: 1.2, Namibia: 1.3, Mozambique: 0.85,
  Poland: 1.6, Thailand: 1.2, Vietnam: 0.9, Malaysia: 1.2,
};
export const costIndex = (country: string | undefined): number => COST[country ?? ''] ?? 1.6;

/** How many months of rent a landlord wants up front. */
export function advanceMonths(country: string | undefined): number {
  if (country === 'Ghana' || country === 'Nigeria') return 12;
  if (country === 'Kenya' || country === 'Uganda' || country === 'Tanzania' || country === 'Cameroon') return 3;
  return 2; // first month and a deposit
}

/** Rent paid at each renewal — a year in Ghana, a month elsewhere. */
export function renewalMonths(country: string | undefined): number {
  return advanceMonths(country) >= 12 ? 12 : 1;
}

export const rentFor = (t: HomeTier, country: string | undefined): number => Math.round(homeDef(t).rent * costIndex(country));
export const livingFor = (t: HomeTier, country: string | undefined): number => Math.round(homeDef(t).living * costIndex(country));
export function priceFor(t: HomeTier, country: string | undefined, propertyIndex = 100): number {
  return Math.round((homeDef(t).price * costIndex(country) * propertyIndex) / 100 / 500) * 500;
}
/** Movers, a few things for the place, the agent's cut. */
export const movingFee = (t: HomeTier, country: string | undefined): number => Math.round([0, 40, 250, 900, 2500, 6000][HOMES.findIndex((h) => h.id === t)] * costIndex(country));

export function moveInCost(t: HomeTier, country: string | undefined): number {
  return rentFor(t, country) * advanceMonths(country) + movingFee(t, country);
}

// ─── WHAT YOU OWN ON WHEELS AND WATER ─────────────────────────────────────

/** What a luxury item costs to keep each month: fuel, insurance, crew, storage. */
export function upkeepFor(category: string, cost: number): number {
  switch (category) {
    case 'car': return Math.max(40, Math.round(cost * 0.01));
    case 'jet': return Math.round(cost * 0.004);
    case 'yacht': return Math.round(cost * 0.008);
    case 'art': return Math.round(cost * 0.001);
    case 'jewelry': case 'watch': return Math.round(cost * 0.0008);
    default: return 0;
  }
}

/** What it would fetch if you sold it today. */
export function resaleFor(category: string, cost: number, ageDays: number, roll = 0.5): number {
  const years = Math.max(0, ageDays) / 365;
  switch (category) {
    case 'car': return Math.round(cost * 0.85 * Math.pow(0.86, years));
    case 'jet': return Math.round(cost * 0.6);
    case 'yacht': return Math.round(cost * 0.8 * Math.pow(0.9, years));
    case 'art': return Math.round(cost * (0.75 + roll * 0.6) * Math.pow(1.04, years));
    case 'watch': return Math.round(cost * 0.85 * Math.pow(1.03, years));
    case 'jewelry': return Math.round(cost * 0.55);
    default: return Math.round(cost * 0.6);
  }
}

// ─── STATE ─────────────────────────────────────────────────────────────────

export interface OwnedHome {
  id: string;
  tier: HomeTier;
  city: string;
  country: string;
  paid: number;
  /** The property index the day you bought, so the value moves with the market. */
  indexAtBuy: number;
  boughtSerial: number;
  /** Let out to tenants while you live elsewhere. */
  rentedOut?: boolean;
}

export interface HomeState {
  tier: HomeTier;
  city: string;
  country: string;
  /** Set when you live in a place you own. */
  ownedId?: string;
  since: number;
  /** Rent is paid up to (not including) this day. */
  paidUntil: number;
  /** Next monthly bill for living costs. */
  nextBill: number;
  /** Rent the landlord is waiting on, and the last day before you're out. */
  due?: { amount: number; by: number };
  /** One house tour per place. */
  toured?: boolean;
  /** Held by the landlord; you get it back when you leave on good terms. */
  deposit?: number;
}

export function newHome(city: string, country: string, today: number): HomeState {
  return { tier: 'family', city, country, since: today, paidUntil: today + 100_000, nextBill: today + 30 };
}

/** Value of a home you own, today. */
export function ownedValue(h: OwnedHome, propertyIndex = 100): number {
  return Math.round((h.paid * propertyIndex) / Math.max(1, h.indexAtBuy || 100));
}

/** What tenants pay you for a place you've let out, per month (after the agent). */
export function rentIncome(h: OwnedHome): number {
  return Math.round(rentFor(h.tier, h.country) * 0.85);
}

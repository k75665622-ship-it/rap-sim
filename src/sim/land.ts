// ─── LAND FOR SALE ─────────────────────────────────────────────────────────
//
// Out past the city edge the world is forest and open land cut into plots.
// Anyone can buy one. Some are already taken when you arrive, and every day
// somebody else might snap up another — so a plot you hesitate over can be
// gone by morning. Pure: no store.

import type { Zone } from './realestate';

export type LandZone = 'plots' | 'wilds' | 'farms' | 'lakeside';

/** What each kind of land costs, and which development tier it builds like. */
export const LAND_TIERS: Record<LandZone, { zone: Zone; price: number; blurb: string; emoji: string }> = {
  farms: { zone: 'outskirts', price: 30_000, blurb: 'Flat farmland. Cheap, and the city is coming.', emoji: '🌾' },
  plots: { zone: 'outskirts', price: 42_000, blurb: 'Surveyed plots on a new road. Good starter land.', emoji: '📐' },
  wilds: { zone: 'suburbs', price: 95_000, blurb: 'Ridge views and a forest behind. Families will pay for it.', emoji: '⛰️' },
  lakeside: { zone: 'beachfront', price: 190_000, blurb: 'Waterfront prestige. The priciest land there is.', emoji: '🏞️' },
};

export interface Taken { by: string; serial: number }

export const NPC_OWNERS = ['K. Mensah', 'Osei Holdings', 'A. Boateng', 'Zenith Land Co.', 'M. Adjei', 'Sunrise Dev Ltd', 'N. Owusu', 'Gold Coast Estates', 'E. Quartey', 'Palm Capital', 'R. Danquah', 'Baobab Trust'];

/** A stable 0..1 number for a string. */
export function roll(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export const plotKey = (country: string, id: string) => `${country}:${id}`;

/** Who owns a plot besides you: a recorded sale, or one of the ~25% already sold when the world was laid out. */
export function takenBy(taken: Record<string, Taken> | undefined, key: string): Taken | null {
  const t = taken?.[key];
  if (t) return t;
  if (roll(key + '|init') < 0.25) return { by: NPC_OWNERS[Math.floor(roll(key + '|who') * NPC_OWNERS.length)], serial: 0 };
  return null;
}

export function plotPrice(zone: LandZone, key: string, propertyIndex: number, discount: number): number {
  const base = LAND_TIERS[zone].price * (0.88 + roll(key + '|px') * 0.24);
  return Math.round(base * (propertyIndex / 100) * (1 - discount) / 100) * 100;
}

/** What a neighbour has built on a plot, for the skyline. */
export function npcBuilding(key: string): { floors: number; color: string } | null {
  const r = roll(key + '|bld');
  if (r < 0.3) return null; // bought to sit on
  const colors = ['#e9dcc4', '#d8c3a5', '#cfd8dc', '#f0d9c8', '#c9d6c3'];
  return { floors: r < 0.7 ? 1 : r < 0.92 ? 2 : 4, color: colors[Math.floor(roll(key + '|col') * colors.length)] };
}

/** Per-day chance that one plot still for sale is bought by someone else. */
export function snapChance(days: number, propertyIndex: number): number {
  const daily = 0.0035 * Math.min(2, Math.max(0.5, propertyIndex / 100));
  return 1 - Math.pow(1 - daily, Math.max(1, days));
}

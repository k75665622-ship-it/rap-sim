// ─── REAL ESTATE DEVELOPMENT ───────────────────────────────────────────────
//
// Buy a plot, build on it, then rent it out or sell it. Construction takes
// months and things go wrong: delays, cost overruns, permit fees, a contractor
// who disappears with a deposit. The property market moves underneath you, so
// when you finish matters as much as what you build.
//
// Pure: no store.

export type Zone = 'outskirts' | 'suburbs' | 'downtown' | 'beachfront';
export type BuildType = 'apartments' | 'villas' | 'plaza' | 'hotel';

export const ZONES: { id: Zone; name: string; emoji: string; land: number; mult: number; blurb: string }[] = [
  { id: 'outskirts', name: 'City outskirts', emoji: '🌾', land: 35_000, mult: 0.65, blurb: 'Cheap land where the city is heading. Slow to rent, cheap to build.' },
  { id: 'suburbs', name: 'Suburbs', emoji: '🏡', land: 120_000, mult: 1, blurb: 'Families, schools, steady demand.' },
  { id: 'downtown', name: 'Downtown', emoji: '🏙️', land: 420_000, mult: 1.7, blurb: 'Where the money is. Expensive to get in, easy to fill.' },
  { id: 'beachfront', name: 'Beachfront', emoji: '🏖️', land: 850_000, mult: 2.4, blurb: 'Prestige land. Luxury buyers and tourists — when the market is up.' },
];

export const BUILDS: { id: BuildType; name: string; emoji: string; cost: number; days: number; rent: number; resale: number; blurb: string }[] = [
  { id: 'apartments', name: 'Rental apartments', emoji: '🏢', cost: 160_000, days: 120, rent: 0.0072, resale: 1.16, blurb: 'Twelve units. Steady rent, easy to sell.' },
  { id: 'villas', name: 'Luxury villas', emoji: '🏰', cost: 420_000, days: 180, rent: 0.0055, resale: 1.24, blurb: 'Gated, pools, the works. Sells big in a good market.' },
  { id: 'plaza', name: 'Shopping plaza', emoji: '🛍️', cost: 900_000, days: 240, rent: 0.0085, resale: 1.18, blurb: 'Shops pay rent every month. Vacancies hurt.' },
  { id: 'hotel', name: 'Boutique hotel', emoji: '🏨', cost: 2_400_000, days: 300, rent: 0.0095, resale: 1.28, blurb: 'Tourists and the concert crowd. The biggest swing on this list.' },
];

export interface DevProject {
  id: string;
  zone: Zone;
  build?: BuildType;
  stage: 'land' | 'building' | 'done' | 'sold';
  landCost: number;
  buildCost: number;
  spent: number;
  boughtSerial: number;
  startSerial?: number;
  doneSerial?: number;
  /** Index when the land was bought, to value against. */
  indexAtBuy: number;
  quality: number;
  renting: boolean;
  /** Unpaid extra cost the build is waiting on. */
  owed: number;
  log: string[];
  soldFor?: number;
  totalRent: number;
}

const zoneOf = (z: Zone) => ZONES.find((x) => x.id === z)!;
const buildOf = (b: BuildType) => BUILDS.find((x) => x.id === b)!;
export { zoneOf, buildOf };

export function buildCostFor(zone: Zone, build: BuildType): number {
  return Math.round(buildOf(build).cost * (0.8 + zoneOf(zone).mult * 0.2));
}

/** What it is worth now. */
export function projectValue(p: DevProject, index: number, serial: number): number {
  const m = index / p.indexAtBuy;
  if (p.stage === 'sold') return 0;
  if (p.stage === 'land') return Math.round(p.landCost * m * 1.02);
  const b = buildOf(p.build!);
  const finished = (p.landCost + p.buildCost) * b.resale * (0.85 + p.quality / 330) * m;
  if (p.stage === 'done') return Math.round(finished);
  const progress = p.startSerial !== undefined && p.doneSerial !== undefined ? Math.min(1, (serial - p.startSerial) / Math.max(1, p.doneSerial - p.startSerial)) : 0;
  // `spent` includes the land, which is valued on its own above.
  return Math.round(p.landCost * m + (p.spent - p.landCost) * 0.8 + (finished - p.landCost - p.buildCost) * progress * 0.5);
}

export function monthlyRent(p: DevProject, index: number): number {
  if (p.stage !== 'done' || !p.renting) return 0;
  const b = buildOf(p.build!);
  return Math.round((p.landCost + p.buildCost) * b.rent * zoneOf(p.zone).mult ** 0.25 * (0.8 + p.quality / 250) * (index / 100) ** 0.5);
}

/** A month on site: things go wrong, sometimes right. */
export function buildMonth(p: DevProject, ctx: { lawyer: boolean; assistant: boolean }, r: () => number): string | null {
  if (p.stage !== 'building') return null;
  const roll = r();
  if (roll < 0.1) { const d = 15 + Math.floor(r() * 25); p.doneSerial = (p.doneSerial ?? 0) + d; return `Rain and material shortages — ${d} days of delay.`; }
  if (roll < 0.17) { const extra = Math.round(p.buildCost * (0.08 + r() * 0.15)); p.owed += extra; return `Cost overrun: the contractor needs $${extra.toLocaleString()} more before work continues.`; }
  if (roll < 0.21) { const fee = Math.round(p.buildCost * 0.03); p.owed += ctx.assistant ? Math.round(fee * 0.5) : fee; return `A permit problem. $${(ctx.assistant ? Math.round(fee * 0.5) : fee).toLocaleString()} in fees to sort it out.`; }
  if (roll < 0.235) {
    if (ctx.lawyer) return 'A contractor tried to walk off with a deposit. Your lawyer got it back.';
    const lost = Math.round(p.buildCost * 0.08); p.owed += lost; p.quality = Math.max(20, p.quality - 6);
    return `A contractor disappeared with a $${lost.toLocaleString()} deposit. You have to cover it.`;
  }
  if (roll > 0.92) { p.quality = Math.min(100, p.quality + 8); return 'The site manager is excellent — the build quality is ahead of plan.'; }
  return null;
}

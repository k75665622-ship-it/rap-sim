// ─── TERRITORY AFFINITY ────────────────────────────────────────────────────
// How strongly an artist from one country travels in another. This is the single
// definition used by the regional charts, the per-platform country splits and the
// global chart weighting — an earlier version had the regional charts using a
// private copy, which meant the two systems disagreed about the same artist.

import { getCountry } from '../data/locations';
import { marketWeight, WORLD_WEIGHT } from '../data/markets';

// Hand-tuned overrides for the markets the game is built around. Everything
// else falls through to the continental model below.
const MARKET_AFFINITY: Record<string, Record<string, number>> = {
  Ghana: { Ghana: 1.0, Nigeria: 0.45, Africa: 0.7, UK: 0.15, USA: 0.05 },
  Nigeria: { Ghana: 0.6, Nigeria: 1.0, Africa: 0.85, UK: 0.25, USA: 0.1 },
  USA: { Ghana: 0.05, Nigeria: 0.08, Africa: 0.1, UK: 0.55, USA: 1.0 },
  UK: { Ghana: 0.12, Nigeria: 0.18, Africa: 0.15, UK: 1.0, USA: 0.45 },
  'South Africa': { Ghana: 0.2, Nigeria: 0.3, Africa: 0.75, UK: 0.15, USA: 0.06 },
};

/** Cross-continental reach. Africa↔Europe and US↔UK are real bridges. */
const BRIDGES: Record<string, number> = {
  'North America|Europe': 0.42,
  'Europe|North America': 0.42,
  'Africa|Europe': 0.22,
  'Europe|Africa': 0.22,
  'Africa|North America': 0.13,
  'North America|Africa': 0.13,
  'South America|North America': 0.3,
  'North America|South America': 0.3,
  'Caribbean|North America': 0.45,
  'North America|Caribbean': 0.45,
  'Asia|North America': 0.14,
  'North America|Asia': 0.14,
  'Oceania|Europe': 0.25,
  'Europe|Oceania': 0.25,
};

const affinityMemo = new Map<string, number>();

/**
 * How well an artist from `home` travels in `market`. Memoised: the charts
 * and the streaming engine ask this tens of thousands of times a day, and the
 * answer for a pair of countries never changes.
 */
export function affinity(home: string | undefined, market: string): number {
  const key = `${home ?? ''}|${market}`;
  const hit = affinityMemo.get(key);
  if (hit !== undefined) return hit;
  const v = affinityRaw(home, market);
  affinityMemo.set(key, v);
  return v;
}

function affinityRaw(home: string | undefined, market: string): number {
  if (market === 'World') {
    return home ? (home === 'USA' || home === 'UK' ? 0.3 : 0.18) : 0.15;
  }
  if (!home) return market === 'Africa' ? 0.25 : 0.1;

  const row = MARKET_AFFINITY[home];
  if (row && row[market] !== undefined) return row[market];

  const homeCountry = getCountry(home);
  if (!homeCountry) return market === 'Africa' ? 0.5 : 0.12;

  if (home === market) return 1.0;
  if (market === 'Africa') {
    return homeCountry.continent === 'Africa' ? 0.65 : 0.08;
  }
  const marketCountry = getCountry(market);
  if (!marketCountry) return 0.12;
  if (marketCountry.continent === homeCountry.continent) return 0.35;
  return BRIDGES[`${homeCountry.continent}|${marketCountry.continent}`] ?? 0.08;
}

/**
 * The weight a country carries toward the GLOBAL charts.
 *
 * Market size does the heavy lifting, affinity decides how much of that market
 * the artist can actually reach. This is why topping Ghana is not enough to
 * enter the Global Top 100: Ghana is 3.2 against a world of ~430, so even a #1
 * there contributes a rounding error next to a mid-chart position in the US.
 */
export function globalReach(home: string | undefined, country: string): number {
  return (marketWeight(country) / WORLD_WEIGHT) * affinity(home, country);
}

// ─── MUSIC MARKETS ─────────────────────────────────────────────────────────
// One entry per country the game simulates. `weight` is the relative size of
// that country's recorded-music market, which is what decides how much a stream
// there is worth and how heavily it counts toward the global charts. It is
// deliberately NOT population — Nigeria is huge and India is enormous, but the
// US, Japan and the UK are where the money and the chart points are.
//
// `region` is only used for grouping the country picker. It follows the game's
// own continents, with the Caribbean broken out because those markets behave
// nothing like North America.

import { LOCATIONS } from './locations';

export type Region =
  | 'Africa'
  | 'North America'
  | 'Caribbean'
  | 'South America'
  | 'Europe'
  | 'Asia'
  | 'Middle East'
  | 'Oceania';

export interface Market {
  country: string;
  region: Region;
  /** Relative market size. USA = 100. */
  weight: number;
  /** ISO-ish code used for the flag mark. */
  code: string;
  /** How much of the market pays for premium tiers, 0-1. Drives Apple/Spotify split. */
  premium: number;
}

const M = (
  country: string,
  region: Region,
  weight: number,
  code: string,
  premium: number,
): Market => ({ country, region, weight, code, premium });

export const MARKETS: Market[] = [
  // ── Africa ──────────────────────────────────────────────────────────────
  M('Ghana', 'Africa', 3.2, 'GH', 0.18),
  M('Nigeria', 'Africa', 9.0, 'NG', 0.14),
  M('South Africa', 'Africa', 7.0, 'ZA', 0.34),
  M('Kenya', 'Africa', 3.0, 'KE', 0.16),
  M('Tanzania', 'Africa', 2.0, 'TZ', 0.11),
  M('Ivory Coast', 'Africa', 2.0, 'CI', 0.15),
  M('Senegal', 'Africa', 1.1, 'SN', 0.14),
  M('Ethiopia', 'Africa', 1.4, 'ET', 0.08),
  M('Egypt', 'Africa', 3.4, 'EG', 0.22),
  M('Morocco', 'Africa', 2.1, 'MA', 0.2),
  M('Cameroon', 'Africa', 1.5, 'CM', 0.12),
  M('DR Congo', 'Africa', 2.0, 'CD', 0.09),
  M('Uganda', 'Africa', 1.5, 'UG', 0.1),
  M('Zambia', 'Africa', 1.0, 'ZM', 0.11),
  M('Zimbabwe', 'Africa', 1.0, 'ZW', 0.12),
  M('Angola', 'Africa', 1.6, 'AO', 0.13),
  M('Mozambique', 'Africa', 1.0, 'MZ', 0.1),
  M('Mali', 'Africa', 1.0, 'ML', 0.09),
  M('Burkina Faso', 'Africa', 0.8, 'BF', 0.09),
  M('Rwanda', 'Africa', 0.8, 'RW', 0.1),
  M('Botswana', 'Africa', 0.6, 'BW', 0.24),
  M('Namibia', 'Africa', 0.6, 'NA', 0.22),
  M('Tunisia', 'Africa', 1.0, 'TN', 0.2),
  M('Algeria', 'Africa', 1.5, 'DZ', 0.16),

  // ── North America ───────────────────────────────────────────────────────
  M('USA', 'North America', 100, 'US', 0.72),
  M('Canada', 'North America', 22, 'CA', 0.7),
  M('Mexico', 'North America', 12, 'MX', 0.38),
  M('Jamaica', 'Caribbean', 2.0, 'JM', 0.15),
  M('Puerto Rico', 'Caribbean', 2.8, 'PR', 0.3),
  M('Dominican Republic', 'Caribbean', 2.0, 'DO', 0.2),
  M('Trinidad', 'Caribbean', 1.0, 'TT', 0.25),
  M('Cuba', 'Caribbean', 1.0, 'CU', 0.06),
  M('Haiti', 'Caribbean', 0.7, 'HT', 0.07),
  M('Barbados', 'Caribbean', 0.4, 'BB', 0.3),

  // ── South America ───────────────────────────────────────────────────────
  M('Brazil', 'South America', 22, 'BR', 0.3),
  M('Colombia', 'South America', 5.0, 'CO', 0.24),
  M('Argentina', 'South America', 7.0, 'AR', 0.26),
  M('Chile', 'South America', 4.0, 'CL', 0.3),
  M('Peru', 'South America', 3.0, 'PE', 0.22),

  // ── Europe ──────────────────────────────────────────────────────────────
  M('UK', 'Europe', 45, 'GB', 0.74),
  M('France', 'Europe', 34, 'FR', 0.62),
  M('Germany', 'Europe', 42, 'DE', 0.66),
  M('Netherlands', 'Europe', 11, 'NL', 0.7),
  M('Sweden', 'Europe', 10, 'SE', 0.8),
  M('Ireland', 'Europe', 3.0, 'IE', 0.75),
  M('Spain', 'Europe', 13, 'ES', 0.52),
  M('Italy', 'Europe', 14, 'IT', 0.5),
  M('Portugal', 'Europe', 3.0, 'PT', 0.48),
  M('Poland', 'Europe', 8.0, 'PL', 0.44),
  M('Russia', 'Europe', 8.0, 'RU', 0.28),
  M('Belgium', 'Europe', 6.0, 'BE', 0.68),
  M('Norway', 'Europe', 6.0, 'NO', 0.82),
  M('Denmark', 'Europe', 5.0, 'DK', 0.8),
  M('Switzerland', 'Europe', 7.0, 'CH', 0.82),

  // ── Asia ────────────────────────────────────────────────────────────────
  M('India', 'Asia', 16, 'IN', 0.1),
  M('Japan', 'Asia', 62, 'JP', 0.6),
  M('South Korea', 'Asia', 28, 'KR', 0.62),
  M('China', 'Asia', 30, 'CN', 0.35),
  M('Indonesia', 'Asia', 6.0, 'ID', 0.12),
  M('Philippines', 'Asia', 5.0, 'PH', 0.14),
  M('Thailand', 'Asia', 5.0, 'TH', 0.2),
  M('Vietnam', 'Asia', 4.0, 'VN', 0.1),
  M('Malaysia', 'Asia', 4.0, 'MY', 0.2),
  M('Pakistan', 'Asia', 3.0, 'PK', 0.06),
  M('Bangladesh', 'Asia', 2.0, 'BD', 0.05),

  // ── Middle East ─────────────────────────────────────────────────────────
  M('UAE', 'Middle East', 4.0, 'AE', 0.55),
  M('Saudi Arabia', 'Middle East', 5.0, 'SA', 0.42),

  // ── Oceania ─────────────────────────────────────────────────────────────
  M('Australia', 'Oceania', 18, 'AU', 0.72),
  M('New Zealand', 'Oceania', 3.0, 'NZ', 0.72),
];

export const MARKET_BY_COUNTRY: Record<string, Market> = Object.fromEntries(
  MARKETS.map((m) => [m.country, m]),
);

export const REGION_ORDER: Region[] = [
  'Africa',
  'North America',
  'Caribbean',
  'South America',
  'Europe',
  'Asia',
  'Middle East',
  'Oceania',
];

/** Total weight of the world market — used to normalise global shares. */
export const WORLD_WEIGHT = MARKETS.reduce((s, m) => s + m.weight, 0);

export function market(country: string): Market {
  return (
    MARKET_BY_COUNTRY[country] ?? {
      country,
      region: 'Africa',
      weight: 1,
      code: country.slice(0, 2).toUpperCase(),
      premium: 0.15,
    }
  );
}

export function marketWeight(country: string): number {
  return market(country).weight;
}

export function marketsByRegion(): Array<{ region: Region; markets: Market[] }> {
  return REGION_ORDER.map((region) => ({
    region,
    markets: MARKETS.filter((m) => m.region === region).sort((a, b) => b.weight - a.weight),
  })).filter((g) => g.markets.length > 0);
}

/**
 * Safety net: every country the rest of the game knows about must have a market
 * row, or its streams would silently be valued at the 1.0 fallback. Checked once
 * at module load so a new country in `locations.ts` fails loudly instead of
 * quietly under-performing.
 */
export function missingMarkets(): string[] {
  return LOCATIONS.map((c) => c.name).filter((n) => !MARKET_BY_COUNTRY[n]);
}

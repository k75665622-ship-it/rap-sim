// Which part of the world a country belongs to, for story branching.
import { getCountry } from '../data/locations';

export type Region = 'ghana' | 'westafrica' | 'africa' | 'europe' | 'americas' | 'elsewhere';
export const REGIONS: Region[] = ['ghana', 'westafrica', 'africa', 'europe', 'americas', 'elsewhere'];
const WEST = ['Nigeria', 'Senegal', "Côte d'Ivoire", 'Ivory Coast', 'Togo', 'Benin', 'Sierra Leone', 'Liberia', 'Gambia', 'The Gambia', 'Mali', 'Burkina Faso', 'Guinea', 'Cameroon'];

export function regionOf(country: string | undefined): Region {
  if (!country || country === 'Ghana') return 'ghana';
  if (WEST.includes(country)) return 'westafrica';
  const c = getCountry(country)?.continent;
  if (c === 'Africa') return 'africa';
  if (c === 'Europe') return 'europe';
  if (c === 'North America' || c === 'South America') return 'americas';
  return 'elsewhere';
}

/** Mirror where you're from, and where you are, into story flags the conditions can read. */
export function syncRegionFlags(flags: Record<string, boolean | number | string>, home: string | undefined, abroad: string | undefined): void {
  const h = regionOf(home);
  for (const r of REGIONS) flags[`from:${r}`] = r === h;
  flags['away'] = !!abroad;
  const a = abroad ? regionOf(abroad) : null;
  for (const r of REGIONS) flags[`at:${r}`] = a === r;
}

// ─── THE CITY: LAYOUT ──────────────────────────────────────────────────────
//
// Pure data, no three.js. Roads, blocks, buildings, doors, props and the
// colliders the player and the car bump into. Deterministic: the same city
// every visit, so a player learns their way around.
//
// Axes: x east, z south, y up. One unit is one metre.

import type { GameScreen } from '../types/game';
import { getCountry, getCitiesByCountry } from '../data/locations';
import { regionOf } from '../story/region';

// The world is a 3×3 grid of 300 m districts. Downtown is the middle of the
// top-left one; everything else grows out from it along the same road grid.
export const WORLD = { x0: -150, x1: 1050, z0: -150, z1: 1050 };
export const WORLD_CENTRE = { x: 450, z: 450 };
export const ROAD_CENTRES = [-120, -60, 0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020];
/** Where the built-up city ends; beyond it (east and south) is forest and land for sale. */
export const CITY_EDGE = 750;

export type ZoneId = 'downtown' | 'flats' | 'hollywood' | 'market' | 'sports' | 'heights' | 'suburb' | 'port' | 'airport'
  | 'forest' | 'plots' | 'wilds' | 'pines' | 'farms' | 'lakeside' | 'hills';
/** Zones that are open country: forest is only trees; land zones are cut into plots you can buy. */
export const LAND_ZONES: ZoneId[] = ['plots', 'wilds', 'farms', 'lakeside'];
export const FOREST_ZONES: ZoneId[] = ['forest', 'pines', 'hills'];
export const ZONES: Record<ZoneId, { name: string; col: number; row: number }> = {
  downtown: { name: 'Downtown', col: 0, row: 0 },
  flats: { name: 'Eastgate Flats', col: 1, row: 0 },
  hollywood: { name: 'Studio Lots', col: 2, row: 0 },
  market: { name: 'Market District', col: 0, row: 1 },
  sports: { name: 'Sports Quarter', col: 1, row: 1 },
  heights: { name: 'Skyline Heights', col: 2, row: 1 },
  suburb: { name: 'Palm Estates', col: 0, row: 2 },
  port: { name: 'Harbour', col: 1, row: 2 },
  airport: { name: 'Airport', col: 2, row: 2 },
  forest: { name: 'Greenwood Forest', col: 3, row: 0 },
  plots: { name: 'Sunrise Plots', col: 3, row: 1 },
  wilds: { name: 'Ridge Wilds', col: 3, row: 2 },
  pines: { name: 'Pinewood', col: 3, row: 3 },
  farms: { name: 'Meadow Farms', col: 0, row: 3 },
  lakeside: { name: 'Lakeside', col: 1, row: 3 },
  hills: { name: 'Hilltop Woods', col: 2, row: 3 },
};
export function zoneAt(x: number, z: number): ZoneId {
  const col = Math.max(0, Math.min(3, Math.floor((x + 150) / 300)));
  const row = Math.max(0, Math.min(3, Math.floor((z + 150) / 300)));
  return (Object.keys(ZONES) as ZoneId[]).find((k) => ZONES[k].col === col && ZONES[k].row === row)!;
}
export const ROAD_HALF = 6;            // a road is 12 m wide
export const SIDEWALK = 3;             // then 3 m of pavement
export const KERB_H = 0.15;            // pavement height

export type Side = 'N' | 'S' | 'E' | 'W';

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }

export interface Place {
  id: string;
  name: string;
  /** What the sign over the door says under the name. */
  tagline: string;
  /** The game screen the door opens. No screen = not open yet. */
  screen?: GameScreen;
  /** Shown when a closed door is tried. */
  soon?: string;
  accent: string;
  /** Letter on the minimap. */
  glyph: string;
}

export interface Building extends Box {
  height: number;
  color: string;
  place?: Place;
  /** Residential buildings get a real front door without becoming businesses. */
  homeType?: 'house' | 'apartment';
  door?: { side: Side; x: number; z: number; nx: number; nz: number };
  rooftop: Array<Box & { h: number }>;
}

export interface Prop { kind: 'tree' | 'lamp'; x: number; z: number; rot: number }

export interface ParkedCar { x: number; z: number; heading: number; color: string }

export interface Block extends Box { park: boolean; water?: boolean }
/** A campsite (tent + fire) or a cabin in the forest. */
export interface Camp { id: string; kind: 'camp' | 'cabin'; x: number; z: number; rot: number }
/** One buyable parcel of land (about 19 m square). */
export interface Plot extends Box { id: string; zone: ZoneId; block: string }
/** A whole block of four plots: the unit you buy to start an estate. */
export interface LandBlock extends Box { id: string; zone: ZoneId; plots: string[] }

// The places you can walk into. Order = how close to the middle of town.
export const PLACES: Place[] = [
  { id: 'studio', name: 'STUDIO 9', tagline: 'Recording · Mixing', screen: 'studio', accent: '#ffb800', glyph: 'S' },
  { id: 'stage', name: 'THE STAGE', tagline: 'Live music venue', screen: 'shows', accent: '#b57bff', glyph: 'V' },
  { id: 'bank', name: 'FIRST CAPITAL', tagline: 'Bank · Investments', screen: 'investments', accent: '#2ed573', glyph: '$' },
  { id: 'drip', name: 'DRIP & INK', tagline: 'Fits · Barber · Tattoos', screen: 'style', accent: '#ff6fa8', glyph: 'D' },
  { id: 'gym', name: 'IRON HOUSE', tagline: 'Gym · Vocal coach', screen: 'training', accent: '#ff7a2f', glyph: 'G' },
  { id: 'radio', name: 'HOT 101.9', tagline: 'Radio · Interviews', screen: 'interviews', accent: '#4da3ff', glyph: 'R' },
  { id: 'label', name: 'LABEL HQ', tagline: 'Your record label', screen: 'label', accent: '#ffd666', glyph: 'L' },
  { id: 'crib', name: 'THE CRIB', tagline: 'Home & life', screen: 'lifestyle', accent: '#9aa0b4', glyph: 'H' },
  { id: 'food', name: "MAMA'S KITCHEN", tagline: 'Jollof · Grill · Drinks', screen: 'kitchen', accent: '#ff4757', glyph: 'F' },
  // Landmarks of the wider world — the buildings stand; their insides come next.
  { id: 'apts', name: 'EASTGATE APARTMENTS', tagline: 'Flats to rent & let', accent: '#ffa94d', glyph: 'A' },
  { id: 'lots', name: 'GOLD COAST STUDIOS', tagline: 'Film · TV · Soundstages', accent: '#ff5d8f', glyph: 'T' },
  { id: 'mall', name: 'MARKET SQUARE', tagline: 'Shops · Food court', accent: '#4dd4ac', glyph: 'M' },
  { id: 'stadium', name: 'NATIONAL STADIUM', tagline: 'Football', accent: '#7bd34d', glyph: 'B' },
  { id: 'arena', name: 'IRON RING ARENA', tagline: 'Wrestling · Concerts', accent: '#ff6b6b', glyph: 'W' },
  { id: 'heights', name: 'SKYLINE HEIGHTS', tagline: 'Luxury towers', screen: 'investments', accent: '#74c0fc', glyph: 'K' },
  { id: 'estate', name: 'PALM ESTATES', tagline: 'Houses for sale', screen: 'lifestyle', accent: '#b2f2bb', glyph: 'E' },
  { id: 'port', name: 'TEMA HARBOUR', tagline: 'Ports · Ferries · Cargo', screen: 'ferry', accent: '#4dabf7', glyph: 'P' },
  { id: 'airport', name: 'GOLD COAST AIRPORT', tagline: 'Flights abroad', accent: '#e599f7', glyph: '✈' },
];
const LANDMARKS: Partial<Record<ZoneId, string[]>> = {
  flats: ['apts'], hollywood: ['lots'], market: ['mall'], sports: ['stadium', 'arena'], heights: ['heights'], suburb: ['estate'], port: ['port'], airport: ['airport'],
};
/** How each district builds: storeys, wall colours, and how it carves up a block. */
const STYLE: Record<ZoneId, { h: [number, number]; walls: string[]; split: number }> = {
  downtown: { h: [12, 42], walls: [], split: 0 },
  flats: { h: [14, 26], walls: ['#e8c9a0', '#d9b48a', '#e6d3b3', '#c9a27a', '#f0dcc0'], split: 0 },
  hollywood: { h: [8, 14], walls: ['#b8bcc6', '#9aa0ad', '#c9a7b9', '#a9b8c9', '#d2c2a8'], split: 0 },
  market: { h: [8, 16], walls: ['#e7b98f', '#d9e0a5', '#a5d8cc', '#f0c4c4', '#c9c2e8'], split: 0 },
  sports: { h: [6, 12], walls: ['#9db39a', '#b7c4b0', '#a8b8a4'], split: 0 },
  heights: { h: [44, 90], walls: ['#9fb8d6', '#8aa6c8', '#b9c8dc', '#7f9bc0', '#a6b8cc'], split: 0 },
  suburb: { h: [5, 8], walls: ['#f2e6d0', '#e8d5b5', '#f0c9a6', '#d9e4d0', '#f4dcdc', '#e2d8f0'], split: 3 },
  port: { h: [8, 14], walls: ['#8b95a5', '#a05a4a', '#5a7a99', '#9aa38b'], split: 0 },
  airport: { h: [5, 9], walls: ['#d6dde6', '#c4ced9', '#e4e9ef'], split: 0 },
  forest: { h: [4, 6], walls: [], split: 0 }, plots: { h: [4, 6], walls: [], split: 0 }, wilds: { h: [4, 6], walls: [], split: 0 },
  pines: { h: [4, 6], walls: [], split: 0 }, farms: { h: [4, 6], walls: [], split: 0 }, lakeside: { h: [4, 6], walls: [], split: 0 }, hills: { h: [4, 6], walls: [], split: 0 },
};

// ─── tiny seeded random ────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WALLS = ['#d9d4cc', '#c9b8a3', '#b8c2cc', '#d8c9b0', '#a9b4c2', '#cfc6bd', '#c4a99a', '#b9c7bb', '#e0d6c8', '#9fa9b8'];

export const roadAt = (v: number) => ROAD_CENTRES.some((c) => Math.abs(v - c) <= ROAD_HALF);
export function onRoad(x: number, z: number): boolean {
  return roadAt(x) || roadAt(z);
}

// The bands between roads on one axis: [-90..-69], [-51..-9], [9..51], [69..90].
function bands(): Array<[number, number, boolean, boolean]> {
  // [from, to, roadOnLowSide, roadOnHighSide]
  const edges = [WORLD.x0, ...ROAD_CENTRES, WORLD.x1];
  const out: Array<[number, number, boolean, boolean]> = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lowRoad = i > 0;
    const highRoad = i < edges.length - 2;
    const a = edges[i] + (lowRoad ? ROAD_HALF + SIDEWALK : 0);
    const b = edges[i + 1] - (highRoad ? ROAD_HALF + SIDEWALK : 0);
    out.push([a, b, lowRoad, highRoad]);
  }
  return out;
}

export interface CityLayout {
  blocks: Block[];
  buildings: Building[];
  props: Prop[];
  parked: ParkedCar[];
  plots: Plot[];
  landBlocks: LandBlock[];
  camps: Camp[];
  /** Everything solid, for the player and the car. */
  solids: Box[];
  spawn: { x: number; z: number; rot: number };
  carSpawn: { x: number; z: number; heading: number };
}

let cached: CityLayout | null = null;
let worldCountry = 'Ghana';
let worldCity = '';
export const currentCountry = (): string => worldCountry;
/** The capital (first listed city) is the country's main city; others are 'away' cities. */
const mainCity = (c: string) => getCitiesByCountry(c)[0]?.name ?? c;
/** The city you are in, inside the current country. */
export const currentCity = (): string => worldCity || mainCity(worldCountry);
/** A key for things owned in this world (land): the country, plus the city when it is not the main one. */
export const worldKey = (): string => (worldCity && worldCity !== mainCity(worldCountry) ? `${worldCountry}/${worldCity}` : worldCountry);
/** Which country's city the world is built as. Ghana's Accra is the original; every other country and city gets its own streets and palette. */
export function setWorldCountry(c: string, city = ''): void {
  const cc = city && city !== mainCity(c) ? city : '';
  if (c && (c !== worldCountry || cc !== worldCity)) { worldCountry = c; worldCity = cc; cached = null; }
}
const hashStr = (s: string) => [...s].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7) || 1;
const seedFor = (c: string) => (c === 'Ghana' && !worldCity ? 1919 : hashStr(c + (worldCity ? '/' + worldCity : '')));
const THEMES: Record<string, string[]> = {
  Africa: ['#e3c9a0', '#d3a77a', '#c98f66', '#ecd9b5', '#b9a27f', '#f0e0c0'],
  Europe: ['#b8b2aa', '#a39a8f', '#c4a38a', '#8f8a86', '#d3cdc4', '#9a8f86'],
  Asia: ['#d8dce6', '#c9d4e0', '#e6d6dc', '#bcc9d6', '#dde4d6', '#cfc9e0'],
  'North America': ['#c9ced6', '#b7a590', '#9fb0c4', '#d8d0c0', '#8e9bab', '#c4b8a8'],
  'South America': ['#f0b88a', '#e8d27a', '#9fd3c0', '#f0a0a0', '#c9b0e0', '#f4e0b0'],
  Oceania: ['#e8e4da', '#b5d0e0', '#d9c8a8', '#c0d8c4', '#f0e4d0', '#a8c4d8'],
};
const NAMES: Record<string, Partial<Record<string, string>>> = {
  radio: { westafrica: 'COOL 96.9', africa: 'RHYTHM 91.2', europe: 'CITY FM 98.4', americas: 'POWER 105.7', elsewhere: 'STAR FM 100.1' },
  bank: { europe: 'NORTHBRIDGE BANK', americas: 'LIBERTY TRUST', elsewhere: 'GRAND UNION BANK' },
  mall: { westafrica: 'GRAND BAZAAR', africa: 'GRAND BAZAAR', europe: 'THE ARCADE', americas: 'CITY MALL', elsewhere: 'NIGHT MARKET' },
};
/** The same places, named for where you are. Story-bound ones (the kitchen, Studio 9, the label) keep their names. */
export function localPlace(p: Place, country = worldCountry): Place {
  if (country === 'Ghana' && !worldCity) return p;
  const r = regionOf(country);
  const city = (country === worldCountry ? currentCity() : mainCity(country)).toUpperCase();
  const c = country.toUpperCase();
  const name = p.id === 'airport' ? `${c} INTL AIRPORT` : p.id === 'stadium' ? `${c} NATIONAL STADIUM` : p.id === 'port' ? `${city} HARBOUR` : NAMES[p.id]?.[r] ?? p.name;
  return name === p.name ? p : { ...p, name };
}
export const placesNow = (): Place[] => PLACES.map((p) => localPlace(p));
const wallsForWorld = (): string[] => (worldCountry === 'Ghana' ? WALLS : THEMES[getCountry(worldCountry)?.continent ?? ''] ?? WALLS);

export function cityLayout(): CityLayout {
  if (cached) return cached;
  const r = rng(seedFor(worldCountry));
  const B = bands();
  const blocks: Block[] = [];
  const buildings: Building[] = [];
  const plots: Plot[] = [];
  const landBlocks: LandBlock[] = [];

  // Three parks, so the skyline has gaps.
  const isPark = (ix: number, iz: number) => {
    if (ix <= 5 && iz <= 5) return (ix === 5 && iz === 0) || (ix === 0 && iz === 5) || (ix === 4 && iz === 3);
    const z = zoneAt((B[ix][0] + B[ix][1]) / 2, (B[iz][0] + B[iz][1]) / 2);
    if (LAND_ZONES.includes(z) || FOREST_ZONES.includes(z)) return true;
    return z !== 'airport' && z !== 'port' && z !== 'sports' && (ix * 7 + iz * 13) % 9 === 0;
  };

  type Lot = Box & { inner: boolean; roads: Side[]; centreDist: number };
  const lots: Lot[] = [];

  B.forEach(([x0, x1, xLowRoad, xHighRoad], ix) => {
    B.forEach(([z0, z1, zLowRoad, zHighRoad], iz) => {
      const cxb = (x0 + x1) / 2, czb = (z0 + z1) / 2;
      // Water: a harbour basin in the port district, a lake in Lakeside, and a river through the southern woods.
      const water = (czb >= 680 && czb <= 700 && cxb >= 200 && cxb <= 400) || (cxb >= 210 && cxb <= 390 && czb >= 800 && czb <= 940 && !(cxb < 230 || cxb > 370)) || (Math.abs(cxb - 450) < 6 && czb >= 750);
      if (water) { blocks.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, park: false, water: true }); return; }
      const park = isPark(ix, iz);
      blocks.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, park });
      if (park) {
        const zk = zoneAt((x0 + x1) / 2, (z0 + z1) / 2);
        if (LAND_ZONES.includes(zk)) {
          const gap = 3, w = (x1 - x0 - gap) / 2, d = (z1 - z0 - gap) / 2;
          const bid = `b${ix}_${iz}`;
          const ids: string[] = [];
          for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
            const id = `${bid}${a}${b}`;
            ids.push(id);
            plots.push({ id, zone: zk, block: bid, minX: x0 + a * (w + gap), maxX: x0 + a * (w + gap) + w, minZ: z0 + b * (d + gap), maxZ: z0 + b * (d + gap) + d });
          }
          landBlocks.push({ id: bid, zone: zk, minX: x0, maxX: x1, minZ: z0, maxZ: z1, plots: ids });
        }
        return;
      }
      const inner = ix > 0 && ix < B.length - 1 && iz > 0 && iz < B.length - 1;
      const zn = zoneAt((x0 + x1) / 2, (z0 + z1) / 2);
      const sp = STYLE[zn].split;
      const nx = sp || (x1 - x0 > 30 ? 2 : 1);
      const nz = sp || (z1 - z0 > 30 ? 2 : 1);
      const gap = 4; // alleys between lots
      const lw = (x1 - x0 - gap * (nx - 1)) / nx;
      const ld = (z1 - z0 - gap * (nz - 1)) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          const minX = x0 + a * (lw + gap);
          const minZ = z0 + b * (ld + gap);
          const roads: Side[] = [];
          if (a === 0 && xLowRoad) roads.push('W');
          if (a === nx - 1 && xHighRoad) roads.push('E');
          if (b === 0 && zLowRoad) roads.push('N');
          if (b === nz - 1 && zHighRoad) roads.push('S');
          const cx = minX + lw / 2;
          const cz = minZ + ld / 2;
          lots.push({ minX, maxX: minX + lw, minZ, maxZ: minZ + ld, inner, roads, centreDist: Math.hypot(cx, cz) });
        }
      }
    });
  });

  // Named places take the inner lots nearest the middle of town.
  const core = PLACES.slice(0, 9);
  const named: Lot[] = lots
    .filter((l) => l.inner && l.roads.length && zoneAt((l.minX + l.maxX) / 2, (l.minZ + l.maxZ) / 2) === 'downtown')
    .sort((a, b) => a.centreDist - b.centreDist || a.minX - b.minX || a.minZ - b.minZ)
    .slice(0, core.length);
  const placeOf = new Map<Lot, Place>();
  const homeOf = new Map<Lot, { place: Place; type: 'house' | 'apartment' }>();
  named.forEach((l, i) => placeOf.set(l, core[i]));
  // Each wider district gets its landmark on the lot nearest its own middle.
  for (const [zn, ids] of Object.entries(LANDMARKS) as Array<[ZoneId, string[]]>) {
    const zc = { x: -150 + ZONES[zn].col * 300 + 150, z: -150 + ZONES[zn].row * 300 + 150 };
    const free = lots.filter((l) => l.roads.length && zoneAt((l.minX + l.maxX) / 2, (l.minZ + l.maxZ) / 2) === zn && !placeOf.has(l))
      .sort((a, b) => Math.hypot((a.minX + a.maxX) / 2 - zc.x, (a.minZ + a.maxZ) / 2 - zc.z) - Math.hypot((b.minX + b.maxX) / 2 - zc.x, (b.minZ + b.maxZ) / 2 - zc.z));
    ids.forEach((id, i) => { if (free[i * 2]) placeOf.set(free[i * 2], PLACES.find((p) => p.id === id)!); });
  }

  // Give the residential districts real homes: these are not menu markers;
  // they have doors, a physical front entrance and can be entered on foot.
  // Keep the count deliberately capped so the mobile scene stays cheap.
  let homeIndex = 0;
  const residential = lots
    .filter((l) => l.roads.length && !placeOf.has(l))
    .filter((l) => ['flats', 'suburb'].includes(zoneAt((l.minX + l.maxX) / 2, (l.minZ + l.maxZ) / 2)))
    .sort((a, b) => a.centreDist - b.centreDist || a.minX - b.minX || a.minZ - b.minZ);
  for (const lot of residential) {
    if (homeIndex >= 18) break;
    // Alternate house/apartment fronts to make the neighbourhood feel mixed.
    const id = `home-${homeIndex + 1}`;
    const type: 'house' | 'apartment' = zoneAt((lot.minX + lot.maxX) / 2, (lot.minZ + lot.maxZ) / 2) === 'suburb' ? 'house' : (homeIndex % 3 === 0 ? 'house' : 'apartment');
    homeOf.set(lot, { place: { id, name: type === 'house' ? `PALM HOME ${homeIndex + 1}` : `EASTGATE FLAT ${homeIndex + 1}`, tagline: type === 'house' ? 'Residential home' : 'Residential apartment', accent: type === 'house' ? '#8fd694' : '#74a7d8', glyph: '⌂' }, type });
    homeIndex++;
  }

  for (const lot of lots) {
    const place0 = placeOf.get(lot);
    const home0 = homeOf.get(lot);
    const place = place0 ? localPlace(place0) : home0?.place;
    const zn = zoneAt((lot.minX + lot.maxX) / 2, (lot.minZ + lot.maxZ) / 2);
    const sty = STYLE[zn];
    // Pull back from the pavement a little on sides with no road, so alleys read.
    const inset = 0.6;
    const bx: Box = { minX: lot.minX + inset, maxX: lot.maxX - inset, minZ: lot.minZ + inset, maxZ: lot.maxZ - inset };
    const edge = !lot.inner;
    const height = zn === 'downtown'
      ? (place ? 11 + r() * 5 : edge ? 26 + r() * 40 : 12 + r() * 30)
      : place ? Math.max(sty.h[0], Math.min(sty.h[1], 14 + r() * 4)) : sty.h[0] + r() * (sty.h[1] - sty.h[0]);
    const palette = sty.walls.length ? sty.walls : wallsForWorld();
    const b: Building = { ...bx, height, color: palette[Math.floor(r() * palette.length)], place, homeType: home0?.type, rooftop: [] };

    if (place) {
      // The door faces whichever road runs closest to the middle of town.
      const side = [...lot.roads].sort((s1, s2) => sideCentreDist(bx, s1) - sideCentreDist(bx, s2))[0];
      b.door = doorOn(bx, side);
    }

    // A few boxes on the roof so the skyline is not all flat tops.
    const n = Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const w = 2 + r() * 3;
      const d = 2 + r() * 3;
      const cx = bx.minX + 2 + r() * Math.max(0.1, bx.maxX - bx.minX - 4 - w);
      const cz = bx.minZ + 2 + r() * Math.max(0.1, bx.maxZ - bx.minZ - 4 - d);
      b.rooftop.push({ minX: cx, maxX: cx + w, minZ: cz, maxZ: cz + d, h: 1 + r() * 2.5 });
    }
    buildings.push(b);
  }

  // ─── street furniture ──────────────────────────────────────────────────
  const props: Prop[] = [];
  const doors = buildings.filter((b) => b.door).map((b) => b.door!);
  const nearDoor = (x: number, z: number) => doors.some((d) => Math.hypot(d.x - x, d.z - z) < 4.5);
  const nearJunction = (along: number) => ROAD_CENTRES.some((c) => Math.abs(along - c) < ROAD_HALF + SIDEWALK + 2.5);
  const off = ROAD_HALF + SIDEWALK - 0.9; // close to the kerb

  for (const c of ROAD_CENTRES) {
    for (const sgn of [-1, 1]) {
      for (let t = WORLD.x0 + 6; t <= WORLD.x1 - 6; t += 10) {
        if (nearJunction(t)) continue;
        const kind: Prop['kind'] = Math.round((t + 200) / 10) % 2 === 0 ? 'lamp' : 'tree';
        // Roads running north-south (x = c) and east-west (z = c).
        const spots: Array<[number, number, number]> = [
          [c + sgn * off, t, sgn > 0 ? -Math.PI / 2 : Math.PI / 2],
          [t, c + sgn * off, sgn > 0 ? Math.PI : 0],
        ];
        for (const [x, z, rot] of spots) {
          if (nearDoor(x, z)) continue;
          if (kind === 'lamp' && (x > CITY_EDGE || z > CITY_EDGE)) continue;
          props.push({ kind, x, z, rot });
        }
      }
    }
  }

  // The park: trees on grass.
  for (const park of blocks.filter((b) => b.park)) {
    const zk = zoneAt((park.minX + park.maxX) / 2, (park.minZ + park.maxZ) / 2);
    if (LAND_ZONES.includes(zk)) {
      // Land for sale: only a ring of trees round the edge, so the plots stay open.
      for (let i = 0; i < 7; i++) {
        const t = r() * 4;
        const e = 1.5;
        const x = t < 1 ? park.minX + e : t < 2 ? park.maxX - e : park.minX + 3 + r() * (park.maxX - park.minX - 6);
        const z = t < 1 || t < 2 ? park.minZ + 3 + r() * (park.maxZ - park.minZ - 6) : t < 3 ? park.minZ + e : park.maxZ - e;
        props.push({ kind: 'tree', x, z, rot: 0 });
      }
      continue;
    }
    const n = FOREST_ZONES.includes(zk) ? Math.round(((park.maxX - park.minX) * (park.maxZ - park.minZ)) / 38) : Math.round(((park.maxX - park.minX) * (park.maxZ - park.minZ)) / 120);
    for (let i = 0; i < n; i++) {
      props.push({ kind: 'tree', x: park.minX + 3 + r() * (park.maxX - park.minX - 6), z: park.minZ + 3 + r() * (park.maxZ - park.minZ - 6), rot: 0 });
    }
  }

  // Clearings in the forest: a campsite here, a cabin there.
  const camps: Camp[] = [];
  for (const b of blocks) {
    if (!b.park) continue;
    const zk = zoneAt((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2);
    if (!FOREST_ZONES.includes(zk)) continue;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const k = Math.round(cx * 7 + cz * 13);
    if (k % 3 === 0) camps.push({ id: `camp${camps.length}`, kind: 'camp', x: cx, z: cz, rot: (k % 8) * 0.7 });
    else if (k % 4 === 0) camps.push({ id: `cabin${camps.length}`, kind: 'cabin', x: cx, z: cz, rot: (k % 4) * Math.PI / 2 });
  }
  for (let i = props.length - 1; i >= 0; i--) if (camps.some((c) => Math.hypot(props[i].x - c.x, props[i].z - c.z) < (c.kind === 'cabin' ? 9 : 6.5))) props.splice(i, 1);

  // ─── parked cars along kerbs ───────────────────────────────────────────
  const paints = ['#c0392b', '#2c3e50', '#ecf0f1', '#16a085', '#7f8c8d', '#2980b9', '#111318', '#d35400'];
  const parked: ParkedCar[] = [];
  const kerbLane = ROAD_HALF - 1.3;
  const spots: Array<[number, number, number]> = [
    [-kerbLane, 34, 0], [kerbLane, 30, Math.PI], [60 - kerbLane, 18, 0], [60 + kerbLane, -34, Math.PI],
    [-60 - kerbLane, 26, 0], [-60 + kerbLane, -20, Math.PI],
  ];
  for (const [x, z, heading] of spots) parked.push({ x, z, heading, color: paints[Math.floor(r() * paints.length)] });
  // Same again on east-west roads (rotated).
  // North half of an east-west road drives west, south half drives east.
  const spotsEW: Array<[number, number, number]> = [[-30, -kerbLane, -Math.PI / 2], [34, kerbLane, Math.PI / 2], [-22, 60 + kerbLane, Math.PI / 2], [26, -60 - kerbLane, -Math.PI / 2]];
  for (const [x, z, heading] of spotsEW) parked.push({ x, z, heading, color: paints[Math.floor(r() * paints.length)] });

  // ─── solids ────────────────────────────────────────────────────────────
  const solids: Box[] = buildings.map((b) => ({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ }));
  for (const p of props) {
    const h = p.kind === 'tree' ? 0.25 : 0.15;
    solids.push({ minX: p.x - h, maxX: p.x + h, minZ: p.z - h, maxZ: p.z + h });
  }
  for (const b of blocks) if (b.water) solids.push({ minX: b.minX + 1.4, maxX: b.maxX - 1.4, minZ: b.minZ + 1.4, maxZ: b.maxZ - 1.4 });
  for (const c of camps) if (c.kind === 'cabin') solids.push({ minX: c.x - 3.2, maxX: c.x + 3.2, minZ: c.z - 2.7, maxZ: c.z + 2.7 });
  for (const c of parked) {
    const along = Math.abs(Math.sin(c.heading)) > 0.5; // east-west
    const hw = along ? 2.2 : 1.0;
    const hd = along ? 1.0 : 2.2;
    solids.push({ minX: c.x - hw, maxX: c.x + hw, minZ: c.z - hd, maxZ: c.z + hd });
  }

  // Start outside the studio, with your car at the kerb.
  const studio = buildings.find((b) => b.place?.id === 'studio')!;
  const d = studio.door!;
  const spawn = { x: d.x + d.nx * 2.2, z: d.z + d.nz * 2.2, rot: Math.atan2(d.nx, d.nz) };
  // Kerb lane of the road the studio faces, a few metres along.
  // Traffic drives on the right, so the car points the way its lane runs.
  const toLane = 0.6 + SIDEWALK + 1.3;
  const carSpawn = d.nx !== 0
    ? { x: d.x + d.nx * toLane, z: d.z - 6, heading: d.nx > 0 ? 0 : Math.PI }
    : { x: d.x - 6, z: d.z + d.nz * toLane, heading: d.nz > 0 ? -Math.PI / 2 : Math.PI / 2 };

  cached = { blocks, buildings, props, parked, plots, landBlocks, camps, solids, spawn, carSpawn };
  return cached;
}

function sideCentreDist(b: Box, s: Side): number {
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  switch (s) {
    case 'W': return Math.abs(b.minX) + Math.abs(cz) * 0.5;
    case 'E': return Math.abs(b.maxX) + Math.abs(cz) * 0.5;
    case 'N': return Math.abs(b.minZ) + Math.abs(cx) * 0.5;
    case 'S': return Math.abs(b.maxZ) + Math.abs(cx) * 0.5;
  }
}

function doorOn(b: Box, side: Side): NonNullable<Building['door']> {
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  switch (side) {
    case 'W': return { side, x: b.minX, z: cz, nx: -1, nz: 0 };
    case 'E': return { side, x: b.maxX, z: cz, nx: 1, nz: 0 };
    case 'N': return { side, x: cx, z: b.minZ, nx: 0, nz: -1 };
    case 'S': return { side, x: cx, z: b.maxZ, nx: 0, nz: 1 };
  }
}

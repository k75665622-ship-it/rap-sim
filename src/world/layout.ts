// ─── THE CITY: LAYOUT ──────────────────────────────────────────────────────
//
// Pure data, no three.js. Roads, blocks, buildings, doors, props and the
// colliders the player and the car bump into. Deterministic: the same city
// every visit, so a player learns their way around.
//
// Axes: x east, z south, y up. One unit is one metre.

import type { GameScreen } from '../types/game';

export const WORLD_HALF = 90;          // playable area is -90..90 on x and z
export const ROAD_CENTRES = [-60, 0, 60];
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
  door?: { side: Side; x: number; z: number; nx: number; nz: number };
  rooftop: Array<Box & { h: number }>;
}

export interface Prop { kind: 'tree' | 'lamp'; x: number; z: number; rot: number }

export interface ParkedCar { x: number; z: number; heading: number; color: string }

export interface Block extends Box { park: boolean }

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
  {
    id: 'food', name: "MAMA'S KITCHEN", tagline: 'Jollof · Grill · Drinks', accent: '#ff4757', glyph: 'F',
    soon: "Mama's Kitchen opens when the city's people move in — they'll eat, hang out and talk here.",
  },
];

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
  const edges = [-WORLD_HALF, ...ROAD_CENTRES, WORLD_HALF];
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
  /** Everything solid, for the player and the car. */
  solids: Box[];
  spawn: { x: number; z: number; rot: number };
  carSpawn: { x: number; z: number; heading: number };
}

let cached: CityLayout | null = null;

export function cityLayout(): CityLayout {
  if (cached) return cached;
  const r = rng(1919);
  const B = bands();
  const blocks: Block[] = [];
  const buildings: Building[] = [];

  // One park, in the north-east corner, so the skyline has a gap.
  const isPark = (ix: number, iz: number) => ix === 3 && iz === 0;

  type Lot = Box & { inner: boolean; roads: Side[]; centreDist: number };
  const lots: Lot[] = [];

  B.forEach(([x0, x1, xLowRoad, xHighRoad], ix) => {
    B.forEach(([z0, z1, zLowRoad, zHighRoad], iz) => {
      const park = isPark(ix, iz);
      blocks.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, park });
      if (park) return;
      const inner = ix > 0 && ix < 3 && iz > 0 && iz < 3;
      const nx = x1 - x0 > 30 ? 2 : 1;
      const nz = z1 - z0 > 30 ? 2 : 1;
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
  const named = lots
    .filter((l) => l.inner && l.roads.length)
    .sort((a, b) => a.centreDist - b.centreDist || a.minX - b.minX || a.minZ - b.minZ)
    .slice(0, PLACES.length);

  for (const lot of lots) {
    const placeIdx = named.indexOf(lot);
    const place = placeIdx >= 0 ? PLACES[placeIdx] : undefined;
    // Pull back from the pavement a little on sides with no road, so alleys read.
    const inset = 0.6;
    const bx: Box = { minX: lot.minX + inset, maxX: lot.maxX - inset, minZ: lot.minZ + inset, maxZ: lot.maxZ - inset };
    const edge = !lot.inner;
    const height = place
      ? 11 + r() * 5
      : edge
        ? 26 + r() * 40
        : 12 + r() * 30;
    const b: Building = { ...bx, height, color: WALLS[Math.floor(r() * WALLS.length)], place, rooftop: [] };

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
      for (let t = -WORLD_HALF + 6; t <= WORLD_HALF - 6; t += 10) {
        if (nearJunction(t)) continue;
        const kind: Prop['kind'] = Math.round((t + 200) / 10) % 2 === 0 ? 'lamp' : 'tree';
        // Roads running north-south (x = c) and east-west (z = c).
        const spots: Array<[number, number, number]> = [
          [c + sgn * off, t, sgn > 0 ? -Math.PI / 2 : Math.PI / 2],
          [t, c + sgn * off, sgn > 0 ? Math.PI : 0],
        ];
        for (const [x, z, rot] of spots) {
          if (nearDoor(x, z)) continue;
          props.push({ kind, x, z, rot });
        }
      }
    }
  }

  // The park: trees on grass.
  const park = blocks.find((b) => b.park)!;
  for (let i = 0; i < 14; i++) {
    props.push({ kind: 'tree', x: park.minX + 3 + r() * (park.maxX - park.minX - 6), z: park.minZ + 3 + r() * (park.maxZ - park.minZ - 6), rot: 0 });
  }

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

  cached = { blocks, buildings, props, parked, solids, spawn, carSpawn };
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

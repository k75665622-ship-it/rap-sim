// ─── DRIP ──────────────────────────────────────────────────────────────────
//
// What the player wears, where it comes from and what it says.
//
// Every other Friday there is a drop: new colourways and new versions of the
// sneaker lines (Runner 4 makes Runner 3 last season's shoe), pieces from the
// fashion houses, and now and then a limited run that sells out in days.
// Brands are fictional. An item's hype fades as it ages and as newer versions
// land — "classic" pieces hold up. The fit's drip score is what the slots add
// up to, and it moves social reach, brand interest and how people size you up.
//
// Pure: the store owns the state.

import type { Wearable, Slot, Tattoo, TattooSpot, TattooDesign, HairStyle, FacialHair } from './look';
import { TATTOO_LABEL } from './look';

type Rng = () => number;

export type Tier = 'basic' | 'street' | 'designer' | 'grail';

export interface ShopItem extends Wearable {
  price: number;
  brand: string;
  /** Sneaker or product line, e.g. "Velo Runner". */
  line?: string;
  version?: number;
  colorway?: string;
  tier: Tier;
  /** Hype at release, 0..100. */
  hype: number;
  limited?: boolean;
  /** Pairs left, for limited runs. */
  stock?: number;
  /** Day serial it dropped. */
  released: number;
  /** Holds its freshness. */
  classic?: boolean;
  /** "× Artist" collab credit (fictional artists only). */
  collab?: string;
}

export interface OwnedItem extends ShopItem { bought: number; paid: number }

export interface DripState {
  wardrobe: OwnedItem[];
  shop: ShopItem[];
  /** Serial of the last drop, and how many there have been. */
  lastDrop: number;
  drops: number;
  /** Latest version number per line. */
  lines: Record<string, number>;
  /** Fit pics posted, by item id: each new piece earns one moment. */
  flexed: string[];
}

// ─── THE BRANDS ────────────────────────────────────────────────────────────

interface LineDef { brand: string; line: string; slot: Slot; shape: string; tier: Tier; base: number; hype: number; classic?: boolean }

const SNEAKERS: LineDef[] = [
  { brand: 'Velo', line: 'Velo Runner', slot: 'shoes', shape: 'runner', tier: 'street', base: 140, hype: 58 },
  { brand: 'Velo', line: 'Velo Court 1', slot: 'shoes', shape: 'court', tier: 'street', base: 120, hype: 52, classic: true },
  { brand: 'Kairo', line: 'Kairo Hi', slot: 'shoes', shape: 'hightop', tier: 'street', base: 170, hype: 64 },
  { brand: 'Strata', line: 'Strata Chunk', slot: 'shoes', shape: 'chunky', tier: 'designer', base: 690, hype: 66 },
  { brand: 'Arcline', line: 'Arcline Glide', slot: 'shoes', shape: 'runner', tier: 'street', base: 180, hype: 61 },
  { brand: 'Nimbo', line: 'Nimbo Slide', slot: 'shoes', shape: 'slides', tier: 'basic', base: 45, hype: 34 },
  { brand: 'Oyo Athletic', line: 'Oyo Trail Boot', slot: 'shoes', shape: 'boots', tier: 'street', base: 210, hype: 48, classic: true },
  { brand: 'Maison Ekow', line: 'Ekow Loafer', slot: 'shoes', shape: 'loafers', tier: 'designer', base: 850, hype: 55, classic: true },
];

const HOUSES: LineDef[] = [
  { brand: 'Nova Supply', line: 'Box Logo Tee', slot: 'top', shape: 'oversized', tier: 'street', base: 60, hype: 55 },
  { brand: 'Nova Supply', line: 'Heavy Hoodie', slot: 'top', shape: 'hoodie', tier: 'street', base: 160, hype: 57 },
  { brand: 'Off-Grid', line: 'Expedition Puffer', slot: 'top', shape: 'puffer', tier: 'designer', base: 980, hype: 63 },
  { brand: 'Saint Ash', line: 'Varsity Jacket', slot: 'top', shape: 'varsity', tier: 'designer', base: 1400, hype: 62 },
  { brand: 'Casa Lume', line: 'Silk Shirt', slot: 'top', shape: 'shirt', tier: 'designer', base: 720, hype: 50, classic: true },
  { brand: 'Maison Ekow', line: 'Tailored Suit', slot: 'top', shape: 'suit', tier: 'designer', base: 2600, hype: 52, classic: true },
  { brand: 'BLKSMTH', line: 'Flight Bomber', slot: 'top', shape: 'bomber', tier: 'street', base: 260, hype: 54 },
  { brand: 'Kumasi Kits', line: 'Retro Jersey', slot: 'top', shape: 'jersey', tier: 'street', base: 95, hype: 47 },
  { brand: 'Nova Supply', line: 'Washed Tank', slot: 'top', shape: 'tank', tier: 'basic', base: 35, hype: 30 },
  { brand: 'Saint Ash', line: 'Distressed Denim', slot: 'bottom', shape: 'ripped', tier: 'designer', base: 890, hype: 58 },
  { brand: 'Off-Grid', line: 'Utility Cargo', slot: 'bottom', shape: 'cargo', tier: 'street', base: 180, hype: 52 },
  { brand: 'Nova Supply', line: 'Fleece Jogger', slot: 'bottom', shape: 'joggers', tier: 'street', base: 110, hype: 45 },
  { brand: 'Casa Lume', line: 'Pleated Trouser', slot: 'bottom', shape: 'trousers', tier: 'designer', base: 640, hype: 46, classic: true },
  { brand: 'BLKSMTH', line: 'Selvedge Jean', slot: 'bottom', shape: 'jeans', tier: 'street', base: 230, hype: 49, classic: true },
  { brand: 'Kumasi Kits', line: 'Mesh Short', slot: 'bottom', shape: 'shorts', tier: 'basic', base: 55, hype: 36 },
  { brand: 'Casa Lume', line: 'Midi Skirt', slot: 'bottom', shape: 'skirt', tier: 'designer', base: 590, hype: 48 },
  { brand: 'Nova Supply', line: 'Six-Panel Cap', slot: 'head', shape: 'cap', tier: 'street', base: 48, hype: 44 },
  { brand: 'Off-Grid', line: 'Rib Beanie', slot: 'head', shape: 'beanie', tier: 'basic', base: 35, hype: 38 },
  { brand: 'BLKSMTH', line: 'Silk Durag', slot: 'head', shape: 'durag', tier: 'basic', base: 25, hype: 42, classic: true },
  { brand: 'Saint Ash', line: 'Bucket Hat', slot: 'head', shape: 'bucket', tier: 'designer', base: 420, hype: 50 },
  { brand: 'Casa Lume', line: 'Shield Shades', slot: 'eyes', shape: 'visor', tier: 'designer', base: 560, hype: 57 },
  { brand: 'Maison Ekow', line: 'Square Shades', slot: 'eyes', shape: 'shades', tier: 'designer', base: 450, hype: 50, classic: true },
  { brand: 'BLKSMTH', line: 'Round Frames', slot: 'eyes', shape: 'round', tier: 'street', base: 120, hype: 40 },
];

const JEWELLERS: LineDef[] = [
  { brand: 'Gold Room', line: 'Cuban Link', slot: 'chain', shape: 'cuban', tier: 'designer', base: 4800, hype: 62, classic: true },
  { brand: 'Frost & Co', line: 'Iced Pendant', slot: 'chain', shape: 'pendant', tier: 'grail', base: 18000, hype: 74 },
  { brand: 'Gold Room', line: 'Layered Ropes', slot: 'chain', shape: 'layered', tier: 'street', base: 900, hype: 46 },
  { brand: 'Frost & Co', line: 'Pearl Strand', slot: 'chain', shape: 'pearls', tier: 'designer', base: 2200, hype: 55 },
  { brand: 'Gold Room', line: 'Gold Hoops', slot: 'ears', shape: 'hoops', tier: 'street', base: 380, hype: 40, classic: true },
  { brand: 'Frost & Co', line: 'Diamond Studs', slot: 'ears', shape: 'iced', tier: 'designer', base: 3500, hype: 58, classic: true },
  { brand: 'Gold Room', line: 'Gold Watch', slot: 'wrist', shape: 'gold', tier: 'designer', base: 9500, hype: 60, classic: true },
  { brand: 'Frost & Co', line: 'Bust-Down Watch', slot: 'wrist', shape: 'iced', tier: 'grail', base: 42000, hype: 80 },
  { brand: 'Arcline', line: 'Sport Watch', slot: 'wrist', shape: 'sport', tier: 'basic', base: 220, hype: 30 },
  { brand: 'Gold Room', line: 'Gold Grillz', slot: 'grillz', shape: 'gold', tier: 'street', base: 1600, hype: 50 },
  { brand: 'Frost & Co', line: 'Iced Grillz', slot: 'grillz', shape: 'iced', tier: 'grail', base: 12000, hype: 70 },
];

const COLORWAYS: { name: string; c1: string; c2: string; c3?: string }[] = [
  { name: 'Triple White', c1: '#f4f4f4', c2: '#e2e2e2' }, { name: 'Triple Black', c1: '#171717', c2: '#2a2a2a' },
  { name: 'Bred', c1: '#151515', c2: '#c0262d' }, { name: 'University Blue', c1: '#f4f4f4', c2: '#6aa8e0' },
  { name: 'Volt', c1: '#e9ff3b', c2: '#1a1a1a' }, { name: 'Sail', c1: '#efe6d2', c2: '#b9a37f' },
  { name: 'Shadow', c1: '#6b6e75', c2: '#2c2e33' }, { name: 'Sunset', c1: '#ff7a3d', c2: '#7b2bd1' },
  { name: 'Accra Gold', c1: '#e3b341', c2: '#0f6b3a', c3: '#b3261e' }, { name: 'Lagos Green', c1: '#0f8a4a', c2: '#f4f4f4' },
  { name: 'Midnight', c1: '#1c2440', c2: '#e3b341' }, { name: 'Bubblegum', c1: '#f6a8c9', c2: '#f4f4f4' },
  { name: 'Mocha', c1: '#5b3a28', c2: '#efe6d2' }, { name: 'Royal', c1: '#2d4fbf', c2: '#f4f4f4' },
  { name: 'Infrared', c1: '#f4f4f4', c2: '#ff3b47', c3: '#222' }, { name: 'Olive', c1: '#56603a', c2: '#c9b98a' },
];
const METALS = [{ name: 'Yellow gold', c1: '#e3b341', c2: '#fff4c2' }, { name: 'White gold', c1: '#dfe6ee', c2: '#ffffff' }, { name: 'Rose gold', c1: '#e3a088', c2: '#ffe2d6' }];

const TIER_BASE: Record<Tier, number> = { basic: 22, street: 48, designer: 72, grail: 92 };
export const TIER_LABEL: Record<Tier, string> = { basic: 'Basic', street: 'Streetwear', designer: 'Designer', grail: 'Grail' };

// ─── DROPS ─────────────────────────────────────────────────────────────────

const DROP_EVERY = 14;

export function newDrip(): DripState {
  return { wardrobe: [], shop: [], lastDrop: -999, drops: 0, lines: {}, flexed: [] };
}

function pick<T>(arr: T[], r: Rng): T { return arr[Math.floor(r() * arr.length)]; }

function make(def: LineDef, serial: number, r: Rng, version?: number, collab?: string): ShopItem {
  const isJewel = ['chain', 'ears', 'wrist', 'grillz'].includes(def.slot);
  const cw: { name: string; c1: string; c2: string; c3?: string } = isJewel ? pick(METALS, r) : pick(COLORWAYS, r);
  const limited = !def.classic && (collab ? true : r() < 0.18);
  const hype = Math.min(99, Math.round(def.hype + (version ? Math.min(12, version * 1.5) : 0) + (limited ? 14 : 0) + (collab ? 10 : 0) + (r() - 0.5) * 10));
  const price = Math.round((def.base * (limited ? 1.25 : 1) * (0.92 + r() * 0.2)) / 5) * 5;
  const name = def.slot === 'shoes' && version && !def.classic ? `${def.line} ${version}` : def.line;
  return {
    id: `${def.line}-${version ?? 0}-${cw.name}-${serial}-${Math.floor(r() * 1e6)}`.replace(/\s+/g, '_'),
    slot: def.slot, shape: def.shape, name: collab ? `${name} × ${collab}` : name,
    c1: cw.c1, c2: cw.c2, c3: cw.c3, text: def.shape === 'jersey' ? String(1 + Math.floor(r() * 23)) : def.shape === 'varsity' ? def.brand[0] : undefined,
    price, brand: def.brand, line: def.line, version, colorway: cw.name, tier: def.tier, hype, limited,
    stock: limited ? 3 + Math.floor(r() * 10) : undefined, released: serial, classic: def.classic, collab,
  };
}

/**
 * Put a new drop on the shelves if one is due. Sneaker lines step up a
 * version now and then; a collab with a fictional artist turns up sometimes.
 * Items older than ~8 weeks are vaulted. Returns the new pieces.
 */
export function runDrops(d: DripState, today: number, r: Rng, collabNames: string[] = []): ShopItem[] {
  // The first visit stocks the shop as if drops had been happening all along.
  if (d.lastDrop < 0) {
    d.lastDrop = today - DROP_EVERY;
    for (const def of SNEAKERS) d.lines[def.line] = 1 + Math.floor(r() * 3);
    const seed: ShopItem[] = [];
    for (const def of [...SNEAKERS, ...HOUSES, ...JEWELLERS]) if (r() < 0.6 || def.tier !== 'grail') seed.push(make(def, today - Math.floor(r() * 40), r, def.slot === 'shoes' && !def.classic ? d.lines[def.line] : undefined));
    d.shop = seed;
  }
  const fresh: ShopItem[] = [];
  while (today - d.lastDrop >= DROP_EVERY) {
    d.lastDrop += DROP_EVERY;
    d.drops += 1;
    const when = d.lastDrop;
    // Two or three sneakers; one of them is usually a new version of a line.
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
      const def = pick(SNEAKERS, r);
      const bump = r() < 0.45 && !def.classic;
      const ver = def.classic ? undefined : d.lines[def.line] ?? 1;
      if (bump) d.lines[def.line] = (d.lines[def.line] ?? 1) + 1;
      const collab = collabNames.length && r() < 0.12 ? pick(collabNames, r) : undefined;
      fresh.push(make(def, when, r, bump ? d.lines[def.line] : ver, collab));
    }
    for (let i = 0; i < 3 + Math.floor(r() * 3); i++) fresh.push(make(pick(HOUSES, r), when, r));
    if (r() < 0.6) fresh.push(make(pick(JEWELLERS, r), when, r));
  }
  d.shop = [...fresh, ...d.shop].filter((x) => today - x.released < 60 || x.classic).slice(0, 90);
  // Limited runs sell through on their own.
  for (const x of d.shop) if (x.limited && x.stock && x.stock > 0 && today > x.released && r() < x.hype / 160) x.stock -= 1;
  return fresh;
}

/** Days until the next drop. */
export function nextDropIn(d: DripState, today: number): number {
  return Math.max(0, d.lastDrop + DROP_EVERY - today);
}

// ─── VALUE AND HYPE ────────────────────────────────────────────────────────

/** How fresh a piece reads today, 0.25..1. Newer versions of its line age it faster. */
export function freshness(item: ShopItem, today: number, lines: Record<string, number>): number {
  const weeks = Math.max(0, today - item.released) / 7;
  const behind = item.line && item.version ? Math.max(0, (lines[item.line] ?? item.version) - item.version) : 0;
  if (item.classic) return Math.max(0.75, 1 - weeks / 200);
  return Math.max(0.25, (1 - weeks / 36) * Math.pow(0.82, behind));
}

export function currentHype(item: ShopItem, today: number, lines: Record<string, number>): number {
  return Math.round(item.hype * freshness(item, today, lines));
}

/** What a piece fetches on resale. Sold-out limited pairs go for more than retail. */
export function resaleValue(item: OwnedItem, today: number, lines: Record<string, number>): number {
  const f = freshness(item, today, lines);
  const soldOut = item.limited && (item.stock ?? 0) <= 0;
  const mult = item.tier === 'grail' || ['chain', 'wrist', 'ears', 'grillz'].includes(item.slot) ? 0.7 : soldOut ? 1.1 + item.hype / 120 : 0.25 + f * 0.35;
  return Math.round(item.paid * mult);
}

const SLOT_WEIGHT: Partial<Record<Slot, number>> = { shoes: 0.28, top: 0.24, bottom: 0.12, chain: 0.12, wrist: 0.08, head: 0.05, eyes: 0.05, ears: 0.03, grillz: 0.03 };

/** The fit's drip, 0..100, and a word for it. */
export function dripScore(outfit: Partial<Record<Slot, Wearable | undefined>>, today: number, d: DripState | undefined, tattoos: Tattoo[] = []): { score: number; label: string } {
  const owned = new Map((d?.wardrobe ?? []).map((x) => [x.id, x]));
  let s = 0;
  for (const [slot, w] of Object.entries(SLOT_WEIGHT) as [Slot, number][]) {
    const item = outfit[slot];
    if (!item) continue;
    const o = owned.get(item.id);
    // Starter pieces are plain basics.
    const tier = o?.tier ?? 'basic';
    const hype = o ? currentHype(o, today, d?.lines ?? {}) : 18;
    s += w * (TIER_BASE[tier] * 0.55 + hype * 0.45);
  }
  s += Math.min(6, tattoos.length * 1.5);
  const score = Math.round(Math.min(100, s));
  const label = score >= 85 ? 'Untouchable' : score >= 70 ? 'Dripping' : score >= 55 ? 'Clean' : score >= 40 ? 'Decent' : score >= 25 ? 'Basic' : 'Plain';
  return { score, label };
}

/** Social reach multiplier from the fit: 0.92 .. 1.15. */
export function dripReach(score: number): number {
  return 0.92 + (score / 100) * 0.23;
}

// ─── THE TATTOO STUDIO AND THE BARBER ──────────────────────────────────────

const INK_PRICE: Record<TattooDesign, number> = { script: 180, rose: 260, tribal: 340, stars: 120, crown: 300, adinkra: 220, money: 150, cross: 110, teardrop: 90, sleeve: 1800, kente: 650, lion: 520 };
const SPOT_MULT: Record<TattooSpot, number> = { neck: 1.2, face: 1.1, left_arm: 1, right_arm: 1, hands: 0.8, chest: 1.5 };
const INK_HOURS: Record<TattooDesign, number> = { script: 1, rose: 2, tribal: 2, stars: 1, crown: 2, adinkra: 1, money: 1, cross: 1, teardrop: 1, sleeve: 6, kente: 4, lion: 3 };

export function tattooQuote(spot: TattooSpot, design: TattooDesign): { price: number; hours: number; label: string } {
  return { price: Math.round(INK_PRICE[design] * SPOT_MULT[spot] / 10) * 10, hours: INK_HOURS[design], label: TATTOO_LABEL[design] };
}
export function removalQuote(t: Tattoo): { price: number; hours: number } {
  const q = tattooQuote(t.spot, t.design);
  return { price: q.price * 3, hours: Math.max(1, Math.round(q.hours * 0.6)) };
}

const HAIR_PRICE: Partial<Record<HairStyle, number>> = { bald: 15, buzz: 15, fade: 30, waves: 35, hightop: 45, afro: 40, twists: 120, curly_top: 45, mohawk: 40, dreads_short: 220, dreads_long: 420, cornrows: 110, box_braids: 260, long_straight: 300, ponytail: 50, bun: 40, bob: 70, curls_long: 180 };
const HAIR_HOURS: Partial<Record<HairStyle, number>> = { twists: 3, dreads_short: 4, dreads_long: 6, cornrows: 3, box_braids: 6, long_straight: 3, curls_long: 3 };

export function barberQuote(cur: { hair: HairStyle; hairColor: string; facialHair: FacialHair }, next: { hair: HairStyle; hairColor: string; facialHair: FacialHair }): { price: number; hours: number } {
  let price = 0;
  let hours = 0;
  if (next.hair !== cur.hair) { price += HAIR_PRICE[next.hair] ?? 40; hours += HAIR_HOURS[next.hair] ?? 1; }
  if (next.hairColor !== cur.hairColor) { price += 85; hours += 1; }
  if (next.facialHair !== cur.facialHair) { price += 15; hours = Math.max(hours, 1); }
  return { price, hours };
}

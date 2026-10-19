// ─── YOUR CLOTHING BRAND ───────────────────────────────────────────────────
//
// A real merch operation, week by week:
//   · design products (tees, hoodies, caps, jackets, sneakers…) — the design
//     score comes from your creativity, your stylist and luck; ride a trend or
//     do a collab with another artist
//   · choose a supplier and order stock: cheap overseas factories are slow and
//     make more faulty pieces; local workshops are fast and dear; your own
//     factory line (level 3) is the best of both
//   · set every price; demand reacts to price, design, trends, the season,
//     your fame and your brand's reputation and hype
//   · sell online, at pop-ups, in your own stores and through wholesale
//   · things happen: a piece goes viral, a celebrity wears it, fakes flood the
//     market, a shipment is stuck at customs, a batch comes back faulty
//
// Pure: the store owns the state and the money.

type Rng = () => number;

export type ProductKind = 'tee' | 'hoodie' | 'cap' | 'joggers' | 'jacket' | 'jersey' | 'bag' | 'sneakers';
export type Material = 'basic' | 'premium' | 'luxury';
export type SupplierId = 'overseas' | 'local' | 'premium_mill' | 'own';

export const KINDS: Record<ProductKind, { label: string; emoji: string; cost: number; ref: number; conv: number; season: number[] }> = {
  // cost: base unit cost (basic). ref: price fans think is fair at basic. conv: base conversion. season: demand by month Jan..Dec
  tee: { label: 'T-shirt', emoji: '👕', cost: 6, ref: 28, conv: 0.03, season: [0.9, 0.9, 1, 1, 1.1, 1.15, 1.2, 1.2, 1.05, 1, 1, 1.25] },
  hoodie: { label: 'Hoodie', emoji: '🧥', cost: 16, ref: 60, conv: 0.0168, season: [1.2, 1.15, 1, 0.9, 0.85, 0.85, 0.85, 0.85, 0.95, 1.05, 1.15, 1.35] },
  cap: { label: 'Cap', emoji: '🧢', cost: 4, ref: 25, conv: 0.018, season: [0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.15, 1.1, 1, 1, 1, 1.2] },
  joggers: { label: 'Joggers', emoji: '👖', cost: 12, ref: 48, conv: 0.012, season: [1.1, 1.05, 1, 1, 0.95, 0.9, 0.9, 0.9, 1, 1.05, 1.1, 1.25] },
  jacket: { label: 'Jacket', emoji: '🧥', cost: 30, ref: 120, conv: 0.0066, season: [1.25, 1.2, 1, 0.85, 0.75, 0.7, 0.7, 0.75, 0.95, 1.1, 1.2, 1.4] },
  jersey: { label: 'Jersey', emoji: '🎽', cost: 9, ref: 45, conv: 0.0132, season: [1, 1, 1, 1, 1.1, 1.3, 1.3, 1.1, 1.05, 1, 1, 1.2] },
  bag: { label: 'Bag', emoji: '👜', cost: 14, ref: 70, conv: 0.006, season: [0.95, 1, 1, 1, 1, 1, 1, 1, 1.1, 1, 1, 1.35] },
  sneakers: { label: 'Sneakers', emoji: '👟', cost: 34, ref: 150, conv: 0.0048, season: [1, 1, 1, 1, 1, 1.05, 1.05, 1.1, 1.15, 1, 1, 1.4] },
};

export const MATERIALS: Record<Material, { label: string; cost: number; worth: number; design: number }> = {
  basic: { label: 'Basic', cost: 1, worth: 1, design: 0 },
  premium: { label: 'Premium', cost: 1.9, worth: 1.6, design: 6 },
  luxury: { label: 'Luxury', cost: 4.2, worth: 3.2, design: 12 },
};

export const SUPPLIERS: Record<SupplierId, { label: string; emoji: string; costMult: number; days: number; defect: number; moq: number; blurb: string; minLevel: number }> = {
  overseas: { label: 'Overseas factory', emoji: '🚢', costMult: 1, days: 28, defect: 0.06, moq: 300, blurb: 'Cheapest per piece. Four weeks by sea, big minimums, more faulty pieces — and customs can hold it.', minLevel: 1 },
  local: { label: 'Local workshop', emoji: '🧵', costMult: 1.55, days: 7, defect: 0.03, moq: 50, blurb: 'Fast and flexible. Small runs. You pay for it.', minLevel: 1 },
  premium_mill: { label: 'Premium mill', emoji: '🏭', costMult: 1.9, days: 18, defect: 0.008, moq: 150, blurb: 'Beautiful finishing, almost no faults. Design scores better.', minLevel: 2 },
  own: { label: 'Your factory line', emoji: '⚙️', costMult: 0.85, days: 5, defect: 0.02, moq: 50, blurb: 'Your own line: cheap, fast and consistent.', minLevel: 3 },
};

export const TREND_POOL: { id: string; label: string; kinds: ProductKind[] }[] = [
  { id: 'y2k', label: 'Y2K revival', kinds: ['tee', 'cap', 'bag'] },
  { id: 'afrofuture', label: 'Afro-futurism', kinds: ['jacket', 'tee', 'hoodie'] },
  { id: 'oldmoney', label: 'Old money', kinds: ['jacket', 'bag', 'joggers'] },
  { id: 'oversize', label: 'Oversized streetwear', kinds: ['hoodie', 'tee', 'joggers'] },
  { id: 'gorpcore', label: 'Outdoor gorpcore', kinds: ['jacket', 'sneakers', 'cap'] },
  { id: 'kente', label: 'Kente fusion', kinds: ['jersey', 'jacket', 'tee', 'bag'] },
  { id: 'jersey', label: 'Football jersey culture', kinds: ['jersey', 'cap'] },
  { id: 'minimal', label: 'Quiet minimalism', kinds: ['tee', 'hoodie', 'joggers'] },
  { id: 'vintage', label: 'Vintage wash', kinds: ['tee', 'hoodie', 'jacket'] },
  { id: 'chunky', label: 'Chunky sneakers', kinds: ['sneakers'] },
];

export interface Product {
  id: string;
  kind: ProductKind;
  name: string;
  material: Material;
  design: number;
  price: number;
  stock: number;
  incoming: { units: number; arrive: number; supplier: SupplierId; unitCost: number }[];
  /** Weighted average cost of what is in stock. */
  unitCost: number;
  supplier: SupplierId;
  sold: number;
  weeks: number[];
  hype: number;
  limited: boolean;
  /** Limited pieces are never restocked once the first run is ordered. */
  runOrdered?: boolean;
  trend?: string;
  collab?: { npcId: string; name: string; fame: number; split: number };
  launched: number;
  retired?: boolean;
  /** Weeks in a row it sold out. */
  soldOutWeeks: number;
}

export interface Trend { id: string; label: string; heat: number; until: number }

export interface BrandWeek { serial: number; units: number; revenue: number; costs: number; profit: number; returns: number }

export interface BrandState {
  products: Product[];
  channels: { popup: boolean; stores: number; wholesale: boolean };
  warehouse: number;
  trends: Trend[];
  counterfeit: number;
  saleUntil?: number;
  lastSeed?: number;
  weeks: BrandWeek[];
  lastWeek: number;
  /** Profit since the last monthly report. */
  monthAcc: { revenue: number; costs: number; profit: number };
  log: string[];
}

export function newBrand(serial: number, r: Rng): BrandState {
  return { products: [], channels: { popup: false, stores: 0, wholesale: false }, warehouse: 600, trends: rollTrends([], serial, r), counterfeit: 0, weeks: [], lastWeek: Math.floor(serial / 7), monthAcc: { revenue: 0, costs: 0, profit: 0 }, log: [] };
}

function rollTrends(cur: Trend[], serial: number, r: Rng): Trend[] {
  const live = cur.filter((t) => t.until > serial);
  while (live.length < 3) {
    const pool = TREND_POOL.filter((t) => !live.some((x) => x.id === t.id));
    const t = pool[Math.floor(r() * pool.length)];
    live.push({ id: t.id, label: t.label, heat: 0.25 + r() * 0.65, until: serial + 28 + Math.floor(r() * 42) });
  }
  return live;
}

export function unitCostFor(kind: ProductKind, material: Material, supplier: SupplierId, units: number): number {
  const bulk = units >= 2000 ? 0.78 : units >= 1000 ? 0.85 : units >= 500 ? 0.92 : 1;
  return Math.round(KINDS[kind].cost * MATERIALS[material].cost * SUPPLIERS[supplier].costMult * bulk * 100) / 100;
}

/** What fans think is a fair price, before fame. */
export function fairPrice(kind: ProductKind, material: Material, fame: number): number {
  return Math.round(KINDS[kind].ref * MATERIALS[material].worth * (0.8 + Math.min(100, fame) / 160));
}

export interface DesignCtx { creativity: number; stylistSkill: number; trendsetter: boolean; premiumMill?: boolean }

/** How good a new design comes out. */
export function rollDesign(material: Material, trend: Trend | undefined, ctx: DesignCtx, r: Rng): number {
  const base = 28 + ctx.creativity * 0.35 + ctx.stylistSkill * 0.25 + MATERIALS[material].design + (ctx.trendsetter ? 8 : 0);
  return Math.round(Math.max(10, Math.min(99, base + (r() - 0.5) * 30 + (trend ? 4 : 0))));
}

export const PRODUCT_NAMES: Record<ProductKind, string[]> = {
  tee: ['Night Shift Tee', 'Day One Tee', 'Hometown Tee', 'Logo Tee', 'Tour Tee', 'Gold Coast Tee'],
  hoodie: ['Midnight Hoodie', 'Studio Hoodie', 'Harmattan Hoodie', 'Heavyweight Hoodie', 'Signature Hoodie'],
  cap: ['Crown Cap', 'Dad Cap', 'Snapback', 'Bucket Hat', 'Trucker Cap'],
  joggers: ['Studio Joggers', 'Tech Joggers', 'Cargo Joggers'],
  jacket: ['Varsity Jacket', 'Bomber', 'Denim Jacket', 'Windbreaker', 'Leather Jacket'],
  jersey: ['Home Jersey', 'Away Jersey', 'Retro Jersey', 'Street Jersey'],
  bag: ['Crossbody Bag', 'Tote', 'Backpack', 'Duffel'],
  sneakers: ['Runner 01', 'Court Low', 'Chunky 1s', 'High Top'],
};

// ─── THE WEEK ──────────────────────────────────────────────────────────────

export interface WeekCtx {
  fame: number;
  fanbase: number;
  momentum: number;
  reputation: number;
  brandHype: number;
  level: number;
  staff: 0 | 1 | 2;
  marketing: number;
  month: number; // 1-12
  merchBoost: number;
  lawyer: boolean;
}

export interface WeekResult { week: BrandWeek; events: string[]; repDelta: number; hypeDelta: number }

const CHANNEL = { popupReach: 0.35, storeReach: 0.45, wholesaleReach: 0.6, popupCost: 1800, storeCost: 4200, wholesaleCut: 0.5 };

/** Weekly reach: how many people look at your stuff this week. */
export function weeklyVisitors(b: BrandState, c: WeekCtx): number {
  const fanReach = 60 + Math.pow(Math.max(0, c.fanbase), 0.62) * 0.4;
  const channels = 1 + (b.channels.popup ? CHANNEL.popupReach : 0) + b.channels.stores * CHANNEL.storeReach + (b.channels.wholesale ? CHANNEL.wholesaleReach : 0);
  const mkt = 1 + Math.min(0.8, Math.sqrt(c.marketing / 4.3 / 500) * 0.25);
  return fanReach * (1 + c.momentum / 150) * channels * mkt * (0.6 + c.reputation / 100) * (1 + c.brandHype / 120) * (1 + c.fame / 120);
}

export function weekTick(b: BrandState, serial: number, c: WeekCtx, r: Rng): WeekResult {
  const events: string[] = [];
  let repDelta = 0;
  let hypeDelta = 0;
  // Arrivals.
  let returnsCost = 0;
  let returnsUnits = 0;
  for (const p of b.products) {
    const arrived = p.incoming.filter((x) => x.arrive <= serial);
    if (!arrived.length) continue;
    p.incoming = p.incoming.filter((x) => x.arrive > serial);
    for (const a of arrived) {
      const faulty = Math.round(a.units * SUPPLIERS[a.supplier].defect * (0.5 + r()));
      const good = a.units - faulty;
      p.unitCost = (p.unitCost * p.stock + a.unitCost * good) / Math.max(1, p.stock + good);
      p.stock += good;
      if (faulty > a.units * 0.05) events.push(`${faulty} faulty ${p.name}s in the delivery — written off.`);
    }
  }
  // Trends move.
  b.trends = rollTrends(b.trends.map((t) => ({ ...t, heat: Math.max(0.05, t.heat + (r() - 0.45) * 0.12) })), serial, r);
  const visitors = weeklyVisitors(b, c);
  const sale = b.saleUntil !== undefined && b.saleUntil >= serial;
  const season = (k: ProductKind) => KINDS[k].season[c.month - 1] ?? 1;
  let units = 0;
  let revenue = 0;
  let cogs = 0;
  let collabCut = 0;
  const live = b.products.filter((p) => !p.retired);
  // Too many products split attention.
  const focus = 1 / (1 + Math.max(0, live.length - 4) * 0.12);
  for (const p of live) {
    const price = sale ? p.price * 0.7 : p.price;
    const fair = fairPrice(p.kind, p.material, c.fame);
    const priceF = Math.pow(fair / Math.max(1, price), p.limited ? 1.1 : 1.6);
    const trend = p.trend ? b.trends.find((t) => t.id === p.trend) : undefined;
    const trendF = trend ? 1 + trend.heat * 0.9 : 1;
    const collabF = p.collab ? 1 + Math.min(2.5, p.collab.fame / 30) : 1;
    const design = 0.45 + p.design / 90;
    const newness = 1 + Math.max(0, 0.3 - (serial - p.launched) / 90);
    const hype = 1 + p.hype / 80;
    const fakes = 1 - b.counterfeit / 160;
    const demand = visitors * KINDS[p.kind].conv * design * priceF * trendF * collabF * newness * hype * fakes * season(p.kind) * focus * (p.limited ? 1.35 : 1) * (1 + c.merchBoost) * (0.75 + r() * 0.5);
    const want = Math.round(demand);
    const sold = Math.min(p.stock, want);
    p.stock -= sold;
    p.sold += sold;
    p.weeks = [...p.weeks, sold].slice(-12);
    const gross = sold * price;
    // Wholesale moves volume at half price.
    const wholesaleShare = b.channels.wholesale ? 0.3 : 0;
    const rev = gross * (1 - wholesaleShare) + gross * wholesaleShare * CHANNEL.wholesaleCut;
    revenue += rev;
    cogs += sold * p.unitCost;
    if (p.collab) collabCut += rev * p.collab.split;
    units += sold;
    // Returns: faulty pieces that got through.
    const ret = Math.round(sold * SUPPLIERS[p.supplier].defect * 0.6 * (0.5 + r()));
    if (ret) { returnsUnits += ret; returnsCost += ret * price; }
    if (want > sold && sold > 0 && p.stock === 0) {
      p.soldOutWeeks += 1;
      if (p.limited) { p.hype = Math.min(100, p.hype + 20); hypeDelta += 6; if (p.soldOutWeeks === 1) events.push(`${p.name} SOLD OUT. Resellers are listing it at double.`); }
      else if (p.soldOutWeeks === 1) events.push(`${p.name} sold out — ${want - sold} people couldn't buy one. Restock?`);
      else if (p.soldOutWeeks >= 3) repDelta -= 1;
    } else p.soldOutWeeks = 0;
    p.hype = Math.max(0, p.hype * 0.85);
  }
  // Running costs, per week.
  const staffWage = [300, 550, 950][c.staff] * (0.6 + c.level * 0.4);
  const totalStock = b.products.reduce((a, p) => a + p.stock, 0);
  const storage = b.warehouse * 0.35 + Math.max(0, totalStock - b.warehouse) * 0.9;
  const channels = (b.channels.popup ? CHANNEL.popupCost : 0) + b.channels.stores * CHANNEL.storeCost;
  const shipping = units * 2.2;
  const marketing = c.marketing / 4.3;
  let costs = cogs + staffWage + storage + channels + shipping + marketing + returnsCost + collabCut;
  // Events.
  const roll = r();
  if (roll < 0.04 && live.length) {
    const p = live[Math.floor(r() * live.length)];
    p.hype = Math.min(100, p.hype + 45);
    hypeDelta += 10;
    events.push(`🔥 A clip of someone wearing the ${p.name} went viral. Orders are flooding in.`);
  } else if (roll < 0.07 && live.length && c.fame >= 20) {
    const p = live[Math.floor(r() * live.length)];
    p.hype = Math.min(100, p.hype + 30);
    repDelta += 2;
    events.push(`⭐ A famous footballer was photographed in your ${p.name}.`);
  } else if (roll < 0.11 && c.fame >= 15) {
    if (c.lawyer) events.push('Fakes of your brand appeared at the market. Your lawyer had them pulled.');
    else { b.counterfeit = Math.min(80, b.counterfeit + 20 + r() * 20); events.push('🚨 Fakes of your brand are flooding the market. Sales will suffer until it calms down.'); }
  } else if (roll < 0.14) {
    const late = b.products.flatMap((p) => p.incoming.map((x) => ({ p, x }))).filter((o) => o.x.supplier === 'overseas');
    if (late.length) { const o = late[0]; o.x.arrive += 10 + Math.floor(r() * 10); events.push(`📦 Your ${o.p.name} shipment is held at customs. Another ${Math.round((o.x.arrive - serial))} days.`); costs += 400; }
  } else if (roll < 0.16 && totalStock > 200) {
    const lost = Math.round(totalStock * 0.04);
    costs += lost * 8;
    events.push(`A delivery van was robbed — about ${lost} pieces gone.`);
  } else if (roll < 0.18 && c.staff === 0) {
    repDelta -= 3;
    events.push('Customers complained online about slow replies and wrong orders. Cheap staff, cheap service.');
  } else if (roll > 0.97) {
    repDelta += 3;
    events.push('A fashion blog named you one of the brands to watch.');
  }
  if (returnsUnits > 20) { repDelta -= 1; events.push(`${returnsUnits} pieces came back faulty — refunds issued.`); }
  b.counterfeit = Math.max(0, b.counterfeit * 0.85 - 1);
  revenue = Math.round(revenue);
  costs = Math.round(costs);
  const week: BrandWeek = { serial, units, revenue, costs, profit: revenue - costs, returns: returnsUnits };
  b.weeks = [...b.weeks, week].slice(-26);
  b.monthAcc = { revenue: b.monthAcc.revenue + revenue, costs: b.monthAcc.costs + costs, profit: b.monthAcc.profit + week.profit };
  for (const e of events) b.log = [e, ...b.log].slice(0, 20);
  return { week, events, repDelta, hypeDelta };
}

/** What the stock in the warehouse cost you. */
export function inventoryValue(b: BrandState): number {
  return Math.round(b.products.reduce((a, p) => a + p.stock * p.unitCost + p.incoming.reduce((s, x) => s + x.units * x.unitCost, 0), 0));
}

/** Channels that come with each level. */
export function levelPerks(level: number): string {
  return ['Online store', 'Pop-ups unlocked, premium mill', 'Your own factory line', 'A flagship store', 'Stores in three countries + wholesale'][level - 1] ?? '';
}

// ─── BUSINESSES YOU RUN ────────────────────────────────────────────────────
//
// Not a box that pays 2% a month. A business has a level, staff, a price
// point, a marketing budget, a reputation and a run of good and bad months.
// Your fame brings customers; your choices decide whether they come back.
// Each type has its own big move — drop a collection, throw a festival, host
// a party night — and every month something can happen: a viral review, a
// robbery, a celebrity walking in, an inspection, staff stealing from the till.
// You can grow it, sell it, or run it into the ground.
//
// Pure: no store. Rolls are passed in.

export type VentureType = 'clothing' | 'restaurant' | 'nightclub' | 'carwash' | 'salon' | 'liquor' | 'events' | 'gym' | 'app' | 'sneakers';
export type PricePoint = 'budget' | 'standard' | 'premium';

export interface VentureDef {
  type: VentureType;
  name: string;
  emoji: string;
  blurb: string;
  startCost: number;
  /** Monthly revenue at level 1, before fame and choices. */
  revenue: number;
  /** Monthly fixed costs at level 1. */
  fixed: number;
  /** How much your own fame drives customers (0-1). */
  fameDriven: number;
  /** How wild the month-to-month swings are. */
  volatility: number;
  levels: { label: string; cost: number }[];
  special: { id: string; label: string; blurb: string; cost: number; energy: number };
}

export const VENTURES: VentureDef[] = [
  { type: 'clothing', name: 'Clothing brand', emoji: '👕', blurb: 'Your name on hoodies, tees and caps. Your fans are the customers.', startCost: 25_000, revenue: 9_000, fixed: 4_800, fameDriven: 0.85, volatility: 0.35,
    levels: [{ label: 'Online store', cost: 0 }, { label: 'Pop-up shop', cost: 40_000 }, { label: 'Own factory line', cost: 140_000 }, { label: 'Flagship store', cost: 380_000 }, { label: 'Stores in three countries', cost: 1_100_000 }],
    special: { id: 'drop', label: 'Drop a collection', blurb: 'Design, produce and drop a limited collection. Sell out and the brand explodes; flop and you eat the stock.', cost: 0, energy: 8 } },
  { type: 'restaurant', name: 'Restaurant', emoji: '🍽️', blurb: 'Jollof, grills, cocktails. Steady if the food is good.', startCost: 60_000, revenue: 24_000, fixed: 14_000, fameDriven: 0.35, volatility: 0.18,
    levels: [{ label: 'Chop bar', cost: 0 }, { label: 'Sit-down spot', cost: 70_000 }, { label: 'Two locations', cost: 220_000 }, { label: 'Upscale flagship', cost: 520_000 }, { label: 'Restaurant group', cost: 1_400_000 }],
    special: { id: 'chef', label: 'Bring in a celebrity chef', blurb: 'A month-long residency. The reviews make or break the place.', cost: 15_000, energy: 3 } },
  { type: 'nightclub', name: 'Nightclub', emoji: '🪩', blurb: 'Bottles, DJs, VIP tables. Huge nights — and fights, fines and police.', startCost: 150_000, revenue: 48_000, fixed: 33_000, fameDriven: 0.6, volatility: 0.32,
    levels: [{ label: 'Lounge', cost: 0 }, { label: 'Club with a VIP floor', cost: 160_000 }, { label: 'The hottest club in town', cost: 480_000 }, { label: 'Club + rooftop', cost: 1_000_000 }, { label: 'Nightlife empire', cost: 2_600_000 }],
    special: { id: 'party', label: 'Host a party night', blurb: 'You perform and host. Massive night — unless it gets out of hand.', cost: 8_000, energy: 15 } },
  { type: 'carwash', name: 'Car wash', emoji: '🚗', blurb: 'Low glamour, low risk, steady cash.', startCost: 18_000, revenue: 6_500, fixed: 4_300, fameDriven: 0.1, volatility: 0.1,
    levels: [{ label: 'Roadside wash', cost: 0 }, { label: 'Full bay', cost: 25_000 }, { label: 'Detailing centre', cost: 80_000 }, { label: 'Three branches', cost: 220_000 }, { label: 'City-wide chain', cost: 600_000 }],
    special: { id: 'promo', label: 'Promo week', blurb: 'Half-price week and a flyer blitz.', cost: 2_500, energy: 2 } },
  { type: 'salon', name: 'Barbershop & salon', emoji: '💈', blurb: 'Where the city gets its cut. And its gossip.', startCost: 22_000, revenue: 8_000, fixed: 5_600, fameDriven: 0.3, volatility: 0.12,
    levels: [{ label: 'Two chairs', cost: 0 }, { label: 'Full shop', cost: 30_000 }, { label: 'Luxury studio', cost: 95_000 }, { label: 'Three shops', cost: 260_000 }, { label: 'Franchise', cost: 700_000 }],
    special: { id: 'promo', label: 'Celebrity cut day', blurb: 'You sit in the chair for a day. Lines round the block.', cost: 1_500, energy: 4 } },
  { type: 'liquor', name: 'Drinks brand', emoji: '🍾', blurb: 'Your own cognac, gin or energy drink. Big margins if it catches.', startCost: 80_000, revenue: 26_000, fixed: 16_000, fameDriven: 0.75, volatility: 0.3,
    levels: [{ label: 'Small batch', cost: 0 }, { label: 'National distribution', cost: 120_000 }, { label: 'Own bottling plant', cost: 380_000 }, { label: 'Export deals', cost: 900_000 }, { label: 'Global brand', cost: 2_400_000 }],
    special: { id: 'flavor', label: 'Launch a new flavour', blurb: 'A launch party and a new bottle. Could be the one everybody orders.', cost: 20_000, energy: 6 } },
  { type: 'events', name: 'Events company', emoji: '🎪', blurb: 'Concerts, festivals, parties. Feast or famine.', startCost: 50_000, revenue: 15_000, fixed: 9_500, fameDriven: 0.5, volatility: 0.45,
    levels: [{ label: 'Club nights', cost: 0 }, { label: 'Concerts', cost: 90_000 }, { label: 'Festivals', cost: 300_000 }, { label: 'Stadium promoter', cost: 850_000 }, { label: 'Continental tours', cost: 2_200_000 }],
    special: { id: 'festival', label: 'Throw a festival', blurb: 'Book the acts, sell the tickets. Can triple your money or lose most of it.', cost: 60_000, energy: 10 } },
  { type: 'gym', name: 'Fitness gym', emoji: '🏋️', blurb: 'Memberships pay every month. Equipment breaks.', startCost: 45_000, revenue: 12_500, fixed: 9_200, fameDriven: 0.25, volatility: 0.12,
    levels: [{ label: 'Basement gym', cost: 0 }, { label: 'Full gym', cost: 60_000 }, { label: 'Premium club', cost: 180_000 }, { label: 'Three locations', cost: 480_000 }, { label: 'National chain', cost: 1_200_000 }],
    special: { id: 'promo', label: 'Train-with-me challenge', blurb: 'You run a 30-day challenge on Clip. Sign-ups spike.', cost: 3_000, energy: 8 } },
  { type: 'app', name: 'Tech app', emoji: '📱', blurb: 'An app for something. Burns money for years. Or doesn\'t.', startCost: 70_000, revenue: 3_000, fixed: 11_000, fameDriven: 0.4, volatility: 0.6,
    levels: [{ label: 'Prototype', cost: 0 }, { label: 'Launched', cost: 80_000 }, { label: 'Growing fast', cost: 260_000 }, { label: 'Series B', cost: 800_000 }, { label: 'Unicorn hunt', cost: 2_500_000 }],
    special: { id: 'raise', label: 'Raise a funding round', blurb: 'Pitch investors. Get cash in, give up a slice. Or get laughed out of the room.', cost: 0, energy: 6 } },
  { type: 'sneakers', name: 'Sneaker resale', emoji: '👟', blurb: 'Buy limited drops, flip them. Pure hustle.', startCost: 15_000, revenue: 9_000, fixed: 3_200, fameDriven: 0.35, volatility: 0.4,
    levels: [{ label: 'Instagram page', cost: 0 }, { label: 'Storefront', cost: 22_000 }, { label: 'Consignment store', cost: 75_000 }, { label: 'Two stores', cost: 200_000 }, { label: 'Resale platform', cost: 650_000 }],
    special: { id: 'flip', label: 'Buy a big drop', blurb: 'Bulk-buy a hyped release. If the hype holds, you flip it for double.', cost: 20_000, energy: 3 } },
];
export const VENTURE_BY_TYPE = Object.fromEntries(VENTURES.map((v) => [v.type, v])) as Record<VentureType, VentureDef>;

export const STAFF_TIERS = [
  { label: 'Cheap staff', wage: 0.12, quality: 0.85, risk: 1.5 },
  { label: 'Good staff', wage: 0.2, quality: 1, risk: 1 },
  { label: 'Elite staff', wage: 0.32, quality: 1.15, risk: 0.55 },
] as const;

export interface VentureMonth { serial: number; revenue: number; costs: number; profit: number; note?: string }

export interface Venture {
  id: string;
  type: VentureType;
  name: string;
  level: number;
  staff: 0 | 1 | 2;
  price: PricePoint;
  marketing: number;
  reputation: number;
  /** Temporary buzz from big moves, fades monthly. */
  hype: number;
  openedSerial: number;
  invested: number;
  months: VentureMonth[];
  log: string[];
  lastSpecialSerial?: number;
  /** For apps: the share you still own after funding rounds. */
  ownership: number;
  /** Months in a row losing money. */
  redMonths: number;
  closed?: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Share of every sale that goes on stock, ingredients and supplies. */
const COGS: Record<VentureType, number> = { clothing: 0.42, restaurant: 0.34, nightclub: 0.28, carwash: 0.14, salon: 0.12, liquor: 0.38, events: 0.32, gym: 0.08, app: 0.1, sneakers: 0.5 };
type Rng = () => number;

export function newVenture(type: VentureType, name: string, serial: number, id: string): Venture {
  const def = VENTURE_BY_TYPE[type];
  return { id, type, name, level: 1, staff: 1, price: 'standard', marketing: Math.round(def.revenue * 0.05 / 100) * 100, reputation: 50, hype: 10, openedSerial: serial, invested: def.startCost, months: [], log: [`Opened ${name}.`], ownership: 1, redMonths: 0 };
}

export interface VentureCtx { fame: number; fanbase: number; momentum: number; businessSkill: number; managerBoost: number; merchBoost: number }

/** A month of trading. */
export function ventureMonth(v: Venture, ctx: VentureCtx, r: Rng): { month: VentureMonth; events: string[] } {
  const def = VENTURE_BY_TYPE[v.type];
  const lvl = Math.pow(2.05, v.level - 1);
  const staff = STAFF_TIERS[v.staff];
  const fameFactor = 1 + def.fameDriven * (Math.min(100, ctx.fame) / 80 + Math.log10(1 + ctx.fanbase) / 10 - 0.55);
  const priceVol = v.price === 'premium' ? 0.72 + ctx.fame / 260 : v.price === 'budget' ? 1.3 : 1;
  const priceMargin = v.price === 'premium' ? 1.45 : v.price === 'budget' ? 0.75 : 1;
  const rep = 0.55 + v.reputation / 110;
  const mkt = 1 + Math.min(0.3, Math.sqrt(v.marketing / Math.max(1, def.revenue * lvl)) * 0.5);
  const hype = 1 + v.hype / (v.type === 'app' ? 40 : 200);
  // An app's users compound month on month — if it survives long enough.
  const growth = v.type === 'app' ? Math.min(8, Math.pow(1.1, v.months.length)) : 1;
  const swing = 1 + (r() - 0.5) * 2 * def.volatility;
  let revenue = def.revenue * lvl * Math.max(0.25, fameFactor) * priceVol * priceMargin * staff.quality * rep * mkt * hype * growth * swing * (1 + ctx.merchBoost);
  const efficiency = 1 - clamp((ctx.businessSkill - 40) / 300, -0.15, 0.2) - ctx.managerBoost;
  // Stock, ingredients, supplies: the more you sell, the more you spend.
  const cogs = COGS[v.type] * (v.price === 'premium' ? 0.85 : v.price === 'budget' ? 1.15 : 1);
  let costs = (def.fixed * lvl + def.revenue * lvl * staff.wage) * efficiency + v.marketing;
  const events: string[] = [];
  // Something happens.
  const roll = r();
  const badOdds = 0.16 * staff.risk * (v.reputation < 40 ? 1.3 : 1);
  if (roll < badOdds) {
    const bad = pickBad(v.type, r);
    revenue *= bad.rev;
    costs += bad.fine * lvl;
    v.reputation = clamp(v.reputation + bad.rep, 0, 100);
    events.push(bad.text);
  } else if (roll > 1 - (0.14 + v.reputation / 600)) {
    const good = pickGood(v.type, r);
    revenue *= good.rev;
    v.reputation = clamp(v.reputation + good.rep, 0, 100);
    v.hype = clamp(v.hype + good.hype, 0, 100);
    events.push(good.text);
  }
  // Reputation drifts toward what you are actually selling.
  const target = 40 + (v.staff - 1) * 15 + (v.price === 'premium' ? 8 : v.price === 'budget' ? -8 : 0) + Math.min(10, v.marketing / Math.max(1, def.revenue * lvl) * 40);
  v.reputation = clamp(v.reputation + (target - v.reputation) * 0.12, 0, 100);
  v.hype = Math.max(0, v.hype * 0.7);
  revenue = Math.max(0, Math.round(revenue));
  costs = Math.round(costs + revenue * cogs);
  const profit = Math.round((revenue - costs) * (v.type === 'app' ? v.ownership : 1));
  v.redMonths = profit < 0 ? v.redMonths + 1 : 0;
  return { month: { serial: 0, revenue, costs, profit, note: events[0] }, events };
}

function pickBad(t: VentureType, r: Rng): { text: string; rev: number; fine: number; rep: number } {
  const common = [
    { text: 'Staff were caught stealing from the till.', rev: 0.85, fine: 1500, rep: -2 },
    { text: 'A one-star review went viral. Customers stayed away.', rev: 0.75, fine: 0, rep: -8 },
    { text: 'Equipment broke down — repairs and a slow week.', rev: 0.9, fine: 3000, rep: -1 },
    { text: 'A break-in over the weekend.', rev: 0.9, fine: 4500, rep: 0 },
  ];
  const specific: Partial<Record<VentureType, { text: string; rev: number; fine: number; rep: number }[]>> = {
    restaurant: [{ text: 'Health inspectors found problems in the kitchen. Fined and closed for three days.', rev: 0.82, fine: 5000, rep: -10 }],
    nightclub: [{ text: 'A fight broke out on the dance floor. Police shut the night down.', rev: 0.8, fine: 9000, rep: -12 }, { text: 'Noise complaints — the council fined you.', rev: 0.95, fine: 6000, rep: -3 }],
    clothing: [{ text: 'A factory batch came back with misprints. Refunds all week.', rev: 0.8, fine: 2500, rep: -6 }, { text: 'Fakes of your brand flooded the market.', rev: 0.78, fine: 0, rep: -4 }],
    liquor: [{ text: 'A distributor stopped paying. Stock stuck in a warehouse.', rev: 0.7, fine: 0, rep: -2 }],
    events: [{ text: 'Rain wrecked your biggest event of the month. Refunds everywhere.', rev: 0.55, fine: 8000, rep: -8 }],
    app: [{ text: 'A data breach. Users are leaving.', rev: 0.6, fine: 6000, rep: -14 }],
    sneakers: [{ text: 'A batch turned out to be fake. You refunded everyone.', rev: 0.6, fine: 4000, rep: -10 }],
    gym: [{ text: 'A member got hurt on broken equipment and is suing.', rev: 0.9, fine: 7000, rep: -6 }],
    carwash: [{ text: 'The water was cut off for a week.', rev: 0.7, fine: 0, rep: 0 }],
    salon: [{ text: 'A celebrity client posted a bad haircut. Brutal.', rev: 0.75, fine: 0, rep: -9 }],
  };
  const pool = [...common, ...(specific[t] ?? [])];
  return pool[Math.floor(r() * pool.length)];
}

function pickGood(t: VentureType, r: Rng): { text: string; rev: number; rep: number; hype: number } {
  const common = [
    { text: 'A food blogger — well, a lifestyle blogger — raved about you. Queues all week.', rev: 1.3, rep: 6, hype: 15 },
    { text: 'A corporate client placed a big order.', rev: 1.35, rep: 2, hype: 5 },
    { text: 'A famous face walked in and posted it. The city noticed.', rev: 1.4, rep: 5, hype: 25 },
  ];
  const specific: Partial<Record<VentureType, { text: string; rev: number; rep: number; hype: number }[]>> = {
    clothing: [{ text: 'A footballer wore your hoodie on TV. Sold out.', rev: 1.6, rep: 8, hype: 35 }],
    nightclub: [{ text: 'A superstar threw an after-party at your club.', rev: 1.6, rep: 6, hype: 30 }],
    liquor: [{ text: 'A hotel chain added your bottle to every bar.', rev: 1.5, rep: 5, hype: 15 }],
    events: [{ text: 'Your event sold out in a day.', rev: 1.7, rep: 8, hype: 25 }],
    app: [{ text: 'Your app hit the top of the download chart.', rev: 1.9, rep: 10, hype: 40 }],
    restaurant: [{ text: 'A TV show filmed an episode at your place.', rev: 1.45, rep: 7, hype: 20 }],
  };
  const pool = [...common, ...(specific[t] ?? [])];
  return pool[Math.floor(r() * pool.length)];
}

/** What someone would pay for it today. */
export function ventureValue(v: Venture): number {
  const def = VENTURE_BY_TYPE[v.type];
  const recent = v.months.filter((m) => m.note !== 'Collection drop').slice(-6);
  // Buyers don't pay for one good month: a young business is valued on at least four.
  const avg = recent.length ? recent.reduce((a, m) => a + m.profit, 0) / Math.max(4, recent.length) : 0;
  const assets = def.startCost * 0.5 + def.levels.slice(1, v.level).reduce((a, l) => a + l.cost, 0) * 0.55;
  const earnings = Math.max(0, avg) * (v.type === 'app' ? 36 : 22) * (0.7 + v.reputation / 170);
  const hypeValue = v.type === 'app' ? def.revenue * Math.pow(2.05, v.level - 1) * (v.hype / 10) * 6 : 0;
  return Math.round((assets + earnings + hypeValue) * (v.type === 'app' ? v.ownership : 1));
}

// ─── THE BIG MOVES ─────────────────────────────────────────────────────────

export interface DropPlan { units: number; quality: 'basic' | 'premium' | 'luxury' }

export function dropCost(plan: DropPlan, level: number): number {
  const unit = plan.quality === 'basic' ? 13 : plan.quality === 'premium' ? 30 : 78;
  return Math.round(plan.units * unit * Math.max(0.55, 1 - (level - 1) * 0.1));
}

/** A collection drop: how much sells, what it brings in. */
export function resolveDrop(v: Venture, plan: DropPlan, ctx: VentureCtx, r: Rng): { sold: number; revenue: number; text: string; rep: number; hype: number } {
  const price = plan.quality === 'basic' ? 30 : plan.quality === 'premium' ? 65 : 160;
  const demand = (40 + Math.pow(ctx.fanbase, 0.62) * 0.9) * (1 + ctx.momentum / 120) * (0.6 + v.reputation / 100) * (1 + v.hype / 100) * (plan.quality === 'luxury' ? 0.35 + ctx.fame / 150 : plan.quality === 'premium' ? 0.8 : 1.3) * (0.6 + r() * 0.8);
  const sold = Math.min(plan.units, Math.round(demand));
  const sellThrough = sold / plan.units;
  const revenue = sold * price;
  if (sellThrough >= 0.98) return { sold, revenue, rep: 6, hype: 40, text: `SOLD OUT in ${1 + Math.floor(r() * 3)} hours. ${sold.toLocaleString()} pieces gone. Resellers are asking double.` };
  if (sellThrough >= 0.7) return { sold, revenue, rep: 3, hype: 15, text: `${Math.round(sellThrough * 100)}% sold. A solid drop.` };
  if (sellThrough >= 0.4) return { sold, revenue, rep: 0, hype: 0, text: `Only ${Math.round(sellThrough * 100)}% sold. The rest is sitting in boxes.` };
  return { sold, revenue, rep: -4, hype: -10, text: `It flopped — ${Math.round(sellThrough * 100)}% sold. The internet noticed the clearance sale.` };
}

/** The other big moves, by type. Returns money in (or out) and what happened. */
export function resolveSpecial(v: Venture, ctx: VentureCtx, r: Rng): { cash: number; rep: number; hype: number; text: string; ownership?: number; fame?: number } {
  const def = VENTURE_BY_TYPE[v.type];
  const lvl = Math.pow(2.05, v.level - 1);
  const roll = r() + ctx.fame / 400 + v.reputation / 500;
  switch (def.special.id) {
    case 'party': {
      if (r() < 0.12) return { cash: -9000, rep: -10, hype: 10, fame: 0.3, text: 'It got out of hand — a fight, police, a fine. Everyone is talking about it, for the wrong reasons.' };
      const take = Math.round(def.revenue * lvl * (0.25 + roll * 0.4) * (1 + ctx.fame / 80));
      return { cash: take, rep: 5, hype: 30, fame: 0.4, text: `Packed wall to wall. $${take.toLocaleString()} over the bar in one night.` };
    }
    case 'festival': {
      // The cost was paid up front; this is what comes back through the gate.
      const swing = roll - 0.55;
      const mult = swing > 0.2 ? 2.4 + swing * 2 : swing > -0.1 ? 1 + swing : 0.25 + (swing + 0.6) * 0.6;
      const gross = Math.round(def.special.cost * Math.max(0.1, mult));
      const net = gross - def.special.cost;
      return { cash: gross, rep: net > 0 ? 8 : -6, hype: net > 0 ? 35 : -5, fame: net > 0 ? 0.6 : 0, text: net > def.special.cost ? `Sold out. The festival made $${net.toLocaleString()} profit and everybody wants a sequel.` : net >= 0 ? `It made a little — $${net.toLocaleString()} profit. Fun, though.` : `Half-empty field. The festival lost $${Math.abs(net).toLocaleString()}.` };
    }
    case 'chef': {
      const good = roll > 0.55;
      return { cash: 0, rep: good ? 12 : -5, hype: good ? 25 : 0, text: good ? 'The chef\'s residency got rave reviews. Bookings are full for weeks.' : 'The chef clashed with your staff and left early. Mixed reviews.' };
    }
    case 'flavor': {
      const hit = roll > 0.6;
      return { cash: hit ? Math.round(def.revenue * lvl * 0.5) : 0, rep: hit ? 6 : -2, hype: hit ? 35 : 5, text: hit ? 'The new flavour is a hit. Every bar in the city is ordering it.' : 'The launch party was fun. The flavour, less so.' };
    }
    case 'raise': {
      if (roll < 0.5) return { cash: 0, rep: -2, hype: -5, text: 'Investors passed. "Come back when you have traction."' };
      const amount = Math.round(def.revenue * lvl * (20 + roll * 30) * (1 + v.hype / 50));
      const give = 0.1 + r() * 0.1;
      return { cash: amount, rep: 4, hype: 20, ownership: Math.max(0.2, v.ownership - give * v.ownership), text: `Raised $${amount.toLocaleString()} for ${Math.round(give * 100)}% of the company. The press calls it a vote of confidence.` };
    }
    case 'flip': {
      const gross = Math.round(def.special.cost * (0.5 + roll * 1.6));
      const net = gross - def.special.cost;
      return { cash: gross, rep: net >= 0 ? 2 : -2, hype: net > 0 ? 10 : 0, text: net >= 0 ? `Flipped the whole drop. $${net.toLocaleString()} profit.` : `The hype died before you could sell. $${Math.abs(net).toLocaleString()} lost.` };
    }
    default: {
      const lift = Math.round(def.revenue * lvl * (0.1 + roll * 0.25));
      return { cash: lift, rep: 3, hype: 20, text: `It worked — an extra $${lift.toLocaleString()} came through the door.` };
    }
  }
}

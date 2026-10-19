// ─── MARKETS ───────────────────────────────────────────────────────────────
//
// A stock exchange, a crypto market and a property index that move every day
// whether you are watching or not. Every company and coin is fictional.
//
// Stocks follow a hidden trend that changes every few weeks, plus the mood of
// the whole market, plus news. Crypto is the same idea turned up: majors swing
// a few percent a day, alts more, memecoins can 5x in a week or rug to nothing
// overnight. A good financial advisor can read the hidden trend — not always.
//
// Pure: no store. The caller passes the random source.

export type Sector = 'Tech' | 'Telecom' | 'Banking' | 'Energy' | 'Consumer' | 'Media' | 'Mining' | 'Property' | 'Transport' | 'Agric';

export interface Stock {
  ticker: string;
  name: string;
  sector: Sector;
  price: number;
  /** Yesterday's close. */
  prev: number;
  /** Hidden daily drift. */
  drift: number;
  /** Daily volatility. */
  vol: number;
  /** Annual dividend yield. */
  dividend: number;
  /** How much the whole market moves it. */
  beta: number;
  history: number[];
  /** Days until the hidden trend changes. */
  regime: number;
  blurb: string;
}

export type CoinKind = 'major' | 'alt' | 'meme' | 'stable';

export interface Coin {
  ticker: string;
  name: string;
  kind: CoinKind;
  price: number;
  prev: number;
  drift: number;
  vol: number;
  history: number[];
  regime: number;
  /** Daily chance the team behind it disappears with the money. */
  rugRisk: number;
  dead?: boolean;
  /** What's left of the last pump, in log terms — it bleeds back out. */
  pump?: number;
  /** The day it died, so the listing can be cleared out eventually. */
  deadSerial?: number;
  blurb: string;
}

export interface MarketNews { id: string; serial: number; text: string; ticker?: string; impact: number }

export interface MarketState {
  day: number;
  stocks: Stock[];
  coins: Coin[];
  /** 100 = where property prices started. */
  propertyIndex: number;
  propertyHistory: number[];
  /** -1 (bear) to 1 (bull). */
  mood: number;
  moodRegime: number;
  news: MarketNews[];
  /** Tickers that died and were delisted — never reused, so old bags stay worthless. */
  retired?: string[];
}

export interface Holding { ticker: string; units: number; avgCost: number }

export interface Portfolio {
  stocks: Holding[];
  coins: Holding[];
  /** Profit taken by selling, lifetime. */
  realized: number;
  dividends: number;
}

export const STOCK_FEE = 0.01;
export const COIN_FEE = 0.005;

type Rng = () => number;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
function gauss(r: Rng): number {
  const u = Math.max(1e-9, r());
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const STOCK_SEED: Omit<Stock, 'prev' | 'drift' | 'history' | 'regime'>[] = [
  { ticker: 'VLT', name: 'Volta Telecom', sector: 'Telecom', price: 42, vol: 0.016, dividend: 0.05, beta: 0.8, blurb: 'The biggest mobile network in West Africa. Boring, reliable, pays dividends.' },
  { ticker: 'AKB', name: 'Akoma Bank', sector: 'Banking', price: 18, vol: 0.018, dividend: 0.06, beta: 1.1, blurb: 'Retail bank with branches in every town. Moves with the economy.' },
  { ticker: 'GCM', name: 'GoldCoast Mining', sector: 'Mining', price: 63, vol: 0.026, dividend: 0.03, beta: 0.7, blurb: 'Gold and bauxite. Up when the world is scared.' },
  { ticker: 'SVE', name: 'Savanna Energy', sector: 'Energy', price: 88, vol: 0.022, dividend: 0.045, beta: 0.9, blurb: 'Oil, gas and a growing solar arm.' },
  { ticker: 'KNT', name: 'Kente Apparel', sector: 'Consumer', price: 24, vol: 0.024, dividend: 0.02, beta: 1.0, blurb: 'Fashion brand with stores across the continent.' },
  { ticker: 'AFS', name: 'AfroStream Media', sector: 'Media', price: 35, vol: 0.03, dividend: 0, beta: 1.3, blurb: 'Music streaming and video. Lives and dies on subscriber numbers.' },
  { ticker: 'PXL', name: 'Pixel Labs', sector: 'Tech', price: 110, vol: 0.034, dividend: 0, beta: 1.5, blurb: 'Fintech and payments app. Huge growth, huge swings.' },
  { ticker: 'MCP', name: 'MegaChip Global', sector: 'Tech', price: 410, vol: 0.028, dividend: 0.005, beta: 1.4, blurb: 'Global chipmaker. Everyone needs chips.' },
  { ticker: 'LGA', name: 'Lagoon Airways', sector: 'Transport', price: 9, vol: 0.035, dividend: 0, beta: 1.6, blurb: 'Regional airline. Fuel prices and accidents hit it hard.' },
  { ticker: 'CCH', name: 'Cocoa Holdings', sector: 'Agric', price: 31, vol: 0.02, dividend: 0.04, beta: 0.6, blurb: 'Cocoa, cashew and shea. Weather decides the year.' },
  { ticker: 'HBL', name: 'Harbor Logistics', sector: 'Transport', price: 54, vol: 0.019, dividend: 0.03, beta: 1.0, blurb: 'Ports and trucking. Quietly makes money.' },
  { ticker: 'SRF', name: 'Sunrise Foods', sector: 'Consumer', price: 15, vol: 0.017, dividend: 0.05, beta: 0.7, blurb: 'Noodles, milk, biscuits. People always eat.' },
  { ticker: 'NSR', name: 'NorthStar REIT', sector: 'Property', price: 27, vol: 0.014, dividend: 0.07, beta: 0.8, blurb: 'Owns malls and office towers. Pays out most of what it earns.' },
  { ticker: 'ZNM', name: 'Zenith Motors', sector: 'Transport', price: 140, vol: 0.031, dividend: 0, beta: 1.4, blurb: 'Electric cars and motorbikes. Either the future or a story.' },
];

const COIN_SEED: Omit<Coin, 'prev' | 'drift' | 'history' | 'regime'>[] = [
  { ticker: 'BTG', name: 'BitGold', kind: 'major', price: 42000, vol: 0.03, rugRisk: 0, blurb: 'The first coin. Digital gold, they say.' },
  { ticker: 'ETR', name: 'Ethera', kind: 'major', price: 2300, vol: 0.038, rugRisk: 0, blurb: 'The coin everything else is built on.' },
  { ticker: 'NBL', name: 'Nebula', kind: 'alt', price: 95, vol: 0.055, rugRisk: 0.0004, blurb: 'Fast, cheap, constantly "about to break out".' },
  { ticker: 'AFC', name: 'AfriCoin', kind: 'alt', price: 0.42, vol: 0.06, rugRisk: 0.0008, blurb: 'Payments across African borders. Real use, unclear future.' },
  { ticker: 'DGK', name: 'DogeKing', kind: 'meme', price: 0.0031, vol: 0.085, rugRisk: 0.002, blurb: 'A dog in a crown. No reason to exist. Somehow worth millions.' },
  { ticker: 'MOON', name: 'MoonToad', kind: 'meme', price: 0.00041, vol: 0.1, rugRisk: 0.004, blurb: 'Launched last month. The team is anonymous. What could go wrong?' },
  { ticker: 'STC', name: 'StableCash', kind: 'stable', price: 1, vol: 0.001, rugRisk: 0, blurb: 'Pegged to the dollar. Usually.' },
];

const NEW_MEMES: { ticker: string; name: string; blurb: string }[] = [
  { ticker: 'BINU', name: 'Banku Inu', blurb: 'A dog that loves banku. The roadmap is a picture of a rocket.' },
  { ticker: 'JLF', name: 'Jollof Token', blurb: 'Settles the jollof war on-chain. Allegedly.' },
  { ticker: 'OKD', name: 'Okada Cash', blurb: 'Fast, loud and slightly dangerous, like the bikes.' },
  { ticker: 'TRO', name: 'Trotro Token', blurb: 'Always full, always late, somehow always moving.' },
  { ticker: 'LAMB', name: 'LamboSoon', blurb: 'The whole whitepaper is one word: soon.' },
  { ticker: 'KNK', name: 'KenkeySwap', blurb: 'A swap for swapping kenkey. Nobody knows what that means.' },
  { ticker: 'GOAT', name: 'GOAT Coin', blurb: 'Named after the greatest of all time. Which one? Exactly.' },
  { ticker: 'FUFU', name: 'FufuFi', blurb: 'Decentralised fufu finance. Pound it.' },
];

export function newMarket(serial: number, r: Rng): MarketState {
  const stocks: Stock[] = STOCK_SEED.map((s) => {
    const drift = 0.00025 + gauss(r) * 0.0005;
    const history: number[] = [];
    let p = s.price;
    for (let i = 0; i < 60; i++) { p = Math.max(0.5, p * Math.exp(drift + gauss(r) * s.vol)); history.push(round(p)); }
    return { ...s, price: round(p), prev: history[history.length - 2], drift, history, regime: 20 + Math.floor(r() * 40) };
  });
  const coins: Coin[] = COIN_SEED.map((c) => {
    const drift = coinDrift(c.kind, r);
    const history: number[] = [];
    let p = c.price;
    for (let i = 0; i < 60; i++) { p = c.kind === 'stable' ? 1 + gauss(r) * 0.001 : Math.max(1e-7, p * Math.exp(drift + gauss(r) * c.vol)); history.push(round(p)); }
    return { ...c, price: round(p), prev: history[history.length - 2], drift, history, regime: 10 + Math.floor(r() * 30) };
  });
  const ph: number[] = [];
  let pi = 100;
  for (let i = 0; i < 60; i++) { pi *= Math.exp(0.0002 + gauss(r) * 0.003); ph.push(round(pi)); }
  return { day: serial, stocks, coins, propertyIndex: round(pi), propertyHistory: ph, mood: 0.1, moodRegime: 40, news: [] };
}

function coinDrift(kind: CoinKind, r: Rng): number {
  if (kind === 'stable') return 0;
  // Volatility drags the typical path down and fattens the tail up, so the
  // drifts are set against it: memes lose money on average, majors drift up.
  if (kind === 'meme') return -0.004 + gauss(r) * 0.005;
  if (kind === 'alt') return -0.0008 + gauss(r) * 0.002;
  return 0.0002 + gauss(r) * 0.0012;
}

function round(n: number): number {
  if (n >= 100) return Math.round(n * 100) / 100;
  if (n >= 1) return Math.round(n * 1000) / 1000;
  return Number(n.toPrecision(4));
}

const GOOD = ['posts record profits', 'wins a huge government contract', 'beats every analyst estimate', 'announces a big expansion', 'gets bought into by a foreign giant', 'launches a hit new product'];
const BAD = ['misses its earnings badly', 'is hit with a regulator fine', 'loses its CEO to a scandal', 'warns profits will fall', 'faces a fraud investigation', 'suffers a major outage'];

/** One market day. Returns the headlines it made. */
export function stepMarket(m: MarketState, serial: number, r: Rng): MarketNews[] {
  const news: MarketNews[] = [];
  // The whole market's mood.
  m.moodRegime -= 1;
  if (m.moodRegime <= 0) {
    m.mood = clamp(gauss(r) * 0.6, -1, 1);
    m.moodRegime = 25 + Math.floor(r() * 50);
    news.push({ id: `mkt|${serial}`, serial, text: m.mood > 0.3 ? '📈 Analysts say a bull market is starting.' : m.mood < -0.3 ? '📉 Recession fears grip the market.' : '↔️ Markets go sideways as investors wait.', impact: m.mood });
  }
  const marketMove = m.mood * 0.0008 + gauss(r) * 0.0045;
  for (const s of m.stocks) {
    s.regime -= 1;
    if (s.regime <= 0) { s.drift = 0.00025 + gauss(r) * 0.0005; s.regime = 20 + Math.floor(r() * 45); }
    let ret = s.drift + s.beta * marketMove + gauss(r) * s.vol * 0.75;
    if (r() < 0.008) {
      const good = r() < 0.5 + s.drift * 200;
      const jump = (0.04 + r() * 0.1) * (good ? 1 : -1);
      ret += jump;
      s.drift += good ? 0.0003 : -0.0003;
      news.push({ id: `${s.ticker}|${serial}`, serial, ticker: s.ticker, impact: jump, text: `${good ? '🟢' : '🔴'} ${s.name} ${pick(good ? GOOD : BAD, r)} — ${s.ticker} ${good ? '+' : ''}${Math.round(jump * 100)}%` });
    }
    s.prev = s.price;
    s.price = round(Math.max(0.5, s.price * Math.exp(ret)));
    s.history.push(s.price);
    if (s.history.length > 90) s.history.shift();
  }
  for (const c of m.coins) {
    c.prev = c.price;
    if (c.dead) { c.price = round(c.price * (0.9 + r() * 0.15)); c.history.push(c.price); if (c.history.length > 90) c.history.shift(); continue; }
    if (c.kind === 'stable') {
      c.price = round(r() < 0.0015 ? 0.55 + r() * 0.3 : 1 + (c.price < 0.99 ? (1 - c.price) * 0.4 : 0) + gauss(r) * 0.0015);
      if (c.price < 0.9) news.push({ id: `${c.ticker}|${serial}`, serial, ticker: c.ticker, impact: c.price - 1, text: `🚨 ${c.name} loses its dollar peg — trading at $${c.price.toFixed(2)}` });
    } else {
      c.regime -= 1;
      if (c.regime <= 0) { c.drift = coinDrift(c.kind, r); c.regime = 8 + Math.floor(r() * 30); }
      let ret = c.drift + m.mood * 0.002 + gauss(r) * c.vol;
      // A pump gives itself back over the following weeks.
      if (c.pump && c.pump > 0.01) { const give = c.pump * 0.09; ret -= give; c.pump -= give; }
      if (c.kind === 'meme' && r() < 0.025) {
        const pump = 0.3 + r() * 1.2;
        ret += Math.log(1 + pump);
        c.pump = (c.pump ?? 0) + Math.log(1 + pump);
        news.push({ id: `${c.ticker}|p|${serial}`, serial, ticker: c.ticker, impact: pump, text: `🚀 ${c.name} pumps ${Math.round(pump * 100)}% after a celebrity tweet` });
      }
      if (r() < c.rugRisk) {
        c.dead = true;
        c.deadSerial = serial;
        ret = Math.log(0.03 + r() * 0.1);
        news.push({ id: `${c.ticker}|rug|${serial}`, serial, ticker: c.ticker, impact: -0.95, text: `💀 RUG PULL: the ${c.name} team vanished with the money. ${c.ticker} is down over 90%.` });
      }
      c.price = round(Math.max(1e-7, c.price * Math.exp(ret)));
    }
    c.history.push(c.price);
    if (c.history.length > 90) c.history.shift();
  }
  // Dead coins drop off the exchange after three months; new meme coins list.
  const gone = m.coins.filter((c) => c.dead && c.deadSerial !== undefined && serial - c.deadSerial >= 90);
  if (gone.length) {
    m.retired = [...(m.retired ?? []), ...gone.map((c) => c.ticker)];
    m.coins = m.coins.filter((c) => !gone.includes(c));
  }
  const liveMemes = m.coins.filter((c) => c.kind === 'meme' && !c.dead).length;
  if (liveMemes < 3 && r() < 0.025) {
    const taken = new Set([...m.coins.map((c) => c.ticker), ...(m.retired ?? [])]);
    const fresh = NEW_MEMES.filter((x) => !taken.has(x.ticker));
    if (fresh.length) {
      const x = pick(fresh, r);
      const price = Number((0.00002 + r() * 0.002).toPrecision(3));
      m.coins.push({ ...x, kind: 'meme', price, prev: price, drift: 0.002 + gauss(r) * 0.008, vol: 0.09 + r() * 0.04, history: [price], regime: 10 + Math.floor(r() * 20), rugRisk: 0.003 + r() * 0.004 });
      news.push({ id: `${x.ticker}|list|${serial}`, serial, ticker: x.ticker, impact: 0, text: `🆕 ${x.name} (${x.ticker}) just listed. Group chats are going crazy.` });
    }
  }
  // Property: slow, with long cycles.
  m.propertyIndex = round(m.propertyIndex * Math.exp(0.0002 + m.mood * 0.0009 + gauss(r) * 0.0025));
  m.propertyHistory.push(m.propertyIndex);
  if (m.propertyHistory.length > 90) m.propertyHistory.shift();
  m.day = serial;
  m.news = [...news, ...m.news].slice(0, 30);
  return news;
}

function pick<T>(a: T[], r: Rng): T { return a[Math.floor(r() * a.length)]; }

/** Change over the last n days, as a fraction. */
export function changeOver(history: number[], n: number): number {
  if (history.length < 2) return 0;
  const a = history[Math.max(0, history.length - 1 - n)];
  const b = history[history.length - 1];
  return a > 0 ? b / a - 1 : 0;
}

// ─── THE ADVISOR ───────────────────────────────────────────────────────────

export type Call = 'Strong buy' | 'Buy' | 'Hold' | 'Sell' | 'Avoid';

/**
 * What a financial advisor thinks. A good one reads the hidden trend most of
 * the time; a weak one is barely better than a coin flip. Deterministic per
 * day and advisor, so the advice doesn't change every time you look.
 */
export function adviceFor(asset: { ticker: string; drift: number; kind?: CoinKind; rugRisk?: number; dead?: boolean; pump?: number }, skill: number, serial: number): { call: Call; note: string } {
  const h = hash(`${asset.ticker}|${serial}|${skill}`);
  // Skill 20 is a coin flip; skill 90+ reads the trend every time.
  const accurate = (h % 1000) / 1000 < 0.35 + skill / 130;
  if (asset.dead) return { call: 'Avoid', note: 'It\'s dead. Whatever is left is a lottery ticket.' };
  if (asset.kind === 'stable') return { call: 'Hold', note: 'Parking money. It shouldn\'t move — shouldn\'t.' };
  if (asset.kind === 'meme' && (asset.rugRisk ?? 0) > 0.003 && skill >= 45 && accurate) return { call: 'Avoid', note: 'Anonymous team, no product. I smell a rug pull.' };
  if ((asset.pump ?? 0) > 0.25 && accurate) return { call: 'Sell', note: 'It just pumped. Pumps like this give it all back — take the profit.' };
  // How the hidden trend compares with what is normal for this kind of asset.
  const [mean, sd] = NORM[asset.kind ?? 'stock'];
  const z = accurate ? (asset.drift - mean) / sd : ((((h >> 10) % 2000) - 1000) / 1000) * 1.5;
  if (z > 1.1) return { call: 'Strong buy', note: asset.kind ? 'Real money is flowing in. I\'d have a position.' : 'The fundamentals are running hot. I\'d be in this.' };
  if (z > 0.35) return { call: 'Buy', note: 'Trending the right way.' };
  if (z > -0.35) return { call: 'Hold', note: 'Nothing to do here right now.' };
  if (z > -1.1) return { call: 'Sell', note: 'Momentum is fading. Take profits.' };
  return { call: 'Avoid', note: asset.kind === 'meme' ? 'Everyone in it is trying to get out. Don\'t be the last one.' : 'Falling knife. Stay away.' };
}

const NORM: Record<CoinKind | 'stock', [number, number]> = { stock: [0.00025, 0.0005], major: [0.0002, 0.0012], alt: [-0.0008, 0.002], meme: [-0.004, 0.005], stable: [0, 1] };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function holdingValue(h: Holding[], prices: Map<string, number>): number {
  return h.reduce((a, x) => a + x.units * (prices.get(x.ticker) ?? 0), 0);
}

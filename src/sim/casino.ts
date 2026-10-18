// ─── THE CASINO ────────────────────────────────────────────────────────────
//
// Blackjack, roulette, slots, dice and a sports book. Real odds — the house
// edge is the house edge. Win big and the blogs post it; lose big while you're
// famous and they post that too.
//
// Pure: no store. Rolls are passed in.

type Rng = () => number;

// ─── BLACKJACK ─────────────────────────────────────────────────────────────

export interface Card { rank: string; suit: string; value: number }
export interface BlackjackHand { deck: Card[]; player: Card[]; dealer: Card[]; bet: number; done: boolean; doubled?: boolean; result?: 'win' | 'lose' | 'push' | 'blackjack'; payout?: number }

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function newDeck(r: Rng): Card[] {
  const d: Card[] = [];
  for (let k = 0; k < 4; k++) for (const s of SUITS) for (const rk of RANKS) d.push({ rank: rk, suit: s, value: rk === 'A' ? 11 : ['J', 'Q', 'K'].includes(rk) ? 10 : Number(rk) });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

export function handTotal(cards: Card[]): number {
  let t = cards.reduce((a, c) => a + c.value, 0);
  let aces = cards.filter((c) => c.rank === 'A').length;
  while (t > 21 && aces > 0) { t -= 10; aces -= 1; }
  return t;
}

export function dealBlackjack(bet: number, r: Rng): BlackjackHand {
  const deck = newDeck(r);
  const h: BlackjackHand = { deck, player: [deck.pop()!, deck.pop()!], dealer: [deck.pop()!, deck.pop()!], bet, done: false };
  if (handTotal(h.player) === 21) settleBlackjack(h);
  return h;
}

export function hit(h: BlackjackHand): BlackjackHand {
  if (h.done) return h;
  h.player.push(h.deck.pop()!);
  if (handTotal(h.player) > 21) { h.done = true; h.result = 'lose'; h.payout = 0; }
  return h;
}

export function stand(h: BlackjackHand): BlackjackHand {
  if (h.done) return h;
  while (handTotal(h.dealer) < 17) h.dealer.push(h.deck.pop()!);
  settleBlackjack(h);
  return h;
}

export function doubleDown(h: BlackjackHand): BlackjackHand {
  if (h.done || h.player.length !== 2) return h;
  h.bet *= 2;
  h.doubled = true;
  h.player.push(h.deck.pop()!);
  if (handTotal(h.player) > 21) { h.done = true; h.result = 'lose'; h.payout = 0; return h; }
  return stand(h);
}

function settleBlackjack(h: BlackjackHand): void {
  const p = handTotal(h.player);
  const d = handTotal(h.dealer);
  h.done = true;
  if (p === 21 && h.player.length === 2 && !(d === 21 && h.dealer.length === 2)) { h.result = 'blackjack'; h.payout = Math.round(h.bet * 2.5); return; }
  if (d > 21 || p > d) { h.result = 'win'; h.payout = h.bet * 2; return; }
  if (p === d) { h.result = 'push'; h.payout = h.bet; return; }
  h.result = 'lose'; h.payout = 0;
}

// ─── ROULETTE ──────────────────────────────────────────────────────────────

export type RouletteBet = 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | `n${number}`;
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const isRed = (n: number) => REDS.has(n);

export function spinRoulette(bet: RouletteBet, stake: number, r: Rng): { n: number; win: boolean; payout: number } {
  const n = Math.floor(r() * 37);
  let mult = 0;
  if (n !== 0) {
    if (bet === 'red' && isRed(n)) mult = 2;
    if (bet === 'black' && !isRed(n)) mult = 2;
    if (bet === 'odd' && n % 2 === 1) mult = 2;
    if (bet === 'even' && n % 2 === 0) mult = 2;
    if (bet === 'low' && n <= 18) mult = 2;
    if (bet === 'high' && n >= 19) mult = 2;
    if (bet === 'dozen1' && n <= 12) mult = 3;
    if (bet === 'dozen2' && n >= 13 && n <= 24) mult = 3;
    if (bet === 'dozen3' && n >= 25) mult = 3;
  }
  if (bet.startsWith('n') && Number(bet.slice(1)) === n) mult = 36;
  return { n, win: mult > 0, payout: stake * mult };
}

// ─── SLOTS ─────────────────────────────────────────────────────────────────

const REEL = ['🍒', '🍒', '🍒', '🍋', '🍋', '🍋', '🔔', '🔔', '⭐', '💎', '7️⃣'];
// Pays back about 93% over time.
const PAY: Record<string, number> = { '🍒': 5, '🍋': 8, '🔔': 15, '⭐': 30, '💎': 75, '7️⃣': 200 };

export function spinSlots(stake: number, r: Rng): { reels: string[]; payout: number; text: string } {
  const reels = [0, 1, 2].map(() => REEL[Math.floor(r() * REEL.length)]);
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    const m = PAY[reels[0]];
    return { reels, payout: stake * m, text: m >= 75 ? `JACKPOT ×${m}!` : `Three of a kind ×${m}` };
  }
  const cherries = reels.filter((x) => x === '🍒').length;
  if (cherries === 2) return { reels, payout: Math.round(stake * 1.5), text: 'Two cherries ×1.5' };
  if (reels[0] === reels[1] || reels[1] === reels[2]) return { reels, payout: Math.round(stake * 0.5), text: 'A pair — half back' };
  return { reels, payout: 0, text: 'Nothing.' };
}

// ─── DICE ──────────────────────────────────────────────────────────────────

export type DiceBet = 'under' | 'seven' | 'over';
export function rollDice(bet: DiceBet, stake: number, r: Rng): { dice: [number, number]; total: number; payout: number } {
  const dice: [number, number] = [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)];
  const total = dice[0] + dice[1];
  const win = (bet === 'under' && total < 7) || (bet === 'over' && total > 7) || (bet === 'seven' && total === 7);
  return { dice, total, payout: win ? stake * (bet === 'seven' ? 5 : 2) : 0 };
}

// ─── THE SPORTS BOOK ───────────────────────────────────────────────────────

const CLUBS = ['Accra Lions', 'Kumasi Royals', 'Lagos Eagles', 'Abuja Stars', 'Tema Harbour', 'Cape Coast Mariners', 'Nairobi City', 'Dakar Waves', 'Abidjan Elephants', 'Kano Pillars FC', 'Joburg Gold', 'Cairo Pharaohs'];

export interface Fixture { id: string; serial: number; home: string; away: string; strength: number; odds: { home: number; draw: number; away: number }; result?: 'home' | 'draw' | 'away'; score?: string }
export interface SportsBet { id: string; fixtureId: string; pick: 'home' | 'draw' | 'away'; stake: number; odds: number; settled?: boolean; won?: boolean; label: string }

/** Tomorrow's matches, with bookmaker odds (the house takes ~7%). */
export function fixturesFor(serial: number, r: Rng): Fixture[] {
  const out: Fixture[] = [];
  const pool = [...CLUBS].sort(() => r() - 0.5);
  for (let i = 0; i < 4; i++) {
    const strength = (r() - 0.5) * 1.6; // home advantage over away
    const ph = 0.38 + strength * 0.22;
    const pa = 0.32 - strength * 0.2;
    const pd = Math.max(0.12, 1 - ph - pa);
    const norm = ph + pa + pd;
    const odds = (p: number) => Math.max(1.05, Math.round((1 / (p / norm) / 1.07) * 100) / 100);
    out.push({ id: `fx|${serial}|${i}`, serial, home: pool[i * 2], away: pool[i * 2 + 1], strength, odds: { home: odds(ph), draw: odds(pd), away: odds(pa) } });
  }
  return out;
}

export function playFixture(f: Fixture, r: Rng): Fixture {
  const lamH = 1.35 + f.strength * 0.6;
  const lamA = 1.05 - f.strength * 0.5;
  const goals = (lam: number) => { let k = 0; let p = Math.exp(-Math.max(0.2, lam)); let s = p; const u = r(); while (u > s && k < 8) { k += 1; p *= Math.max(0.2, lam) / k; s += p; } return k; };
  const h = goals(lamH);
  const a = goals(lamA);
  return { ...f, score: `${h}–${a}`, result: h > a ? 'home' : h < a ? 'away' : 'draw' };
}

/** How big a bet the floor will take, by how much you have played. */
export function tableLimit(vipPoints: number): number {
  return vipPoints >= 500_000 ? 250_000 : vipPoints >= 100_000 ? 50_000 : vipPoints >= 20_000 ? 10_000 : 2_000;
}
export function vipTier(vipPoints: number): string {
  return vipPoints >= 500_000 ? 'Black card' : vipPoints >= 100_000 ? 'Platinum' : vipPoints >= 20_000 ? 'Gold' : 'Guest';
}

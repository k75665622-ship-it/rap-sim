// ─── WORLD FOOTBALL ────────────────────────────────────────────────────────
//
// A sports book with matches every day from five European leagues, a European
// cup and African leagues. Club names are fictional (they're named after real
// cities, not real clubs). Every team has a strength; odds come from the
// Poisson goal model the matches are played with, minus a ~6% bookmaker
// margin. Matches kick off at real times on the game clock, the score moves
// while they're live, and bets settle at the final whistle.
//
// Pure: the store owns the state.

type Rng = () => number;

export interface League { id: string; name: string; flag: string; teams: { name: string; strength: number }[] }

const T = (name: string, strength: number) => ({ name, strength });

export const LEAGUES: League[] = [
  { id: 'eng', name: 'England · Top Flight', flag: '🏴', teams: [T('London Albion', 90), T('Manchester Athletic', 91), T('Liverpool Docks', 89), T('North London Rangers', 86), T('Thames United', 84), T('Manchester Rovers', 82), T('Newcastle Tyne', 79), T('Birmingham Forge', 75), T('Merseyside Wanderers', 74), T('Brighton Pier', 73), T('Leeds Northern', 70), T('Leicester Dynamo', 68)] },
  { id: 'esp', name: 'Spain · Primera', flag: '🇪🇸', teams: [T('Madrid Imperial', 92), T('Barcelona Mediterrani', 90), T('Madrid Castilla', 85), T('Sevilla Giralda', 79), T('Bilbao Ría', 78), T('San Sebastián Costa', 77), T('Valencia Turia', 74), T('Málaga Sol', 70), T('Vigo Atlántico', 68), T('Granada Alhambra', 66)] },
  { id: 'ita', name: 'Italy · Serie Prima', flag: '🇮🇹', teams: [T('Milano Duomo', 87), T('Torino Mole', 86), T('Napoli Vesuvio', 86), T('Milano Navigli', 85), T('Roma Imperiale', 81), T('Roma Tevere', 79), T('Bergamo Orobica', 80), T('Firenze Arno', 75), T('Bologna Torri', 73), T('Genova Lanterna', 68)] },
  { id: 'ger', name: 'Germany · First Division', flag: '🇩🇪', teams: [T('München Isar', 91), T('Dortmund Ruhr', 85), T('Leipzig Messe', 83), T('Leverkusen Rhein', 84), T('Frankfurt Main', 77), T('Berlin Spree', 72), T('Hamburg Hafen', 71), T('Stuttgart Neckar', 74), T('Köln Dom', 68), T('Bremen Weser', 69)] },
  { id: 'fra', name: 'France · Ligue Une', flag: '🇫🇷', teams: [T('Paris Seine', 90), T('Marseille Vieux-Port', 80), T('Monaco Riviera', 80), T('Lyon Rhône', 78), T('Lille Nord', 78), T('Nice Côte', 75), T('Lens Mineurs', 74), T('Rennes Bretagne', 73), T('Nantes Loire', 68), T('Bordeaux Garonne', 67)] },
  { id: 'gha', name: 'Ghana · Top Flight', flag: '🇬🇭', teams: [T('Accra Lions', 72), T('Kumasi Royals', 73), T('Tema Harbour', 66), T('Cape Coast Mariners', 64), T('Takoradi Oilers', 63), T('Tamale Savannah', 61), T('Sunyani Forest', 60), T('Ho Volta', 59)] },
  { id: 'nga', name: 'Nigeria · Top Flight', flag: '🇳🇬', teams: [T('Lagos Eagles', 72), T('Abuja Stars', 70), T('Kano Sahel', 69), T('Ibadan Oluyole', 66), T('Port Harcourt Delta', 67), T('Enugu Coal City', 65), T('Benin Bronze', 62), T('Jos Plateau', 61)] },
  { id: 'ucl', name: 'European Champions Cup', flag: '🏆', teams: [] },
];

export const LEAGUE_BY_ID = Object.fromEntries(LEAGUES.map((l) => [l.id, l])) as Record<string, League>;

/** The European cup is played by the best of the big five. */
function cupTeams(): { name: string; strength: number; from: string }[] {
  const out: { name: string; strength: number; from: string }[] = [];
  for (const id of ['eng', 'esp', 'ita', 'ger', 'fra']) for (const t of LEAGUE_BY_ID[id].teams.slice(0, 4)) out.push({ ...t, from: id });
  return out;
}

export type Market = '1x2' | 'ou' | 'btts';
export type Pick = 'home' | 'draw' | 'away' | 'over' | 'under' | 'yes' | 'no';

export interface Match {
  id: string;
  league: string;
  home: string;
  away: string;
  /** Absolute game minute of kickoff. */
  kickoff: number;
  odds: { home: number; draw: number; away: number; over: number; under: number; yes: number; no: number };
  /** Goal minutes, decided before kickoff and revealed as the clock runs. */
  goals: { m: number; side: 'h' | 'a' }[];
  settled?: boolean;
}

export interface Selection { matchId: string; market: Market; pick: Pick; odds: number; label: string }
export interface Bet { id: string; selections: Selection[]; stake: number; odds: number; placedMinute: number; status: 'open' | 'won' | 'lost'; payout: number }

export interface TableRow { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

export interface FootballState {
  matches: Match[];
  bets: Bet[];
  tables: Record<string, Record<string, TableRow>>;
  /** Day serials that already have fixtures. */
  scheduled: number[];
  results: string[];
}

export const MATCH_LENGTH = 112; // kickoff to final whistle, with half-time, in game minutes

// ─── ODDS ──────────────────────────────────────────────────────────────────

function poisson(k: number, lam: number): number {
  let p = Math.exp(-lam);
  for (let i = 1; i <= k; i++) p *= lam / i;
  return p;
}

function expectedGoals(home: number, away: number): [number, number] {
  const diff = (home - away) / 10;
  return [Math.max(0.4, 1.45 + diff * 0.32), Math.max(0.3, 1.12 - diff * 0.3)];
}

const price = (p: number) => Math.max(1.03, Math.round((1 / (p * 1.06)) * 100) / 100);

function oddsFor(lh: number, la: number): Match['odds'] {
  let ph = 0, pd = 0, pa = 0, pOver = 0, pYes = 0;
  for (let h = 0; h <= 9; h++) for (let a = 0; a <= 9; a++) {
    const p = poisson(h, lh) * poisson(a, la);
    if (h > a) ph += p; else if (h === a) pd += p; else pa += p;
    if (h + a >= 3) pOver += p;
    if (h > 0 && a > 0) pYes += p;
  }
  return { home: price(ph), draw: price(pd), away: price(pa), over: price(pOver), under: price(1 - pOver), yes: price(pYes), no: price(1 - pYes) };
}

function goalCount(lam: number, r: Rng): number {
  let k = 0;
  let p = Math.exp(-lam);
  let s = p;
  const u = r();
  while (u > s && k < 9) { k += 1; p *= lam / k; s += p; }
  return k;
}

// ─── FIXTURES ──────────────────────────────────────────────────────────────

/** Kickoff slots by weekday (0 = Sunday), in minutes past midnight. */
function slotsFor(weekday: number): { league: string; kickoffs: number[] }[] {
  const t = (h: number, m = 0) => h * 60 + m;
  if (weekday === 6) return [
    { league: 'eng', kickoffs: [t(13, 30), t(16), t(16), t(18, 30)] },
    { league: 'esp', kickoffs: [t(15, 15), t(20)] },
    { league: 'ita', kickoffs: [t(17), t(19, 45)] },
    { league: 'ger', kickoffs: [t(15, 30), t(18, 30)] },
    { league: 'fra', kickoffs: [t(17), t(21)] },
    { league: 'gha', kickoffs: [t(15)] },
    { league: 'nga', kickoffs: [t(16)] },
  ];
  if (weekday === 0) return [
    { league: 'eng', kickoffs: [t(14), t(16, 30)] },
    { league: 'esp', kickoffs: [t(14), t(18, 30), t(21)] },
    { league: 'ita', kickoffs: [t(12, 30), t(15), t(20, 45)] },
    { league: 'ger', kickoffs: [t(15, 30)] },
    { league: 'fra', kickoffs: [t(16), t(20, 45)] },
    { league: 'gha', kickoffs: [t(15), t(15)] },
    { league: 'nga', kickoffs: [t(16)] },
  ];
  if (weekday === 2 || weekday === 3) return [{ league: 'ucl', kickoffs: [t(18, 45), t(21), t(21), t(21)] }, { league: weekday === 2 ? 'gha' : 'nga', kickoffs: [t(16)] }];
  if (weekday === 5) return [{ league: 'ger', kickoffs: [t(20, 30)] }, { league: 'fra', kickoffs: [t(21)] }, { league: 'esp', kickoffs: [t(21)] }];
  if (weekday === 1) return [{ league: 'eng', kickoffs: [t(21)] }, { league: 'ita', kickoffs: [t(20, 45)] }, { league: 'gha', kickoffs: [t(15)] }, { league: 'esp', kickoffs: [t(21)] }];
  return [{ league: 'nga', kickoffs: [t(16)] }, { league: 'gha', kickoffs: [t(15)] }, { league: 'esp', kickoffs: [t(20)] }, { league: 'ita', kickoffs: [t(20, 45)] }, { league: 'eng', kickoffs: [t(20)] }];
}

/** A day's matches. No team plays twice on the same day. */
export function fixturesForDay(serial: number, r: Rng): Match[] {
  const weekday = new Date(serial * 86400000).getUTCDay();
  const out: Match[] = [];
  const used = new Set<string>();
  for (const slot of slotsFor(weekday)) {
    const pool = slot.league === 'ucl' ? cupTeams() : LEAGUE_BY_ID[slot.league].teams.map((t) => ({ ...t, from: slot.league }));
    const shuffled = [...pool].sort(() => r() - 0.5).filter((t) => !used.has(t.name));
    for (let i = 0; i < slot.kickoffs.length && shuffled.length >= 2; i++) {
      const home = shuffled.shift()!;
      // The cup draws across leagues.
      const idx = slot.league === 'ucl' ? Math.max(0, shuffled.findIndex((t) => t.from !== home.from)) : 0;
      const away = shuffled.splice(idx, 1)[0];
      used.add(home.name);
      used.add(away.name);
      const form = () => (r() - 0.5) * 6;
      const [lh, la] = expectedGoals(home.strength + form() + 2, away.strength + form());
      const hg = goalCount(lh, r);
      const ag = goalCount(la, r);
      const goals: Match['goals'] = [
        ...Array.from({ length: hg }, () => ({ m: 1 + Math.floor(r() * 93), side: 'h' as const })),
        ...Array.from({ length: ag }, () => ({ m: 1 + Math.floor(r() * 93), side: 'a' as const })),
      ].sort((a, b) => a.m - b.m);
      out.push({ id: `m${serial}-${out.length}`, league: slot.league, home: home.name, away: away.name, kickoff: serial * 1440 + slot.kickoffs[i], odds: oddsFor(lh, la), goals });
    }
  }
  return out.sort((a, b) => a.kickoff - b.kickoff);
}

// ─── LIVE ──────────────────────────────────────────────────────────────────

/** Where a match is at a given game minute. */
export function matchState(m: Match, now: number): { phase: 'pre' | 'live' | 'ht' | 'ft'; minute: number; h: number; a: number } {
  const t = now - m.kickoff;
  if (t < 0) return { phase: 'pre', minute: 0, h: 0, a: 0 };
  // 45 minutes, a 15-minute break, then the second half plus stoppage time.
  const played = t >= MATCH_LENGTH ? 95 : t < 47 ? Math.min(45, t) : t < 62 ? 45 : Math.min(95, 45 + (t - 62));
  const phase = t >= MATCH_LENGTH ? 'ft' : t >= 47 && t < 62 ? 'ht' : 'live';
  let h = 0, a = 0;
  for (const g of m.goals) if (g.m <= played) { if (g.side === 'h') h++; else a++; }
  return { phase, minute: Math.min(90, played), h, a };
}

export function finalScore(m: Match): { h: number; a: number } {
  return { h: m.goals.filter((g) => g.side === 'h').length, a: m.goals.filter((g) => g.side === 'a').length };
}

/** Did this selection win? */
export function selectionWon(s: Selection, m: Match): boolean {
  const { h, a } = finalScore(m);
  switch (s.pick) {
    case 'home': return h > a;
    case 'away': return a > h;
    case 'draw': return h === a;
    case 'over': return h + a >= 3;
    case 'under': return h + a <= 2;
    case 'yes': return h > 0 && a > 0;
    case 'no': return h === 0 || a === 0;
  }
}

export function pickLabel(p: Pick | string, match: Match): string {
  switch (p) {
    case 'home': return match.home;
    case 'away': return match.away;
    case 'draw': return 'Draw';
    case 'over': return 'Over 2.5 goals';
    case 'under': return 'Under 2.5 goals';
    case 'yes': return 'Both teams score';
    case 'no': return 'Not both to score';
    default: return String(p);
  }
}

export function newFootball(): FootballState {
  return { matches: [], bets: [], tables: {}, scheduled: [], results: [] };
}

export function addToTable(tables: FootballState['tables'], m: Match): void {
  if (m.league === 'ucl') return;
  const t = tables[m.league] ?? (tables[m.league] = {});
  const { h, a } = finalScore(m);
  const row = (n: string) => t[n] ?? (t[n] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  const H = row(m.home);
  const A = row(m.away);
  H.p++; A.p++; H.gf += h; H.ga += a; A.gf += a; A.ga += h;
  if (h > a) { H.w++; A.l++; H.pts += 3; } else if (a > h) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
}

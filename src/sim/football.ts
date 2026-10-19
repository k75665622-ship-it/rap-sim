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
  { id: 'eng', name: 'England · Top Flight', flag: '🏴', teams: [T('London Albion', 90), T('Manchester Athletic', 91), T('Liverpool Docks', 89), T('North London Rangers', 86), T('Thames United', 84), T('Manchester Rovers', 82), T('Newcastle Tyne', 79), T('Birmingham Forge', 75), T('Merseyside Wanderers', 74), T('Brighton Pier', 73), T('Leeds Northern', 70), T('Leicester Dynamo', 68), T('Wolverhampton Black Country', 71), T('Bournemouth Bay', 69), T('Bristol Harbour', 67), T('Sheffield Cutlers', 66), T('Sunderland Wear', 64), T('Norwich Broads', 63), T('Hull Humber', 62), T('Portsmouth Solent', 61)] },
  { id: 'esp', name: 'Spain · Primera', flag: '🇪🇸', teams: [T('Madrid Imperial', 92), T('Barcelona Mediterrani', 90), T('Madrid Castilla', 85), T('Sevilla Giralda', 79), T('Bilbao Ría', 78), T('San Sebastián Costa', 77), T('Valencia Turia', 74), T('Málaga Sol', 70), T('Vigo Atlántico', 68), T('Granada Alhambra', 66), T('Pamplona Navarra', 71), T('Mallorca Isla', 69), T('Getafe Sur', 68), T('Vitoria Álava', 67), T('Zaragoza Ebro', 66), T('Las Palmas Canarias', 65), T('A Coruña Galicia', 64), T('Cádiz Bahía', 63), T('Alicante Costa Blanca', 63), T('Valladolid Pisuerga', 62)] },
  { id: 'ita', name: 'Italy · Serie Prima', flag: '🇮🇹', teams: [T('Milano Duomo', 87), T('Torino Mole', 86), T('Napoli Vesuvio', 86), T('Milano Navigli', 85), T('Roma Imperiale', 81), T('Roma Tevere', 79), T('Bergamo Orobica', 80), T('Firenze Arno', 75), T('Bologna Torri', 73), T('Genova Lanterna', 68), T('Udine Friuli', 70), T('Como Lago', 69), T('Verona Arena', 68), T('Parma Ducale', 67), T('Cagliari Sardegna', 66), T('Sassuolo Ceramica', 66), T('Monza Brianza', 65), T('Lecce Salento', 64), T('Venezia Laguna', 64), T('Empoli Valdelsa', 63)] },
  { id: 'ger', name: 'Germany · First Division', flag: '🇩🇪', teams: [T('München Isar', 91), T('Dortmund Ruhr', 85), T('Leipzig Messe', 83), T('Leverkusen Rhein', 84), T('Frankfurt Main', 77), T('Berlin Spree', 72), T('Hamburg Hafen', 71), T('Stuttgart Neckar', 74), T('Köln Dom', 68), T('Bremen Weser', 69), T('Freiburg Breisgau', 74), T('Mönchengladbach Niederrhein', 73), T('Wolfsburg Werk', 72), T('Hoffenheim Kraichgau', 71), T('Mainz Karneval', 70), T('Augsburg Fugger', 68), T('Heidenheim Brenz', 66), T('Bochum Zeche', 64)] },
  { id: 'fra', name: 'France · Ligue Une', flag: '🇫🇷', teams: [T('Paris Seine', 90), T('Marseille Vieux-Port', 80), T('Monaco Riviera', 80), T('Lyon Rhône', 78), T('Lille Nord', 78), T('Nice Côte', 75), T('Lens Mineurs', 74), T('Rennes Bretagne', 73), T('Nantes Loire', 68), T('Bordeaux Garonne', 67), T('Brest Finistère', 72), T('Strasbourg Alsace', 72), T('Reims Champagne', 71), T('Toulouse Rose', 70), T('Montpellier Hérault', 69), T('Saint-Étienne Forez', 66), T('Auxerre Yonne', 65), T('Le Havre Estuaire', 64)] },
  { id: 'gha', name: 'Ghana · Top Flight', flag: '🇬🇭', teams: [T('Accra Lions', 72), T('Kumasi Royals', 73), T('Tema Harbour', 66), T('Cape Coast Mariners', 64), T('Takoradi Oilers', 63), T('Tamale Savannah', 61), T('Sunyani Forest', 60), T('Ho Volta', 59), T('Obuasi Gold', 62), T('Berekum Brong', 61), T('Kasoa Central', 60), T('Dansoman Coast', 59), T('Koforidua Eastern', 58), T('Techiman Bono', 58), T('Winneba Fishermen', 57), T('Nkawkaw Kwahu', 57), T('Bolgatanga Red Volta', 57), T('Wa Upper West', 56)] },
  { id: 'nga', name: 'Nigeria · Top Flight', flag: '🇳🇬', teams: [T('Lagos Eagles', 72), T('Abuja Stars', 70), T('Kano Sahel', 69), T('Ibadan Oluyole', 66), T('Port Harcourt Delta', 67), T('Enugu Coal City', 65), T('Benin Bronze', 62), T('Jos Plateau', 61), T('Ilorin Kwara', 64), T('Aba Commerce', 64), T('Calabar Cross River', 63), T('Uyo Akwa', 63), T('Owerri Imo', 62), T('Warri Delta Coast', 62), T('Kaduna Crocodiles', 61), T('Abeokuta Rock', 61), T('Makurdi Benue', 60), T('Akure Ondo', 60), T('Asaba Anioma', 60), T('Maiduguri Borno', 59)] },
  { id: 'ucl', name: 'European Champions Cup', flag: '🏆', teams: [] },
  { id: 'intl', name: 'Internationals', flag: '🌍', teams: [] },
  { id: 'pre', name: 'Pre-season', flag: '☀️', teams: [] },
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
  /** "Matchweek 12", "Group B · Matchday 3", "Semi-final"… */
  stage?: string;
  /** Knockout tie key (qf1…final). */
  ko?: string;
  /** Knockout draws: who won on penalties. */
  pens?: 'h' | 'a';
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
  /** The season the tables belong to (e.g. 2023 for 2023/24). */
  season?: number;
  /** Last day whose fixtures have been played or put on the board. */
  through?: number;
  cup?: CupState;
  /** Past winners, newest first. */
  honours?: { season: number; league: string; team: string }[];
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

// ─── SEASONS ───────────────────────────────────────────────────────────────
//
// Real football runs on a calendar, not a lottery. Each league plays a double
// round-robin from August to May — everyone meets everyone home and away, in
// an order drawn once per season — on weekends, with Friday and Monday games
// here and there. The Champions Cup has a group stage on Tuesday and Wednesday
// nights in the autumn, then quarter-finals, semi-finals and a final. June is
// the international window; July and early August are pre-season friendlies.
// Fixtures are a pure function of the date, so a fixture list can be shown
// weeks ahead and the same pairing comes round only when the calendar says so.

const DAY = 86400000;
const dayOf = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const weekdayOf = (serial: number) => new Date(serial * DAY).getUTCDay();
/** First serial on or after `serial` that falls on `weekday`. */
const onOrAfter = (serial: number, weekday: number) => serial + ((weekday - weekdayOf(serial) + 7) % 7);

function seeded(seed: string): Rng {
  let x = 2166136261;
  for (let i = 0; i < seed.length; i++) { x ^= seed.charCodeAt(i); x = Math.imul(x, 16777619); }
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], r: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Season `year` runs from 1 June `year` to 31 May `year + 1`. */
export function seasonYearOf(serial: number): number {
  const d = new Date(serial * DAY);
  return d.getUTCMonth() >= 5 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}
export const seasonLabel = (y: number) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;

interface Season { year: number; start: number; firstWeekend: number; lastWeekend: number; weekends: number[] }
const seasonCache = new Map<number, Season>();
export function seasonInfo(year: number): Season {
  const hit = seasonCache.get(year);
  if (hit) return hit;
  const firstWeekend = onOrAfter(dayOf(year, 8, 10), 6); // the second Saturday of August, or so
  const lastWeekend = onOrAfter(dayOf(year + 1, 5, 17), 6) ; // mid/late May
  const weekends: number[] = [];
  for (let s = firstWeekend; s <= lastWeekend; s += 7) weekends.push(s);
  const out = { year, start: dayOf(year, 6, 1), firstWeekend, lastWeekend, weekends };
  seasonCache.set(year, out);
  return out;
}

/**
 * Circle-method double round-robin: every pair meets twice, once at each
 * ground. Home and away are handed out so nobody strings together a run of
 * home games, and the second half of the season reverses the first.
 */
function doubleRoundRobin(teams: string[]): [string, string][][] {
  const list = [...teams];
  if (list.length % 2) list.push('');
  const n = list.length;
  const rounds: [string, string][][] = [];
  const rot = list.slice(1);
  const streak = new Map<string, number>(); // +k = k home games in a row, -k = away
  const homes = new Map<string, number>();
  const cost = (h: string, a: string) => Math.max(0, streak.get(h) ?? 0) + Math.max(0, -(streak.get(a) ?? 0));
  for (let r = 0; r < n - 1; r++) {
    const order = [list[0], ...rot];
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = order[i];
      const b = order[n - 1 - i];
      if (!a || !b) continue;
      const ab = cost(a, b);
      const ba = cost(b, a);
      const aHome = ab < ba || (ab === ba && (homes.get(a) ?? 0) <= (homes.get(b) ?? 0));
      const [h, w] = aHome ? [a, b] : [b, a];
      pairs.push([h, w]);
      streak.set(h, Math.max(0, streak.get(h) ?? 0) + 1);
      streak.set(w, Math.min(0, streak.get(w) ?? 0) - 1);
      homes.set(h, (homes.get(h) ?? 0) + 1);
    }
    rounds.push(pairs);
    rot.unshift(rot.pop()!);
  }
  return [...rounds, ...rounds.map((rd) => rd.map(([h, a]) => [a, h] as [string, string]))];
}

const scheduleCache = new Map<string, [string, string][][]>();
function leagueRounds(league: string, year: number): [string, string][][] {
  const key = `${league}|${year}`;
  const hit = scheduleCache.get(key);
  if (hit) return hit;
  const teams = shuffle(LEAGUE_BY_ID[league].teams.map((t) => t.name), seeded(`draw|${key}`));
  const first = doubleRoundRobin(teams);
  // The return fixtures don't come in the same order as the first meetings:
  // start the second half from a different point in the cycle.
  const half = first.length / 2;
  const back = first.slice(half);
  const cut = 1 + Math.floor(seeded(`second|${key}`)() * (half - 2));
  const out = [...first.slice(0, half), ...back.slice(cut), ...back.slice(0, cut)];
  scheduleCache.set(key, out);
  return out;
}

/** Kickoffs for one league round: [day offset from Saturday, minutes past midnight]. */
const ROUND_SLOTS: Record<string, [number, number][]> = {
  eng: [[0, 750], [0, 900], [0, 900], [0, 900], [0, 1050], [1, 840], [1, 990], [2, 1200]],
  esp: [[-1, 1260], [0, 840], [0, 975], [0, 1200], [1, 840], [1, 1110], [1, 1260], [2, 1260]],
  ita: [[-1, 1245], [0, 900], [0, 1080], [0, 1185], [1, 750], [1, 900], [1, 1245], [2, 1245]],
  ger: [[-1, 1230], [0, 930], [0, 930], [0, 930], [0, 1110], [1, 930], [1, 1050]],
  fra: [[-1, 1260], [0, 1020], [0, 1260], [1, 900], [1, 1020], [1, 1245]],
  gha: [[0, 900], [1, 900], [1, 900], [1, 960]],
  nga: [[0, 960], [1, 960], [1, 960], [1, 960]],
};

/** Which round (if any) a league plays on the weekend of `saturday`. */
function roundOnWeekend(league: string, year: number, saturday: number): number | null {
  const s = seasonInfo(year);
  const R = leagueRounds(league, year).length;
  const W = s.weekends.length;
  // Spread the rounds over the season's weekends, with breaks where real
  // calendars have them (internationals, the winter lull) falling out naturally.
  const w = s.weekends.indexOf(saturday);
  if (w < 0) return null;
  for (let k = 0; k < R; k++) if (Math.round((k * (W - 1)) / (R - 1)) === w) return k;
  return null;
}

// ─── THE CUP ───────────────────────────────────────────────────────────────

export interface CupState {
  season: number;
  /** Group-stage table, keyed by team. */
  table: Record<string, TableRow>;
  /** Knockout winners by tie: qf1..qf4, sf1, sf2, final. */
  ko: Record<string, string>;
}

export function cupGroups(year: number): string[][] {
  const pool = cupTeams().sort((a, b) => b.strength - a.strength).slice(0, 16);
  const r = seeded(`cup|${year}`);
  const pots = [0, 1, 2, 3].map((p) => shuffle(pool.slice(p * 4, p * 4 + 4), r));
  return [0, 1, 2, 3].map((g) => pots.map((pot) => pot[g].name));
}
export const GROUP_NAMES = ['A', 'B', 'C', 'D'];

function cupDates(year: number) {
  const tue = (m: number, d: number, y = year) => onOrAfter(dayOf(y, m, d), 2);
  return {
    groups: [tue(9, 16), tue(9, 30), tue(10, 21), tue(11, 4), tue(11, 25), tue(12, 9)],
    qf: tue(3, 3, year + 1),
    sf: tue(4, 28, year + 1),
    final: onOrAfter(dayOf(year + 1, 5, 30), 6),
  };
}

export function groupStandings(cup: CupState | undefined, year: number): { group: string; rows: [string, TableRow][] }[] {
  const blank = (): TableRow => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  return cupGroups(year).map((teams, i) => ({
    group: GROUP_NAMES[i],
    rows: teams.map((t) => [t, cup?.season === year ? cup.table[t] ?? blank() : blank()] as [string, TableRow]).sort((a, b) => sortRows(a[1], b[1])),
  }));
}

export function sortRows(a: TableRow, b: TableRow): number {
  return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
}

// ─── INTERNATIONALS AND FRIENDLIES ─────────────────────────────────────────

const NATIONS = [T('Spain', 90), T('France', 91), T('England', 88), T('Brazil', 89), T('Argentina', 90), T('Portugal', 86), T('Germany', 85), T('Netherlands', 84), T('Italy', 83), T('Morocco', 80), T('Senegal', 78), T('Nigeria', 76), T('Ghana', 73), T('Côte d\'Ivoire', 76), T('Cameroon', 72), T('USA', 77), T('Mexico', 76), T('Japan', 79), T('South Africa', 68), T('Egypt', 74)];
const STRENGTH = new Map<string, number>([...LEAGUES.flatMap((l) => l.teams), ...NATIONS].map((t) => [t.name, t.strength]));
export const strengthOf = (team: string) => STRENGTH.get(team) ?? 70;

// ─── A DAY'S FIXTURES ──────────────────────────────────────────────────────

interface Fixture { league: string; home: string; away: string; kickoff: number; stage: string; ko?: string }

function makeMatch(id: string, f: Fixture, r: Rng): Match {
  const form = () => (r() - 0.5) * 6;
  const neutral = f.ko === 'final';
  const [lh, la] = expectedGoals(strengthOf(f.home) + form() + (neutral ? 0 : 2), strengthOf(f.away) + form());
  const hg = goalCount(lh, r);
  const ag = goalCount(la, r);
  const goals: Match['goals'] = [
    ...Array.from({ length: hg }, () => ({ m: 1 + Math.floor(r() * 93), side: 'h' as const })),
    ...Array.from({ length: ag }, () => ({ m: 1 + Math.floor(r() * 93), side: 'a' as const })),
  ].sort((a, b) => a.m - b.m);
  const m: Match = { id, league: f.league, home: f.home, away: f.away, kickoff: f.kickoff, odds: oddsFor(lh, la), goals, stage: f.stage };
  if (f.ko) {
    m.ko = f.ko;
    // A draw in a knockout goes to penalties: the better side edges it.
    if (hg === ag) m.pens = r() < 0.5 + (strengthOf(f.home) - strengthOf(f.away)) / 80 ? 'h' : 'a';
  }
  return m;
}

/** The fixtures on a day. Knockout ties need the cup's results so far. */
function fixturesOn(serial: number, cup: CupState | undefined): Fixture[] {
  const year = seasonYearOf(serial);
  const s = seasonInfo(year);
  const wd = weekdayOf(serial);
  const out: Fixture[] = [];
  const at = (mins: number) => serial * 1440 + mins;

  // League rounds: find the weekend this day belongs to (Fri..Mon around a Saturday).
  for (const off of [-1, 0, 1, 2]) {
    const saturday = serial - off;
    if (weekdayOf(saturday) !== 6) continue;
    for (const lg of Object.keys(ROUND_SLOTS)) {
      const k = roundOnWeekend(lg, year, saturday);
      if (k === null) continue;
      const pairs = leagueRounds(lg, year)[k];
      const slots = ROUND_SLOTS[lg];
      // Spread the round's games over its slots, keeping the order stable.
      pairs.forEach(([h, a], i) => {
        const slot = slots[Math.round((i * (slots.length - 1)) / Math.max(1, pairs.length - 1))];
        if (slot[0] !== off) return;
        out.push({ league: lg, home: h, away: a, kickoff: at(slot[1]), stage: `Matchweek ${k + 1}` });
      });
    }
  }

  // The cup.
  const cd = cupDates(year);
  const groups = cupGroups(year);
  cd.groups.forEach((tue, md) => {
    for (const [gi, night] of [[0, tue], [1, tue], [2, tue + 1], [3, tue + 1]] as [number, number][]) {
      if (night !== serial) continue;
      const rounds = doubleRoundRobin(groups[gi]);
      rounds[md].forEach(([h, a], i) => out.push({ league: 'ucl', home: h, away: a, kickoff: at(gi % 2 === 0 && i === 0 ? 1125 : 1260), stage: `Group ${GROUP_NAMES[gi]} · Matchday ${md + 1}` }));
    }
  });
  const knockout = (ties: [string, () => [string, string] | null][], day: number, stage: string, kickoff: number) => {
    if (day !== serial) return;
    for (const [key, pair] of ties) {
      const p = pair();
      if (p) out.push({ league: 'ucl', home: p[0], away: p[1], kickoff: at(kickoff), stage, ko: key });
    }
  };
  const standing = (g: number, pos: number) => {
    const st = groupStandings(cup, year)[g].rows;
    return st.every(([, r]) => r.p >= 6) ? st[pos][0] : null;
  };
  const pair = (a: string | null | undefined, b: string | null | undefined) => (a && b ? [a, b] as [string, string] : null);
  const won = (k: string) => (cup?.season === year ? cup.ko[k] : undefined);
  knockout([['qf1', () => pair(standing(0, 0), standing(1, 1))], ['qf2', () => pair(standing(1, 0), standing(0, 1))]], cd.qf, 'Quarter-final', 1260);
  knockout([['qf3', () => pair(standing(2, 0), standing(3, 1))], ['qf4', () => pair(standing(3, 0), standing(2, 1))]], cd.qf + 1, 'Quarter-final', 1260);
  knockout([['sf1', () => pair(won('qf1'), won('qf3'))]], cd.sf, 'Semi-final', 1260);
  knockout([['sf2', () => pair(won('qf2'), won('qf4'))]], cd.sf + 1, 'Semi-final', 1260);
  knockout([['final', () => pair(won('sf1'), won('sf2'))]], cd.final, 'Final', 1260);

  // June: the international window. July to the first league weekend: pre-season.
  const month = new Date(serial * DAY).getUTCMonth();
  if (month === 5 && new Date(serial * DAY).getUTCDate() <= 21 && [2, 5, 6, 0].includes(wd)) {
    const r = seeded(`intl|${serial}`);
    const sides = shuffle(NATIONS.map((n) => n.name), r).slice(0, wd === 6 || wd === 0 ? 6 : 4);
    for (let i = 0; i + 1 < sides.length; i += 2) out.push({ league: 'intl', home: sides[i], away: sides[i + 1], kickoff: at([1080, 1170, 1245][i / 2 % 3]), stage: 'International friendly' });
  }
  if ((month === 6 || (month === 7 && serial < s.firstWeekend - 1)) && [3, 6, 0].includes(wd)) {
    const r = seeded(`pre|${serial}`);
    const clubs = shuffle(LEAGUES.filter((l) => l.id !== 'ucl').flatMap((l) => l.teams.map((t) => t.name)), r).slice(0, wd === 3 ? 4 : 8);
    for (let i = 0; i + 1 < clubs.length; i += 2) out.push({ league: 'pre', home: clubs[i], away: clubs[i + 1], kickoff: at([900, 1020, 1140, 1230][(i / 2) % 4]), stage: 'Pre-season friendly' });
  }
  return out.sort((a, b) => a.kickoff - b.kickoff);
}

/** A day's matches, with their results decided (and hidden until played). */
export function fixturesForDay(serial: number, cup: CupState | undefined, r: Rng): Match[] {
  return fixturesOn(serial, cup).map((f, i) => makeMatch(`m${serial}-${i}`, f, r));
}

/** Upcoming fixture list for a league without rolling results (for "next up"). */
export function upcomingFixtures(fromSerial: number, days: number, cup: CupState | undefined, league?: string): { league: string; home: string; away: string; kickoff: number; stage: string }[] {
  const out: { league: string; home: string; away: string; kickoff: number; stage: string }[] = [];
  for (let d = fromSerial; d < fromSerial + days; d++) for (const f of fixturesOn(d, cup)) if (!league || f.league === league) out.push(f);
  return out;
}

/** Who went through in a knockout match. */
export function koWinner(m: Match): string {
  const { h, a } = finalScore(m);
  if (h !== a) return h > a ? m.home : m.away;
  return m.pens === 'a' ? m.away : m.home;
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
  if (m.league === 'ucl' || m.league === 'intl' || m.league === 'pre') return;
  addRow(tables[m.league] ?? (tables[m.league] = {}), m);
}

/** Count a result in a table. */
export function addRow(t: Record<string, TableRow>, m: Match): void {
  const { h, a } = finalScore(m);
  const row = (n: string) => t[n] ?? (t[n] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  const H = row(m.home);
  const A = row(m.away);
  H.p++; A.p++; H.gf += h; H.ga += a; A.gf += a; A.ga += h;
  if (h > a) { H.w++; A.l++; H.pts += 3; } else if (a > h) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
}

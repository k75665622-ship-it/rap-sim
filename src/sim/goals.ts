// ─── MISSIONS, DAILY GOALS AND UNLOCKS (Stage 6) ───────────────────────────
// Progress is *derived* from the world wherever it can be (songs recorded,
// fans, money, mixes…), so no store action has to remember to report it. Only
// things the world doesn't keep — a clip shot, an open-mic night — are counted
// through goalEvent(). A daily goal is "metric now minus metric at dawn".
import type { GameScreen, GameState } from '../types/game';
import { isSongReleased } from './release';

export interface GoalsState {
  /** An older career: nothing is hidden and no tutorial is pushed. */
  legacy: boolean;
  showAll: boolean;
  counters: Record<string, number>;
  visited: Record<string, true>;
  /** Mission id → claimed. */
  claimed: Record<string, true>;
  day: number;
  base: Record<string, number>;
  daily: { id: string; claimed?: boolean }[];
  weekStart: number;
  weekBase: Record<string, number>;
  weekly: { id: string; claimed?: boolean };
  streak: number;
  best: number;
  lastDone: number;
  seenUnlocks: string[];
}

export type Metrics = Record<string, number>;

export interface Mission { id: string; title: string; hint: string; reward: number; go: GameScreen; done: (m: Metrics, g: GoalsState) => boolean }
export interface GoalDef { id: string; text: string; metric: string; target: number; reward: number; go: GameScreen; needs?: (m: Metrics) => boolean }

export function metricsOf(s: GameState, g?: GoalsState): Metrics {
  const mine = s.songs.filter((x) => !x.ownerId && !x.archivedAt);
  const p = s.player;
  const c = g?.counters ?? {};
  return {
    songs: mine.length,
    released: mine.filter((x) => isSongReleased(x)).length,
    mixes: mine.filter((x) => x.proMix || (x.engineerMix && x.engineerMix.status !== 'rough')).length,
    beats: (s.beats?.library ?? []).filter((b) => b.pattern).length,
    lessons: Object.keys(s.academy?.lessons ?? {}).length,
    videos: (s.videos ?? []).filter((v) => v.isPlayer && !v.removed).length,
    cuts: mine.filter((x) => x.directorCut).length,
    fans: p?.career.fanbase ?? 0,
    streams: p?.career.totalStreams ?? 0,
    earned: p?.career.totalEarnings ?? 0,
    money: p?.career.money ?? 0,
    shoots: c.shoots ?? 0,
    gigs: c.gigs ?? 0,
    training: c.training ?? 0,
    visitedCity: g?.visited.city ? 1 : 0,
    visitedKitchen: g?.visited.kitchen ? 1 : 0,
    visitedStudio: g?.visited.studio ? 1 : 0,
    visitedCharts: g?.visited.charts ? 1 : 0,
  };
}

export const MISSIONS: Mission[] = [
  { id: 'out', title: 'Step outside', hint: 'Open the city and take a walk.', reward: 50, go: 'city', done: (m) => m.visitedCity > 0 },
  { id: 'kitchen', title: "Say hi at Mama's Kitchen", hint: "Walk in to Mama's Kitchen and meet the regulars.", reward: 50, go: 'kitchen', done: (m) => m.visitedKitchen > 0 },
  { id: 'record', title: 'Record your first song', hint: 'Open the Studio, pick a beat and record.', reward: 200, go: 'studio', done: (m) => m.songs >= 1 },
  { id: 'release', title: 'Put it out', hint: 'Release your record so people can stream it.', reward: 300, go: 'studio', done: (m) => m.released >= 1 },
  { id: 'fan', title: 'Reach 100 fans', hint: 'Fans find released records. Post about it, play an open mic, or shoot a clip.', reward: 200, go: 'social_chirp', done: (m) => m.fans >= 100 },
  { id: 'shoot', title: 'Shoot a clip', hint: 'Go outside and press 🎬 Shoot a clip.', reward: 150, go: 'city', done: (m) => m.shoots >= 1 },
  { id: 'rival', title: 'Find your first rival', hint: 'Open the Charts and see who is above you.', reward: 100, go: 'charts', done: (m) => m.visitedCharts > 0 },
  { id: 'beat', title: 'Make your own beat', hint: 'Studio → Make a beat.', reward: 200, go: 'studio', done: (m) => m.beats >= 1 },
  { id: 'mix', title: 'Mix a record', hint: 'Open a record in the Studio vault and mix it.', reward: 250, go: 'studio', done: (m) => m.mixes >= 1 },
  { id: 'cut', title: "Cut a video in Director's Cut", hint: "Studio vault → ✂️ Director's Cut.", reward: 250, go: 'studio', done: (m) => m.cuts >= 1 },
];

export const DAILY_POOL: GoalDef[] = [
  { id: 'd-record', text: 'Record a song', metric: 'songs', target: 1, reward: 150, go: 'studio' },
  { id: 'd-beat', text: 'Make a beat', metric: 'beats', target: 1, reward: 120, go: 'studio' },
  { id: 'd-lesson', text: 'Finish an Academy lesson', metric: 'lessons', target: 1, reward: 100, go: 'studio' },
  { id: 'd-shoot', text: 'Shoot a clip in the city', metric: 'shoots', target: 1, reward: 100, go: 'city' },
  { id: 'd-gig', text: 'Play an open mic', metric: 'gigs', target: 1, reward: 120, go: 'city' },
  { id: 'd-train', text: 'Train a skill', metric: 'training', target: 1, reward: 80, go: 'training' },
  { id: 'd-mix', text: 'Mix a record', metric: 'mixes', target: 1, reward: 150, go: 'studio', needs: (m) => m.songs >= 1 },
  { id: 'd-release', text: 'Release a record', metric: 'released', target: 1, reward: 200, go: 'studio', needs: (m) => m.songs > m.released },
  { id: 'd-fans', text: 'Gain 25 fans', metric: 'fans', target: 25, reward: 120, go: 'social_chirp', needs: (m) => m.released >= 1 },
  { id: 'd-streams', text: 'Earn 1,000 streams', metric: 'streams', target: 1000, reward: 150, go: 'streams', needs: (m) => m.released >= 1 },
  { id: 'd-cut', text: "Edit a video in Director's Cut", metric: 'cuts', target: 1, reward: 150, go: 'studio', needs: (m) => m.songs >= 1 },
];
export const WEEKLY_POOL: GoalDef[] = [
  { id: 'w-songs', text: 'Record 3 songs this week', metric: 'songs', target: 3, reward: 800, go: 'studio' },
  { id: 'w-shoots', text: 'Shoot 3 clips this week', metric: 'shoots', target: 3, reward: 600, go: 'city' },
  { id: 'w-lessons', text: 'Finish 3 Academy lessons this week', metric: 'lessons', target: 3, reward: 700, go: 'studio' },
  { id: 'w-fans', text: 'Gain 150 fans this week', metric: 'fans', target: 150, reward: 900, go: 'social_chirp', needs: (m) => m.released >= 1 },
  { id: 'w-gigs', text: 'Play 3 open mics this week', metric: 'gigs', target: 3, reward: 700, go: 'city' },
];
export const STREAK_REWARDS: Record<number, number> = { 3: 300, 7: 1000, 14: 3000, 30: 10000 };

export const emptyGoals = (legacy: boolean, today: number, m: Metrics): GoalsState => ({
  legacy, showAll: legacy, counters: {}, visited: {}, claimed: {}, day: today - 1, base: m, daily: [], weekStart: today - 7, weekBase: m,
  weekly: { id: WEEKLY_POOL[0].id }, streak: 0, best: 0, lastDone: -99, seenUnlocks: [],
});

function rng(seed: number) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function pickDaily(day: number, m: Metrics): string[] {
  const r = rng(day * 7919 + 13);
  const pool = DAILY_POOL.filter((d) => !d.needs || d.needs(m));
  const out: string[] = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  return out;
}
export function pickWeekly(week: number, m: Metrics): string {
  const pool = WEEKLY_POOL.filter((d) => !d.needs || d.needs(m));
  return pool[Math.floor(rng(week * 104729 + 5)() * pool.length)].id;
}
export const dailyDef = (id: string) => DAILY_POOL.find((d) => d.id === id);
export const weeklyDef = (id: string) => WEEKLY_POOL.find((d) => d.id === id);
export const progress = (def: GoalDef, now: Metrics, base: Metrics) => Math.max(0, Math.min(def.target, (now[def.metric] ?? 0) - (base[def.metric] ?? 0)));

// ─── progressive unlocks ───────────────────────────────────────────────────
// What the sidebar shows. A new career sees the music first; the paperwork of
// the industry (tax, court, label, markets…) appears when the career needs it.
export const UNLOCK_NOTE: Partial<Record<GameScreen, string>> = {
  team: 'Hire help once you have a record out.', videos: 'Your music videos live here.', charts: 'See who is above you.', catalog: 'Everything you have released.',
  shows: 'Book real shows.', tax: 'Money is coming in, so the taxman is too.', interviews: 'People want to hear from you.', label: 'Labels are noticing you.',
  court: 'Contracts and disputes come with the money.', investments: 'Put your money to work.', awards: 'Your records can be nominated.', trophy_room: 'Where your trophies live.',
  retirement: 'Industry & Life: the long game.', careers: 'Other paths in life.', create_artist: 'Create other artists.', create_npc: 'Create other artists.', ai: 'The AI brain.',
};
export function isUnlocked(id: GameScreen, s: GameState, g: GoalsState | undefined, m: Metrics): boolean {
  if (!g || g.showAll || g.legacy) return true;
  const fame = Math.max(s.player?.career.localFame ?? 0, s.player?.career.nationalFame ?? 0);
  const earned = m.earned;
  switch (id) {
    case 'team': case 'videos': case 'catalog': return m.songs >= 1;
    case 'charts': case 'social_chirp': case 'social_snapgram': case 'social_clip': case 'social_circle': case 'shows': return m.released >= 1 || m.songs >= 1 && g.claimed.release === true;
    case 'tax': return earned >= 2000 || m.money >= 5000;
    case 'interviews': return fame >= 8 || m.released >= 2;
    case 'label': return !!s.label || fame >= 20 || m.released >= 3;
    case 'court': return (s.cases ?? []).length > 0 || !!s.label || fame >= 30;
    case 'investments': return m.money >= 10000 || earned >= 20000;
    case 'awards': return m.released >= 2 || fame >= 25 || Object.keys(s.awardSeasons ?? {}).length > 0;
    case 'trophy_room': return Object.keys(s.awardSeasons ?? {}).length > 0;
    case 'retirement': case 'careers': return fame >= 40 || earned >= 100000;
    case 'create_artist': case 'create_npc': case 'ai': return m.released >= 1;
    default: return true;
  }
}
export const GATED: GameScreen[] = ['team', 'videos', 'catalog', 'charts', 'social_chirp', 'social_snapgram', 'social_clip', 'social_circle', 'shows', 'tax', 'interviews', 'label', 'court', 'investments', 'awards', 'trophy_room', 'retirement', 'careers', 'create_artist', 'create_npc', 'ai'];

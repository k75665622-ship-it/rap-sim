// ─── AWARD SEASONS ─────────────────────────────────────────────────────────
//
// Every award body runs a real calendar: an eligibility year closes, the
// nominations are announced weeks before the night, fans vote in the public
// categories, campaigns are run, and then the ceremony happens on the clock —
// winners revealed one category at a time, the timeline reacting live.
//
// Nominees come from what actually happened in the eligibility window:
// streams, quality, chart peaks, features, videos, albums. A clean reputation
// helps with the academy; a scandal or a lost court case doesn't.
//
// Pure: the store owns the state. Body names are generic or fictional.

import type { Genre } from '../types/game';

export type Scope = 'country' | 'continental' | 'global';
export type CatKind = 'artist' | 'song' | 'new' | 'album' | 'collab' | 'video' | 'genre' | 'female' | 'male' | 'international';

export interface CategoryDef { id: string; name: string; kind: CatKind; genres?: Genre[]; fanVote?: boolean; major?: boolean }

export interface AwardBody {
  id: string;
  name: string;
  short: string;
  emoji: string;
  scope: Scope;
  country?: string;
  /** Ceremony on the first Saturday on/after this date. */
  month: number;
  day: number;
  city: string;
  venue: string;
  prestige: number;
  categories: CategoryDef[];
  /** Ticket price for people who aren't invited. */
  ticket: number;
}

const RAP: Genre[] = ['hip_hop', 'drill', 'trap', 'conscious', 'pop_rap', 'grime', 'boom_bap', 'jazz_rap'];
const AFRO: Genre[] = ['afrobeats', 'amapiano', 'alte'];
const SUNG: Genre[] = ['rnb', 'neo_soul', 'pop'];

export function awardBodies(playerCountry: string): AwardBody[] {
  const list: AwardBody[] = [
    {
      id: 'gold_note', name: 'Gold Note Awards', short: 'Gold Notes', emoji: '🎺', scope: 'global', month: 2, day: 2, city: 'Los Angeles', venue: 'the Crystal Arena', prestige: 100, ticket: 4500,
      categories: [
        { id: 'record', name: 'Record of the Year', kind: 'song', major: true },
        { id: 'album', name: 'Album of the Year', kind: 'album', major: true },
        { id: 'new', name: 'Best New Artist', kind: 'new', major: true },
        { id: 'rap', name: 'Best Rap Performance', kind: 'genre', genres: RAP },
        { id: 'african', name: 'Best African Music Performance', kind: 'genre', genres: [...AFRO, 'highlife', 'dancehall', 'reggae'] },
        { id: 'melodic', name: 'Best R&B / Melodic Performance', kind: 'genre', genres: SUNG },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
        { id: 'video', name: 'Best Music Video', kind: 'video' },
      ],
    },
    {
      id: 'urban_culture', name: 'Urban Culture Awards', short: 'UCAs', emoji: '🔥', scope: 'global', month: 6, day: 22, city: 'Los Angeles', venue: 'the Palms Theater', prestige: 75, ticket: 1800,
      categories: [
        { id: 'intl', name: 'Best International Act', kind: 'international', major: true },
        { id: 'hiphop', name: 'Best Hip-Hop Artist', kind: 'genre', genres: RAP },
        { id: 'rnb', name: 'Best R&B Artist', kind: 'genre', genres: SUNG },
        { id: 'viewers', name: 'Viewers\' Choice', kind: 'artist', fanVote: true, major: true },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
      ],
    },
    {
      id: 'african', name: 'African Music Awards', short: 'AMAs', emoji: '🌍', scope: 'continental', month: 11, day: 15, city: 'Kigali', venue: 'the Convention Centre', prestige: 70, ticket: 600,
      categories: [
        { id: 'artist', name: 'Artist of the Year', kind: 'artist', major: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true, fanVote: true },
        { id: 'male', name: 'Best Male Artist', kind: 'male' },
        { id: 'female', name: 'Best Female Artist', kind: 'female' },
        { id: 'newcomer', name: 'Best Newcomer', kind: 'new' },
        { id: 'hiphop', name: 'Best Hip-Hop', kind: 'genre', genres: RAP },
        { id: 'afro', name: 'Best Afrobeats', kind: 'genre', genres: AFRO },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
      ],
    },
    {
      id: 'ghana', name: 'Ghana Music Awards', short: 'GMAs', emoji: '🇬🇭', scope: 'country', country: 'Ghana', month: 5, day: 4, city: 'Accra', venue: 'the Grand Arena', prestige: 55, ticket: 120,
      categories: [
        { id: 'artiste', name: 'Artiste of the Year', kind: 'artist', major: true, fanVote: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
        { id: 'album', name: 'Album of the Year', kind: 'album' },
        { id: 'new', name: 'New Artiste of the Year', kind: 'new', fanVote: true },
        { id: 'hiphop', name: 'Hip-Hop/Rap Song of the Year', kind: 'genre', genres: RAP },
        { id: 'afro', name: 'Afrobeats Song of the Year', kind: 'genre', genres: AFRO },
        { id: 'highlife', name: 'Highlife Song of the Year', kind: 'genre', genres: ['highlife'] },
        { id: 'reggae', name: 'Reggae/Dancehall Song of the Year', kind: 'genre', genres: ['reggae', 'dancehall'] },
        { id: 'gospel', name: 'Gospel Song of the Year', kind: 'genre', genres: ['gospel'] },
        { id: 'collab', name: 'Collaboration of the Year', kind: 'collab' },
        { id: 'video', name: 'Music Video of the Year', kind: 'video' },
      ],
    },
    {
      id: 'nigeria', name: 'Nigeria Music Awards', short: 'NMAs', emoji: '🇳🇬', scope: 'country', country: 'Nigeria', month: 9, day: 7, city: 'Lagos', venue: 'the Eko Hall', prestige: 55, ticket: 150,
      categories: [
        { id: 'artiste', name: 'Artiste of the Year', kind: 'artist', major: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
        { id: 'next', name: 'Next Rated', kind: 'new', fanVote: true },
        { id: 'rap', name: 'Best Rap Single', kind: 'genre', genres: RAP },
        { id: 'afro', name: 'Best Afrobeats Single', kind: 'genre', genres: AFRO },
        { id: 'rnb', name: 'Best R&B Single', kind: 'genre', genres: SUNG },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
        { id: 'video', name: 'Best Music Video', kind: 'video' },
        { id: 'fans', name: 'Viewers\' Choice', kind: 'artist', fanVote: true },
      ],
    },
  ];
  if (playerCountry && playerCountry !== 'Ghana' && playerCountry !== 'Nigeria') {
    let h = 0;
    for (const c of playerCountry) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    list.push({
      id: `country_${playerCountry.toLowerCase().replace(/[^a-z]+/g, '_')}`, name: `${playerCountry} Music Awards`, short: `${playerCountry.slice(0, 3).toUpperCase()} Awards`, emoji: '🏅', scope: 'country', country: playerCountry,
      month: 3 + (h % 8), day: 1 + (h % 20), city: playerCountry, venue: 'the National Theatre', prestige: 50, ticket: 150,
      categories: [
        { id: 'artist', name: 'Artist of the Year', kind: 'artist', major: true, fanVote: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
        { id: 'new', name: 'Breakthrough Act', kind: 'new' },
        { id: 'rap', name: 'Best Hip-Hop', kind: 'genre', genres: RAP },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
        { id: 'video', name: 'Best Video', kind: 'video' },
      ],
    });
  }
  return list;
}

// ─── THE CALENDAR ──────────────────────────────────────────────────────────

const DAY = 86400000;
const dayOf = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const saturdayOnOrAfter = (s: number) => s + ((6 - new Date(s * DAY).getUTCDay() + 7) % 7);

export interface Calendar { year: number; ceremony: number; ceremonyMinute: number; nominations: number; votingCloses: number; windowStart: number; windowEnd: number }

/** The dates for a body's ceremony in a given year. */
export function calendarFor(body: AwardBody, year: number): Calendar {
  const ceremony = saturdayOnOrAfter(dayOf(year, body.month, body.day));
  const nominations = ceremony - 49 + ((2 - new Date((ceremony - 49) * DAY).getUTCDay() + 7) % 7); // a Tuesday ~7 weeks out
  // The eligibility year closes ~3 months before the night.
  const windowEnd = ceremony - 90;
  return { year, ceremony, ceremonyMinute: ceremony * 1440 + 19 * 60, nominations, votingCloses: ceremony - 7, windowStart: windowEnd - 365, windowEnd };
}

/** The next ceremony that hasn't happened yet (or is tonight). */
export function nextCalendar(body: AwardBody, today: number): Calendar {
  const y = new Date(today * DAY).getUTCFullYear();
  for (const yr of [y, y + 1]) {
    const c = calendarFor(body, yr);
    if (c.ceremony >= today) return c;
  }
  return calendarFor(body, y + 1);
}

// ─── NOMINATIONS ───────────────────────────────────────────────────────────

export interface Entrant { id: string; name: string; country: string; genre?: Genre; gender?: string; fame: number; isPlayer: boolean; real: boolean; debutSerial?: number }
export interface SongEntry { id: string; title: string; ownerId: string; genre: Genre; quality: number; streams: number; release: number; features: string[]; hasVideo: boolean; videoQuality?: number }
export interface AlbumEntry { id: string; title: string; ownerId: string; release: number; streams: number; quality: number }

export interface Nominee { id: string; name: string; isPlayer: boolean; real: boolean; songId?: string; work?: string; score: number; votes?: number }
export interface CategoryState { id: string; name: string; kind: CatKind; fanVote: boolean; major: boolean; nominees: Nominee[]; winnerId?: string }

export interface World {
  entrants: Map<string, Entrant>;
  songs: SongEntry[];
  albums: AlbumEntry[];
  playerId: string;
  /** Academy goodwill for the player: reputation, scandals, campaign. */
  playerAcademy: number;
}

function regionOk(body: AwardBody, e: Entrant | undefined): boolean {
  if (!e) return false;
  if (body.scope === 'country') return e.country === body.country;
  if (body.scope === 'continental') return AFRICA.has(e.country);
  return true;
}
const AFRICA = new Set(['Ghana', 'Nigeria', 'South Africa', 'Kenya', 'Tanzania', 'Uganda', 'Senegal', 'Côte d\'Ivoire', 'Ivory Coast', 'Cameroon', 'Rwanda', 'Ethiopia', 'Egypt', 'Morocco', 'Algeria', 'Tunisia', 'Mali', 'Burkina Faso', 'Togo', 'Benin', 'Sierra Leone', 'Liberia', 'Gambia', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Angola', 'Mozambique', 'DR Congo', 'Congo', 'Gabon', 'Malawi', 'Madagascar', 'Sudan', 'Niger', 'Guinea']);

const songScore = (s: SongEntry) => Math.log10(1 + s.streams) * 14 + s.quality * 0.9;

/** Pick the nominees for every category of one ceremony. */
export function nominate(body: AwardBody, cal: Calendar, w: World, rng: () => number): CategoryState[] {
  let inWindow = w.songs.filter((s) => s.release >= cal.windowStart && s.release <= cal.windowEnd && regionOk(body, w.entrants.get(s.ownerId)));
  // A thin year (a small scene, or the very start of a career) reaches back
  // another year rather than handing out awards to three people.
  if (new Set(inWindow.map((s) => s.ownerId)).size < 8) inWindow = w.songs.filter((s) => s.release >= cal.windowStart - 365 && s.release <= cal.windowEnd && regionOk(body, w.entrants.get(s.ownerId)));
  const best = new Map<string, SongEntry>();
  for (const s of inWindow) { const b = best.get(s.ownerId); if (!b || songScore(s) > songScore(b)) best.set(s.ownerId, s); }
  const artistScore = (id: string) => {
    const mine = inWindow.filter((s) => s.ownerId === id);
    const streams = mine.reduce((a, s) => a + s.streams, 0);
    const top = mine.reduce((a, s) => Math.max(a, s.quality), 0);
    const e = w.entrants.get(id)!;
    return Math.log10(1 + streams) * 16 + top * 0.6 + e.fame * 0.5 + mine.length * 2;
  };
  const noise = () => 0.88 + rng() * 0.24;
  const take = (list: Nominee[], n = 5) => list.map((x) => ({ ...x, score: x.score * noise() * (x.isPlayer ? w.playerAcademy : 1) })).sort((a, b) => b.score - a.score).slice(0, n);
  const out: CategoryState[] = [];
  for (const c of body.categories) {
    let pool: Nominee[] = [];
    const songNom = (s: SongEntry): Nominee => { const e = w.entrants.get(s.ownerId)!; return { id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, songId: s.id, work: s.title, score: songScore(s) }; };
    switch (c.kind) {
      case 'song': pool = [...best.values()].map(songNom); break;
      case 'genre': pool = [...best.values()].filter((s) => c.genres!.includes(s.genre)).map(songNom); break;
      case 'collab': pool = inWindow.filter((s) => s.features.length > 0).map(songNom); break;
      case 'video': pool = inWindow.filter((s) => s.hasVideo).map((s) => ({ ...songNom(s), score: (s.videoQuality ?? s.quality) * 1.2 + Math.log10(1 + s.streams) * 6 })); break;
      case 'album': pool = w.albums.filter((a) => a.release >= cal.windowStart && a.release <= cal.windowEnd && regionOk(body, w.entrants.get(a.ownerId))).map((a) => { const e = w.entrants.get(a.ownerId)!; return { id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, work: a.title, score: Math.log10(1 + a.streams) * 14 + a.quality }; }); break;
      case 'new': pool = [...best.keys()].map((id) => w.entrants.get(id)!).filter((e) => e.fame < 55 && (e.debutSerial === undefined || cal.windowEnd - e.debutSerial < 600)).map((e) => ({ id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, work: best.get(e.id)!.title, songId: best.get(e.id)!.id, score: artistScore(e.id) })); break;
      case 'male': case 'female': pool = [...best.keys()].map((id) => w.entrants.get(id)!).filter((e) => e.gender === c.kind).map((e) => ({ id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, score: artistScore(e.id) })); break;
      case 'international': pool = [...best.keys()].map((id) => w.entrants.get(id)!).filter((e) => e.country !== 'USA' && e.country !== 'United States').map((e) => ({ id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, score: artistScore(e.id) })); break;
      default: pool = [...best.keys()].map((id) => ({ id, name: w.entrants.get(id)!.name, isPlayer: w.entrants.get(id)!.isPlayer, real: w.entrants.get(id)!.real, score: artistScore(id) }));
    }
    // One nomination per act per category.
    const seen = new Set<string>();
    pool = pool.sort((a, b) => b.score - a.score).filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
    const nominees = take(pool, c.major ? 6 : 5);
    if (nominees.length >= 3) out.push({ id: c.id, name: c.name, kind: c.kind, fanVote: !!c.fanVote, major: !!c.major, nominees: nominees.map((n) => ({ ...n, votes: c.fanVote ? 0 : undefined })) });
  }
  return out;
}

/** A day of fan voting: everyone's fans vote; the player's campaign adds to theirs. */
export function voteDay(cat: CategoryState, fans: (id: string) => number, rally: number, rng: () => number): void {
  for (const n of cat.nominees) {
    const base = Math.sqrt(Math.max(1, fans(n.id))) * (0.8 + rng() * 0.4);
    n.votes = Math.round((n.votes ?? 0) + base * (n.isPlayer ? 1 + rally : 1));
  }
}

/** The envelope. Academy categories weigh the work; fan categories count votes too. */
export function decide(cat: CategoryState, academy: number, rng: () => number): Nominee {
  const total = cat.nominees.reduce((a, n) => a + (n.votes ?? 0), 0) || 1;
  const top = Math.max(...cat.nominees.map((n) => n.score)) || 1;
  const scored = cat.nominees.map((n) => {
    const work = (n.score / top) * 100 * (n.isPlayer ? academy : 1);
    // The public vote counts for 60% where there is one; the academy for the rest.
    const s = cat.fanVote ? ((n.votes ?? 0) / total) * 100 * 0.6 + work * 0.4 * (0.9 + rng() * 0.2) : work * (0.85 + rng() * 0.3);
    return { n, s };
  });
  return scored.sort((a, b) => b.s - a.s)[0].n;
}

/** Share of the public vote, for the bars on the page. */
export function voteShare(cat: CategoryState, id: string): number {
  const total = cat.nominees.reduce((a, n) => a + (n.votes ?? 0), 0);
  return total ? Math.round(((cat.nominees.find((n) => n.id === id)?.votes ?? 0) / total) * 100) : 0;
}

/** What a win is worth to the player. */
export function winRewards(body: AwardBody, major: boolean): { fame: number; fansPct: number; momentum: number; reputation: number } {
  const p = body.prestige / 100;
  return { fame: Math.round((major ? 6 : 3) * (0.6 + p)), fansPct: (major ? 8 : 4) * p, momentum: Math.round((major ? 14 : 7) * (0.5 + p)), reputation: major ? 3 : 1 };
}

/** Red carpet: the fit is the story. */
export function carpetVerdict(drip: number, roll: number): { text: string; momentum: number; tag: 'best' | 'fine' | 'worst' } {
  const s = drip + (roll - 0.5) * 30;
  if (s >= 70) return { text: 'Every camera turned. You\'re on the best-dressed lists by morning.', momentum: 6, tag: 'best' };
  if (s >= 35) return { text: 'Clean fit, a few photos, a few nods. Nothing to fix.', momentum: 1, tag: 'fine' };
  return { text: 'The fit didn\'t land. The worst-dressed accounts are having fun with it.', momentum: -2, tag: 'worst' };
}

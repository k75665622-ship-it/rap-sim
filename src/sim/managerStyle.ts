// ─── WHAT KIND OF MANAGER THEY ARE ─────────────────────────────────────────
//
// "A manager" is not one job. In the real business there is the person who
// knows every artist's phone number, the one who fills your calendar, the one
// who only talks money, the one with an ear for records, the one who can get
// you on every radio show in the country, and the one who gets you out of the
// country. Each of them makes a different career, so each of them is built
// differently here:
//
//   · a SPECIALTY decides which doors they knock on every month,
//   · a REACH decides which countries they can actually work in,
//   · RULES are the things they will and will not do — the same rules the
//     monthly tick obeys, so the promise on the card is the behaviour.
//
// Your own standing still gates everything. A connector cannot get a global
// star on a song that is not good enough, and a road manager cannot sell out
// an arena for somebody nobody has heard of.
//
// Pure: the store owns the people and the money; this file decides.

import type { NPC, Genre, ArtistStats } from '../types/game';
import { hashString } from './rng';
import { traitsFor, managerNetwork } from './roles';
import { LOCATIONS, getCountry } from '../data/locations';

export type ManagerSpecialty = 'connector' | 'booker' | 'dealmaker' | 'creative' | 'hype' | 'global';

export interface SpecialtySpec {
  id: ManagerSpecialty;
  label: string;
  emoji: string;
  /** One line, for chips. */
  tagline: string;
  /** What they are for. */
  purpose: string;
  strengths: string[];
  weakness: string;
  /** What they will and won't do. The monthly tick follows these. */
  rules: string[];
  /** Added to the daily chance of a show offer. */
  showRate: number;
  /** Added to the weekly chance somebody asks you for a verse. */
  askRate: number;
  /** How far above your fame they can pitch you for a feature. */
  reachUp: number;
  /** Multiplies the monthly placement and paid-deal odds. */
  placeMult: number;
  dealMult: number;
  /** Share of offers they bring from abroad, once you can travel. */
  abroad: number;
}

export const SPECIALTIES: Record<ManagerSpecialty, SpecialtySpec> = {
  connector: {
    id: 'connector', label: 'The Connector', emoji: '🤝', tagline: 'Features & big names',
    purpose: 'Gets you in rooms with other artists: features, big features, co-signs and the remix with the name everyone knows.',
    strengths: ['Artists ask you for verses more often, and bigger ones', 'Every month or two they try to land you a verse from somebody above your level'],
    weakness: 'Fewer paid bookings than a road manager.',
    rules: ['Only pitches a record of yours that scores 55 or more — a weak song burns their contacts', 'Never pitches you to somebody you are at war with', 'Will not go more than a couple of tiers above you without a hit to show'],
    showRate: 0.02, askRate: 0.1, reachUp: 30, placeMult: 0.9, dealMult: 0.8, abroad: 0.1,
  },
  booker: {
    id: 'booker', label: 'The Road Manager', emoji: '🎟️', tagline: 'Shows, festivals & tours',
    purpose: 'Fills your calendar: club nights, headline dates, festival slots and tours that actually make money.',
    strengths: ['More show offers, in bigger rooms, with better billing', 'Festival slots when the season comes round'],
    weakness: 'Little pull with labels, brands and other artists.',
    rules: ['Never books you on a night you already have something', 'Will not put you in a room you cannot half-fill', 'Respects your rest day and minimum fee if you set them'],
    showRate: 0.09, askRate: 0, reachUp: 12, placeMult: 0.8, dealMult: 0.7, abroad: 0.15,
  },
  dealmaker: {
    id: 'dealmaker', label: 'The Dealmaker', emoji: '💼', tagline: 'Brand deals & money',
    purpose: 'Brings money in: endorsements, sync placements, appearance fees — and pushes every offer up before you see it.',
    strengths: ['Brand deals more often, and bigger', 'Film, TV and ad syncs for your released songs'],
    weakness: 'No ear for records; will not make your music better.',
    rules: ['Will not bring a brand that clashes with your image (gospel and betting do not mix)', 'Counters every lowball before it reaches you', 'Needs a real audience: brands buy reach'],
    showRate: 0.03, askRate: 0.02, reachUp: 15, placeMult: 0.8, dealMult: 1.8, abroad: 0.1,
  },
  creative: {
    id: 'creative', label: 'The Creative Director', emoji: '🎨', tagline: 'Records, producers & image',
    purpose: 'The music and the image: introductions to better producers, picking the single, playlists, syncs and how you look on camera.',
    strengths: ['Introduces producers above your level at a discount', 'Gets released records onto playlists'],
    weakness: 'Brings fewer paid shows and brand deals.',
    rules: ['Tells you straight when a record is not ready', 'Only pitches songs that score 58 or more for syncs', 'Will not book a producer you cannot afford'],
    showRate: 0.02, askRate: 0.03, reachUp: 18, placeMult: 1.3, dealMult: 0.7, abroad: 0.05,
  },
  hype: {
    id: 'hype', label: 'The Hype Machine', emoji: '📣', tagline: 'Radio, DJs, press & buzz',
    purpose: 'Attention: radio rotation, DJs, blogs, TV and the interview everybody watches.',
    strengths: ['Radio and DJ placements most months while you have a new release', 'Momentum fades slower; interview requests come more often'],
    weakness: 'Hype without new records burns out fast.',
    rules: ['Needs something released in the last two months to push', 'Will not fake a scandal for attention', 'Pushes one record at a time — your newest'],
    showRate: 0.04, askRate: 0.03, reachUp: 15, placeMult: 1.6, dealMult: 0.9, abroad: 0.05,
  },
  global: {
    id: 'global', label: 'The Global Operator', emoji: '🌍', tagline: 'Shows & features abroad',
    purpose: 'Takes you out of the country: shows abroad, foreign features, international press and the paperwork that comes with it.',
    strengths: ['Show offers and verse requests from other countries', 'Handles visas and travel — cheaper and safer trips'],
    weakness: 'Expensive, often away, and your home scene gets less attention.',
    rules: ['Only works abroad once you have a name at home (national fame 30+)', 'Will not send you abroad on less than three weeks\' notice', 'Prefers markets where your music already plays'],
    showRate: 0.03, askRate: 0.05, reachUp: 22, placeMult: 1, dealMult: 1, abroad: 0.6,
  },
};

export const SPECIALTY_LIST = Object.values(SPECIALTIES);

/**
 * Which kind of manager this person is. Derived from who they are — the id and
 * their visible characteristics — so it never changes between saves and two
 * managers with different characteristics genuinely work differently.
 */
export function managerSpecialty(npc: Pick<NPC, 'id' | 'tier'> & Partial<NPC>): ManagerSpecialty {
  const vis = traitsFor(npc as NPC).visible;
  const w: Record<ManagerSpecialty, number> = {
    connector: 18, booker: 18, dealmaker: 16, creative: 14, hype: 18,
    global: npc.tier === 'international' ? 30 : npc.tier === 'national' ? 9 : 3,
  };
  if (vis.includes('connected')) { w.connector += 26; w.global += 8; }
  if (vis.includes('brave')) w.booker += 26;
  if (vis.includes('smart')) w.dealmaker += 20;
  if (vis.includes('ruthless')) w.dealmaker += 14;
  if (vis.includes('creative')) w.creative += 26;
  if (vis.includes('meticulous')) w.creative += 12;
  if (vis.includes('charismatic')) w.hype += 26;
  if (vis.includes('risk_taker')) { w.hype += 8; w.global += 8; }
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let x = (hashString(`${npc.id}|specialty`) % 10_000) / 10_000 * total;
  for (const k of Object.keys(w) as ManagerSpecialty[]) {
    x -= w[k];
    if (x <= 0) return k;
  }
  return 'hype';
}

export function specialtyOf(npc: (Pick<NPC, 'id' | 'tier'> & Partial<NPC>) | null | undefined): SpecialtySpec | null {
  return npc ? SPECIALTIES[managerSpecialty(npc)] : null;
}

// ─── WHERE THEY CAN WORK ───────────────────────────────────────────────────

export type ReachScope = 'home' | 'continent' | 'world';
export interface ManagerReach { scope: ReachScope; label: string }

/** How far their phone book goes. */
export function managerReach(npc: NPC | null | undefined): ManagerReach {
  if (!npc) return { scope: 'home', label: 'Nobody is booking you anywhere.' };
  const net = managerNetwork(npc);
  const spec = managerSpecialty(npc);
  let scope: ReachScope = 'home';
  if (npc.tier === 'international' || (spec === 'global' && net >= 30)) scope = 'world';
  else if (spec === 'global' || (npc.tier === 'national' && net >= 50) || net >= 70) scope = 'continent';
  const cont = getCountry(npc.country)?.continent ?? 'their region';
  const label = scope === 'world' ? 'Anywhere in the world' : scope === 'continent' ? `Across ${cont}` : `${npc.country} only`;
  return { scope, label };
}

/** Can this manager put you in a room in that country? */
export function reachIncludes(reach: ManagerReach, managerCountry: string, playerCountry: string, country: string): boolean {
  if (country === playerCountry || country === managerCountry) return true;
  if (reach.scope === 'world') return true;
  if (reach.scope === 'continent') {
    const c = getCountry(country)?.continent;
    return !!c && (c === getCountry(playerCountry)?.continent || c === getCountry(managerCountry)?.continent);
  }
  return false;
}

/** The countries a manager could send you to, other than home. */
export function foreignMarkets(reach: ManagerReach, managerCountry: string, playerCountry: string): string[] {
  return LOCATIONS.map((c) => c.name).filter((c) => c !== playerCountry && reachIncludes(reach, managerCountry, playerCountry, c));
}

// ─── THE MONTH'S PITCHES ───────────────────────────────────────────────────

export type PitchKind = 'big_feature' | 'festival' | 'brand' | 'sync' | 'producer' | 'radio' | 'abroad_show' | 'abroad_feature' | 'playlist' | 'interview' | 'intro' | 'opener';

export const PITCH_LABEL: Record<PitchKind, { emoji: string; label: string }> = {
  big_feature: { emoji: '🤝', label: 'Feature pitch' },
  abroad_feature: { emoji: '🌍', label: 'Feature abroad' },
  festival: { emoji: '🎪', label: 'Festival slot' },
  abroad_show: { emoji: '✈️', label: 'Show abroad' },
  brand: { emoji: '💼', label: 'Brand deal' },
  sync: { emoji: '🎬', label: 'Sync placement' },
  producer: { emoji: '🎛️', label: 'Producer intro' },
  radio: { emoji: '📻', label: 'Radio push' },
  playlist: { emoji: '🎧', label: 'Playlist' },
  interview: { emoji: '🎙️', label: 'Press' },
  intro: { emoji: '🚪', label: 'Big-name intro' },
  opener: { emoji: '🎟️', label: 'Opening for a star' },
};

/** What each kind of manager tries first, then second. */
const PLAN: Record<ManagerSpecialty, PitchKind[]> = {
  connector: ['big_feature', 'big_feature', 'abroad_feature', 'producer'],
  booker: ['festival', 'festival', 'abroad_show', 'radio'],
  dealmaker: ['brand', 'sync', 'brand', 'festival'],
  creative: ['producer', 'playlist', 'sync', 'big_feature'],
  hype: ['radio', 'interview', 'playlist', 'brand'],
  global: ['abroad_show', 'abroad_feature', 'abroad_show', 'brand'],
};

export interface PitchGate {
  playerFame: number;
  nationalFame: number;
  fanbase: number;
  /** Best unreleased master's score, if any. */
  bestUnreleased?: number;
  /** Days since the newest release, if any. */
  daysSinceRelease?: number;
  bestReleased?: number;
}

/** Why a pitch can't happen right now — said out loud, because it is advice. */
export function pitchBlocked(kind: PitchKind, g: PitchGate): string | null {
  switch (kind) {
    case 'big_feature': case 'abroad_feature':
      if (g.bestUnreleased === undefined) return 'I had a name ready for a feature, but there is nothing in the vault to send them. Record something.';
      if (g.bestUnreleased < 55) return `The best thing in the vault scores ${Math.round(g.bestUnreleased)}. I am not spending a favour on that — make a better record and I will make the call.`;
      if (kind === 'abroad_feature' && g.nationalFame < 30) return 'Nobody abroad takes the call until you are a name at home.';
      return null;
    case 'festival':
      if (g.playerFame < 10) return 'Festivals want names on the poster. Get your numbers up and I will get you on one.';
      return null;
    case 'abroad_show':
      if (g.nationalFame < 30) return 'Promoters abroad ask what you have done at home. Build that first.';
      return null;
    case 'brand':
      if (g.playerFame < 18 && g.fanbase < 6000) return 'Brands buy audience. At your size nobody is paying yet — keep growing.';
      return null;
    case 'sync':
      if (g.bestReleased === undefined || g.bestReleased < 58) return 'Music supervisors only want finished, strong records. Nothing released is strong enough yet.';
      return null;
    case 'radio': case 'playlist':
      if (g.daysSinceRelease === undefined || g.daysSinceRelease > 60) return 'Nothing new to push. Radio and playlists want a fresh record.';
      return null;
    case 'producer':
      return null;
    case 'interview':
      if (g.playerFame < 8) return 'Press wants a story. Put something out first.';
      return null;
    case 'intro':
      if (g.playerFame < 15) return 'I could get you in a room with a big name — but right now they would ask who you are. Build a little more first.';
      if (g.bestReleased === undefined && g.bestUnreleased === undefined) return 'Nobody takes a meeting without music to play. Make records first.';
      return null;
    case 'opener':
      if (g.playerFame < 12) return 'Stars pick openers people have heard of. Not yet.';
      return null;
  }
}

/**
 * Which pitches they work on this month. One always; a second most months for
 * a well-connected manager. The plan is ordered by specialty, so a connector's
 * month is features and a road manager's is dates.
 */
export function monthPitches(spec: ManagerSpecialty, net: number, roll: number, month: number): PitchKind[] {
  const plan = PLAN[spec];
  const first = plan[month % 2];
  const out: PitchKind[] = [first];
  if (roll < 0.25 + net / 200) out.push(plan[2 + (month % 2)]);
  // The phone call only a connected manager can make: a room with a big name.
  const r2 = (roll * 7.31) % 1;
  if ((spec === 'connector' || spec === 'global') && net >= 50 && r2 < 0.2 + net / 300) out.push('intro');
  else if (net >= 70 && r2 < 0.12) out.push('intro');
  if ((spec === 'booker' || spec === 'connector') && ((roll * 3.7) % 1) < 0.25) out.push('opener');
  return out;
}

// ─── HOW A PITCH LANDS ─────────────────────────────────────────────────────

/** The craft stats an artist on the other end actually listens for. */
export function craftScore(stats: Partial<ArtistStats>, genreFamily: 'rap' | 'sung' | 'groove' | 'live'): number {
  const s = (k: keyof ArtistStats) => Number(stats[k] ?? 40);
  if (genreFamily === 'rap') return (s('lyricism') + s('flow') + s('delivery')) / 3;
  if (genreFamily === 'sung') return (s('vocalAbility') + s('songwriting') + s('delivery')) / 3;
  return (s('songwriting') + s('performance') + s('creativity')) / 3;
}

/**
 * Odds that an artist's camp says yes to a verse the manager pitched. The
 * record, your craft and the gap between you are the three things that matter;
 * the manager's network is what gets the record heard at all.
 */
export function bigFeatureOdds(i: { net: number; gap: number; songQuality: number; craft: number; relationship: number; sameGenre: boolean; real: boolean }): number {
  let p = 0.3 + i.net / 220 + (i.songQuality - 55) / 90 + (i.craft - 50) / 260 + i.relationship / 250 - Math.max(0, i.gap) / 110;
  if (i.sameGenre) p += 0.06;
  if (i.real) p -= 0.1; // the biggest camps say no to most things
  return Math.max(0.04, Math.min(0.85, p));
}

/** A manager gets a better price from somebody they know. */
export function managerFeatureDiscount(net: number): number {
  return Math.max(0.6, 0.92 - net / 400);
}

// ─── BRANDS ────────────────────────────────────────────────────────────────
// Invented, deliberately. No real company has endorsed anybody here.

export interface BrandSpec { name: string; kind: string; /** reputation on signing */ rep: number; /** genres it looks wrong on */ clash: Genre[]; shady?: boolean }

export const BRANDS: BrandSpec[] = [
  { name: 'Volta Energy', kind: 'energy drink', rep: 0, clash: ['gospel'] },
  { name: 'Aduke Mobile', kind: 'mobile network', rep: 1, clash: [] },
  { name: 'Kente Athletic', kind: 'sportswear', rep: 1, clash: [] },
  { name: 'Harmattan Coffee', kind: 'coffee', rep: 0, clash: [] },
  { name: 'Zongo Motors', kind: 'car dealership', rep: 0, clash: [] },
  { name: 'Black Star Beverages', kind: 'soft drinks', rep: 0, clash: [] },
  { name: 'Lagoon Bank', kind: 'bank', rep: 2, clash: ['drill'] },
  { name: 'Sankofa Sound', kind: 'headphones', rep: 1, clash: [] },
  { name: 'Afro Bites', kind: 'fast-food chain', rep: 0, clash: [] },
  { name: 'Savanna Lager', kind: 'beer', rep: -1, clash: ['gospel'] },
  { name: 'LuckyStake', kind: 'betting app', rep: -4, clash: ['gospel', 'conscious', 'neo_soul'], shady: true },
  { name: 'GlowRite', kind: 'skin cream', rep: -5, clash: ['gospel', 'conscious', 'alte', 'neo_soul', 'jazz_rap'], shady: true },
];

/** The brand a dealmaker would bring you — they filter the ones that would hurt you. */
export function pickBrand(genre: Genre, roll: number, careful: boolean): BrandSpec {
  const pool = BRANDS.filter((b) => !careful || (!b.shady && !b.clash.includes(genre)));
  return pool[Math.floor(roll * pool.length) % pool.length];
}

/** What a brand pays you, for how long. Sized by reach; the manager gets a better price. */
export function brandFee(i: { fame: number; fanbase: number; net: number; costIndex: number; dealmaker: boolean; roll: number }): number {
  const reach = i.fame * 220 + Math.sqrt(Math.max(0, i.fanbase)) * 70;
  const raw = reach * (0.6 + i.net / 140) * (i.dealmaker ? 1.35 : 1) * (0.75 + i.roll * 0.5) * Math.max(0.7, Math.min(2.2, i.costIndex));
  return Math.max(800, Math.round(raw / 100) * 100);
}

/** A sync: a film, a TV series, a game, an ad. Sized by the record and by you. */
export function syncFee(i: { fame: number; quality: number; costIndex: number; roll: number }): number {
  const raw = (1200 + i.fame * 160 + Math.max(0, i.quality - 55) * 140) * (0.7 + i.roll * 0.6) * Math.max(0.8, Math.min(2.4, i.costIndex));
  return Math.max(800, Math.round(raw / 100) * 100);
}

const SYNC_PLACES = ['a streaming-series finale', 'a Nollywood blockbuster\'s big scene', 'a football video game soundtrack', 'a phone company\'s national ad', 'a film festival darling\'s closing credits', 'a reality show\'s season trailer'];
export function syncPlace(roll: number): string { return SYNC_PLACES[Math.floor(roll * SYNC_PLACES.length) % SYNC_PLACES.length]; }

const STATIONS = ['the biggest drive-time show in the country', 'a national breakfast show', 'the top late-night mix show', 'every major club DJ\'s set this weekend', 'a 24-hour urban station\'s rotation'];
export function radioSlot(roll: number): string { return STATIONS[Math.floor(roll * STATIONS.length) % STATIONS.length]; }

const PLAYLISTS = ['the platform\'s biggest new-music playlist', 'a "Fresh Finds" editorial list', 'a workout playlist with millions of followers', 'the country\'s Top Hits editorial playlist', 'a late-night chill list that everybody saves'];
export function playlistSlot(roll: number): string { return PLAYLISTS[Math.floor(roll * PLAYLISTS.length) % PLAYLISTS.length]; }

/** One sentence on what this manager does, for cards. */
export function specialtyLine(npc: NPC | null | undefined): string {
  const s = specialtyOf(npc);
  if (!s || !npc) return '';
  return `${s.emoji} ${s.label} — ${s.tagline}. ${managerReach(npc).label}.`;
}

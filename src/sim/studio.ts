// ─── STUDIO ENGINE ────────────────────────────────────────────────────────
// Turns a recording session into a set of sub-scores and a quality figure.
//
// Design rule that matters: the player never sees a number come out of here.
// Everything the UI shows is a qualitative read (`describeScore`). The raw
// figures exist so the simulation and the chart model can use them, not so the
// player can min-max a formula.

import { GENRE_LIST, MELODIC_GENRES } from '../data/genres';
import type {
  ArtistStats, Genre, NPC, SongMood, VocalSettings,
} from '../types/game';

// ─── MOODS ────────────────────────────────────────────────────────────────

export interface MoodDef {
  id: SongMood;
  label: string;
  emoji: string;
  blurb: string;
  /** How much this register pulls toward critics vs the general public. */
  criticalBias: number;
  commercialBias: number;
  /** Moods read better in some genres. */
  strongGenres?: Genre[];
}

export const MOODS: MoodDef[] = [
  {
    id: 'aggressive', label: 'Aggressive', emoji: '🔥',
    blurb: 'Chest out, bars up. Built for the gym and the block.',
    criticalBias: 0, commercialBias: 6,
    strongGenres: ['drill', 'trap', 'grime', 'rock'],
  },
  {
    id: 'melancholy', label: 'Melancholy', emoji: '🌧️',
    blurb: 'Slow, heavy, honest. The kind of song people replay at 3am.',
    criticalBias: 12, commercialBias: -4,
    strongGenres: ['conscious', 'hip_hop', 'rnb', 'neo_soul', 'jazz_rap', 'boom_bap'],
  },
  {
    id: 'celebratory', label: 'Celebratory', emoji: '🥳',
    blurb: 'Winning music. Made for windows down and rooms full of people.',
    criticalBias: -6, commercialBias: 14,
    strongGenres: ['afrobeats', 'dancehall', 'pop_rap', 'amapiano', 'highlife', 'pop', 'latin', 'gospel', 'reggae'],
  },
  {
    id: 'introspective', label: 'Introspective', emoji: '🪞',
    blurb: 'You talking to yourself and letting everyone listen.',
    criticalBias: 16, commercialBias: -6,
    strongGenres: ['conscious', 'hip_hop', 'alte', 'neo_soul', 'jazz_rap', 'rnb'],
  },
  {
    id: 'sensual', label: 'Sensual', emoji: '🌙',
    blurb: 'Late night, low light, no rush.',
    criticalBias: -4, commercialBias: 10,
    strongGenres: ['afrobeats', 'dancehall', 'rnb', 'neo_soul', 'latin', 'alte'],
  },
  {
    id: 'defiant', label: 'Defiant', emoji: '✊',
    blurb: 'Against the odds, on the record. The underdog anthem.',
    criticalBias: 8, commercialBias: 8,
    strongGenres: ['drill', 'grime', 'conscious', 'rock', 'reggae', 'gospel'],
  },
];

export function getMood(id: SongMood | undefined): MoodDef {
  return MOODS.find(m => m.id === id) ?? MOODS[0];
}

// ─── PRODUCERS ────────────────────────────────────────────────────────────

/**
 * Producers are pulled from the live roster rather than a hardcoded list, so
 * every country's scene has its own beatmakers.
 *
 * NPCs carry `fame` but no explicit production skill, so skill is derived:
 * fame is the dominant term, tier is a credibility bonus, and a deterministic
 * hash of the id keeps a given producer's number stable across sessions (the
 * roster is regenerated, never saved, so this must not use randomness).
 */
export interface ProducerOption {
  id: string;
  name: string;
  skill: number;        // 0-100
  tier: NPC['tier'];
  country: string;
  /** What they bring to a record, in plain language. */
  specialty: string;
}

function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

const PRODUCER_SPECIALTIES = [
  'Known for hard, minimal drums — leaves room for the vocal.',
  'Builds lush, layered records. Big on melody.',
  'Lives in the low end. Everything he touches knocks.',
  'Loops and samples. Warm, dusty, unmistakably him.',
  'Fast worker. Quantity as a strategy.',
  'Takes three weeks and delivers something strange and great.',
  'The safe pair of hands — never misses, rarely surprises.',
  'Engineer first. Cleanest mixes in the city.',
];

/** Derive a producer's skill from their roster entry. Deterministic. */
export function producerSkillOf(npc: NPC): number {
  const tierBonus = npc.tier === 'international' ? 12 : npc.tier === 'national' ? 6 : 0;
  const jitter = (stableHash(npc.id) % 17) - 8; // -8..+8, stable per id
  return Math.max(
    18,
    Math.min(99, Math.round(28 + npc.fame * 0.55 + tierBonus + jitter)),
  );
}

/** The production houses and beatmakers available to the player. */
export function getProducerOptions(npcs: NPC[]): ProducerOption[] {
  const producers = npcs.filter(
    n => n.role === 'producer' || n.role === 'engineer',
  );
  const opts: ProducerOption[] = producers.map(npc => {
    const h = stableHash(npc.id);
    return {
      id: npc.id,
      name: npc.name,
      skill: producerSkillOf(npc),
      tier: npc.tier,
      country: npc.country,
      specialty: PRODUCER_SPECIALTIES[h % PRODUCER_SPECIALTIES.length],
    };
  });
  opts.sort((a, b) => b.skill - a.skill);
  return opts;
}

/**
 * What a producer charges for a session.
 *
 * The curve is anchored at a handful of real price points and interpolated in
 * log space, which does two things the old power curve could not:
 *
 *  - the bottom of the range is genuinely cheap. A kid with a laptop and a
 *    cracked copy of a DAW charges $50, not $950, so a broke newcomer can
 *    actually get in the booth on day one.
 *  - the top end still costs like the top end. Skill 90 is not "40% better"
 *    than skill 65, it is several times the money.
 *
 * `skill` is 0-100. Anchors are [skill, dollars].
 *
 * RESCALED after measurement. The table used to run to $48,000, which put a
 * skill-79 producer at roughly $11,200 for a session — and a session is the
 * beat fee plus 55% of it again for the mix, so that one hire cost about
 * $18,300. The record it produced then earned $739 in its first twenty-six
 * weeks. Nothing can recoup a fee that is twenty-five times the revenue of the
 * thing it is charging for, so the entire mid-and-upper producer market was a
 * trap: measured across four tiers, spending more on a producer made the
 * player strictly poorer, and the only profitable strategy was spamming the
 * cheapest possible record.
 *
 * These anchors keep the shape — cheap at the bottom, steep at the top, which
 * is the whole point of the log interpolation — but put the top of the market
 * within reach of what a record can actually earn. The top end is still a
 * genuine commitment; it is no longer arithmetic that cannot work.
 */
export const PRODUCER_FEE_ANCHORS: Array<[number, number]> = [
  [0, 50],
  [20, 100],
  [35, 220],
  [50, 500],
  [65, 1_300],
  [80, 3_200],
  [90, 6_500],
  [100, 13_000],
];

export function producerFee(skill: number): number {
  const s = Math.max(0, Math.min(100, skill));
  const anchors = PRODUCER_FEE_ANCHORS;

  let lo = anchors[0];
  let hi = anchors[anchors.length - 1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (s >= anchors[i][0] && s <= anchors[i + 1][0]) {
      lo = anchors[i];
      hi = anchors[i + 1];
      break;
    }
  }

  const span = hi[0] - lo[0];
  const t = span === 0 ? 0 : (s - lo[0]) / span;
  const fee = Math.exp(Math.log(lo[1]) + t * (Math.log(hi[1]) - Math.log(lo[1])));

  // Round to something a person would actually quote.
  return Math.round(fee / 10) * 10;
}

/** A short band label for the producer picker. */
export function producerPriceBand(skill: number): string {
  if (skill >= 88) return 'Legend';
  if (skill >= 74) return 'Top tier';
  if (skill >= 58) return 'Pro';
  if (skill >= 42) return 'Working';
  if (skill >= 28) return 'Budget';
  return 'Bedroom';
}

// ─── SESSION EFFORT ───────────────────────────────────────────────────────
//
// How long you book the room for. The cost and the calendar days are the same
// numbers the store charges at record time — they live here, once, because the
// editor, the vault's re-record panel and `createStudioSong` all have to agree
// on what a session costs. Two copies of this table is how a preview starts
// lying about the price.

export type SessionEffort = 1 | 2 | 3;

export interface EffortOption {
  id: SessionEffort;
  label: string;
  desc: string;
  /** Game days the session eats. */
  days: number;
  /** Studio time only — the producer's fee is separate. */
  cost: number;
  emoji: string;
}

export const EFFORT_OPTIONS: EffortOption[] = [
  { id: 1, label: 'Quick Drop', desc: 'One session. Rough around the edges.', days: 1, cost: 150, emoji: '⚡' },
  { id: 2, label: 'Standard', desc: 'Take your time with it.', days: 3, cost: 450, emoji: '🎵' },
  { id: 3, label: 'Full Effort', desc: 'Live in the booth until it is right.', days: 6, cost: 900, emoji: '💎' },
];

/** Studio time for a session, before the producer's fee. */
export function sessionCost(effort: SessionEffort): number {
  return EFFORT_OPTIONS.find((e) => e.id === effort)?.cost ?? 450;
}

/** Game days a session costs. */
export function sessionDays(effort: SessionEffort): number {
  return EFFORT_OPTIONS.find((e) => e.id === effort)?.days ?? 3;
}

// ─── BEATS ────────────────────────────────────────────────────────────────

const BEAT_PREFIX = [
  'Concrete', 'Midnight', 'Gold', 'Static', 'Velvet', 'Iron', 'Neon', 'Dust',
  'Chrome', 'Sacred', 'Broken', 'Liquid', 'Crimson', 'Hollow', 'Prime', 'Amber',
];
const BEAT_SUFFIX = [
  'Loop', 'Sessions', 'Type Beat', 'Flip', 'Bounce', 'Pocket', 'Drums', 'Groove',
  'Waves', 'Motion', 'Tape', 'Sequence',
];

/**
 * A producer's beat catalogue. Deterministic from their id, so the same
 * producer always has the same four beats across sessions — the roster is
 * regenerated rather than saved, so this cannot use randomness.
 */
export interface BeatOption {
  id: string;
  name: string;
  /** How well the beat itself is put together, 0-100. */
  quality: number;
}

export function getProducerBeats(producerId: string, skill: number): BeatOption[] {
  const h = stableHash(producerId);
  const beats: BeatOption[] = [];
  for (let i = 0; i < 4; i++) {
    const hi = stableHash(producerId + ':' + i);
    const prefix = BEAT_PREFIX[(h + hi) % BEAT_PREFIX.length];
    const suffix = BEAT_SUFFIX[(hi >>> 3) % BEAT_SUFFIX.length];
    // Beats vary around the producer's level — even a great producer has a
    // throwaway in the folder.
    const spread = ((hi >>> 7) % 21) - 10; // -10..+10
    beats.push({
      id: `${producerId}:beat${i}`,
      name: `${prefix} ${suffix}`,
      quality: Math.max(15, Math.min(99, Math.round(skill + spread))),
    });
  }
  return beats;
}

/** The beats available when you produce yourself — your own loops. */
export function getSelfProducedBeats(): BeatOption[] {
  return [
    { id: 'self:beat0', name: 'Your Loop #1', quality: 45 },
    { id: 'self:beat1', name: 'Your Loop #2', quality: 50 },
    { id: 'self:beat2', name: 'Your Loop #3', quality: 55 },
  ];
}

// ─── BPM ──────────────────────────────────────────────────────────────────

export interface BpmBand {
  min: number; max: number; label: string; note: string;
}

/** Tempo ranges, and which genres naturally sit in each. */
export const BPM_BANDS: BpmBand[] = [
  { min: 60, max: 75, label: 'Slow', note: 'Half-time, heavy, room to breathe.' },
  { min: 76, max: 90, label: 'Laid back', note: 'Head-nod tempo. Conversational flow.' },
  { min: 91, max: 105, label: 'Mid', note: 'The standard rap pocket.' },
  { min: 106, max: 125, label: 'Up', note: 'Driving. Good for hooks.' },
  { min: 126, max: 145, label: 'Fast', note: 'Double-time territory.' },
  { min: 146, max: 180, label: 'Frantic', note: 'Frantic. Only a few can hold this.' },
];

/** The tempo band a genre usually lives in — used to score fit. */
const GENRE_BPM_CENTER: Record<Genre, number> = Object.fromEntries(
  GENRE_LIST.map((g) => [g.id, g.bpm]),
) as Record<Genre, number>;

export function bpmBandFor(bpm: number): BpmBand {
  return BPM_BANDS.find(b => bpm >= b.min && bpm <= b.max) ?? BPM_BANDS[BPM_BANDS.length - 1];
}

/**
 * How well the tempo suits the genre, 0-1.
 *
 * A record can be made at any tempo, so this never zeroes out — it just costs
 * you. Sitting on the genre's natural centre scores 1; straying to the edge of
 * the plausible range drops toward 0.6.
 */
export function bpmFit(bpm: number, genre: Genre): number {
  const center = GENRE_BPM_CENTER[genre] ?? 100;
  const distance = Math.abs(bpm - center);
  // 35 BPM away is the edge of "someone could still make this work".
  return Math.max(0.55, 1 - (distance / 90));
}

// ─── LYRICS ───────────────────────────────────────────────────────────────

export interface LyricAnalysis {
  words: number;
  lines: number;
  uniqueRatio: number;  // distinct words / total words
  /** Repetition score 0-100 — higher means more hook-like, lower means more varied. */
  hookiness: number;
  /** Depth read 0-100 — length plus vocabulary range, before skill is applied. */
  depth: number;
  /** A short human read on what the sheet looks like. */
  note: string;
}

const FILLER_WORDS = new Set([
  'yeah', 'uh', 'oh', 'ay', 'yo', 'la', 'na', 'mmm', 'huh', 'uhh', 'woah', 'ayy',
]);

/**
 * Read the lyric sheet. This is deliberately crude but honest — it measures
 * what is on the page (length, vocabulary spread, repetition) and lets the
 * player's `lyricism` stat decide whether that raw material became something.
 *
 * It does not try to judge quality of writing. That is what the stat is for.
 */
export function analyzeLyrics(text: string): LyricAnalysis {
  const trimmed = text.trim();
  if (!trimmed) {
    return { words: 0, lines: 0, uniqueRatio: 0, hookiness: 0, depth: 0, note: 'Empty page.' };
  }

  const rawWords = trimmed.toLowerCase().match(/[a-z'’]+/g) ?? [];
  const words = rawWords.length;
  const lines = trimmed.split('\n').filter(l => l.trim().length > 0).length;
  const content = rawWords.filter(w => !FILLER_WORDS.has(w));
  const unique = new Set(content);
  const uniqueRatio = content.length > 0 ? unique.size / content.length : 0;

  // Repetition is not a flaw — a chorus is repetition. High uniqueRatio means
  // written-out verses; low means a chant. Both are valid, so this only feeds
  // the hookiness read rather than punishing either side.
  const hookiness = Math.round(Math.max(0, Math.min(100, (1 - uniqueRatio) * 220)));

  // Depth: needs actual words before it counts for anything.
  const lengthScore = Math.min(1, words / 220);        // a full song is ~200+ words
  const vocabScore = Math.min(1, unique.size / 90);    // ~90 distinct words is rich
  const structureBonus = lines >= 12 ? 0.12 : lines >= 6 ? 0.06 : 0;
  const depth = Math.round(Math.min(100, (lengthScore * 0.55 + vocabScore * 0.45 + structureBonus) * 100));

  let note: string;
  if (words < 40) note = 'Barely a verse. This is a sketch, not a song.';
  else if (words < 100) note = 'Short. Could work if the hook carries it.';
  else if (uniqueRatio < 0.32) note = 'Very repetitive — reads like a chant or a hook on loop.';
  else if (uniqueRatio > 0.62) note = 'Dense writing. Every line is doing something.';
  else note = 'Reads like a complete song.';

  return {
    words, lines,
    uniqueRatio: Math.round(uniqueRatio * 100) / 100,
    hookiness, depth, note,
  };
}

// ─── VOCALS ───────────────────────────────────────────────────────────────

export const VOCAL_DEFAULTS: VocalSettings = {
  delivery: 60, energy: 60, pitch: 50, flow: 60, performance: 55,
};

export const VOCAL_LABELS: Record<keyof VocalSettings, { label: string; low: string; high: string; note: string }> = {
  delivery: {
    label: 'Delivery', low: 'Mumbled', high: 'Every word lands',
    note: 'How clearly and forcefully the bars arrive.',
  },
  energy: {
    label: 'Energy', low: 'Flat', high: 'On fire',
    note: 'How much you are actually giving the mic.',
  },
  pitch: {
    label: 'Pitch', low: 'Off-key', high: 'Locked in',
    note: 'Melodic tuning. Matters less in straight rap, more in hooks.',
  },
  flow: {
    label: 'Flow', low: 'Off-beat', high: 'Pocketed',
    note: 'Sitting in the pocket of the beat rather than on top of it.',
  },
  performance: {
    label: 'Performance', low: 'Rough take', high: 'One-take magic',
    note: 'The whole vocal as a single performance.',
  },
};

/** How much the booth sliders lifted the vocal above the raw stat. */
export function vocalSettingAverage(v: VocalSettings): number {
  return (v.delivery + v.energy + v.pitch + v.flow + v.performance) / 5;
}

// ─── SCORING ──────────────────────────────────────────────────────────────

export interface StudioInput {
  stats: ArtistStats;
  lyrics: string;
  genre: Genre;
  bpm: number;
  mood: SongMood;
  vocals: VocalSettings;
  producerSkill: number | null;   // null = self-produced
  /** Quality of the specific beat chosen, 0-100. */
  beatQuality: number;
  features: Array<{ npc: NPC; relationship: number }>;
  /** How much time and money the session got. */
  effort: 1 | 2 | 3;
  /**
   * Skill of a hired pen, when the lyrics were not written by the artist.
   * `null`/absent means the player wrote them, and the sheet is scored against
   * their own `lyricism`. A ghostwriter's sheet is scored against *theirs* —
   * that is the entire reason to pay for one.
   */
  ghostwriterSkill?: number | null;
  /**
   * Flat production points contributed by the player's own crew — an in-house
   * engineer or producer sitting in on the session.
   *
   * It lives on the INPUT rather than being added to the result afterwards so
   * the editor preview and the recorded master are scored by the same function
   * with the same numbers. Adding it at the call site would make the preview
   * lie about the record by exactly the size of the crew's contribution.
   */
  crewProductionBonus?: number;
  /**
   * Flat production points from the ROOM — the gear the player owns and the
   * space they hired for this session.
   *
   * Kept separate from `crewProductionBonus` because they are different
   * purchases and the player should be able to see which one they are paying
   * for: people, or equipment. Both are added to the raw production, so a
   * better desk lifts the rough take AND the ceiling a mix can reach.
   *
   * Whichever caller builds this must take it from `roomProductionBonus` in
   * `sim/room.ts` — that function is the only place gear and a rental are
   * compared, and every one of the four call sites (the store's session, the
   * store's re-score, the editor's preview and the remix preview) has to pass
   * it or the preview stops describing the record.
   */
  studioBonus?: number;
}

export interface StudioScores {
  lyricsQuality: number;
  /** What the record sounds like as tracked — before any mix session. */
  productionQuality: number;
  /** The best a mix session could make this production sound. */
  productionCeiling: number;
  vocalPerformance: number;
  chemistry: number;
  commercialPotential: number;
  criticalPotential: number;
  /** The blended figure the rest of the sim uses as `song.quality`. */
  quality: number;
}

function clamp100(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n)));
}

/**
 * The final blend from sub-scores to the single `quality` figure the rest of
 * the simulation consumes.
 *
 * Exported because mixing changes `productionQuality` after the fact and the
 * record's quality has to be recomputed the same way — if this lived inline in
 * `scoreStudioSession` the two paths would drift.
 */
export function blendQuality(parts: {
  lyricsQuality: number;
  productionQuality: number;
  vocalPerformance: number;
  chemistry: number;
}): number {
  return clamp100(
    parts.lyricsQuality * 0.30 +
    parts.productionQuality * 0.32 +
    parts.vocalPerformance * 0.26 +
    parts.chemistry * 0.12,
  );
}

/**
 * Mood/genre mismatch costs a record a little. Applied on top of the blend so
 * both the recording and the post-mix recompute treat it identically.
 */
export function applyMoodPenalty(quality: number, mood: SongMood, genre: Genre): number {
  const def = getMood(mood);
  const fits = !def.strongGenres || def.strongGenres.includes(genre);
  return clamp100(fits ? quality : quality * 0.93);
}

/**
 * How much of a producer's ceiling an UNMIXED recording actually reaches.
 *
 * A song tracked but never mixed is a rough master — the arrangement is there
 * but nothing has been balanced, levelled or finished. This is the gap the
 * mix session closes, and it is what makes hiring a real producer matter.
 */
export const UNMIXED_PRODUCTION_FACTOR = 0.72;

/**
 * How well the record hangs together with whoever is on it.
 *
 * Extracted from the session scorer because a feature can now land on a record
 * WEEKS after it was tracked — the negotiation happens afterwards. Both paths
 * must run the identical formula, or the chemistry the player negotiated would
 * disagree with the chemistry they were shown at record time.
 *
 * With no features this is simply how locked-in you were with yourself.
 */
export function computeChemistry(
  features: Array<{ npc: NPC; relationship: number }>,
  stats: ArtistStats,
  sliderLift: number,
  genre: Genre,
): number {
  if (features.length === 0) {
    return clamp100(50 + stats.consistency * 0.2 + (sliderLift - 55) * 0.3);
  }
  const featureScores = features.map((f) => {
    const rel = (f.relationship + 100) / 200;                 // 0..1
    const genreMatch = f.npc.genre === genre ? 1 : 0.62;      // shared lane helps
    const fameGap = Math.abs(f.npc.fame - stats.charisma * 0.8);
    const gapPenalty = Math.min(0.3, fameGap / 400);          // a superstar with an unknown is awkward
    return (rel * 0.5 + genreMatch * 0.34) * (1 - gapPenalty);
  });
  const avg = featureScores.reduce((a, b) => a + b, 0) / featureScores.length;
  // More features is harder to land cleanly.
  const crowding = Math.max(0.55, 1 - (features.length - 1) * 0.12);
  return clamp100((45 + avg * 70) * crowding);
}

/**
 * Fold a delivered verse into an already-recorded song.
 *
 * Two things a feature actually does, and they are not the same thing:
 *
 *   1. It changes how the record hangs together (chemistry), and
 *   2. it brings that artist's audience with it (commercial reach).
 *
 * The second is the reason people pay for a verse at all, so it is modelled
 * explicitly rather than being left implicit in the quality blend.
 *
 * Vocals are the BETTER of the two takes, not a straight average. A guest
 * verse is a professional job: it lifts the record or it is neutral. Letting
 * a competent-but-not-spectacular verse actively drag the song down meant a
 * player could pay real money and watch the read get worse, which is both
 * bad design and not how it works.
 */
export function applyFeatureVerse(input: {
  song: {
    lyricsQuality: number;
    productionQuality: number;
    vocalPerformance: number;
    commercialPotential: number;
    mood: SongMood;
    genre: Genre;
  };
  features: Array<{ npc: NPC; relationship: number }>;
  /** Quality of the delivered verse, 0-100. */
  verseQuality: number;
  /** Fame of the artist who delivered it, 0-100. */
  verseFame: number;
  stats: ArtistStats;
  /** How many features are ALREADY on the record, before this one. */
  existingFeatureCount: number;
}): {
  chemistry: number;
  vocalPerformance: number;
  commercialPotential: number;
  quality: number;
} {
  const { song, features, verseQuality, verseFame, stats, existingFeatureCount } = input;

  const chemistry = computeChemistry(features, stats, 55, song.genre);

  // The guest's take blends in, but never pulls the performance down.
  const dilution = 1 / (1 + existingFeatureCount);
  const blendedVocal =
    song.vocalPerformance * (1 - 0.26 * dilution) + verseQuality * 0.26 * dilution;
  const vocalPerformance = clamp100(Math.max(song.vocalPerformance, blendedVocal));

  // Their audience comes with them. This is the actual reason to pay for a
  // verse, so it scales with their fame rather than with how good they are.
  const reachLift = verseFame * 0.10 * dilution;
  const commercialPotential = clamp100(song.commercialPotential + reachLift);

  const quality = applyMoodPenalty(
    blendQuality({
      lyricsQuality: song.lyricsQuality,
      productionQuality: song.productionQuality,
      vocalPerformance,
      chemistry,
    }),
    song.mood,
    song.genre,
  );

  return { chemistry, vocalPerformance, commercialPotential, quality };
}

/**
 * Turn a session into scores.
 *
 * This is the one place the formula lives. Nothing outside this file should
 * recompute these — that is how the numbers stay consistent between the editor
 * preview, the saved record, and the chart model.
 */
export function scoreStudioSession(input: StudioInput): StudioScores {
  const { stats, lyrics, genre, bpm, mood, vocals, producerSkill, beatQuality, features, effort, ghostwriterSkill } = input;
  const crewProductionBonus = input.crewProductionBonus ?? 0;
  const studioBonus = input.studioBonus ?? 0;
  const analysis = analyzeLyrics(lyrics);
  const moodDef = getMood(mood);

  // Effort is a multiplier on all the raw work, not an additive bonus.
  const effortMult = effort === 1 ? 0.78 : effort === 2 ? 0.94 : 1.08;

  // ── LYRICS ──────────────────────────────────────────────────────────────
  // The stat decides how good the writing is; the analysis decides how much
  // there is to work with. A brilliant writer with half a verse still gets a
  // short song, and a weak writer with a full sheet still gets weak writing.
  const writerSkill = (
    stats.lyricism * 0.42 +
    stats.songwriting * 0.36 +
    stats.creativity * 0.14 +
    stats.originality * 0.08
  );
  // Depth acts as a ceiling: you cannot score 90 on 20 words.
  const playerLyricsQuality = clamp100(
    (writerSkill * (0.45 + analysis.depth / 100 * 0.55) + analysis.depth * 0.18) * effortMult,
  );

  // A hired pen writes at THEIR level, not yours. The sheet you are handed is
  // already good, so the only thing left is how much of it you can deliver —
  // which is what the vocals and production dimensions are for. We take the
  // better of the two so hiring a writer can never make a record worse.
  const lyricsQuality = ghostwriterSkill != null
    ? clamp100(Math.max(playerLyricsQuality, ghostwriterSkill * 0.94 * effortMult))
    : playerLyricsQuality;

  // ── PRODUCTION ──────────────────────────────────────────────────────────
  // Two things make a production: the beat you picked, and what the producer
  // did with it. Your own ear (beatSelection) decides whether the beat was
  // right for you; the producer's skill decides how well it was built and how
  // far they can take it.
  const beatEar = stats.beatSelection * 0.5 + stats.productionKnowledge * 0.3 + stats.discipline * 0.2;
  const bpmScore = bpmFit(bpm, genre) * 100;
  // How well the chosen beat suits this artist and genre.
  const beatFit = beatQuality * (0.7 + beatEar / 100 * 0.3);
  // Your own engineer or in-house producer sits in on the session and makes the
  // tracking cleaner. It is added to the raw production, so it lifts both the
  // rough master AND the ceiling a mix can reach — a better desk does not just
  // polish a bad take, it captures a better one.
  //
  // `studioBonus` is the same idea from the equipment side: the mic, the
  // preamp, the monitors, the treatment and the desk. The two are added rather
  // than merged because a room and an engineer are separate things you buy, and
  // the player who has paid for both should feel both.
  const productionQuality = producerSkill === null
    // Self-produced: your own beat, capped by your own ability.
    ? clamp100((beatFit * 0.60 + beatEar * 0.22 + bpmScore * 0.18) * effortMult * 0.88 + crewProductionBonus + studioBonus)
    : clamp100((producerSkill * 0.58 + beatFit * 0.24 + bpmScore * 0.18) * effortMult + crewProductionBonus + studioBonus);

  // ── VOCALS ──────────────────────────────────────────────────────────────
  // Raw ability sets the baseline; the sliders are how much of it you actually
  // used on the day. Setting everything to 100 does not create talent.
  const vocalAbility = (
    stats.delivery * 0.30 +
    stats.flow * 0.26 +
    stats.vocalAbility * 0.16 +
    stats.freestyle * 0.14 +
    stats.performance * 0.14
  );
  const sliderLift = vocalSettingAverage(vocals);
  // Sliders above the artist's ability give diminishing returns; below it, hurt less.
  const sliderDelta = (sliderLift - 55) / 100;
  let vocalPerformance = vocalAbility * (1 + sliderDelta * 0.42) + sliderLift * 0.14;

  // Pitch matters much more when you are singing than when you are rapping.
  const melodicGenres: Genre[] = [...MELODIC_GENRES, 'pop_rap'];
  if (melodicGenres.includes(genre)) {
    vocalPerformance += (vocals.pitch - 50) * 0.16;
  } else {
    vocalPerformance += (vocals.pitch - 50) * 0.04;
  }
  vocalPerformance = clamp100(vocalPerformance * effortMult);

  // ── CHEMISTRY ───────────────────────────────────────────────────────────
  // Shared with `applyFeatureVerse` so a verse negotiated later lands on
  // exactly the same scale as one that was in the room at record time.
  const chemistry = computeChemistry(features, stats, sliderLift, genre);

  // ── MOOD ↔ GENRE FIT ────────────────────────────────────────────────────
  // Applied via `applyMoodPenalty` below so the mix path can reuse it exactly.

  // ── BLENDED QUALITY ─────────────────────────────────────────────────────
  // Production is weighted slightly above the rest — on most records the beat
  // is what carries it, and it is the thing the producer system controls.
  //
  // This is the UNMIXED figure. A session that just got tracked is a rough
  // master; `mixMasterSong` lifts productionQuality and recomputes from here.
  const unmixedProduction = productionQuality * UNMIXED_PRODUCTION_FACTOR;
  const quality = applyMoodPenalty(
    blendQuality({
      lyricsQuality,
      productionQuality: unmixedProduction,
      vocalPerformance,
      chemistry,
    }),
    mood,
    genre,
  );

  // ── TWO KINDS OF POTENTIAL ──────────────────────────────────────────────
  // Commercial and critical are deliberately different questions. A
  // celebratory afrobeats record can be a huge commercial smash and get
  // shrugged at by critics; an introspective conscious record does the reverse.
  const commercialPotential = clamp100(
    quality * 0.72 +
    moodDef.commercialBias +
    (melodicGenres.includes(genre) ? 8 : 0) +
    analysis.hookiness * 0.10 +
    (features.length > 0 ? features[0].npc.fame * 0.06 : 0),
  );

  const criticalPotential = clamp100(
    quality * 0.70 +
    moodDef.criticalBias +
    stats.originality * 0.12 +
    analysis.depth * 0.14 +
    (analysis.hookiness > 70 ? -4 : 3), // critics are wary of pure chant
  );

  return {
    lyricsQuality,
    // What the record actually sounds like right now — i.e. unmixed.
    productionQuality: clamp100(unmixedProduction),
    // The ceiling a mix session could reach with this producer. The store keeps
    // this so mixing does not have to re-derive the session from scratch.
    productionCeiling: clamp100(productionQuality),
    vocalPerformance,
    chemistry,
    commercialPotential,
    criticalPotential,
    quality,
  };
}

// ─── QUALITATIVE READS ────────────────────────────────────────────────────

/**
 * Translate a 0-100 score into language.
 *
 * The player is never shown the underlying figure. A number invites
 * min-maxing; a sentence invites a decision. These bands are the only thing
 * the UI is allowed to render for any score in this system.
 */
export function describeScore(score: number): string {
  if (score >= 92) return 'This is the one. Something special is happening here.';
  if (score >= 84) return 'This feels like it could be special.';
  if (score >= 74) return 'Genuinely strong. This should travel.';
  if (score >= 64) return 'Solid — better than most, not yet undeniable.';
  if (score >= 54) return 'It works. Nothing here is going to carry you alone.';
  if (score >= 42) return 'Decent bones, rough execution.';
  if (score >= 30) return 'This is not ready. The streets will hear the rush.';
  return 'Rough. Come back to this when you have more to give it.';
}

/** A one-word band, for badges and pills. */
export function gradeLabel(score: number): string {
  if (score >= 92) return 'Exceptional';
  if (score >= 84) return 'Excellent';
  if (score >= 74) return 'Strong';
  if (score >= 64) return 'Solid';
  if (score >= 54) return 'Serviceable';
  if (score >= 42) return 'Uneven';
  if (score >= 30) return 'Weak';
  return 'Rough';
}

/** Colour band for the UI — deliberately coarse, not a gradient of numbers. */
export function gradeColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 74) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

/** What a producer's rate will do to the record, in plain language. */
export function describeProducerTier(skill: number): string {
  if (skill >= 88) return 'A legend. Whatever you bring, he will make it sound expensive.';
  if (skill >= 74) return 'Top-tier. Mixes and arrangements are not going to be your problem.';
  if (skill >= 58) return 'Competent and reliable. Will not fix a weak song.';
  if (skill >= 42) return 'Cheap and workable. You will need to carry this yourself.';
  return 'Amateur rates. Expect a demo, not a record.';
}

/** A read on how a feature pairing is likely to land. */
export function describeChemistry(score: number): string {
  if (score >= 84) return 'You two sound like you have been in the booth together for years.';
  if (score >= 70) return 'The pairing works. Neither of you is fighting the other.';
  if (score >= 55) return 'Serviceable. The feature is on the record but it is not the story.';
  if (score >= 40) return 'You sound like two artists on two different songs.';
  return 'This does not blend. Somebody is going to get outshone.';
}

/** How commercial vs critical the record skews, as a sentence. */
export function describeSplit(commercial: number, critical: number): string {
  const gap = commercial - critical;
  if (gap >= 14) return 'This is built for the public, not the press. That is not a criticism.';
  if (gap <= -14) return 'Critics will rate this higher than the charts do.';
  return 'The critics and the crowd are likely to agree on this one.';
}

/** Which dimension of a record a read is describing. */
export type Dimension = 'production' | 'vocals' | 'lyrics' | 'chemistry';

/**
 * A per-dimension read, in the language of the studio rather than of a
 * scoreboard. Each dimension says something different at the same number,
 * because "a great vocal" and "a great beat" are not the same achievement.
 */
export function describeDimension(dim: Dimension, score: number): string {
  const band = score >= 92 ? 5 : score >= 84 ? 4 : score >= 74 ? 3 : score >= 64 ? 2 : score >= 50 ? 1 : 0;

  const table: Record<Dimension, string[]> = {
    production: [
      'Rough. This sounds like a demo.',
      'The idea is there but nothing has been balanced.',
      'Clean enough. It does not get in the way.',
      'Punchy and clear. The low end is doing real work.',
      'Big and wide. This sounds like money was spent.',
      'Immaculate. Every element sits exactly where it should.',
    ],
    vocals: [
      'The take is not there yet.',
      'Pitchy and rushed in places.',
      'Serviceable. The performance gets the job done.',
      'Confident and locked in.',
      'Commanding. You can hear the room believing it.',
      'A career-best vocal. Every line lands.',
    ],
    lyrics: [
      'The writing is thin.',
      'There is a song in here somewhere.',
      'Straightforward bars. Nothing embarrassing, nothing remarkable.',
      'Sharp writing with real intent behind it.',
      'Genuinely quotable. People will be repeating these lines.',
      'Writing at a level most artists never reach.',
    ],
    chemistry: [
      'You sound like strangers on the same file.',
      'The pairing never quite settles.',
      'It works. Neither of you is stepping on the other.',
      'You two sound like you have done this before.',
      'The feature elevates the record rather than just appearing on it.',
      'You bring something out of each other. This is a real pairing.',
    ],
  };

  return table[dim][band];
}

/** A short read on what the commercial/critical split means for the rollout. */
export function describeCommercial(score: number): string {
  if (score >= 88) return 'Everything about this is built to travel.';
  if (score >= 74) return 'Playlist-friendly. This has real reach in it.';
  if (score >= 60) return 'It can find an audience with the right push.';
  if (score >= 45) return 'A niche record. It will land with the people who get it.';
  return 'This is not going to be a commercial record.';
}

export function describeCritical(score: number): string {
  if (score >= 88) return 'The kind of record that gets written about.';
  if (score >= 74) return 'Critics are going to take this seriously.';
  if (score >= 60) return 'Respectable. It will not be dismissed.';
  if (score >= 45) return 'It will get a fair hearing and not much more.';
  return 'The press are likely to shrug at this one.';
}

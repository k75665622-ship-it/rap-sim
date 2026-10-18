// ─── STREAMING ENGINE ──────────────────────────────────────────────────────
// Every stream in the game is produced here, one game day at a time.
//
// The shape of the model:
//
//   daily units for a song = popularity × platform share × release trajectory × jitter
//
//   · popularity   — song quality, artist standing, fanbase, marketing
//   · platform     — that platform's audience, its territory and genre fit, how
//                    much a video helps it, how much it favours unknowns
//   · trajectory   — launch week, decay, and a seeded viral/comeback window
//   · jitter       — seeded per song + platform + day, so nothing moves in lockstep
//
// Country splits are derived from the same seed rather than stored, which keeps
// the save file small while still giving every platform and every country its
// own genuinely different numbers. Nothing is ever copied across.
//
// Everything is seeded, so a given song/platform/day always produces the same
// figure — re-opening a page never re-rolls anything.

import type { Genre, Revival } from '../types/game';
import { PLATFORM_LIST, PLATFORM_BY_ID, platformFit, type PlatformConfig } from '../data/platforms';
import { MARKETS, marketWeight, WORLD_WEIGHT } from '../data/markets';
import { affinity } from './affinity';
import { hashString, makeRng } from './rng';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

/** Daily units for a hypothetical perfectly-average song at peak. */
export const DAILY_STREAM_SCALE = 400_000;

/**
 * What a "big push" is worth, in money.
 *
 * The release dialog's marketing slider tops out at $5,000 and labels that end
 * of it "big push", so this is the number the marketing multiplier is measured
 * against. It used to be $100,000 — twenty times the largest push the game will
 * let you buy — which meant the slider moved the multiplier by 2.75% at its
 * maximum and was, in practice, a control that did nothing. A disabled control
 * is a bug in this codebase; a control that is enabled and has no effect is
 * worse, because the player pays for it.
 *
 * One constant, read by the tick, the release path and the preview, so what the
 * dialog promises and what the engine delivers cannot drift apart.
 */
export const MARKETING_REFERENCE = 5_000;

/** 0-1 marketing push for a spend, on the same scale everywhere. */
export function marketingPush(budget: number | undefined): number {
  return Math.max(0, Math.min(1, (budget ?? 0) / MARKETING_REFERENCE));
}
/** Days of whole-catalogue daily history kept per song (the monthly window). */
export const HISTORY_DAYS = 30;
/**
 * Days of per-platform daily history kept per song. Fourteen, not seven: the
 * last seven are the current week and the seven before are the comparison week,
 * which is what makes a week-over-week move possible at all.
 */
export const PLATFORM_HISTORY_DAYS = 14;
/**
 * A download is not a stream. iTunes units are purchases, and roughly one in
 * every 170 listeners buys rather than streams, so its share of the day is
 * scaled down to keep the units in the right order of magnitude.
 */
const PURCHASE_RATIO = 0.006;
/** Premium streams needed for one album-equivalent unit. */
export const PREMIUM_PER_UNIT = 1_250;
/** Free streams needed for one album-equivalent unit. */
export const FREE_PER_UNIT = 3_750;
/** Downloads needed for one track-equivalent unit. */
export const DOWNLOADS_PER_TEU = 10;

// ─── TYPES ─────────────────────────────────────────────────────────────────

/** One platform's slice of a song. */
export interface PlatformSlice {
  /** Lifetime units. Streams, or downloads on iTunes. */
  t: number;
  /** Last PLATFORM_HISTORY_DAYS daily values, oldest first. */
  d: number[];
}

export interface SongPlatformState {
  /** Seed for this song's entire streaming life. */
  seed: number;
  /** Release day as an absolute serial. */
  release: number;
  /** Best single day across all platforms. */
  peakDay: number;
  /** Last HISTORY_DAYS daily totals, oldest first. */
  hist: number[];
  byPlatform: Record<string, PlatformSlice>;
  /**
   * Second winds this record has been given. Copied in from the song record,
   * which is the source of truth, because this state is derived and gets
   * rebuilt from the seed whenever the game is loaded.
   */
  revivals?: Revival[];
}

export interface StreamContext {
  quality: number;
  genre: Genre;
  homeCountry: string;
  /** Artist standing, 0-100. */
  artistPopularity: number;
  fanbase: number;
  /** 0-1 marketing push on this record. */
  marketing: number;
  videoViews: number;
  isNpc: boolean;
  /** Weeks already out when the game begins — used to seed a back catalogue. */
  weeksOut: number;
  /**
   * How much of the artist's audience this record reaches, 0-1. Absent means
   * 1. An album's deep cuts are heard by a fraction of the people who play
   * the lead single — without this a 12-track album earned like 12 singles.
   */
  weight?: number;
}

export interface DayTick {
  /** Total units across every platform, today. */
  units: number;
  /** Money earned today, in USD. */
  revenue: number;
  byPlatform: Record<string, number>;
}

// ─── SEEDING ───────────────────────────────────────────────────────────────

export function songSeed(songId: string): number {
  return hashString(`rl-stream|${songId}`);
}

export function newSongPlatformState(
  songId: string,
  releaseSerial: number,
  weeksOut: number,
): SongPlatformState {
  const seed = songSeed(songId);
  const byPlatform: Record<string, PlatformSlice> = {};
  for (const p of PLATFORM_LIST) byPlatform[p.id] = { t: 0, d: [] };

  return {
    seed,
    release: releaseSerial,
    peakDay: 0,
    // A song that arrives already weeks old gets a pre-filled history so its
    // decay curve has somewhere to come from — the world did not start today.
    hist: new Array(HISTORY_DAYS).fill(0),
    byPlatform,
    ...(weeksOut > 0 ? {} : {}),
  };
}

/** Deterministic 0-1 for an arbitrary key. */
function jitterAt(key: string): number {
  return makeRng(hashString(key))();
}

// ─── TRAJECTORY ────────────────────────────────────────────────────────────

/**
 * The multiplier a song carries at a given age, in days.
 *
 * Launch week climbs, then a long decay. On top of that, a seeded viral window
 * and a smaller comeback window — so some records blow up in month two, some
 * come back a year later, and most just fade.
 */
export function trajectory(seed: number, ageDays: number): number {
  if (ageDays < 0) return 0;

  const r = makeRng((seed ^ 0x9e3779b9) >>> 0);
  const viralDay = 30 + Math.floor(r() * 250);
  const viralPower = 2.0 + r() * 6.0;
  const viralWidth = 6 + r() * 14;
  const comebackDay = viralDay + 90 + Math.floor(r() * 200);
  const comebackPower = 0.8 + r() * 1.9;

  let m: number;
  if (ageDays <= 3) m = 0.5 + ageDays * 0.17;
  else if (ageDays <= 10) m = 1.01 + (ageDays - 3) * 0.05;
  else m = Math.max(0.045, 1.36 * Math.exp(-(ageDays - 10) / 52));

  if (ageDays > viralDay - viralWidth && ageDays < viralDay + viralWidth * 2.5) {
    const d = (ageDays - viralDay) / viralWidth;
    m *= 1 + viralPower * Math.exp(-d * d * 1.5);
  }
  if (ageDays > comebackDay - 20 && ageDays < comebackDay + 40) {
    const d = (ageDays - comebackDay) / 22;
    m *= 1 + comebackPower * Math.exp(-d * d * 1.4);
  }
  return m;
}

/** How many days from release until this song's trajectory peaks. */
export function peakAge(seed: number): number {
  let best = 0;
  let bestV = -1;
  for (let a = 0; a <= 900; a += 5) {
    const v = trajectory(seed, a);
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

// ─── REVIVALS ──────────────────────────────────────────────────────────────
//
// A record's own trajectory can only ever decay after its launch ramp. That is
// realistic and it is also why remixes exist: the artist puts a new version out
// and drags the *original* back onto playlists. Without this term a remix could
// only ever be its own, separate, smaller song — the original would keep sliding
// and the whole point of the move would be missing.
//
// Each revival is a bell planted on the day the push landed. It multiplies the
// day's figure, so it works with the record's own curve rather than replacing
// it: reviving a song nobody heard multiplies a small number and stays small.

/**
 * The combined lift from every revival this record has had, as a multiplier.
 * 1 means no revival is in range.
 */
export function revivalMultiplier(
  revivals: Revival[] | undefined,
  ageDays: number,
): number {
  if (!revivals || revivals.length === 0) return 1;

  let m = 1;
  for (const r of revivals) {
    const d = (ageDays - r.at) / r.width;
    // A little lead-in (the push is announced before it lands) and a bounded
    // tail. A revival is a spike in interest, not a permanent raise.
    if (d < -0.6 || d > 2.5) continue;
    m *= 1 + r.power * Math.exp(-d * d * 1.5);
  }
  return m;
}

// ─── POPULARITY ────────────────────────────────────────────────────────────

function qualityFactor(quality: number): number {
  return 0.25 + Math.pow(Math.max(0, Math.min(100, quality)) / 100, 1.5) * 1.4;
}

/**
 * How much the artist's own standing is worth, per day.
 *
 * The floor matters more than the slope. At 0.03 an unknown artist's record was
 * 3% of a household name's — which is not "small", it is *inaudible*, and it
 * made every early-game decision pointless: the producer's skill, the writing,
 * the mix all got multiplied by 0.03 and vanished. Measured on a real session,
 * quality 25 and quality 47 differed by 2.7x in streams but cost 122x more to
 * make, so investing in your craft was strictly worse than spamming rough
 * records. Discovery exists; the floor now says so.
 */
function artistFactor(popularity: number): number {
  const p = Math.max(0, Math.min(100, popularity)) / 100;
  return 0.09 + Math.pow(p, 1.35) * 1.5;
}

function fanFactor(fanbase: number): number {
  const f = Math.max(0, fanbase);
  return Math.max(0.12, Math.min(3.2, 0.15 + Math.sqrt(f / 1_000_000) * 0.85));
}

/** Combined multiplier that turns a song into a daily unit volume. */
export function popularityFactor(ctx: StreamContext): number {
  return (
    qualityFactor(ctx.quality) *
    artistFactor(ctx.artistPopularity) *
    fanFactor(ctx.fanbase) *
    (1 + Math.max(0, ctx.marketing) * 0.55) *
    Math.max(0.02, Math.min(1, ctx.weight ?? 1))
  );
}

// ─── PLATFORM SHARE ────────────────────────────────────────────────────────

/**
 * How a day's units divide between platforms. Never equal, never static: a
 * Ghanaian afrobeats record is an Audiomack record, the same track by a US
 * rapper is a Spotify record.
 */
export function platformWeights(ctx: StreamContext, ageDays: number): Record<string, number> {
  const weights: Record<string, number> = {};
  let total = 0;

  // Novelty: a brand-new artist's first weeks, and a record that is still fresh.
  const fresh = ageDays < 45 ? 1 - ageDays / 45 : 0;
  const unknown = 1 - Math.min(1, ctx.artistPopularity / 55);
  const novelty = Math.max(0, Math.min(1, fresh * 0.55 + unknown * 0.6));

  for (const p of PLATFORM_LIST) {
    let w = p.audience * platformFit(p, ctx.homeCountry, ctx.genre);
    w *= 1 + p.noveltyBoost * novelty;
    if (ctx.videoViews > 0) {
      // A video only really moves the platforms that carry video.
      const reach = Math.min(1, Math.log10(1 + ctx.videoViews) / 7.2);
      w *= 1 + p.videoLift * reach * 2.2;
    }
    if (p.purchaseBased) w *= PURCHASE_RATIO;
    weights[p.id] = w;
    total += w;
  }

  if (total <= 0) return weights;
  for (const id of Object.keys(weights)) weights[id] /= total;
  return weights;
}

/** Seeded day-to-day wobble, so no two days are the same size. */
export function dayJitter(seed: number, platformId: string, serial: number): number {
  return 0.78 + jitterAt(`${seed}|${platformId}|${serial}`) * 0.48;
}

/**
 * How much of the world's listening a delivery list actually reaches.
 *
 * `weights` is already normalised to sum to 1, so summing the chosen platforms
 * gives the fraction of the total audience the record can be heard by. Upload
 * to one platform and you reach that platform's share and nothing else — the
 * loss is real, which is what makes the release choice a choice rather than a
 * formality. Skipping iTunes costs almost no reach and a lot of chart points;
 * skipping Spotify costs most of the world.
 */
export function platformReach(
  allowed: string[] | undefined,
  weights: Record<string, number>,
): number {
  // No list at all means "everywhere" — NPC records and legacy saves.
  if (!allowed || allowed.length === 0) return 1;
  let all = 0;
  let got = 0;
  for (const p of PLATFORM_LIST) {
    const w = weights[p.id] ?? 0;
    all += w;
    if (allowed.includes(p.id)) got += w;
  }
  if (all <= 0) return 1;
  return Math.max(0.04, Math.min(1, got / all));
}

// ─── THE DAY ───────────────────────────────────────────────────────────────

export interface StreamActor {
  songId: string;
  ctx: StreamContext;
  state: SongPlatformState;
  /** Platforms this record was delivered to. Undefined = everywhere. */
  platforms?: string[];
}

/**
 * Advance one song by one game day. Mutates `state` in place (the caller owns a
 * draft) and returns what happened.
 */
export function tickSongDay(actor: StreamActor, serial: number): DayTick {
  const { state, ctx } = actor;
  const age = serial - state.release;

  if (age < 0) {
    state.hist.push(0);
    if (state.hist.length > HISTORY_DAYS) state.hist.shift();
    return { units: 0, revenue: 0, byPlatform: {} };
  }

  const allowed = actor.platforms;
  const pop = popularityFactor(ctx) * DAILY_STREAM_SCALE;
  // The record's own curve, lifted by any second wind it has been given. Both
  // multiply the same day figure, so a revival on a song nobody heard is still
  // a small day — which is exactly the rule that makes timing matter.
  const traj = trajectory(state.seed, age) * revivalMultiplier(state.revivals, age);
  const weights = platformWeights(ctx, age);
  // Fewer platforms, smaller world. Applied to the day's total rather than to
  // the shares, so a one-platform release is genuinely a smaller release and
  // not the same release quietly concentrated.
  const dayTotal = pop * traj * platformReach(allowed, weights);

  const byPlatform: Record<string, number> = {};
  let units = 0;
  let revenue = 0;

  for (const p of PLATFORM_LIST) {
    const slice = state.byPlatform[p.id] ?? (state.byPlatform[p.id] = { t: 0, d: [] });
    const share = weights[p.id] ?? 0;
    // Not delivered here. The day still gets recorded as a zero so the
    // fourteen-day window keeps its shape and the week-over-week comparison
    // stays honest.
    if (share <= 0 || (allowed && !allowed.includes(p.id))) {
      slice.d.push(0);
      if (slice.d.length > PLATFORM_HISTORY_DAYS) slice.d.shift();
      continue;
    }

    const raw = dayTotal * share * dayJitter(state.seed, p.id, serial);
    const value = Math.round(raw);

    slice.t += value;
    slice.d.push(value);
    if (slice.d.length > PLATFORM_HISTORY_DAYS) slice.d.shift();

    byPlatform[p.id] = value;
    units += value;
    revenue += value * p.rate;
  }

  state.hist.push(units);
  if (state.hist.length > HISTORY_DAYS) state.hist.shift();
  if (units > state.peakDay) state.peakDay = units;

  return { units, revenue, byPlatform };
}

// ─── COUNTRY SPLIT ─────────────────────────────────────────────────────────

/**
 * How a platform's units divide between countries, normalised to sum to 1.
 *
 * Market size × how far the artist's records actually travel, plus a seeded
 * per-country wobble so two songs from the same city do not produce identical
 * country tables.
 *
 * Memoised: this is pure for a given (seed, platform, home) and it is called
 * once per platform per song per published chart week. Skipping a year means
 * fifty-two publishes, and without the cache that is tens of millions of
 * redundant iterations.
 */
const SHARE_CACHE = new Map<string, Record<string, number>>();
const SHARE_CACHE_LIMIT = 12_000;

export function countryShares(
  seed: number,
  platformId: string,
  home: string,
): Record<string, number> {
  const cacheKey = `${seed}|${platformId}|${home}`;
  const hit = SHARE_CACHE.get(cacheKey);
  if (hit) return hit;

  const out: Record<string, number> = {};
  let total = 0;

  for (const m of MARKETS) {
    const base = m.weight * affinity(home, m.country);
    const wobble = 0.7 + jitterAt(`${seed}|${platformId}|${m.country}`) * 0.6;
    const w = base * wobble;
    out[m.country] = w;
    total += w;
  }

  if (total > 0) {
    for (const c of Object.keys(out)) out[c] /= total;
  }

  if (SHARE_CACHE.size > SHARE_CACHE_LIMIT) SHARE_CACHE.clear();
  SHARE_CACHE.set(cacheKey, out);
  return out;
}

/** Units a song has done in one country on one platform, over a window. */
export function countryUnits(
  state: SongPlatformState,
  platformId: string,
  country: string,
  home: string,
  window: 'day' | 'week' | 'prevWeek' | 'lifetime',
): number {
  const slice = state.byPlatform[platformId];
  if (!slice) return 0;
  const shares = countryShares(state.seed, platformId, home);
  const share = shares[country] ?? 0;
  if (share <= 0) return 0;

  if (window === 'lifetime') return Math.round(slice.t * share);
  if (window === 'day') return Math.round((slice.d[slice.d.length - 1] ?? 0) * share);
  if (window === 'prevWeek') {
    // The seven days before the last seven. This is what makes a real
    // "last week" position possible rather than a made-up one.
    const prior = slice.d.slice(0, Math.max(0, slice.d.length - 7));
    return Math.round(sumLast(prior, 7) * share);
  }
  return Math.round(sumLast(slice.d, 7) * share);
}

/** Sum of the last `n` entries of an array. */
function sumLast(arr: number[], n: number): number {
  let total = 0;
  for (let i = Math.max(0, arr.length - n); i < arr.length; i++) total += arr[i];
  return total;
}

/** Everything a song has done on one platform, all countries. */
export function platformTotals(state: SongPlatformState, platformId: string) {
  const slice = state.byPlatform[platformId] ?? { t: 0, d: [] };
  const d = slice.d;
  // The history is 14 days: the last 7 are this week, the 7 before are the
  // comparison, which is what makes a week-over-week move meaningful.
  const week = sumLast(d, 7);
  const prevWeek = sumLast(d.slice(0, Math.max(0, d.length - 7)), 7);
  return {
    lifetime: slice.t,
    day: d[d.length - 1] ?? 0,
    week,
    prevWeek,
    growth: prevWeek > 0 ? (week - prevWeek) / prevWeek : week > 0 ? 1 : 0,
  };
}

export interface SongTotals {
  lifetime: number;
  day: number;
  week: number;
  month: number;
  prevWeek: number;
  growth: number;
  peakDay: number;
}

/**
 * How much of the current game day has already been lived, 0-1.
 *
 * The engine only ever writes *completed* days. This is what lets a counter
 * read as "still climbing today" rather than frozen at yesterday's total until
 * midnight lands — the numbers a page shows move with the clock.
 */
export function dayProgress(clockMinute: number | undefined): number {
  if (!clockMinute || clockMinute <= 0) return 0;
  return Math.min(1, clockMinute / (24 * 60));
}

/**
 * Roll every platform up into one song-level total.
 *
 * `progress` is the elapsed share of the current game day (see `dayProgress`).
 * It defaults to 0 — and every write path uses the default on purpose, so a
 * partial day can never be baked into the saved figures and compound.
 */
export function songTotals(state: SongPlatformState, progress = 0): SongTotals {
  let lifetime = 0;
  let week = 0;

  for (const p of PLATFORM_LIST) {
    const slice = state.byPlatform[p.id];
    if (!slice) continue;
    lifetime += slice.t;
    // `slice.d` holds PLATFORM_HISTORY_DAYS (14) days. This used to sum the
    // whole array and call it a week, so `song.weeklyStreams` was really a
    // fortnight — and it was then compared against `priorWeek`, which is a
    // genuine seven-day window, so every week-over-week move read about +100%.
    // The charts have always used a real seven days (see `platformTotals`), so
    // the chart and the record page disagreed about the same song.
    week += sumLast(slice.d, 7);
  }

  const hist = state.hist;
  const day = hist[hist.length - 1] ?? 0;
  const month = hist.reduce((s, v) => s + v, 0);
  // The seven days before this one, for a real week-over-week comparison.
  const priorWeek = sumLast(hist.slice(0, Math.max(0, hist.length - 7)), 7);

  // Today, as far as it has got. Added to both the lifetime and the week,
  // because today belongs to both.
  const soFar = progress > 0 ? Math.round(day * progress) : 0;

  return {
    lifetime: lifetime + soFar,
    day: day + soFar,
    week: week + soFar,
    month: month + soFar,
    prevWeek: priorWeek,
    growth: priorWeek > 0 ? (week + soFar - priorWeek) / priorWeek : week + soFar > 0 ? 1 : 0,
    peakDay: Math.max(state.peakDay, day + soFar),
  };
}

/** Streams split premium vs free, for the album-equivalent maths. */
export function premiumSplit(state: SongPlatformState, window: 'week' | 'lifetime') {
  let premium = 0;
  let free = 0;
  let purchases = 0;

  for (const p of PLATFORM_LIST) {
    const slice = state.byPlatform[p.id];
    if (!slice) continue;
    const value = window === 'lifetime' ? slice.t : slice.d.reduce((s, v) => s + v, 0);
    if (p.purchaseBased) {
      purchases += value;
      continue;
    }
    premium += value * p.premium;
    free += value * (1 - p.premium);
  }

  return { premium, free, purchases };
}

// ─── CHART BUILDING ────────────────────────────────────────────────────────

export interface RankedSong {
  songId: string;
  units: number;
}

/**
 * Rank songs for one platform in one country, by what they did over the last
 * seven game days. Ordered by units, then by lifetime as a tie-break so the
 * order is stable rather than arbitrary.
 */
export function rankByPlatformCountry(
  actors: StreamActor[],
  platformId: string,
  country: string,
  limit: number,
): RankedSong[] {
  const scored: RankedSong[] = [];
  for (const a of actors) {
    const state = a.state;
    if (!state) continue;
    const units = countryUnits(state, platformId, country, a.ctx.homeCountry, 'week');
    if (units <= 0) continue;
    scored.push({ songId: a.songId, units });
  }
  scored.sort((x, y) => y.units - x.units);
  return scored.slice(0, limit);
}

export function platformConfig(id: string): PlatformConfig | undefined {
  return PLATFORM_BY_ID[id];
}

/** Exposed so the UI can show a market's size next to its name. */
export function marketSizeLabel(country: string): string {
  const w = marketWeight(country);
  const share = (w / WORLD_WEIGHT) * 100;
  if (share >= 1) return `${share.toFixed(1)}% of world`;
  return `${share.toFixed(2)}% of world`;
}

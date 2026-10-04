// ─── FANBASE ──────────────────────────────────────────────────────────────
// Who is actually listening, and where they came from.
//
// The game stores ONE number: `player.career.fanbase`. That is the right thing
// to store — it is the quantity the tick moves, and a derived breakdown cannot
// drift from it. But one number cannot answer the questions a player actually
// has: how many of these people care, where did they come from, and is the
// audience growing or quietly going cold.
//
// So everything else on this page is DERIVED from saved state, and nothing here
// is random. Open the screen twice and you get the same answer twice; the only
// thing that changes it is the world changing. That is deliberate — a fan
// counter that re-rolls on render is a fan counter that lies.
//
// The one formula this file shares with the tick is `fanGrowthFor`. The weekly
// tick used to own that arithmetic inline, which meant the screen could promise
// a number the tick did not pay. Now the tick calls this function, so the two
// cannot disagree — and the probe asserts exactly that.

import type {
  GameDate,
  Player,
  Show,
  Song,
  SongPlatformState,
  WeeklyStatement,
} from '../types/game';
import { dateToSerial, serialOf } from './gameClock';
import { platform as platformConfig } from '../data/platforms';

// ─── The one fan-growth formula ───────────────────────────────────────────

export interface FanGrowthInput {
  /**
   * Streams for the last COMPLETED week. `weeklyStatements[0].totalStreams` is
   * the honest source: it is the figure the payout was banked against, so the
   * number on this screen and the number in the bank statement agree.
   */
  weeklyStreams: number;
  momentum: number;
  /** `managerNetwork(manager)` — 0 when there is no manager. */
  managerNet?: number;
  /** The crew's `fanMult`. 1 when there is no crew. */
  fanMult?: number;
}

/**
 * How many fans the next weekly tick will add.
 *
 * This is the tick's own arithmetic, moved here so there is one copy of it.
 * A manager is not a wage and not a percentage — they are a network, and their
 * measurable effect is that the audience you do reach converts better.
 */
export function fanGrowthFor(i: FanGrowthInput): number {
  const net = i.managerNet ?? 0;
  const mult = i.fanMult ?? 1;
  return Math.floor((i.weeklyStreams * 0.001 + i.momentum * 0.1) * (1 + net / 500) * mult);
}

// ─── Shapes ───────────────────────────────────────────────────────────────

export type FanTierId = 'superfans' | 'core' | 'casual' | 'lapsed';

export interface FanTier {
  id: FanTierId;
  label: string;
  emoji: string;
  /** Tailwind text colour, so the bar and the legend cannot disagree. */
  colour: string;
  count: number;
  /** Share of the total, 0-1. */
  share: number;
  /** One line of what this tier means, in words. */
  note: string;
}

export type FanSourceKind = 'platform' | 'city' | 'record';

export interface FanSource {
  kind: FanSourceKind;
  label: string;
  /**
   * Share WITHIN this kind, 0-1. Rows of one kind never sum to more than 1: a
   * kind may show only its head (the top three records, say) and the rest is
   * implied rather than padded out with an "other" row.
   */
  share: number;
  /** How many people that share is. */
  fans: number;
  /** Why it says so — the measurement, not a claim. */
  detail: string;
}

export interface LoyaltyDriver {
  id: string;
  label: string;
  /** 0-1, this driver's own reading. */
  value: number;
  /** How much of the loyalty figure it accounts for. The weights sum to 1. */
  weight: number;
}

export interface FanbaseReport {
  total: number;
  tiers: FanTier[];
  /** 0-100. How much of the audience is actually committed. */
  loyalty: number;
  /** What the next full week is projected to add, on the tick's own terms. */
  weeklyGrowth: number;
  /**
   * Days since the most recent release, or `null` when nothing has ever come
   * out. `null` is not the same as zero and the screen must not print it as one.
   */
  dormancyDays: number | null;
  /** Why loyalty is where it is, in the engine's own terms. */
  loyaltyDrivers: LoyaltyDriver[];
  /** Grouped by kind by the caller. Never empty when there is an audience. */
  sources: FanSource[];
  /** The most recent completed week's streams, or 0 if none has been banked. */
  weeklyStreams: number;
  /** A sentence, assembled from the measurements above. */
  summary: string;
}

/**
 * Everything the derivation reads.
 *
 * `songs` must be the RELEASED records only — the caller passes
 * `releasedSongs()`. This is deliberate: the test for "is this record out" has
 * one definition (`sim/release.ts`) and this module should not carry a second
 * copy of it just to filter its own input.
 */
export interface FanbaseSlice {
  player: Player;
  songs: Song[];
  shows?: Show[];
  platformStats?: Record<string, SongPlatformState>;
  weeklyStatements?: WeeklyStatement[];
  /** `"Country:City"` → fame, straight off the state. */
  cityFame: Record<string, number>;
  gameDate: GameDate;
  managerNet?: number;
  fanMult?: number;
}

// ─── Tier presentation ────────────────────────────────────────────────────

const TIER_META: Array<{
  id: FanTierId;
  label: string;
  emoji: string;
  colour: string;
  note: string;
}> = [
  {
    id: 'superfans',
    label: 'Superfans',
    emoji: '🔥',
    colour: 'text-red-400',
    note: 'They buy on day one and defend you in the replies.',
  },
  {
    id: 'core',
    label: 'Core',
    emoji: '🎧',
    colour: 'text-amber-400',
    note: 'They listen to the whole record, not just the single.',
  },
  {
    id: 'casual',
    label: 'Casual',
    emoji: '👋',
    colour: 'text-sky-400',
    note: 'They know the song. They do not yet know you.',
  },
  {
    id: 'lapsed',
    label: 'Lapsed',
    emoji: '💤',
    colour: 'text-gray-500',
    note: 'They were there once and stopped hearing from you.',
  },
];

// ─── Small maths ──────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function share(p: number, whole: number): number {
  return whole > 0 ? p / whole : 0;
}

/**
 * How long a quiet spell has to run before anybody drifts off.
 *
 * Two months. Somebody who heard from you in April has not lapsed in June, and
 * a mechanism that starts taking people away the week after a release would
 * make the lapsed column meaningless.
 */
export const DORMANCY_GRACE_DAYS = 60;

/**
 * What share of the CASUAL column a quiet spell moves into lapsed, 0-1.
 *
 * Zero inside the grace window, then rising to 45% of the casual column at the
 * two-year mark and capped just above it. `null` — nothing has ever come out —
 * moves nobody, because there is nothing to have lapsed FROM: that audience is
 * made of listeners rather than followers, which is a different fact.
 *
 * This replaced a version that computed a target lapsed SHARE and only moved
 * people when that target exceeded the lapsed column that was already there.
 * For a normal audience the remainder is already well over the target, so it
 * never fired — a year of silence moved exactly nobody, and the whole
 * dormancy input was decoration.
 */
function dormancyShift(dormancyDays: number | null): number {
  if (dormancyDays === null || dormancyDays <= DORMANCY_GRACE_DAYS) return 0;
  return clamp(((dormancyDays - DORMANCY_GRACE_DAYS) / 660) * 0.45, 0, 0.6);
}

// ─── The derivation ───────────────────────────────────────────────────────

export function fanbaseReport(s: FanbaseSlice): FanbaseReport {
  const nowSerial = dateToSerial(s.gameDate);
  const total = Math.max(0, Math.round(s.player.career.fanbase));

  // ── Dormancy ────────────────────────────────────────────────────────────
  // How long the audience has gone without hearing anything new. `null` when
  // there has never been a release at all — a different fact from "released
  // nothing recently", and the screen renders it differently.
  let lastReleaseSerial: number | null = null;
  for (const song of s.songs) {
    const at = serialOf(song.releaseDate, 0);
    if (at > 0 && (lastReleaseSerial === null || at > lastReleaseSerial)) lastReleaseSerial = at;
  }
  const dormancyDays = lastReleaseSerial === null ? null : Math.max(0, nowSerial - lastReleaseSerial);

  // ── Output cadence ──────────────────────────────────────────────────────
  const year = 365;
  const releasesLastYear = s.songs.filter((song) => {
    const at = serialOf(song.releaseDate, 0);
    return at > 0 && nowSerial - at <= year;
  }).length;

  // ── Live work ───────────────────────────────────────────────────────────
  // A room is where a listener becomes a fan: they paid, they stood there, they
  // heard the record live. Six nights in half a year is a full mark.
  const showsLast180 = (s.shows ?? []).filter((show) => {
    if (!show.completed) return false;
    const at = serialOf(show.date, 0);
    return at > 0 && nowSerial - at <= 180;
  }).length;

  // ── Chart reach ─────────────────────────────────────────────────────────
  // Three records charting at once is as much reach as this measure counts.
  const charting = s.songs.filter((song) =>
    Object.values(song.chartPositions ?? {}).some((p) => p > 0),
  ).length;

  const consistency = clamp(releasesLastYear / 4, 0, 1);
  const live = clamp(showsLast180 / 6, 0, 1);
  const reach = clamp(charting / 3, 0, 1);
  const reputation = clamp(s.player.career.reputation / 100, 0, 1);
  // Momentum is stored 0-100 (see `addMomentum`), so its own scale is the one
  // to normalise against. `releaseHeat` reads it the same way.
  const momentumNorm = clamp(s.player.career.momentum / 100, 0, 1);

  const loyaltyDrivers: LoyaltyDriver[] = [
    { id: 'consistency', label: 'Release cadence', value: consistency, weight: 0.3 },
    { id: 'live', label: 'Nights played', value: live, weight: 0.2 },
    { id: 'reach', label: 'Chart reach', value: reach, weight: 0.2 },
    { id: 'reputation', label: 'Reputation', value: reputation, weight: 0.2 },
    { id: 'momentum', label: 'Momentum', value: momentumNorm, weight: 0.1 },
  ];

  const loyalty = total === 0
    ? 0
    : Math.round(
        clamp(
          loyaltyDrivers.reduce((sum, d) => sum + d.value * d.weight, 0),
          0,
          1,
        ) * 100,
      );

  // ── Tiers ───────────────────────────────────────────────────────────────
  // The three named tiers take a share of the audience that grows with loyalty;
  // the lapsed tier is whatever is left, so the four always add up to the total
  // exactly. Dormancy can push people out of the casual column and into lapsed,
  // but it never raids the core: a lapse is a casual drifting off, not a
  // committed fan being taken away by a quiet year.
  const loy = loyalty / 100;
  const superShare = 0.02 + loy * 0.18;
  const coreShare = 0.1 + loy * 0.24;
  const casualShare = 0.28 + loy * 0.16;

  let superfans = Math.round(total * superShare);
  let core = Math.round(total * coreShare);
  let casual = Math.round(total * casualShare);
  if (superfans + core + casual > total) casual = Math.max(0, total - superfans - core);

  let lapsed = total - superfans - core - casual;
  // The drift comes out of the casual column and goes into lapsed, so the four
  // tiers still add up to the total exactly and the committed tiers are never
  // raided — a lapse is a casual drifting off, not a core fan being taken away
  // by a quiet year.
  const drift = Math.round(casual * dormancyShift(dormancyDays));
  casual -= drift;
  lapsed = total - superfans - core - casual;

  const counts: Record<FanTierId, number> = { superfans, core, casual, lapsed };
  const tiers: FanTier[] = TIER_META.map((meta) => ({
    ...meta,
    count: counts[meta.id],
    share: share(counts[meta.id], total),
  }));

  // ── Streams for the week, and the projection that follows from them ─────
  const weeklyStreams =
    s.weeklyStatements?.[0]?.totalStreams ?? lastSevenDays(s.platformStats);
  const weeklyGrowth = fanGrowthFor({
    weeklyStreams,
    momentum: s.player.career.momentum,
    managerNet: s.managerNet,
    fanMult: s.fanMult,
  });

  // ── Where they came from ────────────────────────────────────────────────
  const sources = buildSources(s, total);

  // ── The sentence ────────────────────────────────────────────────────────
  const strongest = [...loyaltyDrivers].sort(
    (a, b) => b.value * b.weight - a.value * a.weight,
  )[0];
  const parts: string[] = [];
  if (total === 0) {
    parts.push('Nobody is carrying your name yet.');
  } else {
    parts.push(`${total.toLocaleString()} people carry your name.`);
    parts.push(
      `${loyalty}% of them are committed enough to count — ${strongest.label.toLowerCase()} is doing most of that work.`,
    );
  }
  if (dormancyDays === null) {
    parts.push('Nothing has been released, so every one of them is a listener rather than a follower.');
  } else if (dormancyDays > 180) {
    parts.push(
      `Nothing has come out in ${dormancyDays} days, and the lapsed column is where that shows.`,
    );
  }
  if (total > 0) {
    if (weeklyGrowth > 0) parts.push(`A full week is worth about ${weeklyGrowth} more.`);
    else if (weeklyGrowth < 0) parts.push(`A full week costs about ${Math.abs(weeklyGrowth)} of them.`);
    else parts.push('A full week is currently worth nothing either way.');
  }

  return {
    total,
    tiers,
    loyalty,
    weeklyGrowth,
    dormancyDays,
    loyaltyDrivers,
    sources,
    weeklyStreams,
    summary: parts.join(' '),
  };
}

/**
 * The last seven daily totals across every song and platform.
 *
 * Only used before the first weekly statement has been banked — a career in its
 * first week. Once a statement exists it is the authority and this is not
 * consulted, because two sources for one number is how they start to disagree.
 */
function lastSevenDays(stats: Record<string, SongPlatformState> | undefined): number {
  if (!stats) return 0;
  let sum = 0;
  for (const state of Object.values(stats)) {
    for (const day of (state.hist ?? []).slice(-7)) sum += day;
  }
  return sum;
}

function buildSources(s: FanbaseSlice, total: number): FanSource[] {
  const out: FanSource[] = [];

  // Lifetime units per platform, across every released record.
  const byPlatform = new Map<string, number>();
  let totalUnits = 0;
  for (const state of Object.values(s.platformStats ?? {})) {
    for (const [id, slice] of Object.entries(state.byPlatform ?? {})) {
      byPlatform.set(id, (byPlatform.get(id) ?? 0) + slice.t);
      totalUnits += slice.t;
    }
  }

  if (totalUnits > 0) {
    for (const [id, units] of [...byPlatform.entries()].sort((a, b) => b[1] - a[1])) {
      const conf = platformConfig(id);
      const s1 = share(units, totalUnits);
      out.push({
        kind: 'platform',
        label: conf?.name ?? id,
        share: s1,
        fans: Math.round(total * s1),
        detail: `${Math.round(s1 * 100)}% of every unit you have ever moved.`,
      });
    }

    // The three records that did the most work.
    const byRecord: Array<{ song: Song; units: number }> = [];
    for (const song of s.songs) {
      const state = s.platformStats?.[song.id];
      let units = 0;
      if (state) for (const slice of Object.values(state.byPlatform ?? {})) units += slice.t;
      if (units <= 0) units = song.totalStreams ?? 0;
      byRecord.push({ song, units });
    }
    byRecord.sort((a, b) => b.units - a.units);
    for (const row of byRecord.slice(0, 3)) {
      if (row.units <= 0) continue;
      const s1 = share(row.units, totalUnits);
      out.push({
        kind: 'record',
        label: row.song.title,
        share: s1,
        fans: Math.round(total * s1),
        detail: `${row.units.toLocaleString()} units, out ${row.song.releaseDate}.`,
      });
    }
  }

  // Where in the world they are. Fame in a city is the share of that room that
  // knows you, so fame is the weight.
  const cities = Object.entries(s.cityFame ?? {}).filter(([, fame]) => fame > 0);
  const fameTotal = cities.reduce((sum, [, fame]) => sum + fame, 0);
  if (fameTotal > 0) {
    cities.sort((a, b) => b[1] - a[1]);
    for (const [key, fame] of cities.slice(0, 5)) {
      const [country, city] = key.split(':');
      const s1 = share(fame, fameTotal);
      out.push({
        kind: 'city',
        label: city ?? key,
        share: s1,
        fans: Math.round(total * s1),
        detail: `${Math.round(fame)} fame in ${city ?? key}${country ? `, ${country}` : ''}.`,
      });
    }
  }

  return out;
}

/** Group `sources` by kind, preserving the order the engine emitted. */
export function groupSources(sources: FanSource[]): Record<FanSourceKind, FanSource[]> {
  const grouped: Record<FanSourceKind, FanSource[]> = { platform: [], city: [], record: [] };
  for (const source of sources) grouped[source.kind].push(source);
  return grouped;
}

/** The human name for a source kind, for headings. */
export const SOURCE_KIND_LABEL: Record<FanSourceKind, string> = {
  platform: 'Where they listen',
  city: 'Where they are',
  record: 'What brought them in',
};

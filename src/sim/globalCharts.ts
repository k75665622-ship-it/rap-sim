// ─── GLOBAL CHARTS ─────────────────────────────────────────────────────────
// "BillBoard Global Top 100" (songs) and "BillBoard Global Top 200" (albums).
//
// Both publish ONCE per game week, from the seven days just gone. Nothing moves
// mid-week. Both are hard to enter on purpose: points are reach-weighted by the
// size of the markets a record is actually big in, so being #1 in one small
// country contributes a rounding error next to a mid-chart position in the US.
//
// These are RAP LIFE's own charts. The names are game brands, not real ones.

import type {
  Album,
  ChartMilestone,
  ChartRow,
  GlobalCertification,
  Song,
} from '../types/game';
import { MARKETS, WORLD_WEIGHT } from '../data/markets';
import { PLATFORM_LIST } from '../data/platforms';
import { countryShares, premiumSplit, type SongPlatformState } from './streaming';
import { formatGameDate, serialToDate, dateToSerial } from './gameClock';

// ─── POINT WEIGHTS ─────────────────────────────────────────────────────────
// A premium stream is the unit of account. Free streams are worth less because
// they pay less. A download is worth a couple of hundred streams, which is what
// makes a strong sales week move a record up the chart fast.

const POINT_PREMIUM_STREAM = 1;
const POINT_FREE_STREAM = 0.4;
const POINT_DOWNLOAD = 220;
const POINT_VIDEO_VIEW = 0.06;
/** Airplay is derived — the game has no radio station clock. */
const RADIO_BASE = 1_100;

/**
 * A record spread evenly across the whole world scores about this. Used to
 * normalise reach so points stay in a readable range. Derived from the market
 * table, not picked by hand: it is the self-overlap of the world market.
 */
export const REFERENCE_REACH =
  MARKETS.reduce((s, m) => s + Math.pow(m.weight / WORLD_WEIGHT, 2), 0);

/** Share of downloads that are album bundles rather than single tracks. */
const ALBUM_PURCHASE_SHARE = 0.18;

/** Lifetime units needed for each certification tier. */
export const CERT_THRESHOLDS = {
  gold: 500_000,
  platinum: 1_000_000,
  diamond: 10_000_000,
  legendary: 100_000_000,
} as const;

// ─── RECURRENT RULES ───────────────────────────────────────────────────────

export const SONG_RECURRENT = { softWeeks: 20, softFloor: 50, hardWeeks: 52, hardFloor: 25 };
export const ALBUM_RECURRENT = { weeks: 52, floor: 100 };

/** True when a song should be pulled off the chart under the recurrent rule. */
export function songIsRecurrent(row: ChartRow): boolean {
  if (row.weeks >= SONG_RECURRENT.hardWeeks && row.position > SONG_RECURRENT.hardFloor) return true;
  if (row.weeks >= SONG_RECURRENT.softWeeks && row.position > SONG_RECURRENT.softFloor) return true;
  return false;
}

export function albumIsRecurrent(row: ChartRow): boolean {
  return row.weeks >= ALBUM_RECURRENT.weeks && row.position > ALBUM_RECURRENT.floor;
}

// ─── INPUTS ────────────────────────────────────────────────────────────────

export interface ChartActor {
  songId: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  /** 0-100. */
  artistPopularity: number;
  /** 0-1. Label push behind the record — drives airplay. */
  labelBacking: number;
  isPlayer: boolean;
  state: SongPlatformState;
  /** A remix rolls its numbers into the original's row. */
  mergeInto?: string;
  /** Views this song's video did over the tracking week. */
  videoViewsWeek: number;
}

export interface SongWeek {
  songId: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  isPlayer: boolean;
  points: number;
  streams: number;
  premiumStreams: number;
  freeStreams: number;
  purchases: number;
  radio: number;
  videoViews: number;
  mergedFrom: string[];
}

/**
 * One song's tracking week, converted to points.
 *
 * The reach multiplier is the heart of it: it is the size of the markets this
 * record's listeners are actually in, normalised. A Ghana-only smash has a
 * reach near 0.08 of reference; a record that is genuinely everywhere is at 1.0.
 * That is a 12x swing before volume is even counted.
 */
export function songWeek(actor: ChartActor): SongWeek {
  const { state } = actor;

  let premium = 0;
  let free = 0;
  let purchases = 0;
  let reachWeighted = 0;
  let unitTotal = 0;

  for (const p of PLATFORM_LIST) {
    const slice = state.byPlatform[p.id];
    if (!slice || slice.d.length === 0) continue;
    const week = slice.d.reduce((s, v) => s + v, 0);
    if (week <= 0) continue;

    if (p.purchaseBased) {
      purchases += week;
      unitTotal += week;
      continue;
    }

    premium += week * p.premium;
    free += week * (1 - p.premium);
    unitTotal += week;

    // How big are the markets this platform's listeners for this song sit in?
    const shares = countryShares(state.seed, p.id, actor.artistCountry);
    let reach = 0;
    for (const m of MARKETS) {
      reach += (shares[m.country] ?? 0) * (m.weight / WORLD_WEIGHT);
    }
    reachWeighted += week * reach;
  }

  const reach = unitTotal > 0 ? reachWeighted / unitTotal : 0;
  const reachNorm = REFERENCE_REACH > 0 ? Math.min(1.35, reach / REFERENCE_REACH) : 0;

  const streamPoints = (premium * POINT_PREMIUM_STREAM + free * POINT_FREE_STREAM) * reachNorm;
  const salesPoints = purchases * POINT_DOWNLOAD * reachNorm;

  // Airplay: a record only gets on radio if the artist has standing and someone
  // is pushing it. No station clock exists in the game, so it is derived.
  const quality = 0.6 + Math.min(1, actor.artistPopularity / 90) * 0.8;
  const radio = actor.artistPopularity * RADIO_BASE * (0.55 + actor.labelBacking) * quality * reachNorm;

  const videoViews = actor.videoViewsWeek;
  const videoPoints = videoViews * POINT_VIDEO_VIEW * reachNorm;

  return {
    songId: actor.mergeInto ?? actor.songId,
    title: actor.title,
    artistId: actor.artistId,
    artistName: actor.artistName,
    artistCountry: actor.artistCountry,
    isPlayer: actor.isPlayer,
    points: Math.round(streamPoints + salesPoints + radio + videoPoints),
    streams: Math.round(premium + free),
    premiumStreams: Math.round(premium),
    freeStreams: Math.round(free),
    purchases: Math.round(purchases),
    radio: Math.round(radio),
    videoViews,
    mergedFrom: actor.mergeInto ? [actor.songId] : [],
  };
}

/** Combine a remix and its original into one row. */
export function mergeWeeks(weeks: SongWeek[]): SongWeek {
  const [first, ...rest] = weeks;
  const out: SongWeek = { ...first, mergedFrom: [...first.mergedFrom] };
  for (const w of rest) {
    out.points += w.points;
    out.streams += w.streams;
    out.premiumStreams += w.premiumStreams;
    out.freeStreams += w.freeStreams;
    out.purchases += w.purchases;
    out.radio += w.radio;
    out.videoViews += w.videoViews;
    out.mergedFrom.push(w.songId, ...w.mergedFrom);
  }
  return out;
}

// ─── MOVEMENT ──────────────────────────────────────────────────────────────

function movementFor(
  position: number,
  lastPosition: number,
  everCharted: boolean,
): { movement: ChartRow['movement']; delta: number } {
  if (lastPosition === 0) {
    return everCharted ? { movement: 'reentry', delta: 0 } : { movement: 'new', delta: 0 };
  }
  const delta = lastPosition - position;
  if (delta > 0) return { movement: 'up', delta };
  if (delta < 0) return { movement: 'down', delta };
  return { movement: 'same', delta: 0 };
}

function indexRuns(runs: Record<string, { positions: number[]; lastWeek: number }> | undefined) {
  return runs ?? {};
}

function hasEverCharted(runs: Record<string, { positions: number[] }>, key: string): boolean {
  const run = runs[key];
  return !!run && run.positions.some((p) => p > 0);
}

// ─── GLOBAL TOP 100 ────────────────────────────────────────────────────────

export interface ChartBuildResult {
  rows: ChartRow[];
  /** Keys whose run should be extended, in chart order. */
  entered: ChartRow[];
  exited: ChartRow[];
  biggestJump: ChartRow | null;
  highestDebut: ChartRow | null;
}

export function buildSongChart(opts: {
  actors: ChartActor[];
  previous: ChartRow[];
  runs: Record<string, { positions: number[]; lastWeek: number }> | undefined;
  limit?: number;
}): ChartBuildResult {
  const limit = opts.limit ?? 100;
  const runs = indexRuns(opts.runs);

  // Roll remixes into their original before ranking.
  const grouped = new Map<string, SongWeek[]>();
  for (const actor of opts.actors) {
    const w = songWeek(actor);
    const list = grouped.get(w.songId) ?? [];
    list.push(w);
    grouped.set(w.songId, list);
  }

  const weeks = [...grouped.values()].map(mergeWeeks);
  weeks.sort((a, b) => b.points - a.points || b.purchases - a.purchases || b.radio - a.radio);

  const prevByItem = new Map(opts.previous.map((r) => [r.itemId, r]));
  const rows: ChartRow[] = [];

  for (const w of weeks) {
    if (rows.length >= limit) break;
    const key = `songs|${w.songId}`;
    const prev = prevByItem.get(w.songId);
    const ever = hasEverCharted(runs, key);
    const position = rows.length + 1;

    const weeks0 = (prev?.weeks ?? 0) + 1;
    const lastPosition = prev?.position ?? 0;
    const mv = movementFor(position, lastPosition, ever);
    const peak = Math.min(prev?.peak ?? 999, position);
    const topped = (prev?.hasTopped ?? false) || position === 1;

    const row: ChartRow = {
      itemId: w.songId,
      title: w.title,
      artistId: w.artistId,
      artistName: w.artistName,
      artistCountry: w.artistCountry,
      position,
      lastPosition,
      peak,
      weeks: weeks0,
      weeksAtNo1: (prev?.weeksAtNo1 ?? 0) + (position === 1 ? 1 : 0),
      metric: w.points,
      movement: mv.movement,
      delta: mv.delta,
      isPlayer: w.isPlayer,
      hasTopped: topped,
      streams: w.streams,
      premiumStreams: w.premiumStreams,
      freeStreams: w.freeStreams,
      purchases: w.purchases,
      radio: w.radio,
      videoViews: w.videoViews,
      mergedFrom: w.mergedFrom.length ? w.mergedFrom : undefined,
    };

    // Recurrent removal: a record that has had its run and is now low leaves.
    if (songIsRecurrent(row)) continue;
    rows.push(row);
  }

  // Re-number after any recurrent removals.
  rows.forEach((r, i) => (r.position = i + 1));

  const entered = rows.filter((r) => r.movement === 'new' || r.movement === 'reentry');
  const exited = opts.previous.filter((p) => !rows.some((r) => r.itemId === p.itemId));

  const movers = rows.filter((r) => r.movement === 'up' && r.delta > 0);
  movers.sort((a, b) => b.delta - a.delta);

  const debuts = rows.filter((r) => r.movement === 'new');
  debuts.sort((a, b) => a.position - b.position);

  return {
    rows,
    entered,
    exited,
    biggestJump: movers[0] ?? null,
    highestDebut: debuts[0] ?? null,
  };
}

// ─── GLOBAL TOP 200 ────────────────────────────────────────────────────────

export interface AlbumWeek {
  albumId: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  isPlayer: boolean;
  projectType: 'album' | 'ep' | 'deluxe' | 'mixtape';
  units: number;
  pureSales: number;
  teu: number;
  sea: number;
  /** Used to decide whether the project is still eligible. */
  releaseSerial: number;
}

/**
 * Album-equivalent units for one project over the tracking week.
 *
 *   pure album sales   = downloads × the share that are album bundles
 *   track-equivalent   = the remaining downloads ÷ 10
 *   streaming-equiv.   = premium ÷ 1,250  +  free ÷ 3,750
 *
 * The two download terms do not overlap: a bundle is an album sale, a stray
 * track download is a track-equivalent unit. Counting both from the same
 * download would double it.
 */
export function albumWeek(
  project: Album,
  tracks: Song[],
  states: Record<string, SongPlatformState>,
  meta: { artistPopularity: number; isPlayer: boolean; labelBacking: number },
): AlbumWeek {
  let premium = 0;
  let free = 0;
  let downloads = 0;

  for (const song of tracks) {
    const state = states[song.id];
    if (!state) continue;
    const split = premiumSplit(state, 'week');
    premium += split.premium;
    free += split.free;
    downloads += split.purchases;
  }

  const pureSales = downloads * ALBUM_PURCHASE_SHARE;
  const teu = (downloads * (1 - ALBUM_PURCHASE_SHARE)) / 10;
  const sea = premium / 1_250 + free / 3_750;

  return {
    albumId: project.id,
    title: project.title,
    artistId: project.ownerId ?? '',
    artistName: project.ownerName ?? 'Unknown',
    artistCountry: project.ownerCountry ?? '',
    isPlayer: meta.isPlayer,
    projectType: project.type ?? 'album',
    units: pureSales + teu + sea,
    pureSales,
    teu,
    sea,
    releaseSerial: project.releaseSerial ?? 0,
  };
}

export function buildAlbumChart(opts: {
  projects: Album[];
  songsById: Record<string, Song>;
  states: Record<string, SongPlatformState>;
  previous: ChartRow[];
  runs: Record<string, { positions: number[]; lastWeek: number }> | undefined;
  popularityOf: (artistId: string) => number;
  labelBackingOf: (artistId: string) => number;
  playerId: string;
  limit?: number;
}): ChartBuildResult {
  const limit = opts.limit ?? 200;
  const runs = indexRuns(opts.runs);

  // Deluxe editions merge into their original.
  const byOriginal = new Map<string, Album[]>();
  for (const p of opts.projects) {
    const key = p.originalAlbumId ?? p.id;
    const list = byOriginal.get(key) ?? [];
    list.push(p);
    byOriginal.set(key, list);
  }

  const weeks: AlbumWeek[] = [];
  for (const [key, group] of byOriginal) {
    const base = group.find((g) => g.id === key) ?? group[0];
    const allTracks: Song[] = [];
    for (const g of group) {
      for (const id of g.songs) {
        const s = opts.songsById[id];
        if (s) allTracks.push(s);
      }
    }
    if (allTracks.length === 0) continue;

    const w = albumWeek(base, allTracks, opts.states, {
      artistPopularity: opts.popularityOf(base.ownerId ?? ''),
      isPlayer: (base.ownerId ?? '') === opts.playerId,
      labelBacking: opts.labelBackingOf(base.ownerId ?? ''),
    });
    if (w.units <= 0) continue;
    weeks.push(w);
  }

  weeks.sort((a, b) => b.units - a.units);

  const prevByItem = new Map(opts.previous.map((r) => [r.itemId, r]));
  const rows: ChartRow[] = [];

  for (const w of weeks) {
    if (rows.length >= limit) break;
    const key = `albums|${w.albumId}`;
    const prev = prevByItem.get(w.albumId);
    const ever = hasEverCharted(runs, key);
    const position = rows.length + 1;

    const row: ChartRow = {
      itemId: w.albumId,
      title: w.title,
      artistId: w.artistId,
      artistName: w.artistName,
      artistCountry: w.artistCountry,
      position,
      lastPosition: prev?.position ?? 0,
      peak: Math.min(prev?.peak ?? 999, position),
      weeks: (prev?.weeks ?? 0) + 1,
      weeksAtNo1: (prev?.weeksAtNo1 ?? 0) + (position === 1 ? 1 : 0),
      metric: Math.round(w.units),
      movement: 'new',
      delta: 0,
      isPlayer: w.isPlayer,
      hasTopped: (prev?.hasTopped ?? false) || position === 1,
      pureSales: Math.round(w.pureSales),
      teu: Math.round(w.teu * 10) / 10,
      sea: Math.round(w.sea),
      projectType: w.projectType,
    };
    const mv = movementFor(position, row.lastPosition, ever);
    row.movement = mv.movement;
    row.delta = mv.delta;

    if (albumIsRecurrent(row)) continue;
    rows.push(row);
  }

  rows.forEach((r, i) => (r.position = i + 1));

  const entered = rows.filter((r) => r.movement === 'new' || r.movement === 'reentry');
  const exited = opts.previous.filter((p) => !rows.some((r) => r.itemId === p.itemId));

  const movers = rows.filter((r) => r.movement === 'up' && r.delta > 0);
  movers.sort((a, b) => b.delta - a.delta);
  const debuts = rows.filter((r) => r.movement === 'new');
  debuts.sort((a, b) => a.position - b.position);

  return {
    rows,
    entered,
    exited,
    biggestJump: movers[0] ?? null,
    highestDebut: debuts[0] ?? null,
  };
}

// ─── RUNS ──────────────────────────────────────────────────────────────────

export function extendRuns(
  runs: Record<string, { positions: number[]; lastWeek: number }>,
  chart: 'songs' | 'albums',
  rows: ChartRow[],
  weekSerial: number,
  /** Positions for items that were on last week's chart but not this one. */
  dropped: ChartRow[],
  maxWeeks = 60,
): Record<string, { positions: number[]; lastWeek: number }> {
  const next = { ...runs };

  for (const row of rows) {
    const key = `${chart}|${row.itemId}`;
    const run = next[key] ?? { positions: [], lastWeek: 0 };
    if (run.lastWeek !== weekSerial) {
      run.positions = [...run.positions, row.position];
      if (run.positions.length > maxWeeks) run.positions = run.positions.slice(-maxWeeks);
      run.lastWeek = weekSerial;
    }
    next[key] = run;
  }

  // A week off the chart is a real event and belongs in the run as a gap.
  for (const row of dropped) {
    const key = `${chart}|${row.itemId}`;
    const run = next[key];
    if (!run) continue;
    if (run.lastWeek !== weekSerial) {
      run.positions = [...run.positions, 0];
      if (run.positions.length > maxWeeks) run.positions = run.positions.slice(-maxWeeks);
      run.lastWeek = weekSerial;
      next[key] = run;
    }
  }

  // Prune runs that have been dead for a long time, so the save cannot grow
  // without bound across a long career.
  for (const [key, run] of Object.entries(next)) {
    if (run.lastWeek === weekSerial) continue;
    const tail = run.positions.slice(-12);
    if (tail.length === 12 && tail.every((p) => p === 0)) delete next[key];
  }

  return next;
}

// ─── CERTIFICATIONS ────────────────────────────────────────────────────────

export function certLevelFor(lifetimeUnits: number): { level: GlobalCertification['level']; multiplier: number; label: string } | null {
  // Each tier counts in its own multiples: 20M is 2x diamond, not "20x diamond".
  if (lifetimeUnits >= CERT_THRESHOLDS.legendary) {
    const m = Math.floor(lifetimeUnits / CERT_THRESHOLDS.legendary);
    return { level: 'legendary', multiplier: m, label: m > 1 ? `${m}x LEGENDARY` : 'LEGENDARY' };
  }
  if (lifetimeUnits >= CERT_THRESHOLDS.diamond) {
    const m = Math.floor(lifetimeUnits / CERT_THRESHOLDS.diamond);
    return { level: 'diamond', multiplier: m, label: m > 1 ? `${m}x DIAMOND` : 'DIAMOND' };
  }
  if (lifetimeUnits >= CERT_THRESHOLDS.platinum) {
    const m = Math.floor(lifetimeUnits / CERT_THRESHOLDS.platinum);
    return { level: 'platinum', multiplier: m, label: m > 1 ? `${m}x PLATINUM` : 'PLATINUM' };
  }
  if (lifetimeUnits >= CERT_THRESHOLDS.gold) {
    return { level: 'gold', multiplier: 1, label: 'GOLD' };
  }
  return null;
}

// ─── MILESTONES ────────────────────────────────────────────────────────────

export interface MilestoneInput {
  chart: 'songs' | 'albums';
  rows: ChartRow[];
  previous: ChartRow[];
  biggestJump: ChartRow | null;
  highestDebut: ChartRow | null;
  already: ChartMilestone[];
  date: string;
  /** Lifetime units per item, for the certification milestone. */
  certOf?: (itemId: string) => { label: string } | null;
}

/**
 * Milestones are only ever recorded once per kind per item, so a long-running
 * record does not re-announce its first top-10 every week.
 */
export function detectMilestones(input: MilestoneInput): ChartMilestone[] {
  const out: ChartMilestone[] = [];
  const seen = new Set(input.already.map((m) => `${m.kind}|${m.chart}|${m.itemId}`));
  const prevIds = new Set(input.previous.map((r) => r.itemId));
  const everPosition = new Map<string, number>();
  for (const m of input.already) {
    if (m.chart !== input.chart) continue;
    const prev = everPosition.get(m.itemId);
    everPosition.set(m.itemId, Math.min(prev ?? 999, m.kind === 'first_entry' ? 999 : prev ?? 999));
  }

  const push = (
    kind: ChartMilestone['kind'],
    row: ChartRow,
    detail: string,
  ) => {
    const key = `${kind}|${input.chart}|${row.itemId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: `${key}|${input.date}`,
      kind,
      chart: input.chart,
      itemId: row.itemId,
      itemTitle: row.title,
      artistId: row.artistId,
      artistName: row.artistName,
      date: input.date,
      detail,
    });
  };

  for (const row of input.rows) {
    if (!prevIds.has(row.itemId)) push('first_entry', row, `entered the chart at #${row.position}`);
    if (row.position <= 10) push('first_top10', row, `reached the top 10 at #${row.position}`);
    if (row.position === 1) push('first_number_one', row, 'hit #1');
    if (row.weeksAtNo1 >= 4) push('longest_at_one', row, `${row.weeksAtNo1} weeks at #1`);
    const cert = input.certOf?.(row.itemId);
    if (cert) push('certified', row, `certified ${cert.label}`);
  }

  if (input.highestDebut) {
    push('biggest_debut', input.highestDebut, `highest debut of the week at #${input.highestDebut.position}`);
  }
  if (input.biggestJump && input.biggestJump.delta >= 10) {
    push('biggest_debut', input.biggestJump, `biggest climb of the week, up ${input.biggestJump.delta}`);
  }

  return out;
}

// ─── DISPLAY ───────────────────────────────────────────────────────────────

export function movementLabel(row: ChartRow): string {
  switch (row.movement) {
    case 'new':
      return 'NEW';
    case 'reentry':
      return 'RE-ENTRY';
    case 'up':
      return `+${row.delta}`;
    case 'down':
      return `-${row.delta}`;
    default:
      return '—';
  }
}

export function chartWeekLabel(weekSerial: number): string {
  return `Chart week ending ${formatWeekEndingSafe(weekSerial)}`;
}

function formatWeekEndingSafe(serial: number): string {
  const d = serialToDate(serial);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const wd = new Date(serial * 86_400_000).getUTCDay();
  return `${days[wd]} ${d.day} ${months[d.month - 1]}`;
}

export function dateStringFor(serial: number): string {
  return formatGameDate(serialToDate(serial));
}

export { dateToSerial };

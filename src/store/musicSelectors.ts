// ─── MUSIC SELECTORS ───────────────────────────────────────────────────────
// The read layer between the simulation and the screens. Every figure a page
// shows is produced here from saved state — nothing is computed in a component,
// and nothing is ever re-randomised on render.

import type { Album, GameState, NPC, Song, SongPlatformState } from '../types/game';
import { PLATFORM_LIST, platform } from '../data/platforms';
import { MARKETS, marketWeight } from '../data/markets';
import {
  countryUnits,
  platformTotals,
  songTotals,
  dayProgress,
  countryShares,
  premiumSplit,
  type SongTotals,
} from '../sim/streaming';
import { dateToSerial, shortAge, relativeAge } from '../sim/gameClock';

export interface TrackRef {
  song: Song;
  songId: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  genre: string;
  isPlayer: boolean;
  state: SongPlatformState | undefined;
}

/**
 * Every song in the world, player and NPC, with its owner resolved.
 *
 * Memoised on the state object. Immer hands back a brand-new state object for
 * every action, so a WeakMap keyed on it invalidates itself exactly when the
 * world changes and never leaks. Without this, `trackById` — which is called
 * once per chart row, per drawer, per card — rebuilds the whole catalogue
 * (hundreds of entries) on every call.
 */
const TRACK_CACHE = new WeakMap<GameState, TrackRef[]>();

export function allTracks(state: GameState): TrackRef[] {
  const cached = TRACK_CACHE.get(state);
  if (cached) return cached;
  const built = buildTracks(state);
  TRACK_CACHE.set(state, built);
  return built;
}

function buildTracks(state: GameState): TrackRef[] {
  const player = state.player;
  const npcById = new Map(state.npcs.map((n) => [n.id, n]));
  const out: TrackRef[] = [];

  for (const song of state.songs) {
    if (!player) continue;
    out.push({
      song,
      songId: song.id,
      title: song.title,
      artistId: player.id,
      artistName: player.artistName,
      artistCountry: player.country,
      genre: player.genre,
      isPlayer: true,
      state: state.platformStats?.[song.id],
    });
  }

  for (const song of state.npcSongs) {
    const npc = song.ownerId ? npcById.get(song.ownerId) : undefined;
    if (!npc) continue;
    out.push({
      song,
      songId: song.id,
      title: song.title,
      artistId: npc.id,
      artistName: npc.name,
      artistCountry: song.ownerCountry ?? npc.country,
      genre: npc.genre ?? 'hip_hop',
      isPlayer: false,
      state: state.platformStats?.[song.id],
    });
  }

  return out;
}

const TRACK_INDEX = new WeakMap<GameState, Map<string, TrackRef>>();

export function trackById(state: GameState, songId: string): TrackRef | undefined {
  let index = TRACK_INDEX.get(state);
  if (!index) {
    index = new Map(allTracks(state).map((t) => [t.songId, t]));
    TRACK_INDEX.set(state, index);
  }
  return index.get(songId);
}

// ─── PER-PLATFORM, PER-COUNTRY ─────────────────────────────────────────────

export interface PlatformRankRow extends TrackRef {
  /** Units in this country on this platform over the last 7 game days. */
  units: number;
  /** The same, for the seven days before — what a real "last week" needs. */
  prevUnits: number;
  /** This country's share of the song's listeners on this platform, 0-1. */
  share: number;
  /** Worldwide units on this platform over the last 7 game days. */
  platformWeek: number;
  /** Week-over-week change on this platform, as a fraction. */
  growth: number;
  lifetime: number;
  /** Position last week in this country on this platform. 0 when it did not chart. */
  lastPosition: number;
}

/**
 * Rank every song for one platform in one country, by what it did over the last
 * seven game days. Two songs from the same city still order differently on
 * different platforms, because the country split is seeded per platform.
 *
 * `lastPosition` is derived by ranking the *previous* seven days with the same
 * rules, so the "Last week" column is a real position rather than an estimate.
 */
export function platformCountryChart(
  state: GameState,
  platformId: string,
  country: string,
  limit = 10,
): PlatformRankRow[] {
  const rows: PlatformRankRow[] = [];

  for (const t of allTracks(state)) {
    if (!t.state) continue;
    const units = countryUnits(t.state, platformId, country, t.artistCountry, 'week');
    const prevUnits = countryUnits(t.state, platformId, country, t.artistCountry, 'prevWeek');
    if (units <= 0 && prevUnits <= 0) continue;
    const totals = platformTotals(t.state, platformId);
    const shares = countryShares(t.state.seed, platformId, t.artistCountry);
    rows.push({
      ...t,
      units,
      prevUnits,
      share: shares[country] ?? 0,
      platformWeek: totals.week,
      growth: prevUnits > 0 ? (units - prevUnits) / prevUnits : units > 0 ? 1 : 0,
      lifetime: totals.lifetime,
      lastPosition: 0,
    });
  }

  // Last week's order, from the same rules applied to the prior seven days.
  const previousOrder = [...rows]
    .filter((r) => r.prevUnits > 0)
    .sort((a, b) => b.prevUnits - a.prevUnits || b.lifetime - a.lifetime);
  previousOrder.forEach((r, i) => {
    r.lastPosition = i + 1;
  });

  rows.sort((a, b) => b.units - a.units || b.lifetime - a.lifetime);
  return rows.slice(0, limit);
}

/** A song's numbers on one platform, split by country, biggest first. */
export function platformCountryBreakdown(
  state: GameState,
  songId: string,
  platformId: string,
  limit = 8,
): Array<{ country: string; units: number; lifetime: number; share: number }> {
  const t = trackById(state, songId);
  if (!t?.state) return [];
  const shares = countryShares(t.state.seed, platformId, t.artistCountry);
  const slice = t.state.byPlatform[platformId];
  if (!slice) return [];

  const week = slice.d.slice(-7).reduce((s, v) => s + v, 0);

  return MARKETS.map((m) => {
    const share = shares[m.country] ?? 0;
    return {
      country: m.country,
      units: Math.round(week * share),
      lifetime: Math.round(slice.t * share),
      share,
    };
  })
    .filter((r) => r.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
}

export interface PlatformLine {
  platformId: string;
  name: string;
  accent: string;
  mark: string;
  purchaseBased: boolean;
  units: number;
  lifetime: number;
  growth: number;
  revenue: number;
}

/** A song's performance across every platform. The comparison the spec asks for. */
export function songPlatformLines(state: GameState, songId: string): PlatformLine[] {
  const t = trackById(state, songId);
  if (!t?.state) return [];

  return PLATFORM_LIST.map((p) => {
    const totals = platformTotals(t.state!, p.id);
    return {
      platformId: p.id,
      name: p.name,
      accent: p.accent,
      mark: p.mark,
      purchaseBased: !!p.purchaseBased,
      units: totals.week,
      lifetime: totals.lifetime,
      growth: totals.growth,
      revenue: totals.week * p.rate,
    };
  }).sort((a, b) => b.units - a.units);
}

/**
 * What a record has done, as of *now* on the game clock.
 *
 * The engine writes completed days only, so the elapsed share of today is added
 * here — in the read layer, never in the save. That is what makes a stream
 * counter move while the player watches it instead of sitting still until the
 * next midnight.
 */
export function trackTotals(state: GameState, songId: string): SongTotals | null {
  const t = trackById(state, songId);
  if (!t?.state) return null;
  return songTotals(t.state, dayProgress(state.clockMinute));
}

/** The same, for a track already in hand. */
export function trackTotalsOf(state: GameState, t: TrackRef | undefined): SongTotals | null {
  if (!t?.state) return null;
  return songTotals(t.state, dayProgress(state.clockMinute));
}

/** Premium / free / purchase split, for the album-equivalent readout. */
export function trackSplit(state: GameState, songId: string) {
  const t = trackById(state, songId);
  if (!t?.state) return null;
  return {
    week: premiumSplit(t.state, 'week'),
    lifetime: premiumSplit(t.state, 'lifetime'),
  };
}

// ─── PLATFORM HOME ─────────────────────────────────────────────────────────

export interface PlatformHome {
  featured: PlatformRankRow[];
  trending: PlatformRankRow[];
  popular: PlatformRankRow[];
  newReleases: PlatformRankRow[];
  recommendedArtists: ArtistRef[];
  albums: AlbumRef[];
  popularVideos: TrackRef[];
}

export interface ArtistRef {
  id: string;
  name: string;
  country: string;
  genre?: string;
  fame: number;
  isPlayer: boolean;
  subscribers: number;
  monthlyListeners: number;
}

export interface AlbumRef {
  album: Album;
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  type: 'album' | 'ep' | 'deluxe' | 'mixtape';
  coverSeed: string;
  units: number;
  releaseSerial: number;
}

/** Subscriber count for an artist. Derived from fame and fanbase, deterministic. */
export function subscribersFor(fame: number, fanbase: number): number {
  return Math.round(Math.pow(fame, 2.4) * 220 + fanbase * 0.11);
}

export function monthlyListenersFor(fame: number, fanbase: number): number {
  return Math.round(Math.pow(fame, 2.1) * 900 + fanbase * 0.7);
}

export function artistRef(_state: GameState, npc: NPC): ArtistRef {
  return {
    id: npc.id,
    name: npc.name,
    country: npc.country,
    genre: npc.genre,
    fame: npc.fame,
    isPlayer: false,
    subscribers: subscribersFor(npc.fame, npc.fame * npc.fame * 220),
    monthlyListeners: monthlyListenersFor(npc.fame, npc.fame * npc.fame * 220),
  };
}

export function playerRef(state: GameState): ArtistRef | null {
  const p = state.player;
  if (!p) return null;
  const fame = Math.max(p.career.localFame, p.career.nationalFame, p.career.internationalFame);
  return {
    id: p.id,
    name: p.artistName,
    country: p.country,
    genre: p.genre,
    fame,
    isPlayer: true,
    subscribers: subscribersFor(fame, p.career.fanbase),
    monthlyListeners: monthlyListenersFor(fame, p.career.fanbase),
  };
}

export function allAlbums(state: GameState): AlbumRef[] {
  const npcById = new Map(state.npcs.map((n) => [n.id, n]));
  const out: AlbumRef[] = [];

  for (const a of [...(state.npcAlbums ?? []), ...state.albums]) {
    const owner = a.ownerId ? npcById.get(a.ownerId) : undefined;
    out.push({
      album: a,
      id: a.id,
      title: a.title,
      artistId: a.ownerId ?? '',
      artistName: a.ownerName ?? owner?.name ?? state.player?.artistName ?? 'Unknown',
      artistCountry: a.ownerCountry ?? owner?.country ?? '',
      type: a.type ?? 'album',
      coverSeed: `alb|${a.coverSeed ?? a.id}`,
      units: a.totalStreams ?? 0,
      releaseSerial: a.releaseSerial ?? 0,
    });
  }
  return out;
}

/** The last 7 days of an album's tracks, rolled up. */
export function albumWeekUnits(state: GameState, album: Album): number {
  let units = 0;
  for (const id of album.songs) {
    const t = trackById(state, id);
    if (!t?.state) continue;
    const totals = songTotals(t.state);
    units += totals.week;
  }
  return units;
}

export function platformHome(
  state: GameState,
  platformId: string,
  country: string,
): PlatformHome {
  const chart = platformCountryChart(state, platformId, country, 200);
  const nowSerial = dateToSerial(state.gameDate);

  const trending = chart.slice(0, 6);
  const popular = [...chart].sort((a, b) => b.lifetime - a.lifetime).slice(0, 6);
  const featured = [...chart]
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 3);

  const newReleases = [...chart]
    .filter((r) => r.song.releaseDate)
    .sort((a, b) => {
      const sa = dateToSerial(parseDate(a.song.releaseDate));
      const sb = dateToSerial(parseDate(b.song.releaseDate));
      return sb - sa;
    })
    .slice(0, 6);

  // Recommended artists: a mix of the biggest, the fastest-rising, and local.
  // One map for the roster — `state.npcs.find` inside this loop would be a
  // 200 × 11,000 scan on every render of the platform home.
  const npcById = new Map(state.npcs.map((n) => [n.id, n]));
  const byArtist = new Map<string, { ref: ArtistRef; score: number; local: boolean }>();
  for (const row of chart) {
    if (row.isPlayer) continue;
    const npc = npcById.get(row.artistId);
    if (!npc) continue;
    const prev = byArtist.get(row.artistId);
    const score = (prev?.score ?? 0) + row.units * (1 + Math.max(0, row.growth));
    byArtist.set(row.artistId, {
      ref: artistRef(state, npc),
      score,
      local: npc.country === country,
    });
  }
  const recommendedArtists = [...byArtist.values()]
    .sort((a, b) => Number(b.local) - Number(a.local) || b.score - a.score)
    .slice(0, 8)
    .map((x) => x.ref);

  const albums = allAlbums(state)
    .filter((a) => a.units > 0)
    .sort((a, b) => b.releaseSerial - a.releaseSerial)
    .slice(0, 6);

  const popularVideos = chart.filter((r) => r.song.hasVideo).slice(0, 4);

  void nowSerial;
  return { featured, trending, popular, newReleases, recommendedArtists, albums, popularVideos };
}

function parseDate(s: string) {
  const [d, m, y] = (s ?? '').split('/').map(Number);
  if (!d || !m || !y) return { day: 1, month: 1, year: 2024 };
  return { day: d, month: m, year: y };
}

// ─── SEARCH ────────────────────────────────────────────────────────────────

export interface SearchResults {
  songs: TrackRef[];
  artists: ArtistRef[];
  albums: AlbumRef[];
}

export function searchMusic(state: GameState, query: string): SearchResults {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return { songs: [], artists: [], albums: [] };

  const songs = allTracks(state)
    .filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.artistName.toLowerCase().includes(q),
    )
    .sort((a, b) => (b.state ? songTotals(b.state).week : 0) - (a.state ? songTotals(a.state).week : 0))
    .slice(0, 12);

  const player = playerRef(state);
  const artists: ArtistRef[] = [];
  if (player && (player.name.toLowerCase().includes(q) || 'you'.includes(q))) artists.push(player);
  for (const npc of state.npcs) {
    if (npc.role !== 'artist') continue;
    if (!npc.name.toLowerCase().includes(q)) continue;
    artists.push(artistRef(state, npc));
    if (artists.length >= 12) break;
  }

  const albums = allAlbums(state)
    .filter(
      (a) => a.title.toLowerCase().includes(q) || a.artistName.toLowerCase().includes(q),
    )
    .slice(0, 12);

  return { songs, artists, albums };
}

// ─── THE LIVE WEEK ─────────────────────────────────────────────────────────
//
// The published charts are weekly, the way real ones are — and that is exactly
// what made the screen read as frozen: a player who advanced two days saw the
// same numbers, twice, with copy telling them "nothing moves mid-week".
//
// This is the other half. A running ranking of the week in progress, scored on
// the same streaming state the published chart is built from, including the
// part of today that has already happened. It moves every time the clock does,
// and it is what the published chart will look like when the week closes.

export interface LiveRow extends TrackRef {
  /** Streams over the last seven days plus the elapsed part of today. */
  week: number;
  /** The seven days before that, for a real week-over-week read. */
  prevWeek: number;
  growth: number;
}

export function liveTopSongs(state: GameState, limit = 10): LiveRow[] {
  const progress = dayProgress(state.clockMinute);
  const rows: LiveRow[] = [];

  for (const t of allTracks(state)) {
    if (!t.state) continue;
    const totals = songTotals(t.state, progress);
    if (totals.week <= 0) continue;
    rows.push({ ...t, week: totals.week, prevWeek: totals.prevWeek, growth: totals.growth });
  }

  rows.sort((a, b) => b.week - a.week);
  return rows.slice(0, limit);
}

/** Everything the world streamed in the current, still-running week. */
export function liveWeekTotal(state: GameState): number {
  const progress = dayProgress(state.clockMinute);
  let total = 0;
  for (const t of allTracks(state)) {
    if (!t.state) continue;
    total += songTotals(t.state, progress).week;
  }
  return total;
}

// ─── DISPLAY HELPERS ───────────────────────────────────────────────────────

export function metricLabelFor(platformId: string): string {
  return platform(platformId)?.purchaseBased ? 'purchases' : 'streams';
}

export function uploadAge(state: GameState, serial: number, minute = 0): string {
  return relativeAge(serial, dateToSerial(state.gameDate), minute);
}

export function ageShort(state: GameState, serial: number): string {
  return shortAge(serial, dateToSerial(state.gameDate));
}

export function marketLabel(country: string): string {
  return `${marketWeight(country).toFixed(1)}x`;
}

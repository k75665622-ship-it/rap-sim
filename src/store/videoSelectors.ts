// ─── VIDEO SELECTORS ───────────────────────────────────────────────────────
// The read layer for the video platform. Everything a video page shows is
// derived here from saved state, so no component ever invents a number and
// nothing re-rolls on render.

import type { GameState, Video, VideoComment } from '../types/game';
import { dateToSerial } from '../sim/gameClock';
import { affinity } from '../sim/affinity';
import { videoTotals, scoreRecommendation, availableComments, type ScoredVideo } from '../sim/video';
import { allTracks, trackById, subscribersFor, type TrackRef } from './musicSelectors';

/** Videos that are actually on the platform. */
export function allVideos(state: GameState): Video[] {
  return (state.videos ?? []).filter((v) => !v.removed && v.published);
}

export function videoById(state: GameState, id: string): Video | undefined {
  return (state.videos ?? []).find((v) => v.id === id);
}

/** How many views a video did over the last seven game days. */
export function videoWeek(video: Video): number {
  return videoTotals(video).week;
}

// ─── COUNTRY WEIGHTING ─────────────────────────────────────────────────────
// A video's standing in a country is its own reach times how far that artist's
// records travel there, plus a seeded wobble keyed on the video and the country.
// Two countries therefore never show the same order, and switching country
// changes real numbers rather than re-labelling the same list.

function countryWobble(videoId: string, country: string): number {
  let h = 2166136261;
  const s = `${videoId}|${country}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 0.55 + ((h >>> 0) % 1000) / 1000 * 0.9;
}

export interface CountryVideoRow {
  video: Video;
  /** Views attributed to this country over the last seven game days. */
  week: number;
  /** Lifetime views attributed to this country. */
  lifetime: number;
  /** How much of the video's audience sits in this country, 0-1. */
  share: number;
}

/**
 * Every video, as seen from one country. The share is derived from the same
 * affinity model the streaming engine uses, so the platform and the charts
 * agree about where an artist's audience actually is.
 */
export function videosInCountry(state: GameState, country: string): CountryVideoRow[] {
  const rows: CountryVideoRow[] = [];
  const videos = allVideos(state);
  let totalWeight = 0;
  const weights: number[] = [];

  for (const video of videos) {
    const w = affinity(video.artistCountry, country) * countryWobble(video.id, country);
    weights.push(w);
    totalWeight += w;
  }

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const share = totalWeight > 0 ? weights[i] / totalWeight : 0;
    const totals = videoTotals(video);
    rows.push({
      video,
      week: Math.round(totals.week * share),
      lifetime: Math.round(video.views * share),
      share,
    });
  }

  return rows;
}

// ─── HOME SECTIONS ─────────────────────────────────────────────────────────

export interface VideoHome {
  trending: CountryVideoRow[];
  popular: CountryVideoRow[];
  fresh: CountryVideoRow[];
  recommended: ScoredVideo[];
  fromSubscribed: CountryVideoRow[];
  recent: CountryVideoRow[];
}

export function videoHome(state: GameState, country: string): VideoHome {
  const rows = videosInCountry(state, country);
  const nowSerial = dateToSerial(state.gameDate);

  const trending = [...rows]
    .filter((r) => r.week > 0)
    .sort((a, b) => b.week - a.week)
    .slice(0, 8);

  const popular = [...rows].sort((a, b) => b.lifetime - a.lifetime).slice(0, 8);

  const fresh = [...rows]
    .sort((a, b) => b.video.uploadSerial - a.video.uploadSerial)
    .slice(0, 8);

  const recent = [...rows]
    .sort((a, b) => b.video.uploadSerial - a.video.uploadSerial)
    .slice(0, 12);

  const subscribedArtists = new Set(
    (state.subscriptions ?? []).filter((s) => s.kind === 'channel').map((s) => s.artistId),
  );
  const watchedArtists = watchedArtistOrder(state);

  const fromSubscribed = rows
    .filter((r) => subscribedArtists.has(r.video.artistId))
    .sort((a, b) => b.video.uploadSerial - a.video.uploadSerial)
    .slice(0, 8);

  const recommended = recommend(state, rows, subscribedArtists, watchedArtists, country, nowSerial);

  return { trending, popular, fresh, recommended, fromSubscribed, recent };
}

/** Artist ids from the watch history, newest first. */
function watchedArtistOrder(state: GameState): string[] {
  const out: string[] = [];
  for (const id of state.watchHistory ?? []) {
    const v = videoById(state, id);
    if (!v) continue;
    if (!out.includes(v.artistId)) out.push(v.artistId);
    if (out.length >= 24) break;
  }
  return out;
}

/**
 * The recommended row.
 *
 * Built as a deliberate *mix* rather than the top N by score. Sorting purely by
 * score produced eight rows all badged "Popular", because the biggest videos win
 * on every axis at once. This instead takes a couple from each bucket — rising,
 * local, followed, same-lane — and fills the remainder by score, which is what
 * makes the row read like a recommendation rather than a leaderboard.
 */
export function recommend(
  state: GameState,
  rows: CountryVideoRow[],
  subscribedArtists: Set<string>,
  watchedArtists: string[],
  country: string,
  seedSerial: number,
  limit = 8,
): ScoredVideo[] {
  const playerGenre = state.player?.genre ?? 'hip_hop';
  // The local chart, so "local" means something concrete rather than "same country".
  const localRank = new Map<string, number>();
  rows
    .slice()
    .sort((a, b) => b.week - a.week)
    .slice(0, 40)
    .forEach((r, i) => localRank.set(r.video.artistId, i + 1));

  const scored = rows.map((r) =>
    scoreRecommendation(
      {
        video: r.video,
        views: r.video.views,
        week: r.week,
        country,
        genre: playerGenre,
        subscribedArtists,
        watchedArtists,
        localRank: localRank.get(r.video.artistId) ?? 0,
      },
      `${seedSerial}|${country}`,
    ),
  );

  const byScore = [...scored].sort((a, b) => b.score - a.score);
  const picked: ScoredVideo[] = [];
  const taken = new Set<string>();

  const take = (candidate: ScoredVideo | undefined) => {
    if (!candidate || taken.has(candidate.video.id)) return false;
    taken.add(candidate.video.id);
    picked.push(candidate);
    return true;
  };

  // Two from each of the buckets that mean something different to the viewer.
  const buckets: Array<(s: ScoredVideo) => boolean> = [
    (s) => subscribedArtists.has(s.video.artistId),
    (s) => s.reason === 'Rising',
    (s) => s.reason === 'Local',
    (s) => s.reason === 'Because you watched',
    (s) => s.video.artistGenre === playerGenre,
  ];

  for (const match of buckets) {
    if (picked.length >= limit) break;
    let taken2 = 0;
    for (const s of byScore) {
      if (taken2 >= 2 || picked.length >= limit) break;
      if (taken.has(s.video.id)) continue;
      if (!match(s)) continue;
      if (take(s)) taken2++;
    }
  }

  // Fill the rest by score.
  for (const s of byScore) {
    if (picked.length >= limit) break;
    take(s);
  }

  return picked.slice(0, limit);
}

// ─── RELATED ───────────────────────────────────────────────────────────────

/** Videos to sit beside the one being watched. Same artist first, then lane. */
export function relatedVideos(state: GameState, videoId: string, limit = 12): Video[] {
  const current = videoById(state, videoId);
  if (!current) return [];

  const others = allVideos(state).filter((v) => v.id !== videoId);
  const byArtist = others
    .filter((v) => v.artistId === current.artistId)
    .sort((a, b) => b.views - a.views);
  const byGenre = others
    .filter((v) => v.artistId !== current.artistId && v.artistGenre === current.artistGenre)
    .sort((a, b) => b.views - a.views);
  const rest = others
    .filter((v) => v.artistId !== current.artistId && v.artistGenre !== current.artistGenre)
    .sort((a, b) => b.views - a.views);

  return [...byArtist, ...byGenre, ...rest].slice(0, limit);
}

// ─── CHANNELS ──────────────────────────────────────────────────────────────

export interface Channel {
  artistId: string;
  name: string;
  country: string;
  genre?: string;
  isPlayer: boolean;
  subscribers: number;
  description: string;
  bannerSeed: string;
  avatarSeed: string;
  videos: Video[];
  popular: Video[];
  latest: Video[];
  playlists: Array<{ title: string; seed: string; videos: Video[] }>;
  totalViews: number;
}

const CHANNEL_BLURBS = [
  'Official channel. New visuals as they land.',
  'Music videos, sessions and the odd behind the scenes.',
  'Records, visuals and everything in between.',
  'The official home of the visuals.',
  'Dropping videos and live sessions here first.',
];

function blurbFor(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return CHANNEL_BLURBS[(h >>> 0) % CHANNEL_BLURBS.length];
}

export function channelFor(state: GameState, artistId: string): Channel | null {
  const player = state.player;
  const isPlayer = artistId === 'player' || artistId === player?.id;

  let name: string;
  let country: string;
  let genre: string | undefined;
  let fame: number;
  let fanbase: number;

  if (isPlayer && player) {
    name = player.artistName;
    country = player.country;
    genre = player.genre;
    fame = Math.max(
      player.career.localFame,
      player.career.nationalFame,
      player.career.internationalFame,
    );
    fanbase = player.career.fanbase;
  } else {
    const npc = state.npcs.find((n) => n.id === artistId);
    if (!npc) return null;
    name = npc.name;
    country = npc.country;
    genre = npc.genre;
    fame = npc.fame;
    fanbase = npc.fame * npc.fame * 220;
  }

  const videos = allVideos(state)
    .filter((v) => (isPlayer ? v.isPlayer : v.artistId === artistId))
    .sort((a, b) => b.uploadSerial - a.uploadSerial);

  const popular = [...videos].sort((a, b) => b.views - a.views);
  const latest = videos.slice(0, 8);

  // Playlists are derived groupings, not stored rows: everything a channel
  // needs to look organised without a table of its own.
  const playlists = [
    { title: 'Official Videos', seed: `pl-official|${artistId}`, videos: videos.filter((v) => v.title.includes('Official')) },
    { title: 'Visualizers', seed: `pl-vis|${artistId}`, videos: videos.filter((v) => v.title.includes('Visual')) },
    { title: 'Most Viewed', seed: `pl-top|${artistId}`, videos: popular.slice(0, 10) },
  ].filter((p) => p.videos.length > 0);

  return {
    artistId,
    name,
    country,
    genre,
    isPlayer,
    subscribers: subscribersFor(fame, fanbase),
    description: blurbFor(artistId),
    bannerSeed: `banner|${artistId}`,
    avatarSeed: `chan|${artistId}`,
    videos,
    popular: popular.slice(0, 8),
    latest,
    playlists,
    totalViews: videos.reduce((s, v) => s + v.views, 0),
  };
}

/** Every channel that has at least one video, biggest first. */
export function allChannels(state: GameState, limit = 40): Channel[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const v of allVideos(state)) {
    if (seen.has(v.artistId)) continue;
    seen.add(v.artistId);
    ids.push(v.artistId);
  }
  const channels: Channel[] = [];
  for (const id of ids) {
    const c = channelFor(state, id);
    if (c && c.videos.length > 0) channels.push(c);
  }
  channels.sort((a, b) => b.subscribers - a.subscribers);
  return channels.slice(0, limit);
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────

/** Loaded comments for a video, with the player's own pinned to the top. */
export function commentsFor(state: GameState, videoId: string): VideoComment[] {
  const list = state.videoComments?.[videoId] ?? [];
  const own = list.filter((c) => c.isPlayer || list.some((p) => p.id === c.parentId && p.isPlayer));
  const rest = list.filter((c) => !own.includes(c));
  return [...own, ...rest];
}

/** How many more comments the section can pull in. */
export function remainingComments(state: GameState, videoId: string): number {
  const video = videoById(state, videoId);
  if (!video) return 0;
  const loaded = (state.videoComments?.[videoId] ?? []).filter((c) => !c.isPlayer).length;
  return Math.max(0, availableComments(video) - loaded);
}

/** Top-level comments, with their replies nested underneath. */
export interface CommentThread {
  comment: VideoComment;
  replies: VideoComment[];
}

export function commentThreads(state: GameState, videoId: string): CommentThread[] {
  const list = commentsFor(state, videoId);
  const tops = list.filter((c) => !c.parentId);
  const byParent = new Map<string, VideoComment[]>();
  for (const c of list) {
    if (!c.parentId) continue;
    const arr = byParent.get(c.parentId) ?? [];
    arr.push(c);
    byParent.set(c.parentId, arr);
  }
  return tops.map((comment) => ({ comment, replies: byParent.get(comment.id) ?? [] }));
}

// ─── CROSS-REFERENCE ───────────────────────────────────────────────────────

/** The record behind a video, resolved for the watch page's sidebar. */
export function songForVideo(state: GameState, video: Video): TrackRef | undefined {
  return trackById(state, video.songId);
}

/** Videos attached to one song, newest first. */
export function videosForSong(state: GameState, songId: string): Video[] {
  return allVideos(state)
    .filter((v) => v.songId === songId)
    .sort((a, b) => b.uploadSerial - a.uploadSerial);
}

/** Everything an artist page needs to show their releases. */
export function artistTracks(state: GameState, artistId: string): TrackRef[] {
  const isPlayer = artistId === 'player' || artistId === state.player?.id;
  return allTracks(state).filter((t) => (isPlayer ? t.isPlayer : t.artistId === artistId));
}

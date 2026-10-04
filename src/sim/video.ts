// ─── VIDEO ENGINE ──────────────────────────────────────────────────────────
// Everything a music video does over game time is produced here.
//
//   daily views = popularity × quality × budget × marketing × trajectory × jitter
//
// The same rules as the streaming engine, deliberately: a video only ever moves
// when a game day is processed, every figure is seeded from the video's own id
// so re-opening a page changes nothing, and the cross-effects between a video
// and its song are capped and logarithmic so the two can never feed each other
// into infinity.
//
// Comments are generated on demand from the video id and an index — not stored.
// That is what lets a video with 40,000 comments show a real count without the
// save file carrying 40,000 rows. Only the player's own comments, replies and
// reactions are ever written down.

import type {
  CommentMood,
  Genre,
  NPC,
  Song,
  Video,
  VideoComment,
} from '../types/game';
import { hashString, makeRng } from './rng';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

/** Views a perfectly-average video gets on its best day. */
export const DAILY_VIEW_SCALE = 55_000;
/** Days of daily view history kept per video. */
export const VIDEO_HISTORY_DAYS = 30;
/** How many comments a "load more" page returns. */
export const COMMENT_PAGE = 20;
/** Hard ceiling on how many comments the UI will ever generate for one video. */
export const COMMENT_CEILING = 400;
/**
 * The most a video may add to its song's daily streams, as a multiple. A viral
 * video is a real lift; it is not a second stream engine.
 */
export const VIDEO_STREAM_LIFT_CAP = 0.85;
/** How much of a video's own views can ever come from its song's success. */
export const SONG_VIEW_LIFT_CAP = 1.6;

// ─── SEEDING ───────────────────────────────────────────────────────────────

export function videoSeed(videoId: string): number {
  return hashString(`rl-video|${videoId}`);
}

function at(key: string): number {
  return makeRng(hashString(key))();
}

/** Deterministic 0-1 in a named lane, so unrelated rolls never correlate. */
function lane(seed: number, name: string, n = 0): number {
  return makeRng(hashString(`${seed}|${name}|${n}`))();
}

// ─── TRAJECTORY ────────────────────────────────────────────────────────────

/**
 * The multiplier a video carries at a given age in days.
 *
 * A video front-loads much harder than a record: the first three days are most
 * of its life. Some still catch a late wave months later, and a smaller number
 * get rediscovered around the year mark, which is why old uploads occasionally
 * spike back into a trending row.
 */
export function videoTrajectory(seed: number, ageDays: number): number {
  if (ageDays < 0) return 0;

  const r = makeRng((seed ^ 0x85ebca6b) >>> 0);
  const waveDay = 45 + Math.floor(r() * 320);
  const wavePower = 2.4 + r() * 9.0;
  const waveWidth = 4 + r() * 10;
  const rediscoverDay = 330 + Math.floor(r() * 300);
  const rediscoverPower = 0.7 + r() * 2.2;

  let m: number;
  if (ageDays <= 2) m = 0.30 + ageDays * 0.30;
  else if (ageDays <= 7) m = 0.92 - (ageDays - 2) * 0.06;
  else m = Math.max(0.03, 0.62 * Math.exp(-(ageDays - 7) / 38));

  if (ageDays > waveDay - waveWidth && ageDays < waveDay + waveWidth * 2.4) {
    const d = (ageDays - waveDay) / waveWidth;
    m *= 1 + wavePower * Math.exp(-d * d * 1.6);
  }
  if (ageDays > rediscoverDay - 25 && ageDays < rediscoverDay + 55) {
    const d = (ageDays - rediscoverDay) / 26;
    m *= 1 + rediscoverPower * Math.exp(-d * d * 1.3);
  }
  return m;
}

// ─── POPULARITY ────────────────────────────────────────────────────────────

export interface VideoContext {
  /** Artist standing, 0-100. */
  artistPopularity: number;
  /** How big the record behind the video is, 0-100. */
  songPopularity: number;
  /** Production quality, 0-100. */
  quality: number;
  /** Production budget in USD. */
  budget: number;
  /** Promotion spend in USD. */
  marketing: number;
  /** The artist's channel subscribers. */
  subscribers: number;
  homeCountry: string;
  genre: Genre;
  /** Lifetime streams the song has, which is how a hit lifts its visual. */
  songStreams: number;
}

function artistFactor(popularity: number): number {
  const p = Math.max(0, Math.min(100, popularity)) / 100;
  return 0.04 + Math.pow(p, 1.3) * 1.45;
}

function qualityFactor(quality: number): number {
  const q = Math.max(0, Math.min(100, quality)) / 100;
  return 0.35 + Math.pow(q, 1.4) * 1.5;
}

function budgetFactor(budget: number): number {
  // Diminishing: $20k is a real upgrade on $2k, $2m is not ten times $200k.
  return 0.6 + Math.min(1.9, Math.log10(1 + Math.max(0, budget) / 400) / 2.2);
}

function marketingFactor(marketing: number): number {
  return 1 + Math.min(1.4, Math.log10(1 + Math.max(0, marketing) / 1_500) / 2.6);
}

function subscriberFactor(subscribers: number): number {
  return Math.max(0.3, Math.min(2.6, 0.35 + Math.sqrt(Math.max(0, subscribers) / 250_000) * 1.1));
}

/** The song's own reach, capped, so a hit video and a hit song compound only so far. */
function songFactor(songStreams: number, songPopularity: number): number {
  const fromStreams = Math.min(1, Math.log10(1 + Math.max(0, songStreams)) / 7.5);
  const fromPop = Math.max(0, Math.min(100, songPopularity)) / 100;
  return 0.55 + Math.min(SONG_VIEW_LIFT_CAP, fromStreams * 0.85 + fromPop * 0.6) * 0.9;
}

export function videoPopularityFactor(ctx: VideoContext): number {
  return (
    artistFactor(ctx.artistPopularity) *
    qualityFactor(ctx.quality) *
    budgetFactor(ctx.budget) *
    marketingFactor(ctx.marketing) *
    subscriberFactor(ctx.subscribers) *
    songFactor(ctx.songStreams, ctx.songPopularity)
  );
}

/** Expected views on a given day, before jitter. Exposed for the UI's read. */
export function expectedViews(video: Video, ctx: VideoContext, serial: number): number {
  const age = serial - video.uploadSerial;
  if (age < 0) return 0;
  return (
    videoPopularityFactor(ctx) *
    DAILY_VIEW_SCALE *
    videoTrajectory(video.seed, age) *
    dayJitter(video.seed, serial)
  );
}

export function dayJitter(seed: number, serial: number): number {
  return 0.74 + at(`${seed}|views|${serial}`) * 0.52;
}

// ─── THE DAY ───────────────────────────────────────────────────────────────

/**
 * Advance one video by one game day. Mutates in place; the caller owns a draft.
 *
 * Returns the views added today so the caller can log the cross-effect on the
 * song exactly once.
 */
export function tickVideoDay(video: Video, ctx: VideoContext, serial: number): number {
  const age = serial - video.uploadSerial;

  if (age < 0 || !video.published || video.removed) {
    video.hist.push(0);
    if (video.hist.length > VIDEO_HISTORY_DAYS) video.hist.shift();
    return 0;
  }

  const views = Math.round(expectedViews(video, ctx, serial));
  video.hist.push(views);
  if (video.hist.length > VIDEO_HISTORY_DAYS) video.hist.shift();
  if (views > video.peakDay) video.peakDay = views;
  video.views += views;

  // Likes, dislikes and comments all trail views, with a ratio set by quality
  // and a seeded wobble so two videos with the same views never look identical.
  const likeRatio = Math.max(
    0.012,
    Math.min(0.115, 0.022 + (ctx.quality / 100) * 0.05 + lane(video.seed, 'likeratio') * 0.03),
  );
  const dislikeRatio = Math.max(
    0.0006,
    Math.min(0.02, 0.004 + (1 - ctx.quality / 100) * 0.007 + lane(video.seed, 'dislikeratio') * 0.005),
  );
  // Engagement rises the hotter a video is — a viral clip gets talked about.
  const heat = Math.min(2.2, 1 + video.peakDay / 220_000);
  const commentRatio = Math.max(
    0.0006,
    Math.min(0.012, (0.0016 + lane(video.seed, 'commentratio') * 0.0024) * heat),
  );

  video.likes += Math.round(views * likeRatio * (0.85 + lane(video.seed, 'lwob', serial) * 0.3));
  video.dislikes += Math.round(views * dislikeRatio * (0.85 + lane(video.seed, 'dwob', serial) * 0.3));
  video.commentCount += Math.round(views * commentRatio * (0.8 + lane(video.seed, 'cwob', serial) * 0.45));

  return views;
}

/** Views over the last `n` days. */
export function viewsLast(video: Video, n: number): number {
  let total = 0;
  for (let i = Math.max(0, video.hist.length - n); i < video.hist.length; i++) total += video.hist[i];
  return total;
}

/** Today, the last seven days, and the seven before — for a real week-over-week. */
export function videoTotals(video: Video) {
  const day = video.hist[video.hist.length - 1] ?? 0;
  const week = viewsLast(video, 7);
  const before = video.hist.slice(0, Math.max(0, video.hist.length - 7));
  let prevWeek = 0;
  for (let i = Math.max(0, before.length - 7); i < before.length; i++) prevWeek += before[i];
  return {
    day,
    week,
    prevWeek,
    lifetime: video.views,
    growth: prevWeek > 0 ? (week - prevWeek) / prevWeek : week > 0 ? 1 : 0,
    peakDay: video.peakDay,
  };
}

/**
 * How much a video lifts its song today, as a multiplier on the song's daily
 * streams. Capped and logarithmic: the twentieth millionth view is worth far
 * less than the first ten thousand.
 */
export function streamLift(video: Video, ctx: VideoContext, serial: number): number {
  if (!video.published || video.removed) return 0;
  const age = serial - video.uploadSerial;
  if (age < 0 || age > 540) return 0;
  const fresh = Math.max(0, 1 - age / 540);
  const reach = Math.min(1, Math.log10(1 + Math.max(0, video.views)) / 7.4);
  return Math.min(VIDEO_STREAM_LIFT_CAP, reach * 0.7 * fresh * (0.6 + ctx.quality / 250));
}

// ─── CREATING A VIDEO ──────────────────────────────────────────────────────

export interface VideoSpec {
  id: string;
  songId: string;
  songTitle: string;
  title: string;
  artistId: string;
  artistName: string;
  artistCountry: string;
  artistGenre?: Genre;
  directorId: string;
  directorName: string;
  concept: string;
  visualStyle: string;
  quality: number;
  budget: number;
  marketingBudget: number;
  uploadSerial: number;
  uploadDate: string;
  isPlayer: boolean;
  songQuality: number;
  /** Featured artists who actually appear in it. */
  cameoArtistIds?: string[];
  cameoArtistNames?: string[];
  /** What the guest list cost on top of the production budget. */
  cameoCost?: number;
}

/** How many seconds a video of this genre tends to run. */
export function seededDuration(seed: number, genre?: Genre): number {
  const base: Record<string, number> = {
    hip_hop: 210,
    trap: 195,
    drill: 190,
    afrobeats: 225,
    conscious: 250,
    pop_rap: 205,
    dancehall: 215,
    grime: 200,
  };
  const b = base[genre ?? 'hip_hop'] ?? 210;
  return Math.round(b + (lane(seed, 'duration') - 0.5) * 90);
}

/**
 * Turn a spec into a Video record. Quality is whatever the shoot actually
 * achieved — the caller passes it in, this only clamps and seeds.
 */
export function createVideo(spec: VideoSpec): Video {
  const seed = videoSeed(spec.id);
  return {
    id: spec.id,
    songId: spec.songId,
    songTitle: spec.songTitle,
    title: spec.title,
    artistId: spec.artistId,
    artistName: spec.artistName,
    artistCountry: spec.artistCountry,
    artistGenre: spec.artistGenre,
    directorId: spec.directorId,
    directorName: spec.directorName,
    concept: spec.concept,
    visualStyle: spec.visualStyle,
    quality: Math.max(1, Math.min(100, Math.round(spec.quality))),
    budget: Math.max(0, Math.round(spec.budget)),
    marketingBudget: Math.max(0, Math.round(spec.marketingBudget)),
    status: 'published',
    uploadSerial: spec.uploadSerial,
    uploadDate: spec.uploadDate,
    minuteOfDay: 1 + Math.floor(lane(seed, 'minute') * 1439),
    durationSec: seededDuration(seed, spec.artistGenre),
    seed,
    views: 0,
    likes: 0,
    dislikes: 0,
    commentCount: 0,
    thumbSeed: hashString(`rl-thumb|${spec.id}`),
    isPlayer: spec.isPlayer,
    published: true,
    peakDay: 0,
    hist: new Array(VIDEO_HISTORY_DAYS).fill(0),
    cameoArtistIds: spec.cameoArtistIds ?? [],
    cameoArtistNames: spec.cameoArtistNames ?? [],
    cameoCost: spec.cameoCost ?? 0,
  };
}

/**
 * The quality a shoot lands at. Director skill and budget both matter, and the
 * song's own quality sets the ceiling — you cannot shoot a great video for a
 * bad record.
 */
export function shootQuality(opts: {
  directorSkill: number;
  budget: number;
  songQuality: number;
  seed: number;
  /**
   * Flat points from the player's own crew — a photographer on the payroll
   * shoots the stills and lights the set, so the video comes out better than
   * the director alone would manage. Applied to the ceiling as well as the
   * roll: a better crew raises what the shoot can possibly be, not just the
   * odds of hitting it.
   */
  crewBonus?: number;
  /**
   * Flat points from the guests who turned up to be in it. A featured artist
   * standing in the frame is production value the director cannot manufacture,
   * so it lifts the ceiling exactly the way the crew does.
   */
  cameoBonus?: number;
}): number {
  const bonus = (opts.crewBonus ?? 0) + (opts.cameoBonus ?? 0);
  const skill = Math.max(0, Math.min(100, opts.directorSkill)) / 100;
  const spend = Math.min(1, Math.log10(1 + Math.max(0, opts.budget) / 500) / 3.2);
  const ceiling = 40 + (opts.songQuality / 100) * 55 + bonus;
  const rolled = 30 + skill * 38 + spend * 34 + bonus;
  const noise = (lane(opts.seed, 'shoot') - 0.5) * 9;
  return Math.max(8, Math.min(100, Math.min(ceiling, rolled + noise)));
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────
// Generated from (video id, index). Stable forever, never stored, and unique
// within a video because each mood bank is walked with a stride coprime to its
// length — so a phrase cannot come back round until the whole bank is used.

const BANK: Record<CommentMood, string[]> = {
  positive: [
    'this is actually hard 🔥',
    'the visuals are insane, no notes',
    'been on repeat all week',
    'that second verse is the one',
    'whoever directed this deserves a raise',
    'finally something worth watching',
    'this deserves way more views',
    'put this in the Louvre',
    'the transition at the hook is crazy',
    'not a single skip on this',
    'this is the best thing out right now',
    'I felt that in my chest',
    'sound is clean, picture is cleaner',
    'sending this to everyone I know',
    'this aged well already and it just dropped',
  ],
  negative: [
    'this is not it',
    'expected more honestly',
    'the beat carries the whole thing',
    'turn the autotune down a touch',
    'who signed off on this mix',
    'fell asleep halfway through',
    'this is a skip for me',
    'the old stuff was better',
    'I wanted to like this',
    'video budget went where exactly',
    'not his best week',
    'this is filler',
  ],
  funny: [
    'the way he looked at the camera at 1:40 💀',
    'bro rented one car and used it four times',
    'not the drone shot of the same street',
    'who let him cook 😭',
    'the budget clearly went on the chain',
    'me showing up to work after this drops',
    'he really said "cinema" and meant it',
    'the dance break came out of nowhere',
    'I counted three outfit changes in ten seconds',
    'this is a whole movie and I am seated',
    'the cameo nobody asked for but everyone needed',
    'my data plan is mad at me for this',
  ],
  critical: [
    'good song, the video does not match it',
    'the story does not go anywhere',
    'too many cuts, let the shot breathe',
    'second half loses the plot',
    'the concept needed another pass',
    'great hook, weak bridge',
    'the colour grade is doing too much',
    'this could have been ninety seconds shorter',
    'solid but not the single',
    'the feature is wasted here',
    'production is carrying a thin idea',
  ],
  neutral: [
    'anyone know who produced this?',
    'what city is this shot in?',
    'is this on streaming yet',
    'came here from the chart',
    'first time hearing this artist',
    'what is the sample on this',
    'full version anywhere?',
    'adding this to the playlist',
    'is there a longer cut',
    'been waiting on this one',
    'how is this not bigger',
    'drop the tracklist',
  ],
};

/** Prime strides keep the walk from revisiting a phrase early. */
const BANK_STRIDE: Record<CommentMood, number> = {
  positive: 7,
  negative: 5,
  funny: 7,
  critical: 5,
  neutral: 5,
};

export interface CommentContext {
  /** How the video is actually performing. */
  performance: 'flop' | 'soft' | 'solid' | 'hit' | 'smash';
  /** The artist's standing, 0-100. */
  artistPopularity: number;
  genre: Genre;
  isPlayer: boolean;
  /** Song title, so a comment can name the record. */
  songTitle: string;
  artistName: string;
  /** Player's relationship with the artist, -100..100. Only for player videos. */
  relationship: number;
  /** Whether the song is currently on a chart. */
  onChart: boolean;
}

/**
 * Which mood a comment at this index carries. Weighted by how the video is
 * really doing: a flop invites criticism, a smash invites jokes and praise.
 */
function moodFor(ctx: CommentContext, roll: number): CommentMood {
  const table: Array<[CommentMood, number]> = (() => {
    switch (ctx.performance) {
      case 'smash':
        return [
          ['positive', 0.40],
          ['funny', 0.28],
          ['neutral', 0.14],
          ['critical', 0.11],
          ['negative', 0.07],
        ];
      case 'hit':
        return [
          ['positive', 0.36],
          ['funny', 0.20],
          ['neutral', 0.20],
          ['critical', 0.15],
          ['negative', 0.09],
        ];
      case 'solid':
        return [
          ['positive', 0.28],
          ['neutral', 0.26],
          ['critical', 0.20],
          ['funny', 0.14],
          ['negative', 0.12],
        ];
      case 'soft':
        return [
          ['neutral', 0.28],
          ['critical', 0.26],
          ['negative', 0.20],
          ['positive', 0.16],
          ['funny', 0.10],
        ];
      default:
        return [
          ['negative', 0.32],
          ['critical', 0.28],
          ['neutral', 0.24],
          ['funny', 0.09],
          ['positive', 0.07],
        ];
    }
  })();

  let acc = 0;
  for (const [mood, w] of table) {
    acc += w;
    if (roll <= acc) return mood;
  }
  return 'neutral';
}

/**
 * Build one comment. Deterministic for a given (video, index), so scrolling
 * back up never reshuffles the section.
 *
 * `bankCursor` counts how many comments of each mood have already been emitted
 * for this video, which is what guarantees the phrase is not repeated.
 */
function buildComment(
  video: Video,
  ctx: CommentContext,
  index: number,
  bankCursor: Record<CommentMood, number>,
  roster: NPC[],
): VideoComment {
  const seed = video.seed;
  const mood = moodFor(ctx, lane(seed, 'mood', index));

  const bank = BANK[mood];
  const stride = BANK_STRIDE[mood];
  const cursor = bankCursor[mood]++;
  const phraseIdx = (hashString(`${seed}|off|${mood}`) + cursor * stride) % bank.length;
  let content = bank[phraseIdx];

  // A handful of comments name the record or the artist, so the section reads
  // like it is about this video and not a generic wall of text.
  if (lane(seed, 'name', index) > 0.72) {
    const flavour = [
      `"${ctx.songTitle}" is the one`,
      `${ctx.artistName} really did that`,
      `been saying this about ${ctx.artistName} for a minute`,
      `this is why I rate ${ctx.artistName}`,
    ];
    const pick = flavour[Math.floor(lane(seed, 'namepick', index) * flavour.length) % flavour.length];
    content = mood === 'negative' || mood === 'critical' ? `${pick}... but not here` : pick;
  }

  // Artists comment too, and far less often than fans.
  const isArtistComment = roster.length > 0 && lane(seed, 'isartist', index) > 0.88;
  let author: NPC | null = null;
  if (roster.length > 0) {
    const artistPool = isArtistComment ? roster.filter((n) => n.role === 'artist') : roster;
    const pool = artistPool.length ? artistPool : roster;
    author = pool[Math.floor(lane(seed, 'author', index) * pool.length) % pool.length];
  }

  const authorIsArtist = isArtistComment && !!author && author.role === 'artist';
  const daySerial = video.uploadSerial + Math.floor(lane(seed, 'cday', index) * Math.max(1, 3));
  const minuteOfDay = 1 + Math.floor(lane(seed, 'cmin', index) * 1439);

  return {
    id: `c|${video.id}|${index}`,
    videoId: video.id,
    authorId: author ? author.id : `fan|${video.id}|${index}`,
    authorName: author ? author.name : fanName(seed, index),
    authorIsArtist,
    authorArtistId: authorIsArtist && author ? author.id : undefined,
    content,
    likes: Math.round(lane(seed, 'clikes', index) * Math.pow(index + 2, 0.62) * 26),
    dislikes: Math.round(lane(seed, 'cdislikes', index) * Math.pow(index + 2, 0.5) * 3),
    mood,
    daySerial,
    minuteOfDay,
    isPlayer: false,
  };
}

const FAN_FIRST = [
  'kwame', 'leila', 'marcus', 'aisha', 'tunde', 'sofia', 'diego', 'nadia',
  'kwesi', 'amara', 'yusuf', 'lena', 'tariq', 'bella', 'jomar', 'zanele',
  'musa', 'priya', 'andre', 'fatou', 'kofi', 'ines', 'omar', 'ruth',
];
const FAN_LAST = [
  'beats', 'vibes', 'music', '4life', 'sounds', 'waves', 'daily', 'hq',
  'nation', 'zone', 'central', 'radio', 'archive', 'notes',
];

function fanName(seed: number, index: number): string {
  const a = FAN_FIRST[Math.floor(lane(seed, 'fanf', index) * FAN_FIRST.length) % FAN_FIRST.length];
  const b = FAN_LAST[Math.floor(lane(seed, 'fanl', index) * FAN_LAST.length) % FAN_LAST.length];
  const n = Math.floor(lane(seed, 'fann', index) * 90) + 10;
  return `@${a}${b}${n}`;
}

/** How many comments a page of the section can actually show. */
export function availableComments(video: Video): number {
  return Math.max(0, Math.min(COMMENT_CEILING, video.commentCount));
}

/**
 * A page of the comment section. `offset` is how many are already on screen,
 * so "load more" simply asks for the next slice.
 */
export function commentPage(
  video: Video,
  ctx: CommentContext,
  roster: NPC[],
  offset: number,
  count = COMMENT_PAGE,
): VideoComment[] {
  const total = availableComments(video);
  if (offset >= total) return [];

  // Re-walk from zero so the bank cursors are correct for this page. The cost
  // is bounded by COMMENT_CEILING, which is small.
  const bankCursor: Record<CommentMood, number> = {
    positive: 0, negative: 0, funny: 0, critical: 0, neutral: 0,
  };
  const out: VideoComment[] = [];
  const end = Math.min(total, offset + count);
  for (let i = 0; i < end; i++) {
    const c = buildComment(video, ctx, i, bankCursor, roster);
    if (i >= offset) out.push(c);
  }
  return out;
}

/** Classify how a video is really doing, from its own numbers. */
export function performanceOf(video: Video, ctx: CommentContext['artistPopularity']): CommentContext['performance'] {
  const expected = Math.pow(Math.max(1, ctx) / 100, 2.2) * 2_600_000 + 12_000;
  const ratio = video.views / expected;
  if (ratio >= 3) return 'smash';
  if (ratio >= 1.3) return 'hit';
  if (ratio >= 0.45) return 'solid';
  if (ratio >= 0.15) return 'soft';
  return 'flop';
}

/** The player's own comment, plus any reply they have left. */
export function playerComment(
  videoId: string,
  content: string,
  daySerial: number,
  minuteOfDay: number,
  parentId?: string,
): VideoComment {
  return {
    id: `pc|${videoId}|${daySerial}|${minuteOfDay}|${Math.floor(at(content + daySerial) * 1e6)}`,
    videoId,
    authorId: 'player',
    authorName: 'You',
    authorIsArtist: true,
    content,
    likes: 0,
    dislikes: 0,
    mood: 'neutral',
    daySerial,
    minuteOfDay,
    isPlayer: true,
    parentId,
  };
}

/** Replies the world leaves on the player's own comments, a few days later. */
export function repliesTo(
  video: Video,
  ctx: CommentContext,
  roster: NPC[],
  parent: VideoComment,
  daySerial: number,
): VideoComment[] {
  const seed = hashString(`reply|${parent.id}`);
  const n = 1 + Math.floor(makeRng(seed)() * 3);
  const out: VideoComment[] = [];
  const bankCursor: Record<CommentMood, number> = {
    positive: 0, negative: 0, funny: 0, critical: 0, neutral: 0,
  };
  for (let i = 0; i < n; i++) {
    const r = makeRng(seed + i * 7919);
    const c = buildComment(video, ctx, 900 + i + (hashString(parent.id) % 90), bankCursor, roster);
    out.push({
      ...c,
      id: `r|${parent.id}|${i}`,
      parentId: parent.id,
      daySerial: daySerial + Math.floor(r() * 2),
      likes: Math.round(r() * 24),
    });
  }
  return out;
}

// ─── RECOMMENDATIONS ───────────────────────────────────────────────────────
// A mix, not a leaderboard: what is popular, what is rising, what is local,
// what the player follows, and what is in the same lane. Deterministic per
// (day, country), so the row is stable through a session but moves over time.

export interface RecommendInput {
  video: Video;
  /** Lifetime views. */
  views: number;
  /** Views over the last seven days, which is what "rising" means. */
  week: number;
  country: string;
  genre: Genre;
  /** Subscriber list, artist ids. */
  subscribedArtists: Set<string>;
  /** Artists in the watch history, newest first. */
  watchedArtists: string[];
  /** How far down the country's own chart this artist sits, 0 if absent. */
  localRank: number;
}

export interface ScoredVideo {
  video: Video;
  score: number;
  reason: string;
}

/**
 * Score one candidate for one viewer. `seedKey` is the day + country, so the
 * same video scores the same all day and differently tomorrow.
 */
export function scoreRecommendation(
  input: RecommendInput,
  seedKey: string,
): ScoredVideo {
  const v = input.video;
  const noise = lane(hashString(seedKey), `rec|${v.id}`);

  let score = 0;
  const reasons: Array<[string, number]> = [];

  // Popular — logarithmic, so the biggest video does not own the whole row.
  // Deliberately the smallest of the three content weights: "popular" is true
  // of every charting video, so it should not be the label on all of them.
  const pop = Math.min(1, Math.log10(1 + input.views) / 6.6);
  score += pop * 0.34;
  if (pop > 0.55) reasons.push(['Popular', pop * 0.34]);

  // Rising — the video is accelerating, measured against its own recent past.
  //
  // Two earlier versions of this were wrong, both measured:
  //  1. `input.week / input.views` compared a country-scoped week against a
  //     global lifetime — a fraction of a percent for every video on earth, so
  //     the badge never fired once.
  //  2. `own.week / v.views` fixed that but saturated: the platform is only
  //     weeks old, so almost every video earns most of its lifetime in the last
  //     seven days and 6 of 8 badges read "Rising".
  // Comparing the last three days against the three before them is the only
  // version that means "rising" regardless of how old the world is.
  const h = v.hist ?? [];
  const own = videoTotals(v);
  let rise = 0;
  if (h.length >= 6) {
    const recent = (h[h.length - 1] + h[h.length - 2] + h[h.length - 3]) / 3;
    const prior = (h[h.length - 4] + h[h.length - 5] + h[h.length - 6]) / 3;
    if (prior > 0) rise = Math.min(1, Math.max(0, (recent / prior - 1) / 1.2));
  } else if (v.views > 0) {
    // Too new for two windows — the whole record is still one burst.
    rise = Math.min(1, (own.week / v.views) * 6) * 0.5;
  }
  score += rise * 0.6;
  if (rise > 0.35) reasons.push(['Rising', rise * 0.6]);

  // Local — this artist is doing something in the viewer's country.
  if (input.localRank > 0 && input.localRank <= 40) {
    const local = 1 - input.localRank / 40;
    score += local * 0.5;
    reasons.push(['Local', local * 0.5]);
  }

  // Followed — the player subscribes to this artist.
  if (input.subscribedArtists.has(v.artistId)) {
    score += 0.9;
    reasons.push(['Subscribed', 0.9]);
  }

  // Watched before — a mild pull back toward a familiar artist.
  const watchedIdx = input.watchedArtists.indexOf(v.artistId);
  if (watchedIdx >= 0) {
    const recency = 1 - Math.min(1, watchedIdx / 24);
    score += recency * 0.42;
    reasons.push(['Because you watched', recency * 0.42]);
  }

  // Similar lane — same genre, and it should not dominate.
  if (v.artistGenre && v.artistGenre === input.genre) {
    score += 0.26;
    reasons.push(['Same lane', 0.26]);
  }

  // A little genuine randomness, so the row is not the same six names forever.
  score += noise * 0.4;

  reasons.sort((a, b) => b[1] - a[1]);
  return { video: v, score, reason: reasons[0]?.[0] ?? 'For you' };
}

// ─── NPC UPLOADS ───────────────────────────────────────────────────────────

const NPC_CONCEPTS = [
  'one-take street shoot',
  'rooftop at golden hour',
  'night drive through the city',
  'studio session footage',
  'performance clip, no plot',
  'vintage tape aesthetic',
  'dance-led visual',
  'documentary style behind the scenes',
  'neon-lit warehouse',
  'split-screen narrative',
];

const NPC_STYLES = [
  'grainy 16mm',
  'high-contrast monochrome',
  'saturated colour grade',
  'soft film emulation',
  'handheld documentary',
  'anamorphic widescreen',
  'minimal, single location',
  'cut-heavy montage',
];

/**
 * How likely an NPC is to shoot a video for a song this week.
 *
 * Tuned against a measurement, not a guess: the first version produced about a
 * third of an upload per week across the whole world, which left the platform
 * looking frozen. This yields a few new visuals a week — enough that the
 * "New" and "Recently uploaded" rows actually change while the player is away.
 */
export function npcVideoChance(npc: NPC, weeksOut: number): number {
  if (weeksOut > 8) return 0;
  const fame = Math.max(0, Math.min(100, npc.fame)) / 100;
  const signed = npc.team?.label ? 1 : 0.55;
  const freshness = weeksOut <= 2 ? 1 : weeksOut <= 5 ? 0.6 : 0.3;
  return Math.min(0.85, (0.12 + Math.pow(fame, 1.5) * 0.62) * signed * freshness);
}

/** Deterministically decide whether this NPC shoots this song this week. */
export function npcShootsVideo(npcId: string, songId: string, weekSerial: number, chance: number): boolean {
  return lane(hashString(`${npcId}|${songId}|${weekSerial}`), 'shoots') < chance;
}

export function npcConcept(seed: number): string {
  return NPC_CONCEPTS[Math.floor(lane(seed, 'concept') * NPC_CONCEPTS.length) % NPC_CONCEPTS.length];
}

export function npcStyle(seed: number): string {
  return NPC_STYLES[Math.floor(lane(seed, 'style') * NPC_STYLES.length) % NPC_STYLES.length];
}

/**
 * A name for whoever shot an NPC's video.
 *
 * Deliberately NOT the concept string — an earlier version passed a concept in
 * here and the watch page read "Directed by rooftop at golden hour".
 */
const DIRECTOR_FIRST = [
  'Kofi', 'Mara', 'Ike', 'Nadia', 'Theo', 'Yuki', 'Amara', 'Diego',
  'Zanele', 'Ravi', 'Lena', 'Musa', 'Ines', 'Jomar', 'Fatou', 'Omar',
];
const DIRECTOR_LAST = [
  'Lens', 'Vex', 'Blanks', 'Sol', 'Kane', 'Rae', 'Mensah', 'Okoro',
  'Duarte', 'Nkosi', 'Bello', 'Ferrer', 'Haddad', 'Petrov', 'Silva',
];

export function npcDirectorName(seed: number): string {
  const a = DIRECTOR_FIRST[Math.floor(lane(seed, 'dirfirst') * DIRECTOR_FIRST.length) % DIRECTOR_FIRST.length];
  const b = DIRECTOR_LAST[Math.floor(lane(seed, 'dirlast') * DIRECTOR_LAST.length) % DIRECTOR_LAST.length];
  return `${a} ${b}`;
}

/**
 * Seed the platform with a back catalogue, so it is not empty on day one.
 *
 * Only the songs that already carry a video flag get one, and each is given a
 * plausible history: a real lifetime view count, a real like ratio, and a daily
 * history that the engine will carry on from. Nothing here is re-rolled on
 * load — it is derived from the ids.
 */
export function buildInitialVideos(opts: {
  songs: Song[];
  npcs: NPC[];
  nowSerial: number;
  nowDate: string;
  limit?: number;
}): Video[] {
  const limit = opts.limit ?? 220;
  const npcById = new Map(opts.npcs.map((n) => [n.id, n]));
  const out: Video[] = [];

  // Newest first — a platform leads with what is current, not what is oldest.
  const candidates = opts.songs
    .filter((s) => s.ownerId && s.hasVideo && s.totalStreams > 0)
    .sort((a, b) => (a.weeksOut ?? 99) - (b.weeksOut ?? 99))
    .slice(0, limit);

  for (const song of candidates) {
    const npc = npcById.get(song.ownerId!);
    if (!npc) continue;

    const id = `vid-npc-${song.id}`;
    const seed = videoSeed(id);
    const budget = Math.round(2_000 + Math.pow(npc.fame / 100, 1.8) * 180_000);
    const quality = shootQuality({
      directorSkill: Math.min(100, 22 + npc.fame * 0.62),
      budget,
      songQuality: song.quality,
      seed,
    });

    // Views scale with the record's own reach, so a hit single has a hit video.
    const reach = Math.min(1, Math.log10(1 + Math.max(0, song.totalStreams)) / 7.6);
    const views = Math.round(
      Math.pow(npc.fame / 100, 1.9) * 900_000 * reach * (0.5 + lane(seed, 'seedviews') * 1.4) +
        song.totalStreams * 0.06,
    );

    const weeksOut = song.weeksOut ?? 1;
    const uploadSerial = opts.nowSerial - Math.min(400, Math.round(weeksOut * 7 + lane(seed, 'age') * 6));

    const video = createVideo({
      id,
      songId: song.id,
      songTitle: song.title,
      title: videoTitle(song.title, seed, npc.genre),
      artistId: npc.id,
      artistName: npc.name,
      artistCountry: song.ownerCountry ?? npc.country,
      artistGenre: npc.genre,
      directorId: 'npc-director',
      directorName: npcDirectorName(seed),
      concept: npcConcept(seed),
      visualStyle: npcStyle(seed),
      quality,
      budget,
      marketingBudget: Math.round(budget * 0.22),
      uploadSerial,
      uploadDate: opts.nowDate,
      isPlayer: false,
      songQuality: song.quality,
    });

    video.views = Math.max(0, views);
    video.likes = Math.round(video.views * (0.03 + lane(seed, 'seedlike') * 0.05));
    video.dislikes = Math.round(video.views * (0.002 + lane(seed, 'seeddis') * 0.006));
    video.commentCount = Math.round(video.views * (0.0015 + lane(seed, 'seedcom') * 0.0025));

    // A decayed daily history running up to today.
    const decayed: number[] = [];
    const peak = video.views / Math.max(6, weeksOut * 5);
    for (let i = VIDEO_HISTORY_DAYS - 1; i >= 0; i--) {
      const age = Math.max(0, weeksOut * 7 - i);
      const t = videoTrajectory(seed, age);
      decayed.push(Math.round(peak * t * dayJitter(seed, uploadSerial + i)));
    }
    video.hist = decayed;
    video.peakDay = Math.max(...decayed, 0);

    out.push(video);
  }

  return out;
}

// ─── TITLES ────────────────────────────────────────────────────────────────
const TITLE_SUFFIX = [
  'Official Video',
  'Official Music Video',
  'Visualizer',
  'Short Film',
  'Official Visual',
  'Live Session',
];

export function videoTitle(songTitle: string, seed: number, _genre?: Genre): string {
  const suffix = TITLE_SUFFIX[Math.floor(lane(seed, 'suffix') * TITLE_SUFFIX.length) % TITLE_SUFFIX.length];
  return `${songTitle} (${suffix})`;
}

// ─── SEARCH ────────────────────────────────────────────────────────────────

export function matchesVideo(video: Video, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    video.title.toLowerCase().includes(q) ||
    video.artistName.toLowerCase().includes(q) ||
    video.songTitle.toLowerCase().includes(q)
  );
}

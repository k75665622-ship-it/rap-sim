// ─── SOCIAL, LIVE ──────────────────────────────────────────────────────────
//
// A post is not a number that appears. It is posted at a minute of the game
// day, and from then on likes, reposts, comments and views keep arriving —
// fast at first, then slower — until it settles a few days later. The final
// size is set by WHO posted it: a global superstar's photo collects millions
// of likes and thousands of comments within the hour; a local artist's gets a
// few hundred. Everything shown on screen is read through `liveCounts`, so the
// numbers move while you watch.
//
// Pure: no store, no clock. Rolls are passed in.

import type { NPC, SocialPost } from '../types/game';
import type { SocialApp } from './social';
import { hashString } from './rng';
import { isRealId } from './realPeople';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Big markets put more people behind the same level of fame. */
const MARKET: Record<string, number> = {
  USA: 3, Canada: 3, UK: 2.4, 'United Kingdom': 2.4, France: 1.8, Germany: 1.6, Jamaica: 1.2,
  Nigeria: 1, 'South Africa': 0.9, Ghana: 0.6, Kenya: 0.6, Brazil: 1.6, Mexico: 1.4, Colombia: 1.3,
};

/**
 * How many people follow an account, from who they are.
 *
 * Calibrated on purpose: a fame-97 global star lands around a hundred million,
 * a fame-86 African heavyweight around five million, a fame-30 local act under
 * a thousand. The curve is exponential because fame is.
 */
export function audienceOf(npc: Pick<NPC, 'fame' | 'tier' | 'country' | 'role' | 'id'>): number {
  const tier = npc.tier === 'international' ? 2 : npc.tier === 'national' ? 1.3 : 1;
  const market = MARKET[npc.country] ?? 0.8;
  const role = npc.role === 'artist' ? 1 : npc.role === 'media' || npc.role === 'blogger' ? 0.6 : npc.role === 'fan_account' ? 0.25 : 0.15;
  const jitter = 0.8 + ((hashString(npc.id) % 1000) / 1000) * 0.4;
  return Math.max(60, Math.round(Math.pow(10, 1.3 + clamp(npc.fame, 0, 100) * 0.062) * tier * market * role * jitter));
}

/** Per-app shape: how much of an audience engages, and how fast. */
export const APP_SHAPE: Record<SocialApp, { like: number; share: number; comment: number; tau: number; views: number }> = {
  // Chirp moves fast and dies fast; reposts are the currency.
  chirp: { like: 0.012, share: 0.22, comment: 0.03, tau: 150, views: 9 },
  // Snapgram is the like machine.
  snapgram: { like: 0.04, share: 0.02, comment: 0.008, tau: 360, views: 0 },
  // Clip is views first, and a slow burn: the algorithm can find a post late.
  clip: { like: 0.075, share: 0.06, comment: 0.012, tau: 720, views: 1 },
  // Circle is small and loyal.
  circle: { like: 0.09, share: 0.01, comment: 0.06, tau: 240, views: 0 },
};

export interface LiveTarget { likes: number; shares: number; comments: number; views: number }

/**
 * What a post will end up with, from the poster's audience. `heat` (0-3) is
 * how much the post is a moment — a release, a beef, a viral clip.
 */
export function postTarget(opts: { audience: number; app: SocialApp; heat?: number; roll: number; viral?: boolean }): LiveTarget {
  const s = APP_SHAPE[opts.app];
  const swing = 0.45 + opts.roll * 1.1;
  const heat = 1 + (opts.heat ?? 0) * 0.6;
  const viral = opts.viral ? 6 + opts.roll * 14 : 1;
  if (opts.app === 'clip') {
    // The algorithm favours the small: a new account can out-view its follower
    // count many times over; a megastar's clip reaches a fraction of theirs.
    const small = clamp(3 - Math.log10(Math.max(10, opts.audience)) / 3, 1, 2.5);
    const views = Math.round(opts.audience * (0.1 + opts.roll * 0.6) * small * heat * viral);
    const likes = Math.round(views * s.like * swing);
    return { views, likes, shares: Math.round(likes * s.share), comments: Math.max(1, Math.round(likes * s.comment)) };
  }
  const likes = Math.max(3, Math.round(opts.audience * s.like * swing * heat * viral));
  return {
    likes,
    shares: Math.round(likes * s.share * (0.6 + opts.roll)),
    comments: Math.max(1, Math.round(likes * s.comment * (0.5 + opts.roll))),
    views: s.views ? Math.round(likes * s.views * (0.8 + opts.roll * 0.6)) : 0,
  };
}

/** The share of a post's final numbers it has collected after `minutes`. */
export function liveFraction(app: SocialApp, minutes: number): number {
  if (minutes <= 0) return 0.002;
  const tau = APP_SHAPE[app]?.tau ?? 240;
  // Front-loaded: the first half hour is when a post catches or doesn't.
  return clamp(1 - Math.exp(-Math.pow(minutes / tau, 0.7)), 0.002, 1);
}

/** What a post shows right now. Posts from before this existed show what they stored. */
export function liveCounts(post: SocialPost, nowMinute: number): LiveTarget {
  const own = { likes: post.liked ? 1 : 0, shares: post.reposted ? 1 : 0 };
  if (!post.target || post.postedMinute === undefined) {
    return { likes: post.likes, shares: post.shares, comments: post.comments.length, views: post.views ?? 0 };
  }
  const f = liveFraction(post.platform as SocialApp, nowMinute - post.postedMinute);
  return {
    likes: Math.round(post.target.likes * f) + own.likes,
    shares: Math.round(post.target.shares * f) + own.shares,
    comments: Math.max(visibleComments(post.comments, nowMinute).length, Math.round(post.target.comments * f)),
    views: Math.round(post.target.views * f),
  };
}

/** "2m", "3h", "Tue" — how long ago, in game time. */
export function minutesAgo(nowMinute: number, postedMinute: number | undefined, daySerial?: number, nowSerial?: number): string {
  if (postedMinute === undefined) {
    if (daySerial === undefined || nowSerial === undefined) return '';
    const d = nowSerial - daySerial;
    return d <= 0 ? 'today' : `${d}d`;
  }
  const m = Math.max(0, nowMinute - postedMinute);
  if (m < 1) return 'now';
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  const d = Math.floor(m / 1440);
  return d < 7 ? `${d}d` : `${Math.floor(d / 7)}w`;
}

// ─── STORIES ───────────────────────────────────────────────────────────────

export interface StoryFrame {
  emoji: string;
  /** Gradient seed for the background. */
  bg: string;
  /** A caption on the frame. Never words for a real-named artist. */
  text?: string;
  /** A song sticker. */
  songTitle?: string;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  frames: StoryFrame[];
  postedMinute: number;
  views: number;
  seen?: boolean;
  /** The player's own story reached this many people. */
  reach?: number;
  kind?: string;
}

export const STORY_KINDS = [
  { id: 'studio', label: 'In the studio', emoji: '🎙️', energy: 2, blurb: 'A clip from the session. Fans love a peek.', frames: ['🎙️', '🎛️', '🔥'] },
  { id: 'teaser', label: 'Song teaser', emoji: '🎵', energy: 3, blurb: '15 seconds of a released song. Pulls a few streams.', frames: ['🎵', '🎧', '📈'], needsSong: true },
  { id: 'night', label: 'Night out', emoji: '🍾', energy: 2, blurb: 'Lights, the team, the city.', frames: ['🌃', '🍾', '🕺'] },
  { id: 'bts', label: 'Behind the scenes', emoji: '🎬', energy: 2, blurb: 'Rehearsals, the van, the green room.', frames: ['🎬', '🚐', '🎤'] },
  { id: 'qa', label: 'Ask me anything', emoji: '❓', energy: 4, blurb: 'A question sticker. The replies build loyalty.', frames: ['❓', '💬', '🫶'] },
  { id: 'flex', label: 'The flex', emoji: '💎', energy: 2, blurb: 'The chain, the car, the fit. Some love it, some don\'t.', frames: ['💎', '🚘', '👟'] },
] as const;
export type StoryKind = (typeof STORY_KINDS)[number]['id'];

const STAR_FRAMES = ['📸', '🎥', '🌍', '✈️', '🏟️', '🎤', '🖤', '🔥', '🌙', '🏝️', '🎧', '🍾'];

/** A story somebody in the scene posts. Real-named artists post pictures, not words. */
export function npcStory(npc: Pick<NPC, 'id' | 'name' | 'fame' | 'tier' | 'country' | 'role'>, minute: number, roll: number): Story {
  const real = isRealId(npc.id);
  const n = 1 + Math.floor(roll * 3);
  const frames: StoryFrame[] = [];
  const captions = ['studio tonight', 'on the road', 'new fit', 'rehearsals', 'soon 👀', 'grateful', 'city lights', 'with the team'];
  for (let i = 0; i < n; i++) {
    const seed = `${npc.id}|${minute}|${i}`;
    frames.push({
      emoji: STAR_FRAMES[hashString(seed) % STAR_FRAMES.length],
      bg: seed,
      text: real ? undefined : roll > 0.4 ? captions[hashString(seed + 't') % captions.length] : undefined,
    });
  }
  return {
    id: `story:${npc.id}:${minute}`,
    authorId: npc.id,
    authorName: npc.name,
    frames,
    postedMinute: minute,
    views: Math.round(audienceOf(npc) * (0.08 + roll * 0.2)),
  };
}

// ─── GOING LIVE ────────────────────────────────────────────────────────────

export interface LiveSession {
  app: SocialApp;
  peak: number;
  gifts: number;
  follows: number;
  joinedBy?: { id: string; name: string };
  trolls: boolean;
  lines: string[];
  minute: number;
}

/** An hour live. Viewers come from followers and heat; gifts from the loyal ones. */
export function liveSession(opts: { app: SocialApp; followers: number; momentum: number; charisma: number; loyalty: number; guest?: { id: string; name: string; fame: number }; roll: number; minute: number }): LiveSession {
  const { app, followers, momentum, charisma, loyalty, guest, roll } = opts;
  const heat = 1 + momentum / 100 + charisma / 200;
  let peak = Math.max(3, Math.round(followers * (0.015 + roll * 0.05) * heat));
  if (guest) peak = Math.round(peak * (1.6 + guest.fame / 60));
  const gifts = Math.round(peak * (0.04 + loyalty / 1000) * (0.5 + roll) * (app === 'clip' ? 1.3 : 1));
  const follows = Math.round(peak * (0.04 + roll * 0.06));
  const trolls = roll < 0.12;
  const lines: string[] = [];
  lines.push(`Went live on ${app === 'clip' ? 'Clip' : 'Snapgram'} — ${peak.toLocaleString()} watching at the peak.`);
  if (guest) lines.push(`${guest.name} joined the live. The comments exploded.`);
  if (gifts > 0) lines.push(`Fans sent $${gifts.toLocaleString()} in gifts.`);
  if (trolls) lines.push('A troll raid flooded the chat for ten minutes. You kept your cool — mostly.');
  else if (roll > 0.8) lines.push('Somebody clipped your best moment. It\'s going around.');
  return { app, peak, gifts, follows, joinedBy: guest ? { id: guest.id, name: guest.name } : undefined, trolls, lines, minute: opts.minute };
}

/** Comments that have actually arrived by now (older comments carry no minute). */
export function visibleComments<T extends { minute?: number }>(comments: T[], nowMinute: number): T[] {
  return comments.filter((c) => c.minute === undefined || c.minute <= nowMinute);
}

/** When each of n comments lands after a post: most in the first hours. */
export function commentMinutes(postedMinute: number, n: number, seed: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = ((seed * 9301 + i * 49297) % 233280) / 233280;
    out.push(postedMinute + 1 + Math.round(Math.pow((i + r) / n, 2.2) * 600));
  }
  return out.sort((a, b) => a - b);
}

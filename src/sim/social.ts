// ─── SOCIAL v2: FOUR APPS, ONE SCENE ───────────────────────────────────────
//
// Chirp is the timeline (text, threads, receipts). Snapgram is the image
// (photos, cover art, the flex). Clip is the short video (challenges,
// freestyles, behind the scenes) and the only one where a song can be pulled
// up the charts by a fifteen-second dance. Circle is the community: the day
// ones, Q&As, the loyal core.
//
// Every post has an audience it can reach (followers on THAT app), a kind
// that suits the app or doesn't, and a list of people tagged. Engagement is
// not instant: a post keeps collecting for a few days, and some of them blow
// up. Comments come from real kinds of people — stans, haters, trolls, other
// artists, rival fanbases — and the people you tag decide whether to answer.
//
// Pure: no store, no clock. Rolls are passed in.
//
// Real-name rule: real artists never get words written for them. They can
// like, repost or stay silent; anything they "say" is reported, not quoted.

import type { NPC, SocialPost, SocialComment } from '../types/game';
import { hashString } from './rng';
import { traitsOf } from './offers';
import { isRealId } from './realPeople';

export type SocialApp = 'chirp' | 'snapgram' | 'clip' | 'circle';
export const SOCIAL_APPS: SocialApp[] = ['chirp', 'snapgram', 'clip', 'circle'];

export type PostKind =
  | 'thought' | 'announce' | 'thread'
  | 'photo' | 'carousel' | 'cover'
  | 'challenge' | 'freestyle' | 'bts' | 'skit'
  | 'community' | 'qa';

export interface PostKindDef {
  id: PostKind;
  label: string;
  emoji: string;
  app: SocialApp;
  blurb: string;
  /** How far it travels compared to a plain post on the same app. */
  reach: number;
  /** Chance it blows up, before quality and heat. */
  virality: number;
  /** Needs a released song attached. */
  needsSong?: boolean;
  energy: number;
}

export const POST_KINDS: PostKindDef[] = [
  { id: 'thought', label: 'Post', emoji: '💭', app: 'chirp', blurb: 'Whatever is on your mind.', reach: 1, virality: 0.01, energy: 3 },
  { id: 'announce', label: 'Announcement', emoji: '📣', app: 'chirp', blurb: 'New music, a show, big news. Attach a song.', reach: 1.25, virality: 0.015, energy: 3 },
  { id: 'thread', label: 'Thread', emoji: '🧵', app: 'chirp', blurb: 'A long one. People read threads.', reach: 1.1, virality: 0.02, energy: 5 },
  { id: 'photo', label: 'Photo', emoji: '📸', app: 'snapgram', blurb: 'Studio, stage, lifestyle.', reach: 1, virality: 0.01, energy: 3 },
  { id: 'carousel', label: 'Photo dump', emoji: '🗂️', app: 'snapgram', blurb: 'Ten slides of the week.', reach: 1.15, virality: 0.015, energy: 4 },
  { id: 'cover', label: 'Cover art reveal', emoji: '🖼️', app: 'snapgram', blurb: 'The artwork. Attach the song.', reach: 1.3, virality: 0.02, needsSong: true, energy: 3 },
  { id: 'challenge', label: 'Dance challenge', emoji: '💃', app: 'clip', blurb: 'Start a challenge on your song. When it catches, the song climbs.', reach: 1.2, virality: 0.07, needsSong: true, energy: 8 },
  { id: 'freestyle', label: 'Freestyle', emoji: '🎤', app: 'clip', blurb: 'Bars on camera. Your freestyle skill shows.', reach: 1.1, virality: 0.045, energy: 6 },
  { id: 'bts', label: 'Behind the scenes', emoji: '🎬', app: 'clip', blurb: 'Studio clips, tour life, the real you.', reach: 1, virality: 0.02, energy: 4 },
  { id: 'skit', label: 'Skit', emoji: '😂', app: 'clip', blurb: 'Funny wins. Charisma decides if it is.', reach: 1.05, virality: 0.04, energy: 5 },
  { id: 'community', label: 'Community update', emoji: '🫂', app: 'circle', blurb: 'Talk straight to the day ones. Builds loyalty.', reach: 1, virality: 0, energy: 3 },
  { id: 'qa', label: 'Q&A with fans', emoji: '❓', app: 'circle', blurb: 'Answer questions for an hour. Loyalty goes up.', reach: 1.1, virality: 0, energy: 8 },
];

export function kindsFor(app: SocialApp): PostKindDef[] {
  return POST_KINDS.filter((k) => k.app === app);
}
export function kindDef(id: PostKind | undefined): PostKindDef {
  return POST_KINDS.find((k) => k.id === id) ?? POST_KINDS[0];
}

export const APP_META: Record<SocialApp, { name: string; mark: string; color: string; tagline: string; limit: number; rate: number; share: number }> = {
  chirp: { name: 'Chirp', mark: 'C', color: '#4DA3FF', tagline: 'The timeline', limit: 280, rate: 0.022, share: 0.16 },
  snapgram: { name: 'Snapgram', mark: 'S', color: '#E93D82', tagline: 'Photos and the flex', limit: 2200, rate: 0.055, share: 0.03 },
  clip: { name: 'Clip', mark: '▶', color: '#12A594', tagline: 'Short video', limit: 300, rate: 0.07, share: 0.09 },
  circle: { name: 'Circle', mark: 'O', color: '#F5B301', tagline: 'Your community', limit: 3000, rate: 0.12, share: 0.02 },
};

/** Followers on each app, seeded from a fanbase the first time. */
export function seedFollowers(app: SocialApp, fanbase: number): number {
  const share = app === 'chirp' ? 0.55 : app === 'snapgram' ? 0.85 : app === 'clip' ? 0.6 : 0.12;
  return Math.max(app === 'circle' ? 5 : 40, Math.round(fanbase * share));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const unit = (seed: string) => (hashString(seed) % 10_000) / 10_000;
const pick = <T,>(arr: T[], seed: string): T => arr[hashString(seed) % arr.length];

// ─── HOW FAR A POST GOES ───────────────────────────────────────────────────

export interface ReachInput {
  app: SocialApp;
  kind: PostKind;
  followers: number;
  fame: number;
  momentum: number;
  /** Quality of an attached record, if any. */
  songQuality?: number;
  /** How many posts the player already made today, on any app. */
  postsToday: number;
  /** People tagged, and whether they amplify it. */
  taggedFame: number[];
  /** Picking a fight, or naming a rival. */
  controversy: boolean;
  /** 0-100 craft stat that matters for this kind (freestyle → freestyle, skit → charisma). */
  craft: number;
  roll: number;
  /** Extra reach from your team — a photographer on your socials. */
  boost?: number;
}

export interface Reach {
  likes: number;
  shares: number;
  comments: number;
  views: number;
  viral: boolean;
  /** New followers on this app. */
  follows: number;
  note: string;
}

export function postReach(i: ReachInput): Reach {
  const meta = APP_META[i.app];
  const k = kindDef(i.kind);
  const spam = 1 / (1 + Math.max(0, i.postsToday - 2) * 0.4);
  const song = i.songQuality !== undefined ? 0.6 + i.songQuality / 100 : 1;
  const heat = 1 + i.momentum / 150;
  const tagBoost = 1 + i.taggedFame.reduce((a, f) => a + clamp(f / Math.max(10, i.fame), 0, 3) * 0.12, 0);
  const craft = 0.75 + i.craft / 200;
  const fight = i.controversy ? 1.6 : 1;
  const base = Math.max(30, i.followers) * k.reach * song * heat * tagBoost * craft * fight * spam * (0.7 + i.roll * 0.6) * (1 + (i.boost ?? 0));

  const viralChance = k.virality * (i.songQuality !== undefined ? i.songQuality / 70 : 1) * heat * (i.kind === 'freestyle' || i.kind === 'skit' ? craft * 1.4 : 1) * spam;
  const viral = unit(`${i.roll}|viral`) < viralChance;
  const viralMult = viral ? 6 + i.roll * 20 : 1;

  const views = i.app === 'clip' || i.kind === 'bts' ? Math.round(base * (0.8 + i.roll * 1.2) * viralMult) : 0;
  const audience = (i.app === 'clip' ? views : base * viralMult);
  const likes = Math.max(2, Math.round(audience * meta.rate * (i.app === 'clip' ? 1 : 1.2)));
  const shares = Math.round(likes * meta.share * (i.controversy ? 1.8 : 1));
  // Even a small account has friends, family and the first few fans in the comments.
  const floor = 2 + Math.round(Math.log2(1 + Math.max(0, i.followers) / 120));
  const comments = Math.max(floor, Math.round(likes * (i.kind === 'qa' ? 0.25 : i.controversy ? 0.12 : 0.045)));
  const follows = Math.round(likes * (viral ? 0.35 : 0.04) + (i.kind === 'qa' || i.kind === 'community' ? likes * 0.02 : 0));

  const note = viral
    ? i.app === 'clip' ? 'It\'s blowing up — the algorithm picked it.' : 'It\'s going viral.'
    : spam < 0.8 ? 'You have posted a lot today. People are scrolling past.'
    : likes > i.followers * meta.rate * 2.4 ? 'Doing better than usual.'
    : '';
  return { likes, shares, comments, views, viral, follows, note };
}

// ─── WHO COMMENTS, AND WHAT THEY SAY ───────────────────────────────────────

const HANDLE_A = ['kofi', 'ama', 'yaw', 'esi', 'tunde', 'zainab', 'kwame', 'adwoa', 'chidi', 'nana', 'jay', 'lola', 'drey', 'mimi', 'kay', 'tobi', 'efua', 'sam', 'naa', 'dela'];
const HANDLE_B = ['vibes', 'thegreat', 'og', '_stan', 'world', 'xx', '_official', 'onthebeat', 'gh', 'ng', 'daily', '_real', 'sound', 'hq', 'nation', '99', '2k', 'fm', 'tv', '_x'];

export function fanHandle(seed: string): string {
  return `${pick(HANDLE_A, seed + 'a')}${pick(HANDLE_B, seed + 'b')}`;
}

const NAME_STOP = new Set(['black', 'king', 'young', 'lil', 'big', 'the', 'dj', 'mc', 'mr', 'mz', 'kid', 'baby', 'lady', 'queen', 'prince', 'sir', 'yung', 'little']);

export function fanbaseNameFor(artistName: string, seed: string): string {
  const words = artistName.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
  // "Black Sherif" is not "Black Nation". Skip the generic first word.
  const first = (words.length > 1 && (NAME_STOP.has(words[0].toLowerCase()) || words[0].length <= 2) ? words[1] : words[0]) ?? 'Day One';
  return pick([`${first} Nation`, `${first} Army`, `${first}heads`, `Team ${first}`, `${first} Gang`, `${first}verse`], seed);
}

type Tone = 'stan' | 'love' | 'neutral' | 'hater' | 'troll' | 'rival';

const LINES: Record<Tone, string[]> = {
  stan: ['GOAT behaviour 🐐', 'I will defend this man with my life', 'Day one, never left 🫡', 'They not ready for what\'s coming', 'Underrated is an understatement', 'Streaming this till my phone dies'],
  love: ['This is hard 🔥', 'Need this on repeat', 'Big energy 🙌', 'Love to see it', 'Okay this one hit', 'Proud of you fr'],
  neutral: ['First 🥇', 'Who else is here from the timeline', 'Hmm okay', 'Dropping when?', 'Interesting', 'The lighting in this 👀'],
  hater: ['Mid. Next.', 'Industry plant behaviour', 'This ain\'t it chief', 'Y\'all hype anything', 'Fell off before he even got on', 'Nobody asked'],
  troll: ['Ratio', 'Who is this', 'Bro thinks he\'s him 😂', 'Delete this', 'Your PR team wrote this', 'L'],
  rival: ['{RIVALFANS} could never', '{RIVAL} did this better last year', 'Come back when you\'re on {RIVAL}\'s level', '#{RIVALTAG} 👑'],
};

export interface CommentContext {
  fame: number;
  reputation: number;
  controversy: boolean;
  rivalName?: string;
  rivalFans?: string;
  /** Artists who might drop a comment (friends, tagged). Never real-named ones. */
  artistFriends: { id: string; name: string }[];
  seed: string;
}

/** A batch of comments that reads like a real comment section. */
export function generateComments(post: Pick<SocialPost, 'id' | 'content'>, count: number, ctx: CommentContext, now: string): SocialComment[] {
  const out: SocialComment[] = [];
  const n = clamp(count, 0, 14);
  const hateShare = clamp(0.12 + (50 - ctx.reputation) / 300 + (ctx.controversy ? 0.18 : 0), 0.05, 0.55);
  const stanShare = clamp(0.15 + ctx.fame / 300, 0.1, 0.45);
  for (let i = 0; i < n; i++) {
    const r = unit(`${ctx.seed}|${post.id}|${i}`);
    let tone: Tone;
    if (ctx.rivalName && r < 0.14) tone = 'rival';
    else if (r < 0.14 + hateShare * 0.6) tone = 'hater';
    else if (r < 0.14 + hateShare) tone = 'troll';
    else if (r < 0.14 + hateShare + stanShare) tone = 'stan';
    else if (r < 0.85) tone = 'love';
    else tone = 'neutral';
    const friend = ctx.artistFriends.length && unit(`${ctx.seed}|f|${i}`) < 0.2 ? ctx.artistFriends[i % ctx.artistFriends.length] : null;
    const text = friend
      ? pick(['🔥🔥🔥', 'Talk to them 😤', 'This is the one', 'Big bro moves', 'We locked in 🔒', 'Studio this week? 👀', 'Send me this one', 'You snapped on this', 'Chale this one dey 🔥', 'Na you dey run am', 'Respect 🙏🏾', 'When are we cooking?', 'Say less 🤝🏾', 'Proud of you fam', 'The vision is clear 💯', 'Remix. Me. Now. 😂'], `${ctx.seed}|${i}|fr`)
      : pick(LINES[tone], `${ctx.seed}|${post.id}|${i}|t`)
          .replace('{RIVALFANS}', ctx.rivalFans ?? 'Y\'all')
          .replace('{RIVAL}', ctx.rivalName ?? 'someone')
          .replace('{RIVALTAG}', (ctx.rivalName ?? 'Them').replace(/\s+/g, ''));
    out.push({
      id: `${post.id}-c${i}-${Math.floor(r * 1e6)}`,
      authorId: friend ? friend.id : `fan:${fanHandle(`${ctx.seed}|${post.id}|${i}`)}`,
      authorName: friend ? friend.name : `@${fanHandle(`${ctx.seed}|${post.id}|${i}`)}`,
      content: text,
      likes: Math.round((tone === 'stan' || tone === 'hater' ? 40 : 8) * (0.2 + r * 3)),
      timestamp: now,
      tone: friend ? 'artist' : tone,
    });
  }
  return out;
}

// ─── WHEN YOU TAG SOMEBODY ─────────────────────────────────────────────────

export type TagAction = 'reply' | 'repost' | 'like' | 'ignore' | 'clapback';

export function tagResponse(opts: { npc: NPC; playerFame: number; beef: boolean; insulting: boolean; roll: number }): { action: TagAction; text?: string; rel: number; heat: number } {
  const { npc, playerFame, beef, insulting, roll } = opts;
  const real = isRealId(npc.id);
  const t = traitsOf(npc);
  const rel = npc.relationshipScore;
  const gap = npc.fame - playerFame;
  const seed = `${npc.id}|${roll}`;

  if (beef || insulting) {
    if (real) return { action: 'ignore', rel: insulting ? -6 : -2, heat: insulting ? 6 : 2 };
    if (roll < (t.petty || t.diva ? 0.75 : 0.5)) {
      return {
        action: 'clapback',
        text: pick(['Imagine needing my name to get likes 😂', 'You\'re tagging me? Okay. Remember you started this.', 'Stick to music bro. Oh wait.', 'Said all that and still can\'t sell out a club.'], seed),
        rel: -10,
        heat: 12,
      };
    }
    return { action: 'ignore', rel: -4, heat: 3 };
  }

  const answer = clamp(0.25 + rel / 120 - Math.max(0, gap) / 70 + (t.generous ? 0.1 : 0) - (t.diva ? 0.1 : 0), 0.03, 0.95);
  if (roll > answer) return { action: 'ignore', rel: 0, heat: 0 };
  if (real) return roll < answer * 0.4 ? { action: 'repost', rel: 2, heat: 0 } : { action: 'like', rel: 1, heat: 0 };
  if (roll < answer * 0.35 && rel >= 10) return { action: 'repost', rel: 3, heat: 0 };
  if (roll < answer * 0.75) {
    return {
      action: 'reply',
      text: pick(rel >= 40 ? ['My brother 🫡', 'Always 🔥 love you fam', 'We don\'t miss 😤', 'The real ones know'] : ['Appreciate the love 🙏', 'Respect 🔥', '🙌🏾', 'Big up'], seed),
      rel: 2,
      heat: 0,
    };
  }
  return { action: 'like', rel: 1, heat: 0 };
}

// ─── FAN WARS ──────────────────────────────────────────────────────────────

export interface FanWarTick {
  intensity: number;
  edge: number;
  momentum: number;
  reputation: number;
  line?: string;
  spillsIntoBeef: boolean;
}

/**
 * One day of two fanbases at it. Wars cool by themselves unless something
 * feeds them; who is "winning" leans toward the bigger, hotter artist.
 */
export function fanWarDay(opts: { intensity: number; edge: number; playerFame: number; rivalFame: number; playerMomentum: number; beefHeat: number; playerFans: string; rivalFans: string; roll: number }): FanWarTick {
  const { playerFame, rivalFame, playerMomentum, beefHeat, roll } = opts;
  const pull = (playerFame - rivalFame) / 40 + (playerMomentum - 30) / 120;
  const edge = clamp(opts.edge + pull + (roll - 0.5) * 4, -50, 50);
  const intensity = clamp(opts.intensity * 0.94 + beefHeat / 60 + (roll > 0.92 ? 12 : 0), 0, 100);
  const hot = intensity >= 40;
  let line: string | undefined;
  const us = opts.playerFans;
  const them = opts.rivalFans;
  if (roll > 0.92) {
    line = pick([
      `${us} and ${them} are trending again. Somebody posted a side-by-side and nobody has slept.`,
      `A ${them} account posted your streams next to theirs. ${us} replied with receipts.`,
      `Somebody edited your face onto a clown. ${us} found the account in an hour.`,
      `"Who has more hits?" is trending. ${us} made a thread. It's 40 tweets long.`,
      `${them} spammed your comments with their emoji. ${us} did it back, twice as hard.`,
      `A ${them} stan went viral roasting your last video. ${us} quote-tweeted it into the ground.`,
    ], `${roll}|${intensity}`);
  } else if (roll < 0.05 && hot) {
    line = pick([
      `A blog ran a poll: who's better? ${edge >= 0 ? `${us} flooded it.` : `${them} flooded it.`}`,
      `Radio called in a debate segment. ${edge >= 0 ? 'Callers were on your side.' : 'Callers were not on your side.'}`,
      `A ${them} fan page posted a "fell off" video about you. ${edge >= 0 ? 'Nobody believed it.' : 'It did numbers.'}`,
    ], `${roll}|${edge}`);
  }
  return {
    intensity,
    edge,
    momentum: hot ? 0.3 : 0,
    reputation: intensity >= 60 && edge < -20 ? -0.05 : 0,
    line,
    spillsIntoBeef: intensity >= 80 && roll > 0.85,
  };
}

export const FANWAR_ACTIONS = {
  rally: { label: 'Rally your fans', emoji: '📢', blurb: 'Post for the day ones. They go to war for you. Attention up, reputation down a little.' },
  peace: { label: 'Call for peace', emoji: '🕊️', blurb: 'Tell your fans to chill. Cools it fast, earns respect. Some say you folded.' },
  fuel: { label: 'Quote a hater', emoji: '🔥', blurb: 'Screenshot a rival stan and reply. Huge engagement, real risk.' },
} as const;
export type FanWarAction = keyof typeof FANWAR_ACTIONS;

export function fanWarMove(action: FanWarAction, opts: { intensity: number; edge: number; charisma: number; roll: number }): { intensity: number; edge: number; momentum: number; reputation: number; fame: number; text: string } {
  const { roll } = opts;
  if (action === 'rally') {
    return { intensity: clamp(opts.intensity + 15, 0, 100), edge: clamp(opts.edge + 6 + roll * 6, -50, 50), momentum: 2, reputation: -1, fame: 0.2, text: 'Your fans heard you. The replies are a battlefield.' };
  }
  if (action === 'peace') {
    const mocked = roll < 0.3;
    return { intensity: clamp(opts.intensity - 35, 0, 100), edge: clamp(opts.edge - (mocked ? 6 : 0), -50, 50), momentum: -1, reputation: 3, fame: 0, text: mocked ? 'You called for peace. Their fans called it a surrender. Yours respected it.' : 'You told everyone to chill. It worked. Blogs called it mature.' };
  }
  const lands = roll + opts.charisma / 200 > 0.7;
  return lands
    ? { intensity: clamp(opts.intensity + 25, 0, 100), edge: clamp(opts.edge + 14, -50, 50), momentum: 4, reputation: -2, fame: 0.5, text: 'Your quote-reply destroyed them. It\'s the most liked thing you\'ve posted.' }
    : { intensity: clamp(opts.intensity + 25, 0, 100), edge: clamp(opts.edge - 14, -50, 50), momentum: 1, reputation: -4, fame: 0.1, text: 'You quoted a teenager with an anime avatar and lost. The ratio is historic.' };
}

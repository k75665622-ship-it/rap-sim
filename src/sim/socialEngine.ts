// ─── NPC SOCIAL ENGINE ────────────────────────────────────────────────────
// Generates NPC posts and fan reactions that reference REAL game state:
// actual releases, actual chart positions, actual rivalries. Nothing here is
// disconnected filler — a fan post should be traceable to something that
// genuinely happened in the save.

import { v4 as uuidv4 } from 'uuid';
import type { NPC, Song, Platform, SocialPost, SocialComment, ChartEntry, Player } from '../types/game';
import { isRealId } from './realPeople';
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Return a uniformly random NPC holding `role`, in a single pass.
 *
 * Replaces `npcs.filter(n => n.role === role)` + random pick. On a 12,000-entry
 * roster the filter allocates an array of every matching NPC just to select one,
 * and when the caller only wants a handful it is pure waste. This is reservoir
 * sampling restricted to one role: O(n) time, O(1) extra memory.
 */
function sampleRole(npcs: NPC[], role: NPC['role']): NPC | undefined {
  let found: NPC | undefined;
  let seen = 0;
  for (const npc of npcs) {
    if (npc.role !== role) continue;
    seen++;
    if (Math.random() < 1 / seen) found = npc;
  }
  return found;
}

/**
 * Return up to `count` random NPCs whose role is in `roles`, in one pass.
 */
function sampleRoles(npcs: NPC[], roles: NPC['role'][], count: number): NPC[] {
  const out: NPC[] = [];
  let seen = 0;
  for (const npc of npcs) {
    if (!roles.includes(npc.role)) continue;
    seen++;
    if (out.length < count) {
      out.push(npc);
      continue;
    }
    const j = Math.floor(Math.random() * seen);
    if (j < count) out[j] = npc;
  }
  return out;
}

const FAN_NAMES = [
  'kwame_hype', 'accra_driller', 'lagosboy', 'tema_stand_up', 'gh_hiphop_fan',
  'naija_plug', 'streets_connect', 'underground_gh', 'playlist_papi', 'flow_king',
];

const PLATFORMS: Platform[] = ['chirp', 'snapgram', 'clip', 'circle'];

// ─── Artist posts ─────────────────────────────────────────────────────────

/** An NPC artist posts about their own release or general studio life. */
export function npcArtistPosts(npc: NPC, ownSongs: Song[]): SocialPost[] {
  const posts: SocialPost[] = [];
  if (Math.random() > 0.35) return posts;

  const recent = ownSongs
    .filter(s => (s.weeksOut ?? 99) <= 3)
    .sort((a, b) => (a.weeksOut ?? 0) - (b.weeksOut ?? 0))[0];

  let content: string;
  let relatedSongId: string | undefined;

  // Real artists post a picture or a record sticker — the game never puts
  // words in a real person's mouth.
  if (isRealId(npc.id)) {
    content = recent ? `🎵 "${recent.title}"` : pick(['📸', '🎥', '🌍', '🖤', '🔥', '🙏🏾', '🎤']);
    posts.push(makePost(npc, content, pick(['snapgram', 'clip', 'chirp'] as Platform[]), npc.fame, recent?.id));
    return posts;
  }

  if (recent) {
    const good = recent.weeklyStreams > 50_000;
    content = pick(good
      ? [
          `"${recent.title}" doing numbers right now. Appreciate every single person streaming. 🙏`,
          `They said it wouldn't work. "${recent.title}" says otherwise. 📈`,
          `The response to "${recent.title}" has been unreal. More coming. 🔒`,
        ]
      : [
          `"${recent.title}" out now. Give it a proper listen before you judge. 🎧`,
          `Dropped "${recent.title}" — this one's for the day ones.`,
          `New one "${recent.title}" in these streets. Tell me what y'all think.`,
        ]);
    relatedSongId = recent.id;
  } else {
    content = pick([
      `Studio all night. This next project is different. Trust.`,
      `Some of y'all talk about the work. I actually do it.`,
      `Every writer in the city is trying to get on this beat. I already have it. 😤`,
      `Album mode. Don't @ me for features.`,
      `The scene is moving fast right now. Keep up or fall back.`,
      `Grateful. That's all. 🙏`,
    ]);
  }

  posts.push(makePost(npc, content, 'chirp', npc.fame, relatedSongId));
  return posts;
}

// ─── Fan posts ────────────────────────────────────────────────────────────

/**
 * Fans post about a chart event. Pass in whoever is #1 and the biggest mover,
 * so the post is always about something that actually happened.
 */
export function fanPosts(
  leaderEntry: ChartEntry | undefined,
  moverEntry: ChartEntry | undefined,
  npcs: NPC[],
  player: Player | null,
  playerOnChart: boolean,
): SocialPost[] {
  const posts: SocialPost[] = [];
  // Sample a fan account in one pass. The roster is ~12,000 strong and fan
  // accounts are a small slice of it — building the filtered array is wasted
  // work when one random entry is all we use.
  const fan = sampleRole(npcs, 'fan_account');
  if (!fan) return posts;

  // A fan celebrating the #1 record.
  if (leaderEntry && Math.random() < 0.6) {
    const isPlayer = player && leaderEntry.artistId === player.id;
    const content = isPlayer
      ? pick([
          `WAIT. ${leaderEntry.artistName} is NUMBER ONE?! I was there before it was cool!! 😭🔥`,
          `${leaderEntry.artistName} at #1. I said this months ago and nobody listened. Now look.`,
          `"${leaderEntry.songTitle}" at the top of the charts. Not surprised AT ALL. 🐐`,
        ])
      : pick([
          `"${leaderEntry.songTitle}" by ${leaderEntry.artistName} is still #1 and honestly? Deserved.`,
          `Nobody is touching ${leaderEntry.artistName} right now. Facts.`,
          `${leaderEntry.artistName} running the whole chart. Different breed.`,
        ]);
    posts.push(makePost(fan, content, 'chirp', 60, undefined));
  }

  // A fan calling out a big riser.
  if (moverEntry && Math.random() < 0.5 && moverEntry.lastPosition > moverEntry.position) {
    const jump = moverEntry.lastPosition - moverEntry.position;
    if (jump >= 2) {
      posts.push(makePost(fan,
        pick([
          `"${moverEntry.songTitle}" jumped ${jump} spots this week?! ${moverEntry.artistName} is coming for everything. 🚀`,
          `${moverEntry.artistName} climbing the charts like it's nothing. Watch this space.`,
        ]),
        'chirp', 45, undefined));
    }
  }

  // A fan hyping the player specifically, if they're charting.
  if (playerOnChart && player && Math.random() < 0.7) {
    posts.push(makePost(fan,
      pick([
        `${player.artistName} is genuinely different. Y'all sleeping. 👀`,
        `Been saying it — ${player.artistName} is next up out of ${player.city}.`,
        `"${player.artistName}" popped up on my playlist again. Not mad about it.`,
        `${player.artistName} deserves way more attention than they're getting right now.`,
      ]),
      'chirp', 40, undefined));
  }

  return posts;
}

/** The player's own release draws NPC reactions that scale with its performance. */
export function playerReleaseReactions(
  song: Song,
  player: Player,
  npcs: NPC[],
): { post: SocialPost; comments: SocialComment[] } {
  const hype = song.weeklyStreams;
  const tier = hype > 200_000 ? 'huge' : hype > 20_000 ? 'good' : hype > 2_000 ? 'modest' : 'quiet';

  const commentPool = {
    huge: [
      `OKAY THIS IS ACTUALLY CRAZY 🔥🔥`,
      `This is the one. I've had it on repeat all day.`,
      `Nah this is genuinely a hit. Who produced this?!`,
      `Instant playlist add. Respect.`,
    ],
    good: [
      `This is fire, keep going! 🔥`,
      `Solid one. I see the growth.`,
      `Been waiting for something like this from you.`,
      `This one's going on my night playlist.`,
    ],
    modest: [
      `Not bad at all. Keep pushing.`,
      `I see you. Room to grow but the direction is right.`,
      `Decent. The hook could hit harder though.`,
    ],
    quiet: [
      `Gave it a listen. Keep working at it.`,
      `Everyone starts somewhere. Don't stop.`,
      `It's a start. The next one will be better.`,
    ],
  }[tier];

  const comments: SocialComment[] = [];
  // A mix of fans and fellow artists, sampled in one pass over the roster.
  const pool = sampleRoles(npcs, ['fan_account', 'artist'], 6);
  for (const npc of pool) {
    if (Math.random() < 0.45) {
      comments.push({
        id: uuidv4(),
        authorId: npc.id,
        authorName: npc.name,
        content: pick(commentPool),
        likes: Math.floor(Math.random() * 80),
        timestamp: new Date().toISOString(),
      });
    }
  }

  const post: SocialPost = {
    id: uuidv4(),
    platform: 'chirp',
    authorId: 'player',
    authorName: player.artistName,
    content: pick([
      `"${song.title}" OUT NOW. This one means something to me. 🎤 #${song.genre.replace('_', '')}`,
      `New record. "${song.title}". Tell me what you think. Link in bio.`,
      `Dropped "${song.title}" — been sitting on this for a minute. Enjoy. 🔥`,
    ]),
    likes: Math.floor(Math.max(10, song.weeklyStreams * 0.02)),
    shares: Math.floor(Math.max(1, song.weeklyStreams * 0.004)),
    comments,
    timestamp: new Date().toISOString(),
    relatedSongId: song.id,
    isPlayerPost: true,
    trendingScore: Math.min(100, 20 + Math.log10(Math.max(song.weeklyStreams, 10)) * 15),
  };

  return { post, comments };
}

// ─── Trending ─────────────────────────────────────────────────────────────

export interface TrendingTopic {
  tag: string;
  posts: number;
  reason: string;
}

export function buildTrending(
  charts: Record<string, ChartEntry[]>,
  player: Player | null,
): TrendingTopic[] {
  const topics: TrendingTopic[] = [];

  const country = player?.country ?? 'Ghana';
  const ghana = charts[country] ?? charts['Ghana'] ?? [];
  const top = ghana[0];
  if (top) {
    topics.push({
      tag: `#${top.songTitle.replace(/[^a-zA-Z0-9]/g, '')}`,
      posts: Math.floor(2_000 + Math.random() * 40_000),
      reason: `#1 on the ${country} chart`,
    });
  }

  // Any artist climbing 3+ spots gets a topic.
  const climber = ghana.find(e => e.lastPosition - e.position >= 3);
  if (climber) {
    topics.push({
      tag: `#${climber.artistName.replace(/\s/g, '')}`,
      posts: Math.floor(800 + Math.random() * 9_000),
      reason: `climbing the chart`,
    });
  }

  if (player) {
    const onAny = Object.values(charts).some(list => list.some(e => e.artistId === player.id));
    if (onAny) {
      topics.push({
        tag: `#${player.artistName.replace(/\s/g, '')}`,
        posts: Math.floor(500 + Math.random() * 6_000),
        reason: `you're charting`,
      });
    }
  }

  const second = ghana[1];
  if (second) topics.push({ tag: second.artistName, posts: Math.floor(1_500 + Math.random() * 20_000), reason: `"${second.songTitle}" is everywhere` });
  topics.push({
    tag: `#${country.replace(/\s+/g, '')}Music`,
    posts: Math.floor(4_000 + Math.random() * 30_000),
    reason: 'always busy',
  });
  topics.push({ tag: '#NewMusicFriday', posts: Math.floor(10_000 + Math.random() * 90_000), reason: 'worldwide' });

  return topics.slice(0, 6);
}

// ─── Shared helpers ───────────────────────────────────────────────────────

function makePost(
  npc: NPC,
  content: string,
  platform: Platform,
  trending: number,
  relatedSongId?: string,
): SocialPost {
  return {
    id: uuidv4(),
    platform,
    authorId: npc.id,
    authorName: npc.name,
    content,
    likes: Math.floor(npc.fame * 8 + Math.random() * 120),
    shares: Math.floor(Math.random() * 40 + npc.fame * 0.3),
    comments: [],
    timestamp: new Date().toISOString(),
    relatedSongId,
    isPlayerPost: false,
    trendingScore: Math.min(100, trending + Math.random() * 15),
  };
}

/** Which artists posted this tick — used to give feeds a per-platform spread. */
export function spreadAcrossPlatforms(posts: SocialPost[]): SocialPost[] {
  return posts.map((p, i) => ({
    ...p,
    platform: i % 4 === 0 ? 'chirp' : p.platform ?? pick(PLATFORMS),
  }));
}

export { FAN_NAMES };

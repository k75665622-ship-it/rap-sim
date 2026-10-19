// ─── WHEN YOU SHOW UP IN THE COMMENTS ──────────────────────────────────────
// An artist replying under a fan's post is an event. The fan screams, their
// friends pile in, people beg for a reply of their own, somebody asks when the
// album drops, somebody says it's a PR move. The bigger you are, the bigger
// the pile-on. Pure: the store decides where the replies go.

import { fanHandle } from './social';

function h(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
const pick = <T,>(arr: T[], seed: string): T => arr[h(seed) % arr.length];

export interface BuzzReply { authorId: string; authorName: string; content: string; likes: number; tone: 'stan' | 'love' | 'neutral' | 'hater' | 'troll' }

export type BuzzWhere = 'fanPost' | 'fanComment' | 'artistPost' | 'ownPost';

const LINES: Record<BuzzWhere, string[]> = {
  fanPost: [
    '{OP} you\'re famous now 😭😭', '{HEU} ACTUALLY COMMENTED', 'not {P} in the comments 😭', '{OP} frame this immediately 🖼️',
    'came here from the notification 🏃🏾‍♂️', 'the way I screamed', '{P} notice me too pls 🥺', 'I\'ve been a fan since day one and never got a reply 😩',
    '{P} drop the album already we\'re begging', 'this is why we stan {P} 🫡', 'screenshot taken. history.', '{OP} we need you to post the screenshot',
    'okay {P} is outside today 👀', '{FB} rise up 🔥', 'imagine being {OP} right now', '{P} is reading the comments 😂 hide your opinions',
    '{P} reply to me and I\'ll stream 100 times', 'manifesting a reply 🙏🏾', 'humble {KQ} 👑', 'down to earth fr fr',
  ],
  fanComment: [
    '{HEU} REPLIED 😭', 'I\'m next please {P} 🥺', '{OP} won the lottery today', 'reply to me too 😩', 'the way {HE} answered 😂',
    'okay {P} is active today', 'this thread is history', '{FB} we eating 🍽️', 'I would pass out', '{P} really reads these 😭',
  ],
  artistPost: [
    '{P} in {OP}\'s comments 👀 collab loading?', 'the link up we need 🙏🏾', 'two legends one thread', '{P} pull up on the remix',
    'industry friends 🤝🏾', 'yo they\'re cooking something', '{FB} spotted', 'this is the energy', 'WE NEED THE SONG',
    'okay now drop something together 😤', 'respect between artists is beautiful', 'screenshotting before it\'s deleted 😂',
  ],
  ownPost: [
    '{P} replies to everyone today 😭', '{P} is in a good mood', 'me next 🥺', 'king of engaging with fans 🫡', '{FB} where you at',
    'reply to me and I\'ll tell my whole school', 'humble 👑', 'okay I\'m crying',
  ],
};

const HATE = ['it\'s just a comment y\'all are so dramatic', 'PR move', '{P} has nothing else to do?', 'clout chasing his own fans 😂', 'drop music instead of commenting', 'mid artist, big reply energy'];

/** Replies piling up under the player's comment. */
export function replyStorm(opts: { where: BuzzWhere; fame: number; seed: string; playerName: string; opName: string; fanbaseName?: string; count?: number; gender?: string }): BuzzReply[] {
  const he = opts.gender === 'female' ? 'she' : opts.gender === 'male' ? 'he' : 'they';
  const kq = opts.gender === 'female' ? 'queen' : opts.gender === 'male' ? 'king' : 'legend';
  const handles = new Set<string>();
  const n = opts.count ?? Math.max(4, Math.min(16, Math.round(4 + opts.fame / 7)));
  const tag = opts.playerName.replace(/\s+/g, '');
  const op = opts.opName.startsWith('@') ? opts.opName : `@${opts.opName.replace(/\s+/g, '')}`;
  const pool = LINES[opts.where];
  const used = new Set<number>();
  const out: BuzzReply[] = [];
  for (let i = 0; i < n; i++) {
    const r = (h(`${opts.seed}|${i}`) % 1000) / 1000;
    const hater = r < 0.1;
    let idx = h(`${opts.seed}|l|${i}`) % pool.length;
    for (let k = 0; k < pool.length && used.has(idx); k++) idx = (idx + 1) % pool.length;
    used.add(idx);
    const line = hater ? pick(HATE, `${opts.seed}|h|${i}`) : pool[idx];
    let handle = fanHandle(`${opts.seed}|u|${i}`);
    for (let k = 1; k < 6 && handles.has(handle); k++) handle = fanHandle(`${opts.seed}|u|${i}|${k}`);
    if (handles.has(handle)) handle = `${handle}${i}`;
    handles.add(handle);
    out.push({
      authorId: `fan:${handle}`,
      authorName: `@${handle}`,
      content: line.replace(/\{P\}/g, `@${tag}`).replace(/\{OP\}/g, op).replace(/\{FB\}/g, opts.fanbaseName ?? `${tag} fans`).replace(/\{HEU\}/g, he.toUpperCase()).replace(/\{HE\}/g, he).replace(/\{KQ\}/g, kq),
      likes: Math.round((hater ? 15 : 30) * (1 + opts.fame / 15) * (0.3 + r * 2) / (1 + i * 0.25)),
      tone: hater ? (r < 0.05 ? 'troll' : 'hater') : r > 0.6 ? 'stan' : 'love',
    });
  }
  return out;
}

/** What the fan says when you reply to them. */
export function fanScream(seed: string, playerName: string): string {
  return pick([
    `I'M SHAKING. ${playerName.toUpperCase()} REPLIED TO ME 😭😭😭`, 'Best day of my life no cap 🫶', 'I\'m framing this. Thank you so much 🙏🏾',
    'omg omg omg you actually saw it 😭', 'I literally screamed. My mum came to check on me 😂', 'I love you so much!! Day one forever 🫡',
  ], seed);
}

// ─── PINGCHAT: PEOPLE, NOT VENDING MACHINES ────────────────────────────────
//
// A DM is a person deciding whether you are worth answering. Stars ignore
// unknowns. Friends answer fast. Text somebody six times in a day and they
// stop being your friend. What you say matters: ask for a feature, ask for
// money, insult them, apologise — each lands differently on different people.
//
// Real-name rule: real artists' DMs are handled by their team, and nothing is
// ever put in a real person's mouth.

import type { NPC } from '../types/game';
import { hashString } from './rng';
import { archetypeOf, traitsOf } from './offers';
import { isRealId } from './realPeople';

export type ChatIntent = 'greet' | 'compliment' | 'collab' | 'money' | 'insult' | 'apology' | 'flirt' | 'show' | 'sign' | 'question' | 'other';

export function detectIntent(text: string): ChatIntent {
  const m = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => m.includes(x));
  if (has('sorry', 'my bad', 'apolog', 'forgive')) return 'apology';
  if (has('trash', 'overrated', 'wack', 'fake', 'hate you', 'clown', 'fraud', 'mid', 'nobody listens')) return 'insult';
  if (has('feature', 'verse', 'collab', 'song together', 'jump on', 'link up', 'studio')) return 'collab';
  if (has('borrow', 'lend', 'money', 'cash', 'pay me', 'loan')) return 'money';
  if (has('beautiful', 'cute', 'date', 'dinner', 'miss you', 'single', '😍', '❤')) return 'flirt';
  if (has('show', 'tour', 'stage', 'open for', 'concert', 'gig')) return 'show';
  if (has('sign me', 'label', 'deal', 'contract')) return 'sign';
  if (has('love your', 'fire', 'goat', 'respect', 'big fan', 'legend', 'inspired', 'amazing')) return 'compliment';
  const greeting = has('yo', 'hey', 'hello', 'wassup', 'whats good', "what's good", 'sup ') || /^(hi|sup)\b/.test(m);
  if (greeting && m.split(/\s+/).length <= 5) return 'greet';
  if (/\?\s*$/.test(m) || has('how', 'what', 'when', 'why')) return 'question';
  if (greeting) return 'greet';
  return 'other';
}

type Bracket = 'hostile' | 'cold' | 'neutral' | 'warm' | 'close';
function bracket(score: number): Bracket {
  if (score <= -40) return 'hostile';
  if (score < -5) return 'cold';
  if (score < 25) return 'neutral';
  if (score < 60) return 'warm';
  return 'close';
}

const L: Record<ChatIntent, Record<Bracket, string[]>> = {
  greet: {
    hostile: ['What do you want.', 'Don\'t.'],
    cold: ['Yeah?', 'Hey.'],
    neutral: ['Yo, what\'s good?', 'Hey hey. What\'s up?', 'Wassup, how you doing?'],
    warm: ['Yooo! Been a minute. How you been?', 'There they are 🙌 what\'s good?'],
    close: ['My guy!! Was literally just about to text you', 'FAMILY 🫂 what we doing this week?'],
  },
  compliment: {
    hostile: ['Save it.', 'Bit late for that.'],
    cold: ['Okay. Thanks I guess.', 'Appreciate it.'],
    neutral: ['Ayy appreciate that fr 🙏', 'That means a lot, thank you.', 'Respect, thank you!'],
    warm: ['Man that hits different coming from you 🙏', 'You already know I feel the same about your stuff.'],
    close: ['Stop it before I cry 😭 love you fr', 'Same energy back to you always.'],
  },
  collab: {
    hostile: ['Not happening.', 'I\'d rather not.'],
    cold: ['Send a proper request through my team.', 'Maybe. Send it over and I\'ll see.'],
    neutral: ['Could be cool. Send me the record through the studio and I\'ll check it.', 'Depends on the song. Send it properly and we talk numbers.'],
    warm: ['Say less. Send it over, I\'ll make time.', 'Been waiting for you to ask 😤 send the beat.'],
    close: ['Whatever you need. Send it and I\'m on it tonight.', 'You don\'t even have to ask. Send it.'],
  },
  money: {
    hostile: ['You\'re joking right?', 'Lol. No.'],
    cold: ['I don\'t really do that.', 'Can\'t help you there.'],
    neutral: ['Things are tight on my side too, sorry.', 'I don\'t lend money, it ruins friendships.'],
    warm: ['How much and what for? Be honest.', 'I might be able to help a little. What\'s going on?'],
    close: ['Talk to me. What do you need?', 'You good? Call me.'],
  },
  insult: {
    hostile: ['Say that on a record then.', 'Keep talking. I\'m screenshotting all of this.'],
    cold: ['Wow. Okay.', 'Remember you said that.'],
    neutral: ['Where did that come from??', 'Nah you\'re tripping.'],
    warm: ['Bro what? Are you okay?', 'That\'s not funny.'],
    close: ['I\'m going to assume you got hacked.', 'You\'re lucky I love you.'],
  },
  apology: {
    hostile: ['Too late.', 'Words are cheap.'],
    cold: ['We\'ll see.', 'Okay. Noted.'],
    neutral: ['It\'s all good, honestly.', 'Appreciate you saying that.'],
    warm: ['Already forgotten 🤝', 'We good, don\'t stress.'],
    close: ['There was never a problem with us.', 'Shut up, we\'re fine 😂'],
  },
  flirt: {
    hostile: ['Absolutely not.', 'Blocked in 3, 2…'],
    cold: ['Okay that\'s weird.', 'Let\'s keep this professional.'],
    neutral: ['Haha... smooth 😅', 'Lol you\'re funny.'],
    warm: ['Stop 😂 …but continue.', 'You\'re trouble, you know that?'],
    close: ['Dinner Friday? You\'re paying 😌', 'Took you long enough.'],
  },
  show: {
    hostile: ['Stay away from my shows.', 'No.'],
    cold: ['My booking agent handles that.', 'Talk to my team.'],
    neutral: ['Could work if the timing is right. Who\'s booking?', 'Send me the date and the room.'],
    warm: ['I\'d love that. Send me details.', 'Let\'s make it happen 🎤'],
    close: ['Just tell me when and where.', 'Already clearing my schedule.'],
  },
  sign: {
    hostile: ['I would never sign with you.', 'Lol.'],
    cold: ['Not interested.', 'I\'m good where I am.'],
    neutral: ['What kind of deal are we talking? Send something on paper.', 'Make me an offer through your label and I\'ll look.'],
    warm: ['I\'m listening. Put it on paper.', 'Okay now you have my attention 👀'],
    close: ['If it\'s you, I\'m interested. Let\'s talk properly.', 'Send the contract, let me read it with my lawyer.'],
  },
  question: {
    hostile: ['Why do you care.', 'Not your business.'],
    cold: ['Busy. Ask someone else.', 'Hm.'],
    neutral: ['Good question lol. Still figuring it out tbh.', 'Honestly just working. You?'],
    warm: ['Locked in the studio mostly. New stuff soon 👀', 'Chilling, working, you know how it is.'],
    close: ['I\'ll tell you everything when I see you.', 'Call me, too much to type.'],
  },
  other: {
    hostile: ['…', 'Okay.'],
    cold: ['Mhm.', 'Cool.'],
    neutral: ['Haha true', 'Facts.', 'Lol I hear you'],
    warm: ['😂😂 you\'re crazy', 'Facts fr'],
    close: ['This is why you\'re my favourite person', '😂 stop'],
  },
};

const REL: Record<ChatIntent, number> = {
  greet: 1, compliment: 2, collab: 1, money: -2, insult: -8, apology: 3, flirt: 0, show: 1, sign: 0, question: 1, other: 0,
};

export interface ChatContext {
  playerFame: number;
  /** Messages already sent to this person today. */
  sentToday: number;
  /** You are at war with them. */
  beef: boolean;
  seed: string;
}

export interface ChatReply {
  /** Null: left on read. */
  text: string | null;
  relationship: number;
  note?: string;
}

function isRealName(npc: NPC): boolean {
  return isRealId(npc.id);
}

export function chatReply(npc: NPC, message: string, ctx: ChatContext, roll: number): ChatReply {
  const intent = detectIntent(message);
  const t = traitsOf(npc);
  const arche = archetypeOf(npc);
  let score = npc.relationshipScore + (ctx.beef ? -40 : 0);

  // Double-texting.
  if (ctx.sentToday >= 4) return { text: null, relationship: -2, note: 'Left on read. You have sent a lot today.' };
  if (ctx.sentToday === 3) return { text: arche === 'street' ? 'Bro chill 😂 I\'ll hit you back' : 'I\'ll get back to you — busy day.', relationship: -1 };

  // Real artists: their team reads the DMs.
  if (isRealName(npc)) {
    if (roll < 0.85 || score < 30) return { text: null, relationship: 0, note: 'Delivered. Their team manages their messages.' };
    return { text: '[Their team] Thanks for reaching out — we\'ve passed this along.', relationship: 1 };
  }

  // Busy people answer the people they know.
  const gap = npc.fame - ctx.playerFame;
  const answerChance = Math.max(0.08, Math.min(0.98, 0.85 - Math.max(0, gap) / 60 + score / 150 + (t.generous ? 0.08 : 0) - (t.diva ? 0.12 : 0)));
  if (roll > answerChance && intent !== 'insult') {
    return { text: null, relationship: 0, note: gap > 20 ? `Seen. ${npc.name} is a lot bigger than you right now.` : 'Seen. No reply yet.' };
  }

  const b = bracket(score);
  const pool = L[intent][b];
  const text = pool[hashString(`${ctx.seed}|${npc.id}|${message.length}`) % pool.length];
  let rel = REL[intent];
  if (intent === 'insult' && t.petty) rel -= 4;
  if (intent === 'compliment' && t.diva) rel += 1;
  if (intent === 'apology' && t.petty) rel -= 2;
  if (intent === 'flirt') rel = b === 'warm' || b === 'close' ? 2 : b === 'neutral' ? 0 : -3;
  if (ctx.sentToday === 2) rel = Math.min(rel, 0);
  return { text, relationship: rel };
}

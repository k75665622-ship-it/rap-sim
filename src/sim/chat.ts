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
    hostile: ['What do you want.', 'Don\'t.', 'Why are you texting me?'],
    cold: ['Yeah?', 'Hey.', 'Hi. What\'s up.'],
    neutral: ['Yo, what\'s good? You been locked in?', 'Hey hey. What\'s up with you?', 'Wassup! How\'s the music going?', 'Yo! Long time. Wetin dey happen?', 'Heyy, what\'s the plan this week?'],
    warm: ['Yooo! Been a minute. How you been?', 'There they are 🙌 what\'s good?', 'Ayyy my person! I was just playing your stuff', 'Look who remembered me 😂 what\'s up?'],
    close: ['My guy!! Was literally just about to text you', 'FAMILY 🫂 what we doing this week?', 'Where have you been hiding?? Call me later', 'Ahh finally 😂 I have gist for you'],
  },
  compliment: {
    hostile: ['Save it.', 'Bit late for that.', 'Okay.'],
    cold: ['Okay. Thanks I guess.', 'Appreciate it.', 'Thanks.'],
    neutral: ['Ayy appreciate that fr 🙏', 'That means a lot, thank you. Your last one was hard too.', 'Respect, thank you! Means more than you know', 'Haha thank you 🙏🏾 what was your favourite part?'],
    warm: ['Man that hits different coming from you 🙏', 'You already know I feel the same about your stuff.', 'Stop, you\'re gonna gas me up before my session 😂', 'Coming from you? I\'m screenshotting this'],
    close: ['Stop it before I cry 😭 love you fr', 'Same energy back to you always.', 'You\'re the reason I didn\'t quit last year, you know that', 'Okay now I HAVE to drop something good 😂'],
  },
  collab: {
    hostile: ['Not happening.', 'I\'d rather not.', 'Find someone else.'],
    cold: ['Send a proper request through my team.', 'Maybe. Send it over and I\'ll see.', 'I\'m booked. Send it properly and I\'ll think about it.'],
    neutral: ['Could be cool. Send me the record through the studio and I\'ll check it.', 'Depends on the song. Send it properly and we talk numbers.', 'What kind of vibe are you thinking? Send me the demo first', 'I\'m open. What\'s the record about?'],
    warm: ['Say less. Send it over, I\'ll make time.', 'Been waiting for you to ask 😤 send the beat.', 'Let\'s cook! Studio this week?', 'Send the demo, I already have ideas 👀'],
    close: ['Whatever you need. Send it and I\'m on it tonight.', 'You don\'t even have to ask. Send it.', 'Bro we should\'ve done this years ago. Send it', 'Already writing in my head 😂 send the beat'],
  },
  money: {
    hostile: ['You\'re joking right?', 'Lol. No.', 'Ask the people you were talking about me to.'],
    cold: ['I don\'t really do that.', 'Can\'t help you there.', 'That\'s not something I do, sorry.'],
    neutral: ['Things are tight on my side too, sorry.', 'I don\'t lend money, it ruins friendships.', 'Herh, this month? I\'m broke too 😩', 'I wish. Rent came and took everything'],
    warm: ['How much and what for? Be honest.', 'I might be able to help a little. What\'s going on?', 'Talk to me. Is it serious?'],
    close: ['Talk to me. What do you need?', 'You good? Call me.', 'Say the amount. We\'ll sort it out.'],
  },
  insult: {
    hostile: ['Say that on a record then.', 'Keep talking. I\'m screenshotting all of this.', 'You\'re lucky I\'m busy.'],
    cold: ['Wow. Okay.', 'Remember you said that.', 'Noted. Don\'t text me again.'],
    neutral: ['Where did that come from??', 'Nah you\'re tripping.', 'Chale, who offended you today?', 'Bro relax. What\'s wrong with you?'],
    warm: ['Bro what? Are you okay?', 'That\'s not funny.', 'I\'ll pretend I didn\'t see that.'],
    close: ['I\'m going to assume you got hacked.', 'You\'re lucky I love you.', 'Call me. Something\'s wrong with you today'],
  },
  apology: {
    hostile: ['Too late.', 'Words are cheap.', 'We\'ll see if you mean it.'],
    cold: ['We\'ll see.', 'Okay. Noted.', 'Alright. Don\'t do it again.'],
    neutral: ['It\'s all good, honestly.', 'Appreciate you saying that.', 'No wahala, we move.', 'Respect for saying it. We good.'],
    warm: ['Already forgotten 🤝', 'We good, don\'t stress.', 'Stop it, we\'re fine 😂'],
    close: ['There was never a problem with us.', 'Shut up, we\'re fine 😂', 'You think I\'d let that come between us? Never'],
  },
  flirt: {
    hostile: ['Absolutely not.', 'Blocked in 3, 2…'],
    cold: ['Okay that\'s weird.', 'Let\'s keep this professional.'],
    neutral: ['Haha... smooth 😅', 'Lol you\'re funny.', 'Is this how you talk to everybody? 😂'],
    warm: ['Stop 😂 …but continue.', 'You\'re trouble, you know that?', 'Hmm. Buy me food first 😌'],
    close: ['Dinner Friday? You\'re paying 😌', 'Took you long enough.', 'I was waiting for you to say something 🙈'],
  },
  show: {
    hostile: ['Stay away from my shows.', 'No.'],
    cold: ['My booking agent handles that.', 'Talk to my team.'],
    neutral: ['Could work if the timing is right. Who\'s booking?', 'Send me the date and the room.', 'What\'s the crowd like? How many people?'],
    warm: ['I\'d love that. Send me details.', 'Let\'s make it happen 🎤', 'If you\'re on it, I\'m on it. When?'],
    close: ['Just tell me when and where.', 'Already clearing my schedule.', 'Bro we\'re gonna shut it down 🔥'],
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
    cold: ['Busy. Ask someone else.', 'Hm. Not sure.'],
    neutral: ['Good question lol. Still figuring it out tbh.', 'Honestly just working. You?', 'Studio, gym, sleep, repeat 😂 you?', 'Hmm let me think about it and get back to you'],
    warm: ['Locked in the studio mostly. New stuff soon 👀', 'Chilling, working, you know how it is. What about you?', 'Honestly? Trying to finish this project. It\'s stressing me', 'You first 😂 what are you working on?'],
    close: ['I\'ll tell you everything when I see you.', 'Call me, too much to type.', 'Bro so much has happened. Link up this week?'],
  },
  other: {
    hostile: ['…', 'Okay.', 'Why are you telling me this?'],
    cold: ['Mhm.', 'Cool.', 'Okay.'],
    neutral: ['Haha true', 'Facts. How\'s your week going?', 'Lol I hear you. What you working on these days?', 'Real. Abeg what\'s new with you?', 'Haha you\'re not serious 😂'],
    warm: ['😂😂 you\'re crazy', 'Facts fr. We need to link soon', 'Hahaha stop. When are we working?', 'You always have the gist 😂'],
    close: ['This is why you\'re my favourite person', '😂 stop', 'I swear you and me are the same person', 'Hahaha I miss you fr. Come through this week'],
  },
};

/** A little local flavour for people from home. Light, never overdone. */
const LOCAL: Record<string, [RegExp, string][]> = {
  Ghana: [[/^Yo,?\s*/i, 'Chale, '], [/\bWassup\b/, 'Wossop'], [/\bvery\b/i, 'die']],
  Nigeria: [[/^Yo,?\s*/i, 'Omo, '], [/\bWassup\b/, 'How far'], [/\bno problem\b/i, 'no wahala']],
};

function flavour(text: string, npc: NPC, seed: string): string {
  const rules = LOCAL[npc.country ?? ''];
  if (!rules || hashString(seed + 'loc') % 3 !== 0) return text;
  let out = text;
  for (const [re, to] of rules) { if (re.test(out)) { out = out.replace(re, to); break; } }
  return out;
}

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

const first = (n: string) => n.split(' ')[0];

/**
 * The people who read a big name's DMs. It's their manager who answers — a
 * fictional staffer, never the artist: busy, polite, professional, and quick
 * to tell you where business goes.
 */
function managerReply(npc: NPC, intent: ChatIntent, ctx: ChatContext, score: number, roll: number, message: string): ChatReply {
  const gap = npc.fame - ctx.playerFame;
  const answerChance = Math.max(0.6, Math.min(0.97, 0.9 - Math.max(0, gap) / 200 + score / 250));
  if (intent === 'insult') return { text: null, relationship: -3, note: 'Seen. Nobody is going to answer that.' };
  if (roll > answerChance) return { text: null, relationship: 0, note: `Seen. ${first(npc.name)}'s manager hasn't got back to you yet.` };
  const n = first(npc.name);
  const pickOne = (xs: string[]) => xs[hashString(`${ctx.seed}|${npc.id}|${message.length}`) % xs.length];
  const by: Partial<Record<ChatIntent, string[]>> = {
    greet: [`Hi, this is ${n}'s manager. What can I do for you?`, `Hey! You've reached ${n}'s manager. Is it business?`],
    compliment: [`Appreciate that — I'll make sure ${n} sees it 🙏🏾`, `That means a lot, thank you. I'll pass it on.`],
    collab: [`Send me the record and I'll put it in front of ${n} this week. No promises — we get a lot of these — but I do listen.`, `If it's a feature, send the song here (use the 🎵 button) and tell me what you're thinking. I'll come back with an answer.`],
    show: [`Bookings go through the agency. Send me the dates, the venue and the budget and I'll check ${n}'s calendar.`, `What's the date, the city and the budget? I'll see if it fits the schedule.`],
    sign: [`We don't talk deals over DM. If you're serious, send a proper pitch — numbers, plan, what you bring.`],
    money: [`I can't help with that one.`, `That's not something we do, sorry.`],
    flirt: [`Please keep it professional.`],
    apology: [`No problem, all good.`],
    question: [`Let me find out and get back to you.`, `I'll check with ${n} and come back to you.`],
    other: [`Got it, thanks. I'll pass it on.`, `Noted. If there's something specific you need, tell me and I'll see what I can do.`],
  };
  const pool = by[intent] ?? by.other!;
  const rel = intent === 'compliment' ? 1 : intent === 'flirt' || intent === 'money' ? -1 : 0;
  return { text: `📨 ${n}'s manager: ${pickOne(pool)}`, relationship: rel };
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
  if (isRealName(npc)) return managerReply(npc, intent, ctx, score, roll, message);

  // Busy people answer the people they know.
  const gap = npc.fame - ctx.playerFame;
  const answerChance = Math.max(0.08, Math.min(0.98, 0.85 - Math.max(0, gap) / 60 + score / 150 + (t.generous ? 0.08 : 0) - (t.diva ? 0.12 : 0)));
  if (roll > answerChance && intent !== 'insult') {
    return { text: null, relationship: 0, note: gap > 20 ? `Seen. ${npc.name} is a lot bigger than you right now.` : 'Seen. No reply yet.' };
  }

  const b = bracket(score);
  const pool = L[intent][b];
  const pickSeed = `${ctx.seed}|${npc.id}|${message.length}|${message.slice(0, 12)}`;
  const raw = pool[hashString(pickSeed) % pool.length];
  // How they type: some people never use capitals, some never use emojis.
  const style = archetypeOf(npc);
  let text = flavour(raw, npc, pickSeed);
  if (style === 'street' && hashString(pickSeed + 's') % 2 === 0) text = text.toLowerCase();
  if (style === 'business') text = text.replace(/[😂😭🔥👀😤🙈😌🫂]/gu, '').replace(/\s{2,}/g, ' ').trim();
  let rel = REL[intent];
  if (intent === 'insult' && t.petty) rel -= 4;
  if (intent === 'compliment' && t.diva) rel += 1;
  if (intent === 'apology' && t.petty) rel -= 2;
  if (intent === 'flirt') rel = b === 'warm' || b === 'close' ? 2 : b === 'neutral' ? 0 : -3;
  if (ctx.sentToday === 2) rel = Math.min(rel, 0);
  return { text, relationship: rel };
}

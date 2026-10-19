// ─── HOW A DM CONVERSATION ACTUALLY READS ──────────────────────────────────
//
// A decision in the DMs used to post the button's label as your message
// ("Give them a quote and own it") and drop the outcome into the chat as
// narration. Real chats don't look like that. This file writes what you
// actually send, what they send back (in their own voice), and what happens
// when you don't answer at all: nothing is sent, they see you've read it, and
// some people follow up.
//
// Pure. The store decides when; this decides the words.

import type { MomentEffect } from '../types/game';
import { hashString } from './rng';
import type { Persona, TextStyle } from './persona';

const pick = <T,>(arr: T[], seed: string): T => arr[hashString(seed) % arr.length];

export type Tone = 'good' | 'neutral' | 'bad';

/** Choosing these sends nothing. */
export function isSilentOption(optionId: string): boolean {
  return optionId === 'ignore' || optionId === 'nothing' || optionId === 'silent';
}

/** Did that go well for the relationship? */
export function toneOf(effects: MomentEffect[], npcId?: string): Tone {
  let rel = 0;
  let other = 0;
  for (const e of effects) {
    if (e.k === 'rel' && (!npcId || e.npcId === npcId)) rel += e.v;
    if (e.k === 'reputation' || e.k === 'momentum' || e.k === 'fans') other += e.v > 0 ? 1 : -1;
    if (e.k === 'startBeef') rel -= 10;
  }
  if (rel >= 3 || (rel >= 0 && other > 0)) return 'good';
  if (rel <= -3) return 'bad';
  return 'neutral';
}

// ─── WHAT YOU SEND ─────────────────────────────────────────────────────────

const SAY: Record<string, Record<string, string[]>> = {
  studio_invite: {
    go: ['Say less, I\'m pulling up 🔥', 'Bet. Send the location', 'On my way, keep the beat running', 'Pull up when? I\'m ready'],
    later: ['Can\'t make it tonight bro, next time for sure 🙏🏾', 'Tied up tonight. Run it back this week?', 'Not tonight fam, but save me that beat'],
  },
  party_invite: {
    go: ['I\'m there 🥂', 'Say less, I\'ll slide through', 'Count me in. What time?'],
    skip: ['Gotta sit this one out, enjoy it 🙏🏾', 'Can\'t make it, have fun tho', 'Next one for sure, locked in tonight'],
  },
  diss_bait: {
    squash: ['We good bro. No smoke 🤝🏾', 'Nah I\'m not doing this with you. Respect.', 'Life\'s too short. We\'re cool.'],
    fire: ['You really want this? Watch your timeline 😂', 'Bet. Remember you started it.', 'Say that again on the record.'],
  },
  diss_track: {
    respond: ['Studio. Tonight. 🎙️', 'Oh you wanted a reply? Coming.', 'Cool. My turn.'],
    laugh: ['lol', '😂😂 ok', 'This is what you spent studio money on?'],
  },
  money_ask: {
    lend: ['I got you. Sending it now — pay me back when you can', 'Sent. Don\'t make me chase you 😂', 'No wahala, check your account'],
    gift: ['Keep it. Don\'t worry about paying back 🙏🏾', 'Sent. It\'s a gift, bro', 'Take it. You\'d do the same for me'],
    no: ['I can\'t right now bro, things are tight', 'Wish I could, I\'m stretched this month', 'Can\'t do it right now, sorry fam'],
  },
  repay: {
    ok: ['Appreciate you for real 🙏🏾', 'Respect for paying back. Rare these days', 'Received. Thank you'],
  },
  collab_idea: {
    yes: ['Let\'s cook 🔥 Send the beat', 'I\'m in. When are we locking in?', 'Say less. Let\'s make it happen'],
    pay: ['I\'m down — but it\'s a paid feature. Let\'s talk numbers', 'Love it. My fee applies tho, business is business', 'Send me the track and the budget'],
    no: ['Not right now, I\'m focused on my project', 'Love the energy but the timing\'s off', 'Gonna pass for now, respect though'],
  },
  blog_tip: {
    pay: ['How much to make it go away?', 'Fine. Send your details. And it never comes out', 'Sending it. This conversation never happened'],
    quote: ['Quote me: "Check the credits. Every bar is mine."', 'Here\'s your quote: I write my own songs. Next question', 'Run it. My quote: "Jealousy is a disease. Get well soon 🙏🏾"'],
  },
  fan_dm: {
    reply: ['This means everything, thank you 🙏🏾❤️', 'Saw your message. Stay strong — the music is for you', 'Real ones like you keep me going. Love'],
    repost: ['Thank you!! Mind if I share this? 🙏🏾', 'This needs to be seen. Sharing it ❤️'],
  },
  cash_gig: {
    yes: ['Bet. I\'ll be there 🎤', 'I\'m in. Send me the location', 'Deal. Cash on the night, yeah?'],
    more: ['My rate\'s higher than that. Can you do better?', 'Make it make sense and I\'m there', 'Bump it up a bit and we have a deal'],
    no: ['I\'ll pass on this one, thanks for thinking of me', 'Schedule\'s full, sorry', 'Not this time'],
  },
  beat_offer: {
    buy: ['I want it. Sending the money now', 'Lock it for me. Payment coming', 'This is hard. Done deal'],
    trade: ['No cash, but I can give you a verse for it?', 'Verse for the beat? Fair trade', 'Let me jump on one of yours instead'],
    no: ['Not my sound, but keep cooking 🙏🏾', 'Pass for now, send me more though', 'Not for me, respect'],
  },
  bring_out: {
    go: ['I\'ll be there. Tell security my name 😂', 'Say less. What time am I on?', 'Bet, I\'m coming through'],
    no: ['Can\'t tonight, kill it for me 🙏🏾', 'Not tonight fam, next show', 'Tied up, sorry. Shut it down'],
  },
  opener_ask: {
    yes: ['You\'re on the bill. Don\'t be late 😂', 'Done. Bring your best set', 'Got you. Opening slot\'s yours'],
    no: ['Lineup\'s full this time, next one', 'Not this time, but keep pushing', 'Can\'t this round, sorry'],
  },
  feature_late: {
    wait: ['No rush, take your time', 'All good, send it when it\'s right', 'Whenever you\'re ready 🙏🏾'],
    chase: ['I need that verse this week bro', 'Where\'s my verse? Rollout\'s waiting', 'Gotta have it now, I\'m on a deadline'],
    drop: ['Forget it, I\'m pulling the record', 'Don\'t worry about it. I\'ll move on', 'It\'s cool. Record\'s off'],
    ok: ['It\'s cool, whenever', 'No stress', 'Appreciate you'],
  },
  feature_swap: {
    swap: ['Verse for a verse. Deal', 'I\'ll jump on yours too. Even trade', 'Bet — send me your track'],
    pay: ['I\'d rather just pay. What\'s the number?', 'Let me just pay you, cleaner', 'Send your fee'],
  },
  feature_lead: {
    yes: ['Fine, your name first', 'Cool, lead it', 'Your name first, just make it hard'],
    no: ['It\'s my song. My name first.', 'My record, my name first. Respectfully', 'Nah, my name goes first on my song'],
  },
};

const GENERIC_SAY: Record<string, string[]> = {
  yes: ['Say less 🤝🏾', 'Bet', 'Let\'s do it'],
  go: ['On my way', 'Pulling up', 'Bet, I\'m there'],
  no: ['Nah I\'m good, appreciate it though', 'Not right now', 'I\'ll pass'],
  later: ['Next time for sure', 'Can\'t right now, soon'],
  pay: ['Sending it now', 'Payment coming'],
  ok: ['🙏🏾', 'Appreciate it'],
};

export function playerLine(kind: string, optionId: string, label: string, seed: string): string {
  const bank = SAY[kind]?.[optionId] ?? GENERIC_SAY[optionId];
  if (bank) return pick(bank, `${seed}|say`);
  // Labels written as speech ("We good — no smoke") are fine as they are.
  return label.replace(/^"|"$/g, '');
}

// ─── WHAT THEY SEND BACK ───────────────────────────────────────────────────

type ToneBank = Partial<Record<Tone, string[]>>;
const REPLY: Record<string, Record<string, ToneBank>> = {
  studio_invite: {
    go: { good: ['Yesss 🔥 pull up, door\'s open', 'That\'s what I\'m talking about. See you soon'], neutral: ['Cool, see you there', 'Bet. Bring your A-game 🎙️'], bad: ['ok. don\'t be late', 'Fine. We start on time'] },
    later: { good: ['No stress, we go again'], neutral: ['Bet, next time', 'All good'], bad: ['Always next time with you 😒'] },
  },
  party_invite: {
    go: { good: ['Let\'s gooo 🥂 I\'ll put you on the list'], neutral: ['Cool, see you', 'Nice. Dress code is clean 😌'], bad: ['ok. come early', 'Fine, your name\'s at the door'] },
    skip: { good: ['No worries, next one'], neutral: ['Your loss 😂'], bad: ['K.'] },
  },
  diss_bait: {
    squash: { good: ['Respect. Real recognize real 🤝🏾', 'Fair. We good then'], neutral: ['Whatever man'], bad: ['Scared? 😂'] },
    fire: { good: ['😂 ok ok, you got bars'], neutral: ['We\'ll see'], bad: ['Oh it\'s ON now', 'You just made a mistake'] },
  },
  money_ask: {
    lend: { good: ['You\'re a real one 🙏🏾 I\'ll pay you back, I promise', 'God bless you bro. Thank you'], neutral: ['Thanks, appreciate it. I won\'t forget', 'Got it. Thank you, honestly'], bad: ['Thanks. I\'ll sort it', 'Received.'] },
    gift: { good: ['I don\'t even know what to say. Thank you 🙏🏾❤️', 'You\'re family for this. Thank you'], neutral: ['Thank you!! You didn\'t have to', 'Wow. Thank you fr'], bad: ['Thanks. Appreciate it'] },
    no: { good: ['I understand, no stress'], neutral: ['Ok, I\'ll figure it out'], bad: ['Wow. After everything? Ok', 'Remember this when you need me'] },
  },
  collab_idea: {
    yes: { good: ['Let\'s gooo 🔥 sending the beat now'], neutral: ['Cool, I\'ll send it over tonight', 'Bet. Check your studio in a bit'], bad: ['ok. sending it'] },
    pay: { good: ['Fair, business is business. Send your rate'], neutral: ['Hmm ok, how much?'], bad: ['Thought we were friends but ok', 'Nah forget it then'] },
    no: { good: ['All good, another time'], neutral: ['No stress. Maybe next project', 'Alright, maybe another time'], bad: ['Ok then. Noted.'] },
  },
  blog_tip: {
    pay: { good: ['Pleasure doing business. It\'s gone 🤐'], neutral: ['Received. Story\'s dead'], bad: ['Thanks. Can\'t promise someone else won\'t run it though'] },
    quote: { good: ['😂 that\'s gold, running it with your quote', 'Love it. You just won the internet'], neutral: ['Noted. Running it'], bad: ['Your funeral 🤷🏾‍♂️ running it'] },
  },
  fan_dm: {
    reply: { good: ['OMG YOU REPLIED 😭😭😭 I\'m screaming', 'I can\'t believe this. Thank you so much ❤️'], neutral: ['Thank you!! This made my week', 'You actually replied 🥹 thank you'], bad: ['Thanks'] },
    repost: { good: ['WAIT YOU SHARED IT 😭 my phone is exploding'], neutral: ['Thank you!!'], bad: ['Oh… ok'] },
  },
  cash_gig: {
    yes: { good: ['Perfect, I\'ll put you on the flyer 🤝🏾'], neutral: ['Cool, I\'ll send the location'], bad: ['Ok. Don\'t be late'] },
    more: { good: ['Fine, you drive a hard bargain. Deal'], neutral: ['Let me see what I can do'], bad: ['That\'s the budget. Take it or leave it', 'Forget it, we\'ll get someone else'] },
    no: { good: ['No problem, next time'], neutral: ['Alright. If anything changes, holla', 'Cool, I\'ll find someone'], bad: ['Your loss'] },
  },
  beat_offer: {
    buy: { good: ['Yesss it\'s yours 🔥 sending the files'], neutral: ['Cool, files coming. Kill it', 'Sending the stems now 🎹'], bad: ['Payment received. Files are in'] },
    trade: { good: ['A verse from you? Deal 🤝🏾'], neutral: ['Hmm… ok let\'s do it'], bad: ['I need money not verses bro'] },
    no: { good: ['All good, more coming'], neutral: ['Cool, I\'ll send the next pack', 'No wahala. Next one will be crazier'], bad: ['Your loss, someone else will take it'] },
  },
  bring_out: {
    go: { good: ['The crowd is gonna lose it 🔥'], neutral: ['Cool, see you there', 'Bet. I\'ll call you up after my third song'], bad: ['ok. be on time'] },
    no: { good: ['No worries, next one'], neutral: ['Ah, next time then', 'Cool, I\'ll catch you at the next one'], bad: ['I already told people you\'re coming… ok'] },
  },
  opener_ask: {
    yes: { good: ['THANK YOU 🙏🏾 I won\'t let you down', 'You don\'t know what this means to me'], neutral: ['Thank you! I\'ll bring it', 'Appreciate this. Won\'t forget it'], bad: ['Thanks'] },
    no: { good: ['Understood, I\'ll keep working'], neutral: ['No problem, next time maybe', 'Understood. I\'ll keep pushing'], bad: ['Ok. I\'ll remember'] },
  },
  feature_late: {
    wait: { good: ['Appreciate the patience, it\'ll be worth it 🙏🏾'], neutral: ['Thanks, I\'m on it this week', 'Appreciate you. Soon'], bad: ['ok. soon'] },
    chase: { good: ['Fair, sending it this week'], neutral: ['I\'m on it'], bad: ['Don\'t rush me', 'Relax, I\'ll send it when I send it'] },
    drop: { good: ['Understood, my bad on the delay'], neutral: ['Fair. My fault', 'Alright. I hear you'], bad: ['Wow ok. Your call'] },
  },
};

const GENERIC_REPLY: Record<TextStyle, Record<Tone, string[]>> = {
  street: { good: ['🔥🔥 bet', 'say less my g', 'that\'s love fr'], neutral: ['ok cool', 'bet', 'aight'], bad: ['ok', 'cool. noted', 'wow ok'] },
  warm: { good: ['Love you for this 🙏🏾❤️', 'You\'re the best, fam!'], neutral: ['Alright, thanks!', 'Cool cool'], bad: ['Oh… ok', 'Hmm, alright'] },
  blunt: { good: ['Good. That\'s the right call.'], neutral: ['Fine.'], bad: ['That\'s a mistake.', 'Disappointing.'] },
  dry: { good: ['Nice.'], neutral: ['Ok.'], bad: ['K.', 'Noted.'] },
  flashy: { good: ['That\'s a W 💎🔥', 'Big moves only 💯'], neutral: ['Cool'], bad: ['Smh. Small thinking'] },
  formal: { good: ['Excellent, thank you. I\'ll be in touch.', 'Appreciated — let\'s proceed.'], neutral: ['Understood, thanks.'], bad: ['Understood. That\'s unfortunate.'] },
  spiritual: { good: ['God bless you 🙏🏾', 'Blessings on blessings 🙏🏾'], neutral: ['God\'s timing 🙏🏾'], bad: ['It is well.'] },
};

/** Their answer, in their voice, or null if they would just leave it there. */
export function npcReply(kind: string, optionId: string, tone: Tone, persona: Persona, seed: string): string | null {
  const t = tone;
  const bank = REPLY[kind]?.[optionId]?.[t];
  if (bank?.length) return styleIt(pick(bank, `${seed}|reply`), persona.style, seed);
  if (kind === 'diss_track') return null; // they let the record talk
  return pick(GENERIC_REPLY[persona.style][t], `${seed}|g`);
}

/** Small touches so the same line sounds different from different people. */
function styleIt(line: string, style: TextStyle, seed: string): string {
  if (style === 'dry') return line.replace(/[🔥🙏🏾❤️😭💎🥂🤝🏾😂😒🤐🤷🏾‍♂️]/gu, '').replace(/!+/g, '.').trim() || 'Ok.';
  if (style === 'formal') return line.replace(/\bbro\b|\bfam\b|\bmy g\b/gi, '').replace(/😂|🔥/g, '').trim();
  if (style === 'spiritual' && hashString(seed) % 3 === 0) return `${line} 🙏🏾`;
  if (style === 'street' && hashString(seed) % 2 === 0) return line.toLowerCase();
  return line;
}

// ─── WHEN YOU DON'T ANSWER ─────────────────────────────────────────────────

const FOLLOW_UPS: Record<string, string[]> = {
  studio_invite: ['saw you online btw 👀', 'ok then', 'guess you\'re busy. all good'],
  party_invite: ['?', 'k'],
  money_ask: ['So you can\'t even reply? Ok', 'Hello??', 'I see how it is'],
  collab_idea: ['??', 'Just checking you saw this'],
  blog_tip: ['No comment it is then. Running it tonight.', 'Last chance. Story goes up in an hour.'],
  cash_gig: ['Still need an answer on this', 'We\'re moving on then'],
  beat_offer: ['Someone else wants it, last call', '?'],
  bring_out: ['Need to know tonight bro', '??'],
  opener_ask: ['Hello? 🙏🏾', 'Please, just one slot'],
  feature_late: ['You there?'],
  default: ['?', 'Hello??', 'ok then'],
};

/**
 * Will they follow up after being left on read, and how long until they do
 * (game minutes)? Proud people don't double-text; messy or desperate ones do.
 */
export function followUpFor(kind: string, persona: Persona, seed: string): { text: string; afterMinutes: number } | null {
  if (kind === 'fan_dm' || kind === 'diss_bait' || kind === 'diss_track' || kind === 'repay') return null;
  const chance = 0.25 + persona.messy * 0.4 + (1 - persona.ego) * 0.25 + (kind === 'money_ask' || kind === 'blog_tip' ? 0.25 : 0);
  if ((hashString(`${seed}|fu`) % 1000) / 1000 > chance) return null;
  const bank = FOLLOW_UPS[kind] ?? FOLLOW_UPS.default;
  return { text: styleIt(pick(bank, `${seed}|fut`), persona.style, seed), afterMinutes: 25 + (hashString(`${seed}|fum`) % 150) };
}

/** The small grey line under a decision: what it did, without the narration bubble. */
export function outcomeChips(effects: MomentEffect[], npcName?: string): string[] {
  const out: string[] = [];
  for (const e of effects) {
    switch (e.k) {
      case 'money': out.push(`${e.v >= 0 ? '+' : '−'}$${Math.abs(e.v).toLocaleString()}`); break;
      case 'rel': out.push(`${npcName ? npcName.split(' ')[0] : 'Them'} ${e.v >= 0 ? '+' : ''}${e.v}`); break;
      case 'reputation': out.push(`Reputation ${e.v >= 0 ? '+' : ''}${e.v}`); break;
      case 'momentum': out.push(`Momentum ${e.v >= 0 ? '+' : ''}${e.v}`); break;
      case 'fame': out.push(`Fame ${e.v >= 0 ? '+' : ''}${e.v}`); break;
      case 'fans': out.push(`${e.v >= 0 ? '+' : ''}${e.v.toLocaleString()} fans`); break;
      case 'energy': out.push(`⚡${e.v}`); break;
      case 'startBeef': out.push('Beef started'); break;
      case 'beat': out.push('🎹 Beat in your library'); break;
      case 'tradeVerse': out.push('🎙️ Verse owed · Studio → Features'); break;
      case 'inboundAsk': out.push(e.free ? '🎙️ In Studio → Features' : '📬 Offer in Mailbox'); break;
      case 'guestVerse': out.push('🎙️ Verse coming on your song'); break;
      case 'gig': out.push('🗓️ In your diary'); break;
      case 'dripGift': out.push('🎁 In your wardrobe'); break;
    }
  }
  const where = out.filter((c) => /^(🎹|🎙️|📬|🗓️|🎁)/.test(c));
  return [...where, ...out.filter((c) => !where.includes(c))].slice(0, 4);
}

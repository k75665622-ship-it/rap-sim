// ─── MOMENTS: THE WORLD COMES TO YOU ───────────────────────────────────────
//
// The scene does not wait for you to click on it. People text you. Your team
// walks into the room with a problem. A promoter offers cash for Friday. A
// blogger has a story. Every one of these is a small decision, and every
// decision has a consequence — some of them weeks later.
//
// A moment is: who it is from, what they say, two to four things you can do,
// and what each one does to the world. Outcomes are rolled, and the roll is
// bent by who the person is and who you are, so the same choice does not
// always land the same way.
//
// Pure: templates build moments from a world snapshot, and resolve choices
// into a list of effects. The store applies the effects.
//
// Real-name rule: moments that put words in someone's mouth are never built
// for real-named artists. Only the generated scene texts you.

import type { NPC, Moment, MomentEffect, MomentOption, CrewMember, Song } from '../types/game';
import { hashString } from './rng';
import { traitsOf, archetypeOf } from './offers';
import { costIndex } from './home';
import { serialWeekday } from './gameClock';
import { beatPrice, customBeatQuality, beatGrade } from './beats';
import { producerSkillOf } from './studio';
import { isRealId } from './realPeople';

/** The next given weekday (0 = Sunday), at least a day away, as a game minute. */
function nextNight(serial: number, weekday: number, hour: number): number {
  let d = serial + 1;
  while (serialWeekday(d) !== weekday) d++;
  return d * 1440 + hour * 60;
}
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pick = <T,>(arr: T[], seed: string): T => arr[hashString(seed) % arr.length];
const r50 = (n: number) => Math.max(50, Math.round(n / 50) * 50);

export interface MomentWorld {
  serial: number;
  playerName: string;
  playerFame: number;
  money: number;
  energy: number;
  charisma: number;
  businessKnowledge: number;
  crew: CrewMember[];
  /** A handful of candidate NPCs the store pre-picked (never real-named). */
  friends: NPC[];
  strangers: NPC[];
  rivals: NPC[];
  bloggers: NPC[];
  promoters: NPC[];
  producers: NPC[];
  fans: NPC[];
  stars: NPC[];
  unreleased: Song[];
  hasUpcomingShow: boolean;
  activeBeefIds: Set<string>;
  /** Life events need a little more of the player's life. */
  hasLawyer?: boolean;
  /** Has the player ever played a show? */
  hasPlayedShow?: boolean;
  ownsCar?: boolean;
  releasedTitles: string[];
  /** Where the player lives — prices follow it. */
  country?: string;
  /** Their home, from the family house to a mansion. */
  homeTier?: string;
  /** Records that are out, with what they were built on. */
  released?: { id: string; title: string; quality: number; streams: number; age: number; lease?: boolean; producerId?: string; producerName?: string }[];
  /** The manager (a contract, not a hire — so not in `crew`). */
  manager?: { id: string; name: string; skill: number; specialty?: string };
  /** The next award night that concerns the player. */
  nextAward?: { name: string; daysOut: number; city: string; ceremonyMinute: number };
  /** What is true about your life (a generator, a security system…), by day serial. */
  flags?: Record<string, number>;
  genre?: string;
  city?: string;
  fanbase?: number;
  /** A radio or club DJ from home, if the scene has one handy. */
  djs?: NPC[];
}

// ─── WHERE YOU LIVE CHANGES WHAT HAPPENS TO YOU ────────────────────────────
// A police checkpoint shakedown, a power cut, an okada ride, a crusade, malaria:
// all real, and all very much about where you are. A London rapper does not
// get stopped by "the boys are hungry o", and a Lagos one does not get snowed in.

const CHECKPOINTS = new Set(['Ghana', 'Nigeria', 'Cameroon', 'Kenya', 'Uganda', 'DR Congo', 'Mozambique', 'Zambia', 'Zimbabwe', 'Mali', 'Burkina Faso', 'Ivory Coast', 'Senegal', 'Tanzania', 'Angola']);
const POWER_CUTS = new Set(['Ghana', 'Nigeria', 'South Africa', 'Zimbabwe', 'Zambia', 'Kenya', 'Uganda', 'Tanzania', 'Cameroon', 'DR Congo', 'Ethiopia', 'Mozambique', 'Angola', 'Mali', 'Burkina Faso', 'Ivory Coast', 'Senegal', 'India', 'Philippines', 'Vietnam', 'Indonesia']);
const TROPICAL = new Set(['Ghana', 'Nigeria', 'Cameroon', 'Kenya', 'Uganda', 'DR Congo', 'Mozambique', 'Zambia', 'Zimbabwe', 'Mali', 'Burkina Faso', 'Ivory Coast', 'Senegal', 'Tanzania', 'Angola', 'Rwanda', 'Ethiopia', 'Malawi']);
const CHURCHGOING = new Set(['Ghana', 'Nigeria', 'Kenya', 'Uganda', 'Zambia', 'Zimbabwe', 'South Africa', 'Cameroon', 'DR Congo', 'Rwanda', 'Tanzania', 'Angola', 'Mozambique', 'Botswana', 'Namibia', 'Ethiopia', 'Ivory Coast', 'Brazil', 'Mexico', 'Colombia', 'Philippines', 'USA', 'Jamaica', 'Puerto Rico']);
const MOTO: Record<string, string> = { Ghana: 'okada', Nigeria: 'okada', Benin: 'zemidjan', Togo: 'zemidjan', Kenya: 'boda boda', Uganda: 'boda boda', Tanzania: 'bodaboda', Rwanda: 'moto', Cameroon: 'bendskin', 'Ivory Coast': 'moto-taxi', Senegal: 'moto-taxi', Mali: 'moto-taxi', 'Burkina Faso': 'moto-taxi', 'DR Congo': 'wewa', India: 'auto-rickshaw', Indonesia: 'ojek', Philippines: 'habal-habal', Vietnam: 'xe ôm', Thailand: 'motorbike taxi', Brazil: 'mototaxi', Colombia: 'mototaxi' };
function moto(country?: string): string | null { return MOTO[country ?? ''] ?? null; }

const NAMES: Record<string, string[]> = {
  Ghana: ['Kwaku from the block', 'Yaw your childhood friend', 'Kojo who used to rap with you', 'Kwesi from school'],
  Nigeria: ['Tunde from secondary school', 'Emeka from the old area', 'Chidi who used to rap with you', 'Segun from the street'],
  Kenya: ['Otieno from the estate', 'Kamau from school', 'Mwangi who used to rap with you'],
  'South Africa': ['Thabo from the township', 'Sipho from school', 'Lerato who used to sing with you'],
  UK: ['Jordan from the estate', 'Kyle from school', 'Tyrone who used to spit with you'],
  USA: ['Marcus from the block', 'DeShawn from high school', 'Tony who used to rap with you'],
  France: ['Moussa from the cité', 'Yannick from school'],
  'Ivory Coast': ['Moussa from the quartier', 'Yannick from school'],
  Senegal: ['Ibrahima from the quartier', 'Moussa from school'],
  Brazil: ['Diego from the favela', 'Carlos from school'],
  Colombia: ['Andrés from the barrio', 'Carlos from school'],
  Mexico: ['Diego from the barrio', 'Andrés from school'],
  Jamaica: ['Shane from the yard', 'Dwayne from school'],
};
function oldFriendName(country: string | undefined, seed: string): string {
  const pool = NAMES[country ?? ''] ?? ['your old friend from school', 'a guy you grew up with', 'your old bandmate'];
  return pick(pool, seed);
}

const STREET_FOOD: Record<string, string> = { Ghana: 'buying waakye at a roadside stall', Nigeria: 'buying suya at midnight', Kenya: 'eating nyama choma with your hands', 'South Africa': 'at a Sunday braai', UK: 'in a chicken shop at 2am', USA: 'arguing with a bodega cat', Jamaica: 'at a jerk chicken stand', France: 'at a kebab shop after a show', Brazil: 'at a street-food stand', Japan: 'at a ramen counter', 'South Korea': 'at a street-food tent' };
function viralPlace(country: string | undefined, seed: string): string {
  return pick([STREET_FOOD[country ?? ''] ?? 'at a street-food stall', 'dancing at your cousin\'s wedding', 'singing in traffic', 'losing a football video game to a 12-year-old'], seed);
}

export interface Resolution {
  text: string;
  effects: MomentEffect[];
}

type MomentDraft = Omit<Moment, 'id' | 'createdSerial' | 'status' | 'channel'> & { channel?: Moment['channel'] };

interface Template {
  id: string;
  channel: Moment['channel'];
  weight: number;
  build: (w: MomentWorld, seed: string) => MomentDraft | null;
  resolve: (m: Moment, optionId: string, w: MomentWorld, roll: number) => Resolution;
}

function opt(id: string, label: string, hint?: string, cost?: number, energy?: number): MomentOption {
  return { id, label, hint, cost, energy };
}

function crewOf(w: MomentWorld, ...roles: string[]): CrewMember | undefined {
  return w.crew.find((c) => roles.includes(c.role));
}

/** Their texting voice, from who they are. Generated NPCs only. */
function voice(npc: NPC, seed: string, lines: { street: string[]; business: string[]; creative: string[]; status: string[] }): string {
  return pick(lines[archetypeOf(npc)], seed);
}

// ─── DM TEMPLATES ──────────────────────────────────────────────────────────

const studioInvite: Template = {
  id: 'studio_invite', channel: 'dm', weight: 3,
  build: (w, seed) => {
    const npc = w.friends.find((n) => !w.activeBeefIds.has(n.id));
    if (!npc) return null;
    return {
      kind: 'studio_invite', npcId: npc.id, npcName: npc.name,
      title: `${npc.name}: studio tonight?`,
      body: voice(npc, seed, {
        street: ['Yo pull up to the studio tonight. Got a beat that\'s screaming your name 🔥', 'Bro we in the lab tonight. Slide through, bring a verse.'],
        business: ['In session tonight from 9. Could use a second voice on something — interested?', 'Booked the room till 3am. Come through if you want to work.'],
        creative: ['Making something weird tonight. Your energy would fit. Come?', 'I hear you on this record. Studio, tonight, no pressure.'],
        status: ['Studio tonight. A few people coming through. You should be one of them.', 'Lab session tonight, it\'s gonna be a moment. You in?'],
      }),
      options: [opt('go', 'Pull up', 'Costs a night of energy', 0, 20), opt('later', 'Not tonight, next time'), opt('ignore', 'Leave them on read')],
      expiresSerial: w.serial + 2,
    };
  },
  resolve: (m, o, _w, roll) => {
    const id = m.npcId!;
    if (o === 'go') {
      if (roll < 0.28) return { text: `You two made something real tonight. ${m.npcName} wants you on it — properly.`, effects: [{ k: 'energy', v: -20 }, { k: 'rel', npcId: id, v: 10 }, { k: 'stat', stat: 'songwriting', v: 1 }, { k: 'inboundAsk', npcId: id, free: true }] };
      if (roll < 0.72) return { text: `Good vibes, a few ideas, a lot of laughing. ${m.npcName} rates you more now.`, effects: [{ k: 'energy', v: -20 }, { k: 'rel', npcId: id, v: 7 }, { k: 'stat', stat: 'creativity', v: 1 }] };
      if (roll < 0.9) return { text: 'Long night, nothing usable. But you showed up, and that counts.', effects: [{ k: 'energy', v: -20 }, { k: 'rel', npcId: id, v: 3 }] };
      return { text: `Somebody in the room posted a snippet of you two. People are already asking when it drops.`, effects: [{ k: 'energy', v: -20 }, { k: 'rel', npcId: id, v: 2 }, { k: 'momentum', v: 3 }] };
    }
    if (o === 'later') return { text: '"Bet, next time." No harm done.', effects: [{ k: 'rel', npcId: id, v: -1 }] };
    return { text: `${m.npcName} saw the read receipt. They will remember that.`, effects: [{ k: 'rel', npcId: id, v: -6 }] };
  },
};

const partyInvite: Template = {
  id: 'party_invite', channel: 'dm', weight: 2,
  build: (w, seed) => {
    const npc = w.stars[0] ?? w.friends[1];
    if (!npc) return null;
    return {
      kind: 'party_invite', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} invited you to a party`,
      body: voice(npc, seed, {
        street: ['Function at mine Saturday. Everybody gonna be there. You coming?', 'Party tonight, real ones only. Pull up.'],
        business: ['Hosting a few industry people this weekend. Good room to be in. You should come.', 'Private dinner Saturday — label folks, a few artists. Join us?'],
        creative: ['Listening party at mine. Bring good energy.', 'Small thing at the house. Music, food, people worth meeting.'],
        status: ['My birthday this weekend. The list is tight. You\'re on it.', 'Yacht party Saturday 🛥️ dress code is "expensive".'],
      }),
      options: [opt('go', 'Go', 'A late one — costs energy', 0, 25), opt('skip', 'Pass')],
      expiresSerial: w.serial + 3,
    };
  },
  resolve: (m, o, w, roll) => {
    const id = m.npcId!;
    if (o !== 'go') return { text: 'You stayed in. Everybody posted from it. You saw it all on your phone.', effects: [{ k: 'rel', npcId: id, v: -1 }] };
    const star = w.stars.find((s) => s.id !== id);
    if (roll < 0.3 && star) return { text: `You ended up talking to ${star.name} for an hour. They follow you now.`, effects: [{ k: 'energy', v: -25 }, { k: 'rel', npcId: id, v: 5 }, { k: 'rel', npcId: star.id, v: 12 }, { k: 'stat', stat: 'networking', v: 1 }] };
    if (roll < 0.55) return { text: 'A photo of you at the party is everywhere. You look like you belong.', effects: [{ k: 'energy', v: -25 }, { k: 'rel', npcId: id, v: 5 }, { k: 'momentum', v: 4 }] };
    if (roll < 0.7) return {
      text: 'Things got messy. A video of you arguing with a bouncer is going round the blogs.',
      effects: [{ k: 'energy', v: -25 }, { k: 'reputation', v: -4 }, { k: 'momentum', v: 2 }, { k: 'headline', text: `${w.playerName} in late-night scuffle at ${m.npcName}'s party`, story: 'A clip from the weekend shows a heated exchange at the door. Nobody was hurt.', category: 'scandal' }],
    };
    return { text: 'Great night. You and the host are tight now.', effects: [{ k: 'energy', v: -25 }, { k: 'rel', npcId: id, v: 7 }] };
  },
};

const dissBait: Template = {
  id: 'diss_bait', channel: 'dm', weight: 2,
  build: (w, seed) => {
    // Nobody picks a fight with someone who has no music and no name yet.
    if (w.releasedTitles.length === 0 && w.playerFame < 12) return null;
    const npc = w.rivals[0] ?? w.strangers.find((n) => Math.abs(n.fame - w.playerFame) < 15);
    if (!npc) return null;
    return {
      kind: 'diss_bait', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} is in your DMs — and not nicely`,
      body: voice(npc, seed, {
        street: ['Heard you been talking crazy about me. Say it to my face.', 'You been subbing me? Keep my name out your mouth.'],
        business: ['I\'d appreciate it if you stopped mentioning me in interviews.', 'People tell me you\'ve been talking. Let\'s keep it professional.'],
        creative: ['That line on your last record. Was that about me?', 'Funny how your new song sounds like mine.'],
        status: ['Cute that you think we\'re on the same level.', 'Stop using my name for clout.'],
      }),
      options: [opt('squash', '"We good — no smoke"'), opt('fire', 'Fire back publicly'), opt('ignore', 'Ignore it')],
      expiresSerial: w.serial + 4,
    };
  },
  resolve: (m, o, _w, roll) => {
    const id = m.npcId!;
    if (o === 'squash') {
      if (roll < 0.7) return { text: `${m.npcName} calmed down. "Respect." Crisis avoided.`, effects: [{ k: 'rel', npcId: id, v: 12 }] };
      return { text: `${m.npcName} screenshotted your "we good" and posted it with a laughing emoji. The comments call you soft.`, effects: [{ k: 'rel', npcId: id, v: -4 }, { k: 'momentum', v: -3 }, { k: 'post', authorId: id, authorName: m.npcName!, content: '😂😂 folded in one message', likes: 4000 }] };
    }
    if (o === 'fire') {
      return {
        text: `You posted the receipts and a shot at ${m.npcName}. The timeline is on fire. This is a beef now.`,
        effects: [{ k: 'startBeef', npcId: id }, { k: 'heat', npcId: id, v: 18 }, { k: 'momentum', v: 4 }, { k: 'reputation', v: -1 }, { k: 'rel', npcId: id, v: -15 },
          { k: 'post', authorId: 'player', authorName: '', content: `Funny how some people only find their voice in DMs. Say it in public. 🤫`, likes: 6000 }],
      };
    }
    if (roll < 0.45) return { text: `You ignored it. ${m.npcName} didn't.`, effects: [{ k: 'followUp', template: 'diss_track', days: 5 + Math.floor(roll * 10), data: { npcId: id, npcName: m.npcName } }] };
    return { text: 'You ignored it. It went away. Sometimes that works.', effects: [] };
  },
};

const dissTrack: Template = {
  id: 'diss_track', channel: 'dm', weight: 0,
  build: () => null,
  resolve: (m, o, w, roll) => {
    const id = m.npcId!;
    if (o === 'respond') return { text: `You answered with a diss of your own. Everybody's picking sides.`, effects: [{ k: 'startBeef', npcId: id }, { k: 'heat', npcId: id, v: 25, win: roll + w.charisma / 200 > 0.7 }, { k: 'momentum', v: 5 }, { k: 'fame', v: 0.8 }] };
    if (o === 'laugh') {
      return roll + w.charisma / 150 > 0.85
        ? { text: 'Your "lol" post did more damage than their whole song. The internet decided you won.', effects: [{ k: 'momentum', v: 4 }, { k: 'heat', npcId: id, v: 5, win: true }] }
        : { text: 'Your "lol" post looked like you were rattled. It did not land.', effects: [{ k: 'momentum', v: -2 }] };
    }
    return { text: 'You stayed silent. Some respect it. Most think you had nothing to say.', effects: [{ k: 'momentum', v: -3 }] };
  },
};

const moneyAsk: Template = {
  id: 'money_ask', channel: 'dm', weight: 1.5,
  build: (w, seed) => {
    const npc = w.friends.find((n) => n.fame <= w.playerFame + 5);
    if (!npc || w.money < 2000) return null;
    const amt = r50(clamp(w.money * 0.05, 500, 15000));
    return {
      kind: 'money_ask', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} needs a favour`,
      body: voice(npc, seed, {
        street: [`Bro I'm in a tight spot. Can you lend me $${amt.toLocaleString()}? I'll run it back next month on everything.`],
        business: [`Awkward ask — I need $${amt.toLocaleString()} to cover studio time until a payment clears. Can you help?`],
        creative: [`I hate asking. I need $${amt.toLocaleString()} to finish my project. I'll pay you back, I promise.`],
        status: [`Need $${amt.toLocaleString()} till Friday. Long story. You good for it?`],
      }),
      options: [opt('lend', `Lend $${amt.toLocaleString()}`, 'They say they\'ll pay you back', amt), opt('gift', `Just give it to them`, 'No strings', amt), opt('no', 'Can\'t right now')],
      expiresSerial: w.serial + 3,
      data: { amount: amt },
    };
  },
  resolve: (m, o, _w, roll) => {
    const id = m.npcId!;
    const amt = Number(m.data?.amount ?? 1000);
    if (o === 'lend') return { text: `You sent it. "You're a real one." Now you wait.`, effects: [{ k: 'money', v: -amt }, { k: 'rel', npcId: id, v: 8 }, { k: 'followUp', template: 'repay', days: 20 + Math.floor(roll * 20), data: { npcId: id, npcName: m.npcName, amount: amt, honest: roll < 0.7 } }] };
    if (o === 'gift') return { text: `${m.npcName} went quiet for a minute, then: "I won't forget this."`, effects: [{ k: 'money', v: -amt }, { k: 'rel', npcId: id, v: 16 }] };
    return { text: '"All good." It didn\'t sound all good.', effects: [{ k: 'rel', npcId: id, v: -5 }] };
  },
};

const repay: Template = {
  id: 'repay', channel: 'dm', weight: 0, build: () => null,
  resolve: (m, o) => {
    const amt = Number(m.data?.amount ?? 0);
    const honest = !!m.data?.honest;
    if (o === 'ok') {
      return honest
        ? { text: `Paid back with a bit extra. Trust earned.`, effects: [{ k: 'money', v: Math.round(amt * 1.1) }, { k: 'rel', npcId: m.npcId!, v: 6 }] }
        : { text: 'Another excuse. That money is gone.', effects: [{ k: 'rel', npcId: m.npcId!, v: -8 }] };
    }
    return { text: 'You chased it hard. You got half back and lost a friend.', effects: [{ k: 'money', v: Math.round(amt * 0.5) }, { k: 'rel', npcId: m.npcId!, v: -20 }] };
  },
};

const collabIdea: Template = {
  id: 'collab_idea', channel: 'dm', weight: 2.5,
  build: (w, seed) => {
    const npc = w.friends.find((n) => Math.abs(n.fame - w.playerFame) <= 25) ?? w.strangers.find((n) => Math.abs(n.fame - w.playerFame) <= 10);
    if (!npc) return null;
    return {
      kind: 'collab_idea', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} wants to work`,
      body: voice(npc, seed, {
        street: ['We need a song together. Real talk. The streets been asking.', 'Me and you on one record? Dangerous. Let\'s do it.'],
        business: ['I think a collaboration makes sense for both of us. Our audiences overlap. Thoughts?', 'Proposal: one single together, split everything 50/50.'],
        creative: ['I keep hearing your voice on this idea I have. Want to try?', 'I wrote something with you in mind.'],
        status: ['A record with me would be good for you. Let\'s talk.', 'I\'m picking a few features for the album. You made the list.'],
      }),
      options: [opt('yes', 'Let\'s do it'), opt('pay', 'Only if it\'s a paid feature'), opt('no', 'Not right now')],
      expiresSerial: w.serial + 5,
    };
  },
  resolve: (m, o) => {
    const id = m.npcId!;
    if (o === 'yes') return { text: `Their record is in Studio → Features. No fee — just the work. Your verse is due in three weeks.`, effects: [{ k: 'rel', npcId: id, v: 6 }, { k: 'inboundAsk', npcId: id, free: true }] };
    if (o === 'pay') return { text: `They'll send a proper offer — it's in your Mailbox to negotiate.`, effects: [{ k: 'inboundAsk', npcId: id }] };
    return { text: 'Maybe another time.', effects: [{ k: 'rel', npcId: id, v: -2 }] };
  },
};

const blogTip: Template = {
  id: 'blog_tip', channel: 'dm', weight: 1.5,
  build: (w, seed) => {
    // Blogs only shake down people worth a headline.
    if (w.playerFame < 15 || w.releasedTitles.length === 0) return null;
    const npc = w.bloggers[0];
    if (!npc) return null;
    const price = r50(clamp(800 + w.playerFame * 60, 800, 12000));
    return {
      kind: 'blog_tip', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} has a story about you`,
      body: pick([
        `Somebody sent me a story about you and an ex. It's juicy. Want to comment before I run it? Or... $${price.toLocaleString()} and it never existed.`,
        `I've got screenshots from someone who used to work with you. Running it tomorrow unless you want to talk numbers — $${price.toLocaleString()}.`,
        `A source says you didn't write your last hit. Care to respond? I could also just... not post it. $${price.toLocaleString()}.`,
      ], seed),
      options: [opt('pay', `Pay $${price.toLocaleString()} to kill it`, undefined, price), opt('quote', 'Give them a quote and own it'), opt('ignore', 'Ignore them')],
      expiresSerial: w.serial + 2,
      data: { price },
    };
  },
  resolve: (m, o, w, roll) => {
    const price = Number(m.data?.price ?? 1000);
    if (o === 'pay') return roll < 0.85
      ? { text: 'The story disappeared. Nobody will ever know. You will.', effects: [{ k: 'money', v: -price }] }
      : { text: 'You paid. They ran it anyway — with "sources say he tried to pay us off".', effects: [{ k: 'money', v: -price }, { k: 'reputation', v: -6 }, { k: 'momentum', v: 2 }] };
    if (o === 'quote') {
      return roll + w.charisma / 200 > 0.75
        ? { text: 'Your statement was so calm and funny that the story became about how cool you are.', effects: [{ k: 'momentum', v: 3 }, { k: 'reputation', v: 1 }] }
        : { text: 'Your quote made it worse. Now it\'s a two-day story.', effects: [{ k: 'reputation', v: -3 }, { k: 'momentum', v: 1 }] };
    }
    if (roll < 0.6) return { text: 'They ran it. Some people believe it. Some streams went up, oddly.', effects: [{ k: 'reputation', v: -4 }, { k: 'momentum', v: 2 }, { k: 'headline', text: `Blog claims explosive story about ${w.playerName}`, story: 'An unverified post is doing the rounds. The artist has not commented.', category: 'scandal' }] };
    return { text: 'They never ran it. Probably never had anything.', effects: [] };
  },
};

const fanDM: Template = {
  id: 'fan_dm', channel: 'dm', weight: 1.5,
  build: (w, seed) => {
    // A fan of what? Something has to be out.
    if (w.releasedTitles.length === 0) return null;
    const npc = w.fans[0];
    if (!npc) return null;
    return {
      kind: 'fan_dm', npcId: npc.id, npcName: npc.name,
      title: `A message from ${npc.name}`,
      body: pick([
        'I just want you to know your music got me through the worst year of my life. Thank you. That\'s it.',
        w.hasPlayedShow ? 'I drove 6 hours to your last show. Best night of my life. Please come back to my city 🙏' : `"${w.releasedTitles[0]}" has been on repeat in my house all week. Please come do a show in my city 🙏`,
        w.releasedTitles.length >= 3 ? 'My little brother learned to rap from your songs. He\'s 12. He thinks you\'re a superhero.' : `Found "${w.releasedTitles[0]}" by accident and now I've played it like 50 times. Keep going 🙌`,
      ], seed),
      options: [opt('reply', 'Reply personally'), opt('repost', 'Share it publicly'), opt('ignore', 'Leave it')],
      expiresSerial: w.serial + 5,
    };
  },
  resolve: (_m, o, w, roll) => {
    // How far a kind reply travels depends on how many people are watching.
    const small = w.playerFame < 20;
    if (o === 'reply') return { text: small ? 'They screenshotted your reply and showed everyone they know.' : 'They screenshotted your reply and it went everywhere. "This is why we stan."', effects: [{ k: 'momentum', v: small ? 1 : 2 }, { k: 'fans', v: Math.round(20 + w.playerFame * 35) }] };
    if (o === 'repost') return roll < 0.8
      ? { text: small ? 'A few hundred people saw it. Some of them stuck around.' : 'The post did numbers. Fans love seeing you care.', effects: [{ k: 'momentum', v: small ? 1 : 3 }, { k: 'fans', v: Math.round(40 + w.playerFame * 55) }] }
      : { text: 'A few people called it a clout move. Most didn\'t care.', effects: [{ k: 'momentum', v: 1 }] };
    return { text: 'You never saw it. Or you did.', effects: [] };
  },
};

const cashGig: Template = {
  id: 'cash_gig', channel: 'dm', weight: 1.5,
  build: (w, seed) => {
    // A club books people with a record out, or a name.
    if (w.releasedTitles.length === 0 && w.playerFame < 15) return null;
    const npc = w.promoters[0];
    if (!npc) return null;
    // Club money follows the city: a 20-minute set in Accra is not one in London.
    const fee = r50(clamp(120 + w.playerFame * w.playerFame * 1.6, 120, 25000) * costIndex(w.country));
    const friday = hashString(seed) % 2 === 0;
    const place = `${npc.name.split(' ')[0]}'s club${npc.city ? `, ${npc.city}` : ''}`;
    return {
      kind: 'cash_gig', npcId: npc.id, npcName: npc.name,
      title: `${npc.name}: cash gig this weekend`,
      body: friday
        ? `Got a slot at my club Friday night. $${fee.toLocaleString()} cash, 20 minutes, no contract. In or out?`
        : `Last-minute: my ${w.playerFame >= 45 ? 'headliner' : 'opener'} dropped out. $${fee.toLocaleString()} cash if you can do Saturday night.`,
      options: [opt('yes', `Lock it in — $${fee.toLocaleString()}`, `${friday ? 'Friday' : 'Saturday'} 11 PM, paid on the night`), opt('more', 'Ask for more'), opt('no', 'Pass')],
      expiresSerial: w.serial + 2,
      data: { fee, dow: friday ? 5 : 6, place },
    };
  },
  resolve: (m, o, w, roll) => {
    const fee = Number(m.data?.fee ?? 500);
    const dow = Number(m.data?.dow ?? 5);
    const place = String(m.data?.place ?? 'the club');
    const id = m.npcId!;
    const at = nextNight(w.serial, dow, 23);
    // Nothing is paid now: it's a night in your diary, and the cash comes after the set.
    if (o === 'yes') return { text: `In your diary: ${DOW[dow]}, 11 PM at ${place}. $${fee.toLocaleString()} cash after the set.`, effects: [{ k: 'rel', npcId: id, v: 2 }, { k: 'gig', npcId: id, fee, atMinute: at, place }] };
    if (o === 'more') {
      const more = r50(fee * 1.4);
      return roll + w.businessKnowledge / 200 > 0.7
        ? { text: `${m.npcName} agreed to $${more.toLocaleString()}. ${DOW[dow]}, 11 PM at ${place}.`, effects: [{ k: 'gig', npcId: id, fee: more, atMinute: at, place }] }
        : { text: `${m.npcName} found someone else for the slot.`, effects: [{ k: 'rel', npcId: id, v: -4 }] };
    }
    return { text: 'You passed on the slot.', effects: [] };
  },
};

const beatOffer: Template = {
  id: 'beat_offer', channel: 'dm', weight: 1.2,
  build: (w, seed) => {
    const npc = w.producers[0];
    if (!npc) return null;
    // A real beat: as good as they are, priced like the beat store prices it.
    const quality = customBeatQuality(producerSkillOf(npc), (hashString(seed + 'q') % 1000) / 1000, false);
    const price = r50(beatPrice(quality, 'exclusive') * Math.max(0.6, costIndex(w.country)));
    return {
      kind: 'beat_offer', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} cooked something for you`,
      body: pick([`Made a beat last night and all I could hear was you on it. Exclusive, $${price.toLocaleString()}. Want it before someone else does?`, `Sending you a beat pack. One of these is a hit. $${price.toLocaleString()} for the exclusive.`], seed),
      options: [opt('buy', `Buy it — $${price.toLocaleString()}`, `You've heard the snippet: ${beatGrade(quality).toLowerCase()}`, price), opt('trade', 'Offer a verse on their tape instead'), opt('no', 'Not for me')],
      expiresSerial: w.serial + 4,
      data: { price, quality },
    };
  },
  resolve: (m, o, w, roll) => {
    const id = m.npcId!;
    const name = m.npcName ?? 'They';
    const price = Number(m.data?.price ?? 500);
    const quality = Number(m.data?.quality ?? 60);
    // The beat is a thing you now HAVE: it's in Studio → Beats, ready to record on.
    if (o === 'buy') return { text: `The beat is in Studio → Beats, exclusive to you.`, effects: [{ k: 'money', v: -price }, { k: 'beat', npcId: id, npcName: name, quality, price, how: 'bought' }, { k: 'stat', stat: 'beatSelection', v: 1 }, { k: 'rel', npcId: id, v: 4 }] };
    if (o === 'trade') {
      // Producers with a name trade more easily — a verse from you is worth something to them.
      return roll < 0.35 + w.playerFame / 120
        ? { text: `Trade agreed. The beat is in Studio → Beats, and their tape is in Studio → Features — your verse is due in three weeks.`, effects: [{ k: 'beat', npcId: id, npcName: name, quality, price: 0, how: 'traded' }, { k: 'tradeVerse', npcId: id, value: price }, { k: 'rel', npcId: id, v: 4 }] }
        : { text: `${name} wants the money, not a verse.`, effects: [{ k: 'rel', npcId: id, v: -3 }] };
    }
    return { text: 'You passed on the beat.', effects: [] };
  },
};

const bringOut: Template = {
  id: 'bring_out', channel: 'dm', weight: 1.5,
  build: (w, seed) => {
    // "Your song" — there has to be one.
    if (w.releasedTitles.length === 0) return null;
    const npc = w.friends.find((n) => n.fame >= w.playerFame - 5) ?? w.stars.find((n) => n.relationshipScore >= 15);
    if (!npc) return null;
    return {
      kind: 'bring_out', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} wants to bring you out tonight`,
      body: voice(npc, seed, {
        street: ['Show tonight. I\'m bringing you out for your song. Be there by 10.', 'Pull up tonight, I got you on stage for one song.'],
        business: ['I\'d like to bring you out as a surprise guest at my show tonight. Interested?', 'Surprise slot at my show tonight if you want it.'],
        creative: ['Come do your song with me tonight. The crowd will lose it.', 'Surprise moment at my show tonight? You and me.'],
        status: ['You\'re coming out at my show tonight. It\'ll be good for you.', 'I\'m bringing out a few people tonight. You\'re one.'],
      }),
      options: [opt('go', 'I\'ll be there', 'Costs energy', 0, 15), opt('no', 'Can\'t tonight')],
      expiresSerial: w.serial + 1,
    };
  },
  resolve: (m, o, w) => {
    const id = m.npcId!;
    // Tonight at their show: be there and they call you up.
    const at = Math.floor((w.serial * 1440 + 22 * 60 + 30));
    if (o === 'go') return { text: `Tonight, 10:30 PM — ${m.npcName}'s show. Be there when they call your name.`, effects: [{ k: 'rel', npcId: id, v: 2 }, { k: 'gig', npcId: id, fee: 0, atMinute: at, place: `${(m.npcName ?? 'Their').split(' ')[0]}'s show`, bringOut: true }] };
    return { text: 'You said you can\'t make it tonight.', effects: [{ k: 'rel', npcId: id, v: -1 }] };
  },
};

// ─── TEAM TEMPLATES ────────────────────────────────────────────────────────

const brandDeal: Template = {
  id: 'brand_deal', channel: 'team', weight: 2,
  build: (w, seed) => {
    // Brands buy an audience. Nobody pays an unknown to hold a can.
    if (w.playerFame < 15 && (w.fanbase ?? 0) < 4000) return null;
    // With a manager, brand deals come through their desk, with their read on it.
    if (w.manager) return null;
    const mgr = w.manager as MomentWorld['manager'];
    const who = mgr?.name ?? 'Your cousin who "handles things"';
    const pay = r50(clamp(1000 + w.playerFame * w.playerFame * 8, 1000, 250000) * Math.max(0.7, Math.min(2.2, costIndex(w.country))));
    const brand = pick(['an energy drink that tastes like batteries', 'a betting app', 'a skin-lightening cream', 'a meme-coin', 'a fast-food chain', 'a phone company'], seed);
    return {
      kind: 'brand_deal', crewRole: mgr ? 'manager' : undefined, npcName: who, npcId: mgr?.id,
      title: `${who}: a brand wants you`,
      body: `"${brand.charAt(0).toUpperCase() + brand.slice(1)} wants you in an ad. $${pay.toLocaleString()}. I know, I know. But it's $${pay.toLocaleString()}."`,
      options: [opt('take', `Take the $${pay.toLocaleString()}`), opt('push', 'Make them pay more'), opt('no', 'Not my brand')],
      expiresSerial: w.serial + 4,
      data: { pay, brand, skill: mgr?.skill ?? 15 },
    };
  },
  resolve: (m, o, _w, roll) => {
    const pay = Number(m.data?.pay ?? 1000);
    const skill = Number(m.data?.skill ?? 15);
    const brand = String(m.data?.brand ?? 'a brand');
    const shady = /betting|lightening|meme-coin/.test(brand);
    if (o === 'take') return { text: shady ? `The money cleared. So did a lot of people's respect for you.` : 'Money in the bank. A few fans clowned the ad, most didn\'t care.', effects: [{ k: 'money', v: pay }, { k: 'reputation', v: shady ? -5 : -1 }, { k: 'momentum', v: 1 }] };
    if (o === 'push') {
      return roll + skill / 150 > 0.75
        ? { text: `They came back at $${Math.round(pay * 1.6).toLocaleString()}. Your team earned their cut today.`, effects: [{ k: 'money', v: Math.round(pay * 1.6) }, { k: 'reputation', v: shady ? -5 : -1 }] }
        : { text: 'They went with another artist. Somebody cheaper.', effects: [] };
    }
    return { text: 'You turned it down. Somebody tweeted about it and people respected it.', effects: [{ k: 'reputation', v: shady ? 3 : 1 }] };
  },
};

const badPress: Template = {
  id: 'bad_press', channel: 'team', weight: 1.5,
  build: (w, seed) => {
    // Tabloids sell stories about people readers have heard of.
    if (w.playerFame < 15 || w.releasedTitles.length === 0) return null;
    const pub = crewOf(w, 'publicist');
    const who = pub?.npcName ?? 'A friend in media';
    const cost = r50(clamp(1500 + w.playerFame * 120, 1500, 30000));
    return {
      kind: 'bad_press', crewRole: pub ? 'publicist' : undefined, npcName: who,
      title: `${who}: a story is about to break`,
      body: `"${pick(['An old interview clip of you is resurfacing — the one you\'d rather forget.', 'Somebody you went to school with is selling a story to a tabloid.', ...(w.released?.some((x) => x.producerName) ? [`${w.released!.find((x) => x.producerName)!.producerName} is telling people you never credited them properly. A blog wants a comment.`] : [])], seed)} We can get ahead of it, pay to bury it, or let it play out."`,
      options: [opt('bury', `Bury it — $${cost.toLocaleString()}`, undefined, cost), opt('statement', 'Get ahead with a statement'), opt('ride', 'Let it play out')],
      expiresSerial: w.serial + 2,
      data: { cost, skill: pub?.skill ?? 10 },
    };
  },
  resolve: (m, o, _w, roll) => {
    const cost = Number(m.data?.cost ?? 1500);
    const skill = Number(m.data?.skill ?? 10);
    if (o === 'bury') return { text: 'It never ran. Expensive silence.', effects: [{ k: 'money', v: -cost }] };
    if (o === 'statement') return roll + skill / 120 > 0.7
      ? { text: 'The statement landed perfectly. The story died and you looked mature.', effects: [{ k: 'reputation', v: 2 }, { k: 'momentum', v: 1 }] }
      : { text: 'The statement read like a hostage note. It made the story bigger.', effects: [{ k: 'reputation', v: -4 }, { k: 'momentum', v: 1 }] };
    return roll < 0.65
      ? { text: 'It ran. Two days of noise. Your streams twitched up, your reputation down.', effects: [{ k: 'reputation', v: -5 }, { k: 'momentum', v: 2 }] }
      : { text: 'It ran and nobody cared. The internet had something better to do.', effects: [] };
  },
};

const burnout: Template = {
  id: 'burnout', channel: 'team', weight: 1.2,
  build: (w) => {
    if (w.energy > 55) return null;
    const pa = crewOf(w, 'personal_assistant', 'trainer');
    const who = pa?.npcName ?? 'Your mum';
    return {
      kind: 'burnout', crewRole: pa?.role, npcName: who,
      title: `${who}: you need a break`,
      body: '"You\'ve been running on fumes. You look tired in every photo. Take a couple of days — or at least a spa day."',
      options: [opt('rest', 'Take the weekend off'), opt('spa', 'Spa day — $1,500', undefined, 1500), opt('push', 'Push through')],
      expiresSerial: w.serial + 2,
    };
  },
  resolve: (_m, o, _w, roll) => {
    if (o === 'rest') return { text: 'You slept for a day straight. You feel human again.', effects: [{ k: 'energy', v: 45 }, { k: 'momentum', v: -1 }] };
    if (o === 'spa') return { text: 'Massage, steam room, no phone. Reset.', effects: [{ k: 'money', v: -1500 }, { k: 'energy', v: 60 }] };
    return roll < 0.25
      ? { text: 'You pushed through and got sick. Now you\'re in bed anyway, and you missed a week.', effects: [{ k: 'energy', v: -40 }, { k: 'momentum', v: -3 }] }
      : { text: 'You pushed through. It worked this time.', effects: [{ k: 'energy', v: -5 }, { k: 'stat', stat: 'discipline', v: 1 }] };
  },
};

const leakThreat: Template = {
  id: 'leak_threat', channel: 'team', weight: 1.2,
  build: (w) => {
    const song = w.unreleased[0];
    if (!song) return null;
    const eng = crewOf(w, 'engineer');
    const who = eng?.npcName ?? 'Your studio engineer';
    return {
      kind: 'leak_threat', crewRole: eng ? 'engineer' : undefined, npcName: who,
      title: `${who}: "${song.title}" leaked`,
      body: `"A snippet of "${song.title}" is on the internet. 30 seconds, bad quality, but people are already asking for it. Somebody from a session must have shared it."`,
      options: [opt('hunt', 'Find the leaker — $2,000', undefined, 2000), opt('tease', 'Lean into it — tease the release'), opt('nothing', 'Do nothing')],
      expiresSerial: w.serial + 3,
      data: { songId: song.id, title: song.title },
    };
  },
  resolve: (m, o, w, roll) => {
    if (o === 'hunt') return roll < 0.5
      ? { text: 'It was a friend of a friend at the last session. They\'re banned. The snippet came down.', effects: [{ k: 'money', v: -2000 }, { k: 'stat', stat: 'discipline', v: 1 }] }
      : { text: 'Two grand later, nobody knows who did it. The snippet is still up.', effects: [{ k: 'money', v: -2000 }, { k: 'momentum', v: 1 }] };
    if (o === 'tease') return { text: `You posted "you weren't supposed to hear that 👀". Now everybody wants "${m.data?.title}".`, effects: [{ k: 'momentum', v: w.playerFame >= 20 ? 4 : 2 }, { k: 'fans', v: Math.round(60 + w.playerFame * 45) }] };
    return { text: 'The snippet floated around for a week, then people forgot.', effects: [{ k: 'momentum', v: 1 }] };
  },
};

const crewRaise: Template = {
  id: 'crew_raise', channel: 'team', weight: 1.2,
  build: (w) => {
    const c = w.crew.find((x) => (x.monthsServed ?? 0) >= 4 && x.monthlyWage > 0);
    if (!c) return null;
    const raise = r50(c.monthlyWage * 0.15);
    return {
      kind: 'crew_raise', crewRole: c.role, npcId: c.npcId, npcName: c.npcName,
      title: `${c.npcName} wants a raise`,
      body: `"I've been with you ${c.monthsServed} months. I've earned my cut. I want $${raise.toLocaleString()} more a month — or I need to start looking elsewhere."`,
      options: [opt('raise', `Give them +$${raise.toLocaleString()}/month`), opt('bonus', `One-off bonus — $${c.monthlyWage.toLocaleString()}`, undefined, c.monthlyWage), opt('no', 'Not right now')],
      expiresSerial: w.serial + 5,
      data: { crewId: c.id, raise, wage: c.monthlyWage },
    };
  },
  resolve: (m, o, _w, roll) => {
    const crewId = String(m.data?.crewId);
    const raise = Number(m.data?.raise ?? 0);
    if (o === 'raise') return { text: `${m.npcName} is grateful — and working harder.`, effects: [{ k: 'wage', crewId, v: raise }, { k: 'morale', crewId, v: 20 }] };
    if (o === 'bonus') return { text: 'The bonus bought you some time. They\'ll ask again.', effects: [{ k: 'money', v: -Number(m.data?.wage ?? 0) }, { k: 'morale', crewId, v: 10 }] };
    return roll < 0.3
      ? { text: `${m.npcName} handed in their notice. They found something better.`, effects: [{ k: 'quit', crewId }] }
      : { text: `${m.npcName} said "fine". It wasn't fine.`, effects: [{ k: 'morale', crewId, v: -20 }] };
  },
};

const teamFeud: Template = {
  id: 'team_feud', channel: 'team', weight: 1,
  build: (w) => {
    if (w.crew.length < 2) return null;
    const [a, b] = w.crew;
    return {
      kind: 'team_feud', crewRole: a.role, npcName: a.npcName,
      title: `${a.npcName} and ${b.npcName} are at each other's throats`,
      body: `"${a.npcName} says ${b.npcName} is undermining them. ${b.npcName} says ${a.npcName} takes credit for everything. The whole team can feel it."`,
      options: [opt('a', `Back ${a.npcName}`), opt('b', `Back ${b.npcName}`), opt('meet', 'Sit them both down')],
      expiresSerial: w.serial + 4,
      data: { a: a.id, b: b.id, aName: a.npcName, bName: b.npcName },
    };
  },
  resolve: (m, o, w, roll) => {
    const a = String(m.data?.a), b = String(m.data?.b);
    if (o === 'a') return { text: `${m.data?.aName} feels backed. ${m.data?.bName} feels betrayed.`, effects: [{ k: 'morale', crewId: a, v: 15 }, { k: 'morale', crewId: b, v: -25 }] };
    if (o === 'b') return { text: `${m.data?.bName} feels backed. ${m.data?.aName} feels betrayed.`, effects: [{ k: 'morale', crewId: b, v: 15 }, { k: 'morale', crewId: a, v: -25 }] };
    return roll + w.charisma / 200 > 0.6
      ? { text: 'Two hours, some shouting, then a handshake. The team is tighter for it.', effects: [{ k: 'morale', crewId: a, v: 10 }, { k: 'morale', crewId: b, v: 10 }, { k: 'stat', stat: 'charisma', v: 1 }] }
      : { text: 'The meeting made it worse. Both of them think you took the other side.', effects: [{ k: 'morale', crewId: a, v: -10 }, { k: 'morale', crewId: b, v: -10 }] };
  },
};

const stylistDesigner: Template = {
  id: 'stylist_designer', channel: 'team', weight: 1,
  build: (w, seed) => {
    const st = crewOf(w, 'stylist');
    if (!st) return null;
    return {
      kind: 'stylist_designer', crewRole: 'stylist', npcName: st.npcName,
      title: `${st.npcName}: a designer wants to dress you`,
      body: `"${pick(['A young local designer', 'A big fashion house', 'A streetwear brand everyone is wearing'], seed)} wants to dress you for your next appearance. Free clothes, but they want you to post it."`,
      options: [opt('yes', 'Wear it and post it'), opt('own', 'Stick to your own style')],
      expiresSerial: w.serial + 4,
    };
  },
  resolve: (_m, o, _w, roll) => {
    if (o === 'yes') return roll < 0.8
      ? { text: 'The fit went viral. "Best dressed this week" lists everywhere. The piece is yours to keep.', effects: [{ k: 'momentum', v: 3 }, { k: 'stat', stat: 'charisma', v: 1 }, { k: 'dripGift', from: 'a designer' }] }
      : { text: 'The fit was a miss. The memes were brutal. At least you kept the piece.', effects: [{ k: 'momentum', v: -1 }, { k: 'dripGift', from: 'a designer' }] };
    return { text: 'You stayed you. Some respect that.', effects: [] };
  },
};

const openerAsk: Template = {
  id: 'opener_ask', channel: 'dm', weight: 1.5,
  build: (w, seed) => {
    if (!w.hasUpcomingShow) return null;
    const npc = w.strangers.find((n) => n.fame < w.playerFame && n.fame >= w.playerFame - 25) ?? w.friends.find((n) => n.fame < w.playerFame);
    if (!npc) return null;
    return {
      kind: 'opener_ask', npcId: npc.id, npcName: npc.name,
      title: `${npc.name} wants to open for you`,
      body: voice(npc, seed, {
        street: ['Let me open your show bro. I\'ll do it for free, I just need the stage.'],
        business: ['I\'d love the opening slot on your next show. No fee needed — the exposure is enough.'],
        creative: ['Could I open for you? I promise to warm the room up right.'],
        status: ['Put me on your next show. We both win.'],
      }),
      options: [opt('yes', 'Put them on the bill (free)'), opt('no', 'Not this time')],
      expiresSerial: w.serial + 4,
    };
  },
  resolve: (m, o) => {
    const id = m.npcId!;
    if (o === 'yes') return { text: `${m.npcName} is your opener. They're telling everyone.`, effects: [{ k: 'rel', npcId: id, v: 12 }, { k: 'addOpener', npcId: id }] };
    return { text: '"No worries, I\'ll keep grinding."', effects: [{ k: 'rel', npcId: id, v: -2 }] };
  },
};


// ─── FEATURE TWISTS ────────────────────────────────────────────────────────
// A feature is a negotiation between two egos. Sometimes the answer comes
// with a condition, or doesn't come on time.

const featureLate: Template = {
  id: 'feature_late', channel: 'dm', weight: 0, build: () => null,
  resolve: (m, o, _w, roll) => {
    const rid = String(m.data?.requestId);
    const id = m.npcId!;
    if (o === 'wait') return { text: '"Appreciate the patience 🙏" Your verse is coming — eventually.', effects: [{ k: 'rel', npcId: id, v: 2 }] };
    if (o === 'chase') return roll < 0.5
      ? { text: `${m.npcName} locked in after your message. Verse coming in now.`, effects: [{ k: 'featureNow', requestId: rid }] }
      : { text: `${m.npcName} did not like being chased. "I said I'm on it."`, effects: [{ k: 'rel', npcId: id, v: -6 }, { k: 'featureDelay', requestId: rid, days: 3 }] };
    return { text: `You pulled the record from ${m.npcName}. They acted like they didn't care. They cared.`, effects: [{ k: 'featureCancel', requestId: rid }, { k: 'rel', npcId: id, v: -8 }] };
  },
};

const featureSwap: Template = {
  id: 'feature_swap', channel: 'dm', weight: 0, build: () => null,
  resolve: (m, o) => {
    const rid = String(m.data?.requestId);
    const id = m.npcId!;
    if (o === 'swap') return { text: `Verse for a verse: ${m.npcName} does your song free, and their record is in Studio → Features for you.`, effects: [{ k: 'featureFree', requestId: rid }, { k: 'inboundAsk', npcId: id, free: true }, { k: 'rel', npcId: id, v: 6 }] };
    return { text: 'You kept it business. The fee stands.', effects: [{ k: 'rel', npcId: id, v: -1 }] };
  },
};

const featureLead: Template = {
  id: 'feature_lead', channel: 'dm', weight: 0, build: () => null,
  resolve: (m, o, _w, roll) => {
    const rid = String(m.data?.requestId);
    const id = m.npcId!;
    if (o === 'yes') return { text: `"${m.npcName} & you" on the cover. Their fans will find the song — and some of yours think you got bullied.`, effects: [{ k: 'momentum', v: 3 }, { k: 'reputation', v: -1 }, { k: 'rel', npcId: id, v: 5 }] };
    return roll < 0.4
      ? { text: `${m.npcName} pulled out over billing. Egos.`, effects: [{ k: 'featureCancel', requestId: rid }, { k: 'rel', npcId: id, v: -6 }] }
      : { text: `"Fine. Your song, your name first." They respected the push.`, effects: [{ k: 'rel', npcId: id, v: 1 }] };
  },
};

// ─── WHEN A FEATURE DEAL'S TERMS ARE BROKEN ────────────────────────────────
// Built by the store when a term is broken (see `sim/featureTerms.ts`). Real
// artists never speak here: their side comes through your own manager or
// lawyer, relaying what their team sent.

const featureBreach: Template = {
  id: 'feature_breach', channel: 'dm', weight: 0, build: () => null,
  resolve: (m, o, w, roll) => {
    const d = m.data ?? {};
    const npcId = String(d.npcId ?? m.npcId ?? '');
    const requestId = String(d.requestId ?? '');
    const songId = String(d.songId ?? '');
    const fee = Number(d.fee ?? 0);
    const ask = Number(d.ask ?? 0);
    const real = !!d.real;
    const name = String(d.name ?? m.npcName ?? 'They');
    const how = String(d.how ?? 'remove');
    const settle: MomentEffect = { k: 'settleBreach', requestId };
    const rel = (v: number): MomentEffect[] => (npcId ? [{ k: 'rel', npcId, v }] : []);
    if (how === 'window') {
      // The record is still in your vault and the window they gave is gone.
      const title = String(d.title ?? 'the record');
      if (o === 'promise') return { text: `${name}${real ? '\'s team' : ''} gave you two more weeks. If "${title}" isn't out by then, the verse goes back.`, effects: [{ k: 'extendTerms', requestId, days: 14 }, ...rel(1)] };
      if (o === 'pay') return roll < 0.55 + Number(d.warmth ?? 0.4) * 0.4 || real
        ? { text: `$${ask.toLocaleString()} bought you time. The verse stays — no deadline now.`, effects: [{ k: 'money', v: -ask }, { k: 'dropTerm', requestId, kind: 'release_window' }, settle, ...rel(2)] }
        : { text: `${name} didn't want money — they wanted the song out. The verse goes back to them.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, ...rel(-3), settle] };
      if (o === 'return') return { text: `You gave the verse back. ${name} respected that.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, ...rel(3), settle] };
      return real
        ? { text: `The clearance lapsed. ${name}'s verse can't go out on "${title}" now.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, settle] }
        : { text: `${name} took the verse back. It'll turn up on somebody else's record.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, ...rel(-6), settle] };
    }
    if (how === 'renegotiate') {
      if (o === 'pay') return { text: `Paid. ${name}${real ? '\'s team' : ''} signed off — the record stays as it is.`, effects: [{ k: 'money', v: -ask }, settle, ...rel(5)] };
      if (o === 'half') return roll + w.businessKnowledge / 200 > 0.65
        ? { text: `They took half. Done, and everybody saved face.`, effects: [{ k: 'money', v: -Math.round(ask / 2) }, settle, ...rel(2)] }
        : { text: `"Half is an insult." Now they want the verse off the record.`, effects: [...rel(-6), { k: 'removeVerse', songId, npcId, requestId }, settle] };
      return real
        ? { text: `Their team filed claims with the platforms. The version with their verse is gone; the song is back up without it.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, { k: 'reputation', v: -2 }, settle] }
        : roll < Number(d.litigious ?? 0.4)
          ? { text: `${name} went to a lawyer. You're being sued for breaking the deal.`, effects: [{ k: 'sueBreach', npcId, requestId, claim: Math.max(ask * 2, fee * 2, 1500) }, ...rel(-10)] }
          : { text: `${name} wants their verse off the record. You took it off.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, ...rel(-8), settle] };
    }
    if (how === 'remove') {
      if (o === 'remove') return { text: `The verse is off. The record is a little weaker, but the deal is the deal.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, ...rel(3), settle] };
      if (o === 'pay') return roll < 0.5 + (Number(d.warmth ?? 0.4) * 0.4)
        ? { text: `$${ask.toLocaleString()} and an apology kept the verse on. Expensive lesson.`, effects: [{ k: 'money', v: -ask }, settle, ...rel(1)] }
        : { text: `They didn't want money. The verse comes off.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, ...rel(-4), settle] };
      return real
        ? { text: `Their team went to the platforms instead. The song is back up without their verse, and the blogs noticed.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, { k: 'reputation', v: -3 }, settle] }
        : roll < 0.4 + Number(d.litigious ?? 0.4) * 0.5
          ? { text: `${name} sued. The deal was in writing.`, effects: [{ k: 'sueBreach', npcId, requestId, claim: Math.max(fee * 3, 2000) }, ...rel(-15)] }
          : { text: `${name} posted about it and pulled the verse themselves. The internet picked a side — not yours.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, { k: 'reputation', v: -2 }, ...rel(-15), settle] };
    }
    // public
    if (o === 'apologise') return { text: `You owned it. ${name} accepted, mostly. The story died in a day.`, effects: [{ k: 'reputation', v: 1 }, ...rel(6), settle] };
    if (o === 'fire') return { text: `You fired back. Now it's a beef.`, effects: [{ k: 'startBeef', npcId }, { k: 'heat', npcId, v: 15 }, { k: 'momentum', v: 3 }, { k: 'reputation', v: -1 }, ...rel(-15), settle] };
    return roll < 0.3
      ? { text: `Silence made it worse. They want the verse off.`, effects: [{ k: 'removeVerse', songId, npcId, requestId }, ...rel(-8), settle] }
      : { text: `You stayed quiet and it blew over.`, effects: [...rel(-5), settle] };
  },
};

// ─── A CYPHER ───────────────────────────────────────────────────────────────
// A real freestyle: the night goes in your diary, and when it comes you stand
// in the circle and rap — three rounds, your skills against the room (see
// `sim/freestyle.ts`).

const cypherInvite: Template = {
  id: 'cypher_invite', channel: 'dm', weight: 2.4,
  build: (w, seed) => {
    if (w.playerFame >= 80) return null;
    const host = (w.djs ?? []).find((n) => !w.activeBeefIds.has(n.id)) ?? w.friends.find((n) => n.role === 'artist' && !w.activeBeefIds.has(n.id)) ?? w.bloggers[0];
    if (!host) return null;
    const weekday = [4, 5, 6][hashString(seed) % 3];
    const at = nextNight(w.serial, weekday, 21);
    const city = w.city ?? host.city ?? 'the city';
    const place = pick([`the ${city} cypher spot`, `${host.name.split(' ')[0]}'s studio`, `The Basement, ${city}`, `the car park behind the radio station`], seed);
    const count = 3 + (hashString(seed + 'n') % 3);
    return {
      kind: 'cypher_invite', npcId: host.id, npcName: host.name,
      title: `${host.name}: cypher ${DOW[weekday]}?`,
      body: pick(host.role === 'dj'
        ? [`Cypher ${DOW[weekday]} night at ${place}. ${count} MCs, one beat, we're filming it. You in?`, `I'm running a cypher ${DOW[weekday]} — ${count} MCs, live. Your name came up. Pull up?`]
        : [`Yo, cypher at ${place} ${DOW[weekday]} night. ${count} of us, no hooks, just bars. Come through 🎤`, `We're doing a freestyle session ${DOW[weekday]}. Bring your A-game — it's getting filmed.`], seed),
      options: [opt('go', 'Pull up', 'A real freestyle — your skills decide how it goes'), opt('no', 'Not this time'), opt('ignore', 'Leave them on read')],
      expiresSerial: w.serial + 2,
      data: { atMinute: at, place },
    };
  },
  resolve: (m, o) => {
    const id = m.npcId!;
    if (o === 'go') return { text: 'It\'s in your diary. Practise — they\'re filming it.', effects: [{ k: 'cypher', npcId: id, atMinute: Number(m.data?.atMinute ?? 0), place: String(m.data?.place ?? 'the cypher') }, { k: 'rel', npcId: id, v: 2 }] };
    if (o === 'no') return { text: '"Next one then." No harm done.', effects: [{ k: 'rel', npcId: id, v: -1 }] };
    return { text: `${m.npcName} saw the read receipt.`, effects: [{ k: 'rel', npcId: id, v: -4 }] };
  },
};

// They broke YOUR terms on a verse you gave them. Your move.
const verseBreach: Template = {
  id: 'verse_breach', channel: 'team', weight: 0, build: () => null,
  resolve: (m, o, w, roll) => {
    const d = m.data ?? {};
    const npcId = String(d.npcId ?? '');
    const name = String(d.name ?? 'They').split(' ')[0];
    const fee = Number(d.fee ?? 0);
    const warmth = Number(d.warmth ?? 0.5);
    const more = Math.max(300, Math.round((fee * 0.5) / 100) * 100);
    const rel = (v: number): MomentEffect[] => (npcId ? [{ k: 'rel', npcId, v }] : []);
    if (o === 'more') return roll < 0.35 + warmth * 0.4
      ? { text: `${name} paid $${more.toLocaleString()} extra to make it go away.`, effects: [{ k: 'money', v: more }, ...rel(-3)] }
      : { text: `${name} refused: "A verse is a verse." Now it's cold between you.`, effects: rel(-8) };
    if (o === 'pull') return { text: `Your verse is off "${String(d.title ?? 'their record')}". You stood on business — people respect it.`, effects: [{ k: 'pullMyVerse', songId: String(d.songId ?? ''), requestId: String(d.requestId ?? '') }, { k: 'reputation', v: 1 }, ...rel(-12)] };
    if (o === 'public') return { text: `You called ${name} out. The timeline loved it; ${name} didn't.`, effects: [{ k: 'momentum', v: 3 }, ...rel(-15), ...(roll < 0.4 ? [{ k: 'startBeef' as const, npcId }] : [])] };
    if (o === 'lawyer') return roll < 0.4 + w.businessKnowledge / 250
      ? { text: `Your lawyer's letter worked. ${name} settled for $${Math.round(fee * 0.8).toLocaleString()}.`, effects: [{ k: 'money', v: Math.round(fee * 0.8) }, ...rel(-15)] }
      : { text: `${name} fought it. Lawyers cost more than the verse — you dropped it.`, effects: [{ k: 'money', v: -500 }, ...rel(-10)] };
    return { text: 'You let it go. Bigger things to do.', effects: [{ k: 'reputation', v: 0.5 }, ...rel(-2)] };
  },
};

const remixAsk: Template = {
  id: 'remix_ask', channel: 'dm', weight: 0, build: () => null,
  resolve: (m, o) => {
    const id = m.npcId!;
    if (o === 'yes') return { text: 'They sent the verse that night. The remix is in your vault.', effects: [{ k: 'remixGuest', npcId: id, songId: String(m.data?.songId ?? '') }, { k: 'rel', npcId: id, v: 6 }] };
    if (o === 'no') return { text: '"Respect. The original is crazy anyway."', effects: [{ k: 'rel', npcId: id, v: -2 }] };
    return { text: `${m.npcName} saw the read receipt.`, effects: [{ k: 'rel', npcId: id, v: -4 }] };
  },
};

// ─── BIRTHDAYS ──────────────────────────────────────────────────────────────

const birthdayPlan: Template = {
  id: 'birthday_plan', channel: 'life', weight: 0, build: () => null,
  resolve: (m, o) => {
    const cost = Number(m.data?.cost ?? 0);
    const dinner = Number(m.data?.dinner ?? 0);
    if (o === 'party') return { text: `Party it is. The invites go out today — we'll see who turns up.`, effects: [{ k: 'money', v: -cost }, { k: 'birthdayPlan', plan: 'party' }] };
    if (o === 'dinner') return { text: 'A table for the people who matter. Booked.', effects: [{ k: 'money', v: -dinner }, { k: 'birthdayPlan', plan: 'dinner' }] };
    if (o === 'studio') return { text: 'Birthday in the booth. The team respects it.', effects: [{ k: 'birthdayPlan', plan: 'studio' }] };
    return { text: 'Just a normal day. The people who love you will still text.', effects: [{ k: 'birthdayPlan', plan: 'normal' }] };
  },
};

/** A week out (or on the day): what are we doing for your birthday? */
export function buildBirthdayPlan(i: { daysOut: number; age: number; cost: number; dinner: number; serial: number; asker?: { name: string; role: string } }): Omit<Moment, 'id' | 'createdSerial' | 'status'> {
  const when = i.daysOut === 0 ? 'today' : i.daysOut === 1 ? 'tomorrow' : `in ${i.daysOut} days`;
  return {
    kind: 'birthday_plan', channel: 'life', npcName: i.asker?.name, crewRole: i.asker?.role,
    title: `🎂 You turn ${i.age} ${when}`,
    body: i.asker ? `${i.asker.name.split(' ')[0]}: "Your birthday is ${when}. What are we doing — party, dinner, or keep it low-key?"` : `Your birthday is ${when}. What are you doing for it?`,
    options: [
      opt('party', `Throw a party ($${i.cost.toLocaleString()})`, 'Invites go out — who turns up says a lot', i.cost),
      opt('dinner', `Dinner with your people ($${i.dinner.toLocaleString()})`, 'Team and close friends', i.dinner),
      opt('studio', 'Spend it in the studio', 'Work is the celebration'),
      opt('normal', 'Treat it like a normal day'),
    ],
    expiresSerial: i.serial + Math.max(1, i.daysOut),
    data: { cost: i.cost, dinner: i.dinner, age: i.age },
  };
}

const npcBirthday: Template = {
  id: 'npc_birthday', channel: 'life', weight: 0, build: () => null,
  resolve: (m, o) => {
    const id = String(m.data?.npcId ?? '');
    const gift = Number(m.data?.gift ?? 0);
    const crewId = m.data?.crewId ? String(m.data.crewId) : undefined;
    const name = String(m.data?.name ?? 'them').split(' ')[0];
    if (o === 'text') return { text: `You texted ${name} happy birthday. Small thing — it counts.`, effects: [{ k: 'rel', npcId: id, v: 3 }, ...(crewId ? [{ k: 'morale' as const, crewId, v: 3 }] : [])] };
    if (o === 'gift') return { text: `You sent ${name} a gift. They posted it.`, effects: [{ k: 'money', v: -gift }, { k: 'rel', npcId: id, v: 9 }, ...(crewId ? [{ k: 'morale' as const, crewId, v: 10 }] : [])] };
    if (o === 'post') return { text: `You posted ${name} for their birthday. Their fans noticed.`, effects: [{ k: 'rel', npcId: id, v: 6 }, { k: 'momentum', v: 1 }] };
    return { text: `You let ${name}'s birthday pass.`, effects: Number(m.data?.rel ?? 0) >= 55 ? [{ k: 'rel', npcId: id, v: -2 }] : [] };
  },
};

/** Somebody you know has a birthday today. */
export function buildNpcBirthday(i: { npcId: string; name: string; role: string; rel: number; gift: number; crewId?: string; real: boolean; serial: number }): Omit<Moment, 'id' | 'createdSerial' | 'status'> {
  const first = i.name.split(' ')[0];
  const options = i.real
    ? [opt('post', `Post a birthday shout-out`), opt('skip', 'Let it pass')]
    : [opt('text', 'Text happy birthday'), opt('gift', `Send a gift ($${i.gift.toLocaleString()})`, undefined, i.gift), ...(i.rel >= 40 ? [opt('post', 'Post them on your page')] : []), opt('skip', 'Let it pass')];
  return {
    kind: 'npc_birthday', channel: 'life', npcName: i.name,
    title: `🎂 It's ${first}'s birthday`,
    body: i.crewId ? `${i.name} (your ${i.role.replace(/_/g, ' ')}) has a birthday today.` : i.real ? `${i.name} has a birthday today. The timeline is full of it.` : `${i.name} has a birthday today. ${i.rel >= 55 ? 'They\'ll notice if you don\'t say anything.' : 'A text goes a long way.'}`,
    options,
    expiresSerial: i.serial,
    data: { npcId: i.npcId, gift: i.gift, crewId: i.crewId, name: i.name, rel: i.rel },
  };
}

/** The moment a broken term lands on you. */
export function buildBreachMoment(i: {
  requestId: string; songId: string; songTitle: string; npcId: string; npcName: string; real: boolean;
  how: 'renegotiate' | 'remove' | 'public' | 'window'; what: string; fee: number; ask: number; litigious: number; warmth: number;
  relay?: { name: string; role: string };
}, serial: number): Omit<Moment, 'id' | 'createdSerial' | 'status'> {
  const first = i.npcName.split(' ')[0];
  const data = { requestId: i.requestId, songId: i.songId, npcId: i.npcId, fee: i.fee, ask: i.ask, real: i.real, name: i.npcName, how: i.how, litigious: i.litigious, warmth: i.warmth, title: i.songTitle };
  const relay = i.real ? i.relay ?? { name: 'Your lawyer', role: 'lawyer' } : null;
  const say = (own: string, team: string) => (relay ? `"${first}'s team sent a letter about "${i.songTitle}". ${team}"` : own);
  if (i.how === 'window') return {
    kind: 'feature_breach', channel: relay ? 'team' : 'dm', npcId: relay ? undefined : i.npcId, npcName: relay ? relay.name : i.npcName, crewRole: relay?.role, data,
    title: `${i.npcName}: "${i.songTitle}" is still in your vault`,
    body: say(`"${i.songTitle}" still isn't out. The deal was four months, and my verse is just sitting there. Drop it, or I want it back.`, `The clearance on the verse was for four months, and the record still isn't out. Release it, pay to extend, or the verse comes off.`),
    options: [opt('promise', 'Release it within two weeks'), opt('pay', `Pay $${i.ask.toLocaleString()} for more time`, undefined, i.ask), opt('return', 'Give the verse back')],
    expiresSerial: serial + 5,
  };
  if (i.how === 'renegotiate') return {
    kind: 'feature_breach', channel: relay ? 'team' : 'dm', npcId: relay ? undefined : i.npcId, npcName: relay ? relay.name : i.npcName, crewRole: relay?.role, data,
    title: `${i.npcName}: "${i.songTitle}" broke the deal`,
    body: say(`I heard "${i.songTitle}". ${i.what} That wasn't the deal. Pay me $${i.ask.toLocaleString()} more and we're good.`, `${i.what} They want $${i.ask.toLocaleString()} to let it stand.`),
    options: [opt('pay', `Pay $${i.ask.toLocaleString()}`, undefined, i.ask), opt('half', `Offer $${Math.round(i.ask / 2).toLocaleString()}`), opt('refuse', 'Refuse')],
    expiresSerial: serial + 5,
  };
  if (i.how === 'remove') return {
    kind: 'feature_breach', channel: relay ? 'team' : 'dm', npcId: relay ? undefined : i.npcId, npcName: relay ? relay.name : i.npcName, crewRole: relay?.role, data,
    title: `${i.npcName} wants their verse off "${i.songTitle}"`,
    body: say(`You broke the terms on "${i.songTitle}". ${i.what} Take my verse off. Today.`, `${i.what} They want the verse taken off the record.`),
    options: [opt('remove', 'Take the verse off'), opt('pay', `Offer $${i.ask.toLocaleString()} to keep it`, undefined, i.ask), opt('refuse', 'Refuse')],
    expiresSerial: serial + 5,
  };
  return {
    kind: 'feature_breach', channel: 'dm', npcId: i.npcId, npcName: i.npcName, data,
    title: `${i.npcName} called you out about "${i.songTitle}"`,
    body: `${i.npcName} posted about "${i.songTitle}": the deal was broken. ${i.what} The comments are filling up.`,
    options: [opt('apologise', 'Apologise publicly'), opt('fire', 'Fire back'), opt('ignore', 'Say nothing')],
    expiresSerial: serial + 4,
  };
}

export function buildFeatureTwist(kind: 'late' | 'swap' | 'lead', req: { id: string; songTitle: string; npcId: string; npcName: string; fee: number }, serial: number): Omit<Moment, 'id' | 'createdSerial' | 'status'> {
  const data = { requestId: req.id };
  if (kind === 'late') {
    return {
      kind: 'feature_late', channel: 'dm', npcId: req.npcId, npcName: req.npcName, data,
      title: `${req.npcName} is running late on "${req.songTitle}"`,
      body: pick([`My bad, been crazy busy. Give me another week on "${req.songTitle}"?`, `Still haven't cracked the verse for "${req.songTitle}". I want it right. Few more days.`], req.id),
      options: [opt('wait', 'Take your time'), opt('chase', 'I need it now'), opt('drop', 'Forget it — pull the record')],
      expiresSerial: serial + 4,
    };
  }
  if (kind === 'swap') {
    return {
      kind: 'feature_swap', channel: 'dm', npcId: req.npcId, npcName: req.npcName, data,
      title: `${req.npcName} has a counter-idea`,
      body: `Forget the $${req.fee.toLocaleString()}. I'll do "${req.songTitle}" for free if you jump on my next one. Verse for a verse.`,
      options: [opt('swap', 'Verse for a verse'), opt('pay', 'I\'d rather just pay')],
      expiresSerial: serial + 4,
    };
  }
  return {
    kind: 'feature_lead', channel: 'dm', npcId: req.npcId, npcName: req.npcName, data,
    title: `${req.npcName} wants top billing`,
    body: `Love "${req.songTitle}". One thing: my name goes first on the cover. That's how it works at my level.`,
    options: [opt('yes', 'Fine, your name first'), opt('no', 'It\'s my song. My name first.')],
    expiresSerial: serial + 3,
  };
}

// ─── LIFE: THINGS THAT HAPPEN TO YOU ───────────────────────────────────────
// Not the industry — life. Family, the police, your phone, your health, the
// power going off in the middle of a session.

const familyMoney: Template = {
  id: 'family_money', channel: 'life', weight: 1.4,
  build: (w, seed) => {
    if (w.money < 3000) return null;
    const who = pick(['Your aunty', 'Your uncle', 'Your mum', 'Your cousin', 'Your grandmother'], seed);
    const why = pick([['school fees for your little cousin', 1800], ['a hospital bill', 2500], ['funeral contributions back home', 1200], ['rent — they are three months behind', 2200], ['a small shop they want to open', 4000]] as [string, number][], seed + 'w');
    const amt = r50(why[1] * (1 + w.playerFame / 60));
    return {
      kind: 'family_money', npcName: who, title: `${who} needs help`, data: { amt },
      body: `${who} called. They need $${amt.toLocaleString()} for ${why[0]}. "We are proud of you. God will bless you."`,
      options: [opt('all', `Send $${amt.toLocaleString()}`, 'Family is family', amt), opt('half', `Send $${r50(amt / 2).toLocaleString()}`, 'Help, within reason', r50(amt / 2)), opt('no', 'Not this time', 'They might tell the whole family')],
      expiresSerial: w.serial + 3,
    };
  },
  resolve: (m, o, _w, roll) => {
    const amt = Number(m.data?.amt ?? 1000);
    if (o === 'all') return { text: 'They cried on the phone. The whole family is talking about how you never forget where you came from.', effects: [{ k: 'money', v: -amt }, { k: 'reputation', v: 1 }, { k: 'stat', stat: 'discipline', v: 0.5 }] };
    if (o === 'half') return { text: 'Half is better than nothing. They said thank you — mostly.', effects: [{ k: 'money', v: -r50(amt / 2) }] };
    return roll < 0.35
      ? { text: 'It got around the family WhatsApp group. Then a blog got hold of it: "Fame has changed him."', effects: [{ k: 'reputation', v: -2 }, { k: 'energy', v: -5 }] }
      : { text: 'They understood. Awkward at the next family gathering, though.', effects: [{ k: 'energy', v: -3 }] };
  },
};

const policeStop: Template = {
  id: 'police_stop', channel: 'life', weight: 1,
  build: (w, seed) => {
    // A roadside shakedown is a West and Central African and East African
    // reality, not a London one. Elsewhere it's a stop and a ticket.
    if (!CHECKPOINTS.has(w.country ?? '')) {
      if (w.playerFame < 10) return null;
      return {
        kind: 'police_stop', title: 'Pulled over',
        body: `Blue lights in the mirror. ${pick(['A broken tail light', 'Doing 15 over', 'An expired registration'], seed)}. The officer recognises the name on your licence.${w.playerFame >= 25 ? ' A passer-by is filming.' : ''}`,
        options: [opt('pay', 'Take the ticket and pay it', `$${r50(120 * costIndex(w.country))}`, r50(120 * costIndex(w.country))), opt('wait', 'Be polite and wait', 'Costs time'), opt('lawyer', w.hasLawyer ? 'Call your lawyer' : 'Call a lawyer ($1,000)', w.hasLawyer ? 'Free — they\'re on the payroll' : 'Overkill?', w.hasLawyer ? 0 : 1000)],
        expiresSerial: w.serial + 1,
        data: { famous: false, lawyer: w.hasLawyer, fine: r50(120 * costIndex(w.country)) },
      };
    }
    const bribe = r50(150 * Math.max(0.6, costIndex(w.country)));
    return {
      kind: 'police_stop', title: 'Stopped at a police checkpoint',
      body: `It's late. An officer looks at your papers for a long time, then says: "${w.country === 'Nigeria' ? 'Oga, the boys are hungry o.' : w.country === 'Ghana' ? 'Chairman, the boys are hungry o.' : 'Boss, something for the boys?'}"${w.playerFame >= 25 ? ' Somebody across the road is filming.' : ''}`,
      options: [opt('pay', `Hand over $${bribe}`, 'Quick — but someone may be filming', bribe), opt('wait', 'Stay calm and wait it out', 'Costs time and energy'), opt('lawyer', w.hasLawyer ? 'Call your lawyer' : 'Call a lawyer ($1,000)', w.hasLawyer ? 'Free — they\'re on the payroll' : 'Expensive, but clean', w.hasLawyer ? 0 : 1000)],
      expiresSerial: w.serial + 1,
      data: { famous: w.playerFame >= 25, lawyer: w.hasLawyer, fine: bribe },
    };
  },
  resolve: (m, o, _w, roll) => {
    const fine = Number(m.data?.fine ?? 150);
    if (o === 'pay') return m.data?.famous && roll < 0.45
      ? { text: 'The video of you handing over cash is everywhere. "Is this the example we want?"', effects: [{ k: 'money', v: -fine }, { k: 'reputation', v: -4 }, { k: 'momentum', v: 1 }] }
      : { text: m.title === 'Pulled over' ? 'Ticket paid. Lesson learnt.' : 'Fifteen seconds and you were on your way.', effects: [{ k: 'money', v: -fine }] };
    if (o === 'wait') return roll < 0.6 ? { text: 'Two hours on the roadside. They let you go when their shift ended.', effects: [{ k: 'energy', v: -15 }, { k: 'stat', stat: 'discipline', v: 0.5 }] } : { text: 'The officer recognised you, asked for a selfie, and waved you on.', effects: [{ k: 'energy', v: -5 }, { k: 'fans', v: 50 }] };
    return { text: 'One phone call and it was over. Being connected pays.', effects: m.data?.lawyer ? [{ k: 'energy', v: -3 }] : [{ k: 'money', v: -1000 }, { k: 'energy', v: -3 }] };
  },
};

const phoneStolen: Template = {
  id: 'phone_stolen', channel: 'life', weight: 0.9,
  build: (w) => ({
    kind: 'phone_stolen', title: 'Your phone was snatched',
    body: `Window down in traffic, phone in your hand — gone. ${w.unreleased.length ? `It has demos of "${w.unreleased[0].title}" on it.` : 'Your whole life is on it.'}`,
    options: [opt('buy', 'Buy a new one and move on — $1,200', undefined, 1200), opt('track', 'Track it with the police', 'Long day, might get it back', 0, 15), opt('post', 'Post about it', 'Fans sympathise — and scammers notice')],
    expiresSerial: w.serial + 2,
    data: { demo: w.unreleased[0]?.title ?? '' },
  }),
  resolve: (m, o, _w, roll) => {
    const leak = !!m.data?.demo && roll < 0.3;
    if (o === 'buy') return { text: leak ? `New phone. Then a snippet of "${m.data?.demo}" appeared online. Someone went through the old one.` : 'New phone, same number. Lesson learnt.', effects: [{ k: 'money', v: -1200 }, ...(leak ? [{ k: 'momentum' as const, v: 2 }, { k: 'reputation' as const, v: -1 }] : [])] };
    if (o === 'track') return roll < 0.4 ? { text: 'The police found it at a market stall. Cracked screen, everything still there.', effects: [{ k: 'energy', v: -15 }] } : { text: 'Hours at the station. The phone is long gone.', effects: [{ k: 'energy', v: -15 }, { k: 'money', v: -1200 }] };
    return { text: _w.playerFame >= 25 ? 'Thousands of people sent love. A few hundred sent fake "I found your phone" messages.' : 'Friends and a few fans sent love. Two people sent fake "I found your phone" messages.', effects: [{ k: 'momentum', v: 1 }, { k: 'fans', v: Math.round(10 + _w.playerFame * 4) }, { k: 'money', v: -1200 }] };
  },
};

const hacked: Template = {
  id: 'account_hacked', channel: 'life', weight: 0.7,
  build: (w) => {
    if (w.playerFame < 12) return null;
    const fixer = crewOf(w, 'photographer', 'personal_assistant', 'publicist');
    return {
      kind: 'account_hacked', title: 'Your Snapgram got hacked',
      body: 'Someone is posting a crypto giveaway from your account. Fans are DMing you that they sent money. The hacker wants $3,000 to give it back.',
      options: [opt('pay', 'Pay the hacker — $3,000', 'Maybe they keep their word', 3000), opt('report', 'Report it to the app', 'Takes days'), ...(fixer ? [opt('crew', `Get ${fixer.npcName.split(' ')[0]} on it`, 'Your team handles it')] : [])],
      expiresSerial: w.serial + 1,
    };
  },
  resolve: (_m, o, _w, roll) => {
    if (o === 'pay') return roll < 0.55 ? { text: 'They gave it back. You changed every password you own.', effects: [{ k: 'money', v: -3000 }] } : { text: 'They took the money and kept the account. Of course they did.', effects: [{ k: 'money', v: -3000 }, { k: 'reputation', v: -2 }, { k: 'fans', v: -400 }] };
    if (o === 'report') return { text: 'Four days dark while the app investigated. Some fans lost money to the scam and blame you.', effects: [{ k: 'reputation', v: -2 }, { k: 'momentum', v: -2 }, { k: 'fans', v: -250 }] };
    return { text: 'Your team got it back in a few hours and posted a warning. Crisis handled.', effects: [{ k: 'momentum', v: -1 }] };
  },
};

const fanMob: Template = {
  id: 'fan_mob', channel: 'life', weight: 1,
  build: (w, seed) => {
    if (w.playerFame < 18) return null;
    const where = pick(['at the airport', 'at the mall', 'outside a restaurant', 'at a petrol station'], seed);
    return {
      kind: 'fan_mob', title: `Fans spotted you ${where}`,
      body: `A crowd is forming ${where}. Phones are out. Someone is crying.`,
      options: [opt('selfies', 'Stop for selfies with everyone', 'Takes an hour', 0, 10), opt('wave', 'Wave and keep moving'), opt('security', 'Let security clear a path', 'Fast — and cameras are rolling')],
      expiresSerial: w.serial + 1,
    };
  },
  resolve: (_m, o, w, roll) => {
    if (o === 'selfies') return { text: 'An hour of selfies and hugs. The videos are all over the timeline: "so humble".', effects: [{ k: 'energy', v: -10 }, { k: 'fans', v: Math.round(150 + w.playerFame * 20) }, { k: 'momentum', v: 2 }, { k: 'reputation', v: 1 }] };
    if (o === 'wave') return { text: 'A wave, a smile, gone. Some fans were disappointed.', effects: [{ k: 'fans', v: 30 }] };
    return roll < 0.4 ? { text: 'A guard shoved a teenage fan. The clip has a million views and you\'re the villain in it.', effects: [{ k: 'reputation', v: -3 }, { k: 'momentum', v: 1 }] } : { text: 'In and out. Nobody got hurt.', effects: [] };
  },
};

const oldFriend: Template = {
  id: 'old_friend', channel: 'life', weight: 0.9,
  build: (w, seed) => {
    // "Put me on" is something people ask once you have something to put them on.
    if (w.playerFame < 10 && w.money < 3000) return null;
    const name = oldFriendName(w.country, seed);
    return {
      kind: 'old_friend', npcName: name, title: `${name} wants you to put him on`,
      body: `"Bro, remember when we used to share one plate? I just need a chance. Let me be your hype man, carry your bags, anything."`,
      options: [opt('hire', 'Bring him on the road this month — $500', 'Loyalty, and a mouth to feed', 500), opt('help', 'Give him $800 and advice', undefined, 800), opt('no', 'Tell him you can\'t')],
      expiresSerial: w.serial + 4,
    };
  },
  resolve: (m, o, _w, roll) => {
    if (o === 'hire') return roll < 0.7 ? { text: `${m.npcName} was the loudest person at every show this month. The crowd loves him.`, effects: [{ k: 'money', v: -500 }, { k: 'stat', stat: 'stagePresence', v: 1 }, { k: 'reputation', v: 1 }] } : { text: `${m.npcName} got into a fight at your show. It's on every blog.`, effects: [{ k: 'money', v: -500 }, { k: 'reputation', v: -3 }, { k: 'momentum', v: 1 }] };
    if (o === 'help') return { text: 'He hugged you for a long time. He said he won\'t forget it.', effects: [{ k: 'money', v: -800 }, { k: 'reputation', v: 1 }] };
    return roll < 0.4 ? { text: 'He posted a long caption about how fame changes people. The old area is talking.', effects: [{ k: 'reputation', v: -2 }] } : { text: 'He understood. It still stung.', effects: [] };
  },
};

const charity: Template = {
  id: 'charity_visit', channel: 'life', weight: 0.8,
  build: (w, seed) => {
    if (w.money < 6000 || w.releasedTitles.length < 2 || w.playerFame < 20) return null;
    const place = pick(['an orphanage', 'your old school', 'a children\'s hospital ward', 'a community library'], seed);
    return {
      kind: 'charity_visit', title: `Invitation from ${place}`, data: { place },
      body: `${place[0].toUpperCase()}${place.slice(1)} wrote to you. The kids know all your songs. Would you visit — and maybe help?`,
      options: [opt('visit', 'Visit and donate $5,000', 'Cameras will be there', 5000, 15), opt('quiet', 'Donate $5,000 quietly', 'No cameras', 5000), opt('no', 'Politely decline')],
      expiresSerial: w.serial + 5,
    };
  },
  resolve: (m, o) => {
    if (o === 'visit') return { text: `The video of you singing with the kids at ${m.data?.place} made people cry. Respect.`, effects: [{ k: 'money', v: -5000 }, { k: 'energy', v: -15 }, { k: 'reputation', v: 4 }, { k: 'fans', v: 500 }, { k: 'momentum', v: 2 }] };
    if (o === 'quiet') return { text: 'Nobody knows. The kids do. That\'s enough.', effects: [{ k: 'money', v: -5000 }, { k: 'reputation', v: 1 }, { k: 'stat', stat: 'discipline', v: 1 }] };
    return { text: 'They understood.', effects: [] };
  },
};

const awardPresenter: Template = {
  id: 'award_presenter', channel: 'life', weight: 0.6,
  build: (w) => {
    if (w.playerFame < 25) return null;
    // A presenter is booked for a real ceremony, a few weeks before it.
    const a = w.nextAward;
    if (!a || a.daysOut < 5 || a.daysOut > 40) return null;
    return {
      kind: 'award_presenter', title: `Asked to present at the ${a.name}`,
      body: `The ${a.name} want you on stage in ${a.city} to present Best New Artist — ${a.daysOut} days from now. Red carpet, cameras, everyone who matters in one room.`,
      options: [opt('go', 'Do it', 'Big night', 0, 15), opt('no', 'Decline')],
      expiresSerial: w.serial + 4,
    };
  },
  resolve: (_m, o, _w, roll) => {
    if (o === 'no') return { text: 'They found someone else.', effects: [] };
    return roll < 0.15 ? { text: 'You mispronounced the winner\'s name on live TV. The memes are merciless.', effects: [{ k: 'energy', v: -15 }, { k: 'momentum', v: 3 }, { k: 'reputation', v: -1 }] } : { text: 'Smooth on stage, sharp on the carpet. You met half the industry tonight.', effects: [{ k: 'energy', v: -15 }, { k: 'momentum', v: 3 }, { k: 'stat', stat: 'networking', v: 1.5 }, { k: 'fame', v: 0.5 }] };
  },
};

const healthScare: Template = {
  id: 'health_scare', channel: 'life', weight: 0.9,
  build: (w, seed) => {
    if (w.energy > 40) return null;
    const what = pick([TROPICAL.has(w.country ?? '') ? 'a fever and chills — it might be malaria' : 'a fever that won\'t break — probably the flu', 'chest pains after a long night', 'a voice that\'s almost gone'], seed);
    return {
      kind: 'health_scare', title: 'You\'re not well', data: { what },
      body: `You woke up with ${what}.`,
      options: [opt('doctor', 'See a doctor and rest — $600', undefined, 600), opt('pharmacy', 'Pharmacy tablets and carry on', 'Cheap. Risky'), opt('push', 'Ignore it')],
      expiresSerial: w.serial + 1,
    };
  },
  resolve: (_m, o, _w, roll) => {
    if (o === 'doctor') return { text: 'Rest, medicine, three days off. You feel like yourself again.', effects: [{ k: 'money', v: -600 }, { k: 'energy', v: 45 }, { k: 'momentum', v: -1 }] };
    if (o === 'pharmacy') return roll < 0.6 ? { text: 'The tablets worked. Lucky.', effects: [{ k: 'money', v: -40 }, { k: 'energy', v: 20 }] } : { text: 'It got worse. You ended up in hospital anyway — for longer.', effects: [{ k: 'money', v: -1500 }, { k: 'energy', v: 10 }, { k: 'momentum', v: -3 }] };
    return roll < 0.5 ? { text: 'You collapsed backstage. Everyone saw.', effects: [{ k: 'energy', v: -30 }, { k: 'momentum', v: -2 }, { k: 'reputation', v: -1 }] } : { text: 'You pushed through. It passed. This time.', effects: [{ k: 'energy', v: -5 }] };
  },
};

const dumsor: Template = {
  id: 'power_cut', channel: 'life', weight: 0.8,
  build: (w) => {
    // Load-shedding is a fact of life in some countries and a non-event in others.
    if (!POWER_CUTS.has(w.country ?? '')) return null;
    // Once you own a generator the lights still go off — you just don't care.
    if (w.flags?.generator !== undefined) return null;
    const name = w.country === 'Ghana' ? 'Dumsor again' : w.country === 'Nigeria' ? 'NEPA took light' : w.country === 'South Africa' ? 'Load-shedding' : 'Lights off again';
    return {
      kind: 'power_cut', title: name,
      body: 'The power has gone off in the middle of a session. Again. Nobody knows when it\'s coming back.',
      options: [opt('gen', `Buy a proper generator — $${r50(2500 * Math.max(0.8, costIndex(w.country)))}`, 'Never again', r50(2500 * Math.max(0.8, costIndex(w.country)))), opt('wait', 'Wait it out', 'There goes the night'), opt('studio', 'Book another studio tonight — $300', undefined, 300)],
      expiresSerial: w.serial + 1,
      data: { gen: r50(2500 * Math.max(0.8, costIndex(w.country))) },
    };
  },
  resolve: (m, o, w) => {
    if (o === 'gen') return { text: 'A big diesel generator now lives behind the studio. The neighbours hate the noise. You don\'t care.', effects: [{ k: 'money', v: -Number(m.data?.gen ?? 2500) }, { k: 'stat', stat: 'productionKnowledge', v: 0.5 }, { k: 'flag', id: 'generator', v: w.serial }] };
    if (o === 'studio') return { text: 'You finished the session somewhere else. Worth it.', effects: [{ k: 'money', v: -300 }, { k: 'stat', stat: 'songwriting', v: 0.5 }] };
    return { text: 'Four hours in the dark, swatting mosquitoes. The vibe is dead.', effects: [{ k: 'energy', v: -10 }] };
  },
};

const movieSync: Template = {
  id: 'movie_sync', channel: 'life', weight: 0.6,
  build: (w, seed) => {
    // Music supervisors find records that are good, or records that are big.
    const pool = (w.released ?? []).filter((x) => x.quality >= 60 || x.streams >= 100_000);
    if (!pool.length) return null;
    const pickd = pick(pool, seed);
    const song = pickd.title;
    const fee = r50((1500 + w.playerFame * 120) * Math.max(0.8, Math.min(2, costIndex(w.country))));
    return {
      kind: 'movie_sync', title: 'A film wants your song', data: { fee, song, songId: pickd.id },
      body: `A film studio wants "${song}" for a big scene in their new movie. They're offering $${fee.toLocaleString()}.`,
      options: [opt('yes', `Take $${fee.toLocaleString()}`), opt('more', 'Ask for double'), opt('no', 'Not for sale')],
      expiresSerial: w.serial + 4,
    };
  },
  resolve: (m, o, _w, roll) => {
    const fee = Number(m.data?.fee ?? 2000);
    const lift: MomentEffect[] = m.data?.songId ? [{ k: 'revival', songId: String(m.data.songId), power: 0.45, width: 18, reason: 'Synced in a film' }] : [];
    if (o === 'yes') return { text: `"${m.data?.song}" plays over the movie's biggest scene. New people are finding it.`, effects: [{ k: 'money', v: fee }, { k: 'fans', v: 400 }, { k: 'momentum', v: 2 }, ...lift] };
    if (o === 'more') return roll < 0.45 ? { text: 'They paid double. You\'re learning.', effects: [{ k: 'money', v: fee * 2 }, { k: 'fans', v: 400 }, { k: 'stat', stat: 'businessKnowledge', v: 1 }, ...lift] } : { text: 'They went with someone else\'s song.', effects: [] };
    return { text: 'Your music, your rules.', effects: [] };
  },
};

const scamPromoter: Template = {
  id: 'scam_promoter', channel: 'life', weight: 0.7,
  build: (w, seed) => {
    if (w.playerFame < 15) return null;
    const city = pick(['Dubai', 'London', 'Toronto', 'Johannesburg'], seed);
    return {
      kind: 'scam_promoter', title: `A ${city} show — $25,000`, data: { city },
      body: `A promoter wants you in ${city} next month: $25,000, flights and hotel. They just need a $3,000 "booking deposit" to lock the date.`,
      options: [opt('pay', 'Pay the deposit', undefined, 3000), opt('contract', 'Ask for a contract and references'), opt('no', 'Too good to be true')],
      expiresSerial: w.serial + 3,
    };
  },
  resolve: (m, o, w, roll) => {
    if (o === 'pay') {
      const host = w.promoters[0];
      return roll < 0.8 || !host
        ? { text: `The number is disconnected. There is no ${m.data?.city} show. $3,000 gone.`, effects: [{ k: 'money', v: -3000 }, { k: 'stat', stat: 'businessKnowledge', v: 1 }] }
        : { text: `It was real! ${m.data?.city}, four weeks from now — $25,000 on the night, the deposit comes back with it. It's in your diary.`, effects: [{ k: 'money', v: -3000 }, { k: 'gig', npcId: host.id, fee: 28000, atMinute: (w.serial + 28) * 1440 + 21 * 60, place: `${m.data?.city}` }, { k: 'momentum', v: 1 }] };
    }
    if (o === 'contract') return w.hasLawyer || roll < 0.6 ? { text: 'The "references" didn\'t exist. You dodged a scam.', effects: [{ k: 'stat', stat: 'businessKnowledge', v: 1 }] } : { text: 'They sent a convincing contract. You still didn\'t pay. Probably wise.', effects: [] };
    return { text: 'You ignored it. Two weeks later another artist posted that they got scammed by the same people.', effects: [{ k: 'stat', stat: 'businessKnowledge', v: 0.5 }] };
  },
};

const viralMoment: Template = {
  id: 'viral_wedding', channel: 'life', weight: 0.7,
  build: (w, seed) => {
    const where = viralPlace(w.country, seed);
    const views = w.playerFame >= 50 ? 'Five million views' : w.playerFame >= 25 ? 'Two million views' : w.playerFame >= 10 ? 'Four hundred thousand views' : 'Eighty thousand views — huge for you';
    return {
      kind: 'viral_wedding', title: 'You\'re going viral', data: { where },
      body: `A video of you ${where} is everywhere. ${views} and climbing.`,
      options: [opt('lean', 'Lean in — post your own version', undefined, 0, 5), opt('ignore', 'Let it ride')],
      expiresSerial: w.serial + 2,
    };
  },
  resolve: (_m, o, w) => {
    if (o === 'lean') return { text: 'Your version did even bigger numbers. People like this side of you.', effects: [{ k: 'energy', v: -5 }, { k: 'momentum', v: 4 }, { k: 'fans', v: Math.round(300 + w.playerFame * 40) }] };
    return { text: 'It ran its course. A nice bump.', effects: [{ k: 'momentum', v: 1 }, { k: 'fans', v: 150 }] };
  },
};

const breakIn: Template = {
  id: 'break_in', channel: 'life', weight: 0.5,
  build: (w) => {
    // Gates, guards and cameras are what the big houses pay for.
    if (w.money < 40000 || w.homeTier === 'villa' || w.homeTier === 'mansion') return null;
    return {
      kind: 'break_in', title: 'Someone broke into your place',
      body: 'You came home to a broken window. A laptop, some jewellery and cash are gone.',
      options: [opt('security', 'Install proper security — $4,000', 'Cameras, guard, the works', 4000), opt('police', 'File a police report'), opt('post', 'Post about it')],
      expiresSerial: w.serial + 1,
    };
  },
  resolve: (_m, o, _w, roll) => {
    const lost: MomentEffect = { k: 'money', v: -2500 };
    if (o === 'security') return { text: 'Cameras, a guard at night, new locks. You sleep better.', effects: [lost, { k: 'money', v: -4000 }, { k: 'energy', v: 5 }] };
    if (o === 'police') return roll < 0.25 ? { text: 'The police caught them two weeks later. Most of it came back.', effects: [{ k: 'money', v: -500 }] } : { text: 'A report number and a shrug.', effects: [lost, { k: 'energy', v: -5 }] };
    return { text: 'Fans sent love. A blog wrote about how much "you\'re worth now". Not ideal.', effects: [lost, { k: 'momentum', v: 1 }] };
  },
};

const churchInvite: Template = {
  id: 'church_invite', channel: 'life', weight: 0.6,
  build: (w) => {
    if (!CHURCHGOING.has(w.country ?? '')) return null;
    // A crusade books gospel singers, or a name the congregation knows.
    if (w.genre !== 'gospel' && w.playerFame < 15) return null;
    return {
      kind: 'church_invite', title: 'Invited to perform at a crusade',
      body: `A big church${w.city ? ` in ${w.city}` : ''} wants you at their crusade this weekend. Thousands of people, no fee — "for the Kingdom".`,
      options: [opt('go', 'Perform', 'A different crowd', 0, 12), opt('no', 'Decline politely')],
      expiresSerial: w.serial + 4,
    };
  },
  resolve: (_m, o, w) => o === 'go'
    ? { text: 'The whole place sang along. Mothers are adding you to their playlists.', effects: [{ k: 'energy', v: -12 }, { k: 'fans', v: Math.round(250 + w.playerFame * 15) }, { k: 'reputation', v: 2 }] }
    : { text: 'They prayed for you anyway.', effects: [] },
};

const carTrouble: Template = {
  id: 'car_trouble', channel: 'life', weight: 0.8,
  build: (w) => ({
    kind: 'car_trouble', title: w.ownsCar ? 'Your car broke down' : 'Your ride broke down',
    body: `${w.ownsCar ? 'Your car' : 'The car you were in'} died on the highway. Smoke from the bonnet. You have somewhere to be.`,
    // Only your own car is yours to tow and fix.
    options: [
      ...(w.ownsCar ? [opt('tow', `Tow and repair — $${r50(800 * Math.max(0.8, costIndex(w.country)))}`, undefined, r50(800 * Math.max(0.8, costIndex(w.country))))] : [opt('ride', 'Call another ride', 'A few dollars, a bit late', 15)]),
      ...(moto(w.country) ? [opt('okada', `Jump on the back of a${/^[aeiou]/.test(moto(w.country)!) ? 'n' : ''} ${moto(w.country)}`, 'Fast, dangerous, very online')] : []),
      opt('wait', w.ownsCar ? 'Wait for a mechanic' : 'Wait for the driver to fix it', 'Slow'),
    ],
    expiresSerial: w.serial + 1,
    data: { own: !!w.ownsCar, moto: moto(w.country) ?? 'bike', tow: r50(800 * Math.max(0.8, costIndex(w.country))) },
  }),
  resolve: (_m, o, w, roll) => {
    if (o === 'tow') return { text: 'Fixed. Expensive, but fixed.', effects: [{ k: 'money', v: -Number(_m.data?.tow ?? 800) }] };
    if (o === 'ride') return { text: 'Another ride came in ten minutes. You were late, not lost.', effects: [{ k: 'money', v: -15 }, { k: 'energy', v: -3 }] };
    if (o === 'okada') return roll < 0.5 && w.playerFame >= 15 ? { text: `Someone filmed you weaving through traffic on a ${_m.data?.moto ?? 'bike'}. Internet loves it.`, effects: [{ k: 'momentum', v: 2 }, { k: 'fans', v: 120 }] } : { text: 'You made it. Your heart is still racing.', effects: [{ k: 'energy', v: -5 }] };
    return _m.data?.own
      ? { text: 'Three hours by the roadside. The mechanic charged you double because he recognised you.', effects: [{ k: 'energy', v: -12 }, { k: 'money', v: -300 }] }
      : { text: 'Two hours by the roadside while the driver argued with the engine. It started, eventually.', effects: [{ k: 'energy', v: -10 }] };
  },
};

// ─── MORE OF LIFE AT THIS LEVEL ────────────────────────────────────────────

const weddingGig: Template = {
  id: 'private_event', channel: 'life', weight: 1,
  build: (w, seed) => {
    // Families pay for a name their guests will know.
    if (w.playerFame < 12 || w.releasedTitles.length === 0) return null;
    const host = w.promoters[0];
    if (!host) return null;
    const what = pick(w.country === 'Ghana' || w.country === 'Nigeria'
      ? ['a wedding reception', 'a 50th birthday party', 'an end-of-year company party', 'a big outdooring']
      : ['a wedding reception', 'a 50th birthday party', 'an end-of-year company party', 'a private launch party'], seed);
    const fee = r50(clamp((300 + w.playerFame * w.playerFame * 3) * Math.max(0.7, costIndex(w.country)), 300, 40000));
    return {
      kind: 'private_event', npcId: host.id, npcName: host.name, title: `A private booking: ${what}`,
      body: `${host.name} is planning ${what} on Saturday and the family wants you: two songs, a photo with the couple${what.includes('wedding') ? '' : ' and the host'}, $${fee.toLocaleString()} cash on the night.`,
      options: [opt('yes', `Take it — $${fee.toLocaleString()}`, 'Saturday 9 PM'), opt('more', 'Ask for more'), opt('no', 'Not my thing')],
      expiresSerial: w.serial + 3,
      data: { fee, what },
    };
  },
  resolve: (m, o, w, roll) => {
    const fee = Number(m.data?.fee ?? 500);
    const at = nextNight(w.serial, 6, 21);
    const place = String(m.data?.what ?? 'a private event');
    if (o === 'yes') return { text: `In your diary: Saturday, 9 PM — ${place}. Cash after the set.`, effects: [{ k: 'gig', npcId: m.npcId!, fee, atMinute: at, place }] };
    if (o === 'more') return roll + w.businessKnowledge / 220 > 0.6
      ? { text: `They agreed to $${r50(fee * 1.35).toLocaleString()}. Saturday, 9 PM.`, effects: [{ k: 'gig', npcId: m.npcId!, fee: r50(fee * 1.35), atMinute: at, place }] }
      : { text: 'They found somebody cheaper.', effects: [] };
    return { text: 'You passed.', effects: [] };
  },
};

const campusShow: Template = {
  id: 'campus_show', channel: 'life', weight: 0.9,
  build: (w, seed) => {
    // Students book the names on their playlists — up-and-comers, not legends.
    if (w.playerFame < 8 || w.playerFame > 55 || w.releasedTitles.length === 0) return null;
    const host = w.promoters[0];
    if (!host) return null;
    const fee = r50((150 + w.playerFame * 25) * Math.max(0.7, costIndex(w.country)));
    const week = pick(w.country === 'Ghana' ? ['SRC Week', 'Hall Week'] : w.country === 'Nigeria' ? ['Freshers\' Night', 'Faculty Week'] : ['Freshers\' Week', 'Spring Fest'], seed);
    return {
      kind: 'campus_show', npcId: host.id, npcName: host.name, title: `${week}: the students want you`,
      body: `The biggest university${w.city ? ` in ${w.city}` : ''} wants you to headline ${week} on Friday. Small fee — $${fee.toLocaleString()} — but five thousand students who will film everything.`,
      options: [opt('yes', `Do it — $${fee.toLocaleString()}`, 'Friday 10 PM'), opt('free', 'Do it free for the fans', 'Goodwill'), opt('no', 'Pass')],
      expiresSerial: w.serial + 3,
      data: { fee, week },
    };
  },
  resolve: (m, o, w) => {
    const fee = Number(m.data?.fee ?? 300);
    const at = nextNight(w.serial, 5, 22);
    const place = `${m.data?.week ?? 'Campus'} show`;
    if (o === 'yes') return { text: `Friday, 10 PM — ${place}. Students are already posting about it.`, effects: [{ k: 'gig', npcId: m.npcId!, fee, atMinute: at, place }, { k: 'fans', v: Math.round(150 + w.playerFame * 20) }] };
    if (o === 'free') return { text: `Free show, Friday 10 PM. "${w.playerName} did it for the students" is going round campus.`, effects: [{ k: 'gig', npcId: m.npcId!, fee: 0, atMinute: at, place }, { k: 'fans', v: Math.round(300 + w.playerFame * 30) }, { k: 'reputation', v: 1 }] };
    return { text: 'They booked somebody else.', effects: [] };
  },
};

const radioPayola: Template = {
  id: 'radio_payola', channel: 'life', weight: 0.8,
  build: (w, seed) => {
    const fresh = (w.released ?? []).filter((x) => x.age <= 45).sort((a, b) => a.age - b.age)[0];
    if (!fresh || !CHECKPOINTS.has(w.country ?? '')) return null;
    const dj = w.djs?.[0];
    const price = r50(clamp(200 + w.playerFame * 40, 200, 3000) * Math.max(0.7, costIndex(w.country)));
    return {
      kind: 'radio_payola', npcId: dj?.id, npcName: dj?.name ?? 'A radio DJ',
      title: `A DJ wants "appreciation" for "${fresh.title}"`,
      body: `${dj?.name ?? 'A popular radio DJ'} says "${fresh.title}" could be in heavy rotation by next week — "you know how it works, small appreciation, $${price.toLocaleString()}". ${pick(['Everybody does it.', 'Nobody will know.', 'It is how the game is played here.'], seed)}`,
      options: [opt('pay', `Pay $${price.toLocaleString()}`, 'Rotation, if they keep their word', price), opt('refuse', 'No — the song should earn it'), opt('expose', 'Post the screenshot', 'Integrity, and enemies')],
      expiresSerial: w.serial + 3,
      data: { price, songId: fresh.id, title: fresh.title },
    };
  },
  resolve: (m, o, w, roll) => {
    const price = Number(m.data?.price ?? 500);
    const songId = String(m.data?.songId ?? '');
    if (o === 'pay') return roll < 0.2
      ? { text: 'The money went. A blog got the receipts a week later: "pay-for-play".', effects: [{ k: 'money', v: -price }, { k: 'reputation', v: -5 }, { k: 'momentum', v: 1 }, { k: 'revival', songId, power: 0.2, width: 10, reason: 'Radio rotation' }] }
      : roll < 0.8
        ? { text: `"${m.data?.title}" is in rotation. You heard it twice in traffic today.`, effects: [{ k: 'money', v: -price }, { k: 'revival', songId, power: 0.3, width: 14, reason: 'Radio rotation' }, { k: 'fame', v: 0.5 }] }
        : { text: 'They took the money and played it twice. At 3am.', effects: [{ k: 'money', v: -price }] };
    if (o === 'expose') return roll + w.charisma / 200 > 0.55
      ? { text: 'The post went everywhere. Artists are thanking you; some DJs have stopped picking up.', effects: [{ k: 'reputation', v: 3 }, { k: 'momentum', v: 2 }, ...(m.npcId ? [{ k: 'rel' as const, npcId: m.npcId, v: -25 }] : [])] }
      : { text: 'People called it bitterness. The DJ\'s friends closed ranks.', effects: [{ k: 'reputation', v: -1 }, ...(m.npcId ? [{ k: 'rel' as const, npcId: m.npcId, v: -25 }] : [])] };
    return { text: 'You kept your money. The song will have to earn its spins.', effects: [{ k: 'stat', stat: 'discipline', v: 0.5 }] };
  },
};

const producerPoints: Template = {
  id: 'producer_points', channel: 'dm', weight: 0.9,
  build: (w) => {
    const hit = (w.released ?? []).filter((x) => x.streams >= 300_000 && x.producerId && !isRealId(x.producerId)).sort((a, b) => b.streams - a.streams)[0];
    if (!hit) return null;
    const bonus = r50(clamp(hit.streams * 0.002, 500, 60000));
    return {
      kind: 'producer_points', npcId: hit.producerId, npcName: hit.producerName ?? 'Your producer',
      title: `${hit.producerName ?? 'Your producer'} wants their share of "${hit.title}"`,
      body: `"${hit.title}" is at ${Math.round(hit.streams / 1000).toLocaleString()}K streams and it's my beat. I want a bonus — $${bonus.toLocaleString()} — or at least my name all over the credits. Fair is fair.`,
      options: [opt('bonus', `Pay the $${bonus.toLocaleString()} bonus`, 'Keeps them close', bonus), opt('credit', 'Credit them loudly — no money'), opt('no', 'The beat was paid for')],
      expiresSerial: w.serial + 4,
      data: { bonus, title: hit.title },
    };
  },
  resolve: (m, o, _w, roll) => {
    const id = m.npcId!;
    const bonus = Number(m.data?.bonus ?? 500);
    if (o === 'bonus') return { text: `${m.npcName} is telling everybody you're the realest artist they work with. Their next beats will be for you first.`, effects: [{ k: 'money', v: -bonus }, { k: 'rel', npcId: id, v: 18 }] };
    if (o === 'credit') return { text: `You posted "${m.data?.title}" with their name front and centre. It's not money, but they felt it.`, effects: [{ k: 'rel', npcId: id, v: 6 }, { k: 'reputation', v: 1 }] };
    return roll < 0.35
      ? { text: `${m.npcName} went on a podcast and told the story their way. "Artists forget who made them."`, effects: [{ k: 'rel', npcId: id, v: -18 }, { k: 'reputation', v: -2 }] }
      : { text: `"Business is business." They didn't like it, but they know the deal was the deal.`, effects: [{ k: 'rel', npcId: id, v: -10 }] };
  },
};

const leaseClash: Template = {
  id: 'lease_clash', channel: 'team', weight: 0.9,
  build: (w, seed) => {
    const song = (w.released ?? []).filter((x) => x.lease && x.streams >= 40_000)[0];
    if (!song) return null;
    const who = crewOf(w, 'producer', 'engineer')?.npcName ?? w.manager?.name ?? 'A friend';
    const price = r50(clamp(song.streams * 0.01, 800, 25000));
    return {
      kind: 'lease_clash', npcName: who, title: `Somebody else dropped a song on your beat`,
      body: `${who}: "You leased the beat for "${song.title}" — and ${pick(['an artist in another city', 'a TikTok rapper with a million followers', 'a gospel singer, somehow'], seed)} just put out a song on the same one. People are comparing. The producer will sell you the exclusive for $${price.toLocaleString()} so it can't happen again."`,
      options: [opt('buy', `Buy the exclusive — $${price.toLocaleString()}`, 'Nobody else can use it now', price), opt('joke', 'Post "same beat, different levels" 😂'), opt('ignore', 'Ignore it')],
      expiresSerial: w.serial + 4,
      data: { price, songId: song.id },
    };
  },
  resolve: (m, o, w, roll) => {
    const price = Number(m.data?.price ?? 1000);
    if (o === 'buy') return { text: 'The exclusive is yours. The other version comes down from the platforms by the end of the week.', effects: [{ k: 'money', v: -price }, { k: 'momentum', v: 1 }] };
    if (o === 'joke') return roll + w.charisma / 200 > 0.6
      ? { text: 'The internet decided yours is the better version. Both songs went up — yours more.', effects: [{ k: 'momentum', v: 3 }, { k: 'revival', songId: String(m.data?.songId ?? ''), power: 0.25, width: 10, reason: 'Same-beat battle' }] }
      : { text: 'The comments decided theirs is better. Ouch.', effects: [{ k: 'momentum', v: -2 }, { k: 'reputation', v: -1 }] };
    return { text: 'Two songs on one beat. It happens with leases.', effects: [{ k: 'momentum', v: -1 }] };
  },
};

const fanCover: Template = {
  id: 'fan_cover', channel: 'life', weight: 0.8,
  build: (w, seed) => {
    const song = (w.released ?? []).filter((x) => x.quality >= 55 && x.streams >= 10_000)[hashString(seed) % Math.max(1, (w.released ?? []).length)] ?? (w.released ?? []).find((x) => x.quality >= 55 && x.streams >= 10_000);
    if (!song) return null;
    const who = pick(['A 14-year-old with a guitar', 'A church choir', 'A street performer', 'A dancer with a huge following', 'A singer from another country'], seed);
    return {
      kind: 'fan_cover', title: `${who} covered "${song.title}"`,
      body: `${who} posted a cover of "${song.title}" and it's everywhere. People are going back to the original.`,
      options: [opt('repost', 'Repost it with love'), opt('duet', 'Do a duet video', 'A few hours', 0, 8), opt('ignore', 'Let it ride')],
      expiresSerial: w.serial + 3,
      data: { songId: song.id },
    };
  },
  resolve: (m, o, w) => {
    const songId = String(m.data?.songId ?? '');
    if (o === 'duet') return { text: 'Your duet did bigger numbers than the cover. Everybody wins.', effects: [{ k: 'energy', v: -8 }, { k: 'revival', songId, power: 0.45, width: 14, reason: 'A fan cover went viral' }, { k: 'momentum', v: 3 }, { k: 'fans', v: Math.round(200 + w.playerFame * 25) }] };
    if (o === 'repost') return { text: 'You shared it. The cover-artist cried on live. The song is moving again.', effects: [{ k: 'revival', songId, power: 0.3, width: 12, reason: 'A fan cover went viral' }, { k: 'momentum', v: 2 }, { k: 'fans', v: Math.round(100 + w.playerFame * 12) }] };
    return { text: 'It ran its course. The original got a nice little bump.', effects: [{ k: 'revival', songId, power: 0.15, width: 10, reason: 'A fan cover' }] };
  },
};

export const TEMPLATES: Template[] = [
  studioInvite, partyInvite, dissBait, dissTrack, moneyAsk, repay, collabIdea, blogTip, fanDM, cashGig, beatOffer, bringOut, openerAsk,
  brandDeal, badPress, burnout, leakThreat, crewRaise, teamFeud, stylistDesigner,
  featureLate, featureSwap, featureLead, featureBreach,
  familyMoney, policeStop, phoneStolen, hacked, fanMob, oldFriend, charity, awardPresenter, healthScare, dumsor, movieSync, scamPromoter, viralMoment, breakIn, churchInvite, carTrouble,
  weddingGig, campusShow, radioPayola, producerPoints, leaseClash, fanCover,
  cypherInvite, birthdayPlan, npcBirthday, remixAsk, verseBreach,
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

/** Follow-ups have fixed option sets; they are built here from the data the first moment left. */
export function buildFollowUp(template: string, data: Record<string, unknown>, serial: number): Omit<Moment, 'id' | 'createdSerial' | 'status'> | null {
  const npcId = String(data.npcId ?? '');
  const npcName = String(data.npcName ?? 'Someone');
  if (template === 'diss_track') {
    return {
      kind: 'diss_track', npcId, npcName, channel: 'dm',
      title: `${npcName} dropped a diss track about you`,
      body: `It's called "${pick(['Paper Crown', 'Ghostwriter', 'Who Are You', 'Small Room', 'Rented Fame'], npcId + serial)}". Three minutes about you. Everybody is waiting for your response.`,
      options: [opt('respond', 'Answer with a diss of your own'), opt('laugh', 'Post "lol" and move on'), opt('silent', 'Stay silent')],
      expiresSerial: serial + 4,
      data,
    };
  }
  if (template === 'repay') {
    return {
      kind: 'repay', npcId, npcName, channel: 'dm',
      title: `${npcName} about that money…`,
      body: data.honest ? 'Got your money. Sending it now, plus a little extra for waiting 🙏' : 'Bro I know I said this month. Things got crazy. Next month for sure, I swear.',
      options: data.honest ? [opt('ok', 'Appreciate you')] : [opt('ok', 'It\'s cool, whenever'), opt('chase', 'I need it now')],
      expiresSerial: serial + 5,
      data,
    };
  }
  return null;
}

/** Pick a fresh moment for this channel from the world as it is. */
export function rollMoment(channel: Moment['channel'], w: MomentWorld, recentKinds: string[], seed: string, roll: number): Omit<Moment, 'id' | 'createdSerial' | 'status'> | null {
  const pool = TEMPLATES.filter((t) => t.channel === channel && t.weight > 0 && !recentKinds.includes(t.id));
  if (!pool.length) return null;
  const total = pool.reduce((a, t) => a + t.weight, 0);
  let x = roll * total;
  let first = pool[pool.length - 1];
  for (const t of pool) { x -= t.weight; if (x <= 0) { first = t; break; } }
  // The weighted pick first; if the world cannot support it today, anything that can.
  const rest = pool.filter((t) => t !== first).sort((a, b) => (hashString(seed + a.id) % 97) - (hashString(seed + b.id) % 97));
  for (const t of [first, ...rest]) {
    const built = t.build(w, `${seed}|${t.id}`);
    if (built) return { ...built, channel: t.channel };
  }
  return null;
}

export function resolveMoment(m: Moment, optionId: string, w: MomentWorld, roll: number): Resolution {
  const t = BY_ID.get(m.kind);
  if (!t) return { text: 'Nothing came of it.', effects: [] };
  return t.resolve(m, optionId, w, roll);
}

/** What happens if you never answer. */
export function expireMoment(m: Moment, w?: MomentWorld, roll = 0.5): Resolution {
  // A broken deal you ignore is a deal you refused.
  if (m.kind === 'feature_breach' && w) return featureBreach.resolve(m, m.data?.how === 'public' ? 'ignore' : 'refuse', w, roll);
  if (m.kind === 'npc_birthday' && w) return npcBirthday.resolve(m, 'skip', w, roll);
  if (m.kind === 'birthday_plan' && w) return birthdayPlan.resolve(m, 'normal', w, roll);
  if (m.channel === 'dm' && m.npcId) return { text: `You never answered ${m.npcName}.`, effects: [{ k: 'rel', npcId: m.npcId, v: m.kind === 'fan_dm' ? 0 : -3 }] };
  if (m.kind === 'crew_raise' && m.data?.crewId) return { text: `${m.npcName} took your silence as a no.`, effects: [{ k: 'morale', crewId: String(m.data.crewId), v: -15 }] };
  if (m.kind === 'bad_press') return { text: 'Nobody decided anything. The story ran.', effects: [{ k: 'reputation', v: -4 }, { k: 'momentum', v: 1 }] };
  return { text: 'The moment passed.', effects: [] };
}

export function traitsHint(npc: NPC | undefined): string {
  if (!npc) return '';
  const t = traitsOf(npc);
  const bits: string[] = [];
  if (t.petty) bits.push('holds grudges');
  if (t.loyal) bits.push('loyal');
  if (t.diva) bits.push('ego');
  if (t.generous) bits.push('generous');
  if (t.hustler) bits.push('hustler');
  if (t.shark) bits.push('sharp');
  return bits.join(' · ');
}

// ─── INTERVIEWS ────────────────────────────────────────────────────────────
//
// Stations, shows, podcasts and blogs invite you — more when you are hot,
// different ones for different reasons. Every sit-down is a format (selling a
// record, the gossip hot seat, your life story, a live freestyle, business
// talk, the debate chair) and every question is built from YOUR world: the
// song you just dropped, the artist you are beefing with, the friends you
// might name, the star you might compare yourself to. Something unexpected
// happens in a good share of them. Every answer moves something.
//
// Pure: no store. The caller passes the context and the random source.
//
// Real-name rule: real artists are talked ABOUT (named in a top five, compared
// to, praised) but never quoted, never "call in", never "diss you on air".

import { hashString } from './rng';

export type OutletKind = 'radio' | 'tv' | 'podcast' | 'blog' | 'magazine' | 'youtube';
export type InterviewFormat = 'promo' | 'hot_seat' | 'life_story' | 'freestyle' | 'industry' | 'debate';

export interface Outlet {
  id: string;
  name: string;
  kind: OutletKind;
  host: string;
  vibe: 'friendly' | 'messy' | 'serious' | 'street' | 'industry';
  /** People who will hear it. */
  reach: number;
  /** Fame they want before they will book you. */
  minFame: number;
  country: string;
  color: string;
  formats: InterviewFormat[];
  /** Appearance-fee multiplier. Radio rarely pays; TV does. */
  pays: number;
  international?: boolean;
}

export const FORMAT_INFO: Record<InterviewFormat, { label: string; emoji: string; blurb: string; risk: 'Low' | 'Medium' | 'High' }> = {
  promo: { label: 'Release talk', emoji: '📣', blurb: 'Sell the new music. Good answers push streams.', risk: 'Low' },
  hot_seat: { label: 'The hot seat', emoji: '🔥', blurb: 'Gossip, beef, rumours. Big headlines — for better or worse.', risk: 'High' },
  life_story: { label: 'Life story', emoji: '🎞️', blurb: 'Where you came from, what it cost. Builds respect and loyal fans.', risk: 'Low' },
  freestyle: { label: 'Live freestyle', emoji: '🎤', blurb: 'Bars on air. Your freestyle skill decides if it goes viral or goes wrong.', risk: 'Medium' },
  industry: { label: 'Business talk', emoji: '💼', blurb: 'Labels, money, ownership. The industry is listening.', risk: 'Medium' },
  debate: { label: 'The debate chair', emoji: '🗣️', blurb: 'Top fives, GOAT talk, who is overrated. Names get named.', risk: 'High' },
};

export const KIND_EMOJI: Record<OutletKind, string> = { radio: '📻', tv: '📺', podcast: '🎙️', blog: '📰', magazine: '📖', youtube: '▶️' };

const HOSTS = ['Nana Adwoa Fosu', 'Kojo Brenya', 'Efua Asantewaa', 'Yaw Sarpong-Hill', 'Ama Darkoa', 'Kwabena Opoku', 'Akos Tetteh', 'Rasheed Lamptey', 'Abena Kyerewaa', 'Selorm Dzidzor', 'Delali Agbeko', 'Mawuli Kpodo', 'Zainab Iddrisu', 'Kofi Bremang', 'Naa Okailey Quaye'];
const pickBy = <T,>(arr: T[], seed: string): T => arr[hashString(seed) % arr.length];

/** The media landscape: eight at home, four abroad. Same every time for a country. */
export function outletsFor(country: string, city: string): Outlet[] {
  const c = country;
  const s = (k: string) => `${c}|${k}`;
  const freq = (k: string) => `${88 + (hashString(s(k)) % 19)}.${hashString(s(k + 'f')) % 10}`;
  const home: Outlet[] = [
    { id: 'o_morning', name: `${city} Breakfast Show`, kind: 'radio', host: pickBy(HOSTS, s('m')), vibe: 'friendly', reach: 400_000, minFame: 0, country: c, color: '#F5B301', formats: ['promo', 'life_story', 'freestyle'], pays: 0 },
    { id: 'o_street', name: `Street Heat FM ${freq('st')}`, kind: 'radio', host: pickBy(HOSTS, s('st')), vibe: 'street', reach: 250_000, minFame: 0, country: c, color: '#FF5C5C', formats: ['freestyle', 'hot_seat', 'promo'], pays: 0 },
    { id: 'o_corner', name: 'The Corner Podcast', kind: 'podcast', host: pickBy(HOSTS, s('c')), vibe: 'messy', reach: 180_000, minFame: 8, country: c, color: '#7B61FF', formats: ['hot_seat', 'debate', 'life_story'], pays: 0.3 },
    { id: 'o_tea', name: 'Spill The Tea', kind: 'youtube', host: pickBy(HOSTS, s('t')), vibe: 'messy', reach: 600_000, minFame: 18, country: c, color: '#E93D82', formats: ['hot_seat', 'debate'], pays: 0.6 },
    { id: 'o_soundcheck', name: 'Soundcheck Magazine', kind: 'magazine', host: pickBy(HOSTS, s('sc')), vibe: 'serious', reach: 150_000, minFame: 15, country: c, color: '#12A594', formats: ['life_story', 'industry', 'promo'], pays: 0.4 },
    { id: 'o_tonight', name: `${c} Tonight`, kind: 'tv', host: pickBy(HOSTS, s('tv')), vibe: 'friendly', reach: 1_800_000, minFame: 30, country: c, color: '#4DA3FF', formats: ['promo', 'life_story', 'debate'], pays: 1.4 },
    { id: 'o_hotseat', name: `The Hot Seat with ${pickBy(HOSTS, s('hs'))}`, kind: 'tv', host: pickBy(HOSTS, s('hs')), vibe: 'messy', reach: 2_200_000, minFame: 40, country: c, color: '#FF8A3D', formats: ['hot_seat', 'debate', 'industry'], pays: 1.6 },
    { id: 'o_boardroom', name: 'The Boardroom', kind: 'podcast', host: pickBy(HOSTS, s('b')), vibe: 'industry', reach: 120_000, minFame: 25, country: c, color: '#9AA0AE', formats: ['industry', 'life_story'], pays: 0.5 },
  ];
  const abroad: Outlet[] = [
    { id: 'o_global', name: 'Global Sound Radio', kind: 'radio', host: 'Marcus Lane', vibe: 'friendly', reach: 3_000_000, minFame: 45, country: 'International', color: '#2ECC71', formats: ['promo', 'freestyle'], pays: 0.8, international: true },
    { id: 'o_firemic', name: 'Heat Check (London)', kind: 'youtube', host: 'Jaz T', vibe: 'street', reach: 4_500_000, minFame: 50, country: 'International', color: '#FF3B30', formats: ['freestyle'], pays: 0.5, international: true },
    { id: 'o_bigcouch', name: 'The Big Couch (New York)', kind: 'podcast', host: 'Ray & Dre', vibe: 'messy', reach: 6_000_000, minFame: 60, country: 'International', color: '#FFD60A', formats: ['hot_seat', 'debate', 'industry'], pays: 1.2, international: true },
    { id: 'o_latenight', name: 'Late Night Live', kind: 'tv', host: 'Sam Oyelaran', vibe: 'friendly', reach: 9_000_000, minFame: 72, country: 'International', color: '#5E5CE6', formats: ['promo', 'life_story'], pays: 3, international: true },
  ];
  return [...home, ...abroad];
}

// ─── CONTEXT ───────────────────────────────────────────────────────────────

export interface Person { id: string; name: string; real?: boolean; fame?: number }

export interface IvContext {
  name: string;
  city: string;
  country: string;
  genre: string;
  fame: number;
  reputation: number;
  momentum: number;
  charisma: number;
  freestyle: number;
  lyricism: number;
  performance: number;
  latestSong?: { id: string; title: string; quality: number; producer?: Person; hasVideo: boolean; chartPos?: number };
  unreleased?: string;
  rival?: Person & { heat: number };
  friends: Person[];
  /** The biggest names at home — GOAT talk, top fives. */
  stars: Person[];
  /** Peers about your level who are not your friends — the "overrated" bait. */
  peers: Person[];
  producerFriend?: Person;
  label?: string;
  ownLabel?: string;
  manager?: string;
  money: number;
  hasAlbum: boolean;
}

// ─── EFFECTS ───────────────────────────────────────────────────────────────

export interface IvEffect {
  fame?: number;
  rep?: number;
  momentum?: number;
  fans?: number;
  money?: number;
  /** A push for the latest song's streams (0-1). */
  song?: number;
  heat?: { npcId: string; v: number };
  rel?: { npcId: string; v: number }[];
  beefStart?: { npcId: string; name: string };
  /** Chance the moment goes viral. */
  viral?: number;
  outlet?: number;
  /** A line for the write-up. */
  quote?: string;
}

export type Stat = 'charisma' | 'freestyle' | 'lyricism' | 'performance';

export interface IvOption {
  id: string;
  text: string;
  tag: 'Safe' | 'Bold' | 'Funny' | 'Honest' | 'Savage' | 'Humble' | 'Walk out' | 'Deflect' | 'Hype';
  effect: IvEffect;
  reaction: string;
  check?: { stat: Stat; dc: number; win: IvEffect; lose: IvEffect; winText: string; loseText: string };
  ends?: boolean;
}

export interface IvQuestion {
  id: string;
  host: string;
  /** A banner for the unexpected. */
  surprise?: string;
  options: IvOption[];
}

type Rng = () => number;
type Builder = (c: IvContext, r: Rng) => IvQuestion | null;
const pick = <T,>(arr: T[], r: Rng): T => arr[Math.floor(r() * arr.length)];
const opt = (id: string, text: string, tag: IvOption['tag'], effect: IvEffect, reaction: string, extra: Partial<IvOption> = {}): IvOption => ({ id, text, tag, effect, reaction, ...extra });

// ─── OPENERS ───────────────────────────────────────────────────────────────

const OPENERS: Builder[] = [
  (c) => ({
    id: 'open_city', host: `Welcome to the show! ${c.name} in the building. How's ${c.city} treating you right now?`,
    options: [
      opt('humble', `Blessed, man. ${c.city} raised me — everything I do is for them.`, 'Humble', { rep: 1, fans: 300 }, 'The studio claps. Hometown love always lands.'),
      opt('hype', `${c.city} is MINE right now. Ask anybody.`, 'Hype', { fame: 0.8, rep: -0.3, momentum: 1 }, 'The host laughs. "Okay, okay, confidence!"'),
      opt('joke', `Traffic is treating me badly. Everything else? Good.`, 'Funny', {}, '', { check: { stat: 'charisma', dc: 45, win: { fame: 0.6, momentum: 1 }, lose: { rep: -0.2 }, winText: 'Everybody in the room laughs. Good start.', loseText: 'A polite chuckle. Moving on.' } }),
    ],
  }),
  () => ({
    id: 'open_year', host: `It's been a crazy run for you. If you had to describe this year in one word?`,
    options: [
      opt('grind', 'Grind. No days off.', 'Safe', { rep: 0.5 }, 'The host nods. "Respect."'),
      opt('chosen', 'Chosen.', 'Bold', { fame: 0.6, rep: -0.3 }, 'Somebody behind the glass whoops. The host raises an eyebrow.'),
      opt('loading', 'Loading… the best is coming.', 'Hype', { momentum: 2 }, '"Ooh, so there\'s more coming?" The comments light up.'),
    ],
  }),
  (c) => c.fame < 20 ? ({
    id: 'open_new', host: `A lot of people listening don't know you yet. Introduce yourself — who is ${c.name}?`,
    options: [
      opt('story', `Just a kid from ${c.city} who refused to quit. Remember the name.`, 'Honest', { fans: 500, rep: 0.6 }, 'Simple. People like simple.'),
      opt('bars', 'Let me answer with bars instead…', 'Bold', {}, '', { check: { stat: 'freestyle', dc: 40, win: { fame: 1.2, fans: 900, viral: 0.15 }, lose: { rep: -0.5 }, winText: 'Four clean bars. The host slaps the desk.', loseText: 'You stumble on the second line. Awkward silence.' } }),
      opt('mystery', "Stick around and you'll find out.", 'Deflect', { rep: -0.2 }, 'The host blinks. "Okay then…"'),
    ],
  }) : null,
];

// ─── PER FORMAT ────────────────────────────────────────────────────────────

const PROMO: Builder[] = [
  (c) => c.latestSong ? ({
    id: 'p_story', host: `Let's talk "${c.latestSong.title}". What's the story behind it?`,
    options: [
      opt('real', 'Real story — I wrote it on the worst night of my year. You can hear it.', 'Honest', { rep: 1, song: 0.35, fans: 400 }, 'The host goes quiet for a second. "Wow."'),
      opt('hit', "Honestly? I knew it was a hit the second the beat dropped. Song of the year.", 'Hype', { fame: 0.8, song: c.latestSong.quality >= 65 ? 0.4 : 0.15, rep: c.latestSong.quality >= 65 ? 0 : -1.2 }, c.latestSong.quality >= 65 ? 'The host agrees — the record is doing numbers.' : 'The host smiles politely. The comments are less kind.'),
      opt('tease', "That's just the warm-up. Wait till you hear what's next.", 'Hype', { momentum: 2, song: 0.15 }, '"So there\'s MORE?" The host wants a date. You smile.'),
    ],
  }) : null,
  (c) => c.latestSong?.producer ? ({
    id: 'p_producer', host: `That beat on "${c.latestSong.title}" is crazy. Who made it?`,
    options: [
      opt('credit', `${c.latestSong.producer.name}. Genius. Give them their flowers.`, 'Humble', { rep: 1, rel: [{ npcId: c.latestSong.producer.id, v: 6 }] }, `The host shouts out ${c.latestSong.producer.name}. They'll hear about this.`),
      opt('me', "We cooked it together, but the vision was all me.", 'Bold', { fame: 0.3, rel: [{ npcId: c.latestSong.producer.id, v: -6 }] }, 'Hmm. Producers notice when they get written out.'),
    ],
  }) : null,
  (c) => c.latestSong ? ({
    id: 'p_video', host: c.latestSong.hasVideo ? `The video for "${c.latestSong.title}" — whose idea was that concept?` : `Is there a video coming for "${c.latestSong.title}"?`,
    options: c.latestSong.hasVideo ? [
      opt('mine', 'All me. I storyboarded every scene.', 'Bold', { fame: 0.5, song: 0.2 }, '"Director too? Okay!"'),
      opt('team', 'The director, the team — I just showed up and did my thing.', 'Humble', { rep: 0.8, song: 0.15 }, 'The host likes that.'),
    ] : [
      opt('soon', 'Shooting next week. It\'s going to be crazy.', 'Hype', { momentum: 2, song: 0.15 }, 'Fans in the comments are already asking for the date.'),
      opt('music', 'The song is the video. Close your eyes.', 'Deflect', { rep: 0.2 }, 'The host laughs. "Deep."'),
    ],
  }) : null,
  (c) => ({
    id: 'p_album', host: c.hasAlbum ? `How's the album doing — are you happy with it?` : `Everybody's asking — when is the album?`,
    options: c.hasAlbum ? [
      opt('proud', 'Proudest thing I ever made. Go listen front to back.', 'Honest', { song: 0.25, rep: 0.6 }, 'The host recommends a deep cut on air.'),
      opt('next', "Already working on the next one.", 'Hype', { momentum: 2 }, 'Workaholic energy.'),
    ] : [
      opt('date', 'This year. Mark it. I\'m not playing.', 'Bold', { momentum: 3, fame: 0.4 }, 'A promise on air. Fans will hold you to it.'),
      opt('ready', 'When it\'s ready. I won\'t rush art.', 'Safe', { rep: 0.8 }, 'Respectable answer.'),
      opt('tracklist', 'I can tell you one feature… nah, I can\'t.', 'Funny', { momentum: 1.5 }, 'The host begs. You don\'t budge. The comments go wild guessing.'),
    ],
  }),
  (c) => c.unreleased ? ({
    id: 'p_snippet', host: `Play us something unreleased. Just ten seconds. Please!`,
    options: [
      opt('play', `Alright… this one's called "${c.unreleased}". Ten seconds only.`, 'Bold', { momentum: 2.5, viral: 0.25 }, 'The studio loses it. Phones out everywhere.'),
      opt('protect', "Nah, I protect my music. You'll hear it when it's done.", 'Safe', { rep: 0.6 }, 'The host groans. Fair enough.'),
    ],
  }) : null,
];

const HOT: Builder[] = [
  (c) => c.rival && !c.rival.real ? ({
    id: 'h_rival', host: `I have to ask. ${c.rival.name} has been coming at you. What's really going on?`,
    options: [
      opt('noise', "I don't respond to noise. I respond with plaques.", 'Safe', { heat: { npcId: c.rival.id, v: -5 }, rep: 1 }, '"Cold." The host loves it.'),
      opt('numbers', "Check the numbers. That's my answer.", 'Bold', { heat: { npcId: c.rival.id, v: 8 }, fame: 1, momentum: 2 }, 'The clip will be on Clip within the hour.'),
      opt('nuclear', `${c.rival.name} is finished. Next record ends it.`, 'Savage', { heat: { npcId: c.rival.id, v: 16 }, fame: 2, rep: -2, momentum: 3, viral: 0.3 }, 'The host covers their mouth. "You heard it here first!"'),
      opt('peace', "Honestly? I've got love for them. Let's squash it.", 'Humble', { heat: { npcId: c.rival.id, v: -20 }, rel: [{ npcId: c.rival.id, v: 10 }], rep: 1.5 }, 'Mature. The blogs will call it growth.'),
    ],
  }) : null,
  (c) => c.rival?.real ? ({
    id: 'h_compare', host: `The fans keep putting you next to ${c.rival.name}. Who's winning right now?`,
    options: [
      opt('respect', `${c.rival.name} paved the way. I'm just getting started.`, 'Humble', { rep: 1.5, rel: [{ npcId: c.rival.id, v: 4 }] }, 'Classy.'),
      opt('me', "Me. And it's not close.", 'Savage', { fame: 1.5, rep: -1.5, heat: { npcId: c.rival.id, v: 8 }, viral: 0.2 }, 'Gasps. That clip is going to travel.'),
    ],
  }) : null,
  (c, r) => c.peers.length ? (() => {
    const p = pick(c.peers, r);
    return {
      id: 'h_overrated', host: `Most overrated artist in ${c.country} right now. Go.`,
      options: [
        opt('name', `${p.name}. Sorry, not sorry.`, 'Savage', { fame: 1.5, rel: [{ npcId: p.id, v: -14 }], rep: -1, heat: { npcId: p.id, v: 10 }, beefStart: !p.real ? { npcId: p.id, name: p.name } : undefined, viral: 0.25 }, `The room explodes. ${p.name} WILL hear about this.`),
        opt('none', 'Nobody. Everybody eating is good for the culture.', 'Safe', { rep: 1 }, 'The host rolls their eyes. "Boring!" But respect.'),
        opt('self', 'Me, apparently — according to the comments.', 'Funny', {}, '', { check: { stat: 'charisma', dc: 50, win: { fame: 1, rep: 0.8 }, lose: { rep: -0.2 }, winText: 'Self-roast lands perfectly. That clip is cute.', loseText: 'Nobody is sure if you were joking.' } }),
      ],
    };
  })() : null,
  () => ({
    id: 'h_dating', host: `Word is you've been seen around with somebody famous… is it serious?`,
    options: [
      opt('private', 'My private life stays private.', 'Safe', { rep: 1 }, 'The host pushes. You hold. Respect.'),
      opt('maybe', 'Maybe… 👀', 'Bold', { fame: 1, momentum: 2, viral: 0.15 }, 'The internet will spend the week investigating.'),
      opt('fake', "Fake news. I'm married to the music.", 'Funny', { momentum: 0.5 }, 'Groans in the room. Classic line.'),
    ],
  }),
  () => ({
    id: 'h_tweet', host: 'I found an old post of yours from years ago… want me to read it out?',
    options: [
      opt('sorry', "Please don't — I was a kid. I've grown.", 'Humble', { rep: 1 }, 'The host reads it anyway. People appreciate the growth.'),
      opt('read', 'Read it. I stand on everything.', 'Bold', { fame: 0.8, rep: -1 }, 'Yikes. The quote is not aging well.'),
    ],
  }),
  (c, r) => c.stars.length ? (() => {
    const s = pick(c.stars, r);
    return {
      id: 'h_better', host: `Be honest. Are you better than ${s.name}?`,
      options: [
        opt('notyet', 'Not yet. Give me two years.', 'Honest', { rep: 1, fame: 0.6 }, 'Ambitious and honest. Good answer.'),
        opt('yes', 'Yes. Next question.', 'Savage', { fame: 1.8, rep: -2, rel: [{ npcId: s.id, v: -6 }], viral: 0.25 }, `The studio is shook. ${s.name}'s fans are already typing.`),
        opt('goat', `${s.name} is the GOAT. I'm just a student.`, 'Humble', { rep: 1, rel: [{ npcId: s.id, v: 5 }] }, 'Big respect. It might get back to them.'),
      ],
    };
  })() : null,
];

const LIFE: Builder[] = [
  (c) => ({
    id: 'l_childhood', host: `Take us back. What was it like growing up in ${c.city}?`,
    options: [
      opt('struggle', "Hard. Some nights we didn't eat. Music was the only way out.", 'Honest', { rep: 2, fans: 900 }, 'The room is silent. Then applause.'),
      opt('good', 'Honestly, we were okay. I just loved music too much to do anything else.', 'Honest', { rep: 1 }, 'Refreshingly honest.'),
      opt('emotional', 'Let me tell you about my mum…', 'Honest', {}, '', { check: { stat: 'charisma', dc: 45, win: { rep: 2.5, fans: 1500, viral: 0.3 }, lose: { rep: 0.5 }, winText: 'Your voice breaks. The host hands you a tissue. Millions will watch this.', loseText: 'It comes out a bit rehearsed, but it still means something.' } }),
    ],
  }),
  () => ({
    id: 'l_quit', host: 'Have you ever thought about quitting music?',
    options: [
      opt('yes', 'More than once. I\'m glad I didn\'t.', 'Honest', { rep: 1.5, fans: 600 }, 'The comments fill with "we need you".'),
      opt('never', 'Never. Quitting isn\'t in me.', 'Bold', { fame: 0.6 }, 'Strong.'),
    ],
  }),
  () => ({
    id: 'l_hate', host: 'How do you deal with the hate online?',
    options: [
      opt('ignore', "I don't read comments. Protect your peace.", 'Safe', { rep: 1 }, 'Wise.'),
      opt('hurts', 'Honestly? It hurts sometimes. We\'re human.', 'Honest', { rep: 2, momentum: 1 }, 'Vulnerable. People connect with this.'),
      opt('clap', 'I clap back. Every time.', 'Savage', { fame: 0.8, rep: -1 }, 'The host laughs nervously.'),
    ],
  }),
  () => ({
    id: 'l_money', host: 'First big cheque — what did you buy?',
    options: [
      opt('mum', 'Moved my mum out the hood. First thing.', 'Humble', { rep: 2.5, fans: 700 }, 'Everybody loves that answer. Everybody.'),
      opt('chain', 'A chain. I had to. Look at it.', 'Funny', { fame: 0.5, rep: -0.3 }, 'The camera zooms in on the chain.'),
      opt('invest', 'Invested it. Bought land. Generational.', 'Safe', { rep: 1.5 }, 'Business brain. The older listeners approve.'),
    ],
  }),
  () => ({
    id: 'l_mental', host: 'People don\'t talk about mental health in this industry. Are you okay?',
    options: [
      opt('open', 'Not always. I\'ve started talking to someone. It helps.', 'Honest', { rep: 3, fans: 1200 }, 'The host thanks you for saying it. This one matters.'),
      opt('fine', "I'm good, I'm good. Blessed.", 'Deflect', {}, 'The host lets it go.'),
    ],
  }),
  (c) => ({
    id: 'l_family', host: `What does your family think of ${c.name} the artist?`,
    options: [
      opt('proud', 'They\'re my biggest fans now. Weren\'t at first!', 'Honest', { rep: 1, fans: 400 }, 'Sweet story.'),
      opt('worried', 'My mum still wants me to get a "real job".', 'Funny', {}, '', { check: { stat: 'charisma', dc: 35, win: { fame: 0.6, fans: 500 }, lose: {}, winText: 'Big laugh. Relatable.', loseText: 'A mild laugh.' } }),
    ],
  }),
];

const FREESTYLE: Builder[] = [
  () => ({
    id: 'f_top', host: 'Alright — the beat\'s on. Sixteen bars, live. The city is listening.',
    options: [
      opt('dome', 'Go off the dome.', 'Bold', {}, '', { check: { stat: 'freestyle', dc: 52, win: { fame: 2.5, momentum: 4, viral: 0.5, fans: 2000 }, lose: { rep: -1.5, momentum: -2 }, winText: 'You black out. Pure fire. The host is jumping. This is going everywhere.', loseText: 'You lose the pocket halfway. The silence after is loud.' } }),
      opt('written', 'Spit a written verse.', 'Safe', {}, '', { check: { stat: 'lyricism', dc: 45, win: { fame: 1.2, momentum: 2 }, lose: { rep: -0.5 }, winText: 'Polished, sharp. Solid moment.', loseText: 'It\'s good, but the host clocks it as written.' } }),
      opt('pass', 'I\'m not warmed up today. Next time.', 'Deflect', { rep: -0.6, outlet: -3 }, 'The host is visibly disappointed.'),
    ],
  }),
  () => ({
    id: 'f_switch', host: 'Switch! Drill beat — let\'s see you adapt!',
    options: [
      opt('go', 'Let\'s go.', 'Bold', {}, '', { check: { stat: 'freestyle', dc: 62, win: { fame: 2, momentum: 3, viral: 0.35 }, lose: { rep: -1 }, winText: 'You switch flows like it\'s nothing. Respect from the purists.', loseText: 'It\'s not your lane. You make it through. Barely.' } }),
      opt('own', 'Put my type of beat back on.', 'Safe', { rep: -0.2 }, 'The DJ obliges. Fine, if a bit safe.'),
    ],
  }),
  (c) => ({
    id: 'f_city', host: `Give ${c.city} a shout-out in one bar.`,
    options: [
      opt('bar', `"${c.city} on my back, I carry it like a chain"`, 'Hype', { fans: 600 }, '', { check: { stat: 'charisma', dc: 30, win: { fans: 800, fame: 0.5 }, lose: {}, winText: 'Hometown loves it.', loseText: 'Cute.' } }),
    ],
  }),
];

const INDUSTRY: Builder[] = [
  (c) => ({
    id: 'i_signed', host: c.ownLabel ? `You run your own label now — ${c.ownLabel}. Why go that route?` : c.label ? `You're signed to ${c.label}. Do you regret it?` : 'Independent or signed — what\'s the move right now?',
    options: [
      opt('own', 'Own your masters. Own your future. That\'s it.', 'Bold', { rep: 1.5 }, 'The industry crowd claps.'),
      opt('team', 'The right team matters more than the contract.', 'Safe', { rep: 0.8 }, 'Diplomatic.'),
      opt('money', 'Whoever writes the biggest cheque, honestly.', 'Funny', { fame: 0.4, rep: -0.6 }, 'Honest! The host laughs.'),
    ],
  }),
  (c) => c.producerFriend ? ({
    id: 'i_producer', host: `Best producer in ${c.country} right now?`,
    options: [
      opt('friend', `${c.producerFriend.name}. Underrated. Mark my words.`, 'Humble', { rep: 0.5, rel: [{ npcId: c.producerFriend.id, v: 8 }] }, `A big co-sign for ${c.producerFriend.name}.`),
      opt('me', 'Me, when I\'m in the mood.', 'Funny', { fame: 0.3 }, 'Laughs.'),
    ],
  }) : null,
  () => ({
    id: 'i_pay', host: 'Real talk — how much do you charge for a show now?',
    options: [
      opt('reveal', 'Enough that promoters have to plan for me.', 'Bold', { fame: 0.5 }, 'Smooth.'),
      opt('number', 'I\'ll say the number. Transparency helps the young ones.', 'Honest', { rep: 1.5 }, 'The young artists listening appreciate it.'),
      opt('private', 'That\'s between me and my manager.', 'Safe', {}, 'Fair.'),
    ],
  }),
  () => ({
    id: 'i_streaming', host: 'Are streaming platforms paying artists fairly?',
    options: [
      opt('no', 'No. And somebody has to say it.', 'Bold', { rep: 1.2, fame: 0.4 }, 'This will get shared by every artist you know.'),
      opt('play', 'It\'s a numbers game. Play it smart.', 'Safe', { rep: 0.5 }, 'Pragmatic.'),
    ],
  }),
  (c) => c.manager ? ({
    id: 'i_manager', host: `How important has ${c.manager} been to your career?`,
    options: [
      opt('credit', `Everything. ${c.manager} saw it before anyone.`, 'Humble', { rep: 0.8 }, 'Loyalty. People notice.'),
      opt('me', 'Managers manage. I make the music.', 'Bold', { fame: 0.3, rep: -0.5 }, 'Hmm. Your manager is listening.'),
    ],
  }) : null,
];

const DEBATE: Builder[] = [
  (c, r) => c.stars.length >= 3 ? (() => {
    const top = [...c.stars].sort(() => r() - 0.5).slice(0, 3);
    const friend = c.friends[0];
    const snub = c.stars[c.stars.length - 1];
    return {
      id: 'd_top5', host: `Top five artists in ${c.country} right now. Go!`,
      options: [
        opt('stars', `${top.map((x) => x.name).join(', ')}… and me.`, 'Bold', { fame: 0.8, rel: top.map((x) => ({ npcId: x.id, v: 3 })) }, 'A solid list. Everyone named will hear about it.'),
        opt('self', `Me, me, me, me — and ${top[0].name}.`, 'Savage', { fame: 1.5, rep: -1.5, rel: [{ npcId: top[0].id, v: 2 }, ...top.slice(1).map((x) => ({ npcId: x.id, v: -3 }))], viral: 0.2 }, 'Iconic or arrogant? The internet is split.'),
        ...(friend ? [opt('friend', `${friend.name} has to be in there. ${top[0].name}, ${top[1].name}… and I'll leave ${snub.name} out.`, 'Bold', { rel: [{ npcId: friend.id, v: 8 }, { npcId: snub.id, v: -8 }], fame: 1, viral: 0.15 }, `${friend.name} will love you. ${snub.name}'s fans won't.`)] : []),
      ],
    };
  })() : null,
  (c, r) => c.stars.length ? (() => {
    const s = pick(c.stars, r);
    return {
      id: 'd_goat', host: `Who is the GOAT of ${c.country} music?`,
      options: [
        opt('star', `${s.name}. It\'s not a debate.`, 'Safe', { rel: [{ npcId: s.id, v: 4 }], rep: 0.5 }, 'Respectful choice.'),
        opt('me', 'Ask me again in five years.', 'Bold', { fame: 1, momentum: 1 }, '"Ohhh!" The host loves the confidence.'),
      ],
    };
  })() : null,
  () => ({
    id: 'd_genre', host: 'Is rap dead in this country — has everyone moved to afrobeats and amapiano?',
    options: [
      opt('alive', 'Rap is alive. It\'s just underground right now.', 'Bold', { rep: 1, fans: 400 }, 'The rap heads in the comments go crazy.'),
      opt('evolve', 'Music evolves. I make what I feel.', 'Safe', { rep: 0.5 }, 'Diplomatic.'),
    ],
  }),
];

// ─── SURPRISES ─────────────────────────────────────────────────────────────

const SURPRISES: Builder[] = [
  (c) => c.rival && !c.rival.real ? ({
    id: 's_diss', surprise: '🔴 LIVE — the host just pressed play on something', host: `This just came in. It's ${c.rival.name}'s new freestyle… and it's about you. Your reaction, live?`,
    options: [
      opt('laugh', 'Laugh. Out loud.', 'Funny', {}, '', { check: { stat: 'charisma', dc: 48, win: { fame: 1.5, heat: { npcId: c.rival.id, v: 6 }, viral: 0.35 }, lose: { rep: -0.5, heat: { npcId: c.rival.id, v: 4 } }, winText: 'You laugh so hard the host joins in. Devastating without a word.', loseText: 'The laugh comes out forced. People can tell it got to you.' } }),
      opt('bars', 'Run it back. I\'m replying right now.', 'Savage', {}, '', { check: { stat: 'freestyle', dc: 58, win: { fame: 3, heat: { npcId: c.rival.id, v: 12 }, viral: 0.6, momentum: 4 }, lose: { fame: -0.5, heat: { npcId: c.rival.id, v: 6 } }, winText: 'You destroy it on the spot. The studio is on its feet. This is the clip of the month.', loseText: 'You go for it and fumble. The internet scores it to them.' } }),
      opt('walk', 'I\'m not doing this. (Walk out)', 'Walk out', { fame: 1, rep: -2, outlet: -12, viral: 0.3 }, 'You take off the headphones and leave. Cameras follow you to the door.', { ends: true }),
    ],
  }) : null,
  (c) => c.rival && !c.rival.real && c.rival.heat < 60 ? ({
    id: 's_call', surprise: '📞 Surprise caller on line one', host: `We've got ${c.rival.name} on the phone. Live. Say something to each other.`,
    options: [
      opt('squash', 'Let\'s end it today. Respect.', 'Humble', { heat: { npcId: c.rival.id, v: -35 }, rel: [{ npcId: c.rival.id, v: 18 }], rep: 2, viral: 0.25 }, 'You both laugh. The host can\'t believe it. Peace, live on air.'),
      opt('argue', 'Say what you said about me, to my face.', 'Savage', { heat: { npcId: c.rival.id, v: 14 }, fame: 2, rep: -1, viral: 0.4 }, 'It gets loud. The producer cuts to an ad break.'),
      opt('hang', 'Hang up. I don\'t do calls.', 'Bold', { heat: { npcId: c.rival.id, v: 5 }, fame: 0.6 }, 'Click. Cold.'),
    ],
  }) : null,
  () => ({
    id: 's_fan', surprise: '😭 Something is happening in the audience', host: 'A fan in the front row just burst into tears seeing you. What do you do?',
    options: [
      opt('hug', 'Go over, hug them, take a picture.', 'Humble', { rep: 2, fans: 1200, viral: 0.3 }, 'The fan is shaking. The clip is pure.'),
      opt('wave', 'Wave and keep going.', 'Safe', {}, 'Fine. A little cold.'),
    ],
  }),
  (c) => c.latestSong ? ({
    id: 's_play', surprise: '🔊 The DJ cuts in', host: `The DJ just dropped "${c.latestSong.title}" — the whole studio is jumping. Perform it?`,
    options: [
      opt('perform', 'Mic up. Let\'s go.', 'Bold', {}, '', { check: { stat: 'performance', dc: 45, win: { song: 0.5, fame: 1.2, viral: 0.3 }, lose: { rep: -0.5, song: 0.1 }, winText: 'You perform it like it\'s a stadium. Everyone sings the hook.', loseText: 'Out of breath by the second verse. Still fun.' } }),
      opt('vibe', 'Just vibe with them.', 'Safe', { song: 0.2 }, 'Good energy.'),
    ],
  }) : null,
  (c) => c.unreleased ? ({
    id: 's_leak', surprise: '🚨 Leak', host: `Somebody sent us a snippet of an unreleased song of yours — "${c.unreleased}". We're playing it!`,
    options: [
      opt('angry', 'That\'s not finished! Who sent that?', 'Bold', { rep: -0.8, momentum: 1 }, 'The host apologises. The snippet is already everywhere.'),
      opt('date', 'Since it\'s out — dropping it next Friday!', 'Hype', { momentum: 4, viral: 0.25 }, 'Turning a leak into a rollout. Smart.'),
    ],
  }) : null,
  (c, r) => c.friends.length ? (() => {
    const f = pick(c.friends.filter((x) => !x.real).length ? c.friends.filter((x) => !x.real) : c.friends, r);
    return f.real ? null : {
      id: 's_friend', surprise: '🚪 Unannounced guest', host: `${f.name} just walked into the studio! You two — anything to tell us?`,
      options: [
        opt('collab', 'We\'ve got a song coming. That\'s all I\'m saying.', 'Hype', { momentum: 3, rel: [{ npcId: f.id, v: 5 }] }, 'Scoop! The blogs will run it tonight.'),
        opt('freestyle', 'Pass the mic — back-to-back.', 'Bold', { rel: [{ npcId: f.id, v: 6 }] }, '', { check: { stat: 'freestyle', dc: 45, win: { fame: 2, viral: 0.35 }, lose: { rep: -0.3 }, winText: 'Chemistry. This is the moment of the show.', loseText: 'They outshine you a little. Still love.' } }),
      ],
    };
  })() : null,
  () => ({
    id: 's_quiz', surprise: '⏱️ Lightning round', host: 'Lightning round! Name three songs from 2010 in five seconds. GO!',
    options: [
      opt('try', 'Uhh — let me think—', 'Funny', {}, '', { check: { stat: 'charisma', dc: 40, win: { fame: 0.8, fans: 500 }, lose: { fame: 0.3 }, winText: 'You nail it and do a little dance. Cute clip.', loseText: 'You name two and freeze. Everyone laughs with you.' } }),
    ],
  }),
];

const CLOSERS: Builder[] = [
  (c) => ({
    id: 'close_msg', host: 'Before you go — message to the fans?',
    options: [
      opt('thanks', 'Thank you. Every stream, every share. I see you.', 'Humble', { fans: 600, rep: 0.6 }, 'Wholesome close.'),
      opt('drop', c.latestSong ? `Go stream "${c.latestSong.title}" right now. Right now!` : 'Big things coming. Stay locked.', 'Hype', { song: c.latestSong ? 0.25 : 0, momentum: 1.5 }, 'A clean plug.'),
      opt('shot', 'And to my haters — thank you for the motivation.', 'Savage', { fame: 0.6, rep: -0.4 }, 'Classic.'),
    ],
  }),
];

const BY_FORMAT: Record<InterviewFormat, Builder[]> = { promo: PROMO, hot_seat: HOT, life_story: LIFE, freestyle: FREESTYLE, industry: INDUSTRY, debate: DEBATE };
const MIX: Record<InterviewFormat, InterviewFormat[]> = {
  promo: ['promo', 'promo', 'life_story', 'industry'],
  hot_seat: ['hot_seat', 'hot_seat', 'debate', 'life_story'],
  life_story: ['life_story', 'life_story', 'promo'],
  freestyle: ['freestyle', 'freestyle', 'promo', 'hot_seat'],
  industry: ['industry', 'industry', 'debate', 'life_story'],
  debate: ['debate', 'debate', 'hot_seat', 'industry'],
};

/** Build one sit-down: an opener, four or five questions from the format's mix, maybe a surprise, a closer. */
export function buildInterview(format: InterviewFormat, ctx: IvContext, r: Rng): IvQuestion[] {
  const out: IvQuestion[] = [];
  const used = new Set<string>();
  const add = (b: Builder) => {
    const q = b(ctx, r);
    if (q && !used.has(q.id)) { used.add(q.id); out.push(q); return true; }
    return false;
  };
  const shuffled = <T,>(a: T[]) => [...a].sort(() => r() - 0.5);
  for (const b of shuffled(OPENERS)) if (add(b)) break;
  const body = 3 + (r() < 0.5 ? 1 : 0);
  let guard = 0;
  while (out.length < 1 + body && guard++ < 30) {
    const f = pick(MIX[format], r);
    for (const b of shuffled(BY_FORMAT[f])) if (add(b)) break;
  }
  // Something unexpected, in about half of them — more on the messy shows.
  if (r() < (format === 'hot_seat' || format === 'debate' || format === 'freestyle' ? 0.6 : 0.4)) {
    for (const b of shuffled(SURPRISES)) {
      const q = b(ctx, r);
      if (q && !used.has(q.id)) { out.splice(1 + Math.floor(r() * (out.length - 1)) + 1, 0, q); used.add(q.id); break; }
    }
  }
  add(CLOSERS[0]);
  return out;
}

/** What an answer does, after the dice where there are dice. */
export function resolveAnswer(o: IvOption, stats: Record<Stat, number>, r: Rng): { effect: IvEffect; text: string; passed?: boolean } {
  if (!o.check) return { effect: o.effect, text: o.reaction };
  const score = stats[o.check.stat] + (r() - 0.5) * 40;
  const passed = score >= o.check.dc;
  const extra = passed ? o.check.win : o.check.lose;
  return { effect: mergeEffects([o.effect, extra]), text: passed ? o.check.winText : o.check.loseText, passed };
}

export function mergeEffects(list: IvEffect[]): IvEffect {
  const t: IvEffect = { rel: [] };
  const heat = new Map<string, number>();
  for (const e of list) {
    for (const k of ['fame', 'rep', 'momentum', 'fans', 'money', 'song', 'outlet'] as const) if (e[k]) t[k] = (t[k] ?? 0) + (e[k] as number);
    if (e.viral) t.viral = 1 - (1 - (t.viral ?? 0)) * (1 - e.viral);
    if (e.heat) heat.set(e.heat.npcId, (heat.get(e.heat.npcId) ?? 0) + e.heat.v);
    if (e.rel) t.rel!.push(...e.rel);
    if (e.beefStart) t.beefStart = e.beefStart;
  }
  const [h] = [...heat.entries()];
  if (h) t.heat = { npcId: h[0], v: h[1] };
  return t;
}

/** How the sit-down reads in the press. */
export function headlineFor(name: string, outlet: Outlet, total: IvEffect, walked: boolean, viral: boolean, top?: string): string {
  if (walked) return `${name} walks out of ${outlet.name}`;
  if (total.beefStart) return `${name} goes at ${total.beefStart.name} on ${outlet.name}`;
  if (viral && top) return `${name}'s ${top} on ${outlet.name} is everywhere`;
  if ((total.rep ?? 0) >= 4) return `${name} opens up like never before on ${outlet.name}`;
  if ((total.fame ?? 0) >= 4) return `${name} steals the show on ${outlet.name}`;
  if ((total.rep ?? 0) <= -3) return `${name}'s ${outlet.name} interview raises eyebrows`;
  if ((total.song ?? 0) >= 0.8) return `${name} talks new music on ${outlet.name}`;
  return `${name} sits down with ${outlet.host} on ${outlet.name}`;
}

/** Why an outlet wants you now, and in what format. */
export function pickInvite(outlets: Outlet[], ctx: IvContext & { hasRecentRelease: boolean; hotBeef: boolean }, outletRel: Record<string, number>, r: Rng): { outlet: Outlet; format: InterviewFormat; reason: string; fee: number } | null {
  const able = outlets.filter((o) => o.minFame <= ctx.fame + 5 && (outletRel[o.id] ?? 0) > -25);
  if (!able.length) return null;
  const outlet = able[Math.floor(Math.pow(r(), 0.8) * able.length)];
  let format: InterviewFormat;
  let reason: string;
  if (ctx.hotBeef && ctx.rival && outlet.formats.includes('hot_seat')) { format = 'hot_seat'; reason = `Everyone's talking about you and ${ctx.rival.name}. ${outlet.host} wants your side.`; }
  else if (ctx.hasRecentRelease && ctx.latestSong && outlet.formats.includes('promo')) { format = 'promo'; reason = `"${ctx.latestSong.title}" is moving. ${outlet.host} wants you on to talk about it.`; }
  else {
    format = pick(outlet.formats, r);
    reason = format === 'freestyle' ? `${outlet.name} wants you in the booth for a live freestyle.`
      : format === 'life_story' ? `${outlet.host} wants the real story — where you came from.`
      : format === 'industry' ? `${outlet.name} is doing a series on the business side. You came up.`
      : format === 'debate' ? `${outlet.host} wants you in the debate chair. Names will be named.`
      : format === 'hot_seat' ? `${outlet.host} has questions. Spicy ones.`
      : `${outlet.host} wants you on the show.`;
  }
  const fee = Math.round((outlet.pays * (60 + Math.pow(Math.max(1, ctx.fame), 1.6) * 6)) / 10) * 10;
  return { outlet, format, reason, fee };
}

/** Will an outlet take your pitch? */
export function pitchAccepted(outlet: Outlet, fame: number, rel: number, r: Rng): boolean {
  const lean = 0.55 + (fame - outlet.minFame) / 40 + rel / 80;
  return r() < Math.max(0.05, Math.min(0.95, lean));
}

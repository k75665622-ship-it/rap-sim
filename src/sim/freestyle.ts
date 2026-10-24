// ─── THE CYPHER ────────────────────────────────────────────────────────────
//
// "Cypher at the spot Friday, five MCs, we're filming it." A freestyle is not
// a button. You turn up, the beat drops, and three times you have to decide
// what to do with sixteen bars: go off the dome, spit something you wrote,
// switch flows on the beat, work the crowd, or aim at somebody in the circle.
//
// What happens is your skill against the room. Freestyle, flow, delivery,
// lyricism, charisma — the move you pick decides which of them it leans on,
// the beat and the room decide what they reward (a street cypher can smell a
// written verse; a 150 bpm beat eats people who can't keep up), and the roll
// decides whether tonight is your night. Doing it is how you get better at it.
//
// The bars are generated from original lines — nothing here borrows anyone
// else's lyrics. The other MCs are always people from the generated scene.
//
// Pure: the store spends the energy and applies the effects.

import type { ArtistStats, MomentEffect, NPC } from '../types/game';
import { hashString } from './rng';

export type CypherVibe = 'street' | 'radio' | 'battle' | 'studio';
export type CypherMove = 'dome' | 'written' | 'flow' | 'crowd' | 'callout';

export interface CypherMC { name: string; id?: string; level: number }

export interface CypherSpec {
  host: string;
  hostId: string;
  vibe: CypherVibe;
  bpm: number;
  /** How good the room is, 0-100. Beat it and they remember your name. */
  level: number;
  mcs: CypherMC[];
  /** Filmed and posted — a great round travels, and so does a bad one. */
  live: boolean;
  city: string;
}

export interface CypherRound {
  move: CypherMove;
  score: number;
  /** How the room moved: +18 for fire, −12 for a fumble. */
  crowd: number;
  tier: 'fire' | 'solid' | 'mid' | 'fumble';
  text: string;
  bars: string[];
  /** Who you aimed at, for a call-out. */
  target?: string;
  targetId?: string;
}

export const ROUNDS = 3;

export const VIBE_LABEL: Record<CypherVibe, string> = {
  street: 'Street cypher',
  radio: 'Radio cypher',
  battle: 'Battle circle',
  studio: 'Studio cypher',
};

export const MOVES: Record<CypherMove, { label: string; emoji: string; hint: string; stats: Partial<Record<keyof ArtistStats, number>>; risk: number; energy: number }> = {
  dome: { label: 'Go off the dome', emoji: '🧠', hint: 'Pure freestyle — the biggest swing', stats: { freestyle: 0.6, flow: 0.2, creativity: 0.2 }, risk: 22, energy: 6 },
  written: { label: 'Spit a written', emoji: '📝', hint: 'Safe — but purists can tell', stats: { lyricism: 0.5, delivery: 0.3, songwriting: 0.2 }, risk: 8, energy: 4 },
  flow: { label: 'Switch flows', emoji: '🌊', hint: 'Ride the beat — fast beats reward it', stats: { flow: 0.6, delivery: 0.25, vocalAbility: 0.15 }, risk: 14, energy: 5 },
  crowd: { label: 'Work the crowd', emoji: '🙌🏾', hint: 'Call and response, pure energy', stats: { charisma: 0.5, stagePresence: 0.3, performance: 0.2 }, risk: 12, energy: 5 },
  callout: { label: 'Call somebody out', emoji: '🎯', hint: 'Bars at another MC — respect, or a beef', stats: { freestyle: 0.4, charisma: 0.3, lyricism: 0.3 }, risk: 26, energy: 6 },
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pick = <T,>(a: T[], seed: string): T => a[hashString(seed) % a.length];

/** Who is in the circle, how good it is, what the beat is. */
export function cypherSpecFor(i: { host: NPC; city: string; playerFame: number; pool: NPC[]; seed: string; vibe?: CypherVibe }): CypherSpec {
  const r = (k: string) => (hashString(`${i.seed}|${k}`) % 1000) / 1000;
  const vibe: CypherVibe = i.vibe ?? (i.host.role === 'radio_owner' || i.host.role === 'media' ? 'radio' : i.host.role === 'dj' ? (r('v') < 0.5 ? 'street' : 'battle') : r('v') < 0.25 ? 'battle' : r('v') < 0.45 ? 'studio' : 'street');
  const mcs = i.pool.filter((n) => n.id !== i.host.id && n.role === 'artist').slice(0, 2 + Math.floor(r('n') * 3)).map((n) => ({ name: n.name, id: n.id, level: clamp(Math.round(35 + n.fame * 0.5 + (r(n.id) - 0.5) * 20), 20, 95) }));
  const level = clamp(Math.round((mcs.reduce((a, m) => a + m.level, 0) / Math.max(1, mcs.length)) * 0.8 + i.playerFame * 0.15 + (vibe === 'battle' ? 6 : 0)), 25, 90);
  const bpm = vibe === 'battle' ? 88 + Math.floor(r('b') * 20) : [72, 86, 92, 98, 140, 148, 150][Math.floor(r('b') * 7)];
  return { host: i.host.name, hostId: i.host.id, vibe, bpm, level, mcs, live: r('l') < (vibe === 'studio' ? 0.4 : 0.8), city: i.city };
}

/** How one round goes. `roll` 0-1. */
export function roundScore(i: { stats: ArtistStats; move: CypherMove; spec: CypherSpec; prev: CypherMove[]; energy: number; roll: number }): number {
  const m = MOVES[i.move];
  let base = 0;
  let w = 0;
  for (const [k, v] of Object.entries(m.stats)) { base += (i.stats[k as keyof ArtistStats] ?? 0) * (v ?? 0); w += v ?? 0; }
  base = base / Math.max(0.01, w);
  const fast = i.spec.bpm >= 135 ? 1 : i.spec.bpm <= 85 ? -1 : 0;
  // The beat.
  if (i.move === 'flow') base += fast * 6;
  if (i.move === 'dome' && fast > 0) base -= 3;
  // The room.
  if (i.move === 'written' && (i.spec.vibe === 'street' || i.spec.vibe === 'battle')) base -= 7;
  if (i.move === 'written' && i.spec.vibe === 'radio') base += 3;
  if (i.move === 'callout' && i.spec.vibe === 'battle') base += 6;
  if (i.move === 'callout' && i.spec.vibe === 'radio') base -= 4;
  if (i.move === 'crowd' && i.spec.vibe === 'studio') base -= 6;
  // Doing the same thing again is predictable.
  base -= 6 * i.prev.filter((x) => x === i.move).length;
  // Tired legs, tired mind.
  if (i.energy < 30) base -= (30 - i.energy) * 0.4;
  return clamp(Math.round(base + (i.roll - 0.5) * 2 * m.risk), 0, 100);
}

export function tierOf(score: number, level: number): CypherRound['tier'] {
  if (score >= level + 15) return 'fire';
  if (score >= level) return 'solid';
  if (score >= level - 15) return 'mid';
  return 'fumble';
}

const CROWD: Record<CypherRound['tier'], number> = { fire: 18, solid: 8, mid: 0, fumble: -12 };

// ── The bars. Original lines; {city}, {me} and {target} are filled in. ─────
const BARS: Record<CypherMove, { good: [string, string][]; bad: string[] }> = {
  dome: {
    good: [
      ['I ain\'t write nothing down, this is coming off the top', '{city} on my back and I don\'t know how to stop'],
      ['Mind moving faster than the hi-hat on this beat', 'I was born in the cold, now I\'m bringing the heat'],
      ['No pen, no pad, it\'s just me and the moment', 'they rehearse what they say — I just speak and I own it'],
      ['Off the dome, every word that I\'m saying is new', 'tell \'em check the replay, \'cause they won\'t think it\'s true'],
      ['Look at the room, I can see who\'s scared', 'I don\'t need to prepare when I\'m always prepared'],
    ],
    bad: ['"I\'m the… yeah, I\'m the one from the…" — the beat keeps going without you.', '"Coming off the top, yeah, the top of the… top." Somebody in the back laughs.', '"Yeah, uh, {city}, we in {city}…" — you lose the pocket.', '"They be talking, I be… walking…" The DJ looks at you.'],
  },
  written: {
    good: [
      ['Wrote this in the dark when the light bill was due', 'now the lights are on me and the bill\'s on you'],
      ['Every verse is a brick, every hook is a door', 'I built a house out of words that the city ignored'],
      ['Pen bleeding ink like it\'s paying me rent', 'every word that I wrote, every bar that I meant'],
      ['They said it\'s a phase, so I showed them the page', 'ten years of notebooks and they\'re all on this stage'],
    ],
    bad: ['Clean verse — then somebody shouts "that\'s WRITTEN!" and the circle groans.', 'You recite it like homework. The room checks their phones.', 'You skip a line you wrote last week and have to start the bar again.'],
  },
  flow: {
    good: [
      ['Double-time, now slow it down, now watch me switch it back', 'triple-stack the syllables and ride it like a track'],
      ['Quick, quick, slow — now I\'m floating on the snare', 'every pocket that you missed, I been living in there'],
      ['Switch the cadence like a gear on a hill', 'every bar is a turn and the turn is a thrill'],
      ['Half-time, then I triple it up on the kick', 'they was counting my bars and they lost it this quick'],
    ],
    bad: ['You rush the switch and land a beat behind.', 'The double-time comes out as mumbling.', 'You find a pocket, lose it, find it again. Nobody\'s nodding.'],
  },
  crowd: {
    good: [
      ['When I say {city}, you say mine — {city}!', 'when I say who\'s next, you say {me} — one time!'],
      ['Hands up if you came here to hear something real', 'hands down if you\'re scared — yeah, I know how you feel'],
      ['Make some noise for the ones who were here from the start', 'make some noise for the ones who just heard it — the art'],
    ],
    bad: ['You ask for noise and get three people.', 'The call-and-response dies on "response".', 'You hype the room. The room does not want to be hyped.'],
  },
  callout: {
    good: [
      ['{target}, I respect the hustle, not the pen', 'you been rapping ten years and you\'re still where you been'],
      ['{target} talking big, but the numbers are small', 'I\'m the reason your mentions were busy at all'],
      ['{target}, step up, I ain\'t here to be nice', 'you got bars on a budget — I\'m paying full price'],
    ],
    bad: ['You aim at {target} — and {target} bodies you right back.', '{target} laughs. The whole circle laughs with them.', 'You go at {target} with a bar they\'ve heard before. Somebody finishes it for you.'],
  },
};

const REACT: Record<CypherRound['tier'], string[]> = {
  fire: ['The circle explodes. Somebody runs it back on their phone.', 'Whole room on their feet. The DJ cuts the beat and brings it back.', 'Gasps, then noise. That\'s the clip.'],
  solid: ['Nods all round. A couple of "ayy"s.', 'Good round — the room\'s with you.', 'Solid. People are paying attention now.'],
  mid: ['Polite nods. It was fine.', 'Not bad, not a moment.', 'The room waits for the next one.'],
  fumble: ['Silence, then somebody coughs.', 'You hear one "ooh" — and not the good kind.', 'The circle moves on before you\'re done.'],
};

/** Play a round. */
export function playRound(i: { stats: ArtistStats; move: CypherMove; spec: CypherSpec; prev: CypherRound[]; energy: number; roll: number; me: string; seed: string }): CypherRound {
  const score = roundScore({ stats: i.stats, move: i.move, spec: i.spec, prev: i.prev.map((r) => r.move), energy: i.energy, roll: i.roll });
  const tier = tierOf(score, i.spec.level);
  const target = i.move === 'callout' ? i.spec.mcs[hashString(`${i.seed}|t`) % Math.max(1, i.spec.mcs.length)] : undefined;
  const fill = (s: string) => s.replace(/\{city\}/g, i.spec.city).replace(/\{me\}/g, i.me).replace(/\{target\}/g, target?.name.split(' ')[0] ?? 'you');
  const bank = BARS[i.move];
  const good = tier === 'fire' || tier === 'solid';
  const bars = good ? pick(bank.good, `${i.seed}|bars`).map(fill) : [];
  const text = good ? pick(REACT[tier], `${i.seed}|r`) : `${fill(pick(bank.bad, `${i.seed}|bad`))} ${tier === 'fumble' ? pick(REACT.fumble, `${i.seed}|r`) : ''}`.trim();
  return { move: i.move, score, crowd: CROWD[tier], tier, text, bars, target: target?.name, targetId: target?.id };
}

export type CypherVerdict = 'legendary' | 'hard' | 'solid' | 'shaky' | 'bodied';

/** The night, added up: what the room remembers and what you learnt. */
export function finishCypher(i: { spec: CypherSpec; rounds: CypherRound[]; playerFame: number; me: string; stats: ArtistStats; seed: string }): { verdict: CypherVerdict; text: string; npcLine: string; effects: MomentEffect[]; gains: Partial<Record<keyof ArtistStats, number>> } {
  const { spec, rounds } = i;
  const avg = rounds.reduce((a, r) => a + r.score, 0) / Math.max(1, rounds.length);
  const crowd = rounds.reduce((a, r) => a + r.crowd, 0);
  const d = avg - spec.level;
  const verdict: CypherVerdict = d >= 14 || crowd >= 45 ? 'legendary' : d >= 5 || crowd >= 22 ? 'hard' : d >= -5 ? 'solid' : d >= -15 ? 'shaky' : 'bodied';
  const effects: MomentEffect[] = [];
  const fans = (n: number) => Math.round(n + i.playerFame * n / 20);
  // Practice: every round taught you something, more when it went well.
  const gains: Partial<Record<keyof ArtistStats, number>> = {};
  for (const r of rounds) {
    const m = MOVES[r.move];
    const lift = r.tier === 'fire' ? 1.3 : r.tier === 'solid' ? 1.1 : r.tier === 'mid' ? 1 : 0.85;
    for (const [k, v] of Object.entries(m.stats)) {
      const key = k as keyof ArtistStats;
      const now = i.stats[key] ?? 0;
      // The better you are, the slower it comes.
      const g = 0.45 * (v ?? 0) * lift * Math.max(0.25, 1 - now / 120);
      gains[key] = Math.round(((gains[key] ?? 0) + g) * 100) / 100;
    }
  }
  for (const [k, v] of Object.entries(gains)) if (v) effects.push({ k: 'stat', stat: k as keyof ArtistStats, v });
  const host = spec.hostId;
  let text: string;
  let npcLine: string;
  if (verdict === 'legendary') {
    effects.push({ k: 'momentum', v: spec.live ? 7 : 4 }, { k: 'fans', v: fans(spec.live ? 420 : 160) }, { k: 'fame', v: spec.live ? 0.9 : 0.4 }, { k: 'rel', npcId: host, v: 9 });
    text = `You bodied the ${VIBE_LABEL[spec.vibe].toLowerCase()}.${spec.live ? ' The clip is everywhere by morning.' : ' Everybody in that room is going to tell somebody.'}`;
    npcLine = pick(['BRO. That was the best round I\'ve seen this year 🔥🔥', 'You don\'t understand what you just did. Watch the clip', 'I\'m posting that tonight. You\'re crazy 😭'], i.seed);
  } else if (verdict === 'hard') {
    effects.push({ k: 'momentum', v: spec.live ? 4 : 2 }, { k: 'fans', v: fans(spec.live ? 180 : 70) }, { k: 'fame', v: 0.3 }, { k: 'rel', npcId: host, v: 6 });
    text = `Strong night. You held your own against ${spec.mcs.length} MCs${spec.live ? ' and the clip is doing numbers' : ''}.`;
    npcLine = pick(['You came to work tonight 💯', 'Good look. Come back next month', 'People were asking who you are after'], i.seed);
  } else if (verdict === 'solid') {
    effects.push({ k: 'momentum', v: 1 }, { k: 'rel', npcId: host, v: 3 });
    text = 'You did your part. Not the clip of the night, but nobody forgot you were there.';
    npcLine = pick(['Respect for pulling up 🤝🏾', 'Solid. Next time go harder', 'Good energy tonight'], i.seed);
  } else if (verdict === 'shaky') {
    effects.push({ k: 'reputation', v: -0.5 }, { k: 'rel', npcId: host, v: 1 });
    text = 'Shaky. A couple of good bars, too many gaps. You learnt more than you showed.';
    npcLine = pick(['Not your night. It happens', 'Keep practising, you\'ve got something', 'Next one'], i.seed);
  } else {
    effects.push({ k: 'reputation', v: -1.5 }, { k: 'momentum', v: spec.live ? -2 : 0 }, { k: 'rel', npcId: host, v: 0 });
    text = `You got bodied.${spec.live ? ' And it was filmed — the clip of you losing the pocket is going round.' : ' At least nobody filmed it.'}`;
    npcLine = pick(['Rough one 😬 we go again', 'Don\'t watch the clip. Just practise', 'Everybody gets bodied once'], i.seed);
  }
  // The call-outs: respect when it landed, a problem when it didn't.
  for (const r of rounds) {
    if (r.move !== 'callout' || !r.targetId) continue;
    if (r.tier === 'fire') effects.push({ k: 'rel', npcId: r.targetId, v: -8 }, { k: 'heat', npcId: r.targetId, v: 8, win: true });
    else if (r.tier === 'fumble') effects.push({ k: 'rel', npcId: r.targetId, v: -3 }, { k: 'reputation', v: -0.5 });
    else effects.push({ k: 'rel', npcId: r.targetId, v: -4 });
  }
  // Everyone in the circle remembers a good night.
  if (verdict === 'legendary' || verdict === 'hard') for (const m of spec.mcs) if (m.id && !rounds.some((r) => r.targetId === m.id)) effects.push({ k: 'rel', npcId: m.id, v: verdict === 'legendary' ? 4 : 2 });
  if (spec.live && (verdict === 'legendary' || verdict === 'bodied')) {
    effects.push({ k: 'post', authorId: 'fan:cypher', authorName: '@cypherclips', content: verdict === 'legendary' ? `${i.me} at the ${spec.city} cypher last night 😳🔥 run it back` : `${i.me} lost the pocket at the ${spec.city} cypher 😭`, likes: Math.round((verdict === 'legendary' ? 1800 : 900) + i.playerFame * 120) });
  }
  return { verdict, text, npcLine, effects, gains };
}

export const VERDICT_LABEL: Record<CypherVerdict, string> = {
  legendary: '🔥 Legendary',
  hard: '💪🏾 Went hard',
  solid: '👍🏾 Solid',
  shaky: '😬 Shaky',
  bodied: '💀 Bodied',
};

// ─── BEEF ─────────────────────────────────────────────────────────────────
// A beef is not a button that says "start beef". It is a ladder.
//
// Nine rungs, and each one has to be earned: a rung only opens once the beef is
// already hot enough to justify it. That is what stops the whole thing being a
// single "go nuclear" click — you cannot open an industry war on somebody you
// have only shaded once, because nobody would believe it and nothing would
// happen.
//
// Heat is the ladder's fuel. It goes up when a move lands and it bleeds away
// when nobody feeds it, which means a beef you stop tending goes quiet on its
// own rather than sitting there at maximum forever. The decay is LAZY — the
// stored figure is always "as of `heatSerial`" — for the same reason venue
// fatigue is: a beef nobody opens the app to look at must not need a tick to
// stay correct.
//
// Nothing in here is random. `settleBeef` takes the roll as an argument, so a
// test can pin an outcome instead of hoping for one.

import type { BeefResolutionKind, BeefState } from '../types/game';

// ─── The ladder ───────────────────────────────────────────────────────────

export interface BeefRung {
  /** 1-9. The order is the escalation and there is no skipping. */
  level: number;
  id: string;
  name: string;
  emoji: string;
  /** Heat this move adds when it lands. */
  heat: number;
  energy: number;
  cost: number;
  /** Fame a landed move is worth, before the score scales it. */
  fame: number;
  /** Fans a landed move is worth, before the score scales it. */
  fans: number;
  /** The heat the beef must already be at before this rung opens. */
  requiresHeat: number;
  /** The button. */
  verb: string;
  /** What it is, in one line. */
  what: string;
  /** What it costs you when it lands badly. */
  risk: string;
}

/**
 * The nine rungs.
 *
 * `requiresHeat` is the gate and it is the whole design: each rung asks for
 * more heat than the one before, and heat only comes from landing moves, so the
 * ladder is climbed rather than skipped. Reaching the ninth rung means the beef
 * has been fed for weeks.
 */
export const BEEF_RUNGS: BeefRung[] = [
  {
    level: 1,
    id: 'subliminal',
    name: 'Subliminal',
    emoji: '🤔',
    heat: 6,
    energy: 5,
    cost: 0,
    fame: 0.6,
    fans: 300,
    requiresHeat: 0,
    verb: 'Drop a subliminal',
    what: 'A bar nobody can prove is about them. Deniable, and cheap.',
    risk: 'If it lands badly it reads as paranoia and nobody picks it up.',
  },
  {
    level: 2,
    id: 'shade',
    name: 'Shade',
    emoji: '😏',
    heat: 10,
    energy: 4,
    cost: 0,
    fame: 0.9,
    fans: 600,
    requiresHeat: 6,
    verb: 'Post shade',
    what: 'A post with no name in it. Everyone knows. Nobody can quote it.',
    risk: 'A miss here is just a subtweet, and subtweets age badly.',
  },
  {
    level: 3,
    id: 'named',
    name: 'Name Them',
    emoji: '📛',
    heat: 16,
    energy: 12,
    cost: 400,
    fame: 1.8,
    fans: 1_800,
    requiresHeat: 14,
    verb: 'Say the name',
    what: 'Stop being coy. Put the name in the verse.',
    risk: 'Naming somebody commits you to it. A weak named bar is worse than no bar.',
  },
  {
    level: 4,
    id: 'diss',
    name: 'Diss Track',
    emoji: '🎯',
    heat: 24,
    energy: 20,
    cost: 2_500,
    fame: 3.4,
    fans: 5_000,
    requiresHeat: 26,
    verb: 'Cut a diss record',
    what: 'A whole record aimed at them. Studio time, a beat, a rollout.',
    risk: 'A diss record that does not land is the one everybody remembers.',
  },
  {
    level: 5,
    id: 'on_sight',
    name: 'On Sight',
    emoji: '🎤',
    heat: 26,
    energy: 18,
    cost: 3_200,
    fame: 4,
    fans: 7_500,
    requiresHeat: 38,
    verb: 'Perform it in their city',
    what: 'Take the verse to their home room and do it live.',
    risk: 'You are in their building. If the room does not ride with you, it is a long night.',
  },
  {
    level: 6,
    id: 'interview',
    name: 'Interview War',
    emoji: '🎙️',
    heat: 30,
    energy: 14,
    cost: 6_000,
    fame: 5.2,
    fans: 11_000,
    requiresHeat: 50,
    verb: 'Take it to the press',
    what: 'Radio, podcasts, the outlets. On the record, with your name on it.',
    risk: 'Talking is not rapping. The scene forgives a bad bar and does not forgive a bad interview.',
  },
  {
    level: 7,
    id: 'crew',
    name: 'Crew Wide',
    emoji: '👥',
    heat: 36,
    energy: 24,
    cost: 9_000,
    fame: 6.5,
    fans: 16_000,
    requiresHeat: 62,
    verb: 'Bring the camp in',
    what: 'It stops being the two of you. Everybody signed to you has an opinion now.',
    risk: 'A crew war is not yours to end. It outlives the record.',
  },
  {
    level: 8,
    id: 'industry',
    name: 'Industry War',
    emoji: '🏢',
    heat: 44,
    energy: 20,
    cost: 25_000,
    fame: 8.5,
    fans: 24_000,
    requiresHeat: 74,
    verb: 'Take the playlist',
    what: 'Playlists, radio spins, the rooms that decide what gets heard. Money, not bars.',
    risk: 'This is the expensive one, and a label can outspend you.',
  },
  {
    level: 9,
    id: 'legacy',
    name: 'Legacy',
    emoji: '🏛️',
    heat: 60,
    energy: 30,
    cost: 40_000,
    fame: 13,
    fans: 40_000,
    requiresHeat: 86,
    verb: 'Make it a career',
    what: 'A full campaign, the kind that ends up in the documentaries. There is no walking this back.',
    risk: 'You will be introduced as this for the rest of your career.',
  },
];

export function beefRung(level: number): BeefRung | undefined {
  return BEEF_RUNGS.find((r) => r.level === level);
}

/** The next rung up, or undefined at the top of the ladder. */
export function nextBeefRung(level: number): BeefRung | undefined {
  return beefRung(level + 1);
}

// ─── Heat ─────────────────────────────────────────────────────────────────

/**
 * Fraction of the heat that survives one day.
 *
 * A beef with no move in it loses half its heat in about three and a half
 * weeks. Fast enough that abandoning one closes it, slow enough that a normal
 * release schedule does not erase a beef you are actively working.
 */
export const HEAT_DECAY_PER_DAY = 0.972;

/**
 * The heat right now, brought up to date from `heatSerial`.
 *
 * The stored number is always "as of `heatSerial`" and this is the only correct
 * way to read it. Never compare `beef.heat` to a threshold directly.
 */
export function decayedHeat(beef: BeefState, nowSerial: number): number {
  const elapsed = Math.max(0, nowSerial - (beef.heatSerial ?? beef.startedSerial));
  if (elapsed === 0) return beef.heat;
  return beef.heat * Math.pow(HEAT_DECAY_PER_DAY, elapsed);
}

/** Write the decayed figure back. Returns the value to store. */
export function settleHeat(beef: BeefState, nowSerial: number): number {
  const now = decayedHeat(beef, nowSerial);
  return Math.max(0, Math.min(100, now));
}

export type BeefStatus = 'cold' | 'warm' | 'hot' | 'settled';

export const HEAT_WARM = 35;
export const HEAT_HOT = 70;

export function beefStatus(beef: BeefState, nowSerial: number): BeefStatus {
  if (beef.resolution) return 'settled';
  const heat = decayedHeat(beef, nowSerial);
  if (heat >= HEAT_HOT) return 'hot';
  if (heat >= HEAT_WARM) return 'warm';
  return 'cold';
}

/**
 * A beef that has gone quiet closes itself.
 *
 * This is the fizzle, and it is the only resolution that happens without
 * anybody choosing it. Below `FIZZLE_HEAT` and untouched for `FIZZLE_DAYS`, the
 * scene has moved on and the beef is over whether or not either side admits it.
 */
export const FIZZLE_HEAT = 8;
export const FIZZLE_DAYS = 30;

export function fizzleIfCold(beef: BeefState, nowSerial: number): BeefResolutionKind | null {
  if (beef.resolution) return null;
  if (decayedHeat(beef, nowSerial) > FIZZLE_HEAT) return null;
  if (nowSerial - (beef.lastMoveSerial ?? beef.startedSerial) < FIZZLE_DAYS) return null;
  return 'fizzle';
}

// ─── A move ───────────────────────────────────────────────────────────────

export interface BeefMoveInput {
  rung: BeefRung;
  /** 0-1, supplied by the caller so the outcome can be pinned in a test. */
  roll: number;
  /** The player's blended fame. */
  playerFame: number;
  npcFame: number;
  /** The beef's heat BEFORE this move, already decayed. */
  heat: number;
  /**
   * How good the record behind the move is, 0-100 — the player's best released
   * song quality. A diss track is a record, so the pen decides most of it.
   * Rungs 1 and 2 are posts rather than songs, and pass the same figure: even a
   * subtweet is written by the same person.
   */
  penQuality: number;
  /** 0-100. */
  reputation: number;
  /** 0-100. The crew's reach — how far a word from your camp actually travels. */
  crewReach?: number;
}

export interface BeefMoveResult {
  landed: boolean;
  /** 0-100. How good the move was, before the roll. */
  score: number;
  heatDelta: number;
  fameDelta: number;
  fansDelta: number;
  /** What the other side does back. */
  response: 'silent' | 'shade' | 'return' | 'escalate';
  /** Heat the other side's answer adds to the beef. */
  npcHeatDelta: number;
  /** The answer itself, when there is one. */
  npcLine?: string;
  /** The move, narrated. */
  line: string;
  /** A one-line headline for the news feed. */
  headline: string;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * How good the move is, 0-100.
 *
 * The pen outweighs every other term COMBINED, and that is the design rather
 * than a tuning accident: a beef is settled by the record, so a well-funded
 * artist with nothing to say must not be able to buy one. Money and fame do
 * count — they are the crowd's prior — but no combination of them gets past a
 * better writer. Everything except the pen adds up to 0.45.
 */
export function beefMoveScore(i: BeefMoveInput): number {
  const pen = clamp(i.penQuality, 0, 100) * 0.55;
  const rep = clamp(i.reputation, 0, 100) * 0.12;
  // A fame edge is worth something, but it saturates: being 40 fame up on
  // somebody is not twice as convincing as being 20 up.
  const edge = clamp(50 + (i.playerFame - i.npcFame) * 1.2, 0, 100) * 0.15;
  const heat = clamp(i.heat, 0, 100) * 0.09;
  const crew = clamp(i.crewReach ?? 0, 0, 100) * 0.09;
  return clamp(pen + rep + edge + heat + crew, 0, 100);
}

/**
 * The single outcome of one rung of one beef.
 *
 * Everything the store and the screen need comes from here — the heat, the fame,
 * the fans, what the other side does about it and the words for the feed — so
 * there is exactly one opinion about what a beef move does.
 */
export function settleBeef(i: BeefMoveInput): BeefMoveResult {
  const score = beefMoveScore(i);
  const landed = i.roll < score / 100;
  const rung = i.rung;

  // A landed move pays out scaled by how good it was; a miss still moves the
  // needle — badly, and the other side gets the last word.
  const quality = landed ? 0.6 + score / 250 : -0.25;
  // A miss adds NO heat. Heat is what opens the next rung, so a move nobody
  // reacted to must not be a way of climbing the ladder — otherwise the gate
  // on each rung is decoration.
  const heatDelta = landed ? rung.heat : 0;
  const fameDelta = rung.fame * quality;
  const fansDelta = Math.round(rung.fans * quality);

  // How hard they come back. A bigger name does not let things slide, and a
  // bad miss invites a full answer rather than a shrug.
  const pride = clamp((i.npcFame - i.playerFame) * 0.8 + 40, 0, 100);
  let response: BeefMoveResult['response'];
  if (!landed && pride > 60) response = 'escalate';
  else if (!landed) response = 'return';
  else if (score < 45) response = 'return';
  else if (score < 70) response = 'shade';
  else response = 'silent';

  const npcHeatDelta =
    response === 'escalate' ? rung.heat * 0.9
    : response === 'return' ? rung.heat * 0.6
    : response === 'shade' ? rung.heat * 0.25
    : 0;

  const line = landed
    ? LANDED_LINES[Math.min(rung.level, 9) - 1]
    : MISSED_LINES[Math.min(rung.level, 9) - 1];

  const npcLine =
    response === 'silent'
      ? undefined
      : response === 'shade'
        ? NPC_SHADE[Math.min(rung.level, 9) - 1]
        : response === 'return'
          ? NPC_RETURN[Math.min(rung.level, 9) - 1]
          : NPC_ESCALATE[Math.min(rung.level, 9) - 1];

  const headline = landed
    ? HEADLINES[rung.level - 1]
    : `The ${rung.name.toLowerCase()} falls flat`;

  return { landed, score, heatDelta, fameDelta, fansDelta, response, npcHeatDelta, npcLine, line, headline };
}

// Game narration, in the game's own voice. These are not quotes and are not
// attributed to anybody real — see `data/rivalries.ts` for why that matters.
const LANDED_LINES = [
  'The bar goes out with no name on it, and half the timeline spends the night arguing about who it is about.',
  'The post says nothing and everybody hears it anyway. The replies are the story.',
  'The name is in the verse. There is no walking it back now and both sides know it.',
  'The record lands. It is being quoted back at them within the hour.',
  'The room knows every word before the first chorus. You are in their city and it is your night.',
  'The interview is clipped, captioned and everywhere by morning.',
  'The camps are in it now. This stopped being a two-person argument a while ago.',
  'Playlists shift, spins get pulled, and the whole thing turns into a budget line.',
  'It is not a song any more, it is a chapter. People will be explaining this one for years.',
];

const MISSED_LINES = [
  'Nobody bites. The line sits there and the silence is louder than the bar.',
  'The post gets a handful of likes from people being polite.',
  'The name lands and so does the backlash — you have handed them the moral high ground.',
  'The record is out and the consensus is that it is not the one.',
  'You play it to their room and the room does not come with you.',
  'The interview becomes about you rather than them, which is the wrong direction.',
  'The camp answers badly and now it is your crew that looks like it started it.',
  'The money moves and nothing else does. It looks like a tantrum with a budget.',
  'You have made yourself the introduction to somebody else\u2019s story.',
];

const HEADLINES = [
  'A bar with no name on it',
  'The shade lands',
  'They got named',
  'A diss record lands',
  'Performed in their city',
  'The interview war opens',
  'The crews are in it',
  'An industry war',
  'A career-defining beef',
];

// The other side's answers, in the game's own voice. Three intensities, because
// how hard somebody comes back is the difference between a beef that runs and a
// beef that ends — and it is the whole content of the `response` field.
const NPC_SHADE = [
  'A post goes up with no name in it and one very specific detail.',
  'A story goes up that is obviously about you and mentions nobody.',
  'A like lands on the wrong post at the wrong hour.',
  'A caption on a photo that is otherwise unrelated.',
  'A clip of an old interview is reposted without comment.',
  'A one-word reply to somebody else\u2019s question about you.',
  'A producer they work with posts a screenshot.',
  'A playlist quietly loses your record.',
  'A documentary clip resurfaces with a timestamp on it.',
];

const NPC_RETURN = [
  'The bar comes back with a name on it.',
  'A whole post, aimed squarely, no pretending otherwise.',
  'A verse goes out and it is clearly the answer.',
  'A record lands within the week and everybody knows what it is.',
  'They do the same thing back, in your city, on your night.',
  'An interview goes out and they do not dodge the question.',
  'Their camp answers in a group statement.',
  'The same money moves back in the other direction.',
  'A full campaign launches with your name in the first line.',
];

const NPC_ESCALATE = [
  'They do not let it slide. It goes straight to the top of their set.',
  'They take it further than you did and the timeline notices.',
  'They answer twice in one week, and the second one is worse.',
  'They go on a record with somebody bigger than both of you.',
  'They turn up in your city and say it on stage.',
  'They take it to the press and make it the whole interview.',
  'Their entire roster is suddenly posting.',
  'They outspend you on it and do it in public.',
  'They make it the thesis of the next album.',
];

// ─── Resolutions ──────────────────────────────────────────────────────────

export interface BeefResolveInput {
  /** Already-decayed heat. */
  heat: number;
  wins: number;
  losses: number;
  /** -100..100. */
  relationship: number;
  npcFame: number;
  playerFame: number;
}

export const RESOLUTION_LABEL: Record<BeefResolutionKind, string> = {
  truce: 'Called it even',
  concession: 'They conceded',
  ko: 'Knockout',
  fizzle: 'It fizzled out',
};

/**
 * The endings somebody actually CHOOSES.
 *
 * `fizzle` is not on this list and that is the point: it is the only resolution
 * that happens without anybody deciding it, so a player cannot call one. Typing
 * it out of the choosable union means the screen cannot offer a button for it.
 */
export type ChosenResolution = Exclude<BeefResolutionKind, 'fizzle'>;

export const RESOLUTION_NOTE: Record<BeefResolutionKind, string> = {
  truce: 'Both sides stood down and said nothing further. Nobody won and nobody has to admit it.',
  concession: 'They stopped answering. In this scene that is the same as conceding.',
  ko: 'There was nothing left to say. This one goes on the record as yours.',
  fizzle: 'Nobody fed it, the heat went out of it, and the timeline moved on.',
};

/**
 * Which endings are actually available right now.
 *
 * `truce` is always there — you can always choose to stop. The other two have to
 * be earned, and they are earned on the record: a concession needs you clearly
 * ahead, and a knockout needs you ahead and the beef at boiling point.
 */
export function availableResolutions(i: BeefResolveInput): ChosenResolution[] {
  const out: ChosenResolution[] = ['truce'];
  if (i.wins > i.losses && i.heat >= 60) out.push('concession');
  if (i.heat >= 90 && i.wins >= 3 && i.losses === 0) out.push('ko');
  return out;
}

/**
 * What the other side does when the player offers a truce.
 *
 * A truce is not a free action. Somebody who is clearly losing takes it; a
 * bigger name who is winning does not, because they have no reason to.
 */
export function truceAccepted(i: BeefResolveInput, roll: number): boolean {
  const odds = clamp(
    0.5 + (i.wins - i.losses) * 0.18 + i.relationship / 400 - (i.npcFame - i.playerFame) * 0.006,
    0.05,
    0.95,
  );
  return roll < odds;
}

// ─── Reading a beef ───────────────────────────────────────────────────────

export interface BeefReading {
  status: BeefStatus;
  heat: number;
  /** The rung the beef stands at. 0 means open but nothing said yet. */
  rung: number;
  record: string;
  /** The rungs open right now, given the heat. */
  openRungs: BeefRung[];
  /** The next rung, and what it is still waiting for. */
  next: { rung: BeefRung; heatShort: number } | null;
  resolutions: ChosenResolution[];
  /** Why the heat is where it is. */
  note: string;
}

export function readBeef(
  beef: BeefState,
  nowSerial: number,
  npc: { fame: number; relationshipScore: number },
): BeefReading {
  const heat = decayedHeat(beef, nowSerial);
  const status = beefStatus(beef, nowSerial);
  const openRungs = BEEF_RUNGS.filter((r) => r.requiresHeat <= heat);
  const nextRung = nextBeefRung(beef.rung);
  const next =
    nextRung && nextRung.requiresHeat > heat
      ? { rung: nextRung, heatShort: Math.ceil(nextRung.requiresHeat - heat) }
      : null;

  const resolutions = availableResolutions({
    heat,
    wins: beef.wins,
    losses: beef.losses,
    relationship: npc.relationshipScore,
    npcFame: npc.fame,
    playerFame: 0,
  });

  const note =
    beef.resolution
      ? RESOLUTION_NOTE[beef.resolution.kind]
      : status === 'hot'
        ? 'This is live. Everything you do here gets picked up.'
        : status === 'warm'
          ? 'It is still warm, but heat bleeds off when nobody feeds it.'
          : 'It has gone quiet. Another quiet month and it ends itself.';

  return {
    status,
    heat,
    rung: beef.rung,
    record: `${beef.wins}-${beef.losses}`,
    openRungs,
    next,
    resolutions,
    note,
  };
}

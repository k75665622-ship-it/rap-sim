// ─── FEATURE NEGOTIATION ───────────────────────────────────────────────────
//
// Getting another artist on your record is not a menu pick. You send the track
// to their DMs and then you wait, and what comes back depends on things that
// have nothing to do with how much you want it:
//
//   · who you are next to them (a nobody asking a superstar gets silence)
//   · whether the record helps or hurts their brand
//   · whether you have an actual relationship, which is the only thing that
//     makes a verse free
//   · whether anyone credible is making the ask on your behalf — this is what
//     a powerful manager is actually FOR, and it is the single biggest lever a
//     player can buy
//   · who they are. A greedy artist quotes high and barely moves; a generous
//     one opens lower; a volatile one hangs up on a lowball.
//   · and sometimes, simply, whether they are in the mood
//
// A price is not a take-it-or-leave-it. `counterFeatureFee` is the haggle: the
// player names a number, and what comes back depends on how much the artist
// wants the record, how good the manager is, and how the last round went.
//
// Everything here is pure. The randomness is injected as a roll so the
// decision can be tested without mocking anything.

import type { Genre, NPC, NPCTier } from '../types/game';
import { npcTraits } from './traits';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const TIER_MULT: Record<NPCTier, number> = {
  local: 1,
  national: 1.7,
  international: 2.6,
};

/** The subset of an NPC the negotiation actually reads. */
export type FeatureCandidate = Pick<
  NPC,
  'id' | 'fame' | 'tier' | 'relationshipScore' | 'genre' | 'personality' | 'name'
>;

export type FeatureOutcome = 'free' | 'terms' | 'declined' | 'ignored';

export interface FeatureDecision {
  outcome: FeatureOutcome;
  /** What they want, when the outcome is `terms`. */
  fee: number;
  /** Shown to the player verbatim. */
  reason: string;
}

export interface FeatureDecisionInput {
  npc: FeatureCandidate;
  /** Player's blended standing, 0-100. */
  playerFame: number;
  /** Quality of the record being shopped, 0-100. */
  songQuality: number;
  /** 0 when the player has no manager. 0-100. */
  managerSkill: number;
  genre: Genre;
  /** 0..1, injected so this function stays deterministic for a given roll. */
  roll: number;
}

// ─── WHO THEY ARE ───────────────────────────────────────────────────────────

/**
 * What this particular artist is like to deal with.
 *
 * Read off the same characteristic table the rest of the game uses — the
 * characteristics are derived from the id, so the artist who is greedy on a
 * feature is the same artist who is greedy on the payroll, and nothing extra
 * has to be saved. `fame` is passed as the "skill" that decides how many
 * visible characteristics they lead with: a star has three things to say about
 * themselves, somebody local has nothing.
 *
 * Every multiplier here is read somewhere real. A label with no mechanic
 * behind it would be a lie told to the player.
 */
export interface FeatureDisposition {
  /** Multiplies the number they quote. */
  feeMult: number;
  /** Multiplies how likely a bad mood is. */
  moodiness: number;
  /** Multiplies how long they take to answer. */
  replySpeed: number;
  /** Multiplies how hard they are to reach at all. */
  gatekeeping: number;
  /** Multiplies how badly a lowball goes down. */
  pride: number;
  /** Characteristic ids that produced the numbers, for the UI to show. */
  traits: string[];
  /** One line, in the player's words, about what they are like. */
  note: string;
}

const NEUTRAL: FeatureDisposition = {
  feeMult: 1,
  moodiness: 1,
  replySpeed: 1,
  gatekeeping: 1,
  pride: 1,
  traits: [],
  note: '',
};

const DISPOSITION_EFFECTS: Record<string, Partial<Omit<FeatureDisposition, 'traits' | 'note'>>> = {
  // Hidden layer — the part you only find out by dealing with them.
  greedy: { feeMult: 1.4, gatekeeping: 1.12, pride: 1.2 },
  generous: { feeMult: 0.68, pride: 0.8 },
  loyal: { feeMult: 0.85 },
  egotistical: { feeMult: 1.15, moodiness: 1.2, pride: 1.35 },
  volatile: { moodiness: 1.7, pride: 1.4 },
  lazy: { replySpeed: 1.4, gatekeeping: 1.1 },
  hard_working: { replySpeed: 0.78, gatekeeping: 0.88 },
  anger_issues: { moodiness: 1.3, pride: 1.5 },
  // Visible layer — what they lead with, which says how they do business.
  ruthless: { feeMult: 1.15, pride: 1.15 },
  connected: { gatekeeping: 0.85 },
  charismatic: { feeMult: 0.94, moodiness: 0.85 },
  risk_taker: { feeMult: 0.9, moodiness: 1.15 },
  meticulous: { pride: 1.1 },
  brave: { moodiness: 0.9 },
  smart: { feeMult: 0.96 },
  creative: { feeMult: 0.95 },
};

const DISPOSITION_NOTES: Record<string, string> = {
  greedy: 'they never leave money on the table',
  generous: 'they are known for looking after people',
  loyal: 'they look after the people who looked after them',
  egotistical: 'they need to be the biggest name on the record',
  volatile: 'they are impossible to predict',
  lazy: 'getting an answer out of them takes a while',
  hard_working: 'they answer fast and they answer straight',
  anger_issues: 'they do not take a lowball well',
  ruthless: 'they do business like it is a war',
  connected: 'they are easy to get a message to',
  charismatic: 'they are easy to talk to',
  risk_taker: 'they will take a chance on something new',
  meticulous: 'they read the paperwork',
};

export function featureDisposition(npc: FeatureCandidate): FeatureDisposition {
  const { visible, hidden } = npcTraits(npc.id, npc.fame);
  const all = [...hidden, ...visible];

  const out: FeatureDisposition = { ...NEUTRAL, traits: all };
  const notes: string[] = [];

  for (const t of all) {
    const e = DISPOSITION_EFFECTS[t];
    if (!e) continue;
    if (e.feeMult !== undefined) out.feeMult *= e.feeMult;
    if (e.moodiness !== undefined) out.moodiness *= e.moodiness;
    if (e.replySpeed !== undefined) out.replySpeed *= e.replySpeed;
    if (e.gatekeeping !== undefined) out.gatekeeping *= e.gatekeeping;
    if (e.pride !== undefined) out.pride *= e.pride;
    const note = DISPOSITION_NOTES[t];
    if (note) notes.push(note);
  }

  out.note = notes.slice(0, 2).join(', and ');
  return out;
}

/**
 * How much a real relationship is worth off the price.
 *
 * This is the whole point of the relationship meter in a business context: a
 * friend does not quote you list. It is capped so that even a best friend is
 * still a business, and it flips into a surcharge when they actively dislike
 * you — which is what makes burning a bridge cost something.
 */
export function relationshipFeeMult(npc: FeatureCandidate): number {
  const rel = npc.relationshipScore ?? 0;
  // Somebody loyal gives a friend a better deal than somebody who is not.
  const loyal = featureDisposition(npc).traits.includes('loyal') ? 1.55 : 1;
  if (rel >= 0) return 1 - clamp01(rel / 100) * 0.45 * loyal;
  return 1 + clamp01(-rel / 100) * 0.30;
}

/**
 * How much pull a manager actually has. Derived from their own standing — a
 * manager with real weight gets you a reply you would not have got alone.
 */
export function managerSkillOf(npc: NPC | undefined | null): number {
  if (!npc) return 0;
  return clamp100(npc.fame * 0.8 + 12);
}

/** What a verse costs. A strong record earns a discount — they want on it. */
/**
 * What this artist quotes for a verse.
 *
 * Exponential in fame, not quadratic.
 *
 * Squaring fame put the whole top of the roster inside a factor of about 1.4
 * of each other: a multiplatinum headliner and a name two tiers down quoted
 * near-identical numbers, so the price read as a constant rather than as a
 * judgement about who you are asking. Measured across the real roster the old
 * curve ran 3.6x from the least to the most famous artist alive — Burna Boy to
 * Kanye West was 1.36x, which is the same price.
 *
 * Stature is not linear. The difference between the 90th and the 99th
 * percentile of this business is most of the money, so the curve is now
 * geometric in fame and runs about 12x across the roster.
 *
 * Anchored at fame 80, where the two curves agree, so the middle of the market
 * is unchanged: this is a change to the SHAPE of the pricing, not a stealth
 * rebalance of what a feature costs.
 *
 * `1.055^fame` at fame 0 is 1 and at fame 100 is 213, so the constant is the
 * fee a complete unknown with no tier bonus would quote.
 */
export function featureFee(npc: FeatureCandidate, songQuality: number): number {
  const base = 970 * Math.pow(1.055, npc.fame) * TIER_MULT[npc.tier];
  const qualityDiscount = 1 - clamp01((songQuality - 50) / 140);
  const fee = base * qualityDiscount * relationshipFeeMult(npc) * featureDisposition(npc).feeMult;
  return Math.max(500, Math.round(fee / 100) * 100);
}

/** How long before you hear anything back. Bigger artists take longer. */
export function featureResponseDays(npc: FeatureCandidate): number {
  const base = 2 + Math.round(npc.fame / 22) + (npc.tier === 'international' ? 2 : 0);
  return Math.max(1, Math.round(base * featureDisposition(npc).replySpeed));
}

/** How good the verse they send back is. */
export function verseQualityFor(npc: FeatureCandidate, songQuality: number): number {
  return clamp100(45 + npc.fame * 0.42 + songQuality * 0.12);
}

/**
 * The shared read of how much this artist wants to be on this record.
 *
 * One function, so the opening decision, the counter-offer and anything added
 * later cannot drift apart about what "warm" means.
 */
function readStanding(input: {
  npc: FeatureCandidate;
  playerFame: number;
  songQuality: number;
  managerSkill: number;
  genre: Genre;
}) {
  const { npc, playerFame, songQuality, managerSkill, genre } = input;
  const warmth = clamp01((npc.relationshipScore + 20) / 120);
  const gap = npc.fame - playerFame;
  const reachFit = clamp01(1 - Math.max(0, gap) / 55);
  const brandPull = clamp01((songQuality - 40) / 55);
  const managerPull = clamp01(managerSkill / 100);
  const genreMatch = npc.genre === genre ? 1 : 0.7;

  const pull =
    warmth * 0.32 +
    reachFit * 0.24 +
    brandPull * 0.20 +
    managerPull * 0.16 +
    genreMatch * 0.08;

  return { warmth, gap, reachFit, brandPull, managerPull, genreMatch, pull };
}

/**
 * The whole decision. Order matters — the hard gates below are meant to bite
 * before the soft scoring, because a superstar really does ignore an unknown
 * with a bad record no matter how nicely they ask.
 */
export function decideFeatureResponse(input: FeatureDecisionInput): FeatureDecision {
  const { npc, songQuality, roll } = input;
  const d = featureDisposition(npc);
  const { warmth, gap, pull, managerPull } = readStanding(input);

  // A second, decorrelated roll. Reusing the first would make "ignored" and
  // "not in the mood" fire together, which is not how either works.
  const moodRoll = (roll + 0.37) % 1;

  // ── Gate 1: can you even reach them? ──────────────────────────────────
  // A name far above your level often simply never sees the message. But it
  // is not a wall — something else can open the door: a manager with real
  // weight making the ask, or a relationship that already exists. Somebody
  // who is hard to reach raises the wall itself.
  const wall = 30 / d.gatekeeping;
  const outOfReach = gap > wall;
  const hasADoor = managerPull >= 0.4 / d.gatekeeping || warmth >= 0.55;

  if (outOfReach && !hasADoor) {
    // ── The quality door ────────────────────────────────────────────────
    // A record that is genuinely undeniable is its own way in. It is a long
    // shot — a superstar does not care who you are, but they do care what the
    // song sounds like. Around a 20% chance at 78+, a sliver at 65+.
    const qualityDoor = songQuality >= 78 ? 0.20 : songQuality >= 65 ? 0.08 : 0;

    if (roll >= qualityDoor) {
      return {
        outcome: 'ignored',
        fee: 0,
        reason:
          `${npc.name} never replied. Your name does not open that door yet, and ` +
          `nobody with weight is knocking on your behalf.`,
      };
    }

    // They heard it, and it got through on the strength of the record alone.
    //
    // This used to hand out a FREE verse roughly half the time, which meant an
    // unknown with one good song could get a superstar on it for nothing and
    // never negotiate anything. That is not how it works: being heard is not
    // the same as being done a favour. The record gets you a reply you would
    // not otherwise have had, and the reply has a number on it — a good one,
    // because they want the song, but a number.
    const doorFee = Math.round((featureFee(npc, songQuality) * 0.72) / 100) * 100;
    return {
      outcome: 'terms',
      fee: doorFee,
      reason:
        `${npc.name}'s people got back to you — which never happens. They heard the ` +
        `record and they want on it, so they are quoting under their usual rate: ` +
        `$${doorFee.toLocaleString()}, and they keep their publishing.`,
    };
  }

  // ── Gate 2: brand risk ────────────────────────────────────────────────
  // A name that size will not attach itself to a record this rough. It is
  // not personal, it is the brand.
  if (songQuality < 46 && npc.fame > 62) {
    return {
      outcome: 'declined',
      fee: 0,
      reason:
        `${npc.name} passed. The record is not strong enough for them to put ` +
        `their name on — they would be lending you credibility they paid for.`,
    };
  }

  // ── Gate 3: mood ──────────────────────────────────────────────────────
  // Nobody is a machine. Sometimes the answer is just no, and there is
  // nothing to learn from it. A volatile artist is far more likely to be the
  // one who says it.
  if (moodRoll < 0.16 * d.moodiness) {
    const moods = [
      `${npc.name} is not in the mood. Busy, distracted, or simply not feeling it — no reason given.`,
      `${npc.name}'s people said they are locked in the studio on their own project right now.`,
      `${npc.name} left you on read. Try again another week.`,
    ];
    return {
      outcome: 'declined',
      fee: 0,
      reason: moods[Math.floor(moodRoll * 100) % moods.length],
    };
  }

  // ── Free verse: the relationship does the work ────────────────────────
  // Deliberately hard. `warmth >= 0.62` is a relationship score of 55+, which
  // is months of showing up — not a lucky roll. Nobody does a stranger a
  // favour worth this much.
  if (warmth >= 0.62 && pull >= 0.58) {
    return {
      outcome: 'free',
      fee: 0,
      reason:
        `${npc.name} is in. No fee, no paperwork — they rate you and they want ` +
        `on the record. This is what a real relationship buys you.`,
    };
  }

  // ── Business terms ────────────────────────────────────────────────────
  if (pull >= 0.44) {
    const fee = featureFee(npc, songQuality);
    const opener = warmth >= 0.4
      ? `${npc.name} is up for it, but it is a business day.`
      : `${npc.name}'s people came back with a number.`;
    const character = d.note ? ` Word is ${d.note}.` : '';
    return {
      outcome: 'terms',
      fee,
      reason:
        `${opener}${character} $${fee.toLocaleString()} for the verse, and they keep ` +
        `their publishing. Nothing about that number is final — push back and see.`,
    };
  }

  // ── Polite no ─────────────────────────────────────────────────────────
  const reasons = [
    `${npc.name} passed. You are not established enough for them to spend a session on.`,
    `${npc.name} said the record is not for them. They are not hearing a hit.`,
    `${npc.name} declined — their team thinks the collab does not make sense right now.`,
  ];
  return {
    outcome: 'declined',
    fee: 0,
    reason: reasons[Math.floor(roll * 100) % reasons.length],
  };
}

// ─── HAGGLING ───────────────────────────────────────────────────────────────

/** How many times the player can push back before the table is closed. */
export const MAX_NEGOTIATION_ROUNDS = 3;

export interface CounterOfferInput {
  npc: FeatureCandidate;
  songQuality: number;
  managerSkill: number;
  playerFame: number;
  genre: Genre;
  /** What they are asking right now. */
  currentFee: number;
  /** What the player just offered. */
  offer: number;
  /** 1 for the first push-back. */
  round: number;
  roll: number;
}

export interface CounterOffer {
  /** Their new number. Equals `offer` when they simply took it. */
  fee: number;
  /** True when they are done talking and the verse is gone. */
  refused: boolean;
  /** True when this was the last round — the next push ends it. */
  final: boolean;
  reason: string;
}

/**
 * The player names a number.
 *
 * How far they move is not random — it is the same standing read the opening
 * decision used, decayed by how many times the player has already pushed. A
 * stranger with no manager barely budges; a friend with a real manager can
 * take a big chunk off. What the roll decides is only the fine detail and
 * whether a lowball insulted them.
 */
export function counterFeatureFee(input: CounterOfferInput): CounterOffer {
  const { npc, currentFee, offer, round, roll } = input;
  const d = featureDisposition(npc);
  const { warmth, pull, managerPull } = readStanding(input);

  const final = round >= MAX_NEGOTIATION_ROUNDS;

  // ── A lowball is a message ────────────────────────────────────────────
  // Coming in under half of what they asked reads as an insult, not an
  // opening bid, and the pride multiplier decides how badly it lands. A
  // volatile or greedy artist hangs up; almost anybody else simply holds.
  const insultLine = currentFee * 0.5;
  if (offer < insultLine) {
    const blownUp = roll < clamp01(0.25 * d.pride);
    if (blownUp) {
      return {
        fee: currentFee,
        refused: true,
        final: true,
        reason:
          `${npc.name} is done. Offering $${Math.round(offer).toLocaleString()} against a ` +
          `$${currentFee.toLocaleString()} ask read as disrespect — the verse is off the table.`,
      };
    }
    return {
      fee: currentFee,
      refused: false,
      final,
      reason:
        `That landed badly. ${npc.name} is not moving off $${currentFee.toLocaleString()} ` +
        `for an offer that size — come back with something serious.`,
    };
  }

  // ── How far they will move ────────────────────────────────────────────
  // The gap between their number and yours, closed by however much they want
  // this. Rounds decay: the first counter is the generous one, because after
  // that they start to think you are haggling for sport.
  const give = clamp01(0.08 + warmth * 0.34 + managerPull * 0.24 + pull * 0.14);
  const decay = round <= 1 ? 1 : round === 2 ? 0.6 : 0.32;
  const movement = give * decay;

  /**
   * The lowest number they will actually say yes to.
   *
   * A real relationship LOWERS it — that is the entire reason the relationship
   * meter matters in a negotiation — and a manager with weight lowers it a
   * little more, because a good manager is the person who knows what the room
   * will bear. Getting this sign the wrong way round makes warmth raise the
   * floor, which is the same as charging your friends more.
   */
  const floorPct = Math.max(0.25, Math.min(0.9, 0.72 - warmth * 0.30 - managerPull * 0.12));
  const floor = Math.round((currentFee * floorPct) / 100) * 100;

  // ── Above their floor, they just take it ──────────────────────────────
  // This is what makes a warm negotiation feel different from a cold one:
  // the friend says yes, the stranger comes back with a smaller movement.
  if (offer >= floor) {
    return {
      fee: offer,
      refused: false,
      final,
      reason:
        `${npc.name} came down to your number. $${offer.toLocaleString()} and the verse ` +
        `is yours — they were not going to argue over the last of it.`,
    };
  }

  const counter = Math.round((currentFee - (currentFee - offer) * movement) / 100) * 100;
  const next = Math.max(floor, Math.min(currentFee, counter));

  if (next <= offer) {
    return {
      fee: offer,
      refused: false,
      final,
      reason:
        `${npc.name} came down to your number. $${offer.toLocaleString()} and the verse ` +
        `is yours — they were not going to argue over the last of it.`,
    };
  }

  if (final) {
    return {
      fee: next,
      refused: true,
      final: true,
      reason:
        `That was the third time you pushed. ${npc.name} is done at ` +
        `$${next.toLocaleString()} — take it or the verse goes to somebody else.`,
    };
  }

  const drop = currentFee - next;
  const tone = drop >= currentFee * 0.2
    ? 'They came down properly.'
    : drop >= currentFee * 0.08
      ? 'They moved a little.'
      : 'They barely moved.';

  return {
    fee: next,
    refused: false,
    final,
    reason:
      `${tone} $${next.toLocaleString()} is where ${npc.name} is now — ` +
      `${round >= 2 ? 'and they are getting tired of the back-and-forth' : 'and there is still room if you push'}.`,
  };
}

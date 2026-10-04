// ─── INBOUND: SOMEBODY WANTS YOU ON THEIR RECORD ────────────────────────────
//
// `features.ts` is the player asking. This is the mirror image, and it is the
// thing the game was missing: once you are actually somebody, artists come to
// YOU, and you are the one quoting a number.
//
// The whole point of the mirror is that it is not the same conversation run
// backwards. When you ask, the risk is silence. When you are asked, the risk is
// money — you can price yourself out of a record that would have been good for
// you, or take the first number and leave six figures on the table. The player
// is the one with something to lose this time, so the information asymmetry
// flips: THEY know what the verse is worth to them, and you are guessing.
//
// That guess is what a manager is for. `managerReadOnInbound` is a real read,
// not a flavour text: it is the true ceiling with an error bar that shrinks as
// the manager's network grows. A well-connected manager genuinely tells you
// what to charge. A bad one genuinely gets you underpaid, and you will not know
// which happened until the record is out.
//
// Everything here is pure. The randomness is injected as a roll so the
// decisions can be tested without mocking anything.

import type { Genre, NPC, NPCTier } from '../types/game';
import { featureDisposition, type FeatureCandidate } from './features';
import { managerNetwork } from './roles';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const TIER_MULT: Record<NPCTier, number> = {
  local: 1,
  national: 1.7,
  international: 2.6,
};

/**
 * What the negotiation reads off an NPC.
 *
 * Wider than the outbound `FeatureCandidate` by exactly one field, `country`:
 * when you are the one being asked, a record from your own scene is a different
 * proposition from a record from somewhere you have never been, and that has to
 * move who comes knocking.
 */
export type InboundCandidate = FeatureCandidate & { country: string };

// ─── WHAT YOU ARE WORTH ─────────────────────────────────────────────────────

/**
 * What the player's verse goes for on the open market.
 *
 * Deliberately the SAME curve as `featureFee`, so there is one market rather
 * than two: at any given level of fame a verse costs what a verse costs, no
 * matter which side of it you are standing on. That matters, because it is what
 * makes the famous-player complaint self-correcting — the moment your fame
 * crosses an artist's, the numbers stop being abstract and you can see exactly
 * what you are asking them to pay you.
 */
export function playerVerseRate(playerFame: number): number {
  return Math.max(500, Math.round((970 * Math.pow(1.055, playerFame)) / 100) * 100);
}

/**
 * What this artist will actually pay, before any haggling.
 *
 * This is the ceiling the whole negotiation is fought over, and it is private
 * information — the player never sees it directly, only the manager's estimate
 * of it.
 *
 * Anchored on THEIR OWN market rate, because what a verse is worth to somebody
 * scales with what they are worth: a headliner putting you on their album is
 * buying a different thing than a local artist putting you on a mixtape.
 *
 * `2 - feeMult` flips the disposition. In the outbound negotiation `feeMult`
 * means "what they charge", and a greedy artist charges 1.4x. The same person
 * paying YOU is not suddenly generous — they pay 0.6x. Getting this the wrong
 * way round would make the greediest artists in the game the best payers.
 */
export function inboundBudget(
  npc: InboundCandidate,
  songQuality: number,
  playerFame: number,
): number {
  const d = featureDisposition(npc);
  const payMult = clamp(2 - d.feeMult, 0.5, 1.6);

  // Their own scale.
  const base = 970 * Math.pow(1.055, npc.fame) * TIER_MULT[npc.tier];

  // How much they want YOU specifically. A record that needs a verse pays for
  // one; a record that does not is doing you a favour, and pays like it.
  const interest = clamp01(0.55 + (songQuality - 45) / 90);

  // A real relationship is worth money in both directions. Somebody who rates
  // you pays over the odds rather than chancing it with a stranger.
  const rel = npc.relationshipScore ?? 0;
  const relationshipMult = rel >= 0 ? 1 + clamp01(rel / 100) * 0.35 : 1 - clamp01(-rel / 100) * 0.25;

  // Being asked by somebody bigger than you is a compliment, not a discount —
  // but a small artist asking a much bigger one is reaching, and their ceiling
  // is real. This keeps the ceiling sane at both ends of the gap.
  const gap = npc.fame - playerFame;
  const gapMult = gap >= 0 ? 1 : clamp01(1 + gap / 60) * 0.5 + 0.5;

  const budget = base * payMult * interest * relationshipMult * gapMult;
  return Math.max(400, Math.round(budget / 100) * 100);
}

/** What they open with. Always under the ceiling — that is what negotiating is. */
export function inboundOpeningOffer(budget: number, npc: InboundCandidate): number {
  const d = featureDisposition(npc);
  // A greedy artist opens lower and holds longer; a generous one opens close to
  // their real number because they are not trying to win anything.
  const openPct = clamp(0.82 - (d.feeMult - 1) * 0.30, 0.45, 0.9);
  return Math.max(300, Math.round((budget * openPct) / 100) * 100);
}

// ─── SHOULD ANYBODY ASK AT ALL ──────────────────────────────────────────────

export interface InboundGenerationInput {
  /** Player's blended standing, 0-100. */
  playerFame: number;
  playerGenre: Genre;
  playerCountry: string;
  /**
   * The quality of the player's best record released recently, or 0.
   * A hot record is the single most common reason anybody asks.
   */
  recentHeat: number;
  /** Artists who could plausibly ask. */
  pool: InboundCandidate[];
  /** Ids already being negotiated with, so nobody asks twice at once. */
  busyIds: string[];
  /** How many asks are already open. The scene does not queue up. */
  openCount: number;
  /**
   * How many weeks this tick covers.
   *
   * The tick is called once per `advanceTurn`, whatever the unit — so a "+1
   * Day" click and a "+1 Month" click each run this exactly once. Without this
   * the chance would be per CLICK, and a player tapping +1 Day would be asked
   * for a verse thirty times more often than one skipping a month at a time.
   */
  weeksElapsed: number;
  /** 0..1, injected. */
  roll: number;
}

export interface InboundGenerationResult {
  /** The artist who asks, or null. */
  npc: InboundCandidate | null;
  /** Why they are asking, in their own voice. */
  reason: string;
  /** 0..1 — how badly they want it. */
  heat: number;
}

/**
 * Whether anybody asks the player for a verse this week.
 *
 * The gates are deliberately about STANDING, not about dice. The complaint this
 * answers is "I am famous now and nobody has asked me for a verse" — so fame is
 * the thing that unlocks it, and a genuinely big player should be turning work
 * down rather than waiting for the phone to ring.
 *
 * Note the ceiling on `openCount`: one live ask at a time while you are small,
 * more as you get bigger. A queue of six people wanting verses from you is a
 * fantasy; two is a career.
 */
export function generateInboundAsk(
  input: InboundGenerationInput,
): InboundGenerationResult {
  const { playerFame, recentHeat, pool, busyIds, openCount, weeksElapsed, roll } = input;

  // Nobody asks a stranger with no record.
  const standing = Math.max(playerFame, recentHeat * 0.8);
  if (standing < 22) return { npc: null, reason: '', heat: 0 };

  const maxOpen = playerFame >= 70 ? 3 : playerFame >= 45 ? 2 : 1;
  if (openCount >= maxOpen) return { npc: null, reason: '', heat: 0 };

  // The rate rises with standing and spikes when a record is actually moving.
  // The weekly figure is capped low — an ask should feel like an event, not a
  // payroll run — and then scaled by how much time the tick actually covered.
  const base = clamp01((standing - 20) / 130);
  const heatBonus = recentHeat >= 70 ? 0.16 : recentHeat >= 55 ? 0.08 : 0;
  const weekly = Math.min(0.30, base + heatBonus);
  const chance = Math.min(0.85, weekly * Math.max(0, weeksElapsed));
  if (roll > chance) return { npc: null, reason: '', heat: 0 };

  const candidates = pool.filter((n) => busyIds.indexOf(n.id) < 0);
  if (candidates.length === 0) return { npc: null, reason: '', heat: 0 };

  // Who comes knocking.
  //
  // Weighted so that a PEER is the normal case and the direction matters. The
  // first cut of this treated "gap <= 5" as one bucket, which quietly put every
  // smaller artist in the pool into the highest-weight group — so a famous
  // player was asked almost exclusively by people far below them, who cannot
  // pay, which is the least interesting version of the feature. Being asked UP
  // is the story; being asked DOWN is a favour; being asked by a peer is a
  // career.
  const weighted = candidates.map((n) => {
    const gap = n.fame - playerFame;
    const gapWeight =
      gap >= -10 && gap <= 10
        ? 1 // a peer
        : gap > 10 && gap <= 25
          ? 0.75 // a step above you
          : gap > 25
            ? 0.2 // a genuine reach — rare, and worth the wait
            : gap >= -35
              ? 0.45 // a step below you
              : 0.12; // far below, and they know they cannot pay you
    const genreWeight = n.genre === input.playerGenre ? 1.35 : 0.7;
    const homeWeight = n.country === input.playerCountry ? 1.15 : 1;
    const relWeight = 1 + clamp01((n.relationshipScore ?? 0) / 100) * 0.6;
    return { npc: n, w: gapWeight * genreWeight * homeWeight * relWeight };
  });
  const total = weighted.reduce((a, x) => a + x.w, 0);
  if (total <= 0) return { npc: null, reason: '', heat: 0 };

  // A second decorrelated draw picks from the weighted pool, so the "did
  // anybody ask" roll and the "who asked" roll cannot correlate.
  let pickRoll = ((roll + 0.41) % 1) * total;
  let chosen = weighted[weighted.length - 1].npc;
  for (const w of weighted) {
    pickRoll -= w.w;
    if (pickRoll <= 0) { chosen = w.npc; break; }
  }

  const heat = clamp01((standing - 20) / 80);

  return {
    npc: chosen,
    heat,
    reason: inboundAskReason(chosen, playerFame, recentHeat),
  };
}

/**
 * The ask, in their voice.
 *
 * Written as a DM, because that is what it is — a message from somebody who
 * wants something. The register moves with who they are: a peer texts you, a
 * legend has their people call.
 */
function inboundAskReason(
  npc: InboundCandidate,
  playerFame: number,
  recentHeat: number,
): string {
  const gap = npc.fame - playerFame;
  const d = featureDisposition(npc);
  const hot = recentHeat >= 70;
  const hotLine = hot
    ? 'That last one has been everywhere — I have not been able to get away from it.'
    : 'I have been watching what you are doing.';

  if (gap > 30) {
    return (
      `${hotLine} I am putting a project together and I want you on a record. ` +
      `I know that is a jump for you — that is rather the point.`
    );
  }
  if (gap > 8) {
    return (
      `${hotLine} I have got something that needs a verse and I think it is yours. ` +
      `I am not asking anybody else first.`
    );
  }
  if (gap >= -8) {
    return (
      `${hotLine} We should do something properly instead of just liking each ` +
      `other's posts. I have a record that wants two voices on it.`
    );
  }
  // They are smaller than the player, and they know it.
  const shy = d.pride < 1 ? 'I hope this is not out of order. ' : '';
  return (
    `${shy}${hotLine} I do not know if you are even taking verses right now, ` +
    `but I have a record that would be a different thing with you on it. ` +
    `Tell me what it would take.`
  );
}

// ─── THE MANAGER'S READ ─────────────────────────────────────────────────────

export interface ManagerRead {
  /** What the manager thinks of the record they are being asked onto. */
  trackVerdict: string;
  /** What the manager thinks the player should ask for. */
  recommendedFee: number;
  /** The manager's estimate of the true ceiling — what they think they will pay. */
  estimatedCeiling: number;
  /** How much to trust the number, 0..1. Drives how the UI shows it. */
  confidence: number;
  /** A short read on the artist, so the player knows who they are dealing with. */
  artistRead: string;
  /** One line of actual advice. */
  advice: string;
  /** True when the manager thinks the player should not take it at all. */
  pass: boolean;
}

export interface ManagerReadInput {
  npc: InboundCandidate;
  /** The record the player is being asked onto. */
  songQuality: number;
  playerFame: number;
  playerGenre: Genre;
  /** The manager NPC, or null when unsigned. */
  manager: NPC | null;
  /** The true ceiling — private, and what the read is trying to estimate. */
  budget: number;
  /** 0..1, injected. */
  roll: number;
}

/**
 * What the manager tells you.
 *
 * This is the payoff for having representation, and it is deliberately the
 * single most useful piece of information in the whole feature system: the true
 * ceiling is private, and a connected manager hands you a number close to it.
 *
 * The error is not decoration. It is `(1 - network) * 0.35`, so a manager with
 * a real network is within a few percent and a manager who is still learning is
 * out by a third in either direction. That is the difference between a retainer
 * you resent and one that pays for itself, and it is the reason to care which
 * manager you signed rather than merely that you signed one.
 */
export function managerReadOnInbound(input: ManagerReadInput): ManagerRead {
  const { npc, songQuality, playerFame, playerGenre, manager, budget, roll } = input;

  const d = featureDisposition(npc);
  const net = managerNetwork(manager);
  const network01 = clamp01(net / 100);
  const confidence = clamp01(0.25 + network01 * 0.75);

  // ── The estimate of the ceiling ───────────────────────────────────────
  // An unsigned player is guessing blind, and the UI says so rather than
  // pretending the number is a read.
  const errorBand = manager ? (1 - network01) * 0.35 : 0.45;
  const error = (roll * 2 - 1) * errorBand;
  const estimatedCeiling = Math.max(300, Math.round((budget * (1 + error)) / 100) * 100);

  // ── What to charge ────────────────────────────────────────────────────
  // The advice is not "ask for the ceiling" — that is how you lose the record
  // for the sake of the last ten percent. It is the ceiling less a small margin
  // that makes the yes easy, and the margin is smaller when the manager is
  // confident, because a confident manager knows exactly where the line is.
  const margin = 0.94 - confidence * 0.06;
  const recommendedFee = Math.max(300, Math.round((estimatedCeiling * margin) / 100) * 100);

  // ── The read on the record ────────────────────────────────────────────
  const fits = npc.genre === playerGenre;
  let trackVerdict: string;
  if (songQuality >= 78) {
    trackVerdict = fits
      ? 'It is a real record, and it is your lane. This is the kind of thing that ends up on a year-end list.'
      : 'It is a real record. It is not your sound, but a verse is a verse and this one will be heard.';
  } else if (songQuality >= 62) {
    trackVerdict = fits
      ? 'Solid. Not a landmark, but the right record for you to be on right now.'
      : 'Solid record, slightly outside what you do. Nothing it can do for you that a better one could not.';
  } else if (songQuality >= 48) {
    trackVerdict = 'It is fine. It will come and go, and so will your verse on it.';
  } else {
    trackVerdict = 'Honestly? It is not very good. You would be doing them the favour, not the other way round.';
  }

  // ── The read on the artist ────────────────────────────────────────────
  const artistBits: string[] = [];
  if (d.traits.includes('greedy')) artistBits.push('they do not part with money easily');
  if (d.traits.includes('generous')) artistBits.push('they pay over the odds and they know it');
  if (d.traits.includes('volatile') || d.traits.includes('anger_issues')) {
    artistBits.push('they can turn on a conversation, so do not lowball them');
  }
  if (d.traits.includes('lazy')) artistBits.push('getting an answer out of them takes a while');
  if (d.traits.includes('hard_working')) artistBits.push('they move fast and they pay on time');
  if (d.traits.includes('egotistical')) artistBits.push('they will want to be the bigger name on it');

  const rel = npc.relationshipScore ?? 0;
  if (rel >= 60) artistBits.push('and they rate you personally, which is worth something');
  else if (rel <= -30) artistBits.push('and there is history between you two that I do not like');

  const artistRead = artistBits.length > 0
    ? `${npc.name} — ${artistBits.slice(0, 3).join('; ')}.`
    : `${npc.name} — no history with you either way. Straight business.`;

  // ── The advice ────────────────────────────────────────────────────────
  const pass = songQuality < 48 && npc.fame < playerFame;
  let advice: string;
  if (!manager) {
    advice = 'I am not your manager, so this is just a guess — take it as one.';
  } else if (pass) {
    advice = 'I would leave this one. It does nothing for you and the money is small.';
  } else if (confidence >= 0.75) {
    advice = `Ask ${'$'}${recommendedFee.toLocaleString()}. I know this room — they will say yes, and they will not blink.`;
  } else if (confidence >= 0.5) {
    advice = `I would open around ${'$'}${recommendedFee.toLocaleString()}. They may push back, so leave yourself somewhere to go.`;
  } else {
    advice = `Best I can tell you is ${'$'}${recommendedFee.toLocaleString()}, and I am not certain. Do not be surprised if they move.`;
  }

  return {
    trackVerdict,
    recommendedFee,
    estimatedCeiling,
    confidence,
    artistRead,
    advice,
    pass,
  };
}

// ─── THE HAGGLE, INBOUND ────────────────────────────────────────────────────

export interface InboundResponseInput {
  npc: InboundCandidate;
  /** The true ceiling — what they will go to. */
  budget: number;
  /** What they have on the table right now. */
  currentOffer: number;
  /** What the player just asked for. */
  quote: number;
  /** 1 for the first push. */
  round: number;
  /** 0..1, injected. */
  roll: number;
}

export interface InboundResponse {
  /** True when the verse is sold at `fee`. */
  accepted: boolean;
  /** The number now on the table. Equals `quote` when they took it. */
  fee: number;
  /** True when they have walked and the door is shut. */
  walked: boolean;
  /** True when this was the last round — the next push ends it. */
  final: boolean;
  reason: string;
}

/**
 * The artist answers the player's number.
 *
 * The shape is the mirror of `counterFeatureFee`, and the mirror is the point:
 * there the player was pushing a price DOWN and the risk was annoying somebody.
 * Here the player is pushing a price UP, and the risk is different — you can
 * price yourself out of the room entirely, and the thing that decides it is
 * whether your number is inside what they were always willing to pay.
 *
 * The ceiling is hard. A quote over it never gets accepted, no matter how warm
 * the relationship: they will come up to their number or they will walk. That
 * is what makes the manager's estimate worth paying for.
 */
export function decideInboundResponse(input: InboundResponseInput): InboundResponse {
  const { npc, budget, currentOffer, quote, round, roll } = input;
  const d = featureDisposition(npc);
  const final = round >= 3;

  // ── Inside the ceiling: sold ─────────────────────────────────────────
  // No dice. If the number is one they were always going to pay, they pay it —
  // pretending otherwise would make the manager's read a lie.
  if (quote <= budget) {
    const stretch = budget > 0 ? quote / budget : 1;
    const grumble = stretch >= 0.97 && d.pride > 1.1
      ? ` ${npc.name} did not love the number, but they want the verse more than they want the argument.`
      : '';
    return {
      accepted: true,
      fee: quote,
      walked: false,
      final: true,
      // "Paid on delivery" would be a lie here, and the player would act on it.
      // The money moves the moment they agree — that is the deal they were
      // offered, and it is why a fee already banked is never clawed back when
      // the verse lapses. The verse is what is still owed, not the money.
      reason:
        `${npc.name} took it. ${'$'}${quote.toLocaleString()} for the verse, paid up front.${grumble}`,
    };
  }

  // ── Over the ceiling ─────────────────────────────────────────────────
  const over = budget > 0 ? quote / budget : 99;

  // Asking for more than double what they will ever pay is not a negotiation,
  // it is a different conversation. Pride decides whether they laugh it off or
  // take offence, and a proud artist takes offence.
  if (over >= 2 || (over >= 1.5 && roll < clamp01(0.4 * d.pride))) {
    return {
      accepted: false,
      fee: currentOffer,
      walked: true,
      final: true,
      reason:
        `${npc.name} is out. ${'$'}${quote.toLocaleString()} is not a number they were ever ` +
        `going to pay for a verse, and they have gone quiet on it.`,
    };
  }

  if (final) {
    return {
      accepted: false,
      fee: budget,
      walked: true,
      final: true,
      reason:
        `That was the third time. ${npc.name} is at ${'$'}${budget.toLocaleString()} and no ` +
        `further — take it or the record goes out without you.`,
    };
  }

  // They come up towards the ceiling. A generous artist gets there faster; a
  // greedy one makes the player work for every step.
  const give = clamp01(0.42 + (2 - d.feeMult) * 0.22 + (npc.relationshipScore ?? 0) / 400);
  const movement = round <= 1 ? give : give * (round === 2 ? 0.6 : 0.3);
  const next = Math.round((currentOffer + (budget - currentOffer) * movement) / 100) * 100;
  const ceiling = Math.max(currentOffer, Math.min(budget, next));

  return {
    accepted: false,
    fee: ceiling,
    walked: false,
    final: round >= 2,
    reason:
      `${npc.name} came up to ${'$'}${ceiling.toLocaleString()}. ` +
      (round >= 2
        ? 'That is close to their limit — push again and you will lose it.'
        : 'There is a little more in it, but not a lot.'),
  };
}

/** The craft the player brings to somebody else's record. */
export interface PlayerVerseInput {
  lyricism: number;
  flow: number;
  delivery: number;
  vocalAbility: number;
  songwriting: number;
}

/**
 * How good the verse the player sends back actually is.
 *
 * Scored off the player's OWN craft, not off the host's fame and not off the
 * host's record quality. This is the one part of somebody else's song the
 * player is responsible for, and a great beat does not write anybody's bars —
 * so a player who has been coasting on other people's production finds out
 * here, on a record with somebody else's name on the front.
 *
 * Weighted towards the writing, because that is what a feature verse is.
 */
export function inboundVerseQuality(stats: PlayerVerseInput): number {
  const craft =
    stats.lyricism * 0.28 +
    stats.songwriting * 0.24 +
    stats.flow * 0.2 +
    stats.delivery * 0.16 +
    stats.vocalAbility * 0.12;
  return Math.max(1, Math.min(100, Math.round(craft)));
}

/**
 * What the player gets out of it beyond the money.
 *
 * Being the guest on somebody else's record is a different play from having
 * them on yours: you are borrowing an audience that is already assembled, so
 * the fame moves more than the momentum does — and it moves most when the gap
 * between you is widest, because that is the audience you did not have.
 */
export function inboundFameGain(npc: InboundCandidate, playerFame: number): number {
  const gap = Math.max(0, npc.fame - playerFame);
  return Math.round((1.2 + npc.fame * 0.06 + gap * 0.05) * 10) / 10;
}

/** A guest verse is somebody else's record. It is a credit, not a campaign. */
export function inboundMomentumGain(npc: InboundCandidate): number {
  return Math.round((2 + npc.fame * 0.04) * 10) / 10;
}

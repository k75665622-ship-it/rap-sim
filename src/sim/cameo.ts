// ─── VIDEO CAMEOS ───────────────────────────────────────────────────────────
//
// You have a record with somebody on it and you want to shoot the visual. Do
// they turn up?
//
// They are already on the song, so the verse is settled — this is a different
// ask. Standing in front of a camera for a day is work, and what it costs
// depends almost entirely on the relationship, which is the point: a verse you
// paid for buys you a verse, not a friend. Somebody you have actually built
// something with shows up for nothing. Somebody you met last week charges you
// again, and somebody you have soured on does not show up at all.
//
// Everything is decided *before* the shoot is ordered. A surprise charge on the
// other side of a button is not a mechanic, it is a trap — so `cameoQuote` is
// pure, the dialog shows the number, and `createMusicVideo` charges exactly the
// number the player was shown.

import type { FeatureCandidate } from './features';
import { featureDisposition, featureFee } from './features';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface CameoQuote {
  npcId: string;
  name: string;
  /** False when they will not appear at all, at any price. */
  appears: boolean;
  /** 0 when they are doing it as a favour. */
  fee: number;
  /**
   * Flat points this appearance adds to the shoot — a name on set is
   * production value, and the record's video reads better for it.
   */
  qualityBonus: number;
  /** Shown to the player verbatim, before they commit. */
  reason: string;
}

export interface CameoInput {
  npc: FeatureCandidate;
  playerFame: number;
  /** What the player is spending on the shoot itself, excluding fees. */
  budget: number;
  songQuality: number;
}

/**
 * A cameo is worth less than a verse, and worth it differently.
 *
 * The verse is the artist's actual work product and it is priced as such. An
 * appearance is a day on somebody else's set, so it opens at a fraction of that
 * — but the relationship discount is far steeper, because a favour is exactly
 * what a cameo is. That is the whole reason the two numbers are not the same.
 */
const CAMEO_SHARE_OF_VERSE = 0.35;

/** The flat quality a star's presence is worth on set, at fame 0-100. */
function cameoQualityBonus(fame: number): number {
  return Math.round((2 + Math.max(0, Math.min(100, fame)) * 0.085) * 10) / 10;
}

export function cameoQuote(input: CameoInput): CameoQuote {
  const { npc, playerFame, budget, songQuality } = input;
  const d = featureDisposition(npc);
  const rel = npc.relationshipScore ?? 0;

  const base: CameoQuote = {
    npcId: npc.id,
    name: npc.name,
    appears: true,
    fee: 0,
    qualityBonus: cameoQualityBonus(npc.fame),
    reason: '',
  };

  // ── They are not showing up for you ───────────────────────────────────
  // A burned bridge is a burned bridge. No fee fixes this one; the way back is
  // to spend time on the relationship, not money.
  if (rel <= -25) {
    return {
      ...base,
      appears: false,
      qualityBonus: 0,
      reason:
        `${npc.name} is not turning up. Whatever is between you two is not ` +
        `something a shoot day is going to fix.`,
    };
  }

  // ── The shoot has to be at their level ────────────────────────────────
  // A name this size is not standing in front of a phone camera in a car park.
  // A real relationship gets you past it; money at the box office does not.
  const theirLevel = 1_500 + npc.fame * 320;
  if (budget < theirLevel * 0.3 && rel < 60) {
    return {
      ...base,
      appears: false,
      qualityBonus: 0,
      reason:
        `${npc.name} passed. A $${Math.round(budget).toLocaleString()} shoot is not ` +
        `at their level — they are not putting their face on it.`,
    };
  }

  // ── The fee ───────────────────────────────────────────────────────────
  // A smooth curve, not a table, so the number moves every time the
  // relationship does. At a full relationship it reaches zero and the answer
  // is genuinely free.
  const loyalty = clamp01((rel + 10) / 110) * (d.traits.includes('loyal') ? 1.25 : 1);
  const raw = featureFee(npc, songQuality) * CAMEO_SHARE_OF_VERSE;
  const fee = Math.max(0, Math.round((raw * (1 - clamp01(loyalty)) * d.feeMult) / 50) * 50);

  // ── A star who is bigger than the shoot wants paying for the gap ──────
  // An appearance is a co-sign, and a co-sign has a price when the two names
  // are not close. Not a refusal — just a bigger number.
  const gap = npc.fame - playerFame;
  const gapPremium = gap > 30 ? 1 + clamp01((gap - 30) / 70) * 0.5 : 1;
  const finalFee = Math.round((fee * gapPremium) / 50) * 50;

  const reason = finalFee === 0
    ? `${npc.name} is on the shoot for nothing. That is what the relationship is for.`
    : finalFee < raw * 0.4
      ? `${npc.name} will do it cheap, but not free — $${finalFee.toLocaleString()} for the day.`
      : `${npc.name} will appear for $${finalFee.toLocaleString()}${gap > 30 ? ', and the number is up because you are the smaller name on the call sheet' : ''}.`;

  return { ...base, fee: finalFee, reason };
}

/**
 * Price a whole guest list at once, and total it.
 *
 * The total is what the shoot costs on top of the production budget, and it is
 * the number the player is shown before they press the button.
 */
export function quoteCameos(
  guests: FeatureCandidate[],
  input: Omit<CameoInput, 'npc'>,
): { quotes: CameoQuote[]; total: number; qualityBonus: number } {
  const quotes = guests.map((npc) => cameoQuote({ ...input, npc }));
  const total = quotes.reduce((n, q) => n + q.fee, 0);
  const qualityBonus = quotes.reduce((n, q) => n + (q.appears ? q.qualityBonus : 0), 0);
  return { quotes, total, qualityBonus };
}

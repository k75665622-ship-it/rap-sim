// ─── THE COURTHOUSE ────────────────────────────────────────────────────────
//
// Disputes that don't settle in the DMs end up here: a verse paid for and
// never sent, a fee never paid, a booked show walked out on, a diss that
// crossed into lies, a sample used without clearance. Either side can sue.
//
// A case is filed, the other side is served and answers (pay up, offer a
// settlement, fight, or ignore it). Hearings sit on the game clock at the
// courthouse. You can go, or let your lawyer handle it — and a lawyer is
// either on your team or hired for the case. The judge weighs the evidence,
// the lawyers and what's said on the stand. Losing costs the claim and some
// of the other side's costs; it also makes the news.
//
// Pure: the store owns the state.

import type { Persona } from './persona';

export type CaseKind = 'breach_feature' | 'unpaid_fee' | 'show_walkout' | 'defamation' | 'copyright' | 'refund' | 'debt';

export const CASE_LABEL: Record<CaseKind, { title: string; emoji: string; blurb: string }> = {
  breach_feature: { title: 'Breach of contract — feature', emoji: '🎙️', blurb: 'Paid for a verse that never came.' },
  unpaid_fee: { title: 'Unpaid fee', emoji: '💸', blurb: 'Work delivered, money never paid.' },
  show_walkout: { title: 'Breach of contract — show', emoji: '🎟️', blurb: 'Pulled out of a booked show.' },
  defamation: { title: 'Defamation', emoji: '🗯️', blurb: 'Said things in public that weren\'t true and did damage.' },
  copyright: { title: 'Copyright infringement', emoji: '©️', blurb: 'Used a sample or a song without clearance.' },
  refund: { title: 'Recovery of money', emoji: '🧾', blurb: 'Money paid for something never delivered.' },
  debt: { title: 'Debt recovery', emoji: '🏦', blurb: 'A loan that stopped being paid.' },
};

export type PartyId = 'player' | string;
export interface Party { id: PartyId; name: string }

export interface Lawyer {
  name: string;
  /** 0-100. */
  skill: number;
  source: 'team' | 'legal_aid' | 'practice' | 'top_firm' | 'self';
  /** Charged per hearing (team lawyers are on salary). */
  perHearing: number;
  crewId?: string;
}

export interface Hearing {
  id: string;
  /** Absolute game minute. */
  atMinute: number;
  kind: 'mention' | 'trial';
  done?: boolean;
  /** What happened, once it has. */
  note?: string;
}

export interface Offer { id: string; from: 'player' | 'them'; amount: number; serial: number; status: 'open' | 'accepted' | 'rejected' | 'lapsed' }

export type CaseStatus = 'served' | 'hearing' | 'settled' | 'won' | 'lost' | 'dismissed' | 'withdrawn';

export interface LegalCase {
  id: string;
  kind: CaseKind;
  plaintiff: Party;
  defendant: Party;
  /** Which side the player is on. */
  side: 'plaintiff' | 'defendant';
  /** What the plaintiff asks for, in dollars. */
  claim: number;
  /** The facts on the record, in plain words. */
  facts: string[];
  /** How strong the plaintiff's case is on the facts, 0-100. */
  evidence: number;
  filedSerial: number;
  status: CaseStatus;
  court: string;
  hearings: Hearing[];
  ourLawyer?: Lawyer;
  /** The other side's lawyer, as the player sees them. */
  theirLawyer: { name: string; skill: number };
  offers: Offer[];
  log: { serial: number; text: string }[];
  /** Legal costs the player has paid so far. */
  costs: number;
  outcome?: { text: string; damages: number; costs: number; serial: number };
  /** What it came from (a feature deal, a show, a post). */
  refId?: string;
  /** Has the press picked it up? */
  public?: boolean;
  /** Answer deadline for the player when they are the defendant (day serial). */
  answerBy?: number;
  /** The other side's next move is due on this day. */
  nextMoveSerial?: number;
}

// ─── LAWYERS ───────────────────────────────────────────────────────────────

export interface LawyerOption { source: Lawyer['source']; name: string; skill: number; retainer: number; perHearing: number; blurb: string }

const FIRMS = ['Mensah & Partners', 'Okafor Chambers', 'Boateng Legal', 'Adeyemi & Co', 'Asante Law', 'Bello Chambers', 'Owusu & Associates', 'Eze Legal Practice'];

/** The lawyers you can hire for one case (prices scale with what's at stake). */
export function lawyerOptions(claim: number, seed: number): LawyerOption[] {
  const firm = (k: number) => FIRMS[(seed + k) % FIRMS.length];
  const scale = Math.max(1, Math.log10(Math.max(10, claim)) - 2.5);
  return [
    { source: 'legal_aid', name: 'Legal aid clinic', skill: 32, retainer: 150, perHearing: 50, blurb: 'Overworked but cheap. Better than nobody.' },
    { source: 'practice', name: firm(1), skill: 60, retainer: Math.round(1500 * scale / 50) * 50, perHearing: Math.round(600 * scale / 50) * 50, blurb: 'A solid practice. Knows the judges.' },
    { source: 'top_firm', name: firm(4), skill: 86, retainer: Math.round(9000 * scale / 100) * 100, perHearing: Math.round(3000 * scale / 100) * 100, blurb: 'The firm the big names use. Expensive, and it shows.' },
  ];
}

/** The other side's lawyer: richer, more famous people have better ones. */
export function opposingLawyer(fame: number, seed: number): { name: string; skill: number } {
  const skill = Math.round(Math.min(90, 30 + fame * 0.6 + ((seed % 17) - 8)));
  return { name: FIRMS[(seed * 7) % FIRMS.length], skill: Math.max(25, skill) };
}

// ─── COURTS AND DATES ──────────────────────────────────────────────────────

export function courtFor(city: string, claim: number): string {
  return claim >= 50_000 ? `High Court, ${city}` : `Circuit Court, ${city}`;
}

/** A court date: a weekday morning a couple of weeks out. */
export function nextCourtDate(nowMinute: number, minDays: number, seed: number): number {
  let day = Math.floor(nowMinute / 1440) + minDays;
  for (let i = 0; i < 7; i++) {
    const wd = new Date(day * 86400000).getUTCDay();
    if (wd >= 1 && wd <= 5) break;
    day += 1;
  }
  const slots = [9 * 60, 10 * 60 + 30, 13 * 60];
  return day * 1440 + slots[seed % slots.length];
}

// ─── THE OTHER SIDE ────────────────────────────────────────────────────────

export type Answer = 'pay' | 'settle' | 'fight' | 'ignore';

/** Served with your claim, what does the NPC do? */
export function npcAnswer(p: Persona, c: Pick<LegalCase, 'evidence' | 'claim'>, theirWealth: number, roll: number): Answer {
  const weak = c.evidence / 100; // how good the claim against them is
  const canPay = theirWealth >= c.claim;
  const pride = p.ego * 0.4 + p.litigious * 0.4;
  if (canPay && weak > 0.75 && roll < 0.35 + p.reliability * 0.3 - pride * 0.2) return 'pay';
  if (roll < 0.25 + (1 - pride) * 0.35 + (weak > 0.6 ? 0.15 : 0)) return 'settle';
  if (p.reliability < 0.35 && roll > 0.8) return 'ignore';
  return 'fight';
}

/** What they'd settle for (as plaintiff they ask; as defendant they offer). */
export function npcSettlement(c: Pick<LegalCase, 'evidence' | 'claim' | 'side'>, p: Persona, roll: number): number {
  const odds = c.evidence / 100;
  // As defendant, they offer what they expect to lose, shaded down; as
  // plaintiff they ask for what they expect to win, shaded up by ego.
  const base = c.side === 'plaintiff' ? c.claim * odds * (0.55 + roll * 0.25) : c.claim * odds * (0.75 + p.ego * 0.3 + roll * 0.2);
  return Math.max(100, Math.round(base / 50) * 50);
}

/** Does the NPC take the player's settlement offer? */
export function npcAcceptsOffer(c: Pick<LegalCase, 'evidence' | 'claim' | 'side'>, amount: number, p: Persona, roll: number): boolean {
  const fair = c.claim * (c.evidence / 100);
  // Player as plaintiff: they're paying `amount`; as defendant: player pays `amount`.
  const ratio = c.side === 'plaintiff' ? fair / Math.max(1, amount) : amount / Math.max(1, fair);
  const need = 0.9 + p.ego * 0.25 - p.forgiveness * 0.15;
  return ratio >= need - roll * 0.2;
}

// ─── THE VERDICT ───────────────────────────────────────────────────────────

export interface TrialInput {
  evidence: number;
  plaintiffLawyer: number;
  defendantLawyer: number;
  /** Testimony from the player: positive helps the player's side. */
  testimony: number;
  /** The player didn't turn up and had nobody there. */
  playerAbsent: boolean;
}

/** Chance the plaintiff wins. */
export function plaintiffOdds(t: TrialInput, playerSide: 'plaintiff' | 'defendant'): number {
  let p = 0.12 + (t.evidence / 100) * 0.76;
  p += (t.plaintiffLawyer - t.defendantLawyer) / 260;
  p += playerSide === 'plaintiff' ? t.testimony : -t.testimony;
  if (t.playerAbsent) p = playerSide === 'plaintiff' ? 0 : Math.max(p, 0.92);
  return Math.max(0.03, Math.min(0.97, p));
}

/** How the stand goes: charisma and discipline help, a hot temper doesn't. */
export function testimonyEffect(charisma: number, discipline: number, roll: number): { effect: number; text: string } {
  const score = charisma * 0.5 + discipline * 0.5 + (roll - 0.5) * 50;
  if (score >= 70) return { effect: 0.09, text: 'You were calm, clear and believable. The judge wrote it all down.' };
  if (score >= 48) return { effect: 0.03, text: 'You told your side. Nothing special, nothing damaging.' };
  return { effect: -0.07, text: 'Cross-examination got under your skin. You contradicted yourself once.' };
}

/** Damages when the plaintiff wins, and what the loser pays toward costs. */
export function judgment(claim: number, evidence: number, roll: number): { damages: number; costsShare: number } {
  const damages = Math.round((claim * (0.55 + (evidence / 100) * 0.3 + roll * 0.15)) / 50) * 50;
  return { damages: Math.min(claim, damages), costsShare: 0.6 };
}

/** Is this the kind of case the blogs pick up? */
export function newsworthy(fameA: number, fameB: number, claim: number): boolean {
  return Math.max(fameA, fameB) >= 30 || claim >= 100_000;
}

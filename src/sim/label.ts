// ─── YOUR OWN RECORD LABEL ─────────────────────────────────────────────────
//
// The player founds a label, scouts unsigned artists, negotiates deals, funds
// records, and lives off what those records actually earn on the streaming
// engine. Everything here is pure: no store, no clock, no React. Randomness is
// passed in as a roll (or derived from a hash of ids and days) so a test can
// pin an outcome.
//
// How the money works, like a real label:
//   · The label owns the master (except on a distribution deal) and receives
//     the gross. It pays the artist a royalty on that gross.
//   · Advances, recording and part of the marketing are RECOUPABLE: the
//     artist's royalty pays them back before the artist sees a cent.
//   · A 360 deal also takes a cut of the artist's touring and brand money.
//   · A distribution deal is cheap and friendly: the artist owns the master,
//     the label takes a fee and recoups only the advance.
//
// Nothing here quotes a real person. Replies are written from the artist's
// ARCHETYPE and attributed to "their camp".

import type {
  NPC,
  Genre,
  LabelTerms,
  LabelDealType,
  LabelSignee,
  LabelPitch,
  LabelProspect,
  LabelStaffRole,
  LabelReleaseTier,
  PlayerLabel,
  Archetype,
} from '../types/game';
import { hashString } from './rng';
import { archetypeOf, traitsOf, type Traits } from './offers';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

export const FOUNDING_COST = 25_000;
/** A label needs at least this much fame behind it before anyone takes the call. */
export const FOUNDING_MIN_FAME = 8;
export const PROSPECT_REFRESH_DAYS = 7;
export const PITCH_WINDOW_DAYS = 14;
export const RIVAL_WINDOW_DAYS = 10;
export const DEMAND_WINDOW_DAYS = 21;

export const LABEL_COLORS = ['#F5B301', '#E5484D', '#3E63DD', '#30A46C', '#8E4EC6', '#F76B15', '#12A594', '#E93D82'];

export const DEAL_INFO: Record<LabelDealType, { label: string; emoji: string; blurb: string; royaltyRange: [number, number] }> = {
  standard: {
    label: 'Standard record deal',
    emoji: '📀',
    blurb: 'You own the masters. Artist earns a royalty once advance, recording and half the marketing are paid back.',
    royaltyRange: [10, 40],
  },
  three_sixty: {
    label: '360 deal',
    emoji: '🔄',
    blurb: 'Like a standard deal, plus 20% of their touring and brand money. Artists hate signing these.',
    royaltyRange: [10, 35],
  },
  distribution: {
    label: 'Distribution deal',
    emoji: '🚚',
    blurb: 'They keep their masters and fund their own records. You take a fee and recoup only the advance.',
    royaltyRange: [60, 90],
  },
  joint_venture: {
    label: 'Joint venture',
    emoji: '🤝',
    blurb: 'Partners. You split the money down the middle and both carry the costs.',
    royaltyRange: [40, 60],
  },
};

export const DEAL_ORDER: LabelDealType[] = ['standard', 'three_sixty', 'joint_venture', 'distribution'];

/** How much of each kind of spend the artist's royalty has to pay back. */
export function recoupShare(deal: LabelDealType, kind: 'advance' | 'recording' | 'marketing'): number {
  if (kind === 'advance') return 1;
  if (deal === 'distribution') return 0;
  if (deal === 'joint_venture') return kind === 'recording' ? 1 : 0.5;
  return kind === 'recording' ? 1 : 0.5;
}

export const RELEASE_TIERS: Record<LabelReleaseTier, { label: string; cost: number; days: number; quality: number; marketing: number; blurb: string }> = {
  demo: { label: 'Quick single', cost: 4_000, days: 7, quality: 0, marketing: 600, blurb: 'Cheap room, one week, a little push.' },
  standard: { label: 'Proper single', cost: 15_000, days: 14, quality: 6, marketing: 2_500, blurb: 'Good producer, real mix, playlist pitching.' },
  major: { label: 'Big rollout', cost: 45_000, days: 21, quality: 12, marketing: 5_000, blurb: 'Top producer, video money, a full campaign.' },
};

export const STAFF_INFO: Record<LabelStaffRole, { title: string; emoji: string; from: NPC['role'][]; does: string }> = {
  ar: {
    title: 'Head of A&R',
    emoji: '🔍',
    from: ['ar', 'a_and_r_scout'],
    does: 'Finds more acts, further afield, estimates their ceiling and sharpens every record.',
  },
  marketing: {
    title: 'Marketing Director',
    emoji: '📣',
    from: ['publicist'],
    does: 'Every marketing dollar goes further. Artists feel looked after.',
  },
  radio: {
    title: 'Radio Plugger',
    emoji: '📻',
    from: ['promoter', 'dj'],
    does: 'Gets releases on air for free on top of the paid push. Lifts label reputation.',
  },
  legal: {
    title: 'Business Affairs',
    emoji: '⚖️',
    from: ['lawyer'],
    does: 'Reads what an artist really wants, spots poaching early, and cuts dispute settlements.',
  },
};

export const STAFF_ORDER: LabelStaffRole[] = ['ar', 'marketing', 'radio', 'legal'];

/** Fictional rival labels. Real labels are never used as poachers. */
export const RIVAL_LABELS = [
  'Northgate Music', 'Blue Harbour Records', 'Crown Avenue', 'Saltpond Sound', 'Eastline Recordings',
  'Golden Stool Music', 'Highrise Entertainment', 'Third Coast Records', 'Kilimanjaro Audio', 'Midnight Ferry',
  'Red Clay Records', 'Lagoon City Music', 'Sixty Nine Gold', 'Iron Bridge Records', 'Velvet Ledger',
];

// ─── SMALL HELPERS ─────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round = (n: number, step: number) => Math.round(n / step) * step;
/** A stable 0..1 number from any string. */
export function unit(seed: string): number {
  return (hashString(seed) % 10_000) / 10_000;
}

export function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

export function monthKeyOf(d: { year: number; month: number }): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}`;
}

/** How many artists the label can carry at once. */
export function rosterLimit(rep: number): number {
  return 3 + Math.floor(rep / 20);
}

export function startingReputation(playerFame: number, converted: boolean): number {
  return Math.round(clamp(8 + playerFame * 0.3 + (converted ? 15 : 0), 5, 60));
}

/** The most famous artist who will even take a meeting. */
export function fameCap(rep: number, playerFame: number): number {
  return Math.round(clamp(18 + rep * 0.7 + playerFame * 0.25, 20, 98));
}

/** Their ceiling. Stable per artist, always above where they are now. */
export function potentialOf(npc: Pick<NPC, 'id' | 'fame' | 'age'>): number {
  const r = unit(`potential|${npc.id}`);
  const youth = npc.age && npc.age < 24 ? 10 : npc.age && npc.age > 34 ? -8 : 0;
  const raw = 30 + r * 62 + youth;
  return Math.round(clamp(Math.max(raw, npc.fame + 6), 15, 99));
}

/** The A&R's guess. A better A&R guesses closer. */
export function potentialEstimate(potential: number, arSkill: number, npcId: string): number | undefined {
  if (arSkill <= 0) return undefined;
  const spread = (100 - arSkill) / 4; // skill 60 → ±10, skill 90 → ±2.5
  const err = (unit(`est|${npcId}`) - 0.5) * 2 * spread;
  return Math.round(clamp(potential + err, 5, 99));
}

export function staffSalary(skill: number): number {
  return round(800 + skill * skill * 0.6, 50);
}

export function staffSkill(staff: { role: LabelStaffRole; skill: number }[], role: LabelStaffRole): number {
  return staff.find((s) => s.role === role)?.skill ?? 0;
}

/** Office, accounting and admin, every month. */
export function overheadFor(label: Pick<PlayerLabel, 'reputation' | 'roster'>): number {
  const active = label.roster.filter((s) => s.status === 'active' || s.status === 'dispute' || s.status === 'expiring').length;
  return round(500 + label.reputation * 40 + active * 150, 10);
}

// ─── SCOUTING ──────────────────────────────────────────────────────────────

export function isSignable(npc: NPC, takenIds: Set<string>): boolean {
  if (npc.role !== 'artist') return false;
  if (takenIds.has(npc.id)) return false;
  if (npc.team?.label) return false;
  return true;
}

export function scoutNote(npc: NPC, potential: number, arSkill: number): string {
  const t = traitsOf(npc);
  const bits: string[] = [];
  if (npc.fame < 12) bits.push('Barely known outside their block.');
  else if (npc.fame < 30) bits.push('A local name with a real following.');
  else if (npc.fame < 55) bits.push('Known nationally. Other labels have called.');
  else bits.push('A genuine star without a label. Rare.');
  if (arSkill > 0) {
    if (potential - npc.fame >= 35) bits.push('A&R: "This one could go all the way."');
    else if (potential - npc.fame >= 18) bits.push('A&R: "Room to grow with the right push."');
    else bits.push('A&R: "What you see is roughly what you get."');
  }
  if (t.diva) bits.push('Ego to manage.');
  if (t.loyal) bits.push('Loyal once they trust you.');
  if (t.hustler) bits.push('Works hard, wants to be paid for it.');
  if (t.shark) bits.push('Reads every line of a contract.');
  return bits.join(' ');
}

/**
 * Pick who the label hears about this week.
 *
 * Home country and genre focus first; an A&R widens the net abroad and adds
 * names. Never anybody already signed, and never anybody too big to call back.
 */
export function pickProspects(
  npcs: NPC[],
  label: Pick<PlayerLabel, 'country' | 'genreFocus' | 'reputation' | 'roster' | 'pitches'>,
  playerFame: number,
  arSkill: number,
  serial: number,
): LabelProspect[] {
  const taken = new Set<string>([
    ...label.roster.filter((s) => s.status !== 'left' && s.status !== 'expired').map((s) => s.npcId),
    ...label.pitches.filter((p) => p.status === 'open').map((p) => p.npcId),
  ]);
  const cap = fameCap(label.reputation, playerFame);
  const abroad = arSkill >= 40;
  const want = 6 + Math.floor(arSkill / 20);

  const scored: { npc: NPC; score: number }[] = [];
  for (const npc of npcs) {
    if (!isSignable(npc, taken)) continue;
    if (npc.fame > cap || npc.fame < 2) continue;
    const home = npc.country === label.country;
    if (!home && !abroad) continue;
    let score = unit(`prospect|${npc.id}|${Math.floor(serial / PROSPECT_REFRESH_DAYS)}`);
    if (home) score += 0.6;
    if (label.genreFocus !== 'any' && npc.genre === label.genreFocus) score += 0.5;
    // Bias toward the top of what the label can reach — that is who A&Rs chase.
    score += (npc.fame / Math.max(1, cap)) * 0.4;
    scored.push({ npc, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, want).map(({ npc }) => {
    const pot = potentialOf(npc);
    return { npcId: npc.id, note: scoutNote(npc, pot, arSkill), potentialEstimate: potentialEstimate(pot, arSkill, npc.id) };
  });
}

// ─── WHAT THEY WANT ────────────────────────────────────────────────────────

/** The going royalty for an artist of this size on this kind of deal. */
export function fairRoyalty(deal: LabelDealType, fame: number): number {
  const f = clamp(fame, 0, 100);
  switch (deal) {
    case 'standard': return Math.round(14 + f * 0.18);
    case 'three_sixty': return Math.round(12 + f * 0.16);
    case 'joint_venture': return Math.round(45 + f * 0.08);
    case 'distribution': return Math.round(68 + f * 0.14);
  }
}

export function fairAdvance(deal: LabelDealType, fame: number): number {
  const base = 500 + fame * fame * 12;
  const mult = deal === 'distribution' ? 0.35 : deal === 'joint_venture' ? 0.7 : deal === 'three_sixty' ? 1.25 : 1;
  return round(base * mult, 250);
}

export interface WantsContext {
  labelRep: number;
  playerFame: number;
  relationship: number;
  competing: boolean;
}

/** What it would actually take. Never shown directly. */
export function wantsFor(npc: NPC, deal: LabelDealType, ctx: WantsContext): LabelTerms {
  const t = traitsOf(npc);
  const arche = archetypeOf(npc);
  // A label run by a star is worth something on its own — the "OVO effect".
  const appeal = clamp((ctx.labelRep + ctx.playerFame * 0.6) / 120, 0, 1);
  const warm = clamp(ctx.relationship / 100, -0.5, 1);
  const heat = ctx.competing ? 1.15 : 1;

  let royalty = fairRoyalty(deal, npc.fame);
  if (t.diva) royalty += 4;
  if (t.shark) royalty += 3;
  if (t.loyal && warm > 0.3) royalty -= 2;
  royalty = Math.round(royalty * (1.06 - appeal * 0.12 - warm * 0.05) * (ctx.competing ? 1.06 : 1));
  const [lo, hi] = DEAL_INFO[deal].royaltyRange;
  royalty = clamp(royalty, lo, hi);

  let advance = fairAdvance(deal, npc.fame);
  if (t.hustler) advance *= 1.3;
  if (t.generous || t.loyal) advance *= 0.85;
  advance *= (1.1 - appeal * 0.25 - warm * 0.1) * heat;

  return {
    dealType: deal,
    advance: round(Math.max(0, advance), 250),
    royalty,
    releasesOwed: t.shark || t.diva ? 3 : 5,
    termMonths: t.shark ? 24 : arche === 'business' ? 30 : 36,
    marketingCommit: round(Math.max(300, npc.fame * 55 * heat), 100),
    creativeControl: arche === 'creative' || t.diva,
  };
}

/** The label's opening offer: a little under what they want, the way labels open. */
export function openingOffer(wants: LabelTerms): LabelTerms {
  const [lo] = DEAL_INFO[wants.dealType].royaltyRange;
  return {
    ...wants,
    advance: round(wants.advance * 0.7, 250),
    royalty: Math.max(lo, wants.royalty - 3),
    releasesOwed: wants.releasesOwed + 1,
    termMonths: wants.termMonths + 12,
    marketingCommit: round(wants.marketingCommit * 0.7, 100),
    creativeControl: false,
  };
}

// ─── SCORING AN OFFER ──────────────────────────────────────────────────────

type TermKey = 'advance' | 'royalty' | 'releasesOwed' | 'termMonths' | 'marketingCommit' | 'creativeControl' | 'dealType';

const TERM_TEXT: Record<TermKey, string> = {
  advance: 'the advance',
  royalty: 'the royalty rate',
  releasesOwed: 'how many records they owe you',
  termMonths: 'how long they are tied to you',
  marketingCommit: 'the marketing commitment',
  creativeControl: 'creative control',
  dealType: 'the kind of deal',
};

/** How badly the artist dislikes each kind of deal relative to what was asked. */
function dealPenalty(asked: LabelDealType, wants: LabelDealType, t: Traits): number {
  if (asked === wants) return 0;
  if (asked === 'three_sixty') return t.shark || t.diva ? 0.3 : 0.18;
  if (asked === 'distribution' || asked === 'joint_venture') return -0.05; // friendlier
  return 0.06;
}

export function scoreOffer(npc: NPC, offer: LabelTerms, wants: LabelTerms): { score: number; worst: TermKey; gaps: Partial<Record<TermKey, number>> } {
  const t = traitsOf(npc);
  const arche = archetypeOf(npc);
  // What each kind of person cares about most.
  const w = {
    advance: arche === 'street' || t.hustler ? 1.3 : 1,
    royalty: arche === 'business' || t.shark ? 1.4 : 1.1,
    releasesOwed: 0.5,
    termMonths: t.shark ? 0.8 : 0.5,
    marketingCommit: arche === 'status' ? 0.9 : 0.6,
    creativeControl: arche === 'creative' ? 1.2 : t.diva ? 0.8 : 0.2,
  };

  const gaps: Partial<Record<TermKey, number>> = {};
  const short = (have: number, need: number) => (need <= 0 ? 0 : clamp((need - have) / need, -0.5, 1));
  gaps.advance = short(offer.advance, wants.advance) * w.advance;
  gaps.royalty = short(offer.royalty, wants.royalty) * 2.2 * w.royalty;
  gaps.releasesOwed = clamp((offer.releasesOwed - wants.releasesOwed) / 4, -0.3, 1) * w.releasesOwed;
  gaps.termMonths = clamp((offer.termMonths - wants.termMonths) / 36, -0.3, 1) * w.termMonths;
  gaps.marketingCommit = short(offer.marketingCommit, wants.marketingCommit) * w.marketingCommit;
  gaps.creativeControl = wants.creativeControl && !offer.creativeControl ? 0.35 * w.creativeControl : 0;
  gaps.dealType = dealPenalty(offer.dealType, wants.dealType, t);

  let total = 0;
  let worst: TermKey = 'royalty';
  let worstVal = -Infinity;
  for (const k of Object.keys(gaps) as TermKey[]) {
    const v = gaps[k] ?? 0;
    total += Math.max(v, -0.25); // generosity on one line helps, but only so much
    if (v > worstVal) { worstVal = v; worst = k; }
  }
  // 1.0 = exactly what they want. Above is better than they hoped.
  return { score: 1 - total * 0.55, worst, gaps };
}

// ─── THE NEGOTIATION ───────────────────────────────────────────────────────

export interface LabelNegotiationContext {
  labelRep: number;
  playerFame: number;
  relationship: number;
  /** -0.22 .. +0.18, from `MOOD_INFO`. */
  moodShift: number;
  legalSkill: number;
}

export interface LabelNegotiationResult {
  outcome: 'accepted' | 'countered' | 'refused' | 'walked';
  terms: LabelTerms;
  message: string;
  patience: number;
}

const CAMP: Record<Archetype, { yes: string[]; counter: string[]; no: string[]; walk: string[] }> = {
  business: {
    yes: ['Their camp sends the paperwork back signed. "Numbers work. Let\'s go."', 'Their lawyer confirms: they are in.'],
    counter: ['Their camp comes back with a marked-up sheet.', 'Their manager calls: "Close. Fix one thing and we sign."'],
    no: ['Their camp says the numbers do not work for them yet.', 'A short email: "Not at those terms."'],
    walk: ['Their camp stops answering. They have signed with somebody else.', 'Their lawyer closes the file. "We are going another way."'],
  },
  street: {
    yes: ['They pull up in person and shake on it. "Family now."', 'Their camp: "We riding with you."'],
    counter: ['Their people say they respect the move, but they need a little more.', '"Show us you really believe in us," their camp says.'],
    no: ['Their camp says it feels like a lowball.', '"That\'s not respect," their people say.'],
    walk: ['They feel disrespected and take the meeting elsewhere.', 'Their camp goes quiet, and they post a cryptic story about loyalty.'],
  },
  creative: {
    yes: ['Their camp says the vision lines up. They sign.', '"We trust you with the art," their people write back.'],
    counter: ['Their camp loves the vision but needs one change.', 'They want to talk about the work as much as the money.'],
    no: ['Their camp worries the label will not let them be themselves.', '"It doesn\'t feel right for the music," their people say.'],
    walk: ['They decide to stay independent for now.', 'Their camp thanks you, and declines. The art comes first.'],
  },
  status: {
    yes: ['Their camp agrees, as long as the announcement is big.', 'They sign, and their team is already planning the rollout photo.'],
    counter: ['Their camp says they deserve a bit more for someone at their level.', '"Make it make sense for our brand," their manager says.'],
    no: ['Their camp says the offer does not match their status.', 'Their manager calls it "a starter deal".'],
    walk: ['Their camp says they have bigger offers. They are gone.', 'They take a meeting with a bigger label and do not come back.'],
  },
};

function line(arr: string[], seed: string): string {
  return arr[hashString(seed) % arr.length];
}

/**
 * Put an offer in front of the artist.
 *
 * They accept anything at or above what they need (with some room for how much
 * they like the label, the player and today). A near miss gets a counter that
 * fixes the worst line. A long way off costs patience; run out and they walk.
 */
export function negotiateLabel(
  npc: NPC,
  pitch: Pick<LabelPitch, 'wants' | 'patience' | 'rounds' | 'id' | 'competing'>,
  offer: LabelTerms,
  ctx: LabelNegotiationContext,
  roll: number,
): LabelNegotiationResult {
  const arche = archetypeOf(npc);
  const { score, worst } = scoreOffer(npc, offer, pitch.wants);
  const appeal = clamp((ctx.labelRep + ctx.playerFame * 0.6) / 120, 0, 1);
  const tolerance = appeal * 0.08 + clamp(ctx.relationship, -50, 100) / 600 + ctx.moodShift * 0.4 + (roll - 0.5) * 0.06;
  const seed = `${pitch.id}|${pitch.rounds}`;

  if (score >= 1 - tolerance) {
    return { outcome: 'accepted', terms: offer, message: line(CAMP[arche].yes, seed), patience: pitch.patience };
  }

  if (score >= 0.78 - tolerance) {
    // Fix the worst line, halfway to what they want — and say which line it was.
    const fixed = { ...offer };
    const want = pitch.wants;
    switch (worst) {
      case 'advance': fixed.advance = round((offer.advance + want.advance) / 2 + want.advance * 0.05, 250); break;
      case 'royalty': fixed.royalty = Math.ceil((offer.royalty + want.royalty) / 2 + 1); break;
      case 'releasesOwed': fixed.releasesOwed = want.releasesOwed; break;
      case 'termMonths': fixed.termMonths = want.termMonths; break;
      case 'marketingCommit': fixed.marketingCommit = round((offer.marketingCommit + want.marketingCommit) / 2 + 100, 100); break;
      case 'creativeControl': fixed.creativeControl = true; break;
      case 'dealType': fixed.dealType = want.dealType; fixed.royalty = Math.max(fixed.royalty, want.royalty); break;
    }
    const lawyer = ctx.legalSkill >= 40 ? ` Your lawyer: "It's ${TERM_TEXT[worst]} they're stuck on."` : '';
    return {
      outcome: 'countered',
      terms: fixed,
      message: `${line(CAMP[arche].counter, seed)} They want to move ${TERM_TEXT[worst]}.${lawyer}`,
      patience: Math.max(0, pitch.patience - (pitch.rounds >= 3 ? 1 : 0)),
    };
  }

  const patience = pitch.patience - 1;
  if (patience <= 0) {
    return { outcome: 'walked', terms: offer, message: line(CAMP[arche].walk, seed), patience: 0 };
  }
  const hint = ctx.legalSkill >= 40 ? ` The real problem is ${TERM_TEXT[worst]}.` : '';
  return { outcome: 'refused', terms: offer, message: `${line(CAMP[arche].no, seed)}${hint}`, patience };
}

export function patienceFor(npc: NPC): number {
  const t = traitsOf(npc);
  return 3 + (t.loyal ? 1 : 0) + (t.generous ? 1 : 0) - (t.diva ? 1 : 0) - (t.petty ? 1 : 0) + (npc.fame < 20 ? 1 : 0);
}

/** What the lawyer can tell you about what they really want. */
export function lawyerRead(wants: LabelTerms, legalSkill: number): string[] {
  if (legalSkill < 25) return [];
  const out: string[] = [];
  out.push(`Royalty: they will want about ${legalSkill >= 60 ? wants.royalty : `${wants.royalty - 3}–${wants.royalty + 3}`}%.`);
  if (legalSkill >= 45) out.push(`Advance: somewhere near ${money(round(wants.advance, legalSkill >= 70 ? 250 : 5000))}.`);
  if (legalSkill >= 55) out.push(wants.creativeControl ? 'They will insist on creative control.' : 'Creative control is not a deal-breaker.');
  if (legalSkill >= 65) out.push(`They will not commit to more than ${wants.releasesOwed} releases or ${wants.termMonths} months.`);
  return out;
}

// ─── MONEY ─────────────────────────────────────────────────────────────────

/**
 * Split what a signee's records earned.
 *
 * The artist's royalty pays down the unrecouped balance first; only after that
 * does it reach the artist. The label keeps everything else.
 */
/** What the label's own distributor keeps before the label sees anything. */
export const DISTRIBUTOR_FEE = 0.15;

export function splitRevenue(signee: Pick<LabelSignee, 'terms' | 'recoupBalance'>, gross: number): { label: number; artist: number; recouped: number; distributor: number } {
  if (gross <= 0) return { label: 0, artist: 0, recouped: 0, distributor: 0 };
  const distributor = gross * DISTRIBUTOR_FEE;
  const net = gross - distributor;
  const share = net * (signee.terms.royalty / 100);
  const recouped = Math.min(share, Math.max(0, signee.recoupBalance));
  const artist = share - recouped;
  return { label: net - artist, artist, recouped, distributor };
}

/** 360 deals: 20% of what an artist that size earns on the road and in brand deals. */
export function threeSixtyMonthly(fame: number): number {
  return Math.round(fame * fame * 4 * 0.2);
}

export function releaseQuality(fame: number, tier: LabelReleaseTier, arSkill: number, roll: number): number {
  const base = fame * 0.55 + 30;
  const spread = (roll - 0.4) * 26;
  return Math.round(clamp(base + RELEASE_TIERS[tier].quality + arSkill / 20 + spread, 12, 99));
}

/** Marketing dollars after the marketing director has spent them. */
export function marketingEfficiency(marketingSkill: number): number {
  return 1 + marketingSkill / 150;
}

// ─── HOW THEY FEEL ─────────────────────────────────────────────────────────

export interface MonthContext {
  serial: number;
  labelRep: number;
  labelBroke: boolean;
  marketingSkill: number;
  /** The artist's royalty earned this month (paid or recouped). */
  monthArtistShare: number;
}

export function monthlyMood(npc: NPC | undefined, s: LabelSignee, ctx: MonthContext): { mood: number; loyalty: number; notes: string[] } {
  const notes: string[] = [];
  const t = npc ? traitsOf(npc) : ({} as Traits);
  // Feelings settle. A great month is not a permanent state, and neither is a
  // bad one — the extremes only hold while the label keeps causing them.
  let mood = s.mood + (58 - s.mood) * 0.15;
  const sinceRelease = ctx.serial - (s.lastReleaseSerial ?? s.signedSerial);

  if (sinceRelease <= 60) mood += 3;
  else if (sinceRelease > 120) { mood -= 6; notes.push('Feels shelved — nothing out in months.'); }
  if (s.requestSerial !== undefined && ctx.serial - s.requestSerial > 30) { mood -= 6; notes.push('Waiting on you to fund their record.'); }
  if (s.recoupBalance <= 0 && ctx.monthArtistShare > 0) { mood += 3; notes.push('Recouped and getting paid.'); }
  else if (s.recoupBalance > 0 && ctx.serial - s.signedSerial > 365) { mood -= 2; notes.push('A year in and still unrecouped.'); }
  if (s.demand) { mood -= 8; notes.push('Unanswered demand.'); }
  if (s.terms.creativeControl) mood += 1;
  else if (t.diva) mood -= 2;
  if (s.terms.dealType === 'three_sixty') mood -= 1;
  if (ctx.labelBroke) { mood -= 10; notes.push('The label is broke and they know it.'); }
  mood += (ctx.labelRep - 50) / 30 + ctx.marketingSkill / 80;
  mood += (unit(`mood|${s.npcId}|${ctx.serial}`) - 0.5) * 6;
  mood = clamp(Math.round(mood), 0, 100);

  let loyalty = s.loyalty + ((mood - 55) / 30) * (t.loyal ? 1.5 : 1) * (t.petty && mood < 40 ? 1.5 : 1);
  loyalty = clamp(Math.round(loyalty), 0, 100);
  return { mood, loyalty, notes };
}

/**
 * Monthly fame movement. Records move people; silence and a lack of push cost
 * them; nobody grows past their ceiling.
 */
export function monthlyFame(s: LabelSignee, ctx: { serial: number; labelRep: number; chartingSongs: number; bestWeekly: number }): number {
  const sinceRelease = ctx.serial - (s.lastReleaseSerial ?? s.signedSerial);
  let delta = 0;
  if (sinceRelease > 90) delta -= 0.6;
  if (ctx.chartingSongs > 0) delta += Math.min(1, 0.5 * ctx.chartingSongs);
  // A record beating what someone their size usually does lifts them; one
  // that underperforms costs them. Roughly: fame 30 ≈ 100K a week, fame 60 ≈
  // 3M a week on this streaming engine.
  if (ctx.bestWeekly > 0) delta += clamp(Math.log10(ctx.bestWeekly) - (3.5 + s.fame / 20), -0.6, 1.2) * 0.8;
  delta += (ctx.labelRep - 40) / 120;
  const room = (s.potential - s.fame) / Math.max(1, s.potential);
  if (delta > 0) delta *= clamp(room * 1.5, 0, 1);
  return clamp(s.fame + delta, 1, 100);
}

/** Fame bump on the day a record comes out. */
export function releaseFameBump(s: LabelSignee, quality: number, marketing: number): number {
  const room = clamp(((s.potential - s.fame) / Math.max(1, s.potential)) * 1.5, 0, 1);
  const raw = (quality - 55) / 30 + marketing / 6000;
  return raw > 0 ? raw * room : raw * 0.5;
}

/** Did success go to their head? */
export function maybeRaiseDemand(s: LabelSignee, serial: number): { royalty: number; bonus: number; text: string } | null {
  if (s.demand || s.status !== 'active') return null;
  if (s.fame < s.fameAtSigning + 12) return null;
  const fair = fairRoyalty(s.terms.dealType, s.fame);
  if (s.terms.royalty >= fair - 2) return null;
  if (unit(`demand|${s.npcId}|${Math.floor(serial / 30)}`) > 0.45) return null;
  const [, hi] = DEAL_INFO[s.terms.dealType].royaltyRange;
  const royalty = Math.min(hi, fair);
  const bonus = round(fairAdvance(s.terms.dealType, s.fame) * 0.35, 500);
  return {
    royalty,
    bonus,
    text: `They signed at ${s.fameAtSigning.toFixed(0)} fame and they are at ${s.fame.toFixed(0)} now. Their camp wants the royalty raised from ${s.terms.royalty}% to ${royalty}% — or a ${money(bonus)} bonus to keep things as they are.`,
  };
}

/**
 * A rival label comes knocking. Hotter and unhappier artists get more calls.
 * The buyout is what the rival will pay to take the contract off your hands.
 */
export function maybeRivalOffer(s: LabelSignee, serial: number, monthlyLabelTake: number, legalSkill: number): { labelName: string; royalty: number; buyout: number; window: number } | null {
  if (s.rivalOffer || s.status !== 'active' || s.fame < 30) return null;
  if (s.lastRivalSerial !== undefined && serial - s.lastRivalSerial < 120) return null;
  const chance = 0.02 + s.fame / 600 + (s.mood < 40 ? 0.08 : 0) - (s.loyalty > 75 ? 0.03 : 0);
  if (unit(`rival|${s.npcId}|${Math.floor(serial / 30)}`) > chance) return null;
  const monthsLeft = Math.max(1, Math.round((s.endsSerial - serial) / 30));
  const [, hi] = DEAL_INFO[s.terms.dealType].royaltyRange;
  const royalty = Math.min(hi, Math.max(s.terms.royalty + 4, fairRoyalty(s.terms.dealType, s.fame) + 3));
  const buyout = round(Math.max(monthlyLabelTake, threeSixtyMonthly(s.fame)) * monthsLeft * 0.9 + Math.max(0, s.recoupBalance), 1000);
  const labelName = RIVAL_LABELS[hashString(`rl|${s.npcId}|${serial}`) % RIVAL_LABELS.length];
  return { labelName, royalty, buyout: Math.max(5000, buyout), window: RIVAL_WINDOW_DAYS + (legalSkill >= 40 ? 7 : 0) };
}

/** Where the label's name is heading. Moves part of the way each month. */
export function reputationTarget(opts: { playerFame: number; topSigneeFames: number[]; chartingThisMonth: number; disputes: number; radioSkill: number; releasesThisMonth: number }): number {
  const top = [...opts.topSigneeFames].sort((a, b) => b - a).slice(0, 3);
  const avgTop = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  return clamp(
    10 + opts.playerFame * 0.25 + avgTop * 0.45 + opts.chartingThisMonth * 3 + opts.releasesThisMonth * 0.8 + opts.radioSkill / 20 - opts.disputes * 5,
    0,
    100,
  );
}

/** Settling a dispute: money that brings an artist back to the table. */
export function settlementCost(s: Pick<LabelSignee, 'fame' | 'terms'>, legalSkill: number): number {
  return round(fairAdvance(s.terms.dealType, s.fame) * 0.4 * (1 - legalSkill / 250), 500);
}

export function dropOptics(s: Pick<LabelSignee, 'fame' | 'mood'>): number {
  // Dropping somebody hot looks bad; dropping somebody nobody knows is invisible.
  return s.fame >= 40 ? -3 : s.fame >= 25 ? -1 : 0;
}

export function signeeLabel(s: Pick<LabelSignee, 'status'>): { text: string; tone: 'good' | 'bad' | 'neutral' } {
  switch (s.status) {
    case 'active': return { text: 'Active', tone: 'good' };
    case 'dispute': return { text: 'In dispute', tone: 'bad' };
    case 'expiring': return { text: 'Deal ending', tone: 'neutral' };
    case 'expired': return { text: 'Deal ended', tone: 'neutral' };
    case 'dropped': return { text: 'Dropped', tone: 'bad' };
    case 'sold': return { text: 'Contract sold', tone: 'neutral' };
    case 'left': return { text: 'Left the label', tone: 'bad' };
  }
}

export function moodWord(mood: number): string {
  if (mood >= 80) return 'Thriving';
  if (mood >= 60) return 'Happy';
  if (mood >= 40) return 'Okay';
  if (mood >= 20) return 'Frustrated';
  return 'Furious';
}

export type { Genre };

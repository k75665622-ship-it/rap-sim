// ─── YOUR OWN RECORD LABEL ─────────────────────────────────────────────────
//
// The player founds a label, scouts unsigned artists, negotiates deals, and
// lives off what the catalogue actually earns on the streaming engine.
// Everything here is pure: no store, no clock, no React. Randomness is passed
// in as a roll (or derived from a hash of ids and days) so a test can pin an
// outcome.
//
// How the money works, like a real label:
//   · The label owns the master (except on a distribution deal) and receives
//     the gross, minus its distributor's fee. It pays the artist a royalty.
//   · Advances, recording funds, recording and part of the marketing are
//     RECOUPABLE: the artist's royalty pays them back first.
//   · An ALL-IN deal hands the artist a recording fund. They pay for their own
//     sessions, videos, features and marketing out of it; the label just
//     approves what comes out and collects.
//   · A 360 deal also takes a cut of the artist's touring and merch money.
//   · Publishing share is extra income, and artists hate giving it up.
//
// How the work happens, like a real label:
//   Signed artists write on their own. Every few weeks they pitch a demo (or,
//   after a run of singles, an album). The label approves it with a budget,
//   sends it back for another pass, or shelves it. Ignore them and they get
//   restless; ignore them long enough and the song leaks. An artist with
//   creative control does not ask.
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
  LabelGear,
  LabelTactic,
  LabelStudio,
  LabelPolicy,
  LabelSubmission,
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
/** A demo nobody answers starts to sour after this, and leaks after LEAK_DAYS. */
export const SUBMISSION_PATIENCE_DAYS = 14;
export const LEAK_DAYS = 45;

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
    blurb: 'Like a standard deal, plus a share of their touring and merch. Artists hate signing these.',
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
export function recoupShare(deal: LabelDealType, kind: 'advance' | 'fund' | 'recording' | 'marketing' | 'video'): number {
  if (kind === 'advance' || kind === 'fund') return 1;
  if (deal === 'distribution') return 0;
  if (kind === 'recording') return 1;
  return 0.5;
}

export const RELEASE_TIERS: Record<LabelReleaseTier, { label: string; cost: number; days: number; quality: number; marketing: number; blurb: string }> = {
  demo: { label: 'Quick single', cost: 4_000, days: 7, quality: 0, marketing: 600, blurb: 'Cheap room, one week, a little push.' },
  standard: { label: 'Proper single', cost: 15_000, days: 14, quality: 6, marketing: 2_500, blurb: 'Good producer, real mix, playlist pitching.' },
  major: { label: 'Big rollout', cost: 45_000, days: 21, quality: 12, marketing: 5_000, blurb: 'Top producer, video money, a full campaign.' },
};

/** An album costs this many singles' worth of a tier, and takes this much longer. */
export const ALBUM_COST_MULT = 3.2;
export const ALBUM_DAYS_MULT = 2.5;

export const VIDEO_TIERS: { id: 'low' | 'mid' | 'high'; label: string; budget: number; days: number; blurb: string }[] = [
  { id: 'low', label: 'Street video', budget: 3_000, days: 5, blurb: 'One location, a friend with a good camera.' },
  { id: 'mid', label: 'Proper video', budget: 15_000, days: 10, blurb: 'A real director, a crew, two locations.' },
  { id: 'high', label: 'Big-budget video', budget: 60_000, days: 18, blurb: 'Cinematic. Sets, cameos, a premiere.' },
];

export const STAFF_INFO: Record<LabelStaffRole, { title: string; emoji: string; from: NPC['role'][]; does: string }> = {
  ar: {
    title: 'Head of A&R',
    emoji: '🔍',
    from: ['ar', 'a_and_r_scout'],
    does: 'Finds more acts, further afield, reads demos accurately and sharpens every record.',
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
  producer: {
    title: 'In-house Producer',
    emoji: '🎛️',
    from: ['producer'],
    does: 'Produces the roster\'s records. Better beats, better songs.',
  },
  engineer: {
    title: 'Studio Engineer',
    emoji: '🎚️',
    from: ['engineer'],
    does: 'Runs your studio. Faster sessions and a cleaner mix — needs a studio to work in.',
  },
};

export const STAFF_ORDER: LabelStaffRole[] = ['ar', 'producer', 'engineer', 'marketing', 'radio', 'legal'];

/** Fictional rival labels. Real labels are never used as poachers. */
export const RIVAL_LABELS = [
  'Northgate Music', 'Blue Harbour Records', 'Crown Avenue', 'Saltpond Sound', 'Eastline Recordings',
  'Golden Stool Music', 'Highrise Entertainment', 'Third Coast Records', 'Kilimanjaro Audio', 'Midnight Ferry',
  'Red Clay Records', 'Lagoon City Music', 'Sixty Nine Gold', 'Iron Bridge Records', 'Velvet Ledger',
];

// ─── THE LABEL'S OWN STUDIO ────────────────────────────────────────────────

export const STUDIO_TIERS: { name: string; cost: number; upkeep: number; costCut: number; quality: number; rent: number; blurb: string }[] = [
  { name: 'No studio', cost: 0, upkeep: 0, costCut: 0, quality: 0, rent: 0, blurb: 'Every session is booked in somebody else\'s room at full price.' },
  { name: 'Home setup', cost: 15_000, upkeep: 300, costCut: 0.15, quality: 1, rent: 0, blurb: 'A treated bedroom, a decent mic, a laptop. Saves money on demos.' },
  { name: 'Project studio', cost: 60_000, upkeep: 1_200, costCut: 0.3, quality: 2, rent: 2_500, blurb: 'A real control room and a booth. Other artists will pay to use it.' },
  { name: 'Professional studio', cost: 180_000, upkeep: 3_500, costCut: 0.45, quality: 4, rent: 9_000, blurb: 'Two rooms, proper acoustics, a reputation in the city.' },
  { name: 'Flagship complex', cost: 450_000, upkeep: 8_000, costCut: 0.6, quality: 6, rent: 26_000, blurb: 'The room everyone wants. Big names book it months out.' },
];

export const GEAR_INFO: Record<LabelGear, { label: string; emoji: string; costs: [number, number, number]; does: string; quality: number; days: number }> = {
  booth: { label: 'Vocal booth', emoji: '🎤', costs: [6_000, 18_000, 45_000], does: 'Cleaner vocals.', quality: 0.6, days: 0 },
  console: { label: 'Console & monitors', emoji: '🎛️', costs: [10_000, 30_000, 80_000], does: 'Mixes that translate everywhere.', quality: 0.7, days: 0.04 },
  mics: { label: 'Mic locker', emoji: '🎙️', costs: [5_000, 15_000, 40_000], does: 'The right mic for every voice.', quality: 0.5, days: 0 },
  live_room: { label: 'Live room', emoji: '🥁', costs: [12_000, 35_000, 90_000], does: 'Real instruments, real players.', quality: 0.6, days: 0.03 },
  mastering: { label: 'Mastering suite', emoji: '💿', costs: [8_000, 25_000, 60_000], does: 'Loud, polished, playlist-ready. Faster turnaround.', quality: 0.5, days: 0.06 },
};
export const GEAR_ORDER: LabelGear[] = ['booth', 'mics', 'console', 'live_room', 'mastering'];

export function emptyStudio(): LabelStudio {
  return { tier: 0, gear: { booth: 0, console: 0, mics: 0, live_room: 0, mastering: 0 }, busyDays: 0 };
}

/** Gear can only go as far as the building: a home setup has no live room. */
export function gearCap(tier: number): number {
  return tier <= 0 ? 0 : tier === 1 ? 1 : tier === 2 ? 2 : 3;
}

export function studioEffects(studio: LabelStudio, staff: { role: LabelStaffRole; skill: number }[]) {
  const t = STUDIO_TIERS[Math.max(0, Math.min(4, studio.tier))];
  let quality = t.quality;
  let daysCut = 0;
  for (const g of GEAR_ORDER) {
    const lvl = Math.min(studio.gear[g] ?? 0, gearCap(studio.tier));
    quality += GEAR_INFO[g].quality * lvl;
    daysCut += GEAR_INFO[g].days * lvl;
  }
  const engineer = studio.tier > 0 ? staffSkill(staff, 'engineer') : 0;
  const producer = staffSkill(staff, 'producer');
  quality += engineer / 30 + producer / 16;
  daysCut += engineer / 400;
  const gearSum = GEAR_ORDER.reduce((a, g) => a + (studio.gear[g] ?? 0), 0);
  return {
    quality: Math.round(quality * 10) / 10,
    costMult: 1 - t.costCut,
    daysMult: Math.max(0.55, 1 - daysCut),
    upkeep: t.upkeep + gearSum * 120,
    rentBase: t.rent * (1 + gearSum / 15),
  };
}

/** Rent from other artists, paid only for the days your own roster was not in. */
export function studioRent(studio: LabelStudio, reputation: number): number {
  const base = studioEffects(studio, []).rentBase;
  if (base <= 0) return 0;
  const idle = Math.max(0, 1 - studio.busyDays / 30);
  return Math.round(base * (0.5 + reputation / 200) * idle);
}

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

export const DEFAULT_POLICY: LabelPolicy = { approve: 'manual', threshold: 60, tier: 'ask', videos: 'manual' };

/** Fill in anything an older save did not have. */
export function normalizeTerms(t: Partial<LabelTerms>): LabelTerms {
  return {
    dealType: t.dealType ?? 'standard',
    advance: t.advance ?? 0,
    royalty: t.royalty ?? 20,
    releasesOwed: t.releasesOwed ?? 5,
    albumsOwed: t.albumsOwed ?? 1,
    termMonths: t.termMonths ?? 36,
    optionYears: t.optionYears ?? 0,
    marketingCommit: t.marketingCommit ?? 1_000,
    videoBudget: t.videoBudget ?? 0,
    creativeControl: t.creativeControl ?? false,
    allIn: t.allIn ?? false,
    recordingFund: t.recordingFund ?? 0,
    signingBonus: t.signingBonus ?? 0,
    publishingShare: t.publishingShare ?? 0,
    touringShare: t.touringShare ?? (t.dealType === 'three_sixty' ? 20 : 0),
  };
}

/** What signing costs the label on the day. */
export function signingCost(t: LabelTerms): number {
  return t.advance + t.signingBonus + (t.allIn ? t.recordingFund : 0);
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

/** What an all-in fund needs to be for an artist this size to make a term's worth of music. */
export function fairFund(fame: number, releasesOwed: number, albumsOwed: number): number {
  const perSingle = 4_000 + fame * 300; // their sessions, a video, some marketing
  return round(perSingle * (releasesOwed + albumsOwed * ALBUM_COST_MULT), 1000);
}

export interface WantsContext {
  labelRep: number;
  playerFame: number;
  relationship: number;
  competing: boolean;
  allIn: boolean;
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
  if (ctx.allIn) royalty += 3; // carrying their own costs earns a better rate
  royalty = Math.round(royalty * (1.06 - appeal * 0.12 - warm * 0.05) * (ctx.competing ? 1.06 : 1));
  const [lo, hi] = DEAL_INFO[deal].royaltyRange;
  royalty = clamp(royalty, lo, hi);

  let advance = fairAdvance(deal, npc.fame);
  if (t.hustler) advance *= 1.3;
  if (t.generous || t.loyal) advance *= 0.85;
  advance *= (1.1 - appeal * 0.25 - warm * 0.1) * heat;
  if (ctx.allIn) advance *= 0.5; // the fund is most of the money

  const releasesOwed = t.shark || t.diva ? 3 : 5;
  const albumsOwed = t.shark ? 1 : 2;
  const fund = ctx.allIn ? fairFund(npc.fame, releasesOwed, albumsOwed) * heat * (t.hustler ? 1.15 : 1) : 0;

  return {
    dealType: deal,
    advance: round(Math.max(0, advance), 250),
    royalty,
    releasesOwed,
    albumsOwed,
    termMonths: t.shark ? 24 : arche === 'business' ? 30 : 36,
    optionYears: t.shark ? 0 : t.loyal ? 2 : 1,
    marketingCommit: ctx.allIn ? 0 : round(Math.max(300, npc.fame * 55 * heat), 100),
    videoBudget: ctx.allIn ? 0 : arche === 'status' || t.diva ? round(npc.fame * 220, 500) : 0,
    creativeControl: arche === 'creative' || t.diva,
    allIn: ctx.allIn,
    recordingFund: round(fund, 1000),
    signingBonus: arche === 'status' || t.hustler ? round(npc.fame * npc.fame * 3, 500) : 0,
    // The most they will give up.
    publishingShare: t.shark || arche === 'business' ? 0 : t.generous || t.loyal ? 25 : 10,
    touringShare: deal === 'three_sixty' ? (t.shark ? 10 : 20) : 0,
  };
}

/** The label's opening offer: a little under what they want, the way labels open. */
export function openingOffer(wants: LabelTerms): LabelTerms {
  const [lo] = DEAL_INFO[wants.dealType].royaltyRange;
  // A real label's first draft: a bit light on money, a bit long, and it
  // asks for a slice of publishing. Never an insult — that is the player's call.
  return {
    ...wants,
    advance: round(wants.advance * 0.8, 250),
    royalty: Math.max(lo, wants.royalty - 2),
    termMonths: wants.termMonths + 6,
    marketingCommit: round(wants.marketingCommit * 0.8, 100),
    videoBudget: round(wants.videoBudget * 0.5, 500),
    creativeControl: false,
    recordingFund: round(wants.recordingFund * 0.85, 1000),
    signingBonus: round(wants.signingBonus * 0.5, 500),
    publishingShare: Math.min(50, wants.publishingShare + 5),
    touringShare: wants.dealType === 'three_sixty' ? Math.min(35, wants.touringShare + 5) : 0,
  };
}

// ─── SCORING AN OFFER ──────────────────────────────────────────────────────

export type TermKey =
  | 'advance' | 'royalty' | 'releasesOwed' | 'albumsOwed' | 'termMonths' | 'optionYears'
  | 'marketingCommit' | 'videoBudget' | 'creativeControl' | 'dealType' | 'recordingFund'
  | 'signingBonus' | 'publishingShare' | 'touringShare';

export const TERM_TEXT: Record<TermKey, string> = {
  advance: 'the advance',
  royalty: 'the royalty rate',
  releasesOwed: 'how many singles they owe you',
  albumsOwed: 'how many albums they owe you',
  termMonths: 'how long they are tied to you',
  optionYears: 'the option years',
  marketingCommit: 'the marketing commitment',
  videoBudget: 'the video budget',
  creativeControl: 'creative control',
  dealType: 'the kind of deal',
  recordingFund: 'the size of the recording fund',
  signingBonus: 'a signing bonus',
  publishingShare: 'giving up publishing',
  touringShare: 'the touring cut',
};

/** How badly the artist dislikes each kind of deal relative to what was asked. */
function dealPenalty(asked: LabelDealType, wants: LabelDealType, t: Traits): number {
  if (asked === wants) return 0;
  if (asked === 'three_sixty') return t.shark || t.diva ? 0.3 : 0.18;
  if (asked === 'distribution' || asked === 'joint_venture') return -0.05; // friendlier
  return 0.06;
}

export function scoreOffer(npc: NPC, offerIn: LabelTerms, wantsIn: LabelTerms): { score: number; worst: TermKey; gaps: Partial<Record<TermKey, number>> } {
  const offer = normalizeTerms(offerIn);
  const wants = normalizeTerms(wantsIn);
  const t = traitsOf(npc);
  const arche = archetypeOf(npc);
  // What each kind of person cares about most.
  const w = {
    advance: arche === 'street' || t.hustler ? 1.3 : 1,
    royalty: arche === 'business' || t.shark ? 1.4 : 1.1,
    releasesOwed: 0.5,
    albumsOwed: 0.45,
    termMonths: t.shark ? 0.8 : 0.5,
    optionYears: t.shark ? 0.6 : 0.3,
    marketingCommit: arche === 'status' ? 0.9 : 0.6,
    videoBudget: arche === 'status' || t.diva ? 0.7 : 0.25,
    creativeControl: arche === 'creative' ? 1.2 : t.diva ? 0.8 : 0.2,
    recordingFund: 1.2,
    signingBonus: arche === 'status' || t.hustler ? 0.6 : 0.2,
    publishingShare: arche === 'business' || t.shark ? 1.1 : 0.6,
    touringShare: 0.8,
  };

  const gaps: Partial<Record<TermKey, number>> = {};
  const short = (have: number, need: number) => (need <= 0 ? (have > 0 ? -0.2 : 0) : clamp((need - have) / need, -0.5, 1));
  gaps.advance = short(offer.advance, wants.advance) * w.advance;
  gaps.royalty = short(offer.royalty, wants.royalty) * 2.2 * w.royalty;
  gaps.releasesOwed = clamp((offer.releasesOwed - wants.releasesOwed) / 4, -0.3, 1) * w.releasesOwed;
  gaps.albumsOwed = clamp((offer.albumsOwed - wants.albumsOwed) / 2, -0.3, 1) * w.albumsOwed;
  gaps.termMonths = clamp((offer.termMonths - wants.termMonths) / 36, -0.3, 1) * w.termMonths;
  gaps.optionYears = clamp((offer.optionYears - wants.optionYears) / 2, -0.2, 1) * w.optionYears;
  gaps.marketingCommit = short(offer.marketingCommit, wants.marketingCommit) * w.marketingCommit;
  gaps.videoBudget = wants.videoBudget > 0 ? short(offer.videoBudget, wants.videoBudget) * w.videoBudget : offer.videoBudget > 0 ? -0.05 : 0;
  gaps.creativeControl = wants.creativeControl && !offer.creativeControl ? 0.35 * w.creativeControl : 0;
  gaps.dealType = dealPenalty(offer.dealType, wants.dealType, t);
  // All-in: a fund too small to make the records is a non-starter; no fund at
  // all on an all-in deal is an insult. On a label-funded deal it is a bonus.
  if (offer.allIn) {
    gaps.recordingFund = (wants.recordingFund > 0 ? short(offer.recordingFund, wants.recordingFund) : 0) * w.recordingFund;
  } else {
    gaps.recordingFund = wants.allIn ? 0.25 : 0;
  }
  gaps.signingBonus = wants.signingBonus > 0 ? short(offer.signingBonus, wants.signingBonus) * w.signingBonus : offer.signingBonus > 0 ? -Math.min(0.2, offer.signingBonus / Math.max(1, wants.advance + 5000)) : 0;
  gaps.publishingShare = clamp((offer.publishingShare - wants.publishingShare) / 25, -0.2, 1) * w.publishingShare;
  gaps.touringShare = offer.dealType === 'three_sixty' ? clamp((offer.touringShare - wants.touringShare) / 20, -0.2, 1) * w.touringShare : 0;

  let total = 0;
  let worst: TermKey = 'royalty';
  let worstVal = -Infinity;
  for (const k of Object.keys(gaps) as TermKey[]) {
    const v = gaps[k] ?? 0;
    total += Math.max(v, -0.25); // generosity on one line helps, but only so much
    if (v > worstVal) { worstVal = v; worst = k; }
  }
  // 1.0 = exactly what they want. Above is better than they hoped.
  return { score: 1 - total * 0.25, worst, gaps };
}

/** Plain-language temperature for the UI. */
export function temperature(score: number): { label: string; tone: 'good' | 'neutral' | 'bad' } {
  if (score >= 1) return { label: 'Ready to sign', tone: 'good' };
  if (score >= 0.9) return { label: 'Warm — close', tone: 'good' };
  if (score >= 0.75) return { label: 'Lukewarm', tone: 'neutral' };
  if (score >= 0.55) return { label: 'Cold', tone: 'bad' };
  return { label: 'Insulted', tone: 'bad' };
}

// ─── THE NEGOTIATION ───────────────────────────────────────────────────────

export interface LabelNegotiationContext {
  labelRep: number;
  playerFame: number;
  relationship: number;
  /** -0.22 .. +0.18, from `MOOD_INFO`. */
  moodShift: number;
  legalSkill: number;
  /** The player's own business sense and manager, 0-100. */
  negotiator: number;
}

export interface LabelNegotiationResult {
  outcome: 'accepted' | 'countered' | 'refused' | 'walked';
  terms: LabelTerms;
  message: string;
  patience: number;
  revealed?: string;
}

const CAMP: Record<Archetype, { yes: string[]; counter: string[]; no: string[]; walk: string[] }> = {
  business: {
    yes: ['Their camp sends the paperwork back signed. "Numbers work. Let\'s go."', 'Their lawyer confirms: they are in.'],
    counter: ['Their camp comes back with a marked-up sheet.', 'Their manager calls: "Close. Fix these and we sign."'],
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
    counter: ['Their camp loves the vision but needs a couple of changes.', 'They want to talk about the work as much as the money.'],
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

/** Move one term halfway (or all the way) to what they want. */
function fixTerm(offer: LabelTerms, want: LabelTerms, key: TermKey): void {
  switch (key) {
    case 'advance': offer.advance = round((offer.advance + want.advance) / 2 + want.advance * 0.05, 250); break;
    case 'royalty': offer.royalty = Math.ceil((offer.royalty + want.royalty) / 2 + 1); break;
    case 'releasesOwed': offer.releasesOwed = want.releasesOwed; break;
    case 'albumsOwed': offer.albumsOwed = want.albumsOwed; break;
    case 'termMonths': offer.termMonths = want.termMonths; break;
    case 'optionYears': offer.optionYears = want.optionYears; break;
    case 'marketingCommit': offer.marketingCommit = round((offer.marketingCommit + want.marketingCommit) / 2 + 100, 100); break;
    case 'videoBudget': offer.videoBudget = want.videoBudget; break;
    case 'creativeControl': offer.creativeControl = true; break;
    case 'dealType': offer.dealType = want.dealType; offer.royalty = Math.max(offer.royalty, want.royalty); break;
    case 'recordingFund': offer.allIn = true; offer.recordingFund = round(Math.max(offer.recordingFund, (offer.recordingFund + want.recordingFund) / 2 + want.recordingFund * 0.1), 1000); break;
    case 'signingBonus': offer.signingBonus = want.signingBonus; break;
    case 'publishingShare': offer.publishingShare = want.publishingShare; break;
    case 'touringShare': offer.touringShare = want.touringShare; break;
  }
}

/** What their camp asks for out loud when they counter. */
function demandLine(key: TermKey, want: LabelTerms): string {
  switch (key) {
    case 'advance': return `an advance closer to ${money(want.advance)}`;
    case 'royalty': return `a royalty around ${want.royalty}%`;
    case 'releasesOwed': return `no more than ${want.releasesOwed} singles`;
    case 'albumsOwed': return `no more than ${want.albumsOwed} album${want.albumsOwed === 1 ? '' : 's'}`;
    case 'termMonths': return `a ${want.termMonths}-month term`;
    case 'optionYears': return want.optionYears === 0 ? 'no option years' : `at most ${want.optionYears} option year${want.optionYears === 1 ? '' : 's'}`;
    case 'marketingCommit': return `about ${money(want.marketingCommit)} of marketing per release`;
    case 'videoBudget': return `${money(want.videoBudget)} per video`;
    case 'creativeControl': return 'creative control';
    case 'dealType': return `a ${DEAL_INFO[want.dealType].label.toLowerCase()}`;
    case 'recordingFund': return `a recording fund near ${money(want.recordingFund)}`;
    case 'signingBonus': return `a ${money(want.signingBonus)} signing bonus`;
    case 'publishingShare': return want.publishingShare === 0 ? 'to keep all their publishing' : `to give up no more than ${want.publishingShare}% of publishing`;
    case 'touringShare': return `a touring cut no higher than ${want.touringShare}%`;
  }
}

/** Negotiating leverage: who needs whom more. Shown as a bar. */
export function leverage(ctx: Pick<LabelNegotiationContext, 'labelRep' | 'playerFame' | 'negotiator' | 'relationship'>, npcFame: number, competing: boolean): number {
  const ours = ctx.labelRep * 0.45 + ctx.playerFame * 0.35 + ctx.negotiator * 0.25 + clamp(ctx.relationship, -50, 100) * 0.15;
  const theirs = npcFame * 0.9 + (competing ? 18 : 0);
  return Math.round(clamp(50 + (ours - theirs) * 0.8, 0, 100));
}

/**
 * Put an offer in front of the artist.
 *
 * They accept anything at or above what they need (with some room for how much
 * they like the label, the player, your table manner and today). A near miss
 * gets a counter that fixes the lines that bother them most and names what
 * they want. A long way off costs patience; run out and they walk.
 */
export function negotiateLabel(
  npc: NPC,
  pitch: Pick<LabelPitch, 'wants' | 'patience' | 'rounds' | 'id' | 'competing' | 'warmth'>,
  offerIn: LabelTerms,
  ctx: LabelNegotiationContext,
  roll: number,
): LabelNegotiationResult {
  const offer = normalizeTerms(offerIn);
  const want = normalizeTerms(pitch.wants);
  const arche = archetypeOf(npc);
  const { score, gaps } = scoreOffer(npc, offer, want);
  const appeal = clamp((ctx.labelRep + ctx.playerFame * 0.6) / 120, 0, 1);
  const tolerance =
    appeal * 0.08 +
    clamp(ctx.relationship, -50, 100) / 600 +
    ctx.moodShift * 0.4 +
    ctx.negotiator / 1000 +
    (pitch.warmth ?? 0) +
    (roll - 0.5) * 0.06;
  const seed = `${pitch.id}|${pitch.rounds}`;

  if (score >= 1 - tolerance) {
    return { outcome: 'accepted', terms: offer, message: line(CAMP[arche].yes, seed), patience: pitch.patience };
  }

  // The lines that bother them, worst first.
  const sore = (Object.keys(gaps) as TermKey[])
    .filter((k) => (gaps[k] ?? 0) > 0.02)
    .sort((a, b) => (gaps[b] ?? 0) - (gaps[a] ?? 0));

  if (score >= 0.78 - tolerance && sore.length) {
    const fixed = { ...offer };
    const touch = sore.slice(0, score >= 0.9 - tolerance ? 1 : 2);
    for (const k of touch) fixTerm(fixed, want, k);
    const asks = touch.map((k) => demandLine(k, want)).join(' and ');
    const lawyer = ctx.legalSkill >= 40 && sore.length > touch.length ? ` Your lawyer: "They'll also push on ${TERM_TEXT[sore[touch.length]]} later."` : '';
    return {
      outcome: 'countered',
      terms: fixed,
      message: `${line(CAMP[arche].counter, seed)} They want ${asks}.${lawyer}`,
      patience: Math.max(0, pitch.patience - (pitch.rounds >= 3 ? 1 : 0)),
      revealed: touch.map((k) => demandLine(k, want)).join('; '),
    };
  }

  const patience = pitch.patience - (score < 0.55 ? 2 : 1);
  if (patience <= 0) {
    return { outcome: 'walked', terms: offer, message: line(CAMP[arche].walk, seed), patience: 0 };
  }
  const worst = sore[0] ?? 'royalty';
  const hint = ctx.legalSkill >= 40 ? ` The real problem is ${TERM_TEXT[worst]}.` : '';
  const insult = score < 0.55 ? ' They took it as an insult.' : '';
  return { outcome: 'refused', terms: offer, message: `${line(CAMP[arche].no, seed)}${insult}${hint}`, patience };
}

export function patienceFor(npc: NPC): number {
  const t = traitsOf(npc);
  return 3 + (t.loyal ? 1 : 0) + (t.generous ? 1 : 0) - (t.diva ? 1 : 0) - (t.petty ? 1 : 0) + (npc.fame < 20 ? 1 : 0);
}

// ─── TABLE TACTICS ─────────────────────────────────────────────────────────

export const TACTIC_INFO: Record<LabelTactic, { label: string; emoji: string; blurb: string }> = {
  vision: { label: 'Pitch your vision', emoji: '🎨', blurb: 'Tell them exactly what you will build for them. Creative and status types listen; business types want numbers.' },
  personal: { label: 'Meet in person', emoji: '🤝', blurb: 'Dinner, the studio, your world. Costs a day of your energy. Works on people who care who you are.' },
  ask: { label: 'Ask what they need', emoji: '❓', blurb: 'Their camp names their biggest sticking point. Costs a little patience unless you have a lawyer.' },
  hardball: { label: 'Play hardball', emoji: '🧊', blurb: '"This is the best you\'ll get." Works when you hold the leverage. Burns patience when you don\'t.' },
  deadline: { label: 'Exploding offer', emoji: '⏳', blurb: 'Sign today or it\'s gone. They decide on the spot — yes, or they walk.' },
};

export interface TacticResult {
  ok: boolean;
  message: string;
  warmth: number;
  patience: number;
  /** Set when the tactic ended the talks one way or the other. */
  outcome?: 'accepted' | 'walked';
  revealed?: string;
  /** For `hardball`: they gave ground on this term. */
  concede?: TermKey;
}

export function applyTactic(
  npc: NPC,
  pitch: Pick<LabelPitch, 'wants' | 'terms' | 'patience' | 'warmth' | 'competing' | 'usedTactics'>,
  tactic: LabelTactic,
  ctx: LabelNegotiationContext,
  roll: number,
): TacticResult {
  const arche = archetypeOf(npc);
  const t = traitsOf(npc);
  const warmth = pitch.warmth ?? 0;
  const lev = leverage(ctx, npc.fame, !!pitch.competing);
  const { score, gaps } = scoreOffer(npc, pitch.terms, pitch.wants);
  const sore = (Object.keys(gaps) as TermKey[]).filter((k) => (gaps[k] ?? 0) > 0.02).sort((a, b) => (gaps[b] ?? 0) - (gaps[a] ?? 0));

  switch (tactic) {
    case 'vision': {
      const lands = arche === 'creative' || arche === 'status' || (arche === 'street' && ctx.relationship >= 30);
      if (lands) return { ok: true, message: 'They lean in. For the first time, they can see it. Their camp softens.', warmth: warmth + 0.06, patience: pitch.patience };
      return { ok: false, message: arche === 'business' ? '"Lovely speech. What are the numbers?" Nothing moves.' : 'They nod politely. It did not land.', warmth, patience: pitch.patience };
    }
    case 'personal': {
      const fan = ctx.playerFame >= npc.fame;
      const lands = fan || ctx.relationship >= 20 || t.loyal;
      if (lands) return { ok: true, message: fan ? 'They grew up on your music. The dinner runs three hours.' : 'Good night. You actually get along.', warmth: warmth + 0.07, patience: pitch.patience + (t.loyal ? 1 : 0) };
      return { ok: false, message: 'Awkward dinner. They checked their phone a lot.', warmth: warmth + 0.01, patience: pitch.patience };
    }
    case 'ask': {
      const k = sore[0];
      const cost = ctx.legalSkill >= 30 ? 0 : 1;
      if (!k) return { ok: true, message: 'Their camp: "Honestly? Nothing. Send it over and we sign."', warmth, patience: pitch.patience - cost };
      const ask = demandLine(k, normalizeTerms(pitch.wants));
      return { ok: true, message: `Their manager is straight with you: they need ${ask}.`, warmth, patience: pitch.patience - cost, revealed: ask };
    }
    case 'hardball': {
      const edge = lev / 100 + (score - 0.85) + (roll - 0.5) * 0.3 - (t.diva || t.petty ? 0.15 : 0);
      if (edge > 0.55 && sore.length) return { ok: true, message: 'They blink. Their camp drops one of their asks.', warmth, patience: pitch.patience - 1, concede: sore[sore.length - 1] };
      if (edge > 0.35) return { ok: false, message: 'They don\'t move, but they stay at the table.', warmth: warmth - 0.02, patience: pitch.patience - 1 };
      const left = pitch.patience - 2;
      return left <= 0
        ? { ok: false, message: 'They call your bluff and walk out.', warmth, patience: 0, outcome: 'walked' }
        : { ok: false, message: 'Bad move. Their camp is offended.', warmth: warmth - 0.05, patience: left };
    }
    case 'deadline': {
      const tolerance = warmth + ctx.moodShift * 0.4 + clamp(ctx.relationship, -50, 100) / 600 + (lev - 50) / 500;
      const p = 1 / (1 + Math.exp(-(score - 0.93 + tolerance) * 14));
      if (roll < p) return { ok: true, message: 'Long pause. Then: "Send the contract."', warmth, patience: pitch.patience, outcome: 'accepted' };
      return { ok: false, message: 'They don\'t like being rushed. They walk.', warmth, patience: 0, outcome: 'walked' };
    }
  }
}

/** What the lawyer can tell you about what they really want. */
export function lawyerRead(wantsIn: LabelTerms, legalSkill: number): string[] {
  if (legalSkill < 25) return [];
  const wants = normalizeTerms(wantsIn);
  const out: string[] = [];
  out.push(`Royalty: they will want about ${legalSkill >= 60 ? wants.royalty : `${wants.royalty - 3}–${wants.royalty + 3}`}%.`);
  if (legalSkill >= 45) out.push(`Advance: somewhere near ${money(round(wants.advance, legalSkill >= 70 ? 250 : 5000))}.`);
  if (legalSkill >= 45 && wants.allIn) out.push(`Fund: they think it takes about ${money(round(wants.recordingFund, 5000))} to make the records.`);
  if (legalSkill >= 55) out.push(wants.creativeControl ? 'They will insist on creative control.' : 'Creative control is not a deal-breaker.');
  if (legalSkill >= 55 && wants.signingBonus > 0) out.push('They expect a signing bonus.');
  if (legalSkill >= 65) out.push(`They will not commit to more than ${wants.releasesOwed} singles, ${wants.albumsOwed} album${wants.albumsOwed === 1 ? '' : 's'} or ${wants.termMonths} months.`);
  if (legalSkill >= 65) out.push(wants.publishingShare === 0 ? 'Publishing is off the table.' : `They might give up to ${wants.publishingShare}% of publishing.`);
  return out;
}

// ─── MONEY ─────────────────────────────────────────────────────────────────

/** What the label's own distributor keeps before the label sees anything. */
export const DISTRIBUTOR_FEE = 0.15;
/** Publishing earns roughly this fraction of a record's master revenue. */
export const PUBLISHING_RATE = 0.12;

/**
 * Split what a signee's records earned.
 *
 * The artist's royalty pays down the unrecouped balance first; only after that
 * does it reach the artist. The label keeps everything else, plus its share of
 * the publishing.
 */
export function splitRevenue(signee: Pick<LabelSignee, 'terms' | 'recoupBalance'>, gross: number): { label: number; artist: number; recouped: number; distributor: number; publishing: number } {
  if (gross <= 0) return { label: 0, artist: 0, recouped: 0, distributor: 0, publishing: 0 };
  const distributor = gross * DISTRIBUTOR_FEE;
  const net = gross - distributor;
  const share = net * (signee.terms.royalty / 100);
  const recouped = Math.min(share, Math.max(0, signee.recoupBalance));
  const artist = share - recouped;
  const publishing = gross * PUBLISHING_RATE * ((signee.terms.publishingShare ?? 0) / 100);
  return { label: net - artist + publishing, artist, recouped, distributor, publishing };
}

/** 360 deals: a share of what an artist that size earns on the road and in merch. */
export function threeSixtyMonthly(fame: number, share = 20): number {
  return Math.round(fame * fame * 4 * (share / 100));
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

// ─── THE ARTIST AT WORK ────────────────────────────────────────────────────

/** Days between finishing one thing and pitching the next. */
export function workGap(npc: NPC | undefined, seed: string): number {
  const p = npc?.personality ?? [];
  const fast = p.some((x) => ['prolific', 'workaholic', 'hardworking', 'hungry', 'relentless', 'driven'].includes(x));
  const slow = p.some((x) => ['perfectionist', 'meticulous', 'exacting', 'reluctant', 'laid_back'].includes(x));
  const base = fast ? 24 : slow ? 55 : 38;
  return Math.round(base + unit(seed) * 18);
}

/** The budget they ask for, by who they are. */
export function askTierFor(npc: NPC | undefined, fame: number, kind: 'single' | 'album'): LabelReleaseTier {
  const t = npc ? traitsOf(npc) : ({} as Traits);
  if (t.diva || fame >= 55) return 'major';
  if (fame < 15 && kind === 'single') return 'demo';
  return 'standard';
}

const PITCH_LINES = {
  great: ['They think this is the one. They have played it for everyone they know.', 'They are sure: "This is the record that changes everything."', 'They sent it at 4am with five fire emojis.'],
  good: ['They are proud of this one and want it out properly.', 'Solid record, they say. The hook stays in your head.', 'They think it\'s a single. The office mostly agrees.'],
  meh: ['They want it out, but even they sound unsure.', 'It\'s fine. Fine is the problem.', 'The verses are strong; the hook is not there yet.'],
};

export function makeSubmission(opts: {
  npc: NPC | undefined;
  signee: Pick<LabelSignee, 'npcId' | 'name' | 'fame' | 'singlesSinceAlbum' | 'albumsDelivered' | 'terms'>;
  serial: number;
  arSkill: number;
  title: string;
  roll: number;
}): Omit<LabelSubmission, 'id'> {
  const { npc, signee, serial, arSkill, title, roll } = opts;
  const wantsAlbum = signee.singlesSinceAlbum >= 3 && signee.albumsDelivered < Math.max(1, signee.terms.albumsOwed);
  const kind: 'single' | 'album' = wantsAlbum ? 'album' : 'single';
  // The demo itself: who they are and how they feel, before any studio money.
  const skillish = npc ? (unit(`skill|${npc.id}`) - 0.5) * 12 : 0;
  const quality = Math.round(clamp(signee.fame * 0.5 + 30 + skillish + (roll - 0.45) * 30, 10, 95));
  const spread = arSkill > 0 ? (100 - arSkill) / 6 : 18;
  const estimate = Math.round(clamp(quality + (unit(`dest|${signee.npcId}|${serial}`) - 0.5) * 2 * spread, 5, 99));
  const band = quality >= 68 ? 'great' : quality >= 50 ? 'good' : 'meh';
  const pitch = kind === 'album'
    ? `After ${signee.singlesSinceAlbum} singles they want to put out a full project. ${line(PITCH_LINES[band], `${signee.npcId}|${serial}`)}`
    : line(PITCH_LINES[band], `${signee.npcId}|${serial}`);
  return {
    npcId: signee.npcId,
    name: signee.name,
    kind,
    title,
    trackCount: kind === 'album' ? 8 + Math.floor(unit(`tracks|${signee.npcId}|${serial}`) * 7) : 1,
    quality,
    estimate,
    askTier: askTierFor(npc, signee.fame, kind),
    pitch,
    submittedSerial: serial,
    reworks: 0,
    status: 'pending',
  };
}

/** What a rework does to a demo. Perfectionists love it; divas do not. */
export function reworkOutcome(npc: NPC | undefined, sub: Pick<LabelSubmission, 'quality' | 'reworks'>, roll: number): { quality: number; mood: number; text: string } {
  const p = npc?.personality ?? [];
  const careful = p.some((x) => ['perfectionist', 'meticulous', 'exacting', 'hardworking'].includes(x));
  const t = npc ? traitsOf(npc) : ({} as Traits);
  const lift = (careful ? 4 : 1) + roll * (careful ? 9 : 7) - sub.reworks * 2;
  const mood = careful ? 1 : t.diva ? -10 : -4 - sub.reworks * 3;
  return {
    quality: Math.round(clamp(sub.quality + lift, 5, 99)),
    mood,
    text: careful ? 'They went back in happily. It is tighter now.' : t.diva ? 'They were insulted, but they did it.' : 'They grumbled, but they went back to it.',
  };
}

/** Everything a release costs, given the tier, the studio and the kind. */
export function sessionPlan(opts: {
  kind: 'single' | 'album';
  tier: LabelReleaseTier;
  studio: LabelStudio;
  staff: { role: LabelStaffRole; skill: number }[];
  marketingCommit: number;
}): { recording: number; marketing: number; days: number; qualityBonus: number } {
  const t = RELEASE_TIERS[opts.tier];
  const fx = studioEffects(opts.studio, opts.staff);
  const albumMult = opts.kind === 'album' ? ALBUM_COST_MULT : 1;
  return {
    recording: Math.round(t.cost * albumMult * fx.costMult),
    marketing: Math.round(Math.max(t.marketing, opts.marketingCommit) * (opts.kind === 'album' ? 2 : 1)),
    days: Math.max(4, Math.round(t.days * (opts.kind === 'album' ? ALBUM_DAYS_MULT : 1) * fx.daysMult)),
    qualityBonus: t.quality + fx.quality + staffSkill(opts.staff, 'ar') / 30,
  };
}

/**
 * On an all-in deal the artist spends their own fund. They pick the biggest
 * tier they can afford without leaving themselves broke for the next record.
 */
export function allInTier(fund: number, kind: 'single' | 'album', wanted: LabelReleaseTier, studio: LabelStudio, staff: { role: LabelStaffRole; skill: number }[]): LabelReleaseTier | null {
  const order: LabelReleaseTier[] = wanted === 'major' ? ['major', 'standard', 'demo'] : wanted === 'standard' ? ['standard', 'demo'] : ['demo'];
  for (const tier of order) {
    const p = sessionPlan({ kind, tier, studio, staff, marketingCommit: 0 });
    if (p.recording + p.marketing <= fund * (kind === 'album' ? 0.9 : 0.6)) return tier;
  }
  const cheapest = sessionPlan({ kind, tier: 'demo', studio, staff, marketingCommit: 0 });
  return cheapest.recording + cheapest.marketing <= fund ? 'demo' : null;
}

// ─── HOW THEY FEEL ─────────────────────────────────────────────────────────

export interface MonthContext {
  serial: number;
  labelRep: number;
  labelBroke: boolean;
  marketingSkill: number;
  /** The artist's royalty earned this month (paid or recouped). */
  monthArtistShare: number;
  /** Their demos sitting unanswered. */
  pendingDays: number;
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
  if (ctx.pendingDays > SUBMISSION_PATIENCE_DAYS) { mood -= 6; notes.push('Waiting on you to answer their demo.'); }
  if (s.recoupBalance <= 0 && ctx.monthArtistShare > 0) { mood += 3; notes.push('Recouped and getting paid.'); }
  else if (s.recoupBalance > 0 && ctx.serial - s.signedSerial > 365) { mood -= 2; notes.push('A year in and still unrecouped.'); }
  if (s.demand) { mood -= 8; notes.push('Unanswered demand.'); }
  if (s.terms.creativeControl) mood += 1;
  else if (t.diva) mood -= 2;
  if (s.terms.dealType === 'three_sixty') mood -= 1;
  if ((s.terms.publishingShare ?? 0) >= 30) mood -= 1;
  if (s.terms.allIn && s.fund <= 0 && s.status === 'active') { mood -= 3; notes.push('Their fund is gone and they cannot make records.'); }
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
export function reputationTarget(opts: { playerFame: number; topSigneeFames: number[]; chartingThisMonth: number; disputes: number; radioSkill: number; releasesThisMonth: number; studioTier: number }): number {
  const top = [...opts.topSigneeFames].sort((a, b) => b - a).slice(0, 3);
  const avgTop = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  return clamp(
    10 + opts.playerFame * 0.25 + avgTop * 0.45 + opts.chartingThisMonth * 3 + opts.releasesThisMonth * 0.8 + opts.radioSkill / 20 + opts.studioTier * 1.5 - opts.disputes * 5,
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

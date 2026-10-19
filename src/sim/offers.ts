// ─── SHOW OFFERS, INVITATIONS & NEGOTIATION ────────────────────────────────
//
// Offers arrive; the player answers. Every number is a function of the room
// the offer is for, the host's own pull and the player's standing — a fee can
// never be bigger than the room can pay, so offers are not a money printer.
//
// Pure: no store, no clock, no React. Everything random is passed in as a
// roll so a test can pin an outcome.
//
// Nothing here quotes a real person. NPC reactions are written from an
// ARCHETYPE (business, street, creative, status) and are attributed to "their
// camp", never to a named celebrity.

import { costIndex } from './home';
import type { NPC, ShowOffer, OfferTerms, OfferBilling, OfferCancel, Archetype, DeclineReason } from '../types/game';
import { hashString } from './rng';

export type { Archetype, DeclineReason };

// ─── WHO IS THIS PERSON? ───────────────────────────────────────────────────

export const ARCHETYPE_LABEL: Record<Archetype, { label: string; emoji: string; blurb: string }> = {
  business: { label: 'Business', emoji: '💼', blurb: 'Numbers, reliability, paperwork.' },
  street: { label: 'Street', emoji: '🔥', blurb: 'Loyalty, respect, who you run with.' },
  creative: { label: 'Creative', emoji: '🎨', blurb: 'The art, the vibe, creative control.' },
  status: { label: 'Status', emoji: '👑', blurb: 'Billing, image and optics.' },
};

const BUSINESS_ROLES = ['promoter', 'venue_owner', 'label_ceo', 'manager', 'distributor', 'investor', 'lawyer', 'publicist', 'tour_manager', 'rival_manager', 'ar'];
const STREET_ROLES = ['dj', 'blogger', 'radio_owner', 'a_and_r_scout', 'media', 'fan_account'];
const CREATIVE_ROLES = ['producer', 'songwriter', 'session_musician', 'engineer', 'choreographer', 'stylist', 'photographer'];
const STREET_GENRES = ['drill', 'grime', 'trap', 'boom_bap', 'dancehall'];
const CREATIVE_GENRES = ['conscious', 'jazz_rap', 'neo_soul', 'alte', 'rnb', 'gospel', 'highlife'];

export function archetypeOf(npc: Pick<NPC, 'role' | 'genre' | 'fame' | 'tier'>): Archetype {
  if (BUSINESS_ROLES.includes(npc.role)) return 'business';
  if (STREET_ROLES.includes(npc.role)) return 'street';
  if (CREATIVE_ROLES.includes(npc.role)) return 'creative';
  if (npc.tier === 'international' || npc.fame >= 70) return 'status';
  if (npc.genre && STREET_GENRES.includes(npc.genre)) return 'street';
  if (npc.genre && CREATIVE_GENRES.includes(npc.genre)) return 'creative';
  return npc.fame >= 45 ? 'status' : 'street';
}

export interface Traits {
  petty: boolean;
  loyal: boolean;
  diva: boolean;
  generous: boolean;
  hustler: boolean;
  shark: boolean;
}

/** Existing personality words, mapped onto the offer system's trait names. */
export function traitsOf(npc: Pick<NPC, 'personality'>): Traits {
  const p = npc.personality ?? [];
  const has = (...w: string[]) => w.some((x) => p.includes(x));
  return {
    petty: has('petty', 'vindictive', 'bitter'),
    loyal: has('loyal', 'humble'),
    diva: has('arrogant', 'image_conscious', 'vain'),
    generous: has('generous', 'warm', 'kind'),
    hustler: has('ambitious', 'passionate'),
    shark: has('calculating', 'ruthless', 'cunning'),
  };
}

export type Mood = 'great' | 'good' | 'neutral' | 'stressed' | 'furious';
export const MOOD_INFO: Record<Mood, { label: string; emoji: string; shift: number; hint: string }> = {
  great: { label: 'Great mood', emoji: '😄', shift: 0.18, hint: 'Feeling generous today.' },
  good: { label: 'Good mood', emoji: '🙂', shift: 0.08, hint: 'Receptive.' },
  neutral: { label: 'Neutral', emoji: '😐', shift: 0, hint: 'Business as usual.' },
  stressed: { label: 'Stressed', emoji: '😬', shift: -0.1, hint: 'Short on patience today.' },
  furious: { label: 'Furious', emoji: '😠', shift: -0.22, hint: 'Probably wait a day.' },
};

/** A mood is a function of who they are and what day it is, so it can be read ahead of time. */
export function moodOf(npcId: string, serial: number): Mood {
  const r = (hashString(`${npcId}|${serial}`) % 1000) / 1000;
  if (r < 0.12) return 'great';
  if (r < 0.38) return 'good';
  if (r < 0.74) return 'neutral';
  if (r < 0.92) return 'stressed';
  return 'furious';
}

// ─── TERMS ─────────────────────────────────────────────────────────────────

export const BILLING_ORDER: OfferBilling[] = ['guest', 'support', 'co_headliner', 'headliner'];
export const BILLING_LABEL: Record<OfferBilling, string> = {
  guest: 'Special guest',
  support: 'Support act',
  co_headliner: 'Co-headliner',
  headliner: 'Headliner',
};
const BILLING_SHARE: Record<OfferBilling, number> = { guest: 0.05, support: 0.1, co_headliner: 0.22, headliner: 0.34 };
const BILLING_EXPOSURE: Record<OfferBilling, number> = { guest: 0.7, support: 0.85, co_headliner: 1.1, headliner: 1.3 };

export const CANCEL_LABEL: Record<OfferCancel, { label: string; pct: number }> = {
  flexible: { label: 'Flexible', pct: 0.1 },
  standard: { label: 'Standard', pct: 0.3 },
  strict: { label: 'Strict', pct: 0.6 },
};

/** What the room can fairly pay this artist for this slot. Capacity-bounded by construction. */
export function fairFee(capacity: number, hostFame: number, playerFame: number, billing: OfferBilling, country?: string): number {
  // What a ticket costs depends on the night and on the city: a club night in
  // Accra is not a club night in London.
  const ticket = (6 + Math.max(0, hostFame) * 0.7) * costIndex(country);
  const gate = capacity * 0.7 * ticket;
  const standing = 0.55 + Math.min(1, Math.max(0, playerFame) / 80) * 0.6;
  return Math.max(100, Math.round((gate * BILLING_SHARE[billing] * standing) / 10) * 10);
}

export function maxFee(fair: number, archetype: Archetype, t: Traits): number {
  let m = 1.18;
  if (archetype === 'street') m = 1.12;
  if (archetype === 'creative') m = 1.05; // they pay in freedom, not money
  if (t.hustler || t.shark) m -= 0.05;
  if (t.generous) m += 0.15;
  return Math.round((fair * m) / 10) * 10;
}

export function patienceFor(archetype: Archetype, t: Traits): number {
  let p = archetype === 'business' ? 3 : archetype === 'street' ? 4 : archetype === 'creative' ? 4 : 2;
  if (t.hustler) p += 1;
  if (t.diva) p -= 1;
  return Math.max(1, p);
}

export interface BuildOfferInput {
  id: string;
  host: Pick<NPC, 'id' | 'name' | 'role' | 'fame' | 'tier' | 'genre' | 'personality'>;
  venueId: string;
  venueName: string;
  city: string;
  country: string;
  capacity: number;
  serial: number;
  nowSerial: number;
  playerFame: number;
  relationship: number;
  billing: OfferBilling;
  kind: ShowOffer['kind'];
  reason: string;
  /** Without a manager the window is shorter — offers "expire unseen". */
  hasManager: boolean;
  /** 0-1 roll. */
  roll: number;
}

export function buildOffer(i: BuildOfferInput): ShowOffer {
  const archetype = archetypeOf(i.host);
  const t = traitsOf(i.host);
  const fair = fairFee(i.capacity, i.host.fame, i.playerFame, i.billing, i.country);

  // How they open. Business lowballs, street shakes hands, creative offers
  // freedom instead of money, status dictates.
  const open = archetype === 'business' ? 0.8 : archetype === 'street' ? 0.95 : archetype === 'creative' ? 0.75 : 0.85;
  const sharkSqueeze = t.shark ? 0.92 : 1;
  const fee = Math.max(50, Math.round((fair * open * sharkSqueeze) / 10) * 10);

  // Fine print. A shark hides it; everyone else is merely tough.
  const hidden: ShowOffer['hidden'] = [];
  let cancel: OfferCancel = archetype === 'business' ? 'standard' : 'flexible';
  let exclusivityDays = 0;
  if (t.shark || (archetype === 'business' && i.roll > 0.6)) {
    cancel = 'strict';
    hidden.push('cancel');
  }
  if (t.shark || t.diva || archetype === 'status') {
    if (i.roll < 0.55) {
      exclusivityDays = archetype === 'status' ? 14 : 30;
      hidden.push('exclusivity');
    }
  }

  const window = i.hasManager ? 18 : 9;
  const terms: OfferTerms = {
    fee,
    merchSplit: archetype === 'street' ? 85 : archetype === 'creative' ? 90 : 70,
    billing: i.billing,
    slotMins: i.billing === 'headliner' ? 75 : i.billing === 'co_headliner' ? 50 : i.billing === 'support' ? 30 : 20,
    travel: archetype === 'business' || archetype === 'status' ? i.billing !== 'guest' : false,
    cancel,
    exclusivityDays,
  };

  return {
    id: i.id,
    hostId: i.host.id,
    hostName: i.host.name,
    hostRole: i.host.role,
    archetype,
    kind: i.kind,
    venueId: i.venueId,
    venueName: i.venueName,
    city: i.city,
    country: i.country,
    capacity: i.capacity,
    serial: i.serial,
    receivedSerial: i.nowSerial,
    expiresSerial: Math.min(i.serial - 3, i.nowSerial + window),
    terms,
    fair,
    ceiling: maxFee(fair, archetype, t),
    patience: patienceFor(archetype, t),
    round: 0,
    hidden,
    reason: i.reason,
    relationshipAtOffer: i.relationship,
    status: 'open',
    log: [],
  };
}

// ─── NEGOTIATION ───────────────────────────────────────────────────────────

export interface NegotiationContext {
  relationship: number;
  mood: Mood;
  managerSkill: number; // 0-100, 0 = none
  lawyerSkill: number; // 0-100, 0 = none
  /** Other live offers the player could walk to. */
  competing: number;
  traits: Traits;
}

export interface CounterResult {
  outcome: 'accepted' | 'met_halfway' | 'refused' | 'walked';
  terms: OfferTerms;
  patience: number;
  /** The camp's reply, in their archetype's voice. */
  line: string;
  /** 0-1: how far the player pushed. */
  strain: number;
}

/**
 * How far an ask pushes past what they opened with, summed across terms.
 * Fee is the big one; the rest are the small leaks that make a deal feel won.
 */
function strainOf(o: ShowOffer, ask: OfferTerms, archetype: Archetype): number {
  const cur = o.terms;
  let s = 0;

  if (ask.fee > cur.fee) {
    const room = Math.max(10, o.ceiling - cur.fee);
    if (ask.fee <= o.ceiling) s += ((ask.fee - cur.fee) / room) * 0.55;
    else s += 0.55 + ((ask.fee - o.ceiling) / Math.max(50, o.ceiling)) * 3;
  }

  const step = BILLING_ORDER.indexOf(ask.billing) - BILLING_ORDER.indexOf(cur.billing);
  if (step > 0) s += step * (archetype === 'status' ? 1.1 : 0.35);

  if (ask.merchSplit > cur.merchSplit) s += (ask.merchSplit - cur.merchSplit) / 45;
  if (ask.slotMins > cur.slotMins) s += (ask.slotMins - cur.slotMins) / 120;
  if (ask.travel && !cur.travel) s += archetype === 'business' ? 0.25 : 0.12;

  const cancelRank: OfferCancel[] = ['flexible', 'standard', 'strict'];
  if (cancelRank.indexOf(ask.cancel) < cancelRank.indexOf(cur.cancel)) s += 0.15;
  if (ask.exclusivityDays < cur.exclusivityDays) s += 0.1;

  return s;
}

const REPLY: Record<Archetype, Record<'accepted' | 'met_halfway' | 'refused' | 'walked', string[]>> = {
  business: {
    accepted: ['Their team signs off. "That works for the numbers."', 'Their camp confirms: terms agreed, paperwork to follow.'],
    met_halfway: ['Their team comes back with a revised sheet — closer, but not all the way.', 'Their camp counters: "We can move on this, not on that."'],
    refused: ['Their team says the ask is outside what the budget allows.', 'Their camp: "Those numbers don\'t work for us."'],
    walked: ['Their team ends the call. The offer is withdrawn.'],
  },
  street: {
    accepted: ['Their camp keeps it simple: "Say less. See you there."', 'It\'s a handshake deal. They\'re in.'],
    met_halfway: ['Their camp says they\'ll meet you in the middle — "keep it real with me."', 'They come back with a bit more, but want you to show up for it.'],
    refused: ['Their camp isn\'t feeling the ask: "It was never supposed to be about that."', 'They push back — it sounds like you\'re asking for too much for the room.'],
    walked: ['They\'ve heard enough. The offer is gone.'],
  },
  creative: {
    accepted: ['They\'re excited: "Let\'s make something good out of it."', 'Their camp says yes and starts sketching the set.'],
    met_halfway: ['They offer a little more room on the creative side instead of cash.', 'Their camp counters — slightly more, with a say in the setlist.'],
    refused: ['They think the ask is missing the point of the night.', 'Their camp says the ask feels too commercial for what they\'re building.'],
    walked: ['They\'d rather find someone who gets the idea. Offer withdrawn.'],
  },
  status: {
    accepted: ['Their team confirms — and sends over visual references.', 'Their camp approves. Billing and layout are locked.'],
    met_halfway: ['Their team offers a small improvement. The poster layout is not up for discussion.', 'Their camp adjusts the perks, not the billing.'],
    refused: ['Their camp is unimpressed with the ask.', 'Their team says the billing is the billing.'],
    walked: ['Their team doesn\'t reply. The offer is quietly withdrawn.'],
  },
};

function pickLine(a: Archetype, k: keyof (typeof REPLY)['business'], roll: number): string {
  const pool = REPLY[a][k];
  return pool[Math.floor(roll * pool.length) % pool.length];
}

/** A counter-offer. `roll` picks the wording only; the result is deterministic. */
export function negotiate(o: ShowOffer, ask: OfferTerms, ctx: NegotiationContext, roll: number): CounterResult {
  const strain = strainOf(o, ask, o.archetype);

  // How much strain they will tolerate: relationship and mood and your team
  // widen it, a shark and a diva narrow it.
  let tolerance = 0.5 + MOOD_INFO[ctx.mood].shift;
  tolerance += ctx.relationship / 400; // ±0.25
  tolerance += ctx.managerSkill / 500; // up to +0.2
  tolerance += ctx.lawyerSkill / 700; // up to +0.14
  tolerance += Math.min(0.15, ctx.competing * 0.05);
  if (ctx.traits.generous) tolerance += 0.1;
  if (ctx.traits.shark) tolerance -= 0.08;
  if (ctx.traits.diva) tolerance -= 0.05;
  if (ctx.traits.loyal && ctx.relationship >= 30) tolerance += 0.08;

  // A hustler respects a hard negotiator; patience drains slower.
  const drain = ctx.traits.hustler && strain > 0.2 ? 0.5 : 1;
  const patience = Math.max(0, o.patience - drain);

  // Asking for nothing more is just accepting.
  if (strain <= 0.001) {
    return { outcome: 'accepted', terms: ask, patience: o.patience, line: pickLine(o.archetype, 'accepted', roll), strain };
  }
  if (strain <= tolerance * 0.55) {
    return { outcome: 'accepted', terms: ask, patience: o.patience, line: pickLine(o.archetype, 'accepted', roll), strain };
  }
  if (patience <= 0 && strain > tolerance) {
    return { outcome: 'walked', terms: o.terms, patience: 0, line: pickLine(o.archetype, 'walked', roll), strain };
  }
  if (strain <= tolerance * 1.6) {
    // Meet in the middle, but never past their ceiling and never on billing for status types.
    const mid = (a: number, b: number) => Math.round((a + b) / 2);
    const fee = Math.min(o.ceiling, Math.round(mid(o.terms.fee, ask.fee) / 10) * 10);
    const terms: OfferTerms = {
      ...o.terms,
      fee,
      merchSplit: mid(o.terms.merchSplit, ask.merchSplit),
      slotMins: mid(o.terms.slotMins, ask.slotMins),
      travel: ask.travel && o.archetype !== 'creative' ? true : o.terms.travel,
      billing: o.archetype === 'status' ? o.terms.billing : ask.billing === o.terms.billing ? o.terms.billing : BILLING_ORDER[Math.min(BILLING_ORDER.indexOf(ask.billing), BILLING_ORDER.indexOf(o.terms.billing) + 1)],
      cancel: o.terms.cancel,
      exclusivityDays: o.terms.exclusivityDays,
    };
    return { outcome: 'met_halfway', terms, patience, line: pickLine(o.archetype, 'met_halfway', roll), strain };
  }
  return { outcome: 'refused', terms: o.terms, patience, line: pickLine(o.archetype, 'refused', roll), strain };
}

// ─── DECLINING ─────────────────────────────────────────────────────────────

export const DECLINE_REASONS: { id: DeclineReason; label: string; blurb: string }[] = [
  { id: 'scheduling', label: 'Scheduling conflict', blurb: 'Honest if your diary is genuinely full that night.' },
  { id: 'fee', label: 'Fee is too low', blurb: 'Fair, if you tried to negotiate first.' },
  { id: 'billing', label: 'Not enough billing', blurb: 'Dangerous with anyone who cares about status.' },
  { id: 'creative', label: 'Creative differences', blurb: 'Fine — unless you insult the idea.' },
  { id: 'health', label: 'Health or energy', blurb: 'Believed if you are actually run down.' },
  { id: 'rival', label: 'Conflict with someone on the bill', blurb: 'Reads as a loyalty test.' },
  { id: 'none', label: 'No reason given', blurb: 'The rudest answer there is.' },
];

/** Base relationship change per archetype × reason. Negative is worse. */
const DECLINE_TABLE: Record<Archetype, Record<DeclineReason, number>> = {
  business: { scheduling: 0, fee: -1, billing: -1, creative: -1, health: 0, rival: -5, none: -4 },
  street: { scheduling: -1, fee: -4, billing: -5, creative: -1, health: 0, rival: -6, none: -5 },
  creative: { scheduling: 0, fee: 0, billing: -1, creative: -5, health: 0, rival: -3, none: -3 },
  status: { scheduling: -1, fee: -3, billing: -9, creative: -3, health: -1, rival: -8, none: -6 },
};

const DECLINE_LINE: Record<Archetype, { mild: string[]; sharp: string[] }> = {
  business: {
    mild: ['Their team notes it and will re-offer when your diary clears.', 'Their camp: "Understood. Keep us in mind."'],
    sharp: ['Their team logs it as unreliable. They will remember.', 'Their camp quietly crosses you off the shortlist.'],
  },
  street: {
    mild: ['Their camp shrugs — "respect for being straight up."', 'They get it. No hard feelings.'],
    sharp: ['Their camp is already telling people you were nowhere to be found.', 'It lands badly: "Where were you when it mattered?"'],
  },
  creative: {
    mild: ['They\'re understanding and suggest another time.', 'They take it gracefully and send a short note.'],
    sharp: ['They take it personally — it was their idea, after all.', 'Their camp goes quiet and cools on you.'],
  },
  status: {
    mild: ['Their team acknowledges it without comment.', 'A short, polite reply. Nothing more.'],
    sharp: ['Their team doesn\'t argue. You\'re just quietly dropped from the circle.', 'Cold silence. This one will take a long time to repair.'],
  },
};

export interface DeclineInput {
  archetype: Archetype;
  traits: Traits;
  reason: DeclineReason;
  relationship: number;
  mood: Mood;
  /** Whether the diary really backs a scheduling excuse. */
  calendarBusy: boolean;
  /** Whether the player really is run down (<50% energy). */
  runDown: boolean;
  /** Whether the player already tried to negotiate before saying no. */
  negotiated: boolean;
  soften: boolean;
  /** Which tier the host is on, to scale how hard it lands. */
  hostTier: 'local' | 'national' | 'international';
  roll: number;
}

export interface DeclineResult {
  relationship: number;
  reputation: number;
  line: string;
  /** Whether the host now has a grudge that will spread. */
  grudge: boolean;
}

export function declineEffect(i: DeclineInput): DeclineResult {
  let base = DECLINE_TABLE[i.archetype][i.reason];

  // A reason that is not true is worse than no reason.
  if (i.reason === 'scheduling' && !i.calendarBusy) base = Math.min(base, -3) - 1;
  if (i.reason === 'health' && !i.runDown) base = Math.min(base, -3) - 1;
  // A fee complaint means more when you actually tried to talk about it.
  if (i.reason === 'fee' && i.negotiated) base = Math.round(base / 2);

  const tierScale = i.hostTier === 'international' ? 1.6 : i.hostTier === 'national' ? 1.25 : 1;
  let d = base < 0 ? base * tierScale : base;

  if (d < 0) {
    if (i.traits.petty) d *= 2;
    if (i.traits.loyal && i.relationship >= 30) d *= 0.5;
    // A strong relationship cushions one mistake.
    if (i.relationship >= 40) d *= 0.75;
    if (i.mood === 'stressed' || i.mood === 'furious') d *= 1.25;
    if (i.soften) d *= 0.5; // offering a date, a shout-out or a feature halves the sting
  } else if (i.soften && i.traits.generous) {
    d += 1;
  }
  d = Math.round(d);

  const sharp = d <= -4 || (d < 0 && i.archetype === 'status');
  const pool = DECLINE_LINE[i.archetype][sharp ? 'sharp' : 'mild'];
  const line = pool[Math.floor(i.roll * pool.length) % pool.length];

  return {
    relationship: d,
    reputation: sharp && i.hostTier !== 'local' ? -1 : 0,
    line,
    grudge: sharp && i.traits.petty,
  };
}

// ─── BACKING OUT AFTER YES ─────────────────────────────────────────────────

export function backOutTerms(o: Pick<ShowOffer, 'terms' | 'archetype'>, daysOut: number, hostTier: 'local' | 'national' | 'international') {
  const pct = CANCEL_LABEL[o.terms.cancel].pct;
  const lateness = daysOut >= 21 ? 0.5 : daysOut >= 7 ? 1 : 1.6;
  const penalty = Math.round((o.terms.fee * pct * lateness) / 10) * 10;
  const tierScale = hostTier === 'international' ? 1.5 : hostTier === 'national' ? 1.2 : 1;
  const rel = -Math.round((8 + (daysOut < 7 ? 6 : 0)) * tierScale * (o.archetype === 'status' || o.archetype === 'street' ? 1.2 : 1));
  return { penalty, relationship: rel, reputation: daysOut < 7 ? -3 : -1 };
}

// ─── PLAYING THE NIGHT ─────────────────────────────────────────────────────

/** What a good or bad night does to the host's opinion of you. */
export function relationshipFromNight(quality: number, billing: OfferBilling): number {
  const base = quality >= 80 ? 9 : quality >= 65 ? 6 : quality >= 50 ? 2 : quality >= 35 ? -2 : -5;
  // Outshining a status-minded headliner has a price, but that is applied by the caller.
  return base + (billing === 'guest' && quality >= 65 ? 1 : 0);
}

export function exposureOf(billing: OfferBilling): number {
  return BILLING_EXPOSURE[billing];
}

export function whyInvited(opts: {
  relationship: number;
  playerFame: number;
  hostFame: number;
  hasManager: boolean;
  hasPromoter: boolean;
  hit: boolean;
  roll: number;
}): string {
  const reasons: string[] = [];
  if (opts.hit) reasons.push('Your last single is everywhere right now.');
  if (opts.relationship >= 40) reasons.push('We worked well last time.');
  if (opts.hasPromoter) reasons.push('Your promoter put your name forward.');
  if (opts.hasManager) reasons.push('Your manager has been on my phone all week.');
  if (opts.playerFame >= opts.hostFame - 5) reasons.push('Your numbers in the city caught my eye.');
  if (reasons.length === 0) reasons.push('Somebody on the bill dropped out and your name came up.');
  return reasons[Math.floor(opts.roll * reasons.length) % reasons.length];
}

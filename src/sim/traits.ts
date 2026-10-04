// ─── CHARACTERISTICS ───────────────────────────────────────────────────────
//
// Who somebody is, as opposed to what they are called.
//
// A role tells you the job. It does not tell you whether the manager in front
// of you is a connector who can put you in rooms you cannot book, or a
// meticulous operator who will not let a bad clause past them, or a risk taker
// who will put you in front of a crowd that is too big for you. That is what
// characteristics are for, and they are the difference between two managers
// with the same wage and the same job title.
//
// There are two layers, and the split is deliberate:
//
//   · VISIBLE — what they lead with. A great operator carries two or three, an
//     average one carries one, a poor one carries none. These are shown on the
//     profile, they change the numbers, and they are what the person says when
//     they pitch themselves to you. The pitch is not flavour: it is the
//     characteristic, said out loud, in their own words.
//
//   · HIDDEN — what you find out after you have signed them. Hard working or
//     lazy. Loyal or greedy. A temper. These are NOT shown anywhere on the
//     profile, and that is the point: the CV and the characteristics tell you
//     what they can do, and the hidden layer decides whether the hire was a
//     good one. They move the work, the wage, and the relationship every week.
//
// Everything here is derived from the NPC's id, so a person is the same person
// on every load and there is nothing extra to persist. The one exception is a
// crew member: the traits are copied onto the record at hire time, because the
// tick folds the payroll without the roster in hand.

import type { HiddenTrait, NPCRole, VisibleTrait } from '../types/game';
import { hashString } from './rng';

export type { HiddenTrait, VisibleTrait };

// ─── VISIBLE ────────────────────────────────────────────────────────────────

/**
 * What a characteristic does to the numbers. Every field is optional and every
 * one of them is read somewhere real — a trait whose effect is not implemented
 * would be a label pretending to be a mechanic.
 */
export interface TraitEffect {
  /** Points added to a manager's reach, so offers land better and sooner. */
  network?: number;
  /** Flat production-quality points added in the booth. */
  production?: number;
  /** Flat video-quality points added on a shoot. */
  video?: number;
  /** Added to the multiplier on show takings. */
  show?: number;
  /** Added to the multiplier on streaming payout. */
  payout?: number;
  /** Multiplies their share of the weekly stat boosts. */
  boost?: number;
  /** Multiplies fan growth. */
  fans?: number;
  /** Added to the fraction of a contract cut a lawyer claws back. */
  cutRelief?: number;
  /** Multiplies what they charge. */
  wage?: number;
  /** Multiplies the weekly drift in how they feel about you. */
  friction?: number;
  /** Extra spread on outcomes — the size of the swing they take. */
  variance?: number;
}

export interface TraitSpec {
  id: VisibleTrait;
  label: string;
  emoji: string;
  /** Third person, for the profile card. */
  blurb: string;
  /**
   * First person, for a pitch. `role` is passed so a producer talks about
   * records and a lawyer talks about paperwork without a second table.
   */
  pitch: (role: NPCRole | string) => string;
  effect: TraitEffect;
}

export const VISIBLE_TRAITS: Record<VisibleTrait, TraitSpec> = {
  connected: {
    id: 'connected',
    label: 'Connected',
    emoji: '🤝',
    blurb: 'Knows people who matter, and can get to them.',
    pitch: () =>
      'I am connected. I can get you into rooms you cannot book yourself, put you in front of people who write cheques, and get you features off artists who would not take your call today.',
    effect: { network: 20 },
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    emoji: '🎨',
    blurb: 'Hears the record before it exists.',
    pitch: () =>
      'I am creative. Give me a voice note and I will hear the finished record. That is the difference between a session that goes nowhere and one you release.',
    effect: { production: 3.5, video: 2 },
  },
  smart: {
    id: 'smart',
    label: 'Smart',
    emoji: '🧠',
    blurb: 'Reads the paperwork and the room.',
    pitch: (role) =>
      role === 'lawyer'
        ? 'I read the third page. Every bad clause in this business is on the third page, and nobody else in the room reads it.'
        : 'I am smart about this. I read what you are signing, I know what the deal is worth, and I do not let you walk into a room you have not counted.',
    effect: { boost: 1.2, cutRelief: 0.08 },
  },
  brave: {
    id: 'brave',
    label: 'Brave',
    emoji: '🦁',
    blurb: 'Will take the booking everyone else turns down.',
    pitch: () =>
      'I am not scared of a big room. I will put you in front of a crowd that is too big for you, because that is the only way the crowd gets smaller than you.',
    effect: { show: 0.12 },
  },
  risk_taker: {
    id: 'risk_taker',
    label: 'Risk Taker',
    emoji: '🎲',
    blurb: 'Takes swings. Some of them land.',
    pitch: () =>
      'I take swings. Not every one lands — but the artists who play it safe are still playing the same rooms they played five years ago.',
    effect: { payout: 0.08, variance: 0.35 },
  },
  charismatic: {
    id: 'charismatic',
    label: 'Charismatic',
    emoji: '✨',
    blurb: 'People like them, and that buys you attention.',
    pitch: () =>
      'People like me. That sounds small and it is not — every room I walk into, I leave with somebody wanting to help you.',
    effect: { fans: 1.15 },
  },
  ruthless: {
    id: 'ruthless',
    label: 'Ruthless',
    emoji: '🗡️',
    blurb: 'Gets the deal. Does not care who it upsets.',
    pitch: () =>
      'I get the deal. I do not care whose feelings that costs, and in this business that is a skill, not a flaw.',
    effect: { payout: 0.1, network: 8, friction: 1.6 },
  },
  meticulous: {
    id: 'meticulous',
    label: 'Meticulous',
    emoji: '🔬',
    blurb: 'Nothing ships with a mistake in it.',
    pitch: () =>
      'Nothing I am responsible for goes out with a mistake in it. Not a mix, not a video, not a contract. It is slower and it is why my clients do not have to explain themselves later.',
    effect: { video: 6, production: 1.5 },
  },
};

// ─── HIDDEN ─────────────────────────────────────────────────────────────────

export interface HiddenSpec {
  id: HiddenTrait;
  label: string;
  /** How it shows up once you have worked with them a while. */
  tell: string;
  /** Multiplies their contribution to every benefit they provide. */
  workMult: number;
  /** Multiplies what they charge. */
  wageMult: number;
  /** Multiplies the weekly drift in how they feel about you. */
  friction: number;
  /** Occasional lines for the event log. */
  events: string[];
}

/**
 * The layer you find out about later.
 *
 * `friction` is the load-bearing number: above 1 they sour faster when you do
 * not manage them, below 1 they stay. It is what makes a lazy genius and a
 * hard-working average hire genuinely different propositions rather than two
 * lines of flavour text.
 */
export const HIDDEN_TRAITS: Record<HiddenTrait, HiddenSpec> = {
  hard_working: {
    id: 'hard_working',
    label: 'Hard working',
    tell: 'Gets there first and leaves last. Always has another pass in them.',
    workMult: 1.25,
    wageMult: 1,
    friction: 0.85,
    events: [
      'sent over a revision nobody asked for — and it was better',
      'was still in the room at 3am when everyone else went home',
    ],
  },
  lazy: {
    id: 'lazy',
    label: 'Lazy',
    tell: 'Does exactly what was asked, and not one thing more.',
    workMult: 0.72,
    wageMult: 0.9,
    friction: 1,
    events: [
      'took the day off and did not say anything about it',
      'sent the first pass and called it finished',
    ],
  },
  anger_issues: {
    id: 'anger_issues',
    label: 'Anger issues',
    tell: 'Blows up when it goes wrong. You will have to smooth it over.',
    workMult: 1,
    wageMult: 1,
    friction: 1.7,
    events: [
      'lost their temper in the room and the session ended early',
      'got into it with somebody on the team and had to be pulled apart',
    ],
  },
  loyal: {
    id: 'loyal',
    label: 'Loyal',
    tell: 'Turns down other offers without telling you they had one.',
    workMult: 1.05,
    wageMult: 0.95,
    friction: 0.6,
    events: ['turned down another artist to stay on your project'],
  },
  greedy: {
    id: 'greedy',
    label: 'Greedy',
    tell: 'Wants more of everything, every time the money goes up.',
    workMult: 1.05,
    wageMult: 1.25,
    friction: 1.25,
    events: ['asked for a raise the week after your best numbers came in'],
  },
  egotistical: {
    id: 'egotistical',
    label: 'Egotistical',
    tell: 'Needs to be the reason it worked. Gets difficult when you get big.',
    workMult: 1,
    wageMult: 1.05,
    friction: 1.45,
    events: [
      'told the press this was their record, not yours',
      'asked to be credited in a place the credit does not exist',
    ],
  },
  volatile: {
    id: 'volatile',
    label: 'Volatile',
    tell: 'Brilliant one week, unreachable the next.',
    workMult: 1.15,
    wageMult: 1,
    friction: 1.35,
    events: [
      'went quiet for four days with the whole project waiting on them',
      'delivered something extraordinary and then disappeared again',
    ],
  },
  generous: {
    id: 'generous',
    label: 'Generous',
    tell: 'Charges less than they are worth and does not mention it.',
    workMult: 1,
    wageMult: 0.82,
    friction: 0.9,
    events: ['quietly did the extra work without putting it on the invoice'],
  },
};

// ─── ASSIGNMENT ─────────────────────────────────────────────────────────────

export interface NPCTraits {
  visible: VisibleTrait[];
  hidden: HiddenTrait[];
}

const VISIBLE_ORDER: VisibleTrait[] = [
  'connected', 'creative', 'smart', 'brave',
  'risk_taker', 'charismatic', 'ruthless', 'meticulous',
];
const HIDDEN_ORDER: HiddenTrait[] = [
  'hard_working', 'lazy', 'anger_issues', 'loyal',
  'greedy', 'egotistical', 'volatile', 'generous',
];

/**
 * How many visible characteristics somebody carries.
 *
 * Tied to skill, so the characteristics are a *read* on how good they are
 * rather than a separate roll: the best operators lead with three things, an
 * average one with one, and the bottom of the market has nothing to say about
 * themselves. That is also what makes a high-skill CV and a high-skill trait
 * list agree with each other instead of contradicting.
 */
export function visibleTraitCount(skill: number): number {
  if (skill >= 78) return 3;
  if (skill >= 58) return 2;
  if (skill >= 38) return 1;
  return 0;
}

/** One or two, always. Nobody in this business is only one thing. */
export function hiddenTraitCount(seed: number): number {
  return seed % 3 === 0 ? 2 : 1;
}

/**
 * Who this person is. Deterministic from the id, so the same NPC reads the
 * same on the profile, in the pitch, and on the payroll.
 *
 * `skill` is passed rather than recomputed so a caller that already has it
 * (the payroll, the CV) does not pay for it twice.
 */
export function npcTraits(npcId: string, skill: number): NPCTraits {
  const seed = hashString(`traits|${npcId}`);

  const count = visibleTraitCount(skill);
  const visible: VisibleTrait[] = [];
  // Walk the list from a seeded offset and take what has not been taken, so
  // the picks are spread rather than always favouring the top of the list.
  let cursor = seed % VISIBLE_ORDER.length;
  while (visible.length < count) {
    const pick = VISIBLE_ORDER[cursor % VISIBLE_ORDER.length];
    if (!visible.includes(pick)) visible.push(pick);
    cursor += 1 + (seed % 3);
  }

  const hCount = hiddenTraitCount(seed);
  const hidden: HiddenTrait[] = [];
  let hCursor = (seed >>> 3) % HIDDEN_ORDER.length;
  while (hidden.length < hCount) {
    const pick = HIDDEN_ORDER[hCursor % HIDDEN_ORDER.length];
    if (!hidden.includes(pick)) hidden.push(pick);
    hCursor += 1 + (seed % 4);
  }

  return { visible, hidden };
}

// ─── READING THEM BACK ──────────────────────────────────────────────────────

/** Fold a list of visible traits into one effect block. */
export function foldVisible(traits: VisibleTrait[] | undefined): Required<Omit<TraitEffect, 'variance'>> & { variance: number } {
  const out = {
    network: 0, production: 0, video: 0, show: 0, payout: 0,
    boost: 1, fans: 1, cutRelief: 0, wage: 1, friction: 1, variance: 0,
  };
  for (const t of traits ?? []) {
    const e = VISIBLE_TRAITS[t]?.effect;
    if (!e) continue;
    out.network += e.network ?? 0;
    out.production += e.production ?? 0;
    out.video += e.video ?? 0;
    out.show += e.show ?? 0;
    out.payout += e.payout ?? 0;
    out.cutRelief += e.cutRelief ?? 0;
    out.variance += e.variance ?? 0;
    // The multiplicative ones compose.
    if (e.boost !== undefined) out.boost *= e.boost;
    if (e.fans !== undefined) out.fans *= e.fans;
    if (e.wage !== undefined) out.wage *= e.wage;
    if (e.friction !== undefined) out.friction *= e.friction;
  }
  return out;
}

/** Fold a list of hidden traits. Unknown ids are ignored, never guessed at. */
export function foldHidden(traits: HiddenTrait[] | undefined): {
  workMult: number; wageMult: number; friction: number; events: string[];
} {
  const out = { workMult: 1, wageMult: 1, friction: 1, events: [] as string[] };
  for (const t of traits ?? []) {
    const s = HIDDEN_TRAITS[t];
    if (!s) continue;
    out.workMult *= s.workMult;
    out.wageMult *= s.wageMult;
    out.friction *= s.friction;
    out.events.push(...s.events);
  }
  return out;
}

/** The line the profile shows under each characteristic. */
export function traitLine(t: VisibleTrait): string {
  const s = VISIBLE_TRAITS[t];
  return s ? `${s.emoji} ${s.label} — ${s.blurb}` : '';
}

/**
 * The pitch: what this person says when they want the job.
 *
 * Built from their real characteristics, in order of how much they lead with
 * them, so two managers with the same archetype and different characteristics
 * genuinely say different things — which is the whole request.
 */
export function pitchFromTraits(
  name: string,
  traits: VisibleTrait[],
  role: NPCRole | string,
): string {
  if (traits.length === 0) {
    return `${name} does not say much about what makes them different. They talk about the work, and about the terms.`;
  }
  const lines = traits.map((t) => VISIBLE_TRAITS[t]?.pitch(role)).filter(Boolean) as string[];
  return lines.join('\n\n');
}

/**
 * A short, honest line about what their characteristics add up to, for the
 * offer card and the payroll row. Says "nothing special" when it is nothing
 * special — an operator with no characteristics is a real outcome.
 */
export function traitSummary(traits: VisibleTrait[] | undefined): string {
  const list = traits ?? [];
  if (list.length === 0) return 'No standout characteristics.';
  return list.map((t) => VISIBLE_TRAITS[t]?.label ?? t).join(' · ');
}

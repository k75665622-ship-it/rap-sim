// ─── CAREER MODES ──────────────────────────────────────────────────────────
//
// Real artists don't just "retire" or not. Some step back and drop a single
// when they feel like it; some put the music down to run their businesses;
// some walk away for good and come back years later. Each mode changes what
// comes to you (offers, asks, press) and what your time goes into.
//
// Pure: the store owns the state.

import type { PostCareerRole } from '../types/game';

export type CareerMode = 'active' | 'semi' | 'business' | 'retired';

export interface ModeDef {
  id: CareerMode;
  label: string;
  emoji: string;
  blurb: string;
  /** What still happens, in a line each. */
  effects: string[];
  /** Share of the normal flow that still reaches you. */
  asks: number;
  shows: number;
  press: number;
  /** Fee multiplier for the shows you do take. */
  showFee: number;
  /** Business profit multiplier (your attention). */
  ventures: number;
  /** Weekly fan drift when you're not putting anything out. */
  fanDecay: number;
}

export const MODES: Record<CareerMode, ModeDef> = {
  active: {
    id: 'active', label: 'Full-time artist', emoji: '🎤', blurb: 'Recording, touring, features, press — all of it.',
    effects: ['Every offer, ask and invite reaches you', 'Fans expect new music'],
    asks: 1, shows: 1, press: 1, showFee: 1, ventures: 1, fanDecay: 1,
  },
  semi: {
    id: 'semi', label: 'Semi-retired', emoji: '🌅', blurb: 'Drop a single when you feel like it. Rare appearances pay more.',
    effects: ['Fewer feature asks, shows and interviews (about 40%)', 'Shows you take pay 30% more — they\'re rare now', 'Fans drift away more slowly', 'You can record and release whenever you want'],
    asks: 0.4, shows: 0.4, press: 0.5, showFee: 1.3, ventures: 1.04, fanDecay: 0.5,
  },
  business: {
    id: 'business', label: 'Business focus', emoji: '💼', blurb: 'The music is on pause. Your companies get your attention.',
    effects: ['Your businesses earn 12% more and handle trouble better', 'Almost no feature asks; no new show offers', 'Business press still calls', 'You can still drop music if you want'],
    asks: 0.15, shows: 0, press: 0.6, showFee: 1, ventures: 1.12, fanDecay: 0.8,
  },
  retired: {
    id: 'retired', label: 'Retired', emoji: '🏁', blurb: 'You stepped away. The catalogue keeps paying; your legacy is set.',
    effects: ['No new offers, asks or sessions', 'The catalogue keeps earning, and slowly gains a nostalgia bump', 'A post-career role gives you something to do', 'You can always announce a comeback'],
    asks: 0, shows: 0, press: 0.25, showFee: 1, ventures: 1.05, fanDecay: 0.35,
  },
};

export const ROLES: Record<PostCareerRole, { label: string; emoji: string; blurb: string }> = {
  executive: { label: 'Executive', emoji: '🏢', blurb: 'Run the business side: your label earns 10% more and its artists are happier.' },
  producer: { label: 'Producer', emoji: '🎛️', blurb: 'Make beats for other artists: a weekly income that grows with your skills and name.' },
  manager: { label: 'Manager', emoji: '📋', blurb: 'Manage younger acts: 10% of what your label artists earn, and their careers move faster.' },
  mentor: { label: 'Mentor', emoji: '🧭', blurb: 'Pass it on: your label artists train faster, and your reputation grows every month.' },
};

/** The comeback window: announce, then release something within it. */
export const COMEBACK_DAYS = 45;

/** How much hype a comeback carries: legacy and time away both build it. */
export function comebackHype(legacyScore: number, daysAway: number, fame: number): number {
  const away = Math.min(1, daysAway / 730);
  return Math.round(Math.min(60, 8 + Math.log10(1 + legacyScore) * 9 + away * 18 + fame / 8));
}

/** A one-in-N gate: does this offer/ask/invite still reach you in this mode? */
export function reaches(mode: CareerMode | undefined, kind: 'asks' | 'shows' | 'press', roll: number): boolean {
  return roll < MODES[mode ?? 'active'][kind];
}

/** Weekly income as a post-career producer. */
export function producerIncome(beatmaking: number, fame: number): number {
  return Math.round(250 + beatmaking * 22 + fame * 30);
}

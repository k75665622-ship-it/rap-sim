// ─── WHO SOMEBODY IS, IN PRACTICE ──────────────────────────────────────────
//
// Every NPC already carries two or three personality words ("petty",
// "workaholic", "easygoing"). This turns those words into behaviour the game
// can use: do they turn up on time, do they forgive a no-show, how do they
// text, how big is their ego. And everyone who can be hired has a special
// skill — one thing they are known for that changes real numbers.
//
// Deterministic from the id, so nothing new is saved.

import type { NPC } from '../types/game';
import { hashString } from './rng';

export type TextStyle = 'street' | 'warm' | 'blunt' | 'dry' | 'flashy' | 'formal' | 'spiritual';

export interface Persona {
  /** One word for the profile. */
  temperament: string;
  /** 0-1: how likely they are to let a slight go. */
  forgiveness: number;
  /** 0-1: how likely they are to be on time (and to expect you on time). */
  punctuality: number;
  /** 0-1: how much they need to be the main character. */
  ego: number;
  /** 0-1: how friendly they are by default. */
  warmth: number;
  /** 0-1: how likely they are to take it public. */
  messy: number;
  style: TextStyle;
  /** Short readable tags: "Always on time", "Holds grudges". */
  tags: string[];
}

const W = (p: string[], ...words: string[]) => words.some((w) => p.includes(w));

export function personaOf(npc: Pick<NPC, 'id' | 'personality' | 'role' | 'fame' | 'tier'>): Persona {
  const p = npc.personality ?? [];
  const h = hashString(`persona|${npc.id}`);
  const jitter = (k: number) => (((h >> k) & 0xff) / 255 - 0.5) * 0.25;
  const clamp = (n: number) => Math.max(0.03, Math.min(0.97, n));

  let forgiveness = 0.5 + jitter(1);
  if (W(p, 'humble', 'easygoing', 'generous', 'loyal', 'spiritual', 'idealistic')) forgiveness += 0.25;
  if (W(p, 'petty', 'volatile', 'paranoid', 'arrogant', 'ruthless', 'cynical')) forgiveness -= 0.3;

  let punctuality = 0.55 + jitter(5);
  if (W(p, 'disciplined', 'workaholic', 'strategic', 'calculating', 'selective')) punctuality += 0.3;
  if (W(p, 'reckless', 'volatile', 'easygoing', 'creative')) punctuality -= 0.25;

  let ego = 0.35 + npc.fame / 250 + jitter(9);
  if (W(p, 'arrogant', 'image_conscious', 'ambitious')) ego += 0.3;
  if (W(p, 'humble', 'idealistic', 'spiritual')) ego -= 0.25;

  let warmth = 0.5 + jitter(13);
  if (W(p, 'charming', 'generous', 'easygoing', 'humble', 'passionate')) warmth += 0.25;
  if (W(p, 'cynical', 'calculating', 'paranoid', 'brutally_honest', 'selective')) warmth -= 0.2;

  let messy = 0.3 + jitter(17);
  if (W(p, 'petty', 'reckless', 'volatile', 'image_conscious')) messy += 0.3;
  if (W(p, 'strategic', 'disciplined', 'selective', 'humble')) messy -= 0.2;

  const business = ['manager', 'lawyer', 'label_ceo', 'ar', 'a_and_r_scout', 'distributor', 'investor', 'venue_owner', 'promoter', 'tour_manager', 'radio_owner', 'media', 'blogger'].includes(npc.role);
  const style: TextStyle = W(p, 'spiritual') ? 'spiritual'
    : W(p, 'brutally_honest') ? 'blunt'
    : W(p, 'cynical', 'selective') ? 'dry'
    : W(p, 'image_conscious', 'arrogant') ? 'flashy'
    : business ? 'formal'
    : W(p, 'charming', 'generous', 'humble', 'passionate', 'idealistic') ? 'warm'
    : 'street';

  const temperament = W(p, 'volatile') ? 'Hot-headed' : W(p, 'petty') ? 'Petty' : W(p, 'loyal') ? 'Loyal' : W(p, 'easygoing') ? 'Laid-back'
    : W(p, 'workaholic') ? 'Workaholic' : W(p, 'arrogant') ? 'Big ego' : W(p, 'humble') ? 'Humble' : W(p, 'ruthless') ? 'Cut-throat'
    : W(p, 'paranoid') ? 'Paranoid' : W(p, 'charming') ? 'Charmer' : W(p, 'reckless') ? 'Wild card' : W(p, 'disciplined') ? 'Disciplined'
    : W(p, 'ambitious') ? 'Hungry' : W(p, 'spiritual') ? 'Spiritual' : 'Easy to read';

  const P: Persona = {
    temperament,
    forgiveness: clamp(forgiveness), punctuality: clamp(punctuality), ego: clamp(ego), warmth: clamp(warmth), messy: clamp(messy),
    style, tags: [],
  };
  if (P.punctuality > 0.72) P.tags.push('Always on time'); else if (P.punctuality < 0.35) P.tags.push('Always late');
  if (P.forgiveness < 0.3) P.tags.push('Holds grudges'); else if (P.forgiveness > 0.72) P.tags.push('Lets things go');
  if (P.messy > 0.6) P.tags.push('Takes it public'); else if (P.messy < 0.18) P.tags.push('Keeps it private');
  if (P.ego > 0.75) P.tags.push('Big ego');
  if (P.warmth > 0.72) P.tags.push('Warm'); else if (P.warmth < 0.3) P.tags.push('Cold at first');
  return P;
}

/** How they say "yes", "no" and "wow" — used to colour template lines. */
export function styleNote(style: TextStyle): string {
  return {
    street: 'texts in slang, short, lowercase, the odd emoji',
    warm: 'friendly and encouraging, uses emojis, calls people "fam" or "bro"',
    blunt: 'says exactly what they think, no sugar-coating',
    dry: 'dry, sarcastic, few words, no emojis',
    flashy: 'braggy, lots of 💎🔥, talks about money and status',
    formal: 'polite and professional, full sentences, talks business',
    spiritual: 'grateful, mentions God and blessings, calm',
  }[style];
}

// ─── SPECIAL SKILLS ────────────────────────────────────────────────────────

export type SkillId =
  | 'market_reader' | 'tax_wizard' | 'haggler'
  | 'shark' | 'fixer'
  | 'spin_doctor' | 'hype_machine'
  | 'trendsetter' | 'deal_closer'
  | 'viral_eye' | 'cover_artist'
  | 'hitmaker' | 'fast_hands'
  | 'golden_ears' | 'studio_hustler'
  | 'hook_genius' | 'ghost_pen'
  | 'voice_doctor' | 'drill_sergeant' | 'stamina_coach'
  | 'organized' | 'the_plug';

export interface SpecialSkill { id: SkillId; label: string; emoji: string; blurb: string; roles: string[] }

export const SPECIAL_SKILLS: Record<SkillId, SpecialSkill> = {
  market_reader: { id: 'market_reader', label: 'Market reader', emoji: '📊', blurb: 'As your financial advisor their calls are much sharper (+15 advisor skill).', roles: ['accountant'] },
  tax_wizard: { id: 'tax_wizard', label: 'Tax wizard', emoji: '🧾', blurb: 'Claws back extra tax every week — about 1.5% of your streaming income.', roles: ['accountant'] },
  haggler: { id: 'haggler', label: 'Haggler', emoji: '🤝', blurb: '4% off every big purchase on any job, 12% when they are your deal-maker.', roles: ['accountant'] },
  shark: { id: 'shark', label: 'Shark', emoji: '🦈', blurb: 'Royalty chasing brings in 60% more; business disputes cost you half.', roles: ['lawyer'] },
  fixer: { id: 'fixer', label: 'Fixer', emoji: '🧯', blurb: 'Scandals and casino headlines hurt half as much; business fines are cut.', roles: ['lawyer'] },
  spin_doctor: { id: 'spin_doctor', label: 'Spin doctor', emoji: '🌀', blurb: 'Damage control repairs twice as much reputation.', roles: ['publicist'] },
  hype_machine: { id: 'hype_machine', label: 'Hype machine', emoji: '📣', blurb: 'Buzz work adds extra momentum and brings more interview invites.', roles: ['publicist'] },
  trendsetter: { id: 'trendsetter', label: 'Trendsetter', emoji: '🧥', blurb: 'Your clothing brand sells 12% more; designs land trends more often.', roles: ['stylist'] },
  deal_closer: { id: 'deal_closer', label: 'Brand closer', emoji: '🏷️', blurb: 'Brand deals pay 40% more.', roles: ['stylist'] },
  viral_eye: { id: 'viral_eye', label: 'Viral eye', emoji: '👁️', blurb: 'Your posts reach 10% further and follower gains are 50% bigger.', roles: ['photographer'] },
  cover_artist: { id: 'cover_artist', label: 'Cover artist', emoji: '🖼️', blurb: 'Covers and lookbooks that sell — creativity every week and +5% clothing sales.', roles: ['photographer'] },
  hitmaker: { id: 'hitmaker', label: 'Hitmaker', emoji: '💿', blurb: 'Beats they make you are 5 points better; beat sales pay 40% more.', roles: ['producer'] },
  fast_hands: { id: 'fast_hands', label: 'Fast hands', emoji: '⚡', blurb: 'Sends beats 40% more often.', roles: ['producer', 'engineer'] },
  golden_ears: { id: 'golden_ears', label: 'Golden ears', emoji: '👂', blurb: 'Studio rentals pay 40% more; their beats are 3 points better.', roles: ['engineer'] },
  studio_hustler: { id: 'studio_hustler', label: 'Studio hustler', emoji: '🔑', blurb: 'Books your room for other artists even on other jobs.', roles: ['engineer'] },
  hook_genius: { id: 'hook_genius', label: 'Hook genius', emoji: '🪝', blurb: 'Songs sold to other artists pay 50% more.', roles: ['songwriter'] },
  ghost_pen: { id: 'ghost_pen', label: 'Ghost pen', emoji: '✒️', blurb: 'Your writing and lyricism improve faster.', roles: ['songwriter'] },
  voice_doctor: { id: 'voice_doctor', label: 'Voice doctor', emoji: '🩺', blurb: 'Vocals and delivery improve faster.', roles: ['vocal_coach'] },
  drill_sergeant: { id: 'drill_sergeant', label: 'Drill sergeant', emoji: '🎖️', blurb: 'Stage presence and performance improve faster.', roles: ['trainer'] },
  stamina_coach: { id: 'stamina_coach', label: 'Stamina coach', emoji: '🔋', blurb: 'You recover 10% more energy when you rest.', roles: ['trainer', 'personal_assistant'] },
  organized: { id: 'organized', label: 'Organized', emoji: '📅', blurb: 'You never miss an appointment by accident — they get you there.', roles: ['personal_assistant'] },
  the_plug: { id: 'the_plug', label: 'The plug', emoji: '🔌', blurb: 'VIP everywhere: higher casino limits and better link-ups.', roles: ['personal_assistant'] },
};

const BY_ROLE: Record<string, SkillId[]> = {};
for (const s of Object.values(SPECIAL_SKILLS)) for (const r of s.roles) (BY_ROLE[r] ??= []).push(s.id);

/**
 * Their special skill, if they have one. Better people are more likely to
 * have one: almost nobody under skill 35, almost everybody over 80.
 */
export function specialSkillOf(npcId: string, role: string, skill: number): SpecialSkill | null {
  const pool = BY_ROLE[role];
  if (!pool?.length) return null;
  const h = hashString(`skill|${npcId}|${role}`);
  const chance = Math.max(0.05, Math.min(0.95, (skill - 25) / 60));
  if ((h % 1000) / 1000 > chance) return null;
  return SPECIAL_SKILLS[pool[(h >> 10) % pool.length]];
}

/** Does anyone on the payroll have this skill? Returns the first who does. */
export function crewWithSkill<T extends { npcId: string; role: string; skill: number }>(crew: T[] | undefined, id: SkillId): T | undefined {
  return (crew ?? []).find((c) => specialSkillOf(c.npcId, c.role, c.skill)?.id === id);
}

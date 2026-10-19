// ─── ROLES, CREWS AND CVs ──────────────────────────────────────────────────
//
// A role is not a label on a card. Every role in this file has three things
// attached to it, and all three are the point:
//
//   1. a JOB — what they actually do once they are on the payroll. An engineer
//      pushes production, a publicist slows the fame decay, a lawyer claws back
//      part of every contract cut. A hire that changes nothing is a fake
//      button with a monthly fee.
//   2. a WAGE — what that job costs every game month, scaled by who they are.
//      The good ones are expensive, and the cheap ones are cheap because they
//      are worse.
//   3. a CV — what they had done before you met them, so hiring is a judgement
//      about a person rather than a stat block.
//
// One table. If a role exists anywhere in the game it has an entry here, and
// the tick, the studio, the video shoot and the shows engine all read their
// numbers from the same place.

import type { ArtistStats, CrewMember, NPC, NPCRole } from '../types/game';
import { hashString, makeRng } from './rng';
import {
  foldHidden,
  foldVisible,
  npcTraits,
  type HiddenTrait,
  type VisibleTrait,
} from './traits';

/** Who this person is, both layers. Derived from the id, so it never drifts. */
export function traitsFor(npc: NPC): { visible: VisibleTrait[]; hidden: HiddenTrait[] } {
  return npcTraits(npc.id, npcSkill(npc));
}

/** What every action on the team screen comes back with. */
export interface TeamActionResult {
  ok: boolean;
  /** Always a full sentence, whether it worked or not. */
  message: string;
}

/**
 * Which part of the operation a seat belongs to.
 *
 * The team screen groups by this, because the question a player is asking is
 * not "who is on the payroll" — it is "which part of my career is uncovered".
 */
export type TeamDepartment = 'representation' | 'creative' | 'image' | 'life' | 'scene';

export const DEPARTMENT_LABEL: Record<TeamDepartment, string> = {
  representation: 'Representation',
  creative: 'The Booth',
  image: 'Image & Press',
  life: 'Life & Body',
  scene: 'Scene Hires',
};

export interface RoleSpec {
  role: NPCRole;
  title: string;
  emoji: string;
  /** One line on what they do for you. */
  job: string;
  /** The concrete effect, spelled out, because the player is buying it. */
  effect: string;
  /** Monthly wage band at local fame 0 … 100, before the tier multiplier. */
  wage: [number, number];
  /** Can the player put this role on the payroll at all? */
  hireable: boolean;
  /** How warm they have to be before they take your money. */
  minRelationship: number;
  /** Stats they push every week while employed. */
  boosts?: Partial<Record<keyof ArtistStats, number>>;
  /** Which part of the operation the seat belongs to. */
  department?: TeamDepartment;
  /** The one thing this seat is actually good at, named. */
  mechanic?: string;
  /** What that mechanic does, in a sentence the player can hold you to. */
  mechanicLine?: string;
  /** What local / national / international buys for this seat. */
  tiers?: [string, string, string];
}

// ─── THE TABLE ─────────────────────────────────────────────────────────────
//
// Two tiers of seat live here, and the difference matters:
//
//   • THE ARTIST'S PERSONAL TEAM — twelve seats that exist for one artist.
//     Nobody else in the scene sits in them. A producer's in-house engineer
//     works for the producer; yours works for you. That is why they are the
//     only hires whose whole job is your career rather than a craft.
//   • SCENE HIRES — the promoter, the DJ, the distributor. Real jobs, real
//     effects, but they are people the whole city can buy. A distributor
//     working for you is also working for four other artists this month.
//
// Every seat lists the mechanic it is bought for. A role whose effect cannot
// be named in one line is a role that is not doing anything.

export const ROLE_SPECS: Record<string, RoleSpec> = {
  // ── REPRESENTATION ─────────────────────────────────────────────────────
  lawyer: {
    role: 'lawyer',
    title: 'Entertainment Lawyer',
    emoji: '⚖️',
    department: 'representation',
    job: 'Reads the third page so you do not have to.',
    effect: '+business knowledge weekly, and claws back part of every contract cut.',
    wage: [950, 2300],
    hireable: true,
    minRelationship: 10,
    boosts: { businessKnowledge: 0.5, discipline: 0.1 },
    mechanic: 'Contract cover',
    mechanicLine: 'Takes a slice off every cut anyone else takes from you, and reviews the paper before you sign it.',
    tiers: [
      'Local deals and small print.',
      'National label and distribution paper.',
      'International 360s and publishing.',
    ],
  },
  accountant: {
    role: 'accountant',
    title: 'Accountant',
    emoji: '💰',
    department: 'representation',
    job: 'Counts what you are owed, and keeps what you are owed.',
    effect: '+business knowledge weekly, recovers money you were losing, and shelters income from tax.',
    wage: [800, 2200],
    hireable: true,
    minRelationship: 10,
    boosts: { businessKnowledge: 0.6, discipline: 0.15 },
    mechanic: 'Recovery',
    mechanicLine: 'Every month they find money that went missing — unclaimed royalties, overbilled fees — and file deductions that shrink the tax bill.',
    tiers: [
      'Personal books and a tax return.',
      'Catalogue accounting and royalty audits.',
      'Multi-territory structures and withholding treaties.',
    ],
  },

  // ── THE BOOTH ──────────────────────────────────────────────────────────
  producer: {
    role: 'producer',
    title: 'In-House Producer',
    emoji: '🎛️',
    department: 'creative',
    job: 'Sends you new beats every few days, builds custom beats on request, and sits in on sessions.',
    effect: 'A beat in your library every ~4 days (free), custom beats to order, +beat selection and production knowledge weekly.',
    wage: [550, 1300],
    hireable: true,
    minRelationship: 5,
    boosts: { beatSelection: 0.45, productionKnowledge: 0.3 },
    mechanic: 'Exclusivity',
    mechanicLine: 'Their beats are yours and cost you nothing to use. Cut over somebody else\'s while they are on the payroll and they will take it badly.',
    tiers: [
      'Local beats, local room.',
      'A national sound, and placements you can sell.',
      'A sound the scene copies.',
    ],
  },
  songwriter: {
    role: 'songwriter',
    title: 'Songwriter',
    emoji: '📝',
    department: 'creative',
    job: 'Writes to your voice, not to a template.',
    effect: '+songwriting and lyricism weekly.',
    wage: [700, 1900],
    hireable: true,
    minRelationship: 10,
    boosts: { songwriting: 0.5, lyricism: 0.3 },
    mechanic: 'Chemistry',
    mechanicLine: 'The longer they write for you the better it gets — the sessions shorten and the songs come out closer to finished.',
    tiers: [
      'Hooks for the room.',
      'Choruses that carry a record.',
      'Songs other artists ask for.',
    ],
  },
  engineer: {
    role: 'engineer',
    title: 'Engineer',
    emoji: '🎚️',
    department: 'creative',
    job: 'Runs the desk, cleans up your takes, and makes beats on the side.',
    effect: 'A clean beat in your library about once a week (free), shorter and cheaper sessions, +production knowledge weekly.',
    wage: [400, 950],
    hireable: true,
    minRelationship: 0,
    boosts: { productionKnowledge: 0.5, discipline: 0.1 },
    mechanic: 'Session speed',
    mechanicLine: 'Knows your voice, so the session is shorter and cheaper than booking a room cold.',
    tiers: [
      'Tracks a take cleanly.',
      'Tracks it in fewer passes.',
      'Tracks it and hands you a mix.',
    ],
  },
  vocal_coach: {
    role: 'vocal_coach',
    title: 'Vocal Coach',
    emoji: '🎤',
    department: 'creative',
    job: 'Builds the instrument, not the song.',
    effect: '+vocal ability, delivery and flow weekly.',
    wage: [350, 950],
    hireable: true,
    minRelationship: 5,
    boosts: { vocalAbility: 0.55, delivery: 0.3, flow: 0.15 },
    mechanic: 'Permanent growth',
    mechanicLine: 'What they teach you stays. The stat does not fall back when they leave — only the rate you gain it at does.',
    tiers: [
      'Breath and pitch.',
      'Range and control under pressure.',
      'Tour stamina and a signature tone.',
    ],
  },
  session_musician: {
    role: 'session_musician',
    title: 'Session Player',
    emoji: '🎸',
    department: 'creative',
    job: 'Plays what you hum at them, first take.',
    effect: '+performance and delivery weekly.',
    wage: [300, 700],
    hireable: true,
    minRelationship: 0,
    boosts: { performance: 0.5, delivery: 0.2 },
  },

  // ── IMAGE & PRESS ──────────────────────────────────────────────────────
  publicist: {
    role: 'publicist',
    title: 'Publicist & social media',
    emoji: '📣',
    department: 'image',
    job: 'Places the story and keeps your name in the room — or runs your social pages for you.',
    effect: '+marketing weekly, and your name takes longer to fade.',
    wage: [650, 1700],
    hireable: true,
    minRelationship: 15,
    boosts: { marketing: 0.5, networking: 0.2 },
    mechanic: 'Reputation',
    mechanicLine: 'A bad night costs you less while they are working, and standing you lose comes back faster.',
    tiers: [
      'Local press and the city blogs.',
      'National outlets and playlist editors.',
      'International press and crisis work.',
    ],
  },
  stylist: {
    role: 'stylist',
    title: 'Stylist',
    emoji: '👗',
    department: 'image',
    job: 'Makes sure the image matches the record.',
    effect: '+charisma and stage presence weekly, and money from brand deals.',
    wage: [350, 850],
    hireable: true,
    minRelationship: 5,
    boosts: { charisma: 0.5, stagePresence: 0.2 },
    mechanic: 'Brand deals',
    mechanicLine: 'A consistent look is what fashion houses buy. Every month they bring you a cheque that has nothing to do with music.',
    tiers: [
      'Local labels and gifting.',
      'National campaigns.',
      'Houses that pay in real money.',
    ],
  },
  photographer: {
    role: 'photographer',
    title: 'Photographer',
    emoji: '📷',
    department: 'image',
    job: 'Shoots the covers and the stills you actually use.',
    effect: '+creativity weekly, and better-looking videos.',
    wage: [300, 750],
    hireable: true,
    minRelationship: 0,
    boosts: { creativity: 0.35, originality: 0.15 },
    mechanic: 'Visual multiplier',
    mechanicLine: 'Every rollout lands harder when it looks like something — placements, posts and press all carry further.',
    tiers: [
      'Clean stills for a single.',
      'A cover and a video treatment.',
      'A visual language the era is known for.',
    ],
  },

  // ── LIFE & BODY ────────────────────────────────────────────────────────
  personal_assistant: {
    role: 'personal_assistant',
    title: 'Personal Assistant',
    emoji: '💪',
    department: 'life',
    job: 'Holds the diary, the travel and the thousand small things.',
    effect: '+discipline and networking weekly, and you recover energy faster.',
    wage: [400, 950],
    hireable: true,
    minRelationship: 5,
    boosts: { discipline: 0.3, networking: 0.2 },
    mechanic: 'Energy',
    mechanicLine: 'The logistics stop being yours, so a night off is actually a night off. Every elapsed day gives back more than it would alone.',
    tiers: [
      'Answers the phone.',
      'Runs the diary and the travel.',
      'Runs your life so you can work.',
    ],
  },
  trainer: {
    role: 'trainer',
    title: 'Trainer & Wellness',
    emoji: '🏋️',
    department: 'life',
    job: 'Keeps the body that carries the career.',
    effect: '+discipline, performance and consistency weekly, and a higher energy ceiling.',
    wage: [300, 800],
    hireable: true,
    minRelationship: 0,
    boosts: { discipline: 0.4, performance: 0.2, consistency: 0.15 },
    mechanic: 'Energy ceiling',
    mechanicLine: 'Raises the maximum you can hold, so a long day costs you less of tomorrow.',
    tiers: [
      'Basic conditioning.',
      'Tour fitness and recovery.',
      'Peak performance and a plan for the burnout.',
    ],
  },
  choreographer: {
    role: 'choreographer',
    title: 'Choreographer',
    emoji: '💃',
    department: 'life',
    job: 'Builds the routine that makes the video repeatable.',
    effect: '+stage presence and performance weekly.',
    wage: [400, 900],
    hireable: true,
    minRelationship: 5,
    boosts: { stagePresence: 0.5, performance: 0.2 },
  },
  tour_manager: {
    role: 'tour_manager',
    title: 'Tour Manager',
    emoji: '🚌',
    department: 'life',
    job: 'Runs the road so the show is the only thing you have to do.',
    effect: '+10% on every show, and +discipline weekly.',
    wage: [750, 1700],
    hireable: true,
    minRelationship: 20,
    boosts: { discipline: 0.35, businessKnowledge: 0.15 },
  },

  // ── SCENE HIRES ────────────────────────────────────────────────────────
  distributor: {
    role: 'distributor',
    title: 'Distribution Plug',
    emoji: '📦',
    department: 'scene',
    job: 'Gets your records on the shelves that actually pay.',
    effect: '+4% on every streaming payout, and +business knowledge.',
    wage: [850, 2100],
    hireable: true,
    minRelationship: 25,
    boosts: { businessKnowledge: 0.3, marketing: 0.15 },
  },
  promoter: {
    role: 'promoter',
    title: 'Promoter',
    emoji: '🎪',
    department: 'scene',
    job: 'Fills rooms and knows which ones not to book.',
    effect: '+8% on every show, and +local standing weekly.',
    wage: [600, 1500],
    hireable: true,
    minRelationship: 15,
    boosts: { networking: 0.35, marketing: 0.15 },
  },
  dj: {
    role: 'dj',
    title: 'Tour DJ',
    emoji: '🎧',
    department: 'scene',
    job: 'Plays your records before you are famous enough to headline.',
    effect: '+local fame weekly from spins, and +networking.',
    wage: [350, 800],
    hireable: true,
    minRelationship: 5,
    boosts: { networking: 0.3, charisma: 0.15 },
  },

  // ── Roles that exist in the world but are never on the payroll ──────────
  artist: { role: 'artist', title: 'Artist', emoji: '🎤', job: 'Makes the records.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  manager: { role: 'manager', title: 'Manager', emoji: '💼', job: 'Runs your career for a cut or a retainer.', effect: 'Signed on a management contract, not a wage.', wage: [0, 0], hireable: false, minRelationship: 0 },
  rival_manager: { role: 'rival_manager', title: 'Rival Manager', emoji: '🎯', job: 'Manages somebody else — and would rather manage you.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  label_ceo: { role: 'label_ceo', title: 'Label Executive', emoji: '🏢', job: 'Signs artists.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  a_and_r_scout: { role: 'a_and_r_scout', title: 'A&R Scout', emoji: '🔍', job: 'Finds acts before anyone else does.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  ar: { role: 'ar', title: 'A&R', emoji: '🔍', job: 'Signs and develops acts.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  media: { role: 'media', title: 'Media', emoji: '📰', job: 'Writes about you.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  blogger: { role: 'blogger', title: 'Blogger', emoji: '✍️', job: 'Posts about you.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  radio_owner: { role: 'radio_owner', title: 'Radio Owner', emoji: '📻', job: 'Decides what gets played.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  venue_owner: { role: 'venue_owner', title: 'Venue Owner', emoji: '🏟️', job: 'Books the room.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  investor: { role: 'investor', title: 'Investor', emoji: '💰', job: 'Puts money into careers.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
  fan_account: { role: 'fan_account', title: 'Fan Account', emoji: '📣', job: 'Posts about you for free.', effect: '—', wage: [0, 0], hireable: false, minRelationship: 0 },
};

/** Every role the player can actually put on the payroll, in table order. */
export const HIREABLE_ROLES: NPCRole[] = Object.values(ROLE_SPECS)
  .filter((s) => s.hireable)
  .map((s) => s.role);

/**
 * The twelve seats of the Artist's Personal Team, in the order the org chart
 * reads: who speaks for you, who makes the records, who shapes the image, who
 * keeps the body running.
 *
 * The manager is on this list and is NOT in `HIREABLE_ROLES`, because a manager
 * is not a wage — they take a cut or a retainer. Leaving them off the list
 * entirely is how the org chart ends up with a hole where the most important
 * person should be.
 */
export const TEAM_SEATS: Array<{ role: NPCRole | 'manager'; department: TeamDepartment }> = [
  { role: 'manager', department: 'representation' },
  { role: 'lawyer', department: 'representation' },
  { role: 'accountant', department: 'representation' },
  { role: 'producer', department: 'creative' },
  { role: 'songwriter', department: 'creative' },
  { role: 'engineer', department: 'creative' },
  { role: 'vocal_coach', department: 'creative' },
  { role: 'publicist', department: 'image' },
  { role: 'stylist', department: 'image' },
  { role: 'photographer', department: 'image' },
  { role: 'personal_assistant', department: 'life' },
  { role: 'trainer', department: 'life' },
];

/** Which department a seat belongs to, resolved through the one table. */
export function departmentOf(role: NPCRole | string): TeamDepartment {
  return ROLE_SPECS[role]?.department ?? 'scene';
}

export function roleSpec(role: NPCRole | string): RoleSpec & { department: TeamDepartment } {
  const found = ROLE_SPECS[role];
  if (found) return { ...found, department: found.department ?? 'scene' };
  return {
    role: role as NPCRole,
    title: String(role).replace(/_/g, ' '),
    emoji: '👤',
    job: '—',
    effect: '—',
    wage: [0, 0],
    hireable: false,
    minRelationship: 0,
    department: 'scene',
  };
}

export function roleTitle(role: NPCRole | string): string {
  return roleSpec(role).title;
}

// ─── THE TEAM SEATS IN THE WORLD ───────────────────────────────────────────
//
// The four seats the scene never had — a personal assistant, an accountant, a
// trainer, a vocal coach — have to come from somewhere, and the obvious answer
// is the wrong one.
//
// `generateNPCs` draws roles from one seeded RNG per country and the draws are
// sequential: `weightedRole` takes a roll, and the very next thing the loop
// does is `role === 'producer' && rng() < 0.6`, which consumes a draw for some
// roles and not others. So adding a single entry to `ROLE_WEIGHTS` shifts every
// subsequent draw in that country — every name, every tier, every fame value,
// every relationship, and every `npcDeltas` entry keyed to a person who is now
// somebody else. The world would reshuffle under a running save.
//
// So the roster draw is left exactly as it is, and these seats are assigned
// afterwards by a pure function of the id. No draws, no drift, and stable
// across reloads: the same person is your potential accountant today and in a
// year. They are drawn from the adjacent trades — the people who already do
// this work for somebody, just not for an artist.

/** How many of a base role move across, in percent. Stable per person. */
const SEAT_CONVERSIONS: Partial<Record<NPCRole, Array<{ seat: NPCRole; pct: number }>>> = {
  manager: [{ seat: 'personal_assistant', pct: 34 }],
  rival_manager: [{ seat: 'personal_assistant', pct: 30 }],
  investor: [{ seat: 'accountant', pct: 45 }],
  label_ceo: [{ seat: 'accountant', pct: 32 }],
  distributor: [{ seat: 'accountant', pct: 26 }],
  session_musician: [
    { seat: 'trainer', pct: 30 },
    { seat: 'vocal_coach', pct: 30 },
  ],
  choreographer: [
    { seat: 'trainer', pct: 40 },
    { seat: 'vocal_coach', pct: 38 },
  ],
  songwriter: [{ seat: 'vocal_coach', pct: 24 }],
};

/**
 * The seat this person actually holds, given the role the roster gave them.
 *
 * Pure. Two calls with the same id always agree, which is the only property
 * that matters — it is what lets the roster stay generated rather than saved.
 */
export function seatFor(npc: NPC): NPCRole {
  const options = SEAT_CONVERSIONS[npc.role];
  if (!options) return npc.role;
  const roll = hashString(`seat|${npc.id}`) % 100;
  let cursor = 0;
  for (const opt of options) {
    cursor += opt.pct;
    if (roll < cursor) return opt.seat;
  }
  return npc.role;
}

/**
 * A bio for a seat the roster never generated.
 *
 * The generator writes a bio from the role it drew, and these seats are
 * assigned after the fact — so a converted accountant would otherwise walk
 * around with a promoter's bio. This is seeded from the id alone, in its own
 * stream, because borrowing the roster's RNG would consume draws and shift the
 * whole country. Same reason the seats are an overlay in the first place.
 */
function seatBio(npc: NPC): string {
  const rng = makeRng(hashString(`seatbio|${npc.id}`));
  const city = npc.city || npc.country;
  const pickOne = (arr: string[]) => arr[Math.floor(rng() * arr.length)];
  switch (npc.role) {
    case 'personal_assistant':
      return `Personal assistant in ${city}. ${pickOne([
        'Has run the diary of somebody far more famous than you and is not impressed by any of it.',
        'Answers the messages you were never going to answer.',
        'Says no on your behalf, which is the actual job.',
      ])}`;
    case 'accountant':
      return `Accountant working the ${npc.country} music business. ${pickOne([
        'Has audited three catalogues and found money in all of them.',
        'Reads a royalty statement the way other people read a menu.',
        'Says the paperwork is where careers are actually won.',
      ])}`;
    case 'trainer':
      return `Trainer and wellness coach in ${city}. ${pickOne([
        'Keeps touring artists upright through a hundred-date run.',
        'Will not let a client go on stage dehydrated and it has saved careers.',
        'Trains the body, then explains why the mind needed it too.',
      ])}`;
    case 'vocal_coach':
      return `Vocal coach in ${city}. ${pickOne([
        'Rebuilt the voice of an artist who had lost it entirely.',
        'Teaches range by making people sing what they cannot reach yet.',
        'Says technique is just what you fall back on when the nerves hit.',
      ])}`;
    default:
      return npc.bio ?? `Part of the ${city} scene.`;
  }
}

/**
 * Apply the seat overlay to a roster, in place.
 *
 * Only generated NPCs are converted. The curated roster — the real headliners
 * and their managers, and the hand-written support cast — is hand-authored, and
 * relabelling a written character would be the tail wagging the dog.
 */
export function applyTeamSeats(npcs: NPC[]): NPC[] {
  for (const npc of npcs) {
    if (!npc.id.startsWith('gen_')) continue;
    const seat = seatFor(npc);
    if (seat === npc.role) continue;
    npc.role = seat;
    npc.bio = seatBio(npc);
  }
  return npcs;
}

/** The seats that exist in the world for this role, for the hiring screen. */
export function hireableSeats(): NPCRole[] {
  return HIREABLE_ROLES;
}

// ─── MONEY ─────────────────────────────────────────────────────────────────

const TIER_WAGE_MULT: Record<string, number> = { local: 1, national: 1.6, international: 2.4 };

/**
 * Competence, 0-100. Deterministic from the id so a given person is always
 * worth the same, which is what lets a wage mean anything.
 *
 * Fame is the spine of it — a well-known publicist is a better publicist — but
 * the hash spread is wide enough that a famous name can still be coasting, and
 * an unknown can be genuinely good. That gap is the whole reason to read a CV
 * before hiring rather than sorting by fame.
 */
export function npcSkill(npc: NPC): number {
  const spread = (hashString(npc.id) % 1000) / 1000; // 0..1
  const base = npc.fame * 0.55 + 22;
  const swing = (spread - 0.5) * 46;
  return Math.max(8, Math.min(99, Math.round(base + swing + (npc.skillBonus ?? 0))));
}

/**
 * How good this person could get, given who they are.
 *
 * Growth has to stop somewhere or a cheap hire would eventually outgrow the
 * people you paid for. Where it stops is not the same for everybody, and that
 * is the whole mechanic: the hard worker has somewhere to go, the lazy one is
 * already there.
 *
 * Derived, so it cannot drift, and read off the same characteristics the
 * profile shows — a player who reads "Hard working" on the card is reading the
 * reason this number is high.
 */
export function npcCeiling(npc: NPC): number {
  const spread = (hashString(`ceil|${npc.id}`) % 1000) / 1000;
  // A base ceiling that a famous name pushes up, because fame means they have
  // already been in rooms that make people better.
  const base = 52 + spread * 22 + Math.min(20, npc.fame * 0.2);
  const hid = foldHidden(traitsFor(npc).hidden);
  // The work multiplier is exactly the growth multiplier — the same trait that
  // makes their work worth more makes them better at it over time.
  const headroom = (hid.workMult - 1) * 90;
  return Math.max(npcSkill(npc), Math.min(99, Math.round(base + headroom)));
}

/**
 * Whether this person is still getting better, and how fast.
 *
 * Returns 0 for somebody at their ceiling — which is a real and common outcome,
 * not a failure. A producer who has plateaued should look like one on the
 * payroll screen rather than quietly costing the same money forever.
 */
export function growthPerMonth(npc: NPC): number {
  const skill = npcSkill(npc);
  const ceiling = npcCeiling(npc);
  if (skill >= ceiling) return 0;
  const hid = foldHidden(traitsFor(npc).hidden);
  // Base rate scales with the trait, then falls off as they approach the
  // ceiling so growth decelerates instead of hitting a wall.
  const room = (ceiling - skill) / Math.max(1, ceiling);
  return Math.max(0, 1.6 * hid.workMult * room);
}

/** Has this person got anything left to learn? */
export function stillGrowing(npc: NPC): boolean {
  return npcSkill(npc) < npcCeiling(npc);
}

/** What this person charges per game month, in dollars. */
export function crewWage(npc: NPC, role: NPCRole | string): number {
  const spec = roleSpec(role);
  if (!spec.hireable) return 0;
  const [lo, hi] = spec.wage;
  const byFame = lo + (hi - lo) * (Math.min(100, npc.fame) / 100);
  const mult = TIER_WAGE_MULT[npc.tier] ?? 1;
  const skillMult = 0.8 + npcSkill(npc) / 250; // 0.8 … 1.2
  // Who they are changes what they ask for. A greedy operator wants more, a
  // generous one charges less than they are worth, and a risk taker prices in
  // the swing they are taking.
  const traits = traitsFor(npc);
  const traitMult = foldVisible(traits.visible).wage * foldHidden(traits.hidden).wageMult;
  return Math.round((byFame * mult * skillMult * traitMult) / 50) * 50;
}

/** Months of wages the player has to have in hand before the hire lands. */
export const HIRE_MONTHS_UPFRONT = 2;

export function hireUpfrontCost(npc: NPC, role: NPCRole | string): number {
  return crewWage(npc, role) * HIRE_MONTHS_UPFRONT;
}

/** What letting someone go costs — one month, paid on the way out. */
export function severanceFor(member: CrewMember): number {
  return member.monthlyWage;
}

// ─── HIRING ────────────────────────────────────────────────────────────────

/**
 * Can this person be put on the payroll?
 *
 * Every branch returns a sentence the player can read, because a greyed-out
 * button with no explanation is the same thing as a broken one.
 */
export function hireCheck(npc: NPC, crew: CrewMember[], money: number): TeamActionResult {
  const spec = roleSpec(npc.role);

  if (!spec.hireable) {
    return {
      ok: false,
      message: `${npc.name} is not someone you put on a wage — ${spec.title.toLowerCase()}s are dealt with, not hired.`,
    };
  }
  if (crew.some((c) => c.npcId === npc.id)) {
    return { ok: false, message: `${npc.name} is already on your payroll.` };
  }
  if (npc.relationshipScore < spec.minRelationship) {
    return {
      ok: false,
      message: `${npc.name} does not know you well enough yet. Get the relationship to ${spec.minRelationship} — it is at ${npc.relationshipScore}.`,
    };
  }

  const upfront = hireUpfrontCost(npc, npc.role);
  if (money < upfront) {
    return {
      ok: false,
      message: `${npc.name} wants ${HIRE_MONTHS_UPFRONT} months up front. That is $${upfront.toLocaleString()} and you have $${Math.floor(money).toLocaleString()}.`,
    };
  }

  return {
    ok: true,
    message: `${npc.name} signs on as your ${spec.title.toLowerCase()} for $${crewWage(npc, npc.role).toLocaleString()} a month.`,
  };
}

// ─── WHAT THE CREW ACTUALLY DOES ───────────────────────────────────────────

/** One seat's named mechanic, with the number it is currently worth. */
export interface ActiveMechanic {
  role: NPCRole;
  npcName: string;
  title: string;
  /** "Chemistry", "Session speed", "Energy ceiling". */
  mechanic: string;
  /** What it is doing right now, stated with its own number in it. */
  line: string;
}

export interface CrewBonuses {
  /** Stat points added per game week. */
  stats: Partial<Record<keyof ArtistStats, number>>;
  /**
   * Multiplier on how well a show is RUN — not on what it earns.
   *
   * This used to be the show's revenue multiplier, which made the promoter a
   * percentage point on the takings and nothing else: a probe measured a
   * top-skill promoter selling exactly zero extra tickets. Selling is now
   * `promoSales`; this number is the night itself — the load-in, the changeover,
   * the sound. It feeds the performance score.
   */
  showMult: number;
  /**
   * Multiplier on ticket DEMAND, >= 1. The promoter, publicist, press, radio and
   * the DJs. This is the one that actually fills a room.
   */
  promoSales: number;
  /**
   * Multiplier on travel, freight and the cost of a logistics failure.
   * Below 1 is a tour manager.
   */
  logisticsMult: number;
  /** Multiplier on what the venue charges to open its doors. */
  venueHireMult: number;
  /** Flat points added to a live performance score — band, choreography, mix. */
  stageBonus: number;
  /** Fraction of the door a promoter takes, 0 when there is no promoter. */
  promoterCut: number;
  /** Multiplier on streaming payout. */
  payoutMult: number;
  /** Multiplier on fame decay — below 1 means the public forgets slower. */
  fameDecayMult: number;
  /** Multiplier on fan growth. */
  fanMult: number;
  /** Flat production-quality points added in the booth. */
  productionBonus: number;
  /** Flat video-quality points added on a shoot. */
  videoBonus: number;
  /** Fraction of a contract cut the lawyer claws back, 0-1. */
  cutRelief: number;
  /** Total monthly wage bill. */
  monthlyWage: number;
  /** Multiplier on the weekly drift in how the payroll feels about you. */
  friction: number;
  /** Extra spread the payroll introduces into outcomes. */
  variance: number;
  /** Occasional lines the hidden traits produce, for the event log. */
  events: string[];

  // ── The named mechanics ────────────────────────────────────────────────
  //
  // Each of these is the whole reason one seat exists. They are returned as
  // multipliers and rates rather than as dollar figures, because the tick is
  // the only place that knows what the player is earning this month — a flat
  // number here would be trivial at the top and absurd at the bottom.

  /**
   * Multiplier on energy regained from a short rest. Above 1 is a PA.
   *
   * Only `rest()` reads this, and that is deliberate. The tick's own recovery
   * goes through `elapsedRecovery`, which for any turn of a day or more is
   * already a full refill — so a multiplier there would be applied to a number
   * that is always the ceiling, and would do nothing at all. A nap is the only
   * place in the game where energy comes back in part.
   */
  energyRecovery: number;
  /**
   * Multiplier on the energy an administrative action costs. Below 1 is a PA.
   *
   * Admin is the paperwork: releasing, shopping a track out, scheduling, the
   * evening it takes to actually reach somebody. The work itself — recording,
   * mixing, a show, a session — is untouched, because no assistant can sing it
   * for you.
   */
  adminEnergy: number;
  /** Flat points added to the energy ceiling. A trainer. */
  maxEnergyBonus: number;
  /** Multiplier on studio session length. Below 1 is a fast engineer. */
  sessionSpeed: number;
  /** Multiplier on studio session cost. */
  sessionCost: number;
  /** 0-1. How well the writer or engineer knows your voice, from tenure. */
  chemistry: number;
  /** Multiplier on reputation lost to a bad night or a bad interview. */
  controversyMult: number;
  /** Multiplier on the reach of anything visual — press, posts, placements. */
  visualMult: number;
  /** Fraction of the month's income recovered from being lost. An accountant. */
  recoveryRate: number;
  /** Fraction of the month's income earned from brand deals. A stylist. */
  brandRate: number;
  /** Fraction of income sheltered from tax by an accountant, 0-1. */
  deductionRate: number;
  /** Permanent stat points added per month, capped where they land. */
  coaching: Partial<Record<keyof ArtistStats, number>>;
  /** The seats whose mechanic is live, for the team screen. */
  mechanics: ActiveMechanic[];
}

const EMPTY_BONUSES: CrewBonuses = {
  stats: {},
  showMult: 1,
  promoSales: 1,
  logisticsMult: 1,
  venueHireMult: 1,
  stageBonus: 0,
  promoterCut: 0,
  payoutMult: 1,
  fameDecayMult: 1,
  fanMult: 1,
  productionBonus: 0,
  videoBonus: 0,
  cutRelief: 0,
  monthlyWage: 0,
  friction: 1,
  variance: 0,
  events: [],
  energyRecovery: 1,
  adminEnergy: 1,
  maxEnergyBonus: 0,
  sessionSpeed: 1,
  sessionCost: 1,
  chemistry: 0,
  controversyMult: 1,
  visualMult: 1,
  recoveryRate: 0,
  brandRate: 0,
  deductionRate: 0,
  coaching: {},
  mechanics: [],
};

/**
 * How much of themselves they are currently putting in.
 *
 * Morale starts at 70 and a producer who has just watched you cut over another
 * producer's beat is not at 70 any more. At zero they are still on the payroll
 * and still doing the job — badly. This is a scale on the work, never a gate.
 */
export function moraleFactor(m: CrewMember): number {
  const morale = Math.min(100, Math.max(0, m.morale ?? 70));
  return 0.55 + morale / 160; // 0.55 at nothing left, 1.175 at all of it
}

/**
 * How well they know your voice.
 *
 * Twelve months to know it properly, front-loaded — the first three sessions
 * teach you most of what there is to learn about a person's range, and the rest
 * is refinement. Read off tenure rather than off a counter of sessions, because
 * tenure is one number the tick already owns.
 */
export function chemistryOf(m: CrewMember): number {
  const months = Math.max(0, m.monthsServed ?? 0);
  return Math.min(1, Math.log10(months + 1) / Math.log10(13));
}

/** The seat's mechanic, as a sentence with its live number in it. */
function mechanicLineFor(
  role: NPCRole,
  ctx: {
    name: string;
    chem: number;
    speed: number;
    cost: number;
    recovery: number;
    ceiling: number;
    brand: number;
    recoveryRate: number;
    deduction: number;
    controversy: number;
    visual: number;
    morale: number;
  },
): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  switch (role) {
    case 'engineer':
      return `${ctx.name} knows the room: a session takes ${pct(1 - ctx.speed)} less time and costs ${pct(1 - ctx.cost)} less than booking it cold.`;
    case 'songwriter':
      return ctx.chem >= 0.98
        ? `${ctx.name} has your voice down. Sessions come back finished.`
        : `${ctx.name} is ${pct(ctx.chem)} of the way to knowing your voice — ${Math.max(1, Math.round((1 - ctx.chem) * 12))} more month${Math.round((1 - ctx.chem) * 12) === 1 ? '' : 's'} to get there.`;
    case 'producer':
      return ctx.morale >= 85
        ? `${ctx.name} is in the room with you. The beats are yours and it shows.`
        : ctx.morale < 40
          ? `${ctx.name} is going through the motions — cutting over somebody else's beat cost you more than the session saved.`
          : `${ctx.name} is working, at ${Math.round(ctx.morale)} out of 100. Their beats cost you nothing while they are here.`;
    case 'publicist':
      return `${ctx.name} has a bad night costing ${pct(1 - ctx.controversy)} less and your standing coming back faster.`;
    case 'stylist':
      return ctx.brand > 0
        ? `${ctx.name} brings in about ${pct(ctx.brand)} of your music income again in brand work.`
        : `${ctx.name} is building a look. No house is paying for it yet.`;
    case 'photographer':
      return `${ctx.name} makes every rollout carry ${pct(ctx.visual - 1)} further.`;
    case 'accountant':
      return `${ctx.name} recovers about ${pct(ctx.recoveryRate)} of your income that would otherwise go missing, and shelters ${pct(ctx.deduction)} of it from tax.`;
    case 'trainer':
      return `${ctx.name} has your ceiling at ${ctx.ceiling} instead of 100.`;
    case 'vocal_coach':
      return `${ctx.name} is adding to your range every month, and it stays when they go.`;
    default:
      // The lawyer's line needs the cut relief, which is a running total across
      // the whole payroll rather than one seat's own number — so it is written
      // where the total exists, in the fold, not here.
      return '';
  }
}

/**
 * Fold the whole payroll into one set of numbers.
 *
 * Skill scales the benefit rather than gating it: a cheap hire is worth less
 * than a good one, never nothing. On top of that each person's characteristics
 * push the specific number they are known for, their hidden traits scale
 * everything they contribute, and their morale scales it again — which is how a
 * lazy genius ends up worth less than the wage suggests and a slighted
 * producer ends up worth less than the paperwork says.
 *
 * Returns an explicit "nothing" object when the payroll is empty so callers can
 * multiply unconditionally.
 */
export function crewBonuses(crew: CrewMember[] | undefined | null): CrewBonuses {
  if (!crew || crew.length === 0) return EMPTY_BONUSES;

  const out: CrewBonuses = { ...EMPTY_BONUSES, stats: {}, events: [], coaching: {}, mechanics: [] };

  for (const m of crew) {
    const spec = roleSpec(m.role);
    const quality = 0.6 + Math.min(100, m.skill) / 250; // 0.6 … 1.0

    const vis = foldVisible(m.visible);
    const hid = foldHidden(m.hidden);
    // The hidden layer scales what they contribute, not what they cost — the
    // cost side is settled at hire time in `crewWage`.
    const work = hid.workMult;
    // How much of themselves they are putting in right now.
    const mood = moraleFactor(m);
    // The one number that only grows with time.
    const chem = chemistryOf(m);
    // Everything a seat contributes is scaled by all three.
    const k = quality * work * mood;

    out.monthlyWage += m.monthlyWage;
    out.friction *= hid.friction;
    out.variance += vis.variance;
    out.events.push(...hid.events);

    if (spec.boosts) {
      for (const [stat, amount] of Object.entries(spec.boosts)) {
        const key = stat as keyof ArtistStats;
        out.stats[key] = (out.stats[key] ?? 0) + (amount ?? 0) * k * vis.boost;
      }
    }

    // The characteristic effect, scaled the same way as the role's own job.
    out.productionBonus += vis.production * work;
    out.videoBonus += vis.video * work;
    out.showMult += vis.show * quality * work;
    out.payoutMult += vis.payout * quality * work;
    out.cutRelief += vis.cutRelief * work;
    out.fanMult *= 1 + (vis.fans - 1) * k;

    switch (m.role) {
      // ── THE BOOTH ────────────────────────────────────────────────────
      case 'engineer': {
        // Session speed. Chemistry is the whole mechanic: an engineer who has
        // heard you a hundred times does not need a hundred takes.
        const speed = (0.16 + 0.14 * chem) * k;
        const cost = (0.10 + 0.10 * chem) * k;
        out.sessionSpeed -= speed;
        out.sessionCost -= cost;
        out.productionBonus += 3 * k;
        out.chemistry = Math.max(out.chemistry, chem);
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Session speed',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: Math.max(0.6, out.sessionSpeed),
            cost: Math.max(0.7, out.sessionCost), recovery: 1, ceiling: 100,
            brand: 0, recoveryRate: 0, deduction: 0, controversy: 1, visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }
      case 'producer': {
        // Exclusivity. The bonus is real, and it is paid for with morale —
        // cutting over somebody else's beat takes it away again.
        out.productionBonus += 3.5 * k;
        out.chemistry = Math.max(out.chemistry, chem);
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Exclusivity',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1, ceiling: 100,
            brand: 0, recoveryRate: 0, deduction: 0, controversy: 1, visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }
      case 'songwriter': {
        // Chemistry. A writer who has been with you for a year is not the same
        // writer who arrived — and the difference is in the songs, not the log.
        out.productionBonus += (1.5 + 3 * chem) * k;
        out.chemistry = Math.max(out.chemistry, chem);
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Chemistry',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1, ceiling: 100,
            brand: 0, recoveryRate: 0, deduction: 0, controversy: 1, visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }
      case 'vocal_coach': {
        // Permanent growth. Written to the stats by the tick, and it does not
        // come back down when they leave — only the rate does.
        const add = (base: number, stat: keyof ArtistStats) => {
          out.coaching[stat] = (out.coaching[stat] ?? 0) + base * k;
        };
        add(0.45, 'vocalAbility');
        add(0.28, 'delivery');
        add(0.16, 'flow');
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Permanent growth',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1, ceiling: 100,
            brand: 0, recoveryRate: 0, deduction: 0, controversy: 1, visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }

      // ── IMAGE & PRESS ────────────────────────────────────────────────
      case 'publicist': {
        // Reputation. Slower decay, and a bad night costs less while they work.
        out.fameDecayMult -= 0.25 * k;
        out.controversyMult -= 0.30 * k;
        // And they sell tickets: the announcement campaign is the show's first
        // sales push, and the crisis spin is what stops a flop becoming a story.
        out.promoSales += 0.07 * k;
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Reputation',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1, ceiling: 100,
            brand: 0, recoveryRate: 0, deduction: 0,
            controversy: Math.max(0.45, out.controversyMult), visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }
      case 'stylist': {
        // Brand deals. Sized as a share of music income, because a house pays
        // for the audience, not for the wardrobe.
        out.brandRate += 0.055 * k;
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Brand deals',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1, ceiling: 100,
            brand: out.brandRate, recoveryRate: 0, deduction: 0, controversy: 1, visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }
      case 'photographer': {
        // Visual multiplier. Every rollout lands harder when it looks right.
        out.videoBonus += 5 * k;
        out.visualMult += 0.12 * k;
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Visual multiplier',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1, ceiling: 100,
            brand: 0, recoveryRate: 0, deduction: 0, controversy: 1, visual: out.visualMult, morale: m.morale ?? 70,
          }),
        });
        break;
      }

      // ── LIFE & BODY ──────────────────────────────────────────────────
      case 'personal_assistant': {
        // Energy, in the two places it is actually spent. Admin is the
        // paperwork and the logistics; the short rest is the only recovery in
        // the game that comes back in part rather than as a full refill.
        out.adminEnergy -= 0.22 * k;
        out.energyRecovery += 0.35 * k;
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Energy',
          line: `${m.npcName} takes ${Math.round((1 - Math.max(0.5, out.adminEnergy)) * 100)}% off the paperwork and gives back ${Math.round((out.energyRecovery - 1) * 100)}% more from a nap.`,
        });
        break;
      }
      case 'trainer': {
        // Energy ceiling. Not a discount on effort — more of it to spend.
        out.maxEnergyBonus += 4 + 10 * k;
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Energy ceiling',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1,
            ceiling: Math.round(100 + out.maxEnergyBonus), brand: 0, recoveryRate: 0, deduction: 0,
            controversy: 1, visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }

      // ── REPRESENTATION ───────────────────────────────────────────────
      case 'accountant': {
        // Recovery and deductions. Both are real money and a real tax line.
        out.recoveryRate += 0.035 * k;
        out.deductionRate += 0.075 * k;
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Recovery',
          line: mechanicLineFor(m.role, {
            name: m.npcName, chem, speed: 1, cost: 1, recovery: 1, ceiling: 100,
            brand: 0, recoveryRate: out.recoveryRate, deduction: Math.min(0.18, out.deductionRate),
            controversy: 1, visual: 1, morale: m.morale ?? 70,
          }),
        });
        break;
      }
      case 'lawyer': {
        out.cutRelief += 0.2 * k;
        out.mechanics.push({
          role: m.role, npcName: m.npcName, title: spec.title, mechanic: 'Contract cover',
          line: `${m.npcName} takes ${Math.round(Math.min(0.6, out.cutRelief) * 100)}% off every cut somebody else takes from you.`,
        });
        break;
      }

      // ── SCENE HIRES ──────────────────────────────────────────────────
      //
      // These are the seats a live show runs on, and before this they were
      // decoration: `promoter` and `tour_manager` each added a few percent to
      // the takings and every other role did nothing at all to a show.
      case 'tour_manager':
        // Logistics. Nothing here multiplies the money — it stops the money
        // being lost to a missed load-in and a hotel that was never booked.
        out.showMult += 0.10 * k;
        out.logisticsMult -= 0.24 * k;
        break;
      case 'promoter':
        // SELLING. The largest single lever on a room, and the reason the role
        // exists. They take a cut of the door for it.
        out.promoSales += 0.18 * k;
        out.promoterCut = Math.max(out.promoterCut, Math.min(0.16, 0.09 + 0.07 * k));
        out.showMult += 0.08 * k;
        break;
      case 'venue_owner':
        // Rental terms, and a room that opens its doors to you.
        out.venueHireMult -= 0.18 * k;
        break;
      case 'blogger':
      case 'media':
        // Coverage is demand. A write-up is worth seats.
        out.promoSales += 0.07 * k;
        break;
      case 'dj':
        // Club premieres and afterparties — the grassroots half of a rollout.
        out.promoSales += 0.05 * k;
        break;
      case 'radio_owner':
        // Radio ads and station visits are the strongest regional lever there is.
        out.promoSales += 0.09 * k;
        break;

      // ── THE STAGE ────────────────────────────────────────────────────
      case 'choreographer':
        out.stageBonus += 6 * k;
        break;
      case 'session_musician':
        // A live band is the difference between a set and a show.
        out.stageBonus += 5 * k;
        break;

      case 'distributor':
        out.payoutMult += 0.04 * k;
        break;
      default:
        break;
    }
  }

  out.fameDecayMult = Math.max(0.3, out.fameDecayMult);
  out.cutRelief = Math.min(0.6, out.cutRelief);
  out.sessionSpeed = Math.max(0.6, out.sessionSpeed);
  out.sessionCost = Math.max(0.7, out.sessionCost);
  out.controversyMult = Math.max(0.45, out.controversyMult);
  out.deductionRate = Math.min(0.18, out.deductionRate);
  out.recoveryRate = Math.min(0.09, out.recoveryRate);

  // ── The show levers ──────────────────────────────────────────────────────
  //
  // `showMult` is no longer a revenue multiplier, so it has to LAND somewhere
  // or the tour manager and the visible traits would go back to doing nothing.
  // It lands on the performance: a night that is run properly — a load-in that
  // happens, a changeover that is quick, a monitor mix that is right — is a
  // better night to be in the room for.
  out.stageBonus += (out.showMult - 1) * 40;
  // Nobody can out-promote the size of the room, and no seat sells twice.
  out.promoSales = Math.min(2.6, Math.max(1, out.promoSales));
  out.logisticsMult = Math.max(0.5, out.logisticsMult);
  out.venueHireMult = Math.max(0.6, out.venueHireMult);
  out.stageBonus = Math.min(24, out.stageBonus);
  out.brandRate = Math.min(0.14, out.brandRate);
  out.adminEnergy = Math.max(0.5, out.adminEnergy);
  return out;
}

/** The seats with a live mechanic, for the team screen. */
export function activeMechanics(crew: CrewMember[] | undefined | null): ActiveMechanic[] {
  return crewBonuses(crew).mechanics;
}

/**
 * What a manager's loyalty is worth, 0-1.
 *
 * A manager is the only person on this list who is not on a wage, so the only
 * thing keeping them working is the relationship. This is read off the score
 * the rest of the game already keeps, which means ignoring your manager — never
 * replying, never showing up — has a price that shows up in what they land.
 */
export function managerLoyalty(npc: NPC | undefined | null): number {
  if (!npc) return 0;
  const score = Math.min(100, Math.max(-100, npc.relationshipScore));
  return Math.min(1, Math.max(0, (score + 20) / 110));
}

/** One line describing who is on the payroll, for the dashboard. */
export function crewHeadline(crew: CrewMember[] | undefined | null): string {
  const n = crew?.length ?? 0;
  if (n === 0) return 'No one on the payroll';
  return n === 1 ? '1 person on the payroll' : `${n} people on the payroll`;
}

// ─── CVs ───────────────────────────────────────────────────────────────────

export interface CVEntry {
  year: number;
  text: string;
}

export interface NPCCV {
  /** The one-line summary at the top of the CV. */
  headline: string;
  yearsActive: number;
  credits: CVEntry[];
  strengths: string[];
  /** An honest read on whether they are worth the money. */
  verdict: string;
  skill: number;
}

/**
 * The track record.
 *
 * Derived, never saved: a CV is a fact about who somebody is, and the roster is
 * regenerated deterministically on every load. Computing it from the id means
 * it costs nothing to store and can never drift from the person it describes.
 *
 * Every credit is invented and belongs to a fictional scene — the real artists
 * in `realArtists.ts` are given no credits here, because the game has no
 * business putting words in a real person's mouth.
 */
export function npcCV(npc: NPC, currentYear: number): NPCCV {
  const rng = makeRng(hashString(`cv|${npc.id}`));
  const skill = npcSkill(npc);
  const place = npc.city ? `${npc.city}` : npc.country;
  const genre = npc.genre ? npc.genre.replace(/_/g, '-') : 'the local sound';

  // Somebody is as long in the game as their age allows, biased by fame.
  const yearsActive = Math.max(
    1,
    Math.min(Math.round(npc.age - 19), Math.round(3 + npc.fame / 4 + rng() * 6)),
  );
  const startYear = currentYear - yearsActive;

  const credits: CVEntry[] = [];
  const count = 3 + Math.floor(rng() * 2); // 3 or 4

  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const smallN = 4 + Math.floor(rng() * 40);
  const bigN = 1 + Math.floor(rng() * 9);

  for (let i = 0; i < count; i++) {
    const year = startYear + Math.round(((i + 1) / (count + 0.4)) * yearsActive);
    credits.push({ year, text: creditFor(npc.role, { place, genre, smallN, bigN, rng, pick }) });
  }

  const strengths = buildStrengths(npc, skill);
  const verdict = buildVerdict(npc, skill, yearsActive);

  return {
    headline: `${roleSpec(npc.role).title} · ${yearsActive} year${yearsActive === 1 ? '' : 's'} in the game · based in ${place}`,
    yearsActive,
    credits: credits.sort((a, b) => b.year - a.year),
    strengths,
    verdict,
    skill,
  };
}

function creditFor(
  role: NPCRole,
  ctx: {
    place: string;
    genre: string;
    smallN: number;
    bigN: number;
    rng: () => number;
    pick: <T>(arr: T[]) => T;
  },
): string {
  const { place, genre, smallN, bigN, pick } = ctx;

  switch (role) {
    case 'engineer':
      return pick([
        `Tracked and mixed ${smallN} sessions out of a back room in ${place}.`,
        `Engineered ${bigN} records that charted nationally.`,
        `Ran the desk on a ${genre} project that broke a local act.`,
      ]);
    case 'producer':
      return pick([
        `Built the beat for ${bigN} records that went top 40.`,
        `Produced a whole ${genre} project in eleven days.`,
        `Took an unsigned act from ${place} to a national playlist.`,
      ]);
    case 'songwriter':
      return pick([
        `Wrote ${smallN} songs for other people's albums.`,
        `Co-wrote a record that spent ${bigN} weeks on the national chart.`,
        `Toplined ${bigN} ${genre} cuts that were never credited to them.`,
      ]);
    case 'publicist':
      return pick([
        `Placed ${smallN} features across African music press.`,
        `Ran the campaign that made a ${place} act nationally known.`,
        `Handled a crisis that should have ended a career.`,
      ]);
    case 'lawyer':
      return pick([
        `Closed ${smallN} publishing and distribution deals.`,
        `Recovered unpaid royalties for ${bigN} artists.`,
        `Got an act out of a seven-year contract that should have been permanent.`,
      ]);
    case 'tour_manager':
      return pick([
        `Ran a ${bigN}-city run across two continents without a missed date.`,
        `Toured ${smallN} shows in a single year.`,
        `Took a club act onto a festival stage and back.`,
      ]);
    case 'promoter':
      return pick([
        `Sold out ${smallN} nights in ${place}.`,
        `Built a ${genre} night from nothing into the room everyone wants.`,
        `Promoted ${bigN} regional tours.`,
      ]);
    case 'dj':
      return pick([
        `Held a residency in ${place} for ${bigN} years.`,
        `Broke ${smallN} records on club rotation before radio touched them.`,
        `Toured as support on ${bigN} national runs.`,
      ]);
    case 'stylist':
      return pick([
        `Styled ${smallN} video shoots and two album covers.`,
        `Built the look that a ${place} act is now known for.`,
        `Dressed ${bigN} artists for award season.`,
      ]);
    case 'photographer':
      return pick([
        `Shot ${smallN} covers for artists in ${place}.`,
        `Did the press stills for ${bigN} national campaigns.`,
        `Documented a whole ${genre} scene from the inside.`,
      ]);
    case 'session_musician':
      return pick([
        `Played on ${smallN} sessions as a hired hand.`,
        `Held down the band for ${bigN} touring acts.`,
        `Played live on a record that is still on rotation.`,
      ]);
    case 'choreographer':
      return pick([
        `Built routines for ${smallN} videos.`,
        `Choreographed ${bigN} award-show performances.`,
        `Trained a ${place} act to move properly on stage.`,
      ]);
    case 'distributor':
      return pick([
        `Delivered ${smallN} releases across every major platform.`,
        `Got ${bigN} independent labels onto editorial playlists.`,
        `Cleaned up a catalogue's metadata that had been wrong for years.`,
      ]);
    case 'personal_assistant':
      return pick([
        `Ran the diary for ${bigN} touring artists at once.`,
        `Held a schedule together through ${smallN} shows in a year.`,
        `Took a client off the road when they needed it, which nobody else would do.`,
      ]);
    case 'accountant':
      return pick([
        `Audited ${smallN} royalty statements and found money in all of them.`,
        `Unpicked a ${bigN}-year catalogue accounting mess.`,
        `Filed returns for acts in ${bigN} territories.`,
      ]);
    case 'trainer':
      return pick([
        `Conditioned ${bigN} artists through full-length tours.`,
        `Ran recovery programmes for ${smallN} acts on the road.`,
        `Took a burned-out client from the sofa back to a stage.`,
      ]);
    case 'vocal_coach':
      return pick([
        `Rebuilt the voice of ${bigN} artists who thought it was gone.`,
        `Coached ${smallN} singers through a career's worth of technique.`,
        `Took a rapper with no range to somebody who can hold a note live.`,
      ]);
    case 'manager':
      return pick([
        `Guided ${bigN} acts out of ${place} and into national deals.`,
        `Managed a client through ${smallN} shows in one year.`,
        `Negotiated a deal that was reported in the trade press.`,
      ]);
    case 'rival_manager':
      return pick([
        `Manages a roster of ${bigN} acts, all of them working.`,
        `Took a client from local clubs to an international booking.`,
        `Known for closing deals other managers walked away from.`,
      ]);
    case 'label_ceo':
      return pick([
        `Signed ${smallN} artists and released a hundred records.`,
        `Built a label out of ${place} with no outside money.`,
        `Broke ${bigN} acts internationally.`,
      ]);
    case 'media':
    case 'blogger':
      return pick([
        `Wrote ${smallN} features on the ${place} scene.`,
        `Broke ${bigN} stories that the majors had to answer.`,
        `Ran the interview series every ${genre} act wanted to be on.`,
      ]);
    case 'radio_owner':
      return pick([
        `Programmed ${smallN} records into rotation.`,
        `Broke ${bigN} acts on radio before anyone else played them.`,
        `Built a station in ${place} into a national brand.`,
      ]);
    case 'a_and_r_scout':
    case 'ar':
      return pick([
        `Signed ${bigN} acts, ${smallN} of them still working.`,
        `Found an artist in ${place} that the whole industry then chased.`,
        `Built an A&R pipeline out of nothing.`,
      ]);
    case 'venue_owner':
      return pick([
        `Booked ${smallN} shows a year for a decade.`,
        `Gave ${bigN} acts their first proper stage.`,
        `Kept a ${place} room open when the money was not there.`,
      ]);
    case 'investor':
      return pick([
        `Put money into ${bigN} catalogues and got it back.`,
        `Backed ${smallN} independent releases.`,
        `Funded a ${place} studio that is still running.`,
      ]);
    default:
      return `Worked the ${place} scene for ${yearsLabel(bigN)}.`;
  }
}

function yearsLabel(n: number): string {
  return n <= 1 ? 'a year' : `${n} years`;
}

function buildStrengths(npc: NPC, skill: number): string[] {
  const out = npc.personality.slice(0, 3).map((t) => t.replace(/_/g, ' '));
  if (skill >= 80) out.push('at the top of their field');
  else if (skill >= 60) out.push('genuinely good');
  else if (skill < 35) out.push('still learning');
  return out;
}

function buildVerdict(npc: NPC, skill: number, yearsActive: number): string {
  if (skill >= 82) {
    return `${npc.name} is expensive and worth it. ${yearsActive} years in and still the best in the room.`;
  }
  if (skill >= 62) {
    return `${npc.name} is solid, consistent, and will not embarrass you.`;
  }
  if (skill >= 42) {
    return `${npc.name} is affordable and green. The work will be fine, not special.`;
  }
  if (skill >= 25) {
    return `${npc.name} is cheap for a reason. You will spend as much time fixing it as they save you.`;
  }
  return `${npc.name} is not ready for the work you need doing. This would be a favour, not a hire.`;
}

// ─── MANAGEMENT DEALS ──────────────────────────────────────────────────────

export interface DealSummary {
  kind: 'commission' | 'retainer';
  /** The headline number, e.g. "18% of gross" or "$1,400 / month". */
  headline: string;
  /** What it means in practice. */
  detail: string;
}

/**
 * Read a management contract's terms back as two sentences.
 *
 * The point of this function is that the player should never have to work out
 * what they signed. A commission deal and a retainer deal are described in the
 * same shape, so they can be compared at a glance.
 */
export function describeDeal(terms: {
  percentage?: number;
  monthlyFee?: number;
  feeKind?: 'commission' | 'retainer';
  lengthYears?: number;
  minMonths?: number;
}): DealSummary {
  const years = terms.lengthYears ?? 2;
  const kind = terms.feeKind ?? (terms.monthlyFee && !terms.percentage ? 'retainer' : 'commission');

  if (kind === 'retainer') {
    const fee = terms.monthlyFee ?? 0;
    return {
      kind,
      headline: `$${fee.toLocaleString()} / month`,
      detail: `A flat fee for ${years} year${years === 1 ? '' : 's'}, whether you earn or not. Nothing is taken out of your income.`,
    };
  }

  const pct = terms.percentage ?? 0;
  return {
    kind,
    headline: `${pct}% of gross`,
    detail: `A ${pct}% cut of everything you earn for ${years} year${years === 1 ? '' : 's'} — and nothing at all until the money comes in.`,
  };
}

/**
 * What a manager is actually worth to you.
 *
 * A manager is not a wage, so their effect has to be visible somewhere or the
 * whole deal is a bill. This is the one number: how much better the offers
 * coming at you get while they are working your corner.
 *
 * A manager who is *Connected* is worth far more here than the same manager
 * without it — that characteristic is the whole reason to sign one rather than
 * the other, so it has to move this number and not just the prose.
 */
export function managerNetwork(npc: NPC | undefined | null): number {
  if (!npc) return 0;
  const base = npc.fame * 0.75 + npcSkill(npc) * 0.35;
  const connected = foldVisible(traitsFor(npc).visible).network;
  // Loyalty is a scale on the whole thing, not an addition to it. A manager who
  // has stopped believing in you does not lose their contacts — they stop
  // spending them on you, which is a different and worse outcome.
  const loyalty = 0.55 + managerLoyalty(npc) * 0.45;
  return Math.max(0, Math.min(100, Math.round((base + connected) * loyalty)));
}

export function managerEffectLine(npc: NPC | undefined | null): string {
  if (!npc) return 'No representation. Offers find you or they do not.';
  const net = managerNetwork(npc);
  const loyalty = managerLoyalty(npc);
  if (loyalty < 0.45) {
    return 'They are still on the paperwork and no longer on your side. Fix the relationship or the calls stop landing.';
  }
  if (net >= 70) return 'Connected enough to get you into rooms you cannot book yourself.';
  if (net >= 45) return 'A real network — better offers land, and they land sooner.';
  if (net >= 25) return 'Still building. The calls they make are useful, not decisive.';
  return 'Learning on your time. Expect to chase things yourself.';
}

// ─── WHAT A MANAGER ACTUALLY DOES WITH A MONTH ─────────────────────────────
//
// A manager takes a cut or a retainer, and until this existed the only things
// that bought you were a fanbase conversion multiplier and a nudge in a
// negotiation — both invisible, both small. The player signed somebody, watched
// the money leave every month, and saw nothing arrive. "He is just in the game,
// doing nothing" was a fair reading of the code.
//
// So the job is now explicit and it runs every month: they place you (a room
// you could not book yourself), and they bring you money (somebody else's
// budget, negotiated on your behalf). Both are sized by `managerNetwork`, so
// the difference between a well-connected manager and a hopeful one is the
// difference in what lands on your desk.
//
// Pure, with the rolls injected, so the outcome can be tested without mocking
// anything — the same shape as the feature negotiation.

/** Places that will put you in front of an audience, if somebody asks them to. */
const MANAGER_OUTLETS = [
  'a national breakfast show',
  'the biggest playlist on the platform',
  'a late-night TV slot',
  'a magazine cover feature',
  'a festival side stage',
  'a syndicated radio interview',
  'a prime-time talent showcase',
];

/** Invented brands, deliberately. Real companies have not endorsed anybody here. */
const MANAGER_BRANDS = [
  'Aduke Mobile',
  'Kente Athletic',
  'Volta Energy',
  'Sankofa Sound',
  'Harmattan Coffee',
  'Zongo Motors',
  'Black Star Beverages',
];

export interface ManagerMonthResult {
  /** A room they got you into. Raises standing; pays nothing directly. */
  placement: { outlet: string; fame: number; fans: number } | null;
  /** Somebody else's budget, negotiated on your behalf. */
  endorsement: { brand: string; amount: number } | null;
  /**
   * What they report, always. A manager who got you nothing this month says so
   * — "nothing landed" is information the player paid for, and silence is
   * indistinguishable from a broken feature.
   */
  report: string;
}

/**
 * Run one month of management.
 *
 * `net` is `managerNetwork` — 0-100, the whole reason to sign one person over
 * another. The player's own standing gates the size of what can be landed: a
 * manager cannot place an artist nobody has heard of on a national show, and no
 * brand is paying a cheque to somebody with no audience. That is what makes the
 * hire worth more later than it is on day one.
 */
export function managerMonth(input: {
  net: number;
  playerFame: number;
  fanbase: number;
  /** Injected so the outcome is deterministic for a given set of rolls. */
  rollPlacement: number;
  rollEndorsement: number;
  pickOutlet: number;
  pickBrand: number;
  sizeRoll: number;
}): ManagerMonthResult {
  const { net, playerFame, fanbase } = input;

  // Nobody can sell an artist with no profile at all. Below this the manager is
  // working on your development, which is what the fanbase multiplier already
  // covers.
  const sellable = playerFame >= 8;

  // ── A placement ────────────────────────────────────────────────────────
  // A well-connected manager places you most months; a weak one rarely does.
  const placementChance = sellable ? Math.min(0.85, 0.12 + net / 140) : 0;
  let placement: ManagerMonthResult['placement'] = null;
  if (input.rollPlacement < placementChance) {
    const outlet = MANAGER_OUTLETS[Math.floor(input.pickOutlet * MANAGER_OUTLETS.length) % MANAGER_OUTLETS.length];
    // A placement is worth what the room is worth and what you can carry in it.
    const fame = Math.round((1.5 + net / 22) * (0.7 + input.sizeRoll * 0.6) * 10) / 10;
    const fans = Math.round((40 + net * 6) * (0.6 + input.sizeRoll * 0.8));
    placement = { outlet, fame, fans };
  }

  // ── An endorsement ─────────────────────────────────────────────────────
  // Money is harder than exposure and needs a bigger profile to exist at all.
  const endorsementChance = sellable ? Math.min(0.6, Math.max(0, (net - 20) / 180)) : 0;
  let endorsement: ManagerMonthResult['endorsement'] = null;
  if (input.rollEndorsement < endorsementChance) {
    const brand = MANAGER_BRANDS[Math.floor(input.pickBrand * MANAGER_BRANDS.length) % MANAGER_BRANDS.length];
    // Sized by reach, not by the manager alone: a brand buys audience, and the
    // manager's job is to get you a better price for the audience you have.
    const reach = playerFame * 180 + Math.sqrt(Math.max(0, fanbase)) * 60;
    const amount = Math.round((reach * (0.55 + net / 160) * (0.7 + input.sizeRoll * 0.6)) / 100) * 100;
    if (amount >= 500) endorsement = { brand, amount };
  }

  // ── The report ─────────────────────────────────────────────────────────
  const parts: string[] = [];
  if (placement) parts.push(`got you ${placement.outlet}`);
  if (endorsement) parts.push(`closed ${endorsement.brand} for $${endorsement.amount.toLocaleString()}`);

  let report: string;
  if (parts.length === 0) {
    report = sellable
      ? 'made the calls. Nothing landed this month — that happens, and it is not free.'
      : 'is still building your name. Nobody is buying yet, and that is the honest position.';
  } else {
    report = parts.join(', and ');
  }

  return { placement, endorsement, report };
}

/**
 * What they will actually do with the next month, in one sentence.
 *
 * The player is buying a service, not a stat, so the panel has to say what the
 * service is. The percentages are computed from the same `managerNetwork` the
 * tick pays out on, so the promise on the screen and the payout in the log
 * cannot drift apart.
 */
export function managerJobLine(npc: NPC | undefined | null): string {
  if (!npc) return 'Nobody is working your corner. Deals arrive by luck, or not at all.';
  const net = managerNetwork(npc);
  const placeChance = Math.round(Math.min(0.85, 0.12 + net / 140) * 100);
  const dealChance = Math.round(Math.min(0.6, Math.max(0, (net - 20) / 180)) * 100);
  if (dealChance <= 0) {
    return `Every month they make the calls: roughly a ${placeChance}% chance of a placement, and no brand is buying you yet.`;
  }
  return `Every month they make the calls: roughly a ${placeChance}% chance of a placement and a ${dealChance}% chance of landing a paid deal.`;
}

// ─── JOBS ──────────────────────────────────────────────────────────────────
//
// The floor under the whole economy. A rapper with no fanbase and no catalogue
// still has to eat, and before this existed the only way to make money was to
// book a show, which is not something an unknown can do.
//
// The board is rolled deterministically from the turn number, so it rotates as
// weeks pass and the same turn always produces the same board (no save
// bloat, and re-opening the screen cannot be used to reroll for a better list).
//
// The labour tier is ALWAYS present. Whatever else is on offer, there is always
// something a broke unknown can do today — that is the point of it.

import type { ArtistStats, JobCategory, JobListing } from '../types/game';
import { makeRng } from '../sim/rng';

interface JobTemplate {
  title: string;
  employer: string;
  category: JobCategory;
  basePay: number;
  energyCost: number;
  daysCost: number;
  requirement: { stat: keyof ArtistStats; min: number; label: string } | null;
  fameRequired: number;
  blurb: string;
  outcome: string;
  /** Labour work is not fame-scaled — a name does not deliver parcels faster. */
  scalesWithFame: boolean;
}

const TEMPLATES: JobTemplate[] = [
  // ── The floor. Always available, always available to anyone. ────────────
  {
    title: 'Studio Runner', employer: 'Various studios', category: 'labour',
    basePay: 180, energyCost: 24, daysCost: 1, requirement: null, fameRequired: 0,
    blurb: 'Cables, coffees, and sitting in on sessions you were not invited to.',
    outcome: 'Long day. You watched how the engineers work, though.',
    scalesWithFame: false,
  },
  {
    title: 'Deliveries', employer: 'City courier', category: 'labour',
    basePay: 220, energyCost: 30, daysCost: 1, requirement: null, fameRequired: 0,
    blurb: 'Bike, phone, and the whole city to get across before dark.',
    outcome: 'Legs dead, rent paid. Bars written at every red light.',
    scalesWithFame: false,
  },
  {
    title: 'Venue Crew', employer: 'Local venues', category: 'labour',
    basePay: 260, energyCost: 32, daysCost: 1, requirement: null, fameRequired: 0,
    blurb: 'Load-in, load-out, and watching the headline act from the side of the stage.',
    outcome: 'You watched the headline set from the wings. Took notes.',
    scalesWithFame: false,
  },

  // ── Session work. Paid for craft. ───────────────────────────────────────
  {
    title: 'Session Feature', employer: 'Local act', category: 'session',
    basePay: 450, energyCost: 26, daysCost: 1,
    requirement: { stat: 'flow', min: 45, label: 'Flow 45' }, fameRequired: 0,
    blurb: 'Someone needs sixteen bars that actually land. That is the whole job.',
    outcome: 'You laid the verse in two takes. They asked for your number.',
    scalesWithFame: true,
  },
  {
    title: 'Ghostwrite a Hook', employer: 'Anonymous client', category: 'writing',
    basePay: 650, energyCost: 28, daysCost: 2,
    requirement: { stat: 'songwriting', min: 50, label: 'Songwriting 50' }, fameRequired: 0,
    blurb: 'No credit, no royalties, cash on delivery. Your name stays off it.',
    outcome: 'The hook is theirs now. The money is yours.',
    scalesWithFame: true,
  },
  {
    title: 'Topline Session', employer: 'Production house', category: 'session',
    basePay: 850, energyCost: 30, daysCost: 2,
    requirement: { stat: 'vocalAbility', min: 55, label: 'Vocal 55' }, fameRequired: 0,
    blurb: 'Melody and vocals over someone else\'s beat, all day in the booth.',
    outcome: 'Eight hours of comping later, the topline is finished.',
    scalesWithFame: true,
  },

  // ── Live work. ──────────────────────────────────────────────────────────
  {
    title: 'Open Mic Slot', employer: 'The Basement', category: 'performance',
    basePay: 150, energyCost: 16, daysCost: 1, requirement: null, fameRequired: 0,
    blurb: 'Ten minutes, a hostile room, and a hat going round afterwards.',
    outcome: 'Ten minutes. Half the room looked up.',
    scalesWithFame: false,
  },
  {
    title: 'Club Set', employer: 'Nightclub circuit', category: 'performance',
    basePay: 500, energyCost: 24, daysCost: 1,
    requirement: { stat: 'stagePresence', min: 40, label: 'Stage Presence 40' }, fameRequired: 0,
    blurb: 'Support slot. Twenty minutes to win over a crowd that came for someone else.',
    outcome: 'You won them over by the third song.',
    scalesWithFame: true,
  },
  {
    title: 'Corporate / Wedding Gig', employer: 'Events agency', category: 'performance',
    basePay: 950, energyCost: 26, daysCost: 1,
    requirement: { stat: 'stagePresence', min: 55, label: 'Stage Presence 55' }, fameRequired: 10,
    blurb: 'Clean versions only. Nobody there knows your songs. The cheque clears.',
    outcome: 'Nobody knew a single word. The cheque cleared anyway.',
    scalesWithFame: true,
  },

  // ── Media. ──────────────────────────────────────────────────────────────
  {
    title: 'Radio Drop', employer: 'Local station', category: 'media',
    basePay: 300, energyCost: 12, daysCost: 1, requirement: null, fameRequired: 0,
    blurb: 'Twenty seconds of your voice between records. Easy money, if they play it.',
    outcome: 'Recorded in one take. It is in rotation this week.',
    scalesWithFame: true,
  },
  {
    title: 'Podcast Guest', employer: 'Scene podcast', category: 'media',
    basePay: 420, energyCost: 14, daysCost: 1,
    requirement: { stat: 'charisma', min: 45, label: 'Charisma 45' }, fameRequired: 0,
    blurb: 'Two hours of talking about yourself. Harder than it sounds.',
    outcome: 'Good episode. The clip did numbers overnight.',
    scalesWithFame: true,
  },
  {
    title: 'Brand Jingle', employer: 'Telecom company', category: 'brand',
    basePay: 1800, energyCost: 22, daysCost: 2,
    requirement: { stat: 'songwriting', min: 60, label: 'Songwriting 60' }, fameRequired: 25,
    blurb: 'Thirty seconds, sung over their logo. Soul-selling is a real business.',
    outcome: 'You wrote a jingle. It is on television. You cannot escape it.',
    scalesWithFame: true,
  },

  // ── Brand work. Needs a name. ───────────────────────────────────────────
  {
    title: 'Promo Post', employer: 'Clothing brand', category: 'brand',
    basePay: 700, energyCost: 8, daysCost: 1, requirement: null, fameRequired: 20,
    blurb: 'Wear it, photograph it, post it. That is the entire deliverable.',
    outcome: 'One post. Money in the account by evening.',
    scalesWithFame: true,
  },
  {
    title: 'Club Appearance', employer: 'Upscale venue', category: 'brand',
    basePay: 2500, energyCost: 20, daysCost: 1, requirement: null, fameRequired: 35,
    blurb: 'Show up, look like a star, take a photo with the owner. Nothing more.',
    outcome: 'You showed up, took photos, and left richer.',
    scalesWithFame: true,
  },
  {
    title: 'Brand Ambassador', employer: 'Global label', category: 'brand',
    basePay: 6000, energyCost: 26, daysCost: 2, requirement: null, fameRequired: 55,
    blurb: 'Your face on a campaign for a year. This is what fame is actually for.',
    outcome: 'Signed. Your face is on billboards in three cities.',
    scalesWithFame: true,
  },
];

export interface JobBoardInput {
  /** Turn number — the board rotates with it. */
  seed: number;
  playerFame: number;
  stats: ArtistStats;
  /** Used so the same seed in a different city still feels different. */
  city: string;
  boardSize?: number;
}

/** How much a recognisable name adds to a fee. */
function fameMultiplier(fame: number): number {
  return 1 + Math.max(0, Math.min(100, fame)) / 100 * 0.9;
}

export function generateJobBoard(input: JobBoardInput): JobListing[] {
  const { seed, playerFame, stats, city, boardSize = 6 } = input;
  const rng = makeRng(seed * 2654435761 + city.length * 97);

  const eligible = TEMPLATES.filter(t => {
    if (t.fameRequired > playerFame) return false;
    if (t.requirement && stats[t.requirement.stat] < t.requirement.min) return false;
    return true;
  });

  const labour = eligible.filter(t => t.category === 'labour');
  const other = eligible.filter(t => t.category !== 'labour');

  // Fisher-Yates on a copy, so the same seed always yields the same board.
  const shuffled = other.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Always at least one labour job — the floor must be reachable no matter
  // how broke or unknown the player is. When almost nothing else is open to
  // them yet, offer a SECOND one, because a three-card board for a newcomer
  // reads as a dead end rather than a starting point.
  const labourCount = other.length < 4 ? Math.min(2, labour.length) : (labour.length > 0 ? 1 : 0);
  const labourPool = labour.slice();
  const chosen: JobTemplate[] = [];
  for (let i = 0; i < labourCount; i++) {
    if (labourPool.length === 0) break;
    const idx = Math.floor(rng() * labourPool.length);
    chosen.push(labourPool.splice(idx, 1)[0]);
  }
  chosen.push(...shuffled.slice(0, Math.max(0, boardSize - chosen.length)));

  return chosen.map((t, i) => {
    const scale = t.scalesWithFame ? fameMultiplier(playerFame) : 1;
    const pay = Math.round((t.basePay * scale) / 10) * 10;
    return {
      id: `job_${seed}_${i}`,
      title: t.title,
      employer: t.employer,
      category: t.category,
      pay,
      energyCost: t.energyCost,
      daysCost: t.daysCost,
      requirement: t.requirement,
      fameRequired: t.fameRequired,
      blurb: t.blurb,
      outcome: t.outcome,
    };
  });
}

export const JOB_CATEGORY_LABEL: Record<JobCategory, { label: string; emoji: string }> = {
  performance: { label: 'Live', emoji: '🎤' },
  session: { label: 'Session', emoji: '🎛️' },
  writing: { label: 'Writing', emoji: '✍️' },
  media: { label: 'Media', emoji: '📻' },
  labour: { label: 'Day Work', emoji: '🧰' },
  brand: { label: 'Brand', emoji: '💼' },
};

// ─── CAREER OFFERS ENGINE ─────────────────────────────────────────────────
// Managers and labels compete for the player's signature once they show real
// traction. Offers are not a single static mailbox message — several parties
// approach, with genuinely different terms, and some are quietly bad deals.

import { v4 as uuidv4 } from 'uuid';
import type { MailMessage, NPC, Player, Song } from '../types/game';
import { traitsFor } from './roles';
import { pitchFromTraits, traitSummary } from './traits';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Manager archetypes with real behavioural differences in their deal terms. */
export interface ManagerArchetype {
  id: string;
  title: string;
  blurb: string;
  /** Percentage the manager takes. */
  percentage: [number, number];
  /** How strong their network is — drives opportunity quality later. */
  network: number;
  /** How honest the printed terms are. Low honesty = hidden bad clauses. */
  honesty: number;
}

export const MANAGER_ARCHETYPES: ManagerArchetype[] = [
  {
    id: 'hungry',
    title: 'The Hungry Newcomer',
    blurb: 'Small network, but you would be their entire focus. They answer at 3am.',
    percentage: [12, 18],
    network: 45,
    honesty: 80,
  },
  {
    id: 'veteran',
    title: 'The Industry Veteran',
    blurb: 'Deep connections with labels and radio. Spread thin across five other clients.',
    percentage: [20, 25],
    network: 88,
    honesty: 70,
  },
  {
    id: 'flashy',
    title: 'The Flashy Talker',
    blurb: 'Promises the world and dresses like he already delivered it. Overcommits.',
    percentage: [15, 22],
    network: 62,
    honesty: 35,
  },
  {
    id: 'shady',
    title: 'The Quiet Operator',
    blurb: 'Terms look generous on the first read. Read the third page.',
    percentage: [8, 14],
    network: 70,
    honesty: 18,
  },
];

/** Label archetypes — bigger labels pay more but take more of you. */
export interface LabelArchetype {
  id: string;
  name: string;
  tier: 'indie' | 'major' | 'global';
  /** Advance range. */
  advance: [number, number];
  royalty: [number, number];
  years: [number, number];
  creativeControl: boolean;
  albums: number;
  blurb: string;
}

export const LABEL_ARCHETYPES: LabelArchetype[] = [
  {
    id: 'indie',
    name: 'Street Sound Records',
    tier: 'indie',
    advance: [2000, 12000],
    royalty: [18, 25],
    years: [1, 2],
    creativeControl: true,
    albums: 1,
    blurb: 'Small local label. Low money, but they leave you alone creatively.',
  },
  {
    id: 'major',
    name: 'Accra Gold Music',
    tier: 'major',
    advance: [25000, 90000],
    royalty: [12, 18],
    years: [3, 5],
    creativeControl: false,
    albums: 3,
    blurb: 'The biggest label in the country. Real budgets, real pressure, real deadlines.',
  },
  {
    id: 'global',
    name: 'Meridian Records',
    tier: 'global',
    advance: [150000, 600000],
    royalty: [8, 14],
    years: [5, 7],
    creativeControl: false,
    albums: 4,
    blurb: 'Global major. Life-changing money. They will own a large part of your catalogue.',
  },
];

function randInt([lo, hi]: [number, number]): number {
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

/**
 * Decide whether the player has earned enough traction for managers to start
 * circling, and build their offers. Returns mail messages to deliver.
 *
 * Every management offer prints BOTH structures — a commission on gross and a
 * flat monthly retainer — because they are genuinely different bets. An artist
 * with no income yet should be able to afford the retainer and should be
 * frightened of the commission; an artist about to break should want the exact
 * opposite. The offer does not choose for them.
 *
 * When the player already has a manager, `currentManager` is that person and a
 * rival may pitch instead. A manager who is never challenged is not a deal,
 * it is a formality.
 */
export function generateManagerOffers(
  player: Player,
  npcs: NPC[],
  _turnCount: number,
  existingContracts: number,
  currentManager?: NPC,
): MailMessage[] {
  const signed = existingContracts > 0;

  // Managers start circling once there is a real signal.
  if (!signed && player.career.localFame < 15 && player.career.fanbase < 300) return [];

  const managers = npcs.filter((n) => n.role === 'manager' || n.role === 'rival_manager');
  if (managers.length === 0) return [];

  // Rarer as time goes on without a hit, to avoid spam.
  const chance = signed
    ? player.career.nationalFame >= 30
      ? 0.3
      : player.career.localFame >= 35
        ? 0.16
        : 0.05
    : player.career.localFame >= 35
      ? 0.35
      : player.career.localFame >= 22
        ? 0.18
        : 0.08;
  if (Math.random() > chance) return [];

  const arch = pick(MANAGER_ARCHETYPES);

  // A rival has to be somebody else — poaching yourself is not a pitch.
  const pool = signed && currentManager ? managers.filter((m) => m.id !== currentManager.id) : managers;
  if (pool.length === 0) return [];
  const mgr = pick(pool);

  const pct = randInt(arch.percentage);
  const tierMult = mgr.tier === 'international' ? 2.2 : mgr.tier === 'national' ? 1.5 : 1;
  const scale = 1 + Math.min(1.5, player.career.totalEarnings / 120_000);
  const fee = Math.min(12_000, Math.round((250 + mgr.fame * 18) * tierMult * scale / 50) * 50);

  const hiddenClause =
    arch.honesty < 40
      ? `\n\nNote: Section 12 grants the manager rights to your master recordings for 7 years.`
      : arch.honesty < 70
      ? `\n\nNote: Exclusivity applies — you cannot work with other managers while signed.`
      : '';

  // A rival leads with the number they think will move you, and says so.
  const better = signed ? Math.max(5, pct - 3) : pct;
  const betterFee = signed ? Math.max(200, fee - Math.round(fee * 0.2 / 50) * 50) : fee;

  // What this specific person leads with. The archetype sets the tone of the
  // deal; the characteristics are what they actually say about themselves, and
  // they are drawn from the manager's own record rather than the archetype, so
  // two veterans with different characteristics make different pitches.
  const mgrTraits = traitsFor(mgr).visible;
  const traitPitch = pitchFromTraits(mgr.name, mgrTraits, mgr.role);
  const traitTag = traitSummary(mgrTraits);

  const opening = signed
    ? `I know ${currentManager?.name ?? 'whoever has you'} has you. I am not going to pretend I do not.\n\n` +
      `${traitPitch}\n\n` +
      `That is the difference between me and ${currentManager?.name ?? 'them'}. ${arch.blurb}\n\n` +
      `And here is my number, straight away — ${better}% of gross, or $${betterFee.toLocaleString()} a month if you would rather I earn it.\n\n` +
      `You would have to let them go first. That is your problem to solve, not mine — but if you solve it, I am ready today.`
    : `I've been watching what you're doing.\n\n` +
      `${traitPitch}\n\n` +
      `${arch.blurb}\n\n` +
      `My terms: ${pct}% of gross, or a flat $${fee.toLocaleString()} a month if you would rather not hand over a percentage of everything you make. Standard 2-year agreement either way.`;

  return [{
    id: uuidv4(),
    from: mgr.id,
    fromName: signed ? `${mgr.name} — ${arch.title} (poaching)` : `${mgr.name} — ${arch.title}`,
    subject: signed ? `${mgr.name} wants to take you off ${currentManager?.name ?? 'your manager'}` : `Management offer: ${arch.title}`,
    body:
      `${opening}` +
      `${hiddenClause}\n\n` +
      `[ ${traitTag} ]\n\n` +
      `— ${mgr.name}`,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'offer',
    offerData: {
      type: 'management',
      percentage: better,
      monthlyFee: betterFee,
      // Which structure they lead with is part of the pitch, not the terms.
      feeKind: arch.id === 'hungry' ? 'retainer' : 'commission',
      advance: 0,
      royaltyRate: 0,
      lengthYears: 2,
      minMonths: 12,
      creativeControl: true,
      exclusivity: arch.honesty < 70,
    },
  }];
}

/**
 * Labels compete for a hot artist. Called when the player crosses thresholds —
 * several labels may bid in the same season rather than one static offer.
 */
export function generateLabelOffers(
  player: Player,
  npcs: NPC[],
  topSongQuality: number,
  hasLabel: boolean,
): MailMessage[] {
  if (hasLabel) return [];
  if (player.career.localFame < 35) return [];
  if (Math.random() > 0.35) return [];

  const labelCeos = npcs.filter(n => n.role === 'label_ceo');
  const offers: MailMessage[] = [];

  // How many labels bid depends on how hot the player is.
  const heat =
    player.career.internationalFame > 25 ? 3 :
    player.career.nationalFame > 30 ? 2 : 1;

  const pool = [...LABEL_ARCHETYPES].sort(() => Math.random() - 0.5).slice(0, heat);

  for (const label of pool) {
    const advance = randInt(label.advance);
    const royalty = randInt(label.royalty);
    const years = randInt(label.years);
    const ceo = labelCeos.find(n => n.id.includes(label.id)) ?? labelCeos[0];

    offers.push({
      id: uuidv4(),
      from: ceo?.id ?? 'label_ceo',
      fromName: label.name,
      subject: `${label.name} wants to sign you`,
      body:
        `${player.artistName},\n\n` +
        `We've watched your numbers and we want you on the roster.\n\n` +
        `${label.blurb}\n\n` +
        `Our offer:\n` +
        `• Advance: $${advance.toLocaleString()}\n` +
        `• Royalty rate: ${royalty}%\n` +
        `• Contract length: ${years} year${years > 1 ? 's' : ''}\n` +
        `• Album commitment: ${label.albums}\n` +
        `• Creative control: ${label.creativeControl ? 'You keep it' : 'Label approves releases'}\n` +
        (topSongQuality > 75 ? `\nYour best record is genuinely strong. That is why we are moving fast.` : '') +
        `\n\nRegards,\n${label.name} A&R`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'contract',
      offerData: {
        type: 'label',
        percentage: 100 - royalty,
        advance,
        royaltyRate: royalty,
        lengthYears: years,
        albumRequirements: label.albums,
        creativeControl: label.creativeControl,
        exclusivity: label.tier !== 'indie',
      },
    });
  }

  return offers;
}

/** Best song quality in the player's catalogue — used to gate label interest. */
export function bestSongQuality(songs: Song[]): number {
  if (songs.length === 0) return 0;
  return Math.max(...songs.map(s => s.quality));
}

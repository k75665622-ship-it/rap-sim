// ─── THE SCENE: WHO ELSE IS ON THE BILL ────────────────────────────────────
//
// Shows are not played alone. Every bill you are offered has other acts on
// it — the host, the support, the opener, the DJ — and sometimes somebody you
// are at war with. Your own shows can carry a special guest. Who you share a
// stage with changes the crowd, the relationships and the headlines.
//
// Pure: no store, no clock. Rolls are passed in.

import type { NPC, LineupAct, ShowGuest, ShowOffer } from '../types/game';
import { hashString } from './rng';
import { traitsOf, archetypeOf } from './offers';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const unit = (seed: string) => (hashString(seed) % 10_000) / 10_000;

/** How many acts a bill carries, by the kind of night. */
function billSize(kind: ShowOffer['kind'], capacity: number): number {
  if (kind === 'festival') return capacity >= 8000 ? 6 : 5;
  if (kind === 'club_night') return 2;
  return capacity >= 3000 ? 4 : 3;
}

/**
 * Build the bill around the host and the player.
 *
 * Acts are drawn from the host's country, near the bill's level. If the player
 * is at war with somebody of the right size, there is a real chance the
 * promoter booked them too — promoters love a storyline.
 */
export function buildLineup(opts: {
  host: NPC;
  kind: ShowOffer['kind'];
  capacity: number;
  playerFame: number;
  playerBilling: 'guest' | 'support' | 'co_headliner' | 'headliner';
  pool: NPC[];
  beefIds: Set<string>;
  friendIds: Set<string>;
  seed: string;
}): LineupAct[] {
  const { host, kind, capacity, playerFame, pool, beefIds, friendIds, seed } = opts;
  const acts: LineupAct[] = [];
  const level = Math.max(playerFame, host.role === 'artist' ? host.fame : playerFame);
  if (host.role === 'artist') acts.push({ npcId: host.id, name: host.name, fame: Math.round(host.fame), slot: 'headliner', friend: friendIds.has(host.id) });
  if (host.role === 'dj') acts.push({ npcId: host.id, name: host.name, fame: Math.round(host.fame), slot: 'dj' });

  const want = billSize(kind, capacity) - acts.length - 1; // the player takes one slot
  const candidates = pool
    .filter((n) => n.id !== host.id && n.role === 'artist' && n.country === host.country && Math.abs(n.fame - level) <= 25)
    .map((n) => ({ n, r: unit(`${seed}|${n.id}`) }))
    .sort((a, b) => a.r - b.r);

  // A rival, if the stars line up.
  const rival = pool.find((n) => beefIds.has(n.id) && n.country === host.country && Math.abs(n.fame - level) <= 30);
  if (rival && unit(`${seed}|rival`) < 0.35) {
    acts.push({ npcId: rival.id, name: rival.name, fame: Math.round(rival.fame), slot: rival.fame > playerFame ? 'co_headliner' : 'support', beef: true });
  }
  for (const c of candidates) {
    if (acts.length >= want + (host.role === 'artist' || host.role === 'dj' ? 1 : 0)) break;
    if (acts.some((a) => a.npcId === c.n.id)) continue;
    const slot: LineupAct['slot'] = !acts.some((a) => a.slot === 'headliner') && opts.playerBilling !== 'headliner' && c.n.fame >= playerFame
      ? 'headliner'
      : c.n.fame >= playerFame ? 'co_headliner' : c.n.fame >= playerFame - 10 ? 'support' : 'opener';
    acts.push({ npcId: c.n.id, name: c.n.name, fame: Math.round(c.n.fame), slot, friend: friendIds.has(c.n.id), beef: beefIds.has(c.n.id) || undefined });
  }
  const order: Record<LineupAct['slot'], number> = { headliner: 0, co_headliner: 1, support: 2, guest: 3, opener: 4, dj: 5 };
  return acts.sort((a, b) => order[a.slot] - order[b.slot] || b.fame - a.fame);
}

export const SLOT_LABEL: Record<LineupAct['slot'], string> = {
  headliner: 'Headliner',
  co_headliner: 'Co-headliner',
  support: 'Support',
  opener: 'Opener',
  dj: 'DJ',
  guest: 'Special guest',
};

// ─── ASKING THE HOST TO DROP SOMEBODY ──────────────────────────────────────

export function dropActDecision(opts: {
  host: NPC;
  playerFame: number;
  act: LineupAct;
  roll: number;
}): { outcome: 'dropped' | 'refused' | 'dropped_you'; text: string } {
  const { host, playerFame, act, roll } = opts;
  const t = traitsOf(host);
  const arche = archetypeOf(host);
  // Who matters more to the host's night?
  const pull = playerFame - act.fame + host.relationshipScore / 3 + (arche === 'street' ? 8 : 0) - (arche === 'business' ? 6 : 0) + (roll - 0.5) * 20;
  if (pull > 12) return { outcome: 'dropped', text: `${host.name}'s camp moved ${act.name} to another night. "We want you on this one."` };
  if (pull > -8 || t.loyal) return { outcome: 'refused', text: `${host.name}'s camp won't change the bill: "Both of you are booked. Be professional."` };
  return { outcome: 'dropped_you', text: `${host.name}'s camp would rather keep ${act.name}. The offer is withdrawn.` };
}

// ─── THE NIGHT ITSELF ──────────────────────────────────────────────────────

export type ClashKind = 'bodied' | 'got_bodied' | 'brawl' | 'squashed' | 'cold';

export interface ClashOutcome {
  kind: ClashKind;
  text: string;
  fame: number;
  momentum: number;
  heat: number;
  relationship: number;
  money: number;
  reputation: number;
  win?: boolean;
}

/**
 * Two people at war on one bill. Something happens — the question is what.
 * Your set quality, who is bigger, and how hot it is all decide it.
 */
export function clashOutcome(opts: {
  rivalName: string;
  quality: number;
  playerFame: number;
  rivalFame: number;
  heat: number;
  relationship: number;
  avoided: boolean;
  roll: number;
}): ClashOutcome {
  const { rivalName, quality, playerFame, rivalFame, heat, relationship, avoided, roll } = opts;
  if (avoided) {
    return roll < 0.75
      ? { kind: 'cold', text: `You and ${rivalName} kept to opposite sides of the venue all night. Nothing happened. The blogs were disappointed.`, fame: 0, momentum: 0, heat: -4, relationship: 0, money: 0, reputation: 1 }
      : { kind: 'bodied', text: `You skipped the backstage drama and just performed. Crowd chose you; ${rivalName}'s set felt flat after yours.`, fame: 1, momentum: 3, heat: 6, relationship: -3, money: 0, reputation: 1, win: true };
  }
  // Peace is possible when it isn't too hot and you don't actually hate each other.
  if (heat < 45 && relationship > -40 && roll < 0.18) {
    return { kind: 'squashed', text: `Backstage, you and ${rivalName} actually talked. A handshake, a photo, a "we good". The internet lost its mind.`, fame: 1.5, momentum: 5, heat: -40, relationship: 30, money: 0, reputation: 3 };
  }
  // Brawls happen when it's hot.
  if (heat >= 55 && roll > 0.82) {
    return { kind: 'brawl', text: `Your crews clashed backstage at the ${rivalName} night. Security, phones out, a fine from the venue. It's everywhere.`, fame: 1, momentum: 2, heat: 25, relationship: -20, money: -2500, reputation: -6 };
  }
  const edge = (quality - 60) / 25 + (playerFame - rivalFame) / 30 + (roll - 0.5) * 1.4;
  if (edge > 0.15) {
    return { kind: 'bodied', text: `You went on and took the night. Crowd chanting your name before ${rivalName} even came out. Clips everywhere.`, fame: 2, momentum: 6, heat: 12, relationship: -8, money: 0, reputation: 2, win: true };
  }
  return { kind: 'got_bodied', text: `${rivalName} closed the night and the crowd went with them. The comments are not kind to you.`, fame: -0.5, momentum: -4, heat: 10, relationship: -5, money: 0, reputation: -1, win: false };
}

/** Sharing a bill with people builds (or burns) the relationship. */
export function networkingDelta(act: LineupAct, quality: number, roll: number): number {
  if (act.beef) return 0;
  const base = act.friend ? 3 : 2;
  return Math.round(base + (quality >= 70 ? 2 : 0) + (roll - 0.5) * 3);
}

// ─── YOUR OWN SHOW: SPECIAL GUESTS ─────────────────────────────────────────

/** What a guest costs for one night on your stage. */
export function guestFee(npc: Pick<NPC, 'fame' | 'relationshipScore' | 'personality'>, playerFame: number, capacity: number): number {
  const t = traitsOf(npc as NPC);
  // Scaled to the night: nobody charges arena money for a club.
  const room = 0.55 + Math.min(1.6, capacity / 2500);
  const base = (150 + Math.pow(Math.max(1, npc.fame), 1.8) * 4) * room;
  const rel = 1 - clamp(npc.relationshipScore, -50, 100) / 200; // friends are cheaper
  const gap = npc.fame > playerFame ? 1 + (npc.fame - playerFame) / 40 : 1;
  return Math.round((base * rel * gap * (t.diva ? 1.3 : 1) * (t.generous ? 0.8 : 1)) / 50) * 50;
}

export function guestAnswer(opts: {
  npc: NPC;
  playerFame: number;
  role: ShowGuest['role'];
  fee: number;
  quoted: number;
  beefWithPlayer: boolean;
  busy: boolean;
  roll: number;
}): { yes: boolean; text: string } {
  const { npc, playerFame, role, fee, quoted, beefWithPlayer, busy, roll } = opts;
  if (beefWithPlayer) return { yes: false, text: 'Left on read. You two are not on those terms.' };
  if (busy) return { yes: false, text: '"Already booked that night, maybe next time."' };
  const gap = npc.fame - playerFame;
  if (role === 'opener' && gap > 5) return { yes: false, text: '"Open for you? Nah. I headline my own rooms."' };
  const t = traitsOf(npc);
  const want = quoted * (t.hustler ? 1.1 : 1);
  const lean = (fee / Math.max(1, want) - 1) * 2 + npc.relationshipScore / 60 - Math.max(0, gap) / 40 + (roll - 0.5) * 0.6;
  if (lean > -0.4) return { yes: true, text: role === 'special_guest' ? '"Say less. I\'ll pull up."' : '"Bet. I\'ll warm them up for you."' };
  if (fee < quoted * 0.9) return { yes: false, text: '"Not for that."' };
  return { yes: false, text: '"Can\'t make it work right now."' };
}

/** How much a confirmed bill lifts ticket demand. */
export function guestDemandBoost(guests: Pick<ShowGuest, 'fame' | 'status' | 'role'>[], playerFame: number): number {
  let boost = 1;
  for (const g of guests) {
    if (g.status !== 'confirmed') continue;
    const rel = g.fame / Math.max(10, playerFame);
    boost += (g.role === 'special_guest' ? 0.12 : 0.05) * clamp(rel, 0.2, 2.5);
  }
  return Math.min(1.6, boost);
}

/** Does the guest actually turn up? Flaky people are flaky. */
export function guestShowsUp(npc: NPC | undefined, roll: number): boolean {
  if (!npc) return false;
  const p = npc.personality ?? [];
  const flaky = p.some((x) => ['volatile', 'unpredictable', 'reckless', 'troubled', 'elusive'].includes(x));
  return roll > (flaky ? 0.2 : 0.04);
}

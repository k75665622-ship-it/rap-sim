// ─── A VERSE COMES WITH CONDITIONS ─────────────────────────────────────────
//
// In the real business a feature is a deal, and deals have terms. A star does
// not want a bigger star on the same record. An artist in a war does not want
// to share a song with the other side. Some want to be the only guest, some
// want the record out while it's still fresh, some refuse to be buried as track
// nine on an album. The terms are said up front, and they last — put the record
// out ten years later with the wrong name on it and the deal is still the deal.
//
// What happens when you break them depends on who they are: the easy-going let
// it slide, the proud go public, the businesslike ask for more money or call a
// lawyer, and some just want their verse off the record.
//
// Pure. Real artists' terms are stated by their team, and their side of any
// fallout is handled by their team too — never in their own words.

import type { NPC } from '../types/game';
import { hashString } from './rng';
import type { Persona } from './persona';

export type ConditionKind = 'no_bigger_star' | 'no_rival' | 'only_feature' | 'release_window' | 'single_first';

export interface FeatureCondition {
  kind: ConditionKind;
  /** What they said (or their team said), shown on the deal. */
  text: string;
  /** For no_rival: who they will not share a record with. */
  rivalIds?: string[];
  rivalNames?: string[];
  /** For no_bigger_star: nobody on the record above this fame. */
  fameCap?: number;
  /** For release_window: the record has to be out by this day. */
  bySerial?: number;
  /** Times they already gave you more time. */
  extended?: number;
}

export type Enforcement = 'ignore' | 'renegotiate' | 'remove' | 'public' | 'sue';

export const CONDITION_LABEL: Record<ConditionKind, string> = {
  no_bigger_star: 'No bigger name on the record',
  no_rival: 'Not on a record with their rival',
  only_feature: 'The only guest',
  release_window: 'Out within the window',
  single_first: 'Released as a single',
};

const h01 = (s: string) => (hashString(s) % 10_000) / 10_000;

/**
 * The artists a fictional act has bad blood with. Derived from the roster —
 * same country, a similar level — so it never needs storing, and the same
 * person has the same enemies every time you ask.
 */
export function sceneRivalsOf(npc: NPC, npcs: NPC[]): NPC[] {
  if (h01(`${npc.id}|rivalry`) > 0.38) return [];
  const pool = npcs.filter((n) => n.id !== npc.id && n.role === 'artist' && n.country === npc.country && Math.abs(n.fame - npc.fame) <= 25);
  if (!pool.length) return [];
  const out: NPC[] = [];
  const first = pool[hashString(`${npc.id}|rival1`) % pool.length];
  out.push(first);
  if (h01(`${npc.id}|rival2`) < 0.3 && pool.length > 2) {
    const second = pool[hashString(`${npc.id}|rival2b`) % pool.length];
    if (second.id !== first.id) out.push(second);
  }
  return out;
}

/** The terms an artist attaches to a verse, if any. */
export function conditionsFor(i: {
  npc: NPC;
  persona: Persona;
  playerFame: number;
  serial: number;
  rivals: { id: string; name: string }[];
  real: boolean;
  seed: string;
}): FeatureCondition[] {
  const { npc, persona } = i;
  const gap = npc.fame - i.playerFame;
  let p = 0.18 + Math.max(0, gap) / 140 + persona.ego * 0.3 - persona.warmth * 0.1 + (npc.fame >= 70 ? 0.15 : 0);
  if (i.rivals.length) p += 0.15;
  p = Math.max(0.05, Math.min(0.85, p));
  if (h01(`${i.seed}|any`) > p) return [];
  const who = i.real ? `📨 ${npc.name.split(' ')[0]}'s team: ` : '';
  const pool: { w: number; c: FeatureCondition }[] = [];
  if (npc.fame >= 45 || persona.ego > 0.6) pool.push({ w: 1 + persona.ego + npc.fame / 80, c: { kind: 'no_bigger_star', fameCap: Math.round(npc.fame), text: `${who}${i.real ? 'One condition: no feature on this record bigger than our artist.' : 'One thing: I\'m the biggest name on this record. Nobody bigger than me on it.'}` } });
  if (i.rivals.length) {
    const r = i.rivals.slice(0, 2);
    pool.push({ w: 2.2, c: { kind: 'no_rival', rivalIds: r.map((x) => x.id), rivalNames: r.map((x) => x.name), text: `${who}${i.real ? `Our artist won't appear on a record with ${r.map((x) => x.name).join(' or ')}.` : `Don't put ${r.map((x) => x.name).join(' or ')} on anything I'm on. I mean it.`}` } });
  }
  if (persona.ego > 0.55) pool.push({ w: 0.8 + persona.ego, c: { kind: 'only_feature', text: `${who}${i.real ? 'Our artist is the only guest on this record.' : 'I\'m the only feature. No other guests on this one.'}` } });
  pool.push({ w: 0.7, c: { kind: 'release_window', bySerial: i.serial + 120, text: `${who}${i.real ? 'The record has to be released within four months, or the verse comes back to us.' : 'Put it out within four months. I don\'t want my verse sitting in your vault for years.'}` } });
  if (npc.fame >= 40) pool.push({ w: 0.6, c: { kind: 'single_first', text: `${who}${i.real ? 'It comes out as a single — not as an album track.' : 'This drops as a single. Don\'t bury me on an album.'}` } });
  const total = pool.reduce((a, x) => a + x.w, 0);
  let x = h01(`${i.seed}|pick`) * total;
  let chosen = pool[pool.length - 1];
  for (const c of pool) { x -= c.w; if (x <= 0) { chosen = c; break; } }
  const out = [chosen.c];
  // A big ego sometimes has two.
  if (persona.ego > 0.75 && pool.length > 1 && h01(`${i.seed}|two`) < 0.35) {
    const second = pool.find((c) => c.c.kind !== chosen.c.kind);
    if (second) out.push(second.c);
  }
  return out;
}

/** How they react when a term is broken. */
export function enforcementOf(persona: Persona, real: boolean, fee: number, roll: number): Enforcement {
  if (real) return roll < 0.55 ? 'remove' : roll < 0.85 ? 'renegotiate' : 'ignore';
  // Who they are decides it: the forgiving let it go, the messy take it
  // public, the litigious call a lawyer, the proud want their verse back.
  const w: Record<Enforcement, number> = {
    ignore: persona.forgiveness * 1.4 + persona.warmth * 0.5 - persona.ego * 0.4,
    renegotiate: 0.45 + (fee > 0 ? 0.55 : 0),
    remove: 0.45 + persona.ego * 0.7,
    public: persona.messy * 1.3 + persona.ego * 0.35,
    sue: persona.litigious * 1.3 + (fee > 0 ? 0.2 : 0),
  };
  const total = Object.values(w).reduce((a, b) => a + Math.max(0, b), 0);
  let x = roll * total;
  for (const k of Object.keys(w) as Enforcement[]) { x -= Math.max(0, w[k]); if (x <= 0) return k; }
  return 'ignore';
}

export interface BreachContext {
  /** Everybody else featured on the record. */
  others: { id: string; name: string; fame: number }[];
  /** It came out as part of an album, EP or mixtape (not as a single first). */
  viaProject: boolean;
  /** The day it came out, or today if it is still in the vault. */
  serial: number;
  released: boolean;
}

/** Is this term broken? Returns what broke it, in a sentence, or null. */
export function breachOf(c: FeatureCondition, ctx: BreachContext): string | null {
  switch (c.kind) {
    case 'no_bigger_star': {
      const big = ctx.others.find((o) => o.fame > (c.fameCap ?? 100) + 2);
      return big ? `${big.name} is on the record — a bigger name than they agreed to.` : null;
    }
    case 'no_rival': {
      const r = ctx.others.find((o) => (c.rivalIds ?? []).includes(o.id));
      return r ? `${r.name} is on the same record.` : null;
    }
    case 'only_feature':
      return ctx.others.length ? `${ctx.others.map((o) => o.name).join(' and ')} ${ctx.others.length > 1 ? 'are' : 'is'} on it too — they were meant to be the only guest.` : null;
    case 'release_window':
      return !ctx.released && c.bySerial !== undefined && ctx.serial > c.bySerial ? 'The record still isn\'t out, and the window they gave has closed.' : null;
    case 'single_first':
      return ctx.released && ctx.viaProject ? 'It came out as an album track, not a single.' : null;
  }
}

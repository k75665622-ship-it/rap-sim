// ─── YOUR TERMS ON A VERSE ─────────────────────────────────────────────────
//
// It works both ways. When somebody asks you for a verse you can set your own
// conditions, the way real artists do: be the only guest, not share a record
// with certain people, proper credit and a tag, a say over the final mix, no
// disses on a record with your name on it, a single not an album filler.
//
// What they tell you about the record depends on who they are — the open ones
// tell you who else is on it, the guarded ones say "you'll hear it when it's
// done". Bigger names push back on terms; smaller ones need you and agree.
// Break your terms and you decide what happens: let it go, ask for more,
// pull your verse, call them out, or send your lawyer.
//
// Pure.

import type { NPC } from '../types/game';
import type { Persona } from './persona';
import { hashString } from './rng';

export type MyTermKind = 'only_feature' | 'no_artist' | 'single_only' | 'credit_tag' | 'mix_approval' | 'no_diss';

export interface MyTerm { kind: MyTermKind; targets?: { id: string; name: string }[] }

export const MY_TERMS: Record<MyTermKind, { label: string; line: string; weight: number }> = {
  only_feature: { label: 'I\'m the only guest', line: 'No other features on the record.', weight: 1.2 },
  no_artist: { label: 'Not on a record with…', line: 'Certain names stay off it.', weight: 0.8 },
  single_only: { label: 'A single, not album filler', line: 'It comes out as a single.', weight: 0.9 },
  credit_tag: { label: 'Proper credit and a tag', line: 'My name on the title, and they tag me when it drops.', weight: 0.3 },
  mix_approval: { label: 'I approve the final mix', line: 'Nobody cuts or edits my verse without my OK.', weight: 0.7 },
  no_diss: { label: 'No disses on the record', line: 'My name stays out of their wars.', weight: 0.5 },
};

const r01 = (s: string) => (hashString(s) % 10_000) / 10_000;

export interface Disclosure {
  /** They told you who else is on it. */
  open: boolean;
  /** Who else is on the record (planned) — always decided, only shown when open. */
  others: { id: string; name: string }[];
  line: string;
}

/** What they tell you about their record, and who is really on it. Seeded by the ask, so it never changes. */
export function discloseFor(npc: NPC, persona: Persona, pool: NPC[], seed: string): Disclosure {
  const open = persona.warmth * 0.6 + (1 - persona.messy) * 0.4 > 0.5;
  const count = r01(`${seed}|n`) < 0.55 ? 0 : r01(`${seed}|n2`) < 0.7 ? 1 : 2;
  const cands = pool.filter((x) => x.id !== npc.id && x.role === 'artist' && x.country === npc.country);
  const others: { id: string; name: string }[] = [];
  for (let i = 0; i < count && cands.length; i++) {
    const pick = cands[hashString(`${seed}|g${i}`) % cands.length];
    if (!others.some((o) => o.id === pick.id)) others.push({ id: pick.id, name: pick.name });
  }
  const line = open
    ? others.length ? `"It's me, you and ${others.map((o) => o.name).join(' and ')} on it. Hook's done, verses are open."` : `"Just me and you on this one. Hook's done, your verse goes second."`
    : `"You'll hear it when it's finished. Trust me, it's hard."`;
  return { open, others, line };
}

/** They read your terms. Bigger names push back; people who need you agree. */
export function judgeTerms(persona: Persona, terms: MyTerm[], gap: number, roll: number): { accepted: MyTerm[]; refused: MyTerm[]; walk: boolean; line: string } {
  const accepted: MyTerm[] = [];
  const refused: MyTerm[] = [];
  terms.forEach((t, i) => {
    const p = MY_TERMS[t.kind].weight * (0.12 + persona.ego * 0.45 - persona.warmth * 0.15) + Math.max(-0.12, gap / 160);
    if (r01(`${roll}|${t.kind}|${i}`) < Math.max(0.02, Math.min(0.9, p))) refused.push(t); else accepted.push(t);
  });
  const load = terms.reduce((a, t) => a + MY_TERMS[t.kind].weight, 0);
  const walk = (refused.length >= 2 && persona.ego > 0.6) || (load > 3.2 && roll < persona.ego * 0.7);
  const line = walk
    ? 'Too many conditions for one verse. They pulled the offer.'
    : refused.length
      ? `They agreed to ${accepted.length ? accepted.map((t) => MY_TERMS[t.kind].label).join(', ') : 'none of it'} — but won't do: ${refused.map((t) => MY_TERMS[t.kind].label).join(', ')}.`
      : 'They agreed to every term. In writing.';
  return { accepted: walk ? [] : accepted, refused, walk, line };
}

/** When the record comes out: which of your terms did they break? */
export function myBreaches(terms: MyTerm[], ctx: { others: string[]; othersNames: string[]; tagged: boolean; persona: Persona; seed: string }): { kind: MyTermKind; text: string }[] {
  const out: { kind: MyTermKind; text: string }[] = [];
  for (const t of terms) {
    switch (t.kind) {
      case 'only_feature':
        if (ctx.others.length) out.push({ kind: t.kind, text: `${ctx.othersNames.join(' and ')} ${ctx.others.length > 1 ? 'are' : 'is'} on it too — you were meant to be the only guest.` });
        break;
      case 'no_artist': {
        const hit = (t.targets ?? []).find((x) => ctx.others.includes(x.id));
        if (hit) out.push({ kind: t.kind, text: `${hit.name} is on the record — the one name you said no to.` });
        break;
      }
      case 'credit_tag':
        if (!ctx.tagged) out.push({ kind: t.kind, text: 'They posted it without tagging you, and your name isn\'t in the title.' });
        break;
      case 'mix_approval':
        if (r01(`${ctx.seed}|mix`) < 0.3 * (1 - ctx.persona.reliability)) out.push({ kind: t.kind, text: 'They cut your verse in half for the final version — nobody asked you.' });
        break;
      case 'no_diss':
        if (ctx.persona.messy > 0.55 && r01(`${ctx.seed}|diss`) < 0.3) out.push({ kind: t.kind, text: 'Their verse takes shots at somebody — and your name is right next to it.' });
        break;
      case 'single_only':
        if (r01(`${ctx.seed}|alb`) < 0.25 * ctx.persona.messy) out.push({ kind: t.kind, text: 'It came out buried on their album, not as a single.' });
        break;
    }
  }
  return out;
}

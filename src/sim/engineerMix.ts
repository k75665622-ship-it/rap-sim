// ─── THE ENGINEER'S MIX ────────────────────────────────────────────────────
//
// You send the record off; it comes back sounding like a record. What they do
// is real and audible: they line your vocal up with the beat, tune it into the
// key if the style wants it, set the room and the echo, stack the hook, and
// master it louder and clearer than a bedroom ever could. How close they get
// to what the song needs is their skill — a seasoned engineer nails it and
// keeps your character; a beginner overdoes the reverb, buries the vocal or
// forgets to fix the timing, and doesn't tell you.
//
// Then the back-and-forth: "bring my vocal up", "more echo", "make the hook
// bigger". A good engineer does exactly that and nothing else — and, if a note
// would hurt the record, does half and tells you why. A weak one overshoots
// and knocks something else loose. A couple of rounds are part of the job;
// after that it costs money and patience.
//
// Pure: the store applies everything.

import type { EngineerMix, MixAsk, VocalFx } from '../types/game';
import { hashString } from './rng';

type Num = 'voice' | 'beat' | 'reverb' | 'echo' | 'tone' | 'punch' | 'grit' | 'tune' | 'tuneSpeed' | 'hook' | 'harmony';
type Ideal = Record<Num, number> & { echoTime: VocalFx['echoTime']; double: boolean };

const BASE: Ideal = { voice: 0.95, beat: 0.84, reverb: 18, echo: 18, echoTime: '1/8', tone: 10, punch: 58, grit: 4, double: false, tune: 15, tuneSpeed: 50, hook: 55, harmony: 0 };
const IDEAL: Record<string, Partial<Ideal>> = {
  trap: { reverb: 22, echo: 30, echoTime: '1/8', tone: 26, punch: 65, double: true, tune: 35, tuneSpeed: 65, hook: 65, harmony: 20 },
  drill: { beat: 0.88, reverb: 16, echo: 22, echoTime: '3/16', tone: -10, punch: 75, grit: 22, double: true, tune: 8, hook: 55 },
  boom: { voice: 1.0, beat: 0.8, reverb: 14, echo: 8, echoTime: '1/4', tone: 6, punch: 55, grit: 8, tune: 0, hook: 45 },
  afro: { voice: 0.92, beat: 0.86, reverb: 36, echo: 24, echoTime: '1/4', tone: 10, punch: 45, grit: 0, tune: 45, tuneSpeed: 45, hook: 70, harmony: 45 },
  amapiano: { voice: 0.9, beat: 0.9, reverb: 34, echo: 26, echoTime: '3/16', tone: 8, punch: 45, grit: 0, tune: 40, tuneSpeed: 45, hook: 65, harmony: 40 },
  dembow: { reverb: 24, echo: 28, echoTime: '1/8', tone: 18, punch: 60, tune: 40, tuneSpeed: 70, hook: 65, harmony: 30 },
  rnb: { voice: 0.9, beat: 0.8, reverb: 40, echo: 20, echoTime: '1/4', tone: 4, punch: 40, grit: 0, double: true, tune: 55, tuneSpeed: 35, hook: 70, harmony: 55 },
};
const RANGE: Record<Num, number> = { voice: 0.45, beat: 0.4, reverb: 40, echo: 40, tone: 40, punch: 40, grit: 40, tune: 50, tuneSpeed: 60, hook: 60, harmony: 50 };
const LIMIT: Record<Num, [number, number]> = { voice: [0.2, 1.5], beat: [0.2, 1.3], reverb: [0, 100], echo: [0, 100], tone: [-50, 50], punch: [0, 100], grit: [0, 100], tune: [0, 100], tuneSpeed: [0, 100], hook: [0, 100], harmony: [0, 100] };
const clamp = (k: Num, v: number) => Math.max(LIMIT[k][0], Math.min(LIMIT[k][1], v));
const round = (k: Num, v: number) => (k === 'voice' || k === 'beat' ? Math.round(v * 100) / 100 : Math.round(v));
function rng(seed: string) { let a = hashString(seed) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function idealFor(style: string): Ideal { return { ...BASE, ...(IDEAL[style] ?? {}) }; }

/** How well a mix fits what the song needs, 0-100. */
export function mixFit(fx: VocalFx, style: string): number {
  const id = idealFor(style);
  const w: Partial<Record<Num, number>> = { voice: 3, beat: 2, reverb: 1, echo: 1, tone: 1, punch: 1, grit: 1, tune: 1.2, hook: 0.6 };
  let tot = 0; let miss = 0;
  for (const [k, wt] of Object.entries(w) as [Num, number][]) { tot += wt; miss += wt * Math.min(1, Math.abs(((fx[k] as number | undefined) ?? 0) - id[k]) / RANGE[k]); }
  tot += 0.5; if (!!fx.double !== id.double) miss += 0.5;
  return Math.round(100 - (miss / tot) * 100);
}

export interface MixIn {
  style: string; skill: number; rough: VocalFx; align?: number; hookBars?: number[]; keyName: string; seed: string;
}

/** The first mix: what they hand back, and what they say about it. */
export function engineerMix(i: MixIn): { fx: VocalFx; notes: string[] } {
  const r = rng(i.seed);
  const a = Math.max(0, Math.min(1, i.skill / 100));
  const id = idealFor(i.style);
  const art = i.rough.lofi || ['phone', 'lofi'].includes(i.rough.preset);
  // A good engineer moves it toward what works without erasing who you are.
  const w = 0.6 + a * 0.3;
  const num = (k: Num) => { const base = ((i.rough[k] as number | undefined) ?? id[k]) * (1 - w) + id[k] * w; return round(k, clamp(k, base + (r() - 0.5) * 2 * (1 - a) * RANGE[k] * 0.7)); };
  const hooked = !!i.hookBars?.length;
  const fx: VocalFx = {
    ...i.rough,
    preset: 'engineer',
    voice: num('voice'), beat: num('beat'), reverb: num('reverb'), echo: num('echo'), tone: num('tone'), punch: num('punch'), grit: art ? i.rough.grit : num('grit'),
    echoTime: r() < 0.35 + a * 0.65 ? id.echoTime : (['1/8', '3/16', '1/4'] as const)[Math.floor(r() * 3)],
    double: r() < (id.double ? 0.45 + a * 0.55 : (1 - a) * 0.35),
    lofi: art ? i.rough.lofi : false,
    tune: num('tune'), tuneSpeed: num('tuneSpeed'),
    hook: hooked ? round('hook', clamp('hook', id.hook * (0.55 + a * 0.45) + (r() - 0.5) * (1 - a) * 30)) : 0,
    harmony: hooked && i.skill >= 50 && id.harmony > 0 ? round('harmony', clamp('harmony', id.harmony * (0.5 + a * 0.5))) : 0,
    polish: Math.round(Math.max(5, Math.min(100, i.skill * 0.95 + (r() - 0.5) * 10))),
    nudgeMs: i.rough.nudgeMs,
  };
  // A beginner sometimes cranks the tune because it's the sound.
  if (a < 0.5 && r() < (1 - a) * 0.3) fx.tune = Math.min(100, (fx.tune ?? 0) + 30);
  // Lining the vocal up is the first thing a pro does; a beginner may not.
  if (i.align !== undefined && a >= 0.3) fx.nudgeMs = Math.round(i.rough.nudgeMs + i.align * (0.6 + a * 0.4) + (r() - 0.5) * (1 - a) * 50);
  return { fx, notes: describe(i.rough, fx, i, a) };
}

function describe(rough: VocalFx, fx: VocalFx, i: MixIn, a: number): string[] {
  const n: string[] = [];
  const moved = fx.nudgeMs - rough.nudgeMs;
  if (Math.abs(moved) >= 12) n.push(`Lined your vocal up with the beat — moved it ${Math.abs(moved)} ms ${moved < 0 ? 'earlier' : 'later'}.`);
  const t = fx.tune ?? 0; const t0 = rough.tune ?? 0;
  if (t >= 70 && t > t0 + 10) n.push(`Put heavy auto-tune on it, in ${i.keyName} — that melodic sound.`);
  else if (t > t0 + 10) n.push(`Tuned it lightly into ${i.keyName}, so it sits inside the beat.`);
  else if (t < t0 - 10) n.push('Pulled the auto-tune back — your voice reads better natural.');
  if (Math.abs(fx.voice - rough.voice) >= 0.08) n.push(fx.voice > rough.voice ? 'Brought your vocal forward.' : 'Sat your vocal back into the beat.');
  if (fx.double && !rough.double) n.push('Doubled the vocal for width.');
  if ((fx.hook ?? 0) > 0) n.push(`Stacked the hook so it hits harder${(fx.harmony ?? 0) > 0 ? ', with a harmony on it' : ''}.`);
  else n.push('Mark which bars are your hook and I can make it hit harder.');
  if (fx.echo - rough.echo >= 12) n.push(`Put a ${fx.echoTime} echo on it that bounces with the beat.`);
  if (fx.reverb - rough.reverb >= 12) n.push('Gave it a bigger room.');
  else if (rough.reverb - fx.reverb >= 12) n.push('Dried it up — it was swimming.');
  n.push(a >= 0.7 ? 'Mastered it loud and clean. It\'ll hold up next to anything on the radio.' : a >= 0.45 ? 'Mastered it — louder and clearer now.' : 'Gave it a quick master.');
  return n.slice(0, 6);
}

export const ASK_LABEL: Record<MixAsk, string> = {
  voice_up: '🎤 Vocal louder', voice_down: '🎤 Vocal quieter', more_echo: '🔁 More echo', less_echo: '🔁 Less echo',
  more_reverb: '🏛️ More reverb', drier: '🏛️ Drier', brighter: '✨ Brighter', warmer: '🔥 Warmer',
  more_tune: '🎶 More auto-tune', less_tune: '🎶 Less auto-tune', bigger_hook: '📣 Bigger hook', tighter: '⏱️ Tighter timing',
  more_punch: '🥊 More punch', cleaner: '🧼 Cleaner (less grit)', redo: '♻️ Start over',
};
const STEP: Partial<Record<MixAsk, [Num, number]>> = {
  voice_up: ['voice', 0.12], voice_down: ['voice', -0.12], more_echo: ['echo', 18], less_echo: ['echo', -18], more_reverb: ['reverb', 15], drier: ['reverb', -15],
  brighter: ['tone', 15], warmer: ['tone', -15], more_tune: ['tune', 25], less_tune: ['tune', -25], bigger_hook: ['hook', 25], more_punch: ['punch', 15], cleaner: ['grit', -20],
};
const DONE: Record<MixAsk, string> = {
  voice_up: 'vocal\'s up', voice_down: 'vocal sits back now', more_echo: 'more echo', less_echo: 'echo pulled back', more_reverb: 'bigger room', drier: 'drier',
  brighter: 'brighter on top', warmer: 'warmer', more_tune: 'more tune on it', less_tune: 'less tune', bigger_hook: 'the hook is bigger', tighter: 'timing tightened',
  more_punch: 'more punch', cleaner: 'cleaned up the grit', redo: 'started again from scratch',
};

/** One round of notes. */
export function reviseMix(m: Pick<EngineerMix, 'fx' | 'skill' | 'round'>, asks: MixAsk[], i: Omit<MixIn, 'skill' | 'rough'> & { rough: VocalFx }): { fx: VocalFx; reply: string } {
  const r = rng(`${i.seed}|rev|${m.round}|${asks.join(',')}`);
  const a = Math.max(0, Math.min(1, m.skill / 100));
  const first = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (asks.includes('redo')) {
    const again = engineerMix({ ...i, skill: m.skill, seed: `${i.seed}|redo|${m.round}` });
    return { fx: again.fx, reply: `Started again from scratch. ${again.notes.slice(0, 3).join(' ')}` };
  }
  const fx: VocalFx = { ...m.fx, preset: 'engineer' };
  const id = idealFor(i.style);
  const done: string[] = [];
  let push = '';
  for (const ask of asks) {
    if (ask === 'tighter') {
      if (i.align !== undefined) fx.nudgeMs = Math.round(i.rough.nudgeMs + i.align * (0.85 + a * 0.15));
      fx.punch = clamp('punch', fx.punch + 5);
      done.push(DONE[ask]);
      continue;
    }
    const st = STEP[ask];
    if (!st) continue;
    const [k, step] = st;
    let size = step * (0.55 + a * 0.45) * (1 + (r() - 0.5) * (1 - a) * 0.9);
    const cur = (fx[k] as number | undefined) ?? 0;
    // A seasoned ear pushes back on a note that would hurt the record.
    const away = (cur - id[k]) * Math.sign(step) > RANGE[k] * 0.3;
    if (away && a >= 0.7 && !push) { size /= 2; push = pushback(ask); }
    (fx[k] as number) = round(k, clamp(k, cur + size));
    if (ask === 'bigger_hook') { fx.double = true; if (i.hookBars?.length) fx.harmony = round('harmony', clamp('harmony', (fx.harmony ?? 0) + 15)); }
    if (ask === 'more_tune' && (fx.tuneSpeed ?? 50) < 60) fx.tuneSpeed = round('tuneSpeed', clamp('tuneSpeed', (fx.tuneSpeed ?? 50) + 10));
    done.push(DONE[ask]);
  }
  // A weak engineer knocks something else loose while they're in there.
  if (r() < (1 - a) * 0.35) {
    const k = (['reverb', 'echo', 'tone', 'punch'] as Num[])[Math.floor(r() * 4)];
    (fx[k] as number) = round(k, clamp(k, ((fx[k] as number | undefined) ?? 0) + (r() < 0.5 ? -1 : 1) * 10));
  }
  const hookNote = asks.includes('bigger_hook') && !i.hookBars?.length ? ' I still need to know which bars are the hook — mark them and I\'ll stack it properly.' : '';
  const reply = `${first(done.join(', '))}.${push ? ` ${push}` : ''}${hookNote} ${a >= 0.7 ? 'Have a listen.' : 'Let me know.'}`;
  return { fx, reply: reply.trim() };
}

function pushback(ask: MixAsk): string {
  switch (ask) {
    case 'more_reverb': return 'I went half on the reverb — any more and your words get lost. Say the word and I\'ll push it.';
    case 'more_echo': return 'Only went half on the echo — more starts to fight your next line.';
    case 'more_tune': return 'Did half on the tune — more and you lose your tone. Your call though.';
    case 'voice_up': return 'Brought you up a little — more and the beat stops hitting.';
    case 'voice_down': return 'Only dropped you a touch — people need to hear the words.';
    case 'more_punch': return 'Half on the punch — any more and it gets tiring.';
    default: return 'I went easy on that one — trust me on it.';
  }
}

/** What another round costs once the included ones are used. */
export function revisionFee(skill: number, round: number, freeRounds: number, baseFee: number): number {
  if (round <= freeRounds) return 0;
  return Math.max(40, Math.round(baseFee * 0.12 * (1 + (round - freeRounds - 1) * 0.5) * (0.6 + skill / 150)));
}

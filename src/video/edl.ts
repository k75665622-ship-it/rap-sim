// The edit decision list: what the editor changes and the renderer draws.
// Every cut is measured in beats, so every cut is on the beat by construction;
// what a good editor controls is *which* beats, which angle, and what happens
// at the joins.
import { ANGLES, ANGLE_SEC } from '../world/shootcam';

export type Filter = 'none' | 'noir' | 'vhs' | 'film' | 'neon' | 'sunset' | 'cold' | 'pop';
export type Transition = 'cut' | 'fade' | 'flash' | 'whip' | 'zoom' | 'glitch';
export type Move = 'none' | 'in' | 'out';
export const FILTERS: { id: Filter; name: string }[] = [
  { id: 'none', name: 'Clean' }, { id: 'noir', name: 'Noir' }, { id: 'vhs', name: 'VHS' }, { id: 'film', name: 'Film' },
  { id: 'neon', name: 'Neon' }, { id: 'sunset', name: 'Sunset' }, { id: 'cold', name: 'Cold' }, { id: 'pop', name: 'Pop' },
];
export const TRANSITIONS: { id: Transition; name: string }[] = [
  { id: 'cut', name: 'Cut' }, { id: 'fade', name: 'Fade' }, { id: 'flash', name: 'Flash' }, { id: 'whip', name: 'Whip' }, { id: 'zoom', name: 'Zoom' }, { id: 'glitch', name: 'Glitch' },
];
export const BEAT_CHOICES = [1, 2, 3, 4, 6, 8];

export interface Cut { id: string; angle: number; from: number; beats: number; trans: Transition; move: Move; text?: string; filter?: Filter }
export interface Edit { bpm: number; filter: Filter; grain: boolean; bars: boolean; title: string; endCard: string; cuts: Cut[] }

let uid = 0;
export const cutId = () => `c${Date.now().toString(36)}${(uid++).toString(36)}`;
export const beatSec = (e: Pick<Edit, 'bpm'>) => 60 / e.bpm;
export const cutSec = (e: Pick<Edit, 'bpm'>, c: Cut) => c.beats * beatSec(e);
export const totalSec = (e: Edit) => e.cuts.reduce((n, c) => n + cutSec(e, c), 0);
export const startOf = (e: Edit, i: number) => e.cuts.slice(0, i).reduce((n, c) => n + cutSec(e, c), 0);
export const startBeat = (e: Edit, i: number) => e.cuts.slice(0, i).reduce((n, c) => n + c.beats, 0);

function rng(seed: number) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FILTER_FOR: Record<string, Filter> = { trap: 'neon', drill: 'cold', hip_hop: 'film', afrobeats: 'sunset', amapiano: 'sunset', dancehall: 'pop', rnb: 'noir' };

/** One-tap edit: decent, never great. Varied cuts, no repeated angle, a flash on the bar. */
export function autoEdit(o: { bpm: number; seconds: number; genre: string; title: string; seed: number }): Edit {
  const r = rng(o.seed);
  const bs = 60 / o.bpm;
  const budget = Math.round(o.seconds / bs / 4) * 4;
  const lens = [4, 2, 2, 4, 2, 1, 1, 2];
  const cuts: Cut[] = [];
  let beat = 0, last = -1, li = 0;
  while (beat < budget) {
    let len = lens[li++ % lens.length];
    len = Math.min(len, budget - beat, Math.floor((ANGLE_SEC / bs) - 0.2) || 1);
    let angle = Math.floor(r() * ANGLES.length);
    if (angle === last) angle = (angle + 1) % ANGLES.length;
    last = angle;
    const room = Math.max(0, ANGLE_SEC - len * bs - 0.1);
    const downbeat = beat % 4 === 0;
    cuts.push({
      id: cutId(), angle, from: Math.round(r() * room * 10) / 10, beats: Math.max(1, len),
      trans: beat === 0 ? 'fade' : downbeat && beat % 16 === 0 ? 'flash' : downbeat && r() < 0.4 ? 'whip' : 'cut',
      move: r() < 0.35 ? 'in' : 'none',
    });
    beat += cuts[cuts.length - 1].beats;
  }
  return { bpm: o.bpm, filter: FILTER_FOR[o.genre] ?? 'film', grain: false, bars: true, title: o.title, endCard: '', cuts };
}

export interface Grade { score: number; notes: string[] }

/** What a director would say. Auto-edit lands around 70; a careful hand reaches the 90s. */
export function gradeEdit(e: Edit): Grade {
  const notes: string[] = [];
  const n = e.cuts.length;
  if (n < 3) return { score: 15, notes: ['Too short to be a video — add more cuts.'] };
  const secs = totalSec(e);
  let s = 40;
  // 1. Length: 12–30s is a clip; shorter feels like a teaser, longer repeats the coverage.
  if (secs >= 12 && secs <= 32) s += 8; else { notes.push(secs < 12 ? 'Under 12 seconds — it is over before it starts.' : 'Over 32 seconds — the same footage starts to repeat.'); }
  // 2. Angle variety, no jump cuts (same angle back to back).
  const used = new Set(e.cuts.map((c) => c.angle)).size;
  s += used >= 4 ? 10 : used === 3 ? 7 : used === 2 ? 3 : 0;
  if (used < 3) notes.push('Use at least three of the four angles.');
  const jumps = e.cuts.filter((c, i) => i > 0 && c.angle === e.cuts[i - 1].angle).length;
  s -= Math.min(10, jumps * 4);
  if (jumps) notes.push(`${jumps} jump cut${jumps > 1 ? 's' : ''}: the same angle twice in a row.`);
  // 3. Pacing: a rhythm of long and short cuts, with a build somewhere.
  const lens = new Set(e.cuts.map((c) => c.beats)).size;
  s += Math.min(8, lens * 2);
  if (lens < 3) notes.push('Every cut is the same length — vary the rhythm.');
  const mid = Math.floor(n / 2);
  const avg = (a: Cut[]) => a.reduce((x, c) => x + c.beats, 0) / Math.max(1, a.length);
  const build = avg(e.cuts.slice(0, mid)) - avg(e.cuts.slice(mid));
  if (build > 0.3) s += 5; else notes.push('Cuts get faster toward the end for a build — try shorter cuts in the last half.');
  // 4. Transitions: big ones land on the downbeat of a bar, and are rationed.
  let beat = 0, good = 0, bad = 0, fancy = 0;
  e.cuts.forEach((c, i) => {
    if (i > 0 && c.trans !== 'cut') { fancy++; if (beat % 4 === 0 && c.trans !== 'fade') good++; else if (c.trans !== 'fade') bad++; }
    beat += c.beats;
  });
  s += Math.min(9, good * 3) - Math.min(9, bad * 3);
  if (bad) notes.push(`${bad} flash/whip/zoom/glitch off the bar line — land big transitions on beat 1 of a bar.`);
  if (fancy > n * 0.6) { s -= 6; notes.push('Too many transitions — plain cuts make the big ones hit.'); }
  if (good === 0 && !bad) notes.push('Put a Flash on a bar line for impact.');
  // 5. Finish: a look, text, an end card, camera movement.
  if (e.filter !== 'none') s += 4; else notes.push('Pick a filter — a consistent look is what separates it from raw footage.');
  if (e.title.trim()) s += 3; else notes.push('Add a title.');
  if (e.endCard.trim()) s += 3; else notes.push('An end card (release date, "out now") finishes it.');
  if (e.cuts.some((c) => c.text?.trim())) s += 2;
  if (e.cuts.some((c) => c.move !== 'none')) s += 2;
  if (e.grain || e.filter === 'film' || e.filter === 'vhs') s += 1;
  if (e.cuts[0].trans !== 'fade' && e.cuts[0].trans !== 'cut') s -= 0;
  return { score: Math.max(0, Math.min(100, Math.round(s))), notes };
}

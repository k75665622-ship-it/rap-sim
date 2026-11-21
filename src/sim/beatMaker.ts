// ─── MAKING BEATS ──────────────────────────────────────────────────────────
// Templates to start from, a chord helper, and how good a beat you built
// actually is. Pure: no store, no audio.

import type { BeatStyle, CustomPattern, DrumLane, Section } from '../audio/beat';
import { SCALE_NOTES } from '../audio/beat';

const lane = (...n: number[]) => n;
const empty = (): Record<DrumLane, number[]> => ({ kick: [], snare: [], clap: [], hatC: [], hatO: [], rim: [] });
const every = (step: number, bars: number) => Array.from({ length: (16 * bars) / step }, (_, i) => i * step);

export const TEMPLATES: { id: string; label: string; blurb: string; make: () => CustomPattern }[] = [
  { id: 'blank', label: 'Blank', blurb: 'Start from nothing', make: () => ({ bpm: 90, style: 'boom', root: 0, major: false, lead: 'keys', swing: 0, bars: 1, sectionBars: 4, drums: empty(), bass: [], melody: [], chords: [0], arrangement: ['intro', 'verse', 'hook', 'verse', 'hook', 'outro'] }) },
  { id: 'trap', label: 'Trap', blurb: '140 bpm, rolling hats, long 808', make: () => ({ bpm: 140, style: 'trap', root: 0, major: false, lead: 'bell', swing: 0, bars: 2, sectionBars: 4, drums: { ...empty(), kick: lane(0, 10, 16, 19, 26), snare: lane(8, 24), hatC: every(2, 2), hatO: lane(14, 30) }, bass: [{ step: 0, len: 8, semis: 0 }, { step: 10, len: 4, semis: 0, slide: true }, { step: 16, len: 8, semis: 8 }, { step: 26, len: 4, semis: 7, slide: true }], melody: [{ step: 0, len: 2, semis: 12 }, { step: 4, len: 2, semis: 15 }, { step: 8, len: 4, semis: 19 }, { step: 16, len: 2, semis: 20 }, { step: 20, len: 2, semis: 19 }, { step: 24, len: 4, semis: 15 }], chords: [0, 8], arrangement: ['intro', 'verse', 'hook', 'verse', 'hook', 'outro'] }) },
  { id: 'boom', label: 'Boom bap', blurb: '90 bpm, swung, dusty', make: () => ({ bpm: 90, style: 'boom', root: 2, major: false, lead: 'keys', swing: 0.3, bars: 2, sectionBars: 4, drums: { ...empty(), kick: lane(0, 10, 16, 26), snare: lane(8, 24), hatC: every(2, 2) }, bass: [{ step: 0, len: 4, semis: 0 }, { step: 10, len: 4, semis: 0 }, { step: 16, len: 4, semis: 5 }, { step: 26, len: 4, semis: 7 }], melody: [{ step: 0, len: 4, semis: 12 }, { step: 6, len: 2, semis: 15 }, { step: 8, len: 4, semis: 14 }, { step: 16, len: 4, semis: 17 }, { step: 22, len: 2, semis: 15 }, { step: 24, len: 4, semis: 12 }], chords: [0, 5], arrangement: ['intro', 'verse', 'hook', 'verse', 'hook', 'outro'] }) },
  { id: 'afro', label: 'Afrobeats', blurb: '104 bpm, off-beat claps, bounce', make: () => ({ bpm: 104, style: 'afro', root: 5, major: true, lead: 'pluck', swing: 0.15, bars: 2, sectionBars: 4, drums: { ...empty(), kick: lane(0, 7, 10, 16, 23, 26), clap: lane(4, 12, 20, 28), rim: lane(2, 6, 10, 14, 18, 22, 26, 30), hatC: every(2, 2) }, bass: [{ step: 0, len: 3, semis: 0 }, { step: 7, len: 3, semis: 7 }, { step: 16, len: 3, semis: 5 }, { step: 23, len: 3, semis: 7 }], melody: [{ step: 0, len: 2, semis: 12 }, { step: 3, len: 2, semis: 16 }, { step: 6, len: 2, semis: 19 }, { step: 16, len: 2, semis: 17 }, { step: 19, len: 2, semis: 14 }, { step: 22, len: 2, semis: 12 }], chords: [0, 5], arrangement: ['intro', 'verse', 'hook', 'verse', 'hook', 'outro'] }) },
];

export interface Progression { label: string; chords: number[] }
/** The chord helper: progressions that work, in the beat's mode, as semitone roots. */
export function progressionsFor(major: boolean): Progression[] {
  return major
    ? [{ label: 'I – V – vi – IV (pop)', chords: [0, 7, 9, 5] }, { label: 'I – vi – IV – V (classic)', chords: [0, 9, 5, 7] }, { label: 'I – IV – I – V (gospel)', chords: [0, 5, 0, 7] }, { label: 'vi – IV – I – V (anthem)', chords: [9, 5, 0, 7] }]
    : [{ label: 'i – VI – III – VII (trap)', chords: [0, 8, 3, 10] }, { label: 'i – iv – VII – III (dark)', chords: [0, 5, 10, 3] }, { label: 'i – VII – VI – VII (drill)', chords: [0, 10, 8, 10] }, { label: 'i – VI – iv – V (soul)', chords: [0, 8, 5, 7] }];
}

/** Scale rows for the piano roll, low to high, as semitones above the root. */
export function rollRows(major: boolean, octaves: number, base = 0): number[] {
  const sc = major ? SCALE_NOTES.maj : SCALE_NOTES.min;
  const out: number[] = [];
  for (let o = 0; o < octaves; o++) for (const d of sc) out.push(base + o * 12 + d);
  out.push(base + octaves * 12);
  return out;
}

export const ALL_SECTIONS: Section[] = ['intro', 'verse', 'hook', 'bridge', 'outro'];
export const STYLE_FOR_GENRE: Record<string, BeatStyle> = { trap: 'trap', drill: 'drill', hip_hop: 'boom', conscious: 'boom', afrobeats: 'afro', amapiano: 'amapiano', dancehall: 'dembow', rnb: 'rnb' };

/** How good the beat is, 0–99: what's in it, how it's arranged, and how much you know. */
export function scorePattern(c: CustomPattern, skill: number): { quality: number; notes: string[] } {
  const notes: string[] = [];
  let q = 20; // raw points; a full starter beat is about 90 of them
  const d = c.drums;
  const count = (n: number[]) => n.length;
  if (count(d.kick) >= 2) q += 10; else notes.push('Needs a kick that drives it.');
  if (count(d.snare) + count(d.clap) >= 1) q += 10; else notes.push('No snare or clap — nothing to nod to.');
  if (count(d.hatC) + count(d.hatO) >= 4) q += 7; else notes.push('Add hats for movement.');
  if (c.bass.length >= 2) q += 8; else notes.push('An 808 line would give it weight.');
  if (c.melody.length >= 4) q += 8; else notes.push('Needs a melody people can hum.');
  if (c.chords.length && new Set(c.chords).size >= 2) q += 6; else notes.push('Change the chords across the bars.');
  const secs = new Set(c.arrangement);
  if (secs.size >= 3) q += 6; else notes.push('Arrange it: intro, verse, hook, outro.');
  if (secs.size >= 4) q += 3;
  if (c.arrangement.includes('hook') && c.arrangement.includes('verse')) q += 4;
  if (c.bars >= 2) q += 4;
  if (d.kick.includes(0)) q += 3;
  const density = (count(d.kick) + count(d.snare) + count(d.clap) + count(d.hatC) + count(d.hatO) + count(d.rim)) / (c.bars * 16);
  if (density > 2.8) { q -= 8; notes.push('Too crowded — leave space for the vocal.'); }
  // Everything landing on the same step is a mess, not a groove.
  if (d.kick.some((s) => d.snare.includes(s))) { q -= 4; notes.push('Kick and snare are fighting on the same step.'); }
  // A starter pattern is a decent beat, not a great one: what you know adds the rest.
  q = q * 0.62 + Math.max(0, Math.min(100, skill)) * 0.3;
  return { quality: Math.max(15, Math.min(95, Math.round(q))), notes: notes.slice(0, 4) };
}

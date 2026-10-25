// ─── HOW THE SONG IS LAID OUT ──────────────────────────────────────────────
// Intro, hooks, verses, a bridge, an outro — and who takes which part. Where
// you put a guest matters, the way it does in real life: a big name early
// grabs people, a singer on the hook makes it stick, a song with no hook rarely
// travels, a guest who outshines you on your own record gets talked about,
// and a song that drags loses people.

export type Part = 'intro' | 'hook' | 'verse' | 'bridge' | 'outro';
export interface Section { part: Part; who: string }

export const PART_LABEL: Record<Part, string> = { intro: 'Intro', hook: 'Hook', verse: 'Verse', bridge: 'Bridge', outro: 'Outro' };
export const PART_BARS: Record<Part, number> = { intro: 4, hook: 4, verse: 8, bridge: 4, outro: 4 };

export function defaultArrangement(guests: string[]): Section[] {
  const out: Section[] = [{ part: 'intro', who: 'player' }, { part: 'hook', who: 'player' }, { part: 'verse', who: 'player' }, { part: 'hook', who: 'player' }];
  guests.forEach((g) => out.push({ part: 'verse', who: g }, { part: 'hook', who: 'player' }));
  if (!guests.length) out.push({ part: 'verse', who: 'player' }, { part: 'hook', who: 'player' });
  out.push({ part: 'outro', who: 'player' });
  return out;
}

export interface Guest { id: string; name: string; fame: number; singer: boolean }

/** What the layout does to the record. */
export function arrangementEffect(arr: Section[], guests: Guest[], i: { playerFame: number; genre: string }): { quality: number; commercial: number; notes: string[] } {
  let q = 0, c = 0;
  const notes: string[] = [];
  const hooks = arr.filter((s) => s.part === 'hook');
  const verses = arr.filter((s) => s.part === 'verse');
  const bars = arr.reduce((a, s) => a + PART_BARS[s.part], 0);
  const mine = verses.filter((s) => s.who === 'player').length;
  if (!hooks.length) { const rap = /drill|boom|hip/.test(i.genre); c -= rap ? 3 : 6; notes.push(rap ? 'No hook — the purists won\'t mind, radio will.' : 'No hook, no hit. People need something to sing.'); }
  else if (hooks.length >= 2) { c += 2; notes.push('The hook comes back — that\'s what sticks.'); }
  if (!mine) { q -= 4; c -= 3; notes.push('You don\'t have a verse on your own song. People will ask why.'); }
  if (bars > 64) { q -= 3; notes.push('It drags — that\'s a long song. People skip.'); }
  else if (bars < 24) { c -= 2; notes.push('Very short. Feels unfinished.'); }
  for (const g of guests) {
    const at = arr.findIndex((s) => s.who === g.id);
    if (at < 0) { notes.push(`${g.name} is on the record but has no part. Give them a section.`); q -= 1; continue; }
    const part = arr[at].part;
    const early = arr.slice(0, at).filter((s) => s.part === 'verse' || s.part === 'hook').length <= 2;
    if (g.fame > i.playerFame + 10 && early) { c += 3; notes.push(`${g.name} early grabs people before they skip.`); }
    if (g.fame > i.playerFame + 10 && at === arr.length - 2 && part === 'verse') { c -= 1; q += 1; notes.push(`Saving ${g.name} for last — critics love it, casual listeners may not get there.`); }
    if (arr.some((s) => s.part === 'hook' && s.who === g.id)) { if (g.singer) { c += 4; notes.push(`${g.name} singing the hook makes it stick.`); } else { c += 1; notes.push(`${g.name} on the hook — it works, but a singer would carry it further.`); } }
  }
  if (verses.length > 4) { q -= 2; notes.push('Too many verses — it starts to sound like a cypher.'); }
  return { quality: Math.max(-8, Math.min(6, q)), commercial: Math.max(-10, Math.min(10, c)), notes };
}

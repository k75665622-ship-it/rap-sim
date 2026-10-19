// ─── MEMORIES ──────────────────────────────────────────────────────────────
//
// The career's journal. Things that happened get written down in one line —
// a release, a night at the studio, standing somebody up, a new tattoo — with
// who was there and how much it mattered. The Journal page reads it, and the
// AI reads it, so the people in the game remember what you did (and didn't
// do). It is saved with the career, so it travels with the save: locally in
// the browser's database and, with an online account, to the server.
//
// Pure: the store owns the list.

export type MemoryKind = 'career' | 'music' | 'money' | 'people' | 'love' | 'beef' | 'style' | 'plans' | 'life';

export interface Memory {
  id: string;
  /** Day serial. */
  serial: number;
  /** Absolute game minute, when known. */
  minute?: number;
  kind: MemoryKind;
  /** One line, second person: "You stood Kofi up at the studio." */
  text: string;
  npcIds?: string[];
  /** 1 (small) .. 5 (unforgettable). */
  weight: number;
  pinned?: boolean;
  /** Positive or negative for the people involved. */
  tone?: 'good' | 'bad' | 'neutral';
}

export const MEMORY_KINDS: { id: MemoryKind; label: string; icon: string }[] = [
  { id: 'career', label: 'Career', icon: '⭐' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'money', label: 'Money', icon: '💸' },
  { id: 'people', label: 'People', icon: '🤝' },
  { id: 'love', label: 'Love', icon: '❤️' },
  { id: 'beef', label: 'Beef', icon: '🥊' },
  { id: 'style', label: 'Style', icon: '🧥' },
  { id: 'plans', label: 'Plans', icon: '📅' },
  { id: 'life', label: 'Life', icon: '🌱' },
];
export const MEMORY_ICON = Object.fromEntries(MEMORY_KINDS.map((k) => [k.id, k.icon])) as Record<MemoryKind, string>;

const MAX = 800;

/** Add a memory, folding exact repeats from the same day, and keep the list bounded. */
export function addMemory(list: Memory[], m: Memory): Memory[] {
  if (list.some((x) => x.serial === m.serial && x.text === m.text)) return list;
  const out = [m, ...list];
  if (out.length <= MAX) return out;
  // Over the cap: forget the smallest old things first, never pinned ones.
  const keep = out.slice(0, 200);
  const rest = out.slice(200).filter((x) => x.pinned || x.weight >= 3);
  return [...keep, ...rest].slice(0, MAX);
}

/** What the player and this person have been through, newest first. */
export function memoriesWith(list: Memory[] | undefined, npcId: string, n = 6): Memory[] {
  return (list ?? []).filter((m) => m.npcIds?.includes(npcId)).slice(0, n);
}

/** The headline moments of the career, for context. */
export function keyMemories(list: Memory[] | undefined, n = 6): Memory[] {
  const all = list ?? [];
  const pinned = all.filter((m) => m.pinned);
  const big = all.filter((m) => !m.pinned && m.weight >= 4);
  return [...pinned, ...big].slice(0, n);
}

/** "3 weeks ago", from day serials. */
export function agoLabel(serial: number, today: number): string {
  const d = today - serial;
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'last week';
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  if (d < 365) return `${Math.round(d / 30)} months ago`;
  const y = Math.round(d / 365);
  return y === 1 ? 'a year ago' : `${y} years ago`;
}

/**
 * Prompt lines for the AI: what this person remembers about the player, plus
 * the career's big moments. Third person, past tense, short.
 */
export function memoryContext(list: Memory[] | undefined, today: number, npcId?: string, playerName = 'the player'): string {
  const lines: string[] = [];
  const toThird = (t: string) => t.replace(/\bYou\b/g, playerName).replace(/\byou\b/g, playerName).replace(/\bYour\b/g, `${playerName}'s`).replace(/\byour\b/g, `${playerName}'s`);
  if (npcId) {
    const mine = memoriesWith(list, npcId, 6);
    if (mine.length) lines.push('What you remember about them:', ...mine.map((m) => `- ${agoLabel(m.serial, today)}: ${toThird(m.text)}`));
  }
  const big = keyMemories(list, 4).filter((m) => !npcId || !m.npcIds?.includes(npcId));
  if (big.length) lines.push('Their career so far:', ...big.map((m) => `- ${agoLabel(m.serial, today)}: ${toThird(m.text)}`));
  return lines.join('\n');
}

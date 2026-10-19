// Which face goes with an id: the player's own character, a generated look for
// fictional people in the game, or nothing (initials) for real artists, fans,
// brands and outlets. The game never draws real people.

import { useGameStore } from '../../store/gameStore';
import { lookFor, type Look } from '../../sim/look';
import { isRealId } from '../../sim/realPeople';
import type { GameState, NPC } from '../../types/game';

const npcIndex = new WeakMap<object, Map<string, NPC>>();
const cache = new Map<string, Look>();

function indexOf(npcs: NPC[]): Map<string, NPC> {
  let m = npcIndex.get(npcs);
  if (!m) { m = new Map(npcs.map((n) => [n.id, n])); npcIndex.set(npcs, m); }
  return m;
}

export function portraitFor(s: Pick<GameState, 'player' | 'npcs'>, seed?: string): Look | null {
  if (!seed || seed.startsWith('fan:') || seed.startsWith('@')) return null;
  const p = s.player;
  if (p && (seed === 'player' || seed === p.id)) {
    if (p.look) return p.look;
    const k = `p|${p.id}`;
    let l = cache.get(k);
    if (!l) { l = lookFor(p.id, p.gender === 'female' ? 'female' : p.gender === 'male' ? 'male' : undefined); cache.set(k, l); }
    return l;
  }
  const npc = indexOf(s.npcs as NPC[]).get(seed);
  if (!npc || isRealId(npc.id)) return null;
  const k = `n|${npc.id}|${npc.gender}`;
  let l = cache.get(k);
  if (!l) { l = lookFor(npc.id, npc.gender === 'female' ? 'female' : npc.gender === 'male' ? 'male' : undefined); cache.set(k, l); }
  return l;
}

/** The look for an avatar seed, or null for initials. */
export function usePortrait(seed?: string): Look | null {
  return useGameStore((s) => portraitFor(s, seed));
}

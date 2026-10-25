// ─── WHO IS A REAL PERSON ──────────────────────────────────────────────────
//
// The game includes real artists (and the managers named after their real
// teams). The rule: the game never writes words for a real person — no DMs,
// no quotes, no captions beyond emoji, no AI text. Most real artists' ids do
// NOT end in "_real" (only a handful do), so every check goes through here.

import { realPersonIds } from '../data/realArtists';

let ids: Set<string> | null = null;

export function isRealId(id: string | undefined | null): boolean {
  // The world is fictional now: every artist is made up, and the ones players
  // create are theirs. Kept as a function so the old guards stay in one place.
  if (!id) return false;
  if (!ids) ids = realPersonIds();
  return ids.has(id);
}

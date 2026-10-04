// ─── IS IT OUT? ───────────────────────────────────────────────────────────
// The single test for "this record is live in the world".
//
// Masters recorded through the studio sit in `state.songs` with
// `masterStatus: 'recorded' | 'mixed' | 'mastered'` and must not earn streams,
// appear on a chart, be remixed, be shot as a video or count towards anybody's
// catalogue until they are released. Songs created before the studio editor
// existed carry no `masterStatus` at all, and those ARE live — hence the
// `undefined` check rather than a plain equality.
//
// This lives in `sim/` rather than in the store because the engines need it:
// the fanbase derivation asks which records are actually out, and a sim module
// importing the store would be a cycle. The store keeps its own exported name
// and delegates here, so every existing caller is untouched and there is still
// exactly one copy of the rule.

import type { Song } from '../types/game';

export function isSongReleased(song: Song): boolean {
  return song.masterStatus === undefined || song.masterStatus === 'released';
}

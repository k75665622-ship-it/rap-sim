// ─── NPC MUSIC ENGINE ─────────────────────────────────────────────────────
// Generates and advances NPC songs so the charts are a real competitive field.
// NPC songs are full Song records owned by an NPC artist, with their own
// streaming trajectories that grow, decay and occasionally surge.

import { ROSTER_GENRES } from '../data/genres';
import { v4 as uuidv4 } from 'uuid';
import type { NPC, Song, Genre, GameDate } from '../types/game';
import { dateToSerial, serialOf } from './gameClock';

// Title fragments — combined to produce a large, varied pool of plausible titles.
const TITLE_OPENERS = [
  'Streets', 'Midnight', 'Gold', 'Concrete', 'Pressure', 'Blessings', 'Lagos', 'Accra',
  'No Sleep', 'Late', 'Cold', 'Heavy', 'Young', 'Lost', 'Real', 'Wild', 'Silent', 'Burning',
  'Diamond', 'Ghetto', 'Foreign', 'Holy', 'Broken', 'Fast', 'Deep', 'Loud', 'Sweet', 'Dark',
];

const TITLE_CLOSERS = [
  'Money', 'Dreams', 'Nights', 'Ways', 'Love', 'Pain', 'Business', 'Season', 'Story',
  'Prayer', 'City', 'Motion', 'Energy', 'Weather', 'Talking', 'Season', 'Waters', 'Fire',
  'Heaven', 'Wounds', 'Truth', 'Time', 'Signs', 'Blood', 'Soul', 'Wave', 'Days', 'Game',
];

const GENRES: Genre[] = ROSTER_GENRES;

// Fame tiers decide how hard an NPC's song hits on release.
const TIER_REACH: Record<NPC['tier'], number> = {
  local: 1,
  national: 12,
  international: 90,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSongTitle(): string {
  const opener = pick(TITLE_OPENERS);
  const closer = pick(TITLE_CLOSERS);
  // occasional single-word or three-word titles for variety
  const roll = Math.random();
  if (roll < 0.18) return opener;
  if (roll < 0.30) return `${opener} ${closer} ${pick(['Pt. 2', 'Again', 'Freestyle', 'Anthem'])}`;
  return `${opener} ${closer}`;
}

/**
 * Build one NPC song. Reach/momentum drive the opening trajectory:
 * an international superstar opens far bigger than an unknown local act.
 */
export function createNPCSong(npc: NPC, date: GameDate): Song {
  // Quality is anchored to the NPC's fame, with real spread so stars still flop.
  const fameBase = npc.fame * 0.6 + 28;
  const quality = Math.max(
    12,
    Math.min(99, Math.round(fameBase + (Math.random() - 0.35) * 30))
  );

  const reach = TIER_REACH[npc.tier] ?? 1;
  const fameReach = Math.pow(Math.max(npc.fame, 1), 1.55) * reach;

  // Opening weekly streams scale from a few hundred (unknown) to millions (superstar).
  const openingStreams = Math.max(
    300,
    Math.round(fameReach * (0.6 + Math.random() * 1.6) * (0.5 + quality / 120))
  );

  return {
    id: uuidv4(),
    title: generateSongTitle(),
    genre: npc.genre ?? pick(GENRES),
    quality,
    releaseDate: `${date.day.toString().padStart(2, '0')}/${date.month.toString().padStart(2, '0')}/${date.year}`,
    marketingBudget: Math.round(fameReach * 4 * Math.random()),
    totalStreams: 0,
    weeklyStreams: openingStreams,
    totalEarnings: 0,
    version: 'original',
    featuredArtists: [],
    chartPositions: {},
    certifications: [],
    hasVideo: Math.random() < (npc.tier === 'international' ? 0.7 : npc.tier === 'national' ? 0.35 : 0.08),
    videoViews: 0,
    // NPC ownership — these extra fields let charts attribute songs correctly.
    ownerId: npc.id,
    ownerName: npc.name,
    ownerCountry: npc.country,
    weeksOut: 0,
    peakWeeklyStreams: openingStreams,
  } as Song;
}

/**
 * Advance every NPC song one step of the world clock.
 * Songs grow while fresh, decay as they age, and can unexpectedly surge.
 */
export function tickNPCSongs(songs: Song[], npcs: NPC[]): { events: string[] } {
  const events: string[] = [];

  // Only the owners of live songs are ever looked up here — at most a few
  // hundred NPCs. Indexing the full ~12,000 roster into a Map (and allocating
  // 12,000 array pairs) to resolve ~420 ids was pure overhead.
  const needed = new Set<string>();
  for (const s of songs) if (s.ownerId) needed.add(s.ownerId);
  const npcById = new Map<string, NPC>();
  for (const n of npcs) if (needed.has(n.id)) npcById.set(n.id, n);

  for (const song of songs) {
    const weeks = (song.weeksOut ?? 0) + 1;
    song.weeksOut = weeks;

    const npc = song.ownerId ? npcById.get(song.ownerId) : undefined;

    // ── The engine owns the numbers; this function owns the story. ─────────
    //
    // Growth, decay, viral spikes and comebacks are all modelled day by day by
    // the streaming engine (`trajectory`), which is also what every chart is
    // built from. This used to run a second, scalar copy of the same curve on a
    // scale about a thousand times smaller (DAILY_STREAM_SCALE is 400,000;
    // `openingStreams` here started at 300), and both numbers got printed — a
    // record sitting at #1 on the global chart displayed a 279K lifetime next
    // to an 82M week. `weeklyStreams` / `totalStreams` are now read back off
    // the engine in `advanceTurn`. What is left here is the part the engine
    // cannot know: the weeks-out counter, the surge *event*, and the fame it
    // brings the artist.
    const surgeChance = 0.004 + (song.quality / 100) * 0.008;
    if (Math.random() < surgeChance && (song.weeklyStreams ?? 0) > 5000 && weeks <= 14) {
      // A surge can also re-ignite a song that had gone quiet.
      if (song.weeksOut > 8) song.weeksOut = Math.max(2, song.weeksOut - 6);
      if (npc) {
        events.push(`📈 ${npc.name}'s "${song.title}" is suddenly everywhere — the streams just exploded.`);
        // A viral moment lifts the artist too.
        npc.fame = Math.min(100, npc.fame + 1 + Math.random() * 2);
      }
    }
  }

  return { events };
}

/**
 * Drop retired NPC songs so the array cannot grow without bound.
 *
 * This is a rolling window on what is *currently relevant*, not a graveyard.
 * It has been wrong twice, in opposite directions, and both were caught by
 * measuring `videosFresh14d` and the release count over forty game weeks:
 *
 *  1. It kept every song younger than 60 weeks, so once the pool hit its
 *     ceiling it never lost anything, `npcReleaseTick` had zero headroom, and
 *     the world stopped releasing music entirely.
 *  2. It then retired songs with `weeklyStreams <= 400` — a threshold left over
 *     from the old scalar NPC model, which ran about a thousand times smaller
 *     than the streaming engine. Once the engine owned the numbers, *every*
 *     song cleared 400, nothing was ever dropped, and the world froze again.
 *
 * So the ceiling no longer depends on a stream count at all. When the pool is
 * full it is trimmed to a target *below* the ceiling, which guarantees the next
 * tick always has room for a new release no matter what scale the numbers are
 * on. Youth is the first sort key, so a new record always has a home; after
 * that the biggest records keep their slots.
 */
/**
 * Trim the live NPC song pool.
 *
 * `protect` is the set of ids the world is NOT allowed to forget — currently
 * every record the player has been asked onto and has not delivered yet. A
 * player who agrees to a verse, spends three days writing it and then watches
 * the record get pruned out of existence has done real work for nothing, and
 * the pruning is the only thing that can cause it. Without this the bug is rare
 * enough to never show up in testing and certain to show up eventually.
 */
export function pruneNPCSongs(songs: Song[], protect?: Set<string>): Song[] {
  // `>=`, not `>`. The release tick stops as soon as `MAX - existing.length`
  // reaches zero, so the array settles on *exactly* the ceiling and can never
  // exceed it. With a `>` test the trim therefore never ran, headroom stayed at
  // zero for the rest of the game, and the world stopped releasing music the
  // moment it filled up. Measured: at week 14 there were 25 songs under a
  // fortnight old; at week 40 there were none, and no new videos either.
  if (songs.length < MAX_LIVE_NPC_SONGS) return songs;

  const ranked = [...songs].sort((a, b) => {
    const protectedA = protect?.has(a.id) ? 1 : 0;
    const protectedB = protect?.has(b.id) ? 1 : 0;
    if (protectedA !== protectedB) return protectedB - protectedA;
    const youngA = (a.weeksOut ?? 0) < YOUNG_WEEKS ? 1 : 0;
    const youngB = (b.weeksOut ?? 0) < YOUNG_WEEKS ? 1 : 0;
    if (youngA !== youngB) return youngB - youngA;
    return (b.weeklyStreams ?? 0) - (a.weeklyStreams ?? 0);
  });

  return ranked.slice(0, Math.floor(MAX_LIVE_NPC_SONGS * 0.9));
}

/**
 * How many NPC songs the world keeps alive at once.
 *
 * The roster is ~12,000 people, but only a few hundred of them are ever
 * "on the radar" in a given week — the rest are local scene colour. Capping
 * the live song pool keeps `updateCharts` and the save file bounded no matter
 * how large the roster grows.
 */
export const MAX_LIVE_NPC_SONGS = 420;

/**
 * How long a record is treated as "young" for pruning purposes.
 *
 * Youth is the first sort key in `pruneNPCSongs`, so a record is never retired
 * while it is still plausibly climbing. Kept in step with the release window in
 * `npcVideoTick` (eight weeks), which is what decides whether a visual still
 * gets shot for it.
 */
const YOUNG_WEEKS = 26;

/** How many NPC artists are actively competing for chart space each tick. */
const ACTIVE_ARTIST_POOL = 260;

/**
 * Return the `k` most famous artists, sorted by fame descending.
 *
 * Implemented as an insertion-bounded top-K rather than a full sort: we keep a
 * sorted array of at most `k` entries and binary-search the insertion point of
 * each new candidate. With ~4,250 artists and k = 260 that turns a full
 * `sort()` of the whole roster into a single O(n log k) pass with an array that
 * never grows beyond k — measurably cheaper, and the result is identical to
 * sorting the filtered list.
 */
function topArtistsByFame(npcs: NPC[], k: number): NPC[] {
  const top: NPC[] = [];
  for (const npc of npcs) {
    if (npc.role !== 'artist') continue;
    if (top.length === k && npc.fame <= top[k - 1].fame) continue;

    // Binary search for the first index whose fame is below this NPC's.
    let lo = 0;
    let hi = top.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (top[mid].fame >= npc.fame) lo = mid + 1;
      else hi = mid;
    }
    top.splice(lo, 0, npc);
    if (top.length > k) top.pop();
  }
  return top;
}

/** NPC artists release new music on a fame-weighted cadence. */
export function npcReleaseTick(
  npcs: NPC[],
  existing: Song[],
  date: GameDate,
  turnCount: number,
  pending: Iterable<string> = [],
): { songs: Song[]; events: string[] } {
  const songs: Song[] = [];
  const events: string[] = [];

  // Only artists who could plausibly chart compete for the limited song pool.
  //
  // A full `filter(artist).sort(by fame).slice(260)` was copying all ~4,250
  // artists and then sorting every one of them to keep 260 — O(n log n) plus a
  // big allocation, every tick. This does a single O(n log k) pass: maintain a
  // sorted list of at most ACTIVE_ARTIST_POOL entries and binary-insert.
  const artists = topArtistsByFame(npcs, ACTIVE_ARTIST_POOL);

  if (artists.length === 0) return { songs, events };

  // Only hold a handful of recent songs per artist so the field stays readable.
  const countByOwner = new Map<string, number>();
  const lastByOwner = new Map<string, number>();
  const today = dateToSerial(date);
  for (const s of existing) {
    if (!s.ownerId) continue;
    countByOwner.set(s.ownerId, (countByOwner.get(s.ownerId) ?? 0) + 1);
    const at = serialOf(s.releaseDate, 0);
    if (at > (lastByOwner.get(s.ownerId) ?? -1)) lastByOwner.set(s.ownerId, at);
  }
  // Nobody drops a single a week. Stars space them out; locals put one out
  // when they can. `pending` is anything announced and not yet out.
  for (const id of pending) lastByOwner.set(id, today);

  const headroom = MAX_LIVE_NPC_SONGS - existing.length;
  if (headroom <= 0) return { songs, events };

  // Release cadence is per-week-of-game-time, so a "+1 Day" click cannot
  // flood the world with hundreds of new records.
  const dayOfWeek = ((turnCount % 7) + 7) % 7;
  const weeklyScale = dayOfWeek === 0 ? 1 : 0.12;

  for (const npc of artists) {
    if (songs.length >= headroom) break;

    // Bigger artists release more often; complete unknowns rarely chart.
    const baseChance = (0.02 + (npc.fame / 100) * 0.24) * weeklyScale;
    if (Math.random() > baseChance) continue;

    const gap = npc.fame >= 75 ? 35 : npc.fame >= 50 ? 24 : 16;
    if (today - (lastByOwner.get(npc.id) ?? -999) < gap) continue;

    const owned = countByOwner.get(npc.id) ?? 0;
    // How many records an artist keeps in play scales with who they are.
    //
    // This was a flat `owned >= 4` for everyone. Since `buildInitialNPCSongs`
    // hands every artist with fame >= 60 three records on day one, a superstar
    // arrived at three, released exactly one more, and was then blocked for the
    // rest of the game — which is why Drake never dropped anything across six
    // months of play. A star is on a release schedule; a local act puts out a
    // record when they can afford the studio time.
    const maxOwned =
      npc.fame >= 90 ? 9 : npc.fame >= 75 ? 7 : npc.fame >= 50 ? 5 : 4;
    if (owned >= maxOwned) continue;

    const song = createNPCSong(npc, date);
    songs.push(song);
    countByOwner.set(npc.id, owned + 1);
    events.push(`🎵 ${npc.name} dropped "${song.title}".`);
  }

  return { songs, events };
}

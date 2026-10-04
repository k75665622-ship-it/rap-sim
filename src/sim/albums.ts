// ─── ALBUMS ────────────────────────────────────────────────────────────────
// NPC artists need bodies of work for the Global Top 200 to be a real chart on
// day one. Albums are grouped deterministically out of each artist's existing
// catalogue — no extra song records are invented, and nothing is duplicated.

import type { Album, NPC, Song } from '../types/game';
import { makeRng, hashString } from './rng';
import { dateToSerial, serialToDate } from './gameClock';

/**
 * A mixtape is not an album. It is the loose, cheap, no-rules format: it needs
 * fewer tracks, it does not have to be all-original material, and it is not
 * held to the same commercial bar — but it also earns less per unit and does
 * not carry the same weight with critics.
 */
export type ProjectType = 'album' | 'ep' | 'deluxe' | 'mixtape';

export interface Project extends Album {
  ownerId: string;
  ownerName: string;
  ownerCountry: string;
  type: ProjectType;
  /** Deluxe editions roll their units into this album. */
  originalAlbumId?: string;
  /** Stable seed for the artwork tile. */
  coverSeed: number;
  /** Serial day of release, so album age is exact. */
  releaseSerial: number;
}

/**
 * Group an artist's songs into projects. A three-track artist gets an EP, a
 * bigger catalogue gets an album. The grouping is seeded on the artist id, so
 * the same roster always produces the same discography.
 */
export function buildProjectsForArtist(npc: NPC, songs: Song[]): Project[] {
  if (songs.length === 0) return [];

  const rng = makeRng(hashString(`rl-album|${npc.id}`));
  const pool = [...songs].sort(
    (a, b) => (a.releaseDate > b.releaseDate ? 1 : -1),
  );

  const projects: Project[] = [];
  let cursor = 0;
  let guard = 0;

  while (cursor < pool.length && guard++ < 6) {
    const remaining = pool.length - cursor;
    if (remaining < 2) break;

    const size = remaining >= 8 ? 8 + Math.floor(rng() * 4) : remaining >= 5 ? 5 + Math.floor(rng() * 3) : remaining;
    const tracks = pool.slice(cursor, cursor + size);
    if (tracks.length < 2) break;
    cursor += size;

    const type: ProjectType = tracks.length >= 6 ? 'album' : 'ep';
    const title = projectTitle(npc, rng, projects.length);
    const first = tracks[0];

    projects.push({
      id: `alb_${npc.id}_${projects.length}`,
      title,
      songs: tracks.map((t) => t.id),
      releaseDate: first.releaseDate,
      totalStreams: 0,
      totalEarnings: 0,
      certifications: [],
      ownerId: npc.id,
      ownerName: npc.name,
      ownerCountry: npc.country,
      type,
      coverSeed: hashString(`rl-cover|${npc.id}|${projects.length}`),
      releaseSerial: dateToSerial(
        serialToDate(releaseSerialOf(first)),
      ),
    });
  }

  // A single leftover track is not a project.
  return projects;
}

function releaseSerialOf(song: Song): number {
  const [d, m, y] = (song.releaseDate ?? '').split('/').map(Number);
  if (!d || !m || !y) return dateToSerial({ day: 1, month: 1, year: 2024 });
  return dateToSerial({ day: d, month: m, year: y });
}

const TITLE_A = ['Midnight', 'Concrete', 'Golden', 'Silent', 'Broken', 'Higher', 'Cold', 'Neon', 'Iron', 'Paper'];
const TITLE_B = ['Season', 'Hours', 'Hearts', 'Streets', 'Sermons', 'Money', 'Weather', 'City', 'Tapes', 'Bones'];
const EP_WORDS = ['Sessions', 'Files', 'Notes', 'Tapes', 'Vol. 1', 'Vol. 2', 'Demos'];

function projectTitle(npc: NPC, rng: () => number, index: number): string {
  if (index === 0 && rng() < 0.5) {
    return `${TITLE_A[Math.floor(rng() * TITLE_A.length)]} ${TITLE_B[Math.floor(rng() * TITLE_B.length)]}`;
  }
  if (rng() < 0.35) {
    return `${npc.city ?? npc.country} ${EP_WORDS[Math.floor(rng() * EP_WORDS.length)]}`;
  }
  return `${TITLE_A[Math.floor(rng() * TITLE_A.length)]} ${TITLE_B[Math.floor(rng() * TITLE_B.length)]}`;
}

/** Every NPC artist's discography, capped so the save stays small. */
export function buildInitialProjects(npcs: NPC[], songs: Song[]): Project[] {
  const byOwner = new Map<string, Song[]>();
  for (const s of songs) {
    if (!s.ownerId) continue;
    const list = byOwner.get(s.ownerId) ?? [];
    list.push(s);
    byOwner.set(s.ownerId, list);
  }

  const artists = npcs
    .filter((n) => n.role === 'artist' && byOwner.has(n.id))
    .sort((a, b) => b.fame - a.fame)
    .slice(0, 190);

  const out: Project[] = [];
  for (const npc of artists) {
    out.push(...buildProjectsForArtist(npc, byOwner.get(npc.id)!));
  }
  return out;
}

/** A player-side project built from the player's own released songs. */
export function buildPlayerProject(
  playerId: string,
  playerName: string,
  country: string,
  songs: Song[],
  index: number,
): Project {
  const releaseSerial = songs.length ? releaseSerialOf(songs[0]) : 0;
  return {
    id: `alb_player_${index}`,
    title: 'Untitled Project',
    songs: songs.map((s) => s.id),
    releaseDate: songs[0]?.releaseDate ?? '',
    totalStreams: 0,
    totalEarnings: 0,
    certifications: [],
    ownerId: playerId,
    ownerName: playerName,
    ownerCountry: country,
    type: songs.length >= 6 ? 'album' : 'ep',
    coverSeed: hashString(`rl-cover|${playerId}|${index}`),
    releaseSerial,
  };
}

export function projectTypeLabel(t: ProjectType): string {
  return t === 'album' ? 'Album' : t === 'ep' ? 'EP' : t === 'mixtape' ? 'Mixtape' : 'Deluxe';
}

/** Minimum tracks to open a project of each kind. */
export const MIN_PROJECT_TRACKS: Record<ProjectType, number> = {
  ep: 2,
  album: 5,
  mixtape: 4,
  deluxe: 1,
};

/** Why a project of this kind needs that many tracks, in the player's words. */
export const PROJECT_TRACK_RULE: Record<ProjectType, string> = {
  ep: 'An EP needs at least two tracks.',
  album: 'An album needs at least five tracks. Two to four is an EP.',
  mixtape: 'A mixtape needs at least four tracks. Fewer than that is just loose songs.',
  deluxe: 'A deluxe edition needs at least one extra track.',
};

/**
 * Bundle an artist's recent singles into a new project, if they have enough.
 *
 * NPCs used to release songs and never albums, so the Global Top 200 only ever
 * shrank: every week the recurrent rule retired something and nothing replaced
 * it. Measured over forty game weeks, the album chart lost a third of its
 * entries. This is the other half of that loop.
 *
 * Only songs not already on a project are considered, so nothing is counted
 * twice and no song is ever listed on two albums.
 */
export function buildNewProject(
  npc: NPC,
  candidateSongs: Song[],
  existingProjects: Project[],
  nowSerial: number,
): Project | null {
  if (candidateSongs.length < 2) return null;

  const used = new Set<string>();
  for (const p of existingProjects) for (const id of p.songs) used.add(id);

  const fresh = candidateSongs
    .filter((s) => !used.has(s.id))
    .sort((a, b) => releaseSerialOf(a) - releaseSerialOf(b));

  // An EP needs two tracks; an album needs five.
  if (fresh.length < 2) return null;

  const type: ProjectType = fresh.length >= 5 ? 'album' : 'ep';
  const size = type === 'album' ? Math.min(10, fresh.length) : fresh.length;
  const tracks = fresh.slice(0, size);

  const rng = makeRng(hashString(`rl-newproj|${npc.id}|${nowSerial}`));
  const index = existingProjects.length;

  return {
    id: `alb_${npc.id}_${index}`,
    title: projectTitle(npc, rng, index),
    songs: tracks.map((t) => t.id),
    releaseDate: tracks[0].releaseDate,
    totalStreams: 0,
    totalEarnings: 0,
    certifications: [],
    ownerId: npc.id,
    ownerName: npc.name,
    ownerCountry: npc.country,
    type,
    coverSeed: hashString(`rl-cover|${npc.id}|${index}`),
    releaseSerial: nowSerial,
  };
}

// ─── AWARDS ENGINE ────────────────────────────────────────────────────────
// Award seasons run on a schedule as part of the world simulation. Winners are
// decided from REAL chart, streaming and critical performance. Crucially, the
// player is not the centre of the ceremony — NPCs win their own awards whether
// or not the player was ever nominated.

import { v4 as uuidv4 } from 'uuid';
import type { Award, AwardTier, ChartEntry, Player, Song } from '../types/game';

export interface AwardShow {
  id: string;
  name: string;
  tier: AwardTier;
  country?: string;
  /** Categories this show hands out. */
  categories: string[];
}

export const AWARD_SHOWS: AwardShow[] = [
  {
    id: 'ghana_music_awards',
    name: 'Ghana Music Awards',
    tier: 'country',
    country: 'Ghana',
    categories: ['Song of the Year', 'Best Hip-Hop Act', 'Breakthrough Act'],
  },
  {
    id: 'african_music_awards',
    name: 'African Music Awards',
    tier: 'regional',
    categories: ['Best African Song', 'Best African Artiste', 'Producer of the Year'],
  },
  {
    id: 'gold_note_awards',
    name: 'Gold Note Awards',
    tier: 'global',
    categories: ['Record of the Year', 'Artist of the Year'],
  },
];

/** Which chart a show reads from to decide its winners. */
function marketFor(show: AwardShow): string {
  if (show.tier === 'country') return show.country ?? 'Ghana';
  if (show.tier === 'regional') return 'Africa';
  return 'USA';
}

export interface Nominee {
  id: string;
  name: string;
  songId?: string;
  songTitle?: string;
  score: number;
}

/**
 * Score every artist in a market and return ranked nominees.
 * Score blends chart position, weekly streams, and song quality — so a
 * critically loved record can beat a purely commercial one.
 */
export function buildNominees(
  show: AwardShow,
  charts: Record<string, ChartEntry[]>,
  songs: Song[],
): Nominee[] {
  const market = marketFor(show);
  const chart = charts[market] ?? [];
  const songById = new Map(songs.map(s => [s.id, s]));
  const scores = new Map<string, Nominee>();

  chart.slice(0, 30).forEach((entry, idx) => {
    const song = songById.get(entry.songId);
    const chartScore = Math.max(0, 30 - idx) * 8;
    const streamScore = Math.log10(Math.max(song?.weeklyStreams ?? 1, 1)) * 22;
    const qualityScore = (song?.quality ?? 40) * 0.55;
    const raw = chartScore + streamScore + qualityScore;

    const existing = scores.get(entry.artistId);
    if (!existing || raw > existing.score) {
      scores.set(entry.artistId, {
        id: entry.artistId,
        name: entry.artistName,
        songId: entry.songId,
        songTitle: entry.songTitle,
        score: raw,
      });
    }
  });

  // A little noise so the same act does not win everything forever.
  const ranked = [...scores.values()]
    .map(n => ({ ...n, score: n.score * (0.82 + Math.random() * 0.36) }))
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 5);
}

export interface AwardResult {
  awards: Award[];
  headlines: string[];
  playerWins: Award[];
}

/**
 * Run a full award ceremony. Returns every award handed out — including ones
 * the player had nothing to do with.
 */
export function runAwardShow(
  show: AwardShow,
  charts: Record<string, ChartEntry[]>,
  songs: Song[],
  player: Player | null,
  year: number,
): AwardResult {
  const nominees = buildNominees(show, charts, songs);
  const awards: Award[] = [];
  const headlines: string[] = [];

  if (nominees.length === 0) return { awards, headlines, playerWins: [] };

  // Nobody sweeps the whole ceremony. Each category draws from a rescrambled
  // field, and an act that has already won is pushed down the order.
  const alreadyWon = new Set<string>();

  for (const category of show.categories) {
    // Category weighting: some categories favour quality, some favour reach.
    const weighted = nominees.map(n => {
      let score = n.score * (0.75 + Math.random() * 0.5);
      if (category.includes('Hip-Hop') || category.includes('Record')) {
        const song = songs.find(s => s.id === n.songId);
        score += (song?.quality ?? 50) * 0.7;
      }
      if (category.includes('Breakthrough')) {
        // Favour newer/less established acts.
        score *= 0.5 + Math.random() * 1.1;
      }
      // Repeat winners are penalised, so awards genuinely spread around.
      if (alreadyWon.has(n.id)) score *= 0.45;
      return { ...n, score };
    }).sort((a, b) => b.score - a.score);

    const winner = weighted[0];
    alreadyWon.add(winner.id);
    const award: Award = {
      id: uuidv4(),
      name: `${show.name} — ${category}`,
      tier: show.tier,
      country: show.country,
      category,
      year,
      winner: winner.id,
      nominees: weighted.map(n => n.id),
    };
    awards.push(award);

    const isPlayer = player && winner.id === player.id;
    headlines.push(
      isPlayer
        ? `🏆 ${player!.artistName} WINS ${category} at the ${show.name}!`
        : `🏆 ${winner.name} takes home ${category} at the ${show.name}.`
    );
  }

  const playerWins = player ? awards.filter(a => a.winner === player.id) : [];
  return { awards, headlines, playerWins };
}

/** Which shows are due this turn, given the in-game month. */
export function showsDueThisTurn(month: number): AwardShow[] {
  // Award season lands at the end of the in-game year.
  if (month !== 12) return [];
  return AWARD_SHOWS;
}

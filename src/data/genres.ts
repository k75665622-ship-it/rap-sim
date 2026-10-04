// ─── GENRES ────────────────────────────────────────────────────────────────
//
// ONE list. The artist creator, the studio, the lyric engine, the tempo model
// and the NPC roster all read from here, so adding a genre is one entry in this
// file and a new union member in `types/game.ts`.
//
// `family` groups them in the picker and drives how the record is made:
//   rap     — spoken delivery. Flow and lyricism carry it.
//   sung    — melodic delivery. Pitch and vocal ability carry it.
//   groove  — dance records. Rhythm, charisma and the beat carry it.
//   live    — band-led. Session players and an engineer matter most.

import type { Genre } from '../types/game';

export type GenreFamily = 'rap' | 'sung' | 'groove' | 'live';

export interface GenreSpec {
  id: Genre;
  label: string;
  emoji: string;
  family: GenreFamily;
  /** Where the tempo naturally sits. */
  bpm: number;
  blurb: string;
  /** Two lines that tint a ghost-written sheet so lanes do not read alike. */
  texture: [string, string];
}

export const FAMILY_LABEL: Record<GenreFamily, string> = {
  rap: 'Rap',
  sung: 'Sung & soulful',
  groove: 'Dance & groove',
  live: 'Live & band',
};

export const GENRE_LIST: GenreSpec[] = [
  // ── Rap ──
  { id: 'hip_hop', label: 'Hip-Hop', emoji: '🎤', family: 'rap', bpm: 95, blurb: 'Bars first. The standard pocket.',
    texture: ['boom bap in the trunk and a pen that never rests', 'four bar loops and a story with a spine'] },
  { id: 'trap', label: 'Trap', emoji: '🎧', family: 'rap', bpm: 140, blurb: 'Rolling hi-hats, heavy 808s.',
    texture: ['red beam on the ceiling and the speakers on ten', 'whole lot of nothing turned into something real'] },
  { id: 'drill', label: 'Drill', emoji: '🔫', family: 'rap', bpm: 142, blurb: 'Cold, sliding and menacing.',
    texture: ['sliding through the dark with the headlights off', 'opposition quiet when the winter comes'] },
  { id: 'grime', label: 'Grime', emoji: '🇬🇧', family: 'rap', bpm: 138, blurb: 'Fast, jagged, London-born.',
    texture: ['cold night cold flow cold heart warm room', 'estate blocks and a sixteen that cuts'] },
  { id: 'conscious', label: 'Conscious', emoji: '📚', family: 'rap', bpm: 88, blurb: 'Message-led. Critics love it.',
    texture: ['the news said calm down and my conscience said no', 'history in the doorway asking what I did'] },
  { id: 'pop_rap', label: 'Pop Rap', emoji: '⭐', family: 'rap', bpm: 118, blurb: 'Hooks built for radio.',
    texture: ['radio in the mirror saying my own name', 'melody first and the message catches up'] },
  { id: 'boom_bap', label: 'Boom Bap', emoji: '📼', family: 'rap', bpm: 90, blurb: 'Dusty drums, sampled soul, pure lyricism.',
    texture: ['dusty snare and a sample older than me', 'cipher in the corner and the tape still rolling'] },
  { id: 'jazz_rap', label: 'Jazz Rap', emoji: '🎷', family: 'rap', bpm: 92, blurb: 'Smoky keys, laid-back wordplay.',
    texture: ['a trumpet in the back and my thoughts in the front', 'rhythm sits in the pocket like a late-night coat'] },

  // ── Sung & soulful ──
  { id: 'rnb', label: 'R&B', emoji: '💜', family: 'sung', bpm: 82, blurb: 'Smooth vocals, slow-burn feeling.',
    texture: ['slow dance in the kitchen with the lights turned low', 'say it softly and the whole room leans in'] },
  { id: 'neo_soul', label: 'Neo-Soul', emoji: '🌻', family: 'sung', bpm: 78, blurb: 'Warm, organic, deeply human.',
    texture: ['sunday morning light on a Fender Rhodes hum', 'honest as a hymn and twice as patient'] },
  { id: 'pop', label: 'Pop', emoji: '🌟', family: 'sung', bpm: 112, blurb: 'Big hooks, big stages, big reach.',
    texture: ['every chorus a lighthouse for the whole crowd', 'glitter on the beat and a heart in the bridge'] },
  { id: 'gospel', label: 'Gospel', emoji: '🙏', family: 'sung', bpm: 76, blurb: 'Choirs, testimony, uplift.',
    texture: ['a choir behind me and a testimony in my chest', 'lift it up till the rafters hear it too'] },
  { id: 'alte', label: 'Alté', emoji: '🌀', family: 'sung', bpm: 98, blurb: 'Left-field Lagos cool. Genre-blind.',
    texture: ['thrift store sunrise and a synth that feels like home', 'half sung half dreamed and all of it mine'] },

  // ── Dance & groove ──
  { id: 'afrobeats', label: 'Afrobeats', emoji: '🥁', family: 'groove', bpm: 105, blurb: 'The sound of the continent, exported.',
    texture: ['the drum said move and the whole floor answered', 'lagos in the bassline accra in the hook'] },
  { id: 'amapiano', label: 'Amapiano', emoji: '🎹', family: 'groove', bpm: 112, blurb: 'Log drums, piano, South African house.',
    texture: ['log drum rolling and the piano doing the talking', 'johannesburg midnight and nobody going home'] },
  { id: 'highlife', label: 'Highlife', emoji: '🎺', family: 'groove', bpm: 108, blurb: 'Guitars and horns. West Africa\'s golden age.',
    texture: ['horns in the doorway and a guitar that smiles', 'grandfather danced to this and now it is mine'] },
  { id: 'dancehall', label: 'Dancehall', emoji: '🕺', family: 'groove', bpm: 100, blurb: 'Riddims, energy, island heat.',
    texture: ['riddim in my spine from the day I was born', 'speaker box rattle till the morning light'] },
  { id: 'reggae', label: 'Reggae', emoji: '🌴', family: 'groove', bpm: 78, blurb: 'One drop, roots, positive vibration.',
    texture: ['one drop heartbeat and the bassline breathing', 'sun on the hillside and the whole yard singing'] },
  { id: 'latin', label: 'Latin', emoji: '💃', family: 'groove', bpm: 96, blurb: 'Reggaeton and beyond. Global dancefloors.',
    texture: ['dembow pulse and a whisper in the rhythm', 'midnight in the street with the speakers on the stoop'] },

  // ── Live & band ──
  { id: 'rock', label: 'Rock', emoji: '🎸', family: 'live', bpm: 120, blurb: 'Guitars, drums, and attitude.',
    texture: ['amps on eleven and a chorus built to scream', 'distortion in the dark and nothing left to lose'] },
];

export const GENRE_BY_ID: Record<Genre, GenreSpec> = Object.fromEntries(
  GENRE_LIST.map((g) => [g.id, g]),
) as Record<Genre, GenreSpec>;

export function genreLabel(id: Genre | string | undefined): string {
  return (id && GENRE_BY_ID[id as Genre]?.label) || String(id ?? '');
}

/** Genres where the artist is singing, so pitch matters more than flow. */
export const MELODIC_GENRES: Genre[] = GENRE_LIST
  .filter((g) => g.family === 'sung' || g.family === 'groove')
  .map((g) => g.id);

/**
 * Genres the roster is drawn from. Rap is listed twice so the world still
 * leans hip-hop — this is a rap game — without being only hip-hop.
 */
export const ROSTER_GENRES: Genre[] = [
  ...GENRE_LIST.filter((g) => g.family === 'rap').map((g) => g.id),
  ...GENRE_LIST.filter((g) => g.family === 'rap').map((g) => g.id),
  ...GENRE_LIST.filter((g) => g.family !== 'rap').map((g) => g.id),
];

// ─── BEATS ─────────────────────────────────────────────────────────────────
//
// A beat used to exist only inside a session: pick a producer, pick one of
// their four fixed loops, record. Now beats are things you HAVE.
//
//   · Your team makes them. A producer on the payroll sends a beat or two a
//     week; a sound engineer sends one every week or so. Free — the wage is
//     what pays for it — and their quality is their skill.
//   · You buy them. The beat store rotates every week: a lease is cheap and
//     somebody else may have the same beat (it sounds a little less fresh), an
//     exclusive is yours alone and costs several times as much.
//   · You order them. Tell somebody exactly what you want — genre, tempo,
//     mood, the song it is for — and they build it to fit. Your own team does
//     it for free; anybody else charges. Don't like it? Ask for a redo.
//
// Every beat goes on one record. Pure: no store, no clock.

import type { Genre, NPC, SongMood } from '../types/game';
import { hashString } from './rng';
import { producerFee, producerSkillOf } from './studio';

export type BeatSource = 'team' | 'store' | 'custom';
export type BeatLicense = 'lease' | 'exclusive' | 'inhouse';

export interface OwnedBeat {
  id: string;
  name: string;
  /** How good the beat is, 0-100, as it will sound on the record. */
  quality: number;
  genre: Genre;
  bpm: number;
  mood: SongMood;
  producerId?: string;
  producerName: string;
  source: BeatSource;
  license: BeatLicense;
  acquiredSerial: number;
  /** What it cost, if anything. */
  price?: number;
  /** Made for this song. */
  forTitle?: string;
  usedOnSongId?: string;
  usedOnTitle?: string;
  redos?: number;
}

export interface BeatListing {
  id: string;
  name: string;
  quality: number;
  genre: Genre;
  bpm: number;
  mood: SongMood;
  producerId: string;
  producerName: string;
  lease: number;
  exclusive: number;
  /** Bought by you this week. */
  sold?: boolean;
}

export interface BeatOrder {
  id: string;
  producerId: string;
  producerName: string;
  genre: Genre;
  bpm: number;
  mood: SongMood;
  forTitle?: string;
  fee: number;
  orderedSerial: number;
  dueSerial: number;
  inHouse: boolean;
  /** A second go at a beat you didn't like. */
  redoOf?: string;
}

export interface BeatsState {
  library: OwnedBeat[];
  orders: BeatOrder[];
  store: BeatListing[];
  storeWeek: number;
  /** Day serial of the last team drop, per crew member id. */
  lastDrop: Record<string, number>;
}

export function emptyBeats(): BeatsState {
  return { library: [], orders: [], store: [], storeWeek: -1, lastDrop: {} };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const unit = (seed: string) => (hashString(seed) % 10_000) / 10_000;
const pick = <T,>(arr: T[], seed: string): T => arr[hashString(seed) % arr.length];

const A = ['Midnight', 'Gold', 'Velvet', 'Neon', 'Dust', 'Chrome', 'Sacred', 'Liquid', 'Crimson', 'Hollow', 'Amber', 'Lagos', 'Accra', 'Island', 'Smoke', 'Ghost', 'Sugar', 'Thunder', 'Silk', 'Ivory', 'Rebel', 'Desert', 'Ocean', 'Cold'];
const B = ['Bounce', 'Pocket', 'Drums', 'Groove', 'Waves', 'Motion', 'Tape', 'Riddim', 'Flip', 'Keys', 'Wave', 'Strings', 'Talk', 'Season', 'Dance', 'Mode', 'Rain', 'Vibes', 'Run', 'Fever'];
export function beatName(seed: string): string {
  return `${pick(A, seed + 'a')} ${pick(B, seed + 'b')}`;
}

const MOODS: SongMood[] = ['aggressive', 'melancholy', 'celebratory', 'introspective', 'sensual', 'defiant'];

/** What a beat costs in the store. */
export function beatPrice(quality: number, license: 'lease' | 'exclusive'): number {
  const base = producerFee(clamp(quality, 0, 100));
  const raw = license === 'lease' ? Math.max(40, base * 0.35) : Math.max(150, base * 1.5);
  return Math.round(raw / 10) * 10;
}

/** A lease is shared with whoever else bought it. It sounds a little less fresh. */
export const LEASE_PENALTY = 4;

/**
 * This week's store: nine beats from producers in your country and a couple
 * from abroad, spread across quality. Deterministic per week.
 */
export function storeCatalogue(opts: { producers: NPC[]; genre: Genre; country: string; week: number; fame: number }): BeatListing[] {
  const { producers, genre, country, week, fame } = opts;
  const home = producers.filter((p) => p.country === country);
  const away = producers.filter((p) => p.country !== country && p.fame >= 30);
  const out: BeatListing[] = [];
  const pool = [...home, ...away];
  if (!pool.length) return out;
  for (let i = 0; i < 9; i++) {
    const seed = `store|${week}|${i}`;
    const from = i < 7 && home.length ? home : away.length ? away : pool;
    const p = from[hashString(seed) % from.length];
    const skill = producerSkillOf(p);
    // The store skews toward what an artist at your level can afford, with a
    // couple of premium beats at the top.
    const target = i >= 7 ? Math.max(skill, 70) : Math.min(skill, 40 + fame * 0.6);
    const quality = Math.round(clamp(target + (unit(seed + 'q') - 0.5) * 16, 25, 97));
    const g = unit(seed + 'g') < 0.7 ? genre : (['afrobeats', 'hip_hop', 'drill', 'rnb', 'dancehall', 'trap'] as Genre[])[hashString(seed + 'g2') % 6];
    out.push({
      id: `listing:${week}:${i}`,
      name: beatName(seed),
      quality,
      genre: g,
      bpm: 70 + (hashString(seed + 'bpm') % 80),
      mood: MOODS[hashString(seed + 'm') % MOODS.length],
      producerId: p.id,
      producerName: p.name,
      lease: beatPrice(quality, 'lease'),
      exclusive: beatPrice(quality, 'exclusive'),
    });
  }
  return out.sort((a, b) => a.lease - b.lease);
}

/** How often a team member sends a beat, in days. */
export function dropInterval(role: string, beatSpeed: number): number {
  const base = role === 'producer' ? 9 : 8;
  return Math.max(2, Math.round(base / beatSpeed));
}

/** A beat from someone on your payroll. */
export function teamBeat(opts: { memberId: string; npcId: string; npcName: string; role: string; skill: number; genre: Genre; serial: number; roll: number }): OwnedBeat {
  const { npcId, npcName, role, skill, genre, serial, roll } = opts;
  const seed = `team|${npcId}|${serial}`;
  // Engineers make cleaner, safer beats; producers swing wider.
  const spread = role === 'producer' ? 16 : 10;
  const quality = Math.round(clamp(skill + (role === 'producer' ? 3 : -6) + (roll - 0.5) * spread, 20, 98));
  return {
    id: `beat:${seed}`,
    name: beatName(seed),
    quality,
    genre,
    bpm: 72 + (hashString(seed + 'bpm') % 70),
    mood: MOODS[hashString(seed + 'm') % MOODS.length],
    producerId: npcId,
    producerName: npcName,
    source: 'team',
    license: 'inhouse',
    acquiredSerial: serial,
  };
}

/** What a commissioned beat costs and how long it takes. */
export function orderQuote(skill: number, inHouse: boolean): { fee: number; days: number } {
  const fee = inHouse ? 0 : Math.round((producerFee(skill) * 1.25) / 10) * 10;
  const days = Math.max(2, Math.round(2 + skill / 30 + (inHouse ? 0 : 1)));
  return { fee, days };
}

/**
 * A beat built for one song fits it: genre, tempo and mood match what you
 * asked for, and a producer working to a brief does a little better than
 * whatever was already in the folder. A redo is another roll of the dice.
 */
export function customBeatQuality(skill: number, roll: number, redo: boolean): number {
  return Math.round(clamp(skill + 4 + (roll - 0.5) * (redo ? 18 : 12), 20, 99));
}

/** Will an outside producer take the order? Friends say yes; strangers want the fee. */
export function takesOrder(npc: Pick<NPC, 'relationshipScore' | 'fame'>, playerFame: number, roll: number): boolean {
  const lean = 0.65 + npc.relationshipScore / 150 - Math.max(0, npc.fame - playerFame) / 80;
  return roll < clamp(lean, 0.15, 0.97);
}

/** How a beat reads, in one word. */
export function beatGrade(q: number): string {
  if (q >= 88) return 'Classic';
  if (q >= 78) return 'Heat';
  if (q >= 66) return 'Solid';
  if (q >= 52) return 'Decent';
  if (q >= 40) return 'Rough';
  return 'Weak';
}

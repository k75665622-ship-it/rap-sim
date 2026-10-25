// What a song is about: the theme, the hook, the verse — and what kind of
// verse would fit if somebody asked you onto it. With an AI key the artist's
// own words are written by the AI (fictional artists only); without one, the
// game writes them. Real artists' songs never get invented lyrics.

import type { Song, SongMood } from '../types/game';
import { hookFor, linesFor } from '../audio/lyrics';

export interface SongNote { about: string; hook: string[]; verse: string[]; fit: string; by: 'ai' | 'game' }

const ABOUT: Record<string, string[]> = {
  defiant: ['a middle finger to everyone who doubted them', 'standing tall when the city said they would fold'],
  romantic: ['falling for someone they can\'t stop thinking about', 'a love that showed up when they least expected it'],
  sad: ['the night everything fell apart', 'missing someone who isn\'t coming back'],
  hype: ['pure energy for the club — no deep meaning, just bounce', 'a celebration for the people who made it out'],
  reflective: ['looking back at where they started', 'the cost of chasing the dream'],
  party: ['a weekend that never ends', 'the dance floor at 2am'],
};
const FIT: Record<string, string> = {
  defiant: 'Come with hunger: your come-up, the doubters, why you\'re still here. Hard delivery.',
  romantic: 'Keep it smooth — a verse to the same person, from your side. Melody helps.',
  sad: 'Be honest and slow. Tell your side of the heartbreak; don\'t try to be the hardest.',
  hype: 'Short punchy bars and a catchy flow. Energy over meaning.',
  reflective: 'Tell your own story — where you started, what it cost. Real details win.',
  party: 'Fun, bouncy, a line people can shout back. Don\'t get deep.',
};

export function gameNote(song: Song, ownerName: string, city: string): SongNote {
  const mood = (song.mood ?? 'defiant') as SongMood | string;
  const pool = ABOUT[mood] ?? ABOUT.defiant;
  const about = `${ownerName}'s "${song.title}" is about ${pool[song.title.length % pool.length]}.`;
  return { about, hook: hookFor(`${song.id}|hook`, song.title).slice(0, 2), verse: linesFor(`${song.id}|verse`, 8, { city, title: song.title }), fit: FIT[mood] ?? FIT.defiant, by: 'game' };
}

/** Why a record is moving, read from what the game knows. */
export function whyTrending(song: Song, i: { growth: number; country: string; serialNow: number; releaseSerial?: number; featuredNames: string[] }): string[] {
  const out: string[] = [];
  const pos = song.chartPositions?.[i.country];
  if (pos !== undefined && pos <= 10) out.push(`#${pos} in ${i.country} right now.`);
  if (i.releaseSerial !== undefined && i.serialNow - i.releaseSerial <= 10) out.push('It just came out — first-week hype.');
  if (i.growth > 0.15) out.push(`Up ${Math.round(i.growth * 100)}% on last week — it's spreading.`);
  if (i.growth < -0.2) out.push('Cooling off — the moment is passing.');
  for (const r of (song.revivals ?? []).slice(-2)) if (r.reason) out.push(`${r.reason}.`);
  if (i.featuredNames.length) out.push(`Features ${i.featuredNames.join(' and ')} — their fans came with them.`);
  if (song.quality >= 80) out.push('The record is genuinely great — people replay it.');
  if (song.hasVideo) out.push('The video is doing work.');
  if (!out.length) out.push('Steady — a solid record with its own audience.');
  return out.slice(0, 4);
}

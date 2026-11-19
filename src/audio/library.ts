// ─── REAL TRACKS ───────────────────────────────────────────────────────────
//
// The slot where real recorded or AI-generated songs plug in. Until there are
// any, every song plays as the game has always made it: a beat built in the
// browser, plus the artist's voice if AI voices are on.
//
// To add real audio, put files in `public/music/` and list them in
// `public/music/manifest.json`:
//
//   {
//     "artists": { "<npc id>": ["music/<npc id>/1.mp3", "music/<npc id>/2.mp3"] },
//     "songs":   { "<song id>": "music/some-file.mp3" }
//   }
//
// A song listed under "songs" always plays that file. Otherwise, if its artist
// has files, the song gets one of them (the same one every time). The NPC
// roster and its songs are built from a fixed seed, so ids are the same in
// every career and on every device — one set of files serves every player.
//
// `soundPrompt(npc)` writes the description to give a music generator for an
// artist, so their tracks match the sound the game already gives them.

import type { NPC, Song } from '../types/game';
import { voiceFor } from './voices';

interface Manifest { artists?: Record<string, string[]>; songs?: Record<string, string> }

let manifest: Promise<Manifest> | null = null;

function loadManifest(): Promise<Manifest> {
  if (!manifest) {
    manifest = (async () => {
      // Opened straight from a file (no server): there is nothing to fetch.
      if (typeof location === 'undefined' || location.protocol === 'file:') return {};
      try {
        const res = await fetch('music/manifest.json', { cache: 'no-cache' });
        if (!res.ok) return {};
        const json = (await res.json()) as Manifest;
        return json && typeof json === 'object' ? json : {};
      } catch {
        return {};
      }
    })();
  }
  return manifest;
}

function hash(s: string): number { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }

/** The real audio file for a song, if one has been added. */
export async function realTrackFor(song: Pick<Song, 'id'> & { ownerId?: string }): Promise<string | null> {
  const m = await loadManifest();
  const own = m.songs?.[song.id];
  if (own) return own;
  const files = song.ownerId ? m.artists?.[song.ownerId] : undefined;
  if (files?.length) return files[hash(song.id) % files.length];
  return null;
}

/** How many songs and artists have real audio (for settings and notes). */
export async function realTrackCount(): Promise<{ artists: number; songs: number }> {
  const m = await loadManifest();
  return { artists: Object.keys(m.artists ?? {}).length, songs: Object.keys(m.songs ?? {}).length };
}

const STYLE: Record<string, string> = {
  hip_hop: 'hip-hop, punchy drums, confident rap vocal', trap: 'trap, 808s, rolling hi-hats, melodic rap', drill: 'drill, sliding 808s, dark piano, aggressive rap',
  grime: 'UK grime, 140 bpm, square-wave bass, fast rap', conscious: 'conscious hip-hop, soulful samples, thoughtful rap', pop_rap: 'pop rap, catchy hook, bright synths',
  boom_bap: 'boom-bap, dusty drums, vinyl crackle, lyrical rap', jazz_rap: 'jazz rap, upright bass, muted trumpet, laid-back flow', rnb: 'R&B, smooth vocals, warm keys',
  neo_soul: 'neo-soul, live bass, Rhodes, soulful singing', pop: 'pop, big chorus, polished production', gospel: 'gospel, choir, organ, uplifting lead vocal',
  alte: 'alté, dreamy guitars, airy vocals, Lagos alternative', afrobeats: 'afrobeats, log drums, percussion, sung hook, West African flavour',
  amapiano: 'amapiano, log drum bass, shakers, piano chords', highlife: 'highlife, bright guitars, horns, Ghanaian groove', dancehall: 'dancehall, dembow riddim, patois-inflected vocal',
  reggae: 'reggae, one-drop, warm bass, skanking guitar', latin: 'latin urbano, reggaeton beat', rock: 'rock, distorted guitars, live drums',
};

/**
 * What to ask a music generator for, so an artist's real tracks sound like
 * them: their genre, tempo feel, the voice the game gives them, and their
 * personality. Never names a real artist.
 */
export function soundPrompt(npc: NPC): string {
  const genre = String(npc.genre ?? 'hip_hop');
  const voice = voiceFor(npc);
  const pitch = voice.startsWith('af') || voice.startsWith('bf') ? 'female vocal' : 'male vocal';
  const vibe = (npc.personality ?? []).slice(0, 2).join(', ');
  const where = [npc.city, npc.country].filter(Boolean).join(', ');
  return `${STYLE[genre] ?? genre.replace(/_/g, ' ')}, ${pitch}${vibe ? `, ${vibe} energy` : ''}${where ? `, artist from ${where}` : ''}, original song, 90 seconds`;
}

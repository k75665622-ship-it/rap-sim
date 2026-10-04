// ─── STREAMING PLATFORMS ───────────────────────────────────────────────────
// Config-driven on purpose: adding a ninth platform is one entry in this array.
// Everything else — the charts, the payouts, the country splits, the platform
// home page, the logo mark — reads from here.
//
// `audience` is the platform's share of total listening (Spotify = 1.0 as the
// reference). `premium` is the share of that platform's listeners on a paid
// tier, which is what separates premium streams from free ones for the album
// equivalent calculation. `videoLift` is how much a music video helps streams
// here. `purchaseBased` marks iTunes, which counts downloads, not streams.
//
// These are original RAP LIFE text marks. No real company logos are used.

import type { Genre } from '../types/game';

export interface PlatformConfig {
  id: string;
  name: string;
  /** Short text mark drawn in the logo tile. Original to RAP LIFE. */
  mark: string;
  /** Full wordmark for the platform home page. */
  wordmark: string;
  accent: string;
  /** Share of world listening, Spotify = 1.0. */
  audience: number;
  /** Share of listeners on a paid tier, 0-1. */
  premium: number;
  /** USD paid per stream (or per download, for iTunes). */
  rate: number;
  /** True for iTunes: units are purchases/downloads, never streams. */
  purchaseBased?: boolean;
  /** Markets it over-indexes in, as a multiplier on its local weight. */
  strongMarkets: string[];
  strongGenres: Genre[];
  /** How much a music video lifts streams here, 0-1. */
  videoLift: number;
  /** Bonus for records that are new or from unknown artists, 0-1. */
  noveltyBoost: number;
  /** One-line quirk, shown on the platform page and in the switcher. */
  quirk: string;
  blurb: string;
}

export const PLATFORM_LIST: PlatformConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    mark: 'S',
    wordmark: 'SPOTIFY',
    accent: '#1DB954',
    audience: 1.0,
    premium: 0.55,
    rate: 0.0034,
    strongMarkets: ['USA', 'UK', 'Germany', 'France', 'Sweden', 'Australia', 'Canada', 'Netherlands', 'Brazil'],
    strongGenres: ['hip_hop', 'pop_rap', 'afrobeats', 'trap', 'rnb', 'pop', 'latin'],
    videoLift: 0.12,
    noveltyBoost: 0.05,
    quirk: 'Biggest global audience, playlist-driven',
    blurb: 'The volume play. Reaches everyone, pays the least per stream.',
  },
  {
    id: 'apple',
    name: 'Apple Music',
    mark: 'A',
    wordmark: 'APPLE MUSIC',
    accent: '#FA2D48',
    audience: 0.5,
    premium: 0.97,
    rate: 0.0072,
    strongMarkets: ['USA', 'UK', 'Japan', 'Canada', 'Germany', 'Australia', 'UAE', 'Switzerland'],
    strongGenres: ['hip_hop', 'pop_rap', 'conscious', 'trap', 'rnb', 'neo_soul', 'jazz_rap', 'pop'],
    videoLift: 0.08,
    noveltyBoost: 0.02,
    quirk: 'Smaller audience, higher-income countries, album-friendly',
    blurb: 'Almost entirely paid subscribers. The best per-stream rate at scale.',
  },
  {
    id: 'itunes',
    name: 'iTunes',
    mark: 'iT',
    wordmark: 'ITUNES',
    accent: '#B44CFF',
    audience: 0.2,
    premium: 1,
    rate: 0.69,
    purchaseBased: true,
    strongMarkets: ['USA', 'UK', 'Japan', 'Germany', 'Canada', 'Australia'],
    strongGenres: ['hip_hop', 'pop_rap', 'conscious', 'neo_soul', 'rnb', 'jazz_rap', 'boom_bap', 'rock', 'gospel'],
    videoLift: 0.05,
    noveltyBoost: 0,
    quirk: 'Counts PURCHASES and downloads, not streams',
    blurb: 'A download is worth roughly two hundred streams. Small volume, heavy weight.',
  },
  {
    id: 'audiomack',
    name: 'Audiomack',
    mark: 'AM',
    wordmark: 'AUDIOMACK',
    accent: '#FF9F1C',
    audience: 0.32,
    premium: 0.2,
    rate: 0.0015,
    strongMarkets: ['Nigeria', 'Ghana', 'Tanzania', 'Kenya', 'Ivory Coast', 'Senegal', 'Ethiopia', 'Cameroon', 'Uganda'],
    strongGenres: ['afrobeats', 'dancehall', 'hip_hop', 'drill', 'amapiano', 'highlife', 'reggae', 'alte'],
    videoLift: 0.15,
    noveltyBoost: 0.4,
    quirk: 'Strong in Africa, underground and hip-hop',
    blurb: 'The African street-level home. Tiny rate, enormous cultural reach.',
  },
  {
    id: 'youtube_music',
    name: 'YouTube Music',
    mark: 'YT',
    wordmark: 'YOUTUBE MUSIC',
    accent: '#FF3B3B',
    audience: 0.92,
    premium: 0.3,
    rate: 0.0019,
    strongMarkets: ['Nigeria', 'Ghana', 'India', 'Brazil', 'Mexico', 'Kenya', 'South Africa', 'Indonesia', 'Philippines'],
    strongGenres: ['afrobeats', 'dancehall', 'trap', 'drill', 'pop_rap', 'amapiano', 'alte', 'latin'],
    videoLift: 0.55,
    noveltyBoost: 0.2,
    quirk: 'Video-driven, boosted by music video views',
    blurb: 'Where the free listeners are, and the only platform a video really moves.',
  },
  {
    id: 'boomplay',
    name: 'Boomplay',
    mark: 'BP',
    wordmark: 'BOOMPLAY',
    accent: '#1E90FF',
    audience: 0.3,
    premium: 0.22,
    rate: 0.0011,
    strongMarkets: ['Nigeria', 'Ghana', 'Tanzania', 'Kenya', 'South Africa', 'Ivory Coast', 'DR Congo', 'Zambia'],
    strongGenres: ['afrobeats', 'dancehall', 'hip_hop', 'amapiano', 'highlife', 'reggae', 'gospel'],
    videoLift: 0.18,
    noveltyBoost: 0.28,
    quirk: 'Strong in Africa, mid audience',
    blurb: 'Africa-first platform. Lowest rate, but it is how the continent hears you.',
  },
  {
    id: 'deezer',
    name: 'Deezer',
    mark: 'DZ',
    wordmark: 'DEEZER',
    accent: '#A238FF',
    audience: 0.3,
    premium: 0.48,
    rate: 0.0056,
    strongMarkets: ['France', 'Brazil', 'Germany', 'Belgium', 'Portugal', 'Italy', 'Morocco', 'Senegal', 'Algeria'],
    strongGenres: ['afrobeats', 'dancehall', 'hip_hop', 'pop_rap', 'pop', 'rnb', 'alte'],
    videoLift: 0.1,
    noveltyBoost: 0.08,
    quirk: 'Strong in France and Europe',
    blurb: 'Carries France and francophone Africa. A better rate than the giants if the market fits.',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    mark: 'SC',
    wordmark: 'SOUNDCLOUD',
    accent: '#FF5500',
    audience: 0.36,
    premium: 0.26,
    rate: 0.0026,
    strongMarkets: ['USA', 'UK', 'Germany', 'South Africa', 'Nigeria', 'Japan'],
    strongGenres: ['drill', 'trap', 'hip_hop', 'grime', 'conscious', 'boom_bap', 'rock'],
    videoLift: 0.14,
    noveltyBoost: 0.75,
    quirk: 'Favors new and underground artists',
    blurb: 'Where underground records break first. Modest pay, real credibility.',
  },
];

export const PLATFORM_BY_ID: Record<string, PlatformConfig> = Object.fromEntries(
  PLATFORM_LIST.map((p) => [p.id, p]),
);

export const PLATFORM_IDS = PLATFORM_LIST.map((p) => p.id);

export function platform(id: string): PlatformConfig | undefined {
  return PLATFORM_BY_ID[id];
}

/** Platform ids whose units are purchases, not streams. */
export const PURCHASE_PLATFORM_IDS = PLATFORM_LIST.filter((p) => p.purchaseBased).map((p) => p.id);

export function isPurchasePlatform(id: string): boolean {
  return !!PLATFORM_BY_ID[id]?.purchaseBased;
}

/**
 * How much this platform over-indexes for a given market and genre.
 * 1.0 means "as expected"; 2.4 means it owns that territory.
 */
export function platformFit(
  p: PlatformConfig,
  country: string,
  genre: Genre,
): number {
  let fit = 1;
  if (p.strongMarkets.includes(country)) fit *= 2.4;
  if (p.strongGenres.includes(genre)) fit *= 1.35;
  return fit;
}

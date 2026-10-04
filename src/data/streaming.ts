// Streaming platforms. Each pays a different per-stream rate and reaches a
// different slice of the world, which is the whole point — where your streams
// come from changes what you actually get paid.
//
// Rates are per-stream in USD and roughly follow real-world relative ordering:
// Apple and Tidal pay best, Spotify is the volume king at a lower rate,
// Audiomack and Boomplay dominate African reach at the lowest rates.

export interface Platform {
  id: string;
  name: string;
  emoji: string;
  /** USD paid per stream. */
  ratePerStream: number;
  /**
   * Share of an artist's overall listenership that lands on this platform.
   * These do NOT sum to 1 — they're blended into a weighted average, so the
   * effective rate depends on which markets an artist is actually strong in.
   */
  reach: number;
  /** Markets this platform over-indexes in, as a multiplier on `reach`. */
  strongMarkets?: string[];
  /** Genres this platform over-indexes in. */
  strongGenres?: string[];
  blurb: string;
}

export const PLATFORMS: Platform[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    emoji: '🟢',
    ratePerStream: 0.0031,
    reach: 1.0,
    strongMarkets: ['USA', 'UK', 'Germany', 'France', 'Sweden', 'Australia', 'Canada', 'Netherlands', 'Brazil'],
    blurb: 'The volume play. Reaches everyone, pays the least per stream.',
  },
  {
    id: 'apple',
    name: 'Apple Music',
    emoji: '🍎',
    ratePerStream: 0.0068,
    reach: 0.55,
    strongMarkets: ['USA', 'UK', 'Japan', 'Canada', 'Germany', 'Australia'],
    blurb: 'Premium subscribers. Roughly double the Spotify rate.',
  },
  {
    id: 'youtube',
    name: 'YouTube Music',
    emoji: '▶️',
    ratePerStream: 0.0018,
    reach: 0.95,
    strongMarkets: ['Nigeria', 'Ghana', 'India', 'Brazil', 'Mexico', 'Kenya', 'South Africa'],
    blurb: 'Where the free listeners are. Heavy reach, thin payout.',
  },
  {
    id: 'audiomack',
    name: 'Audiomack',
    emoji: '🎧',
    ratePerStream: 0.0014,
    reach: 0.45,
    strongMarkets: ['Nigeria', 'Ghana', 'Tanzania', 'Kenya', 'Ivory Coast', 'Senegal', 'Ethiopia'],
    strongGenres: ['afrobeats', 'dancehall', 'hip_hop', 'amapiano', 'highlife', 'reggae'],
    blurb: 'The African street-level streaming home. Tiny rate, huge cultural reach.',
  },
  {
    id: 'boomplay',
    name: 'Boomplay',
    emoji: '🌍',
    ratePerStream: 0.0009,
    reach: 0.4,
    strongMarkets: ['Nigeria', 'Ghana', 'Tanzania', 'Kenya', 'South Africa', 'Ivory Coast', 'Ethiopia'],
    strongGenres: ['afrobeats', 'dancehall', 'amapiano', 'alte'],
    blurb: 'Africa-first platform. Lowest rate, but it is how the whole continent hears you.',
  },
  {
    id: 'tidal',
    name: 'Tidal',
    emoji: '🌊',
    ratePerStream: 0.0100,
    reach: 0.16,
    strongMarkets: ['USA', 'UK', 'Canada', 'Norway', 'Sweden'],
    strongGenres: ['hip_hop', 'conscious', 'rnb', 'neo_soul', 'jazz_rap', 'gospel'],
    blurb: 'The audiophile and hip-hop loyalist platform. Pays the most, reaches the fewest.',
  },
  {
    id: 'amazon',
    name: 'Amazon Music',
    emoji: '📦',
    ratePerStream: 0.0040,
    reach: 0.6,
    strongMarkets: ['USA', 'UK', 'Germany', 'Japan', 'Canada', 'Australia'],
    blurb: 'Bundled with Prime. Respectable rate, quiet volume.',
  },
  {
    id: 'deezer',
    name: 'Deezer',
    emoji: '🎵',
    ratePerStream: 0.0055,
    reach: 0.4,
    strongMarkets: ['France', 'Brazil', 'Germany', 'Belgium', 'Portugal', 'Italy'],
    strongGenres: ['afrobeats', 'dancehall', 'hip_hop', 'amapiano', 'highlife', 'reggae', 'pop'],
    blurb: 'Huge in France and Brazil. Better rate than the giants if your market fits.',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    emoji: '☁️',
    ratePerStream: 0.0025,
    reach: 0.5,
    strongMarkets: ['USA', 'UK', 'Germany', 'South Africa', 'Nigeria'],
    strongGenres: ['drill', 'trap', 'hip_hop', 'grime', 'boom_bap', 'rock'],
    blurb: 'Where underground records break first. Modest pay, real credibility.',
  },
  {
    id: 'tiktok',
    name: 'TikTok Music',
    emoji: '📱',
    ratePerStream: 0.0007,
    reach: 0.7,
    strongMarkets: ['USA', 'Brazil', 'Indonesia', 'Philippines', 'Mexico', 'Nigeria'],
    strongGenres: ['afrobeats', 'dancehall', 'trap', 'drill', 'amapiano', 'alte', 'latin', 'rnb'],
    blurb: 'A viral clip is worth more than the payout. Nearly nothing per stream.',
  },
];

export const PLATFORM_BY_ID: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
);

/**
 * Blended payout for a week's streams.
 *
 * Weights each platform's rate by how strongly it reaches the markets this
 * artist actually charts in, and by whether the genre fits. An Afrobeats
 * artist in Ghana earns mostly at African-platform rates; the same number of
 * streams from a US hip-hop artist is worth meaningfully more.
 */
export function blendedRatePerStream(opts: {
  homeCountry: string;
  genre: string;
  markets?: string[];
}): number {
  const { homeCountry, genre, markets } = opts;
  const relevant = new Set([homeCountry, ...(markets ?? [])]);

  let weightTotal = 0;
  let weightedRate = 0;

  for (const p of PLATFORMS) {
    let w = p.reach;

    // Over-index where the platform is genuinely strong.
    if (p.strongMarkets) {
      const hits = p.strongMarkets.filter((m) => relevant.has(m)).length;
      if (hits > 0) w *= 1 + 0.5 * Math.min(hits, 3);
    }
    if (p.strongGenres && p.strongGenres.includes(genre)) {
      w *= 1.35;
    }

    weightTotal += w;
    weightedRate += w * p.ratePerStream;
  }

  if (weightTotal <= 0) return 0.003;
  return weightedRate / weightTotal;
}

/**
 * Split a week's streams across platforms proportionally, so the UI can show a
 * believable per-platform breakdown. Returns the same total it was given.
 */
export function splitStreamsAcrossPlatforms(
  totalStreams: number,
  opts: { homeCountry: string; genre: string },
): Array<{ platform: Platform; streams: number; payout: number }> {
  const weights = PLATFORMS.map((p) => {
    let w = p.reach;
    if (p.strongMarkets?.includes(opts.homeCountry)) w *= 1.6;
    if (p.strongGenres?.includes(opts.genre)) w *= 1.35;
    return { platform: p, w };
  });

  const totalWeight = weights.reduce((s, x) => s + x.w, 0) || 1;

  return weights
    .map(({ platform, w }) => {
      const streams = Math.round((w / totalWeight) * totalStreams);
      return { platform, streams, payout: streams * platform.ratePerStream };
    })
    .sort((a, b) => b.streams - a.streams);
}

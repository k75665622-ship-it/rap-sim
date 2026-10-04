import type { ArtistStats, Genre } from '../types/game';

// Song quality formula — data-driven so it can be tuned without code changes

/**
 * @deprecated Superseded by `scoreStudioSession` in `sim/studio.ts`.
 *
 * The original single-formula quality model. It has been replaced by the full
 * studio session model, which separates production / vocals / lyrics /
 * chemistry and derives commercial and critical potential from them. This
 * function is kept only for reference and is no longer called anywhere —
 * do not use it for new work.
 */
export const QUALITY_WEIGHTS = {
  lyricism: 0.20,
  flow: 0.15,
  songwriting: 0.15,
  delivery: 0.10,
  creativity: 0.12,
  originality: 0.08,
  beatSelection: 0.10,
  discipline: 0.05,
  vocalAbility: 0.05,
};

/**
 * @deprecated Superseded by `scoreStudioSession` in `sim/studio.ts`. See the
 * note on `QUALITY_WEIGHTS` above. Not called anywhere.
 */
export function calculateSongQuality(
  stats: ArtistStats,
  effort: number, // 1-3: 1=lazy, 2=normal, 3=full effort
  genre: Genre,
  producerSkill: number = 50 // 0-100
): number {
  let base = 0;
  for (const [stat, weight] of Object.entries(QUALITY_WEIGHTS)) {
    base += (stats[stat as keyof ArtistStats] ?? 30) * weight;
  }

  // Effort multiplier
  const effortMult = effort === 1 ? 0.7 : effort === 2 ? 0.9 : 1.1;

  // Producer contribution (up to 20% of total)
  const producerContrib = producerSkill * 0.2;

  // Random variance ±10
  const variance = (Math.random() - 0.5) * 20;

  let quality = base * effortMult + producerContrib * 0.2 + variance;

  // Genre-specific tweaks (some stats matter more for specific genres)
  if (genre === 'conscious' || genre === 'hip_hop') {
    quality += stats.lyricism * 0.05;
  }
  if (genre === 'afrobeats' || genre === 'dancehall') {
    quality += stats.charisma * 0.05;
  }
  if (genre === 'drill' || genre === 'trap') {
    quality += stats.flow * 0.05;
  }

  return Math.max(1, Math.min(100, Math.round(quality)));
}

export function calculateWeeklyStreams(
  quality: number,
  localFame: number,
  nationalFame: number,
  internationalFame: number,
  marketingBudget: number,
  fanbase: number,
  momentum: number,
  weeksOut: number
): number {
  // Base streams from fanbase
  let streams = fanbase * 0.15;

  // Quality multiplier
  const qualMult = 0.5 + (quality / 100) * 1.5;
  streams *= qualMult;

  // Fame contribution
  streams += localFame * 200 + nationalFame * 2000 + internationalFame * 20000;

  // Marketing boost (diminishing returns)
  const mktBoost = Math.sqrt(marketingBudget) * 2;
  streams += mktBoost;

  // Momentum
  streams *= 0.8 + (momentum / 100) * 0.4;

  // Decay over time
  const decayFactor = Math.max(0.05, 1 - weeksOut * 0.04);
  streams *= decayFactor;

  // Viral potential (small chance of spike)
  if (Math.random() < 0.05 && quality > 70) {
    streams *= 1 + Math.random() * 3;
  }

  return Math.max(0, Math.round(streams));
}

/**
 * @deprecated Unused. Chart positions are derived by `updateCharts` in
 * `gameStore.ts` from real market-weighted streams. Not called anywhere.
 */
export function calculateChartPosition(
  quality: number,
  weeklyStreams: number,
  marketingBudget: number,
  currentPosition: number
): number {
  const score = weeklyStreams * 0.6 + quality * 50 + marketingBudget * 0.01;
  // Simplified: higher score = lower (better) chart position
  if (score > 500_000) return Math.max(1, currentPosition - 5);
  if (score > 200_000) return Math.max(1, currentPosition - 3);
  if (score > 50_000) return Math.max(1, currentPosition - 1);
  if (score > 10_000) return Math.min(40, currentPosition + 1);
  return Math.min(40, currentPosition + 2);
}

export function getUnitsForCertification(totalStreams: number, videoViews: number = 0): number {
  // 150 streams = 1 unit; 1 video view = 0.5 units
  return Math.floor(totalStreams / 150 + videoViews / 2);
}

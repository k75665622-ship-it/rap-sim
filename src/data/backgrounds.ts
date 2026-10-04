import type { ArtistStats, Background } from '../types/game';

export interface BackgroundData {
  id: Background;
  label: string;
  description: string;
  emoji: string;
  startingMoney: number;
  startingFame: { local: number; national: number; international: number };
  statBoosts: Partial<ArtistStats>;
  startingFanbase: number;
}

export const BACKGROUNDS: BackgroundData[] = [
  {
    id: 'broke_hustler',
    label: 'Broke Hustler',
    emoji: '🔥',
    description: 'Started from nothing. Pure hunger, raw talent, no industry connections. The streets are your studio.',
    startingMoney: 500,
    startingFame: { local: 5, national: 0, international: 0 },
    startingFanbase: 50,
    statBoosts: {
      lyricism: 8,
      flow: 6,
      freestyle: 10,
      discipline: 8,
      originality: 7,
      creativity: 6,
      delivery: 5,
      // low
      marketing: -5,
      businessKnowledge: -8,
      networking: -5,
    },
  },
  {
    id: 'middle_class',
    label: 'Middle Class',
    emoji: '🎵',
    description: 'Comfortable upbringing, decent equipment, took music classes. Balanced foundation.',
    startingMoney: 3_000,
    startingFame: { local: 10, national: 2, international: 0 },
    startingFanbase: 200,
    statBoosts: {
      vocalAbility: 5,
      songwriting: 5,
      marketing: 5,
      discipline: 6,
      consistency: 4,
      beatSelection: 4,
    },
  },
  {
    id: 'industry_connect',
    label: 'Industry Connect',
    emoji: '💼',
    description: 'Your uncle knows a producer. You have been in studios. Less raw talent, more connections.',
    startingMoney: 8_000,
    startingFame: { local: 18, national: 5, international: 0 },
    startingFanbase: 500,
    statBoosts: {
      networking: 10,
      businessKnowledge: 10,
      marketing: 8,
      productionKnowledge: 5,
      // low
      lyricism: -5,
      freestyle: -8,
      originality: -5,
    },
  },
];

export function getBaseStats(): ArtistStats {
  return {
    lyricism: 30,
    flow: 30,
    delivery: 30,
    vocalAbility: 30,
    songwriting: 30,
    freestyle: 25,
    stagePresence: 25,
    performance: 25,
    charisma: 30,
    marketing: 25,
    networking: 20,
    businessKnowledge: 20,
    discipline: 30,
    beatSelection: 25,
    productionKnowledge: 20,
    creativity: 30,
    originality: 30,
    consistency: 25,
  };
}

export function applyBackground(base: ArtistStats, background: Background): ArtistStats {
  const bg = BACKGROUNDS.find((b) => b.id === background);
  if (!bg) return base;
  const result = { ...base };
  for (const [key, val] of Object.entries(bg.statBoosts)) {
    const k = key as keyof ArtistStats;
    result[k] = Math.max(0, Math.min(100, (result[k] ?? 30) + (val ?? 0)));
  }
  return result;
}

export function getStartingCareer(background: Background) {
  const bg = BACKGROUNDS.find((b) => b.id === background);
  if (!bg) return { localFame: 5, nationalFame: 0, internationalFame: 0, fanbase: 100, money: 1000, reputation: 30, momentum: 20, totalStreams: 0, totalEarnings: 0 };
  return {
    localFame: bg.startingFame.local,
    nationalFame: bg.startingFame.national,
    internationalFame: bg.startingFame.international,
    fanbase: bg.startingFanbase,
    money: bg.startingMoney,
    reputation: 30,
    momentum: 20,
    totalStreams: 0,
    totalEarnings: 0,
  };
}

import type { InterviewStation } from '../types/game';

export const INTERVIEW_STATIONS: InterviewStation[] = [
  {
    id: 'buzz_fm',
    name: 'Buzz FM 91.9',
    personality: 'friendly',
    riskLevel: 10,
    audienceType: 'mainstream Ghana',
  },
  {
    id: 'the_plug_podcast',
    name: 'The Plug Podcast',
    personality: 'underground',
    riskLevel: 25,
    audienceType: 'hip-hop heads, lyricists',
  },
  {
    id: 'celebrity_tea',
    name: 'Celebrity Tea with Nana Ama',
    personality: 'provocative',
    riskLevel: 75,
    audienceType: 'gossip / general public',
  },
  {
    id: 'atta_show',
    name: "Atta Renner's One on One",
    personality: 'rival_aligned',
    riskLevel: 60,
    audienceType: 'pop fans, Atta fanbase',
    rivalNPCId: 'atta_renner',
  },
  {
    id: 'africa_sounds',
    name: 'Africa Sounds Magazine',
    personality: 'underground',
    riskLevel: 20,
    audienceType: 'pan-African music fans',
  },
  {
    id: 'global_vibes',
    name: 'Global Vibes Radio',
    personality: 'friendly',
    riskLevel: 30,
    audienceType: 'international diaspora audience',
  },
];

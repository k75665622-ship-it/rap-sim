// ─── HIRING SEARCH ─────────────────────────────────────────────────────────
// What a player types into the hire box, matched against a seat. Kept apart
// from the screen so it can be tested.

import { roleSpec } from './roles';
import type { NPCRole } from '../types/game';

/**
 * Words people actually type for each seat. The search box used to match names
 * only, so "financial manager" found nobody even though accountants were on the
 * list: the seat is called Accountant. Now the title, the key and these words count.
 */
export const ROLE_WORDS: Partial<Record<NPCRole, string[]>> = {
  accountant: ['financial manager', 'finance manager', 'finance', 'financial', 'cfo', 'business manager', 'bookkeeper', 'accounts', 'tax', 'money'],
  lawyer: ['attorney', 'legal', 'law', 'contracts'],
  producer: ['beat maker', 'beatmaker', 'beats'],
  songwriter: ['writer', 'lyrics', 'ghostwriter'],
  engineer: ['mixing', 'mastering', 'sound engineer'],
  vocal_coach: ['singing', 'voice', 'coach'],
  session_musician: ['musician', 'player', 'band'],
  publicist: ['pr', 'press', 'social media', 'marketing', 'promo'],
  stylist: ['fashion', 'clothes', 'wardrobe'],
  photographer: ['photos', 'camera', 'visuals'],
  personal_assistant: ['assistant', 'secretary', 'schedule', 'diary'],
  trainer: ['fitness', 'gym', 'wellness', 'health'],
  choreographer: ['dance', 'dancer'],
  tour_manager: ['tour', 'touring', 'road manager'],
  distributor: ['distribution', 'plug', 'release'],
  promoter: ['shows', 'booking', 'bookings', 'events'],
  dj: ['tour dj', 'deejay'],
};

export function roleMatches(role: NPCRole, q: string): boolean {
  const hay = [roleSpec(role).title, String(role).replace(/_/g, ' '), ...(ROLE_WORDS[role] ?? [])].join(' | ').toLowerCase();
  return hay.includes(q) || q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

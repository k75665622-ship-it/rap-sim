// A round portrait for any avatar seed ('player', an NPC id). Falls back to
// initials for people the game doesn't draw.

import { Character } from './Character';
import { usePortrait } from './usePortrait';
import { gradientFor } from '../ui/kit';
import { initials } from '@/utils/format';

export function Portrait({ seed, name = '', size = 40, ring }: { seed: string; name?: string; size?: number; ring?: string }) {
  const look = usePortrait(seed);
  const [a, b] = gradientFor(seed);
  return (
    <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-black/75" style={{ width: size, height: size, background: look ? `radial-gradient(circle at 50% 30%, #ffb80066, #14161e 80%)` : `linear-gradient(135deg, ${a}, ${b})`, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined, fontSize: Math.max(9, size * 0.32) }}>
      {look ? <Character look={look} view="bust" className="w-full h-full" /> : initials(name)}
    </div>
  );
}

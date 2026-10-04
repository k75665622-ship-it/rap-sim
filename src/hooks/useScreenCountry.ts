// ─── SCREEN COUNTRY HOOK ───────────────────────────────────────────────────
// Every platform remembers its own country, and the home country is the default
// the first time a screen is opened. Kept in one place so no screen invents its
// own fallback or forgets to record a visit.

import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

export function useScreenCountry(screenKey: string): [string, (c: string) => void] {
  const country = useGameStore((s) => s.screenCountry?.[screenKey]);
  const home = useGameStore((s) => s.player?.country);
  const setScreenCountry = useGameStore((s) => s.setScreenCountry);

  const value = country ?? home ?? 'United States';
  const set = useCallback(
    (c: string) => setScreenCountry(screenKey, c),
    [screenKey, setScreenCountry],
  );

  return [value, set];
}

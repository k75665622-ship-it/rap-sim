// ─── CITY (FREE ROAM) ──────────────────────────────────────────────────────
//
// Walk and drive round town. Doors open the game's existing screens — the
// studio door opens the Studio, The Stage opens Shows, and so on — and the
// back button brings you out on the pavement where you went in.

import { useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CityCanvas } from '../../world/CityCanvas';
import { Hud } from '../../world/Hud';
import { attachInput, hudStore } from '../../world/input';
import type { Place } from '../../world/layout';
import { live } from '../../world/sim';

// Dev hook, like the store's: lets the console or a test script see where the
// player and the car are.
(window as unknown as { __rapCity?: unknown }).__rapCity = { live, hud: hudStore.get };

export function CityScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const look = useGameStore((s) => s.player?.look);

  useEffect(() => attachInput(), []);

  const onEnter = useCallback((place: Place) => {
    if (place.screen) setScreen(place.screen);
    else hudStore.toast(place.soon ?? `${place.name} is closed.`);
  }, [setScreen]);

  return (
    <div className="fixed inset-0 bg-[#9cc3e6] overflow-hidden select-none" style={{ touchAction: 'none' }}>
      <CityCanvas look={look} onEnter={onEnter} />
      <Hud onExit={() => setScreen('dashboard')} />
    </div>
  );
}

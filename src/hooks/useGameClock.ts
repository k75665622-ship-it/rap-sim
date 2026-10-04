// ─── THE RUNNING CLOCK ─────────────────────────────────────────────────────
// One interval for the whole app. It lives at the shell level rather than in a
// screen, because the world is supposed to move whichever page the player is
// looking at — a clock that stops when you open the Charts is not a clock.

import { useEffect } from 'react';
import {
  useGameStore,
  GAME_MINUTES_PER_TICK,
  CLOCK_TICK_MS,
} from '../store/gameStore';

export function useGameClock() {
  useEffect(() => {
    const id = window.setInterval(() => {
      const state = useGameStore.getState();
      if (!state.player || state.clockPaused) return;
      // A hidden tab is not time the player spent watching the world. Skipping
      // the tick keeps a backgrounded game from owing hours of catch-up, and
      // the catch-up cap in `advanceClock` covers the rest.
      if (typeof document !== 'undefined' && document.hidden) return;
      state.advanceClock(GAME_MINUTES_PER_TICK * (state.clockSpeed ?? 1));
    }, CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);
}

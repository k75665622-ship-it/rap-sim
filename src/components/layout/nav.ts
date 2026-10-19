// ─── BACK ──────────────────────────────────────────────────────────────────
// Every page change is remembered, so "back" goes where you came from — the
// back arrow in the bar and the phone's own back button both use it. Kept out
// of the save: it's about this visit, not the career.

import { useSyncExternalStore } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { GameScreen } from '../../types/game';

const stack: GameScreen[] = [];
const listeners = new Set<() => void>();
let goingBack = false;
let started = false;
let version = 0;

const HOME: GameScreen[] = ['dashboard', 'splash', 'welcome', 'create_artist'];

function notify() { version++; listeners.forEach((l) => l()); }

function popTo(): void {
  const st = useGameStore.getState();
  let to = stack.pop();
  while (to && to === st.screen) to = stack.pop();
  goingBack = true;
  st.setScreen(to ?? (st.player ? 'dashboard' : 'splash'));
  goingBack = false;
  notify();
}

export function startNav(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  let prev = useGameStore.getState().screen;
  useGameStore.subscribe((s) => {
    if (s.screen === prev) return;
    if (!goingBack && !HOME.includes(s.screen)) {
      stack.push(prev);
      if (stack.length > 60) stack.shift();
      try { window.history.pushState({ rl: true }, ''); } catch { /* no history API */ }
    }
    if (HOME.includes(s.screen)) stack.length = 0;
    prev = s.screen;
    notify();
  });
  // The phone's back button / swipe.
  window.addEventListener('popstate', () => {
    if (!stack.length && HOME.includes(useGameStore.getState().screen)) return;
    popTo();
  });
}

/** The on-screen back arrow. */
export function goBack(): void {
  if (stack.length) {
    // Let the browser's history move too, so the phone's back stays in step.
    try { window.history.back(); return; } catch { /* fall through */ }
  }
  popTo();
}

export function useCanGoBack(): boolean {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version);
  const screen = useGameStore((s) => s.screen);
  return !HOME.includes(screen);
}

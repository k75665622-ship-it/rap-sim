// ─── THE CITY: PHONE STATE ─────────────────────────────────────────────────
//
// Whether your phone is out. While it is, the city keeps running behind it
// and the game's own screens (chats, mail, socials, streaming…) open inside
// the phone instead of replacing the city.
//
// The page shown in the phone is still the store's `screen`, so every link
// inside those screens works as it always has. The phone's home screen is
// simply "phone out, screen = city".

import { useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { backTo } from '../components/layout/nav';
import type { GameScreen } from '../types/game';

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const phone = {
  isOpen: () => open,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  /** Take the phone out, on its home screen. */
  open() {
    if (open) return;
    open = true;
    emit();
  },
  /** Open an app. */
  launch(screen: GameScreen) {
    if (!open) { open = true; emit(); }
    useGameStore.getState().setScreen(screen);
  },
  /** Back to the home screen, closing whatever app was open. */
  home() {
    if (useGameStore.getState().screen !== 'city') backTo('city');
  },
  /** Put it away and carry on walking. */
  close() {
    if (useGameStore.getState().screen !== 'city') backTo('city');
    if (!open) return;
    open = false;
    emit();
    // Hand the keyboard back to the city (focus may be inside the phone).
    try { window.focus(); } catch { /* ignore */ }
  },
  /** Leaving the city altogether. */
  reset() {
    if (!open) return;
    open = false;
    emit();
  },
};

export function usePhoneOpen(): boolean {
  return useSyncExternalStore(phone.subscribe, phone.isOpen);
}

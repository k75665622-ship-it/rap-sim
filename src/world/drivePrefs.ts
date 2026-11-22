// How the car feels on your phone: view, steering style, which side the wheel
// sits, size, and where you've dragged each control. Remembered per device.
import { useSyncExternalStore } from 'react';

export interface DrivePrefs {
  view: 'cockpit' | 'chase';
  steer: 'wheel' | 'arrows';
  /** Which side the steering sits on; the pedals take the other. */
  side: 'right' | 'left';
  scale: number;
  /** Dragged offsets in px from the default spot. */
  steerOff: { x: number; y: number };
  pedalOff: { x: number; y: number };
  reverse: boolean;
}

const KEY = 'rl-drive-prefs';
export const DEFAULT_PREFS: DrivePrefs = { view: 'cockpit', steer: 'wheel', side: 'right', scale: 1, steerOff: { x: 0, y: 0 }, pedalOff: { x: 0, y: 0 }, reverse: false };

let prefs: DrivePrefs = (() => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULT_PREFS }; }
})();
const subs = new Set<() => void>();

export const drivePrefs = {
  get: () => prefs,
  set(p: Partial<DrivePrefs>) {
    prefs = { ...prefs, ...p };
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
    subs.forEach((f) => f());
  },
  reset() { drivePrefs.set({ ...DEFAULT_PREFS }); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};
export const useDrivePrefs = () => useSyncExternalStore(drivePrefs.subscribe, drivePrefs.get);

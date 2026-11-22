// ─── THE CITY: INPUT ───────────────────────────────────────────────────────
//
// One place that knows what the player is pressing, whether that is a
// keyboard, a mouse drag or thumbs on a phone. The frame loop reads it; the
// HUD's on-screen controls write to it.

const keys = new Set<string>();

export const input = {
  /** Virtual stick from the phone joystick, -1..1 (y up = forward). */
  stick: { x: 0, y: 0 },
  /** Held buttons from the phone controls. */
  touchSprint: false,
  touchBrake: false,
  /** Car pedals and wheel on a phone. */
  touchGas: false,
  touchReverse: false,
  touchSteer: 0,
  /** Camera drag since the last frame, in pixels. */
  lookDX: 0,
  lookDY: 0,
  /** One-shot presses, cleared when read. */
  actionQueued: false,
  jumpQueued: false,
  lastLookAt: 0,
};

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

function down(e: KeyboardEvent) {
  // Leave typing in text boxes alone (a modal can open over the city).
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (!e.repeat) {
    if (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Enter') input.actionQueued = true;
    if (e.code === 'Space') input.jumpQueued = true;
  }
  keys.add(e.code);
}
function up(e: KeyboardEvent) { keys.delete(e.code); }
function blur() { keys.clear(); input.stick.x = 0; input.stick.y = 0; input.touchSprint = false; input.touchBrake = false; input.touchGas = false; input.touchReverse = false; input.touchSteer = 0; }

export function attachInput(): () => void {
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    blur();
  };
}

const held = (...codes: string[]) => codes.some((c) => keys.has(c));

/** Where the player wants to go, -1..1 on each axis (y = forward). */
export function moveAxis(): { x: number; y: number } {
  let x = input.stick.x;
  let y = input.stick.y;
  // Finer control near the middle of the wheel, full lock at the ends.
  x += Math.sign(input.touchSteer) * Math.pow(Math.abs(input.touchSteer), 1.35);
  if (input.touchGas) y += 1;
  if (input.touchReverse) y -= 1;
  if (held('KeyW', 'ArrowUp')) y += 1;
  if (held('KeyS', 'ArrowDown')) y -= 1;
  if (held('KeyD', 'ArrowRight')) x += 1;
  if (held('KeyA', 'ArrowLeft')) x -= 1;
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { x, y };
}

export const sprinting = () => input.touchSprint || held('ShiftLeft', 'ShiftRight');
/** Keyboard handbrake (drift). The on-screen brake pedal is `footBrake`. */
export const handbrake = () => held('Space');
export const footBrake = () => input.touchBrake;

export function takeAction(): boolean { const a = input.actionQueued; input.actionQueued = false; return a; }
export function takeJump(): boolean { const j = input.jumpQueued; input.jumpQueued = false; return j; }
export function takeLook(): { dx: number; dy: number } {
  const d = { dx: input.lookDX, dy: input.lookDY };
  input.lookDX = 0;
  input.lookDY = 0;
  return d;
}

// ─── HUD state ─────────────────────────────────────────────────────────────
// What the overlay shows. Written by the frame loop only when it changes, so
// React re-renders a few times a second at most, not sixty.

export interface HudState {
  mode: 'foot' | 'car';
  prompt: string | null;
  speedKmh: number;
  toast: string | null;
  /** The resident you're talking to (their id), while the card is open. */
  talk: string | null;
  /** At The Stage's door in the evening: the open mic is on. */
  nearStage: boolean;
  gig: boolean;
  shooting: boolean;
  /** The full-screen map is open (other floating chips tuck away). */
  mapOpen: boolean;
}

let hud: HudState = { mode: 'foot', prompt: null, speedKmh: 0, toast: null, talk: null, nearStage: false, gig: false, shooting: false, mapOpen: false };
const hudListeners = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const hudStore = {
  get: () => hud,
  subscribe(l: () => void) { hudListeners.add(l); return () => { hudListeners.delete(l); }; },
  set(patch: Partial<HudState>) {
    let changed = false;
    for (const k of Object.keys(patch) as Array<keyof HudState>) {
      if (hud[k] !== patch[k]) { changed = true; break; }
    }
    if (!changed) return;
    hud = { ...hud, ...patch };
    hudListeners.forEach((l) => l());
  },
  toast(msg: string, ms = 4200) {
    hudStore.set({ toast: msg });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hudStore.set({ toast: null }), ms);
  },
};

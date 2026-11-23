// GPS: where the story wants you, and a road route to get there.
import { useGameStore } from '../store/gameStore';
import { NODES } from '../story/engine';
import { CAST } from '../story/cast';
import { cityLayout, ROAD_CENTRES, WORLD } from './layout';

export interface Target { x: number; z: number; label: string; placeId: string }
export type Pt = { x: number; z: number };

export const PLACE_FOR: Record<string, string> = { kitchen: 'food', studio: 'studio', shows: 'stage', bank: 'bank' };
const TASK_PLACE: Record<string, string> = { song: 'studio', mix: 'studio', beat: 'studio', gig: 'stage', release: 'studio' };

/** A place the player chose on the map. Beats the story's target until they get there. */
let manual: string | null = null;
export const gpsManualPlace = (): string | null => manual;
export function setGpsPlace(id: string | null): void {
  manual = id;
  if (id) gpsState.on = true;
}

function doorTarget(pid: string): Target | null {
  const b = cityLayout().buildings.find((x) => x.place?.id === pid && x.door);
  if (!b || !b.door) return null;
  return { x: b.door.x + b.door.nx * 3.2, z: b.door.z + b.door.nz * 3.2, label: b.place!.name, placeId: pid };
}

/** The place the player picked, else the one the story is waiting at, if any. */
export function gpsTarget(): Target | null {
  if (manual) { const t = doorTarget(manual); if (t) return t; manual = null; }
  const st = useGameStore.getState().story;
  if (!st) return null;
  let pid: string | undefined;
  for (const d of st.inbox) {
    if (d.status !== 'new' && d.status !== 'open') continue;
    const n = NODES[d.node];
    if (n?.channel === 'encounter' && n.where && PLACE_FOR[n.where]) { pid = PLACE_FOR[n.where]; break; }
  }
  if (!pid) for (const t of st.tasks) { const p = TASK_PLACE[t.task.kind]; if (p) { pid = p; break; } }
  if (!pid) return null;
  return doorTarget(pid);
}

const near = (v: number) => ROAD_CENTRES.reduce((a, c) => (Math.abs(c - v) < Math.abs(a - v) ? c : a), ROAD_CENTRES[0]);

/** Put a point on the nearest road line; returns it and the intersections its road touches. */
function snap(p: Pt): { pt: Pt; vertical: boolean } {
  const rx = near(p.x), rz = near(p.z);
  return Math.abs(p.x - rx) <= Math.abs(p.z - rz) ? { pt: { x: rx, z: Math.max(WORLD.z0 + 10, Math.min(WORLD.z1 - 10, p.z)) }, vertical: true } : { pt: { x: Math.max(WORLD.x0 + 10, Math.min(WORLD.x1 - 10, p.x)), z: rz }, vertical: false };
}

/** A path along the roads: your spot → the road → the grid → the road at the door → the door. */
export function route(from: Pt, to: Pt): Pt[] {
  const a = snap(from), b = snap(to);
  const pts: Pt[] = [from, a.pt];
  const nodeOf = (s: { pt: Pt; vertical: boolean }) => (s.vertical ? { x: s.pt.x, z: near(s.pt.z) } : { x: near(s.pt.x), z: s.pt.z });
  const na = nodeOf(a), nb = nodeOf(b);
  pts.push(na);
  // Walk the grid: along x first, then along z.
  if (na.x !== nb.x && na.z !== nb.z) pts.push({ x: nb.x, z: na.z });
  else if (na.x !== nb.x) pts.push({ x: nb.x, z: na.z });
  pts.push(nb, b.pt, to);
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) > 0.5);
}

export const length = (r: Pt[]) => r.reduce((s, p, i) => (i ? s + Math.hypot(p.x - r[i - 1].x, p.z - r[i - 1].z) : 0), 0);

/** Shared with the minimap and the HUD; refreshed by the frame loop. */
export const gpsState: { target: Target | null; route: Pt[]; dist: number; on: boolean } = { target: null, route: [], dist: 0, on: true };

export function refreshGps(from: Pt): void {
  if (!gpsState.on) { gpsState.target = null; gpsState.route = []; return; }
  let t = gpsTarget();
  // Arrived at the place they picked: the line goes away, and the story's target (if any) returns.
  if (manual && t && Math.hypot(from.x - t.x, from.z - t.z) < 6) { manual = null; t = gpsTarget(); }
  gpsState.target = t;
  if (!t) { gpsState.route = []; gpsState.dist = 0; return; }
  gpsState.route = route(from, t);
  gpsState.dist = length(gpsState.route);
}

export interface Waiting { from: string; name: string; emoji: string; place: string; daysLeft: number | null }
/** Who the story has waiting for you out in the world, and how long they'll wait. */
export function waitingFor(day: number): Waiting[] {
  const st = useGameStore.getState().story;
  const out: Waiting[] = [];
  for (const d of st?.inbox ?? []) {
    if (d.status !== 'new' && d.status !== 'open') continue;
    const n = NODES[d.node];
    if (n?.channel !== 'encounter' || !n.where || !PLACE_FOR[n.where]) continue;
    const c = CAST[n.from];
    const b = cityLayout().buildings.find((x) => x.place?.id === PLACE_FOR[n.where!]);
    out.push({ from: n.from, name: c?.name.split(' ')[0] ?? n.from, emoji: c?.emoji ?? '👤', place: b?.place?.name ?? n.where, daysLeft: d.due !== undefined ? d.due - day : null });
  }
  return out;
}

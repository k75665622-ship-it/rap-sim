// ─── MISSION VERBS ─────────────────────────────────────────────────────────
//
// A verb is one kind of gameplay a mission beat can use (NEXT_LEVEL_README
// §4.3). Each verb is written once and reused by every mission that needs it:
// it starts from where the player is, steps every frame, and ends with
// `{ ok, score 0–100 }`. The engine turns the score into a medal.
//
// Adding a verb: add its shape to `Verb` in story/types.ts, its default medal
// scores to VERB_MEDALS in story/engine.ts, and a `case` in `startVerb` here.

import type { RunPlace, Verb } from '../story/types';
import { PLACE_FOR, doorTarget, length, route, type Pt, type Target } from '../world/gps';

/** Where the player is, as the city frame loop sees it. */
export interface Me {
  x: number;
  z: number;
  mode: 'foot' | 'car';
  /** Inside a building: you have to walk out first. */
  inside: boolean;
  exitAt: Pt;
  car: Pt;
}

export interface BeatResult { ok: boolean; score: number; /** Short summary for the log and the card, e.g. "0:41 left". */ note: string; why?: string }

export interface Running {
  /** Seconds allowed, or 0 for untimed verbs. */
  limit: number;
  /** Seconds played so far. */
  t: number;
  done: BeatResult | null;
  /** What the HUD shows right now. */
  step: string;
  stepNo: number;
  steps: number;
  target: Target | null;
  advance(dt: number, me: Me): void;
}

export interface Preview { limit: number; gold: number; silver: number; stops: string[] }

/** On foot this fast (m/s): what we allow for walking out to your car. */
const WALK_TO_CAR = 6;
/** Close enough to a stop to count it. A car in the near lane is ~4 m from the kerb target. */
const REACH = 9;
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
export const clock = fmt;

function stopsOf(places: RunPlace[]): Target[] {
  const out: Target[] = [];
  for (const p of places) { const t = doorTarget(PLACE_FOR[p] ?? p); if (t) out.push(t); }
  return out;
}

/** The time limit for a run, from the real road distance from where you stand. */
function runLimit(stops: Target[], me: Me, pace: number): number {
  const from = me.inside ? me.exitAt : { x: me.x, z: me.z };
  // Without the car you'll have to get to it first (or run the whole way).
  const walk = me.mode === 'foot' ? Math.hypot(me.car.x - from.x, me.car.z - from.z) / WALK_TO_CAR : 0;
  let dist = 0, at: Pt = me.mode === 'foot' ? me.car : from;
  for (const s of stops) { dist += length(route(at, s)); at = s; }
  return Math.ceil(dist / pace + walk + 12);
}

export function previewVerb(task: Verb, me: Me, medals: { gold: number; silver: number }): Preview | null {
  switch (task.verb) {
    case 'run': {
      const stops = stopsOf([...(task.via ?? []), task.to]);
      if (!stops.length) return null;
      const limit = runLimit(stops, me, task.pace ?? 10);
      return { limit, gold: limit * (1 - medals.gold / 100), silver: limit * (1 - medals.silver / 100), stops: stops.map((s) => s.label) };
    }
  }
}

export function startVerb(task: Verb, me: Me): Running | null {
  switch (task.verb) {
    case 'run': {
      const stops = stopsOf([...(task.via ?? []), task.to]);
      if (!stops.length) return null;
      const limit = runLimit(stops, me, task.pace ?? 10);
      const text = (i: number) => task.steps?.[i] ?? (i === stops.length - 1 ? `Get to ${stops[i].label}` : `Stop at ${stops[i].label}`);
      const r: Running = {
        limit, t: 0, done: null, stepNo: 0, steps: stops.length, step: text(0), target: stops[0],
        advance(dt, m) {
          if (r.done) return;
          r.t += dt;
          const s = stops[r.stepNo];
          if (!m.inside && Math.hypot(m.x - s.x, m.z - s.z) < REACH) {
            r.stepNo += 1;
            if (r.stepNo >= stops.length) {
              const left = Math.max(0, limit - r.t);
              r.done = { ok: true, score: Math.round((left / limit) * 100), note: `${fmt(left)} left` };
              r.target = null;
              return;
            }
            r.step = text(r.stepNo);
            r.target = stops[r.stepNo];
          }
          if (r.t >= limit) r.done = { ok: false, score: 0, note: `${r.stepNo}/${stops.length} stops`, why: "Time's up." };
        },
      };
      return r;
    }
  }
}

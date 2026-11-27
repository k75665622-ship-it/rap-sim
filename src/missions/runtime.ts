// ─── MISSION RUNTIME ───────────────────────────────────────────────────────
//
// Runs the mission beat you're playing right now, out in the city.
//
//   brief  → the mission card (who, where, what, the medal times)
//   count  → 3, 2, 1… (the world clock is held from here)
//   play   → the verb runs every frame; the HUD shows the step and the timer
//   fail   → time ran out: retry (each try costs game time) or give up
//   result → the medal and what changed; Continue goes on into the story
//
// The retry rule (NEXT_LEVEL_README §4.7): a skill beat can be retried at once,
// because it's a game, not a punishment. But every try costs game time, tries
// are limited, and giving up — or never turning up — takes the story's "miss"
// branch. People remember.
//
// The beat's outcome is written to the save the moment it ends (not when the
// card is closed), so a reload never loses a medal.

import { useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { NODES, DEFAULT_MINUTES, VERB_MEDALS, medalOf, outcomeFor, triesLeft } from '../story/engine';
import type { Effect, Medal } from '../story/types';
import { live, indoor } from '../world/sim';
import { hudStore } from '../world/input';
import { storyBus } from '../story/bus';
import { track } from '../analytics';
import { missionGps } from './target';
import { previewVerb, startVerb, type Me, type Preview, type Running } from './verbs';

export type Phase = 'brief' | 'count' | 'play' | 'fail' | 'result';

export interface LiveMission {
  node: string;
  phase: Phase;
  preview: Preview | null;
  run: Running | null;
  /** Seconds left in the 3-2-1. */
  count: number;
  fail?: { why: string; note: string; triesLeft: number };
  result?: { medal: Medal; score: number; note: string; say?: string; fx: Effect[]; next?: string };
  /** The clock was already paused before the mission held it. */
  wasPaused: boolean;
}

let cur: LiveMission | null = null;
let briefT = 99;
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version += 1; listeners.forEach((l) => l()); };

/** Where you are right now, read straight from the city's live state. */
function me(): Me {
  const pos = live.mode === 'car' ? live.car : live.p;
  return { x: pos.x, z: pos.z, mode: live.mode, inside: indoor.on, exitAt: { x: indoor.exitAt.x, z: indoor.exitAt.z }, car: { x: live.car.x, z: live.car.z } };
}

const medalsOf = (node: string) => { const s = NODES[node]?.play; return s ? s.medals ?? VERB_MEDALS[s.task.verb] : { gold: 100, silver: 100 }; };

// ─── a little sound ────────────────────────────────────────────────────────
let ac: AudioContext | null = null;
function beep(freq: number, ms = 120, vol = 0.12) {
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + ms / 1000 + 0.02);
  } catch { /* no audio: the mission still works */ }
}
const chord = (fs: number[]) => fs.forEach((f, i) => setTimeout(() => beep(f, 260, 0.1), i * 90));

// ─── the clock ─────────────────────────────────────────────────────────────
function holdClock() {
  const st = useGameStore.getState();
  if (!st.clockPaused) st.setClockPaused(true);
}
function releaseClock(m: LiveMission) {
  const st = useGameStore.getState();
  if (!m.wasPaused && st.clockPaused) st.setClockPaused(false);
}

function setTarget(t: Running['target'] | null) {
  missionGps.target = t ? { x: t.x, z: t.z, label: t.label, placeId: t.placeId } : null;
}

// ─── the public controls ───────────────────────────────────────────────────
export const missions = {
  get: () => cur,
  /** Something is on screen that the player has to answer (or the 3-2-1): stand still. */
  blocking: () => !!cur && cur.phase !== 'play',

  /** Show the mission card for a waiting beat. Moves you to the city, where missions are played. */
  begin(node: string) {
    const n = NODES[node];
    if (!n?.play) return;
    if (cur && cur.node !== node && (cur.phase === 'count' || cur.phase === 'play')) return;
    const st = useGameStore.getState();
    if (st.story?.done[node] !== undefined) return;
    st.storyOpen(node);
    briefT = 99;
    cur = { node, phase: 'brief', preview: previewVerb(n.play.task, me(), medalsOf(node)), run: null, count: 0, wasPaused: !!st.clockPaused };
    if (st.screen !== 'city') st.setScreen('city');
    track('mission', `${node}:brief`);
    emit();
  },

  /** "Not now": the card closes, the beat keeps waiting (until it lapses). */
  dismiss() {
    if (!cur || cur.phase !== 'brief') return;
    cur = null; missionGps.live = false; setTarget(null); emit();
  },

  /** Start (or retry) the beat from wherever you are. */
  start() {
    if (!cur || (cur.phase !== 'brief' && cur.phase !== 'fail')) return;
    const n = NODES[cur.node];
    const run = n?.play ? startVerb(n.play.task, me()) : null;
    if (!run) {
      hudStore.toast("This mission can't be played in this city. It will wait for you at home.", 4200);
      if (cur.phase === 'fail') releaseClock(cur);
      cur = null; missionGps.live = false; setTarget(null); emit(); return;
    }
    // Remember the clock as the player left it before the first try; retries keep it held.
    if (cur.phase === 'brief') cur.wasPaused = !!useGameStore.getState().clockPaused;
    holdClock();
    cur.run = run; cur.phase = 'count'; cur.count = 3; cur.fail = undefined;
    missionGps.live = true; setTarget(run.target);
    beep(440);
    track('mission', `${cur.node}:start`);
    emit();
  },

  /** E / Enter while a card is up: its main button. */
  primary() {
    if (!cur) return;
    if (cur.phase === 'brief' || cur.phase === 'fail') missions.start();
    else if (cur.phase === 'result') missions.continue();
  },

  giveUp() {
    if (!cur || cur.phase !== 'fail') return;
    finish('miss', 0, 'gave up');
  },

  /** Close the result card and carry on into the story. */
  continue() {
    if (!cur || cur.phase !== 'result') return;
    const m = cur;
    cur = null; missionGps.live = false; setTarget(null);
    releaseClock(m);
    emit();
    const next = m.result?.next;
    const n = next ? NODES[next] : undefined;
    if (!next || !n) return;
    if (n.channel === 'play') missions.begin(next);
    else if (n.channel === 'encounter') hudStore.toast(`📍 ${n.title} — the GPS knows where.`, 3200);
    else if (n.channel !== 'call') storyBus.request(next); // a call just rings
  },

  /** Called by the city every frame. Cheap when no mission is live. */
  frame(dt: number) {
    if (!cur) return;
    // The beat lapsed or was settled elsewhere while its card was up.
    if (cur.phase === 'brief' && useGameStore.getState().story?.done[cur.node] !== undefined) { cur = null; emit(); return; }
    // The card's medal times follow you as you move (the clock is set from where you start).
    if (cur.phase === 'brief') {
      briefT += dt;
      if (briefT > 1) { briefT = 0; const p = NODES[cur.node].play!; cur.preview = previewVerb(p.task, me(), medalsOf(cur.node)); emit(); }
      return;
    }
    if (cur.phase === 'count') {
      const before = Math.ceil(cur.count);
      cur.count -= dt;
      const after = Math.ceil(cur.count);
      if (after !== before) { if (after > 0) beep(440); else beep(880, 220); emit(); }
      if (cur.count <= 0) { cur.phase = 'play'; emit(); }
      return;
    }
    if (cur.phase !== 'play' || !cur.run) return;
    const r = cur.run;
    const stepBefore = r.stepNo, secBefore = Math.floor(r.t * 4);
    r.advance(dt, me());
    setTarget(r.target);
    if (r.stepNo !== stepBefore && !r.done) beep(660, 140);
    if (r.done) { ended(r); return; }
    // The last ten seconds tick.
    const left = r.limit - r.t;
    if (r.limit && left < 10 && Math.floor(left) !== Math.floor(left + dt)) beep(330, 60, 0.08);
    if (Math.floor(r.t * 4) !== secBefore || r.stepNo !== stepBefore) emit();
  },
};

/** One attempt is over: pay its game time, then medal, retry or miss. */
function ended(r: Running) {
  if (!cur || !r.done) return;
  const node = cur.node;
  const spec = NODES[node].play!;
  const res = r.done;
  useGameStore.getState().missionAttempt(node, res.score, spec.minutes ?? DEFAULT_MINUTES);
  if (res.ok) { finish(medalOf(spec, res.score), res.score, res.note); return; }
  const left = triesLeft(useGameStore.getState().story!, node);
  track('mission', `${node}:fail`);
  if (left > 0) {
    cur.phase = 'fail'; cur.fail = { why: res.why ?? "That didn't work.", note: res.note, triesLeft: left };
    missionGps.live = false; setTarget(null);
    beep(200, 380);
    emit();
  } else finish('miss', res.score, res.note);
}

function finish(medal: Medal, score: number, note: string) {
  if (!cur) return;
  const node = cur.node;
  const spec = NODES[node].play!;
  const o = outcomeFor(spec, medal);
  const next = useGameStore.getState().missionFinish(node, medal, score, note);
  cur.phase = 'result';
  cur.result = { medal, score, note, say: o.say, fx: o.fx ?? [], next };
  missionGps.live = false; setTarget(null);
  if (medal === 'miss') beep(180, 500); else chord(medal === 'gold' ? [523, 659, 784, 1047] : medal === 'silver' ? [523, 659, 784] : [523, 659]);
  track('mission', `${node}:${medal}`);
  emit();
}

export function useMission(): LiveMission | null {
  useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => version);
  return cur;
}

// Dev / test hook, like window.__rapAnalytics: __rapMission.deliver('mx_jollof_call')
if (typeof window !== 'undefined') {
  (window as unknown as { __rapMission?: unknown }).__rapMission = {
    state: () => (cur ? { node: cur.node, phase: cur.phase, step: cur.run?.step, t: cur.run?.t, limit: cur.run?.limit, result: cur.result, fail: cur.fail } : null),
    deliver: (node: string) => useGameStore.getState().storyDeliverNow(node),
    begin: missions.begin,
    /** Tests: run the beat's clock forward. */
    skip: (s: number) => { if (cur?.run && cur.phase === 'play') cur.run.t += s; },
  };
}

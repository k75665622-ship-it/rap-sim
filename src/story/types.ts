// ─── STORY ENGINE: TYPES ───────────────────────────────────────────────────
// A story is a graph of nodes. A node is something that *happens to you* —
// a call, a text, a person waiting somewhere, a letter — with lines of
// dialogue and choices. Choices change bonds, reputation and flags, and can
// schedule more story days or weeks later. See STORY_BIBLE.md.

export type Path = 'rapper' | 'producer' | 'manager' | 'singer' | 'director' | 'dj';
/** `play` is a mission beat: something you *do* in the city (see `PlaySpec`). */
export type Channel = 'call' | 'text' | 'encounter' | 'letter' | 'scene' | 'play';
export type Axis = 'integrity' | 'hustle' | 'heart';
/** Where an encounter lives: a screen id the player enters (kitchen, studio, shows, bank…). */
export type Place = 'kitchen' | 'studio' | 'shows' | 'bank' | 'city' | 'stadium' | 'arena' | 'lots' | 'mall' | 'airport' | 'apts' | 'gym' | 'drip' | 'radio' | 'label' | 'crib';
export type Tone = 'kind' | 'sharp' | 'honest' | 'sly' | 'quiet';

export type Cond =
  | { k: 'flag'; id: string; v?: boolean }
  | { k: 'bond'; who: string; min?: number; max?: number }
  | { k: 'rep'; axis: Axis; min?: number; max?: number }
  | { k: 'path'; is: Path | Path[] }
  | { k: 'day'; min?: number; max?: number }
  | { k: 'hour'; from: number; to: number }
  | { k: 'done'; node: string; choice?: string }
  | { k: 'ended'; arc: string; outcome?: string }
  | { k: 'money'; min: number }
  /** A number from the world: fame, fans, songs recorded, songs released, money. */
  | { k: 'stat'; id: 'fame' | 'fans' | 'songs' | 'released' | 'money'; min?: number; max?: number }
  | { k: 'not'; c: Cond }
  | { k: 'any'; of: Cond[] }
  | { k: 'all'; of: Cond[] };

export type TaskKind = 'song' | 'release' | 'gig' | 'shoot' | 'mix' | 'beat' | 'cut';
export interface Task {
  id: string;
  kind: TaskKind;
  /** The objective, in the story's voice. */
  text: string;
  withinDays: number;
  /** Quality tiers for 'song'/'mix': the highest one reached picks the next node. */
  tiers?: { min: number; node: string }[];
  done: string;
  miss: string;
}

export type Effect =
  | { k: 'bond'; who: string; v: number }
  | { k: 'rep'; axis: Axis; v: number }
  | { k: 'flag'; id: string; v?: boolean | number | string }
  | { k: 'money'; v: number }
  | { k: 'fame'; v: number }
  | { k: 'fans'; v: number }
  | { k: 'energy'; v: number }
  | { k: 'memory'; text: string; kind?: 'career' | 'music' | 'money' | 'people' | 'love' | 'beef' | 'life'; weight?: number; tone?: 'good' | 'bad' | 'neutral'; who?: string[] }
  | { k: 'schedule'; node: string; days: number }
  | { k: 'task'; task: Task }
  | { k: 'end'; arc: string; outcome: string };

export interface Line { who: string; text: string; if?: Cond }
export interface Choice { id: string; label: string; tone?: Tone; if?: Cond; fx?: Effect[]; goto?: string }

export interface StoryNode {
  id: string;
  arc: string;
  channel: Channel;
  /** The person this comes from (a CAST id). */
  from: string;
  where?: Place;
  /** Hours (0-23) it may arrive; a call at 2 a.m. should arrive at 2 a.m. */
  hours?: [number, number];
  /** Days it waits before it lapses. Calls lapse fast: you either pick up or you don't. */
  expires?: number;
  /** What happens when it lapses unanswered — the ignore is a choice. */
  lapse?: { fx?: Effect[]; goto?: string; schedule?: { node: string; days: number } };
  title: string;
  /** For a `play` node these are the briefing lines on the mission card. */
  lines: Line[];
  /** A `play` node has none: its medal picks the way on (`play.outcomes`). */
  choices: Choice[];
  /** Only on `play` nodes: what you do, and where each result leads. */
  play?: PlaySpec;
}

// ─── missions (NEXT_LEVEL_README §4.7) ─────────────────────────────────────
// A mission is ordinary story: a call or a text whose choice goes to a `play`
// node. The play node is a gameplay beat in the city — a timed run, later a
// chase, a battle, a show. How well you do gives a medal, and the medal picks
// the next node, exactly like a choice would.

export type Medal = 'gold' | 'silver' | 'bronze' | 'miss';

/** A story place you can be sent to in the city (has a door with a GPS target). */
export type RunPlace = Exclude<Place, 'city'>;

/** The gameplay of a beat. One entry per verb; more verbs join this union. */
export type Verb =
  /**
   * Timed run: pass each `via` stop in order, then reach `to`, before the clock
   * runs out. The clock is set from the real road distance at the start, so it
   * is fair from wherever you are. `pace` is the average speed (m/s) needed just
   * to make it; `steps` is the HUD line for each stop (via…, then to).
   */
  | { verb: 'run'; to: RunPlace; via?: RunPlace[]; pace?: number; steps?: string[] };

export interface PlayOutcome { fx?: Effect[]; goto?: string; /** One line on the result card, in the story's voice. */ say?: string }

export interface PlaySpec {
  task: Verb;
  /** The goal in one line, on the mission card and the HUD. */
  objective: string;
  /** Score (0–100) needed for each medal; finishing at all is bronze. Defaults per verb. */
  medals?: { gold: number; silver: number };
  /** Game minutes each attempt takes (the world clock is held while you play). Default 20. */
  minutes?: number;
  /** Attempts in total before it counts as a miss. Default 3. */
  tries?: number;
  /** Where each result leads. A missing medal falls back to the next one down; `miss` must exist. */
  outcomes: Partial<Record<Exclude<Medal, 'miss'>, PlayOutcome>> & { miss: PlayOutcome };
}

export interface Trigger { node: string; if: Cond }
export interface Arc { id: string; title: string; path: Path | 'all'; nodes: StoryNode[]; triggers: Trigger[] }

// ─── persisted state ───────────────────────────────────────────────────────
export interface Delivery { id: string; node: string; at: number; due?: number; status: 'new' | 'open' | 'done' | 'lapsed' }
export interface ActiveTask { task: Task; node: string; base: Record<TaskKind, number>; due: number }

export interface StoryState {
  path: Path;
  /** Day serial the story began (day 0 for conditions). */
  start: number;
  flags: Record<string, boolean | number | string>;
  bonds: Record<string, number>;
  rep: Record<Axis, number>;
  /** node id → the choice taken (or 'lapsed'). */
  done: Record<string, string>;
  arcs: Record<string, { status: 'active' | 'ended'; outcome?: string }>;
  inbox: Delivery[];
  scheduled: { node: string; due: number }[];
  tasks: ActiveTask[];
  /** The scene in progress (so a reload resumes it). */
  active?: { node: string; delivery?: string };
  /** A readable log of what the player chose. */
  log: { day: number; node: string; title: string; choice: string }[];
  /** Mission beats: attempts used and best score. Missing on careers saved before missions. */
  plays?: Record<string, { tries: number; best: number }>;
}

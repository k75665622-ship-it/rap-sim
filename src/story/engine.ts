// ─── STORY ENGINE ──────────────────────────────────────────────────────────
// Pure: operates on a StoryState (an immer draft, in the store). The store
// applies the returned world effects (money, fame, memories…).
import type { Arc, Cond, Delivery, Effect, Path, StoryNode, StoryState, TaskKind } from './types';
import { ARCS } from './content';

export const NODES: Record<string, StoryNode> = {};
for (const a of ARCS) for (const n of a.nodes) NODES[n.id] = n;

export const emptyStory = (path: Path, start: number): StoryState => ({
  path, start, flags: {}, bonds: {}, rep: { integrity: 0, hustle: 0, heart: 0 }, done: {}, arcs: {}, inbox: [], scheduled: [], tasks: [], log: [],
});

export interface Ctx {
  day: number;
  hour: number;
  money: number;
  fame: number;
  fans: number;
  metrics: Record<TaskKind, number>;
  /** Best quality of the newest thing made, for task tiers. */
  quality: { song: number; mix: number };
}

export function check(c: Cond | undefined, st: StoryState, x: Pick<Ctx, 'day' | 'hour' | 'money' | 'fame' | 'fans' | 'metrics'>): boolean {
  if (!c) return true;
  switch (c.k) {
    case 'flag': return (st.flags[c.id] !== undefined && st.flags[c.id] !== false) === (c.v ?? true);
    case 'bond': { const b = st.bonds[c.who] ?? 0; return (c.min === undefined || b >= c.min) && (c.max === undefined || b <= c.max); }
    case 'rep': { const r = st.rep[c.axis]; return (c.min === undefined || r >= c.min) && (c.max === undefined || r <= c.max); }
    case 'path': return (Array.isArray(c.is) ? c.is : [c.is]).includes(st.path);
    case 'day': { const d = x.day - st.start; return (c.min === undefined || d >= c.min) && (c.max === undefined || d <= c.max); }
    case 'hour': return c.from <= c.to ? x.hour >= c.from && x.hour < c.to : x.hour >= c.from || x.hour < c.to;
    case 'done': return st.done[c.node] !== undefined && (c.choice === undefined || st.done[c.node] === c.choice);
    case 'ended': { const a = st.arcs[c.arc]; return !!a && a.status === 'ended' && (c.outcome === undefined || a.outcome === c.outcome); }
    case 'money': return x.money >= c.min;
    case 'stat': { const v = c.id === 'fame' ? x.fame : c.id === 'fans' ? x.fans : c.id === 'money' ? x.money : c.id === 'songs' ? x.metrics.song : x.metrics.release; return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max); }
    case 'not': return !check(c.c, st, x);
    case 'any': return c.of.some((y) => check(y, st, x));
    case 'all': return c.of.every((y) => check(y, st, x));
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Apply effects to the story state. Effects that touch the wider game are returned for the store. */
export function applyEffects(st: StoryState, fx: Effect[] | undefined, ctx: Ctx, nodeId?: string): Effect[] {
  const world: Effect[] = [];
  for (const e of fx ?? []) {
    switch (e.k) {
      case 'bond': st.bonds[e.who] = clamp((st.bonds[e.who] ?? 0) + e.v, -100, 100); break;
      case 'rep': st.rep[e.axis] = clamp(st.rep[e.axis] + e.v, -50, 50); break;
      case 'flag': st.flags[e.id] = e.v ?? true; break;
      case 'schedule': st.scheduled.push({ node: e.node, due: ctx.day + e.days }); break;
      case 'task': st.tasks.push({ task: e.task, node: nodeId ?? '', base: { ...ctx.metrics }, due: ctx.day + e.task.withinDays }); break;
      case 'end': st.arcs[e.arc] = { status: 'ended', outcome: e.outcome }; break;
      default: world.push(e);
    }
  }
  return world;
}

export function deliver(st: StoryState, nodeId: string, ctx: Ctx) {
  const n = NODES[nodeId];
  if (!n) return;
  if (st.inbox.some((d) => d.node === nodeId && d.status !== 'lapsed') || st.done[nodeId] !== undefined) return;
  const d: Delivery = { id: `${nodeId}@${ctx.day}`, node: nodeId, at: ctx.day, status: 'new', due: n.expires !== undefined ? ctx.day + n.expires : undefined };
  st.inbox.push(d);
  if (!st.arcs[n.arc]) st.arcs[n.arc] = { status: 'active' };
}

const hourOk = (n: StoryNode, hour: number) => !n.hours || (n.hours[0] <= n.hours[1] ? hour >= n.hours[0] && hour < n.hours[1] : hour >= n.hours[0] || hour < n.hours[1]);

/** The Director: runs on day, hour and place changes. Returns world effects from lapses. */
export function tick(st: StoryState, ctx: Ctx): Effect[] {
  const world: Effect[] = [];
  // 1. tasks
  for (const t of [...st.tasks]) {
    const done = progressOf(t.task.kind, ctx, t.base);
    const q = t.task.kind === 'mix' ? ctx.quality.mix : ctx.quality.song;
    if (done) {
      st.tasks = st.tasks.filter((x) => x !== t);
      const tier = [...(t.task.tiers ?? [])].sort((a, b) => b.min - a.min).find((x) => q >= x.min);
      st.flags[`task:${t.task.id}`] = Math.round(q);
      deliver(st, tier?.node ?? t.task.done, ctx);
    } else if (ctx.day > t.due) {
      st.tasks = st.tasks.filter((x) => x !== t);
      st.flags[`task:${t.task.id}`] = 'missed';
      deliver(st, t.task.miss, ctx);
    }
  }
  // 2. lapses
  for (const d of st.inbox) {
    if (d.status === 'new' && d.due !== undefined && ctx.day > d.due) {
      d.status = 'lapsed';
      const n = NODES[d.node];
      st.done[d.node] = 'lapsed';
      world.push(...applyEffects(st, n.lapse?.fx, ctx, d.node));
      if (n.lapse?.goto) deliver(st, n.lapse.goto, ctx);
      if (n.lapse?.schedule) st.scheduled.push({ node: n.lapse.schedule.node, due: ctx.day + n.lapse.schedule.days });
      st.log.push({ day: ctx.day, node: n.id, title: n.title, choice: 'no answer' });
    }
  }
  // 3. scheduled
  for (const s of [...st.scheduled]) {
    const n = NODES[s.node];
    if (ctx.day >= s.due && n && hourOk(n, ctx.hour)) { st.scheduled = st.scheduled.filter((x) => x !== s); deliver(st, s.node, ctx); }
  }
  // 4. triggers
  for (const a of ARCS) {
    if (a.path !== 'all' && a.path !== st.path) continue;
    for (const t of a.triggers) {
      const n = NODES[t.node];
      if (!n || st.done[t.node] !== undefined || st.inbox.some((d) => d.node === t.node) || st.scheduled.some((s) => s.node === t.node)) continue;
      if (hourOk(n, ctx.hour) && check(t.if, st, ctx)) deliver(st, t.node, ctx);
    }
  }
  return world;
}

function progressOf(kind: TaskKind, ctx: Ctx, base: Record<TaskKind, number>) { return ctx.metrics[kind] > (base[kind] ?? 0); }

/** Take a choice. Returns the next node to continue into (if any) and world effects. */
export function choose(st: StoryState, nodeId: string, choiceId: string, ctx: Ctx): { next?: string; world: Effect[] } {
  const n = NODES[nodeId];
  const c = n?.choices.find((x) => x.id === choiceId);
  if (!n || !c) return { world: [] };
  st.done[nodeId] = choiceId;
  st.log.push({ day: ctx.day, node: nodeId, title: n.title, choice: c.label });
  const world = applyEffects(st, c.fx, ctx, nodeId);
  for (const d of st.inbox) if (d.node === nodeId && d.status !== 'lapsed') d.status = 'done';
  if (c.goto && !st.done[c.goto]) { for (const d of st.inbox) if (d.node === c.goto) d.status = 'done'; if (!st.inbox.some((d) => d.node === c.goto)) st.inbox.push({ id: `${c.goto}@${ctx.day}`, node: c.goto, at: ctx.day, status: 'open' }); }
  return { next: c.goto, world };
}

export const arcTitle = (arc: string) => ARCS.find((a) => a.id === arc)?.title ?? arc;
export type { Arc };

/** The player turned a call down: it lapses now, with its consequences. */
export function lapseNow(st: StoryState, nodeId: string, ctx: Ctx): Effect[] {
  const d = st.inbox.find((x) => x.node === nodeId && (x.status === 'new' || x.status === 'open'));
  const n = NODES[nodeId];
  if (!d || !n) return [];
  d.status = 'lapsed';
  st.done[nodeId] = 'lapsed';
  const world = applyEffects(st, n.lapse?.fx, ctx, nodeId);
  if (n.lapse?.goto) deliver(st, n.lapse.goto, ctx);
  if (n.lapse?.schedule) st.scheduled.push({ node: n.lapse.schedule.node, due: ctx.day + n.lapse.schedule.days });
  st.log.push({ day: ctx.day, node: n.id, title: n.title, choice: 'let it ring' });
  return world;
}

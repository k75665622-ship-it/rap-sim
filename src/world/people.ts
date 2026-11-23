// ─── THE CITY: PEOPLE ──────────────────────────────────────────────────────
//
// The people who live in town, and what they're doing at this minute of the
// game clock. Most of them are people from the game's own roster — artists,
// producers, DJs, managers — so the producer you just walked past is someone
// you can message, look up, or put on a record. A few are just locals.
//
// Everyone keeps a day: home at night, work in the day (by their job: the
// studio for producers, the label for A&Rs, the radio station for DJs), lunch
// and dinner at Mama's Kitchen, the gym or the shops some afternoons, and the
// night owls end up at The Stage. They walk the pavements between places on a
// small network of footpaths, crossing at the zebra crossings, and disappear
// through the door when they get there.
//
// No three.js here. Positions only; `build.ts` draws them.

import { useGameStore } from '../store/gameStore';
import { isRealId } from '../sim/realPeople';
import { portraitFor } from '../components/avatar/usePortrait';
import { SKIN, lookFor, type Look } from '../sim/look';
import { dateToSerial } from '../sim/gameClock';
import { cityLayout, PLACES, ROAD_CENTRES, ROAD_HALF, SIDEWALK, WORLD } from './layout';
import type { NPC } from '../types/game';

const LANE = ROAD_HALF + SIDEWALK / 2;   // 7.5 m from a road's centre
const LANE_END = WORLD.x1 - 2;
const LANE_START = WORLD.x0 + 2;

// ─── the footpath network ──────────────────────────────────────────────────

export interface PathNode { x: number; z: number; door?: { x: number; z: number }; place?: string }

interface Net {
  nodes: PathNode[];
  next: Int16Array;      // next[a * n + b] = the next node on the way from a to b
  n: number;
  corners: number[];     // junction nodes, for strolling
  placeNode: Record<string, number>;
  homes: number[];
}

let net: Net | null = null;

function network(): Net {
  if (net) return net;
  const L = cityLayout();
  const nodes: PathNode[] = [];
  const lanes = ROAD_CENTRES.flatMap((c) => [c - LANE, c + LANE]);
  // Nodes along each footpath line, keyed by the line, then sorted.
  const vLines = new Map<number, number[]>(); // x → node ids
  const hLines = new Map<number, number[]>(); // z → node ids
  lanes.forEach((v) => { vLines.set(v, []); hLines.set(v, []); });
  const add = (n: PathNode) => { nodes.push(n); return nodes.length - 1; };

  const corners: number[] = [];
  for (const x of lanes) for (const z of lanes) {
    const id = add({ x, z });
    corners.push(id);
    vLines.get(x)!.push(id);
    hLines.get(z)!.push(id);
  }
  for (const v of lanes) for (const e of [LANE_START, LANE_END]) {
    vLines.get(v)!.push(add({ x: v, z: e }));
    hLines.get(v)!.push(add({ x: e, z: v }));
  }

  /** Put a door on the footpath it faces. */
  const doorNode = (face: { x: number; z: number; nx: number; nz: number }, place?: string) => {
    if (face.nx !== 0) {
      const lane = lanes.reduce((a, b) => (Math.abs(b - face.x) < Math.abs(a - face.x) ? b : a));
      if (Math.abs(lane - face.x) > 3) return -1;
      const id = add({ x: lane, z: face.z, door: { x: face.x, z: face.z }, place });
      vLines.get(lane)!.push(id);
      return id;
    }
    const lane = lanes.reduce((a, b) => (Math.abs(b - face.z) < Math.abs(a - face.z) ? b : a));
    if (Math.abs(lane - face.z) > 3) return -1;
    const id = add({ x: face.x, z: lane, door: { x: face.x, z: face.z }, place });
    hLines.get(lane)!.push(id);
    return id;
  };

  const placeNode: Record<string, number> = {};
  for (const b of L.buildings) if (b.place && b.door) placeNode[b.place.id] = doorNode(b.door, b.place.id);

  // Front doors on ordinary buildings: these are people's homes.
  const named = L.buildings.filter((b) => b.door).map((b) => b.door!);
  const homes: number[] = [];
  L.buildings.forEach((b, i) => {
    if (b.place) return;
    const faces = [
      { x: b.minX, z: (b.minZ + b.maxZ) / 2, nx: -1, nz: 0 }, { x: b.maxX, z: (b.minZ + b.maxZ) / 2, nx: 1, nz: 0 },
      { x: (b.minX + b.maxX) / 2, z: b.minZ, nx: 0, nz: -1 }, { x: (b.minX + b.maxX) / 2, z: b.maxZ, nx: 0, nz: 1 },
    ].filter((f) => lanes.some((l) => Math.abs((f.nx ? f.x : f.z) + (f.nx || f.nz) * 2.1 - l) < 0.05));
    for (const [k, f] of faces.entries()) {
      // Two doors on long faces, offset from the middle.
      for (const off of [-0.25, 0.25]) {
        const len = f.nx ? b.maxZ - b.minZ : b.maxX - b.minX;
        const d = { ...f };
        if (f.nx) d.z += off * len; else d.x += off * len;
        if (named.some((n) => Math.hypot(n.x - d.x, n.z - d.z) < 5)) continue;
        if ((i + k) % 2 === 0 || off > 0) {
          const id = doorNode(d);
          if (id >= 0) homes.push(id);
        }
      }
    }
  });

  // Keep the route table small on a big map: a spread of front doors is plenty.
  if (homes.length > 80) {
    const step = Math.ceil(homes.length / 80);
    const keep = new Set(homes.filter((_, i) => i % step === 0));
    for (const id of homes) if (!keep.has(id)) {
      // Off its footpath line; the node stays in the list but is never used.
      vLines.forEach((ids) => { const k = ids.indexOf(id); if (k >= 0) ids.splice(k, 1); });
      hLines.forEach((ids) => { const k = ids.indexOf(id); if (k >= 0) ids.splice(k, 1); });
    }
    homes.splice(0, homes.length, ...keep);
  }

  // Join each line's nodes in order.
  const n = nodes.length;
  const adj: Array<Array<[number, number]>> = nodes.map(() => []);
  const link = (ids: number[], key: 'x' | 'z') => {
    const sorted = [...ids].sort((a, b) => nodes[a][key] - nodes[b][key]);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
      adj[a].push([b, d]);
      adj[b].push([a, d]);
    }
  };
  vLines.forEach((ids) => link(ids, 'z'));
  hLines.forEach((ids) => link(ids, 'x'));

  // Shortest routes between every pair, once (a few hundred nodes at most).
  const next = new Int16Array(n * n).fill(-1);
  const dist = new Float32Array(n);
  const prev = new Int16Array(n);
  for (let s = 0; s < n; s++) {
    dist.fill(Infinity);
    prev.fill(-1);
    dist[s] = 0;
    const done = new Uint8Array(n);
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0) break;
      done[u] = 1;
      for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
    // First step from s towards each t.
    for (let t = 0; t < n; t++) {
      if (t === s || prev[t] < 0) continue;
      let c = t;
      while (prev[c] !== s && prev[c] >= 0) c = prev[c];
      next[s * n + t] = c;
    }
  }

  net = { nodes, next, n, corners, placeNode, homes };
  return net;
}

function route(from: number, to: number): number[] {
  const N = network();
  const out: number[] = [];
  let c = from;
  let guard = 0;
  while (c !== to && guard++ < 400) {
    const nx = N.next[c * N.n + to];
    if (nx < 0) break;
    out.push(nx);
    c = nx;
  }
  return out;
}

// ─── who lives here ────────────────────────────────────────────────────────

export type Doing = 'home' | 'work' | 'food' | 'club' | 'gym' | 'shop' | 'stroll';

export interface Resident {
  id: string;
  /** Someone from the game's roster, or a local with no profile. */
  npcId?: string;
  name: string;
  role: string;
  local: boolean;
  colors: { skin: string; top: string; bottom: string; shoes: string; hair: string; bald: boolean };
  scale: number;
  home: number;
  work: string;
  owl: boolean;
  offset: number;          // minutes their day runs early/late
  // Where they are.
  inside: number;          // node they're inside, or -1 when out walking
  goal: number;            // node they're heading for
  goalDoing: Doing;
  path: Array<{ x: number; z: number }>;
  pathNodes: number[];
  x: number; z: number; rot: number;
  speed: number; phase: number;
  /** Seconds left standing still (talking to you, or got a fright). */
  hold: number;
  startle: number;
  lastPlan: number;
}

const LOCAL_NAMES = ['Kwame', 'Ama', 'Kojo', 'Efua', 'Yaw', 'Akosua', 'Kofi', 'Abena', 'Tunde', 'Ngozi', 'Chidi', 'Aisha', 'Femi', 'Esi', 'Kwabena', 'Adwoa', 'Emeka', 'Zainab'];

const WORK_BY_ROLE: Record<string, string> = {
  artist: 'studio', producer: 'studio', engineer: 'studio', songwriter: 'studio', session_musician: 'studio',
  manager: 'label', label_ceo: 'label', ar: 'label', a_and_r_scout: 'label', distributor: 'label', rival_manager: 'label',
  media: 'radio', blogger: 'radio', radio_owner: 'radio', dj: 'radio', publicist: 'radio', fan_account: 'radio',
  stylist: 'drip', photographer: 'drip', choreographer: 'drip',
  promoter: 'stage', venue_owner: 'stage', tour_manager: 'stage',
  lawyer: 'bank', investor: 'bank',
};
const OWLS = new Set(['artist', 'producer', 'dj', 'promoter', 'venue_owner', 'engineer', 'session_musician']);

function h32(s: string): number { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
const rnd01 = (s: string) => h32(s) / 4294967296;

function colorsOf(look: Look) {
  const hair = String(look.hair ?? '');
  return {
    skin: SKIN[look.skin]?.base ?? '#6b3f2a',
    top: look.outfit.top?.c1 ?? '#2b2f3a',
    bottom: look.outfit.bottom?.c1 ?? '#2c4a78',
    shoes: look.outfit.shoes?.c1 ?? '#f4f4f4',
    hair: look.outfit.head?.c1 ?? look.hairColor ?? '#141110',
    bald: (hair.includes('bald') || hair === 'buzz') && !look.outfit.head,
  };
}

let residents: Resident[] = [];
let castFor = '';

const RESIDENTS_FROM_ROSTER = 34;
const LOCALS = 16;

/**
 * Who lives in town for this career. Fictional people from the roster in the
 * player's own city come first, then their country, then anyone local-tier.
 */
export function cast(): Resident[] {
  const s = useGameStore.getState();
  const key = s.player?.id ?? 'none';
  if (castFor === key && residents.length) return residents;
  castFor = key;
  const N = network();
  const city = s.player?.city;
  const country = s.player?.country;
  const pool = (s.npcs as NPC[]).filter((n) => !isRealId(n.id) && n.role !== 'fan_account');
  const score = (n: NPC) => (n.city && n.city === city ? 0 : n.country === country ? 1 : 2) * 10 + (n.tier === 'local' ? 0 : n.tier === 'national' ? 1 : 3) + rnd01(`order|${n.id}`);
  const chosen = [...pool].sort((a, b) => score(a) - score(b)).slice(0, RESIDENTS_FROM_ROSTER);

  const make = (id: string, name: string, role: string, look: Look, local: boolean, npcId?: string): Resident => {
    const homes = N.homes.length ? N.homes : N.corners;
    const build = look.build === 'slim' ? 0.94 : look.build === 'heavy' ? 1.06 : 1;
    return {
      id, npcId, name, role, local, colors: colorsOf(look), scale: 0.9 * build,
      home: homes[h32(`home|${id}`) % homes.length],
      work: WORK_BY_ROLE[role] ?? 'drip',
      owl: !local && OWLS.has(role) && rnd01(`owl|${id}`) < 0.75,
      offset: Math.floor(rnd01(`off|${id}`) * 90) - 30,
      inside: -1, goal: -1, goalDoing: 'stroll', path: [], pathNodes: [],
      x: 0, z: 0, rot: 0, speed: 1.35 + rnd01(`spd|${id}`) * 0.5, phase: rnd01(`ph|${id}`) * 6, hold: 0, startle: 0, lastPlan: -1,
    };
  };

  residents = chosen.map((n) => make(n.id, n.name, n.role, portraitFor(s, n.id) ?? lookFor(n.id, n.gender), false, n.id));
  for (let i = 0; i < LOCALS; i++) {
    const id = `local-${i}`;
    const name = LOCAL_NAMES[h32(`ln|${key}|${i}`) % LOCAL_NAMES.length];
    residents.push(make(id, name, 'local', lookFor(`${key}|${id}`, i % 2 ? 'female' : 'male'), true));
  }
  placeEveryone();
  return residents;
}

// ─── their day ─────────────────────────────────────────────────────────────

function dayOf(): number {
  const s = useGameStore.getState();
  return s.gameDate ? dateToSerial(s.gameDate) : 0;
}

/** What someone should be doing at this minute of the day. */
export function plan(r: Resident, minute: number, day: number): { doing: Doing; node: number } {
  const N = network();
  const m = (((minute - r.offset) % 1440) + 1440) % 1440;
  const h = m / 60;
  const roll = (k: string) => rnd01(`${r.id}|${day}|${k}`);
  const place = (id: string) => N.placeNode[id] ?? r.home;
  const home = { doing: 'home' as Doing, node: r.home };

  if (r.local) {
    if (h < 7 || h >= 21.5) return home;
    if (h >= 12 && h < 13.5 && roll('lunch') < 0.45) return { doing: 'food', node: place('food') };
    if (h >= 18 && h < 19.5 && roll('dinner') < 0.4) return { doing: 'food', node: place('food') };
    return { doing: 'stroll', node: -1 };
  }
  if (r.owl) {
    if (h < 2.5) return { doing: 'club', node: place('stage') };
    if (h < 9.5) return home;
  } else if (h < 7) return home;
  if (h < 12) return { doing: 'work', node: place(r.work) };
  if (h < 13.5) return roll('lunch') < 0.6 ? { doing: 'food', node: place('food') } : { doing: 'work', node: place(r.work) };
  if (h < 17.5) {
    if (h >= 16 && roll('gym') < 0.25) return { doing: 'gym', node: place('gym') };
    if (h >= 15 && roll('shop') < 0.15) return { doing: 'shop', node: place('drip') };
    return { doing: 'work', node: place(r.work) };
  }
  if (h < 19.5) {
    const d = roll('evening');
    if (d < 0.5) return { doing: 'food', node: place('food') };
    if (d < 0.8) return { doing: 'stroll', node: -1 };
    return home;
  }
  if (r.owl) return h >= 21 ? { doing: 'club', node: place('stage') } : { doing: 'stroll', node: -1 };
  return home;
}

const DOING_TEXT: Record<Doing, string> = {
  home: 'home', work: 'work', food: "Mama's Kitchen", club: 'The Stage', gym: 'Iron House', shop: 'Drip & Ink', stroll: 'a walk',
};

/** "On the way to Studio 9", "Out for a walk"… */
export function describe(r: Resident): string {
  const N = network();
  const placeName = (node: number) => {
    const p = N.nodes[node]?.place;
    const name = p ? PLACES.find((x) => x.id === p)?.name : undefined;
    return name ? titleCase(name) : null;
  };
  if (r.inside >= 0) return r.inside === r.home ? 'At home' : `Inside ${placeName(r.inside) ?? 'a building'}`;
  if (r.goalDoing === 'stroll') return 'Out for a walk';
  if (r.goalDoing === 'home') return 'Heading home';
  return `On the way to ${placeName(r.goal) ?? DOING_TEXT[r.goalDoing]}`;
}

/** People inside a named place right now (Mama's Kitchen's tables). */
export function peopleAt(placeId: string): Resident[] {
  const node = network().placeNode[placeId];
  return cast().filter((r) => r.inside === node);
}

function titleCase(s: string) { return s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a: string, b: string) => a + b.toUpperCase()); }

// ─── moving ────────────────────────────────────────────────────────────────

function nearestNode(x: number, z: number, pool?: number[]): number {
  const N = network();
  let best = 0, bd = Infinity;
  const ids = pool ?? N.nodes.map((_, i) => i);
  for (const i of ids) {
    const d = Math.hypot(N.nodes[i].x - x, N.nodes[i].z - z);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function setGoal(r: Resident, node: number, doing: Doing) {
  const N = network();
  // Start from where they are: their door if inside, else the node ahead.
  let from: number;
  if (r.inside >= 0) {
    from = r.inside;
    const n = N.nodes[from];
    r.x = n.x; r.z = n.z;
    r.inside = -1;
  } else {
    from = r.pathNodes.length ? r.pathNodes[0] : nearestNode(r.x, r.z);
  }
  r.goal = node;
  r.goalDoing = doing;
  const nodes = from === node ? [node] : [from, ...route(from, node)];
  r.pathNodes = nodes;
  r.path = nodes.map((i) => ({ x: N.nodes[i].x, z: N.nodes[i].z }));
  // Last steps: through the door.
  const door = N.nodes[node]?.door;
  if (door && doing !== 'stroll') r.path.push({ x: door.x, z: door.z });
}

function strollOn(r: Resident) {
  const N = network();
  const c = N.corners[h32(`${r.id}|${r.lastPlan}|${Math.round(r.x)}`) % N.corners.length];
  setGoal(r, c, 'stroll');
}

/** Put everyone where they'd be right now — some indoors, some on their way. */
function placeEveryone() {
  const N = network();
  const s = useGameStore.getState();
  const minute = s.clockMinute ?? 720;
  const day = dayOf();
  for (const r of residents) {
    const p = plan(r, minute, day);
    r.pathNodes = [];
    if (p.node >= 0 && rnd01(`start|${r.id}|${day}|${Math.floor(minute / 60)}`) < 0.55) {
      r.inside = p.node;
      r.goal = p.node;
      r.goalDoing = p.doing;
      r.x = N.nodes[p.node].x; r.z = N.nodes[p.node].z;
    } else {
      // Out on the pavement somewhere, already walking.
      const start = N.corners[h32(`sc|${r.id}|${day}`) % N.corners.length];
      r.inside = -1;
      r.x = N.nodes[start].x; r.z = N.nodes[start].z;
      r.pathNodes = [start];
      if (p.node >= 0) setGoal(r, p.node, p.doing); else strollOn(r);
    }
    r.lastPlan = minute;
  }
}

export interface CarShape { x: number; z: number; heading: number; v: number; halfW: number; halfL: number }

/**
 * One step of everybody's day. Returns true if somebody had to jump out of
 * the way of your car this step.
 */
export function stepPeople(dt: number, minute: number, car: CarShape | null): boolean {
  let scared = false;
  const N = network();
  const day = dayOf();
  for (const r of residents) {
    r.startle = Math.max(0, r.startle - dt);
    // Re-think the plan a few times an hour of game time, staggered.
    if (Math.abs(minute - r.lastPlan) >= 10 || r.lastPlan < 0) {
      r.lastPlan = minute;
      const p = plan(r, minute, day);
      if (p.node >= 0 && p.node !== r.goal) setGoal(r, p.node, p.doing);
      else if (p.node < 0 && r.goalDoing !== 'stroll') strollOn(r);
      else if (p.node >= 0 && r.inside < 0 && r.goal === p.node && !r.path.length) setGoal(r, p.node, p.doing);
    }
    if (r.inside >= 0) continue;
    if (r.hold > 0) { r.hold -= dt; continue; }

    const target = r.path[0];
    if (!target) {
      if (r.goalDoing === 'stroll') strollOn(r);
      else { r.inside = r.goal; r.x = N.nodes[r.goal].x; r.z = N.nodes[r.goal].z; }
      continue;
    }
    const dx = target.x - r.x, dz = target.z - r.z;
    const d = Math.hypot(dx, dz);
    const step = r.speed * (r.startle > 0 ? 1.8 : 1) * dt;
    if (d <= step) {
      r.x = target.x; r.z = target.z;
      r.path.shift();
      if (r.pathNodes.length && r.pathNodes[0] !== undefined) r.pathNodes.shift();
    } else {
      r.x += (dx / d) * step;
      r.z += (dz / d) * step;
      const want = Math.atan2(dx, dz);
      let a = want - r.rot;
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      r.rot += a * Math.min(1, dt * 10);
    }
    r.phase += dt * (2.2 + r.speed * 1.35);
    // Keep clear of the car: step out of its way, quickly if it's moving.
    if (car && Math.abs(r.x - car.x) < 4 && Math.abs(r.z - car.z) < 4) {
      const cos = Math.cos(car.heading), sin = Math.sin(car.heading);
      const dx2 = r.x - car.x, dz2 = r.z - car.z;
      let lx = dx2 * cos - dz2 * sin;
      let lz = dx2 * sin + dz2 * cos;
      const pw = car.halfW + 0.45, pl = car.halfL + 0.45;
      if (Math.abs(lx) < pw && Math.abs(lz) < pl) {
        // Out the nearest side of the car, never under it.
        if (pw - Math.abs(lx) < pl - Math.abs(lz)) lx = Math.sign(lx || 1) * pw; else lz = Math.sign(lz || 1) * pl;
        r.x = car.x + lx * cos + lz * sin;
        r.z = car.z - lx * sin + lz * cos;
        if (Math.abs(car.v) > 2) { r.startle = 1.4; scared = true; }
      }
    }
  }
  return scared;
}

export function isOut(r: Resident): boolean { return r.inside < 0; }

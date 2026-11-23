// ─── THE CITY: MOVEMENT & COLLISION ────────────────────────────────────────
//
// Walking, jumping and driving, with no three.js in sight: positions, speeds
// and boxes. The scene reads `live` every frame and draws whatever is here.
//
// `live` sits at module level on purpose: walk into the studio, come back out,
// and you are standing at the studio door with your car where you left it.

import { cityLayout, KERB_H, onRoad, WORLD, type Box } from './layout';

export type Mode = 'foot' | 'car';

export const PLAYER_R = 0.38;
export const CAR = { halfW: 1.0, halfL: 2.25, wheelBase: 2.7 };

const WALK = 3.4;
const RUN = 7.2;
const GRAVITY = 18;
const JUMP_V = 6.2;

// Tuned to feel like a good arcade driver (Dr. Driving): the pedals have travel,
// the wheel does what your thumb does, and the car stays on the road.
const ACCEL = 9.5;         // m/s² at a standstill; fades out towards top speed
const BRAKE = 24;          // foot brake, and the gas-while-rolling-backwards stop
const REVERSE_ACCEL = 6;
const MAX_FWD = 34;        // ≈ 122 km/h
const MAX_REV = 9;
const MAX_STEER = 0.62;    // front wheel angle at full lock, standing still
const MAX_LAT = 15;        // m/s² of cornering grip: past it the car runs wide, it does not spin
const PEDAL_UP = 5;        // gas travel per second when you press
const PEDAL_DOWN = 9;      // and when you let go

export interface Live {
  ready: boolean;
  mode: Mode;
  /** Asked to get out while moving: brake, then step out. */
  exitQueued: boolean;
  /** A video shoot: the camera circles you while you dance. */
  shoot: { on: boolean; t: number };
  p: { x: number; y: number; z: number; rot: number; vy: number; grounded: boolean; speed: number; phase: number };
  car: { x: number; y: number; z: number; heading: number; v: number; vx: number; vz: number; steer: number; spin: number; bump: number; thr: number };
  cam: { yaw: number; pitch: number; manualAt: number };
}

export const live: Live = {
  ready: false,
  mode: 'foot',
  exitQueued: false,
  shoot: { on: false, t: 0 },
  p: { x: 0, y: KERB_H, z: 0, rot: 0, vy: 0, grounded: true, speed: 0, phase: 0 },
  car: { x: 0, y: 0, z: 0, heading: 0, v: 0, vx: 0, vz: 0, steer: 0, spin: 0, bump: 0, thr: 0 },
  cam: { yaw: 0, pitch: 0.32, manualAt: -10 },
};

export function ensureSpawned(): void {
  if (live.ready) return;
  const L = cityLayout();
  live.p.x = L.spawn.x;
  live.p.z = L.spawn.z;
  live.p.rot = L.spawn.rot;
  live.p.y = KERB_H;
  live.car.x = L.carSpawn.x;
  live.car.z = L.carSpawn.z;
  live.car.heading = L.carSpawn.heading;
  // Camera over the shoulder, looking down the street.
  live.cam.yaw = L.spawn.rot + Math.PI - 0.75;
  live.ready = true;
}

export const groundAt = (x: number, z: number) => (indoor.on ? 0 : onRoad(x, z) ? 0 : KERB_H);

// ─── collision ─────────────────────────────────────────────────────────────

/** Push a circle out of a box. Returns the push, or null if not touching. */
function pushOut(x: number, z: number, r: number, b: Box): { dx: number; dz: number } | null {
  const px = Math.max(b.minX, Math.min(x, b.maxX));
  const pz = Math.max(b.minZ, Math.min(z, b.maxZ));
  let dx = x - px;
  let dz = z - pz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const k = (r - d) / d;
    return { dx: dx * k, dz: dz * k };
  }
  // Centre is inside the box: leave by the nearest face.
  const l = x - b.minX, rr = b.maxX - x, t = z - b.minZ, bt = b.maxZ - z;
  const m = Math.min(l, rr, t, bt);
  if (m === l) dx = -(l + r); else if (m === rr) dx = rr + r; else dx = 0;
  if (m === t) dz = -(t + r); else if (m === bt) dz = bt + r; else dz = 0;
  return { dx, dz };
}

/** Circle against every solid (and, optionally, the player's own car). */
export function resolveCircle(x: number, z: number, r: number, withCar: boolean): { x: number; z: number; hit: boolean } {
  if (indoor.on && indoor.bounds) {
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of indoor.solids) {
        if (x + r < b.minX || x - r > b.maxX || z + r < b.minZ || z - r > b.maxZ) continue;
        const pu = pushOut(x, z, r, b);
        if (pu) { x += pu.dx; z += pu.dz; hit = true; }
      }
    }
    const B = indoor.bounds;
    const cx = Math.max(B.minX + r, Math.min(B.maxX - r, x)), cz = Math.max(B.minZ + r, Math.min(B.maxZ - r, z));
    return { x: cx, z: cz, hit: hit || cx !== x || cz !== z };
  }
  const solids = cityLayout().solids;
  let hit = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of solids) {
      if (x + r < b.minX || x - r > b.maxX || z + r < b.minZ || z - r > b.maxZ) continue;
      const p = pushOut(x, z, r, b);
      if (p) { x += p.dx; z += p.dz; hit = true; }
    }
    if (withCar) {
      const c = live.car;
      const cos = Math.cos(c.heading), sin = Math.sin(c.heading);
      const dx = x - c.x, dz = z - c.z;
      // Into the car's own frame (x = across, z = along).
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const p = pushOut(lx, lz, r, { minX: -CAR.halfW, maxX: CAR.halfW, minZ: -CAR.halfL, maxZ: CAR.halfL });
      if (p) {
        const nlx = lx + p.dx, nlz = lz + p.dz;
        x = c.x + nlx * cos + nlz * sin;
        z = c.z - nlx * sin + nlz * cos;
        hit = true;
      }
    }
  }
  if (x < WORLD.x0 + r || x > WORLD.x1 - r || z < WORLD.z0 + r || z > WORLD.z1 - r) hit = true;
  x = Math.max(WORLD.x0 + r, Math.min(WORLD.x1 - r, x));
  z = Math.max(WORLD.z0 + r, Math.min(WORLD.z1 - r, z));
  return { x, z, hit };
}

// ─── on foot ───────────────────────────────────────────────────────────────

export function stepPlayer(dt: number, move: { x: number; y: number }, run: boolean, jump: boolean): void {
  const p = live.p;
  const yaw = live.cam.yaw;
  // Forward is into the screen; right is the camera's right.
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const wx = fx * move.y + rx * move.x;
  const wz = fz * move.y + rz * move.x;
  const amount = Math.min(1, Math.hypot(wx, wz));
  const target = amount * (run ? RUN : WALK);
  // Ease into and out of a run rather than snapping.
  p.speed += (target - p.speed) * Math.min(1, dt * (target > p.speed ? 8 : 12));

  if (amount > 0.05) {
    const want = Math.atan2(wx, wz);
    p.rot = lerpAngle(p.rot, want, Math.min(1, dt * 14));
  }
  const nx = p.x + Math.sin(p.rot) * p.speed * dt;
  const nz = p.z + Math.cos(p.rot) * p.speed * dt;
  const res = resolveCircle(nx, nz, PLAYER_R, true);
  p.x = res.x;
  p.z = res.z;

  // Up and down.
  const ground = groundAt(p.x, p.z);
  if (jump && p.grounded) { p.vy = JUMP_V; p.grounded = false; }
  p.vy -= GRAVITY * dt;
  p.y += p.vy * dt;
  if (p.y <= ground) {
    // Kerbs are low enough to just step up.
    p.y = ground;
    p.vy = 0;
    p.grounded = true;
  } else if (p.grounded && p.vy <= 0 && p.y - ground < 0.2) {
    p.y = ground; // stepping off a kerb
    p.vy = 0;
  } else {
    p.grounded = false;
  }

  p.phase += dt * (p.speed > 0.2 ? 2.2 + p.speed * 1.35 : 0);
}

// ─── driving ───────────────────────────────────────────────────────────────

/** Car circles along its length, for hitting walls. */
const CAR_CIRCLES = [-1.45, 0, 1.45];
const CAR_CIRCLE_R = 1.05;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * One step of the car.
 *  drive      wheel and pedals, -1..1 (x = steer, y = gas/reverse), or null to coast
 *  handbrake  keyboard handbrake: the back end swings out (a drift)
 *  footBrake  the brake pedal: firm, straight, no slide
 */
export function stepCar(dt: number, drive: { x: number; y: number } | null, handbrake: boolean, footBrake = false): void {
  const c = live.car;
  const rawThrottle = drive ? drive.y : 0;
  const steerIn = drive ? drive.x : 0;

  // The pedal has travel: a tap is gentle, a hold is full power, and letting go
  // is quicker than pressing. (A button that jumps 0 → 1 makes every tap a lurch.)
  c.thr += clamp(rawThrottle - c.thr, -PEDAL_DOWN * dt, PEDAL_UP * dt);
  const throttle = c.thr;
  const sgn = Math.sign(c.v);

  // Engine, reverse and engine braking.
  if (throttle > 0.03) {
    if (c.v < -0.5) c.v += BRAKE * throttle * dt;                     // gas while rolling back: stop first
    else c.v += ACCEL * throttle * (1 - Math.pow(Math.max(0, c.v) / MAX_FWD, 1.6)) * dt;
  } else if (throttle < -0.03) {
    if (c.v > 0.5) c.v += BRAKE * throttle * dt;                      // reverse while rolling forward: brake
    else c.v += REVERSE_ACCEL * throttle * (1 - Math.pow(Math.max(0, -c.v) / MAX_REV, 1.6)) * dt;
  } else {
    // Coasting: light engine braking plus rolling resistance, so it carries on a while.
    const drag = Math.abs(c.v) * 0.1 + 0.9;
    c.v -= sgn * Math.min(Math.abs(c.v), drag * dt);
  }
  if (footBrake) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), BRAKE * dt);
  if (handbrake) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 14 * dt);
  c.v = clamp(c.v, -MAX_REV, MAX_FWD);
  if (Math.abs(throttle) <= 0.03 && Math.abs(c.v) < 0.15) c.v = 0;    // parked means parked

  // The wheel sets a front-wheel angle (less lock the faster you go), the turn
  // rate follows from the car's geometry, and cornering grip caps it: push too
  // hard and the car runs wide instead of spinning round.
  const lock = MAX_STEER * (1 - 0.55 * Math.min(1, Math.abs(c.v) / 28));
  c.steer += (-steerIn * lock - c.steer) * Math.min(1, dt * 11);
  let turn = (c.v / CAR.wheelBase) * Math.tan(c.steer);
  const lim = MAX_LAT / Math.max(Math.abs(c.v), 4);
  turn = clamp(turn, -lim, lim);
  if (handbrake && Math.abs(c.v) > 6) turn *= 1.55;                   // handbrake swings the back out
  c.heading += turn * dt;

  // Grip: the car's actual motion catches up with where it points. Less grip
  // with the handbrake on, which is what makes it slide.
  const fwdX = Math.sin(c.heading), fwdZ = Math.cos(c.heading);
  const k = Math.min(1, (handbrake ? 2.2 : 9) * dt);
  c.vx += (fwdX * c.v - c.vx) * k;
  c.vz += (fwdZ * c.v - c.vz) * k;

  let x = c.x + c.vx * dt;
  let z = c.z + c.vz * dt;
  let pushX = 0, pushZ = 0, hit = false;
  for (const off of CAR_CIRCLES) {
    const cx = x + fwdX * off, cz = z + fwdZ * off;
    const r = resolveCircle(cx, cz, CAR_CIRCLE_R, false);
    if (r.hit) { x += r.x - cx; z += r.z - cz; pushX += r.x - cx; pushZ += r.z - cz; hit = true; }
  }
  if (hit) {
    // A crash takes the speed that points INTO the wall and keeps what runs along
    // it: a glancing hit scrapes and slides on, a head-on hit stops you dead. (The
    // old response reversed the car, so every wall was a trampoline.)
    const pl = Math.hypot(pushX, pushZ);
    const speed0 = Math.hypot(c.vx, c.vz);
    let nx = pl > 1e-6 ? pushX / pl : -c.vx / (speed0 || 1);
    let nz = pl > 1e-6 ? pushZ / pl : -c.vz / (speed0 || 1);
    const vn = c.vx * nx + c.vz * nz;                                 // < 0: moving into the wall
    if (vn < 0) {
      c.vx -= 1.1 * vn * nx;
      c.vz -= 1.1 * vn * nz;
      const scrape = 1 - 0.3 * Math.min(1, -vn / (speed0 + 0.5));    // glancing blows barely slow you
      c.vx *= scrape;
      c.vz *= scrape;
      c.bump = Math.max(c.bump, Math.min(1, -vn / 18));
    }
    // Glancing blows also turn the nose along the wall, so you slide past it.
    const into = -(fwdX * nx + fwdZ * nz);
    if (into > 0 && into < 0.85) {
      let tx = -nz, tz = nx;
      if (tx * fwdX + tz * fwdZ < 0) { tx = -tx; tz = -tz; }
      c.heading = lerpAngle(c.heading, Math.atan2(tx, tz), Math.min(1, 4 * dt));
    }
    c.v = c.vx * Math.sin(c.heading) + c.vz * Math.cos(c.heading);
  }
  c.x = x;
  c.z = z;
  const ground = groundAt(c.x, c.z);
  c.y += (ground - c.y) * Math.min(1, dt * 12);
  c.spin += (c.v / 0.38) * dt;
  c.bump = Math.max(0, c.bump - dt * 2);
}

/** A parked car still drifts to a stop if you jump out moving. */
export function idleCar(dt: number): void {
  if (Math.abs(live.car.v) < 0.01 && Math.hypot(live.car.vx, live.car.vz) < 0.01) return;
  stepCar(dt, null, false, true);
}

// ─── getting in and out ────────────────────────────────────────────────────

export function distToCar(): number {
  return Math.hypot(live.p.x - live.car.x, live.p.z - live.car.z);
}

/** Step out on the driver's side, or the other side if that is blocked. */
export function exitCar(): void {
  const c = live.car;
  const cos = Math.cos(c.heading), sin = Math.sin(c.heading);
  for (const side of [1, -1]) {
    const lx = side * (CAR.halfW + 0.75);
    const lz = 0.4;
    const x = c.x + lx * cos + lz * sin;
    const z = c.z - lx * sin + lz * cos;
    const res = resolveCircle(x, z, PLAYER_R, false);
    if (!res.hit || side === -1) {
      live.p.x = res.x;
      live.p.z = res.z;
      live.p.y = groundAt(res.x, res.z);
      live.p.vy = 0;
      live.p.speed = 0;
      live.p.rot = c.heading;
      break;
    }
  }
  live.mode = 'foot';
  live.exitQueued = false;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ─── indoors ───────────────────────────────────────────────────────────────
// Stepping through a door moves you into a room built far off the map. While
// you're in it, collision uses the room's own walls and furniture.
export const indoor: { on: boolean; id: string | null; solids: Box[]; bounds: Box | null; exitAt: { x: number; z: number; rot: number } } = {
  on: false, id: null, solids: [], bounds: null, exitAt: { x: 0, z: 0, rot: 0 },
};

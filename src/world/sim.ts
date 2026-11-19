// ─── THE CITY: MOVEMENT & COLLISION ────────────────────────────────────────
//
// Walking, jumping and driving, with no three.js in sight: positions, speeds
// and boxes. The scene reads `live` every frame and draws whatever is here.
//
// `live` sits at module level on purpose: walk into the studio, come back out,
// and you are standing at the studio door with your car where you left it.

import { cityLayout, KERB_H, onRoad, WORLD_HALF, type Box } from './layout';

export type Mode = 'foot' | 'car';

export const PLAYER_R = 0.38;
export const CAR = { halfW: 1.0, halfL: 2.25, wheelBase: 2.7 };

const WALK = 3.4;
const RUN = 7.2;
const GRAVITY = 18;
const JUMP_V = 6.2;

const ACCEL = 13;
const BRAKE = 26;
const REVERSE_ACCEL = 7;
const MAX_FWD = 34;        // ≈ 122 km/h
const MAX_REV = 9;
const MAX_STEER = 0.62;

export interface Live {
  ready: boolean;
  mode: Mode;
  /** Asked to get out while moving: brake, then step out. */
  exitQueued: boolean;
  /** A video shoot: the camera circles you while you dance. */
  shoot: { on: boolean; t: number };
  p: { x: number; y: number; z: number; rot: number; vy: number; grounded: boolean; speed: number; phase: number };
  car: { x: number; y: number; z: number; heading: number; v: number; vx: number; vz: number; steer: number; spin: number; bump: number };
  cam: { yaw: number; pitch: number; manualAt: number };
}

export const live: Live = {
  ready: false,
  mode: 'foot',
  exitQueued: false,
  shoot: { on: false, t: 0 },
  p: { x: 0, y: KERB_H, z: 0, rot: 0, vy: 0, grounded: true, speed: 0, phase: 0 },
  car: { x: 0, y: 0, z: 0, heading: 0, v: 0, vx: 0, vz: 0, steer: 0, spin: 0, bump: 0 },
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

export const groundAt = (x: number, z: number) => (onRoad(x, z) ? 0 : KERB_H);

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
  const lim = WORLD_HALF - r;
  if (x < -lim || x > lim || z < -lim || z > lim) hit = true;
  x = Math.max(-lim, Math.min(lim, x));
  z = Math.max(-lim, Math.min(lim, z));
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

export function stepCar(dt: number, drive: { x: number; y: number } | null, braking: boolean): void {
  const c = live.car;
  const throttle = drive ? drive.y : 0;
  const steerIn = drive ? drive.x : 0;

  // Engine and brakes.
  if (throttle > 0.05) {
    if (c.v < -0.5) c.v += BRAKE * throttle * dt;
    else c.v += ACCEL * throttle * (1 - Math.max(0, c.v) / MAX_FWD * 0.6) * dt;
  } else if (throttle < -0.05) {
    if (c.v > 0.5) c.v += BRAKE * throttle * dt;
    else c.v += REVERSE_ACCEL * throttle * dt;
  } else {
    // Rolling: drag plus a little friction.
    c.v -= c.v * 0.35 * dt + Math.sign(c.v) * Math.min(Math.abs(c.v), 1.6 * dt);
  }
  if (braking) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 14 * dt);
  c.v = Math.max(-MAX_REV, Math.min(MAX_FWD, c.v));

  // Steering gets lighter as speed builds, so the car does not spin out at 100.
  const speedK = 1 - Math.min(Math.abs(c.v) / 45, 0.62);
  const steerTarget = -steerIn * MAX_STEER * speedK;
  c.steer += (steerTarget - c.steer) * Math.min(1, dt * 7);
  let turn = (c.v / CAR.wheelBase) * Math.tan(c.steer);
  if (braking && Math.abs(c.v) > 6) turn *= 1.55; // handbrake swings the back out
  c.heading += turn * dt;

  // Grip: the car's actual motion catches up with where it points. Less grip
  // with the handbrake on, which is what makes it slide.
  const fwdX = Math.sin(c.heading), fwdZ = Math.cos(c.heading);
  const grip = braking ? 2.2 : 9;
  const k = Math.min(1, grip * dt);
  c.vx += (fwdX * c.v - c.vx) * k;
  c.vz += (fwdZ * c.v - c.vz) * k;

  let x = c.x + c.vx * dt;
  let z = c.z + c.vz * dt;
  let hit = false;
  for (const off of CAR_CIRCLES) {
    const cx = x + fwdX * off, cz = z + fwdZ * off;
    const r = resolveCircle(cx, cz, CAR_CIRCLE_R, false);
    if (r.hit) { x += r.x - cx; z += r.z - cz; hit = true; }
  }
  if (hit) {
    const impact = Math.abs(c.v);
    c.v *= -0.25;
    c.vx *= -0.2;
    c.vz *= -0.2;
    c.bump = Math.max(c.bump, Math.min(1, impact / 20));
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
  stepCar(dt, null, true);
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

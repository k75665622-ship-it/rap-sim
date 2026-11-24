// Lightweight ambient NPC vehicle life. Cars use the existing road grid rather than physics.
// NPCs walk to destinations as before; a small subset occasionally get picked up,
// ride to the destination, park, and finish the last few metres on foot.

import * as THREE from 'three';
import { buildCar, Bin } from './build';
import { ROAD_CENTRES, WORLD } from './layout';
import { dropOffFromVehicle, nodePosition, type Resident } from './people';

type Phase = 'idle' | 'pickup' | 'boarding' | 'driving' | 'parked';

type NpcCar = {
  group: THREE.Group;
  phase: Phase;
  resident: Resident | null;
  route: Array<{ x: number; z: number }>;
  routeIndex: number;
  speed: number;
  heading: number;
  timer: number;
  id: number;
};

const COLORS = ['#34495e', '#f1c40f', '#c0392b', '#16a085'];
const SPEEDS = [7.2, 8.0, 6.8, 7.6];

function hash(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}

function nearestRoad(v: number): number {
  let best = ROAD_CENTRES[0];
  let bd = Math.abs(v - best);
  for (const c of ROAD_CENTRES) {
    const d = Math.abs(v - c);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function pushPoint(out: Array<{ x: number; z: number }>, x: number, z: number) {
  const last = out[out.length - 1];
  if (!last || Math.hypot(last.x - x, last.z - z) > 0.5) out.push({ x, z });
}

function roadRoute(from: { x: number; z: number }, to: { x: number; z: number }) {
  const out: Array<{ x: number; z: number }> = [];
  const rx = nearestRoad(from.x);
  const rz = nearestRoad(to.z);
  pushPoint(out, from.x, from.z);
  pushPoint(out, rx, from.z);
  pushPoint(out, rx, rz);
  pushPoint(out, to.x, rz);
  pushPoint(out, to.x, to.z);
  return out;
}

function steer(car: NpcCar, target: { x: number; z: number }, dt: number) {
  const dx = target.x - car.group.position.x;
  const dz = target.z - car.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.001) return d;
  const want = Math.atan2(dx, dz);
  let a = want - car.heading;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  car.heading += a * Math.min(1, dt * 7);
  const step = Math.min(d, car.speed * dt);
  car.group.position.x += (dx / d) * step;
  car.group.position.z += (dz / d) * step;
  car.group.rotation.y = car.heading;
  return d - step;
}

export interface NpcVehicleSystem {
  group: THREE.Group;
  update(dt: number, minute: number): void;
}

export function buildNpcVehicles(bin: Bin, residents: Resident[]): NpcVehicleSystem {
  const group = new THREE.Group();
  const cars: NpcCar[] = [];

  const starts = [
    { x: ROAD_CENTRES[0] + 5, z: ROAD_CENTRES[1] + 3 },
    { x: ROAD_CENTRES[2] - 5, z: ROAD_CENTRES[1] - 3 },
    { x: ROAD_CENTRES[1] + 3, z: ROAD_CENTRES[3] - 5 },
    { x: ROAD_CENTRES[3] - 3, z: ROAD_CENTRES[0] + 5 },
  ];

  for (let i = 0; i < starts.length; i++) {
    const car = buildCar(COLORS[i], bin);
    car.group.scale.set(0.88, 0.88, 0.92);
    car.group.position.set(starts[i].x, 0.02, starts[i].z);
    group.add(car.group);
    cars.push({
      group: car.group, phase: 'idle', resident: null, route: [], routeIndex: 0,
      speed: SPEEDS[i], heading: i % 2 ? Math.PI : 0, timer: 1.5 + i * 1.5, id: i,
    });
    car.group.rotation.y = cars[cars.length - 1].heading;
  }

  const chooseResident = (car: NpcCar, minute: number): Resident | null => {
    const candidates = residents.filter((r) =>
      r.vehicleState === 'none' &&
      r.inside < 0 &&
      r.goal >= 0 &&
      r.goalDoing !== 'stroll' &&
      r.vehicleCooldown <= 0 &&
      Math.hypot(r.x - car.group.position.x, r.z - car.group.position.z) > 18
    );
    if (!candidates.length) return null;
    candidates.sort((a, b) => hash(`${a.id}|${Math.floor(minute / 10)}`) - hash(`${b.id}|${Math.floor(minute / 10)}`));
    for (const r of candidates) {
      if ((hash(`${r.id}|car|${Math.floor(minute / 30)}`) % 100) < 34) return r;
    }
    return null;
  };

  return {
    group,
    update(dt, minute) {
      for (const car of cars) {
        if (car.phase === 'idle') {
          car.timer -= dt;
          if (car.timer > 0) continue;
          const r = chooseResident(car, minute);
          if (!r) { car.timer = 4 + (hash(`idle|${car.id}|${Math.floor(minute)}`) % 8); continue; }
          const target = { x: r.x, z: r.z };
          car.resident = r;
          car.route = roadRoute({ x: car.group.position.x, z: car.group.position.z }, target);
          car.routeIndex = 1;
          car.phase = 'pickup';
          r.vehicleCooldown = 18;
          continue;
        }

        const r = car.resident;
        if (!r) { car.phase = 'idle'; car.timer = 3; continue; }

        if (car.phase === 'pickup') {
          // The pedestrian remains visible and keeps walking until the car
          // reaches them, giving the impression of walking to a pickup point.
          const d = steer(car, { x: r.x, z: r.z }, dt);
          if (d < 3.0) {
            r.vehicleState = 'passenger';
            r.vehicleId = car.id;
            car.phase = 'boarding';
            car.timer = 0.9;
          }
          continue;
        }

        if (car.phase === 'boarding') {
          car.timer -= dt;
          car.group.rotation.y = car.heading;
          if (car.timer <= 0) {
            const dest = nodePosition(r.goal);
            if (!dest) {
              dropOffFromVehicle(r);
              car.resident = null;
              car.phase = 'idle';
              car.timer = 4;
              continue;
            }
            r.vehicleState = 'passenger';
            car.route = roadRoute({ x: car.group.position.x, z: car.group.position.z }, { x: dest.x, z: dest.z });
            car.routeIndex = 1;
            car.phase = 'driving';
          }
          continue;
        }

        if (car.phase === 'driving') {
          const target = car.route[car.routeIndex];
          if (!target) {
            car.phase = 'parked';
            car.timer = 4.5 + (hash(`park|${r.id}|${Math.floor(minute)}`) % 80) / 10;
            continue;
          }
          const d = steer(car, target, dt);
          if (d < 0.4) {
            car.routeIndex++;
            if (car.routeIndex >= car.route.length) {
              car.phase = 'parked';
              car.timer = 4.5 + (hash(`park|${r.id}|${Math.floor(minute)}`) % 80) / 10;
            }
          }
          continue;
        }

        if (car.phase === 'parked') {
          car.timer -= dt;
          if (car.timer <= 0) {
            dropOffFromVehicle(r);
            r.vehicleCooldown = 35;
            car.resident = null;
            car.phase = 'idle';
            car.timer = 6;
          }
        }
      }

      // Keep ambient vehicles inside the playable world if the map changes.
      for (const car of cars) {
        car.group.position.x = Math.max(WORLD.x0 - 25, Math.min(WORLD.x1 + 25, car.group.position.x));
        car.group.position.z = Math.max(WORLD.x0 - 25, Math.min(WORLD.x1 + 25, car.group.position.z));
      }
    },
  };
}

// Lightweight ambient traffic. Fixed lanes + simple intersection state keep CPU cost predictable on phones.
import * as THREE from 'three';
import { buildCar, Bin } from './build';
import { ROAD_CENTRES, ROAD_HALF, WORLD } from './layout';

type Axis = 'x' | 'z';
type VehicleKind = 'car' | 'suv' | 'taxi' | 'motorcycle' | 'bike';

type Unit = {
  group: THREE.Group;
  axis: Axis;
  road: number;
  lane: number;
  pos: number;
  dir: 1 | -1;
  speed: number;
  cruise: number;
  length: number;
  kind: VehicleKind;
  nextTurnAt: number;
  turnChoice: -1 | 0 | 1;
};

type Signal = {
  group: THREE.Group;
  red: THREE.Mesh;
  yellow: THREE.Mesh;
  green: THREE.Mesh;
  axis: Axis;
  road: number;
};

const PAINTS = ['#c0392b', '#1f4e79', '#f1c40f', '#ecf0f1', '#34495e', '#16a085', '#7f8c8d', '#d35400', '#6c5ce7', '#e17055'];

function mat(bin: Bin, color: string, glow = false) {
  return bin.add(new THREE.MeshLambertMaterial({
    color,
    emissive: glow ? color : '#000000',
    emissiveIntensity: glow ? 1.6 : 0,
  }));
}

function bike(bin: Bin, color: string, motorcycle = false) {
  const g = new THREE.Group();
  const dark = mat(bin, '#15171b');
  const frame = mat(bin, color);
  const wg = bin.add(new THREE.CylinderGeometry(motorcycle ? 0.30 : 0.22, motorcycle ? 0.30 : 0.22, 0.08, 10));
  wg.rotateZ(Math.PI / 2);
  for (const z of [-0.62, 0.62]) {
    const w = new THREE.Mesh(wg, dark);
    w.position.set(0, 0.28, z);
    g.add(w);
  }
  const body = new THREE.Mesh(
    bin.add(new THREE.BoxGeometry(motorcycle ? 0.38 : 0.14, motorcycle ? 0.32 : 0.12, motorcycle ? 1 : 0.78)),
    frame,
  );
  body.position.y = motorcycle ? 0.64 : 0.52;
  g.add(body);
  if (motorcycle) {
    const rider = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.28, 0.55, 0.28)), mat(bin, '#222831'));
    rider.position.set(0, 0.98, -0.08);
    g.add(rider);
    const head = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.14, 7, 5)), mat(bin, '#101216'));
    head.position.set(0, 1.3, -0.08);
    g.add(head);
  } else {
    const bar = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.62, 0.06, 0.06)), frame);
    bar.position.y = 0.78;
    g.add(bar);
  }
  return g;
}

function signal(bin: Bin, x: number, z: number, axis: Axis, road: number): Signal {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const poleMat = mat(bin, '#25282e');
  const pole = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.08, 0.11, 4.4, 6)), poleMat);
  pole.position.y = 2.2;
  group.add(pole);

  const housing = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.42, 1.45, 0.34)), poleMat);
  housing.position.set(axis === 'x' ? 0.42 : 0, 4.0, axis === 'z' ? 0.42 : 0);
  group.add(housing);

  const red = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.095, 8, 6)), mat(bin, '#ff3030', true));
  const yellow = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.095, 8, 6)), mat(bin, '#ffd23f', true));
  const green = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.095, 8, 6)), mat(bin, '#31e36f', true));
  const base = axis === 'x' ? new THREE.Vector3(0.42, 4.35, 0.02) : new THREE.Vector3(0.02, 4.35, 0.42);
  red.position.copy(base);
  yellow.position.copy(base).add(new THREE.Vector3(0, -0.31, 0));
  green.position.copy(base).add(new THREE.Vector3(0, -0.62, 0));
  group.add(red, yellow, green);
  return { group, red, yellow, green, axis, road };
}

// The same deterministic cycle is used by both the visual signal and traffic.
// x traffic gets the first half; z traffic gets the second half.
function signalState(axis: Axis, road: number, now: number): 'red' | 'yellow' | 'green' {
  const p = ((now + road * 0.011) % 14 + 14) % 14;
  if (axis === 'x') {
    if (p < 6.1) return 'green';
    if (p < 7.0) return 'yellow';
    return 'red';
  }
  if (p < 7.0) return 'red';
  if (p < 7.9) return 'yellow';
  return 'green';
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

function nextIntersection(u: Unit): { road: number; distance: number } | null {
  const candidates = ROAD_CENTRES.filter((c) => u.dir > 0 ? c > u.pos + 0.1 : c < u.pos - 0.1);
  if (!candidates.length) return null;
  const road = u.dir > 0 ? candidates[0] : candidates[candidates.length - 1];
  return { road, distance: Math.abs(road - u.pos) };
}

function addVehicleDetail(bin: Bin, group: THREE.Group, kind: VehicleKind, color: string) {
  // A few cheap silhouettes make traffic read as different vehicle classes without
  // adding expensive imported models or per-frame physics.
  if (kind === 'suv') {
    const roof = new THREE.Mesh(bin.add(new THREE.BoxGeometry(1.78, 0.28, 2.1)), mat(bin, color));
    roof.position.y = 1.7;
    group.add(roof);
    const rails = mat(bin, '#24272c');
    for (const x of [-0.62, 0.62]) {
      const bar = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.06, 0.06, 2.15)), rails);
      bar.position.set(x, 1.86, -0.28);
      group.add(bar);
    }
  } else if (kind === 'taxi') {
    const sign = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.62, 0.16, 0.32)), mat(bin, '#f7f7f7'));
    sign.position.y = 1.9;
    group.add(sign);
    const stripe = new THREE.Mesh(bin.add(new THREE.BoxGeometry(1.86, 0.08, 0.14)), mat(bin, '#16181d'));
    stripe.position.set(0, 1.06, 0);
    group.add(stripe);
  }
}

function vehicle(bin: Bin, kind: VehicleKind, color: string): THREE.Group {
  if (kind === 'motorcycle') return bike(bin, color, true);
  if (kind === 'bike') return bike(bin, color, false);
  const car = buildCar(color, bin);
  car.group.scale.set(kind === 'suv' ? 1.02 : 0.9, kind === 'suv' ? 1.08 : 0.9, kind === 'suv' ? 1.06 : 0.94);
  addVehicleDetail(bin, car.group, kind, color);
  return car.group;
}

function chooseTurn(u: Unit, intersection: number): -1 | 0 | 1 {
  const seed = Math.abs(Math.floor(intersection * 17 + u.road * 3 + u.lane * 11));
  const r = seed % 10;
  // Most traffic continues straight. A small but visible number turns.
  if (r < 2) return -1;
  if (r < 4) return 1;
  return 0;
}

export interface TrafficSystem {
  group: THREE.Group;
  update(dt: number, now: number): void;
}

export function buildTraffic(bin: Bin): TrafficSystem {
  const group = new THREE.Group();
  const units: Unit[] = [];

  const starts: Array<[Axis, number, number, 1 | -1, number, VehicleKind]> = [
    ['x', 3.0, -120, 1, 8.5, 'car'],
    ['x', -3.0, 180, -1, 7.2, 'suv'],
    ['x', 3.0, 420, 1, 9.0, 'taxi'],
    ['x', -3.0, 600, -1, 6.8, 'car'],
    ['z', 3.0, 0, 1, 8.0, 'car'],
    ['z', -3.0, 240, -1, 7.0, 'suv'],
    ['z', 3.0, 480, 1, 8.7, 'taxi'],
    ['z', -3.0, 660, -1, 6.5, 'car'],
  ];

  starts.forEach(([axis, lane, pos, dir, speed, kind], i) => {
    const m = vehicle(bin, kind, PAINTS[i % PAINTS.length]);
    m.position.y = 0.02;
    m.rotation.y = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const road = nearestRoad(axis === 'x' ? 0 : pos);
    const roadPos = axis === 'x' ? pos : pos;
    group.add(m);
    units.push({
      group: m, axis, road, lane, pos, dir, speed, cruise: speed, length: kind === 'suv' ? 5.0 : 4.4,
      kind, nextTurnAt: road, turnChoice: 0,
    });
  });

  const bikes: Array<[Axis, number, number, 1 | -1, number, VehicleKind]> = [
    ['x', 4.8, 40, 1, 6.0, 'bike'],
    ['z', -4.8, 150, -1, 5.4, 'motorcycle'],
    ['x', -4.8, 360, -1, 5.8, 'bike'],
    ['z', 4.8, 500, 1, 5.2, 'motorcycle'],
  ];
  bikes.forEach(([axis, lane, pos, dir, speed, kind]) => {
    const g = vehicle(bin, kind, kind === 'motorcycle' ? '#d35400' : '#2e86de');
    g.position.y = 0.02;
    g.rotation.y = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const road = nearestRoad(axis === 'x' ? 0 : pos);
    group.add(g);
    units.push({ group: g, axis, road, lane, pos, dir, speed, cruise: speed, length: 1.4, kind, nextTurnAt: road, turnChoice: 0 });
  });

  const signals: Signal[] = [];
  for (const road of ROAD_CENTRES) {
    // Keep the signal count bounded: every second junction has lights, while
    // the deterministic cycle still governs every road intersection.
    if (road % 120 !== 0) continue;
    signals.push(signal(bin, road + ROAD_HALF + 1, road - ROAD_HALF - 1, 'x', road));
    signals.push(signal(bin, road - ROAD_HALF - 1, road + ROAD_HALF + 1, 'z', road));
  }
  signals.forEach((s) => group.add(s.group));

  const updateSignal = (s: Signal, now: number) => {
    const state = signalState(s.axis, s.road, now);
    s.red.visible = state === 'red';
    s.yellow.visible = state === 'yellow';
    s.green.visible = state === 'green';
  };

  return {
    group,
    update(dt, now) {
      for (const s of signals) updateSignal(s, now);

      // Low-frequency steering decisions: movement itself remains smooth every frame.
      for (const u of units) {
        const next = nextIntersection(u);
        let targetSpeed = u.cruise;

        if (next) {
          const state = signalState(u.axis, next.road, now);
          // Only the junction we're actually approaching controls us.
          if (next.distance < 10 && state === 'red') targetSpeed = 0;
          else if (next.distance < 15 && state === 'yellow') targetSpeed = u.cruise * 0.35;

          // Follow traffic in the same lane. This avoids cars visually merging
          // through one another without adding a physics engine.
          for (const other of units) {
            if (other === u || other.axis !== u.axis || other.road !== u.road || other.lane !== u.lane) continue;
            const gap = (other.pos - u.pos) * u.dir;
            if (gap > 0 && gap < 9) targetSpeed = Math.min(targetSpeed, Math.max(0, other.speed * 0.72));
          }

          if (next.distance < 1.2 && next.road !== u.nextTurnAt) {
            u.nextTurnAt = next.road;
            u.turnChoice = chooseTurn(u, next.road);
          }
        }

        const accel = targetSpeed > u.speed ? 3.0 : 5.0;
        u.speed += Math.sign(targetSpeed - u.speed) * Math.min(Math.abs(targetSpeed - u.speed), accel * dt);
        if (u.speed < 0.02) u.speed = 0;

        u.pos += u.dir * u.speed * dt;

        // Turn at a junction. This is a waypoint turn, not a physics simulation,
        // so the CPU cost is tiny and the vehicle always stays on a lane.
        if (next && next.distance < 0.7 && u.turnChoice !== 0) {
          const oldAxis = u.axis;
          u.axis = oldAxis === 'x' ? 'z' : 'x';
          u.road = next.road;
          u.lane = u.turnChoice < 0 ? -u.lane : u.lane;
          u.dir = u.turnChoice < 0 ? (u.dir === 1 ? -1 : 1) : u.dir;
          u.pos = next.road + u.dir * 0.05;
          u.turnChoice = 0;
          u.group.rotation.y = u.axis === 'x' ? (u.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (u.dir > 0 ? 0 : Math.PI);
        }

        if (u.axis === 'x') {
          u.group.position.x = u.pos;
          u.group.position.z = u.road + u.lane;
        } else {
          u.group.position.z = u.pos;
          u.group.position.x = u.road + u.lane;
        }

        // Recycle vehicles at the edge instead of letting them accumulate.
        if (u.pos > WORLD.x1 + 25) u.pos = WORLD.x0 - 25;
        if (u.pos < WORLD.x0 - 25) u.pos = WORLD.x1 + 25;
      }
    },
  };
}

// Lightweight ambient traffic. Fixed lanes + waypoint turns keep CPU cost predictable on phones.
import * as THREE from 'three';
import { buildCar, Bin } from './build';
import { ROAD_CENTRES, ROAD_HALF, WORLD } from './layout';
import { signalState } from './signals';
import { pedestrianHazards } from './pedestrianTraffic';

type Axis = 'x' | 'z';
type VehicleKind = 'car' | 'suv' | 'taxi' | 'motorcycle' | 'bike';
type Turn = -1 | 0 | 1;

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
  turnAt: number | null;
  turn: Turn;
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

function bike(bin: Bin, color: string, motorcycle: boolean) {
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
  const ahead = ROAD_CENTRES.filter((c) => u.dir > 0 ? c > u.pos + 0.05 : c < u.pos - 0.05);
  if (!ahead.length) return null;
  const road = u.dir > 0 ? ahead[0] : ahead[ahead.length - 1];
  return { road, distance: Math.abs(road - u.pos) };
}

function addVehicleDetail(bin: Bin, group: THREE.Group, kind: VehicleKind, color: string) {
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

function chooseTurn(u: Unit, intersection: number): Turn {
  const seed = Math.abs(Math.floor(intersection * 17 + u.road * 3 + u.lane * 11));
  const r = seed % 10;
  if (r < 2) return -1;
  if (r < 4) return 1;
  return 0;
}

function laneAfterTurn(inAxis: Axis, inDir: 1 | -1, inLane: number, turn: Turn): number {
  if (turn === 0) return inLane;
  const outAxis: Axis = inAxis === 'x' ? 'z' : 'x';
  const outDir: 1 | -1 = turn < 0 ? (inDir === 1 ? -1 : 1) : inDir;
  if (outAxis === 'x') return outDir > 0 ? 3 : -3;
  return outDir > 0 ? 3 : -3;
}

function applyTransform(u: Unit) {
  if (u.axis === 'x') {
    u.group.position.x = u.pos;
    u.group.position.z = u.road + u.lane;
    u.group.rotation.y = u.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    u.group.position.z = u.pos;
    u.group.position.x = u.road + u.lane;
    u.group.rotation.y = u.dir > 0 ? 0 : Math.PI;
  }
}

export interface TrafficSystem {
  group: THREE.Group;
  update(dt: number, now: number): void;
}

export function buildTraffic(bin: Bin): TrafficSystem {
  const group = new THREE.Group();
  const units: Unit[] = [];

  const starts: Array<[Axis, number, number, 1 | -1, number, VehicleKind]> = [
    ['x', 3, -120, 1, 8.5, 'car'],
    ['x', -3, 180, -1, 7.2, 'suv'],
    ['x', 3, 420, 1, 9.0, 'taxi'],
    ['x', -3, 600, -1, 6.8, 'car'],
    ['z', 3, 0, 1, 8.0, 'car'],
    ['z', -3, 240, -1, 7.0, 'suv'],
    ['z', 3, 480, 1, 8.7, 'taxi'],
    ['z', -3, 660, -1, 6.5, 'car'],
    ['x', 4.8, 40, 1, 6.0, 'bike'],
    ['z', -4.8, 150, -1, 5.4, 'motorcycle'],
    ['x', -4.8, 360, -1, 5.8, 'bike'],
    ['z', 4.8, 500, 1, 5.2, 'motorcycle'],
  ];

  starts.forEach(([axis, lane, pos, dir, speed, kind], i) => {
    const g = vehicle(bin, kind, PAINTS[i % PAINTS.length]);
    g.position.y = 0.02;
    group.add(g);
    units.push({
      group: g,
      axis,
      road: nearestRoad(axis === 'x' ? 0 : pos),
      lane,
      pos,
      dir,
      speed,
      cruise: speed,
      length: kind === 'suv' ? 5.0 : kind === 'motorcycle' || kind === 'bike' ? 1.6 : 4.4,
      kind,
      turnAt: null,
      turn: 0,
    });
    applyTransform(units[units.length - 1]);
  });

  const signals: Signal[] = [];
  for (const road of ROAD_CENTRES) {
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

      for (const u of units) {
        const next = nextIntersection(u);
        let targetSpeed = u.cruise;

        if (next && u.turnAt !== next.road && next.distance < 8) {
          u.turnAt = next.road;
          u.turn = chooseTurn(u, next.road);
        }

        if (next && next.distance < 12) {
          const state = signalState(u.axis, next.road, now);
          if (state === 'red' && next.distance < 9) targetSpeed = 0;
          else if (state === 'yellow' && next.distance < 7) targetSpeed = Math.min(targetSpeed, u.cruise * 0.25);
        }

        // Yield at zebra crossings when a pedestrian is already in the road.
        // Only inspect hazards near this vehicle's lane, keeping the check tiny.
        for (const ped of pedestrianHazards()) {
          if (!ped.active || ped.axis !== u.axis || ped.road !== u.road) continue;
          const lateral = u.axis === 'x' ? Math.abs((u.road + u.lane) - ped.z) : Math.abs((u.road + u.lane) - ped.x);
          if (lateral > 2.2) continue;
          const ahead = u.axis === 'x' ? (ped.x - u.pos) * u.dir : (ped.z - u.pos) * u.dir;
          if (ahead > -1 && ahead < 10) targetSpeed = Math.min(targetSpeed, ahead < 4.5 ? 0 : u.cruise * 0.3);
        }

        for (const other of units) {
          if (other === u || other.axis !== u.axis || other.road !== u.road || other.lane !== u.lane) continue;
          const gap = (other.pos - u.pos) * u.dir;
          if (gap > 0 && gap < u.length + other.length + 3) {
            targetSpeed = Math.min(targetSpeed, Math.max(0, other.speed * Math.max(0.25, Math.min(1, gap / 8))));
          }
        }

        const accel = targetSpeed > u.speed ? 3.2 : 5.5;
        const delta = targetSpeed - u.speed;
        u.speed += Math.sign(delta) * Math.min(Math.abs(delta), accel * dt);
        if (u.speed < 0.02) u.speed = 0;

        const oldPos = u.pos;
        u.pos += u.dir * u.speed * dt;

        if (next && u.turnAt === next.road && u.turn !== 0) {
          const crossed = u.dir > 0 ? oldPos < next.road && u.pos >= next.road : oldPos > next.road && u.pos <= next.road;
          if (crossed) {
            const intersection = next.road;
            const incomingAxis = u.axis;
            const incomingDir = u.dir;
            u.axis = incomingAxis === 'x' ? 'z' : 'x';
            u.dir = u.turn < 0 ? (incomingDir === 1 ? -1 : 1) : incomingDir;
            u.road = intersection;
            u.lane = laneAfterTurn(incomingAxis, incomingDir, u.lane, u.turn);
            u.pos = intersection + u.dir * 0.08;
            u.turn = 0;
          }
        }

        applyTransform(u);

        if (u.pos > WORLD.x1 + 30) u.pos = WORLD.x0 - 30;
        else if (u.pos < WORLD.x0 - 30) u.pos = WORLD.x1 + 30;
      }
    },
  };
}

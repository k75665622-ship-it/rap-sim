// ─── LIVING CITY TRAFFIC ───────────────────────────────────────────────────
// Lightweight ambient traffic for the free-roam city.
// Design rule: visual variety without adding expensive per-frame physics.

import * as THREE from 'three';
import { buildCar, Bin } from './build';
import { ROAD_CENTRES, ROAD_HALF, WORLD } from './layout';

type TrafficUnit = {
  group: THREE.Group;
  axis: 'x' | 'z';
  lane: number;
  pos: number;
  speed: number;
  length: number;
  color: string;
  phase: number;
};

type Light = {
  red: THREE.Mesh;
  yellow: THREE.Mesh;
  green: THREE.Mesh;
  axis: 'x' | 'z';
};

const COLORS = ['#c0392b', '#1f4e79', '#f1c40f', '#ecf0f1', '#34495e', '#16a085', '#7f8c8d'];

function material(bin: Bin, color: string, emissive = false) {
  return bin.add(new THREE.MeshLambertMaterial({
    color,
    emissive: emissive ? color : '#000000',
    emissiveIntensity: emissive ? 1.8 : 0,
  }));
}

function makeBike(bin: Bin, color: string, motorbike = false) {
  const g = new THREE.Group();
  const frame = material(bin, color);
  const dark = material(bin, '#17191d');
  const wheelGeo = bin.add(new THREE.CylinderGeometry(motorbike ? 0.30 : 0.24, motorbike ? 0.30 : 0.24, 0.08, 10));
  wheelGeo.rotateZ(Math.PI / 2);
  for (const z of [-0.65, 0.65]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(0, 0.32, z);
    g.add(w);
  }
  const body = new THREE.Mesh(bin.add(new THREE.BoxGeometry(motorbike ? 0.38 : 0.14, motorbike ? 0.32 : 0.12, motorbike ? 1.0 : 0.75)), frame);
  body.position.y = motorbike ? 0.68 : 0.56;
  g.add(body);
  if (!motorbike) {
    const bar = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.7, 0.07, 0.07)), frame);
    bar.position.y = 0.85;
    g.add(bar);
  } else {
    const rider = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.32, 0.62, 0.3)), material(bin, '#20252d'));
    rider.position.set(0, 1.02, -0.05);
    g.add(rider);
  }
  return g;
}

function makeLight(bin: Bin, x: number, z: number, axis: 'x' | 'z'): Light & { group: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const poleMat = material(bin, '#25282e');
  const pole = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.08, 0.11, 4.6, 6)), poleMat);
  pole.position.y = 2.3;
  group.add(pole);

  const head = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.55, 1.5, 0.38)), poleMat);
  head.position.set(axis === 'x' ? 0.45 : 0, 4.25, axis === 'z' ? 0.45 : 0);
  group.add(head);

  const red = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.10, 8, 6)), material(bin, '#ff3030', true));
  const yellow = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.10, 8, 6)), material(bin, '#ffd23f', true));
  const green = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.10, 8, 6)), material(bin, '#31e36f', true));
  const off = axis === 'x' ? new THREE.Vector3(0.45, 4.58, 0.02) : new THREE.Vector3(0.02, 4.58, 0.45);
  red.position.copy(off);
  yellow.position.copy(off).add(new THREE.Vector3(0, -0.32, 0));
  green.position.copy(off).add(new THREE.Vector3(0, -0.64, 0));
  group.add(red, yellow, green);
  return { group, red, yellow, green, axis };
}

export interface TrafficSystem {
  group: THREE.Group;
  update(dt: number, now: number): void;
}

export function buildTraffic(bin: Bin): TrafficSystem {
  const group = new THREE.Group();
  const units: TrafficUnit[] = [];

  // Six cars are enough to make the roads feel occupied while keeping the
  // mobile GPU/CPU budget predictable. They recycle at the world edge.
  const starts = [
    { axis: 'x' as const, lane: -3.0, pos: -110, speed: 8.2, color: COLORS[0] },
    { axis: 'x' as const, lane: 3.0, pos: 80, speed: 6.8, color: COLORS[1] },
    { axis: 'x' as const, lane: -3.0, pos: 410, speed: 9.1, color: COLORS[2] },
    { axis: 'z' as const, lane: 3.0, pos: 15, speed: 7.5, color: COLORS[3] },
    { axis: 'z' as const, lane: -3.0, pos: 280, speed: 8.7, color: COLORS[4] },
    { axis: 'z' as const, lane: 3.0, pos: 520, speed: 6.4, color: COLORS[5] },
  ];

  for (const s of starts) {
    const model = buildCar(s.color, bin);
    model.group.scale.setScalar(0.92);
    model.group.position.y = 0.02;
    model.group.rotation.y = s.axis === 'x' ? (s.lane < 0 ? Math.PI / 2 : -Math.PI / 2) : (s.lane > 0 ? 0 : Math.PI);
    group.add(model.group);
    units.push({ group: model.group, axis: s.axis, lane: s.lane, pos: s.pos, speed: s.speed, length: 4.6, color: s.color, phase: Math.random() * 20 });
  }

  // A couple of two-wheelers add life without expensive rider animation.
  const bikes = [
    { x: -72, z: -3.0, axis: 'x' as const, speed: 5.8, motor: false },
    { x: 0, z: 66, axis: 'z' as const, speed: 6.2, motor: true },
    { x: 342, z: 3.0, axis: 'x' as const, speed: 5.2, motor: false },
  ];
  for (const b of bikes) {
    const bike = makeBike(bin, b.motor ? '#d35400' : '#2e86de', b.motor);
    bike.position.set(b.x, 0, b.z);
    bike.rotation.y = b.axis === 'x' ? Math.PI / 2 : 0;
    group.add(bike);
    units.push({ group: bike, axis: b.axis, lane: b.axis === 'x' ? b.z : b.x, pos: b.axis === 'x' ? b.x : b.z, speed: b.speed, length: 1.4, color: '', phase: 0 });
  }

  const lights: Array<Light & { group: THREE.Group }> = [];
  // Traffic lights at a subset of intersections. Fewer lights = same visual
  // message with much lower object count.
  for (const c of [-60, 120, 300, 480]) {
    lights.push(makeLight(bin, c + ROAD_HALF + 0.8, c - ROAD_HALF - 0.8, 'x'));
    lights.push(makeLight(bin, c - ROAD_HALF - 0.8, c + ROAD_HALF + 0.8, 'z'));
  }
  for (const l of lights) group.add(l.group);

  const isRedFor = (axis: 'x' | 'z', now: number, intersection: number) => {
    // 14-second cycle, with a 7-second green window for each direction.
    const phase = ((now + intersection * 0.013) % 14 + 14) % 14;
    return axis === 'x' ? phase >= 7.2 : phase < 6.8;
  };

  return {
    group,
    update(dt, now) {
      for (const l of lights) {
        const red = isRedFor(l.axis, now, l.group.position.x + l.group.position.z);
        l.red.visible = red;
        l.yellow.visible = !red && (((now * 2) | 0) % 3 === 0);
        l.green.visible = !red && !l.yellow.visible;
      }

      for (const u of units) {
        let p = u.pos;
        let stop = false;
        for (const c of ROAD_CENTRES) {
          const distance = c - p;
          if (distance > -1 && distance < 9) {
            stop = isRedFor(u.axis, now, c);
            break;
          }
        }
        if (!stop) u.pos += u.speed * dt;
        if (u.pos > WORLD.x1 + 20) u.pos = WORLD.x0 - 20;
        if (u.pos < WORLD.x0 - 20) u.pos = WORLD.x1 + 20;
        if (u.axis === 'x') {
          u.group.position.x = u.pos;
          u.group.position.z = u.lane;
        } else {
          u.group.position.z = u.pos;
          u.group.position.x = u.lane;
        }
      }
    },
  };
}

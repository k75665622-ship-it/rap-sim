// ─── THE CITY: VEHICLES ────────────────────────────────────────────────────
//
// Seven different vehicles for the street: sedan, hatchback, SUV, pickup, minibus
// (the tro-tro), taxi and coupe. Each is a side profile (its real silhouette: the
// sloping bonnet and windscreen, the boot or tailgate) extruded across the width
// and given a glass cabin, lights, bumpers and wheels. Everything is merged by
// material, so a street car is five meshes whatever its shape.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Bin } from './build';

export type CarKind = 'sedan' | 'hatch' | 'suv' | 'pickup' | 'minibus' | 'taxi' | 'coupe';

export const CAR_KINDS: readonly CarKind[] = ['sedan', 'hatch', 'suv', 'pickup', 'minibus', 'taxi', 'coupe'];

/** Bumper to bumper, for keeping a gap in traffic. */
export const CAR_LENGTH: Record<CarKind, number> = { sedan: 4.9, hatch: 4.4, suv: 5.2, pickup: 5.6, minibus: 5.8, taxi: 4.9, coupe: 4.7 };

export interface CarModel {
  group: THREE.Group;
  /** Front wheels steer; all four spin. (Only the hero car has separate wheels.) */
  steer: THREE.Group[];
  wheels: THREE.Mesh[];
  body: THREE.Group;
}

type P = [number, number];

interface Spec {
  len: number;
  width: number;
  wheelR: number;
  /** Lower body side profile: x along the length (front is +x), y up. */
  body: P[];
  /** Glass cabin side profile. */
  cabin: P[];
  /** Roof panel side profile. */
  roof: P[];
  /** Height of the head and tail lights. */
  lightY: number;
  /** Where the front side windows begin, for the mirrors. */
  mirrorX: number;
  mirrorY: number;
}

const SPECS: Record<Exclude<CarKind, 'taxi'>, Spec> = {
  sedan: {
    len: 4.5, width: 1.9, wheelR: 0.36, lightY: 0.72, mirrorX: 0.8, mirrorY: 1.0,
    body: [[-2.25, 0.3], [2.25, 0.3], [2.28, 0.62], [2.0, 0.8], [1.0, 0.92], [-0.95, 0.95], [-1.9, 0.92], [-2.27, 0.78]],
    cabin: [[0.95, 0.93], [0.3, 1.48], [-0.8, 1.48], [-1.45, 0.95]],
    roof: [[0.32, 1.46], [0.34, 1.53], [-0.84, 1.53], [-0.8, 1.46]],
  },
  hatch: {
    len: 3.95, width: 1.76, wheelR: 0.34, lightY: 0.7, mirrorX: 0.75, mirrorY: 1.0,
    body: [[-1.98, 0.3], [1.98, 0.3], [2.0, 0.6], [1.75, 0.78], [0.9, 0.9], [-1.7, 0.95], [-2.0, 0.8]],
    cabin: [[0.85, 0.91], [0.2, 1.5], [-1.5, 1.52], [-1.92, 0.93]],
    roof: [[0.22, 1.48], [0.24, 1.55], [-1.52, 1.56], [-1.5, 1.5]],
  },
  suv: {
    len: 4.75, width: 2.0, wheelR: 0.43, lightY: 0.9, mirrorX: 0.95, mirrorY: 1.22,
    body: [[-2.38, 0.4], [2.38, 0.4], [2.4, 0.78], [2.05, 1.0], [0.95, 1.1], [-2.3, 1.12], [-2.4, 0.95]],
    cabin: [[1.0, 1.1], [0.45, 1.82], [-2.2, 1.82], [-2.33, 1.12]],
    roof: [[0.47, 1.8], [0.49, 1.88], [-2.22, 1.88], [-2.2, 1.8]],
  },
  pickup: {
    len: 5.2, width: 2.0, wheelR: 0.43, lightY: 0.88, mirrorX: 0.95, mirrorY: 1.2,
    body: [[-2.6, 0.4], [2.6, 0.4], [2.62, 0.8], [2.3, 1.0], [1.35, 1.1], [-0.2, 1.1], [-0.2, 0.95], [-2.6, 0.95]],
    cabin: [[1.3, 1.1], [0.75, 1.76], [0.0, 1.76], [-0.2, 1.1]],
    roof: [[0.77, 1.74], [0.79, 1.82], [-0.02, 1.82], [-0.02, 1.74]],
  },
  minibus: {
    len: 5.4, width: 2.0, wheelR: 0.38, lightY: 0.78, mirrorX: 2.0, mirrorY: 1.5,
    body: [[-2.7, 0.34], [2.7, 0.34], [2.72, 0.8], [2.55, 1.15], [1.95, 1.5], [1.66, 2.3], [-2.6, 2.34], [-2.72, 2.2]],
    cabin: [[1.9, 1.52], [1.66, 2.26], [1.6, 2.26], [1.84, 1.52]],
    roof: [[1.64, 2.3], [1.66, 2.38], [-2.6, 2.4], [-2.62, 2.32]],
  },
  coupe: {
    len: 4.3, width: 1.9, wheelR: 0.35, lightY: 0.6, mirrorX: 0.5, mirrorY: 0.9,
    body: [[-2.15, 0.28], [2.15, 0.28], [2.2, 0.52], [1.9, 0.66], [0.9, 0.76], [-1.2, 0.84], [-2.0, 0.82], [-2.2, 0.66]],
    cabin: [[0.7, 0.78], [0.05, 1.22], [-0.9, 1.24], [-1.45, 0.84]],
    roof: [[0.07, 1.2], [0.09, 1.27], [-0.92, 1.29], [-0.9, 1.22]],
  },
};

/** A side profile extruded across `width`: front (+x in the profile) becomes +z, centred on x = 0. */
function side(points: P[], width: number, bevel = 0.05): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const depth = Math.max(0.02, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

/** Collects pieces by material, then merges each material's pieces into one mesh. */
class Parts {
  private buckets = new Map<string, THREE.BufferGeometry[]>();
  add(key: string, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (rz) g.rotateZ(rz);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    (this.buckets.get(key) ?? this.buckets.set(key, []).get(key)!).push(g);
    geo.dispose();
  }
  box(key: string, w: number, h: number, d: number, x: number, y: number, z: number) {
    this.add(key, new THREE.BoxGeometry(w, h, d), x, y, z);
  }
  meshes(mats: Record<string, THREE.Material>, bin: Bin): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [key, list] of this.buckets) {
      const merged = mergeGeometries(list);
      list.forEach((g) => g.dispose());
      if (merged) out.push(new THREE.Mesh(bin.add(merged), mats[key]));
    }
    return out;
  }
}

/**
 * One vehicle. `hero` is the player's own car: nicer paint, and wheels that steer and
 * spin on their own. Street traffic keeps its wheels merged in, so it stays cheap.
 */
export function buildVehicle(kind: CarKind, color: string, bin: Bin, hero = false): CarModel {
  const taxi = kind === 'taxi';
  const spec = SPECS[taxi ? 'sedan' : kind];
  const { len, width: W, wheelR } = spec;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const paintMat = hero
    ? new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 })
    : new THREE.MeshLambertMaterial({ color });
  const mats: Record<string, THREE.Material> = {
    paint: bin.add(paintMat),
    glass: bin.add(new THREE.MeshLambertMaterial({ color: '#1b2633', emissive: '#0a0f16' })),
    dark: bin.add(new THREE.MeshLambertMaterial({ color: '#15161a' })),
    trim: bin.add(new THREE.MeshLambertMaterial({ color: '#9a9ea8' })),
    white: bin.add(new THREE.MeshLambertMaterial({ color: '#f1f1ee' })),
    head: bin.add(new THREE.MeshBasicMaterial({ color: '#fff6d8', toneMapped: false })),
    tail: bin.add(new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false })),
  };

  const parts = new Parts();
  parts.add('paint', side(spec.body, W));
  parts.add('glass', side(spec.cabin, W * 0.9, 0.02));
  parts.add('paint', side(spec.roof, W * 0.86, 0.02));

  const half = len / 2;
  const frontX = Math.max(...spec.body.map((p) => p[0]));
  // Bumpers, grille, plates, lights.
  parts.box('dark', W * 1.02, 0.22, 0.16, 0, 0.44, frontX + 0.02);
  parts.box('dark', W * 1.02, 0.22, 0.16, 0, 0.44, -half - 0.02);
  parts.box('dark', W * 0.5, 0.13, 0.05, 0, spec.lightY - 0.02, frontX + 0.04);
  parts.box('white', 0.5, 0.12, 0.03, 0, 0.5, frontX + 0.11);
  parts.box('white', 0.5, 0.12, 0.03, 0, 0.5, -half - 0.11);
  for (const s of [-1, 1]) {
    parts.box('head', 0.38, 0.13, 0.05, s * W * 0.34, spec.lightY, frontX + 0.045);
    parts.box('tail', 0.38, 0.12, 0.05, s * W * 0.34, spec.lightY, -half - 0.04);
    // Mirrors.
    parts.box('paint', 0.1, 0.12, 0.2, s * (W / 2 + 0.07), spec.mirrorY, spec.mirrorX);
    // Sills along the bottom of the body.
    parts.box('dark', 0.05, 0.12, len * 0.62, s * (W / 2 + 0.005), 0.4, 0);
  }

  // What makes each one itself.
  if (kind === 'suv') {
    for (const s of [-1, 1]) parts.box('dark', 0.06, 0.06, 2.3, s * 0.72, 1.93, -0.9);
  } else if (kind === 'pickup') {
    parts.box('dark', W * 0.94, 0.05, 2.35, 0, 0.99, -1.42);                  // bed floor
    for (const s of [-1, 1]) parts.box('paint', 0.1, 0.42, 2.4, s * (W / 2 - 0.05), 1.18, -1.42); // bed sides
    parts.box('paint', W * 0.96, 0.42, 0.1, 0, 1.18, -2.55);                   // tailgate
    parts.box('paint', W * 0.96, 0.42, 0.1, 0, 1.18, -0.3);                    // bed front
  } else if (kind === 'minibus') {
    // A row of side windows, and the stripe every tro-tro has.
    for (let i = 0; i < 5; i++) {
      const z = -2.15 + i * 0.86;
      for (const s of [-1, 1]) parts.box('glass', 0.03, 0.55, 0.74, s * (W / 2 + 0.012), 1.72, z);
    }
    for (const s of [-1, 1]) parts.box('dark', 0.03, 0.1, len * 0.96, s * (W / 2 + 0.012), 1.2, 0);
    parts.box('white', W * 0.9, 0.06, 0.5, 0, 2.43, 1.2);                       // destination board
  } else if (taxi) {
    for (const s of [-1, 1]) parts.box('dark', 0.03, 0.09, len * 0.9, s * (W / 2 + 0.012), 0.9, 0);
    parts.box('white', 0.62, 0.17, 0.3, 0, 1.62, -0.2);                         // roof sign
  } else if (kind === 'coupe') {
    parts.box('dark', W * 0.82, 0.05, 0.34, 0, 1.0, -2.0);                      // spoiler
    for (const s of [-1, 1]) parts.box('dark', 0.05, 0.14, 0.05, s * 0.6, 0.9, -2.0);
  }

  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.28, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(wheelR * 0.55, wheelR * 0.55, 0.3, 8);
  hubGeo.rotateZ(Math.PI / 2);
  const axleZ = len * 0.31;
  const track = W / 2 - 0.12;
  const steer: THREE.Group[] = [];
  const wheels: THREE.Mesh[] = [];

  if (hero) {
    const tire = bin.add(wheelGeo);
    const hubBox = bin.add(new THREE.BoxGeometry(0.32, 0.12, wheelR * 1.3));
    for (const [x, z] of [[track, axleZ], [-track, axleZ], [track, -axleZ], [-track, -axleZ]] as const) {
      const pivot = new THREE.Group();
      pivot.position.set(x, wheelR, z);
      group.add(pivot);
      const wheel = new THREE.Mesh(tire, mats.dark);
      const spoke = new THREE.Mesh(hubBox, mats.trim);
      spoke.position.x = Math.sign(x) * 0.02;
      wheel.add(spoke);
      pivot.add(wheel);
      wheels.push(wheel);
      if (z > 0) steer.push(pivot);
    }
    hubGeo.dispose();
  } else {
    for (const [x, z] of [[track, axleZ], [-track, axleZ], [track, -axleZ], [-track, -axleZ]] as const) {
      parts.add('dark', wheelGeo.clone(), x, wheelR, z);
      parts.add('trim', hubGeo.clone(), x + Math.sign(x) * 0.02, wheelR, z);
    }
    wheelGeo.dispose();
    hubGeo.dispose();
  }

  for (const m of parts.meshes(mats, bin)) body.add(m);
  return { group, steer, wheels, body };
}

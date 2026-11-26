// ─── THE CITY: MODELS ──────────────────────────────────────────────────────
//
// Builds the three.js objects: streets, buildings, signs, trees, lamps, the
// player and the cars. Everything is made from simple shapes and textures
// drawn on a canvas at load time, so the game needs no downloads and works
// offline like the rest of RAP LIFE.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { themeFor } from './theme';
import { cityLayout, currentCountry, KERB_H, ROAD_CENTRES, ROAD_HALF, SIDEWALK, WORLD, type Building } from './layout';
import type { Look } from '../sim/look';
import { buildVehicle, type CarKind, type CarModel } from './vehicles';
import { buildCrowdModel, buildPlayerModel, type Crowd, type CrowdPerson, type CrowdPose, type PlayerModel } from './characters';

type Disposable = { dispose: () => void };

/** Everything made here, so leaving the city frees the GPU memory. */
export class Bin {
  private items: Disposable[] = [];
  add<T extends Disposable>(x: T): T { this.items.push(x); return x; }
  dispose() { this.items.forEach((i) => i.dispose()); this.items = []; }
}

// ─── canvas textures ───────────────────────────────────────────────────────

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function tex(c: HTMLCanvasElement, bin: Bin, repeat = false): THREE.CanvasTexture {
  const t = bin.add(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
  return t;
}

function windowsTexture(bin: Bin): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#ececec';
  g.fillRect(0, 0, 256, 256);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = i * 64, y = j * 64;
      // Ledge under each floor.
      g.fillStyle = '#d6d6d6';
      g.fillRect(x, y + 56, 64, 8);
      const lit = rnd() < 0.08;
      const shade = 40 + Math.floor(rnd() * 40);
      g.fillStyle = lit ? '#ffe6a8' : `rgb(${shade - 10},${shade + 12},${shade + 40})`;
      g.fillRect(x + 10, y + 10, 44, 40);
      // Sky reflection across the glass.
      if (!lit) {
        const grd = g.createLinearGradient(x + 10, y + 10, x + 54, y + 50);
        grd.addColorStop(0, 'rgba(255,255,255,0.28)');
        grd.addColorStop(0.5, 'rgba(255,255,255,0.02)');
        grd.addColorStop(1, 'rgba(255,255,255,0.12)');
        g.fillStyle = grd;
        g.fillRect(x + 10, y + 10, 44, 40);
      }
      g.fillStyle = '#9a9a9a';
      g.fillRect(x + 31, y + 10, 2, 40);
    }
  }
  return tex(c, bin, true);
}

/** Same grid as `windowsTexture`, black except the windows lit at night. */
function windowsNightTexture(bin: Bin): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 256, 256);
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const warm = ['#ffd38a', '#ffe7b8', '#ffc56e', '#fff3d6'];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const r = rnd();
      if (r > 0.42) continue; // most flats have the lights off
      const x = i * 64, y = j * 64;
      // A few blue TV glows among the lamps.
      g.fillStyle = r < 0.06 ? '#8fc4ff' : warm[Math.floor(rnd() * warm.length)];
      g.fillRect(x + 10, y + 10, 44, 40);
      // Curtains half drawn on some.
      if (rnd() < 0.35) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x + 10, y + 10, 18, 40); }
    }
  }
  return tex(c, bin, true);
}

/** Warm pool of light thrown on the pavement by a street lamp. */
function lightPoolTexture(bin: Bin): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 2, 64, 64, 63);
  grd.addColorStop(0, 'rgba(255,214,150,1)');
  grd.addColorStop(0.45, 'rgba(255,190,110,0.45)');
  grd.addColorStop(1, 'rgba(255,170,90,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return tex(c, bin);
}

function glowTexture(bin: Bin, inner: string, outer: string, core: number): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(core, inner);
  grd.addColorStop(Math.min(1, core + 0.08), outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return tex(c, bin);
}

function pavementTexture(bin: Bin): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#a3a3a6';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 128, 128);
  g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
  return tex(c, bin, true);
}

function asphaltTexture(bin: Bin): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#3a3c42';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const v = Math.random();
    g.fillStyle = v > 0.5 ? `rgba(255,255,255,${v * 0.05})` : `rgba(0,0,0,${v * 0.12})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
  }
  return tex(c, bin, true);
}

function signTexture(name: string, tagline: string, accent: string, bin: Bin): THREE.CanvasTexture {
  const [c, g] = canvas(512, 160);
  g.fillStyle = '#101218';
  g.fillRect(0, 0, 512, 160);
  g.fillStyle = accent;
  g.fillRect(0, 0, 14, 160);
  g.fillRect(0, 150, 512, 10);
  g.fillStyle = '#ffffff';
  g.font = '900 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  g.textBaseline = 'middle';
  let size = 64;
  while (g.measureText(name).width > 460 && size > 30) { size -= 4; g.font = `900 ${size}px system-ui, sans-serif`; }
  g.fillText(name, 34, 62);
  g.fillStyle = '#9aa0b4';
  g.font = '600 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  g.fillText(tagline.toUpperCase(), 36, 118);
  return tex(c, bin);
}

export function blobTexture(bin: Bin): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return tex(c, bin);
}

/** BoxGeometry UVs stretched so a texture tiles every `unit` metres. */
function tiledBox(w: number, h: number, d: number, unit: number, offU = 0, offV = 0): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // Face order: +x, -x, +y, -y, +z, -z; four vertices each.
  const scale: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * scale[f][0] / unit + offU, uv.getY(i) * scale[f][1] / unit + offV);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

// ─── the city ──────────────────────────────────────────────────────────────

export interface CityObjects {
  root: THREE.Group;
  /** Parked cars, a child each. */
  parked: THREE.Group;
  /** Shopfront groups; far ones are skipped. */
  shops: THREE.Object3D[];
  /** Walls the camera should not pass through. */
  occluders: THREE.Object3D[];
  /** Door markers that pulse and spin. */
  markers: Array<{ ring: THREE.Mesh; gem: THREE.Mesh; baseY: number }>;
  /** Things that glow more after dark: emissive strength = day + night × k. */
  glow: Array<{ mat: THREE.MeshLambertMaterial; day: number; night: number }>;
  /** The lamp light on the pavement, faded in at dusk. */
  pools: THREE.MeshBasicMaterial;
}

export function buildCity(bin: Bin): CityObjects {
  const L = cityLayout();
  const root = new THREE.Group();
  const occluders: THREE.Object3D[] = [];
  const markers: CityObjects['markers'] = [];
  const glow: CityObjects['glow'] = [];

  const lambert = (p: THREE.MeshLambertMaterialParameters) => bin.add(new THREE.MeshLambertMaterial(p));
  const geo = <G extends THREE.BufferGeometry>(g: G) => bin.add(g);

  // Ground: one big sheet of asphalt; pavements sit on top of it.
  const asphalt = asphaltTexture(bin);
  asphalt.repeat.set(412, 412);
  const ground = new THREE.Mesh(geo(new THREE.PlaneGeometry(1700, 1700)), lambert({ map: asphalt }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(450, 0, 450);
  root.add(ground);

  // Pavements and the park, merged into two meshes.
  const pave = pavementTexture(bin);
  const paveGeos = new Map<string, THREE.BufferGeometry[]>();
  const grassGeos = new Map<string, THREE.BufferGeometry[]>();
  const into = (m: Map<string, THREE.BufferGeometry[]>, k: string, g: THREE.BufferGeometry) => { if (!m.has(k)) m.set(k, []); m.get(k)!.push(g); };
  const waterGeos: THREE.BufferGeometry[] = [];
  for (const b of L.blocks) {
    // A block's slab runs out to the kerb, except at the edge of the world.
    const grow = (v: number, dir: number) => (v <= WORLD.x0 + 0.01 || v >= WORLD.x1 - 0.01 ? v + dir * 40 : v + dir * SIDEWALK);
    const x0 = grow(b.minX, -1), x1 = grow(b.maxX, 1), z0 = grow(b.minZ, -1), z1 = grow(b.maxZ, 1);
    const g = tiledBox(x1 - x0, KERB_H, z1 - z0, 2);
    g.translate((x0 + x1) / 2, KERB_H / 2, (z0 + z1) / 2);
    into(paveGeos, chunkOf((x0 + x1) / 2, (z0 + z1) / 2), g);
    if (b.water) {
      const wg = new THREE.PlaneGeometry(b.maxX - b.minX - 3, b.maxZ - b.minZ - 3);
      wg.rotateX(-Math.PI / 2);
      wg.translate((b.minX + b.maxX) / 2, KERB_H + 0.02, (b.minZ + b.maxZ) / 2);
      waterGeos.push(wg);
    }
    if (b.park) {
      const gg = new THREE.BoxGeometry(b.maxX - b.minX - 1, 0.04, b.maxZ - b.minZ - 1);
      gg.translate((b.minX + b.maxX) / 2, KERB_H + 0.02, (b.minZ + b.maxZ) / 2);
      into(grassGeos, chunkOf((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2), gg);
    }
  }
  if (waterGeos.length) {
    const waterMat = bin.add(new THREE.MeshLambertMaterial({ color: '#2f7fb8', emissive: '#0b2c4a', emissiveIntensity: 0.35, transparent: true, opacity: 0.93 }));
    root.add(new THREE.Mesh(geo(mergeGeometries(waterGeos)), waterMat));
    waterGeos.forEach((g) => g.dispose());
  }
  const paveMat = lambert({ map: pave });
  const grassMat = lambert({ color: themeFor(currentCountry()).grass });
  for (const list of paveGeos.values()) { root.add(new THREE.Mesh(geo(mergeGeometries(list)), paveMat)); list.forEach((g) => g.dispose()); }
  for (const list of grassGeos.values()) { root.add(new THREE.Mesh(geo(mergeGeometries(list)), grassMat)); list.forEach((g) => g.dispose()); }

  // Road paint: dashed centre lines and zebra crossings.
  const paintY = 0.012;
  const dashes: THREE.Matrix4[] = [];
  const zebra: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const nearJunction = (t: number) => ROAD_CENTRES.some((c) => Math.abs(t - c) < ROAD_HALF + SIDEWALK + 1.5);
  for (const c of ROAD_CENTRES) {
    for (let t = WORLD.x0; t <= WORLD.x1; t += 6) {
      if (nearJunction(t)) continue;
      dashes.push(m.clone().compose(new THREE.Vector3(c, paintY, t), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
      dashes.push(m.clone().compose(new THREE.Vector3(t, paintY, c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
    }
    for (const c2 of ROAD_CENTRES) {
      // Four crossings round each junction.
      const d = ROAD_HALF + 2.2;
      for (let s = -ROAD_HALF + 0.9; s <= ROAD_HALF - 0.9; s += 1.2) {
        zebra.push(m.clone().makeTranslation(c + s, paintY, c2 - d));
        zebra.push(m.clone().makeTranslation(c + s, paintY, c2 + d));
        zebra.push(m.clone().compose(new THREE.Vector3(c - d, paintY, c2 + s), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
        zebra.push(m.clone().compose(new THREE.Vector3(c + d, paintY, c2 + s), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
      }
    }
  }
  const statics: StaticPart[] = [
    { g: new THREE.BoxGeometry(0.2, 0.02, 2.6), mats: dashes, color: '#f2c230' },
    { g: new THREE.BoxGeometry(0.6, 0.02, 3.2), mats: zebra, color: '#e9e9e9' },
  ];

  // Barriers where the roads leave town.
  const barriers: THREE.Matrix4[] = [];
  for (const c of ROAD_CENTRES) {
    for (const e of [WORLD.x0 + 0.6, WORLD.x1 - 0.6]) {
      barriers.push(m.clone().makeTranslation(c, 0.5, e));
      barriers.push(m.clone().compose(new THREE.Vector3(e, 0.5, c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
    }
  }
  statics.push({ g: new THREE.BoxGeometry(ROAD_HALF * 2, 1, 0.6), mats: barriers, color: '#d8432f' });

  // Buildings.
  const windows = windowsTexture(bin);
  const windowsNight = windowsNightTexture(bin);
  const roof = lambert({ color: '#4a4d55' });
  // One wall material for the whole city; each building's colour lives in its vertices.
  const wallMat = lambert({ map: windows, vertexColors: true, emissiveMap: windowsNight, emissive: '#ffffff', emissiveIntensity: 0 });
  glow.push({ mat: wallMat, day: 0, night: 0.8 });
  let bi = 0;
  const roofBits = new Map<string, THREE.BufferGeometry[]>();
  // Walls are merged per colour, so the whole skyline is a dozen draw calls.
  const wallGeos = new Map<string, THREE.BufferGeometry[]>();
  const flatten = (g: THREE.BufferGeometry) => { const n = g.toNonIndexed(); g.dispose(); return n; };
  for (const b of L.buildings) {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
    // Shift each building's window grid so lit windows don't line up across town.
    bi++;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const box = tiledBox(w, b.height, d, 16, ((bi * 7) % 4) * 0.25, ((bi * 3) % 4) * 0.25);
    box.translate(cx, KERB_H + b.height / 2, cz);
    const [walls, top] = splitBox(box);
    paint(walls, b.color);
    box.dispose();
    const ck = chunkOf(cx, cz);
    const wk = ck;
    if (!wallGeos.has(wk)) wallGeos.set(wk, []);
    wallGeos.get(wk)!.push(walls);
    into(roofBits, ck, top);
    // Parapet round the roof edge.
    const lip = new THREE.BoxGeometry(w + 0.3, 0.6, d + 0.3);
    lip.translate(cx, KERB_H + b.height + 0.3, cz);
    into(roofBits, ck, flatten(lip));
    for (const t of b.rooftop) {
      const g = new THREE.BoxGeometry(t.maxX - t.minX, t.h, t.maxZ - t.minZ);
      g.translate((t.minX + t.maxX) / 2, KERB_H + b.height + t.h / 2, (t.minZ + t.maxZ) / 2);
      into(roofBits, ck, flatten(g));
    }
    if (b.place && b.door) {
      if (b.homeType) addResidentialFront(b, root, bin, markers, glow);
      else addShopfront(b, root, bin, markers, glow);
    }
  }
  for (const list of wallGeos.values()) {
    const mesh = new THREE.Mesh(geo(mergeGeometries(list)), wallMat);
    root.add(mesh);
    occluders.push(mesh);
    list.forEach((g) => g.dispose());
  }
  for (const list of roofBits.values()) { root.add(new THREE.Mesh(geo(mergeGeometries(list)), roof)); list.forEach((g) => g.dispose()); }

  // Trees and street lamps.
  const trunks: THREE.Matrix4[] = [];
  const crowns: THREE.Matrix4[] = [];
  const poles: THREE.Matrix4[] = [];
  const heads: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  for (const p of L.props) {
    if (p.kind === 'tree') {
      const s = 0.85 + ((p.x * 13.7 + p.z * 7.1) % 1 + 1) % 1 * 0.5;
      trunks.push(m.clone().compose(new THREE.Vector3(p.x, KERB_H + 1.1 * s, p.z), q, new THREE.Vector3(s, s, s)));
      crowns.push(m.clone().compose(new THREE.Vector3(p.x, KERB_H + 3.1 * s, p.z), q, new THREE.Vector3(s * 1.15, s, s * 1.15)));
    } else {
      poles.push(m.clone().makeTranslation(p.x, KERB_H + 2.6, p.z));
      const hq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
      const off = new THREE.Vector3(0, 0, 1.1).applyQuaternion(hq);
      heads.push(m.clone().compose(new THREE.Vector3(p.x + off.x, KERB_H + 5.15, p.z + off.z), hq, new THREE.Vector3(1, 1, 1)));
    }
  }
  statics.push({ g: new THREE.CylinderGeometry(0.16, 0.22, 2.2, 6), mats: trunks, color: themeFor(currentCountry()).trunk });
  statics.push({ g: new THREE.IcosahedronGeometry(1.6, 0), mats: crowns, color: themeFor(currentCountry()).crown });
  statics.push({ g: new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), mats: poles, color: '#2c2f36' });
  root.add(mergeStatics(statics, bin));
  const lampMat = lambert({ color: '#2c2f36', emissive: '#fff3c4', emissiveIntensity: 0.15 });
  glow.push({ mat: lampMat, day: 0.15, night: 2.6 });
  root.add(instanced(geo(new THREE.BoxGeometry(0.45, 0.18, 2.4)), lampMat, heads));
  // Pools of lamp light on the ground, under the end of each arm.
  const poolMats: THREE.Matrix4[] = [];
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  for (const h of heads) {
    const pos = new THREE.Vector3().setFromMatrixPosition(h);
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(h));
    pos.addScaledVector(dir, 0.9);
    poolMats.push(m.clone().compose(new THREE.Vector3(pos.x, KERB_H + 0.03, pos.z), flat, new THREE.Vector3(1, 1, 1)));
  }
  const pools = bin.add(new THREE.MeshBasicMaterial({
    map: lightPoolTexture(bin), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  const poolMesh = instancedChunked(geo(new THREE.PlaneGeometry(10, 10)), pools, poolMats);
  poolMesh.children.forEach((c) => { c.renderOrder = 1; });
  root.add(poolMesh);

  // Parked cars (the frame loop hides the far ones).
  const parkedRoot = new THREE.Group();
  for (const pc of L.parked) {
    const car = buildCar(pc.color, bin);
    bake(car.group, bin);
    car.group.position.set(pc.x, 0, pc.z);
    car.group.rotation.y = pc.heading;
    parkedRoot.add(car.group);
  }
  root.add(parkedRoot);

  return { root, occluders, markers, glow, pools, parked: parkedRoot, shops: root.children.filter((c) => c.userData.far) };
}

/** A box's four walls and its roof as separate non-indexed pieces (no floor). */
function splitBox(g: THREE.BufferGeometry): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const ng = g.toNonIndexed();
  const take = (groups: number[]) => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const a = ng.getAttribute(name) as THREE.BufferAttribute;
      const size = a.itemSize;
      const vals: number[] = [];
      for (const gi of groups) {
        const gr = ng.groups[gi];
        for (let i = gr.start; i < gr.start + gr.count; i++) for (let k = 0; k < size; k++) vals.push(a.array[i * size + k] as number);
      }
      out.setAttribute(name, new THREE.Float32BufferAttribute(vals, size));
    }
    return out;
  };
  const parts: [THREE.BufferGeometry, THREE.BufferGeometry] = [take([0, 1, 4, 5]), take([2])];
  ng.dispose();
  return parts;
}

/** The world is cut into square chunks so the phone only draws what is in front of it. */
const CHUNK = 160;
const chunkOf = (x: number, z: number) => `${Math.floor((x - WORLD.x0) / CHUNK)}_${Math.floor((z - WORLD.z0) / CHUNK)}`;

/** A parked car never moves: fold its plain parts into one mesh (one draw call, not a dozen). */
function bake(group: THREE.Group, bin: Bin): void {
  group.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  const gone: THREE.Mesh[] = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    const mat = m.material as THREE.MeshStandardMaterial;
    const plain = mat && (mat.type === 'MeshLambertMaterial' || mat.type === 'MeshStandardMaterial') && !mat.map && !mat.transparent && (mat.emissive?.getHex() ?? 0) === 0;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || !plain) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.deleteAttribute('uv');
    g = g.applyMatrix4(m.matrixWorld);
    paint(g, `#${mat.color.getHexString()}`);
    parts.push(g);
    gone.push(m);
  });
  if (parts.length < 2) return;
  for (const m of gone) m.parent?.remove(m);
  group.add(new THREE.Mesh(bin.add(mergeGeometries(parts)), bin.add(new THREE.MeshLambertMaterial({ vertexColors: true }))));
  parts.forEach((g) => g.dispose());
}

type StaticPart = { g: THREE.BufferGeometry; mats: THREE.Matrix4[]; color: string };
/** Give every vertex a colour, so differently coloured things can share one material and one draw call. */
function paint(g: THREE.BufferGeometry, color: string): void {
  const c = new THREE.Color(color);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}
/** Trees, poles, road paint and barriers, baked into one mesh per chunk. */
function mergeStatics(parts: StaticPart[], bin: Bin): THREE.Group {
  const out = new THREE.Group();
  const by = new Map<string, THREE.BufferGeometry[]>();
  const v = new THREE.Vector3();
  for (const part of parts) {
    const base = part.g.index ? part.g.toNonIndexed() : part.g;
    base.deleteAttribute('uv');
    paint(base, part.color);
    for (const mm of part.mats) {
      v.setFromMatrixPosition(mm);
      const k = chunkOf(v.x, v.z);
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(base.clone().applyMatrix4(mm));
    }
  }
  const mat = bin.add(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  for (const list of by.values()) { out.add(new THREE.Mesh(bin.add(mergeGeometries(list)), mat)); list.forEach((g) => g.dispose()); }
  return out;
}

/** Instances split by chunk: each piece gets its own bounds, so off-screen ones are skipped. */
function instancedChunked(g: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[]): THREE.Group {
  const out = new THREE.Group();
  const by = new Map<string, THREE.Matrix4[]>();
  const v = new THREE.Vector3();
  for (const mm of mats) {
    v.setFromMatrixPosition(mm);
    const k = chunkOf(v.x, v.z);
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(mm);
  }
  for (const list of by.values()) out.add(instanced(g, mat, list));
  return out;
}

function instanced(g: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[]): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(g, mat, Math.max(1, mats.length));
  mats.forEach((mm, i) => im.setMatrixAt(i, mm));
  im.count = mats.length;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

/**
 * Residential front: a proper house/apartment entrance rather than a giant
 * commercial sign. It stays lightweight, but gives the neighbourhood a
 * believable doorway, windows, porch light and house marker.
 */
function addResidentialFront(b: Building, root: THREE.Group, bin: Bin, markers: CityObjects['markers'], glow: CityObjects['glow']) {
  const place = b.place!;
  const door = b.door!;
  const face = new THREE.Group();
  face.position.set(door.x, KERB_H, door.z);
  face.rotation.y = Math.atan2(door.nx, door.nz);
  face.userData.far = 80;
  root.add(face);

  const accent = new THREE.Color(place.accent);
  const mat = (p: THREE.MeshLambertMaterialParameters) => bin.add(new THREE.MeshLambertMaterial(p));
  const box = (w: number, h: number, d: number) => bin.add(new THREE.BoxGeometry(w, h, d));

  // Low porch step + canopy.
  const step = new THREE.Mesh(box(3.8, 0.16, 1.8), mat({ color: '#b9a17f' }));
  step.position.set(0, 0.08, 0.75); face.add(step);
  const canopy = new THREE.Mesh(box(3.4, 0.16, 1.3), mat({ color: accent }));
  canopy.position.set(0, 2.95, 0.55); canopy.rotation.x = 0.08; face.add(canopy);

  // Door + frame.
  const frame = new THREE.Mesh(box(1.65, 2.55, 0.18), mat({ color: accent }));
  frame.position.set(0, 1.28, 0.08); face.add(frame);
  const doorMat = mat({ color: '#26303a', emissive: '#d9b35b', emissiveIntensity: 0.08 });
  glow.push({ mat: doorMat, day: 0.05, night: 0.24 });
  const doorMesh = new THREE.Mesh(box(1.25, 2.2, 0.2), doorMat);
  doorMesh.position.set(0, 1.12, 0.17); face.add(doorMesh);
  const knob = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.055, 8, 6)), mat({ color: '#d9b35b' }));
  knob.position.set(0.42, 1.1, 0.3); face.add(knob);

  // Two windows give the building a residential rhythm. Apartment fronts are
  // taller; houses get a warmer lower pair.
  const winMat = mat({ color: b.homeType === 'apartment' ? '#6c9fc5' : '#8fc1d4', emissive: '#8bc7e8', emissiveIntensity: 0.12 });
  glow.push({ mat: winMat, day: 0.08, night: 0.35 });
  const windowHeight = b.homeType === 'apartment' ? 2.25 : 1.65;
  const windowY = b.homeType === 'apartment' ? 2.35 : 1.85;
  for (const sx of [-2.65, 2.65]) {
    const w = new THREE.Mesh(box(1.8, windowHeight, 0.12), winMat);
    w.position.set(sx, windowY, 0.04); face.add(w);
    const mullion = new THREE.Mesh(box(0.08, windowHeight, 0.14), mat({ color: '#e7e1d6' }));
    mullion.position.set(sx, windowY, 0.12); face.add(mullion);
  }

  // Small mailbox / number plate beside the door.
  const plate = new THREE.Mesh(box(0.42, 0.24, 0.06), mat({ color: '#f1e7c9' }));
  plate.position.set(-1.15, 1.05, 0.2); face.add(plate);
  const ring = new THREE.Mesh(bin.add(new THREE.RingGeometry(0.58, 0.76, 24)), bin.add(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.52, toneMapped: false, depthWrite: false })));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(door.x + door.nx * 1.45, KERB_H + 0.02, door.z + door.nz * 1.45);
  root.add(ring);
  const gem = new THREE.Mesh(bin.add(new THREE.OctahedronGeometry(0.2, 0)), bin.add(new THREE.MeshBasicMaterial({ color: accent, toneMapped: false })));
  gem.position.set(ring.position.x, KERB_H + 1.8, ring.position.z);
  root.add(gem);
  markers.push({ ring, gem, baseY: gem.position.y });
}

/** Door, awning, lit sign and the glowing marker on the pavement. */
function addShopfront(b: Building, root: THREE.Group, bin: Bin, markers: CityObjects['markers'], glow: CityObjects['glow']) {
  const place = b.place!;
  const door = b.door!;
  const face = new THREE.Group();
  face.position.set(door.x, KERB_H, door.z);
  face.rotation.y = Math.atan2(door.nx, door.nz);
  face.userData.far = 95;
  root.add(face);

  const accent = new THREE.Color(place.accent);
  const mat = (p: THREE.MeshLambertMaterialParameters) => bin.add(new THREE.MeshLambertMaterial(p));
  const box = (w: number, h: number, d: number) => bin.add(new THREE.BoxGeometry(w, h, d));

  // Shop window band along the ground floor.
  const bandMat = mat({ color: '#1a2230', emissive: '#c08a52', emissiveIntensity: 0.1 });
  glow.push({ mat: bandMat, day: 0.1, night: 0.32 });
  const band = new THREE.Mesh(box(9, 3.2, 0.12), bandMat);
  band.position.set(0, 1.9, 0.06);
  face.add(band);
  // Doorway.
  const frame = new THREE.Mesh(box(2.4, 3.1, 0.2), mat({ color: accent }));
  frame.position.set(0, 1.55, 0.1);
  face.add(frame);
  const openingMat = mat({ color: '#0c0d11', emissive: '#ffcf70', emissiveIntensity: 0.18 });
  glow.push({ mat: openingMat, day: 0.18, night: 0.6 });
  const opening = new THREE.Mesh(box(1.8, 2.7, 0.22), openingMat);
  opening.position.set(0, 1.35, 0.12);
  face.add(opening);
  // Awning.
  const awning = new THREE.Mesh(box(4.2, 0.2, 1.6), mat({ color: accent }));
  awning.position.set(0, 3.35, 0.8);
  awning.rotation.x = 0.12;
  face.add(awning);
  // Sign.
  const sign = new THREE.Mesh(
    bin.add(new THREE.PlaneGeometry(7.2, 2.25)),
    bin.add(new THREE.MeshBasicMaterial({ map: signTexture(place.name, place.tagline, place.accent, bin), toneMapped: false })),
  );
  sign.position.set(0, 5.0, 0.08);
  face.add(sign);

  // Marker on the pavement in front of the door.
  const ring = new THREE.Mesh(
    bin.add(new THREE.RingGeometry(0.75, 1.0, 32)),
    bin.add(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false })),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(door.x + door.nx * 1.6, KERB_H + 0.02, door.z + door.nz * 1.6);
  root.add(ring);
  const gem = new THREE.Mesh(
    bin.add(new THREE.OctahedronGeometry(0.32, 0)),
    bin.add(new THREE.MeshBasicMaterial({ color: accent, toneMapped: false })),
  );
  gem.position.set(ring.position.x, KERB_H + 2.4, ring.position.z);
  root.add(gem);
  markers.push({ ring, gem, baseY: gem.position.y });
}

// ─── the player ────────────────────────────────────────────────────────────

export type { Crowd, CrowdPerson, CrowdPose, PlayerModel };

/** You, and the people inside buildings. See characters.ts. */
export function buildPlayer(look: Look | undefined, bin: Bin): PlayerModel {
  return buildPlayerModel(look, bin);
}

// ─── cars ──────────────────────────────────────────────────────────────────

export type { CarModel, CarKind } from './vehicles';

/** The player's own car. (Street traffic builds its own mix: see vehicles.ts.) */
export function buildCar(color: string, bin: Bin, kind: CarKind = 'sedan'): CarModel {
  return buildVehicle(kind, color, bin, true);
}

// ─── the sky ───────────────────────────────────────────────────────────────

export interface SkyObjects {
  group: THREE.Group;
  stars: THREE.PointsMaterial;
  sun: THREE.Sprite;
  moon: THREE.Sprite;
}

/** Stars, sun and moon. Kept centred on the camera so they sit at infinity. */
export function buildSky(bin: Bin): SkyObjects {
  const group = new THREE.Group();
  const n = 700;
  const pos = new Float32Array(n * 3);
  let seed = 99;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const u = rnd() * Math.PI * 2;
    const y = 0.08 + rnd() * 0.92;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(u) * r * 300, y * 300, Math.sin(u) * r * 300], i * 3);
  }
  const g = bin.add(new THREE.BufferGeometry());
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = bin.add(new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  group.add(new THREE.Points(g, stars));

  const sprite = (t: THREE.Texture, size: number) => {
    const sp = new THREE.Sprite(bin.add(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false, transparent: true, toneMapped: false })));
    sp.scale.setScalar(size);
    group.add(sp);
    return sp;
  };
  const sun = sprite(glowTexture(bin, 'rgba(255,250,235,1)', 'rgba(255,214,140,0.35)', 0.16), 70);
  const moon = sprite(glowTexture(bin, 'rgba(235,240,255,1)', 'rgba(170,190,255,0.18)', 0.2), 34);
  return { group, stars, sun, moon };
}

// ─── the people ────────────────────────────────────────────────────────────
//
// Everybody in town drawn with one instanced mesh per body part — legs, shoes,
// torso, sleeves, forearms, head, hair, eyes and a shadow — so fifty people
// cost nine draw calls rather than seven hundred.

/** The street crowd: every person drawn with a handful of instanced meshes. See characters.ts. */
export function buildCrowd(people: CrowdPerson[], bin: Bin): Crowd {
  return buildCrowdModel(people, bin, blobTexture(bin));
}

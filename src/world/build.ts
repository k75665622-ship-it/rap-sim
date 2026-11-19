// ─── THE CITY: MODELS ──────────────────────────────────────────────────────
//
// Builds the three.js objects: streets, buildings, signs, trees, lamps, the
// player and the cars. Everything is made from simple shapes and textures
// drawn on a canvas at load time, so the game needs no downloads and works
// offline like the rest of RAP LIFE.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cityLayout, KERB_H, ROAD_CENTRES, ROAD_HALF, SIDEWALK, WORLD_HALF, type Building } from './layout';
import { SKIN, defaultLook, type Look } from '../sim/look';

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
  asphalt.repeat.set(120, 120);
  const ground = new THREE.Mesh(geo(new THREE.PlaneGeometry(480, 480)), lambert({ map: asphalt }));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  // Pavements and the park, merged into two meshes.
  const pave = pavementTexture(bin);
  const paveGeos: THREE.BufferGeometry[] = [];
  const grassGeos: THREE.BufferGeometry[] = [];
  for (const b of L.blocks) {
    // A block's slab runs out to the kerb, except at the edge of the world.
    const grow = (v: number, dir: number) => (Math.abs(v) >= WORLD_HALF - 0.01 ? v + dir * 40 : v + dir * SIDEWALK);
    const x0 = grow(b.minX, -1), x1 = grow(b.maxX, 1), z0 = grow(b.minZ, -1), z1 = grow(b.maxZ, 1);
    const g = tiledBox(x1 - x0, KERB_H, z1 - z0, 2);
    g.translate((x0 + x1) / 2, KERB_H / 2, (z0 + z1) / 2);
    paveGeos.push(g);
    if (b.park) {
      const gg = new THREE.BoxGeometry(b.maxX - b.minX - 1, 0.04, b.maxZ - b.minZ - 1);
      gg.translate((b.minX + b.maxX) / 2, KERB_H + 0.02, (b.minZ + b.maxZ) / 2);
      grassGeos.push(gg);
    }
  }
  root.add(new THREE.Mesh(geo(mergeGeometries(paveGeos)), lambert({ map: pave })));
  paveGeos.forEach((g) => g.dispose());
  if (grassGeos.length) {
    root.add(new THREE.Mesh(geo(mergeGeometries(grassGeos)), lambert({ color: '#5b8f45' })));
    grassGeos.forEach((g) => g.dispose());
  }

  // Road paint: dashed centre lines and zebra crossings.
  const paintY = 0.012;
  const dashes: THREE.Matrix4[] = [];
  const zebra: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const nearJunction = (t: number) => ROAD_CENTRES.some((c) => Math.abs(t - c) < ROAD_HALF + SIDEWALK + 1.5);
  for (const c of ROAD_CENTRES) {
    for (let t = -WORLD_HALF; t <= WORLD_HALF; t += 6) {
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
  root.add(instanced(geo(new THREE.BoxGeometry(0.2, 0.02, 2.6)), lambert({ color: '#f2c230' }), dashes));
  root.add(instanced(geo(new THREE.BoxGeometry(0.6, 0.02, 3.2)), lambert({ color: '#e9e9e9' }), zebra));

  // Barriers where the roads leave town.
  const barriers: THREE.Matrix4[] = [];
  for (const c of ROAD_CENTRES) {
    for (const e of [-WORLD_HALF + 0.6, WORLD_HALF - 0.6]) {
      barriers.push(m.clone().makeTranslation(c, 0.5, e));
      barriers.push(m.clone().compose(new THREE.Vector3(e, 0.5, c), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
    }
  }
  root.add(instanced(geo(new THREE.BoxGeometry(ROAD_HALF * 2, 1, 0.6)), lambert({ color: '#d8432f' }), barriers));

  // Buildings.
  const windows = windowsTexture(bin);
  const windowsNight = windowsNightTexture(bin);
  const roof = lambert({ color: '#4a4d55' });
  const wallMats = new Map<string, THREE.MeshLambertMaterial>();
  const wallFor = (color: string) => {
    let mat = wallMats.get(color);
    if (!mat) {
      mat = lambert({ map: windows, color, emissiveMap: windowsNight, emissive: '#ffffff', emissiveIntensity: 0 });
      wallMats.set(color, mat);
      glow.push({ mat, day: 0, night: 0.8 });
    }
    return mat;
  };
  let bi = 0;
  const roofBits: THREE.BufferGeometry[] = [];
  for (const b of L.buildings) {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
    const wall = wallFor(b.color);
    // Shift each building's window grid so lit windows don't line up across town.
    bi++;
    const mesh = new THREE.Mesh(geo(tiledBox(w, b.height, d, 16, ((bi * 7) % 4) * 0.25, ((bi * 3) % 4) * 0.25)), [wall, wall, roof, roof, wall, wall]);
    mesh.position.set((b.minX + b.maxX) / 2, KERB_H + b.height / 2, (b.minZ + b.maxZ) / 2);
    root.add(mesh);
    occluders.push(mesh);
    // Parapet round the roof edge.
    const lip = new THREE.BoxGeometry(w + 0.3, 0.6, d + 0.3);
    lip.translate(mesh.position.x, KERB_H + b.height + 0.3, mesh.position.z);
    roofBits.push(lip);
    for (const t of b.rooftop) {
      const g = new THREE.BoxGeometry(t.maxX - t.minX, t.h, t.maxZ - t.minZ);
      g.translate((t.minX + t.maxX) / 2, KERB_H + b.height + t.h / 2, (t.minZ + t.maxZ) / 2);
      roofBits.push(g);
    }
    if (b.place && b.door) addShopfront(b, root, bin, markers, glow);
  }
  root.add(new THREE.Mesh(geo(mergeGeometries(roofBits)), lambert({ color: '#5b5f68' })));
  roofBits.forEach((g) => g.dispose());

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
  root.add(instanced(geo(new THREE.CylinderGeometry(0.16, 0.22, 2.2, 6)), lambert({ color: '#6b4a32' }), trunks));
  root.add(instanced(geo(new THREE.IcosahedronGeometry(1.6, 0)), lambert({ color: '#4f8a3c', flatShading: true }), crowns));
  root.add(instanced(geo(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6)), lambert({ color: '#2c2f36' }), poles));
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
  const poolMesh = instanced(geo(new THREE.PlaneGeometry(10, 10)), pools, poolMats);
  poolMesh.renderOrder = 1;
  root.add(poolMesh);

  // Parked cars.
  for (const pc of L.parked) {
    const car = buildCar(pc.color, bin);
    car.group.position.set(pc.x, 0, pc.z);
    car.group.rotation.y = pc.heading;
    root.add(car.group);
  }

  return { root, occluders, markers, glow, pools };
}

function instanced(g: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[]): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(g, mat, Math.max(1, mats.length));
  mats.forEach((mm, i) => im.setMatrixAt(i, mm));
  im.count = mats.length;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

/** Door, awning, lit sign and the glowing marker on the pavement. */
function addShopfront(b: Building, root: THREE.Group, bin: Bin, markers: CityObjects['markers'], glow: CityObjects['glow']) {
  const place = b.place!;
  const door = b.door!;
  const face = new THREE.Group();
  face.position.set(door.x, KERB_H, door.z);
  face.rotation.y = Math.atan2(door.nx, door.nz);
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

export interface PlayerModel {
  group: THREE.Group;
  body: THREE.Group;
  legL: THREE.Group; legR: THREE.Group;
  armL: THREE.Group; armR: THREE.Group;
  handset: THREE.Mesh;
}

export function buildPlayer(look: Look | undefined, bin: Bin): PlayerModel {
  const l = look ?? defaultLook();
  const skin = SKIN[l.skin]?.base ?? '#6b3f2a';
  const top = l.outfit.top?.c1 ?? '#2b2f3a';
  const topTrim = l.outfit.top?.c2 ?? top;
  const bottom = l.outfit.bottom?.c1 ?? '#2c4a78';
  const shoes = l.outfit.shoes?.c1 ?? '#f4f4f4';
  const slim = l.build === 'slim' ? 0.9 : l.build === 'heavy' ? 1.15 : 1;

  const mat = (c: string) => bin.add(new THREE.MeshLambertMaterial({ color: c }));
  const box = (w: number, h: number, d: number) => bin.add(new THREE.BoxGeometry(w, h, d));
  const part = (w: number, h: number, d: number, c: string, x: number, y: number, z: number) => {
    const me = new THREE.Mesh(box(w, h, d), mat(c));
    me.position.set(x, y, z);
    return me;
  };

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  // Legs hang from the hips so they can swing.
  const leg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.13 * slim, 0.92, 0);
    g.add(part(0.22 * slim, 0.82, 0.24, bottom, 0, -0.41, 0));
    g.add(part(0.25 * slim, 0.14, 0.38, shoes, 0, -0.86, 0.06));
    body.add(g);
    return g;
  };
  const legL = leg(1), legR = leg(-1);

  body.add(part(0.56 * slim, 0.68, 0.3 * slim, top, 0, 1.27, 0));
  body.add(part(0.58 * slim, 0.08, 0.32 * slim, topTrim, 0, 0.96, 0)); // waistband
  body.add(part(0.14, 0.1, 0.14, skin, 0, 1.65, 0));                      // neck

  const arm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * (0.36 * slim + 0.02), 1.56, 0);
    g.add(part(0.17, 0.3, 0.19, top, 0, -0.14, 0));
    g.add(part(0.15, 0.38, 0.16, skin, 0, -0.46, 0));
    body.add(g);
    return g;
  };
  const armL = arm(1), armR = arm(-1);
  // A phone in the right hand, shown when you take it out.
  const handset = part(0.09, 0.17, 0.02, '#0d0e12', 0, -0.66, 0.1);
  const screenGlow = new THREE.Mesh(box(0.075, 0.145, 0.005), bin.add(new THREE.MeshBasicMaterial({ color: '#7fb4ff', toneMapped: false })));
  screenGlow.position.set(0, 0, 0.013);
  handset.add(screenGlow);
  handset.visible = false;
  armR.add(handset);

  // Head.
  body.add(part(0.36, 0.4, 0.36, skin, 0, 1.9, 0));
  const hairStyle = String(l.hair ?? '');
  const bald = hairStyle.includes('bald') || hairStyle.includes('shaved');
  if (!bald) {
    const tall = /afro|puff|twist|braid|loc|dread/.test(hairStyle);
    body.add(part(0.4, tall ? 0.24 : 0.1, 0.4, l.hairColor ?? '#141110', 0, tall ? 2.18 : 2.12, -0.01));
    body.add(part(0.4, 0.28, 0.08, l.hairColor ?? '#141110', 0, 1.98, -0.17));
    if (/braid|loc|dread/.test(hairStyle)) body.add(part(0.36, 0.5, 0.1, l.hairColor ?? '#141110', 0, 1.7, -0.19));
  }
  body.add(part(0.06, 0.05, 0.02, '#111111', 0.08, 1.93, 0.18));
  body.add(part(0.06, 0.05, 0.02, '#111111', -0.08, 1.93, 0.18));

  body.scale.setScalar(0.92);
  return { group, body, legL, legR, armL, armR, handset };
}

// ─── cars ──────────────────────────────────────────────────────────────────

export interface CarModel {
  group: THREE.Group;
  /** Front wheels steer; all four spin. */
  steer: THREE.Group[];
  wheels: THREE.Mesh[];
  body: THREE.Group;
}

export function buildCar(color: string, bin: Bin): CarModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = bin.add(new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.35 }));
  const glass = bin.add(new THREE.MeshStandardMaterial({ color: '#16202c', metalness: 0.6, roughness: 0.15 }));
  const dark = bin.add(new THREE.MeshLambertMaterial({ color: '#15161a' }));
  const box = (w: number, h: number, d: number) => bin.add(new THREE.BoxGeometry(w, h, d));
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) => {
    const me = new THREE.Mesh(g, mat);
    me.position.set(x, y, z);
    parent.add(me);
    return me;
  };

  add(box(2.0, 0.62, 4.5), paint, 0, 0.72, 0);
  add(box(1.72, 0.56, 2.25), glass, 0, 1.3, -0.25);
  add(box(1.74, 0.08, 1.95), paint, 0, 1.6, -0.3);
  add(box(2.04, 0.26, 0.2), dark, 0, 0.48, 2.28);   // bumpers
  add(box(2.04, 0.26, 0.2), dark, 0, 0.48, -2.28);
  const headL = bin.add(new THREE.MeshBasicMaterial({ color: '#fff6d8', toneMapped: false }));
  const tailL = bin.add(new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }));
  for (const s of [-1, 1]) {
    add(box(0.42, 0.14, 0.04), headL, s * 0.68, 0.84, 2.26);
    add(box(0.42, 0.12, 0.04), tailL, s * 0.68, 0.84, -2.26);
  }

  const wheelGeo = bin.add(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14));
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = bin.add(new THREE.BoxGeometry(0.32, 0.12, 0.5));
  const hub = bin.add(new THREE.MeshLambertMaterial({ color: '#9a9ea8' }));
  const steer: THREE.Group[] = [];
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [[0.92, 1.4], [-0.92, 1.4], [0.92, -1.4], [-0.92, -1.4]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.38, z);
    group.add(pivot);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    const spoke = new THREE.Mesh(hubGeo, hub);
    spoke.position.x = Math.sign(x) * 0.02;
    wheel.add(spoke);
    pivot.add(wheel);
    wheels.push(wheel);
    if (z > 0) steer.push(pivot);
  }
  return { group, steer, wheels, body };
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

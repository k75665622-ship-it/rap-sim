// ─── INTERIORS ─────────────────────────────────────────────────────────────
// Real rooms you walk into. Each is built once, far from the city, and shown
// while you're inside it. Mama's Kitchen first.
import * as THREE from 'three';
import { Bin, buildPlayer, type PlayerModel } from './build';
import type { Box } from './layout';
import { defaultLook, lookFor, type Look } from '../sim/look';

export const KX = 2000; // the kitchen's centre on the x axis
export const SX = 2100; // Studio 9's

export interface Spot { id: string; x: number; z: number; label: string; reach: number; kind: 'exit' | 'counter' | 'radio' | 'act'; act?: string; go?: string; unit?: number }
export interface Npc { id: string; who: string; visitor?: boolean; model: PlayerModel; x: number; z: number; rot: number; sit: boolean; work: boolean; baseY: number }
export interface Interior {
  id: string;
  name: string;
  x0: number;
  where: string;
  placeId: string;
  halfW: number;
  halfD: number;
  group: THREE.Group;
  lights: THREE.PointLight[];
  solids: Box[];
  bounds: Box;
  spawn: { x: number; z: number; rot: number };
  spots: Spot[];
  npcs: Npc[];
  walls: Array<[THREE.Mesh, 'N' | 'S' | 'E' | 'W']>;
}

function canvasTex(bin: Bin, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = bin.add(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

export function buildKitchen(bin: Bin): Interior {
  const group = new THREE.Group();
  const solids: Box[] = [];
  const mat = (c: string, emissive?: string) => bin.add(new THREE.MeshLambertMaterial({ color: c, emissive: emissive ?? '#000000' }));
  const add = (x0: number, x1: number, z0: number, z1: number, h: number, c: string, y0 = 0, solid = true, emissive?: string) => {
    const m = new THREE.Mesh(bin.add(new THREE.BoxGeometry(x1 - x0, h, z1 - z0)), mat(c, emissive));
    m.position.set(KX + (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
    group.add(m);
    if (solid) solids.push({ minX: KX + x0, maxX: KX + x1, minZ: z0, maxZ: z1 });
    return m;
  };
  const W = 5, D = 4, H = 3.3;
  const walls: Array<[THREE.Mesh, 'N' | 'S' | 'E' | 'W']> = [];

  // Floor: chequered tiles.
  const checker = canvasTex(bin, 64, 64, (g) => { g.fillStyle = '#d9c7a1'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#b9a47a'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, [10, 8]);
  const floor = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(W * 2, D * 2)), bin.add(new THREE.MeshLambertMaterial({ map: checker })));
  floor.rotation.x = -Math.PI / 2; floor.position.set(KX, 0.01, 0); group.add(floor);
  // A rug by the door.
  const rug = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(2.6, 1.4)), mat('#9a2f2f'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(KX, 0.02, 3.1); group.add(rug);

  // Walls (door gap in the south wall, 2 m wide).
  walls.push([add(-W - 0.3, W + 0.3, -D - 0.3, -D, H, '#e8d9b5'), 'N']);          // north
  walls.push([add(-W - 0.3, -W, -D, D + 0.3, H, '#e0cfa6'), 'W']);                   // west
  walls.push([add(W, W + 0.3, -D, D + 0.3, H, '#e0cfa6'), 'E']);                     // east
  walls.push([add(-W - 0.3, -1, D, D + 0.3, H, '#e8d9b5'), 'S']);                    // south left
  walls.push([add(1, W + 0.3, D, D + 0.3, H, '#e8d9b5'), 'S']);                      // south right
  walls.push([add(-1, 1, D, D + 0.3, 0.9, '#e8d9b5', 2.4, false), 'S']);             // lintel
  // Painted dado stripe.
  add(-W, W, -D + 0.01, -D + 0.12, 0.9, '#b5472f', 0, false);

  // Menu board on the north wall.
  const board = canvasTex(bin, 512, 256, (g) => {
    g.fillStyle = '#1d3b2a'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#d8b66a'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 244);
    g.fillStyle = '#f4e3b0'; g.font = 'bold 46px system-ui'; g.textAlign = 'center'; g.fillText("MAMA'S KITCHEN", 256, 76);
    g.font = '28px system-ui'; g.fillStyle = '#ffd26a';
    g.fillText('JOLLOF · WAAKYE · KENKEY', 256, 132); g.fillText('GRILLED TILAPIA · FUFU', 256, 176); g.fillText('SOBOLO · SOBO · TEA', 256, 220);
  });
  const sign = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(4, 2)), bin.add(new THREE.MeshBasicMaterial({ map: board })));
  sign.position.set(KX, 2.1, -D + 0.18); group.add(sign);

  // Serving counter.
  add(-3.6, 3.6, -1.35, -0.65, 1.0, '#7a4a28');
  add(-3.7, 3.7, -1.4, -0.6, 0.08, '#c9955a', 1.0, false);
  // Behind it: stove, prep table, fridge, shelves, storage door.
  add(-4.4, -2.0, -3.9, -3.0, 0.9, '#2a2a2e');
  for (const bx of [-3.7, -2.7]) { const b = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16)), mat('#111')); b.position.set(KX + bx, 0.93, -3.45); group.add(b); }
  const pot = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.34, 0.3, 0.42, 16)), mat('#a8a8b0')); pot.position.set(KX - 3.7, 1.15, -3.45); group.add(pot);
  const pot2 = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.28, 0.28, 0.3, 16)), mat('#c2410c')); pot2.position.set(KX - 2.7, 1.08, -3.45); group.add(pot2);
  add(-0.9, 1.3, -3.85, -3.15, 0.92, '#b8bcc4');
  add(3.0, 4.2, -3.95, -3.05, 2.1, '#f1f1f4');
  add(-1.5, 1.8, -3.98, -3.7, 0.12, '#6b4a2a', 1.9, false);
  add(-1.5, 1.8, -3.98, -3.7, 0.12, '#6b4a2a', 1.4, false);
  for (let i = 0; i < 9; i++) { const c = ['#c2410c', '#d9b25f', '#4a7a3b', '#9a2f2f'][i % 4]; add(-1.4 + i * 0.36, -1.22 + i * 0.36, -3.95, -3.78, 0.28, c, 1.52, false); }
  add(-W + 0.02, -W + 0.25, -3.1, -2.0, 2.2, '#5a3d28', 0, true); // storage door (west wall)

  // Tables and chairs.
  const tableAt = (cx: number, cz: number) => {
    add(cx - 0.6, cx + 0.6, cz - 0.6, cz + 0.6, 0.06, '#d8a05a', 0.74, false);
    add(cx - 0.08, cx + 0.08, cz - 0.08, cz + 0.08, 0.74, '#6b4a2a', 0, false);
    solids.push({ minX: KX + cx - 0.55, maxX: KX + cx + 0.55, minZ: cz - 0.55, maxZ: cz + 0.55 });
    // Plates.
    const pl = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 14)), mat('#f5f0e6')); pl.position.set(KX + cx - 0.25, 0.81, cz + 0.1); group.add(pl);
    const food = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.11, 0.12, 0.06, 12)), mat('#d2541c')); food.position.set(KX + cx - 0.25, 0.84, cz + 0.1); group.add(food);
  };
  const chairAt = (cx: number, cz: number, face: number) => {
    const g = new THREE.Group(); g.position.set(KX + cx, 0, cz); g.rotation.y = face;
    const seat = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.46, 0.06, 0.46)), mat('#2f5d8a')); seat.position.y = 0.45; g.add(seat);
    const back = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.46, 0.5, 0.06)), mat('#2f5d8a')); back.position.set(0, 0.72, -0.2); g.add(back);
    for (const sx of [-0.19, 0.19]) for (const sz of [-0.19, 0.19]) { const l = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.05, 0.45, 0.05)), mat('#444')); l.position.set(sx, 0.22, sz); g.add(l); }
    group.add(g);
  };
  const T: Array<[number, number]> = [[-3.2, 1.7], [-0.2, 2.0], [3.2, 1.5], [-1.9, 3.2]];
  for (const [tx, tz] of T) { tableAt(tx, tz); chairAt(tx - 0.95, tz, Math.PI / 2); chairAt(tx + 0.95, tz, -Math.PI / 2); }

  // Radio on the counter, speaker duct-taped like at the cypher.
  const radio = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.5, 0.28, 0.2)), mat('#222')); radio.position.set(KX + 2.8, 1.22, -1.0); group.add(radio);
  // Windows (east wall).
  for (const wz of [-2.2, 0.8]) { const w = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(1.4, 1.2)), bin.add(new THREE.MeshBasicMaterial({ color: '#ffcf8a' }))); w.position.set(KX + W - 0.01, 1.7, wz); w.rotation.y = -Math.PI / 2; group.add(w); }
  // Poster on the west wall: a cypher flyer.
  const flyer = canvasTex(bin, 128, 192, (g) => { g.fillStyle = '#111'; g.fillRect(0, 0, 128, 192); g.fillStyle = '#ffb800'; g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillText('FRIDAY', 64, 52); g.fillText('CYPHER', 64, 82); g.fillStyle = '#fff'; g.font = '14px system-ui'; g.fillText("MAMA'S · 9PM", 64, 120); g.fillText('BRING A VERSE', 64, 142); });
  const poster = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(0.7, 1.05)), bin.add(new THREE.MeshBasicMaterial({ map: flyer })));
  poster.position.set(KX - W + 0.02, 1.7, 1.2); poster.rotation.y = Math.PI / 2; group.add(poster);

  // Warm bulbs.
  const lights: THREE.PointLight[] = [];
  for (const [lx, lz] of [[-3, 0.5], [1, 0.8], [3, -2.2]] as Array<[number, number]>) {
    const bulb = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.12, 10, 8)), bin.add(new THREE.MeshBasicMaterial({ color: '#ffe3a0' })));
    bulb.position.set(KX + lx, 2.9, lz); group.add(bulb);
    const pl = new THREE.PointLight('#ffd9a0', 0, 12, 1.6); pl.position.set(KX + lx, 2.7, lz); group.add(pl); lights.push(pl);
  }

  // People.
  const npcs: Npc[] = [];
  const person = (id: string, who: string, look: Look, x: number, z: number, rot: number, sit = false, work = false) => {
    const model = buildPlayer(look, bin);
    model.group.position.set(KX + x, sit ? 0.42 : 0, z); model.group.rotation.y = rot;
    if (sit) { model.legL.rotation.x = -1.45; model.legR.rotation.x = -1.45; }
    group.add(model.group);
    npcs.push({ id, who, model, x: KX + x, z, rot, sit, work, baseY: sit ? 0.42 : 0 });
  };
  const mama: Look = { ...lookFor('mama-esi', 'female'), hair: 'bun' as Look['hair'], skin: 'deep' as Look['skin'], outfit: { ...defaultLook('femme').outfit, top: { ...(defaultLook('femme').outfit.top as object), c1: '#c2410c', c2: '#f4e3b0' } as never } };
  person('esi', 'Mama Esi', mama, 0.5, -2.35, 0, false, true);
  const static_: Look = { ...lookFor('static-nii', 'male'), hair: 'twists' as Look['hair'], outfit: { ...defaultLook('masc').outfit, top: { ...(defaultLook('masc').outfit.top as object), c1: '#1f2937', c2: '#ffb800' } as never } };
  person('static', 'Static', static_, 4.1, 1.5, -Math.PI / 2, true);
  person('cust1', 'Customer', lookFor('cust-a'), -4.15, 1.7, Math.PI / 2, true);
  person('cust2', 'Customer', lookFor('cust-b', 'female'), -2.25, 1.7, -Math.PI / 2, true);
  person('cust3', 'Customer', lookFor('cust-c'), 0.75, 2.0, -Math.PI / 2, true);
  person('cust4', 'Customer', lookFor('cust-d', 'female'), -0.8, 3.2, Math.PI / 2, true);

  // People who turn up looking for you; shown only when the story sends them.
  for (const id of ['fiifi', 'kj', 'ankh', 'adwoa', 'afia', 'selasi', 'efua', 'mimi', 'moses', 'radiok', 'mum']) {
    person(id, id, lookFor(`visitor-${id}`, ['adwoa', 'afia', 'efua', 'mimi', 'mum'].includes(id) ? 'female' : 'male'), 3.7, 3.0, Math.PI);
    npcs[npcs.length - 1].model.group.visible = false;
    npcs[npcs.length - 1].visitor = true;
  }

  const spots: Spot[] = [
    { id: 'exit', x: KX, z: 3.5, label: 'Leave', reach: 1.5, kind: 'exit' },
    { id: 'counter', x: KX - 0.5, z: -0.1, label: "Order food", reach: 1.9, kind: 'counter' },
    { id: 'radio', x: KX + 2.8, z: -0.1, label: 'Turn the radio', reach: 1.4, kind: 'radio' },
  ];
  return { id: 'kitchen', name: "Mama's Kitchen", x0: KX, where: 'kitchen', placeId: 'food', halfW: W, halfD: D, group, lights, solids, bounds: { minX: KX - W, maxX: KX + W, minZ: -D, maxZ: D }, spawn: { x: KX, z: 3.0, rot: Math.PI }, spots, npcs, walls };
}

// ─── STUDIO 9 ──────────────────────────────────────────────────────────────
export function buildStudio(bin: Bin): Interior {
  const group = new THREE.Group();
  const solids: Box[] = [];
  const X = SX;
  const mat = (c: string, emissive?: string) => bin.add(new THREE.MeshLambertMaterial({ color: c, emissive: emissive ?? '#000000' }));
  const add = (x0: number, x1: number, z0: number, z1: number, h: number, c: string, y0 = 0, solid = true, emissive?: string) => {
    const m = new THREE.Mesh(bin.add(new THREE.BoxGeometry(x1 - x0, h, z1 - z0)), mat(c, emissive));
    m.position.set(X + (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
    group.add(m);
    if (solid) solids.push({ minX: X + x0, maxX: X + x1, minZ: z0, maxZ: z1 });
    return m;
  };
  const W = 6, D = 4.5, H = 3.4;
  const walls: Array<[THREE.Mesh, 'N' | 'S' | 'E' | 'W']> = [];

  // Floor: dark wood with a rug in the lounge.
  const floor = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(W * 2, D * 2)), mat('#3a2f2a'));
  floor.rotation.x = -Math.PI / 2; floor.position.set(X, 0.01, 0); group.add(floor);
  const rug = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(3.4, 2.2)), mat('#4a2a5a'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(X - 3.4, 0.02, 2.4); group.add(rug);

  // Walls (door in the south wall).
  walls.push([add(-W - 0.3, W + 0.3, -D - 0.3, -D, H, '#2b2d38'), 'N']);
  walls.push([add(-W - 0.3, -W, -D, D + 0.3, H, '#2f3140'), 'W']);
  walls.push([add(W, W + 0.3, -D, D + 0.3, H, '#2f3140'), 'E']);
  walls.push([add(-W - 0.3, -1, D, D + 0.3, H, '#2b2d38'), 'S']);
  walls.push([add(1, W + 0.3, D, D + 0.3, H, '#2b2d38'), 'S']);
  walls.push([add(-1, 1, D, D + 0.3, 0.9, '#2b2d38', 2.5, false), 'S']);
  // Acoustic panels.
  for (let i = 0; i < 6; i++) add(-5 + i * 1.8, -4.1 + i * 1.8, -D + 0.01, -D + 0.14, 1.6, i % 2 ? '#5a3d6e' : '#3d5a6e', 1.2, false);

  // Neon sign.
  const sign = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d')!;
    g.fillStyle = '#0d0d12'; g.fillRect(0, 0, 512, 160); g.shadowColor = '#ffb800'; g.shadowBlur = 18; g.fillStyle = '#ffd25a'; g.font = 'bold 84px system-ui'; g.textAlign = 'center'; g.fillText('STUDIO 9', 256, 104);
    const t = bin.add(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const sg = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(3.4, 1.06)), bin.add(new THREE.MeshBasicMaterial({ map: sign })));
  sg.position.set(X + 0.5, 2.6, -D + 0.16); group.add(sg);

  // Recording booth, north-west: glass on two sides, a mic, a stool.
  add(-5.9, -2.7, -4.4, -4.3, 2.4, '#1c1e27', 0, true);
  add(-5.9, -5.8, -4.4, -1.2, 2.4, '#1c1e27', 0, true);
  add(-5.8, -2.7, -1.3, -1.2, 1.0, '#1c1e27', 0, true);
  const glass = new THREE.Mesh(bin.add(new THREE.BoxGeometry(3.1, 1.4, 0.05)), bin.add(new THREE.MeshLambertMaterial({ color: '#9fd0ff', transparent: true, opacity: 0.28 })));
  glass.position.set(X - 4.25, 1.7, -1.25); group.add(glass);
  const glassE = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.05, 2.4, 2.6)), bin.add(new THREE.MeshLambertMaterial({ color: '#9fd0ff', transparent: true, opacity: 0.28 })));
  glassE.position.set(X - 2.7, 1.2, -2.85); group.add(glassE);
  const stand = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8)), mat('#111')); stand.position.set(X - 4.2, 0.75, -2.9); group.add(stand);
  const mic = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.1, 12, 10)), mat('#c0c0c8')); mic.position.set(X - 4.2, 1.55, -2.9); group.add(mic);
  const pop = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 18)), mat('#222')); pop.rotation.x = Math.PI / 2; pop.position.set(X - 4.2, 1.55, -2.72); group.add(pop);
  const light = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.5, 0.12, 0.05)), bin.add(new THREE.MeshBasicMaterial({ color: '#ff3b30' }))); light.position.set(X - 2.75, 2.2, -1.6); group.add(light);

  // Mixing desk, centre-north, with monitors and speakers.
  add(-2.0, 2.0, -3.2, -2.1, 0.85, '#15161c');
  const faders = canvasTex(bin, 256, 64, (g) => { g.fillStyle = '#20222b'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 16; i++) { g.fillStyle = '#6b6f80'; g.fillRect(8 + i * 15, 8, 6, 48); g.fillStyle = i % 3 ? '#ffb800' : '#2ed573'; g.fillRect(6 + i * 15, 12 + (i * 7) % 28, 10, 8); } });
  const top = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(4.0, 1.0)), bin.add(new THREE.MeshBasicMaterial({ map: faders })));
  top.rotation.x = -Math.PI / 2 + 0.2; top.position.set(X, 0.88, -2.65); group.add(top);
  for (const sx of [-2.9, 2.9]) { add(sx - 0.4, sx + 0.4, -3.9, -3.4, 1.3, '#101116', 0.9); const cone = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16)), mat('#2a2c35')); cone.rotation.x = Math.PI / 2; cone.position.set(X + sx, 1.5, -3.38); group.add(cone); }
  add(-0.9, 0.9, -3.5, -3.45, 0.55, '#0b0b10', 1.2, false, '#12304a');

  // Producer workstation, north-east: desk, computer, keys.
  add(2.6, 5.8, -4.2, -3.2, 0.78, '#6b4a2a');
  add(3.4, 4.6, -4.0, -3.9, 0.6, '#0b0b10', 0.9, false, '#1b4a6e');
  add(3.0, 5.2, -3.6, -3.3, 0.06, '#1a1a1f', 0.8, false);
  // Beat station, east wall: pads and a drum machine on a stand.
  add(5.0, 5.9, -1.6, 0.6, 0.9, '#2a2c35');
  for (let i = 0; i < 8; i++) add(5.1 + (i % 2) * 0.35, 5.4 + (i % 2) * 0.35, -1.4 + Math.floor(i / 2) * 0.5, -1.1 + Math.floor(i / 2) * 0.5, 0.05, ['#ff4757', '#ffb800', '#2ed573', '#4da3ff'][i % 4], 0.92, false, '#222');
  const kb = canvasTex(bin, 256, 48, (g) => { g.fillStyle = '#eee'; g.fillRect(0, 0, 256, 48); g.fillStyle = '#111'; for (let i = 0; i < 16; i++) { if (i % 7 !== 2 && i % 7 !== 6) g.fillRect(i * 16 + 10, 0, 9, 28); } });
  const keys = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(1.6, 0.3)), bin.add(new THREE.MeshBasicMaterial({ map: kb }))); keys.rotation.x = -Math.PI / 2; keys.position.set(X + 5.45, 0.93, 1.5); group.add(keys);
  add(5.1, 5.9, 0.9, 2.2, 0.9, '#1f2128');

  // Lounge: couch, low table, a guitar on a stand, a plant.
  add(-5.8, -4.9, 1.2, 3.6, 0.5, '#3b2f5a'); add(-5.8, -5.5, 1.2, 3.6, 0.9, '#3b2f5a');
  add(-3.3, -2.3, 2.0, 2.8, 0.35, '#8a5a30');
  const gtr = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.4, 0.8, 0.12)), mat('#b4562b')); gtr.position.set(X + 1.5, 0.7, 3.6); gtr.rotation.z = 0.15; group.add(gtr);
  const neck = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.07, 0.7, 0.05)), mat('#2a1a10')); neck.position.set(X + 1.58, 1.3, 3.6); neck.rotation.z = 0.15; group.add(neck);
  const plant = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.5, 10, 8)), mat('#2f7a3b')); plant.position.set(X + 3.8, 0.9, 3.7); group.add(plant);
  add(3.6, 4.0, 3.5, 3.9, 0.45, '#8a4b2a', 0, true);
  // Camera tripod for video shoots.
  const tri = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(0.03, 0.06, 1.5, 8)), mat('#111')); tri.position.set(X + 3.0, 0.75, 0.9); group.add(tri);
  const cam = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.34, 0.22, 0.4)), mat('#222')); cam.position.set(X + 3.0, 1.6, 0.9); group.add(cam);
  solids.push({ minX: X + 2.9, maxX: X + 3.1, minZ: 0.8, maxZ: 1.0 });
  // Cables.
  for (let i = 0; i < 3; i++) { const cb = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(0.06, 2.4)), mat('#0a0a0a')); cb.rotation.x = -Math.PI / 2; cb.position.set(X - 1 + i * 1.1, 0.025, -1.2); cb.rotation.z = 0.3 * (i - 1); group.add(cb); }

  const lights: THREE.PointLight[] = [];
  for (const [lx, lz, col] of [[-3.5, -2.5, '#ff5a4a'], [0, -1.5, '#ffd9a0'], [4, 0, '#6aa8ff'], [-3.5, 2.5, '#c18bff']] as Array<[number, number, string]>) {
    const pl = new THREE.PointLight(col, 0, 12, 1.6); pl.position.set(X + lx, 2.7, lz); group.add(pl); lights.push(pl);
    const bulb = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.5, 0.06, 0.12)), bin.add(new THREE.MeshBasicMaterial({ color: col }))); bulb.position.set(X + lx, 3.2, lz); group.add(bulb);
  }

  const npcs: Npc[] = [];
  const person = (id: string, who: string, look: Look, x: number, z: number, rot: number, sit = false, work = false, vis = false) => {
    const model = buildPlayer(look, bin);
    model.group.position.set(X + x, sit ? 0.42 : 0, z); model.group.rotation.y = rot;
    if (sit) { model.legL.rotation.x = -1.45; model.legR.rotation.x = -1.45; }
    group.add(model.group);
    npcs.push({ id, who, model, x: X + x, z, rot, sit, work, baseY: sit ? 0.42 : 0, visitor: vis });
    if (vis) model.group.visible = false;
  };
  const ankh: Look = { ...lookFor('ankh-studio', 'male'), hair: 'bald' as Look['hair'], skin: 'ebony' as Look['skin'], outfit: { ...defaultLook('masc').outfit, top: { ...(defaultLook('masc').outfit.top as object), c1: '#3a3a44', c2: '#ffb800' } as never } };
  person('ankh', 'Ankh', ankh, 0, -1.7, 0, false, true);
  person('eng', 'Engineer', lookFor('engineer-9', 'male'), 4.2, -2.7, Math.PI, true);
  person('artist', 'Artist', lookFor('artist-lounge', 'female'), -5.2, 2.4, Math.PI / 2, true);
  for (const id of ['static', 'adwoa', 'selasi', 'efua', 'fiifi', 'kj', 'afia', 'mimi', 'moses', 'radiok', 'esi']) {
    person(id, id, lookFor(`visitor-${id}`, ['adwoa', 'afia', 'efua', 'mimi', 'esi'].includes(id) ? 'female' : 'male'), -1.5, 3.2, Math.PI, false, false, true);
  }

  const spots: Spot[] = [
    { id: 'exit', x: X, z: 4.0, label: 'Leave', reach: 1.5, kind: 'exit' },
    { id: 'mic', x: X - 4.2, z: -2.2, label: 'Record a song', reach: 1.7, kind: 'act', act: 'record' },
    { id: 'desk', x: X, z: -1.3, label: 'Mix a song', reach: 1.6, kind: 'act', act: 'mix' },
    { id: 'pads', x: X + 4.4, z: -0.5, label: 'Make a beat', reach: 1.6, kind: 'act', act: 'beats' },
    { id: 'pc', x: X + 4.2, z: -2.6, label: 'Write lyrics · projects', reach: 1.6, kind: 'act', act: 'write' },
    { id: 'cam', x: X + 2.2, z: 0.9, label: 'Shoot a video', reach: 1.4, kind: 'act', act: 'video' },
  ];
  return { id: 'studio', name: 'Studio 9', x0: X, where: 'studio', placeId: 'studio', halfW: W, halfD: D, group, lights, solids, bounds: { minX: X - W, maxX: X + W, minZ: -D, maxZ: D }, spawn: { x: X, z: 3.4, rot: Math.PI }, spots, npcs, walls };
}

// ─── GENERIC ROOMS: the label, your place, the radio station ───────────────
type B = [number, number, number, number, number, string, number?, boolean?, string?];
interface RoomSpec {
  id: string; name: string; x0: number; placeId: string; W: number; D: number;
  wall: string; floor: string; rug?: [number, number, number, number, string]; sign: string; signColor: string;
  boxes: B[]; npcs: Array<{ id: string; who: string; seed: string; female?: boolean; x: number; z: number; rot: number; sit?: boolean; work?: boolean; hair?: string; skin?: string }>;
  back?: string;
  visitors: string[]; spots: Array<Omit<Spot, 'x'> & { x: number }>; lights: Array<[number, number, string]>;
}
function buildRoom(bin: Bin, r: RoomSpec): Interior {
  const group = new THREE.Group();
  const solids: Box[] = [];
  const X = r.x0, W = r.W, D = r.D, H = 3.3;
  const mat = (c: string, e?: string) => bin.add(new THREE.MeshLambertMaterial({ color: c, emissive: e ?? '#000000' }));
  const add = (x0: number, x1: number, z0: number, z1: number, h: number, c: string, y0 = 0, solid = true, e?: string) => {
    const m = new THREE.Mesh(bin.add(new THREE.BoxGeometry(x1 - x0, h, z1 - z0)), mat(c, e));
    m.position.set(X + (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); group.add(m);
    if (solid) solids.push({ minX: X + x0, maxX: X + x1, minZ: z0, maxZ: z1 });
    return m;
  };
  const floor = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(W * 2, D * 2)), mat(r.floor)); floor.rotation.x = -Math.PI / 2; floor.position.set(X, 0.01, 0); group.add(floor);
  if (r.rug) { const [rx, rz, rw, rd, rc] = r.rug; const rg = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(rw, rd)), mat(rc)); rg.rotation.x = -Math.PI / 2; rg.position.set(X + rx, 0.02, rz); group.add(rg); }
  const walls: Array<[THREE.Mesh, 'N' | 'S' | 'E' | 'W']> = [];
  walls.push([add(-W - 0.3, W + 0.3, -D - 0.3, -D, H, r.wall), 'N']);
  walls.push([add(-W - 0.3, -W, -D, D + 0.3, H, r.wall), 'W']);
  walls.push([add(W, W + 0.3, -D, D + 0.3, H, r.wall), 'E']);
  walls.push([add(-W - 0.3, -1, D, D + 0.3, H, r.wall), 'S']);
  walls.push([add(1, W + 0.3, D, D + 0.3, H, r.wall), 'S']);
  walls.push([add(-1, 1, D, D + 0.3, 0.9, r.wall, 2.4, false), 'S']);
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#0d0d12'; g.fillRect(0, 0, 512, 128); g.shadowColor = r.signColor; g.shadowBlur = 16; g.fillStyle = r.signColor; g.font = 'bold 64px system-ui'; g.textAlign = 'center'; g.fillText(r.sign, 256, 88);
  const tex = bin.add(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
  const sg = new THREE.Mesh(bin.add(new THREE.PlaneGeometry(3.6, 0.9)), bin.add(new THREE.MeshBasicMaterial({ map: tex }))); sg.position.set(X, 2.5, -D + 0.16); group.add(sg);
  for (const b of r.boxes) add(b[0], b[1], b[2], b[3], b[4], b[5], b[6] ?? 0, b[7] ?? true, b[8]);
  const lights: THREE.PointLight[] = [];
  for (const [lx, lz, col] of r.lights) {
    const pl = new THREE.PointLight(col, 0, 12, 1.6); pl.position.set(X + lx, 2.7, lz); group.add(pl); lights.push(pl);
    const bulb = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.11, 10, 8)), bin.add(new THREE.MeshBasicMaterial({ color: col }))); bulb.position.set(X + lx, 3.0, lz); group.add(bulb);
  }
  const npcs: Npc[] = [];
  const put = (id: string, who: string, look: Look, x: number, z: number, rot: number, sit: boolean, work: boolean, visitor: boolean) => {
    const model = buildPlayer(look, bin);
    model.group.position.set(X + x, sit ? 0.42 : 0, z); model.group.rotation.y = rot;
    if (sit) { model.legL.rotation.x = -1.45; model.legR.rotation.x = -1.45; }
    group.add(model.group);
    npcs.push({ id, who, model, x: X + x, z, rot, sit, work, baseY: sit ? 0.42 : 0, visitor });
    if (visitor) model.group.visible = false;
  };
  for (const n of r.npcs) {
    const base = lookFor(n.seed, n.female ? 'female' : 'male');
    put(n.id, n.who, { ...base, ...(n.hair ? { hair: n.hair as Look['hair'] } : {}), ...(n.skin ? { skin: n.skin as Look['skin'] } : {}) }, n.x, n.z, n.rot, !!n.sit, !!n.work, false);
  }
  for (const id of r.visitors) put(id, id, lookFor(`visitor-${id}`, ['adwoa', 'afia', 'efua', 'mimi', 'esi'].includes(id) ? 'female' : 'male'), 1.8, D - 1.2, Math.PI, false, false, true);
  const spots: Spot[] = r.spots.map((sp) => ({ ...sp, x: X + sp.x }));
  spots.push(r.back ? { id: 'exit', x: X, z: D - 0.5, label: 'Back to the lobby', reach: 1.5, kind: 'act', go: r.back } : { id: 'exit', x: X, z: D - 0.5, label: 'Leave', reach: 1.5, kind: 'exit' });
  return { id: r.id, name: r.name, x0: X, where: r.id, placeId: r.placeId, halfW: W, halfD: D, group, lights, solids, bounds: { minX: X - W, maxX: X + W, minZ: -D, maxZ: D }, spawn: { x: X, z: D - 1.1, rot: Math.PI }, spots, npcs, walls };
}

export const LABEL_X = 2200, CRIB_X = 2300, RADIO_X = 2400;
const ALL_VISITORS = ['static', 'adwoa', 'selasi', 'efua', 'fiifi', 'kj', 'afia', 'mimi', 'moses', 'radiok', 'esi', 'ankh'];

export const buildLabel = (bin: Bin) => buildRoom(bin, {
  id: 'label', name: 'Label HQ', x0: LABEL_X, placeId: 'label', W: 6, D: 4.5, wall: '#e9e6df', floor: '#4a4f5c', rug: [0, -0.5, 4.5, 2.6, '#7a1f2b'], sign: 'LABEL HQ', signColor: '#ffd666',
  boxes: [
    [-3, 3, -3.6, -2.8, 0.9, '#2b2d38'],                     // reception desk
    [-1.5, 1.5, -0.2, 1.2, 0.82, '#5b3a22'],                  // boardroom table
    [-6, -5.6, -4.4, 4.4, 0.05, '#e9e6df', 0, false],
    [4.2, 5.8, -4.3, -3.2, 2.0, '#1f2128'],                  // trophy cabinet
    [4.3, 5.7, -4.2, -3.3, 0.06, '#ffd666', 2.0, false, '#aa8a20'],
    [-5.8, -4.6, -1.5, 0.5, 0.5, '#2f5d8a'],                  // waiting sofa
    [3.6, 5.8, 1.0, 3.6, 0.04, '#222', 0, false],
    [-5.6, -3.4, -4.4, -3.8, 2.6, '#cdd0d8', 0, true],        // Efua's glass office wall
    [-1.2, -0.4, -0.4, 0.2, 0.5, '#2f2f38', 0, false], [0.4, 1.2, -0.4, 0.2, 0.5, '#2f2f38', 0, false],
    [-0.6, 0.6, 3.0, 3.6, 0.5, '#2e7d4f'],                     // plant box
  ],
  npcs: [
    { id: 'efua', who: 'Efua Mensah-Quartey', seed: 'efua-ceo', female: true, x: -4.5, z: -3.0, rot: 0, hair: 'bun', skin: 'warm' },
    { id: 'recep', who: 'Receptionist', seed: 'reception-9', female: true, x: 0, z: -3.2, rot: 0, work: true },
    { id: 'exec', who: 'Exec', seed: 'label-exec', x: 4.8, z: 0.2, rot: -Math.PI / 2 },
  ],
  visitors: ALL_VISITORS.filter((v) => v !== 'efua'),
  spots: [
    { id: 'rec', x: 0, z: -1.9, label: 'Label desk', reach: 1.8, kind: 'act', act: 'screen:label' },
    { id: 'board', x: 0, z: 1.9, label: 'Team · board room', reach: 1.7, kind: 'act', act: 'screen:team' },
    { id: 'trophy', x: 4.2, z: -2.4, label: 'Trophy room', reach: 1.6, kind: 'act', act: 'screen:trophy_room' },
  ],
  lights: [[-3, 0, '#fff1d0'], [3, 0, '#fff1d0'], [0, -2.5, '#ffd9a0']],
});

export const buildCrib = (bin: Bin) => buildRoom(bin, {
  id: 'crib', name: 'Your place', x0: CRIB_X, placeId: 'crib', W: 5, D: 4, wall: '#cfc7b8', floor: '#8a6a4a', rug: [-1.5, 0.8, 3, 2, '#3a5a7a'], sign: 'HOME', signColor: '#9ad0ff',
  boxes: [
    [-4.8, -2.4, -3.9, -2.1, 0.5, '#4a4f9a'],                  // bed
    [-4.8, -4.3, -3.9, -2.1, 1.1, '#3a3d7a'],
    [-4.6, -3.0, -3.8, -3.0, 0.15, '#e8e8f0', 0.5, false],
    [2.4, 4.8, -3.9, -3.2, 2.2, '#6a4a2e'],                    // wardrobe
    [-1.0, 1.6, -3.9, -3.3, 0.8, '#d8c8a0'],                   // desk
    [-0.4, 0.6, -3.8, -3.7, 0.5, '#0b0b10', 0.9, false, '#1b4a6e'],
    [-4.8, -2.4, 1.0, 2.0, 0.55, '#2f2f38'],                   // couch
    [-4.8, -4.5, 1.0, 2.0, 0.95, '#2f2f38'],
    [-4.8, -3.8, 2.6, 3.0, 0.6, '#111', 0, true, '#0a1d3a'],   // TV unit (TV)
    [3.0, 4.8, 0.0, 1.0, 0.9, '#8a8a92'],                      // kitchenette
    [3.0, 4.8, 1.0, 1.5, 0.05, '#ccc', 0.9, false],
    [0.8, 1.7, 2.8, 3.6, 0.45, '#8a4b2a'],
  ],
  npcs: [],
  visitors: ALL_VISITORS,
  spots: [
    { id: 'bed', x: -2.5, z: -2.2, label: 'Rest · home life', reach: 1.6, kind: 'act', act: 'screen:lifestyle' },
    { id: 'wardrobe', x: 3.6, z: -2.6, label: 'Wardrobe · style', reach: 1.6, kind: 'act', act: 'screen:style' },
    { id: 'desk', x: 0.3, z: -2.5, label: 'Laptop · messages', reach: 1.6, kind: 'act', act: 'screen:pingchat' },
    { id: 'tv', x: -3.6, z: 2.1, label: 'Watch TV · streams', reach: 1.6, kind: 'act', act: 'screen:streams' },
  ],
  lights: [[-2.5, -1.5, '#ffe3b0'], [2.5, 1.5, '#fff1d0']],
});

export const buildRadio = (bin: Bin) => buildRoom(bin, {
  id: 'radio', name: 'HOT 101.9', x0: RADIO_X, placeId: 'radio', W: 5.5, D: 4, wall: '#1d2b44', floor: '#2a2a33', rug: [0, 0.5, 3.4, 2, '#162036'], sign: 'HOT 101.9', signColor: '#4da3ff',
  boxes: [
    [-2.2, 2.2, -3.0, -1.6, 0.85, '#15161c'],                  // broadcast desk
    [-0.4, 0.4, -3.0, -2.9, 0.6, '#0b0b10', 1.1, false, '#1b4a6e'],
    [-5.3, -3.0, -3.9, -3.0, 2.2, '#0f1016', 0, true],           // record shelves
    [3.2, 5.3, -3.9, -3.0, 2.0, '#2a2c35'],                      // gear rack
    [-5.3, -3.2, 0.5, 1.5, 0.5, '#6a2a2a'],                      // guest sofa
    [-0.3, 0.3, 1.0, 1.6, 0.35, '#8a5a30'],
    [2.0, 2.5, 2.5, 3.0, 0.1, '#ff3b30', 2.3, false, '#ff3b30'], // ON AIR light
  ],
  npcs: [
    { id: 'radiok', who: 'Radio K', seed: 'radio-k', x: 0, z: -1.2, rot: 0, hair: 'buzz', skin: 'deep' },
    { id: 'prod', who: 'Producer', seed: 'radio-prod', female: true, x: 3.5, z: -2.2, rot: Math.PI, sit: true },
  ],
  visitors: ALL_VISITORS.filter((v) => v !== 'radiok'),
  spots: [
    { id: 'mic', x: 0, z: -0.4, label: 'On air · interviews', reach: 1.8, kind: 'act', act: 'screen:interviews' },
    { id: 'records', x: -4.1, z: -2.3, label: 'The charts', reach: 1.7, kind: 'act', act: 'screen:charts' },
  ],
  lights: [[-3, -1, '#6aa8ff'], [2, 0, '#c18bff'], [0, 2, '#fff1d0']],
});

// ─── more rooms: the stage, bank, gym, Drip & Ink ──────────────────────────
export const STAGE_X = 2500, BANK_X = 2600, GYM_X = 2700, DRIP_X = 2800;

export const buildStage = (bin: Bin) => buildRoom(bin, {
  id: 'stage', name: 'The Stage', x0: STAGE_X, placeId: 'stage', W: 7, D: 5, wall: '#1a1426', floor: '#241c33', rug: [0, -2.6, 8, 3, '#3a2a5a'], sign: 'THE STAGE', signColor: '#b57bff',
  boxes: [
    [-6, 6, -4.9, -3.0, 0.7, '#2a2038'],                       // stage
    [-6.8, -5.6, -4.9, -3.2, 1.8, '#0f0b17'], [5.6, 6.8, -4.9, -3.2, 1.8, '#0f0b17'], // speakers
    [-0.1, 0.1, -3.9, -3.7, 1.5, '#333', 0.7, false],         // mic stand
    [-6.8, -4.8, 1.0, 2.4, 0.95, '#3a2a2a'],                   // bar
    [4.6, 6.8, 1.0, 2.4, 0.95, '#3a2a2a'],
    [-2.0, 2.0, 3.5, 4.0, 0.6, '#222'],
  ],
  npcs: [
    { id: 'promoter', who: 'Promoter', seed: 'stage-promo', x: -5.3, z: 0.3, rot: 0 },
    { id: 'bartender', who: 'Bartender', seed: 'stage-bar', female: true, x: 5.8, z: 0.3, rot: 0, work: true },
  ],
  visitors: ALL_VISITORS,
  spots: [
    { id: 'booking', x: 0, z: -2.4, label: 'Step on stage · shows', reach: 2.0, kind: 'act', act: 'screen:shows' },
  ],
  lights: [[-4, -3, '#b57bff'], [4, -3, '#ff4fa0'], [0, 1.5, '#fff1d0']],
});

export const buildBank = (bin: Bin) => buildRoom(bin, {
  id: 'bank', name: 'First Capital', x0: BANK_X, placeId: 'bank', W: 5.5, D: 4, wall: '#e4e8e2', floor: '#3b4a3f', rug: [0, 0, 4, 2, '#1f5a3a'], sign: 'FIRST CAPITAL', signColor: '#2ed573',
  boxes: [
    [-4.5, 4.5, -3.6, -2.9, 1.0, '#2c3a30'],                   // teller counter
    [-1.4, 1.4, -2.9, -2.8, 1.7, '#cde8d6', 0.0, false],
    [3.5, 5.3, 0.6, 2.4, 0.8, '#6a4a2e'],                      // advisor desk
    [-5.3, -3.9, 1.0, 3.0, 0.45, '#2f2f38'],
  ],
  npcs: [
    { id: 'teller', who: 'Teller', seed: 'bank-teller', female: true, x: -2.5, z: -3.3, rot: 0, work: true },
    { id: 'advisor', who: 'Advisor', seed: 'bank-adv', x: 4.4, z: 0.2, rot: Math.PI, sit: true },
  ],
  visitors: ALL_VISITORS,
  spots: [{ id: 'invest', x: 0, z: -2.0, label: 'Teller · investments', reach: 1.8, kind: 'act', act: 'screen:investments' }],
  lights: [[-3, 0, '#fff7e6'], [3, 0, '#fff7e6']],
});

export const buildGym = (bin: Bin) => buildRoom(bin, {
  id: 'gym', name: 'Iron House', x0: GYM_X, placeId: 'gym', W: 6, D: 4.5, wall: '#2b2220', floor: '#2a2a2e', rug: [0, 0.5, 5, 3, '#4a1f14'], sign: 'IRON HOUSE', signColor: '#ff7a2f',
  boxes: [
    [-5.6, -3.4, -4.3, -3.4, 1.0, '#555'], [-2.6, -0.4, -4.3, -3.4, 1.0, '#555'],  // racks
    [3.0, 5.6, -4.3, -3.2, 0.9, '#444'],                        // treadmills
    [-1.2, 1.2, -0.2, 0.4, 0.4, '#8a2a1a'],                     // bench
    [4.0, 5.8, 1.4, 3.8, 0.1, '#222', 0, false],
    [-5.8, -5.5, -3, 3, 2.4, '#bcc', 0, false, '#223'],         // mirror strip
  ],
  npcs: [{ id: 'coach', who: 'Coach', seed: 'gym-coach', x: 1.5, z: 1.5, rot: Math.PI, hair: 'buzz', skin: 'deep' }],
  visitors: ALL_VISITORS,
  spots: [{ id: 'train', x: 0, z: 1.0, label: 'Train · vocal coach', reach: 2.0, kind: 'act', act: 'screen:training' }],
  lights: [[-3, 0, '#ffd2a0'], [3, 0, '#ffd2a0']],
});

export const buildDrip = (bin: Bin) => buildRoom(bin, {
  id: 'drip', name: 'Drip & Ink', x0: DRIP_X, placeId: 'drip', W: 5, D: 4, wall: '#2a1d28', floor: '#3a3036', rug: [0, 0.5, 3, 2, '#7a2a5a'], sign: 'DRIP & INK', signColor: '#ff6fa8',
  boxes: [
    [-4.8, -3.0, -3.9, -3.3, 2.0, '#4a2f45'], [-2.6, -0.8, -3.9, -3.3, 2.0, '#4a2f45'], // clothes racks
    [2.4, 4.8, -3.9, -3.2, 0.9, '#222'],                          // counter
    [3.2, 4.4, 0.8, 1.8, 0.5, '#8a1a2a'],                         // barber chair
    [-4.8, -3.8, 1.0, 2.6, 0.5, '#2f2f38'],
  ],
  npcs: [
    { id: 'barber', who: 'Barber', seed: 'drip-barber', x: 2.4, z: 1.3, rot: Math.PI / 2, hair: 'buzz' },
    { id: 'clerk', who: 'Stylist', seed: 'drip-clerk', female: true, x: 3.6, z: -2.6, rot: 0, work: true },
  ],
  visitors: ALL_VISITORS,
  spots: [{ id: 'style', x: 0, z: -2.4, label: 'Racks · style', reach: 2.0, kind: 'act', act: 'screen:style' }],
  lights: [[-2.5, -1, '#ff9ad0'], [2.5, 1, '#fff1d0']],
});

// ─── apartments: the lobby and a flat ──────────────────────────────────────
export const AIR_X = 3100;
export const buildAirport = (bin: Bin) => buildRoom(bin, {
  id: 'airport', name: 'Gold Coast Airport', x0: AIR_X, placeId: 'airport', W: 7, D: 5, wall: '#dfe6ee', floor: '#8a95a5', rug: [0, 0.5, 6, 3, '#2f4a6e'], sign: 'DEPARTURES', signColor: '#e599f7',
  boxes: [
    [-6.5, -2.5, -4.6, -3.7, 1.0, '#2c3a52'], [-1.5, 2.5, -4.6, -3.7, 1.0, '#2c3a52'],     // check-in desks
    [3.5, 6.6, -4.9, -4.7, 2.4, '#0b0b10', 0.4, false, '#1b4a6e'],                       // departures board
    [-6.5, -4.5, 1.2, 3.8, 0.45, '#2f5d8a'], [4.5, 6.5, 1.2, 3.8, 0.45, '#2f5d8a'],       // seating
    [-0.6, 0.6, 3.0, 3.6, 0.5, '#2e7d4f'],
  ],
  npcs: [
    { id: 'agent1', who: 'Check-in', seed: 'air-1', female: true, x: -4.5, z: -4.1, rot: 0, work: true },
    { id: 'agent2', who: 'Check-in', seed: 'air-2', x: 0.5, z: -4.1, rot: 0, work: true },
    { id: 'guard', who: 'Security', seed: 'air-3', x: 5.0, z: 0.2, rot: -Math.PI / 2 },
  ],
  visitors: ALL_VISITORS,
  spots: [
    { id: 'fly', x: 0.5, z: -2.8, label: 'Check-in · book a flight', reach: 2.0, kind: 'act', act: 'screen:airport' },
    { id: 'board', x: 5.0, z: -3.5, label: 'Departures board', reach: 1.8, kind: 'act', act: 'screen:airport' },
  ],
  lights: [[-3.5, 0, '#fff7e6'], [3.5, 0, '#fff7e6']],
});

export const APTS_X = 2900, FLAT_X = 3000;

export const buildApts = (bin: Bin) => buildRoom(bin, {
  id: 'apts', name: 'Eastgate Apartments', x0: APTS_X, placeId: 'apts', W: 6, D: 4.5, wall: '#e8dcc6', floor: '#6b5a48', rug: [0, 0.5, 4, 2.4, '#8a4a2a'], sign: 'EASTGATE', signColor: '#ffa94d',
  boxes: [
    [-5.4, -3.6, 1.5, 4.0, 0.9, '#3a2c20'],                    // property office desk
    [-5.5, -2.5, -4.4, -4.2, 2.3, '#c9a27a', 0, false],         // unit doors on the north wall
    [-1.5, 1.5, -4.4, -4.2, 2.3, '#c9a27a', 0, false],
    [2.5, 5.5, -4.4, -4.2, 2.3, '#c9a27a', 0, false],
    [4.4, 5.6, 1.2, 2.4, 0.5, '#2f5d8a'],                       // waiting bench
    [-0.5, 0.5, 3.0, 3.6, 0.5, '#2e7d4f'],
  ],
  npcs: [{ id: 'agent', who: 'Property manager', seed: 'apts-agent', female: true, x: -4.5, z: 2.7, rot: Math.PI / 2, work: true }],
  visitors: ALL_VISITORS,
  spots: [
    { id: 'office', x: -3.0, z: 2.6, label: 'Property office · rents', reach: 1.8, kind: 'act', act: 'screen:lifestyle' },
    { id: 'u1', x: -4, z: -3.6, label: 'Flat A · go in', reach: 1.5, kind: 'act', go: 'flat', unit: 0 },
    { id: 'u2', x: 0, z: -3.6, label: 'Flat B · go in', reach: 1.5, kind: 'act', go: 'flat', unit: 1 },
    { id: 'u3', x: 4, z: -3.6, label: 'Flat C · go in', reach: 1.5, kind: 'act', go: 'flat', unit: 2 },
  ],
  lights: [[-3, 0, '#ffe3b0'], [3, 0, '#fff1d0']],
});

export const buildFlat = (bin: Bin) => buildRoom(bin, {
  id: 'flat', name: 'Flat', x0: FLAT_X, placeId: '', W: 5, D: 4, wall: '#d8cdb8', floor: '#9a7a54', rug: [-1.2, 0.6, 3, 2, '#4a6a8a'], sign: 'FLAT', signColor: '#ffa94d', back: 'apts',
  boxes: [
    [-4.8, -2.4, -3.9, -2.1, 0.5, '#4a4f9a'], [-4.8, -4.3, -3.9, -2.1, 1.1, '#3a3d7a'],
    [2.4, 4.8, -3.9, -3.2, 2.2, '#6a4a2e'],
    [-1.0, 1.6, -3.9, -3.3, 0.8, '#d8c8a0'],
    [-4.8, -2.4, 1.0, 2.0, 0.55, '#3a2f2f'], [-4.8, -4.5, 1.0, 2.0, 0.95, '#3a2f2f'],
    [3.0, 4.8, 0.0, 1.0, 0.9, '#8a8a92'],
    [0.8, 1.7, 2.8, 3.6, 0.45, '#8a4b2a'],
  ],
  npcs: [{ id: 'tenant', who: 'Tenant', seed: 'flat-tenant', x: 1.6, z: 0.4, rot: Math.PI / 2 }], visitors: [],
  spots: [
    { id: 'lease', x: 0.3, z: -2.5, label: 'Lease · set the rent', reach: 1.6, kind: 'act', act: 'screen:lifestyle' },
    { id: 'tenant', x: 1.6, z: 1.6, label: 'Talk to the tenant', reach: 1.5, kind: 'act', act: 'screen:lifestyle' },
    { id: 'wardrobe', x: 3.6, z: -2.6, label: 'Wardrobe · style', reach: 1.6, kind: 'act', act: 'screen:style' },
    { id: 'bed', x: -2.5, z: -2.2, label: 'Rest · home life', reach: 1.6, kind: 'act', act: 'screen:lifestyle' },
  ],
  lights: [[-2.5, -1.5, '#ffe3b0'], [2.5, 1.5, '#fff1d0']],
});

// ─── big venues: stadium, arena, studio lot, market square ─────────────────
export const VEN_X = 3200;

export const buildStadium = (bin: Bin) => buildRoom(bin, {
  id: 'stadium', name: 'National Stadium', x0: VEN_X, placeId: 'stadium', W: 30, D: 20,
  wall: '#cfd8c8', floor: '#3f7a3a', rug: [0, -1, 46, 30, '#4f9a45'], sign: 'NATIONAL STADIUM', signColor: '#7bd34d',
  boxes: [
    // Full-size pitch: 46m x 30m play area with proper markings.
    [-23, 23, -15, 15, 0.035, '#4f9a45', 0.02, false],
    [-0.08, 0.08, -15, 15, 0.035, '#ffffff', 0.03, false],
    [-23, 23, -0.08, 0.08, 0.035, '#ffffff', 0.03, false],
    [-11, 11, -15, -14.92, 0.035, '#ffffff', 0.03, false],
    [-11, 11, 14.92, 15, 0.035, '#ffffff', 0.03, false],
    [-23, -22.92, -11, 11, 0.035, '#ffffff', 0.03, false],
    [22.92, 23, -11, 11, 0.035, '#ffffff', 0.03, false],
    // Penalty boxes.
    [-23, -16, -6.5, 6.5, 0.035, '#ffffff', 0.03, false],
    [16, 23, -6.5, 6.5, 0.035, '#ffffff', 0.03, false],
    // Four large spectator stands.
    [-30, 30, -20, -15.8, 4.8, '#777d88'],
    [-30, 30, 15.8, 20, 4.8, '#777d88'],
    [-30, -23.8, -15, 15, 4.2, '#858b95'],
    [23.8, 30, -15, 15, 4.2, '#858b95'],
    // Tiered upper stands.
    [-28, 28, -19.5, -17.8, 2.4, '#9298a2'],
    [-28, 28, 17.8, 19.5, 2.4, '#9298a2'],
    [-28, -26.2, -14, 14, 2.0, '#9298a2'],
    [26.2, 28, -14, 14, 2.0, '#9298a2'],
    // Goals.
    [-1.8, 1.8, -15.2, -15.0, 2.4, '#eeeeee', 0, false],
    [-1.8, 1.8, 15.0, 15.2, 2.4, '#eeeeee', 0, false],
    // Big entrance/concourse blocks.
    [-26, -20, 18, 19.5, 1.0, '#30343b'],
    [20, 26, 18, 19.5, 1.0, '#30343b'],
  ],
  npcs: [
    { id: 'groundsman', who: 'Groundsman', seed: 'stad-g', x: -18, z: 12, rot: 0.6, work: true },
    { id: 'steward', who: 'Steward', seed: 'stad-s', x: 20, z: 17, rot: Math.PI, work: true },
  ],
  visitors: ALL_VISITORS,
  spots: [
    { id: 'pitch', x: 0, z: -2, label: 'Pitch · match day', reach: 3.0, kind: 'act', act: 'screen:events:football' },
    { id: 'stands', x: 0, z: -18, label: 'Main stand · watch the match', reach: 3.0, kind: 'act', act: 'screen:events:football' },
  ],
  lights: [[-22, -12, '#ffffff'], [22, -12, '#ffffff'], [-22, 12, '#ffffff'], [22, 12, '#fff7e6']],
});

export const buildArena = (bin: Bin) => buildRoom(bin, {
  id: 'arena', name: 'Iron Ring Arena', x0: VEN_X + 100, placeId: 'arena', W: 7, D: 5.5, wall: '#241a1a', floor: '#2b2222', rug: [0, -0.5, 8, 6, '#3a1c1c'], sign: 'IRON RING', signColor: '#ff6b6b',
  boxes: [
    [-2.2, 2.2, -2.6, 1.6, 0.9, '#1a1a1e'],                                    // ring apron
    [-2.0, 2.0, -2.4, 1.4, 0.25, '#e8e8f0', 0.9, false],                       // canvas
    [-2.1, -1.95, -2.5, 1.5, 1.2, '#c0392b', 1.15, false], [1.95, 2.1, -2.5, 1.5, 1.2, '#c0392b', 1.15, false],  // ropes
    [-6.8, -4.6, -5.3, -3.0, 0.6, '#3a3a44'], [4.6, 6.8, -5.3, -3.0, 0.6, '#3a3a44'],                           // bleachers
    [-6.8, -4.6, 2.6, 5.2, 0.6, '#3a3a44'], [4.6, 6.8, 2.6, 5.2, 0.6, '#3a3a44'],
  ],
  npcs: [{ id: 'ref', who: 'Referee', seed: 'arena-ref', x: 3.2, z: 0.2, rot: -Math.PI / 2 }],
  visitors: ALL_VISITORS,
  spots: [{ id: 'ring', x: 0, z: 2.6, label: 'Ringside · wrestling night', reach: 2.0, kind: 'act', act: 'screen:events:wrestling' }],
  lights: [[0, -0.5, '#ffffff'], [-5, 0, '#ff6b6b'], [5, 0, '#6bb0ff']],
});

export const buildLot = (bin: Bin) => buildRoom(bin, {
  id: 'lots', name: 'Gold Coast Studios', x0: VEN_X + 200, placeId: 'lots', W: 8, D: 6, wall: '#2a2c34', floor: '#3a3d46', rug: [0, 0.5, 6, 4, '#1c2a44'], sign: 'GOLD COAST STUDIOS', signColor: '#ff5d8f',
  boxes: [
    [-7.8, -3.4, -5.8, -3.0, 2.8, '#6a4a3a', 0, true],                          // set: a living-room wall
    [-7.0, -4.2, -5.6, -5.4, 1.6, '#d8c8a0', 0.8, false],
    [3.4, 7.8, -5.8, -3.0, 2.8, '#3a5a7a', 0, true],                             // set: newsroom
    [4.4, 6.8, -4.6, -3.6, 0.9, '#222'],
    [-1.0, 1.0, 1.0, 1.5, 1.4, '#111', 0, true],                                 // camera on a dolly
    [-0.3, 0.3, 0.6, 1.0, 0.3, '#444', 1.4, false],
    [6.0, 7.8, 2.0, 5.0, 0.6, '#555'],                                           // crew table
    [-7.8, -6.4, 2.0, 5.0, 0.6, '#555'],
    [-7.8, -7.5, -2.5, 1.0, 2.4, '#0e0e14', 0, false, '#a02050'],                // ON AIR light strip
  ],
  npcs: [
    { id: 'director', who: 'Director', seed: 'lot-dir', x: 1.8, z: 1.5, rot: Math.PI, hair: 'buzz' },
    { id: 'actor', who: 'Actor', seed: 'lot-act', female: true, x: -5.0, z: -2.0, rot: 0 },
    { id: 'crew', who: 'Crew', seed: 'lot-crew', x: 6.6, z: 3.0, rot: -Math.PI / 2, sit: true },
  ],
  visitors: ALL_VISITORS,
  spots: [
    { id: 'set', x: -1.0, z: -1.5, label: 'Soundstage · shoot a video', reach: 2.2, kind: 'act', act: 'video' },
    { id: 'tv', x: 5.5, z: -1.5, label: 'Newsroom set · interviews', reach: 2.0, kind: 'act', act: 'screen:interviews' },
    { id: 'casting', x: -6.0, z: 3.4, label: 'Casting desk · TV auditions', reach: 2.2, kind: 'act', act: 'screen:events:tv' },
  ],
  lights: [[-4, -2, '#ffd9a0'], [5, -2, '#b9dcff'], [0, 3, '#ffffff']],
});

export const buildMall = (bin: Bin) => buildRoom(bin, {
  id: 'mall', name: 'Market Square', x0: VEN_X + 300, placeId: 'mall', W: 8, D: 5, wall: '#f0e8dc', floor: '#c9c2b4', rug: [0, 0, 10, 2, '#a5d8cc'], sign: 'MARKET SQUARE', signColor: '#4dd4ac',
  boxes: [
    [-7.6, -4.2, -4.8, -3.6, 1.0, '#e7b98f'], [-3.4, 0.0, -4.8, -3.6, 1.0, '#d9e0a5'],   // stalls
    [0.8, 4.2, -4.8, -3.6, 1.0, '#f0c4c4'], [5.0, 7.6, -4.8, -3.6, 1.0, '#c9c2e8'],
    [-7.6, -5.2, 2.6, 4.8, 0.9, '#8a5a2a'], [5.2, 7.6, 2.6, 4.8, 0.9, '#8a5a2a'],           // food court tables
    [-0.6, 0.6, 0.2, 1.0, 0.5, '#2e7d4f'],
  ],
  npcs: [
    { id: 'vendor1', who: 'Vendor', seed: 'mall-1', female: true, x: -5.8, z: -4.2, rot: 0, work: true },
    { id: 'vendor2', who: 'Vendor', seed: 'mall-2', x: 2.5, z: -4.2, rot: 0, work: true },
    { id: 'shopper', who: 'Shopper', seed: 'mall-3', female: true, x: 3.0, z: 1.2, rot: 2.4 },
  ],
  visitors: ALL_VISITORS,
  spots: [
    { id: 'fits', x: -5.8, z: -2.8, label: 'Clothes stall · style', reach: 1.8, kind: 'act', act: 'screen:style' },
    { id: 'food', x: 2.5, z: -2.8, label: 'Food stall · eat', reach: 1.8, kind: 'act', act: 'screen:kitchen' },
  ],
  lights: [[-4, 0, '#fff1d0'], [4, 0, '#fff1d0']],
});

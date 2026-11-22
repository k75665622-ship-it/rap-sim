// ─── INTERIORS ─────────────────────────────────────────────────────────────
// Real rooms you walk into. Each is built once, far from the city, and shown
// while you're inside it. Mama's Kitchen first.
import * as THREE from 'three';
import { Bin, buildPlayer, type PlayerModel } from './build';
import type { Box } from './layout';
import { defaultLook, lookFor, type Look } from '../sim/look';

export const KX = 2000; // the kitchen's centre on the x axis
export const SX = 2100; // Studio 9's

export interface Spot { id: string; x: number; z: number; label: string; reach: number; kind: 'exit' | 'counter' | 'radio' | 'act'; act?: string }
export interface Npc { id: string; who: string; visitor?: boolean; model: PlayerModel; x: number; z: number; rot: number; sit: boolean; work: boolean; baseY: number }
export interface Interior {
  id: 'kitchen' | 'studio';
  name: string;
  x0: number;
  where: 'kitchen' | 'studio';
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

// Numbers for how the car behaves, old physics vs new, on a headless run.
import { build } from 'esbuild';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const bundle = async (entry, name) => { const out = path.resolve(`_test/.${name}.bundle.mjs`); await build({ entryPoints: [entry], bundle: true, format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.resolve('src') } }); return import(pathToFileURL(out).href); };
const NEW = await bundle('src/world/sim.ts', 'newsim');
const OLD = await bundle('_test/_oldsim.ts', 'oldsim');
const { cityLayout } = await import(pathToFileURL((await build({ entryPoints: ['src/world/layout.ts'], bundle: true, format: 'esm', outfile: path.resolve('_test/.layout.bundle.mjs'), logLevel: 'error' }), path.resolve('_test/.layout.bundle.mjs'))).href);
const solids = cityLayout().solids;
const DT = 1 / 60;
const kmh = (v) => Math.round(v * 3.6);

// Each sim: [module, step(dt, drive, brakeKind)]. Old API: third arg = 'braking' (handbrake). New: (handbrake, footBrake).
const sims = {
  old: { m: OLD, step: (dt, d, brake) => OLD.stepCar(dt, d, brake === 'foot' ? true : brake === 'hand') },
  new: { m: NEW, step: (dt, d, brake) => NEW.stepCar(dt, d, brake === 'hand', brake === 'foot') },
};
function reset(m, x, z, heading, v = 0) { const c = m.live.car; Object.assign(c, { x, y: 0, z, heading, v, vx: Math.sin(heading) * v, vz: Math.cos(heading) * v, steer: 0, spin: 0, bump: 0, thr: v > 0 ? 1 : 0 }); }
const inside = (c) => solids.some((b) => c.x > b.minX && c.x < b.maxX && c.z > b.minZ && c.z < b.maxZ);

const rows = [];
for (const [name, S] of Object.entries(sims)) {
  const c = S.m.live.car, r = {};
  // 1. 0→60 km/h and 0→100 km/h with the gas held
  reset(S.m, 0, -140, 0); let t = 0; r['0-60 km/h (s)'] = r['0-100 km/h (s)'] = NaN;
  while (t < 12 && c.z < 145) { S.step(DT, { x: 0, y: 1 }, null); t += DT; if (Number.isNaN(r['0-60 km/h (s)']) && c.v * 3.6 >= 60) r['0-60 km/h (s)'] = +t.toFixed(1); if (Number.isNaN(r['0-100 km/h (s)']) && c.v * 3.6 >= 100) r['0-100 km/h (s)'] = +t.toFixed(1); }
  // 2. coasting from 20 m/s with no pedals: distance to nearly stop
  reset(S.m, 0, -140, 0, 20); let dist = 0; t = 0; const z0 = c.z;
  while (t < 20 && c.v > 1 && c.z < 145) { S.step(DT, { x: 0, y: 0 }, null); t += DT; } r['coast 72→0 km/h (s)'] = +t.toFixed(1); r['coast distance (m)'] = Math.round(c.z - z0);
  // 3. brake pedal from 30 m/s while steering a little: stop distance and sideways drift
  reset(S.m, 0, -140, 0, 30); const zb = c.z; let maxSlide = 0; t = 0;
  while (c.v > 0.3 && t < 10) { S.step(DT, { x: 0.3, y: 0 }, 'foot'); t += DT; maxSlide = Math.max(maxSlide, Math.abs(c.vx * Math.cos(c.heading) - c.vz * Math.sin(c.heading))); }
  r['brake 108→0 stop dist (m)'] = Math.round(Math.hypot(c.z - zb, c.x)); r['brake sideways slip (m/s)'] = +maxSlide.toFixed(1);
  // 4. turning circle at 15 m/s with full wheel
  reset(S.m, 0, -140, 0, 15); let pathLen = 0, turned = 0, px = c.x, pz = c.z, ph = c.heading;
  for (let i = 0; i < 120; i++) { S.step(DT, { x: 1, y: 0.35 }, null); if (i >= 30) { pathLen += Math.hypot(c.x - px, c.z - pz); turned += Math.abs(c.heading - ph); } px = c.x; pz = c.z; ph = c.heading; }
  const minR = pathLen / Math.max(turned, 1e-6);
  r['turn radius at 54 km/h (m)'] = +minR.toFixed(1);
  // 5. head-on into the building row: speed after, rebound
  const wall = solids.find((b) => b.minX > 12 && b.minX < 30 && b.maxZ - b.minZ > 20) ?? solids[0];
  const zc = (wall.minZ + wall.maxZ) / 2;
  reset(S.m, wall.minX - 22, zc, Math.PI / 2, 20); let rebound = 0, hits = 0, buried = false; t = 0;
  for (let i = 0; i < 240; i++) { S.step(DT, { x: 0, y: 1 }, null); rebound = Math.min(rebound, c.vx); if (inside(c)) buried = true; }
  r['head-on 72 km/h: rebound (m/s)'] = +(-rebound).toFixed(1); r['inside a wall?'] = buried ? 'YES' : 'no';
  // 6. glancing hit: ~25° into the wall at 20 m/s, gas held: speed kept after 1 s
  reset(S.m, wall.minX - 12, zc - 10, Math.PI / 2 - 0.44, 20); const s0 = 20; let glance = 0;
  for (let i = 0; i < 90; i++) { S.step(DT, { x: 0, y: 1 }, null); }
  r['glancing 25°: speed kept after 1.5 s (km/h)'] = kmh(Math.hypot(c.vx, c.vz)); r['  heading change (deg)'] = Math.round(Math.abs(c.heading - (Math.PI / 2 - 0.44)) * 57.3);
  rows.push([name, r]);
}
const keys = Object.keys(rows[0][1]);
console.log('metric'.padEnd(46), 'OLD'.padStart(8), 'NEW'.padStart(8));
for (const k of keys) console.log(k.padEnd(46), String(rows[0][1][k]).padStart(8), String(rows[1][1][k]).padStart(8));

// 7. stability: 90 s of random inputs, many seeds: no NaN, never inside a wall, never outside the world
let bad = 0;
for (let seed = 1; seed <= 40; seed++) {
  let s = seed * 7919 >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  reset(NEW, rnd() * 200 - 100 > 0 ? 0 : 60, -120 + rnd() * 20, 0, 0); const c = NEW.live.car; let drive = { x: 0, y: 0 }, brake = null, hold = 0;
  for (let i = 0; i < 90 * 60; i++) {
    if (--hold <= 0) { drive = { x: rnd() * 2 - 1, y: rnd() < 0.7 ? 1 : rnd() * 2 - 1 }; brake = rnd() < 0.15 ? 'foot' : rnd() < 0.05 ? 'hand' : null; hold = 10 + Math.floor(rnd() * 70); }
    NEW.stepCar(DT, drive, brake === 'hand', brake === 'foot');
    if (![c.x, c.z, c.v, c.heading, c.vx, c.vz].every(Number.isFinite) || Math.abs(c.x) > 151 || Math.abs(c.z) > 151 || inside(c)) { bad++; break; }
  }
}
console.log(`\nrandom-input stability: ${bad ? bad + ' of 40 runs broke' : '40 of 40 runs clean (no NaN, no wall clipping, stayed in town)'}`);
process.exit(bad ? 1 : 0);

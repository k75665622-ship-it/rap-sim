// "financial manager" must find accountants, and every hireable role must be findable by its title.
import { build } from 'esbuild';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const out = path.resolve('_test/.search.bundle.mjs');
await build({ stdin: { contents: `export { roleMatches } from './src/sim/roleSearch'; export { generateNPCs } from './src/data/npcGenerator'; export { applyTeamSeats, HIREABLE_ROLES, roleSpec } from './src/sim/roles';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.resolve('src') } });
const m = await import(pathToFileURL(out).href);
const npcs = m.applyTeamSeats(m.generateNPCs()).filter((n) => m.roleSpec(n.role).hireable && n.country === 'Ghana');
const find = (q) => npcs.filter((n) => n.name.toLowerCase().includes(q) || m.roleMatches(n.role, q));
let bad = 0;
const check = (q, role) => { const hits = find(q); const ok = hits.length > 0 && hits.every((h) => !role || h.role === role || h.name.toLowerCase().includes(q)); console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify(q), '->', hits.length, 'people'); if (!ok) bad++; };
check('financial manager', 'accountant'); check('accountant', 'accountant'); check('cfo', 'accountant'); check('finance', 'accountant');
check('lawyer', 'lawyer'); check('attorney', 'lawyer'); check('social media', 'publicist'); check('assistant', 'personal_assistant');
for (const r of m.HIREABLE_ROLES) { const t = m.roleSpec(r).title.toLowerCase(); if (![...npcs].some((n) => n.role === r)) continue; const hit = find(t).some((n) => n.role === r); if (!hit) { console.log('FAIL title not searchable:', t); bad++; } }
console.log(bad ? `${bad} failures` : 'all searches ok'); process.exit(bad ? 1 : 0);

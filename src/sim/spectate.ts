// ─── WATCHING SPORT ────────────────────────────────────────────────────────
// A match or a wrestling card the whole city is watching. Deterministic from a
// seed, so the stadium, the sofa and the betting slip all see the same game.

export interface Beat { at: number; text: string; score?: [number, number] }

function rng(seed: number) {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const SURN = ['Mensah', 'Boateng', 'Osei', 'Adjei', 'Quartey', 'Danso', 'Asante', 'Owusu', 'Appiah', 'Tetteh', 'Addo', 'Amoah', 'Kamara', 'Diallo', 'Okafor'];

export function footballMatch(seed: number, home: string, away: string): { beats: Beat[]; final: [number, number] } {
  const r = rng(seed);
  const hs = 0.8 + r() * 1.3, as = 0.7 + r() * 1.1;
  const goals: Array<{ min: number; side: 0 | 1 }> = [];
  for (let m = 1; m <= 90; m++) { if (r() < hs / 90) goals.push({ min: m, side: 0 }); if (r() < as / 90) goals.push({ min: m, side: 1 }); }
  const beats: Beat[] = [{ at: 0, text: `Kick-off. ${home} v ${away}. The stadium is shaking already.`, score: [0, 0] }];
  const score: [number, number] = [0, 0];
  const fill = [[12, `${pick(r, SURN)} fires wide from the edge of the box.`], [27, `A crunching tackle in midfield. Yellow card for ${pick(r, SURN)}.`], [38, `${pick(r, SURN)} forces a flying save.`], [52, `The crowd roars for a penalty. The referee waves it away.`], [67, `A double substitution. ${pick(r, [home, away])} are changing the shape.`], [81, `Pressure now. Corner after corner.`]] as Array<[number, string]>;
  const all: Beat[] = [];
  for (const g of goals) {
    score[g.side]++;
    all.push({ at: g.min, text: `⚽ GOAL! ${g.side === 0 ? home : away} — ${pick(r, SURN)} (${g.min}')`, score: [score[0], score[1]] });
  }
  for (const [m, t] of fill) if (!all.some((b) => Math.abs(b.at - m) < 4)) all.push({ at: m, text: t });
  all.push({ at: 45, text: 'Half-time. The vendors work the stands.' });
  all.sort((a, b) => a.at - b.at);
  beats.push(...all);
  beats.push({ at: 90, text: `Full-time: ${home} ${score[0]} – ${score[1]} ${away}.`, score: [score[0], score[1]] });
  return { beats, final: [score[0], score[1]] };
}

const FINISH = ['a flying elbow', 'a spinning slam', 'the Baobab Drop', 'a roll-up', 'a chair-assisted pin the ref missed', 'a submission hold', 'a cannonball from the top rope'];
export function wrestlingCard(seed: number, names: string[]): Beat[] {
  const r = rng(seed * 31 + 7);
  const out: Beat[] = [];
  const pool = [...names];
  const bouts = 3;
  for (let i = 0; i < bouts; i++) {
    const a = pool.splice(Math.floor(r() * pool.length), 1)[0] ?? 'The Phantom';
    const b = pool.splice(Math.floor(r() * pool.length), 1)[0] ?? 'Big Baobab';
    const win = r() < 0.5 ? a : b;
    out.push({ at: i * 3, text: `${i === bouts - 1 ? 'MAIN EVENT' : `Bout ${i + 1}`}: ${a} v ${b}. The bell rings.` });
    out.push({ at: i * 3 + 1, text: r() < 0.5 ? `${a} throws the first chop; the front row winces.` : `${b} slides out of the ring and taunts the crowd.` });
    out.push({ at: i * 3 + 2, text: `🏆 ${win} wins with ${pick(r, FINISH)}!` });
  }
  return out;
}

// ─── THE CHARACTER ─────────────────────────────────────────────────────────
// Draws a Look as a flat-illustration SVG: full body for the creator and the
// wardrobe, or a head-and-shoulders portrait for avatars.

import { memo, useId } from 'react';
import { SKIN, type Look, type Tattoo, type Wearable } from '../../sim/look';

const INK = '#0e0f1a';

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface Geo { sh: number; wa: number; hip: number; arm: number; leg: number; neck: number; femme: boolean }

function geometry(look: Look): Geo {
  const femme = look.frame === 'femme';
  const base = look.build === 'slim' ? { sh: 37, wa: 28, arm: 14, leg: 13, neck: 10 } : look.build === 'heavy' ? { sh: 47, wa: 41, arm: 19, leg: 17, neck: 13 } : { sh: 43, wa: 31, arm: 16, leg: 15, neck: 11 };
  return femme ? { sh: base.sh - 6, wa: base.wa - 3, hip: base.wa + 6, arm: base.arm - 2, leg: base.leg, neck: base.neck - 2, femme } : { ...base, hip: base.wa + 1, femme };
}

const SHORT_SLEEVE = new Set(['tee', 'jersey', 'shirt', 'oversized']);
const NO_SLEEVE = new Set(['tank', 'none']);

// ─── BODY ──────────────────────────────────────────────────────────────────

function Arms({ g, skin, top, tattoos }: { g: Geo; skin: { base: string; shade: string }; top: Wearable; tattoos: Tattoo[] }) {
  const L = { s: [100 - g.sh + 5, 126], e: [100 - g.sh - 3, 186], w: [100 - g.sh - 7, 244] };
  const R = { s: [100 + g.sh - 5, 126], e: [100 + g.sh + 3, 186], w: [100 + g.sh + 7, 244] };
  const path = (a: typeof L) => `M ${a.s[0]} ${a.s[1]} L ${a.e[0]} ${a.e[1]} L ${a.w[0]} ${a.w[1]}`;
  const shape = top.shape;
  const sleeveTo = NO_SLEEVE.has(shape) ? 0 : SHORT_SLEEVE.has(shape) ? (shape === 'oversized' ? 0.95 : 0.62) : 2;
  const puff = shape === 'puffer' ? 7 : shape === 'hoodie' || shape === 'bomber' || shape === 'varsity' ? 3 : 1;
  const sleeveColor = shape === 'varsity' ? (top.c2 ?? top.c1) : top.c1;
  const sleevePath = (a: typeof L) => {
    if (sleeveTo >= 2) return `M ${a.s[0]} ${a.s[1]} L ${a.e[0]} ${a.e[1]} L ${a.w[0]} ${a.w[1] - 4}`;
    const t = sleeveTo;
    const x = a.s[0] + (a.e[0] - a.s[0]) * t;
    const y = a.s[1] + (a.e[1] - a.s[1]) * t;
    return `M ${a.s[0]} ${a.s[1]} L ${x} ${y}`;
  };
  return (
    <g>
      {[L, R].map((a, i) => (
        <g key={i}>
          <path d={path(a)} stroke={skin.base} strokeWidth={g.arm} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d={`M ${a.e[0]} ${a.e[1]} L ${a.w[0]} ${a.w[1]}`} stroke={skin.shade} strokeWidth={g.arm * 0.35} strokeLinecap="round" opacity={0.25} fill="none" transform={`translate(${i ? -3 : 3} 0)`} />
          {tattoos.filter((t) => t.spot === (i ? 'right_arm' : 'left_arm')).map((t) => <ArmInk key={t.id} t={t} a={a} w={g.arm} />)}
          {sleeveTo > 0 && <path d={sleevePath(a)} stroke={sleeveColor} strokeWidth={g.arm + puff + 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          {sleeveTo >= 2 && (shape === 'bomber' || shape === 'varsity' || shape === 'hoodie') && <circle cx={a.w[0]} cy={a.w[1] - 5} r={(g.arm + puff) / 2} fill={shape === 'hoodie' ? shade(top.c1, -14) : (top.c2 ?? top.c1)} />}
          <circle cx={a.w[0]} cy={a.w[1] + 6} r={g.arm * 0.58} fill={skin.base} />
          {tattoos.some((t) => t.spot === 'hands') && <HandInk x={a.w[0]} y={a.w[1] + 6} design={tattoos.find((t) => t.spot === 'hands')!.design} />}
        </g>
      ))}
    </g>
  );
}

function ArmInk({ t, a, w }: { t: Tattoo; a: { e: number[]; w: number[] }; w: number }) {
  const [x1, y1] = a.e;
  const [x2, y2] = a.w;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI - 90;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const s = w / 16;
  const body = (() => {
    switch (t.design) {
      case 'sleeve': return <g>{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M ${-6 * s} ${-len / 2 + 4 + i * 8} q ${6 * s} 5 ${12 * s} 0`} />)}<circle r={3.2 * s} cy={-4} /></g>;
      case 'rose': return <g><circle r={4 * s} /><path d={`M 0 ${4 * s} L 0 ${14 * s} M 0 ${9 * s} l ${4 * s} -3`} /></g>;
      case 'tribal': return <path d={`M ${-5 * s} ${-14} q ${10 * s} 6 0 12 q ${-8 * s} 6 ${5 * s} 14`} />;
      case 'kente': return <g>{[-12, -4, 4, 12].map((yy) => <rect key={yy} x={-5 * s} y={yy} width={10 * s} height={5} />)}</g>;
      case 'lion': return <g><circle r={6 * s} /><circle r={3 * s} /></g>;
      case 'money': return <text fontSize={12 * s} textAnchor="middle" dominantBaseline="middle" fill={INK} stroke="none" fontWeight={700}>$</text>;
      case 'adinkra': return <path d={`M 0 ${-8 * s} v ${16 * s} M ${-5 * s} ${-3 * s} h ${10 * s} M ${-5 * s} ${3 * s} h ${10 * s}`} />;
      default: return <path d={`M ${-5 * s} -10 q 3 -3 5 0 t 5 0 M ${-5 * s} -2 q 3 -3 5 0 t 5 0 M ${-5 * s} 6 q 3 -3 5 0 t 5 0`} />;
    }
  })();
  return <g transform={`translate(${mx} ${my}) rotate(${ang})`} stroke={INK} strokeWidth={1.8} fill="none" opacity={0.82}>{body}</g>;
}

function HandInk({ x, y, design }: { x: number; y: number; design: string }) {
  return <g fill={INK} opacity={0.65}>{design === 'cross' ? <path d={`M ${x} ${y - 3} v 6 M ${x - 2} ${y - 1} h 4`} stroke={INK} strokeWidth={1} /> : [-3, 0, 3].map((d) => <circle key={d} cx={x + d} cy={y - 2} r={0.9} />)}</g>;
}

function Torso({ g, skin, top, tattoos }: { g: Geo; skin: { base: string; shade: string }; top: Wearable; tattoos: Tattoo[] }) {
  const body = `M ${100 - g.sh} 132 Q ${100 - g.sh} 118 ${100 - g.sh + 14} 117 L ${100 + g.sh - 14} 117 Q ${100 + g.sh} 118 ${100 + g.sh} 132 L ${100 + g.wa} 226 L ${100 - g.wa} 226 Z`;
  const showChest = top.shape === 'none' || top.shape === 'tank';
  return (
    <g>
      <path d={body} fill={skin.base} />
      {showChest && <path d={`M ${100 - g.sh + 10} 150 Q 100 160 ${100 + g.sh - 10} 150`} stroke={skin.shade} strokeWidth={1.4} fill="none" opacity={0.5} />}
      {showChest && <path d="M 100 160 L 100 210" stroke={skin.shade} strokeWidth={1} opacity={0.35} />}
      {showChest && tattoos.filter((t) => t.spot === 'chest').map((t) => <ChestInk key={t.id} t={t} />)}
    </g>
  );
}

function ChestInk({ t }: { t: Tattoo }) {
  const c = { stroke: INK, strokeWidth: 1.9, fill: 'none', opacity: 0.8 };
  if (t.design === 'crown') return <path d="M 84 140 l 4 -10 l 6 7 l 6 -9 l 6 9 l 6 -7 l 4 10 Z" {...c} />;
  if (t.design === 'lion') return <g {...c}><circle cx={100} cy={142} r={10} /><circle cx={100} cy={142} r={5} /></g>;
  if (t.design === 'adinkra') return <path d="M 100 130 v 24 M 92 137 h 16 M 92 147 h 16" {...c} />;
  if (t.design === 'rose') return <g {...c}><circle cx={112} cy={140} r={5} /><path d="M 112 145 v 10" /></g>;
  return <path d="M 82 138 q 5 -4 9 0 t 9 0 t 9 0 t 9 0" {...c} />;
}

// ─── CLOTHES ───────────────────────────────────────────────────────────────

function Top({ g, top }: { g: Geo; top: Wearable }) {
  const s = top.shape;
  if (s === 'none') return null;
  const extra = s === 'oversized' ? 6 : s === 'puffer' ? 8 : 0;
  const len = s === 'oversized' || s === 'hoodie' ? 236 : s === 'puffer' ? 232 : 228;
  const w1 = g.sh + extra;
  const w2 = g.wa + extra + (s === 'oversized' ? 4 : 0);
  if (s === 'tank') {
    return (
      <g>
        <path d={`M ${100 - g.sh + 14} 120 L ${100 - g.sh + 8} 150 L ${100 - g.wa} 230 L ${100 + g.wa} 230 L ${100 + g.sh - 8} 150 L ${100 + g.sh - 14} 120 Q 100 140 ${100 - g.sh + 14} 120 Z`} fill={top.c1} />
        <path d={`M ${100 - g.sh + 14} 120 Q 100 140 ${100 + g.sh - 14} 120`} stroke={shade(top.c1, -25)} strokeWidth={2} fill="none" />
      </g>
    );
  }
  const body = `M ${100 - w1} 134 Q ${100 - w1} 116 ${100 - w1 + 16} 115 L ${100 + w1 - 16} 115 Q ${100 + w1} 116 ${100 + w1} 134 L ${100 + w2} ${len} L ${100 - w2} ${len} Z`;
  const dark = shade(top.c1, -28);
  return (
    <g>
      {s === 'hoodie' && <path d={`M ${100 - 20} 116 Q 100 96 ${100 + 20} 116 Q 100 128 ${100 - 20} 116 Z`} fill={dark} />}
      <path d={body} fill={top.c1} />
      {s === 'puffer' && [150, 172, 194, 214].map((y) => <path key={y} d={`M ${100 - w2 - 4} ${y} Q 100 ${y + 4} ${100 + w2 + 4} ${y}`} stroke={dark} strokeWidth={1.6} fill="none" opacity={0.6} />)}
      {(s === 'tee' || s === 'oversized' || s === 'jersey') && <path d={s === 'jersey' ? 'M 90 116 L 100 130 L 110 116' : 'M 89 116 Q 100 126 111 116'} stroke={top.c2 ?? dark} strokeWidth={2.5} fill="none" />}
      {s === 'hoodie' && <g><path d={`M ${100 - 18} 196 L ${100 + 18} 196 L ${100 + 22} 222 L ${100 - 22} 222 Z`} fill={dark} opacity={0.55} /><path d="M 95 120 L 94 150 M 105 120 L 106 150" stroke={top.c2 ?? '#eee'} strokeWidth={1.5} /></g>}
      {(s === 'bomber' || s === 'varsity') && <g><rect x={100 - w2 - 1} y={len - 8} width={(w2 + 1) * 2} height={8} rx={2} fill={top.c2 ?? dark} />{s === 'bomber' ? <path d={`M 100 118 L 100 ${len - 8}`} stroke={shade(top.c1, 30)} strokeWidth={1.4} /> : <text x={84} y={160} fontSize={16} fontWeight={900} fill={top.c2 ?? '#fff'}>{(top.text ?? 'R').slice(0, 1)}</text>}<path d="M 89 116 Q 100 124 111 116" stroke={top.c2 ?? dark} strokeWidth={4} fill="none" /></g>}
      {s === 'jersey' && <text x={100} y={178} textAnchor="middle" fontSize={26} fontWeight={900} fill={top.c2 ?? '#fff'} fontFamily="Inter, sans-serif">{top.text ?? '10'}</text>}
      {s === 'shirt' && <g><path d="M 92 115 L 100 126 L 108 115" stroke={shade(top.c1, -40)} strokeWidth={2} fill="none" /><path d="M 100 126 L 100 226" stroke={shade(top.c1, -40)} strokeWidth={1} /> {[140, 160, 180, 200].map((y) => <circle key={y} cx={102.5} cy={y} r={1.1} fill={top.c2 ?? '#fff'} />)}</g>}
      {s === 'suit' && <g><path d="M 100 117 L 90 117 L 100 170 L 110 117 Z" fill={top.c2 ?? '#f4f4f4'} /><path d="M 90 117 L 84 150 L 100 172 M 110 117 L 116 150 L 100 172" stroke={dark} strokeWidth={2} fill="none" /><circle cx={100} cy={190} r={1.6} fill={dark} /><circle cx={100} cy={206} r={1.6} fill={dark} /></g>}
      {s === 'oversized' && top.c2 && <rect x={86} y={150} width={28} height={10} rx={2} fill={top.c2} opacity={0.9} />}
    </g>
  );
}

function Bottom({ g, b, skin }: { g: Geo; b: Wearable; skin: { base: string; shade: string } }) {
  const s = b.shape;
  const lx = 100 - Math.max(12, g.hip * 0.42);
  const rx = 100 + Math.max(12, g.hip * 0.42);
  const ankle = 360;
  const leg = (x: number, x2: number, top: number, bottom: number, wt: number, wb: number) => `M ${x - wt} ${top} L ${x + wt} ${top} L ${x2 + wb} ${bottom} L ${x2 - wb} ${bottom} Z`;
  const short = s === 'shorts' || s === 'skirt';
  const end = s === 'shorts' ? 288 : s === 'skirt' ? 268 : ankle;
  const wb = s === 'joggers' ? g.leg * 0.45 : s === 'cargo' ? g.leg * 0.7 : g.leg * 0.6;
  const dark = b.c2 ?? shade(b.c1, -25);
  return (
    <g>
      {/* Legs, bare where the clothes stop */}
      {short && <g>
        <path d={`M ${lx} ${end - 6} L ${lx - 2} ${ankle}`} stroke={skin.base} strokeWidth={g.leg * 1.05} strokeLinecap="round" />
        <path d={`M ${rx} ${end - 6} L ${rx + 2} ${ankle}`} stroke={skin.base} strokeWidth={g.leg * 1.05} strokeLinecap="round" />
      </g>}
      {s === 'skirt' ? (
        <path d={`M ${100 - g.hip} 222 L ${100 + g.hip} 222 L ${100 + g.hip + 10} ${end} L ${100 - g.hip - 10} ${end} Z`} fill={b.c1} />
      ) : (
        <g>
          <rect x={100 - g.hip} y={218} width={g.hip * 2} height={26} rx={6} fill={b.c1} />
          <path d={leg(lx, lx - 2, 230, end, g.leg * 0.95, short ? g.leg * 0.95 : wb)} fill={b.c1} />
          <path d={leg(rx, rx + 2, 230, end, g.leg * 0.95, short ? g.leg * 0.95 : wb)} fill={b.c1} />
          <path d={`M 100 224 L 100 246`} stroke={dark} strokeWidth={1.2} />
          {(s === 'jeans' || s === 'ripped') && <g stroke={dark} strokeWidth={1} opacity={0.7}><path d={`M ${lx + 6} 236 L ${lx + 3} ${end - 6}`} /><path d={`M ${rx - 6} 236 L ${rx - 3} ${end - 6}`} /></g>}
          {s === 'ripped' && <g fill={skin.base}><rect x={lx - 6} y={286} width={9} height={4} rx={2} /><rect x={rx - 2} y={300} width={8} height={3} rx={1.5} /><rect x={lx - 4} y={300} width={6} height={2.5} rx={1} /></g>}
          {s === 'cargo' && <g fill={dark} opacity={0.6}><rect x={lx - g.leg - 1} y={282} width={9} height={14} rx={2} /><rect x={rx + g.leg - 8} y={282} width={9} height={14} rx={2} /></g>}
          {s === 'joggers' && <g fill={dark}><rect x={lx - 2 - wb - 1} y={ankle - 8} width={(wb + 1) * 2} height={7} rx={3} /><rect x={rx + 2 - wb - 1} y={ankle - 8} width={(wb + 1) * 2} height={7} rx={3} /><path d={`M ${lx - g.leg + 3} 240 L ${lx - wb} ${ankle - 9}`} stroke="#ffffff" strokeWidth={1.4} opacity={0.5} /></g>}
          {s === 'trousers' && <g stroke={dark} strokeWidth={1}><path d={`M ${lx} 240 L ${lx - 2} ${end}`} /><path d={`M ${rx} 240 L ${rx + 2} ${end}`} /></g>}
        </g>
      )}
      {/* Belt line */}
      {s !== 'skirt' && s !== 'joggers' && <rect x={100 - g.hip} y={218} width={g.hip * 2} height={4} fill={shade(b.c1, -35)} />}
    </g>
  );
}

function Shoes({ g, s }: { g: Geo; s: Wearable }) {
  const xs = [100 - Math.max(12, g.hip * 0.42) - 2, 100 + Math.max(12, g.hip * 0.42) + 2];
  const y = 360;
  const c1 = s.c1;
  const c2 = s.c2 ?? shade(c1, -40);
  return (
    <g>
      {xs.map((x, i) => {
        const dir = i ? 1 : -1;
        switch (s.shape) {
          case 'slides':
            return <g key={i}><ellipse cx={x + dir * 2} cy={y + 13} rx={16} ry={5} fill={c2} /><path d={`M ${x - 10} ${y + 6} Q ${x + dir * 2} ${y - 2} ${x + 14 * 1} ${y + 6}`} stroke={c1} strokeWidth={7} fill="none" /><circle cx={x + dir * 12} cy={y + 9} r={3} fill="#c48a5c" opacity={0} /></g>;
          case 'boots':
            return <g key={i}><path d={`M ${x - 10} ${y - 18} L ${x + 10} ${y - 18} L ${x + 11} ${y + 6} Q ${x + dir * 20} ${y + 6} ${x + dir * 21} ${y + 13} L ${x - dir * 12} ${y + 14} Z`} fill={c1} /><rect x={x - 14} y={y + 12} width={30} height={5} rx={2} fill={c2} transform={`translate(${dir * 3} 0)`} /><path d={`M ${x - 6} ${y - 12} L ${x + 6} ${y - 6} M ${x - 6} ${y - 6} L ${x + 6} ${y}`} stroke={c2} strokeWidth={1.2} /></g>;
          default: {
            const sole = s.shape === 'chunky' ? 7 : s.shape === 'loafers' ? 3 : 4.5;
            const collar = s.shape === 'hightop' ? 14 : 4;
            return (
              <g key={i}>
                <path d={`M ${x - 11} ${y - collar} L ${x + 11} ${y - collar} L ${x + 12} ${y + 4} Q ${x + dir * 22} ${y + 5} ${x + dir * 23} ${y + 12} L ${x - dir * 13} ${y + 13} Q ${x - dir * 14} ${y + 2} ${x - 11} ${y - collar} Z`} fill={c1} />
                <rect x={dir > 0 ? x - 14 : x - 23} y={y + 11} width={37} height={sole} rx={sole / 2} fill={s.shape === 'loafers' ? shade(c1, -30) : '#f7f7f7'} />
                {s.shape === 'runner' && <path d={`M ${x - dir * 8} ${y + 8} Q ${x + dir * 4} ${y + 2} ${x + dir * 16} ${y + 6}`} stroke={s.c3 ?? c2} strokeWidth={2.2} fill="none" />}
                {s.shape === 'court' && <path d={`M ${x - dir * 6} ${y + 2} L ${x + dir * 10} ${y + 9}`} stroke={c2} strokeWidth={3} />}
                {s.shape === 'hightop' && <><rect x={x - 11} y={y - collar} width={22} height={4} rx={2} fill={c2} /><circle cx={x + dir * 8} cy={y - 6} r={2.6} fill={c2} /></>}
                {s.shape === 'chunky' && <path d={`M ${x - dir * 10} ${y + 7} L ${x + dir * 18} ${y + 9}`} stroke={c2} strokeWidth={2} />}
              </g>
            );
          }
        }
      })}
    </g>
  );
}

// ─── HEAD ──────────────────────────────────────────────────────────────────

/** Heads are drawn a little larger than life, like most game avatars. */
const HEAD = 'translate(100 112) scale(1.13) translate(-100 -112)';

const HAIR_BACK = new Set(['afro', 'dreads_long', 'box_braids', 'long_straight', 'bob', 'curls_long', 'ponytail']);

function HairBack({ look }: { look: Look }) {
  const c = look.hairColor;
  const d = shade(c, -18);
  switch (look.hair) {
    case 'afro': return <circle cx={100} cy={56} r={50} fill={c} />;
    case 'curls_long': return <g fill={c}>{[[70, 70], [130, 70], [66, 100], [134, 100], [70, 130], [130, 130], [80, 150], [120, 150], [100, 40], [76, 42], [124, 42]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={20} />)}</g>;
    case 'long_straight': return <path d="M 64 60 Q 62 26 100 24 Q 138 26 136 60 L 142 160 Q 100 172 58 160 Z" fill={c} />;
    case 'bob': return <path d="M 64 60 Q 62 26 100 24 Q 138 26 136 60 L 138 104 Q 100 112 62 104 Z" fill={c} />;
    case 'box_braids':
    case 'dreads_long': return <g><path d="M 62 60 Q 60 24 100 22 Q 140 24 138 60 L 142 150 Q 100 162 58 150 Z" fill={d} />{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M ${66 + i * 8.5} 40 L ${64 + i * 9} 152`} stroke={shade(c, 22)} strokeWidth={1} opacity={0.5} />)}</g>;
    case 'ponytail': return <path d="M 128 52 Q 150 70 140 130 Q 136 140 130 126 Q 136 86 122 60 Z" fill={c} />;
    default: return null;
  }
}

function HairFront({ look }: { look: Look }) {
  const c = look.hairColor;
  const hi = shade(c, 34);
  const cap = 'M 68 72 Q 66 30 100 28 Q 134 30 132 72 Q 126 48 100 47 Q 74 48 68 72 Z';
  switch (look.hair) {
    case 'bald': return <ellipse cx={90} cy={46} rx={9} ry={5} fill="#fff" opacity={0.18} />;
    case 'buzz': return <path d={cap} fill={c} opacity={0.72} />;
    case 'waves': return <g><path d={cap} fill={c} />{[38, 44, 50].map((y) => <path key={y} d={`M 76 ${y + 8} Q 100 ${y - 4} 124 ${y + 8}`} stroke={hi} strokeWidth={1.4} fill="none" opacity={0.6} />)}</g>;
    case 'fade': return <g><path d="M 69 64 Q 68 22 100 20 Q 132 22 131 64 Q 124 44 100 43 Q 76 44 69 64 Z" fill={c} /><path d="M 68 72 Q 67 62 70 58 L 74 66 Z M 132 72 Q 133 62 130 58 L 126 66 Z" fill={c} opacity={0.45} /></g>;
    case 'hightop': return <g><rect x={70} y={4} width={60} height={46} rx={8} fill={c} /><path d="M 68 72 Q 67 52 72 46 L 76 62 Z M 132 72 Q 133 52 128 46 L 124 62 Z" fill={c} opacity={0.5} /></g>;
    case 'afro': return <path d="M 64 60 Q 70 34 100 36 Q 130 34 136 60 Q 124 46 100 46 Q 76 46 64 60 Z" fill={shade(c, -10)} />;
    case 'twists': return <g fill={c}><path d={cap} />{Array.from({ length: 9 }, (_, i) => { const x = 70 + i * 7.5; const y = 20 + Math.abs(x - 100) * 0.35; return <g key={i}><rect x={x - 3.5} y={y} width={7} height={22} rx={3.5} /><path d={`M ${x - 3} ${y + 6} l 6 -3 M ${x - 3} ${y + 12} l 6 -3`} stroke={shade(c, 35)} strokeWidth={0.9} /></g>; })}</g>;
    case 'curly_top': return <g fill={c}><path d={cap} opacity={0.5} />{[[78, 34], [90, 26], [102, 24], [114, 28], [124, 36], [84, 40], [98, 34], [112, 38]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={8} />)}</g>;
    case 'mohawk': return <g><path d={cap} fill={c} opacity={0.3} /><path d="M 90 50 Q 88 10 100 4 Q 112 10 110 50 Z" fill={c} /></g>;
    case 'dreads_short': return <g fill={c}><path d={cap} />{[68, 75, 125, 132].map((x, i) => <rect key={i} x={x - 3} y={50} width={6} height={40} rx={3} />)}{[80, 92, 104, 116].map((x) => <rect key={x} x={x - 3} y={34} width={6} height={20} rx={3} />)}</g>;
    case 'dreads_long': return <g fill={c}><path d={cap} />{[80, 90, 100, 110, 120].map((x) => <rect key={x} x={x - 3.5} y={30 + Math.abs(x - 100) * 0.15} width={7} height={22} rx={3.5} />)}</g>;
    case 'cornrows': return <g><path d={cap} fill={c} />{[80, 88, 96, 104, 112, 120].map((x) => <path key={x} d={`M ${x} 50 Q ${x + (x - 100) * 0.1} 36 ${100 + (x - 100) * 0.5} 28`} stroke={hi} strokeWidth={1.5} fill="none" opacity={0.7} />)}</g>;
    case 'box_braids': return <g><path d={cap} fill={c} />{[76, 84, 92, 100, 108, 116, 124].map((x) => <path key={x} d={`M ${x} 50 L ${100 + (x - 100) * 0.4} 28`} stroke={shade(c, 30)} strokeWidth={1.1} opacity={0.7} />)}</g>;
    case 'long_straight': return <g fill={c}><path d="M 66 74 Q 64 28 100 26 Q 136 28 134 74 Q 130 46 108 42 Q 84 44 70 60 Z" /></g>;
    case 'bob': return <g fill={c}><path d="M 66 70 Q 64 28 100 26 Q 136 28 134 70 Q 126 50 100 52 Q 74 50 66 70 Z" /><path d="M 104 28 Q 96 44 72 56" stroke={shade(c, 30)} strokeWidth={1.4} fill="none" opacity={0.6} /></g>;
    case 'ponytail': return <path d="M 68 70 Q 66 28 100 26 Q 134 28 132 70 Q 124 46 100 45 Q 76 46 68 70 Z" fill={c} />;
    case 'bun': return <g fill={c}><path d="M 68 70 Q 66 30 100 28 Q 134 30 132 70 Q 124 46 100 45 Q 76 46 68 70 Z" /><circle cx={100} cy={20} r={14} /></g>;
    case 'curls_long': return <g fill={c}>{[[80, 40], [92, 32], [106, 32], [120, 40], [70, 56], [130, 56]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={11} />)}</g>;
    default: return null;
  }
}


/** Long hair that falls in front of the shoulders. Drawn before the face so it comes from behind it. */
function HairDrape({ look }: { look: Look }) {
  const c = look.hairColor;
  const d = shade(c, -16);
  const sides = [-1, 1];
  switch (look.hair) {
    case 'box_braids':
      return <g>{sides.map((sd) => [0, 1, 2, 3].map((i) => { const x = 100 + sd * (36 - i * 4.2); const len = 150 + (i % 2) * 8; return <g key={`${sd}${i}`}><path d={`M ${x} 56 Q ${x - sd * 2} 110 ${x + sd * (4 - i)} ${len}`} stroke={i % 2 ? c : d} strokeWidth={4.6} strokeLinecap="round" fill="none" /><circle cx={x + sd * (4 - i)} cy={len + 2} r={2.3} fill="#e3b341" /></g>; }))}</g>;
    case 'dreads_long':
      return <g>{sides.map((sd) => [0, 1, 2].map((i) => { const x = 100 + sd * (35 - i * 5.5); const len = 140 + i * 9; return <path key={`${sd}${i}`} d={`M ${x} 58 Q ${x - sd * 3} 104 ${x + sd * (6 - i * 2)} ${len}`} stroke={i % 2 ? d : c} strokeWidth={6.5} strokeLinecap="round" fill="none" />; }))}</g>;
    case 'long_straight':
      return <g fill={c}>{sides.map((sd) => <path key={sd} d={`M ${100 + sd * 36} 58 Q ${100 + sd * 38} 120 ${100 + sd * 34} 158 L ${100 + sd * 22} 152 Q ${100 + sd * 26} 110 ${100 + sd * 27} 70 Z`} />)}</g>;
    case 'curls_long':
      return <g fill={c}>{sides.map((sd) => [70, 88, 106, 124].map((y, i) => <circle key={`${sd}${y}`} cx={100 + sd * (32 - (i % 2) * 3)} cy={y} r={9} />))}</g>;
    default:
      return null;
  }
}

function Face({ look, skin }: { look: Look; skin: { base: string; shade: string } }) {
  const femme = look.frame === 'femme';
  const eyeY = 74;
  const brow = look.hairColor === '#ece6d6' || look.hairColor === '#d9b25f' ? shade(look.hairColor, -60) : shade(look.hairColor, 0);
  const iris = '#2b1a10';
  const eye = (x: number, side: number) => {
    const ry = look.eyes === 'wide' ? 4.6 : look.eyes === 'sleepy' ? 2.6 : 3.6;
    return (
      <g key={x}>
        <ellipse cx={x} cy={eyeY} rx={6} ry={ry} fill="#fbfbf7" />
        <circle cx={x + side * 0.4} cy={eyeY + 0.3} r={2.9} fill={iris} />
        <circle cx={x + side * 0.4 + 1} cy={eyeY - 0.8} r={0.9} fill="#fff" />
        {look.eyes === 'sleepy' && <path d={`M ${x - 6.5} ${eyeY - 0.5} Q ${x} ${eyeY - 3} ${x + 6.5} ${eyeY - 0.5}`} fill={skin.shade} />}
        {look.eyes === 'sharp' && <path d={`M ${x - 6.5} ${eyeY - 1} L ${x + side * 7} ${eyeY - 3.5}`} stroke={iris} strokeWidth={1.4} />}
        {look.eyes === 'lashes' && <path d={`M ${x - 6} ${eyeY - 2} Q ${x} ${eyeY - 5.5} ${x + 6} ${eyeY - 2} M ${x + side * 6} ${eyeY - 2} l ${side * 2.4} -1.6`} stroke={iris} strokeWidth={1.6} fill="none" />}
        <path d={`M ${x - 6} ${eyeY - 1.5} Q ${x} ${eyeY - 5} ${x + 6} ${eyeY - 1.5}`} stroke={shade(skin.shade, -20)} strokeWidth={0.9} fill="none" opacity={0.6} />
      </g>
    );
  };
  const browPath = (x: number, side: number) => {
    const w = look.brows === 'thick' ? 3.2 : look.brows === 'thin' ? 1.3 : 2.2;
    const d = `M ${x - side * 7} ${66} Q ${x} ${62 - (femme ? 1.5 : 0)} ${x + side * 7} ${64.5}`;
    return (
      <g key={`b${x}`}>
        <path d={d} stroke={brow} strokeWidth={w} strokeLinecap="round" fill="none" />
        {look.brows === 'slit' && side === 1 && <path d={`M ${x + 1.5} 61 L ${x + 3.2} 67`} stroke={skin.base} strokeWidth={1.8} />}
      </g>
    );
  };
  const mouth = (() => {
    const lip = femme ? '#a2433f' : shade(skin.shade, -22);
    switch (look.mouth) {
      case 'smile': return <path d="M 91 93 Q 100 100 109 93" stroke={lip} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
      case 'smirk': return <path d="M 92 95 Q 101 97 109 91" stroke={lip} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
      case 'grin': {
        const g = look.outfit.grillz;
        return <g><path d="M 90 92 Q 100 103 110 92 Z" fill="#3a1414" /><path d="M 91.5 93 Q 100 97 108.5 93 L 108 94.5 Q 100 98.5 92 94.5 Z" fill={g ? (g.shape === 'iced' ? '#e8f4ff' : '#e3b341') : '#f7f4ec'} />{g?.shape === 'iced' && [94, 100, 106].map((x) => <circle key={x} cx={x} cy={95.5} r={0.8} fill="#fff" />)}</g>;
      }
      default: return <path d="M 92 94 Q 100 95.5 108 94" stroke={lip} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
    }
  })();
  return (
    <g>
      {eye(88, -1)}
      {eye(112, 1)}
      {browPath(88, -1)}
      {browPath(112, 1)}
      <path d="M 100 76 Q 98 84 96 87 Q 100 89.5 104 87" stroke={skin.shade} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {femme && <><ellipse cx={84} cy={86} rx={5} ry={2.6} fill="#e06b6b" opacity={0.18} /><ellipse cx={116} cy={86} rx={5} ry={2.6} fill="#e06b6b" opacity={0.18} /></>}
      {mouth}
    </g>
  );
}

function Beard({ look, skin }: { look: Look; skin: { base: string; shade: string } }) {
  const c = look.hairColor;
  switch (look.facialHair) {
    case 'stubble': return <path d="M 72 82 Q 74 108 100 110 Q 126 108 128 82 Q 118 98 100 99 Q 82 98 72 82 Z" fill={c} opacity={0.28} />;
    case 'mustache': return <path d="M 90 90 Q 100 86 110 90 Q 100 91.5 90 90 Z" fill={c} stroke={c} strokeWidth={1.6} />;
    case 'goatee': return <g fill={c}><path d="M 90 90 Q 100 86 110 90 Q 100 91.5 90 90 Z" stroke={c} strokeWidth={1.6} /><path d="M 93 99 Q 100 101 107 99 L 105 108 Q 100 111 95 108 Z" /></g>;
    case 'chinstrap': return <path d="M 70 78 Q 72 110 100 112 Q 128 110 130 78 L 127 80 Q 124 104 100 106 Q 76 104 73 80 Z" fill={c} />;
    case 'full': return <g fill={c}><path d="M 70 76 Q 70 116 100 118 Q 130 116 130 76 Q 122 92 112 96 Q 100 92 88 96 Q 78 92 70 76 Z" /><path d="M 90 90 Q 100 86 110 90 Q 100 92 90 90 Z" stroke={c} strokeWidth={2} /><path d="M 92 94 Q 100 97 108 94 Q 100 99 92 94 Z" fill={skin.base} /></g>;
    default: return null;
  }
}

function FaceInk({ tattoos }: { tattoos: Tattoo[] }) {
  return (
    <g stroke={INK} fill={INK} strokeWidth={1.1} opacity={0.7}>
      {tattoos.filter((t) => t.spot === 'face').map((t) => {
        if (t.design === 'teardrop') return <path key={t.id} d="M 86 80 q -2 3 0 4 q 2 -1 0 -4 Z" />;
        if (t.design === 'cross') return <path key={t.id} d="M 121 66 v 6 M 119 68 h 4" fill="none" />;
        if (t.design === 'stars') return <path key={t.id} d="M 117 82 l 1 2 l 2 0 l -1.6 1.3 l 0.6 2 l -2 -1.2 l -2 1.2 l 0.6 -2 l -1.6 -1.3 l 2 0 Z" />;
        return <path key={t.id} d="M 92 54 q 2 -2 4 0 t 4 0 t 4 0 t 4 0" fill="none" />;
      })}
    </g>
  );
}

function NeckInk({ tattoos, g }: { tattoos: Tattoo[]; g: Geo }) {
  const t = tattoos.find((x) => x.spot === 'neck');
  if (!t) return null;
  const c = { stroke: INK, fill: 'none', strokeWidth: 1.5, opacity: 0.8 };
  const y = 108;
  switch (t.design) {
    case 'rose': return <g {...c}><circle cx={100} cy={y} r={4} /><circle cx={100} cy={y} r={1.8} /></g>;
    case 'stars': return <g fill={INK} opacity={0.7}>{[-6, 0, 6].map((d) => <circle key={d} cx={100 + d} cy={y + (d ? 2 : 0)} r={1.4} />)}</g>;
    case 'crown': return <path d={`M 93 ${y + 3} l 2 -6 l 3 4 l 2 -5 l 2 5 l 3 -4 l 2 6 Z`} {...c} />;
    case 'adinkra': return <path d={`M 100 ${y - 5} v 10 M 96 ${y - 2} h 8 M 96 ${y + 2} h 8`} {...c} />;
    case 'money': return <text x={100} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK} opacity={0.7}>$</text>;
    default: return <path d={`M ${100 - g.neck + 2} ${y} q 3 -3 5 0 t 5 0 t 5 0`} {...c} />;
  }
}

function Headwear({ w }: { w?: Wearable }) {
  if (!w) return null;
  const c = w.c1;
  const d = shade(c, -30);
  switch (w.shape) {
    case 'cap': return <g><path d="M 66 58 Q 66 20 100 20 Q 134 20 134 58 Z" fill={c} /><path d="M 64 56 Q 100 50 138 56 Q 136 64 100 62 Q 70 64 64 56 Z" fill={d} /><circle cx={100} cy={21} r={2.4} fill={d} /></g>;
    case 'cap_back': return <g><path d="M 66 58 Q 66 20 100 20 Q 134 20 134 58 Q 100 50 66 58 Z" fill={c} /><rect x={92} y={50} width={16} height={6} rx={2} fill={d} /></g>;
    case 'beanie': return <g><path d="M 66 58 Q 64 16 100 16 Q 136 16 134 58 Z" fill={c} /><rect x={64} y={48} width={72} height={12} rx={5} fill={d} /></g>;
    case 'durag': return <g><path d="M 67 64 Q 64 24 100 24 Q 136 24 133 64 Q 126 46 100 46 Q 74 46 67 64 Z" fill={c} /><path d="M 70 60 Q 100 54 130 60" stroke={d} strokeWidth={2} fill="none" /><path d="M 132 56 Q 146 80 140 112 L 134 110 Q 138 82 128 62 Z" fill={c} opacity={0.9} /></g>;
    case 'bucket': return <g><path d="M 70 56 Q 70 22 100 22 Q 130 22 130 56 Z" fill={c} /><path d="M 58 60 Q 100 46 142 60 L 136 66 Q 100 56 64 66 Z" fill={d} /></g>;
    case 'bandana': return <g><path d="M 68 56 Q 66 34 100 32 Q 134 34 132 56 Q 100 50 68 56 Z" fill={c} /><path d="M 130 50 l 10 6 l -8 4 Z" fill={d} />{[80, 92, 104, 116].map((x) => <circle key={x} cx={x} cy={44} r={1.4} fill="#fff" opacity={0.7} />)}</g>;
    default: return null;
  }
}

function Eyewear({ w }: { w?: Wearable }) {
  if (!w) return null;
  if (w.shape === 'round') return <g stroke={w.c1} strokeWidth={1.6} fill="rgba(180,220,255,0.15)"><circle cx={88} cy={74} r={7.5} /><circle cx={112} cy={74} r={7.5} /><path d="M 95.5 74 L 104.5 74" /></g>;
  if (w.shape === 'visor') return <rect x={76} y={68} width={48} height={11} rx={5} fill={w.c1} opacity={0.92} />;
  return <g fill={w.c1}><rect x={78} y={68.5} width={19} height={11} rx={4} /><rect x={103} y={68.5} width={19} height={11} rx={4} /><rect x={96} y={71} width={8} height={2.5} /><rect x={80} y={70} width={6} height={2} rx={1} fill="#fff" opacity={0.25} /></g>;
}

function Jewelry({ look, g }: { look: Look; g: Geo }) {
  const ch = look.outfit.chain;
  const ears = look.outfit.ears;
  const wrist = look.outfit.wrist;
  return (
    <g>
      {ears && [[69, 86], [131, 86]].map(([x, y], i) => ears.shape === 'hoops'
        ? <circle key={i} cx={x} cy={y + 3} r={4} stroke={ears.c1} strokeWidth={1.4} fill="none" />
        : <circle key={i} cx={x} cy={y} r={ears.shape === 'iced' ? 2.6 : 1.9} fill={ears.shape === 'iced' ? '#e8f4ff' : ears.c1} stroke={ears.shape === 'iced' ? '#9ad0ff' : 'none'} strokeWidth={0.6} />)}
      {ch && (
        <g>
          {(ch.shape === 'cuban' || ch.shape === 'layered') && <path d={`M ${100 - g.neck - 4} 116 Q 100 ${ch.shape === 'layered' ? 140 : 146} ${100 + g.neck + 4} 116`} stroke={ch.c1} strokeWidth={ch.shape === 'cuban' ? 4.2 : 2.4} strokeDasharray={ch.shape === 'cuban' ? '3 1.2' : undefined} fill="none" />}
          {ch.shape === 'layered' && <path d={`M ${100 - g.neck - 6} 117 Q 100 158 ${100 + g.neck + 6} 117`} stroke={ch.c1} strokeWidth={1.8} fill="none" />}
          {ch.shape === 'pendant' && <g><path d={`M ${100 - g.neck - 4} 116 Q 100 150 ${100 + g.neck + 4} 116`} stroke={ch.c1} strokeWidth={1.6} fill="none" /><path d="M 100 144 l 7 6 l -7 9 l -7 -9 Z" fill={ch.c2 ?? '#e8f4ff'} stroke={ch.c1} strokeWidth={1} /></g>}
          {ch.shape === 'pearls' && Array.from({ length: 11 }, (_, i) => { const t = i / 10; const x = (100 - g.neck - 4) + t * (2 * g.neck + 8); const y = 116 + Math.sin(t * Math.PI) * 26; return <circle key={i} cx={x} cy={y} r={2.2} fill="#f5f1e6" />; })}
        </g>
      )}
      {wrist && <rect x={100 - g.sh - 14} y={236} width={14} height={6} rx={2} fill={wrist.shape === 'iced' ? '#dff0ff' : wrist.shape === 'sport' ? '#222' : '#e3b341'} />}
    </g>
  );
}

// ─── THE WHOLE THING ───────────────────────────────────────────────────────

export const Character = memo(function Character({ look, view = 'full', className, bg, crop }: { look: Look; view?: 'full' | 'bust'; className?: string; bg?: string; /** A viewBox to zoom on part of the body (item thumbnails). */ crop?: string }) {
  const uid = useId();
  const skin = SKIN[look.skin] ?? SKIN.brown;
  const g = geometry(look);
  const top = look.outfit.top;
  const vb = crop ?? (view === 'bust' ? '38 0 124 136' : '20 -10 160 406');
  const showHairBack = HAIR_BACK.has(look.hair) && !(look.outfit.head && ['beanie', 'durag', 'bucket'].includes(look.outfit.head.shape) && look.hair !== 'box_braids' && look.hair !== 'dreads_long' && look.hair !== 'long_straight');
  return (
    <svg viewBox={vb} className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Character">
      {bg && <defs><radialGradient id={`bg${uid}`} cx="50%" cy="30%" r="80%"><stop offset="0%" stopColor={bg} stopOpacity={0.55} /><stop offset="100%" stopColor={bg} stopOpacity={0.08} /></radialGradient></defs>}
      {bg && <rect x={-50} y={-50} width={300} height={500} fill={`url(#bg${uid})`} />}
      {view === 'full' && <ellipse cx={100} cy={378} rx={58} ry={7} fill="#000" opacity={0.3} />}
      {showHairBack && <g transform={HEAD}><HairBack look={look} /></g>}
      {(view === 'full' || crop) && <Bottom g={g} b={look.outfit.bottom} skin={skin} />}
      {(view === 'full' || crop) && <Shoes g={g} s={look.outfit.shoes} />}
      <Arms g={g} skin={skin} top={top} tattoos={look.tattoos} />
      <Torso g={g} skin={skin} top={top} tattoos={look.tattoos} />
      {/* Neck */}
      <rect x={100 - g.neck} y={96} width={g.neck * 2} height={26} rx={g.neck * 0.6} fill={skin.base} />
      <rect x={100 - g.neck} y={108} width={g.neck * 2} height={10} fill={skin.shade} opacity={0.35} />
      <NeckInk tattoos={look.tattoos} g={g} />
      <Top g={g} top={top} />
      <Jewelry look={look} g={g} />
      <g transform={HEAD}>
        {(!look.outfit.head || !['beanie', 'durag', 'bucket'].includes(look.outfit.head.shape) || look.hair === 'box_braids' || look.hair === 'dreads_long' || look.hair === 'long_straight') && <HairDrape look={look} />}
        {/* Ears and head */}
        <ellipse cx={69} cy={76} rx={5.5} ry={8.5} fill={skin.shade} />
        <ellipse cx={131} cy={76} rx={5.5} ry={8.5} fill={skin.shade} />
        <path d={look.frame === 'femme' ? 'M 69 70 Q 69 32 100 32 Q 131 32 131 70 Q 131 96 112 106 Q 100 112 88 106 Q 69 96 69 70 Z' : 'M 68 70 Q 68 32 100 32 Q 132 32 132 70 Q 132 98 114 107 Q 100 113 86 107 Q 68 98 68 70 Z'} fill={skin.base} />
        <path d="M 74 92 Q 86 108 100 109 Q 114 108 126 92 Q 118 104 100 105 Q 82 104 74 92 Z" fill={skin.shade} opacity={0.25} />
        <ellipse cx={86} cy={52} rx={10} ry={5} fill="#fff" opacity={0.06} />
        <Beard look={look} skin={skin} />
        <Face look={look} skin={skin} />
        <FaceInk tattoos={look.tattoos} />
        {(!look.outfit.head || look.outfit.head.shape === 'bandana' || look.outfit.head.shape === 'cap_back') && <HairFront look={look} />}
        <Headwear w={look.outfit.head} />
        <Eyewear w={look.outfit.eyes} />
      </g>
    </svg>
  );
});

/** A round portrait for avatars. */
export function Portrait({ look, size = 40, ring, bg = '#ffb800' }: { look: Look; size?: number; ring?: string; bg?: string }) {
  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size, background: `radial-gradient(circle at 50% 35%, ${bg}55, #14161e 75%)`, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}>
      <Character look={look} view="bust" className="w-full h-full" />
    </div>
  );
}

/** Where each slot sits on the body, for item thumbnails. */
export const SLOT_CROP: Record<string, string> = {
  top: '28 92 144 160', bottom: '38 206 124 168', shoes: '40 318 120 72', head: '50 -10 100 98', eyes: '62 52 76 46',
  chain: '56 94 88 84', ears: '56 50 88 66', wrist: '26 206 62 56', grillz: '74 74 52 44',
};

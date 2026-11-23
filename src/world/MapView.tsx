// ─── THE CITY: MAP ─────────────────────────────────────────────────────────
//
// Like a shooter's radar: a small round minimap in the corner that never takes
// more than a sliver of the screen, and a tap opens the whole city. On the big
// map you can tap a place (or pick it from the list) to send the GPS there.

import { useEffect, useRef, useState } from 'react';
import { cityLayout, placesNow, ROAD_CENTRES, ROAD_HALF, WORLD, WORLD_CENTRE } from './layout';
import { live } from './sim';
import { gpsState, setGpsPlace } from './gps';
import { hudStore } from './input';

/** Minimap diameter in CSS px (before the HUD's own scale). */
export const MINIMAP = 84;

interface PaintOpts { labels: boolean; focus: { x: number; z: number }; scale: number }

function paint(g: CanvasRenderingContext2D, w: number, h: number, o: PaintOpts) {
  const L = cityLayout();
  const s = o.scale;
  const X = (x: number) => w / 2 + (x - o.focus.x) * s;
  const Z = (z: number) => h / 2 + (z - o.focus.z) * s;
  const driving = live.mode === 'car';
  const me = driving ? live.car : live.p;

  g.fillStyle = '#16181f';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#5c616e';
  g.fillRect(X(WORLD.x0), Z(WORLD.z0), (WORLD.x1 - WORLD.x0) * s, (WORLD.z1 - WORLD.z0) * s);
  g.fillStyle = '#2a2d36';
  for (const c of ROAD_CENTRES) {
    g.fillRect(X(c - ROAD_HALF), Z(WORLD.z0), ROAD_HALF * 2 * s, (WORLD.z1 - WORLD.z0) * s);
    g.fillRect(X(WORLD.x0), Z(c - ROAD_HALF), (WORLD.x1 - WORLD.x0) * s, ROAD_HALF * 2 * s);
  }
  for (const b of L.blocks) if (b.park) { g.fillStyle = '#4c7a3b'; g.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * s, (b.maxZ - b.minZ) * s); }
  for (const b of L.buildings) {
    g.fillStyle = b.place ? b.place.accent : '#3b3f4b';
    g.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * s, (b.maxZ - b.minZ) * s);
  }
  // Place letters (and, on the big map, names).
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const b of L.buildings) {
    if (!b.place) continue;
    const cx = X((b.minX + b.maxX) / 2), cz = Z((b.minZ + b.maxZ) / 2);
    g.fillStyle = '#000';
    g.font = `bold ${o.labels ? 15 : 9}px system-ui, sans-serif`;
    g.fillText(b.place.glyph, cx, cz);
  }
  // The GPS line and where it ends.
  if (gpsState.route.length > 1 && gpsState.target) {
    g.strokeStyle = '#ffc21a'; g.lineWidth = o.labels ? 4 : 3; g.lineJoin = 'round';
    g.beginPath();
    gpsState.route.forEach((q, i) => (i ? g.lineTo(X(q.x), Z(q.z)) : g.moveTo(X(q.x), Z(q.z))));
    g.stroke();
    const tg = gpsState.target;
    const edge = o.labels ? 10 : 7;
    const tx = Math.max(edge, Math.min(w - edge, X(tg.x))), tz = Math.max(edge, Math.min(h - edge, Z(tg.z)));
    g.fillStyle = '#ffc21a'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(tx, tz, o.labels ? 8 : 5, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  // Your car, when you're not in it.
  if (!driving) {
    g.save();
    g.translate(X(live.car.x), Z(live.car.z));
    g.rotate(-live.car.heading);
    const k = o.labels ? 1.5 : 1;
    g.fillStyle = '#ffb800'; g.strokeStyle = '#000'; g.lineWidth = 1;
    g.fillRect(-2.2 * k, -4 * k, 4.4 * k, 8 * k);
    g.strokeRect(-2.2 * k, -4 * k, 4.4 * k, 8 * k);
    g.restore();
  }
  // You.
  g.save();
  g.translate(X(me.x), Z(me.z));
  g.rotate(-(driving ? live.car.heading : live.p.rot));
  const a = o.labels ? 1.5 : 1;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, 7 * a); g.lineTo(5 * a, -5 * a); g.lineTo(0, -2.5 * a); g.lineTo(-5 * a, -5 * a); g.closePath();
  g.fill(); g.stroke();
  g.restore();
}

function useCanvas(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, fps: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d')!;
    let raf = 0, last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / fps) return;
      last = now;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRef.current(g, w, h);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [w, h, fps]);
  return ref;
}

/** The corner radar. Tap it to open the full map. Zooms out when you drive. */
export function Minimap({ onOpen }: { onOpen: () => void }) {
  const ref = useCanvas((g, w, h) => {
    const me = live.mode === 'car' ? live.car : live.p;
    paint(g, w, h, { labels: false, focus: { x: me.x, z: me.z }, scale: w / (live.mode === 'car' ? 150 : 100) });
  }, MINIMAP, MINIMAP, 15);
  return (
    <button
      onClick={onOpen}
      aria-label="Open the map"
      className="pointer-events-auto absolute left-2.5 sm:left-3 top-14 rounded-full overflow-hidden border-2 border-white/35 shadow-lg active:scale-95 transition-transform"
      style={{ width: MINIMAP, height: MINIMAP }}
    >
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
    </button>
  );
}

/** The whole city, with a list of places. Tap a place to send the GPS there. */
export function MapOverlay({ onClose }: { onClose: () => void }) {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const portrait = vp.w < vp.h;
  const side = Math.floor(portrait ? Math.min(vp.w - 24, vp.h * 0.5) : Math.min(vp.h - 24, vp.w * 0.58));
  const ref = useCanvas((g, w, h) => paint(g, w, h, { labels: true, focus: WORLD_CENTRE, scale: Math.min(w, h) / (WORLD.x1 - WORLD.x0 + 8) }), side, side, 10);
  const [, bump] = useState(0);

  const go = (id: string | null, name?: string) => {
    setGpsPlace(id);
    if (id) hudStore.toast(`📍 GPS set: ${name}`, 2600);
    bump((n) => n + 1);
    if (id) onClose();
  };
  const tap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const s = Math.min(side, side) / (WORLD.x1 - WORLD.x0 + 8);
    const wx = ((e.clientX - r.left) / r.width * side - side / 2) / s + WORLD_CENTRE.x;
    const wz = ((e.clientY - r.top) / r.height * side - side / 2) / s + WORLD_CENTRE.z;
    let best: { id: string; name: string; d: number } | null = null;
    for (const b of cityLayout().buildings) {
      if (!b.place) continue;
      const d = Math.hypot((b.minX + b.maxX) / 2 - wx, (b.minZ + b.maxZ) / 2 - wz);
      if (d < 26 && (!best || d < best.d)) best = { id: b.place.id, name: b.place.name, d };
    }
    if (best) go(best.id, best.name);
  };

  return (
    <div className="fixed inset-0 z-[350] pointer-events-auto bg-black/80 backdrop-blur-sm flex" style={{ flexDirection: portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12 }}>
      <canvas ref={ref} onPointerDown={tap} style={{ width: side, height: side, touchAction: 'none' }} className="rounded-[14px] border-2 border-white/25 shrink-0" />
      <div className="flex flex-col min-h-0 min-w-0 w-full" style={{ maxWidth: portrait ? side : 300, maxHeight: portrait ? vp.h - side - 48 : vp.h - 24 }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[15px] font-bold text-ink">Map · tap a place for GPS</div>
          <button onClick={onClose} aria-label="Close the map" className="w-10 h-10 rounded-full border border-white/25 text-ink2 text-[16px] shrink-0">✕</button>
        </div>
        <div className="overflow-y-auto space-y-1.5 pr-1">
          {placesNow().map((p) => (
            <button key={p.id} onClick={() => go(p.id, p.name)} className="w-full flex items-center gap-2.5 rounded-[12px] border border-white/15 bg-white/[0.05] px-3 h-11 text-left active:bg-white/10">
              <span className="w-6 h-6 rounded-md text-black text-[12px] font-black flex items-center justify-center shrink-0" style={{ background: p.accent }}>{p.glyph}</span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-ink truncate">{p.name}</span><span className="block text-[10px] text-ink3 truncate">{p.tagline}</span></span>
              <span className="text-[11px] text-amber font-bold shrink-0">📍 Go</span>
            </button>
          ))}
          {gpsState.target ? (
            <button onClick={() => { go(null); }} className="w-full h-10 rounded-[12px] border border-white/15 text-[12px] text-ink2">Clear route</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// The cockpit: dashboard overlay, steering wheel (or arrows), pedals, and the
// controls panel. Everything can be moved, resized or swapped to the other side.
import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { input } from './input';
import { drivePrefs, useDrivePrefs, type DrivePrefs } from './drivePrefs';
import { radio, useRadio } from './radio';
import { useUi } from './ui';

const hold = (set: (v: boolean) => void) => ({
  onPointerDown: (e: RPE) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); set(true); },
  onPointerUp: () => set(false),
  onPointerCancel: () => set(false),
});

/** Drag handle used in "arrange" mode. */
function useDrag(u: number, off: { x: number; y: number }, commit: (o: { x: number; y: number }) => void, on: boolean) {
  const st = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  return on ? {
    onPointerDown: (e: RPE) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); st.current = { sx: e.clientX, sy: e.clientY, ox: off.x, oy: off.y }; },
    onPointerMove: (e: RPE) => { const s = st.current; if (s) commit({ x: s.ox + (e.clientX - s.sx) / u, y: s.oy + (e.clientY - s.sy) / u }); },
    onPointerUp: () => { st.current = null; },
  } : {};
}

function Wheel({ size }: { size: number }) {
  const [ang, setAng] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const grab = useRef<{ a0: number; base: number } | null>(null);
  const raf = useRef(0);
  const angleAt = (e: RPE) => { const r = ref.current!.getBoundingClientRect(); return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; };
  const set = (a: number) => { const v = Math.max(-120, Math.min(120, a)); setAng(v); input.touchSteer = v / 90 > 1 ? 1 : v / 90 < -1 ? -1 : v / 90; };
  useEffect(() => () => { cancelAnimationFrame(raf.current); input.touchSteer = 0; }, []);
  const ease = (a: number) => { cancelAnimationFrame(raf.current); const step = () => { a *= 0.82; if (Math.abs(a) < 1) { set(0); return; } set(a); raf.current = requestAnimationFrame(step); }; step(); };
  return (
    <div
      ref={ref}
      className="rounded-full touch-none select-none"
      style={{ width: size, height: size, transform: `rotate(${ang}deg)` }}
      onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); cancelAnimationFrame(raf.current); grab.current = { a0: angleAt(e), base: ang }; }}
      onPointerMove={(e) => { const g = grab.current; if (!g) return; let d = angleAt(e) - g.a0; if (d > 180) d -= 360; if (d < -180) d += 360; set(g.base + d); }}
      onPointerUp={() => { grab.current = null; ease(ang); }}
      onPointerCancel={() => { grab.current = null; ease(ang); }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#1b1b1f" strokeWidth="11" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="#4b4b55" strokeWidth="2" opacity=".7" />
        <rect x="8" y="46" width="84" height="9" rx="3" fill="#2a2a30" />
        <rect x="46" y="50" width="9" height="42" rx="3" fill="#2a2a30" />
        <circle cx="50" cy="50" r="15" fill="#34343b" stroke="#6a6a75" strokeWidth="1.5" />
        <rect x="46" y="4" width="8" height="12" rx="2" fill="#f5b301" />
      </svg>
    </div>
  );
}

export function Dashboard({ kmh }: { kmh: number }) {
  const needle = -120 + Math.min(240, kmh * 1.6);
  return (
    <div className="absolute inset-x-0 bottom-0 h-[34%] pointer-events-none">
      <svg viewBox="0 0 800 220" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path d="M0 40 Q 400 -10 800 40 L 800 220 L 0 220 Z" fill="#c2410c" />
        <path d="M0 78 L 800 78 L 800 220 L 0 220 Z" fill="#0f1014" />
        <rect x="0" y="74" width="800" height="5" fill="#000" opacity=".5" />
      </svg>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-end gap-3">
        <div className="relative w-[88px] h-[88px] rounded-full bg-black border-2 border-[#3a3a44] flex items-center justify-center">
          <div className="absolute w-[3px] h-[36px] bg-red-500 origin-bottom rounded" style={{ bottom: '50%', transform: `rotate(${needle}deg)` }} />
          <div className="absolute bottom-[8px] text-[9px] leading-none text-ink2">km/h</div>
          <div className="absolute bottom-[21px] text-[18px] leading-none font-black num text-ink">{kmh}</div>
        </div>
      </div>
    </div>
  );
}

export function CarControls() {
  const p = useDrivePrefs();
  const [panel, setPanel] = useState(false);
  const [arrange, setArrange] = useState(false);
  const rad = useRadio();
  const u = useUi();
  const base = 'pointer-events-auto rounded-xl flex items-center justify-center font-black select-none touch-none border';
  const wheelSize = 150 * p.scale;
  const steerSide = p.side === 'right' ? { right: 18 - p.steerOff.x } : { left: 18 + p.steerOff.x };
  const pedalSide = p.side === 'right' ? { left: 18 + p.pedalOff.x } : { right: 18 - p.pedalOff.x };
  const outline = arrange ? 'outline outline-2 outline-dashed outline-amber' : '';
  const dragSteer = useDrag(u, p.steerOff, (o) => drivePrefs.set({ steerOff: p.side === 'right' ? { x: -o.x, y: o.y } : o }), arrange);
  const dragPedal = useDrag(u, p.pedalOff, (o) => drivePrefs.set({ pedalOff: p.side === 'right' ? o : { x: -o.x, y: o.y } }), arrange);
  // Dragging right moves a right-anchored group left, so flip the sign for it.
  return (
    <>
      <div className={`fixed bottom-4 ${outline} rounded-2xl`} style={{ ...steerSide, transform: `translateY(${p.steerOff.y}px)` }} {...dragSteer}>
        {p.steer === 'wheel' ? (
          <div className={arrange ? 'pointer-events-none' : ''}><Wheel size={wheelSize} /></div>
        ) : (
          <div className={`flex gap-3 ${arrange ? 'pointer-events-none' : ''}`}>
            <button aria-label="Steer left" className={`${base} bg-black/50 border-white/25 text-[34px]`} style={{ width: 84 * p.scale, height: 84 * p.scale }} {...hold((v) => { input.touchSteer = v ? -1 : 0; })}>◀</button>
            <button aria-label="Steer right" className={`${base} bg-black/50 border-white/25 text-[34px]`} style={{ width: 84 * p.scale, height: 84 * p.scale }} {...hold((v) => { input.touchSteer = v ? 1 : 0; })}>▶</button>
          </div>
        )}
      </div>

      <div className={`fixed bottom-4 flex items-end gap-3 ${outline} rounded-2xl`} style={{ ...pedalSide, transform: `translateY(${p.pedalOff.y}px)` }} {...dragPedal}>
        <div className={`flex items-end gap-3 ${arrange ? 'pointer-events-none' : ''}`}>
          <button aria-label="Brake" className={`${base} bg-red-600/80 border-red-400 text-[13px]`} style={{ width: 64 * p.scale, height: 96 * p.scale }} {...hold((v) => { input.touchBrake = v; })}>BRAKE</button>
          <button aria-label="Gas" className={`${base} ${p.reverse ? 'bg-amber/85 border-amber' : 'bg-green-500/85 border-green-300'} text-black text-[14px]`} style={{ width: 76 * p.scale, height: 128 * p.scale }} {...hold((v) => { input.touchGas = v && !p.reverse; input.touchReverse = v && p.reverse; })}>{p.reverse ? 'REV' : 'GAS'}</button>
        </div>
      </div>

      <div className="fixed top-14 right-3 flex flex-col gap-2 items-end pointer-events-none">
        <button className="pointer-events-auto h-9 px-3 rounded-full bg-black/60 border border-white/15 text-[12px] font-bold" onClick={() => drivePrefs.set({ reverse: !p.reverse })}>{p.reverse ? 'R · reverse' : 'D · drive'}</button>
        <button className="pointer-events-auto h-9 px-3 rounded-full bg-black/60 border border-white/15 text-[12px] font-bold" onClick={() => setPanel((v) => !v)} aria-label="Controls">⚙ Controls</button>
        <button className="pointer-events-auto h-9 px-3 rounded-full bg-black/60 border border-white/15 text-[12px] font-bold" onClick={() => radio.toggle()}>{rad.on ? '📻 Radio on' : '📻 Radio off'}</button>
      </div>

      {panel ? (
        <div className="fixed top-14 right-28 w-[250px] rounded-2xl bg-black/85 backdrop-blur border border-white/15 p-3 space-y-2 text-[12px] pointer-events-auto z-[60]">
          <Row label="View"><Seg v={p.view} opts={[['cockpit', 'Cockpit'], ['chase', 'Behind']]} on={(v) => drivePrefs.set({ view: v as DrivePrefs['view'] })} /></Row>
          <Row label="Steering"><Seg v={p.steer} opts={[['wheel', 'Wheel'], ['arrows', 'Arrows']]} on={(v) => drivePrefs.set({ steer: v as DrivePrefs['steer'] })} /></Row>
          <Row label="Steering side"><Seg v={p.side} opts={[['left', 'Left'], ['right', 'Right']]} on={(v) => drivePrefs.set({ side: v as DrivePrefs['side'], steerOff: { x: 0, y: p.steerOff.y }, pedalOff: { x: 0, y: p.pedalOff.y } })} /></Row>
          <Row label="Size"><input type="range" min={0.7} max={1.4} step={0.05} value={p.scale} onChange={(e) => drivePrefs.set({ scale: +e.target.value })} className="w-full" /></Row>
          <div className="flex gap-2">
            <button className="flex-1 h-9 rounded-lg bg-amber text-black font-bold" onClick={() => { setArrange(true); setPanel(false); }}>Arrange</button>
            <button className="flex-1 h-9 rounded-lg border border-white/20" onClick={() => drivePrefs.reset()}>Reset</button>
          </div>
        </div>
      ) : null}
      {arrange ? (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto flex items-center gap-3 rounded-full bg-black/85 border border-amber px-4 h-10 text-[12px]">
          Drag the wheel and pedals where you like them
          <button className="h-7 px-3 rounded-full bg-amber text-black font-bold" onClick={() => setArrange(false)}>Done</button>
        </div>
      ) : null}
    </>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (<div><div className="text-ink3 mb-1">{label}</div>{children}</div>);
const Seg = ({ v, opts, on }: { v: string; opts: [string, string][]; on: (v: string) => void }) => (
  <div className="flex gap-1">{opts.map(([id, l]) => <button key={id} onClick={() => on(id)} className={`flex-1 h-8 rounded-lg border ${v === id ? 'bg-amber text-black border-amber font-bold' : 'border-white/20 text-ink2'}`}>{l}</button>)}</div>
);

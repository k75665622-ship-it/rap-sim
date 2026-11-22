// ─── THE CITY: HUD ─────────────────────────────────────────────────────────
//
// Everything drawn over the 3D view: the way back to the menus, clock and
// cash, the minimap, the "press E" prompt, the speedometer, and on a phone
// the thumb controls (stick on the left, buttons on the right, drag anywhere
// else to look around).

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as RPointerEvent } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameClock } from '../components/layout/GameClock';
import { money } from '@/utils/format';
import { cityLayout, ROAD_CENTRES, ROAD_HALF, WORLD_HALF } from './layout';
import { hudStore, input } from './input';
import { live } from './sim';
import { phone, usePhoneOpen } from './phone';
import { useUnread } from './Phone';
import { TalkCard } from './TalkCard';
import { StageOverlays } from './Stage';
import { radio, STATION, useRadio } from './radio';
import { CarControls, Dashboard } from './CarControls';
import { useDrivePrefs } from './drivePrefs';

const coarse = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
const HELP_KEY = 'rl_city_help_v4';

export function Hud({ onExit }: { onExit: () => void }) {
  const hud = useSyncExternalStore(hudStore.subscribe, hudStore.get);
  const cash = useGameStore((s) => s.player?.career.money ?? 0);
  const [touch] = useState(coarse);
  const phoneOut = usePhoneOpen();
  const cockpit = useDrivePrefs().view === 'cockpit';
  const unread = useUnread();
  const [help, setHelp] = useState(() => {
    try { return !localStorage.getItem(HELP_KEY); } catch { return true; }
  });
  const closeHelp = () => { setHelp(false); try { localStorage.setItem(HELP_KEY, '1'); } catch { /* private mode */ } };

  return (
    <div className="absolute inset-0 pointer-events-none select-none text-ink">
      <TouchLayer touch={touch} mode={hud.mode} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-2.5 sm:p-3 flex items-start gap-2">
        <button
          onClick={onExit}
          className="pointer-events-auto h-9 px-3 rounded-full bg-black/55 backdrop-blur border border-white/10 text-[13px] font-semibold hover:bg-black/70"
        >
          ☰ Overview
        </button>
        <button
          onClick={() => (phoneOut ? phone.close() : phone.open())}
          aria-label="Phone"
          className="pointer-events-auto relative h-9 pl-2.5 pr-3 rounded-full bg-black/55 backdrop-blur border border-white/10 text-[13px] font-semibold hover:bg-black/70 flex items-center gap-1.5"
        >
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="1" y="1" width="12" height="16" rx="2.5" /><path d="M5.5 14h3" strokeLinecap="round" /></svg>
          Phone{touch ? '' : <span className="text-ink3 font-normal"> · P</span>}
          {unread.total > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-fall text-white text-[10px] font-bold flex items-center justify-center num">
              {unread.total > 9 ? '9+' : unread.total}
            </span>
          ) : null}
        </button>
        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <div className="h-9 px-3 rounded-full bg-black/55 backdrop-blur border border-white/10 flex items-center text-[13px] font-semibold text-rise num">
            {money(cash)}
          </div>
          <div className="rounded-full bg-black/55 backdrop-blur border border-white/10 px-2 py-1">
            <GameClock compact />
          </div>
        </div>
      </div>

      <Minimap />

      {/* Toast */}
      {hud.toast ? (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] rounded-[14px] bg-black/75 backdrop-blur border border-white/10 px-4 py-3 text-[13px] leading-snug rl-fade">
          {hud.toast}
        </div>
      ) : null}

      {/* Interaction prompt */}
      {hud.prompt && !phoneOut && !hud.talk ? (
        <div className={`absolute left-1/2 -translate-x-1/2 ${touch ? 'bottom-44' : 'bottom-10'} flex items-center gap-2 h-10 pl-1.5 pr-4 rounded-full bg-black/70 backdrop-blur border border-amber/40 text-[14px] font-semibold rl-fade`}>
          <span className="w-7 h-7 rounded-full bg-amber text-black font-black text-[13px] flex items-center justify-center">{touch ? '✋' : 'E'}</span>
          {hud.prompt}
        </div>
      ) : null}

      {/* Speedometer */}
      {hud.mode === 'car' && !phoneOut && !cockpit ? (
        <div className={`absolute ${touch ? 'right-4 bottom-48' : 'right-5 bottom-6'} text-right`}>
          <div className="rounded-[14px] bg-black/55 backdrop-blur border border-white/10 px-3 py-1.5">
            <div className="text-[40px] leading-none font-black num">{hud.speedKmh}</div>
            <div className="text-[10px] tracking-widest text-ink2 font-bold">KM/H</div>
          </div>
        </div>
      ) : null}

      {touch && !phoneOut && !hud.talk ? <TouchButtons mode={hud.mode} /> : null}
      {hud.mode === 'car' && !phoneOut && cockpit ? <Dashboard kmh={hud.speedKmh} /> : null}
      {hud.mode === 'car' && !phoneOut && !hud.talk ? <CarControls /> : null}

      {hud.mode === 'car' && !phoneOut && !touch ? <RadioPill touch={touch} /> : null}

      {/* Open mic and video shoot, on foot. */}
      {hud.mode === 'foot' && !phoneOut && !hud.talk && !hud.gig && !hud.shooting ? (
        <div className={`absolute ${touch ? 'left-3 bottom-48' : 'left-3 bottom-6'} flex flex-col items-start gap-2`}>
          {hud.nearStage ? (
            <button onClick={() => hudStore.set({ gig: true })} className="pointer-events-auto h-10 px-4 rounded-full bg-re text-white text-[13px] font-bold shadow-lg">🎤 Open mic{touch ? '' : ' · G'}</button>
          ) : null}
          <button onClick={() => hudStore.set({ shooting: true })} className="pointer-events-auto h-9 px-3.5 rounded-full bg-black/55 backdrop-blur border border-white/10 text-[13px] font-semibold">🎬 Shoot a clip{touch ? '' : ' · V'}</button>
        </div>
      ) : null}

      <TalkCard />
      <StageOverlays />

      {help ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto bg-black/40" onClick={closeHelp}>
          <div className="w-full max-w-[360px] rounded-[16px] bg-card border border-line p-5 rl-fade" onClick={(e) => e.stopPropagation()}>
            <div className="text-[11px] tracking-widest text-amber font-bold mb-1">FREE ROAM · PREVIEW</div>
            <div className="text-[18px] font-bold mb-3">Welcome to the city</div>
            {touch ? (
              <ul className="text-[13px] text-ink2 space-y-1.5 mb-4">
                <li><b className="text-ink">Left thumb</b> — walk, or drive when you're in the car</li>
                <li><b className="text-ink">Drag on the right</b> — look around</li>
                <li><b className="text-ink">✋</b> — go into a building, get in or out of the car</li>
                <li><b className="text-ink">Run / Jump</b> on foot. In the car: <b className="text-ink">◀ ▶</b> steer, <b className="text-ink">Gas</b>, <b className="text-ink">Brake</b>, <b className="text-ink">Rev</b>; radio is off until you switch it on</li>
                <li><b className="text-ink">Phone</b> (top) — chats, mail, socials, streams</li>
                <li><b className="text-ink">✋</b> near someone — talk to them</li>
              </ul>
            ) : (
              <ul className="text-[13px] text-ink2 space-y-1.5 mb-4">
                <li><b className="text-ink">W A S D</b> or arrows — walk / drive</li>
                <li><b className="text-ink">Shift</b> — run · <b className="text-ink">Space</b> — jump / handbrake</li>
                <li><b className="text-ink">E</b> — go into a building, get in or out of the car</li>
                <li><b className="text-ink">Drag the mouse</b> — look around</li>
                <li><b className="text-ink">P</b> — your phone: chats, mail, socials, streams</li>
                <li><b className="text-ink">E</b> near someone — talk to them · <b className="text-ink">R</b> — next song on the car radio</li>
                <li><b className="text-ink">V</b> — shoot a clip · <b className="text-ink">G</b> — open mic at The Stage (evenings)</li>
              </ul>
            )}
            <p className="text-[12px] text-ink3 mb-4">Glowing rings mark doors. Studio 9 opens your studio, The Stage your shows, First Capital your money, Mama's Kitchen feeds you. The people on the street are the producers, DJs and artists of your world.</p>
            <button onClick={closeHelp} className="w-full h-10 rounded-[10px] bg-amber text-black font-bold text-[14px]">Let's go</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── car radio ─────────────────────────────────────────────────────────────

function RadioPill({ touch }: { touch: boolean }) {
  const r = useRadio();
  const b = 'pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-[14px]';
  return (
    <div className="absolute top-14 left-[122px] right-2.5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:top-3 sm:max-w-[460px] h-10 pl-3 pr-1 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center gap-2 text-[12px] rl-fade">
      <span className="text-[15px]">📻</span>
      <span className="font-black tracking-wide text-amber shrink-0">{STATION}</span>
      {r.live ? (
        <span className="min-w-0 truncate"><b className="font-semibold">{r.title}</b> <span className="text-ink2">· {r.artist}</span></span>
      ) : (
        <span className="text-ink3 truncate">{r.on ? 'Tuning…' : 'Off'}</span>
      )}
      {r.on ? (
        <button className={b} onClick={() => radio.next()} aria-label="Next song" title={touch ? 'Next song' : 'Next song (R)'}>⏭</button>
      ) : null}
      <button className={`${b} ${r.on ? 'text-ink' : 'text-ink3'}`} onClick={() => radio.toggle()} aria-label={r.on ? 'Radio off' : 'Radio on'}>⏻</button>
    </div>
  );
}

// ─── drag to look / thumb stick ────────────────────────────────────────────

function TouchLayer({ touch, mode }: { touch: boolean; mode: 'foot' | 'car' }) {
  const roles = useRef(new Map<number, { role: 'stick' | 'look'; ox: number; oy: number; lx: number; ly: number }>());
  const [stick, setStick] = useState<{ ox: number; oy: number; kx: number; ky: number } | null>(null);
  const R = 56;

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    const isTouch = e.pointerType !== 'mouse';
    const role = isTouch && mode === 'foot' && e.clientX < window.innerWidth * 0.45 ? 'stick' : 'look';
    if (role === 'stick' && [...roles.current.values()].some((r) => r.role === 'stick')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    roles.current.set(e.pointerId, { role, ox: e.clientX, oy: e.clientY, lx: e.clientX, ly: e.clientY });
    if (role === 'stick') setStick({ ox: e.clientX, oy: e.clientY, kx: 0, ky: 0 });
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const r = roles.current.get(e.pointerId);
    if (!r) return;
    if (r.role === 'look') {
      const k = e.pointerType === 'mouse' ? 1 : 1.35;
      input.lookDX += (e.clientX - r.lx) * k;
      input.lookDY += (e.clientY - r.ly) * k;
      r.lx = e.clientX;
      r.ly = e.clientY;
    } else {
      let dx = e.clientX - r.ox, dy = e.clientY - r.oy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      input.stick.x = dx / R;
      input.stick.y = -dy / R;
      setStick({ ox: r.ox, oy: r.oy, kx: dx, ky: dy });
    }
  };
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    const r = roles.current.get(e.pointerId);
    roles.current.delete(e.pointerId);
    if (r?.role === 'stick') { input.stick.x = 0; input.stick.y = 0; setStick(null); }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{ touchAction: 'none', cursor: touch ? undefined : 'grab' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {touch && mode === 'foot' ? (
        stick ? (
          <div className="absolute pointer-events-none" style={{ left: stick.ox - R, top: stick.oy - R, width: R * 2, height: R * 2 }}>
            <div className="absolute inset-0 rounded-full border-2 border-white/25 bg-black/20" />
            <div className="absolute w-14 h-14 rounded-full bg-white/70 shadow-lg" style={{ left: R - 28 + stick.kx, top: R - 28 + stick.ky }} />
          </div>
        ) : (
          <div className="absolute left-8 bottom-10 w-28 h-28 rounded-full border-2 border-white/15 bg-black/10 pointer-events-none flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/25" />
          </div>
        )
      ) : null}
    </div>
  );
}

function TouchButtons({ mode }: { mode: 'foot' | 'car' }) {
  const btn = 'pointer-events-auto rounded-full flex items-center justify-center font-bold select-none active:scale-95 transition-transform border';
  const hold = (set: (v: boolean) => void) => ({
    onPointerDown: (e: RPointerEvent) => { e.stopPropagation(); set(true); },
    onPointerUp: () => set(false),
    onPointerCancel: () => set(false),
    onPointerLeave: () => set(false),
  });
  return (
    <div className={mode === 'car' ? 'absolute left-1/2 -translate-x-1/2 bottom-[104px] w-16 h-16' : 'absolute right-4 bottom-8 w-[176px] h-[150px]'}>
      <button
        aria-label="Interact"
        className={`${btn} absolute right-0 top-0 w-16 h-16 bg-amber text-black border-amber text-[22px]`}
        onPointerDown={(e) => { e.stopPropagation(); input.actionQueued = true; }}
      >
        ✋
      </button>
      {mode === 'foot' ? (
        <>
          <button
            aria-label="Jump"
            className={`${btn} absolute right-0 bottom-0 w-[72px] h-[72px] bg-black/50 border-white/20 text-[13px]`}
            onPointerDown={(e) => { e.stopPropagation(); input.jumpQueued = true; }}
          >
            JUMP
          </button>
          <button
            aria-label="Run"
            className={`${btn} absolute left-0 bottom-2 w-16 h-16 bg-black/50 border-white/20 text-[13px]`}
            {...hold((v) => { input.touchSprint = v; })}
          >
            RUN
          </button>
        </>
      ) : null}
    </div>
  );
}

// ─── minimap ───────────────────────────────────────────────────────────────

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const size = window.innerWidth < 640 ? 108 : 132;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const g = cv.getContext('2d')!;
    const L = cityLayout();
    const span = 120; // metres across
    const s = size / span;
    let raf = 0;
    let last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 66) return; // ~15 fps is plenty
      last = now;
      const driving = live.mode === 'car';
      const fx = driving ? live.car.x : live.p.x;
      const fz = driving ? live.car.z : live.p.z;
      const X = (x: number) => size / 2 + (x - fx) * s;
      const Z = (z: number) => size / 2 + (z - fz) * s;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#5c616e';
      g.fillRect(0, 0, size, size);
      // Out of town.
      g.fillStyle = '#16181f';
      if (X(-WORLD_HALF) > 0) g.fillRect(0, 0, X(-WORLD_HALF), size);
      if (X(WORLD_HALF) < size) g.fillRect(X(WORLD_HALF), 0, size, size);
      if (Z(-WORLD_HALF) > 0) g.fillRect(0, 0, size, Z(-WORLD_HALF));
      if (Z(WORLD_HALF) < size) g.fillRect(0, Z(WORLD_HALF), size, size);
      // Roads.
      g.fillStyle = '#2a2d36';
      for (const c of ROAD_CENTRES) {
        g.fillRect(X(c - ROAD_HALF), Z(-WORLD_HALF), ROAD_HALF * 2 * s, WORLD_HALF * 2 * s);
        g.fillRect(X(-WORLD_HALF), Z(c - ROAD_HALF), WORLD_HALF * 2 * s, ROAD_HALF * 2 * s);
      }
      // Park.
      for (const b of L.blocks) if (b.park) { g.fillStyle = '#4c7a3b'; g.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * s, (b.maxZ - b.minZ) * s); }
      // Buildings.
      for (const b of L.buildings) {
        g.fillStyle = b.place ? b.place.accent : '#3b3f4b';
        g.globalAlpha = b.place ? 0.9 : 1;
        g.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * s, (b.maxZ - b.minZ) * s);
        g.globalAlpha = 1;
        if (b.place) {
          g.fillStyle = '#000';
          g.font = 'bold 10px system-ui, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(b.place.glyph, X((b.minX + b.maxX) / 2), Z((b.minZ + b.maxZ) / 2));
        }
      }
      // Your car, when you're not in it.
      if (!driving) {
        g.save();
        g.translate(X(live.car.x), Z(live.car.z));
        g.rotate(-live.car.heading);
        g.fillStyle = '#ffb800';
        g.strokeStyle = '#000';
        g.lineWidth = 1;
        g.fillRect(-2.2, -4, 4.4, 8);
        g.strokeRect(-2.2, -4, 4.4, 8);
        g.restore();
      }
      // You.
      const rot = driving ? live.car.heading : live.p.rot;
      g.save();
      g.translate(size / 2, size / 2);
      g.rotate(-rot);
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#000';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, 7);
      g.lineTo(5, -5);
      g.lineTo(0, -2.5);
      g.lineTo(-5, -5);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute left-2.5 sm:left-3 top-14 rounded-[14px] border-2 border-black/40 shadow-lg w-[108px] h-[108px] sm:w-[132px] sm:h-[132px]"
    />
  );
}

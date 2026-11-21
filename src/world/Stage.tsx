// ─── THE CITY: OPEN MIC AND VIDEO SHOOTS ───────────────────────────────────
//
// Open mic at The Stage (evenings): your beat plays, and you hit each beat as
// it crosses the line — Space / Enter / tap. The crowd's hype follows you,
// and the set pays in fans and tips (once a game day, costs energy).
//
// Shoot: the camera swings round you while you dance, for eight seconds, and
// the clip is recorded straight from the game. Save it, or go and release a
// music video.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { beatSpecFor } from '../audio/beat';
import { stopPreview, togglePreview } from '../audio/preview';
import { dateToSerial } from '../sim/gameClock';
import { hudStore } from './input';
import { live } from './sim';
import { addAfterEffect } from '@react-three/fiber';
import { ANGLES, ANGLE_SEC, SHOOT_SEC, angleAt } from './shootcam';
import { saveShoot } from '../video/clipstore';
import { DirectorsCut } from '../components/studio/DirectorsCut';

const LEN = 28; // seconds of open mic

function usePlayerBeat(seed: string) {
  const p = useGameStore.getState().player;
  return useMemo(() => beatSpecFor(String(p?.genre ?? 'hip_hop'), undefined, `${seed}|${p?.id}`, 70, p?.id), [seed, p?.genre, p?.id]);
}

export function StageOverlays() {
  const hud = useSyncExternalStore(hudStore.subscribe, hudStore.get);
  return <>{hud.gig ? <Gig /> : null}{hud.shooting ? <Shoot /> : null}</>;
}

// ─── open mic ──────────────────────────────────────────────────────────────

function Gig() {
  const s = useGameStore.getState();
  const perform = useGameStore((x) => x.performStreetGig);
  const today = dateToSerial(s.gameDate);
  // Decided once when the card opens — not again after the set is played.
  const [blocked] = useState(() => (s.cityGigDay === today ? "You've already played the open mic today. Come back tomorrow night." : (s.player?.energy ?? 0) < 15 ? 'Too tired to perform. Eat or sleep first.' : null));
  const spec = usePlayerBeat(`gig|${today}`);
  const beat = 60 / spec.bpm;
  const notes = useMemo(() => {
    const out: number[] = [];
    let k = 0;
    for (let t = beat * 8; t < LEN - 1; t += beat) {
      out.push(t);
      // The second half gets busier.
      if (t > LEN / 2 && (k++ * 7) % 5 === 0) out.push(t + beat / 2);
    }
    return out;
  }, [beat]);
  const marks = useRef<number[]>(notes.map(() => 0)); // 0 waiting, 1 perfect, 2 good, 3 miss
  const t0 = useRef(0);
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready');
  const [now, setNow] = useState(0);
  const [hype, setHype] = useState(30);
  const [result, setResult] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const close = () => { stopPreview(); hudStore.set({ gig: false }); };

  const start = () => {
    togglePreview(`gig|${today}`, spec, LEN + 1);
    t0.current = performance.now() / 1000 + 0.06;
    setPhase('play');
  };

  const hit = () => {
    if (phase !== 'play') return;
    const tt = performance.now() / 1000 - t0.current;
    let best = -1, bd = 0.24;
    notes.forEach((n, i) => { if (marks.current[i] === 0 && Math.abs(n - tt) < bd) { bd = Math.abs(n - tt); best = i; } });
    if (best < 0) { setHype((h) => Math.max(0, h - 2)); setLast('…'); return; }
    const perfect = bd < 0.09;
    marks.current[best] = perfect ? 1 : 2;
    setHype((h) => Math.min(100, h + (perfect ? 5 : 2.5)));
    setLast(perfect ? 'PERFECT' : 'GOOD');
  };

  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0;
    const loop = () => {
      const tt = performance.now() / 1000 - t0.current;
      notes.forEach((n, i) => { if (marks.current[i] === 0 && tt - n > 0.25) { marks.current[i] = 3; setHype((h) => Math.max(0, h - 4)); setLast('MISS'); } });
      setNow(tt);
      if (tt > LEN) {
        stopPreview();
        const m = marks.current;
        const score = Math.round(((m.filter((x) => x === 1).length + 0.6 * m.filter((x) => x === 2).length) / Math.max(1, notes.length)) * 100);
        const r = perform(score);
        setResult(`${score}/100 — ${r.message}`);
        setPhase('done');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const key = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); hit(); } };
    window.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const box = 'w-full max-w-[520px] rounded-[18px] bg-card border border-line p-5';
  return (
    <div className="absolute inset-0 z-40 pointer-events-auto flex items-center justify-center p-3 bg-black/60" style={{ touchAction: 'none' }}>
      {blocked ? (
        <div className={box}><div className="text-[16px] font-bold mb-2">Open mic</div><p className="text-[13px] text-ink2 mb-4">{blocked}</p><button onClick={close} className="h-10 px-4 rounded-[10px] bg-amber text-black font-bold">OK</button></div>
      ) : phase === 'ready' ? (
        <div className={box}>
          <div className="text-[11px] tracking-widest text-re font-bold">THE STAGE · OPEN MIC</div>
          <div className="text-[20px] font-bold mt-1 mb-2">Your turn on the mic</div>
          <p className="text-[13px] text-ink2 mb-4">Hit every beat as it crosses the line — <b className="text-ink">Space</b> or <b className="text-ink">tap</b>. Keep the crowd's hype up. Pays in fans and tips; once a night; uses 15 energy.</p>
          <div className="flex gap-2"><button onClick={start} className="h-10 px-4 rounded-[10px] bg-amber text-black font-bold">🎤 Start the set</button><button onClick={close} className="h-10 px-4 rounded-[10px] border border-line">Not tonight</button></div>
        </div>
      ) : phase === 'play' ? (
        <div className="w-full max-w-[640px] select-none" onPointerDown={(e) => { e.preventDefault(); hit(); }}>
          <div className="flex items-center justify-between text-[12px] mb-2"><span className="font-bold text-re tracking-widest">LIVE</span><span className="num text-ink2">{Math.max(0, Math.ceil(LEN - now))}s</span></div>
          <div className="h-2.5 rounded-full bg-line overflow-hidden mb-3"><div className="h-full bg-gradient-to-r from-fall via-amber to-rise transition-all" style={{ width: `${hype}%` }} /></div>
          <div className="relative h-24 rounded-[16px] bg-black/70 border border-line overflow-hidden">
            <div className="absolute top-0 bottom-0 w-1 bg-amber/80" style={{ left: '18%' }} />
            {notes.map((n, i) => {
              const x = 18 + (n - now) * 26;
              if (x < -5 || x > 105 || marks.current[i] === 1 || marks.current[i] === 2) return null;
              return <span key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full border-2 ${marks.current[i] === 3 ? 'border-fall/50 bg-fall/20' : 'border-white bg-white/20'}`} style={{ left: `${x}%` }} />;
            })}
          </div>
          <div className="text-center mt-4 h-8 text-[22px] font-black tracking-widest text-amber">{last}</div>
          <div className="mt-2 mx-auto w-28 h-28 rounded-full bg-amber/90 text-black font-black text-[16px] flex items-center justify-center active:scale-95">TAP</div>
        </div>
      ) : (
        <div className={box}><div className="text-[16px] font-bold mb-2">Set's done</div><p className="text-[14px] mb-4">{result}</p><button onClick={close} className="h-10 px-4 rounded-[10px] bg-amber text-black font-bold">Back to the street</button></div>
      )}
    </div>
  );
}

// ─── video shoot ───────────────────────────────────────────────────────────

const SHOOT = SHOOT_SEC;
const CAP_FPS = 20;

function Shoot() {
  const setScreen = useGameStore((s) => s.setScreen);
  const spec = usePlayerBeat('shoot');
  const [left, setLeft] = useState(SHOOT);
  const [url, setUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ext, setExt] = useState('webm');
  const [shootId, setShootId] = useState<string | null>(null);
  const [cutting, setCutting] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    live.shoot.on = true;
    live.shoot.t = 0;
    togglePreview('shoot|beat', spec, SHOOT + 1);
    let rec: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    const canvas = document.querySelector('canvas') as (HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }) | null;
    try {
      if (canvas?.captureStream && typeof MediaRecorder !== 'undefined') {
        const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
        if (mime?.includes('mp4')) setExt('mp4');
        rec = new MediaRecorder(canvas.captureStream(30), mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => { if (chunks.length) setUrl(URL.createObjectURL(new Blob(chunks, { type: mime ?? 'video/webm' }))); };
        rec.start();
      }
    } catch { rec = null; }
    // Coverage: every angle's frames, for the editor.
    const frames: Promise<Blob | null>[][] = ANGLES.map(() => []);
    const scratch = document.createElement('canvas');
    let lastCap = 0, cw = 640, ch = 360;
    if (canvas) { const k = 640 / Math.max(canvas.width, canvas.height); cw = Math.max(2, Math.round(canvas.width * k)); ch = Math.max(2, Math.round(canvas.height * k)); }
    scratch.width = cw; scratch.height = ch;
    const sg = scratch.getContext('2d');
    const stopCap = addAfterEffect(() => {
      if (!canvas || !sg || !live.shoot.on) return;
      const now = performance.now();
      // wall-clock: a slow device still gets all four angles
      live.shoot.t = (now - started) / 1000;
      if (now - lastCap < 1000 / CAP_FPS) return;
      lastCap = now;
      const a = angleAt(live.shoot.t);
      if (frames[a].length >= ANGLE_SEC * CAP_FPS) return;
      sg.drawImage(canvas, 0, 0, cw, ch);
      frames[a].push(new Promise((res) => scratch.toBlob((b) => res(b), 'image/jpeg', 0.72)));
    });
    const started = performance.now();
    const tick = window.setInterval(() => setLeft(Math.max(0, SHOOT - Math.floor((performance.now() - started) / 1000))), 250);
    const finish = () => {
      window.clearInterval(tick);
      window.clearTimeout(end);
      try { if (rec && rec.state !== 'inactive') rec.stop(); } catch { /* done */ }
      live.shoot.on = false;
      stopCap();
      stopPreview();
      setDone(true);
      useGameStore.getState().goalEvent('shoots');
      Promise.all(frames.map((a) => Promise.all(a))).then((all) => {
        const ok = all.map((a) => a.filter((b): b is Blob => !!b));
        (window as unknown as { __shootDbg?: number[] }).__shootDbg = ok.map((a) => a.length);
        if (ok.some((a) => a.length < 1)) return;
        const id = `shoot-${Date.now().toString(36)}`;
        saveShoot({ meta: { id, at: Date.now(), fps: CAP_FPS, w: cw, h: ch, angles: ANGLES.length, secPerAngle: ANGLE_SEC, bpm: spec.bpm }, frames: ok }).then(() => setShootId(id)).catch(() => {});
      });
    };
    stopRef.current = finish;
    const end = window.setTimeout(finish, SHOOT * 1000);
    return () => { window.clearInterval(tick); window.clearTimeout(end); live.shoot.on = false; try { if (rec && rec.state !== 'inactive') rec.stop(); } catch { /* done */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => { if (url) URL.revokeObjectURL(url); hudStore.set({ shooting: false }); };

  if (!done) {
    return (
      <div className="absolute inset-0 z-40 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-[11%] bg-black" />
        <div className="absolute bottom-0 inset-x-0 h-[11%] bg-black" />
        <div className="absolute top-[3%] left-4 flex items-center gap-2 text-[13px] font-bold"><span className="w-3 h-3 rounded-full bg-fall animate-pulse" />REC 0:{String(left).padStart(2, '0')}</div>
        <button onClick={() => stopRef.current()} className="pointer-events-auto absolute bottom-[3%] right-4 h-9 px-4 rounded-full bg-white/15 border border-white/20 text-[13px] font-semibold">Stop</button>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-40 pointer-events-auto flex items-center justify-center p-3 bg-black/60">
      <div className="w-full max-w-[460px] rounded-[18px] bg-card border border-line p-4">
        <div className="text-[16px] font-bold mb-3">That's a wrap</div>
        {url ? <video src={url} autoPlay loop muted playsInline className="w-full rounded-[12px] bg-black mb-3" /> : <p className="text-[13px] text-ink2 mb-3">This browser can't record the screen, but the shoot happened — release it from Videos.</p>}
        <div className="flex flex-wrap gap-2">
          {url ? <a href={url} download={`rap-life-clip.${ext}`} className="h-10 px-4 rounded-[10px] border border-line text-[13px] font-semibold flex items-center">Save clip</a> : null}
          {shootId ? <button onClick={() => setCutting(true)} className="h-10 px-4 rounded-[10px] bg-fall/90 text-white text-[13px] font-bold">🎬 Edit in Director's Cut</button> : <span className="h-10 px-2 flex items-center text-[12px] text-ink2">Saving footage…</span>}
          <button onClick={() => { close(); setScreen('create_video'); }} className="h-10 px-4 rounded-[10px] bg-amber text-black text-[13px] font-bold">Release a music video</button>
          <button onClick={close} className="h-10 px-4 rounded-[10px] border border-line text-[13px] text-ink2">Done</button>
        </div>
      </div>
      {cutting && shootId ? <DirectorsCut shootId={shootId} onClose={() => setCutting(false)} /> : null}
    </div>
  );
}

// Before you record: are the headphones on, and how late does this device run?

import { useEffect, useRef, useState } from 'react';
import { headphoneCheck, playClicks, medianOffset, saveCalibration, loadCalibration, clearCalibration, markSetupSeen, type Calibration } from '../../audio/calibrate';
import { cn } from '@/utils/cn';

type Step = 'idle' | 'listening' | 'tap' | 'done';

export function BoothSetup({ getCtx, onChange, onClose }: { getCtx: () => AudioContext; onChange: (c: Calibration | null) => void; onClose: () => void }) {
  const [step, setStep] = useState<Step>('idle');
  const [hp, setHp] = useState<null | { ok: boolean; heard: number; micDenied?: boolean }>(null);
  const [cal, setCal] = useState<Calibration | null>(() => loadCalibration());
  const [msg, setMsg] = useState<string | null>(null);
  const clicks = useRef<{ times: number[]; stop: () => void } | null>(null);
  const taps = useRef<number[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => () => clicks.current?.stop(), []);

  async function check() {
    setStep('listening'); setMsg(null);
    try { const r = await headphoneCheck(getCtx()); setHp(r); setMsg(r.micDenied ? 'Allow the microphone first, then try again.' : r.ok ? 'Headphones detected — the mic does not hear the beat. 🎧' : 'The mic can hear the beat from your speakers. Put headphones on, or it will bleed into your vocal.'); }
    catch { setMsg('Could not run the check on this device.'); }
    setStep('idle');
  }
  function startTap() {
    taps.current = []; setCount(0); setMsg('Tap the big button on every click. Keep going for 12 clicks.');
    clicks.current = playClicks(getCtx(), 12, 90);
    setStep('tap');
    window.setTimeout(finishTap, 0.6 * 1000 + 12 * (60 / 90) * 1000 + 500);
  }
  function tap() {
    if (step !== 'tap') return;
    taps.current.push(getCtx().currentTime);
    setCount(taps.current.length);
  }
  function finishTap() {
    const times = clicks.current?.times ?? [];
    const ms = medianOffset(taps.current, times);
    if (ms === null) { setMsg('Not enough taps — try again and tap along with each click.'); setStep('idle'); return; }
    const c: Calibration = { ms: Math.max(-100, Math.min(400, ms)), at: Date.now(), headphones: hp?.ok };
    saveCalibration(c); setCal(c); onChange(c); setStep('done');
    setMsg(c.ms < 60 ? `Your setup runs ${c.ms} ms behind — that is tight, nothing to fix.` : `Your setup runs about ${c.ms} ms behind (Bluetooth does that). Your vocal will be pulled back by that much.`);
  }

  return (
    <div className="rounded-[16px] border border-amber/40 bg-amber/5 p-3 space-y-2.5 studio-window">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-ink">🎧 Booth setup <span className="text-[10px] font-normal text-ink3">· 30 seconds, once per device</span></div>
        <button onClick={() => { markSetupSeen(); onClose(); }} className="text-[11px] text-ink3 hover:text-ink2" aria-label="Close setup">Done ✕</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-[12px] border border-line/70 p-2.5 space-y-1.5">
          <div className="text-[12px] font-semibold text-ink">1 · Headphones check</div>
          <div className="text-[11px] text-ink3 leading-snug">Plays a short tone and listens on your mic.</div>
          <button onClick={check} disabled={step !== 'idle'} className="h-8 px-3 rounded-full border border-amber/60 text-amber text-[12px] font-semibold disabled:opacity-40">{step === 'listening' ? 'Listening…' : hp ? 'Check again' : 'Check'}</button>
          {hp && !hp.micDenied && <div className={cn('text-[11px] font-semibold', hp.ok ? 'text-rise' : 'text-fall')}>{hp.ok ? '✓ Headphones on' : '⚠ Beat is in the room'}</div>}
        </div>
        <div className="rounded-[12px] border border-line/70 p-2.5 space-y-1.5">
          <div className="text-[12px] font-semibold text-ink">2 · Timing</div>
          <div className="text-[11px] text-ink3 leading-snug">Tap along to a click so your vocal lands on the beat.</div>
          {step === 'tap'
            ? <button onPointerDown={tap} className="w-full h-12 rounded-[12px] bg-amber text-black font-bold text-[14px] active:scale-95 transition">TAP · {count}</button>
            : <button onClick={startTap} disabled={step === 'listening'} className="h-8 px-3 rounded-full border border-amber/60 text-amber text-[12px] font-semibold disabled:opacity-40">{cal ? 'Re-test' : 'Start'}</button>}
          {cal && step !== 'tap' && <div className="text-[11px] text-ink2">Saved: <span className="num text-ink font-semibold">{cal.ms} ms</span> <button onClick={() => { clearCalibration(); setCal(null); onChange(null); }} className="ml-1 text-ink3 underline">reset</button></div>}
        </div>
      </div>
      {msg && <div className="text-[11px] text-ink2 leading-snug">{msg}</div>}
    </div>
  );
}

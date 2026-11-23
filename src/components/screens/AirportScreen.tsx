// ─── GOLD COAST AIRPORT: DEPARTURES ───────────────────────────────────────
//
// The board of where you can fly. Same continent is a short hop; across the
// world is a long day. Booking plays a short flight scene, then you land.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getCountry } from '../../data/locations';
import { SHOW_COUNTRIES } from '../../sim/shows';
import { money } from '@/utils/format';

export function fare(from: string, to: string) {
  const a = getCountry(from)?.continent, b = getCountry(to)?.continent;
  return a && a === b ? { price: 180, hours: 3 } : { price: 720, hours: 9 };
}

export function AirportScreen() {
  const player = useGameStore((s) => s.player);
  const abroad = useGameStore((s) => (s.story?.flags['abroad'] as string) || '');
  const book = useGameStore((s) => s.bookFlight);
  const setScreen = useGameStore((s) => s.setScreen);
  const [flight, setFlight] = useState<{ from: string; to: string; msg: string } | null>(null);
  const [err, setErr] = useState('');
  const home = player?.country ?? 'Ghana';
  const where = abroad || home;
  const list = useMemo(() => SHOW_COUNTRIES.filter((c) => c !== where).sort(), [where]);

  const go = (to: string) => {
    const f = fare(where, to);
    const r = book(to, f.price, f.hours);
    if (!r.ok) { setErr(r.message); return; }
    setErr('');
    setFlight({ from: where, to, msg: r.message });
    setTimeout(() => setFlight(null), 4200);
  };

  return (
    <div className="p-4 pb-10 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-ink3">GOLD COAST AIRPORT · DEPARTURES</div>
          <div className="text-[20px] font-bold text-ink">Where to?</div>
        </div>
        <button onClick={() => setScreen('city')} className="h-10 px-4 rounded-full border border-line text-[13px] font-semibold text-ink">Back to the terminal</button>
      </div>
      <div className="text-[12px] text-ink3 mb-3">You are in <b className="text-ink">{where}</b>{abroad ? ` · home is ${home}` : ''}. Cash {money(player?.career.money ?? 0)}.</div>
      {err ? <div className="mb-3 rounded-[10px] bg-red-500/15 border border-red-400/40 px-3 py-2 text-[12px] text-red-200">{err}</div> : null}
      {abroad ? (
        <button onClick={() => go(home)} className="w-full mb-3 h-12 rounded-[12px] bg-amber text-black font-bold text-[14px]">✈ Fly home to {home} · {money(fare(abroad, home).price)}</button>
      ) : null}
      <div className="space-y-1.5">
        {list.map((c) => {
          const f = fare(where, c);
          return (
            <button key={c} onClick={() => go(c)} className="w-full flex items-center gap-3 rounded-[12px] border border-line px-3 h-12 text-left active:bg-white/10">
              <span className="text-[18px]">✈</span>
              <span className="flex-1 min-w-0"><span className="block text-[13px] font-semibold text-ink truncate">{c}</span><span className="block text-[10px] text-ink3">{getCountry(c)?.continent} · {f.hours} h</span></span>
              <span className="text-[13px] font-bold text-amber num">{money(f.price)}</span>
            </button>
          );
        })}
      </div>
      {flight ? (
        <div className="fixed inset-0 z-[500] bg-[#0b1226] flex flex-col items-center justify-center text-white overflow-hidden">
          <style>{'@keyframes rl-fly{0%{transform:translateX(-60vw) rotate(-6deg)}100%{transform:translateX(60vw) rotate(-6deg)}}@keyframes rl-cloud{0%{transform:translateX(30vw)}100%{transform:translateX(-80vw)}}'}</style>
          <div className="absolute top-[18%] text-[60px] opacity-30" style={{ animation: 'rl-cloud 6s linear infinite' }}>☁️</div>
          <div className="absolute top-[60%] text-[44px] opacity-20" style={{ animation: 'rl-cloud 4s linear infinite' }}>☁️</div>
          <div className="text-[64px]" style={{ animation: 'rl-fly 4s ease-in-out forwards' }}>✈️</div>
          <div className="mt-6 text-[12px] tracking-widest text-white/60">{flight.from.toUpperCase()} → {flight.to.toUpperCase()}</div>
          <div className="mt-1 text-[18px] font-bold">{flight.msg}</div>
        </div>
      ) : null}
    </div>
  );
}

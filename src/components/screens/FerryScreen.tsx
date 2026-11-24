// ─── HARBOUR: FERRIES & FREIGHTERS ─────────────────────────────────────────
//
// The slow, cheap way abroad. Ferries run to countries on your own continent;
// a freighter will take you further for a berth and a long wait at sea.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getCountry } from '../../data/locations';
import { SHOW_COUNTRIES } from '../../sim/shows';
import { setWorldCountry } from '../../world/layout';
import { arriveAt } from '../../world/sim';
import { hudStore } from '../../world/input';
import { money } from '@/utils/format';

const wobble = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 997, 7) % 40;
export function sailing(from: string, to: string) {
  const a = getCountry(from)?.continent, b = getCountry(to)?.continent;
  return a && a === b ? { price: 55 + wobble(to), hours: 12, freighter: false } : { price: 340 + wobble(to) * 2, hours: 40, freighter: true };
}

export function FerryScreen() {
  const player = useGameStore((s) => s.player);
  const abroad = useGameStore((s) => (s.story?.flags['abroad'] as string) || '');
  const book = useGameStore((s) => s.bookFlight);
  const setScreen = useGameStore((s) => s.setScreen);
  const [trip, setTrip] = useState<{ from: string; to: string; msg: string } | null>(null);
  const [err, setErr] = useState('');
  const home = player?.country ?? 'Ghana';
  const where = abroad || home;
  const list = useMemo(() => SHOW_COUNTRIES.filter((c) => c !== where).sort((a, b) => Number(sailing(where, a).freighter) - Number(sailing(where, b).freighter) || a.localeCompare(b)), [where]);

  const go = (to: string) => {
    const f = sailing(where, to);
    const r = book(to, f.price, f.hours, 'ferry');
    if (!r.ok) { setErr(r.message); return; }
    setErr('');
    setWorldCountry(to);
    arriveAt('port');
    hudStore.set({ inside: null });
    setTrip({ from: where, to, msg: r.message });
    setTimeout(() => setTrip(null), 4200);
  };

  return (
    <div className="p-4 pb-10 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-ink3">HARBOUR · FERRIES & FREIGHTERS</div>
          <div className="text-[20px] font-bold text-ink">Take a boat</div>
        </div>
        <button onClick={() => setScreen('city')} className="h-10 px-4 rounded-full border border-line text-[13px] font-semibold text-ink">Back to the quay</button>
      </div>
      <div className="text-[12px] text-ink3 mb-3">You are in <b className="text-ink">{where}</b>{abroad ? ` · home is ${home}` : ''}. Cash {money(player?.career.money ?? 0)}. Boats are cheap but slow — the clock keeps running while you sail.</div>
      {err ? <div className="mb-3 rounded-[10px] bg-red-500/15 border border-red-400/40 px-3 py-2 text-[12px] text-red-200">{err}</div> : null}
      {abroad ? (
        <button onClick={() => go(home)} className="w-full mb-3 h-12 rounded-[12px] bg-amber text-black font-bold text-[14px]">⛴ Sail home to {home} · {money(sailing(abroad, home).price)}</button>
      ) : null}
      <div className="space-y-1.5">
        {list.map((c) => {
          const f = sailing(where, c);
          return (
            <button key={c} onClick={() => go(c)} className="w-full flex items-center gap-3 rounded-[12px] border border-line px-3 h-12 text-left active:bg-white/10">
              <span className="text-[18px]">{f.freighter ? '🚢' : '⛴'}</span>
              <span className="flex-1 min-w-0"><span className="block text-[13px] font-semibold text-ink truncate">{c}</span><span className="block text-[10px] text-ink3">{f.freighter ? 'Freighter berth' : 'Ferry'} · {f.hours} h</span></span>
              <span className="text-[13px] font-bold text-amber num">{money(f.price)}</span>
            </button>
          );
        })}
      </div>
      {trip ? (
        <div className="fixed inset-0 z-[500] bg-[#08202e] flex flex-col items-center justify-center text-white overflow-hidden">
          <style>{'@keyframes rl-sail{0%{transform:translateX(-60vw)}100%{transform:translateX(60vw)}}@keyframes rl-wave{0%{transform:translateX(0)}100%{transform:translateX(-40px)}}'}</style>
          <div className="absolute bottom-[34%] text-[22px] opacity-40 whitespace-nowrap" style={{ animation: 'rl-wave 1.2s linear infinite' }}>〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️</div>
          <div className="text-[64px]" style={{ animation: 'rl-sail 4s ease-in-out forwards' }}>⛴️</div>
          <div className="mt-6 text-[12px] tracking-widest text-white/60">{trip.from.toUpperCase()} → {trip.to.toUpperCase()}</div>
          <div className="mt-1 text-[18px] font-bold">{trip.msg}</div>
        </div>
      ) : null}
    </div>
  );
}

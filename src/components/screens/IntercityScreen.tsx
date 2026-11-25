// ─── OTHER CITIES IN THE SAME COUNTRY ──────────────────────────────────────
// Coach, train or a short hop: cheaper and quicker than leaving the country,
// and every city is its own place — its own streets, skyline and land.

import { useGameStore } from '../../store/gameStore';
import { getCitiesByCountry } from '../../data/locations';
import { setWorldCountry, currentCity } from '../../world/layout';
import { arriveAt } from '../../world/sim';
import { hudStore } from '../../world/input';
import { money } from '@/utils/format';

const h = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 11);
export function leg(from: string, to: string) {
  const d = 1 + (h(from) + h(to)) % 6; // 1..6 "distance"
  return { price: 12 + d * 9, hours: 2 + d, mode: d >= 5 ? 'Train' : 'Coach' };
}

export function IntercityScreen() {
  const player = useGameStore((s) => s.player);
  const abroad = useGameStore((s) => (s.story?.flags['abroad'] as string) || '');
  const flagCity = useGameStore((s) => (s.story?.flags['city'] as string) || '');
  const travel = useGameStore((s) => s.travelCity);
  const setScreen = useGameStore((s) => s.setScreen);
  const country = abroad || player?.country || 'Ghana';
  const cities = getCitiesByCountry(country);
  const here = flagCity || cities[0]?.name || '';
  const go = (to: string) => {
    const f = leg(here, to);
    const r = travel(to, f.price, f.hours);
    if (!r.ok) { hudStore.toast(r.message, 3000); return; }
    setWorldCountry(country, to);
    arriveAt('airport');
    hudStore.set({ inside: null });
    hudStore.toast(`🚌 ${r.message}`, 3800);
    setScreen('city');
  };
  void currentCity;
  return (
    <div className="p-4 pb-10 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-ink3">{country.toUpperCase()} · CITIES</div>
          <div className="text-[20px] font-bold text-ink">Where to in {country}?</div>
        </div>
        <button onClick={() => setScreen('city')} className="h-10 px-4 rounded-full border border-line text-[13px] font-semibold text-ink">Back</button>
      </div>
      <div className="text-[12px] text-ink3 mb-3">You are in <b className="text-ink">{here}</b>. Cash {money(player?.career.money ?? 0)}.</div>
      <div className="space-y-1.5">
        {cities.filter((c) => c.name !== here).map((c) => {
          const f = leg(here, c.name);
          return (
            <button key={c.name} onClick={() => go(c.name)} className="w-full flex items-center gap-3 rounded-[12px] border border-line px-3 h-12 text-left active:bg-white/10">
              <span className="text-[18px]">{f.mode === 'Train' ? '🚆' : '🚌'}</span>
              <span className="flex-1 min-w-0"><span className="block text-[13px] font-semibold text-ink truncate">{c.name}</span><span className="block text-[10px] text-ink3">{f.mode} · {f.hours} h · {(c.population / 1e6).toFixed(1)}M people</span></span>
              <span className="text-[13px] font-bold text-amber num">{money(f.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

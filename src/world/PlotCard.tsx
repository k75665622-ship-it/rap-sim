// ─── OPEN LAND: A PLOT YOU'RE STANDING ON ──────────────────────────────────
// Look at it, buy it, buy the whole block to start an estate, or (if it is
// yours) jump to Property to build on it.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { money } from '@/utils/format';
import { hudStore } from './input';
import { cityLayout, currentCountry, ZONES } from './layout';
import { landZoneOf, viewOf } from './land';
import { LAND_TIERS, plotKey, plotPrice, takenBy } from '../sim/land';
import { BUILDS, buildOf } from '../sim/realestate';

export function PlotCard() {
  const id = useSyncExternalStore(hudStore.subscribe, () => hudStore.get().plot);
  const [msg, setMsg] = useState('');
  const st = useGameStore();
  useEffect(() => {
    setMsg('');
    if (!id) return;
    const k = (e: KeyboardEvent) => { if (e.code === 'Escape') hudStore.set({ plot: null }); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [id]);
  if (!id) return null;
  const L = cityLayout();
  const plot = L.plots.find((p) => p.id === id);
  if (!plot) return null;
  const close = () => { setMsg(''); hudStore.set({ plot: null }); };
  const v = viewOf(plot);
  const lz = landZoneOf(plot);
  const tier = LAND_TIERS[lz];
  const country = currentCountry();
  const idx = st.market?.propertyIndex ?? 100;
  const disc = (st.crew ?? []).some((c) => c.role === 'accountant') ? 0.08 : 0;
  const price = plotPrice(lz, plotKey(country, plot.id), idx, disc);
  const block = L.landBlocks.find((b) => b.id === plot.block)!;
  const blockFree = block.plots.every((pid) => {
    const pv = viewOf(L.plots.find((p) => p.id === pid)!);
    return pv.status === 'sale';
  });
  const blockPrice = block.plots.reduce((a, pid) => a + plotPrice(lz, plotKey(country, pid), idx, disc + 0.1), 0);
  const mine = (st.devProjects ?? []).find((d) => d.id === v.projectId);
  const buy = (ids: string[]) => { const r = useGameStore.getState().buyWorldPlot(ids, lz); setMsg(r.message); };
  void takenBy;
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pointer-events-none">
      <div className="pointer-events-auto w-[min(94vw,440px)] rounded-[18px] bg-[#12141a]/95 backdrop-blur border border-white/10 p-4 text-[13px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-widest text-ink2 font-bold">{ZONES[plot.zone].name.toUpperCase()}</div>
            <div className="text-[17px] font-black">{tier.emoji} {v.status === 'yours' ? 'Your land' : v.status === 'taken' ? 'Sold land' : 'Land for sale'}</div>
          </div>
          <button className="text-ink2 text-lg px-2" onClick={close} aria-label="Close">✕</button>
        </div>
        <p className="text-ink2 mt-1">{tier.blurb}</p>
        {v.status === 'taken' ? <p className="mt-2">Owned by <b>{v.owner}</b>. Someone was quicker.</p> : null}
        {v.status === 'yours' && mine ? (
          <p className="mt-2">
            {mine.stage === 'land' ? 'Empty — ready to build on.' : mine.stage === 'building' ? `Under construction: ${mine.build ? buildOf(mine.build).name : ''}.` : `Finished: ${mine.build ? buildOf(mine.build).name : ''}${mine.estate ? ' · part of your estate' : ''}.`}
          </p>
        ) : null}
        {v.status === 'sale' ? (
          <div className="mt-3 grid gap-2">
            <button className="h-11 rounded-xl bg-amber text-black font-black" onClick={() => buy([plot.id])}>Buy this plot · {money(price)}</button>
            {blockFree ? (
              <button className="h-11 rounded-xl bg-white/10 border border-amber/40 font-bold" onClick={() => buy(block.plots)}>Start an estate: whole block ({block.plots.length} plots) · {money(blockPrice)} <span className="text-amber">−10%</span></button>
            ) : <div className="text-ink2 text-[12px]">Part of this block is already sold, so no estate deal here.</div>}
            <div className="text-ink2 text-[12px]">Others are buying too. Land you wait on can be gone tomorrow.</div>
          </div>
        ) : null}
        {v.status === 'yours' ? (
          <div className="mt-3 grid gap-2">
            <button className="h-11 rounded-xl bg-amber text-black font-black" onClick={() => { close(); useGameStore.getState().setScreen('investments'); }}>
              {mine?.stage === 'land' ? 'Choose what to build' : 'Open Property'}
            </button>
            {mine?.stage === 'land' ? <div className="text-ink2 text-[12px]">{BUILDS.map((b) => `${b.emoji} ${b.name}`).join(' · ')}</div> : null}
          </div>
        ) : null}
        {msg ? <div className="mt-2 text-[12px] font-semibold">{msg}</div> : null}
      </div>
    </div>
  );
}

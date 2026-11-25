// ─── OPEN LAND: A PLOT YOU'RE STANDING ON ──────────────────────────────────
// Look at it, buy it, buy the whole block to start an estate, or (if it is
// yours) jump to Property to build on it.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { money } from '@/utils/format';
import { hudStore } from './input';
import { cityLayout, worldKey, ZONES } from './layout';
import { landZoneOf, viewOf } from './land';
import { advisorOf } from '../store/gameStore';
import { LAND_TIERS, plotKey, plotPrice, takenBy } from '../sim/land';
import { dateToSerial } from '../sim/gameClock';
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
  const country = worldKey();
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
  const foreign = ((st.story?.flags['abroad'] as string) || st.player?.country) !== st.player?.country;
  const agent = !!advisorOf(st) || (st.crew ?? []).some((c) => c.role === 'lawyer');
  const buy = (ids: string[], how?: 'diy' | 'lawyer') => { const r = useGameStore.getState().buyWorldPlot(ids, lz, how); setMsg(r.message); };
  void takenBy;
  const daysLeft = v.endSerial !== undefined ? Math.max(0, v.endSerial - dateToSerial(st.gameDate)) : 0;
  const nextBid = Math.ceil(((v.bid ?? 0) * 1.1) / 100) * 100;
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pointer-events-none">
      <div className="pointer-events-auto w-[min(94vw,440px)] rounded-[18px] bg-[#12141a]/95 backdrop-blur border border-white/10 p-4 text-[13px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-widest text-ink2 font-bold">{ZONES[plot.zone].name.toUpperCase()}</div>
            <div className="text-[17px] font-black">{tier.emoji} {v.status === 'pending' ? 'Deal in progress' : v.status === 'yours' ? 'Your land' : v.status === 'taken' ? 'Sold land' : v.status === 'auction' ? 'Land auction' : 'Land for sale'}</div>
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
        {v.status === 'pending' ? <p className="mt-2">Your purchase is going through the paperwork: title search, contract, registration. You will get a message at each step.</p> : null}
        {v.status === 'auction' ? (
          <div className="mt-3 grid gap-2">
            <div>Top bid <b>{money(v.bid ?? 0)}</b> · {v.bidder === 'You' ? <b className="text-amber">you</b> : v.bidder} · {daysLeft} day{daysLeft === 1 ? '' : 's'} left</div>
            <button className="h-11 rounded-xl bg-[#b57bff] text-black font-black" onClick={() => { const r = useGameStore.getState().bidOnPlot(plot.id); setMsg(r.message); }}>
              {v.bidder === 'You' ? 'You are leading' : `Bid ${money(nextBid)}`}
            </button>
            <div className="text-ink2 text-[12px]">You pay only if you win, when the hammer falls. Keep the cash.</div>
          </div>
        ) : null}
        {v.status === 'sale' ? (
          <div className="mt-3 grid gap-2">
            {foreign ? (
              <div className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-[12px]">
                <b>You are buying in a foreign country.</b> {agent ? 'Your lawyer / financial manager will run the title search and contract.' : 'Without someone checking the papers, foreign buyers get scammed a lot.'}
              </div>
            ) : null}
            {foreign && !agent ? (
              <>
                <button className="h-11 rounded-xl bg-amber text-black font-black" onClick={() => buy([plot.id], 'lawyer')}>Hire a local lawyer · {money(price)} + 2% · safer</button>
                <button className="h-10 rounded-xl bg-white/10 border border-white/15 font-bold text-[12px]" onClick={() => buy([plot.id], 'diy')}>Do the paperwork yourself · {money(price)} · high scam risk</button>
              </>
            ) : <button className="h-11 rounded-xl bg-amber text-black font-black" onClick={() => buy([plot.id])}>{foreign ? 'Start the purchase' : 'Buy this plot'} · {money(price)}</button>}
            {blockFree ? (
              <button className="h-11 rounded-xl bg-white/10 border border-amber/40 font-bold" onClick={() => buy(block.plots, foreign && !agent ? 'lawyer' : undefined)}>Start an estate: whole block ({block.plots.length} plots) · {money(blockPrice)} <span className="text-amber">−10%</span></button>
            ) : <div className="text-ink2 text-[12px]">Part of this block is already sold, so no estate deal here.</div>}
            <div className="text-ink2 text-[12px]">Others are buying too. Land you wait on can be gone tomorrow.</div>
          </div>
        ) : null}
        {v.status === 'yours' ? (
          <div className="mt-3 grid gap-2">
            <button className="h-11 rounded-xl bg-amber text-black font-black" onClick={() => { close(); useGameStore.getState().setScreen('investments'); }}>
              {mine?.stage === 'land' ? 'Choose what to build' : 'Open Property'}
            </button>
            {mine?.stage === 'land' ? <button className="h-10 rounded-xl bg-white/10 border border-white/15 font-bold" onClick={() => { const r = useGameStore.getState().sellProject(mine.id); setMsg(r.message); }}>Sell the land back</button> : null}
            {mine?.stage === 'land' ? <div className="text-ink2 text-[12px]">{BUILDS.map((b) => `${b.emoji} ${b.name}`).join(' · ')}</div> : null}
          </div>
        ) : null}
        {msg ? <div className="mt-2 text-[12px] font-semibold">{msg}</div> : null}
      </div>
    </div>
  );
}

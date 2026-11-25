// ─── SHOPS RUN BY PEOPLE IN TOWN ───────────────────────────────────────────
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { money } from '@/utils/format';
import { hudStore } from './input';
import { BIZ_STYLE, cityLayout } from './layout';
import { bizOwner } from './people';
import { worldKey } from './layout';
import { VENTURE_BY_TYPE, type VentureType } from '../sim/ventures';

const SELLS: Partial<Record<string, VentureType>> = { restaurant: 'restaurant', barber: 'salon', boutique: 'clothing' };

const MENU: Record<string, Array<{ label: string }>> = {
  restaurant: [{ label: '🍲 Order a plate · $12 · +24 energy' }],
  juice: [{ label: '🥤 Fresh juice · $6 · +9 energy' }],
  barber: [{ label: '💈 Fresh cut · $25 · look sharp, +8 fans' }],
  studio: [{ label: '🎚️ Book two hours · $60 · sharpen your writing' }],
  boutique: [{ label: '👗 Buy a fit · $80 · new walk, +20 fans' }],
};

export function BizCard() {
  const id = useSyncExternalStore(hudStore.subscribe, () => hudStore.get().biz);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setMsg('');
    if (!id) return;
    const k = (e: KeyboardEvent) => { if (e.code === 'Escape') hudStore.set({ biz: null }); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [id]);
  useGameStore((s) => s.player?.career.money);
  const ventures = useGameStore((s) => s.ventures);
  const discount = useGameStore((s) => (s.crew ?? []).some((c) => c.role === 'accountant'));
  if (!id) return null;
  const b = cityLayout().buildings.find((x) => x.biz?.id === id);
  if (!b?.biz) return null;
  const st = BIZ_STYLE[b.biz.kind];
  const owner = bizOwner(b.biz.id);
  const shopId = `${worldKey()}:${b.biz.id}`;
  const mine = (ventures ?? []).find((v) => v.shopId === shopId && !v.closed);
  const vt = SELLS[b.biz.kind];
  const ask = vt ? Math.round(VENTURE_BY_TYPE[vt].startCost * 1.25 * (discount ? 0.92 : 1)) : 0;
  const lastProfit = mine?.months[mine.months.length - 1]?.profit;
  const close = () => { setMsg(''); hudStore.set({ biz: null }); };
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pointer-events-none">
      <div className="pointer-events-auto w-[min(94vw,440px)] rounded-[18px] bg-[#12141a]/95 backdrop-blur border border-white/10 p-4 text-[13px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-widest font-bold" style={{ color: st.color }}>{st.label.toUpperCase()}</div>
            <div className="text-[17px] font-black">{st.emoji} {b.biz.name}</div>
          </div>
          <button className="text-ink2 text-lg px-2" onClick={close} aria-label="Close">✕</button>
        </div>
        {mine ? (
          <div className="mt-1 text-ink2">Yours. {lastProfit !== undefined ? <>Last month: <b className={lastProfit >= 0 ? 'text-rise' : 'text-fall'}>{money(lastProfit)}</b>.</> : 'First month still counting.'}</div>
        ) : owner ? <p className="text-ink2 mt-1">Run by <b className="text-ink">{owner.name}</b>.</p> : null}
        <div className="mt-3 grid gap-2">
          {MENU[b.biz.kind].map((m) => (
            <button key={m.label} className="h-11 rounded-xl bg-amber text-black font-black text-left px-3" onClick={() => setMsg(useGameStore.getState().bizAct(b.biz!.kind, b.biz!.name, owner?.npcId).message)}>{m.label}</button>
          ))}
          {mine ? (
            <button className="h-10 rounded-xl bg-white/10 border border-amber/40 font-bold" onClick={() => { close(); useGameStore.getState().setScreen('investments'); }}>Open your businesses</button>
          ) : vt ? (
            <button className="h-11 rounded-xl bg-white/10 border border-amber/40 font-bold text-left px-3" onClick={() => setMsg(useGameStore.getState().buyShop(shopId, vt, b.biz!.name).message)}>🏷️ Buy this shop · {money(ask)}</button>
          ) : null}
          {!mine && owner ? <button className="h-10 rounded-xl bg-white/10 border border-white/15 font-bold" onClick={() => { close(); hudStore.set({ talk: owner.id }); }}>Talk to {owner.name.split(' ')[0]}</button> : null}
        </div>
        {msg ? <div className="mt-2 text-[12px] font-semibold">{msg}</div> : null}
        <div className="hidden">{money(0)}</div>
      </div>
    </div>
  );
}

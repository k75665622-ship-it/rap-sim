// ─── FOREST LIFE: CAMPFIRES, CABINS, WALKS ─────────────────────────────────
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useGameStore } from '../store/gameStore';
import { money } from '@/utils/format';
import { hudStore } from './input';
import { cityLayout } from './layout';

export function ForestCard() {
  const id = useSyncExternalStore(hudStore.subscribe, () => hudStore.get().camp);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setMsg('');
    if (!id) return;
    const k = (e: KeyboardEvent) => { if (e.code === 'Escape') hudStore.set({ camp: null }); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [id]);
  const energy = useGameStore((s) => s.player?.energy ?? 0);
  if (!id) return null;
  const camp = cityLayout().camps.find((c) => c.id === id);
  if (!camp) return null;
  const act = (kind: 'sit' | 'write' | 'walk' | 'cabin') => { const r = useGameStore.getState().forestAct(kind); setMsg(r.message); };
  const btn = 'h-11 rounded-xl bg-white/10 border border-white/15 font-bold text-left px-3';
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pointer-events-none">
      <div className="pointer-events-auto w-[min(94vw,440px)] rounded-[18px] bg-[#12141a]/95 backdrop-blur border border-white/10 p-4 text-[13px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-widest text-ink2 font-bold">THE FOREST</div>
            <div className="text-[17px] font-black">{camp.kind === 'cabin' ? '🛖 Forest cabin' : '🔥 Campfire'}</div>
          </div>
          <button className="text-ink2 text-lg px-2" onClick={() => { setMsg(''); hudStore.set({ camp: null }); }} aria-label="Close">✕</button>
        </div>
        <p className="text-ink2 mt-1">{camp.kind === 'cabin' ? 'A small cabin among the trees. Quiet enough to hear yourself think.' : 'Logs, a ring of stones, and no signal. The city feels far away.'} Energy {Math.round(energy)}.</p>
        <div className="mt-3 grid gap-2">
          {camp.kind === 'camp' ? (
            <>
              <button className={btn} onClick={() => act('sit')}>🔥 Sit by the fire · 2 h · free</button>
              <button className={btn} onClick={() => act('write')}>✍️ Write by the fire · 2 h · sharpens your writing</button>
            </>
          ) : (
            <button className={btn} onClick={() => act('cabin')}>🛏 Stay the night · {money(90)} · full rest + a clear head</button>
          )}
          <button className={btn} onClick={() => act('walk')}>🥾 Walk the trails · 1 h</button>
        </div>
        {msg ? <div className="mt-2 text-[12px] font-semibold">{msg}</div> : null}
      </div>
    </div>
  );
}

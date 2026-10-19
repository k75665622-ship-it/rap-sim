// ─── MONEY ─────────────────────────────────────────────────────────────────
// Everything that can make you rich or broke outside the music: shares,
// crypto, the bank, businesses you run, property you build, and the casino.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Overview, type MoneyTab } from '../money/Overview';
import { MarketPanel } from '../money/Markets';
import { BusinessesPanel } from '../money/Businesses';
import { PropertyPanel } from '../money/Property';
import { CasinoPanel } from '../money/Casino';
import { SportsbookPanel } from '../money/Sportsbook';
import { BankPanel } from '../money/Bank';
import { usd } from '../money/shared';

const TABS: { id: MoneyTab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview', emoji: '💼' },
  { id: 'bank', label: 'Bank', emoji: '🏦' },
  { id: 'shares', label: 'Shares', emoji: '📈' },
  { id: 'crypto', label: 'Crypto', emoji: '🪙' },
  { id: 'business', label: 'Businesses', emoji: '🏪' },
  { id: 'property', label: 'Property', emoji: '🏗️' },
  { id: 'betting', label: 'Betting', emoji: '⚽' },
  { id: 'casino', label: 'Casino', emoji: '🎰' },
];

export function MoneyScreen() {
  const player = useGameStore((s) => s.player);
  const [tab, setTab] = useState<MoneyTab>(() => {
    try { return (sessionStorage.getItem('rl-money-tab') as MoneyTab) || 'overview'; } catch { return 'overview'; }
  });
  const go = (t: MoneyTab) => {
    setTab(t);
    try { sessionStorage.setItem('rl-money-tab', t); } catch { /* private mode */ }
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
  };
  if (!player) return null;

  return (
    <div className="max-w-[920px] mx-auto space-y-4 pb-10">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] sm:text-[28px] font-bold text-ink leading-tight">Money</h1>
          <div className="text-[12px] text-ink3">Invest it, build with it, or gamble it.</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink3">Cash</div>
          <div className="text-[20px] font-bold text-amber num leading-tight">{usd(player.career.money)}</div>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-bg/90 backdrop-blur border-b border-line/60 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full border text-[13px] font-semibold transition whitespace-nowrap ${tab === t.id ? 'border-amber bg-amber text-black' : 'border-line bg-card text-ink2 hover:text-ink'}`}
            >
              <span className="mr-1">{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="rl-fade">
        {tab === 'overview' && <Overview go={go} />}
        {tab === 'bank' && <BankPanel />}
        {tab === 'shares' && <MarketPanel kind="stock" />}
        {tab === 'crypto' && <MarketPanel kind="coin" />}
        {tab === 'business' && <BusinessesPanel />}
        {tab === 'property' && <PropertyPanel />}
        {tab === 'betting' && <SportsbookPanel />}
        {tab === 'casino' && <CasinoPanel />}
      </div>
    </div>
  );
}

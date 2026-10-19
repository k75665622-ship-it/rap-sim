// ─── MONEY: OVERVIEW ───────────────────────────────────────────────────────
// What you're worth, where it sits, what came in this month, and what your
// financial advisor would do with it.

import { useMemo } from 'react';
import { useGameStore, netWorthOf, advisorOf } from '../../store/gameStore';
import { adviceFor } from '../../sim/markets';
import { monthlyRent } from '../../sim/realestate';
import { dateToSerial } from '../../sim/gameClock';
import { Button } from '../ui/kit';
import { CallBadge, Card, Chart, Delta, Label, px, usd } from './shared';

export type MoneyTab = 'overview' | 'shares' | 'crypto' | 'business' | 'property' | 'casino';

const SLICES = [
  { k: 'cash', label: 'Cash', color: '#ffb800' },
  { k: 'stocks', label: 'Shares', color: '#4da3ff' },
  { k: 'crypto', label: 'Crypto', color: '#b57bff' },
  { k: 'businesses', label: 'Businesses', color: '#2ed573' },
  { k: 'property', label: 'Property', color: '#ff7f50' },
  { k: 'other', label: 'Cars, homes & jewels', color: '#9aa0b4' },
] as const;

export function Overview({ go }: { go: (t: MoneyTab) => void }) {
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const market = useGameStore((s) => s.market);
  const portfolio = useGameStore((s) => s.portfolio);
  const ventures = useGameStore((s) => s.ventures);
  const projects = useGameStore((s) => s.devProjects);
  const history = useGameStore((s) => s.wealthHistory);
  const crew = useGameStore((s) => s.crew);
  const gameDate = useGameStore((s) => s.gameDate);
  const businesses = useGameStore((s) => s.businesses);
  const investments = useGameStore((s) => s.investments);
  const ownedAssets = useGameStore((s) => s.ownedAssets);
  const assignCrew = useGameStore((s) => s.assignCrew);
  const setScreen = useGameStore((s) => s.setScreen);

  const nw = useMemo(() => netWorthOf(useGameStore.getState()), [money, market, portfolio, ventures, projects, businesses, investments, ownedAssets]);
  const advisor = advisorOf({ crew });
  const accountant = (crew ?? []).find((c) => c.role === 'accountant');
  const serial = dateToSerial(gameDate);
  const series = [...(history ?? []).map((h) => h.net), nw.total];
  const monthAgo = (history ?? []).length >= 4 ? history![history!.length - 4].net : null;

  const picks = useMemo(() => {
    if (!advisor || !market) return { buys: [], sells: [] };
    const all = [...market.stocks.map((s) => ({ a: s, kind: 'stock' as const })), ...market.coins.filter((c) => !c.dead).map((c) => ({ a: c, kind: 'coin' as const }))];
    const rated = all.map((x) => ({ ...x, adv: adviceFor(x.a, advisor.skill, serial) }));
    const held = new Set([...(portfolio?.stocks ?? []), ...(portfolio?.coins ?? [])].map((h) => h.ticker));
    return {
      buys: rated.filter((x) => x.adv.call === 'Strong buy').concat(rated.filter((x) => x.adv.call === 'Buy')).slice(0, 3),
      sells: rated.filter((x) => held.has(x.a.ticker) && (x.adv.call === 'Sell' || x.adv.call === 'Avoid')).slice(0, 3),
    };
  }, [advisor?.skill, market, portfolio, serial]);

  const lastBiz = (ventures ?? []).filter((v) => !v.closed).reduce((a, v) => a + (v.months.filter((m) => m.note !== 'Collection drop').slice(-1)[0]?.profit ?? 0), 0);
  const rent = (projects ?? []).reduce((a, p) => a + monthlyRent(p, market?.propertyIndex ?? 100), 0);
  const divYear = market && portfolio ? portfolio.stocks.reduce((a, h) => { const s = market.stocks.find((x) => x.ticker === h.ticker); return a + (s ? h.units * s.price * s.dividend : 0); }, 0) : 0;
  const legacy = investments.reduce((a, i) => a + i.monthlyIncome, 0) + businesses.reduce((a, b) => a + b.monthlyRevenue - b.monthlyCosts, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] p-5 border border-amber/30 overflow-hidden" style={{ background: 'radial-gradient(140% 120% at 100% 0%, rgba(255,184,0,0.20), rgba(10,11,16,0) 55%), #14161e' }}>
        <Label>Net worth</Label>
        <div className="flex items-end gap-3 flex-wrap mt-1">
          <div className="text-[36px] sm:text-[42px] font-black text-ink num leading-none">{usd(nw.total)}</div>
          {monthAgo ? <Delta v={nw.total / Math.max(1, monthAgo) - 1} className="text-[13px] mb-1" /> : null}
          {monthAgo ? <span className="text-[11px] text-ink3 mb-1.5">this month</span> : null}
        </div>
        {series.length > 2 && <div className="mt-3"><Chart data={series} h={80} /></div>}
        <div className="flex h-2.5 rounded-full overflow-hidden mt-4 bg-white/5">
          {SLICES.map((s) => { const v = Math.max(0, nw[s.k]); return v > 0 ? <div key={s.k} style={{ width: `${(v / Math.max(1, nw.total)) * 100}%`, background: s.color }} /> : null; })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-3">
          {SLICES.map((s) => (
            <div key={s.k} className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[12px] text-ink2 truncate">{s.label}</span>
              <span className="text-[12px] text-ink num ml-auto">{usd(nw[s.k])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Businesses', v: lastBiz, sub: 'last month', go: 'business' as MoneyTab },
          { label: 'Rent', v: rent, sub: 'a month', go: 'property' as MoneyTab },
          { label: 'Dividends', v: divYear / 12, sub: 'a month, avg', go: 'shares' as MoneyTab },
          { label: 'Older holdings', v: legacy, sub: 'a month', go: 'business' as MoneyTab },
        ].filter((x, i) => i < 3 || x.v !== 0).map((x) => (
          <button key={x.label} onClick={() => go(x.go)} className="text-left rounded-[14px] border border-line bg-card p-3.5 hover:bg-cardhover transition">
            <Label>{x.label}</Label>
            <div className={`text-[17px] font-bold num mt-0.5 ${x.v > 0 ? 'text-rise' : x.v < 0 ? 'text-fall' : 'text-ink3'}`}>{x.v > 0 ? '+' : ''}{usd(x.v)}</div>
            <div className="text-[10px] text-ink3">{x.sub}</div>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label>Financial advisor</Label>
            <div className="text-[15px] font-semibold text-ink mt-0.5 truncate">{advisor ? `${advisor.name} · skill ${advisor.skill}` : accountant ? `${accountant.npcName} could do this` : 'Nobody yet'}</div>
          </div>
          {!advisor && accountant && <Button size="sm" onClick={() => assignCrew(accountant.id, 'markets')}>Make them advisor</Button>}
          {!advisor && !accountant && <Button size="sm" variant="secondary" onClick={() => setScreen('team')}>Hire an accountant</Button>}
        </div>
        {advisor ? (
          <div className="mt-3 space-y-3">
            <div className="text-[12px] text-ink2 leading-snug">A good advisor reads the trend most of the time, warns you before rug pulls, and rebalances your portfolio for a monthly return (about {(0.2 * advisor.skill / 100).toFixed(2)}% of what you hold).</div>
            {picks.buys.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-rise mb-1.5">Would buy now</div>
                <div className="space-y-1.5">{picks.buys.map((x) => (
                  <button key={x.a.ticker} onClick={() => go(x.kind === 'stock' ? 'shares' : 'crypto')} className="w-full flex items-center gap-2 text-left rounded-[10px] border border-line px-3 py-2 hover:bg-cardhover">
                    <span className="text-[12px] font-black text-ink w-12 shrink-0">{x.a.ticker}</span>
                    <span className="text-[12px] text-ink2 flex-1 truncate">{x.a.name} · {px(x.a.price)}</span>
                    <CallBadge call={x.adv.call} />
                  </button>
                ))}</div>
              </div>
            )}
            {picks.sells.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-fall mb-1.5">Would get out of</div>
                <div className="space-y-1.5">{picks.sells.map((x) => (
                  <button key={x.a.ticker} onClick={() => go(x.kind === 'stock' ? 'shares' : 'crypto')} className="w-full flex items-center gap-2 text-left rounded-[10px] border border-line px-3 py-2 hover:bg-cardhover">
                    <span className="text-[12px] font-black text-ink w-12 shrink-0">{x.a.ticker}</span>
                    <span className="text-[12px] text-ink2 flex-1 truncate">“{x.adv.note}”</span>
                    <CallBadge call={x.adv.call} />
                  </button>
                ))}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-ink2 mt-2 leading-snug">An accountant set to <b>Financial advisor</b> gives a buy / hold / sell call on every stock and coin, warns you about rug pulls, and earns a monthly return on your portfolio. A great one is right most of the time; a weak one is guessing.</div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { t: 'shares' as MoneyTab, e: '📈', l: 'Shares', s: '14 companies' },
          { t: 'crypto' as MoneyTab, e: '🪙', l: 'Crypto', s: 'Coins & memes' },
          { t: 'business' as MoneyTab, e: '🏪', l: 'Businesses', s: `${(ventures ?? []).filter((v) => !v.closed).length} running` },
          { t: 'property' as MoneyTab, e: '🏗️', l: 'Property', s: `${(projects ?? []).filter((p) => p.stage !== 'sold').length} owned` },
          { t: 'casino' as MoneyTab, e: '🎰', l: 'Casino', s: 'Tables & sports' },
        ].map((x) => (
          <button key={x.t} onClick={() => go(x.t)} className="text-left rounded-[14px] border border-line bg-card p-3.5 hover:bg-cardhover transition last:col-span-2 sm:last:col-span-1">
            <div className="text-[22px]">{x.e}</div>
            <div className="text-[14px] font-semibold text-ink mt-1">{x.l}</div>
            <div className="text-[11px] text-ink3">{x.s}</div>
          </button>
        ))}
      </div>

      {market && market.news.length > 0 && (
        <Card className="p-4">
          <Label className="mb-2">Money news</Label>
          <div className="space-y-1.5">{market.news.slice(0, 6).map((n) => <div key={n.id} className="text-[12px] text-ink2 leading-snug">{n.text}</div>)}</div>
        </Card>
      )}
    </div>
  );
}

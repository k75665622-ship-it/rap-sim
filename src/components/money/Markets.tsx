// ─── MONEY: SHARES & CRYPTO ────────────────────────────────────────────────
// One list per market. Tap a row for the chart, your position, what your
// financial advisor thinks, and buy / sell.

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore, advisorOf } from '../../store/gameStore';
import { adviceFor, changeOver, STOCK_FEE, COIN_FEE, type Stock, type Coin, type Holding } from '../../sim/markets';
import { dateToSerial } from '../../sim/gameClock';
import { SlidePanel, Button } from '../ui/kit';
import { AmountPicker, CallBadge, Card, Chart, Chips, Delta, Flash, Label, Spark, px, units, usd } from './shared';

type Kind = 'stock' | 'coin';
type Asset = Stock | Coin;

const KIND_TAG: Record<string, { label: string; cls: string }> = {
  major: { label: 'Major', cls: 'bg-new/15 text-new' },
  alt: { label: 'Altcoin', cls: 'bg-re/15 text-re' },
  meme: { label: 'Meme', cls: 'bg-amber/15 text-amber' },
  stable: { label: 'Stable', cls: 'bg-white/10 text-ink2' },
};

function isCoin(a: Asset): a is Coin {
  return (a as Coin).kind !== undefined;
}

export function MarketPanel({ kind }: { kind: Kind }) {
  const market = useGameStore((s) => s.market);
  const portfolio = useGameStore((s) => s.portfolio);
  const crew = useGameStore((s) => s.crew);
  const gameDate = useGameStore((s) => s.gameDate);
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<'mine' | 'movers' | 'all'>('all');
  const advisor = advisorOf({ crew });
  const serial = dateToSerial(gameDate);

  const list: Asset[] = useMemo(() => {
    if (!market) return [];
    const base: Asset[] = kind === 'stock' ? [...market.stocks] : [...market.coins];
    const held = new Set((kind === 'stock' ? portfolio?.stocks : portfolio?.coins)?.map((h) => h.ticker) ?? []);
    if (sort === 'mine') return base.filter((a) => held.has(a.ticker));
    if (sort === 'movers') return base.sort((a, b) => Math.abs(b.price / b.prev - 1) - Math.abs(a.price / a.prev - 1));
    return base.sort((a, b) => Number(held.has(b.ticker)) - Number(held.has(a.ticker)));
  }, [market, portfolio, kind, sort]);

  if (!market) return <Card className="p-6 text-ink2 text-[13px]">The markets open tomorrow.</Card>;

  const book: Holding[] = (kind === 'stock' ? portfolio?.stocks : portfolio?.coins) ?? [];
  const prices = new Map<string, number>([...market.stocks, ...market.coins].map((a) => [a.ticker, a.price]));
  const value = book.reduce((a, h) => a + h.units * (prices.get(h.ticker) ?? 0), 0);
  const cost = book.reduce((a, h) => a + h.units * h.avgCost, 0);
  const mood = market.mood;
  const orphans = book.filter((h) => !prices.has(h.ticker));
  const asset = open ? list.find((a) => a.ticker === open) ?? (kind === 'stock' ? market.stocks : market.coins).find((a) => a.ticker === open) : undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <Label>{kind === 'stock' ? 'Your shares' : 'Your crypto'}</Label>
          <div className="text-[22px] font-bold text-ink num mt-1">{usd(value)}</div>
          <div className="text-[12px] mt-0.5">{cost > 0 ? <Delta v={value / cost - 1} /> : <span className="text-ink3">Nothing yet</span>}</div>
        </Card>
        <Card className="p-4">
          <Label>Market mood</Label>
          <div className="text-[18px] font-bold mt-1">{mood > 0.3 ? '🐂 Bull' : mood < -0.3 ? '🐻 Bear' : '↔️ Sideways'}</div>
          <div className="text-[11px] text-ink3 mt-0.5">{kind === 'stock' ? 'Shares pay dividends every quarter.' : 'Crypto never sleeps. Neither do rug pulls.'}</div>
        </Card>
        <Card className="p-4 col-span-2 sm:col-span-1">
          <Label>Advisor</Label>
          {advisor ? (
            <div className="mt-1"><div className="text-[14px] font-semibold text-ink">{advisor.name}</div><div className="text-[11px] text-ink3">Skill {advisor.skill} · calls on every {kind === 'stock' ? 'stock' : 'coin'}</div></div>
          ) : (
            <div className="text-[12px] text-ink2 mt-1 leading-snug">No financial advisor. Put an accountant on <b>Financial advisor</b> in Team to get buy/sell calls.</div>
          )}
        </Card>
      </div>

      <Chips options={[{ id: 'all', label: 'All' }, { id: 'mine', label: `Mine · ${book.length}` }, { id: 'movers', label: 'Biggest moves' }]} value={sort} onChange={setSort} />

      <Card className="divide-y divide-line overflow-hidden">
        {list.length === 0 && <div className="p-5 text-[13px] text-ink3">{sort === 'mine' ? 'You don\'t own any yet.' : 'Nothing listed.'}</div>}
        {list.map((a) => {
          const h = book.find((x) => x.ticker === a.ticker);
          const day = a.prev > 0 ? a.price / a.prev - 1 : 0;
          const adv = advisor ? adviceFor(a, advisor.skill, serial) : null;
          return (
            <button key={a.ticker} onClick={() => setOpen(a.ticker)} className="w-full text-left flex items-center gap-3 px-3.5 py-3 hover:bg-cardhover transition">
              <div className={`w-11 h-11 shrink-0 rounded-[12px] flex items-center justify-center text-[11px] font-black tracking-tight ${isCoin(a) && a.dead ? 'bg-fall/15 text-fall' : 'bg-white/[0.06] text-ink'}`}>{isCoin(a) && a.dead ? '💀' : a.ticker}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[14px] font-semibold text-ink truncate">{a.name}</span>
                  {isCoin(a) && <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${KIND_TAG[a.kind].cls}`}>{KIND_TAG[a.kind].label}</span>}
                </div>
                <div className="text-[11px] text-ink3 truncate">
                  {isCoin(a) ? a.ticker : `${a.ticker} · ${(a as Stock).sector}`}
                  {h ? <span className="text-amber"> · you own {usd(h.units * a.price)}</span> : null}
                </div>
              </div>
              <Spark data={a.history.slice(-30)} w={64} h={28} className="hidden min-[400px]:block shrink-0" fill={false} />
              <div className="text-right shrink-0 w-[86px]">
                <div className="text-[13px] font-semibold text-ink num">{px(a.price)}</div>
                <Delta v={day} className="text-[11px]" />
                {adv && <div className="mt-0.5 flex justify-end"><span className={`text-[9px] font-bold uppercase ${adv.call.includes('uy') ? 'text-rise' : adv.call === 'Hold' ? 'text-ink3' : 'text-fall'}`}>{adv.call}</span></div>}
              </div>
            </button>
          );
        })}
      </Card>

      {orphans.length > 0 && (
        <Card className="p-4">
          <Label>Delisted</Label>
          {orphans.map((h) => <Orphan key={h.ticker} kind={kind} h={h} />)}
        </Card>
      )}

      {market.news.length > 0 && (
        <Card className="p-4">
          <Label className="mb-2">Market news</Label>
          <div className="space-y-1.5">
            {market.news.filter((n) => !n.ticker || (kind === 'stock' ? market.stocks.some((s) => s.ticker === n.ticker) : !market.stocks.some((s) => s.ticker === n.ticker))).slice(0, 8).map((n) => (
              <div key={n.id} className="text-[12px] text-ink2 leading-snug">{n.text}</div>
            ))}
          </div>
        </Card>
      )}

      {/* Portalled: an animated ancestor would otherwise trap the fixed panel. */}
      {typeof document !== 'undefined' && createPortal(
        <SlidePanel open={!!asset} onClose={() => setOpen(null)} title={asset ? `${asset.name}` : ''} subtitle={asset ? asset.ticker : ''} width={460}>
          {asset && <AssetDetail kind={kind} asset={asset} holding={book.find((x) => x.ticker === asset.ticker)} />}
        </SlidePanel>,
        document.body,
      )}
    </div>
  );
}

function Orphan({ kind, h }: { kind: Kind; h: Holding }) {
  const sellAsset = useGameStore((s) => s.sellAsset);
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="text-[13px] text-ink">💀 {h.ticker} <span className="text-ink3">· {units(h.units)} units, cost {usd(h.units * h.avgCost)}</span></div>
      <Button size="sm" variant="secondary" onClick={() => sellAsset(kind, h.ticker, 1)}>Write off</Button>
    </div>
  );
}

function AssetDetail({ kind, asset, holding }: { kind: Kind; asset: Asset; holding?: Holding }) {
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const gameDate = useGameStore((s) => s.gameDate);
  const buyAsset = useGameStore((s) => s.buyAsset);
  const sellAsset = useGameStore((s) => s.sellAsset);
  const [amt, setAmt] = useState(0);
  const [range, setRange] = useState<30 | 90>(30);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const advisor = advisorOf({ crew });
  const adv = advisor ? adviceFor(asset, advisor.skill, dateToSerial(gameDate)) : null;
  const coin = isCoin(asset) ? asset : null;
  const fee = kind === 'stock' ? STOCK_FEE : COIN_FEE;
  const pos = holding ? holding.units * asset.price : 0;
  const pnl = holding ? pos - holding.units * holding.avgCost : 0;

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-end gap-3">
          <div className="text-[30px] font-bold text-ink num leading-none">{px(asset.price)}</div>
          <Delta v={asset.prev > 0 ? asset.price / asset.prev - 1 : 0} className="text-[13px] mb-1" />
        </div>
        <div className="text-[12px] text-ink3 mt-1">
          30 days <Delta v={changeOver(asset.history, 30)} className="text-[12px]" /> · 90 days <Delta v={changeOver(asset.history, 90)} className="text-[12px]" />
        </div>
      </div>
      <Card className="p-3">
        <div className="flex justify-end mb-1"><Chips options={[{ id: 30 as const, label: '30D' }, { id: 90 as const, label: '90D' }]} value={range} onChange={setRange} /></div>
        <Chart data={asset.history.slice(-range)} h={150} />
      </Card>
      <div className="text-[13px] text-ink2 leading-relaxed">{asset.blurb}</div>
      <div className="grid grid-cols-2 gap-2">
        {!coin && <Card className="p-3"><Label>Dividend</Label><div className="text-[15px] font-semibold text-ink num">{((asset as Stock).dividend * 100).toFixed(1)}% / yr</div></Card>}
        {!coin && <Card className="p-3"><Label>Sector</Label><div className="text-[15px] font-semibold text-ink">{(asset as Stock).sector}</div></Card>}
        {coin && <Card className="p-3"><Label>Type</Label><div className="text-[15px] font-semibold text-ink">{KIND_TAG[coin.kind].label}</div></Card>}
        {coin && <Card className="p-3"><Label>Risk</Label><div className="text-[15px] font-semibold text-ink">{coin.dead ? 'Dead 💀' : coin.kind === 'stable' ? 'Low' : coin.kind === 'major' ? 'High' : coin.kind === 'alt' ? 'Very high' : 'Extreme'}</div></Card>}
      </div>

      <Card className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <Label>Your advisor says</Label>
          {adv && <CallBadge call={adv.call} />}
        </div>
        <div className="text-[13px] text-ink2 mt-1.5 leading-snug">{adv ? `“${adv.note}” — ${advisor!.name.split(' ')[0]}` : 'Nobody is advising you. Put an accountant on Financial advisor (Team) — a good one is right most of the time and warns you before rug pulls.'}</div>
      </Card>

      {holding && (
        <Card className="p-3.5">
          <Label>Your position</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            <div><div className="text-[11px] text-ink3">Units</div><div className="text-[14px] font-semibold text-ink num">{units(holding.units)}</div></div>
            <div><div className="text-[11px] text-ink3">Worth</div><div className="text-[14px] font-semibold text-ink num">{usd(pos)}</div></div>
            <div><div className="text-[11px] text-ink3">P/L</div><div className={`text-[14px] font-semibold num ${pnl >= 0 ? 'text-rise' : 'text-fall'}`}>{pnl >= 0 ? '+' : ''}{usd(pnl)}</div></div>
          </div>
          <div className="text-[11px] text-ink3 mt-1">Average cost {px(holding.avgCost)} a unit</div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[0.25, 0.5, 1].map((f) => (
              <Button key={f} size="sm" variant="secondary" onClick={() => setMsg(sellAsset(kind, asset.ticker, f))}>Sell {f === 1 ? 'all' : `${f * 100}%`}</Button>
            ))}
          </div>
        </Card>
      )}

      {!(coin && coin.dead) && (
        <Card className="p-3.5 space-y-3">
          <div className="flex items-center justify-between"><Label>Buy</Label><span className="text-[11px] text-ink3">Cash {usd(money)} · fee {(fee * 100).toFixed(1)}%</span></div>
          <AmountPicker value={amt} onChange={setAmt} presets={[500, 1000, 5000, 10_000, 50_000, 250_000, 1_000_000]} max={money} />
          {amt > 0 && <div className="text-[12px] text-ink3">≈ {units((amt * (1 - fee)) / asset.price)} {asset.ticker}</div>}
          <Button className="w-full" disabled={amt < 50 || amt > money} onClick={() => { setMsg(buyAsset(kind, asset.ticker, amt)); setAmt(0); }}>Buy {amt ? usd(amt) : ''}</Button>
        </Card>
      )}
      <Flash msg={msg} onClose={() => setMsg(null)} />
      {coin?.kind === 'meme' && !coin.dead && <div className="text-[11px] text-ink3 leading-snug">Meme coins can 10× in a week or go to zero overnight. Only play with money you can lose.</div>}
    </div>
  );
}

// ─── MONEY: BUSINESSES YOU RUN ─────────────────────────────────────────────
// Open one, set the staff, the prices and the marketing, grow it level by
// level, pull its big move once a month — or sell it while it's worth
// something.

import { useState } from 'react';
import { useGameStore, dealDiscountOf } from '../../store/gameStore';
import { VENTURES, VENTURE_BY_TYPE, STAFF_TIERS, ventureValue, dropCost, type Venture, type VentureType, type PricePoint, type DropPlan } from '../../sim/ventures';
import { dateToSerial } from '../../sim/gameClock';
import { Button } from '../ui/kit';
import { ClothingBrandCard } from './ClothingBrand';
import { Card, Chips, Flash, Label, Spark, usd } from './shared';

type Msg = { ok: boolean; message: string } | null;

export function BusinessesPanel() {
  const ventures = useGameStore((s) => s.ventures);
  const businesses = useGameStore((s) => s.businesses);
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const sellBusiness = useGameStore((s) => s.sellBusiness);
  const [msg, setMsg] = useState<Msg>(null);
  const [starting, setStarting] = useState<VentureType | null>(null);
  const live = (ventures ?? []).filter((v) => !v.closed);
  const closed = (ventures ?? []).filter((v) => v.closed);
  const lastMonth = live.reduce((a, v) => a + (v.months.filter((m) => m.note !== 'Collection drop').slice(-1)[0]?.profit ?? 0), 0);
  const worth = live.reduce((a, v) => a + ventureValue(v), 0);
  const off = dealDiscountOf({ crew });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5"><Label>Running</Label><div className="text-[22px] font-bold text-ink num mt-0.5">{live.length}</div></Card>
        <Card className="p-3.5"><Label>Last month</Label><div className={`text-[18px] font-bold num mt-0.5 ${lastMonth >= 0 ? 'text-rise' : 'text-fall'}`}>{lastMonth >= 0 ? '+' : ''}{usd(lastMonth)}</div></Card>
        <Card className="p-3.5"><Label>Worth</Label><div className="text-[18px] font-bold text-ink num mt-0.5">{usd(worth)}</div></Card>
      </div>
      <Flash msg={msg} onClose={() => setMsg(null)} />

      {live.map((v) => v.type === 'clothing' ? <ClothingBrandCard key={v.id} v={v} onMsg={setMsg} /> : <VentureCard key={v.id} v={v} onMsg={setMsg} />)}

      <section>
        <div className="flex items-end justify-between mb-2">
          <div className="text-[16px] font-semibold text-ink">Start a business</div>
          {off > 0 && <span className="text-[11px] text-rise">Your accountant haggles {Math.round(off * 100)}% off</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VENTURES.filter((d) => !live.some((v) => v.type === d.type)).map((d) => {
            const cost = Math.round(d.startCost * (1 - off));
            const risk = d.volatility >= 0.4 ? 'Wild' : d.volatility >= 0.25 ? 'Risky' : d.volatility >= 0.15 ? 'Medium' : 'Steady';
            return (
              <Card key={d.type} className={`p-4 ${starting === d.type ? 'border-amber' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="text-[30px] leading-none">{d.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-ink">{d.name}</div>
                    <div className="text-[12px] text-ink2 leading-snug mt-0.5">{d.blurb}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-ink2">{risk}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-ink2">{d.fameDriven >= 0.6 ? 'Your fame sells it' : d.fameDriven >= 0.3 ? 'Fame helps' : 'Fame barely matters'}</span>
                    </div>
                  </div>
                </div>
                {starting === d.type ? (
                  <StartForm type={d.type} cost={cost} money={money} onDone={(r) => { setMsg(r); if (r.ok) setStarting(null); }} onCancel={() => setStarting(null)} />
                ) : (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[14px] font-bold text-ink num">{usd(cost)}</span>
                    <Button size="sm" disabled={money < cost} onClick={() => setStarting(d.type)}>Open one</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {businesses.length > 0 && (
        <Card className="p-4">
          <Label className="mb-2">Older holdings</Label>
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0"><div className="text-[13px] text-ink truncate">{b.name}</div><div className="text-[11px] text-ink3">{usd(b.monthlyRevenue - b.monthlyCosts)} a month</div></div>
              <Button size="sm" variant="secondary" onClick={() => sellBusiness(b.id)}>Sell · {usd((b.monthlyRevenue / 0.026) * 0.7)}</Button>
            </div>
          ))}
        </Card>
      )}

      {closed.length > 0 && (
        <Card className="p-4">
          <Label className="mb-2">History</Label>
          {closed.slice(-8).reverse().map((v) => (
            <div key={v.id} className="text-[12px] text-ink2 py-1">{VENTURE_BY_TYPE[v.type].emoji} {v.name} — {v.log[0]}</div>
          ))}
        </Card>
      )}
    </div>
  );
}

function StartForm({ type, cost, money, onDone, onCancel }: { type: VentureType; cost: number; money: number; onDone: (r: { ok: boolean; message: string }) => void; onCancel: () => void }) {
  const artist = useGameStore((s) => s.player?.artistName ?? '');
  const openVenture = useGameStore((s) => s.openVenture);
  const def = VENTURE_BY_TYPE[type];
  const ideas: Record<VentureType, string[]> = {
    clothing: [`${artist} Supply`, 'Lagos to London', 'Night Shift Apparel'],
    restaurant: [`Mama's Pot`, `${artist}'s Kitchen`, 'Jollof Republic'],
    nightclub: ['Club Midnight', 'The Vault', 'Skyline Lounge'],
    carwash: ['Shine City', 'Spotless Auto Spa', 'Foam Party Wash'],
    salon: ['Fresh Cutz', 'The Chair', 'Crown & Fade'],
    liquor: [`${artist} Reserve`, 'Gold Label Gin', 'After Hours Cognac'],
    events: [`${artist} Live`, 'Block Party Co.', 'Sunset Sessions'],
    gym: ['Iron House', 'Grind Fitness', 'No Days Off Gym'],
    app: ['Tap', 'Linkup', 'BeatBox'],
    sneakers: ['Sole Plug', 'Heat Check Kicks', 'Deadstock'],
  };
  const [name, setName] = useState(ideas[type][0]);
  return (
    <div className="mt-3 space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Name it" className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[14px] text-ink focus:border-amber outline-none" />
      <Chips options={ideas[type].map((x) => ({ id: x, label: x }))} value={name} onChange={setName} />
      <div className="text-[11px] text-ink3">Costs {usd(cost)} and ⚡6. Running costs come out every month: around {usd(def.fixed)} plus staff and stock.</div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={money < cost || !name.trim()} onClick={() => onDone(openVenture(type, name))}>Open {name.trim() || 'it'}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function VentureCard({ v, onMsg }: { v: Venture; onMsg: (m: Msg) => void }) {
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const gameDate = useGameStore((s) => s.gameDate);
  const crew = useGameStore((s) => s.crew);
  const setVenture = useGameStore((s) => s.setVenture);
  const upgradeVenture = useGameStore((s) => s.upgradeVenture);
  const ventureSpecial = useGameStore((s) => s.ventureSpecial);
  const sellVenture = useGameStore((s) => s.sellVenture);
  const closeVenture = useGameStore((s) => s.closeVenture);
  const [openUp, setOpenUp] = useState(false);
  const [confirm, setConfirm] = useState<'sell' | 'close' | null>(null);
  const [plan, setPlan] = useState<DropPlan>({ units: 1000, quality: 'premium' });
  const def = VENTURE_BY_TYPE[v.type];
  const monthly = v.months.filter((m) => m.note !== 'Collection drop');
  const last = monthly[monthly.length - 1];
  const next = def.levels[v.level];
  const off = dealDiscountOf({ crew });
  const nextCost = next ? Math.round(next.cost * (1 - off)) : 0;
  const serial = dateToSerial(gameDate);
  const cooldown = v.lastSpecialSerial !== undefined ? Math.max(0, 30 - (serial - v.lastSpecialSerial)) : 0;
  const value = ventureValue(v);
  const specialCost = def.special.id === 'drop' ? dropCost(plan, v.level) : def.special.cost;
  const total = v.months.reduce((a, m) => a + m.profit, 0);

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpenUp((o) => !o)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-cardhover/50 transition">
        <div className="w-12 h-12 rounded-[14px] bg-white/[0.06] flex items-center justify-center text-[26px] shrink-0">{def.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink truncate">{v.name}</div>
          <div className="text-[11px] text-ink3 truncate">{def.levels[v.level - 1].label} · level {v.level} · rep {Math.round(v.reputation)}{v.type === 'app' && v.ownership < 1 ? ` · you own ${Math.round(v.ownership * 100)}%` : ''}</div>
        </div>
        {monthly.length > 1 && <Spark data={monthly.slice(-8).map((m) => m.profit)} w={56} h={26} fill={false} className="hidden min-[400px]:block shrink-0" />}
        <div className="text-right shrink-0">
          <div className={`text-[14px] font-bold num ${!last ? 'text-ink3' : last.profit >= 0 ? 'text-rise' : 'text-fall'}`}>{last ? `${last.profit >= 0 ? '+' : ''}${usd(last.profit)}` : 'New'}</div>
          <div className="text-[10px] text-ink3">{last ? 'last month' : 'first month soon'}</div>
        </div>
      </button>
      {v.redMonths >= 2 && <div className="mx-4 mb-3 text-[12px] text-fall bg-fall/10 border border-fall/30 rounded-[10px] px-3 py-2">{v.redMonths} months in the red. Cut costs, change the price, or get out.</div>}
      {openUp && (
        <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">
          {last && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><Label>Revenue</Label><div className="text-[14px] font-semibold text-ink num">{usd(last.revenue)}</div></div>
              <div><Label>Costs</Label><div className="text-[14px] font-semibold text-ink num">{usd(last.costs)}</div></div>
              <div><Label>All time</Label><div className={`text-[14px] font-semibold num ${total >= 0 ? 'text-rise' : 'text-fall'}`}>{usd(total)}</div></div>
            </div>
          )}
          <div>
            <Label className="mb-1.5">Staff</Label>
            <Chips options={STAFF_TIERS.map((t, i) => ({ id: i as 0 | 1 | 2, label: t.label }))} value={v.staff} onChange={(staff) => onMsg(setVenture(v.id, { staff }))} />
            <div className="text-[11px] text-ink3 mt-1">{v.staff === 0 ? 'Cheaper, but more theft, more mistakes, worse reviews.' : v.staff === 2 ? 'Expensive. Customers notice, and things go wrong less.' : 'A fair team at a fair wage.'}</div>
          </div>
          <div>
            <Label className="mb-1.5">Prices</Label>
            <Chips options={(['budget', 'standard', 'premium'] as PricePoint[]).map((p) => ({ id: p, label: p[0].toUpperCase() + p.slice(1) }))} value={v.price} onChange={(price) => onMsg(setVenture(v.id, { price }))} />
            <div className="text-[11px] text-ink3 mt-1">{v.price === 'premium' ? 'Fewer customers, bigger margins — works better the more famous you are.' : v.price === 'budget' ? 'Busy, but thin margins.' : 'Middle of the road.'}</div>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Marketing a month</Label><span className="text-[13px] font-semibold text-ink num">{usd(v.marketing)}</span></div>
            <div className="flex gap-1.5 mt-1.5">
              {[-1000, -250, 250, 1000].map((d) => (
                <button key={d} onClick={() => onMsg(setVenture(v.id, { marketing: v.marketing + d * v.level }))} className="flex-1 h-8 rounded-[8px] border border-line bg-card text-[12px] font-semibold text-ink2 hover:text-ink">{d > 0 ? '+' : '−'}{usd(Math.abs(d * v.level))}</button>
              ))}
            </div>
          </div>

          <Card className="p-3.5" style={{ background: 'linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,184,0,0.02))' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="text-[14px] font-semibold text-ink">⚡ {def.special.label}</div><div className="text-[12px] text-ink2 leading-snug mt-0.5">{def.special.blurb}</div></div>
            </div>
            {def.special.id === 'drop' && (
              <div className="mt-3 space-y-2">
                <Chips options={[500, 1000, 2500, 5000, 10000].map((u) => ({ id: u, label: `${u.toLocaleString()} pcs` }))} value={plan.units} onChange={(u) => setPlan({ ...plan, units: u })} />
                <Chips options={[{ id: 'basic' as const, label: 'Basic · $30' }, { id: 'premium' as const, label: 'Premium · $65' }, { id: 'luxury' as const, label: 'Luxury · $160' }]} value={plan.quality} onChange={(q) => setPlan({ ...plan, quality: q })} />
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[12px] text-ink3">{specialCost ? `Costs ${usd(specialCost)}` : 'Free'} · ⚡{def.special.energy}</span>
              <Button size="sm" disabled={cooldown > 0 || money < specialCost} onClick={() => onMsg(ventureSpecial(v.id, def.special.id === 'drop' ? plan : undefined))}>{cooldown > 0 ? `${cooldown}d` : 'Do it'}</Button>
            </div>
          </Card>

          {next ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><Label>Grow it</Label><div className="text-[13px] text-ink">Next: {next.label}</div><div className="text-[11px] text-ink3">About twice the customers — and twice the running costs.</div></div>
              <Button size="sm" disabled={money < nextCost} onClick={() => onMsg(upgradeVenture(v.id))}>{usd(nextCost)}</Button>
            </div>
          ) : <div className="text-[12px] text-ink3">It's as big as it gets.</div>}

          {v.log.length > 0 && (
            <div>
              <Label className="mb-1">What happened</Label>
              <div className="space-y-1">{v.log.slice(0, 5).map((l, i) => <div key={i} className="text-[12px] text-ink2 leading-snug">• {l}</div>)}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {confirm === 'sell' ? (
              <><Button size="sm" onClick={() => { onMsg(sellVenture(v.id)); setConfirm(null); }}>Confirm sale · {usd(value)}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></>
            ) : confirm === 'close' ? (
              <><Button size="sm" variant="secondary" onClick={() => { onMsg(closeVenture(v.id)); setConfirm(null); }}>Close it down</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></>
            ) : (
              <><Button size="sm" variant="secondary" onClick={() => setConfirm('sell')}>Sell · {usd(value)}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm('close')}>Close down</Button></>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── HOME & LIFESTYLE ──────────────────────────────────────────────────────
// Where you live and what it costs, the month's bills and how long your money
// lasts at this rate, and the big things you own — what they cost to keep and
// what they'd fetch if you sold them today.

import { useMemo, useState } from 'react';
import { useGameStore, monthlyBurnOf, creditOf, monthlyIncomeOf } from '../../store/gameStore';
import { mortgageOffer } from '../../sim/bank';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { LUXURY_CATALOG } from '../../data/luxuryItems';
import { dateToSerial, serialToDate, formatMedium, serialOf } from '../../sim/gameClock';
import { HOMES, homeDef, rentFor, livingFor, priceFor, moveInCost, advanceMonths, renewalMonths, upkeepFor, resaleFor, ownedValue, rentIncome, newHome, type HomeTier } from '../../sim/home';
import { money0 } from '../../sim/tax';
import type { LuxuryItem } from '../../types/game';

type Tab = 'home' | 'garage' | 'collection';

const CAT: Record<string, { label: string; emoji: string; does: string }> = {
  car: { label: 'Garage', emoji: '🚗', does: 'Gets you around without the ride-hailing bill. Fuel, insurance and servicing every month; it loses value every year.' },
  jet: { label: 'Private flying', emoji: '✈️', does: 'Fly when you want, not when the airline does. A monthly membership on top.' },
  yacht: { label: 'Yacht', emoji: '⛵', does: 'A crew, a mooring and fuel every month. The parties are legendary.' },
  art: { label: 'Art', emoji: '🖼️', does: 'Insured and stored. Good art can be worth more in ten years; some isn\'t.' },
  jewelry: { label: 'Jewellery', emoji: '💎', does: 'Bought before the Drip shop opened. Wearables are in Drip & Ink now.' },
  watch: { label: 'Watches', emoji: '⌚', does: 'Bought before the Drip shop opened. Wearables are in Drip & Ink now.' },
  home: { label: 'Property', emoji: '🏠', does: 'Bought before homes moved here. Sell it at today\'s property prices.' },
};

export function LifestyleScreen() {
  const player = useGameStore((s) => s.player);
  const home = useGameStore((s) => s.home);
  const homes = useGameStore((s) => s.homes);
  const assets = useGameStore((s) => s.ownedAssets);
  const market = useGameStore((s) => s.market);
  const gameDate = useGameStore((s) => s.gameDate);
  const moveHome = useGameStore((s) => s.moveHome);
  const payRent = useGameStore((s) => s.payRent);
  const sellHome = useGameStore((s) => s.sellHome);
  const setRentedOut = useGameStore((s) => s.setHomeRentedOut);
  const houseTour = useGameStore((s) => s.houseTour);
  const buy = useGameStore((s) => s.buyLuxuryItem);
  const sell = useGameStore((s) => s.sellLuxury);
  const [tab, setTab] = useState<Tab>('home');
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirm, setConfirm] = useState<null | { tier: HomeTier; how: 'rent' | 'buy' | 'mortgage' }>(null);
  const score = useGameStore((s) => creditOf(s));
  const income = useGameStore((s) => monthlyIncomeOf(s));
  const today = dateToSerial(gameDate);
  const burn = useMemo(() => monthlyBurnOf({ home, homes, ownedAssets: assets, player, market }), [home, homes, assets, player, market]);
  if (!player) return null;
  const h = home ?? newHome(player.city, player.country, today);
  const def = homeDef(h.tier);
  const country = player.country;
  const idx = market?.propertyIndex ?? 100;
  const money = player.career.money;
  const runway = burn.total > 0 ? money / burn.total : Infinity;
  const rentMonths = renewalMonths(country);
  const prepaidLeft = !h.ownedId && h.tier !== 'family' ? Math.max(0, Math.floor((h.paidUntil - today) / 30)) : 0;
  const done = (r: { ok: boolean; message: string }) => { setFlash(r); setConfirm(null); };

  return (
    <div className="max-w-[920px] mx-auto space-y-4 pb-12">
      {/* Header: where you live, and the month */}
      <div className="rounded-[20px] border border-line p-5 overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 100% 0%, rgba(46,204,113,0.18), rgba(10,11,16,0) 60%), linear-gradient(135deg, #10161a, #14161e)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-rise">Home & lifestyle</div>
            <h1 className="text-[24px] sm:text-[26px] font-bold text-ink leading-tight mt-1">{def.name}</h1>
            <div className="text-[13px] text-ink2 mt-0.5">{h.city}, {h.country} · {h.ownedId ? 'yours' : h.tier === 'family' ? 'rent-free' : `renting · ${money0(rentFor(h.tier, h.country))}/month`}</div>
            <div className="text-[12px] text-ink3 mt-1 max-w-md">{def.blurb}</div>
          </div>
          <div className="text-[48px] leading-none shrink-0">{def.emoji}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Fig label="Monthly bills" value={money0(burn.total)} sub={burn.tenants ? `after ${money0(burn.tenants)} rent in` : 'everything, every month'} />
          <Fig label="Cash" value={money0(money)} sub={runway === Infinity ? 'bills covered' : runway >= 24 ? '2+ years of bills' : `${runway.toFixed(runway < 3 ? 1 : 0)} months of bills`} tone={runway < 3 ? 'bad' : undefined} />
          <Fig label="Sleep" value={`${def.energy >= 0 ? '+' : ''}${def.energy}`} sub="max energy" />
          <Fig label={h.ownedId || h.tier === 'family' ? 'Rent' : 'Rent paid until'} value={h.ownedId ? 'None' : h.tier === 'family' ? 'Free' : formatMedium(serialToDate(h.paidUntil))} sub={prepaidLeft ? `${prepaidLeft} month${prepaidLeft === 1 ? '' : 's'} left` : h.tier === 'family' ? 'help out when you can' : ''} />
        </div>
        {h.due && (
          <div className="mt-3 rounded-[14px] border border-fall/50 bg-fall/10 p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[13px] text-ink"><b>Rent is due:</b> {money0(h.due.amount)}. Pay by {formatMedium(serialToDate(h.due.by))} or you're out.</div>
            <Button size="sm" onClick={() => done(payRent())} disabled={money < h.due.amount}>Pay {money0(h.due.amount)}</Button>
          </div>
        )}
      </div>

      {flash && (
        <div className={cn('rounded-[12px] px-4 py-2.5 text-[13px] flex items-start justify-between gap-3', flash.ok ? 'bg-rise/10 text-rise border border-rise/30' : 'bg-fall/10 text-fall border border-fall/30')}>
          <span>{flash.message}</span><button onClick={() => setFlash(null)} className="text-ink3 hover:text-ink">✕</button>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto">
        {([['home', '🏠 Where you live'], ['garage', '🚗 Garage'], ['collection', '💎 Collection']] as [Tab, string][]).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={cn('h-9 px-4 rounded-full border text-[13px] font-semibold shrink-0', tab === id ? 'border-rise bg-rise/15 text-rise' : 'border-line bg-card text-ink2')}>{l}</button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="space-y-4">
          {/* The month, itemised */}
          <section className="rounded-[16px] border border-line bg-card p-4">
            <h2 className="text-[14px] font-semibold text-ink mb-2">Every month</h2>
            <Line label="Rent" value={burn.rent} note={h.ownedId ? 'You own it' : h.tier === 'family' ? 'Free at home' : rentMonths >= 12 ? `Paid a year at a time (${money0(burn.rent * 12)})` : 'Monthly'} />
            <Line label="Living" value={burn.living} note="Food, power, water, data, getting around" />
            <Line label="Upkeep" value={burn.upkeep} note="Cars, toys, homes you own" />
            {burn.tenants > 0 && <Line label="Tenants" value={-burn.tenants} note="Homes you let out" />}
            <div className="mt-2 pt-2 border-t border-line flex justify-between text-[14px] font-bold text-ink"><span>Total</span><span className="num">{money0(burn.total)}</span></div>
            {def.image >= 2 && !h.toured && <div className="mt-3 flex items-center justify-between gap-2 rounded-[12px] bg-white/[0.03] px-3 py-2"><span className="text-[12px] text-ink2">Fans love a house tour. One per place.</span><Button size="sm" variant="secondary" onClick={() => done(houseTour())}>🎬 Film a house tour</Button></div>}
          </section>

          {/* Homes you own */}
          {(homes ?? []).length > 0 && (
            <section className="rounded-[16px] border border-line bg-card p-4">
              <h2 className="text-[14px] font-semibold text-ink mb-2">Homes you own</h2>
              <div className="space-y-2">
                {(homes ?? []).map((o) => {
                  const d = homeDef(o.tier);
                  const live = h.ownedId === o.id;
                  const value = ownedValue(o, idx);
                  return (
                    <div key={o.id} className="rounded-[12px] border border-line px-3 py-2.5 flex items-center gap-3 flex-wrap">
                      <span className="text-[24px]">{d.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-ink">{d.name} · {o.city}</div>
                        <div className="text-[11px] text-ink3">Paid {money0(o.paid)} · worth {money0(value)} today{live ? ' · you live here' : o.rentedOut ? ` · let for ${money0(rentIncome(o))}/mo` : ' · empty'}</div>
                      </div>
                      {!live && <Button size="sm" variant="ghost" onClick={() => done(moveHome(o.tier, 'own', o.id))}>Move in</Button>}
                      {!live && <Button size="sm" variant="ghost" onClick={() => done(setRentedOut(o.id, !o.rentedOut))}>{o.rentedOut ? 'End tenancy' : 'Let it out'}</Button>}
                      {!live && <Button size="sm" variant="secondary" onClick={() => done(sellHome(o.id))}>Sell</Button>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Places */}
          <section>
            <h2 className="text-[14px] font-semibold text-ink mb-1">Move</h2>
            <div className="text-[12px] text-ink3 mb-2">{advanceMonths(country) >= 12 ? `Landlords in ${country} want a year's rent up front.` : advanceMonths(country) > 2 ? `Landlords in ${country} want ${advanceMonths(country)} months up front.` : 'First month and a deposit to move in; the deposit comes back when you leave.'}{prepaidLeft > 0 ? ` You have ${prepaidLeft} month${prepaidLeft === 1 ? '' : 's'} of rent paid here — moving out forfeits it.` : ''}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HOMES.map((d) => {
                const here = d.id === h.tier;
                const rent = rentFor(d.id, country);
                const inCost = d.id === 'family' ? 0 : moveInCost(d.id, country);
                const price = priceFor(d.id, country, idx);
                const pending = confirm?.tier === d.id ? confirm : null;
                const mort = price > 0 ? mortgageOffer(score, income, price, country) : null;
                return (
                  <div key={d.id} className={cn('rounded-[14px] border p-3.5', here ? 'border-rise/60 bg-rise/[0.06]' : 'border-line bg-card')}>
                    <div className="flex items-start gap-3">
                      <span className="text-[28px] leading-none">{d.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-ink">{d.name}{here && <span className="ml-1.5 text-[11px] text-rise">· you live here{h.ownedId ? ' (yours)' : ''}</span>}</div>
                        <div className="text-[11px] text-ink3 leading-snug mt-0.5">{d.blurb}</div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink2">
                          <span>{d.id === 'family' ? 'No rent' : `Rent ${money0(rent)}/mo`}</span>
                          <span>Living {money0(livingFor(d.id, country))}/mo</span>
                          <span>Sleep {d.energy >= 0 ? '+' : ''}{d.energy}</span>
                        </div>
                      </div>
                    </div>
                    {!here && (pending ? (
                      <div className="mt-2.5 rounded-[10px] bg-white/[0.04] p-2.5 text-[12px] text-ink2">
                        {pending.how === 'rent' ? <>Move-in: <b className="text-ink">{money0(inCost)}</b>{d.id !== 'family' && rentMonths >= 12 ? ' (a year of rent + movers)' : d.id !== 'family' ? ' (first month, deposit, movers)' : ''}.</> : pending.how === 'mortgage' && mort ? <><b className="text-ink">{money0(mort.down)}</b> down, then <b className="text-ink">{money0(mort.monthly)}/month</b> for {mort.months / 12} years at {(mort.apr * 100).toFixed(1)}%. Miss three payments and the bank takes the house.</> : <>Price <b className="text-ink">{money0(price)}</b> plus movers. No more rent — upkeep and property tax instead.</>}
                        <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => done(moveHome(d.id, pending.how))}>Confirm</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></div>
                      </div>
                    ) : (
                      <div className="mt-2.5 flex gap-2 flex-wrap">
                        <Button size="sm" variant="secondary" onClick={() => setConfirm({ tier: d.id, how: 'rent' })} disabled={money < inCost}>{d.id === 'family' ? 'Move back home' : `Rent · ${money0(inCost)} to move in`}</Button>
                        {price > 0 && <Button size="sm" variant="ghost" onClick={() => setConfirm({ tier: d.id, how: 'buy' })} disabled={money < price}>Buy · {money0(price)}</Button>}
                        {mort && money < price && <Button size="sm" variant="ghost" onClick={() => setConfirm({ tier: d.id, how: 'mortgage' })} disabled={money < mort.down}>Mortgage · {money0(mort.down)} down</Button>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {tab === 'garage' && <Shop cats={['car']} assets={assets} money={money} today={today} onBuy={(id) => { buy(id); setFlash({ ok: true, message: 'Bought. It\'s in your garage.' }); }} onSell={(id) => done(sell(id))} />}
      {tab === 'collection' && <Shop cats={['jet', 'yacht', 'art', 'jewelry', 'watch', 'home']} assets={assets} money={money} today={today} onBuy={(id) => { buy(id); setFlash({ ok: true, message: 'Bought.' }); }} onSell={(id) => done(sell(id))} propertyIndex={idx} />}
    </div>
  );
}

function Shop({ cats, assets, money, today, onBuy, onSell, propertyIndex = 100 }: { cats: string[]; assets: LuxuryItem[]; money: number; today: number; onBuy: (id: string) => void; onSell: (id: string) => void; propertyIndex?: number }) {
  // Jewellery, watches and homes are sold elsewhere now; they only show here if you already own them.
  const forSale = (c: string) => c !== 'jewelry' && c !== 'watch' && c !== 'home';
  return (
    <div className="space-y-4">
      {cats.map((c) => {
        const owned = assets.filter((a) => a.category === c);
        const items = forSale(c) ? LUXURY_CATALOG.filter((i) => i.category === c) : [];
        if (!owned.length && !items.length) return null;
        const meta = CAT[c];
        return (
          <section key={c} className="rounded-[16px] border border-line bg-card p-4">
            <div className="flex items-center gap-2"><span className="text-[20px]">{meta.emoji}</span><h2 className="text-[14px] font-semibold text-ink">{meta.label}</h2></div>
            <div className="text-[12px] text-ink3 mt-0.5 mb-3">{meta.does}</div>
            {owned.length > 0 && (
              <div className="space-y-2 mb-3">
                {owned.map((a) => {
                  const age = a.purchaseDate ? today - serialOf(a.purchaseDate, today) : 0;
                  const value = a.category === 'home' ? Math.round(a.cost * propertyIndex / 100 * 0.97) : resaleFor(a.category, a.cost, age, 0.5);
                  return (
                    <div key={a.id} className="rounded-[12px] border border-rise/30 bg-rise/[0.04] px-3 py-2.5 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-ink">{a.name}</div>
                        <div className="text-[11px] text-ink3">Paid {money0(a.cost)} · worth about {money0(value)} · {money0(upkeepFor(a.category, a.cost))}/mo to keep</div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => onSell(a.id)}>Sell</Button>
                    </div>
                  );
                })}
              </div>
            )}
            {items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.filter((i) => !owned.some((o) => o.id === i.id)).map((i) => (
                  <div key={i.id} className="rounded-[12px] border border-line px-3 py-2.5">
                    <div className="text-[13px] font-semibold text-ink">{i.name}</div>
                    <div className="text-[12px] text-amber num mt-0.5">{money0(i.cost)}</div>
                    <div className="text-[11px] text-ink3">{money0(upkeepFor(i.category, i.cost))}/mo to keep</div>
                    <Button size="sm" className="mt-2 w-full" variant={money >= i.cost ? 'primary' : 'secondary'} disabled={money < i.cost} onClick={() => onBuy(i.id)}>{money >= i.cost ? 'Buy' : 'Can\'t afford'}</Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Fig({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'bad' }) {
  return (
    <div className="rounded-[12px] bg-black/25 border border-white/5 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-ink3">{label}</div>
      <div className={cn('text-[17px] font-bold num mt-0.5', tone === 'bad' ? 'text-fall' : 'text-ink')}>{value}</div>
      {sub && <div className="text-[11px] text-ink3 truncate">{sub}</div>}
    </div>
  );
}

function Line({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
      <div className="min-w-0"><span className="text-ink">{label}</span> <span className="text-[11px] text-ink3">· {note}</span></div>
      <span className={cn('num shrink-0', value < 0 ? 'text-rise' : 'text-ink2')}>{value < 0 ? `+${money0(-value)}` : money0(value)}</span>
    </div>
  );
}

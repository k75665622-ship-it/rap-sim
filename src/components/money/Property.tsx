// ─── MONEY: PROPERTY DEVELOPMENT ───────────────────────────────────────────
// Buy land, build on it, rent it out or sell it. The property market moves
// underneath you; building sites go wrong.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ZONES, BUILDS, buildCostFor, projectValue, monthlyRent, zoneOf, buildOf, type DevProject } from '../../sim/realestate';
import { changeOver } from '../../sim/markets';
import { dateToSerial } from '../../sim/gameClock';
import { Button } from '../ui/kit';
import { Card, Chart, Delta, Flash, Label, usd } from './shared';

type Msg = { ok: boolean; message: string } | null;

export function PropertyPanel() {
  const market = useGameStore((s) => s.market);
  const projects = useGameStore((s) => s.devProjects);
  const investments = useGameStore((s) => s.investments);
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const gameDate = useGameStore((s) => s.gameDate);
  const buyPlot = useGameStore((s) => s.buyPlot);
  const sellInvestment = useGameStore((s) => s.sellInvestment);
  const [msg, setMsg] = useState<Msg>(null);
  const index = market?.propertyIndex ?? 100;
  const serial = dateToSerial(gameDate);
  const live = (projects ?? []).filter((p) => p.stage !== 'sold');
  const sold = (projects ?? []).filter((p) => p.stage === 'sold');
  const dealer = (crew ?? []).some((c) => c.role === 'accountant' && c.assignment === 'deals');
  const rent = live.reduce((a, p) => a + monthlyRent(p, index), 0);
  const worth = live.reduce((a, p) => a + projectValue(p, index, serial), 0);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label>Property market</Label>
            <div className="text-[24px] font-bold text-ink num mt-0.5">{index.toFixed(1)}</div>
            <div className="text-[12px] text-ink3">90 days <Delta v={changeOver(market?.propertyHistory ?? [], 90)} className="text-[12px]" /> · 100 = where prices started</div>
          </div>
          <div className="text-right">
            <Label>Your property</Label>
            <div className="text-[18px] font-bold text-ink num mt-0.5">{usd(worth)}</div>
            <div className="text-[12px] text-rise num">{rent ? `+${usd(rent)}/mo rent` : ''}</div>
          </div>
        </div>
        <div className="mt-3"><Chart data={market?.propertyHistory ?? []} h={90} /></div>
      </Card>
      <Flash msg={msg} onClose={() => setMsg(null)} />

      {live.map((p) => <ProjectCard key={p.id} p={p} index={index} serial={serial} onMsg={setMsg} />)}

      <section>
        <div className="flex items-end justify-between mb-2">
          <div className="text-[16px] font-semibold text-ink">Buy land</div>
          {dealer && <span className="text-[11px] text-rise">Your accountant haggles 8% off</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ZONES.map((z) => {
            const price = Math.round(z.land * (index / 100) * (dealer ? 0.92 : 1));
            return (
              <Card key={z.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-[28px] leading-none">{z.emoji}</div>
                  <div className="min-w-0 flex-1"><div className="text-[15px] font-semibold text-ink">{z.name}</div><div className="text-[12px] text-ink2 leading-snug mt-0.5">{z.blurb}</div></div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[14px] font-bold text-ink num">{usd(price)}</span>
                  <Button size="sm" disabled={money < price} onClick={() => setMsg(buyPlot(z.id))}>Buy plot</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {investments.length > 0 && (
        <Card className="p-4">
          <Label className="mb-2">Older investments</Label>
          {investments.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0"><div className="text-[13px] text-ink truncate">{i.name}</div><div className="text-[11px] text-ink3">{usd(i.monthlyIncome)} a month</div></div>
              <Button size="sm" variant="secondary" onClick={() => sellInvestment(i.id)}>Sell · {usd(i.currentValue)}</Button>
            </div>
          ))}
        </Card>
      )}

      {sold.length > 0 && (
        <Card className="p-4">
          <Label className="mb-2">Sold</Label>
          {sold.slice(-8).reverse().map((p) => {
            const pnl = (p.soldFor ?? 0) + p.totalRent - p.spent;
            return <div key={p.id} className="text-[12px] text-ink2 py-1">{p.build ? buildOf(p.build).emoji : '🌱'} {p.build ? buildOf(p.build).name : 'Land'} · {zoneOf(p.zone).name} — sold {usd(p.soldFor ?? 0)} · <span className={pnl >= 0 ? 'text-rise' : 'text-fall'}>{pnl >= 0 ? '+' : ''}{usd(pnl)}</span></div>;
          })}
        </Card>
      )}
    </div>
  );
}

function ProjectCard({ p, index, serial, onMsg }: { p: DevProject; index: number; serial: number; onMsg: (m: Msg) => void }) {
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const startBuild = useGameStore((s) => s.startBuild);
  const payOverrun = useGameStore((s) => s.payOverrun);
  const setRenting = useGameStore((s) => s.setRenting);
  const sellProject = useGameStore((s) => s.sellProject);
  const [confirm, setConfirm] = useState(false);
  const z = zoneOf(p.zone);
  const b = p.build ? buildOf(p.build) : null;
  const value = projectValue(p, index, serial);
  const dealer = (crew ?? []).some((c) => c.role === 'accountant' && c.assignment === 'deals');
  const progress = p.stage === 'building' && p.startSerial !== undefined && p.doneSerial !== undefined ? Math.min(1, (serial - p.startSerial) / Math.max(1, p.doneSerial - p.startSerial)) : p.stage === 'done' ? 1 : 0;
  const daysLeft = p.doneSerial !== undefined ? Math.max(0, p.doneSerial - serial) : 0;
  const rent = monthlyRent({ ...p, renting: true }, index);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-[14px] bg-white/[0.06] flex items-center justify-center text-[26px] shrink-0">{b ? b.emoji : '🌱'}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink truncate">{b ? b.name : 'Empty plot'}</div>
          <div className="text-[11px] text-ink3">{z.emoji} {z.name} · {p.stage === 'land' ? 'Land' : p.stage === 'building' ? `Building · ${daysLeft} days left` : p.renting ? 'Rented out' : 'Finished, empty'}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[14px] font-bold text-ink num">{usd(value)}</div>
          <div className={`text-[11px] num ${value - p.spent >= 0 ? 'text-rise' : 'text-fall'}`}>{value - p.spent >= 0 ? '+' : ''}{usd(value - p.spent)}</div>
        </div>
      </div>

      {p.stage === 'building' && (
        <div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-amber transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          {p.owed > 0 && (
            <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-fall bg-fall/10 border border-fall/30 rounded-[10px] px-3 py-2">
              <span>Work has stopped. The contractor needs {usd(p.owed)}.</span>
              <Button size="sm" disabled={money < p.owed} onClick={() => onMsg(payOverrun(p.id))}>Pay</Button>
            </div>
          )}
        </div>
      )}

      {p.stage === 'land' && (
        <div className="space-y-2">
          <Label>Build on it</Label>
          {BUILDS.map((bd) => {
            const cost = Math.round(buildCostFor(p.zone, bd.id) * (dealer ? 0.92 : 1));
            return (
              <div key={bd.id} className="flex items-center gap-3 rounded-[12px] border border-line p-3">
                <span className="text-[22px]">{bd.emoji}</span>
                <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-ink">{bd.name}</div><div className="text-[11px] text-ink3 leading-snug">{bd.blurb} About {Math.round(bd.days / 30)} months.</div></div>
                <Button size="sm" disabled={money < cost} onClick={() => onMsg(startBuild(p.id, bd.id))}>{usd(cost)}</Button>
              </div>
            );
          })}
        </div>
      )}

      {p.stage === 'done' && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-ink2">{p.renting ? <>Tenants pay <b className="text-rise">{usd(rent)}</b> a month · {usd(p.totalRent)} so far</> : <>Empty. Rented it would bring about {usd(rent)} a month.</>}</div>
          <Button size="sm" variant="secondary" onClick={() => onMsg(setRenting(p.id, !p.renting))}>{p.renting ? 'Empty it' : 'Rent it out'}</Button>
        </div>
      )}

      {p.log.length > 0 && <div className="space-y-0.5">{p.log.slice(0, 3).map((l, i) => <div key={i} className="text-[11px] text-ink3 leading-snug">• {l}</div>)}</div>}

      <div className="flex gap-2">
        {confirm ? (
          <><Button size="sm" onClick={() => { onMsg(sellProject(p.id)); setConfirm(false); }}>Confirm · {usd(Math.round(value * 0.97 - p.owed))}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>Sell{p.stage === 'building' ? ' half-built' : ''}</Button>
        )}
      </div>
    </Card>
  );
}

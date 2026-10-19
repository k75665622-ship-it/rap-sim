// ─── YOUR CLOTHING BRAND ───────────────────────────────────────────────────
// The whole operation in one card: products, designs, stock and suppliers,
// weekly sales, shops and staff.

import { useMemo, useState } from 'react';
import { useGameStore, dealDiscountOf } from '../../store/gameStore';
import { KINDS, MATERIALS, SUPPLIERS, TREND_POOL, PRODUCT_NAMES, fairPrice, unitCostFor, inventoryValue, levelPerks, type Product, type ProductKind, type Material, type SupplierId } from '../../sim/clothing';
import { VENTURE_BY_TYPE, STAFF_TIERS, ventureValue, type Venture } from '../../sim/ventures';
import { dateToSerial } from '../../sim/gameClock';
import { isRealId } from '../../sim/realPeople';
import { blendedFame } from '../../store/gameStore';
import { gradientFor, Button } from '../ui/kit';
import { Card, Chips, Label, Spark, usd } from './shared';
import { cn } from '@/utils/cn';

type Msg = { ok: boolean; message: string } | null;
type Tab = 'products' | 'design' | 'stock' | 'sales' | 'shop';

export function ClothingBrandCard({ v, onMsg }: { v: Venture; onMsg: (m: Msg) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('products');
  const b = v.brand;
  const last = b?.weeks[b.weeks.length - 1];
  const live = (b?.products ?? []).filter((p) => !p.retired);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-cardhover/50 transition" style={{ background: open ? 'linear-gradient(135deg, rgba(255,184,0,0.10), rgba(255,184,0,0) 60%)' : undefined }}>
        <div className="w-12 h-12 rounded-[14px] bg-white/[0.06] flex items-center justify-center text-[26px] shrink-0">👕</div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink truncate">{v.name}</div>
          <div className="text-[11px] text-ink3 truncate">Clothing brand · level {v.level} · {live.length} product{live.length === 1 ? '' : 's'} · rep {Math.round(v.reputation)}</div>
        </div>
        {b && b.weeks.length > 1 && <Spark data={b.weeks.slice(-10).map((w) => w.profit)} w={56} h={26} fill={false} className="hidden min-[400px]:block shrink-0" />}
        <div className="text-right shrink-0">
          <div className={cn('text-[14px] font-bold num', !last ? 'text-ink3' : last.profit >= 0 ? 'text-rise' : 'text-fall')}>{last ? `${last.profit >= 0 ? '+' : ''}${usd(last.profit)}` : 'New'}</div>
          <div className="text-[10px] text-ink3">{last ? `last week · ${last.units} sold` : 'first week soon'}</div>
        </div>
      </button>
      {v.redMonths >= 2 && <div className="mx-4 mb-3 text-[12px] text-fall bg-fall/10 border border-fall/30 rounded-[10px] px-3 py-2">{v.redMonths} months in the red. Check prices, stock and running costs.</div>}
      {open && b && (
        <div className="border-t border-line">
          <div className="px-4 pt-3"><Chips options={[{ id: 'products' as Tab, label: `👕 Products · ${live.length}` }, { id: 'design' as Tab, label: '✏️ New design' }, { id: 'stock' as Tab, label: '📦 Stock' }, { id: 'sales' as Tab, label: '📈 Sales' }, { id: 'shop' as Tab, label: '🏬 Shop & team' }]} value={tab} onChange={setTab} /></div>
          <div className="p-4 pt-3">
            {tab === 'products' && <Products v={v} onMsg={onMsg} go={setTab} />}
            {tab === 'design' && <Design v={v} onMsg={(m) => { onMsg(m); if (m?.ok) setTab('products'); }} />}
            {tab === 'stock' && <Stock v={v} onMsg={onMsg} />}
            {tab === 'sales' && <Sales v={v} onMsg={onMsg} />}
            {tab === 'shop' && <Shop v={v} onMsg={onMsg} />}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── PRODUCTS ──────────────────────────────────────────────────────────────

function ProductArt({ p, size = 64 }: { p: Pick<Product, 'id' | 'kind' | 'limited' | 'collab'>; size?: number }) {
  const [a, c] = gradientFor(p.id);
  return (
    <div className="relative shrink-0 rounded-[14px] flex items-center justify-center" style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${c})` }}>
      <span style={{ fontSize: size * 0.48 }}>{KINDS[p.kind].emoji}</span>
      {p.limited && <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-fall text-white">LTD</span>}
      {p.collab && <span className="absolute -bottom-1.5 -right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-re text-white">COLLAB</span>}
    </div>
  );
}

function Products({ v, onMsg, go }: { v: Venture; onMsg: (m: Msg) => void; go: (t: Tab) => void }) {
  const b = v.brand!;
  const live = b.products.filter((p) => !p.retired);
  if (!live.length) return <div className="text-center py-6"><div className="text-[13px] text-ink2 mb-3">No products on sale.</div><Button size="sm" onClick={() => go('design')}>Design your first piece</Button></div>;
  return <div className="space-y-3">{live.map((p) => <ProductCard key={p.id} v={v} p={p} onMsg={onMsg} />)}</div>;
}

function ProductCard({ v, p, onMsg }: { v: Venture; p: Product; onMsg: (m: Msg) => void }) {
  const fame = useGameStore((s) => (s.player ? blendedFame(s.player) : 0));
  const gameDate = useGameStore((s) => s.gameDate);
  const setPrice = useGameStore((s) => s.brandPrice);
  const seed = useGameStore((s) => s.brandSeed);
  const retire = useGameStore((s) => s.brandRetire);
  const [ordering, setOrdering] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const serial = dateToSerial(gameDate);
  const fair = fairPrice(p.kind, p.material, fame);
  const ratio = p.price / fair;
  const priceTag = ratio < 0.85 ? { t: 'Cheap', c: 'text-rise' } : ratio <= 1.15 ? { t: 'Fair', c: 'text-ink2' } : ratio <= 1.5 ? { t: 'Pricey', c: 'text-amber' } : { t: 'Too dear', c: 'text-fall' };
  const lastWeek = p.weeks[p.weeks.length - 1] ?? 0;
  const incoming = p.incoming.reduce((a, x) => a + x.units, 0);
  const nextArrive = p.incoming.length ? Math.min(...p.incoming.map((x) => x.arrive)) - serial : 0;
  const margin = p.price > 0 ? (p.price - p.unitCost) / p.price : 0;
  const trend = p.trend ? b(v).trends.find((t) => t.id === p.trend) : undefined;
  const status = p.stock === 0 && p.sold === 0 && incoming > 0 ? { t: `Arriving in ${nextArrive}d`, c: 'bg-new/15 text-new' } : p.stock === 0 && incoming === 0 ? { t: p.limited && p.runOrdered ? 'Sold out — gone' : 'Out of stock', c: 'bg-fall/15 text-fall' } : p.stock === 0 ? { t: `Sold out · restock in ${nextArrive}d`, c: 'bg-amber/15 text-amber' } : lastWeek > p.stock ? { t: 'Selling fast', c: 'bg-rise/15 text-rise' } : lastWeek === 0 && serial - p.launched > 14 ? { t: 'Not moving', c: 'bg-white/10 text-ink3' } : null;
  return (
    <div className="rounded-[14px] border border-line bg-sidebar/60 p-3">
      <div className="flex gap-3">
        <ProductArt p={p} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><div className="text-[14px] font-semibold text-ink leading-snug break-words">{p.name}</div>
              <div className="text-[11px] text-ink3 truncate">{KINDS[p.kind].label} · {MATERIALS[p.material].label}{trend ? ` · ${trend.label} ${trend.heat > 0.6 ? '🔥' : ''}` : ''}{p.collab ? ` · with ${p.collab.name}` : ''}</div></div>
            {status && <span className={cn('shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full', status.c)}>{status.t}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-ink3 w-12">Design</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className={cn('h-full', p.design >= 70 ? 'bg-rise' : p.design >= 45 ? 'bg-amber' : 'bg-fall')} style={{ width: `${p.design}%` }} /></div>
            <span className="text-[11px] text-ink num w-6 text-right">{p.design}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
        <div>
          <Label>Price</Label>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <button onClick={() => setPrice(v.id, p.id, p.price - Math.max(1, Math.round(p.price * 0.05)))} className="w-6 h-6 rounded-full border border-line text-ink2 text-[12px]">−</button>
            <span className="text-[14px] font-bold text-ink num">${p.price}</span>
            <button onClick={() => setPrice(v.id, p.id, p.price + Math.max(1, Math.round(p.price * 0.05)))} className="w-6 h-6 rounded-full border border-line text-ink2 text-[12px]">+</button>
          </div>
          <div className={cn('text-[10px]', priceTag.c)}>{priceTag.t} · fair ${fair}</div>
        </div>
        <div><Label>Stock</Label><div className="text-[14px] font-bold text-ink num mt-0.5">{p.stock}</div><div className="text-[10px] text-ink3">{incoming ? `+${incoming} in ${nextArrive}d` : ' '}</div></div>
        <div><Label>Sold / wk</Label><div className="text-[14px] font-bold text-ink num mt-0.5">{lastWeek}</div><div className="text-[10px] text-ink3">{p.sold.toLocaleString()} total</div></div>
        <div><Label>Margin</Label><div className={cn('text-[14px] font-bold num mt-0.5', margin >= 0.5 ? 'text-rise' : margin >= 0.25 ? 'text-ink' : 'text-fall')}>{Math.round(margin * 100)}%</div><div className="text-[10px] text-ink3">${p.unitCost.toFixed(2)} each</div></div>
      </div>
      {p.weeks.length > 2 && <div className="mt-2"><Spark data={p.weeks} w={600} h={28} className="w-full" color="#ffb800" /></div>}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <Button size="sm" disabled={p.limited && p.runOrdered} onClick={() => setOrdering((o) => !o)}>{p.limited && p.runOrdered ? 'One run only' : ordering ? 'Close order' : p.stock || incoming ? 'Restock' : 'Order stock'}</Button>
        <Button size="sm" variant="secondary" disabled={p.stock < 30} onClick={() => onMsg(seed(v.id, p.id))}>🎁 Send to influencers</Button>
        {confirmRetire ? <><Button size="sm" variant="secondary" onClick={() => { onMsg(retire(v.id, p.id)); setConfirmRetire(false); }}>Clear stock · {usd(p.stock * p.price * 0.4)}</Button><Button size="sm" variant="ghost" onClick={() => setConfirmRetire(false)}>Keep</Button></> : <Button size="sm" variant="ghost" onClick={() => setConfirmRetire(true)}>Retire</Button>}
      </div>
      {ordering && <OrderPanel v={v} p={p} onMsg={(m) => { onMsg(m); if (m?.ok) setOrdering(false); }} />}
    </div>
  );
}

const b = (v: Venture) => v.brand!;

function OrderPanel({ v, p, onMsg }: { v: Venture; p: Product; onMsg: (m: Msg) => void }) {
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const order = useGameStore((s) => s.brandOrder);
  const [sup, setSup] = useState<SupplierId>(p.supplier);
  const [units, setUnits] = useState(Math.max(SUPPLIERS[p.supplier].moq, 200));
  const off = dealDiscountOf({ crew }) * 0.5;
  const unit = unitCostFor(p.kind, p.material, sup, units);
  const total = Math.round(unit * units * (1 - off));
  const S = SUPPLIERS[sup];
  return (
    <div className="mt-3 rounded-[12px] border border-line bg-card p-3 space-y-3 rl-fade">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SUPPLIERS) as SupplierId[]).map((id) => {
          const s = SUPPLIERS[id];
          const locked = v.level < s.minLevel;
          return (
            <button key={id} disabled={locked} onClick={() => { setSup(id); setUnits((u) => Math.max(u, s.moq)); }} className={cn('text-left rounded-[10px] border p-2.5 transition disabled:opacity-40', sup === id ? 'border-amber bg-amber/10' : 'border-line hover:bg-white/[0.03]')}>
              <div className="text-[12px] font-semibold text-ink">{s.emoji} {s.label}</div>
              <div className="text-[10px] text-ink3 mt-0.5">{locked ? `Level ${s.minLevel}` : `$${unitCostFor(p.kind, p.material, id, Math.max(units, s.moq)).toFixed(2)}/pc · ${s.days}d · ${(s.defect * 100).toFixed(1)}% faulty`}</div>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-ink3 leading-snug">{S.blurb}</div>
      <Chips options={[50, 100, 200, 300, 500, 1000, 2000, 5000].filter((u) => u >= S.moq).map((u) => ({ id: u, label: `${u.toLocaleString()} pcs` }))} value={units} onChange={setUnits} />
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-ink2">{units.toLocaleString()} × ${unit.toFixed(2)}{off ? ` − ${Math.round(off * 100)}%` : ''}</span>
        <span className="text-ink font-bold num">{usd(total)}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-ink3">
        <span>Sells at ${p.price} → about {usd(units * (p.price - unit))} gross profit</span>
        <span>Arrives in {S.days} days</span>
      </div>
      <Button className="w-full" disabled={total > money} onClick={() => onMsg(order(v.id, p.id, units, sup))}>Place order · {usd(total)}</Button>
    </div>
  );
}

// ─── NEW DESIGN ────────────────────────────────────────────────────────────

function Design({ v, onMsg }: { v: Venture; onMsg: (m: Msg) => void }) {
  const fame = useGameStore((s) => (s.player ? blendedFame(s.player) : 0));
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const energy = useGameStore((s) => s.player?.energy ?? 0);
  const npcs = useGameStore((s) => s.npcs);
  const design = useGameStore((s) => s.brandDesign);
  const [kind, setKind] = useState<ProductKind>('hoodie');
  const [material, setMaterial] = useState<Material>('basic');
  const [trendId, setTrendId] = useState<string | undefined>(undefined);
  const [collab, setCollab] = useState<string | undefined>(undefined);
  const [limited, setLimited] = useState(false);
  const [name, setName] = useState(PRODUCT_NAMES.hoodie[0]);
  const trends = b(v).trends;
  const friends = useMemo(() => npcs.filter((n) => n.role === 'artist' && !isRealId(n.id) && n.relationshipScore >= 25).sort((a, c) => c.fame - a.fame).slice(0, 8), [npcs]);
  const sample = Math.round(400 * MATERIALS[material].cost);
  const collabNpc = collab ? friends.find((f) => f.id === collab) : undefined;
  const fee = collabNpc ? Math.round(collabNpc.fame * 300) : 0;
  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1.5">What are you making?</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(KINDS) as ProductKind[]).map((k) => (
            <button key={k} onClick={() => { setKind(k); setName(PRODUCT_NAMES[k][0]); }} className={cn('rounded-[12px] border py-2 flex flex-col items-center transition', kind === k ? 'border-amber bg-amber/10' : 'border-line hover:bg-white/[0.03]')}>
              <span className="text-[22px]">{KINDS[k].emoji}</span>
              <span className="text-[11px] text-ink mt-0.5">{KINDS[k].label}</span>
              <span className="text-[10px] text-ink3">~${fairPrice(k, material, fame)}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="mb-1.5">Material</Label>
        <Chips options={(Object.keys(MATERIALS) as Material[]).map((m) => ({ id: m, label: `${MATERIALS[m].label} · ${m === 'basic' ? 'cheap' : m === 'premium' ? '×1.9 cost' : '×4.2 cost'}` }))} value={material} onChange={setMaterial} />
      </div>
      <div>
        <Label className="mb-1.5">Ride a trend</Label>
        <div className="space-y-1.5">
          {trends.map((t) => {
            const fits = TREND_POOL.find((x) => x.id === t.id)?.kinds.includes(kind);
            return (
              <button key={t.id} onClick={() => setTrendId(trendId === t.id ? undefined : t.id)} className={cn('w-full flex items-center gap-3 rounded-[10px] border px-3 py-2 text-left transition', trendId === t.id ? 'border-amber bg-amber/10' : 'border-line hover:bg-white/[0.03]', !fits && 'opacity-60')}>
                <span className="text-[13px] text-ink flex-1">{t.label}</span>
                <span className="text-[10px] text-ink3">{fits ? 'fits this piece' : 'better for other pieces'}</span>
                <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-fall" style={{ width: `${Math.round(t.heat * 100)}%` }} /></div>
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-ink3 mt-1">Hot trends sell more — but they cool down. A stylist (especially a trendsetter) makes better designs.</div>
      </div>
      {friends.length > 0 && (
        <div>
          <Label className="mb-1.5">Collab with an artist (optional)</Label>
          <Chips options={[{ id: '', label: 'No collab' }, ...friends.map((f) => ({ id: f.id, label: `${f.name} · $${(f.fame * 300).toLocaleString()}` }))]} value={collab ?? ''} onChange={(id) => setCollab(id || undefined)} />
          {collabNpc && <div className="text-[11px] text-ink3 mt-1">{collabNpc.name.split(' ')[0]}'s fans buy it too. Fee up front, then 25% of sales.</div>}
        </div>
      )}
      <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer">
        <input type="checkbox" className="w-4 h-4 accent-[#ffb800]" checked={limited} onChange={(e) => setLimited(e.target.checked)} />
        Limited run — one production run only, more hype, sells out fast
      </label>
      <div>
        <Label className="mb-1.5">Name</Label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} className="w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[14px] text-ink outline-none focus:border-amber" />
        <Chips className="mt-1.5" options={PRODUCT_NAMES[kind].map((n) => ({ id: n, label: n }))} value={name} onChange={setName} />
      </div>
      <Button className="w-full" disabled={money < sample + fee || energy < 6} onClick={() => onMsg(design(v.id, { kind, material, name, trendId, collabNpcId: collab, limited }))}>Make samples · {usd(sample + fee)} · ⚡6</Button>
    </div>
  );
}

// ─── STOCK ─────────────────────────────────────────────────────────────────

function Stock({ v, onMsg }: { v: Venture; onMsg: (m: Msg) => void }) {
  const gameDate = useGameStore((s) => s.gameDate);
  const crew = useGameStore((s) => s.crew);
  const expand = useGameStore((s) => s.brandWarehouse);
  const br = b(v);
  const serial = dateToSerial(gameDate);
  const stock = br.products.reduce((a, p) => a + p.stock, 0);
  const cost = Math.round(6000 * (br.warehouse / 600) * (1 - dealDiscountOf({ crew })));
  const orders = br.products.flatMap((p) => p.incoming.map((x) => ({ p, x }))).sort((a, c) => a.x.arrive - c.x.arrive);
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between"><Label>Warehouse</Label><span className="text-[12px] text-ink num">{stock.toLocaleString()} / {br.warehouse.toLocaleString()} pieces</span></div>
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden mt-1.5"><div className={cn('h-full', stock > br.warehouse ? 'bg-fall' : 'bg-amber')} style={{ width: `${Math.min(100, (stock / br.warehouse) * 100)}%` }} /></div>
        <div className="flex items-center justify-between mt-2 gap-2">
          <span className="text-[11px] text-ink3">{stock > br.warehouse ? 'Over capacity — overflow storage costs extra every week.' : `Stock on hand cost you ${usd(inventoryValue(br))}.`}</span>
          <Button size="sm" variant="secondary" onClick={() => onMsg(expand(v.id))}>+600 · {usd(cost)}</Button>
        </div>
      </div>
      <div>
        <Label className="mb-1.5">On the way</Label>
        {orders.length === 0 ? <div className="text-[12px] text-ink3">Nothing ordered.</div> : (
          <div className="space-y-1.5">{orders.map(({ p, x }, i) => (
            <div key={`${p.id}-${i}`} className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2">
              <span className="text-[18px]">{SUPPLIERS[x.supplier].emoji}</span>
              <div className="min-w-0 flex-1"><div className="text-[13px] text-ink truncate">{x.units.toLocaleString()} × {p.name}</div><div className="text-[11px] text-ink3">{SUPPLIERS[x.supplier].label} · ${x.unitCost.toFixed(2)} each</div></div>
              <span className="text-[12px] font-semibold text-amber shrink-0">{Math.max(0, x.arrive - serial)}d</span>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

// ─── SALES ─────────────────────────────────────────────────────────────────

function Sales({ v, onMsg }: { v: Venture; onMsg: (m: Msg) => void }) {
  const gameDate = useGameStore((s) => s.gameDate);
  const sale = useGameStore((s) => s.brandSale);
  const br = b(v);
  const serial = dateToSerial(gameDate);
  const w = br.weeks.slice(-12);
  const last = w[w.length - 1];
  const tot = w.reduce((a, x) => ({ rev: a.rev + x.revenue, profit: a.profit + x.profit, units: a.units + x.units, ret: a.ret + x.returns }), { rev: 0, profit: 0, units: 0, ret: 0 });
  const best = [...br.products].sort((a, c) => (c.weeks.slice(-4).reduce((s, x) => s + x, 0)) - (a.weeks.slice(-4).reduce((s, x) => s + x, 0))).slice(0, 3);
  const onSale = br.saleUntil !== undefined && br.saleUntil >= serial;
  const maxRev = Math.max(1, ...w.map((x) => x.revenue));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[12px] bg-sidebar p-2.5"><Label>Last week</Label><div className={cn('text-[16px] font-bold num', (last?.profit ?? 0) >= 0 ? 'text-rise' : 'text-fall')}>{usd(last?.profit ?? 0)}</div><div className="text-[10px] text-ink3">{last?.units ?? 0} sold</div></div>
        <div className="rounded-[12px] bg-sidebar p-2.5"><Label>12 weeks</Label><div className="text-[16px] font-bold text-ink num">{usd(tot.rev)}</div><div className="text-[10px] text-ink3">revenue</div></div>
        <div className="rounded-[12px] bg-sidebar p-2.5"><Label>Profit</Label><div className={cn('text-[16px] font-bold num', tot.profit >= 0 ? 'text-rise' : 'text-fall')}>{usd(tot.profit)}</div><div className="text-[10px] text-ink3">{tot.units.toLocaleString()} pieces</div></div>
      </div>
      {w.length > 0 && (
        <div>
          <Label className="mb-2">Weekly revenue (bars) and profit</Label>
          <div className="flex items-end gap-1 h-24">
            {w.map((x) => (
              <div key={x.serial} className="flex-1 flex flex-col justify-end items-center gap-0.5" title={`${usd(x.revenue)} revenue · ${usd(x.profit)} profit`}>
                <div className={cn('w-full rounded-t-[3px]', x.profit >= 0 ? 'bg-rise/70' : 'bg-fall/70')} style={{ height: `${Math.max(3, (x.revenue / maxRev) * 88)}px` }} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <Label className="mb-1.5">Best sellers (last 4 weeks)</Label>
        {best.map((p) => <div key={p.id} className="flex items-center justify-between text-[12px] py-1"><span className="text-ink truncate">{KINDS[p.kind].emoji} {p.name}</span><span className="text-ink2 num">{p.weeks.slice(-4).reduce((s, x) => s + x, 0)} sold</span></div>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[12px] bg-sidebar p-2.5"><Label>Fakes on the market</Label><div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2"><div className="h-full bg-fall" style={{ width: `${Math.min(100, br.counterfeit)}%` }} /></div><div className="text-[10px] text-ink3 mt-1">{br.counterfeit > 20 ? 'Hurting sales. A lawyer stops new waves.' : 'Under control.'}</div></div>
        <div className="rounded-[12px] bg-sidebar p-2.5"><Label>Returns (12 wks)</Label><div className="text-[16px] font-bold text-ink num mt-0.5">{tot.ret}</div><div className="text-[10px] text-ink3">Cheaper factories, more faults</div></div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line p-3">
        <div className="min-w-0"><div className="text-[13px] font-semibold text-ink">{onSale ? `Sale on — ends in ${br.saleUntil! - serial} days` : 'Run a sale'}</div><div className="text-[11px] text-ink3">30% off for a week: clears stock, but too many sales cheapen the brand.</div></div>
        <Button size="sm" disabled={onSale} onClick={() => onMsg(sale(v.id))}>Start</Button>
      </div>
      {br.log.length > 0 && <div><Label className="mb-1">What happened</Label>{br.log.slice(0, 6).map((l, i) => <div key={i} className="text-[12px] text-ink2 leading-snug py-0.5">• {l}</div>)}</div>}
    </div>
  );
}

// ─── SHOP & TEAM ───────────────────────────────────────────────────────────

function Shop({ v, onMsg }: { v: Venture; onMsg: (m: Msg) => void }) {
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const channel = useGameStore((s) => s.brandChannel);
  const setVenture = useGameStore((s) => s.setVenture);
  const upgrade = useGameStore((s) => s.upgradeVenture);
  const sell = useGameStore((s) => s.sellVenture);
  const close = useGameStore((s) => s.closeVenture);
  const [confirm, setConfirm] = useState<'sell' | 'close' | null>(null);
  const br = b(v);
  const def = VENTURE_BY_TYPE[v.type];
  const next = def.levels[v.level];
  const off = dealDiscountOf({ crew });
  const nextCost = next ? Math.round(next.cost * (1 - off)) : 0;
  const maxStores = v.level >= 5 ? 3 : v.level >= 4 ? 1 : 0;
  const value = ventureValue(v);
  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1.5">Where you sell</Label>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2"><div><div className="text-[13px] text-ink">🛒 Online store</div><div className="text-[11px] text-ink3">Always on</div></div><span className="text-[11px] text-rise font-semibold">ON</span></div>
          <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2"><div><div className="text-[13px] text-ink">⛺ Pop-up shop</div><div className="text-[11px] text-ink3">{v.level < 2 ? 'Level 2' : '+35% reach · $1,800 a week'}</div></div><Button size="sm" variant={br.channels.popup ? 'secondary' : 'primary'} disabled={v.level < 2} onClick={() => onMsg(channel(v.id, { popup: !br.channels.popup }))}>{br.channels.popup ? 'Close' : 'Open'}</Button></div>
          <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2"><div><div className="text-[13px] text-ink">🏬 Stores · {br.channels.stores}/{maxStores}</div><div className="text-[11px] text-ink3">{maxStores ? '+45% reach each · $35k to fit out, $4,200 a week' : 'Level 4'}</div></div><div className="flex gap-1"><Button size="sm" variant="ghost" disabled={br.channels.stores === 0} onClick={() => onMsg(channel(v.id, { stores: br.channels.stores - 1 }))}>−</Button><Button size="sm" disabled={br.channels.stores >= maxStores} onClick={() => onMsg(channel(v.id, { stores: br.channels.stores + 1 }))}>+</Button></div></div>
          <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2"><div><div className="text-[13px] text-ink">🚚 Wholesale</div><div className="text-[11px] text-ink3">{v.level < 5 ? 'Level 5' : 'Other shops stock you · more volume, half margin'}</div></div><Button size="sm" variant={br.channels.wholesale ? 'secondary' : 'primary'} disabled={v.level < 5} onClick={() => onMsg(channel(v.id, { wholesale: !br.channels.wholesale }))}>{br.channels.wholesale ? 'Stop' : 'Start'}</Button></div>
        </div>
      </div>
      <div>
        <Label className="mb-1.5">Staff</Label>
        <Chips options={STAFF_TIERS.map((t, i) => ({ id: i as 0 | 1 | 2, label: t.label }))} value={v.staff} onChange={(staff) => onMsg(setVenture(v.id, { staff }))} />
        <div className="text-[11px] text-ink3 mt-1">{v.staff === 0 ? 'Cheap — slow replies, wrong orders, bad reviews.' : v.staff === 2 ? 'Elite — expensive, but customers notice.' : 'A fair team at a fair wage.'}</div>
      </div>
      <div>
        <div className="flex items-center justify-between"><Label>Marketing a month</Label><span className="text-[13px] font-semibold text-ink num">{usd(v.marketing)}</span></div>
        <div className="flex gap-1.5 mt-1.5">{[-1000, -250, 250, 1000].map((d) => <button key={d} onClick={() => onMsg(setVenture(v.id, { marketing: v.marketing + d }))} className="flex-1 h-8 rounded-[8px] border border-line bg-card text-[12px] font-semibold text-ink2 hover:text-ink">{d > 0 ? '+' : '−'}{usd(Math.abs(d))}</button>)}</div>
      </div>
      {next ? (
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-amber/30 bg-amber/[0.05] p-3">
          <div className="min-w-0"><Label>Grow it · level {v.level + 1}</Label><div className="text-[13px] text-ink">{next.label}</div><div className="text-[11px] text-ink3">Unlocks: {levelPerks(v.level + 1)}</div></div>
          <Button size="sm" disabled={money < nextCost} onClick={() => onMsg(upgrade(v.id))}>{usd(nextCost)}</Button>
        </div>
      ) : <div className="text-[12px] text-ink3">Fully grown: {levelPerks(v.level)}.</div>}
      <div className="flex flex-wrap gap-2 pt-1">
        {confirm === 'sell' ? <><Button size="sm" onClick={() => { onMsg(sell(v.id)); setConfirm(null); }}>Confirm sale · {usd(value)}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></>
          : confirm === 'close' ? <><Button size="sm" variant="secondary" onClick={() => { onMsg(close(v.id)); setConfirm(null); }}>Close it down</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></>
          : <><Button size="sm" variant="secondary" onClick={() => setConfirm('sell')}>Sell the brand · {usd(value)}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm('close')}>Close down</Button></>}
      </div>
    </div>
  );
}

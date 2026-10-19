// ─── DRIP & INK ────────────────────────────────────────────────────────────
// The wardrobe, the shop (drops every other Friday), the tattoo studio and
// the barber — with the character standing next to it all, wearing whatever
// you're trying on.

import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Character, SLOT_CROP } from '../avatar/Character';
import { Button } from '../ui/kit';
import { Card, Chips, Flash, Label } from '../money/shared';
import { cn } from '@/utils/cn';
import { money } from '@/utils/format';
import { dateToSerial } from '../../sim/gameClock';
import {
  dripScore, currentHype, freshness, resaleValue, nextDropIn, tattooQuote, removalQuote, barberQuote, TIER_LABEL,
  type ShopItem, type OwnedItem,
} from '../../sim/drip';
import {
  defaultLook, HAIR_STYLES, HAIR_COLORS, FACIAL_HAIR, TATTOO_SPOTS, TATTOO_LABEL,
  type Look, type Slot, type TattooSpot, type TattooDesign, type HairStyle, type FacialHair, type Wearable,
} from '../../sim/look';

type Tab = 'wardrobe' | 'shop' | 'ink' | 'barber';
type ShopFilter = 'all' | 'new' | 'shoes' | 'clothes' | 'jewellery' | 'limited';

const SLOT_LABEL: Record<Slot, string> = { top: 'Tops', bottom: 'Bottoms', shoes: 'Sneakers & shoes', head: 'Headwear', eyes: 'Eyewear', chain: 'Chains', ears: 'Earrings', wrist: 'Watches', grillz: 'Grillz' };
const JEWEL: Slot[] = ['chain', 'ears', 'wrist', 'grillz'];
const wearable = (x: ShopItem | OwnedItem): Wearable => ({ id: x.id, slot: x.slot, shape: x.shape, name: x.name, c1: x.c1, c2: x.c2, c3: x.c3, text: x.text });

export function StyleScreen() {
  const player = useGameStore((s) => s.player);
  const drip = useGameStore((s) => s.drip);
  const gameDate = useGameStore((s) => s.gameDate);
  const openDrip = useGameStore((s) => s.openDrip);
  const postFit = useGameStore((s) => s.postFit);
  const [tab, setTab] = useState<Tab>('wardrobe');
  const [tryOn, setTryOn] = useState<ShopItem | null>(null);
  const [ink, setInk] = useState<{ spot: TattooSpot; design: TattooDesign | null }>({ spot: 'left_arm', design: null });
  const [cut, setCut] = useState<{ hair: HairStyle; hairColor: string; facialHair: FacialHair } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [caption, setCaption] = useState('');

  useEffect(() => { openDrip(); }, [openDrip]);
  useEffect(() => { setTryOn(null); setCut(null); setInk((i) => ({ ...i, design: null })); }, [tab]);

  const today = dateToSerial(gameDate);
  if (!player) return null;
  const base: Look = player.look ?? defaultLook(player.gender === 'female' ? 'femme' : 'masc');

  // What the character wears in the preview.
  let preview: Look = base;
  if (tab === 'shop' && tryOn) preview = { ...base, outfit: { ...base.outfit, [tryOn.slot]: wearable(tryOn) } };
  if (tab === 'ink') {
    const studioTop: Wearable = base.frame === 'femme' ? { id: 'studio', slot: 'top', shape: 'tank', name: 'Tank', c1: '#2a2d38' } : { id: 'studio', slot: 'top', shape: 'none', name: '', c1: '#000' };
    preview = { ...base, outfit: { ...base.outfit, top: studioTop, chain: undefined }, tattoos: ink.design ? [...base.tattoos.filter((t) => t.spot !== ink.spot), { id: 'preview', spot: ink.spot, design: ink.design, serial: 0 }] : base.tattoos };
  }
  if (tab === 'barber' && cut) preview = { ...base, ...cut };

  const score = dripScore(base.outfit, today, drip, base.tattoos);
  const tryScore = tryOn ? dripScore(preview.outfit, today, drip ? { ...drip, wardrobe: [...drip.wardrobe, { ...tryOn, bought: today, paid: tryOn.price }] } : drip, base.tattoos) : null;

  return (
    <div className="max-w-[1100px] mx-auto pb-12">
      <div className="grid md:grid-cols-[280px_minmax(0,1fr)] gap-5">
        {/* The character */}
        <aside className="md:sticky md:top-4 self-start">
          <Card className="overflow-hidden" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,184,0,0.18), rgba(10,11,16,0) 60%), #14161e' }}>
            <div className="flex md:block items-center gap-3 p-3 md:p-4">
              <div className="w-[120px] h-[230px] md:w-full md:h-[400px] shrink-0">
                <Character look={preview} className="w-full h-full" />
              </div>
              <div className="min-w-0 flex-1 md:mt-3 space-y-2">
                <div>
                  <Label>Drip</Label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-black text-amber num leading-none">{score.score}</span>
                    <span className="text-[13px] font-semibold text-ink">{score.label}</span>
                  </div>
                  {tryScore && tryScore.score !== score.score && <div className={cn('text-[12px] font-semibold', tryScore.score > score.score ? 'text-rise' : 'text-fall')}>{tryScore.score > score.score ? '▲' : '▼'} {tryScore.score} with this on</div>}
                  <div className="h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden"><div className="h-full bg-amber rounded-full" style={{ width: `${score.score}%` }} /></div>
                  <div className="text-[11px] text-ink3 mt-1.5 leading-snug">Fresh, hyped pieces carry your posts further on Snapgram and Clip, and people notice.</div>
                </div>
                {tab !== 'ink' && tab !== 'barber' && (
                  <div className="space-y-1.5">
                    <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" className="w-full h-9 rounded-[10px] bg-black/30 border border-line px-3 text-[12px] text-ink placeholder:text-ink3 focus:outline-none focus:border-amber" />
                    <Button size="sm" className="w-full" onClick={() => { const r = postFit(caption); setMsg(r); if (r.ok) setCaption(''); }}>📸 Post a fit pic</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </aside>

        <div className="space-y-4 min-w-0">
          <div>
            <h1 className="text-[26px] font-black text-ink">Drip & Ink</h1>
            <div className="text-[13px] text-ink2">{drip ? `Next drop ${nextDropIn(drip, today) === 0 ? 'today' : `in ${nextDropIn(drip, today)} day${nextDropIn(drip, today) === 1 ? '' : 's'}`} · ` : ''}Cash {money(player.career.money)}</div>
          </div>
          <Chips options={[{ id: 'wardrobe' as Tab, label: '👕 Wardrobe' }, { id: 'shop' as Tab, label: '🛍️ Shop' }, { id: 'ink' as Tab, label: '🖋️ Tattoo studio' }, { id: 'barber' as Tab, label: '💈 Barber' }]} value={tab} onChange={setTab} />
          <Flash msg={msg} onClose={() => setMsg(null)} />
          {tab === 'wardrobe' && <Wardrobe look={base} today={today} onMsg={setMsg} />}
          {tab === 'shop' && <Shop look={base} today={today} tryOn={tryOn} setTryOn={setTryOn} onMsg={setMsg} />}
          {tab === 'ink' && <Studio look={base} ink={ink} setInk={setInk} onMsg={setMsg} />}
          {tab === 'barber' && <Barber look={base} cut={cut} setCut={setCut} onMsg={setMsg} />}
        </div>
      </div>
    </div>
  );
}

function Thumb({ look, item, size = 64 }: { look: Look; item: Wearable; size?: number }) {
  const l = useMemo(() => ({ ...look, outfit: { ...look.outfit, [item.slot]: item } }), [look, item]);
  return (
    <div className="rounded-[12px] bg-black/30 border border-line overflow-hidden shrink-0" style={{ width: size, height: size }}>
      <Character look={l} crop={SLOT_CROP[item.slot]} className="w-full h-full" />
    </div>
  );
}

function Swatch({ c1, c2 }: { c1: string; c2?: string }) {
  return <span className="inline-flex rounded-full overflow-hidden border border-white/20 w-6 h-3 shrink-0"><span className="flex-1" style={{ background: c1 }} /><span className="flex-1" style={{ background: c2 ?? c1 }} /></span>;
}

// ─── WARDROBE ──────────────────────────────────────────────────────────────

function Wardrobe({ look, today, onMsg }: { look: Look; today: number; onMsg: (m: { ok: boolean; message: string }) => void }) {
  const drip = useGameStore((s) => s.drip);
  const equip = useGameStore((s) => s.equipDrip);
  const sell = useGameStore((s) => s.sellDrip);
  const [confirm, setConfirm] = useState<string | null>(null);
  const items = drip?.wardrobe ?? [];
  const slots = (Object.keys(SLOT_LABEL) as Slot[]).filter((sl) => items.some((x) => x.slot === sl));
  if (!items.length) return <Card className="p-6 text-center text-[13px] text-ink3">Nothing here yet. The shop has new drops every other Friday.</Card>;
  return (
    <div className="space-y-4">
      {slots.map((sl) => (
        <section key={sl}>
          <div className="text-[13px] font-bold text-ink mb-2">{SLOT_LABEL[sl]}</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {items.filter((x) => x.slot === sl).map((x) => {
              const worn = look.outfit[sl]?.id === x.id;
              const value = resaleValue(x, today, drip?.lines ?? {});
              const required = sl === 'top' || sl === 'bottom' || sl === 'shoes';
              return (
                <Card key={x.id} className={cn('p-2.5 flex gap-3 items-center', worn && 'border-amber/50')}>
                  <Thumb look={look} item={wearable(x)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink truncate">{x.name}</div>
                    <div className="text-[11px] text-ink3 truncate flex items-center gap-1.5"><Swatch c1={x.c1} c2={x.c2} />{x.colorway ?? x.brand} · {TIER_LABEL[x.tier]}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {worn ? (
                        required ? <span className="text-[11px] font-bold text-amber">Wearing</span> : <Button size="sm" variant="secondary" onClick={() => onMsg(equip(sl, null))}>Take off</Button>
                      ) : <Button size="sm" onClick={() => onMsg(equip(sl, x.id))}>Wear</Button>}
                      {x.paid > 0 && (confirm === x.id
                        ? <><Button size="sm" variant="secondary" onClick={() => { onMsg(sell(x.id)); setConfirm(null); }}>Sell {money(value)}</Button><button className="text-[11px] text-ink3" onClick={() => setConfirm(null)}>Keep</button></>
                        : <button className="text-[11px] text-ink3 hover:text-ink ml-1" onClick={() => setConfirm(x.id)}>Resell</button>)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── SHOP ──────────────────────────────────────────────────────────────────

function Shop({ look, today, tryOn, setTryOn, onMsg }: { look: Look; today: number; tryOn: ShopItem | null; setTryOn: (x: ShopItem | null) => void; onMsg: (m: { ok: boolean; message: string }) => void }) {
  const drip = useGameStore((s) => s.drip);
  const cash = useGameStore((s) => s.player?.career.money ?? 0);
  const buy = useGameStore((s) => s.buyDrip);
  const [filter, setFilter] = useState<ShopFilter>('new');
  const owned = new Set((drip?.wardrobe ?? []).map((x) => x.id));
  const lines = drip?.lines ?? {};
  const list = (drip?.shop ?? []).filter((x) => {
    if (filter === 'new') return today - x.released <= 14;
    if (filter === 'shoes') return x.slot === 'shoes';
    if (filter === 'clothes') return !JEWEL.includes(x.slot) && x.slot !== 'shoes';
    if (filter === 'jewellery') return JEWEL.includes(x.slot);
    if (filter === 'limited') return !!x.limited;
    return true;
  }).sort((a, b) => b.released - a.released || b.hype - a.hype);
  return (
    <div className="space-y-3">
      <Chips options={[{ id: 'new' as ShopFilter, label: '🔥 New this drop' }, { id: 'all' as ShopFilter, label: 'All' }, { id: 'shoes' as ShopFilter, label: '👟 Sneakers' }, { id: 'clothes' as ShopFilter, label: '🧥 Clothes' }, { id: 'jewellery' as ShopFilter, label: '💎 Jewellery' }, { id: 'limited' as ShopFilter, label: '⏳ Limited' }]} value={filter} onChange={setFilter} />
      {list.length === 0 && <Card className="p-6 text-center text-[13px] text-ink3">Nothing in this rail right now.</Card>}
      <div className="grid sm:grid-cols-2 gap-2.5">
        {list.map((x) => {
          const isNew = today - x.released <= 7;
          const latest = x.line && x.version ? (lines[x.line] ?? x.version) : undefined;
          const behind = latest && x.version ? latest - x.version : 0;
          const soldOut = x.limited && (x.stock ?? 0) <= 0;
          const hype = currentHype(x, today, lines);
          const fresh = freshness(x, today, lines);
          const trying = tryOn?.id === x.id;
          return (
            <Card key={x.id} className={cn('p-3', trying && 'border-amber/60')}>
              <div className="flex gap-3">
                <button onClick={() => setTryOn(trying ? null : x)} title="Try it on"><Thumb look={look} item={wearable(x)} size={76} /></button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {isNew && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rise/15 text-rise">New</span>}
                    {x.limited && <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded', soldOut ? 'bg-white/10 text-ink3' : 'bg-fall/15 text-fall')}>{soldOut ? 'Sold out' : `Limited · ${x.stock} left`}</span>}
                    {x.collab && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-new/15 text-new">Collab</span>}
                    {behind > 0 && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-ink3">{behind === 1 ? 'Last version' : `${behind} versions old`}</span>}
                    {x.classic && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber/15 text-amber">Classic</span>}
                  </div>
                  <div className="text-[13px] font-semibold text-ink leading-tight">{x.name}</div>
                  <div className="text-[11px] text-ink3 truncate flex items-center gap-1.5 mt-0.5"><Swatch c1={x.c1} c2={x.c2} />{x.colorway} · {x.brand} · {TIER_LABEL[x.tier]}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 rounded-full bg-white/10 flex-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${hype}%`, background: fresh > 0.7 ? '#ff7a3d' : fresh > 0.45 ? '#ffb800' : '#8a8f9c' }} /></div>
                    <span className="text-[10px] text-ink3 num shrink-0">hype {hype}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-[15px] font-bold text-ink num">{money(x.price)}</span>
                <div className="ml-auto flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setTryOn(trying ? null : x)}>{trying ? 'Take off' : 'Try on'}</Button>
                  {owned.has(x.id) ? <span className="text-[12px] text-rise font-semibold self-center px-2">Owned</span> : <Button size="sm" disabled={soldOut || cash < x.price} onClick={() => { const r = buy(x.id); onMsg(r); if (r.ok) setTryOn(null); }}>{soldOut ? 'Gone' : 'Cop'}</Button>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── TATTOO STUDIO ─────────────────────────────────────────────────────────

function Studio({ look, ink, setInk, onMsg }: { look: Look; ink: { spot: TattooSpot; design: TattooDesign | null }; setInk: (v: { spot: TattooSpot; design: TattooDesign | null }) => void; onMsg: (m: { ok: boolean; message: string }) => void }) {
  const get = useGameStore((s) => s.getTattoo);
  const remove = useGameStore((s) => s.removeTattoo);
  const cash = useGameStore((s) => s.player?.career.money ?? 0);
  const energy = useGameStore((s) => s.player?.energy ?? 0);
  const [sure, setSure] = useState(false);
  const spot = TATTOO_SPOTS.find((x) => x.id === ink.spot)!;
  const existing = look.tattoos.find((t) => t.spot === ink.spot);
  const q = ink.design ? tattooQuote(ink.spot, ink.design) : null;
  const price = q ? Math.round(q.price * (existing ? 1.3 : 1)) : 0;
  return (
    <div className="space-y-3">
      <Card className="p-3.5 text-[12px] text-ink2 leading-snug">Ink is permanent. Covering up an old piece costs extra; laser removal costs three times the original and hurts. Sessions take real hours on the clock and some energy.</Card>
      <div>
        <Label>Where</Label>
        <Chips className="mt-1.5" options={TATTOO_SPOTS.map((s) => ({ id: s.id, label: `${s.label}${look.tattoos.some((t) => t.spot === s.id) ? ' •' : ''}` }))} value={ink.spot} onChange={(v) => { setInk({ spot: v, design: null }); setSure(false); }} />
      </div>
      <div>
        <Label>Design</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
          {spot.designs.map((d) => {
            const qq = tattooQuote(ink.spot, d);
            return (
              <button key={d} onClick={() => { setInk({ spot: ink.spot, design: d }); setSure(false); }} className={cn('rounded-[12px] border px-3 py-2.5 text-left transition', ink.design === d ? 'border-amber bg-amber/10' : 'border-line bg-card hover:border-white/20')}>
                <div className="text-[13px] font-semibold text-ink">{TATTOO_LABEL[d]}</div>
                <div className="text-[11px] text-ink3">{money(Math.round(qq.price * (existing ? 1.3 : 1)))} · {qq.hours}h</div>
              </button>
            );
          })}
        </div>
      </div>
      {q && (
        <Card className="p-3.5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink">{TATTOO_LABEL[ink.design!]} on your {spot.label.toLowerCase()}{existing ? ` (covers your ${TATTOO_LABEL[existing.design].toLowerCase()})` : ''}</div>
            <div className="text-[11px] text-ink3">{money(price)} · {q.hours} hour{q.hours > 1 ? 's' : ''} in the chair · ⚡{Math.min(24, q.hours * 4)}</div>
          </div>
          {sure ? (
            <div className="flex gap-1.5">
              <Button size="sm" disabled={cash < price || energy < Math.min(24, q.hours * 4)} onClick={() => { onMsg(get(ink.spot, ink.design!)); setInk({ spot: ink.spot, design: null }); setSure(false); }}>Do it</Button>
              <Button size="sm" variant="ghost" onClick={() => setSure(false)}>Not yet</Button>
            </div>
          ) : <Button size="sm" disabled={cash < price} onClick={() => setSure(true)}>Book it</Button>}
        </Card>
      )}
      {look.tattoos.length > 0 && (
        <div>
          <Label>Your ink</Label>
          <div className="mt-1.5 space-y-1.5">
            {look.tattoos.map((t) => {
              const rq = removalQuote(t);
              return (
                <Card key={t.id} className="px-3.5 py-2.5 flex items-center gap-3">
                  <span className="text-[13px] text-ink flex-1">{TATTOO_LABEL[t.design]} · <span className="text-ink3">{TATTOO_SPOTS.find((s) => s.id === t.spot)?.label}</span></span>
                  <button className="text-[11px] text-ink3 hover:text-fall" disabled={cash < rq.price} onClick={() => onMsg(remove(t.id))}>Laser off · {money(rq.price)}</button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BARBER ────────────────────────────────────────────────────────────────

function Barber({ look, cut, setCut, onMsg }: { look: Look; cut: { hair: HairStyle; hairColor: string; facialHair: FacialHair } | null; setCut: (c: { hair: HairStyle; hairColor: string; facialHair: FacialHair } | null) => void; onMsg: (m: { ok: boolean; message: string }) => void }) {
  const visit = useGameStore((s) => s.visitBarber);
  const cash = useGameStore((s) => s.player?.career.money ?? 0);
  const cur = { hair: look.hair, hairColor: look.hairColor, facialHair: look.facialHair };
  const next = cut ?? cur;
  const q = barberQuote(cur, next);
  const set = (patch: Partial<typeof next>) => setCut({ ...next, ...patch });
  return (
    <div className="space-y-3">
      <div>
        <Label>Style</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-1.5">
          {HAIR_STYLES.map((h) => (
            <button key={h.id} onClick={() => set({ hair: h.id })} className={cn('rounded-[12px] border overflow-hidden transition', next.hair === h.id ? 'border-amber bg-amber/10' : 'border-line bg-card hover:border-white/20')}>
              <div className="h-[64px]"><Character look={{ ...look, hair: h.id, hairColor: next.hairColor, outfit: { ...look.outfit, head: undefined, eyes: undefined } }} view="bust" className="w-full h-full" /></div>
              <div className="text-[11px] text-ink2 py-1 truncate px-1">{h.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {HAIR_COLORS.map((c) => <button key={c.id} title={c.label} onClick={() => set({ hairColor: c.hex })} className={cn('w-9 h-9 rounded-full border-2 transition', next.hairColor === c.hex ? 'border-amber scale-110' : 'border-white/15')} style={{ background: c.hex }} />)}
        </div>
      </div>
      <div>
        <Label>Facial hair</Label>
        <Chips className="mt-1.5" options={FACIAL_HAIR.map((f) => ({ id: f.id, label: f.label }))} value={next.facialHair} onChange={(v) => set({ facialHair: v })} />
      </div>
      <Card className="p-3.5 flex items-center gap-3">
        <div className="flex-1 text-[13px] text-ink2">{q.price ? <>That's <b className="text-ink">{money(q.price)}</b>{q.hours > 1 ? ` and ${q.hours} hours in the chair` : ''}.</> : 'Pick something new.'}</div>
        {cut && <Button size="sm" variant="ghost" onClick={() => setCut(null)}>Reset</Button>}
        <Button size="sm" disabled={!q.price || cash < q.price} onClick={() => { const r = visit(next); onMsg(r); if (r.ok) setCut(null); }}>Book the chair</Button>
      </Card>
    </div>
  );
}

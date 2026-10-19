import { useMemo, useState } from 'react';
import { useGameStore, blendedFame } from '../../store/gameStore';
import type { ShowType } from '../../types/game';
import {
  SHOW_CITIES,
  venuesInCity,
  venueLockReason,
  accessTier,
  TIER_LABEL,
  VENUE_CLASSES,
  perceivedTicketPrice,
} from '../../sim/shows';
import { diary as roomDiary } from '../../sim/booking';
import { MIN_LEAD_DAYS, MAX_OPEN_SHOWS } from '../../sim/ticketing';
import { dateToSerial, serialToDate, formatMedium } from '../../sim/gameClock';
import { TourPlanner, ToursPanel } from './TourPlanner';
import { UpcomingShows } from './UpcomingShows';
import { OffersPanel } from './OffersPanel';

// ─── WHAT A SLOT IS ────────────────────────────────────────────────────────
//
// The slot is the occasion; the room is where it happens. Both are gated, and
// the gate is printed rather than hidden behind a dead button — the old screen
// showed a disabled card with a `Fame 60+` chip and no explanation of what that
// meant for the room you could actually get.

const SHOW_TYPES: { id: ShowType; label: string; emoji: string; blurb: string }[] = [
  { id: 'local_club', label: 'Your own show', emoji: '🎤', blurb: 'You book the room and keep the door.' },
  { id: 'university', label: 'University event', emoji: '🎓', blurb: 'Student unions pay a flat fee and bring a crowd.' },
  { id: 'festival', label: 'Festival slot', emoji: '🎪', blurb: 'A slot somebody gives you. Needs a promoter.' },
  { id: 'international_tour', label: 'International date', emoji: '✈️', blurb: 'Another country. Needs a tour manager and a national draw.' },
];

export function ShowsScreen() {
  const player = useGameStore((st) => st.player);
  const shows = useGameStore((st) => st.shows);
  const scheduledShows = useGameStore((st) => st.scheduledShows);
  const showOffers = useGameStore((st) => st.showOffers);
  const planShowAt = useGameStore((st) => st.planShowAt);
  const scheduleShow = useGameStore((st) => st.scheduleShow);
  const gameDate = useGameStore((st) => st.gameDate);
  const openOffers = showOffers.filter((o) => o.status === 'open').length;

  const [country, setCountry] = useState(player?.country ?? 'Ghana');
  const [city, setCity] = useState(player?.city ?? 'Accra');
  const [venueId, setVenueId] = useState<string | null>(null);
  const [showType, setShowType] = useState<ShowType>('local_club');
  // Open on the room's FAIR price, not an arbitrary $20 — see the plan card.
  const [price, setPrice] = useState(() => (player ? perceivedTicketPrice(blendedFame(player)) : 20));
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  /** Plan one night, watch what is on sale, or run a tour. */
  const [mode, setMode] = useState<'plan' | 'upcoming' | 'offers' | 'tour'>('plan');
  /** The night the player wants to announce. Null means the earliest open one. */
  const [pickedSerial, setPickedSerial] = useState<number | null>(null);

  const countries = useMemo(
    () => Array.from(new Set(SHOW_CITIES.map((c) => c.country))),
    [],
  );
  const cities = useMemo(
    () => SHOW_CITIES.filter((c) => c.country === country).map((c) => c.city),
    [country],
  );
  const venues = useMemo(() => venuesInCity(city, country), [city, country]);

  if (!player) return null;

  // Default to the biggest room the artist can actually get.
  const tier = accessTier(blendedFame(player));
  const openable = venues.filter((v) => !venueLockReason(v, blendedFame(player)));
  const venue = venues.find((v) => v.id === venueId)
    ?? openable[openable.length - 1]
    ?? venues[0];

  const fair = perceivedTicketPrice(blendedFame(player));
  const maxPrice = Math.max(40, Math.round(fair * 3 / 5) * 5);

  const preview = planShowAt(venue.id, price);
  const plan = preview.ok ? preview.plan : undefined;

  // ── The diary ────────────────────────────────────────────────────────────
  // Starts at the earliest night the room can be sold for. A stadium needs
  // seven weeks of on-sale; a club needs three days. The nights before that
  // are not shown because they cannot be booked.
  const todaySerial = dateToSerial(gameDate);
  const lead = MIN_LEAD_DAYS[venue.cls];
  const firstSerial = todaySerial + lead;
  const diary = useMemo(() => roomDiary(venue, firstSerial, 49), [venue, firstSerial]);
  const gap = VENUE_CLASSES[venue.cls].cooldownDays;
  const ownDates = scheduledShows.filter((x) => x.city === venue.city).map((x) => x.serial);

  /** Why a night cannot be picked, or null when it can. */
  const blockedBecause = (serial: number, status: 'free' | 'taken'): string | null => {
    if (status === 'taken') return 'Somebody else has the room';
    if (scheduledShows.some((x) => x.serial === serial)) return 'You already play that night';
    if (ownDates.some((o) => Math.abs(o - serial) < gap)) return `Within ${gap} days of another ${venue.city} date`;
    return null;
  };
  const firstOpen = diary.find((n) => !blockedBecause(n.serial, n.status))?.serial ?? null;
  const chosen = pickedSerial !== null && pickedSerial >= firstSerial ? pickedSerial : firstOpen;
  const chosenDay = chosen !== null ? diary.find((n) => n.serial === chosen) : undefined;
  const chosenBlock = chosenDay ? blockedBecause(chosenDay.serial, chosenDay.status) : 'No open night in the next seven weeks';

  function handleAnnounce() {
    if (chosen === null) return;
    const res = scheduleShow(venue.id, showType, price, chosen);
    setNotice({ ok: res.ok, message: res.message });
    if (res.ok) setMode('upcoming');
  }

  const history = [...shows].reverse().slice(0, 12);

  const played = shows.length;
  const best = shows.reduce((m, x) => Math.max(m, x.attendance ?? 0), 0);
  const earned = shows.reduce((a, x) => a + (x.moneyEarned ?? 0), 0);
  const next = [...scheduledShows].sort((a, b) => a.serial - b.serial)[0];
  const select = 'w-full h-11 rounded-[12px] bg-sidebar border border-line px-3 text-[14px] text-ink outline-none focus:border-amber';

  return (
    <div className="max-w-[1100px] mx-auto space-y-4 pb-24 lg:pb-10">
      <section className="rounded-[22px] border border-line overflow-hidden p-5" style={{ background: 'radial-gradient(120% 140% at 100% 0%, rgba(181,123,255,0.25), rgba(10,11,16,0) 55%), radial-gradient(90% 120% at 0% 100%, rgba(255,184,0,0.12), rgba(10,11,16,0) 60%), #14161e' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-re">Live</div>
            <h1 className="text-[26px] sm:text-[30px] font-black text-ink leading-tight">Shows & tours</h1>
            <p className="text-[13px] text-ink2 mt-0.5">You're a <span className="text-amber font-semibold">{TIER_LABEL[tier].toLowerCase()}</span>. Book a room, price the ticket, live with the door.</p>
          </div>
          {next && <div className="rounded-[14px] bg-black/30 border border-white/10 px-3.5 py-2.5 text-right"><div className="text-[10px] uppercase tracking-wider text-ink3">Next show</div><div className="text-[14px] font-semibold text-ink">{next.city}</div><div className="text-[11px] text-ink3">{formatMedium(serialToDate(next.serial))} · {next.ticketsSold.toLocaleString()}/{next.capacity.toLocaleString()} sold</div></div>}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-[12px] bg-black/25 p-2.5"><div className="text-[10px] uppercase tracking-wider text-ink3">Played</div><div className="text-[18px] font-bold text-ink num">{played}</div></div>
          <div className="rounded-[12px] bg-black/25 p-2.5"><div className="text-[10px] uppercase tracking-wider text-ink3">Biggest crowd</div><div className="text-[18px] font-bold text-ink num">{best.toLocaleString()}</div></div>
          <div className="rounded-[12px] bg-black/25 p-2.5"><div className="text-[10px] uppercase tracking-wider text-ink3">Earned</div><div className={`text-[18px] font-bold num ${earned >= 0 ? 'text-rise' : 'text-fall'}`}>{earned >= 0 ? '' : '−'}${Math.abs(earned).toLocaleString()}</div></div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {([
          ['plan', '🎤 Plan a show'],
          ['upcoming', `🎟️ Upcoming${scheduledShows.length ? ` · ${scheduledShows.length}` : ''}`],
          ['offers', `📨 Offers${openOffers ? ` · ${openOffers}` : ''}`],
          ['tour', '🚌 Tour'],
        ] as const).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} className={`shrink-0 h-9 px-3.5 rounded-full border text-[13px] font-semibold transition ${mode === m ? 'border-amber bg-amber text-black' : 'border-line bg-card text-ink2 hover:text-ink'}`}>{label}</button>
        ))}
      </div>

      {mode === 'upcoming' ? (
        <UpcomingShows onPlan={() => setMode('plan')} />
      ) : mode === 'offers' ? (
        <OffersPanel />
      ) : mode === 'tour' ? (
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4"><div className="min-w-0"><TourPlanner /></div><div className="min-w-0"><ToursPanel /></div></div>
      ) : (
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Step n={1} title="Where">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-ink3 mb-1 uppercase tracking-wider">Country</label>
                <select className={select} value={country} onChange={(e) => { setCountry(e.target.value); const first = SHOW_CITIES.find((c) => c.country === e.target.value); if (first) setCity(first.city); setVenueId(null); }}>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-ink3 mb-1 uppercase tracking-wider">City</label>
                <select className={select} value={city} onChange={(e) => { setCity(e.target.value); setVenueId(null); }}>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </Step>

          <Step n={2} title="The room">
            <div className="grid sm:grid-cols-2 gap-2">
              {venues.map((v) => {
                const lock = venueLockReason(v, blendedFame(player));
                const selected = v.id === venue.id;
                return (
                  <button key={v.id} onClick={() => !lock && setVenueId(v.id)} disabled={!!lock}
                    className={`text-left rounded-[14px] border p-3 transition ${selected ? 'border-amber bg-amber/10' : lock ? 'border-line opacity-50 cursor-not-allowed' : 'border-line bg-sidebar hover:bg-cardhover'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[22px]">{VENUE_CLASSES[v.cls].emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-ink truncate">{v.name}</div>
                        <div className="text-[11px] text-ink3">{VENUE_CLASSES[v.cls].label} · {v.capacity.toLocaleString()} cap</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px]">
                      <span className="text-ink2">${v.hireCost.toLocaleString()} to open</span>
                      <span className="text-ink3">{VENUE_CLASSES[v.cls].cooldownDays}d gap</span>
                    </div>
                    {lock && <div className="text-[11px] text-fall mt-1">🔒 {lock}</div>}
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={3} title="The night" hint={`a ${VENUE_CLASSES[venue.cls].label.toLowerCase()} needs ${lead} days to sell`}>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {diary.map((n) => {
                const why = blockedBecause(n.serial, n.status);
                const picked = chosen === n.serial;
                const d = serialToDate(n.serial);
                const dow = new Date(n.serial * 86400000).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
                return (
                  <button key={n.serial} disabled={!!why} onClick={() => { setPickedSerial(n.serial); setNotice(null); }} title={why ?? 'Free'}
                    className={`shrink-0 w-[60px] py-2 rounded-[12px] border text-center transition ${picked ? 'border-amber bg-amber text-black' : !why ? 'border-line bg-sidebar hover:border-amber/50' : 'border-line opacity-35 cursor-not-allowed'}`}>
                    <div className={`text-[10px] uppercase ${picked ? 'text-black/70' : 'text-ink3'}`}>{dow}</div>
                    <div className={`text-[18px] font-bold leading-tight num ${picked ? 'text-black' : 'text-ink'}`}>{d.day}</div>
                    <div className={`text-[9px] font-bold ${picked ? 'text-black/70' : !why ? 'text-rise' : 'text-fall'}`}>{!why ? 'free' : n.status === 'taken' ? 'taken' : 'close'}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-ink3 mt-1.5 leading-relaxed">
              {chosen !== null && !chosenBlock
                ? `Tickets go on sale today and sell until ${formatMedium(serialToDate(chosen))}. The show plays on the clock — you'll get updates on the way.`
                : chosenBlock}
            </p>
          </Step>

          <Step n={4} title="The occasion">
            <div className="grid grid-cols-2 gap-2">
              {SHOW_TYPES.map((t) => (
                <button key={t.id} onClick={() => setShowType(t.id)} className={`text-left rounded-[14px] border p-3 transition ${showType === t.id ? 'border-amber bg-amber/10' : 'border-line bg-sidebar hover:bg-cardhover'}`}>
                  <div className="text-[20px]">{t.emoji}</div>
                  <div className="text-[13px] font-semibold text-ink mt-0.5">{t.label}</div>
                  <div className="text-[11px] text-ink3 mt-0.5 leading-snug">{t.blurb}</div>
                </button>
              ))}
            </div>
          </Step>

          <Step n={5} title="Ticket price">
            <div className="flex items-end justify-between">
              <div className="text-[30px] font-black text-ink num leading-none">${price}</div>
              <div className="text-[12px] text-ink3">fans expect about <span className="text-ink2 font-semibold">${fair}</span></div>
            </div>
            <input type="range" min={5} max={maxPrice} step={5} value={Math.min(price, maxPrice)} onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-[#ffb800] mt-3" />
            <p className="text-[12px] text-ink3 mt-1">Too high and the room stays empty. That's the whole trade.</p>
          </Step>
        </div>

        <div className="space-y-4 min-w-0 lg:sticky lg:top-4">
          {plan ? (
            <section className="rounded-[18px] border border-line bg-card p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-2">The estimate</div>
              <div className="rounded-[14px] bg-sidebar p-3 mb-3">
                <div className="text-[11px] text-ink3">Expected crowd</div>
                <div className="text-[22px] font-black text-ink num">{plan.tickets.low.toLocaleString()}<span className="text-ink3 font-normal"> – </span>{plan.tickets.high.toLocaleString()}</div>
                <div className="text-[11px] text-ink3">most likely {plan.tickets.likely.toLocaleString()} of {venue.capacity.toLocaleString()} ({Math.round(plan.fill * 100)}% full)</div>
                <div className="h-2 bg-white/[0.07] rounded-full mt-2 overflow-hidden"><div className={`h-full rounded-full ${plan.fill >= 0.85 ? 'bg-rise' : plan.fill >= 0.5 ? 'bg-amber' : 'bg-fall'}`} style={{ width: `${Math.min(100, plan.fill * 100)}%` }} /></div>
              </div>
              <div className="space-y-1.5 text-[12px]">
                <Row label="Door (most likely)" value={`$${plan.gross.likely.toLocaleString()}`} />
                <Row label="Merchandise" value={`$${plan.merch.toLocaleString()}`} />
                <div className="border-t border-line pt-1.5 mt-1.5 space-y-1">
                  {plan.costs.map((c) => <Row key={c.key} label={c.label} value={`−$${c.amount.toLocaleString()}`} muted />)}
                  <Row label="Total costs" value={`−$${plan.totalCosts.toLocaleString()}`} bold />
                </div>
                <div className="border-t border-line pt-2 mt-1.5 flex justify-between items-baseline">
                  <span className="text-ink2">Net</span>
                  <span className={`font-black text-[16px] num ${plan.net.likely >= 0 ? 'text-rise' : 'text-fall'}`}>${plan.net.likely.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-ink3 text-right">range {plan.net.low.toLocaleString()} … {plan.net.high.toLocaleString()}</div>
              </div>
              <details className="text-[12px] mt-2">
                <summary className="text-ink3 cursor-pointer hover:text-ink2">Why these numbers</summary>
                <div className="mt-2 space-y-1">{plan.drivers.map((d) => <Row key={d.label} label={d.label} value={d.value} muted />)}</div>
              </details>
              {plan.warnings.length > 0 && <div className="mt-3 space-y-1.5">{plan.warnings.map((w) => <p key={w} className="text-[12px] text-amber bg-amber/10 border border-amber/20 rounded-[10px] p-2">⚠️ {w}</p>)}</div>}
            </section>
          ) : (
            <section className="rounded-[18px] border border-fall/30 bg-fall/10 p-4 text-[13px] text-fall">{preview.message}</section>
          )}

          {notice && <div className={`text-[13px] rounded-[12px] p-3 border ${notice.ok ? 'bg-rise/10 border-rise/30 text-ink' : 'bg-fall/10 border-fall/30 text-ink'}`}>{notice.message}</div>}

          <div className="fixed lg:static left-0 right-0 bottom-0 z-30 p-3 lg:p-0 bg-bg/95 lg:bg-transparent backdrop-blur lg:backdrop-blur-none border-t border-line lg:border-0 md:left-56 lg:left-auto">
            <div className="flex items-center gap-3">
              <div className="text-[11px] text-ink3 flex-1 min-w-0 truncate">
                {scheduledShows.length >= MAX_OPEN_SHOWS ? `${MAX_OPEN_SHOWS} shows on sale — the limit.` : plan ? `Deposit $${(Math.round((venue.hireCost * 0.25) / 10) * 10).toLocaleString()} · ${venue.name}` : ''}
              </div>
              <button onClick={handleAnnounce} disabled={!plan || chosen === null || !!chosenBlock || scheduledShows.length >= MAX_OPEN_SHOWS} className="h-11 px-5 rounded-[12px] bg-amber text-black font-bold text-[14px] disabled:opacity-40 shrink-0">🎟️ Announce</button>
            </div>
          </div>

          <section className="rounded-[18px] border border-line bg-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-2">Recent shows</div>
            {history.length === 0 ? <p className="text-[12px] text-ink3">You haven't played a show yet.</p> : (
              <div className="space-y-2">
                {history.map((s) => (
                  <div key={s.id} className="rounded-[12px] bg-sidebar p-2.5 text-[12px]">
                    <div className="flex justify-between items-baseline gap-2"><span className="text-ink font-medium truncate">{s.venueName ?? s.city}</span><span className={s.moneyEarned >= 0 ? 'text-rise font-bold num' : 'text-fall font-bold num'}>{s.moneyEarned >= 0 ? '+' : '−'}${Math.abs(s.moneyEarned).toLocaleString()}</span></div>
                    <div className="text-ink3 mt-0.5">{s.attendance.toLocaleString()}/{s.capacity.toLocaleString()} · ${s.ticketPrice}/ticket · {s.date}</div>
                    {s.performanceQuality !== undefined && <div className="text-ink3">reviewed {s.performanceQuality}/100 · +{s.fameGained} fame</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      )}
    </div>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-line bg-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-6 h-6 rounded-full bg-amber/15 text-amber text-[12px] font-bold flex items-center justify-center shrink-0">{n}</span>
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        {hint && <span className="text-[11px] text-ink3 truncate">— {hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={muted ? 'text-ink3' : 'text-ink2'}>{label}</span>
      <span className={`num ${bold ? 'text-ink font-bold' : muted ? 'text-ink2' : 'text-ink'}`}>{value}</span>
    </div>
  );
}

/** The same blend the store uses, kept local so the screen can gate without a round trip. */

import { useMemo, useState } from 'react';
import { useGameStore, blendedFame } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import type { ShowType, VenueClass } from '../../types/game';
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
import { dateToSerial, serialToDate, formatMedium, formatWeekEnding } from '../../sim/gameClock';
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

const CLASS_BADGE: Record<VenueClass, string> = {
  club: 'purple', theatre: 'blue', hall: 'green', arena: 'gold', stadium: 'red',
};

export function ShowsScreen() {
  const { player, shows, scheduledShows, showOffers, planShowAt, scheduleShow, gameDate } = useGameStore();
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            🎭 Live Shows
          </h1>
          <p className="text-gray-500 text-sm">
            You are a <span className="text-yellow-500">{TIER_LABEL[tier].toLowerCase()}</span>. Book a room, price the ticket, and live with the door.
          </p>
        </div>
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 shrink-0">
          {([
            ['plan', 'Plan a show'],
            ['upcoming', `Upcoming${scheduledShows.length ? ` (${scheduledShows.length})` : ''}`],
            ['offers', `Offers${openOffers ? ` (${openOffers})` : ''}`],
            ['tour', 'A tour'],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mode === m ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'upcoming' ? (
        <UpcomingShows onPlan={() => setMode('plan')} />
      ) : mode === 'offers' ? (
        <OffersPanel />
      ) : (
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {mode === 'plan' ? (
            <>
          {/* ── Where ────────────────────────────────────────────────── */}
          <Card>
            <h3 className="font-bold text-white mb-4">Plan a Show</h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Country</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    const first = SHOW_CITIES.find((c) => c.country === e.target.value);
                    if (first) setCity(first.city);
                    setVenueId(null);
                  }}
                >
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">City</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setVenueId(null); }}
                >
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* ── The room ─────────────────────────────────────────────── */}
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">The room</label>
            <div className="space-y-2 mb-4">
              {venues.map((v) => {
                const lock = venueLockReason(v, blendedFame(player));
                const selected = v.id === venue.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => !lock && setVenueId(v.id)}
                    disabled={!!lock}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between gap-3 ${
                      selected
                        ? 'bg-yellow-500/15 border border-yellow-500'
                        : lock
                        ? 'bg-gray-900/60 border border-gray-800 opacity-55 cursor-not-allowed'
                        : 'bg-gray-900 border border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{v.name}</span>
                        <Badge color={CLASS_BADGE[v.cls]}>{VENUE_CLASSES[v.cls].label}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {v.capacity.toLocaleString()} capacity · ${v.hireCost.toLocaleString()} to open
                      </div>
                      {lock && <div className="text-xs text-red-400 mt-0.5">🔒 {lock}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400">{VENUE_CLASSES[v.cls].emoji}</div>
                      <div className="text-xs text-gray-500">{VENUE_CLASSES[v.cls].cooldownDays}d gap</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── The date ─────────────────────────────────────────────── */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                Pick the night
                <span className="text-gray-600 normal-case tracking-normal">
                  {' '}— a {VENUE_CLASSES[venue.cls].label.toLowerCase()} needs {lead} days to sell
                </span>
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5">
                {diary.map((n) => {
                  const why = blockedBecause(n.serial, n.status);
                  const picked = chosen === n.serial;
                  return (
                    <button
                      key={n.serial}
                      disabled={!!why}
                      onClick={() => { setPickedSerial(n.serial); setNotice(null); }}
                      title={why ?? 'Free'}
                      className={`shrink-0 w-[74px] px-1.5 py-2 rounded-lg border text-center transition-all ${
                        picked
                          ? 'border-yellow-500 bg-yellow-500/15'
                          : !why
                            ? 'border-gray-800 bg-gray-900 hover:border-gray-600'
                            : 'border-red-500/25 bg-red-500/[0.07] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-[10px] leading-tight text-gray-400">
                        {formatWeekEnding(serialToDate(n.serial))}
                      </div>
                      <div className={`text-[10px] mt-0.5 font-bold ${!why ? 'text-green-400' : 'text-red-400'}`}>
                        {!why ? 'free' : n.status === 'taken' ? 'taken' : 'too close'}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                {chosen !== null && !chosenBlock
                  ? `Tickets go on sale today and sell until ${formatMedium(serialToDate(chosen))}. The clock plays the show for you — you will get updates and reminders on the way.`
                  : chosenBlock}
              </p>
            </div>

            {/* ── The occasion ─────────────────────────────────────────── */}
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">The occasion</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SHOW_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setShowType(t.id)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    showType === t.id
                      ? 'bg-yellow-500/20 border border-yellow-500 text-white'
                      : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-lg mb-0.5">{t.emoji}</div>
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{t.blurb}</div>
                </button>
              ))}
            </div>

            {/* ── The price ────────────────────────────────────────────── */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">
                Ticket price: <span className="text-white font-bold">${price}</span>
                <span className="text-gray-600 normal-case tracking-normal"> — this room expects about ${fair}</span>
              </label>
              <input
                type="range"
                min={5}
                max={maxPrice}
                step={5}
                value={Math.min(price, maxPrice)}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full accent-yellow-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Price it too high and the room stays empty. That is the whole trade.
              </p>
            </div>

            {notice && (
              <div className={`mb-4 text-xs rounded-lg p-2 border ${
                notice.ok ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {notice.message}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {scheduledShows.length >= MAX_OPEN_SHOWS
                  ? `You have ${MAX_OPEN_SHOWS} shows on sale — the limit.`
                  : plan
                    ? `Deposit to hold the room: $${Math.round((venue.hireCost * 0.25) / 10) * 10 > 0 ? (Math.round((venue.hireCost * 0.25) / 10) * 10).toLocaleString() : 0}`
                    : ''}
              </div>
              <Button
                variant="gold"
                onClick={handleAnnounce}
                disabled={!plan || chosen === null || !!chosenBlock || scheduledShows.length >= MAX_OPEN_SHOWS}
              >
                🎟️ Announce &amp; put on sale
              </Button>
            </div>
          </Card>
            </>
          ) : (
            <TourPlanner />
          )}
        </div>

        {/* ── The estimate ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {mode === 'plan' ? (
            <>
          {plan ? (
            <Card>
              <h4 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">
                The estimate
              </h4>

              {/* The range, not a promise. */}
              <div className="bg-gray-800 rounded-xl p-3 mb-3">
                <div className="text-xs text-gray-400 mb-1">Expected attendance</div>
                <div className="text-white font-bold text-lg">
                  {plan.tickets.low.toLocaleString()}
                  <span className="text-gray-500 font-normal"> – </span>
                  {plan.tickets.high.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  most likely {plan.tickets.likely.toLocaleString()} of {venue.capacity.toLocaleString()}
                  {' '}({Math.round(plan.fill * 100)}% full)
                </div>
                <div className="h-1.5 bg-gray-900 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${plan.fill >= 0.85 ? 'bg-green-500' : plan.fill >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, plan.fill * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-xs mb-3">
                <Row label="Door (most likely)" value={`$${plan.gross.likely.toLocaleString()}`} />
                <Row label="Merchandise" value={`$${plan.merch.toLocaleString()}`} />
                <div className="border-t border-gray-800 pt-1.5 mt-1.5 space-y-1">
                  {plan.costs.map((c) => (
                    <Row key={c.key} label={c.label} value={`−$${c.amount.toLocaleString()}`} muted />
                  ))}
                  <Row label="Total costs" value={`−$${plan.totalCosts.toLocaleString()}`} bold />
                </div>
                <div className="border-t border-gray-800 pt-1.5 mt-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-400">Net</span>
                    <span className={`font-black text-sm ${plan.net.likely >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {plan.net.low.toLocaleString()} … {plan.net.high.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 text-right">
                    likely ${plan.net.likely.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Why. An estimate the player cannot interrogate is a slot machine. */}
              <details className="text-xs">
                <summary className="text-gray-400 cursor-pointer hover:text-gray-300">Why these numbers</summary>
                <div className="mt-2 space-y-1">
                  {plan.drivers.map((d) => <Row key={d.label} label={d.label} value={d.value} muted />)}
                </div>
              </details>

              {plan.warnings.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {plan.warnings.map((w) => (
                    <p key={w} className="text-xs text-yellow-300/90 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                      ⚠️ {w}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <p className="text-xs text-red-300">{preview.message}</p>
            </Card>
          )}

          {/* ── History ────────────────────────────────────────────────── */}
          <Card>
            <h4 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Recent shows</h4>
            {history.length === 0 ? (
              <p className="text-xs text-gray-600">You have not played a show yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((s) => (
                  <div key={s.id} className="bg-gray-900 rounded-lg p-2 text-xs">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-white font-medium truncate">{s.venueName ?? s.city}</span>
                      <span className={s.moneyEarned >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                        {s.moneyEarned >= 0 ? '+' : '−'}${Math.abs(s.moneyEarned).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {s.attendance.toLocaleString()}/{s.capacity.toLocaleString()} · ${s.ticketPrice}/ticket · {s.date}
                    </div>
                    {s.performanceQuality !== undefined && (
                      <div className="text-gray-600">
                        reviewed {s.performanceQuality}/100 · +{s.fameGained} fame
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
            </>
          ) : (
            <ToursPanel />
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={muted ? 'text-gray-500' : 'text-gray-400'}>{label}</span>
      <span className={bold ? 'text-white font-bold' : muted ? 'text-gray-400' : 'text-white'}>{value}</span>
    </div>
  );
}

/** The same blend the store uses, kept local so the screen can gate without a round trip. */

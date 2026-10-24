// ─── TOURS ──────────────────────────────────────────────────────────────────
//
// The screen half of `sim/tours.ts`.
//
// Two components: the PLANNER, which is how a run gets built and booked, and
// the PANEL, which is the runs already on the calendar. They are separate
// because they answer different questions — "what would this run be worth?" and
// "where am I next?" — and the second one is the only thing a player needs
// while a tour is actually running.
//
// The planner deliberately shows the dates it could NOT get. A city that is
// booked, a city that has seen you too recently, a room you are not big enough
// for: all of them are named, with the night that IS free. A planner that only
// ever says yes is a button, and the player finds out the truth on night two.

import { useMemo, useState } from 'react';
import { useGameStore, blendedFame, type TourStop } from '../../store/gameStore';
import { Card, Button } from '../ui/Card';
import {
  SHOW_CITIES,
  orderCountries,
  venuesInCity,
  venueLockReason,
  perceivedTicketPrice,
  VENUE_CLASSES,
  type VenueClass,
} from '../../sim/shows';
import { buzzLabel } from '../../sim/tours';
import { formatShort, serialToDate } from '../../sim/gameClock';

const CLASS_ORDER: VenueClass[] = ['club', 'theatre', 'hall', 'arena', 'stadium'];

function money(n: number): string {
  return `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

// ─── THE PLANNER ────────────────────────────────────────────────────────────

export function TourPlanner() {
  const { player, tours, planTourAt, bookTour } = useGameStore();

  const [country, setCountry] = useState(player?.country ?? 'Ghana');
  const [city, setCity] = useState(player?.city ?? 'Accra');
  const [cls, setCls] = useState<VenueClass>('club');
  const [stops, setStops] = useState<TourStop[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const countries = useMemo(() => orderCountries(Array.from(new Set(SHOW_CITIES.map((c) => c.country))), player?.country ?? 'Ghana'), [player?.country]);
  const cities = useMemo(
    () => SHOW_CITIES.filter((c) => c.country === country).map((c) => c.city),
    [country],
  );

  if (!player) return null;

  const fame = blendedFame(player);
  const venues = venuesInCity(city, country).filter((v) => v.cls === cls);
  const room = venues[0];

  // One price for the run, opened on the fair price for this artist. A run is
  // priced once because a tour that charges $80 in Lagos and $12 in Accra is a
  // different mistake in every city, and the planner already warns per leg.
  const fair = perceivedTicketPrice(fame, country);

  const preview = stops.length ? planTourAt(stops) : null;
  const plan = preview?.plan;

  const addStop = () => {
    if (!room) return;
    // You cannot play the same room twice on one run — the diary would have to
    // hold two of your own nights, and the cooldown forbids it anyway.
    if (stops.some((s) => s.venueId === room.id)) {
      setNotice({ ok: false, message: `${room.name} is already on this run.` });
      return;
    }
    setStops([
      ...stops,
      {
        venueId: room.id,
        // A date abroad is the international slot; a date at home is not.
        type: country === player.country ? 'local_club' : 'international_tour',
        price: fair,
      },
    ]);
    setNotice(null);
  };

  const removeStop = (venueId: string) => {
    setStops(stops.filter((s) => s.venueId !== venueId));
    setNotice(null);
  };

  const handleBook = () => {
    const res = bookTour(stops);
    setNotice({ ok: res.ok, message: res.message });
    if (res.ok) setStops([]);
  };

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-bold text-white">Plan a Tour</h3>
        <span className="text-xs text-gray-500">
          {stops.length} date{stops.length === 1 ? '' : 's'} · {fair > 0 ? `$${fair}/ticket` : ''}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Two cities or more. You cannot play Lagos on Tuesday and London on Wednesday — the nights
        between dates are travel, and the planner routes them for you.
      </p>

      {/* ── Add a city ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <select
          className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            const first = SHOW_CITIES.find((c) => c.country === e.target.value);
            if (first) setCity(first.city);
          }}
        >
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
          value={cls}
          onChange={(e) => setCls(e.target.value as VenueClass)}
        >
          {CLASS_ORDER.map((c) => {
            const v = venuesInCity(city, country).find((x) => x.cls === c);
            const locked = v ? venueLockReason(v, fame) : 'not in this city';
            return (
              <option key={c} value={c} disabled={!!locked}>
                {VENUE_CLASSES[c].emoji} {VENUE_CLASSES[c].label}
                {locked ? ' — locked' : ` · ${v!.capacity.toLocaleString()}`}
              </option>
            );
          })}
        </select>
        <Button variant="gold" onClick={addStop} disabled={!room || !!venueLockReason(room, fame)}>
          Add {city}
        </Button>
      </div>

      {room && (
        <p className="text-xs text-gray-600 mb-4">
          {room.name} · {room.capacity.toLocaleString()} capacity · {money(room.hireCost)} to open
          {venueLockReason(room, fame) ? ` · ${venueLockReason(room, fame)}` : ''}
        </p>
      )}

      {/* ── The run, as routed ─────────────────────────────────────────── */}
      {plan && plan.legs.length > 0 && (
        <div className="space-y-2 mb-4">
          {plan.legs.map((l) => (
            <div key={l.venue.id} className="bg-gray-900 rounded-lg p-2.5 text-xs">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-white font-medium truncate">
                  {formatShort(serialToDate(l.serial))} — {l.venue.name}, {l.city}
                </span>
                <span className={l.plan.net.likely >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {money(l.plan.net.likely)}
                </span>
              </div>
              <div className="text-gray-500 mt-0.5">
                {l.plan.tickets.likely.toLocaleString()} of {l.venue.capacity.toLocaleString()} ·{' '}
                {Math.round(l.plan.fill * 100)}% full · ${l.price}/ticket
                {l.travelDays > 0 ? ` · ${l.travelDays}d travel, ${money(l.travelCost)}` : ' · opens the run'}
                {l.slippedDays > 0 ? ` · moved ${l.slippedDays}d, the room was taken` : ''}
              </div>
              {l.plan.warnings.map((w) => (
                <div key={w} className="text-yellow-300/80 mt-1">⚠️ {w}</div>
              ))}
              <button
                className="text-gray-600 hover:text-red-400 mt-1"
                onClick={() => removeStop(l.venue.id)}
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── The dates that could not be had ────────────────────────────── */}
      {plan && plan.unavailable.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {plan.unavailable.map((u) => (
            <p
              key={`${u.index}-${u.city}`}
              className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2"
            >
              ❌ {u.city} — {u.reason}
              {u.heldBy ? ` (${u.heldBy})` : ''}
              {u.nextFreeSerial !== undefined
                ? ` · free on ${formatShort(serialToDate(u.nextFreeSerial))}`
                : u.earliestLegalSerial !== undefined
                  ? ` · the city will have you from ${formatShort(serialToDate(u.earliestLegalSerial))}`
                  : ''}
            </p>
          ))}
        </div>
      )}

      {/* ── The run, in numbers ────────────────────────────────────────── */}
      {plan && plan.legs.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-3 mb-4 space-y-1 text-xs">
          <Row label="Dates" value={`${plan.legs.length} across ${plan.cities.length} cit${plan.cities.length === 1 ? 'y' : 'ies'}`} />
          <Row label="First to last" value={`${formatShort(serialToDate(plan.firstNight!))} → ${formatShort(serialToDate(plan.lastNight!))} (${plan.span} nights)`} />
          <Row label="Seats" value={plan.projected.tickets.toLocaleString()} />
          <Row label="Door + merch" value={money(plan.projected.gross + plan.projected.merch)} />
          <Row label="Costs, itemised per night" value={`−${money(plan.projected.costs)}`} />
          <Row label="On the road" value={`−${money(plan.totalTravel)}`} />
          <Row
            label="Projected"
            value={money(plan.projected.netAfterTravel)}
            bold
          />
          <Row label="Album buzz" value={buzzLabel(plan.buzz)} />
        </div>
      )}

      {plan && plan.warnings.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {plan.warnings.map((w) => (
            <p key={w} className="text-xs text-yellow-300/90 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      {notice && (
        <div
          className={`mb-4 text-xs rounded-lg p-2 border ${
            notice.ok
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500">
          {stops.length < 2
            ? 'Add a second city to make it a tour'
            : `Routing is paid up front: ${money(plan?.totalTravel ?? 0)}`}
        </span>
        <Button
          variant="gold"
          onClick={handleBook}
          disabled={!plan || !plan.isTour || plan.legs.length < 2}
        >
          {plan && plan.isTour ? `Book ${plan.legs.length} dates` : 'Book the run'}
        </Button>
      </div>

      {tours.some((t) => t.status === 'booked' || t.status === 'running') && (
        <p className="text-xs text-gray-600 mt-3">
          You already have a run on the calendar. The dates on it own their nights.
        </p>
      )}
    </Card>
  );
}

// ─── THE RUNS ON THE CALENDAR ───────────────────────────────────────────────

export function ToursPanel() {
  const { tours, cancelTour } = useGameStore();
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const live = tours.filter((t) => t.status !== 'cancelled');

  if (!live.length) {
    return (
      <Card>
        <h4 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Your tours</h4>
        <p className="text-xs text-gray-600">
          Nothing booked. A run of dates is the only way to be in two cities in one month.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h4 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Your tours</h4>
      <div className="space-y-3">
        {live.map((t) => {
          const played = t.legs.filter((l) => l.playedSerial !== undefined).length;
          const actual = t.legs.reduce((s, l) => s + (l.net ?? 0), 0);
          const next = t.legs
            .filter((l) => l.playedSerial === undefined)
            .sort((a, b) => a.serial - b.serial)[0];
          return (
            <div key={t.id} className="bg-gray-900 rounded-lg p-2.5 text-xs">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-white font-medium truncate">{t.name}</span>
                <span className="text-gray-500 shrink-0">
                  {played}/{t.legs.length}
                </span>
              </div>
              <div className="text-gray-500 mt-0.5">
                {t.status === 'done'
                  ? 'finished'
                  : next
                    ? `next: ${formatShort(serialToDate(next.serial))} in ${next.city}`
                    : 'finishing'}
              </div>
              <div className="text-gray-600">
                {t.legs.map((l) => l.city).join(' → ')}
              </div>
              {played > 0 && (
                <div className={`mt-0.5 ${actual >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  played: {actual < 0 ? '−' : '+'}${Math.abs(actual).toLocaleString()}
                  <span className="text-gray-600"> · on the road: −${t.travelCost.toLocaleString()}</span>
                </div>
              )}
              {t.status !== 'done' && (
                <button
                  className="text-gray-600 hover:text-red-400 mt-1"
                  onClick={() => {
                    const res = cancelTour(t.id);
                    setNotice({ ok: res.ok, message: res.message });
                  }}
                >
                  call it off
                </button>
              )}
            </div>
          );
        })}
      </div>
      {notice && (
        <p className={`text-xs mt-3 ${notice.ok ? 'text-green-300' : 'text-red-300'}`}>
          {notice.message}
        </p>
      )}
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'text-white font-black' : 'text-gray-300'}>{value}</span>
    </div>
  );
}

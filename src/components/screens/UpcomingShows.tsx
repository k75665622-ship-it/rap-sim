import { useMemo, useState } from 'react';
import { useGameStore, blendedFame, liveShowTarget } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import type { ScheduledShow } from '../../types/game';
import { findVenue, perceivedTicketPrice, VENUE_CLASSES } from '../../sim/shows';
import { diary as roomDiary } from '../../sim/booking';
import { dateToSerial, serialToDate, formatMedium, formatWeekEnding } from '../../sim/gameClock';
import {
  CANCEL_REASONS,
  MARKETING_TIERS,
  MAX_POSTPONEMENTS,
  MOOD_LABEL,
  marketingCost,
  salesMood,
  type CancelReason,
  type SalesMood,
} from '../../sim/ticketing';

const MOOD_STYLE: Record<SalesMood, string> = {
  sold_out: 'bg-green-500/20 text-green-300 border-green-500/40',
  hot: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  on_track: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  slow: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  at_risk: 'bg-red-500/15 text-red-300 border-red-500/40',
};

type Panel = 'price' | 'promote' | 'postpone' | 'cancel' | null;

/** The ticket-sales line: cumulative tickets by day, with the room's ceiling. */
function SalesChart({ show, target }: { show: ScheduledShow; target: number }) {
  const W = 300;
  const H = 70;
  const x0 = show.announcedSerial;
  const x1 = show.serial;
  const span = Math.max(1, x1 - x0);
  const px = (s: number) => ((s - x0) / span) * W;
  const py = (v: number) => H - (v / Math.max(1, show.capacity)) * (H - 6) - 3;
  const pts = show.sales.map((p) => `${px(p.serial).toFixed(1)},${py(p.sold).toFixed(1)}`).join(' ');
  const last = show.sales[show.sales.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[70px]" preserveAspectRatio="none" role="img" aria-label="Ticket sales over time">
      <line x1="0" x2={W} y1={py(show.capacity)} y2={py(show.capacity)} stroke="#374151" strokeDasharray="3 3" />
      <line x1="0" x2={W} y1={py(Math.min(show.capacity, target))} y2={py(Math.min(show.capacity, target))} stroke="#ca8a04" strokeOpacity="0.5" strokeDasharray="2 4" />
      <polyline points={pts} fill="none" stroke="#facc15" strokeWidth="2" strokeLinejoin="round" />
      {last && <circle cx={px(last.serial)} cy={py(last.sold)} r="3" fill="#facc15" />}
    </svg>
  );
}

function ShowCard({ show }: { show: ScheduledShow }) {
  const {
    player, gameDate, scheduledShows, repriceScheduledShow, promoteScheduledShow,
    postponeScheduledShow, cancelScheduledShow, quoteScheduledCancel, quoteScheduledPostpone,
  } = useGameStore();

  const [panel, setPanel] = useState<Panel>(null);
  const [price, setPrice] = useState(show.price);
  const [reason, setReason] = useState<CancelReason>('low_sales');
  const [newSerial, setNewSerial] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const today = dateToSerial(gameDate);
  const venue = findVenue(show.venueId);
  const daysOut = show.serial - today;

  const target = venue ? liveShowTarget(useGameStore.getState(), show, venue) : 0;
  const sales = { announcedSerial: show.announcedSerial, serial: show.serial, ticketsSold: show.ticketsSold, capacity: show.capacity };
  const mood = salesMood(sales, today, target);
  const fill = show.ticketsSold / Math.max(1, show.capacity);
  const projected = Math.round(Math.min(show.capacity, target));

  const fair = player ? perceivedTicketPrice(blendedFame(player)) : 20;
  const maxPrice = Math.max(40, Math.round((fair * 3) / 5) * 5);

  // Free nights after the current date, for the postpone picker.
  const options = useMemo(() => {
    if (!venue || panel !== 'postpone') return [];
    return roomDiary(venue, show.serial + 1, 60)
      .filter((n) => n.status === 'free' && !scheduledShows.some((s) => s.id !== show.id && s.serial === n.serial))
      .slice(0, 24)
      .map((n) => n.serial);
  }, [venue, panel, show.serial, show.id, scheduledShows]);

  if (!venue) return null;

  const cancelQuote = panel === 'cancel' ? quoteScheduledCancel(show.id, reason) : null;
  const moveQuote = panel === 'postpone' && newSerial ? quoteScheduledPostpone(show.id, newSerial) : null;

  const run = (res: { ok: boolean; message: string }) => {
    setNotice(res);
    if (res.ok) setPanel(null);
  };

  const tab = (id: Exclude<Panel, null>, label: string, disabled = false) => (
    <button
      key={id}
      disabled={disabled}
      onClick={() => { setPanel(panel === id ? null : id); setConfirmCancel(false); setNotice(null); }}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${
        panel === id
          ? id === 'cancel' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
          : id === 'cancel' ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'bg-white/[0.05] text-gray-200 hover:bg-white/[0.1]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white truncate">{venue.name}</h3>
            <Badge color="purple">{VENUE_CLASSES[venue.cls].label}</Badge>
            {show.postponements > 0 && <Badge color="blue">moved {show.postponements}×</Badge>}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {venue.city}, {venue.country} · {formatMedium(serialToDate(show.serial))} ·{' '}
            <span className="text-yellow-400 font-semibold">
              {daysOut <= 0 ? 'tonight' : daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`}
            </span>
          </div>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${MOOD_STYLE[mood]}`}>
          {MOOD_LABEL[mood]}
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between text-xs mb-1">
          <span className="text-white font-bold text-lg tabular-nums">
            {show.ticketsSold.toLocaleString()}
            <span className="text-gray-500 text-xs font-normal"> / {show.capacity.toLocaleString()} sold</span>
          </span>
          <span className="text-gray-400 tabular-nums">
            ${(show.ticketsSold * show.price).toLocaleString()} at the door so far
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fill >= 0.85 ? 'bg-green-500' : fill >= 0.45 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, fill * 100)}%` }}
          />
        </div>
        <div className="text-[11px] text-gray-600 mt-1">
          Ticket ${show.price} · demand supports about {projected.toLocaleString()} by the night
          {show.marketingSpend > 0 && ` · $${show.marketingSpend.toLocaleString()} promotion`}
        </div>
      </div>

      <SalesChart show={show} target={target} />

      <div className="flex flex-wrap gap-2">
        {tab('price', '🏷️ Price')}
        {tab('promote', '📣 Promote', daysOut < 2)}
        {tab('postpone', '📅 Postpone', show.postponements >= MAX_POSTPONEMENTS)}
        {tab('cancel', '🚫 Cancel')}
      </div>

      {notice && (
        <div className={`text-xs rounded-lg p-2 border ${notice.ok ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {notice.message}
        </div>
      )}

      {panel === 'price' && (
        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3 space-y-2">
          <div className="text-xs text-gray-400">
            New price: <span className="text-white font-bold">${price}</span>
            <span className="text-gray-600"> — this room expects about ${fair}</span>
          </div>
          <input type="range" min={5} max={maxPrice} step={5} value={Math.min(price, maxPrice)}
            onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-yellow-500" />
          <p className="text-[11px] text-gray-600">A cut pulls in buyers who were on the fence. People who already bought keep what they paid.</p>
          <Button variant="gold" onClick={() => run(repriceScheduledShow(show.id, price))} disabled={price === show.price}>
            {price < show.price ? `Cut to $${price}` : price > show.price ? `Raise to $${price}` : 'Same price'}
          </Button>
        </div>
      )}

      {panel === 'promote' && (
        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3 space-y-2">
          {MARKETING_TIERS.map((t) => {
            const cost = marketingCost(t, show.capacity, show.price);
            return (
              <button key={t.id} onClick={() => run(promoteScheduledShow(show.id, t.id))}
                disabled={!player || player.career.money < cost}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-yellow-500/60 disabled:opacity-40 text-left">
                <span>
                  <span className="text-sm text-white font-semibold">{t.emoji} {t.label}</span>
                  <span className="block text-[11px] text-gray-500">{t.blurb}</span>
                </span>
                <span className="text-sm text-yellow-400 font-bold tabular-nums">${cost.toLocaleString()}</span>
              </button>
            );
          })}
          <p className="text-[11px] text-gray-600">Returns shrink the more you spend. Your promoter, publicist and DJs already count towards the number above.</p>
        </div>
      )}

      {panel === 'postpone' && (
        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3 space-y-2">
          <div className="text-xs text-gray-400">Pick a new night at {venue.name}. Some ticket-holders will want refunds.</div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {options.map((s) => (
              <button key={s} onClick={() => setNewSerial(s)}
                className={`px-2 py-1 rounded-md text-[11px] border ${newSerial === s ? 'border-yellow-500 bg-yellow-500/15 text-white' : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'}`}>
                {formatWeekEnding(serialToDate(s))}
              </button>
            ))}
            {options.length === 0 && <span className="text-[11px] text-gray-600">No free nights in the next two months.</span>}
          </div>
          {moveQuote && <p className="text-[11px] text-yellow-300/90 bg-yellow-500/10 rounded-lg p-2">{moveQuote.explain}</p>}
          <Button variant="gold" disabled={!newSerial} onClick={() => newSerial && run(postponeScheduledShow(show.id, newSerial))}>
            Move the show
          </Button>
        </div>
      )}

      {panel === 'cancel' && (
        <div className="bg-red-500/[0.06] border border-red-500/25 rounded-xl p-3 space-y-2">
          <div className="space-y-1.5">
            {CANCEL_REASONS.map((r) => (
              <label key={r.id} className={`flex gap-2 p-2 rounded-lg border cursor-pointer ${reason === r.id ? 'border-red-400/60 bg-red-500/10' : 'border-gray-800 bg-gray-900'}`}>
                <input type="radio" name={`reason-${show.id}`} checked={reason === r.id} onChange={() => { setReason(r.id); setConfirmCancel(false); }} className="mt-0.5 accent-red-500" />
                <span>
                  <span className="text-xs text-white font-semibold">{r.label}</span>
                  <span className="block text-[11px] text-gray-500">{r.blurb}</span>
                </span>
              </label>
            ))}
          </div>
          {cancelQuote && (
            <p className="text-[11px] text-red-200/90 leading-relaxed">
              {cancelQuote.explain} <b>Cost: ${cancelQuote.penalty.toLocaleString()}</b>
              {cancelQuote.reputation < 0 && <> · reputation {cancelQuote.reputation}</>}
              {show.ticketsSold > 0 && <> · {show.ticketsSold.toLocaleString()} refunds</>}.
            </p>
          )}
          {!confirmCancel ? (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel this show…</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => run(cancelScheduledShow(show.id, reason))}>Yes, call it off</Button>
              <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep it</Button>
            </div>
          )}
        </div>
      )}

      {show.notes.length > 0 && (
        <details className="text-[11px]">
          <summary className="text-gray-500 cursor-pointer hover:text-gray-300">Show log</summary>
          <ul className="mt-1.5 space-y-0.5 text-gray-500">
            {show.notes.slice(0, 6).map((n, i) => <li key={i}>• {n}</li>)}
          </ul>
        </details>
      )}
    </Card>
  );
}

export function UpcomingShows({ onPlan }: { onPlan: () => void }) {
  const scheduled = useGameStore((s) => s.scheduledShows);
  const sorted = [...scheduled].sort((a, b) => a.serial - b.serial);

  if (sorted.length === 0) {
    return (
      <Card className="text-center py-10">
        <div className="text-3xl mb-2">🎟️</div>
        <div className="text-white font-bold">Nothing on sale</div>
        <p className="text-xs text-gray-500 mt-1 mb-4">Announce a date and tickets start selling day by day. The clock plays the show for you.</p>
        <Button variant="gold" onClick={onPlan}>Plan a show</Button>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {sorted.map((s) => <ShowCard key={s.id} show={s} />)}
    </div>
  );
}

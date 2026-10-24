// ─── THE FEATURE SHOP ──────────────────────────────────────────────────────
//
// One place where a guest verse is negotiated, used by both the Studio's
// Features tab and the Vault's "Add a feature" panel.
//
// It is one component because it used to be two, and the two disagreed. The
// Studio ran the real negotiation — send the track, wait days, get a price,
// pay, cut the verse in. The Vault ran a single hidden dice roll and dropped
// the guest onto the record instantly, for free, with no conversation at all.
// The same button in two places did two different things, and the version the
// player found first was the one that skipped the game.
//
// The rules, restated because the UI has to obey them:
//
//   · Asking costs energy and starts a wait. Nothing lands today.
//   · A price is an opening, not a verdict. `counterFeatureFee` is the haggle,
//     and it is capped — pushing a fourth time ends the conversation.
//   · Silence is a real outcome and is reported as silence, not as a refusal.

import { CONDITION_LABEL } from '../../sim/featureTerms';
import { serialToDate, formatGameDate } from '../../sim/gameClock';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Card';
import { cn } from '@/utils/cn';
import { ENERGY_COSTS } from '../../sim/energy';
import { featureFee, MAX_NEGOTIATION_ROUNDS } from '../../sim/features';
import type { FeatureRequest, NPC } from '../../types/game';

// ─── ONE OPEN NEGOTIATION ───────────────────────────────────────────────────

export function FeatureRequestRow({
  request,
  money,
  energy,
  onPay,
  onDecline,
  onAdd,
  onCounter,
}: {
  request: FeatureRequest;
  money: number;
  energy: number;
  onPay: (requestId: string, fee: number) => void;
  onDecline: (requestId: string) => void;
  onAdd: (requestId: string) => void;
  onCounter: (requestId: string, offer: number) => void;
}) {
  const { status } = request;
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const shell =
    status === 'terms' ? 'bg-blue-500/10 border-blue-500/30'
      : status === 'verse_ready' ? 'bg-green-500/10 border-green-500/30'
        : status === 'sent' ? 'bg-gray-800/60 border-gray-700'
          : status === 'declined' ? 'bg-red-500/10 border-red-500/30'
            : 'bg-gray-800/40 border-gray-800';

  const canAfford = money >= request.fee;
  const canAdd = energy >= ENERGY_COSTS.addVerse;
  const round = request.negotiationRound ?? 0;
  const original = request.originalFee;
  const dropped = original !== undefined && original > request.fee;

  /** Suggested counters. Round numbers, because that is how people talk. */
  const suggestions = [0.9, 0.78, 0.62].map(
    (f) => Math.max(100, Math.round((request.fee * f) / 100) * 100),
  );

  const custom = Number(draft);
  const customOk = Number.isFinite(custom) && custom > 0 && custom < request.fee && custom <= money;

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${shell}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">
            {request.npcName}
            <span className="text-gray-500 font-normal"> · "{request.songTitle}"</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5 leading-snug">{request.reason}</div>
          {(request.conditions ?? []).length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {request.conditions!.map((c) => (
                <div key={c.kind} className="text-[11px] text-amber-300 leading-snug">📜 {CONDITION_LABEL[c.kind]}{c.rivalNames?.length ? ` (${c.rivalNames.join(', ')})` : c.fameCap ? ` (nobody above ${c.fameCap} fame)` : c.bySerial ? ` (out by ${formatGameDate(serialToDate(c.bySerial))})` : ''}</div>
              ))}
            </div>
          )}
          {(request.breaches ?? []).filter((b) => !b.settled).map((b, i) => (
            <div key={i} className="text-[11px] text-red-300 mt-1">⚠️ Broken: {b.text}</div>
          ))}
        </div>
        {status === 'sent' && (
          <span className="text-[11px] text-gray-500 shrink-0">due {request.dueDate}</span>
        )}
        {status === 'terms' && round > 0 && (
          <span className="text-[11px] text-gray-500 shrink-0">
            round {Math.min(round + 1, MAX_NEGOTIATION_ROUNDS)} of {MAX_NEGOTIATION_ROUNDS}
          </span>
        )}
      </div>

      {status === 'terms' && (
        <>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Button
              size="sm"
              variant={canAfford ? 'primary' : 'ghost'}
              disabled={!canAfford}
              onClick={() => onPay(request.id, request.fee)}
            >
              Pay ${request.fee.toLocaleString()}
            </Button>
            {round < MAX_NEGOTIATION_ROUNDS && (
              <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
                {open ? 'Close the counter' : '💰 Counter-offer'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onDecline(request.id)}>
              Pass
            </Button>
            {dropped && (
              <span className="text-[11px] text-green-400">
                down from ${original!.toLocaleString()}
              </span>
            )}
            {!canAfford && (
              <span className="text-[11px] text-red-400">
                You are ${(request.fee - money).toLocaleString()} short.
              </span>
            )}
          </div>

          {open && round < MAX_NEGOTIATION_ROUNDS && (
            <div className="mt-2 rounded-lg bg-black/30 border border-gray-700/60 p-2">
              <div className="text-[11px] text-gray-400 mb-1.5 leading-snug">
                Name your number. They move as far as they want this record — and how
                you are doing it decides whether they move at all. This is push{' '}
                {round + 1} of {MAX_NEGOTIATION_ROUNDS}; the last one ends it either way.
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    disabled={s >= request.fee || s > money}
                    onClick={() => onCounter(request.id, s)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors',
                      s >= request.fee || s > money
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700',
                    )}
                  >
                    ${s.toLocaleString()}
                  </button>
                ))}
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  placeholder="other"
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-yellow-500"
                />
                <Button
                  size="sm"
                  variant="gold"
                  disabled={!customOk}
                  onClick={() => onCounter(request.id, custom)}
                >
                  Offer
                </Button>
              </div>
              <div className="text-[10px] text-gray-500 mt-1.5 leading-snug">
                Under half their ask reads as an insult, not an opening bid.
              </div>
            </div>
          )}
        </>
      )}

      {status === 'verse_ready' && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Button size="sm" variant="gold" disabled={!canAdd} onClick={() => onAdd(request.id)}>
            Add verse to the song
          </Button>
          <span className="text-[11px] text-gray-400">
            verse read {Math.round(request.verseQuality ?? 0)}/100
            {request.freeVerse ? ' · done for the relationship, not the money' : ''}
          </span>
          {!canAdd && (
            <span className="text-[11px] text-orange-400">
              Needs {ENERGY_COSTS.addVerse} energy.
            </span>
          )}
        </div>
      )}

      {status === 'ignored' && (
        <div className="text-[11px] text-gray-500 mt-1.5">
          Nothing came back. That happens to everybody — send it again or move on.
        </div>
      )}
    </div>
  );
}

// ─── THE PICKER ─────────────────────────────────────────────────────────────

/**
 * Who to send it to.
 *
 * The country filter is not decoration. The roster is thousands of artists
 * spread across the world, and a player who wants somebody from home — or who
 * wants to break a market they are actually in — has no way to say so through
 * a name search. Picking a country narrows the pool to that country's artists
 * before anything else is applied, so the list is never a global top-N with
 * the local names missing.
 */
export function FeaturePicker({
  song,
  npcs,
  playerFame,
  playerCountry,
  sentIds,
  onSend,
  presetSearch,
  actionLabel = 'Send',
  sentLabel = 'Sent',
}: {
  song: { id: string; title: string; quality: number; featuredArtists?: string[] };
  npcs: NPC[];
  playerFame: number;
  playerCountry: string;
  sentIds: Set<string>;
  onSend: (npcId: string, npcName: string) => void;
  /** A name to pre-filter on, e.g. arriving from an artist's profile. */
  presetSearch?: string;
  /** What the row's button says. "Send" when shopping, "Invite" when not yet. */
  actionLabel?: string;
  /** What a row says once it has been chosen. */
  sentLabel?: string;
}) {
  const [search, setSearch] = useState(presetSearch ?? '');
  const [country, setCountry] = useState('');

  // The hand-off from "Request a feature" on a profile lands here rather than
  // in a second, parallel search box.
  useEffect(() => {
    if (presetSearch) setSearch(presetSearch);
  }, [presetSearch]);

  // How many artists there are per country, so the filter can say what it is
  // choosing between and can never offer an empty list.
  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of npcs) {
      if (n.role !== 'artist' || !n.country) continue;
      counts.set(n.country, (counts.get(n.country) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [npcs]);

  const pool = useMemo(() => {
    const artists = npcs.filter((n) => n.role === 'artist');
    const scoped = country ? artists.filter((n) => n.country === country) : artists;
    // Bounded, because the roster is thousands long and nobody features the
    // 900th most famous artist in the world on purpose.
    return scoped.sort((a, b) => b.fame - a.fame).slice(0, 300);
  }, [npcs, country]);

  const already = song.featuredArtists ?? [];

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool.slice(0, 30);
    return pool
      .filter((a) => a.name.toLowerCase().includes(q) || (a.city ?? '').toLowerCase().includes(q))
      .slice(0, 30);
  }, [pool, search]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">
          Send "{song.title}" to
        </label>
        <span className="text-[11px] text-gray-600 shrink-0">
          ⚡ {ENERGY_COSTS.shopFeature} per send
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-yellow-500 sm:w-48 shrink-0"
        >
          <option value="">Every country ({npcs.filter((n) => n.role === 'artist').length})</option>
          {countries.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count}){name === playerCountry ? ' · home' : ''}
            </option>
          ))}
        </select>
        <input
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 text-sm"
          placeholder="Search by artist or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {country && (
        <div className="text-[11px] text-gray-500 mb-1.5">
          Showing {country}'s artists
          {country === playerCountry ? ' — the people who will actually pick up' : ''}.
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {shown.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">Nobody matches that.</p>
        ) : (
          shown.map((a) => {
            const onIt = already.includes(a.id);
            const sent = sentIds.has(a.id);
            const gap = a.fame - playerFame;
            // The same function the engine prices with, so the read here is
            // the number they will actually open at — before the haggle.
            const list = featureFee(
              {
                id: a.id,
                fame: a.fame,
                tier: a.tier,
                relationshipScore: a.relationshipScore ?? 0,
                genre: a.genre,
                personality: a.personality,
                name: a.name,
              },
              song.quality,
            );
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-800 border border-gray-700"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white truncate">{a.name}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{a.tier}</span>
                    {(a.relationshipScore ?? 0) >= 40 && (
                      <span className="text-[10px] text-green-400 shrink-0">
                        rel {Math.round(a.relationshipScore)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {a.city ? `${a.city}, ` : ''}
                    {a.country}
                    {a.genre ? ` · ${a.genre.replace('_', '-')}` : ''}
                    {gap > 35 && (
                      <span className="text-orange-400/80"> · well out of your league</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    asks around ${list.toLocaleString()} · negotiable
                  </div>
                </div>
                {onIt ? (
                  <span className="text-[11px] text-green-500 shrink-0">On the record</span>
                ) : sent ? (
                  <span className="text-[11px] text-gray-600 shrink-0">{sentLabel}</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => onSend(a.id, a.name)}
                  >
                    {actionLabel}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── CHARTS ────────────────────────────────────────────────────────────────
// Three views behind one segmented control:
//   · BillBoard Global Top 100  — songs, weekly
//   · BillBoard Global Top 200  — albums, EPs and deluxe editions, weekly
//   · Platform Charts           — one platform's Top 10 in one country
//
// The chart itself sits directly under the header: rank 1 as a hero card, then
// rows. No country wall, no scrolling before you see a chart.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { compact, full } from '@/utils/format';
import {
  EmptyState,
  PageTitle,
  Panel,
  Segmented,
  SlidePanel,
  Stat,
  Tag,
  Button,
} from '../ui/kit';
import { CountrySelect } from '../ui/CountrySelect';
import {
  ChartHeader,
  ChartHero,
  ChartRow,
  PlatformSwitcher,
  MovementBadge,
} from '../ui/cards';
import { platform } from '../../data/platforms';
import {
  dateToSerial,
  formatWeekEnding,
  serialToDate,
  chartWeekEnding,
  formatClockTime,
} from '../../sim/gameClock';
import {
  metricLabelFor,
  platformCountryChart,
  songPlatformLines,
  trackById,
  liveTopSongs,
  liveWeekTotal,
} from '../../store/musicSelectors';
import type { ChartRow as ChartRowData } from '../../types/game';
import { IconArrowDown, IconArrowUp, IconTrend } from '../icons';

type Tab = 'songs' | 'albums' | 'platform';

const CHART_SIZE = { songs: 100, albums: 200 };

export function ChartsScreen() {
  const state = useGameStore();
  const { player, globalSongs, globalAlbums, screenCountry, setScreenCountry, recentCountries } = state;

  const [tab, setTab] = useState<Tab>('songs');
  const [platformId, setPlatformId] = useState<string>('spotify');
  const [openRow, setOpenRow] = useState<ChartRowData | null>(null);

  // Each screen remembers its own country; the platform charts keep their own.
  const countryKey = `platform:${platformId}`;
  const country =
    screenCountry?.[countryKey] ?? screenCountry?.['charts'] ?? player?.country ?? 'Ghana';

  // The published chart is labelled with the week it was actually published
  // for — `chartWeekCursor` — not with the week the clock happens to be in.
  // Reading it off today's date put a future Saturday on a chart built from a
  // week that had already closed.
  const publishedSerial =
    state.chartWeekCursor && state.chartWeekCursor > 0
      ? state.chartWeekCursor
      : dateToSerial(chartWeekEnding(state.gameDate));
  const weekEnding = useMemo(
    () => formatWeekEnding(serialToDate(publishedSerial)),
    [publishedSerial],
  );

  const platformChart = useMemo(
    () => platformCountryChart(state, platformId, country, 10),
    // The state object identity changes on every store write, which is exactly
    // when the chart should be recomputed.
    [state, platformId, country],
  );

  const activePlatform = platform(platformId);
  const rows = tab === 'songs' ? globalSongs ?? [] : tab === 'albums' ? globalAlbums ?? [] : [];
  // The whole chart is the content. This used to render 25 rows behind a
  // "Show more" button that revealed all of them at once, so a page called the
  // Global Top 100 was hiding 75 of its own entries — and the label promised a
  // page of 25, not the rest. The list is the point, so the list is shown.
  const visible = rows;
  const metricLabel = tab === 'albums' ? 'units' : 'pts';

  return (
    <div>
      <PageTitle
        subtitle={`Week ending ${weekEnding} · ${tab === 'platform' ? `${activePlatform?.name} ${country}` : tab === 'songs' ? 'BillBoard Global Top 100' : 'BillBoard Global Top 200'}`}
        action={
          <div className="flex items-center gap-2">
            {tab === 'platform' ? (
              <CountrySelect
                value={country}
                onChange={(c) => {
                  setScreenCountry(countryKey, c);
                  setScreenCountry('charts', c);
                }}
                home={player?.country}
                recent={recentCountries ?? []}
                size="sm"
              />
            ) : null}
          </div>
        }
      >
        Charts
      </PageTitle>

      <div className="flex items-center gap-3 flex-wrap mb-4">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => {
            setTab(t);
            setOpenRow(null);
          }}
          options={[
            { id: 'songs', label: 'Global Top 100' },
            { id: 'albums', label: 'Global Top 200' },
            { id: 'platform', label: 'Platform Charts' },
          ]}
        />
        {tab !== 'platform' ? (
          <span className="text-[12px] text-ink3">
            {tab === 'songs'
              ? `Published chart: week ending ${weekEnding}. Live positions below it update as the week runs.`
              : `Published chart: week ending ${weekEnding}.`}
          </span>
        ) : null}
      </div>

      {tab === 'platform' ? (
        <div className="mb-4 space-y-3">
          <PlatformSwitcher
            value={platformId}
            onChange={(id) => {
              setPlatformId(id);
            }}
          />
          <div className="flex items-center gap-3">
            <CountrySelect
              value={country}
              onChange={(c) => {
                setScreenCountry(countryKey, c);
                setScreenCountry('charts', c);
              }}
              home={player?.country}
              recent={recentCountries ?? []}
            />
            <span className="text-[12px] text-ink3">
              {activePlatform?.name} Top 10 · {country}
            </span>
          </div>
        </div>
      ) : null}

      {/* ── The chart, above the fold ─────────────────────────────────────── */}
      {tab === 'platform' ? (
        <PlatformTop10
          rows={platformChart}
          platformId={platformId}
          country={country}
          onOpen={(songId) => {
            const t = trackById(state, songId);
            if (!t) return;
            setOpenRow({
              itemId: songId,
              title: t.title,
              artistId: t.artistId,
              artistName: t.artistName,
              artistCountry: t.artistCountry,
              position: 0,
              lastPosition: 0,
              peak: 0,
              weeks: 0,
              weeksAtNo1: 0,
              metric: platformChart.find((r) => r.songId === songId)?.units ?? 0,
              movement: 'same',
              delta: 0,
              isPlayer: t.isPlayer,
              hasTopped: false,
            });
          }}
        />
      ) : rows.length === 0 ? (
        <Panel className="py-4">
          <EmptyState
            icon={<IconTrend size={26} />}
            title="No published chart for this week yet"
            body="The Global chart closes on Saturday. Until then the live positions below are the running order."
          />
        </Panel>
      ) : (
        <>
          {/* ── The week in progress ────────────────────────────────────────
              The published chart is a weekly snapshot and that is the point of
              it, but a screen that only ever shows a snapshot reads as frozen.
              This is the same week, still running, scored on the same state. */}
          {tab === 'songs' ? <LiveWeekPanel state={state} weekEnding={weekEnding} /> : null}

          <Panel className="p-3">
          {visible[0] ? (
            <div className="mb-2">
              <ChartHero
                row={visible[0]}
                metricLabel={metricLabel}
                onClick={() => setOpenRow(visible[0])}
              />
            </div>
          ) : null}

          <ChartHeader />
          <div className="divide-y divide-line/60">
            {visible.slice(1).map((row) => (
              <ChartRow
                key={row.itemId}
                row={row}
                metricLabel={metricLabel}
                onClick={() => setOpenRow(row)}
              />
            ))}
          </div>

          {/* Always the honest count. When the world has not yet made enough
              records to fill the chart, it says so instead of pretending. */}
          <div className="pt-3 text-[12px] text-ink3">
            {rows.length} of {CHART_SIZE[tab]} positions filled
            {rows.length < CHART_SIZE[tab]
              ? ' — the chart fills as the world releases more'
              : ''}
          </div>
          </Panel>
        </>
      )}

      <ChartRunDrawer row={openRow} onClose={() => setOpenRow(null)} />
    </div>
  );
}

// ─── THE WEEK IN PROGRESS ──────────────────────────────────────────────────
//
// Ranked on the last seven days plus however much of today has already
// happened, so the order and the numbers both move while the clock runs. It is
// the same streaming state the published chart is built from — not a preview,
// not an estimate, just the week before it is frozen.

function LiveWeekPanel({
  state,
  weekEnding,
}: {
  state: ReturnType<typeof useGameStore.getState>;
  weekEnding: string;
}) {
  const rows = liveTopSongs(state, 10);
  const weekTotal = liveWeekTotal(state);
  const nextPublish = nextChartPublishLabel(state);

  if (rows.length === 0) {
    return (
      <Panel className="py-4 mb-3">
        <EmptyState
          icon={<IconTrend size={26} />}
          title="Nobody has streamed anything yet"
          body="The world has records out but no listeners on them. This fills in as soon as the clock moves."
        />
      </Panel>
    );
  }

  const top = rows[0].week || 1;

  return (
    <Panel className="p-3 mb-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-rise opacity-70 rl-pulse" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-rise" />
        </span>
        <span className="text-[12px] font-bold uppercase tracking-widest text-ink">
          This week so far
        </span>
        <span className="text-[12px] text-ink3">· {compact(weekTotal)} streams worldwide</span>
        <span className="ml-auto text-[11px] text-ink3">{nextPublish}</span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.songId} className="flex items-center gap-3">
            <span className="w-5 text-[12px] font-bold text-ink3 num text-right shrink-0">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-ink truncate leading-tight">
                {r.title}
                {r.isPlayer ? (
                  <span className="ml-1.5 text-[10px] font-bold text-amber align-middle">YOU</span>
                ) : null}
              </div>
              <div className="text-[11px] text-ink3 truncate">{r.artistName}</div>
            </div>
            <div className="w-24 shrink-0 hidden sm:block">
              <div className="h-1.5 rounded-full bg-line overflow-hidden">
                <div
                  className={cn('h-1.5 rounded-full', r.isPlayer ? 'bg-amber' : 'bg-ink3/50')}
                  style={{ width: `${Math.max(3, Math.round((r.week / top) * 100))}%` }}
                />
              </div>
            </div>
            <span className="w-16 text-[12px] text-ink num text-right shrink-0">
              {compact(r.week)}
            </span>
            <span
              className={cn(
                'w-12 text-[11px] num text-right shrink-0',
                r.growth > 0.02 ? 'text-rise' : r.growth < -0.02 ? 'text-fall' : 'text-ink3',
              )}
            >
              {r.prevWeek > 0
                ? `${r.growth >= 0 ? '+' : ''}${Math.round(r.growth * 100)}%`
                : 'new'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 pt-2 border-t border-line text-[11px] text-ink3">
        Ranked on the seven days to now, today included as far as it has run. The published chart
        freezes this on {weekEnding}.
      </div>
    </Panel>
  );
}

/** "Next chart publishes in 3 days" / "publishes today". */
function nextChartPublishLabel(state: ReturnType<typeof useGameStore.getState>): string {
  const now = dateToSerial(state.gameDate);
  const end = dateToSerial(chartWeekEnding(state.gameDate));
  const days = Math.max(0, end - now);
  if (days === 0) return 'Publishes today';
  return `Publishes in ${days} day${days === 1 ? '' : 's'}`;
}

// ─── PLATFORM TOP 10 ───────────────────────────────────────────────────────

function PlatformTop10({
  rows,
  platformId,
  country,
  onOpen,
}: {
  rows: ReturnType<typeof platformCountryChart>;
  platformId: string;
  country: string;
  onOpen: (songId: string) => void;
}) {
  const state = useGameStore();
  const asOf = formatClockTime(state.clockMinute);
  const metric = metricLabelFor(platformId);

  if (rows.length === 0) {
    return (
      <Panel className="py-4">
        <EmptyState
          title={`Nothing charting on ${platform(platformId)?.name} in ${country} yet`}
          body="Nobody has enough listeners there this week. Advance time, or pick a bigger market."
        />
      </Panel>
    );
  }

  return (
    <Panel className="p-3">
      {rows[0] ? (
        <div className="mb-2">
          <PlatformHero row={rows[0]} metric={metric} onClick={() => onOpen(rows[0].songId)} />
        </div>
      ) : null}

      <div className="divide-y divide-line/60">
        {rows.slice(1).map((row, i) => (
          <button
            key={row.songId}
            onClick={() => onOpen(row.songId)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-left transition-colors hover:bg-cardhover',
              row.isPlayer && 'bg-amber/5',
            )}
            style={row.isPlayer ? { borderLeft: '3px solid #FFB800' } : undefined}
          >
            <div className="w-8 text-right shrink-0">
              <span className="text-[17px] font-bold text-ink num">{i + 2}</span>
            </div>
            <div className="w-11 shrink-0 flex justify-center">
              {row.growth > 0.02 ? (
                <span className="inline-flex items-center gap-0.5 text-rise text-[11px] font-bold num">
                  <IconArrowUp size={11} />
                  {Math.round(row.growth * 100)}%
                </span>
              ) : row.growth < -0.02 ? (
                <span className="inline-flex items-center gap-0.5 text-fall text-[11px] font-bold num">
                  <IconArrowDown size={11} />
                  {Math.abs(Math.round(row.growth * 100))}%
                </span>
              ) : (
                <span className="text-ink3 text-[11px]">—</span>
              )}
            </div>
            <div
              className="w-11 h-11 rounded-[8px] shrink-0"
              style={{
                background: `linear-gradient(135deg, ${gradientPair(row.songId)})`,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-ink truncate">{row.title}</span>
                {row.isPlayer ? <Tag tone="amber">You</Tag> : null}
              </div>
              <div className="text-[12px] text-ink2 truncate">{row.artistName}</div>
            </div>
            <div className="hidden md:block text-right shrink-0">
              <div className="text-[13px] font-semibold text-ink num">{compact(row.units)}</div>
              <div className="text-[11px] text-ink3">{metric} this week</div>
            </div>
            <div className="md:hidden text-right shrink-0">
              <div className="text-[13px] font-semibold text-ink num">{compact(row.units)}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-3 text-[12px] text-ink3">
        Ranked by {metric} in {country} over the last seven game days ·{' '}
        as of {asOf}
      </div>
    </Panel>
  );
}

function PlatformHero({
  row,
  metric,
  onClick,
}: {
  row: ReturnType<typeof platformCountryChart>[number];
  metric: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-[14px] bg-card border border-line cursor-pointer hover:bg-cardhover transition-colors"
      style={row.isPlayer ? { borderLeftWidth: 3, borderLeftColor: '#FFB800' } : undefined}
    >
      <div
        className="w-24 h-24 rounded-[12px] shrink-0"
        style={{ background: `linear-gradient(135deg, ${gradientPair(row.songId)})` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber">
            #1 on this platform
          </span>
          {row.isPlayer ? <Tag tone="amber">You</Tag> : null}
        </div>
        <div className="text-[17px] font-semibold text-ink truncate">{row.title}</div>
        <div className="text-[13px] text-ink2 truncate">{row.artistName}</div>
        <div className="flex flex-wrap items-center gap-x-4 mt-2 text-[12px] text-ink3 num">
          <span>
            <span className="text-ink font-semibold">{compact(row.units)}</span> {metric} this week
          </span>
          <span>{compact(row.platformWeek)} worldwide</span>
          <span>{compact(row.lifetime)} lifetime</span>
        </div>
      </div>
    </div>
  );
}

function gradientPair(seed: string): string {
  const pairs = [
    ['#FFB800', '#FF5E3A'],
    ['#4DA3FF', '#1DB954'],
    ['#B57BFF', '#FF3B7B'],
    ['#2ED573', '#0E9F6E'],
    ['#FF4757', '#B44CFF'],
    ['#1E90FF', '#00D1C1'],
  ];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const p = pairs[(h >>> 0) % pairs.length];
  return `${p[0]}, ${p[1]}`;
}

// ─── CHART RUN DRAWER ──────────────────────────────────────────────────────

function ChartRunDrawer({
  row,
  onClose,
}: {
  row: ChartRowData | null;
  onClose: () => void;
}) {
  const state = useGameStore();
  const { chartRuns, globalSongs, globalAlbums } = state;

  if (!row) return null;

  const isAlbum = (globalAlbums ?? []).some((r) => r.itemId === row.itemId);
  const chartKey = isAlbum ? 'albums' : 'songs';
  const run = chartRuns?.[`${chartKey}|${row.itemId}`];
  const positions = run?.positions ?? [];

  const current = (isAlbum ? globalAlbums : globalSongs)?.find((r) => r.itemId === row.itemId);
  const live = current ?? row;

  const track = trackById(state, row.itemId);
  const asOf = formatClockTime(state.clockMinute);

  return (
    <SlidePanel
      open={!!row}
      onClose={onClose}
      width={480}
      title={live.title}
      subtitle={live.artistName}
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              onClose();
            }}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-[10px] shrink-0"
            style={{ background: `linear-gradient(135deg, ${gradientPair(row.itemId)})` }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink truncate">{live.title}</span>
              {live.isPlayer ? <Tag tone="amber">You</Tag> : null}
            </div>
            <div className="text-[12px] text-ink2 truncate">{live.artistName}</div>
            <div className="text-[11px] text-ink3 mt-0.5">
              {isAlbum ? 'BillBoard Global Top 200' : 'BillBoard Global Top 100'} ·{' '}
              {live.artistCountry}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Current" value={live.position ? `#${live.position}` : '—'} />
          <Stat label="Peak" value={live.peak ? `#${live.peak}` : '—'} />
          <Stat label="Weeks on chart" value={live.weeks} />
          <Stat label="Weeks at #1" value={live.weeksAtNo1} />
          <Stat
            label="Debut"
            value={positions.findIndex((p) => p > 0) >= 0 ? `#${positions.find((p) => p > 0)}` : '—'}
          />
          <Stat
            label={isAlbum ? 'Units this week' : 'Points this week'}
            value={compact(live.metric)}
          />
        </div>

        {/* Chart run — position by position, #1 at the top. */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">
            Chart run, week by week
          </div>
          {positions.length === 0 ? (
            <p className="text-[12px] text-ink3">
              No run recorded yet. This chart publishes weekly — advance to the end of the week.
            </p>
          ) : (
            <RunGraph positions={positions} />
          )}
        </div>

        {isAlbum ? (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">
              How the units were earned
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Pure sales" value={full(live.pureSales ?? 0)} />
              <Stat label="Track equiv." value={full(live.teu ?? 0)} />
              <Stat label="Streaming equiv." value={full(live.sea ?? 0)} />
            </div>
            <p className="text-[11px] text-ink3 mt-2 leading-relaxed">
              1 album unit = 1 album sale, or 10 downloaded tracks, or 1,250 premium streams,
              or 3,750 free streams.
            </p>
          </div>
        ) : (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">
              Where the points came from
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Streams" value={compact(live.streams ?? 0)} />
              <Stat label="Downloads" value={compact(live.purchases ?? 0)} />
              <Stat label="Radio" value={compact(live.radio ?? 0)} />
              <Stat label="Video views" value={compact(live.videoViews ?? 0)} />
            </div>
          </div>
        )}

        {track ? (
          <PlatformSplit songId={track.songId} />
        ) : null}

        <div className="text-[11px] text-ink3">
          Movement this week: <MovementBadge row={live} />
          <span className="ml-2">
            as of {asOf}
          </span>
        </div>
      </div>
    </SlidePanel>
  );
}

/** Per-platform split for one song, inside the drawer. */
function PlatformSplit({ songId }: { songId: string }) {
  const state = useGameStore();
  const lines = useMemo(() => songPlatformSplit(state, songId), [state, songId]);
  if (lines.length === 0) return null;

  const total = lines.reduce((s, l) => s + l.units, 0) || 1;

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">
        Split across platforms, this week
      </div>
      <div className="space-y-1.5">
        {lines.slice(0, 5).map((l) => (
          <div key={l.platformId} className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-[5px] text-[10px] font-bold text-black flex items-center justify-center shrink-0"
              style={{ background: l.accent }}
            >
              {l.mark}
            </span>
            <span className="text-[12px] text-ink2 w-24 truncate">{l.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(l.units / total) * 100}%`, background: l.accent }}
              />
            </div>
            <span className="text-[12px] text-ink num w-14 text-right">{compact(l.units)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function songPlatformSplit(state: ReturnType<typeof useGameStore.getState>, songId: string) {
  return songPlatformLines(state, songId);
}

/** An SVG line graph of chart positions. Lower is better, so the axis is flipped. */
function RunGraph({ positions }: { positions: number[] }) {
  const pts = positions.slice(-26);
  if (pts.length === 0) return null;

  const W = 400;
  const H = 130;
  const PAD = 18;
  const maxPos = Math.max(...pts.filter((p) => p > 0), 10);
  const stepX = pts.length > 1 ? (W - PAD * 2) / (pts.length - 1) : 0;

  const xy = (p: number, i: number) => {
    const x = PAD + i * stepX;
    // A week off the chart sits on the baseline.
    const y = p <= 0 ? H - PAD : PAD + ((p - 1) / Math.max(1, maxPos - 1)) * (H - PAD * 2);
    return [x, y] as const;
  };

  const drawn = pts
    .map((p, i) => (p > 0 ? xy(p, i) : null))
    .filter((v): v is readonly [number, number] => !!v);

  const path = drawn.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const best = Math.min(...pts.filter((p) => p > 0));

  return (
    <div className="rounded-[12px] bg-card border border-line p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }} role="img"
        aria-label={`Chart positions over the last ${pts.length} weeks`}>
        {/* Gridlines at #1, the peak and the baseline */}
        {[1, Math.round(maxPos / 2), maxPos].map((p) => {
          const y = PAD + ((p - 1) / Math.max(1, maxPos - 1)) * (H - PAD * 2);
          return (
            <g key={p}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#232632" strokeWidth="1" />
              <text x={2} y={y + 3} fill="#6B7186" fontSize="9">
                {p}
              </text>
            </g>
          );
        })}

        <path d={path} fill="none" stroke="#FFB800" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {drawn.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === drawn.length - 1 ? 3.5 : 2} fill={i === drawn.length - 1 ? '#FFB800' : '#9AA0B4'} />
        ))}

        {/* A week off the chart, marked on the floor */}
        {pts.map((p, i) => {
          if (p > 0) return null;
          const [x] = xy(p, i);
          return <circle key={`x${i}`} cx={x} cy={H - PAD} r={2} fill="#6B7186" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-ink3 px-1">
        <span>{pts.length} weeks ago</span>
        <span>best #{best}</span>
        <span>this week</span>
      </div>
    </div>
  );
}

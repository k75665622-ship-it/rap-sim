// ─── STREAMS HOME ──────────────────────────────────────────────────────────
// The RAP LIFE Streams front page. Branded hero, a tabbed Top 10 table, and a
// right rail of what is actually happening. Every figure comes from the engine;
// the country picker in the shell changes the data, not the labels.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { StreamsShell, RailCard, PromoStrip, type StreamsTab } from '../streams/StreamsShell';
import { Panel, EmptyState, Tag, Button } from '../ui/kit';
import { PlatformMark } from '../ui/cards';
import { PLATFORM_LIST, platform } from '../../data/platforms';
import { compact, genreLabel } from '@/utils/format';
import {
  platformCountryChart,
  allAlbums,
  artistRef,
  uploadAge,
  liveTopSongs,
} from '../../store/musicSelectors';
import { allVideos } from '../../store/videoSelectors';
import { useScreenCountry } from '../../hooks/useScreenCountry';
import { chartWeekEnding, formatWeekEnding, weekIndexOf } from '../../sim/gameClock';
import type { ChartRow } from '../../types/game';
import { IconArrowDown, IconArrowUp, IconMinus, IconChevronRight, IconDisc, IconPlay } from '../icons';

type Tab = 'songs' | 'albums' | 'artists' | 'new';

export function StreamsHomeScreen() {
  const state = useGameStore();
  const [tab, setTab] = useState<Tab>('songs');
  const [query, setQuery] = useState('');
  const [platformId, setPlatformId] = useState(state.selectedPlatformId ?? PLATFORM_LIST[0].id);
  const [country, setCountry] = useScreenCountry('streams:home');

  const setScreen = useGameStore((s) => s.setScreen);
  const openSong = useGameStore((s) => s.openSong);
  const openArtist = useGameStore((s) => s.openArtist);
  const openVideo = useGameStore((s) => s.openVideo);
  const setSelectedPlatform = useGameStore((s) => s.openPlatform);

  const cfg = platform(platformId)!;
  const week = weekIndexOf(state.gameDate);
  const weekLabel = formatWeekEnding(chartWeekEnding(state.gameDate));

  const platformRows = useMemo(
    () => platformCountryChart(state, platformId, country, 10),
    [state, platformId, country],
  );

  const albums = useMemo(() => allAlbums(state).filter((a) => a.units > 0), [state]);
  const videos = useMemo(
    () => allVideos(state).sort((a, b) => b.views - a.views).slice(0, 4),
    [state],
  );

  const globalSongs: ChartRow[] = state.globalSongs ?? [];
  const topSong = globalSongs[0];
  // The rail shows the week in progress, not the frozen snapshot. Same engine,
  // same state — it just includes the part of today that has already run.
  const liveSongs = useMemo(() => liveTopSongs(state, 5), [state]);
  const heroNpc = topSong ? state.npcs.find((n) => n.id === topSong.artistId) : undefined;
  const heroArtist = heroNpc ? artistRef(state, heroNpc) : null;
  const heroEntries = topSong
    ? globalSongs.filter((r) => r.artistId === topSong.artistId).length
    : 0;

  const goTab = (t: StreamsTab) => {
    if (t === 'home') return;
    if (t === 'charts') return setScreen('charts');
    if (t === 'albums' || t === 'artists' || t === 'playlists' || t === 'new') return setScreen('streaming');
    if (t === 'videos') return setScreen('videos');
    if (t === 'search') return setScreen('search');
  };

  const rail = (
    <>
      {/* Featured artist — the top of the global chart, read from real data. */}
      {heroArtist ? (
        <RailCard title="Featured Artist" action="View" onAction={() => openArtist(heroArtist.id)}>
          <div
            className="rounded-[12px] h-28 mb-3 flex items-end p-3"
            style={{ background: `linear-gradient(140deg, ${cfg.accent}66, #14161E)` }}
          >
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-ink truncate">{heroArtist.name}</div>
              <div className="text-[11px] text-ink2 truncate">
                {genreLabel(heroArtist.genre)} · {heroArtist.country}
              </div>
            </div>
          </div>
          <button
            onClick={() => openArtist(heroArtist.id)}
            className="w-full h-8 rounded-[8px] bg-amber text-black text-[12px] font-bold hover:brightness-110 transition"
          >
            Follow
          </button>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <MiniStat label="Global rank" value={topSong ? `#${topSong.position}` : '—'} />
            <MiniStat label="Chart entries" value={String(heroEntries)} />
            <MiniStat label="Followers" value={compact(heroArtist.subscribers)} />
          </div>
        </RailCard>
      ) : null}

      {/* Trending now — the week in progress, so it moves with the clock.
          The published weekly chart is one click away; a front page should
          show what is happening right now. */}
      <RailCard
        title="Trending Now"
        action="See all"
        onAction={() => setScreen('charts')}
      >
        <div className="space-y-1">
          {liveSongs.slice(0, 5).map((row, i) => (
            <button
              key={row.songId}
              onClick={() => openSong(row.songId)}
              className="w-full flex items-center gap-2.5 p-1.5 rounded-[8px] hover:bg-cardhover transition-colors text-left"
            >
              <span className="w-4 text-right text-[12px] text-ink3 num shrink-0">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-ink truncate">{row.title}</div>
                <div className="text-[11px] text-ink3 truncate">{row.artistName}</div>
              </div>
              <span className="text-[11px] text-ink2 num shrink-0">{compact(row.week)}</span>
            </button>
          ))}
          {liveSongs.length === 0 ? (
            <p className="text-[12px] text-ink3">
              Nothing is streaming yet. Give the clock a moment.
            </p>
          ) : null}
        </div>
      </RailCard>

      {/* New releases — newest videos, which is the fastest-moving catalogue. */}
      <RailCard title="New Releases" action="See all" onAction={() => setScreen('videos')}>
        <div className="space-y-2">
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => openVideo(v.id)}
              className="w-full flex items-center gap-2.5 text-left group"
            >
              <div
                className="w-14 h-9 rounded-[6px] shrink-0"
                style={{ background: `linear-gradient(140deg, ${cfg.accent}55, #232632)` }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
                  {v.songTitle}
                </div>
                <div className="text-[11px] text-ink3 truncate">
                  {v.artistName} · {uploadAge(state, v.uploadSerial, v.minuteOfDay)}
                </div>
              </div>
            </button>
          ))}
          {videos.length === 0 ? <p className="text-[12px] text-ink3">No videos up yet.</p> : null}
        </div>
      </RailCard>
    </>
  );

  return (
    <StreamsShell
      tab="home"
      onTab={goTab}
      query={query}
      onQuery={setQuery}
      onSearchSubmit={() => setScreen('search')}
      country={country}
      onCountry={setCountry}
      home={state.player?.country}
      recent={state.recentCountries}
      platformId={platformId}
      onPlatform={(id) => {
        setPlatformId(id);
        setSelectedPlatform(id);
      }}
      rail={rail}
      hasAlerts={(state.notifications ?? []).some((n) => !n.read)}
      onBell={() => setScreen('news')}
      footer={<PromoStrip onExplore={() => setScreen('streaming')} />}
    >
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section
        className="rounded-[16px] overflow-hidden border border-line mb-4 relative"
        style={{ background: `linear-gradient(115deg, ${cfg.accent}33 0%, #14161E 55%, #0F1117 100%)` }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <PlatformMark platform={cfg} size={22} />
                <span className="text-[12px] font-bold tracking-widest" style={{ color: cfg.accent }}>
                  {cfg.name.toUpperCase()}
                </span>
              </div>
              <h1 className="text-[26px] md:text-[32px] font-bold text-ink leading-tight">
                Top 10 Songs
              </h1>
              <p className="text-[13px] text-ink2 mt-1.5">
                The most {cfg.purchaseBased ? 'purchased' : 'streamed'} songs on {cfg.name} this week.
              </p>
              <div className="flex items-center gap-3 mt-3 text-[12px] text-ink3">
                <span className="inline-flex items-center gap-1.5">
                  <IconDisc size={14} />
                  Week {week} · {country}
                </span>
                <span>{weekLabel}</span>
              </div>
            </div>
            <button
              onClick={() => setScreen('charts')}
              className="shrink-0 h-9 px-4 rounded-full bg-card/80 border border-line text-[12px] font-semibold text-ink hover:bg-cardhover transition"
            >
              Global Charts
            </button>
          </div>
        </div>
      </section>

      {/* ── TABS ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-hide">
        {([
          ['songs', 'Top 10 Songs'],
          ['albums', 'Top 10 Albums'],
          ['artists', 'Trending Artists'],
          ['new', 'New Releases'],
        ] as Array<[Tab, string]>).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              'h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ' +
              (tab === id ? 'bg-amber/15 text-amber' : 'text-ink3 hover:text-ink')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────── */}
      <Panel className="overflow-hidden">
        {tab === 'songs' ? (
          platformRows.length === 0 ? (
            <EmptyState
              icon={<IconPlay size={24} />}
              title={`No ${cfg.purchaseBased ? 'sales' : 'streams'} in ${country}`}
              body="Let the clock run a week. The world keeps releasing music whether or not you do."
            />
          ) : (
            <>
              <TableHead columns={['#', 'Song', 'Artist', cfg.purchaseBased ? 'Sales' : 'Streams', 'Last week', 'Change']} />
              {platformRows.map((row, i) => {
                const position = i + 1;
                return (
                <button
                  key={row.songId}
                  onClick={() => openSong(row.songId)}
                  className="w-full grid grid-cols-[28px_minmax(0,1fr)_56px_64px] md:grid-cols-[44px_1fr_180px_120px_110px_90px] items-center gap-3 px-3 h-14 border-t border-line/60 hover:bg-cardhover transition-colors text-left"
                >
                  <span className="text-[17px] font-bold text-ink num text-right pr-1">{position}</span>
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-4 shrink-0 flex justify-center">
                      <PositionMove position={position} lastPosition={row.lastPosition} />
                    </span>
                    <span
                      className="w-9 h-9 rounded-[6px] shrink-0"
                      style={{ background: `linear-gradient(140deg, ${cfg.accent}66, #232632)` }}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-ink truncate">{row.title}</span>
                        {row.isPlayer ? <Tag tone="amber">You</Tag> : null}
                      </span>
                      <span className="hidden md:block text-[11px] text-ink3 truncate">
                        {genreLabel(row.genre)}
                      </span>
                      <span className="md:hidden block text-[11px] text-ink3 truncate">{row.artistName}</span>
                    </span>
                  </span>
                  <span className="hidden md:block text-[13px] text-ink2 truncate">{row.artistName}</span>
                  <span className="text-[13px] font-semibold text-ink num text-right">
                    {compact(row.units)}
                  </span>
                  <span className="hidden md:block text-[13px] text-ink3 num text-right">
                    {row.lastPosition === 0 ? '—' : row.lastPosition}
                  </span>
                  <span className="text-right">
                    <ChangePill position={position} lastPosition={row.lastPosition} />
                  </span>
                </button>
                );
              })}
            </>
          )
        ) : null}

        {tab === 'albums' ? (
          <AlbumTable
            rows={albums.slice(0, 10)}
            onOpen={(artistId) => openArtist(artistId)}
            accent={cfg.accent}
          />
        ) : null}

        {tab === 'artists' ? (
          <ArtistTable state={state} onOpen={openArtist} />
        ) : null}

        {tab === 'new' ? (
          <NewTable state={state} onOpenSong={openSong} onOpenArtist={openArtist} accent={cfg.accent} />
        ) : null}
      </Panel>

      <div className="mt-3">
        <Button variant="secondary" onClick={() => setScreen('charts')}>
          View Full Top 100
          <IconChevronRight size={15} />
        </Button>
      </div>
    </StreamsShell>
  );
}

// ─── TABLE PIECES ──────────────────────────────────────────────────────────

function TableHead({ columns }: { columns: string[] }) {
  return (
    <div className="hidden md:grid grid-cols-[44px_1fr_180px_120px_110px_90px] items-center gap-3 px-3 h-9 text-[10px] uppercase tracking-widest text-ink3 font-bold">
      {columns.map((c, i) => (
        <span key={c} className={i >= 3 ? 'text-right' : ''}>
          {c}
        </span>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[15px] font-bold text-ink num">{value}</div>
      <div className="text-[10px] text-ink3 leading-tight mt-0.5">{label}</div>
    </div>
  );
}

/** The arrow beside a row: how many places it moved since last week. */
function PositionMove({ position, lastPosition }: { position: number; lastPosition: number }) {
  if (lastPosition === 0) return <IconMinus size={12} className="text-ink3" />;
  const delta = lastPosition - position;
  if (delta > 0) return <IconArrowUp size={12} className="text-rise" />;
  if (delta < 0) return <IconArrowDown size={12} className="text-fall" />;
  return <IconMinus size={12} className="text-ink3" />;
}

/** The Change column: places gained or lost, or NEW. */
function ChangePill({ position, lastPosition }: { position: number; lastPosition: number }) {
  if (lastPosition === 0) return <Tag tone="new">New</Tag>;
  const delta = lastPosition - position;
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-rise text-[12px] font-bold num">
        <IconArrowUp size={11} />+{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-fall text-[12px] font-bold num">
        <IconArrowDown size={11} />
        {delta}
      </span>
    );
  }
  return <IconMinus size={12} className="text-ink3" />;
}

function AlbumTable({
  rows,
  onOpen,
  accent,
}: {
  rows: ReturnType<typeof allAlbums>;
  onOpen: (artistId: string) => void;
  accent: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No albums yet" body="Albums appear once a project has been released." />;
  }
  return (
    <>
      <TableHead columns={['#', 'Album', 'Artist', 'Type', 'Units', 'Released']} />
      {rows.map((a, i) => (
        <button
          key={a.id}
          onClick={() => onOpen(a.artistId)}
          className="w-full grid grid-cols-[28px_minmax(0,1fr)_72px] md:grid-cols-[44px_1fr_180px_90px_120px_110px] items-center gap-3 px-3 h-14 border-t border-line/60 hover:bg-cardhover transition-colors text-left"
        >
          <span className="text-[17px] font-bold text-ink num text-right pr-1">{i + 1}</span>
          <span className="flex items-center gap-3 min-w-0">
            <span
              className="w-9 h-9 rounded-[6px] shrink-0"
              style={{ background: `linear-gradient(140deg, ${accent}66, #232632)` }}
            />
            <span className="text-[13px] font-semibold text-ink truncate">{a.title}</span>
          </span>
          <span className="hidden md:block text-[13px] text-ink2 truncate">{a.artistName}</span>
          <span className="hidden md:block">
            <Tag tone="accent">{a.type === 'ep' ? 'EP' : a.type}</Tag>
          </span>
          <span className="hidden md:block text-[13px] font-semibold text-ink num text-right">
            {compact(a.units)}
          </span>
          <span className="text-[12px] text-ink3 num text-right">{a.releaseSerial || '—'}</span>
        </button>
      ))}
    </>
  );
}

function ArtistTable({
  state,
  onOpen,
}: {
  state: ReturnType<typeof useGameStore.getState>;
  onOpen: (id: string) => void;
}) {
  const artists = useMemo(() => {
    const counts = new Map<string, { units: number; name: string; country: string }>();
    for (const row of state.globalSongs ?? []) {
      const prev = counts.get(row.artistId);
      counts.set(row.artistId, {
        units: (prev?.units ?? 0) + row.metric,
        name: row.artistName,
        country: row.artistCountry,
      });
    }
    return [...counts.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);
  }, [state]);

  if (artists.length === 0) {
    return <EmptyState title="No artists charting" body="Run the clock to the end of a week to publish a chart." />;
  }

  return (
    <>
      <TableHead columns={['#', 'Artist', 'Country', 'Chart entries', 'Points', '']} />
      {artists.map((a, i) => (
        <button
          key={a.id}
          onClick={() => onOpen(a.id)}
          className="w-full grid grid-cols-[28px_minmax(0,1fr)_72px] md:grid-cols-[44px_1fr_180px_120px_110px_90px] items-center gap-3 px-3 h-14 border-t border-line/60 hover:bg-cardhover transition-colors text-left"
        >
          <span className="text-[17px] font-bold text-ink num text-right pr-1">{i + 1}</span>
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber to-fall shrink-0" />
            <span className="text-[13px] font-semibold text-ink truncate">{a.name}</span>
          </span>
          <span className="hidden md:block text-[13px] text-ink2 truncate">{a.country}</span>
          <span className="hidden md:block text-[13px] text-ink3 num">
            {(state.globalSongs ?? []).filter((r) => r.artistId === a.id).length}
          </span>
          <span className="hidden md:block text-[13px] font-semibold text-ink num text-right">
            {compact(a.units)}
          </span>
          <span className="hidden md:block text-right text-[12px] text-amber">View</span>
        </button>
      ))}
    </>
  );
}

function NewTable({
  state,
  onOpenSong,
  onOpenArtist,
  accent,
}: {
  state: ReturnType<typeof useGameStore.getState>;
  onOpenSong: (id: string) => void;
  onOpenArtist: (id: string) => void;
  accent: string;
}) {
  const rows = useMemo(() => {
    const all = [...state.songs.map((s) => ({ s, isPlayer: true })), ...state.npcSongs.map((s) => ({ s, isPlayer: false }))];
    return all
      .filter((r) => r.s.releaseDate)
      .sort((a, b) => (a.s.weeksOut ?? 99) - (b.s.weeksOut ?? 99))
      .slice(0, 10);
  }, [state]);

  if (rows.length === 0) return <EmptyState title="Nothing new" body="No releases yet." />;

  return (
    <>
      <TableHead columns={['#', 'Song', 'Artist', 'Age', 'Streams', '']} />
      {rows.map((r, i) => (
        <button
          key={r.s.id}
          onClick={() => (r.isPlayer ? onOpenSong(r.s.id) : onOpenArtist(r.s.ownerId ?? ''))}
          className="w-full grid grid-cols-[28px_minmax(0,1fr)_72px] md:grid-cols-[44px_1fr_180px_120px_110px_90px] items-center gap-3 px-3 h-14 border-t border-line/60 hover:bg-cardhover transition-colors text-left"
        >
          <span className="text-[17px] font-bold text-ink num text-right pr-1">{i + 1}</span>
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-[6px] shrink-0" style={{ background: `linear-gradient(140deg, ${accent}66, #232632)` }} />
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] font-semibold text-ink truncate">{r.s.title}</span>
              {r.isPlayer ? <Tag tone="amber">You</Tag> : null}
            </span>
          </span>
          <span className="hidden md:block text-[13px] text-ink2 truncate">
            {state.npcs.find((n) => n.id === r.s.ownerId)?.name ?? state.player?.artistName ?? '—'}
          </span>
          <span className="hidden md:block text-[12px] text-ink3">
            {r.s.weeksOut === 0 ? 'this week' : `${r.s.weeksOut ?? '?'}w old`}
          </span>
          <span className="hidden md:block text-[13px] font-semibold text-ink num text-right">
            {compact(r.s.totalStreams)}
          </span>
          <span className="hidden md:block text-right text-[12px] text-amber">Open</span>
        </button>
      ))}
    </>
  );
}

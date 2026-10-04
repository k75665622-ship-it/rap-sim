// ─── STREAMING ─────────────────────────────────────────────────────────────
// The platform home. One platform at a time, one country at a time, and every
// number on the page comes out of the simulation — the same streams the charts
// are built from, read back through the selector layer.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PageTitle, Panel, SectionTitle, EmptyState, Stat, SkeletonGrid, Button } from '../ui/kit';
import { CountrySelect } from '../ui/CountrySelect';
import { AlbumCard, ArtistCard, PlatformLogo, PlatformSwitcher, SongCard, SongGrid } from '../ui/cards';
import { PLATFORM_LIST, platform } from '../../data/platforms';
import { compact } from '@/utils/format';
import { platformHome, songPlatformLines, platformCountryChart } from '../../store/musicSelectors';
import { useScreenCountry } from '../../hooks/useScreenCountry';
import { IconChevronRight, IconDisc, IconPlay, IconTrend } from '../icons';

export function StreamingScreen() {
  const state = useGameStore();
  const [platformId, setPlatformId] = useState(state.selectedPlatformId ?? PLATFORM_LIST[0].id);
  const [country, setCountry] = useScreenCountry(`platform:${platformId}`);

  const cfg = platform(platformId)!;
  const home = useMemo(() => platformHome(state, platformId, country), [state, platformId, country]);

  const openArtist = useGameStore((s) => s.openArtist);
  const openSong = useGameStore((s) => s.openSong);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSelectedPlatform = useGameStore((s) => s.openPlatform);

  const hasAnything = home.trending.length > 0 || home.popular.length > 0;

  return (
    <div className="pb-16">
      <PageTitle
        subtitle={
          <span className="flex items-center gap-2 flex-wrap">
            <span>{cfg.blurb}</span>
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <CountrySelect
              value={country}
              onChange={setCountry}
              home={state.player?.country}
              recent={state.recentCountries}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedPlatform(platformId);
                setScreen('platform');
              }}
            >
              Top 10
              <IconChevronRight size={15} />
            </Button>
          </div>
        }
      >
        <span className="flex items-center gap-3">
          <PlatformLogo platform={cfg} size="lg" />
        </span>
      </PageTitle>

      <div className="mb-6">
        <PlatformSwitcher
          value={platformId}
          onChange={(id) => {
            setPlatformId(id);
            setSelectedPlatform(id);
          }}
          showQuirk
        />
      </div>

      {!hasAnything ? (
        <Panel>
          <EmptyState
            icon={<IconDisc size={26} />}
            title="Nothing on this platform yet"
            body={`No record is registering ${cfg.purchaseBased ? 'purchases' : 'streams'} in ${country} on ${cfg.name}. Release something, or let the game clock run — the world moves on its own.`}
          />
        </Panel>
      ) : (
        <>
          {/* ── FEATURED — the three fastest-moving records here ────────── */}
          {home.featured.length > 0 ? (
            <section className="mb-8">
              <SectionTitle
                action={
                  <span className="text-[12px] text-ink3 flex items-center gap-1">
                    <IconTrend size={14} />
                    Biggest movers in {country}
                  </span>
                }
              >
                Featured
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {home.featured.map((row) => (
                  <button
                    key={row.songId}
                    onClick={() => openArtist(row.isPlayer ? 'player' : row.artistId)}
                    className="text-left group"
                  >
                    <Panel className="p-4 h-full transition-all duration-150 group-hover:bg-cardhover group-hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-14 h-14 rounded-[10px] shrink-0 flex items-center justify-center"
                          style={{ background: `${cfg.accent}22` }}
                        >
                          <IconPlay size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-ink truncate">{row.title}</div>
                          <div className="text-[12px] text-ink2 truncate">{row.artistName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-ink3 num">
                        <span>
                          <span className="text-ink font-semibold">{compact(row.units)}</span>{' '}
                          {cfg.purchaseBased ? 'purchases' : 'streams'}
                        </span>
                        <span className={row.growth >= 0 ? 'text-rise' : 'text-fall'}>
                          {row.growth >= 0 ? '+' : ''}
                          {(row.growth * 100).toFixed(0)}% w/w
                        </span>
                      </div>
                    </Panel>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {/* ── TRENDING ─────────────────────────────────────────────── */}
          <section className="mb-8">
            <SectionTitle
              action={
                <button
                  onClick={() => {
                    setSelectedPlatform(platformId);
                    setScreen('platform');
                  }}
                  className="text-[12px] text-amber hover:underline"
                >
                  See the Top 10
                </button>
              }
            >
              Trending in {country}
            </SectionTitle>
            <SongGrid>
              {home.trending.map((row, i) => (
                <SongCard
                  key={row.songId}
                  title={row.title}
                  artist={row.artistName}
                  seed={`song|${row.songId}`}
                  isPlayer={row.isPlayer}
                  badge={<span className="text-[11px] font-bold text-ink num">#{i + 1}</span>}
                  meta={`${compact(row.units)} ${cfg.purchaseBased ? 'sales' : 'streams'}`}
                  onClick={() => openSong(row.songId)}
                />
              ))}
            </SongGrid>
          </section>

          {/* ── NEW RELEASES ─────────────────────────────────────────── */}
          {home.newReleases.length > 0 ? (
            <section className="mb-8">
              <SectionTitle>New releases</SectionTitle>
              <SongGrid>
                {home.newReleases.map((row) => (
                  <SongCard
                    key={row.songId}
                    title={row.title}
                    artist={row.artistName}
                    seed={`song|${row.songId}`}
                    isPlayer={row.isPlayer}
                    meta={row.song.releaseDate}
                    onClick={() => openSong(row.songId)}
                  />
                ))}
              </SongGrid>
            </section>
          ) : null}

          {/* ── POPULAR ALL TIME ─────────────────────────────────────── */}
          {home.popular.length > 0 ? (
            <section className="mb-8">
              <SectionTitle>Popular on {cfg.name}</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel className="p-2">
                  {home.popular.slice(0, 5).map((row, i) => (
                    <button
                      key={row.songId}
                      onClick={() => openSong(row.songId)}
                      className="w-full flex items-center gap-3 p-2 rounded-[10px] hover:bg-cardhover transition-colors text-left"
                    >
                      <span className="w-5 text-right text-[13px] font-bold text-ink3 num">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-ink truncate">{row.title}</div>
                        <div className="text-[11px] text-ink2 truncate">{row.artistName}</div>
                      </div>
                      <span className="text-[11px] text-ink3 num shrink-0">
                        {compact(row.lifetime)}
                      </span>
                    </button>
                  ))}
                </Panel>
                <Panel className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
                    {cfg.purchaseBased ? 'Downloads' : 'Streams'} in {country}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Stat
                      label="This week"
                      value={compact(home.trending.reduce((s, r) => s + r.units, 0))}
                      sub={cfg.purchaseBased ? 'purchases' : 'streams'}
                    />
                    <Stat
                      label="Top record"
                      value={home.trending[0] ? compact(home.trending[0].units) : '—'}
                      sub={home.trending[0]?.title ?? ''}
                    />
                  </div>
                  <p className="text-[12px] text-ink3 mt-4 leading-relaxed">{cfg.quirk}</p>
                </Panel>
              </div>
            </section>
          ) : null}

          {/* ── RECOMMENDED ARTISTS ──────────────────────────────────── */}
          {home.recommendedArtists.length > 0 ? (
            <section className="mb-8">
              <SectionTitle>Artists to watch here</SectionTitle>
              <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-4">
                {home.recommendedArtists.map((a) => (
                  <ArtistCard
                    key={a.id}
                    name={a.name}
                    seed={`artist|${a.id}`}
                    subtitle={a.country}
                    verified={a.fame > 62}
                    meta={`${compact(a.subscribers)} followers`}
                    onClick={() => openArtist(a.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* ── ALBUMS ───────────────────────────────────────────────── */}
          {home.albums.length > 0 ? (
            <section className="mb-8">
              <SectionTitle>Albums &amp; EPs</SectionTitle>
              <SongGrid>
                {home.albums.map((a) => (
                  <AlbumCard
                    key={a.id}
                    title={a.title}
                    artist={a.artistName}
                    seed={a.coverSeed}
                    type={a.type}
                    meta={`${compact(a.units)} streams`}
                    onClick={() => openArtist(a.artistId)}
                  />
                ))}
              </SongGrid>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Used while a screen has not resolved its data yet. Exported so the router
 *  can show the same shape without duplicating the skeleton. */
export function StreamingSkeleton() {
  return (
    <div className="pb-16">
      <PageTitle subtitle="Loading platform…">Streaming</PageTitle>
      <SkeletonGrid count={6} />
    </div>
  );
}

/** The per-platform breakdown of one record. Shared by the song drawer. */
export function PlatformSplitList({ songId }: { songId: string }) {
  const state = useGameStore();
  const lines = useMemo(() => songPlatformLines(state, songId), [state, songId]);
  if (lines.length === 0) return null;

  const max = Math.max(...lines.map((l) => l.units), 1);
  return (
    <div className="space-y-2">
      {lines.map((l) => (
        <div key={l.platformId} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-[12px] text-ink2 truncate">{l.name}</span>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(l.units / max) * 100}%`, background: l.accent }}
            />
          </div>
          <span className="w-20 text-right text-[12px] text-ink num shrink-0">
            {compact(l.units)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** A compact country table for one platform. */
export function PlatformCountryRows({ platformId, limit = 8 }: { platformId: string; limit?: number }) {
  const state = useGameStore();
  const rows = useMemo(
    () => platformCountryChart(state, platformId, state.player?.country ?? 'Ghana', limit),
    [state, platformId, limit],
  );
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <div key={r.songId} className="flex items-center gap-3 py-1">
          <span className="w-5 text-right text-[12px] text-ink3 num">{i + 1}</span>
          <span className="flex-1 text-[13px] text-ink truncate">{r.title}</span>
          <span className="text-[12px] text-ink3 num">{compact(r.units)}</span>
        </div>
      ))}
    </div>
  );
}

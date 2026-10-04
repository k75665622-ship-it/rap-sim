// ─── ARTIST PAGE ───────────────────────────────────────────────────────────
// One artist, everything about them: how they do on each platform, their latest
// releases, their albums, their videos, their chart history, and a follow button
// that actually persists.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { Button, EmptyState, Panel, SectionTitle, Tag } from '../ui/kit';
import { AlbumCard, SongCard, SongGrid, VideoCard } from '../ui/cards';
import { PLATFORM_LIST, platform } from '../../data/platforms';
import {
  artistRef,
  allAlbums,
  playerRef,
  uploadAge,
  songPlatformLines,
} from '../../store/musicSelectors';
import { artistTracks, channelFor } from '../../store/videoSelectors';
import { IconPlay, IconUsers, IconVerified, IconChevronLeft } from '../icons';

export function ArtistPageScreen() {
  const state = useGameStore();
  const artistId = state.selectedArtistId ?? 'player';
  const [showAll, setShowAll] = useState(false);

  const subscribe = useGameStore((s) => s.subscribe);
  const unsubscribe = useGameStore((s) => s.unsubscribe);
  const openSong = useGameStore((s) => s.openSong);
  const openVideo = useGameStore((s) => s.openVideo);
  const openChannel = useGameStore((s) => s.openChannel);
  const setScreen = useGameStore((s) => s.setScreen);

  const isPlayer = artistId === 'player' || artistId === state.player?.id;
  const npc = isPlayer ? null : state.npcs.find((n) => n.id === artistId) ?? null;

  const ref = useMemo(
    () => (isPlayer ? playerRef(state) : npc ? artistRef(state, npc) : null),
    [state, isPlayer, npc],
  );

  const tracks = useMemo(() => artistTracks(state, artistId), [state, artistId]);
  const channel = useMemo(() => channelFor(state, artistId), [state, artistId]);
  const albums = useMemo(
    () => allAlbums(state).filter((a) => a.artistId === (isPlayer ? state.player?.id : artistId)),
    [state, artistId, isPlayer],
  );

  // Chart history for this artist, read off the published global chart.
  const chartHistory = useMemo(
    () =>
      (state.globalSongs ?? [])
        .filter((r) => r.artistId === (isPlayer ? state.player?.id : artistId))
        .sort((a, b) => a.position - b.position),
    [state, artistId, isPlayer],
  );

  if (!ref) {
    return (
      <Panel>
        <EmptyState
          title="Artist not found"
          body="That artist is no longer in the world."
          action={<Button onClick={() => setScreen('dashboard')}>Go back</Button>}
        />
      </Panel>
    );
  }

  const followed = (state.subscriptions ?? []).some(
    (s) => s.artistId === artistId && s.kind === 'artist',
  );

  // The platforms this artist actually does well on, biggest first.
  const platformRows = tracks.length > 0
    ? PLATFORM_LIST.map((p) => {
        let week = 0;
        let lifetime = 0;
        for (const t of tracks) {
          if (!t.state) continue;
          const slice = t.state.byPlatform[p.id];
          if (!slice) continue;
          week += slice.d.reduce((s, v) => s + v, 0);
          lifetime += slice.t;
        }
        return { cfg: p, week, lifetime };
      })
        .filter((r) => r.lifetime > 0)
        .sort((a, b) => b.week - a.week)
    : [];

  const maxPlatformWeek = Math.max(...platformRows.map((r) => r.week), 1);
  const visibleTracks = showAll ? tracks.slice(0, 40) : tracks.slice(0, 10);

  return (
    <div className="pb-16">
      <button
        onClick={() => setScreen('streams')}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink3 hover:text-ink mb-3"
      >
        <IconChevronLeft size={14} />
        Back
      </button>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div
        className="rounded-[16px] border border-line p-5 md:p-6 mb-6"
        style={{ background: 'linear-gradient(120deg, #FFB8002E 0%, #4DA3FF1F 40%, #14161E 100%)' }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <span className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-amber to-fall shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] md:text-[32px] font-bold text-ink leading-tight truncate">
                {ref.name}
              </h1>
              {ref.fame > 62 ? <IconVerified size={18} className="text-new shrink-0" /> : null}
              {isPlayer ? <Tag tone="amber">You</Tag> : null}
            </div>
            <div className="text-[13px] text-ink2 mt-1">
              {ref.genre ? ref.genre.replace('_', ' ') : 'artist'} · {ref.country}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-[12px] text-ink3 num">
              <span>
                <span className="text-ink font-semibold">{compact(ref.monthlyListeners)}</span> monthly listeners
              </span>
              <span>
                <span className="text-ink font-semibold">{compact(ref.subscribers)}</span> subscribers
              </span>
              <span>
                <span className="text-ink font-semibold">{tracks.length}</span> releases
              </span>
              {chartHistory.length > 0 ? (
                <span>
                  <span className="text-ink font-semibold">#{chartHistory[0].position}</span> best global position
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPlayer ? (
              <button
                onClick={() =>
                  followed
                    ? unsubscribe(artistId, 'artist')
                    : subscribe(artistId, ref.name, 'artist')
                }
                className={cn(
                  'h-10 px-5 rounded-full text-[13px] font-bold transition',
                  followed
                    ? 'bg-card border border-line text-ink2 hover:text-ink'
                    : 'bg-amber text-black hover:brightness-110',
                )}
              >
                {followed ? 'Following' : 'Follow'}
              </button>
            ) : null}
            <Button variant="secondary" onClick={() => openChannel(artistId)}>
              <IconPlay size={15} />
              Channel
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="space-y-8">
          {/* ── Latest releases ──────────────────────────────────────── */}
          <section>
            <SectionTitle
              action={
                tracks.length > 10 ? (
                  <button onClick={() => setShowAll(!showAll)} className="text-[12px] text-amber hover:underline">
                    {showAll ? 'Show less' : `Show all ${Math.min(40, tracks.length)}`}
                  </button>
                ) : null
              }
            >
              Releases
            </SectionTitle>
            {tracks.length === 0 ? (
              <Panel>
                <EmptyState title="Nothing released yet" body="No records from this artist have come out." />
              </Panel>
            ) : (
              <SongGrid>
                {visibleTracks.map((t) => (
                  <SongCard
                    key={t.songId}
                    title={t.title}
                    artist={t.artistName}
                    seed={`song|${t.songId}`}
                    isPlayer={t.isPlayer}
                    meta={`${compact(t.song.totalStreams)} streams`}
                    onClick={() => openSong(t.songId)}
                  />
                ))}
              </SongGrid>
            )}
          </section>

          {/* ── Albums ───────────────────────────────────────────────── */}
          {albums.length > 0 ? (
            <section>
              <SectionTitle>Albums &amp; EPs</SectionTitle>
              <SongGrid>
                {albums.map((a) => (
                  <AlbumCard
                    key={a.id}
                    title={a.title}
                    artist={a.artistName}
                    seed={a.coverSeed}
                    type={a.type}
                    meta={`${compact(a.units)} streams`}
                  />
                ))}
              </SongGrid>
            </section>
          ) : null}

          {/* ── Videos ───────────────────────────────────────────────── */}
          {channel && channel.videos.length > 0 ? (
            <section>
              <SectionTitle
                action={
                  <button onClick={() => openChannel(artistId)} className="text-[12px] text-amber hover:underline">
                    All {channel.videos.length}
                  </button>
                }
              >
                Videos
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {channel.videos.slice(0, 6).map((v) => (
                  <VideoCard
                    key={v.id}
                    title={v.title}
                    artist={v.artistName}
                    seed={`thumb|${v.id}`}
                    views={v.views}
                    age={uploadAge(state, v.uploadSerial, v.minuteOfDay)}
                    durationSec={v.durationSec}
                    isPlayer={v.isPlayer}
                    onClick={() => openVideo(v.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          <Panel className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
              Performance by platform
            </div>
            {platformRows.length === 0 ? (
              <p className="text-[12px] text-ink3">No streaming data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {platformRows.map((r) => (
                  <div key={r.cfg.id}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="flex items-center gap-2 text-ink2">
                        <span
                          className="w-4 h-4 rounded-[4px] flex items-center justify-center text-black text-[8px] font-bold"
                          style={{ background: r.cfg.accent }}
                        >
                          {r.cfg.mark}
                        </span>
                        {r.cfg.name}
                      </span>
                      <span className="text-ink num font-semibold">{compact(r.week)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(r.week / maxPlatformWeek) * 100}%`, background: r.cfg.accent }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {chartHistory.length > 0 ? (
            <Panel className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
                Global chart history
              </div>
              <div className="space-y-2">
                {chartHistory.slice(0, 8).map((r) => (
                  <button
                    key={r.itemId}
                    onClick={() => openSong(r.itemId)}
                    className="w-full flex items-center gap-2.5 text-left group"
                  >
                    <span className="w-7 text-right text-[14px] font-bold text-ink num">{r.position}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
                        {r.title}
                      </span>
                      <span className="block text-[11px] text-ink3 num">
                        {r.weeks}w · peak {r.peak}
                        {r.weeksAtNo1 > 0 ? ` · ${r.weeksAtNo1}w at #1` : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel className="p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink3 mb-2">
              <IconUsers size={14} />
              Following
            </div>
            <p className="text-[12px] text-ink2 leading-relaxed">
              {followed
                ? `You follow ${ref.name}. Their new releases and uploads will show up in your notifications.`
                : `Follow ${ref.name} to hear about their releases and uploads as they happen.`}
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/** The per-song platform list, reused by drawers elsewhere. */
export function SongPlatformBars({ songId }: { songId: string }) {
  const state = useGameStore();
  const lines = useMemo(() => songPlatformLines(state, songId), [state, songId]);
  if (lines.length === 0) return <p className="text-[12px] text-ink3">No data.</p>;
  const max = Math.max(...lines.map((l) => l.units), 1);
  return (
    <div className="space-y-2">
      {lines.map((l) => (
        <div key={l.platformId} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-[12px] text-ink2 truncate">{platform(l.platformId)?.name}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(l.units / max) * 100}%`, background: l.accent }} />
          </div>
          <span className="w-14 text-right text-[11px] text-ink3 num shrink-0">{compact(l.units)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── VIDEOS ────────────────────────────────────────────────────────────────
// The video platform's front page. Section rows rather than one grid, so the
// page can say *why* each video is on it: trending here, popular, new,
// recommended, from who you follow, recently uploaded.

import { useMemo, useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { StreamsShell, RailCard, type StreamsTab } from '../streams/StreamsShell';
import { Button, EmptyState, Panel, SectionTitle, Tag } from '../ui/kit';
import { VideoCard } from '../ui/cards';
import { compact } from '@/utils/format';
import { cn } from '@/utils/cn';
import { uploadAge } from '../../store/musicSelectors';
import { videoHome, allChannels } from '../../store/videoSelectors';
import { useScreenCountry } from '../../hooks/useScreenCountry';
import { IconFilm, IconPlay } from '../icons';

export function VideosScreen() {
  const state = useGameStore();
  const [country, setCountry] = useScreenCountry('videos:home');
  const [query, setQuery] = useState('');
  const [vaultNotice, setVaultNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const setScreen = useGameStore((s) => s.setScreen);
  const openVideo = useGameStore((s) => s.openVideo);
  const openChannel = useGameStore((s) => s.openChannel);
  const publishVideo = useGameStore((s) => s.publishVideo);

  const home = useMemo(() => videoHome(state, country), [state, country]);
  const channels = useMemo(() => allChannels(state, 8), [state]);

  /**
   * The video vault: visuals the player has shot that are not on the platform.
   * A video waits here when it was given a future drop date, or when it was
   * shot for a record that has not come out — in which case the record is what
   * it is actually waiting for.
   */
  const vault = useMemo(
    () => (state.videos ?? []).filter((v) => v.isPlayer && !v.published && !v.removed),
    [state.videos],
  );

  const songById = useMemo(
    () => new Map(state.songs.map((s) => [s.id, s])),
    [state.songs],
  );

  const handlePublish = (videoId: string) => {
    const out = publishVideo(videoId);
    setVaultNotice({ ok: out.ok, text: out.message });
  };

  const subscribedCount = (state.subscriptions ?? []).filter((s) => s.kind === 'channel').length;

  const goTab = (t: StreamsTab) => {
    if (t === 'videos') return;
    if (t === 'search') return setScreen('search');
    setScreen('streams');
  };

  const rail = (
    <>
      <RailCard title="Your subscriptions" action="Manage" onAction={() => setScreen('streams')}>
        {subscribedCount === 0 ? (
          <p className="text-[12px] text-ink3 leading-relaxed">
            You are not following any channels yet. Subscribe on a watch page and their uploads
            show up here, and in your recommendations.
          </p>
        ) : (
          <div className="space-y-2">
            {(state.subscriptions ?? [])
              .filter((s) => s.kind === 'channel')
              .slice(0, 6)
              .map((s) => (
                <button
                  key={s.artistId}
                  onClick={() => openChannel(s.artistId)}
                  className="w-full flex items-center gap-2.5 text-left group"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-new to-re shrink-0" />
                  <span className="text-[12px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
                    {s.artistName}
                  </span>
                </button>
              ))}
          </div>
        )}
      </RailCard>

      <RailCard title="Top channels" action="See all" onAction={() => setScreen('streams')}>
        <div className="space-y-2">
          {channels.map((c) => (
            <button
              key={c.artistId}
              onClick={() => openChannel(c.artistId)}
              className="w-full flex items-center gap-2.5 text-left group"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber to-fall shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
                  {c.name}
                </span>
                <span className="block text-[11px] text-ink3 num">
                  {compact(c.subscribers)} subs · {c.videos.length} videos
                </span>
              </span>
            </button>
          ))}
        </div>
      </RailCard>

      <RailCard title="Make a video">
        <p className="text-[12px] text-ink2 leading-relaxed">
          Shoot a visual for any record — released or still in the vault. Budget, director and
          concept all move the result.
        </p>
        <button
          onClick={() => setScreen('create_video')}
          className="mt-3 w-full h-9 rounded-[10px] bg-amber text-black text-[12px] font-bold hover:brightness-110 transition"
        >
          Create a music video
        </button>
      </RailCard>
    </>
  );

  const empty = home.trending.length === 0 && home.recent.length === 0;

  return (
    <StreamsShell
      tab="videos"
      onTab={goTab}
      query={query}
      onQuery={setQuery}
      onSearchSubmit={() => setScreen('search')}
      country={country}
      onCountry={setCountry}
      home={state.player?.country}
      recent={state.recentCountries}
      rail={rail}
      hasAlerts={(state.notifications ?? []).some((n) => !n.read)}
      onBell={() => setScreen('news')}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[24px] font-bold text-ink leading-tight">Videos</h1>
          <p className="text-[13px] text-ink2 mt-1">
            Music videos from across the platform, in {country}.
          </p>
        </div>
        <button
          onClick={() => setScreen('create_video')}
          className="shrink-0 h-9 px-4 rounded-full bg-amber text-black text-[12px] font-bold hover:brightness-110 transition"
        >
          Upload
        </button>
      </div>

      {/* ── Video vault ───────────────────────────────────────────────────
          Shot but not up. Kept above the platform rows because it is the only
          part of this page the player has to act on. */}
      {vault.length > 0 ? (
        <section className="mb-8">
          <SectionTitle
            action={
              <button
                onClick={() => setScreen('create_video')}
                className="text-[12px] text-amber hover:underline"
              >
                Shoot another
              </button>
            }
          >
            🎬 Your video vault
          </SectionTitle>

          <Panel className="p-4">
            <p className="text-[12px] text-ink3 mb-4 leading-relaxed">
              {vault.length === 1 ? '1 video is' : `${vault.length} videos are`} finished but not on
              the platform. Nothing here counts for views until you put it up.
            </p>

            <div className="space-y-2">
              {vault.map((v) => {
                const song = songById.get(v.songId);
                const blockedBySong = !!song && !isSongReleased(song);
                return (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-card px-3 py-2.5"
                  >
                    <span className="w-10 h-10 rounded-[8px] bg-gradient-to-br from-new to-re shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink truncate">{v.title}</div>
                      <div className="text-[11px] text-ink3 num">
                        {v.directorName} · quality {Math.round(v.quality)}
                        {song ? ` · for "${song.title}"` : ''}
                      </div>
                    </div>

                    {blockedBySong ? (
                      <>
                        <Tag tone="amber">Waiting on the record</Tag>
                        <span className="text-[11px] text-ink3 shrink-0">
                          goes up with “{song!.title}”
                        </span>
                      </>
                    ) : (
                      <>
                        <Tag tone="muted">Ready</Tag>
                        <Button size="sm" onClick={() => handlePublish(v.id)}>
                          <IconPlay size={13} />
                          Publish
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {vaultNotice ? (
              <p
                className={cn(
                  'mt-3 text-[12px]',
                  vaultNotice.ok ? 'text-rise' : 'text-fall',
                )}
              >
                {vaultNotice.text}
              </p>
            ) : null}
          </Panel>
        </section>
      ) : null}

      {empty ? (
        <Panel>
          <EmptyState
            icon={<IconFilm size={26} />}
            title="No videos on the platform yet"
            body="Nothing has been uploaded. Run the game clock — NPC artists shoot visuals on their own — or make one yourself."
          />
        </Panel>
      ) : (
        <div className="space-y-8">
          <Row
            title={`Trending in ${country}`}
            rows={home.trending}
            onOpen={openVideo}
            state={state}
          />
          <Row
            title="From channels you follow"
            rows={home.fromSubscribed}
            onOpen={openVideo}
            state={state}
            hint="Subscribe to a channel and their uploads land here."
          />
          <Row
            title="Recommended for you"
            rows={home.recommended.map((r) => ({ video: r.video, badge: r.reason }))}
            onOpen={openVideo}
            state={state}
          />
          <Row title="Popular on the platform" rows={home.popular} onOpen={openVideo} state={state} />
          <Row title="New" rows={home.fresh} onOpen={openVideo} state={state} />
          <Row title="Recently uploaded" rows={home.recent} onOpen={openVideo} state={state} />

          <section>
            <SectionTitle>Channels</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {channels.map((c) => (
                <button
                  key={c.artistId}
                  onClick={() => openChannel(c.artistId)}
                  className="text-left group"
                >
                  <div
                    className="h-16 rounded-[12px] mb-2"
                    style={{ background: `linear-gradient(120deg, #FFB80055, #232632)` }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber to-fall shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
                        {c.name}
                      </span>
                      <span className="block text-[11px] text-ink3 num">
                        {compact(c.subscribers)} subs
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </StreamsShell>
  );
}

function Row({
  title,
  rows,
  onOpen,
  state,
  hint,
}: {
  title: string;
  rows: Array<{ video: import('../../types/game').Video; badge?: string }>;
  onOpen: (id: string) => void;
  state: ReturnType<typeof useGameStore.getState>;
  hint?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {hint && rows.length <= 2 ? (
        <p className="text-[12px] text-ink3 -mt-2 mb-3">{hint}</p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {rows.map((r) => (
          <div key={r.video.id} className="relative">
            <VideoCard
              title={r.video.title}
              artist={r.video.artistName}
              seed={`thumb|${r.video.id}`}
              views={r.video.views}
              age={uploadAge(state, r.video.uploadSerial, r.video.minuteOfDay)}
              durationSec={r.video.durationSec}
              isPlayer={r.video.isPlayer}
              verified={!r.video.isPlayer}
              onClick={() => onOpen(r.video.id)}
            />
            {r.badge ? (
              <span className="absolute -top-1 right-0">
                <Tag tone="accent">{r.badge}</Tag>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

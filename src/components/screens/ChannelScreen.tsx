// ─── CHANNEL ───────────────────────────────────────────────────────────────
// The video side of an artist: banner, avatar, subscriber count, description,
// and their uploads split into all / popular / playlists.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { Button, EmptyState, Panel, Tag } from '../ui/kit';
import { VideoCard } from '../ui/cards';
import { uploadAge } from '../../store/musicSelectors';
import { channelFor } from '../../store/videoSelectors';
import { IconFilm, IconVerified } from '../icons';

type Tab = 'videos' | 'popular' | 'playlists';

export function ChannelScreen() {
  const state = useGameStore();
  const artistId = state.selectedArtistId ?? 'player';
  const channel = useMemo(() => channelFor(state, artistId), [state, artistId]);
  const [tab, setTab] = useState<Tab>('videos');

  const subscribe = useGameStore((s) => s.subscribe);
  const unsubscribe = useGameStore((s) => s.unsubscribe);
  const openVideo = useGameStore((s) => s.openVideo);
  const openArtist = useGameStore((s) => s.openArtist);
  const setScreen = useGameStore((s) => s.setScreen);

  if (!channel) {
    return (
      <Panel>
        <EmptyState
          icon={<IconFilm size={26} />}
          title="Channel not found"
          body="That artist is no longer in the world."
          action={<Button onClick={() => setScreen('videos')}>Back to videos</Button>}
        />
      </Panel>
    );
  }

  const subscribed = (state.subscriptions ?? []).some(
    (s) => s.artistId === channel.artistId && s.kind === 'channel',
  );

  return (
    <div className="pb-16">
      {/* Banner */}
      <div
        className="h-32 md:h-44 rounded-[16px] border border-line"
        style={{ background: 'linear-gradient(120deg, #FFB80055 0%, #4DA3FF33 45%, #14161E 100%)' }}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 -mt-8 px-2 md:px-4">
        <span className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-[#0A0B10] bg-gradient-to-br from-amber to-fall shrink-0" />
        <div className="min-w-0 flex-1 mt-6">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] md:text-[26px] font-bold text-ink truncate">{channel.name}</h1>
            {!channel.isPlayer ? <IconVerified size={17} className="text-new shrink-0" /> : null}
            {channel.isPlayer ? <Tag tone="amber">You</Tag> : null}
          </div>
          <div className="text-[12px] text-ink3 num mt-0.5">
            {compact(channel.subscribers)} subscribers · {channel.videos.length} videos ·{' '}
            {compact(channel.totalViews)} views
            {channel.genre ? ` · ${channel.genre.replace('_', ' ')}` : ''}
          </div>
          <p className="text-[12px] text-ink2 mt-1.5 max-w-xl leading-relaxed">{channel.description}</p>
        </div>
        <div className="flex items-center gap-2 mt-6">
          {!channel.isPlayer ? (
            <button
              onClick={() =>
                subscribed
                  ? unsubscribe(channel.artistId, 'channel')
                  : subscribe(channel.artistId, channel.name, 'channel')
              }
              className={cn(
                'h-10 px-5 rounded-full text-[13px] font-bold transition',
                subscribed
                  ? 'bg-card border border-line text-ink2 hover:text-ink'
                  : 'bg-amber text-black hover:brightness-110',
              )}
            >
              {subscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          ) : (
            <Button onClick={() => setScreen('create_video')}>Create a video</Button>
          )}
          <Button variant="secondary" onClick={() => openArtist(channel.artistId)}>
            Artist page
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mt-6 mb-4 border-b border-line">
        {([
          ['videos', 'Videos'],
          ['popular', 'Popular'],
          ['playlists', 'Playlists'],
        ] as Array<[Tab, string]>).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'h-10 px-4 text-[13px] font-semibold relative transition-colors',
              tab === id ? 'text-ink' : 'text-ink3 hover:text-ink',
            )}
          >
            {label}
            {tab === id ? <span className="absolute left-2 right-2 bottom-0 h-[2px] bg-amber rounded-full" /> : null}
          </button>
        ))}
      </div>

      {channel.videos.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconFilm size={26} />}
            title="No videos on this channel yet"
            body={
              channel.isPlayer
                ? 'Shoot a visual for one of your released records and it will appear here.'
                : 'This artist has not uploaded anything yet.'
            }
            action={
              channel.isPlayer ? <Button onClick={() => setScreen('create_video')}>Create a music video</Button> : undefined
            }
          />
        </Panel>
      ) : tab === 'playlists' ? (
        <div className="space-y-8">
          {channel.playlists.length === 0 ? (
            <p className="text-[13px] text-ink3">No playlists yet.</p>
          ) : (
            channel.playlists.map((p) => (
              <section key={p.title}>
                <h2 className="text-[15px] font-semibold text-ink mb-3">{p.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {p.videos.slice(0, 4).map((v) => (
                    <VideoCard
                      key={v.id}
                      title={v.title}
                      artist={v.artistName}
                      seed={`thumb|${v.id}`}
                      views={v.views}
                      age={uploadAge(state, v.uploadSerial, v.minuteOfDay)}
                      durationSec={v.durationSec}
                      onClick={() => openVideo(v.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(tab === 'popular' ? channel.popular : channel.videos).map((v) => (
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
      )}
    </div>
  );
}

// ─── SEARCH ────────────────────────────────────────────────────────────────
// One box, four result groups: songs, artists, albums and videos. Results come
// out of the live catalogue, so a record that only just came out is findable.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PageTitle, Panel, SectionTitle, EmptyState, SearchInput, SkeletonRows } from '../ui/kit';
import { AlbumCard, ArtistCard, SongCard, SongGrid, VideoCard } from '../ui/cards';
import { compact } from '@/utils/format';
import { searchMusic, uploadAge } from '../../store/musicSelectors';
import { allVideos, videoWeek } from '../../store/videoSelectors';
import { matchesVideo } from '../../sim/video';
import { IconSearch } from '../icons';

export function SearchScreen() {
  const state = useGameStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchMusic(state, query), [state, query]);
  const videos = useMemo(
    () => allVideos(state).filter((v) => matchesVideo(v, query)).sort((a, b) => videoWeek(b) - videoWeek(a)).slice(0, 12),
    [state, query],
  );

  const openSong = useGameStore((s) => s.openSong);
  const openArtist = useGameStore((s) => s.openArtist);
  const openVideo = useGameStore((s) => s.openVideo);

  const empty = query.trim().length > 0 &&
    results.songs.length === 0 &&
    results.artists.length === 0 &&
    results.albums.length === 0 &&
    videos.length === 0;

  const searching = query.trim().length === 0;

  return (
    <div className="pb-16 max-w-5xl">
      <PageTitle subtitle="Songs, artists, albums and videos across every platform.">
        Search
      </PageTitle>

      <SearchInput
        value={query}
        onChange={setQuery}
        autoFocus
        placeholder="Search for a record, an artist, an album or a video…"
        className="mb-6"
      />

      {searching ? (
        <Panel>
          <EmptyState
            icon={<IconSearch size={26} />}
            title="Start typing"
            body="Try an artist name, a song title, or part of an album. Everything in the world is searchable, including records you have not heard yet."
          />
        </Panel>
      ) : empty ? (
        <Panel>
          <EmptyState
            icon={<IconSearch size={26} />}
            title={`Nothing matches "${query}"`}
            body="Check the spelling, or try just part of the name."
          />
        </Panel>
      ) : (
        <div className="space-y-8">
          {results.artists.length > 0 ? (
            <section>
              <SectionTitle>Artists</SectionTitle>
              <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.artists.map((a) => (
                  <ArtistCard
                    key={a.id}
                    name={a.name}
                    seed={`artist|${a.id}`}
                    subtitle={a.country}
                    verified={a.fame > 62}
                    meta={`${compact(a.monthlyListeners)} listeners`}
                    onClick={() => openArtist(a.isPlayer ? 'player' : a.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {results.songs.length > 0 ? (
            <section>
              <SectionTitle>Songs</SectionTitle>
              <SongGrid>
                {results.songs.map((t) => (
                  <SongCard
                    key={t.songId}
                    title={t.title}
                    artist={t.artistName}
                    seed={`song|${t.songId}`}
                    isPlayer={t.isPlayer}
                    meta={t.song.releaseDate}
                    onClick={() => openSong(t.songId)}
                  />
                ))}
              </SongGrid>
            </section>
          ) : null}

          {results.albums.length > 0 ? (
            <section>
              <SectionTitle>Albums &amp; EPs</SectionTitle>
              <SongGrid>
                {results.albums.map((a) => (
                  <AlbumCard
                    key={a.id}
                    title={a.title}
                    artist={a.artistName}
                    seed={a.coverSeed}
                    type={a.type}
                    onClick={() => openArtist(a.artistId)}
                  />
                ))}
              </SongGrid>
            </section>
          ) : null}

          {videos.length > 0 ? (
            <section>
              <SectionTitle>Videos</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {videos.map((v) => (
                  <VideoCard
                    key={v.id}
                    title={v.title}
                    artist={v.artistName}
                    seed={`thumb|${v.id}`}
                    views={v.views}
                    age={uploadAge(state, v.uploadSerial, v.minuteOfDay)}
                    durationSec={v.durationSec}
                    isPlayer={v.isPlayer}
                    verified={!v.isPlayer}
                    onClick={() => openVideo(v.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Shared skeleton so the router can show the same shape while resolving. */
export function SearchSkeleton() {
  return (
    <div className="pb-16 max-w-5xl">
      <PageTitle subtitle="Loading…">Search</PageTitle>
      <SkeletonRows rows={6} />
    </div>
  );
}

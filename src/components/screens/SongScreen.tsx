// ─── SONG ──────────────────────────────────────────────────────────────────
// The record page. Every "click a song" in the app lands here: the Streams
// tables, the platform charts, search, the artist page and the global charts.
//
// It exists because `openSong` used to set `selectedSongId` and change no
// screen at all — ten call sites across five screens were silent no-ops. If you
// add another song link, it points here.

import { useMemo, useState } from 'react';
import { useGameStore, isSongReleased } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { compact, genreLabel } from '@/utils/format';
import { Button, EmptyState, Panel, SectionTitle, Tag } from '../ui/kit';
import { VideoCard } from '../ui/cards';
import { RemixDialog } from './RemixDialog';
import { PLATFORM_LIST, platform } from '../../data/platforms';
import {
  platformCountryBreakdown,
  trackById,
  trackTotals,
  uploadAge,
} from '../../store/musicSelectors';
import { videosForSong } from '../../store/videoSelectors';
import { SongPlatformBars } from './ArtistPageScreen';
import { describeScore, gradeColor, gradeLabel } from '../../sim/studio';
import { IconChevronLeft, IconPlay, IconTrend, IconUsers } from '../icons';
import { VIDEO_TIERS, money as labelMoney } from '../../sim/label';

/**
 * Shooting a video for a record by an artist on the player's label. The
 * label pays (or, on an all-in deal, the artist's own fund does) and the
 * video goes up on the ARTIST's channel — not the player's.
 */
function LabelVideoPanel({ songId, onClose }: { songId: string; onClose: () => void }) {
  const label = useGameStore((s) => s.label);
  const shootLabelVideo = useGameStore((s) => s.shootLabelVideo);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const signee = label?.roster.find((s) => s.releases.includes(songId));
  if (!label || !signee) return null;
  const payer = signee.terms.allIn ? `${signee.name}'s fund (${labelMoney(signee.fund)})` : `${label.name} (${labelMoney(label.cash)})`;
  return (
    <Panel className="p-4 mb-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-ink">Shoot a video for {signee.name}</div>
          <div className="text-[11px] text-ink3">Paid by {payer}. It premieres on {signee.name}'s channel.</div>
        </div>
        <button onClick={onClose} className="text-[12px] text-ink3 hover:text-ink">Close</button>
      </div>
      {signee.videoShoot ? (
        <div className="text-[12px] text-amber">{signee.name} is already on set for another video.</div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-2">
          {VIDEO_TIERS.map((t) => (
            <button key={t.id} onClick={() => { const r = shootLabelVideo(songId, t.id); setMsg({ ok: r.ok, text: r.message }); }}
              className="text-left rounded-[10px] border border-line bg-sidebar hover:bg-cardhover p-3">
              <div className="text-[13px] font-semibold text-ink">{t.label}</div>
              <div className="text-[11px] text-amber num">{labelMoney(t.budget)} · {t.days} days</div>
              <div className="text-[10px] text-ink3">{t.blurb}</div>
            </button>
          ))}
        </div>
      )}
      {msg && <div className={cn('text-[12px]', msg.ok ? 'text-rise' : 'text-fall')}>{msg.text}</div>}
    </Panel>
  );
}

export function SongScreen() {
  const state = useGameStore();
  const songId = state.selectedSongId ?? '';

  const openArtist = useGameStore((s) => s.openArtist);
  const openVideo = useGameStore((s) => s.openVideo);
  const openPlatform = useGameStore((s) => s.openPlatform);
  const openSong = useGameStore((s) => s.openSong);
  const setScreen = useGameStore((s) => s.setScreen);
  const [remixing, setRemixing] = useState(false);
  const [labelShoot, setLabelShoot] = useState(false);

  const track = useMemo(() => (songId ? trackById(state, songId) : undefined), [state, songId]);
  const videos = useMemo(() => (songId ? videosForSong(state, songId) : []), [state, songId]);

  // Where this record came from. A remix or a re-record keeps its own numbers,
  // so the page has to say out loud which one you are looking at — otherwise
  // two rows on the Streams table look like a duplication bug.
  const original = useMemo(
    () => (track?.song.originalSongId ? trackById(state, track.song.originalSongId) : undefined),
    [state, track],
  );

  // Who was reworked *into* this one — the other half of the lineage.
  const derivatives = useMemo(
    () => (state.songs ?? []).filter((s) => s.originalSongId === songId),
    [state, songId],
  );

  const platformId = state.selectedPlatformId ?? PLATFORM_LIST[0].id;
  const countries = useMemo(
    () => (songId ? platformCountryBreakdown(state, songId, platformId, 10) : []),
    [state, songId, platformId],
  );

  // The record's entry on the published global chart, if it has one.
  const chartRow = useMemo(
    () => (state.globalSongs ?? []).find((r) => r.itemId === songId),
    [state, songId],
  );

  if (!track) {
    return (
      <Panel>
        <EmptyState
          icon={<IconPlay size={24} />}
          title="Record not found"
          body="That song is not in the world any more."
          action={<Button onClick={() => setScreen('streams')}>Back to Streams</Button>}
        />
      </Panel>
    );
  }

  const song = track.song;
  // The same seven-day window the charts use. Summing `slice.d` directly would
  // give a fortnight and print a number that contradicts the total beside it.
  const totals = useMemo(() => (songId ? trackTotals(state, songId) : null), [state, songId]);
  const week = totals?.week ?? 0;

  const maxCountry = Math.max(...countries.map((c) => c.units), 1);
  // Who can shoot this record: the player for their own, the player's label
  // for its artists' records, and nobody for anyone else's.
  const labelSignee = state.label?.roster.find((s) => s.releases.includes(songId));
  const canShoot = track.isPlayer || !!labelSignee;
  const shoot = () => (track.isPlayer ? setScreen('create_video') : setLabelShoot(true));

  return (
    <div className="pb-16">
      {remixing ? <RemixDialog song={song} onClose={() => setRemixing(false)} /> : null}
      <button
        onClick={() => setScreen('streams')}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink3 hover:text-ink mb-3"
      >
        <IconChevronLeft size={14} />
        Back to Streams
      </button>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div
        className="rounded-[16px] border border-line p-5 md:p-6 mb-6"
        style={{ background: 'linear-gradient(120deg, #4DA3FF2E 0%, #FFB8001F 45%, #14161E 100%)' }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <span className="w-24 h-24 md:w-28 md:h-28 rounded-[14px] bg-gradient-to-br from-new to-amber shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] md:text-[32px] font-bold text-ink leading-tight truncate">
                {track.title}
              </h1>
              {track.isPlayer ? <Tag tone="amber">You</Tag> : null}
              {song.version === 'remix' ? <Tag tone="accent">Remix</Tag> : null}
              {song.lineage === 'rerecord' ? <Tag tone="muted">Re-record</Tag> : null}
              {song.archivedAt ? <Tag tone="muted">Archived</Tag> : null}
              {!isSongReleased(song) && !song.archivedAt ? <Tag tone="amber">In the vault</Tag> : null}
              {chartRow ? <Tag tone="accent">#{chartRow.position} Global</Tag> : null}
            </div>

            {/* Lineage. Both halves are links, because "which one am I on?" is
                the first question a player asks about a remix. */}
            {original ? (
              <button
                onClick={() => openSong(original.songId)}
                className="text-[12px] text-ink3 mt-1 hover:text-amber transition-colors"
              >
                {song.lineage === 'rerecord'
                  ? `Take ${song.takeNumber ?? 2} of `
                  : song.lineage === 'deluxe'
                    ? 'Deluxe cut of '
                    : 'Remix of '}
                <span className="text-ink2 underline decoration-dotted">{original.title}</span>
              </button>
            ) : null}

            <button
              onClick={() => openArtist(track.artistId)}
              className="text-[13px] text-ink2 mt-1 hover:text-amber transition-colors"
            >
              {track.artistName}
            </button>
            <div className="text-[12px] text-ink3 mt-1">
              {genreLabel(track.genre)} · {track.artistCountry}
              {song.releaseDate ? ` · released ${song.releaseDate}` : ''}
              {song.labelName ? ` · ${song.labelName}` : ''}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-[12px] text-ink3 num">
              <span>
                <span className="text-ink font-semibold">
                  {compact(totals?.lifetime ?? song.totalStreams)}
                </span>{' '}
                streams
              </span>
              <span>
                <span className="text-ink font-semibold">{compact(week)}</span> this week
              </span>
              {song.weeksOut !== undefined ? (
                <span>
                  <span className="text-ink font-semibold">{song.weeksOut}</span>{' '}
                  {song.weeksOut === 1 ? 'week' : 'weeks'} old
                </span>
              ) : null}
              {chartRow ? (
                <span>
                  <span className="text-ink font-semibold">{chartRow.weeks}</span>{' '}
                  {chartRow.weeks === 1 ? 'week' : 'weeks'} on the global chart
                  {chartRow.peak ? ` · peak #${chartRow.peak}` : ''}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Remixing is a move on a record the world already has. An
                unreleased master is re-recorded in the vault instead, so the
                button is not offered where it would have nothing to build on. */}
            {track.isPlayer && isSongReleased(song) ? (
              <Button variant="secondary" onClick={() => setRemixing(true)}>
                <IconTrend size={15} />
                Remix this
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => openArtist(track.artistId)}>
              <IconUsers size={15} />
              Artist
            </Button>
            {videos.length > 0 ? (
              <Button onClick={() => openVideo(videos[0].id)}>
                <IconPlay size={15} />
                Watch video
              </Button>
            ) : canShoot ? (
              <Button variant="secondary" onClick={shoot}>
                <IconPlay size={15} />
                {labelSignee ? `Shoot ${labelSignee.name}'s video` : 'Shoot a video'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {labelShoot && labelSignee ? <LabelVideoPanel songId={songId} onClose={() => setLabelShoot(false)} /> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="space-y-8">
          {/* ── Videos for this record ───────────────────────────────── */}
          <section>
            <SectionTitle
              action={
                <button
                  onClick={() => setScreen('videos')}
                  className="text-[12px] text-amber hover:underline"
                >
                  All videos
                </button>
              }
            >
              Visuals
            </SectionTitle>
            {videos.length === 0 ? (
              <Panel>
                <EmptyState
                  title="No video for this record"
                  body={canShoot ? 'Nobody has shot a visual for it yet. You can be the one who does.' : 'Nobody has shot a visual for it yet.'}
                  action={canShoot ? <Button onClick={shoot}>Shoot a video</Button> : undefined}
                />
              </Panel>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    onClick={() => openVideo(v.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Where it is being streamed ───────────────────────────── */}
          <section>
            <SectionTitle
              action={
                <button
                  onClick={() => openPlatform(platformId)}
                  className="text-[12px] text-amber hover:underline"
                >
                  {platform(platformId)?.name}
                </button>
              }
            >
              Top markets
            </SectionTitle>
            <Panel className="p-4">
              {countries.length === 0 ? (
                <p className="text-[12px] text-ink3">
                  No {platform(platformId)?.purchaseBased ? 'purchases' : 'streams'} recorded yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {countries.map((c) => (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[12px] text-ink2 truncate">{c.country}</span>
                      <span className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${(c.units / maxCountry) * 100}%`,
                            background: platform(platformId)?.accent ?? '#FFB800',
                          }}
                        />
                      </span>
                      <span className="w-14 text-right text-[11px] text-ink3 num shrink-0">
                        {compact(c.units)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          {/* ── The record itself ────────────────────────────────────────
              The number and its sub-scores. This used to be Studio-only, so
              the moment a master left the booth there was nowhere in the app
              that said how good it actually was. It belongs on the record. */}
          <Panel className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
              The record itself
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-[34px] font-bold num leading-none',
                  song.quality >= 74 ? 'text-rise' : song.quality >= 50 ? 'text-amber' : 'text-fall',
                )}
              >
                {Math.round(song.quality)}
              </span>
              <span className="text-[11px] text-ink3">/ 100 overall quality</span>
            </div>
            <p className="text-[13px] text-ink2 mt-2 leading-snug">{describeScore(song.quality)}</p>
            <div className="mt-1">
              <Tag tone={gradeColor(song.quality) === 'green' ? 'up' : gradeColor(song.quality) === 'red' ? 'down' : 'amber'}>
                {gradeLabel(song.quality)}
              </Tag>
            </div>

            {song.lyricsQuality !== undefined ? (
              <div className="mt-4 space-y-2">
                {(
                  [
                    ['Production', song.productionQuality],
                    ['Lyrics', song.lyricsQuality],
                    ['Vocals', song.vocalPerformance],
                    ['Chemistry', song.chemistry],
                  ] as Array<[string, number | undefined]>
                ).map(([label, v]) =>
                  v === undefined ? null : (
                    <div key={label} className="flex items-center gap-2 text-[12px]">
                      <span className="w-[76px] shrink-0 text-ink3">{label}</span>
                      <span className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(3, Math.min(100, v))}%`,
                            background: v >= 74 ? '#2ED573' : v >= 50 ? '#FFB800' : '#FF4757',
                          }}
                        />
                      </span>
                      <span className="w-7 text-right text-ink2 num shrink-0">{Math.round(v)}</span>
                    </div>
                  ),
                )}
              </div>
            ) : null}

            {/* Credits — who actually made it. */}
            {song.producerName || song.ghostwriterName || song.beatName ? (
              <div className="mt-4 pt-3 border-t border-line space-y-1 text-[12px]">
                {song.beatName ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-ink3">Beat</span>
                    <span className="text-ink2 text-right truncate">{song.beatName}</span>
                  </div>
                ) : null}
                {song.producerName ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-ink3">Produced by</span>
                    <span className="text-ink2 text-right truncate">{song.producerName}</span>
                  </div>
                ) : null}
                {song.ghostwriterName ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-ink3">Written by</span>
                    <span className="text-ink2 text-right truncate">{song.ghostwriterName}</span>
                  </div>
                ) : null}
                {song.mood ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-ink3">Mood</span>
                    <span className="text-ink2 text-right capitalize">
                      {song.mood.replace(/_/g, ' ')}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Panel>

          {/* Other versions of this record — the other half of the lineage. */}
          {derivatives.length > 0 ? (
            <Panel className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
                Other versions
              </div>
              <div className="space-y-1.5">
                {derivatives.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => openSong(d.id)}
                    className="w-full text-left px-2.5 py-2 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="text-[12px] text-ink truncate">{d.title}</div>
                    <div className="text-[11px] text-ink3">
                      {d.lineage === 'rerecord'
                        ? `Take ${d.takeNumber ?? 2}`
                        : d.lineage === 'deluxe'
                          ? 'Deluxe cut'
                          : d.lineage === 'remix'
                            ? 'Remix'
                            : 'Version'}
                      {isSongReleased(d)
                        ? ` · ${compact(d.totalStreams)} streams`
                        : ' · not out'}
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel className="p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink3 mb-3">
              <IconTrend size={14} />
              Performance by platform
            </div>
            <SongPlatformBars songId={songId} />
          </Panel>

          {chartRow ? (
            <Panel className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
                On the global chart
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <div className="text-[28px] font-bold text-ink num leading-none">
                    #{chartRow.position}
                  </div>
                  <div className="text-[11px] text-ink3 mt-1">this week</div>
                </div>
                <div className="space-y-1 text-[12px] text-ink2 num">
                  <div>Peak #{chartRow.peak}</div>
                  <div>{chartRow.weeks} weeks on</div>
                  {chartRow.weeksAtNo1 > 0 ? <div>{chartRow.weeksAtNo1}w at #1</div> : null}
                  <div
                    className={cn(
                      'font-semibold',
                      chartRow.movement === 'up' && 'text-rise',
                      chartRow.movement === 'down' && 'text-fall',
                    )}
                  >
                    {chartRow.movement === 'new'
                      ? 'New entry'
                      : chartRow.movement === 'reentry'
                        ? 'Re-entry'
                        : chartRow.movement === 'up'
                          ? `Up ${chartRow.delta}`
                          : chartRow.movement === 'down'
                            ? `Down ${chartRow.delta}`
                            : 'No change'}
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

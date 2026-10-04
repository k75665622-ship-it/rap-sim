// ─── WATCH ─────────────────────────────────────────────────────────────────
// The video page. Desktop is player-left / related-right; on a phone the player
// sits on top, then the info, then the comments, then the related list.
//
// There is no playable file in this build, and the page says so plainly rather
// than showing transport controls that do nothing.

import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { compact, duration } from '@/utils/format';
import { Button, EmptyState, Panel, Tag, gradientFor } from '../ui/kit';
import { uploadAge } from '../../store/musicSelectors';
import {
  channelFor,
  commentThreads,
  relatedVideos,
  remainingComments,
  songForVideo,
  videoById,
  videosForSong,
} from '../../store/videoSelectors';
import { videoTotals } from '../../sim/video';
import { IconFilm, IconThumbDown, IconThumbUp, IconShare, IconChevronLeft, IconPlay, IconVerified } from '../icons';

export function WatchScreen() {
  const state = useGameStore();
  const videoId = state.selectedVideoId ?? '';
  const video = videoById(state, videoId);

  const loadComments = useGameStore((s) => s.loadComments);
  const postComment = useGameStore((s) => s.postComment);
  const reactToVideo = useGameStore((s) => s.reactToVideo);
  const reactToComment = useGameStore((s) => s.reactToComment);
  const deleteComment = useGameStore((s) => s.deleteComment);
  const subscribe = useGameStore((s) => s.subscribe);
  const unsubscribe = useGameStore((s) => s.unsubscribe);
  const recordWatch = useGameStore((s) => s.recordWatch);
  const openVideo = useGameStore((s) => s.openVideo);
  const openArtist = useGameStore((s) => s.openArtist);
  const openChannel = useGameStore((s) => s.openChannel);
  const setScreen = useGameStore((s) => s.setScreen);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [showAllComments, setShowAllComments] = useState(false);

  // Registering the watch is what feeds recommendations, so it happens once.
  useEffect(() => {
    if (videoId) recordWatch(videoId);
  }, [videoId, recordWatch]);

  useEffect(() => {
    if (videoId) loadComments(videoId);
  }, [videoId, loadComments]);

  const channel = useMemo(
    () => (video ? channelFor(state, video.artistId) : null),
    [state, video],
  );
  const song = useMemo(() => (video ? songForVideo(state, video) : undefined), [state, video]);
  const related = useMemo(() => (video ? relatedVideos(state, video.id, 12) : []), [state, video]);
  const otherVideos = useMemo(() => (video ? videosForSong(state, video.songId) : []), [state, video]);
  /**
   * The song's views are the sum over every visual shot for it — there is no
   * `Song.videoViews` field, so reading one would print a permanent zero next
   * to a video that plainly has millions.
   */
  const songViews = useMemo(
    () => otherVideos.reduce((sum, v) => sum + (v.views ?? 0), 0),
    [otherVideos],
  );
  const threads = useMemo(() => (video ? commentThreads(state, video.id) : []), [state, video]);
  const more = video ? remainingComments(state, video.id) : 0;

  const subscribed = (state.subscriptions ?? []).some(
    (s) => video && s.artistId === video.artistId && s.kind === 'channel',
  );
  const reaction = video ? state.videoReactions?.[video.id] : undefined;

  if (!video) {
    return (
      <Panel>
        <EmptyState
          icon={<IconFilm size={26} />}
          title="No video selected"
          body="Pick something from the video platform and it will open here."
          action={<Button onClick={() => setScreen('videos')}>Go to Videos</Button>}
        />
      </Panel>
    );
  }

  const totals = videoTotals(video);
  const sorted = sort === 'top'
    ? [...threads].sort((a, b) => b.comment.likes - a.comment.likes)
    : [...threads].sort((a, b) => b.comment.daySerial - a.comment.daySerial);
  const visible = showAllComments ? sorted : sorted.slice(0, 12);

  return (
    <div className="pb-16">
      <button
        onClick={() => setScreen('videos')}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink3 hover:text-ink mb-3"
      >
        <IconChevronLeft size={14} />
        Back to videos
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        {/* ── Player column ─────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Player frame. The artwork stands in for the footage and the page is
              explicit that there is nothing to play. */}
          <div className="relative w-full aspect-video rounded-[14px] overflow-hidden border border-line bg-black">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background: `linear-gradient(140deg, ${gradientFor(`thumb|${video.id}`)[0]}, ${gradientFor(`thumb|${video.id}`)[1]})`,
              }}
            />
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="w-14 h-14 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/70">
                <IconPlay size={24} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-white">Video unavailable</p>
                <p className="text-[12px] text-white/60 mt-1 max-w-sm leading-relaxed">
                  This build ships the artwork and the numbers, not the footage. The views, likes
                  and comments below are all real.
                </p>
              </div>
            </div>
            {/* Static transport strip — no buttons, because there is nothing to control. */}
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 bg-gradient-to-t from-black/85 to-transparent">
              <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-0 bg-amber" />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-white/70 num">
                <span>0:00 / {duration(video.durationSec)}</span>
                <span>{video.visualStyle}</span>
              </div>
            </div>
          </div>

          {/* Title + actions */}
          <h1 className="text-[20px] md:text-[22px] font-bold text-ink mt-4 leading-snug">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
            <div className="text-[13px] text-ink2 num">
              {compact(video.views)} views · {uploadAge(state, video.uploadSerial, video.minuteOfDay)}
              {video.isPlayer ? <span className="ml-2"><Tag tone="amber">Your video</Tag></span> : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full bg-card border border-line overflow-hidden">
                <button
                  onClick={() => reactToVideo(video.id, 1)}
                  className={cn(
                    'h-9 px-3 flex items-center gap-1.5 text-[12px] font-semibold transition-colors',
                    reaction === 1 ? 'text-amber' : 'text-ink2 hover:text-ink',
                  )}
                >
                  <IconThumbUp size={15} />
                  {compact(video.likes)}
                </button>
                <span className="w-px h-5 bg-line" />
                <button
                  onClick={() => reactToVideo(video.id, -1)}
                  className={cn(
                    'h-9 px-3 flex items-center gap-1.5 text-[12px] font-semibold transition-colors',
                    reaction === -1 ? 'text-fall' : 'text-ink2 hover:text-ink',
                  )}
                >
                  <IconThumbDown size={15} />
                  {compact(video.dislikes)}
                </button>
              </div>
              <Button variant="secondary" size="sm" title="Sharing is not wired up in this build">
                <IconShare size={15} />
                Share
              </Button>
            </div>
          </div>

          {/* Channel row */}
          {channel ? (
            <div className="flex items-center gap-3 mt-4 py-3 border-y border-line">
              <button onClick={() => openChannel(channel.artistId)} className="flex items-center gap-3 min-w-0 text-left">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-amber to-fall shrink-0" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[14px] font-semibold text-ink truncate hover:text-amber transition-colors">
                      {channel.name}
                    </span>
                    {!channel.isPlayer ? <IconVerified size={13} className="text-new shrink-0" /> : null}
                  </span>
                  <span className="block text-[11px] text-ink3 num">
                    {compact(channel.subscribers)} subscribers · {channel.videos.length} videos
                  </span>
                </span>
              </button>
              <button
                onClick={() =>
                  subscribed
                    ? unsubscribe(video.artistId, 'channel')
                    : subscribe(video.artistId, video.artistName, 'channel')
                }
                className={cn(
                  'ml-auto shrink-0 h-9 px-4 rounded-full text-[12px] font-bold transition',
                  subscribed
                    ? 'bg-card border border-line text-ink2 hover:text-ink'
                    : 'bg-amber text-black hover:brightness-110',
                )}
              >
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
          ) : null}

          {/* Description */}
          <div className="mt-4 rounded-[12px] bg-card border border-line p-4">
            <div className="text-[13px] text-ink2 leading-relaxed">
              <p>
                <span className="text-ink font-semibold">{video.songTitle}</span> — {video.concept}.
                Directed by {video.directorName}. Look: {video.visualStyle}.
              </p>
              {song ? (
                <p className="mt-2 num">
                  The record has done <span className="text-ink font-semibold">{compact(song.song.totalStreams)}</span> streams
                  and <span className="text-ink font-semibold">{compact(songViews)}</span> video views.
                </p>
              ) : null}
              <p className="mt-2 text-ink3">
                {totals.prevWeek > 0 ? (
                  <>
                    This week: {compact(totals.week)} views ({totals.growth >= 0 ? '+' : ''}
                    {Math.round(totals.growth * 100)}% on last week).
                  </>
                ) : (
                  <>First week: {compact(totals.week)} views.</>
                )}
              </p>
            </div>
          </div>

          {/* Comments */}
          <section className="mt-6">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-[15px] font-semibold text-ink num">
                {compact(video.commentCount)} comments
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSort('top')}
                  className={cn('text-[12px] font-semibold px-2 py-1 rounded-full', sort === 'top' ? 'text-ink' : 'text-ink3 hover:text-ink')}
                >
                  Top comments
                </button>
                <button
                  onClick={() => setSort('new')}
                  className={cn('text-[12px] font-semibold px-2 py-1 rounded-full', sort === 'new' ? 'text-ink' : 'text-ink3 hover:text-ink')}
                >
                  Newest
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-5">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber to-fall shrink-0" />
              <div className="flex-1 min-w-0">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write your comment here"
                  className="w-full h-10 px-3 rounded-[10px] bg-card border border-line text-ink text-[13px] placeholder:text-ink3 focus:outline-none focus:border-amber"
                />
                {draft.trim() ? (
                  <div className="flex justify-end gap-2 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => setDraft('')}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        postComment(video.id, draft);
                        setDraft('');
                      }}
                    >
                      Comment
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {threads.length === 0 ? (
              <p className="text-[13px] text-ink3">
                No comments loaded yet. This video has {compact(video.commentCount)} on the platform.
              </p>
            ) : (
              <div className="space-y-5">
                {visible.map((t) => (
                  <CommentRow
                    key={t.comment.id}
                    comment={t.comment}
                    replies={t.replies}
                    reaction={state.commentReactions?.[t.comment.id]}
                    onReact={(v) => reactToComment(t.comment.id, v)}
                    onDelete={() => deleteComment(video.id, t.comment.id)}
                    onReply={() => setReplyTo(replyTo === t.comment.id ? null : t.comment.id)}
                    replyOpen={replyTo === t.comment.id}
                    draft={draft}
                    onDraft={setDraft}
                    onSubmitReply={() => {
                      if (!draft.trim()) return;
                      postComment(video.id, draft, t.comment.id);
                      setDraft('');
                      setReplyTo(null);
                    }}
                  />
                ))}
              </div>
            )}

            {(more > 0 || (!showAllComments && sorted.length > 12)) ? (
              <div className="mt-5">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (more > 0) loadComments(video.id);
                    setShowAllComments(true);
                  }}
                >
                  {more > 0 ? `Load more comments (${compact(more)})` : 'Show more'}
                </Button>
              </div>
            ) : null}
          </section>
        </div>

        {/* ── Related column ────────────────────────────────────────── */}
        <aside className="space-y-4">
          {otherVideos.length > 1 ? (
            <div>
              <h2 className="text-[13px] font-semibold text-ink mb-2">More from this record</h2>
              <div className="space-y-2">
                {otherVideos.filter((v) => v.id !== video.id).map((v) => (
                  <RelatedRow key={v.id} state={state} video={v} onOpen={() => openVideo(v.id)} />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="text-[13px] font-semibold text-ink mb-2">Recommendations</h2>
            <div className="space-y-3">
              {related.slice(0, 8).map((v) => (
                <RelatedRow key={v.id} state={state} video={v} onOpen={() => openVideo(v.id)} />
              ))}
            </div>
          </div>

          <Panel className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">Why this is here</div>
            <p className="text-[12px] text-ink2 leading-relaxed">
              Recommendations mix what you subscribe to, what you have watched, what is local to
              your country, and what is rising — not just the biggest videos on the platform.
            </p>
            <button
              onClick={() => openArtist(video.artistId)}
              className="mt-3 text-[12px] text-amber hover:underline"
            >
              Open {video.artistName}'s page
            </button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

// ─── PIECES ────────────────────────────────────────────────────────────────

function RelatedRow({
  state,
  video,
  onOpen,
}: {
  state: ReturnType<typeof useGameStore.getState>;
  video: import('../../types/game').Video;
  onOpen: () => void;
}) {
  return (
    <button onClick={onOpen} className="w-full flex gap-2.5 text-left group">
      <div className="relative w-[128px] shrink-0 aspect-video rounded-[8px] overflow-hidden border border-line">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(140deg, ${gradientFor(`thumb|${video.id}`)[0]}, ${gradientFor(`thumb|${video.id}`)[1]})`,
          }}
        />
        <span className="absolute bottom-1 right-1 px-1 h-4 rounded bg-black/80 text-white text-[10px] font-semibold flex items-center num">
          {duration(video.durationSec)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-ink line-clamp-2 leading-snug group-hover:text-amber transition-colors">
          {video.title}
        </div>
        <div className="text-[11px] text-ink3 truncate mt-0.5">{video.artistName}</div>
        <div className="text-[11px] text-ink3 num">
          {compact(video.views)} views · {uploadAge(state, video.uploadSerial, video.minuteOfDay)}
        </div>
      </div>
    </button>
  );
}

function CommentRow({
  comment,
  replies,
  reaction,
  onReact,
  onDelete,
  onReply,
  replyOpen,
  draft,
  onDraft,
  onSubmitReply,
}: {
  comment: import('../../types/game').VideoComment;
  replies: import('../../types/game').VideoComment[];
  reaction?: 1 | -1;
  onReact: (v: 1 | -1) => void;
  onDelete: () => void;
  onReply: () => void;
  replyOpen: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSubmitReply: () => void;
}) {
  const state = useGameStore();
  return (
    <div className="flex gap-3">
      <span
        className={cn(
          'w-9 h-9 rounded-full shrink-0',
          comment.isPlayer ? 'bg-gradient-to-br from-amber to-fall' : 'bg-gradient-to-br from-new to-re',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-ink">{comment.authorName}</span>
          {comment.authorIsArtist ? <Tag tone="accent">Artist</Tag> : null}
          {comment.isPlayer ? <Tag tone="amber">You</Tag> : null}
          <span className="text-[11px] text-ink3 num">
            {uploadAge(state, comment.daySerial, comment.minuteOfDay)}
          </span>
        </div>
        <p className="text-[13px] text-ink2 mt-1 leading-relaxed">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={() => onReact(1)}
            className={cn('flex items-center gap-1 text-[11px]', reaction === 1 ? 'text-amber' : 'text-ink3 hover:text-ink')}
          >
            <IconThumbUp size={13} />
            {compact(comment.likes)}
          </button>
          <button
            onClick={() => onReact(-1)}
            className={cn('flex items-center gap-1 text-[11px]', reaction === -1 ? 'text-fall' : 'text-ink3 hover:text-ink')}
          >
            <IconThumbDown size={13} />
            {compact(comment.dislikes)}
          </button>
          <button onClick={onReply} className="text-[11px] text-ink3 hover:text-ink">
            Reply
          </button>
          {comment.isPlayer ? (
            <button onClick={onDelete} className="text-[11px] text-fall/80 hover:text-fall">
              Delete
            </button>
          ) : null}
        </div>

        {replies.length > 0 ? (
          <div className="mt-3 space-y-3 pl-3 border-l border-line">
            {replies.map((r) => (
              <div key={r.id} className="flex gap-2.5">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-new to-re shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-ink">{r.authorName}</span>
                    <span className="text-[11px] text-ink3 num">
                      {uploadAge(state, r.daySerial, r.minuteOfDay)}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink2 mt-0.5 leading-relaxed">{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {replyOpen ? (
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder="Add a reply…"
              className="flex-1 h-9 px-3 rounded-[10px] bg-card border border-line text-ink text-[12px] placeholder:text-ink3 focus:outline-none focus:border-amber"
            />
            <Button size="sm" onClick={onSubmitReply} disabled={!draft.trim()}>
              Reply
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

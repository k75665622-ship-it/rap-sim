// ─── SOCIAL: A POST, OPENED ────────────────────────────────────────────────
// The full post with its live numbers, the author (follow, unfollow, block),
// and the comment section — like and reply to anything, load more as the
// comments keep coming in.

import { useState } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { SlidePanel, Button } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import { APP_META, kindDef, type PostKind, type SocialApp } from '../../sim/social';
import { liveCounts, minutesAgo } from '../../sim/socialLive';
import type { SocialComment, SocialPost } from '../../types/game';
import { IconVerified } from '../icons';
import { Avatar, RichText, ToneTag, handleOf } from './shared';

function CommentRow({
  c, depth, onLike, onReply, onOpenArtist, blocked,
}: {
  c: SocialComment; depth: number; onLike: (id: string) => void; onReply: (c: SocialComment) => void; onOpenArtist: (id: string) => void; blocked: Set<string>;
}) {
  if (blocked.has(c.authorId)) return null;
  const person = !c.authorId.startsWith('fan:') && c.authorId !== 'player';
  return (
    <div className={cn('flex gap-2.5', depth > 0 && 'ml-9 mt-2.5')}>
      <button onClick={() => person && onOpenArtist(c.authorId)} className={cn(!person && 'cursor-default')}><Avatar name={c.authorName} seed={c.authorId} size={depth ? 24 : 30} /></button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[12px] font-semibold', c.authorId === 'player' ? 'text-amber' : 'text-ink')}>{c.authorId === 'player' ? 'You' : c.authorName}</span>
          <ToneTag tone={c.tone} />
        </div>
        <RichText text={c.content} className="text-[13px] text-ink2 mt-0.5 leading-snug" />
        <div className="flex items-center gap-4 mt-1 text-[11px] text-ink3">
          <button onClick={() => onLike(c.id)} className={cn('hover:text-[#F91880]', c.liked && 'text-[#F91880]')}>{c.liked ? '♥' : '♡'} {compact(c.likes)}</button>
          {c.authorId !== 'player' && depth === 0 && <button onClick={() => onReply(c)} className="hover:text-ink">Reply</button>}
        </div>
        {(c.replies ?? []).map((r) => <CommentRow key={r.id} c={r} depth={depth + 1} onLike={onLike} onReply={onReply} onOpenArtist={onOpenArtist} blocked={blocked} />)}
      </div>
    </div>
  );
}

export function PostPanel({ post, songTitle, onClose, now, verified }: { post: SocialPost | null; songTitle?: string; onClose: () => void; now: number; verified: boolean }) {
  const likePost = useGameStore((s) => s.likePost);
  const repostPost = useGameStore((s) => s.repostPost);
  const quotePost = useGameStore((s) => s.quotePost);
  const commentOnPost = useGameStore((s) => s.commentOnPost);
  const likeComment = useGameStore((s) => s.likeComment);
  const loadMoreComments = useGameStore((s) => s.loadMoreComments);
  const openArtist = useGameStore((s) => s.openArtist);
  const following = useGameStore((s) => s.following);
  const blockedList = useGameStore((s) => s.blocked);
  const followAccount = useGameStore((s) => s.followAccount);
  const unfollowAccount = useGameStore((s) => s.unfollowAccount);
  const blockAccount = useGameStore((s) => s.blockAccount);
  const unblockAccount = useGameStore((s) => s.unblockAccount);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<SocialComment | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [menu, setMenu] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null);

  if (!post) return null;
  const app = post.platform as SocialApp;
  const meta = APP_META[app] ?? APP_META.chirp;
  const k = kindDef(post.kind as PostKind);
  const person = post.authorId !== 'player' && !post.authorId.startsWith('fan:') && post.authorId !== 'scene_watch';
  const live = liveCounts(post, now);
  const isFollowing = (following ?? []).includes(post.authorId);
  const blocked = new Set(blockedList ?? []);
  const isBlocked = blocked.has(post.authorId);
  const settling = post.target && post.postedMinute !== undefined && live.likes < post.target.likes * 0.97;

  function send() {
    if (!text.trim() || !post) return;
    const r = quoting ? quotePost(post.id, text) : commentOnPost(post.id, text, replyTo?.id);
    setFlash(r);
    setText('');
    setReplyTo(null);
    setQuoting(false);
  }

  const close = () => { setFlash(null); setReplyTo(null); setQuoting(false); setText(''); setMenu(false); onClose(); };

  return (
    <SlidePanel
      open={!!post}
      onClose={close}
      width={480}
      title={<span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />{meta.name}</span>}
      subtitle={`${k.emoji} ${k.label} · ${minutesAgo(now, post.postedMinute, post.daySerial)}`}
      footer={
        <div className="space-y-2">
          {(replyTo || quoting) && (
            <div className="flex items-center justify-between text-[11px] text-ink3">
              <span>{quoting ? 'Quote post — your words go on top, on Chirp.' : `Replying to ${replyTo!.authorName}`}</span>
              <button className="hover:text-ink" onClick={() => { setReplyTo(null); setQuoting(false); }}>Cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              maxLength={280}
              placeholder={quoting ? 'Add your take…' : replyTo ? `Reply to ${replyTo.authorName}…` : 'Add a comment…'}
              className="flex-1 h-10 rounded-[10px] bg-card border border-line px-3 text-[13px] text-ink outline-none focus:border-amber"
            />
            <Button onClick={send} disabled={!text.trim()}>{quoting ? 'Quote' : 'Send'}</Button>
          </div>
        </div>
      }
    >
      <div className="p-4 border-b border-line">
        <div className="flex items-center gap-3">
          <button onClick={() => person && (close(), openArtist(post.authorId))} className={cn(!person && 'cursor-default')}><Avatar name={post.authorName} seed={post.authorId} size={44} /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[15px] font-semibold text-ink truncate">{post.authorId === 'player' ? `${post.authorName} (you)` : post.authorName}{verified && <IconVerified size={15} className="text-[#4DA3FF] shrink-0" />}</div>
            <div className="text-[12px] text-ink3">{handleOf(post.authorName)}</div>
          </div>
          {person && (
            <div className="relative flex items-center gap-1.5">
              {!isBlocked && (
                <button
                  onClick={() => setFlash(isFollowing ? unfollowAccount(post.authorId) : followAccount(post.authorId))}
                  className={cn('h-8 px-3.5 rounded-full text-[12px] font-semibold', isFollowing ? 'border border-line text-ink' : 'bg-ink text-bg')}
                >{isFollowing ? 'Following' : 'Follow'}</button>
              )}
              <button onClick={() => setMenu((m) => !m)} className="w-8 h-8 rounded-full border border-line text-ink2 hover:text-ink" aria-label="More">⋯</button>
              {menu && (
                <div className="absolute right-0 top-10 z-10 w-44 rounded-[12px] border border-line bg-sidebar shadow-xl overflow-hidden">
                  <button onClick={() => { setMenu(false); close(); openArtist(post.authorId); }} className="w-full text-left px-3 py-2.5 text-[13px] text-ink hover:bg-white/5">View profile</button>
                  {isBlocked
                    ? <button onClick={() => { unblockAccount(post.authorId); setMenu(false); setFlash({ ok: true, message: `Unblocked ${post.authorName}.` }); }} className="w-full text-left px-3 py-2.5 text-[13px] text-ink hover:bg-white/5">Unblock</button>
                    : <button onClick={() => { setFlash(blockAccount(post.authorId)); setMenu(false); }} className="w-full text-left px-3 py-2.5 text-[13px] text-fall hover:bg-white/5">Block {post.authorName.split(' ')[0]}</button>}
                </div>
              )}
            </div>
          )}
          {post.viral && <span className="px-2 h-[22px] rounded-full bg-fall/15 text-fall text-[11px] font-bold flex items-center">🔥 Viral</span>}
        </div>
        <RichText text={post.content} className="text-[16px] text-ink mt-3 leading-relaxed" />
        {songTitle && <div className="mt-3 inline-flex items-center gap-2 rounded-[10px] border border-line bg-white/[0.03] px-3 py-2 text-[13px] text-ink2"><span className="text-amber">♫</span> {songTitle}</div>}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => <button key={t.id} onClick={() => t.id !== 'player' && (close(), openArtist(t.id))} className="px-2 h-6 rounded-full bg-[#4DA3FF]/12 text-[#4DA3FF] text-[11px] font-semibold">@{t.name}</button>)}
          </div>
        )}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            ['Likes', live.likes],
            ['Reposts', live.shares],
            ['Comments', live.comments],
            [live.views ? 'Views' : 'Reach', live.views || live.likes * 9],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-[10px] bg-white/[0.03] py-2">
              <div className="text-[15px] font-semibold text-ink num">{compact(v as number)}</div>
              <div className="text-[10px] text-ink3 uppercase tracking-wider">{l}</div>
            </div>
          ))}
        </div>
        {settling && <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rise"><span className="w-1.5 h-1.5 rounded-full bg-rise rl-live-dot" /> Still climbing — numbers update as the clock runs.</div>}
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => likePost(post.id)} className={cn(post.liked && 'text-[#F91880]')}>{post.liked ? '♥ Liked' : '♡ Like'}</Button>
          {post.authorId !== 'player' && <Button size="sm" variant="secondary" onClick={() => setFlash(repostPost(post.id))} disabled={post.reposted}>↻ {post.reposted ? 'Reposted' : 'Repost'}</Button>}
          <Button size="sm" variant="secondary" onClick={() => { setQuoting(true); setReplyTo(null); }}>❝ Quote</Button>
        </div>
        {flash && <div className={cn('mt-3 text-[12px] rounded-[10px] px-3 py-2', flash.ok ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall')}>{flash.message}</div>}
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-semibold text-ink2 uppercase tracking-wider">Comments · {compact(live.comments)}</div>
          <div className="text-[11px] text-ink3">Top first</div>
        </div>
        {post.comments.length === 0 && <div className="text-[13px] text-ink3">No comments yet.</div>}
        {[...post.comments].sort((a, b) => (b.authorId === 'player' ? 1 : 0) - (a.authorId === 'player' ? 1 : 0) || b.likes - a.likes).map((c) => (
          <CommentRow key={c.id} c={c} depth={0} blocked={blocked} onLike={(id) => likeComment(post.id, id)} onReply={(c2) => { setReplyTo(c2); setQuoting(false); }} onOpenArtist={(id) => { close(); openArtist(id); }} />
        ))}
        {live.comments > post.comments.length && post.comments.length < 80 && (
          <button onClick={() => loadMoreComments(post.id)} className="w-full h-9 rounded-[10px] border border-line text-[12px] text-ink2 hover:text-ink hover:bg-white/[0.03]">
            View more comments ({compact(live.comments - post.comments.length)} more)
          </button>
        )}
      </div>
    </SlidePanel>
  );
}

// ─── SOCIAL: SHARED PIECES ─────────────────────────────────────────────────
// Avatars, ages, tone tags and the four ways a post looks — a Chirp row, a
// Snapgram photo, a Clip video tile and a Circle community card.

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { compact, initials } from '@/utils/format';
import { gradientFor } from '../ui/kit';
import { IconComment, IconVerified } from '../icons';
import { APP_META, kindDef, type PostKind, type SocialApp } from '../../sim/social';
import type { SocialComment, SocialPost } from '../../types/game';

export function handleOf(name: string): string {
  if (name.startsWith('@')) return name;
  return '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function postAge(post: Pick<SocialPost, 'daySerial' | 'timestamp'>, nowSerial: number): string {
  if (typeof post.daySerial === 'number') {
    const days = nowSerial - post.daySerial;
    if (days <= 0) return 'today';
    if (days === 1) return '1d';
    if (days < 7) return `${days}d`;
    if (days < 60) return `${Math.floor(days / 7)}w`;
    return `${Math.floor(days / 30)}mo`;
  }
  return 'earlier';
}

export function Avatar({ name, seed, size = 40, ring }: { name: string; seed?: string; size?: number; ring?: string }) {
  const [a, b] = gradientFor(seed ?? name);
  const fan = name.startsWith('@');
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold text-black/75 select-none"
      style={{
        width: size,
        height: size,
        background: fan ? '#2A2D38' : `linear-gradient(135deg, ${a}, ${b})`,
        color: fan ? '#9AA0AE' : undefined,
        fontSize: Math.max(9, size * 0.32),
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
      aria-hidden="true"
    >
      {initials(name.replace(/^@/, ''))}
    </div>
  );
}

export function AppMark({ app, size = 28 }: { app: SocialApp; size?: number }) {
  const m = APP_META[app];
  return (
    <div
      className="shrink-0 flex items-center justify-center font-black text-black"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: m.color, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {m.mark}
    </div>
  );
}

const TONE: Record<string, { label: string; cls: string }> = {
  stan: { label: 'Stan', cls: 'bg-amber/15 text-amber' },
  love: { label: 'Fan', cls: 'bg-rise/15 text-rise' },
  hater: { label: 'Hater', cls: 'bg-fall/15 text-fall' },
  troll: { label: 'Troll', cls: 'bg-white/10 text-ink3' },
  rival: { label: 'Rival fan', cls: 'bg-re/15 text-re' },
  artist: { label: 'Artist', cls: 'bg-new/15 text-new' },
};

export function ToneTag({ tone }: { tone?: SocialComment['tone'] }) {
  const t = tone ? TONE[tone] : undefined;
  if (!t) return null;
  return <span className={cn('inline-flex items-center px-1.5 h-[16px] rounded-full text-[9px] font-bold uppercase tracking-wide', t.cls)}>{t.label}</span>;
}

/** Text with @mentions highlighted. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/g);
  return (
    <p className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((p, i) => (p.startsWith('@') || p.startsWith('#') ? <span key={i} className="text-[#4DA3FF]">{p}</span> : <span key={i}>{p}</span>))}
    </p>
  );
}

function KindChip({ kind, app }: { kind?: string; app: SocialApp }) {
  if (!kind) return null;
  const k = kindDef(kind as PostKind);
  if (k.id === 'thought' || k.id === 'photo') return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 h-[18px] rounded-full" style={{ background: `${APP_META[app].color}22`, color: APP_META[app].color }}>
      {k.emoji} {k.label}
    </span>
  );
}

export interface PostCardProps {
  post: SocialPost;
  nowSerial: number;
  songTitle?: string;
  repostedFrom?: SocialPost;
  quoted?: SocialPost;
  onOpen: () => void;
  onLike: () => void;
  onRepost: () => void;
}

function Byline({ post, nowSerial, verified }: { post: SocialPost; nowSerial: number; verified: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] min-w-0">
      <span className="font-semibold text-ink truncate">{post.authorName}</span>
      {verified && <IconVerified size={13} className="text-[#4DA3FF] shrink-0" />}
      {!post.authorName.startsWith('@') && <span className="text-ink3 truncate">{handleOf(post.authorName)}</span>}
      <span className="text-ink3 shrink-0">· {postAge(post, nowSerial)}</span>
    </div>
  );
}

function Actions({ post, onOpen, onLike, onRepost, dense }: { post: SocialPost; onOpen: () => void; onLike: () => void; onRepost: () => void; dense?: boolean }) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <div className={cn('flex items-center text-ink3 text-[12px]', dense ? 'gap-4' : 'gap-7')}>
      <button onClick={stop(onOpen)} className="flex items-center gap-1.5 hover:text-[#4DA3FF]" aria-label="Comments">
        <IconComment size={15} /> <span className="num">{compact(post.comments.length)}</span>
      </button>
      <button onClick={stop(onRepost)} className={cn('flex items-center gap-1.5 hover:text-rise', post.reposted && 'text-rise')} aria-label="Repost">
        <span className="text-[15px] leading-none">↻</span> <span className="num">{compact(post.shares)}</span>
      </button>
      <button onClick={stop(onLike)} className={cn('flex items-center gap-1.5 hover:text-[#E93D82]', post.liked && 'text-[#E93D82]')} aria-label="Like">
        <span className="text-[15px] leading-none">{post.liked ? '♥' : '♡'}</span> <span className="num">{compact(post.likes)}</span>
      </button>
      {typeof post.views === 'number' && post.views > 0 && <span className="flex items-center gap-1.5"><span className="text-[13px]">▷</span><span className="num">{compact(post.views)}</span></span>}
    </div>
  );
}

function SongChip({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <div className="mt-2.5 inline-flex items-center gap-2 rounded-[10px] border border-line bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-ink2">
      <span className="text-amber">♫</span> {title}
    </div>
  );
}

function ViralBadge({ post }: { post: SocialPost }) {
  if (!post.viral) return null;
  return <span className="inline-flex items-center px-1.5 h-[18px] rounded-full text-[10px] font-bold bg-fall/15 text-fall">🔥 Viral</span>;
}

/** Chirp: the timeline row. */
export function ChirpRow(p: PostCardProps) {
  const { post, nowSerial } = p;
  const verified = !post.authorId.startsWith('fan:') && post.authorId !== 'player';
  const showRepost = post.repostOf && p.repostedFrom;
  const shown = showRepost ? p.repostedFrom! : post;
  return (
    <article onClick={p.onOpen} className="px-4 py-3.5 border-b border-line hover:bg-white/[0.02] transition-colors cursor-pointer">
      {showRepost && <div className="text-[11px] text-ink3 mb-1.5 ml-[52px]">↻ {post.authorId === 'player' ? 'You' : post.authorName} reposted</div>}
      <div className="flex gap-3">
        <Avatar name={shown.authorName} seed={shown.authorId} />
        <div className="min-w-0 flex-1">
          <Byline post={shown} nowSerial={nowSerial} verified={verified} />
          <div className="flex items-center gap-1.5 mt-0.5"><KindChip kind={shown.kind} app="chirp" /><ViralBadge post={shown} /></div>
          <RichText text={shown.content} className="text-[14px] text-ink mt-1 leading-relaxed" />
          {p.quoted && (
            <div className="mt-2.5 rounded-[12px] border border-line p-3">
              <div className="flex items-center gap-2 text-[12px]"><Avatar name={p.quoted.authorName} seed={p.quoted.authorId} size={18} /><span className="font-semibold text-ink">{p.quoted.authorName}</span></div>
              <RichText text={p.quoted.content} className="text-[13px] text-ink2 mt-1" />
            </div>
          )}
          <SongChip title={p.songTitle} />
          {shown.tags && shown.tags.length > 0 && <div className="mt-2 text-[11px] text-ink3">with {shown.tags.map((t) => t.name).join(', ')}</div>}
          <div className="mt-2.5"><Actions post={post} onOpen={p.onOpen} onLike={p.onLike} onRepost={p.onRepost} /></div>
        </div>
      </div>
    </article>
  );
}

/** Snapgram: the photo card. */
export function PhotoCard(p: PostCardProps) {
  const { post, nowSerial } = p;
  const [a, b] = gradientFor(post.id);
  const k = kindDef(post.kind as PostKind);
  return (
    <article onClick={p.onOpen} className="bg-card border border-line rounded-[14px] overflow-hidden cursor-pointer hover:border-[#E93D82]/50 transition">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={post.authorName} seed={post.authorId} size={30} ring={post.authorId === 'player' ? '#E93D82' : undefined} />
        <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-ink truncate">{post.authorName}</div><div className="text-[10px] text-ink3">{postAge(post, nowSerial)}{post.kind === 'carousel' ? ' · 1/10' : ''}</div></div>
        <ViralBadge post={post} />
      </div>
      <div className="relative aspect-square" style={{ background: `linear-gradient(${(post.id.charCodeAt(0) * 7) % 360}deg, ${a}, ${b})` }}>
        <div className="absolute inset-0 flex items-center justify-center text-[56px] opacity-80 select-none">{k.app === 'snapgram' ? k.emoji : '📸'}</div>
        {p.songTitle && <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/55 backdrop-blur px-2 py-1 text-[11px] text-white truncate">♫ {p.songTitle}</div>}
      </div>
      <div className="px-3 py-2.5">
        <Actions post={post} onOpen={p.onOpen} onLike={p.onLike} onRepost={p.onRepost} dense />
        <div className="mt-1.5 text-[12px] text-ink leading-snug line-clamp-2"><span className="font-semibold mr-1">{post.authorName}</span>{post.content}</div>
        {post.comments.length > 0 && <div className="mt-1 text-[11px] text-ink3">View all {post.comments.length} comments</div>}
      </div>
    </article>
  );
}

/** Clip: the vertical video tile. */
export function ClipTile(p: PostCardProps) {
  const { post } = p;
  const [a, b] = gradientFor(post.id + 'clip');
  const k = kindDef(post.kind as PostKind);
  return (
    <article onClick={p.onOpen} className="relative rounded-[14px] overflow-hidden cursor-pointer group aspect-[9/14]" style={{ background: `linear-gradient(160deg, ${a}, ${b})` }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute top-2 left-2 flex gap-1"><span className="px-1.5 h-[18px] rounded-full bg-black/50 text-white text-[10px] font-semibold flex items-center">{k.emoji} {k.app === 'clip' ? k.label : 'Clip'}</span>{post.viral && <span className="px-1.5 h-[18px] rounded-full bg-fall text-white text-[10px] font-bold flex items-center">🔥</span>}</div>
      <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-black/35 flex items-center justify-center text-white text-xl opacity-80 group-hover:scale-110 transition">▶</div></div>
      <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold"><Avatar name={post.authorName} seed={post.authorId} size={18} />{post.authorName}</div>
        <div className="text-[11px] leading-snug mt-1 line-clamp-2 opacity-95">{post.content}</div>
        {p.songTitle && <div className="text-[10px] mt-1 opacity-80 truncate">♫ {p.songTitle}</div>}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] opacity-90">
          <span>▷ {compact(post.views ?? post.likes * 12)}</span>
          <button onClick={(e) => { e.stopPropagation(); p.onLike(); }} className={cn(post.liked && 'text-[#FF5C93]')}>{post.liked ? '♥' : '♡'} {compact(post.likes)}</button>
          <span>💬 {post.comments.length}</span>
        </div>
      </div>
    </article>
  );
}

/** Circle: the community card. */
export function CircleCard(p: PostCardProps) {
  const { post, nowSerial } = p;
  const k = kindDef(post.kind as PostKind);
  return (
    <article onClick={p.onOpen} className="bg-card border border-line rounded-[14px] p-4 cursor-pointer hover:border-[#F5B301]/50 transition">
      <div className="flex items-center gap-2.5">
        <Avatar name={post.authorName} seed={post.authorId} size={34} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink truncate">{post.authorName}</div>
          <div className="text-[11px] text-ink3">{post.authorId === 'player' ? 'Your circle' : 'Community'} · {postAge(post, nowSerial)}</div>
        </div>
        {k.app === 'circle' && <span className="text-[10px] font-semibold px-2 h-[20px] rounded-full bg-[#F5B301]/15 text-[#F5B301] flex items-center">{k.emoji} {k.label}</span>}
      </div>
      <RichText text={post.content} className="text-[14px] text-ink mt-3 leading-relaxed" />
      <SongChip title={p.songTitle} />
      <div className="mt-3 flex items-center gap-2 text-[12px]">
        <button onClick={(e) => { e.stopPropagation(); p.onLike(); }} className={cn('px-2.5 h-7 rounded-full border border-line hover:bg-cardhover', post.liked ? 'text-[#F5B301] border-[#F5B301]/50' : 'text-ink2')}>🙌 {compact(post.likes)}</button>
        <span className="px-2.5 h-7 rounded-full border border-line text-ink2 flex items-center">💬 {post.comments.length} replies</span>
      </div>
    </article>
  );
}

export function FeedSection({ children, app }: { children: ReactNode; app: SocialApp }) {
  if (app === 'snapgram') return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-3">{children}</div>;
  if (app === 'clip') return <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3">{children}</div>;
  if (app === 'circle') return <div className="space-y-3 p-3">{children}</div>;
  return <div>{children}</div>;
}

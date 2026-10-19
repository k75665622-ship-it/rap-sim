// ─── SOCIAL: SHARED PIECES ─────────────────────────────────────────────────
// Avatars, times, tone tags and the four ways a post looks — a Chirp row, a
// Snapgram photo, a Clip video and a Circle community card. Every number on
// a card is read live, so likes and views climb while you watch.

import { useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { compact, initials } from '@/utils/format';
import { gradientFor } from '../ui/kit';
import { IconComment, IconVerified } from '../icons';
import { APP_META, kindDef, type PostKind, type SocialApp } from '../../sim/social';
import { liveCounts, minutesAgo, visibleComments } from '../../sim/socialLive';
import type { SocialComment, SocialPost } from '../../types/game';
import { Character } from '../avatar/Character';
import { usePortrait } from '../avatar/usePortrait';

export function handleOf(name: string): string {
  if (name.startsWith('@')) return name;
  return '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function Avatar({ name, seed, size = 40, ring, story }: { name: string; seed?: string; size?: number; ring?: string; story?: 'new' | 'seen' }) {
  const [a, b] = gradientFor(seed ?? name);
  const fan = name.startsWith('@');
  const look = usePortrait(fan ? undefined : seed);
  const inner = look ? (
    <div
      className="rounded-full shrink-0 overflow-hidden select-none"
      style={{ width: size, height: size, background: `radial-gradient(circle at 50% 30%, ${a}, ${b} 95%)`, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      aria-hidden="true"
    >
      <Character look={look} view="bust" className="w-full h-full" />
    </div>
  ) : (
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
  if (!story) return inner;
  return (
    <div className="rounded-full p-[2px] shrink-0" style={{ background: story === 'new' ? 'conic-gradient(#F5B301, #E93D82, #7B61FF, #F5B301)' : '#3A3D48' }}>
      <div className="rounded-full p-[2px] bg-[#0C0D12]">{inner}</div>
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

/** Text with @mentions and #tags highlighted. */
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
  now: number;
  nowSerial: number;
  songTitle?: string;
  repostedFrom?: SocialPost;
  quoted?: SocialPost;
  verified: boolean;
  following?: boolean;
  /** Somebody you know liked it — "Liked by X and 12,304 others". */
  likedBy?: string;
  hasStory?: 'new' | 'seen';
  onOpen: () => void;
  onLike: () => void;
  onRepost: () => void;
  onFollow?: () => void;
  onAuthor?: () => void;
}

const stop = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn?.(); };

function Ago({ post, now, nowSerial }: { post: SocialPost; now: number; nowSerial: number }) {
  return <>{minutesAgo(now, post.postedMinute, post.daySerial, nowSerial)}</>;
}

function ViralBadge({ post }: { post: SocialPost }) {
  if (!post.viral) return null;
  return <span className="inline-flex items-center px-1.5 h-[18px] rounded-full text-[10px] font-bold bg-fall/15 text-fall">🔥 Viral</span>;
}

function SongChip({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <div className="mt-2.5 inline-flex items-center gap-2 rounded-[10px] border border-line bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-ink2">
      <span className="text-amber">♫</span> {title}
    </div>
  );
}

/** A small pop when you like something. */
function useBurst(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  return [on, () => { setOn(true); window.setTimeout(() => setOn(false), 650); }];
}

/** Chirp: the timeline row. */
export function ChirpRow(p: PostCardProps) {
  const { post, now, nowSerial } = p;
  const showRepost = post.repostOf && p.repostedFrom;
  const shown = showRepost ? p.repostedFrom! : post;
  const live = liveCounts(post, now);
  return (
    <article onClick={p.onOpen} className="px-4 py-3.5 border-b border-line hover:bg-white/[0.02] transition-colors cursor-pointer">
      {showRepost && <div className="text-[11px] text-ink3 mb-1.5 ml-[52px]">↻ {post.authorId === 'player' ? 'You' : post.authorName} reposted</div>}
      <div className="flex gap-3">
        <button onClick={stop(p.onAuthor)} className="shrink-0 self-start"><Avatar name={shown.authorName} seed={shown.authorId} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] min-w-0">
            <span className="font-semibold text-ink truncate">{shown.authorName}</span>
            {p.verified && <IconVerified size={14} className="text-[#4DA3FF] shrink-0" />}
            {!shown.authorName.startsWith('@') && <span className="text-ink3 truncate hidden sm:inline">{handleOf(shown.authorName)}</span>}
            <span className="text-ink3 shrink-0">· <Ago post={shown} now={now} nowSerial={nowSerial} /></span>
            {shown.byTeam && <span className="text-ink3 text-[11px] shrink-0 hidden sm:inline">· by {shown.byTeam.split(' ')[0]}</span>}
            {p.onFollow && !p.following && shown.authorId !== 'player' && <button onClick={stop(p.onFollow)} className="ml-auto text-[11px] font-semibold text-[#4DA3FF] shrink-0">Follow</button>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5"><KindChip kind={shown.kind} app="chirp" /><ViralBadge post={shown} /></div>
          <RichText text={shown.content} className="text-[14.5px] text-ink mt-1 leading-relaxed" />
          {p.quoted && (
            <div className="mt-2.5 rounded-[12px] border border-line p-3">
              <div className="flex items-center gap-2 text-[12px]"><Avatar name={p.quoted.authorName} seed={p.quoted.authorId} size={18} /><span className="font-semibold text-ink">{p.quoted.authorName}</span></div>
              <RichText text={p.quoted.content} className="text-[13px] text-ink2 mt-1" />
            </div>
          )}
          <SongChip title={p.songTitle} />
          {shown.tags && shown.tags.length > 0 && <div className="mt-2 text-[11px] text-ink3">with {shown.tags.map((t) => t.name).join(', ')}</div>}
          <div className="mt-2.5 flex items-center justify-between max-w-[460px] text-ink3 text-[12px]">
            <button onClick={stop(p.onOpen)} className="flex items-center gap-1.5 hover:text-[#4DA3FF]" aria-label="Comments"><IconComment size={15} /> <span className="num">{compact(live.comments)}</span></button>
            <button onClick={stop(p.onRepost)} className={cn('flex items-center gap-1.5 hover:text-rise', post.reposted && 'text-rise')} aria-label="Repost"><span className="text-[15px] leading-none">↻</span> <span className="num">{compact(live.shares)}</span></button>
            <button onClick={stop(p.onLike)} className={cn('flex items-center gap-1.5 hover:text-[#F91880]', post.liked && 'text-[#F91880]')} aria-label="Like"><span className="text-[15px] leading-none">{post.liked ? '♥' : '♡'}</span> <span className="num">{compact(live.likes)}</span></button>
            <span className="flex items-center gap-1.5" title="Views"><span className="text-[12px]">📊</span><span className="num">{compact(live.views || live.likes * 14)}</span></span>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Snapgram: the photo post, full width, like the real thing. */
export function PhotoCard(p: PostCardProps) {
  const { post, now, nowSerial } = p;
  const [a, b] = gradientFor(post.id);
  const k = kindDef(post.kind as PostKind);
  const live = liveCounts(post, now);
  const [burst, fire] = useBurst();
  const like = () => { if (!post.liked) fire(); p.onLike(); };
  const slides = post.kind === 'carousel' ? 10 : 1;
  return (
    <article className="bg-[#0C0D12] border-b border-line sm:border sm:rounded-[16px] overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button onClick={p.onAuthor}><Avatar name={post.authorName} seed={post.authorId} size={32} story={p.hasStory} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[13px] font-semibold text-ink"><span className="truncate">{post.authorName.replace(/^@/, '')}</span>{p.verified && <IconVerified size={13} className="text-[#4DA3FF] shrink-0" />}
            {p.onFollow && !p.following && post.authorId !== 'player' && <><span className="text-ink3">·</span><button onClick={p.onFollow} className="text-[#4DA3FF] font-semibold">Follow</button></>}
          </div>
          <div className="text-[11px] text-ink3">{k.app === 'snapgram' && k.id !== 'photo' ? `${k.emoji} ${k.label}` : 'Original photo'}{post.byTeam ? ` · posted by ${post.byTeam.split(' ')[0]}` : ''}</div>
        </div>
        <ViralBadge post={post} />
      </div>
      <div className="relative aspect-[4/5] select-none" style={{ background: `linear-gradient(${(post.id.charCodeAt(0) * 7) % 360}deg, ${a}, ${b})` }} onDoubleClick={() => { if (!post.liked) like(); }}>
        <div className="absolute inset-0 flex items-center justify-center text-[72px] opacity-85">{k.app === 'snapgram' ? k.emoji : '📸'}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {slides > 1 && <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold">1/{slides}</div>}
        {p.songTitle && <div className="absolute bottom-3 left-3 max-w-[80%] rounded-full bg-black/55 backdrop-blur px-3 py-1 text-[11px] text-white truncate">♫ {p.songTitle}</div>}
        {burst && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[96px] animate-ping text-white">♥</span></div>}
        <button onClick={p.onOpen} className="absolute inset-0" aria-label="Open post" />
      </div>
      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-4 text-[22px] leading-none">
          <button onClick={like} className={cn('transition active:scale-125', post.liked ? 'text-[#FF3040]' : 'text-ink')} aria-label="Like">{post.liked ? '♥' : '♡'}</button>
          <button onClick={p.onOpen} className="text-ink" aria-label="Comment"><IconComment size={22} /></button>
          <button onClick={p.onRepost} className={cn(post.reposted ? 'text-rise' : 'text-ink')} aria-label="Share">↗</button>
          {slides > 1 && <div className="flex-1 flex justify-center gap-1">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i === 0 ? 'bg-[#4DA3FF]' : 'bg-white/25')} />)}</div>}
        </div>
        <div className="mt-2 text-[13px] text-ink font-semibold">
          {p.likedBy ? <>Liked by {p.likedBy} and <span className="num">{live.likes.toLocaleString()}</span> others</> : <><span className="num">{live.likes.toLocaleString()}</span> likes</>}
        </div>
        <div className="mt-1 text-[13px] text-ink leading-snug"><span className="font-semibold mr-1.5">{post.authorName.replace(/^@/, '')}</span><RichText text={post.content} className="inline" /></div>
        {live.comments > 0 && <button onClick={p.onOpen} className="mt-1 text-[12px] text-ink3">View all {live.comments.toLocaleString()} comments</button>}
        {visibleComments(post.comments, now).slice(0, 2).map((c) => <div key={c.id} className="text-[12px] text-ink2 mt-0.5 truncate"><span className="font-semibold text-ink mr-1">{c.authorName.replace(/^@/, '')}</span>{c.content}</div>)}
        <div className="mt-1 text-[10px] uppercase tracking-wide text-ink3"><Ago post={post} now={now} nowSerial={nowSerial} /> ago</div>
      </div>
    </article>
  );
}

/** Clip: one full-height vertical video with the action rail on the right. */
export function ClipCard(p: PostCardProps) {
  const { post, now } = p;
  const [a, b] = gradientFor(post.id + 'clip');
  const k = kindDef(post.kind as PostKind);
  const live = liveCounts(post, now);
  const [burst, fire] = useBurst();
  const like = () => { if (!post.liked) fire(); p.onLike(); };
  return (
    <article className="relative mx-auto w-full max-w-[420px] aspect-[9/16] max-h-[80vh] rounded-[20px] overflow-hidden snap-start select-none" style={{ background: `linear-gradient(165deg, ${a}, ${b})` }} onDoubleClick={() => { if (!post.liked) like(); }}>
      <div className="absolute inset-0 rl-clip-pan opacity-40" style={{ background: `radial-gradient(circle at 30% 30%, ${b}, transparent 60%)` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-semibold">
        <span className="px-2 h-[22px] rounded-full bg-black/40 flex items-center gap-1">{k.emoji} {k.app === 'clip' ? k.label : 'Clip'}</span>
        <span className="px-2 h-[22px] rounded-full bg-black/40 flex items-center gap-1">▷ {compact(live.views)}</span>
      </div>
      <button onClick={p.onOpen} className="absolute inset-0 flex items-center justify-center" aria-label="Open clip">
        <span className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center text-white text-2xl">▶</span>
      </button>
      {burst && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[110px] animate-ping text-[#FE2C55]">♥</span></div>}
      {/* Right rail */}
      <div className="absolute right-2.5 bottom-24 flex flex-col items-center gap-4 text-white">
        <button onClick={p.onAuthor} className="relative">
          <Avatar name={post.authorName} seed={post.authorId} size={44} ring="#fff" />
          {p.onFollow && !p.following && post.authorId !== 'player' && <span onClick={stop(p.onFollow)} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] text-white text-[13px] leading-5 text-center font-bold">+</span>}
        </button>
        <button onClick={like} className="flex flex-col items-center" aria-label="Like"><span className={cn('text-[30px] leading-none drop-shadow transition active:scale-125', post.liked && 'text-[#FE2C55]')}>♥</span><span className="text-[11px] font-semibold num mt-0.5">{compact(live.likes)}</span></button>
        <button onClick={p.onOpen} className="flex flex-col items-center" aria-label="Comments"><IconComment size={28} /><span className="text-[11px] font-semibold num mt-0.5">{compact(live.comments)}</span></button>
        <button onClick={p.onRepost} className={cn('flex flex-col items-center', post.reposted && 'text-rise')} aria-label="Share"><span className="text-[26px] leading-none">↪</span><span className="text-[11px] font-semibold num mt-0.5">{compact(live.shares)}</span></button>
        <div className="w-10 h-10 rounded-full border-[6px] border-[#222] bg-gradient-to-br from-amber to-[#E93D82] animate-spin" style={{ animationDuration: '4s' }} />
      </div>
      {/* Caption */}
      <div className="absolute left-3 right-16 bottom-4 text-white">
        <div className="flex items-center gap-1.5 text-[14px] font-bold">{handleOf(post.authorName)}{p.verified && <IconVerified size={14} className="text-[#20D5EC]" />}</div>
        <RichText text={post.content} className="text-[13px] leading-snug mt-1 line-clamp-3" />
        <div className="mt-2 flex items-center gap-1.5 text-[12px] opacity-90 overflow-hidden whitespace-nowrap">
          <span>♫</span><span className="rl-marquee inline-block">{p.songTitle ? `${p.songTitle} · original sound` : `original sound — ${post.authorName.replace(/^@/, '')}`}</span>
        </div>
      </div>
    </article>
  );
}

/** A small Clip tile, for profiles and grids. */
export function ClipTile(p: PostCardProps) {
  const { post, now } = p;
  const [a, b] = gradientFor(post.id + 'clip');
  const live = liveCounts(post, now);
  return (
    <button onClick={p.onOpen} className="relative rounded-[10px] overflow-hidden aspect-[9/14] text-left" style={{ background: `linear-gradient(160deg, ${a}, ${b})` }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-1.5 left-2 text-white text-[11px] font-semibold">▷ {compact(live.views)}</div>
      {post.viral && <div className="absolute top-1.5 left-1.5 text-[11px]">🔥</div>}
    </button>
  );
}

/** Circle: the community card. */
export function CircleCard(p: PostCardProps) {
  const { post, now, nowSerial } = p;
  const k = kindDef(post.kind as PostKind);
  const live = liveCounts(post, now);
  return (
    <article onClick={p.onOpen} className="bg-card border border-line rounded-[14px] p-4 cursor-pointer hover:border-[#F5B301]/50 transition">
      <div className="flex items-center gap-2.5">
        <button onClick={stop(p.onAuthor)}><Avatar name={post.authorName} seed={post.authorId} size={36} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[13px] font-semibold text-ink"><span className="truncate">{post.authorName}</span>{p.verified && <IconVerified size={13} className="text-[#F5B301] shrink-0" />}</div>
          <div className="text-[11px] text-ink3">{post.authorId === 'player' ? 'Your circle' : 'Community'} · <Ago post={post} now={now} nowSerial={nowSerial} /></div>
        </div>
        {k.app === 'circle' && <span className="text-[10px] font-semibold px-2 h-[20px] rounded-full bg-[#F5B301]/15 text-[#F5B301] flex items-center">{k.emoji} {k.label}</span>}
      </div>
      <RichText text={post.content} className="text-[14.5px] text-ink mt-3 leading-relaxed" />
      <SongChip title={p.songTitle} />
      <div className="mt-3 flex items-center gap-2 text-[12px]">
        <button onClick={stop(p.onLike)} className={cn('px-2.5 h-7 rounded-full border border-line hover:bg-cardhover', post.liked ? 'text-[#F5B301] border-[#F5B301]/50' : 'text-ink2')}>🙌 {compact(live.likes)}</button>
        <span className="px-2.5 h-7 rounded-full border border-line text-ink2 flex items-center">💬 {compact(live.comments)} replies</span>
        <span className="ml-auto text-[11px] text-ink3">{compact(live.likes * 6 + 12)} members saw this</span>
      </div>
    </article>
  );
}

export function FeedSection({ children, app }: { children: ReactNode; app: SocialApp }) {
  if (app === 'snapgram') return <div className="max-w-[540px] mx-auto sm:space-y-4 sm:p-3">{children}</div>;
  if (app === 'clip') return <div className="space-y-4 p-3 snap-y">{children}</div>;
  if (app === 'circle') return <div className="space-y-3 p-3">{children}</div>;
  return <div>{children}</div>;
}

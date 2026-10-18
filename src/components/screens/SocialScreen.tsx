// ─── SOCIAL ────────────────────────────────────────────────────────────────
// Four apps, one scene. Each app looks and behaves like itself — the Chirp
// timeline, the Snapgram grid, Clip's vertical videos, the Circle community —
// and they share one composer, one comment system, and one rivals page.

import { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { useGameStore, fanbaseOf } from '../../store/gameStore';
import { Button, Segmented } from '../ui/kit';
import { dateToSerial } from '../../sim/gameClock';
import { APP_META, SOCIAL_APPS, seedFollowers, fanbaseNameFor, type SocialApp } from '../../sim/social';
import type { GameScreen, Platform, SocialPost } from '../../types/game';
import { AppMark, Avatar, ChirpRow, PhotoCard, ClipTile, CircleCard, FeedSection, handleOf, type PostCardProps } from '../social/shared';
import { PostPanel } from '../social/PostPanel';
import { Composer } from '../social/Composer';
import { RivalsTab } from '../social/Rivals';

type Tab = 'feed' | 'mentions' | 'profile' | 'rivals';
type Filter = 'all' | 'mine' | 'people';

export function SocialScreen({ platform }: { platform: Platform }) {
  const app = (SOCIAL_APPS.includes(platform as SocialApp) ? platform : 'chirp') as SocialApp;
  const meta = APP_META[app];
  const player = useGameStore((s) => s.player);
  const socialPosts = useGameStore((s) => s.socialPosts);
  const songs = useGameStore((s) => s.songs);
  const npcSongs = useGameStore((s) => s.npcSongs);
  const stats = useGameStore((s) => s.socialStats);
  const gameDate = useGameStore((s) => s.gameDate);
  const trending = useGameStore((s) => s.trending);
  const fanWars = useGameStore((s) => s.fanWars);
  const beefs = useGameStore((s) => s.beefs);
  const fanbaseName = useGameStore((s) => s.fanbaseName);
  const likePost = useGameStore((s) => s.likePost);
  const repostPost = useGameStore((s) => s.repostPost);
  const setScreen = useGameStore((s) => s.setScreen);
  const setFanbaseName = useGameStore((s) => s.setFanbaseName);
  const refreshFeed = useGameStore((s) => s.refreshFeed);

  const [tab, setTab] = useState<Tab>('feed');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; message: string; viral?: boolean } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nowSerial = dateToSerial(gameDate);
  // Derived and not cheap: once a game day, not on every clock tick.
  const fanbaseTotal = useMemo(() => (player ? fanbaseOf(useGameStore.getState()).total : 0), [player, gameDate]);

  const fanbase = player?.career.fanbase ?? 0;
  const followers = (a: SocialApp) => stats?.[a]?.followers ?? seedFollowers(a, fanbase);
  const myFans = fanbaseName ?? (player ? fanbaseNameFor(player.artistName, player.id) : 'Your fans');

  const byId = useMemo(() => new Map(socialPosts.map((p) => [p.id, p])), [socialPosts]);
  const songTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of songs) m.set(s.id, s.title);
    return (id?: string) => (id ? m.get(id) ?? npcSongs.find((x) => x.id === id)?.title : undefined);
  }, [songs, npcSongs]);

  const appPosts = useMemo(() => socialPosts.filter((p) => p.platform === app), [socialPosts, app]);
  const feed = useMemo(() => {
    const list = filter === 'mine' ? appPosts.filter((p) => p.isPlayerPost)
      : filter === 'people' ? appPosts.filter((p) => !p.isPlayerPost && !p.authorId.startsWith('fan:') && !p.authorName.startsWith('@'))
      : appPosts;
    return list.slice(0, 60);
  }, [appPosts, filter]);

  const mentions = useMemo(() => {
    if (!player) return [] as SocialPost[];
    const name = player.artistName.toLowerCase();
    const handle = '@' + player.artistName.replace(/\s+/g, '').toLowerCase();
    return socialPosts.filter((p) => !p.isPlayerPost && ((p.tags ?? []).some((t) => t.id === 'player') || p.content.toLowerCase().includes(handle) || p.content.toLowerCase().includes(name))).slice(0, 40);
  }, [socialPosts, player]);

  const mine = useMemo(() => appPosts.filter((p) => p.isPlayerPost), [appPosts]);
  const myLikes = mine.reduce((a, p) => a + p.likes, 0);
  const liveRivals = (fanWars ?? []).filter((w) => w.status === 'active').length + beefs.filter((b) => !b.resolution).length;
  const open = openId ? byId.get(openId) ?? null : null;

  function cardProps(p: SocialPost): PostCardProps {
    return {
      post: p,
      nowSerial,
      songTitle: songTitle(p.relatedSongId),
      repostedFrom: p.repostOf ? byId.get(p.repostOf) : undefined,
      quoted: p.quoteOf ? byId.get(p.quoteOf) : undefined,
      onOpen: () => setOpenId(p.id),
      onLike: () => likePost(p.id),
      onRepost: () => setFlash(p.authorId === 'player' ? { ok: false, message: 'That is your own post.' } : repostPost(p.id)),
    };
  }

  function renderPost(p: SocialPost, asApp: SocialApp = app) {
    const props = cardProps(p);
    if (asApp === 'snapgram') return <PhotoCard key={p.id} {...props} />;
    if (asApp === 'clip') return <ClipTile key={p.id} {...props} />;
    if (asApp === 'circle') return <CircleCard key={p.id} {...props} />;
    return <ChirpRow key={p.id} {...props} />;
  }

  const rail = (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line bg-card p-4">
        <div className="text-[12px] font-semibold text-ink2 uppercase tracking-wider mb-3">Your accounts</div>
        <div className="space-y-2">
          {SOCIAL_APPS.map((a) => (
            <button key={a} onClick={() => setScreen(`social_${a}` as GameScreen)} className={cn('w-full flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition', a === app ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]')}>
              <AppMark app={a} size={22} />
              <span className="flex-1 text-[13px] text-ink">{APP_META[a].name}</span>
              <span className="text-[12px] text-ink2 num">{compact(followers(a))}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-line text-[11px] text-ink3">Fanbase <b className="text-ink2">{myFans}</b> · {compact(fanbaseTotal)} fans</div>
      </div>
      <div className="rounded-[14px] border border-line bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-ink2 uppercase tracking-wider">Trending</div>
          <button onClick={() => setFlash(refreshFeed())} className="text-[11px] text-ink3 hover:text-ink">Refresh</button>
        </div>
        <div className="space-y-3">
          {(trending ?? []).slice(0, 5).map((t, i) => (
            <div key={`${t.tag}-${i}`}><div className="text-[13px] font-semibold text-ink">{t.tag}</div><div className="text-[11px] text-ink3">{t.reason} · {compact(t.posts)} posts</div></div>
          ))}
          {(trending ?? []).length === 0 && <div className="text-[12px] text-ink3">Trends are forming.</div>}
        </div>
      </div>
      {liveRivals > 0 && (
        <button onClick={() => setTab('rivals')} className="w-full rounded-[14px] border border-fall/40 bg-fall/[0.06] p-4 text-left hover:bg-fall/[0.1] transition">
          <div className="text-[13px] font-semibold text-ink">⚔️ {liveRivals} live rivalr{liveRivals === 1 ? 'y' : 'ies'}</div>
          <div className="text-[11px] text-ink3 mt-0.5">Fan wars and beef need a decision.</div>
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-[1120px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <AppMark app={app} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold text-ink leading-tight">{meta.name}</h1>
          <div className="text-[12px] text-ink3">{meta.tagline} · <span className="text-ink2 num">{compact(followers(app))}</span> followers</div>
        </div>
        <Button variant="accent" accent={meta.color} onClick={() => setComposing(true)}>+ Post</Button>
      </div>

      {/* App switcher (phones) */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 lg:hidden">
        {SOCIAL_APPS.map((a) => (
          <button key={a} onClick={() => setScreen(`social_${a}` as GameScreen)} className={cn('flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-semibold shrink-0', a === app ? 'text-black' : 'border-line text-ink2')} style={a === app ? { background: APP_META[a].color, borderColor: APP_META[a].color } : undefined}>
            {APP_META[a].name} <span className="opacity-70 num">{compact(followers(a))}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { id: 'feed', label: 'Feed' },
            { id: 'mentions', label: 'Mentions', badge: mentions.length ? String(mentions.length) : undefined },
            { id: 'profile', label: 'Profile' },
            { id: 'rivals', label: 'Rivals', badge: liveRivals ? String(liveRivals) : undefined },
          ]}
        />
        {tab === 'feed' && (
          <div className="flex gap-1.5">
            {([['all', 'Everything'], ['people', 'Artists'], ['mine', 'Yours']] as [Filter, string][]).map(([f, l]) => (
              <button key={f} onClick={() => setFilter(f)} className={cn('h-8 px-3 rounded-full text-[12px] font-semibold border', filter === f ? 'border-ink2 text-ink bg-white/[0.05]' : 'border-line text-ink3 hover:text-ink')}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {flash && (
        <div className={cn('mb-3 rounded-[12px] px-4 py-2.5 text-[12px] flex items-start justify-between gap-3', flash.viral ? 'bg-fall/10 text-fall border border-fall/30' : flash.ok ? 'bg-white/[0.04] text-ink2 border border-line' : 'bg-fall/10 text-fall border border-fall/30')}>
          <span>{flash.viral ? '🔥 It went viral. ' : ''}{flash.message}</span>
          <button onClick={() => setFlash(null)} className="text-ink3 hover:text-ink">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_290px] gap-4">
        <div className={cn('min-w-0 rounded-[14px] border border-line bg-[#0C0D12] overflow-hidden', app === 'chirp' && tab !== 'rivals' ? '' : '')}>
          {tab === 'feed' && (
            <>
              <button onClick={() => setComposing(true)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-line text-left hover:bg-white/[0.02]">
                <Avatar name={player?.artistName ?? 'You'} seed="player" size={36} ring={meta.color} />
                <span className="flex-1 text-[14px] text-ink3">{app === 'chirp' ? 'What\'s happening?' : app === 'snapgram' ? 'Share a photo…' : app === 'clip' ? 'Post a clip — a challenge, a freestyle…' : 'Say something to your day ones…'}</span>
                <span className="text-[12px] font-semibold px-3 h-8 rounded-full flex items-center text-black" style={{ background: meta.color }}>Post</span>
              </button>
              {feed.length === 0
                ? <div className="p-10 text-center text-[13px] text-ink3">{filter === 'mine' ? `You haven't posted on ${meta.name} yet.` : 'Nothing here yet. The scene fills in as days pass.'}</div>
                : <FeedSection app={app}>{feed.map((p) => renderPost(p))}</FeedSection>}
            </>
          )}

          {tab === 'mentions' && (
            mentions.length === 0
              ? <div className="p-10 text-center text-[13px] text-ink3">Nobody has tagged you yet. Tag people and they tag you back.</div>
              : <div>{mentions.map((p) => (
                  <div key={p.id} className="relative">
                    <span className="absolute right-3 top-3 z-[1]"><AppMark app={(p.platform as SocialApp) in APP_META ? (p.platform as SocialApp) : 'chirp'} size={18} /></span>
                    {renderPost(p, 'chirp')}
                  </div>
                ))}</div>
          )}

          {tab === 'profile' && player && (
            <div>
              <div className="h-28" style={{ background: `linear-gradient(120deg, ${meta.color}55, transparent)` }} />
              <div className="px-4 pb-4 border-b border-line">
                <div className="-mt-9 mb-2"><Avatar name={player.artistName} seed="player" size={72} ring={meta.color} /></div>
                <div className="text-[20px] font-bold text-ink">{player.artistName}</div>
                <div className="text-[12px] text-ink3">{handleOf(player.artistName)} · {player.city}, {player.country}</div>
                <div className="mt-3 flex gap-5 text-[12px]">
                  <span><b className="text-ink num">{compact(followers(app))}</b> <span className="text-ink3">followers</span></span>
                  <span><b className="text-ink num">{mine.length}</b> <span className="text-ink3">posts</span></span>
                  <span><b className="text-ink num">{compact(myLikes)}</b> <span className="text-ink3">likes</span></span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[12px]">
                  <span className="text-ink3">Your fans are called</span>
                  {editingName ? (
                    <>
                      <input autoFocus value={nameDraft} maxLength={28} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setFanbaseName(nameDraft); setEditingName(false); } }} className="h-7 rounded-[8px] bg-card border border-line px-2 text-[12px] text-ink outline-none" />
                      <button className="text-amber" onClick={() => { setFanbaseName(nameDraft); setEditingName(false); }}>Save</button>
                    </>
                  ) : (
                    <button onClick={() => { setNameDraft(myFans); setEditingName(true); }} className="font-semibold text-ink hover:text-amber">{myFans} ✎</button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {SOCIAL_APPS.map((a) => (
                    <div key={a} className="rounded-[10px] bg-white/[0.03] px-2 py-2 text-center">
                      <div className="text-[10px] font-semibold" style={{ color: APP_META[a].color }}>{APP_META[a].name}</div>
                      <div className="text-[14px] font-semibold text-ink num">{compact(followers(a))}</div>
                    </div>
                  ))}
                </div>
              </div>
              {mine.length === 0 ? <div className="p-10 text-center text-[13px] text-ink3">No posts on {meta.name} yet.</div> : <FeedSection app={app}>{mine.slice(0, 40).map((p) => renderPost(p))}</FeedSection>}
            </div>
          )}

          {tab === 'rivals' && <RivalsTab onFlash={setFlash} />}
        </div>
        <aside className="hidden lg:block">{rail}</aside>
      </div>

      <PostPanel post={open} songTitle={songTitle(open?.relatedSongId)} nowSerial={nowSerial} onClose={() => setOpenId(null)} />
      {composing && <Composer open={composing} app={app} onClose={() => setComposing(false)} onPosted={setFlash} />}
    </div>
  );
}

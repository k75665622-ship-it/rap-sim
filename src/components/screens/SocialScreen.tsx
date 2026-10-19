// ─── SOCIAL ────────────────────────────────────────────────────────────────
// Four apps, one scene, all of it live. Posts go up through the day and their
// numbers climb while you watch; pull to refresh for what just landed. Each
// app looks like itself — the Chirp timeline, Snapgram stories and photos,
// Clip's vertical videos and sounds, the Circle community.

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { useGameStore, fanbaseOf, feedCooldown, nowMinuteOf } from '../../store/gameStore';
import { Button, Segmented } from '../ui/kit';
import { dateToSerial } from '../../sim/gameClock';
import { APP_META, SOCIAL_APPS, seedFollowers, fanbaseNameFor, type PostKind, type SocialApp } from '../../sim/social';
import { liveCounts } from '../../sim/socialLive';
import type { GameScreen, NPC, Platform, SocialPost } from '../../types/game';
import { AppMark, Avatar, ChirpRow, PhotoCard, ClipCard, ClipTile, CircleCard, FeedSection, handleOf, type PostCardProps } from '../social/shared';
import { PostPanel } from '../social/PostPanel';
import { Composer } from '../social/Composer';
import { RivalsTab } from '../social/Rivals';
import { StoriesBar, StoryViewer, StoryComposer } from '../social/Stories';
import { SoundsList, GoLivePanel, type Sound } from '../social/ClipExtras';
import { ActivityList } from '../social/Activity';
import { ProfileView } from '../social/ProfileView';
import { isRealId } from '../../sim/realPeople';

type Tab = 'feed' | 'activity' | 'profile' | 'rivals';
type Filter = 'foryou' | 'following' | 'mine' | 'sounds';

const minuteOf = (p: SocialPost) => p.postedMinute ?? (p.daySerial ?? 0) * 1440;

/** The game minute, refreshed every few game minutes so live numbers move. */
function useNow(): number {
  return useGameStore((s) => Math.floor(nowMinuteOf(s) / 3) * 3);
}

export function SocialScreen({ platform }: { platform: Platform }) {
  const app = (SOCIAL_APPS.includes(platform as SocialApp) ? platform : 'chirp') as SocialApp;
  const meta = APP_META[app];
  const player = useGameStore((s) => s.player);
  const socialPosts = useGameStore((s) => s.socialPosts);
  const songs = useGameStore((s) => s.songs);
  const npcSongs = useGameStore((s) => s.npcSongs);
  const npcs = useGameStore((s) => s.npcs);
  const stats = useGameStore((s) => s.socialStats);
  const gameDate = useGameStore((s) => s.gameDate);
  const trending = useGameStore((s) => s.trending);
  const fanWars = useGameStore((s) => s.fanWars);
  const beefs = useGameStore((s) => s.beefs);
  const fanbaseName = useGameStore((s) => s.fanbaseName);
  const following = useGameStore((s) => s.following);
  const followedBy = useGameStore((s) => s.followedBy);
  const blocked = useGameStore((s) => s.blocked);
  const activity = useGameStore((s) => s.socialActivity);
  const stories = useGameStore((s) => s.stories);
  const verifiedMe = useGameStore((s) => s.verified);
  const cooldownWait = useGameStore((s) => feedCooldown(s).waitMinutes);
  const cooldown = { ready: cooldownWait === 0, waitMinutes: cooldownWait };
  const likePost = useGameStore((s) => s.likePost);
  const repostPost = useGameStore((s) => s.repostPost);
  const setScreen = useGameStore((s) => s.setScreen);
  const setFanbaseName = useGameStore((s) => s.setFanbaseName);
  const refreshFeed = useGameStore((s) => s.refreshFeed);
  const followAccount = useGameStore((s) => s.followAccount);
  const unfollowAccount = useGameStore((s) => s.unfollowAccount);
  const unblockAccount = useGameStore((s) => s.unblockAccount);
  const markActivityRead = useGameStore((s) => s.markActivityRead);

  const now = useNow();
  const [tab, setTab] = useState<Tab>('feed');
  const [filter, setFilter] = useState<Filter>('foryou');
  const [openId, setOpenId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [composing, setComposing] = useState<null | { kind?: PostKind; soundSongId?: string; soundTitle?: string; soundMine?: boolean }>(null);
  const [flash, setFlash] = useState<{ ok: boolean; message: string; viral?: boolean } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [revealed, setRevealed] = useState(now);
  const [storyAt, setStoryAt] = useState<number | null>(null);
  const [storyComposer, setStoryComposer] = useState(false);
  const [live, setLive] = useState(false);
  const nowSerial = dateToSerial(gameDate);

  // A new app, a fresh look: everything that has landed is shown.
  useEffect(() => { setRevealed(nowMinuteOf(useGameStore.getState())); setFilter('foryou'); }, [app]);
  useEffect(() => { if (tab === 'activity') markActivityRead(); }, [tab, markActivityRead, activity?.length]);

  const fanbase = player?.career.fanbase ?? 0;
  const followers = (a: SocialApp) => stats?.[a]?.followers ?? seedFollowers(a, fanbase);
  const myFans = fanbaseName ?? (player ? fanbaseNameFor(player.artistName, player.id) : 'Your fans');
  const fanbaseTotal = useMemo(() => (player ? fanbaseOf(useGameStore.getState()).total : 0), [player, gameDate]);

  const npcById = useMemo(() => new Map(npcs.map((n) => [n.id, n])), [npcs]);
  const followSet = useMemo(() => new Set(following ?? []), [following]);
  const blockSet = useMemo(() => new Set(blocked ?? []), [blocked]);
  const isVerified = (id: string) => {
    if (id === 'player') return !!verifiedMe;
    if (id.startsWith('org:') || id.startsWith('label:') || id === 'scene_watch') return true;
    const n = npcById.get(id);
    return !!n && (isRealId(n.id) || n.fame >= 50 || ((n.role === 'media' || n.role === 'blogger') && n.fame >= 25));
  };

  const byId = useMemo(() => new Map(socialPosts.map((p) => [p.id, p])), [socialPosts]);
  const songTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of songs) m.set(s.id, s.title);
    return (id?: string) => (id ? m.get(id) ?? npcSongs.find((x) => x.id === id)?.title : undefined);
  }, [songs, npcSongs]);

  // What has actually been posted by now, newest first, without blocked accounts.
  const landed = useMemo(
    () => socialPosts.filter((p) => !blockSet.has(p.authorId) && minuteOf(p) <= now).sort((a, b) => minuteOf(b) - minuteOf(a)),
    [socialPosts, blockSet, now],
  );
  const appPosts = useMemo(() => landed.filter((p) => p.platform === app), [landed, app]);
  const shownPool = useMemo(() => appPosts.filter((p) => p.isPlayerPost || minuteOf(p) <= revealed), [appPosts, revealed]);
  const waiting = appPosts.length - shownPool.length;
  const feed = useMemo(() => {
    const list = filter === 'mine' ? shownPool.filter((p) => p.isPlayerPost)
      : filter === 'following' ? shownPool.filter((p) => followSet.has(p.authorId) || p.isPlayerPost)
      : shownPool;
    if (filter !== 'foryou') return list.slice(0, app === 'clip' ? 30 : 60);
    // For You is the algorithm: what is doing numbers, what is fresh, who you
    // follow, and your own posts while they are new.
    const score = (p: SocialPost) => {
      // Scored at the moment the feed was last refreshed, so it doesn't reshuffle under your thumb.
      const c = liveCounts(p, revealed);
      const hours = Math.max(0, revealed - minuteOf(p)) / 60;
      return Math.log10(1 + c.likes + c.views / 12 + c.comments * 3) - hours * (app === 'chirp' ? 0.12 : 0.06)
        + (followSet.has(p.authorId) ? 0.6 : 0) + (p.isPlayerPost && hours < 6 ? 1.5 : 0) + (p.viral ? 1 : 0);
    };
    return list.slice(0, 90).map((p) => ({ p, s: score(p) })).sort((a, b) => b.s - a.s).map((x) => x.p).slice(0, app === 'clip' ? 30 : 60);
  }, [shownPool, filter, followSet, app, revealed]);

  const mentionsCount = (activity ?? []).filter((a) => !a.read && a.minute <= now).length;
  const activityNow = useMemo(() => (activity ?? []).filter((a) => a.minute <= now).sort((a, b) => b.minute - a.minute), [activity, now]);
  const storiesNow = useMemo(() => {
    const list = (stories ?? []).filter((s) => s.postedMinute <= now && now - s.postedMinute < 1440 && !blockSet.has(s.authorId));
    return list.sort((a, b) => (a.authorId === 'player' ? -1 : b.authorId === 'player' ? 1 : 0) || Number(!!a.seen) - Number(!!b.seen) || b.postedMinute - a.postedMinute);
  }, [stories, now, blockSet]);
  const storyAuthors = useMemo(() => new Map(storiesNow.map((s) => [s.authorId, s.seen ? 'seen' as const : 'new' as const])), [storiesNow]);
  const mine = useMemo(() => appPosts.filter((p) => p.isPlayerPost), [appPosts]);
  const myLikes = mine.reduce((a, p) => a + liveCounts(p, now).likes, 0);
  const liveRivals = (fanWars ?? []).filter((w) => w.status === 'active').length + beefs.filter((b) => !b.resolution).length;
  const open = openId ? byId.get(openId) ?? null : null;
  const friendNames = useMemo(() => (followedBy ?? []).map((id) => npcById.get(id)?.name).filter(Boolean) as string[], [followedBy, npcById]);

  function doRefresh() {
    const r = refreshFeed(app);
    setRevealed(nowMinuteOf(useGameStore.getState()));
    setFlash(r.ok ? { ok: true, message: `↻ ${r.message}` } : r);
  }

  function cardProps(p: SocialPost): PostCardProps {
    const likedBy = p.authorId !== 'player' && friendNames.length && p.likes > 20 ? friendNames[(p.id.charCodeAt(2) + p.id.charCodeAt(5)) % friendNames.length] : undefined;
    return {
      post: p,
      now,
      nowSerial,
      songTitle: songTitle(p.relatedSongId),
      repostedFrom: p.repostOf ? byId.get(p.repostOf) : undefined,
      quoted: p.quoteOf ? byId.get(p.quoteOf) : undefined,
      verified: isVerified(p.authorId),
      following: followSet.has(p.authorId),
      likedBy,
      hasStory: storyAuthors.get(p.authorId),
      onOpen: () => setOpenId(p.id),
      onLike: () => likePost(p.id),
      onRepost: () => setFlash(p.authorId === 'player' ? { ok: false, message: 'That is your own post.' } : repostPost(p.id)),
      onFollow: npcById.has(p.authorId) ? () => setFlash(followAccount(p.authorId)) : undefined,
      onAuthor: () => openProfile(p.repostOf ? byId.get(p.repostOf)?.authorId ?? p.authorId : p.authorId),
    };
  }

  /** Somebody's page on this app; your own is the Profile tab. */
  function openProfile(id: string) {
    if (id === 'player') { setProfileId(null); setOpenId(null); setTab('profile'); return; }
    setProfileId(id);
  }

  function renderPost(p: SocialPost, asApp: SocialApp = app) {
    const props = cardProps(p);
    if (asApp === 'snapgram') return <PhotoCard key={p.id} {...props} />;
    if (asApp === 'clip') return <ClipCard key={p.id} {...props} />;
    if (asApp === 'circle') return <CircleCard key={p.id} {...props} />;
    return <ChirpRow key={p.id} {...props} />;
  }

  const filters: [Filter, string][] = app === 'clip'
    ? [['foryou', 'For You'], ['following', 'Following'], ['sounds', 'Sounds'], ['mine', 'Yours']]
    : [['foryou', app === 'circle' ? 'Community' : 'For you'], ['following', 'Following'], ['mine', 'Yours']];

  const rail = (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line bg-card p-4">
        <div className="text-[12px] font-semibold text-ink2 uppercase tracking-wider mb-3">Your accounts</div>
        <div className="space-y-1.5">
          {SOCIAL_APPS.map((a) => (
            <button key={a} onClick={() => setScreen(`social_${a}` as GameScreen)} className={cn('w-full flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition', a === app ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]')}>
              <AppMark app={a} size={22} />
              <span className="flex-1 text-[13px] text-ink">{APP_META[a].name}</span>
              <span className="text-[12px] text-ink2 num">{compact(followers(a))}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-line text-[11px] text-ink3">Fanbase <b className="text-ink2">{myFans}</b> · {compact(fanbaseTotal)} fans{verifiedMe ? ' · ✓ verified' : ''}</div>
      </div>
      <div className="rounded-[14px] border border-line bg-card p-4">
        <div className="text-[12px] font-semibold text-ink2 uppercase tracking-wider mb-3">Trending</div>
        <div className="space-y-3">
          {(trending ?? []).slice(0, 6).map((t, i) => (
            <div key={`${t.tag}-${i}`}><div className="text-[10px] text-ink3">{i + 1} · {t.reason}</div><div className="text-[13px] font-semibold text-ink">{t.tag}</div><div className="text-[11px] text-ink3">{compact(t.posts)} posts</div></div>
          ))}
          {(trending ?? []).length === 0 && <div className="text-[12px] text-ink3">Trends are forming. Refresh.</div>}
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
      <div className="flex items-center gap-3 mb-3">
        <AppMark app={app} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] sm:text-[24px] font-bold text-ink leading-tight">{meta.name}</h1>
          <div className="text-[12px] text-ink3 truncate">{meta.tagline} · <span className="text-ink2 num">{compact(followers(app))}</span> followers</div>
        </div>
        <button onClick={doRefresh} disabled={!cooldown.ready} title={cooldown.ready ? 'Refresh' : `Refresh in ${cooldown.waitMinutes} game min`} className="h-10 px-3 rounded-[10px] border border-line bg-card text-ink2 hover:text-ink disabled:opacity-40 text-[13px] font-semibold">
          ↻<span className="hidden sm:inline"> {cooldown.ready ? 'Refresh' : `${cooldown.waitMinutes}m`}</span>
        </button>
        <button onClick={() => setTab('activity')} className="relative h-10 w-10 rounded-[10px] border border-line bg-card text-ink2 hover:text-ink" aria-label="Activity">
          ♡{mentionsCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F91880] text-white text-[10px] font-bold leading-[18px]">{mentionsCount > 9 ? '9+' : mentionsCount}</span>}
        </button>
        <Button variant="accent" accent={meta.color} onClick={() => setComposing({})}>+ <span className="hidden sm:inline">Post</span></Button>
      </div>

      {/* App switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 lg:hidden">
        {SOCIAL_APPS.map((a) => (
          <button key={a} onClick={() => setScreen(`social_${a}` as GameScreen)} className={cn('flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-semibold shrink-0', a === app ? 'text-black' : 'border-line text-ink2')} style={a === app ? { background: APP_META[a].color, borderColor: APP_META[a].color } : undefined}>
            {APP_META[a].name} <span className="opacity-70 num">{compact(followers(a))}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="overflow-x-auto max-w-full">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { id: 'feed', label: 'Feed' },
              { id: 'activity', label: 'Activity', badge: mentionsCount ? String(mentionsCount) : undefined },
              { id: 'profile', label: 'Profile' },
              { id: 'rivals', label: 'Rivals', badge: liveRivals ? String(liveRivals) : undefined },
            ]}
          />
        </div>
        {tab === 'feed' && (
          <div className="flex gap-1.5 overflow-x-auto">
            {filters.map(([f, l]) => (
              <button key={f} onClick={() => setFilter(f)} className={cn('h-8 px-3 rounded-full text-[12px] font-semibold border shrink-0', filter === f ? 'border-ink2 text-ink bg-white/[0.05]' : 'border-line text-ink3 hover:text-ink')}>{l}</button>
            ))}
            {(app === 'clip' || app === 'snapgram') && <button onClick={() => setLive(true)} className="h-8 px-3 rounded-full text-[12px] font-bold shrink-0 text-white flex items-center gap-1.5" style={{ background: app === 'clip' ? '#FE2C55' : '#E93D82' }}><span className="w-1.5 h-1.5 rounded-full bg-white rl-live-dot" />LIVE</button>}
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
        <div className="min-w-0 rounded-[14px] border border-line bg-[#0C0D12] overflow-hidden relative">
          {tab === 'feed' && (
            <>
              {app === 'snapgram' && filter !== 'sounds' && (
                <StoriesBar stories={storiesNow} now={now} myName={player?.artistName ?? 'You'} onOpen={setStoryAt} onAdd={() => setStoryComposer(true)} />
              )}
              {waiting > 0 && filter !== 'sounds' && (
                <div className="sticky top-2 z-10 flex justify-center pointer-events-none">
                  <button onClick={() => setRevealed(now)} className="pointer-events-auto mt-2 h-8 px-4 rounded-full text-[12px] font-semibold text-white shadow-lg rl-pop" style={{ background: meta.color }}>
                    ↑ {waiting} new post{waiting === 1 ? '' : 's'}
                  </button>
                </div>
              )}
              {filter === 'sounds' ? (
                <SoundsList onUse={(s: Sound) => setComposing({ kind: 'challenge', soundSongId: s.songId, soundTitle: s.title, soundMine: s.mine })} />
              ) : (
                <>
                  {app !== 'clip' && (
                    <button onClick={() => setComposing({})} className="w-full flex items-center gap-3 px-4 py-3 border-b border-line text-left hover:bg-white/[0.02]">
                      <Avatar name={player?.artistName ?? 'You'} seed="player" size={36} ring={meta.color} />
                      <span className="flex-1 text-[14px] text-ink3">{app === 'chirp' ? 'What\'s happening?' : app === 'snapgram' ? 'Share a photo…' : 'Say something to your day ones…'}</span>
                      <span className="text-[12px] font-semibold px-3 h-8 rounded-full flex items-center text-black" style={{ background: meta.color }}>Post</span>
                    </button>
                  )}
                  {feed.length === 0
                    ? <div className="p-10 text-center text-[13px] text-ink3">{filter === 'mine' ? `You haven't posted on ${meta.name} yet.` : filter === 'following' ? 'Nobody you follow has posted here yet. Follow more people, or refresh.' : 'Quiet right now. Refresh, or let the clock run.'}</div>
                    : <FeedSection app={app}>{feed.map((p) => renderPost(p))}</FeedSection>}
                </>
              )}
            </>
          )}

          {tab === 'activity' && (
            <ActivityList items={activityNow.slice(0, 60)} now={now} onOpenPost={(id) => (byId.has(id) ? setOpenId(id) : undefined)} onOpenArtist={openProfile} />
          )}

          {tab === 'profile' && player && (
            <div>
              <div className="h-28" style={{ background: `linear-gradient(120deg, ${meta.color}66, transparent)` }} />
              <div className="px-4 pb-4 border-b border-line">
                <div className="-mt-9 mb-2 flex items-end justify-between">
                  <Avatar name={player.artistName} seed="player" size={76} ring={meta.color} story={storyAuthors.get('player')} />
                  <Button size="sm" variant="secondary" onClick={() => setStoryComposer(true)}>+ Story</Button>
                </div>
                <div className="flex items-center gap-1.5 text-[20px] font-bold text-ink">{player.artistName}{verifiedMe && <span className="text-[#4DA3FF] text-[16px]">✓</span>}</div>
                <div className="text-[12px] text-ink3">{handleOf(player.artistName)} · {player.city}, {player.country}</div>
                <div className="mt-3 flex gap-5 text-[13px]">
                  <span><b className="text-ink num">{compact(followers(app))}</b> <span className="text-ink3">followers</span></span>
                  <span><b className="text-ink num">{(following ?? []).length}</b> <span className="text-ink3">following</span></span>
                  <span><b className="text-ink num">{mine.length}</b> <span className="text-ink3">posts</span></span>
                  <span className="hidden sm:inline"><b className="text-ink num">{compact(myLikes)}</b> <span className="text-ink3">likes</span></span>
                </div>
                {friendNames.length > 0 && <div className="mt-2 text-[12px] text-ink3">Followed by <span className="text-ink2">{friendNames.slice(0, 3).join(', ')}</span>{friendNames.length > 3 ? ` and ${friendNames.length - 3} others you know` : ''}</div>}
                <div className="mt-3 flex items-center gap-2 text-[12px] flex-wrap">
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
              <PeopleLists
                following={(following ?? []).map((id) => npcById.get(id)).filter(Boolean) as NPC[]}
                blocked={(blocked ?? []).map((id) => npcById.get(id)).filter(Boolean) as NPC[]}
                onUnfollow={(id) => setFlash(unfollowAccount(id))}
                onUnblock={(id) => { unblockAccount(id); setFlash({ ok: true, message: 'Unblocked.' }); }}
                onOpen={openProfile}
              />
              {mine.length === 0 ? <div className="p-10 text-center text-[13px] text-ink3">No posts on {meta.name} yet.</div>
                : app === 'clip' ? <div className="grid grid-cols-3 gap-1 p-1">{mine.slice(0, 30).map((p) => <ClipTile key={p.id} {...cardProps(p)} />)}</div>
                : <FeedSection app={app}>{mine.slice(0, 30).map((p) => renderPost(p))}</FeedSection>}
            </div>
          )}

          {tab === 'rivals' && <RivalsTab onFlash={setFlash} />}
        </div>
        <aside className="hidden lg:block">{rail}</aside>
      </div>

      <ProfileView id={profileId} app={app} now={now} onClose={() => setProfileId(null)} onOpenPost={setOpenId} onOpenProfile={openProfile} renderPost={(p, a) => renderPost(p, a)} onFlash={setFlash} />
      <PostPanel post={open} songTitle={songTitle(open?.relatedSongId)} now={now} verified={open ? isVerified(open.authorId) : false} onClose={() => setOpenId(null)} onOpenProfile={(id) => { setOpenId(null); openProfile(id); }} />
      {composing && <Composer open app={app} preset={composing} onClose={() => setComposing(null)} onPosted={(r) => { setFlash(r); setRevealed(nowMinuteOf(useGameStore.getState())); }} />}
      {storyAt !== null && <StoryViewer stories={storiesNow} start={storyAt} now={now} onClose={() => setStoryAt(null)} />}
      {storyComposer && <StoryComposer open onClose={() => setStoryComposer(false)} onDone={setFlash} />}
      {live && <GoLivePanel app={app === 'clip' ? 'clip' : 'snapgram'} onClose={() => setLive(false)} />}
    </div>
  );
}

function PeopleLists({ following, blocked, onUnfollow, onUnblock, onOpen }: { following: NPC[]; blocked: NPC[]; onUnfollow: (id: string) => void; onUnblock: (id: string) => void; onOpen: (id: string) => void }) {
  const [view, setView] = useState<'none' | 'following' | 'blocked'>('none');
  return (
    <div className="border-b border-line">
      <div className="flex gap-2 px-4 py-2.5">
        <button onClick={() => setView(view === 'following' ? 'none' : 'following')} className={cn('h-8 px-3 rounded-full border text-[12px] font-semibold', view === 'following' ? 'border-ink2 text-ink' : 'border-line text-ink3')}>Following · {following.length}</button>
        <button onClick={() => setView(view === 'blocked' ? 'none' : 'blocked')} className={cn('h-8 px-3 rounded-full border text-[12px] font-semibold', view === 'blocked' ? 'border-ink2 text-ink' : 'border-line text-ink3')}>Blocked · {blocked.length}</button>
      </div>
      {view !== 'none' && (
        <div className="px-2 pb-2 max-h-72 overflow-y-auto">
          {(view === 'following' ? following : blocked).map((n) => (
            <div key={n.id} className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-white/[0.03]">
              <button onClick={() => onOpen(n.id)}><Avatar name={n.name} seed={n.id} size={32} /></button>
              <div className="min-w-0 flex-1"><div className="text-[13px] text-ink truncate">{n.name}</div><div className="text-[11px] text-ink3 truncate">{n.role.replace(/_/g, ' ')} · {n.country}</div></div>
              {view === 'following'
                ? <button onClick={() => onUnfollow(n.id)} className="h-7 px-3 rounded-full border border-line text-[11px] text-ink2 hover:text-fall">Unfollow</button>
                : <button onClick={() => onUnblock(n.id)} className="h-7 px-3 rounded-full border border-line text-[11px] text-ink2 hover:text-ink">Unblock</button>}
            </div>
          ))}
          {(view === 'following' ? following : blocked).length === 0 && <div className="text-[12px] text-ink3 px-2 py-2">{view === 'following' ? 'You don\'t follow anyone yet.' : 'Nobody blocked.'}</div>}
        </div>
      )}
    </div>
  );
}

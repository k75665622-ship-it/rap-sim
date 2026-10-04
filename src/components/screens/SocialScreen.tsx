import { useMemo, useState } from 'react';
import { useGameStore, fanbaseOf, feedCooldown, tagsLeftToday } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { cn } from '@/utils/cn';
import { dateToSerial } from '../../sim/gameClock';
import type { NPC, Platform, SocialPost } from '../../types/game';

const PLATFORM_INFO: Record<string, { name: string; mark: string; subtitle: string; placeholder: string; limit: number }> = {
  chirp: { name: 'Chirp', mark: 'C', subtitle: 'What’s happening', placeholder: 'What’s happening?', limit: 280 },
  snapgram: { name: 'Snapgram', mark: 'S', subtitle: 'Share your world', placeholder: 'Write a caption...', limit: 2200 },
  clip: { name: 'Clip', mark: '▶', subtitle: 'Short-form video', placeholder: 'Describe your clip...', limit: 500 },
  circle: { name: 'Circle', mark: 'O', subtitle: 'Communities', placeholder: 'Share something with your community...', limit: 5000 },
};

type Tab = 'home' | 'trending' | 'mentions' | 'profile';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
}

function postAge(post: SocialPost, nowSerial: number): string {
  if (typeof post.daySerial === 'number') {
    const days = nowSerial - post.daySerial;
    if (days <= 0) return 'now';
    if (days === 1) return '1d';
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }
  const mins = Math.floor((Date.now() - new Date(post.timestamp).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  return `${Math.floor(mins / 60)}h`;
}

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <div className={cn('rounded-full bg-ink text-bg font-bold flex items-center justify-center shrink-0', large ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs')}>{initials(name)}</div>;
}

function ChirpPost({ post, nowSerial, onLike }: { post: SocialPost; nowSerial: number; onLike: () => void }) {
  return (
    <article className="px-4 py-4 border-b border-line hover:bg-white/[0.018] transition-colors">
      <div className="flex gap-3">
        <Avatar name={post.authorName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="font-bold text-ink truncate">{post.authorName}</span>
            {post.authorId !== 'player' && <span className="text-amber">✓</span>}
            <span className="text-ink3">@{post.authorName.toLowerCase().replace(/\s+/g, '_')}</span>
            <span className="text-ink3">· {postAge(post, nowSerial)}</span>
          </div>
          <p className="text-[14px] text-ink mt-1.5 whitespace-pre-wrap leading-relaxed">{post.content}</p>
          {post.relatedSongId && <div className="mt-3 rounded-xl border border-line bg-card p-3 text-[12px] text-ink2">Music · linked to a release in the catalogue</div>}
          <div className="grid grid-cols-4 max-w-[520px] mt-3 text-ink3 text-[12px]">
            <button className="text-left hover:text-ink">○ {post.comments.length}</button>
            <button className="text-left hover:text-ink">↻ {post.shares}</button>
            <button className="text-left hover:text-amber" onClick={onLike}>♡ {post.likes}</button>
            <button className="text-left hover:text-ink">🔖</button>
          </div>
          {post.comments.length > 0 && (
            <div className="mt-3 space-y-2">
              {post.comments.slice(0, 2).map(c => (
                <div key={c.id} className="flex gap-2 text-[12px]">
                  <div className="w-6 h-6 rounded-full bg-card2 flex items-center justify-center text-[9px] font-bold text-ink2">{initials(c.authorName)}</div>
                  <div><span className="font-semibold text-ink">{c.authorName}</span> <span className="text-ink2">{c.content}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RealisticShell({ platform, children, right }: { platform: Platform; children: React.ReactNode; right: React.ReactNode }) {
  const info = PLATFORM_INFO[platform];
  return (
    <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[72px_minmax(0,640px)_300px] gap-0 lg:border-x border-line min-h-[calc(100vh-48px)]">
      <aside className="hidden lg:block border-r border-line px-3 py-4">
        <div className="w-12 h-12 rounded-full bg-amber text-black flex items-center justify-center font-black text-xl mb-8">{info.mark}</div>
        <div className="space-y-4 text-center text-xl text-ink2">
          <div className="font-bold text-ink">⌂</div><div>⌕</div><div>♧</div><div>♡</div><div>✉</div><div>☻</div>
        </div>
      </aside>
      <main className="min-w-0 border-r border-line">
        {children}
      </main>
      <aside className="hidden lg:block p-4 space-y-4">{right}</aside>
    </div>
  );
}

export function SocialScreen({ platform }: { platform: Platform }) {
  const s = useGameStore();
  const { player, socialPosts, trending, npcs } = s;
  const [tab, setTab] = useState<Tab>('home');
  const [postContent, setPostContent] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const nowSerial = dateToSerial(s.gameDate);
  const info = PLATFORM_INFO[platform] ?? PLATFORM_INFO.chirp;
  const cooldown = feedCooldown(s);
  const tagsLeft = tagsLeftToday(s);
  const fanbase = player ? fanbaseOf(s) : 0;
  const posts = useMemo(() => socialPosts.filter(p => p.platform === platform).slice(0, 50), [socialPosts, platform]);

  const mentions = useMemo(() => socialPosts.filter(p => player && !p.isPlayerPost && (p.content.toLowerCase().includes(player.artistName.toLowerCase()) || p.comments.some(c => c.content.toLowerCase().includes(player.artistName.toLowerCase())))).slice(0, 30), [socialPosts, player]);
  const people = useMemo(() => {
    if (!player) return [] as NPC[];
    return npcs.filter(n => n.role === 'artist' && (n.country === player.country || n.relationshipScore !== 0)).slice(0, 12);
  }, [npcs, player]);

  function refresh() {
    const r = s.refreshFeed();
    setFlash(r.message);
  }

  function post() {
    if (!postContent.trim()) return;
    s.createPost(platform, postContent.trim());
    setPostContent('');
    setFlash('Posted.');
  }

  const rightRail = (
    <>
      <div className="relative">
        <input placeholder="Search Chirp" className="w-full bg-card border border-line rounded-full px-4 py-2.5 text-[12px] text-ink outline-none focus:border-amber" />
      </div>
      <Card className="p-4">
        <div className="font-black text-ink text-[15px]">What’s happening</div>
        <div className="mt-3 space-y-4">
          {(trending ?? []).slice(0, 5).map((t, i) => <div key={`${t.tag}-${i}`}><div className="text-[10px] text-ink3">Trending · {t.posts} posts</div><div className="text-[13px] font-bold text-ink mt-0.5">{t.tag}</div><div className="text-[11px] text-ink3 mt-0.5">{t.reason}</div></div>)}
          {(trending ?? []).length === 0 && <div className="text-[12px] text-ink3">Trends are still forming around the scene.</div>}
        </div>
      </Card>
      <Card className="p-4">
        <div className="font-black text-ink text-[15px]">Who to follow</div>
        <div className="mt-3 space-y-3">
          {people.slice(0, 4).map(n => <div key={n.id} className="flex items-center gap-2"><Avatar name={n.name} /><div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-ink truncate">{n.name}</div><div className="text-[10px] text-ink3 truncate">{n.genre ?? 'artist'} · {n.city ?? n.country}</div></div><button className="rounded-full bg-ink text-bg px-3 py-1 text-[10px] font-bold">Follow</button></div>)}
        </div>
      </Card>
      <div className="text-[10px] text-ink3 leading-relaxed">RAP LIFE social · fictional network · {fanbase.toLocaleString()} player fans</div>
    </>
  );

  return (
    <RealisticShell platform={platform} right={rightRail}>
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-[#0A0B10]/90 border-b border-line">
        <div className="px-4 py-3 flex items-center justify-between">
          <div><div className="text-[17px] font-black text-ink">{info.name}</div><div className="text-[10px] text-ink3">{info.subtitle}</div></div>
          <div className="flex items-center gap-2"><Button size="sm" variant="secondary" onClick={refresh} disabled={!cooldown.ready}>{cooldown.ready ? 'Refresh' : `${cooldown.waitMinutes}m`}</Button></div>
        </div>
        <div className="grid grid-cols-4">
          {(['home','trending','mentions','profile'] as Tab[]).map(t => <button key={t} onClick={() => setTab(t)} className={cn('py-3 text-[11px] font-semibold border-b-2', tab === t ? 'text-ink border-amber' : 'text-ink3 border-transparent hover:text-ink')}>{t === 'home' ? 'For You' : t === 'trending' ? 'Trending' : t === 'mentions' ? 'Mentions' : 'Profile'}</button>)}
        </div>
      </header>

      {flash && <div className="mx-4 mt-3 rounded-xl border border-line bg-card px-3 py-2 text-[11px] text-ink2">{flash}</div>}

      {tab === 'home' && (
        <>
          <div className="px-4 py-4 border-b border-line">
            <div className="flex gap-3"><Avatar name={player?.artistName ?? 'Artist'} large /><div className="flex-1"><textarea value={postContent} onChange={e => setPostContent(e.target.value)} maxLength={info.limit} rows={platform === 'circle' ? 4 : 3} placeholder={info.placeholder} className="w-full bg-transparent outline-none resize-none text-[15px] text-ink placeholder:text-ink3" /><div className="flex items-center justify-between"><span className="text-[10px] text-ink3">{postContent.length}/{info.limit}</span><Button size="sm" variant="gold" onClick={post} disabled={!postContent.trim()}>Post</Button></div></div></div>
          </div>
          {posts.length === 0 ? <div className="p-8 text-center text-[12px] text-ink3">No posts yet. The scene will populate as the world moves.</div> : posts.map(p => <ChirpPost key={p.id} post={p} nowSerial={nowSerial} onLike={() => s.likePost(p.id)} />)}
        </>
      )}

      {tab === 'trending' && <div className="p-4 space-y-3">{(trending ?? []).map((t,i) => <Card key={`${t.tag}-${i}`} className="p-4"><div className="text-[10px] text-ink3">Trending topic · #{i+1}</div><div className="text-[16px] font-black text-ink mt-1">{t.tag}</div><div className="text-[12px] text-ink2 mt-1">{t.reason}</div><div className="text-[10px] text-ink3 mt-2">{t.posts.toLocaleString()} posts</div></Card>)}</div>}

      {tab === 'mentions' && <div>{mentions.length ? mentions.map(p => <ChirpPost key={p.id} post={p} nowSerial={nowSerial} onLike={() => s.likePost(p.id)} />) : <div className="p-8 text-center text-[12px] text-ink3">No recent mentions of your artist.</div>}</div>}

      {tab === 'profile' && player && <div>
        <div className="h-28 bg-card2" />
        <div className="px-4 pb-5 border-b border-line"><div className="-mt-7 mb-3"><Avatar name={player.artistName} large /></div><div className="flex items-start justify-between"><div><div className="text-xl font-black text-ink">{player.artistName}</div><div className="text-[12px] text-ink3">@{player.artistName.toLowerCase().replace(/\s+/g,'_')}</div></div><button className="rounded-full border border-line px-4 py-1.5 text-[11px] text-ink">Edit profile</button></div><p className="text-[12px] text-ink2 mt-3">{player.genre.replace('_',' ')} artist · {player.city}, {player.country}</p><div className="flex gap-5 mt-3 text-[11px]"><span><b className="text-ink">{fanbase.toLocaleString()}</b> <span className="text-ink3">followers</span></span><span><b className="text-ink">{posts.filter(p => p.isPlayerPost).length}</b> <span className="text-ink3">posts</span></span><span><b className="text-ink">{tagsLeft}</b> <span className="text-ink3">tags left today</span></span></div></div>
        {posts.filter(p=>p.isPlayerPost).map(p => <ChirpPost key={p.id} post={p} nowSerial={nowSerial} onLike={() => s.likePost(p.id)} />)}
      </div>}
    </RealisticShell>
  );
}

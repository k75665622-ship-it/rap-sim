// ─── SOCIAL: SOMEBODY'S PAGE ───────────────────────────────────────────────
// Tap a name or a face anywhere in the apps and you land on their page on that
// app — not their streaming profile. Their posts, the replies they've left,
// what they've liked, how many follow them and who you know among them. The
// music, the contact card and the DMs are one tap further.
//
// Real people get a plain official page: their name, role, country and their
// real activity in the game (the release cards). No bio in their voice.

import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { SlidePanel, gradientFor } from '../ui/kit';
import { useGameStore, labelFollowers } from '../../store/gameStore';
import { APP_META, SOCIAL_APPS, fanbaseNameFor, type SocialApp } from '../../sim/social';
import { audienceOf, liveCounts } from '../../sim/socialLive';
import { hashString } from '../../sim/rng';
import { isRealId } from '../../sim/realPeople';
import type { NPC, SocialComment, SocialPost } from '../../types/game';
import { IconVerified } from '../icons';
import { Avatar, RichText, handleOf } from './shared';

const minuteOf = (p: SocialPost) => p.postedMinute ?? (p.daySerial ?? 0) * 1440;
const commentMinute = (p: SocialPost, c: SocialComment) => c.minute ?? minuteOf(p);

/** How much of someone's audience is on each app. */
const APP_SHARE: Record<SocialApp, number> = { chirp: 0.55, snapgram: 1, clip: 0.85, circle: 0.06 };

const ROLE: Record<string, [string, string]> = {
  artist: ['🎤', 'Artist'], producer: ['🎛️', 'Producer'], manager: ['💼', 'Artist management'], rival_manager: ['💼', 'Artist management'],
  lawyer: ['⚖️', 'Entertainment lawyer'], label_ceo: ['🏢', 'Label'], media: ['📰', 'Media'], blogger: ['✍️', 'Music blog'],
  dj: ['🎧', 'DJ'], promoter: ['🎪', 'Events & shows'], stylist: ['👗', 'Stylist'], photographer: ['📷', 'Photographer'],
  songwriter: ['📝', 'Songwriter'], engineer: ['🎚️', 'Mix & master engineer'], publicist: ['📣', 'PR'], radio_owner: ['📻', 'Radio'],
  choreographer: ['💃', 'Choreographer'], venue_owner: ['🏟️', 'Venue'], investor: ['💰', 'Investor'], distributor: ['📦', 'Distribution'],
  tour_manager: ['🚌', 'Tour manager'], session_musician: ['🎸', 'Session musician'], fan_account: ['💬', 'Fan account'], ar: ['🔍', 'A&R'], a_and_r_scout: ['🔍', 'A&R'],
};

function bioFor(npc: NPC): string {
  const [emoji, label] = ROLE[npc.role] ?? ['👤', npc.role.replace(/_/g, ' ')];
  const where = npc.city ? `${npc.city}, ${npc.country}` : npc.country;
  if (isRealId(npc.id)) return `${emoji} ${label} · ${npc.country}\nOfficial account`;
  const h = hashString(npc.id);
  const lines: Record<string, string[]> = {
    artist: [`${npc.genre ? npc.genre.replace(/_/g, ' ') + ' · ' : ''}${where} 📍`, 'Bookings & features: DM 📩', 'Stream the new one 🎧', 'God first. Music second. 🙏🏾', 'Independent. Built it myself.'],
    producer: [`Beats for sale · ${where}`, 'Send a voice note, I\'ll send the beat 🎛️', 'Placements in DM'],
    media: [`${npc.country} music news, first.`, 'Tips & stories in DM 📩'],
    blogger: [`Your favourite blog's favourite blog · ${npc.country}`, 'Tea, takes and exclusives ☕'],
    dj: [`Weekend sets · ${where}`, 'Send me your records 🎧'],
    promoter: [`Shows & events · ${where}`, 'Booking now for next season 🎟️'],
  };
  const pool = lines[npc.role] ?? [`${label} · ${where}`, 'DMs open for work'];
  return `${emoji} ${label}${npc.role === 'artist' ? '' : ` · ${where}`}\n${pool[h % pool.length]}`;
}

export function ProfileView({ id, app, now, onClose, onOpenPost, onOpenProfile, renderPost, onFlash }: {
  id: string | null;
  app: SocialApp;
  now: number;
  onClose: () => void;
  onOpenPost: (postId: string) => void;
  onOpenProfile: (id: string) => void;
  renderPost: (p: SocialPost, app: SocialApp) => ReactNode;
  onFlash: (r: { ok: boolean; message: string }) => void;
}) {
  const npcs = useGameStore((s) => s.npcs);
  const posts = useGameStore((s) => s.socialPosts);
  const following = useGameStore((s) => s.following);
  const followedBy = useGameStore((s) => s.followedBy);
  const blocked = useGameStore((s) => s.blocked);
  const activity = useGameStore((s) => s.socialActivity);
  const npcSongs = useGameStore((s) => s.npcSongs);
  const upcoming = useGameStore((s) => s.npcUpcoming);
  const player = useGameStore((s) => s.player);
  const fanbaseName = useGameStore((s) => s.fanbaseName);
  const myLabel = useGameStore((s) => s.label);
  const followAccount = useGameStore((s) => s.followAccount);
  const unfollowAccount = useGameStore((s) => s.unfollowAccount);
  const blockAccount = useGameStore((s) => s.blockAccount);
  const unblockAccount = useGameStore((s) => s.unblockAccount);
  const selectNPC = useGameStore((s) => s.selectNPC);
  const setScreen = useGameStore((s) => s.setScreen);
  const openArtist = useGameStore((s) => s.openArtist);
  const [view, setView] = useState<SocialApp>(app);
  const [tab, setTab] = useState<'posts' | 'replies' | 'likes' | 'people'>('posts');
  const [menu, setMenu] = useState(false);
  const [lastId, setLastId] = useState(id);
  if (id !== lastId) { setLastId(id); setView(app); setTab('posts'); setMenu(false); }

  const npc = useMemo(() => (id ? npcs.find((n) => n.id === id) : undefined), [npcs, id]);
  const landed = useMemo(() => posts.filter((p) => minuteOf(p) <= now), [posts, now]);
  const theirs = useMemo(() => (id ? landed.filter((p) => p.authorId === id).sort((a, b) => minuteOf(b) - minuteOf(a)) : []), [landed, id]);
  const replies = useMemo(() => {
    if (!id) return [];
    const out: { post: SocialPost; c: SocialComment }[] = [];
    for (const p of landed) {
      for (const c of p.comments) {
        if (c.authorId === id && commentMinute(p, c) <= now) out.push({ post: p, c });
        for (const r of c.replies ?? []) if (r.authorId === id && commentMinute(p, r) <= now) out.push({ post: p, c: r });
      }
    }
    return out.sort((a, b) => commentMinute(b.post, b.c) - commentMinute(a.post, a.c)).slice(0, 40);
  }, [landed, id, now]);
  const likes = useMemo(() => {
    if (!id) return [];
    const byId = new Map(landed.map((p) => [p.id, p]));
    const real = (activity ?? []).filter((a) => a.kind === 'like' && a.actorId === id && a.minute <= now).map((a) => byId.get(a.postId ?? '')).filter(Boolean) as SocialPost[];
    // Everything else they'd plausibly have tapped: their scene, their friends.
    const others = landed.filter((p) => p.authorId !== id && p.authorId !== 'player' && (hashString(id + p.id) % 7 === 0) && (!npc || !p.authorId.startsWith('fan:') || hashString(p.id) % 3 === 0));
    const seen = new Set<string>();
    return [...real, ...others].filter((p) => !seen.has(p.id) && seen.add(p.id)).sort((a, b) => minuteOf(b) - minuteOf(a)).slice(0, 30);
  }, [landed, activity, id, npc, now]);

  if (!id) return null;
  const isFan = id.startsWith('fan:');
  const labelAcc = id.startsWith('label:') && myLabel && id === `label:${myLabel.id}` ? myLabel : null;
  const name = labelAcc?.name ?? npc?.name ?? theirs[0]?.authorName ?? replies[0]?.c.authorName ?? id.replace(/^fan:/, '');
  const h = hashString(id);
  const real = !!npc && isRealId(npc.id);
  const org = id.startsWith('org:');
  const verified = org || id === 'scene_watch' || (!!npc && (real || npc.fame >= 50 || ((npc.role === 'media' || npc.role === 'blogger') && npc.fame >= 25)));
  const followSet = new Set(following ?? []);
  const iFollow = followSet.has(id);
  const followsMe = (followedBy ?? []).includes(id);
  const isBlocked = (blocked ?? []).includes(id);
  const myFans = fanbaseName ?? (player ? fanbaseNameFor(player.artistName, player.id) : 'fans');

  const followers = labelAcc ? Math.round(labelFollowers(labelAcc, npcs) * APP_SHARE[view]) : npc ? Math.round(audienceOf(npc) * APP_SHARE[view]) : isFan ? 40 + (h % 2600) : org ? 400_000 + (h % 600_000) : 120_000 + (h % 90_000);
  const followingCount = npc ? (real || npc.fame >= 80 ? 40 + (h % 260) : 180 + (h % 1100)) : 150 + (h % 1800);
  const appPosts = theirs.filter((p) => p.platform === view);
  // The feed only holds the last few weeks; the account is older than that.
  const history = npc ? 60 + Math.round(npc.fame * 9) + (h % 140) : isFan ? 300 + (h % 6000) : 4000 + (h % 3000);
  const postCount = appPosts.length + Math.round(history * APP_SHARE[view]);
  const likeTotal = appPosts.reduce((a, p) => a + liveCounts(p, now).likes, 0) + Math.round(followers * (1.5 + (h % 30) / 10));

  const fanBio = (() => {
    if (!isFan) return '';
    const aboutMe = theirs.filter((p) => p.tags?.some((t) => t.id === 'player') || (player && p.content.includes(player.artistName))).length;
    if (player && aboutMe >= Math.max(1, theirs.length / 2)) return `${myFans} 🖤 · ${player.artistName} day one\nfan account, not affiliated`;
    return ['music head. opinions are mine', 'here for the music & the drama 🍿', 'stan twitter retiree', 'I was there first. receipts available'][h % 4];
  })();
  const bio = labelAcc ? `🏢 Record label · ${labelAcc.country}\n${labelAcc.roster.length ? `Home of ${labelAcc.roster.slice(0, 3).map((r) => r.name).join(', ')}${labelAcc.roster.length > 3 ? ` +${labelAcc.roster.length - 3}` : ''}` : 'Signing now. Demos in DM.'}` : npc ? bioFor(npc) : isFan ? fanBio : org ? '🏆 Official account. Nominations, voting and the winners, as they\'re announced.' : 'Who\'s doing what, as it happens. 👀';

  const latest = npc && (npc.role === 'artist' || npc.role === 'producer')
    ? (npcSongs as { id: string; title: string; ownerId?: string; releaseDate?: string }[]).filter((s) => s.ownerId === npc.id).slice(-1)[0]
    : undefined;
  const announced = npc ? (upcoming ?? []).find((u) => u.song.ownerId === npc.id) : undefined;

  // People you follow who follow them.
  const known = npc
    ? (following ?? []).map((fid) => npcs.find((n) => n.id === fid)).filter((n): n is NPC => !!n && n.id !== id && (n.country === npc.country || npc.fame >= 70) && hashString(n.id + id) % 3 !== 0)
    : [];
  // Who they follow, from who they are: their country's bigger names, and you if they do.
  const theyFollow = npc
    ? npcs.filter((n) => n.id !== id && n.country === npc.country && n.role === 'artist' && n.fame >= Math.min(70, npc.fame) && hashString(id + n.id) % 4 === 0).slice(0, 18)
    : [];

  const meta = APP_META[view];
  const [a, b] = gradientFor(id);
  const msg = () => { if (!npc) return; selectNPC(npc.id); setScreen('pingchat'); onClose(); };

  return (
    <SlidePanel open onClose={onClose} width={520} title={<span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />{meta.name}</span>} subtitle={handleOf(name)}>
      <div className="h-24" style={{ background: `linear-gradient(120deg, ${a}88, ${b}33 60%, transparent)` }} />
      <div className="px-4 pb-3 border-b border-line">
        <div className="-mt-10 mb-2 flex items-end justify-between gap-2">
          <Avatar name={name} seed={id} size={80} ring={meta.color} />
          {npc && !isBlocked && (
            <div className="relative flex items-center gap-1.5 pb-1">
              <button onClick={() => onFlash(iFollow ? unfollowAccount(id) : followAccount(id))} className={cn('h-8 px-4 rounded-full text-[12px] font-semibold', iFollow ? 'border border-line text-ink' : 'bg-ink text-bg')}>{iFollow ? 'Following' : followsMe ? 'Follow back' : 'Follow'}</button>
              <button onClick={msg} className="h-8 px-3.5 rounded-full border border-line text-[12px] font-semibold text-ink">Message</button>
              <button onClick={() => setMenu((m) => !m)} className="w-8 h-8 rounded-full border border-line text-ink2 hover:text-ink" aria-label="More">⋯</button>
              {menu && (
                <div className="absolute right-0 top-10 z-10 w-48 rounded-[12px] border border-line bg-sidebar shadow-xl overflow-hidden">
                  {(npc.role === 'artist' || npc.role === 'producer') && <button onClick={() => { onClose(); openArtist(npc.id); }} className="w-full text-left px-3 py-2.5 text-[13px] text-ink hover:bg-white/5">🎧 Their music</button>}
                  <button onClick={() => { selectNPC(npc.id); setScreen('npc_profile'); onClose(); }} className="w-full text-left px-3 py-2.5 text-[13px] text-ink hover:bg-white/5">📇 Contact card</button>
                  <button onClick={() => { onFlash(blockAccount(id)); setMenu(false); }} className="w-full text-left px-3 py-2.5 text-[13px] text-fall hover:bg-white/5">Block</button>
                </div>
              )}
            </div>
          )}
          {npc && isBlocked && <button onClick={() => { unblockAccount(id); onFlash({ ok: true, message: `Unblocked ${name}.` }); }} className="h-8 px-4 rounded-full border border-line text-[12px] font-semibold text-ink mb-1">Unblock</button>}
        </div>
        <div className="flex items-center gap-1.5 text-[19px] font-bold text-ink">{name.replace(/^@/, '')}{verified && <IconVerified size={17} className="text-[#4DA3FF] shrink-0" />}</div>
        <div className="flex items-center gap-2 text-[12px] text-ink3 flex-wrap">
          <span>{handleOf(name)}</span>
          {followsMe && <span className="px-1.5 h-[18px] rounded bg-white/[0.08] text-ink2 text-[10px] font-semibold flex items-center">Follows you</span>}
          {isFan && <span className="px-1.5 h-[18px] rounded bg-white/[0.08] text-ink2 text-[10px] font-semibold flex items-center">Fan account</span>}
          {labelAcc && <span className="px-1.5 h-[18px] rounded bg-amber/15 text-amber text-[10px] font-semibold flex items-center">Your label</span>}
          {labelAcc && <button onClick={() => { onClose(); setScreen('label'); }} className="text-[11px] font-semibold text-amber">Run the label →</button>}
        </div>
        {bio && <p className="mt-2 text-[13px] text-ink2 whitespace-pre-line leading-snug">{bio}</p>}
        {announced && <div className="mt-2 inline-flex items-center gap-2 rounded-[10px] border border-amber/40 bg-amber/[0.06] px-2.5 py-1.5 text-[12px] text-ink">🗓️ "{announced.song.title}" · coming soon</div>}
        {!announced && latest && <button onClick={() => { onClose(); openArtist(npc!.id); }} className="mt-2 inline-flex items-center gap-2 rounded-[10px] border border-line bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-ink2 hover:text-ink"><span className="text-amber">♫</span> Latest: "{latest.title}"</button>}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[['Posts', postCount], ['Followers', followers], ['Following', followingCount], ['Likes', likeTotal]].map(([l, v]) => (
            <button key={l as string} onClick={() => (l === 'Followers' || l === 'Following') && setTab('people')} className="rounded-[10px] bg-white/[0.03] py-2">
              <div className="text-[15px] font-bold text-ink num">{compact(v as number)}</div>
              <div className="text-[10px] uppercase tracking-wider text-ink3">{l}</div>
            </button>
          ))}
        </div>
        {known.length > 0 && <div className="mt-2 text-[12px] text-ink3">Followed by <span className="text-ink2">{known.slice(0, 2).map((n) => n.name).join(', ')}</span>{known.length > 2 ? ` and ${known.length - 2} others you follow` : ''}</div>}
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
          {SOCIAL_APPS.map((s) => {
            const n = theirs.filter((p) => p.platform === s).length;
            return (
              <button key={s} onClick={() => setView(s)} className={cn('h-7 px-2.5 rounded-full border text-[11px] font-semibold shrink-0', s === view ? 'text-black' : 'border-line text-ink3')} style={s === view ? { background: APP_META[s].color, borderColor: APP_META[s].color } : undefined}>
                {APP_META[s].name}{n ? ` · ${n}` : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex border-b border-line text-[13px] font-semibold">
        {([['posts', 'Posts'], ['replies', 'Replies'], ['likes', 'Likes'], ['people', npc ? 'People' : '']] as const).filter(([, l]) => l).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={cn('flex-1 h-11 border-b-2 transition', tab === t ? 'border-ink text-ink' : 'border-transparent text-ink3 hover:text-ink2')}>{l}</button>
        ))}
      </div>

      {isBlocked ? <div className="p-10 text-center text-[13px] text-ink3">You blocked this account. Unblock to see their posts.</div> : (
        <>
          {tab === 'posts' && (appPosts.length === 0
            ? <div className="p-10 text-center text-[13px] text-ink3">No recent posts on {meta.name}.{theirs.length ? ' Check their other apps above.' : ''}</div>
            : view === 'snapgram' || view === 'clip'
              ? <div className="grid grid-cols-3 gap-1 p-1">{appPosts.slice(0, 30).map((p) => <Tile key={p.id} post={p} now={now} tall={view === 'clip'} onOpen={() => onOpenPost(p.id)} />)}</div>
              : <div className={view === 'circle' ? 'space-y-3 p-3' : ''}>{appPosts.slice(0, 30).map((p) => renderPost(p, view))}</div>)}

          {tab === 'replies' && (replies.length === 0
            ? <div className="p-10 text-center text-[13px] text-ink3">No replies yet.</div>
            : <div>{replies.map(({ post, c }) => (
                <button key={c.id} onClick={() => onOpenPost(post.id)} className="w-full text-left px-4 py-3 border-b border-line hover:bg-white/[0.02]">
                  <div className="text-[11px] text-ink3">Replying to <span className="text-[#4DA3FF]">{handleOf(post.authorName)}</span> on {APP_META[post.platform as SocialApp]?.name ?? 'Chirp'}</div>
                  <RichText text={c.content} className="text-[14px] text-ink mt-1 leading-snug" />
                  <div className="mt-1.5 rounded-[10px] border border-line px-2.5 py-1.5 text-[12px] text-ink3 truncate">{post.authorName}: {post.content}</div>
                  <div className="mt-1 text-[11px] text-ink3">♥ {compact(c.likes)}</div>
                </button>
              ))}</div>)}

          {tab === 'likes' && (likes.length === 0
            ? <div className="p-10 text-center text-[13px] text-ink3">Nothing liked lately.</div>
            : <div>{likes.map((p) => (
                <button key={p.id} onClick={() => onOpenPost(p.id)} className="w-full text-left flex gap-3 px-4 py-3 border-b border-line hover:bg-white/[0.02]">
                  <Avatar name={p.authorName} seed={p.authorId} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-ink3"><span className="font-semibold text-ink">{p.authorId === 'player' ? 'You' : p.authorName}</span> · {APP_META[p.platform as SocialApp]?.name}</div>
                    <RichText text={p.content} className="text-[13px] text-ink2 mt-0.5 line-clamp-2" />
                  </div>
                  <span className="text-[#F91880] text-[14px]">♥</span>
                </button>
              ))}</div>)}

          {tab === 'people' && npc && (
            <div className="p-3 space-y-4">
              <People title={`Followers you know · ${known.length}`} empty="Nobody you follow follows them." list={known} following={followSet} onOpen={onOpenProfile} />
              <People title="They follow" empty="Their following list is private." list={theyFollow} following={followSet} onOpen={onOpenProfile} extra={followsMe && player ? player.artistName : undefined} />
            </div>
          )}
        </>
      )}
    </SlidePanel>
  );
}

function People({ title, empty, list, following, onOpen, extra }: { title: string; empty: string; list: NPC[]; following: Set<string>; onOpen: (id: string) => void; extra?: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-1.5 px-1">{title}</div>
      {extra && <div className="flex items-center gap-3 rounded-[10px] px-2 py-1.5"><Avatar name={extra} seed="player" size={32} /><div className="text-[13px] text-ink flex-1">{extra} <span className="text-ink3">(you)</span></div></div>}
      {list.length === 0 && !extra && <div className="text-[12px] text-ink3 px-1">{empty}</div>}
      {list.map((n) => (
        <button key={n.id} onClick={() => onOpen(n.id)} className="w-full flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-white/[0.03] text-left">
          <Avatar name={n.name} seed={n.id} size={32} />
          <div className="min-w-0 flex-1"><div className="text-[13px] text-ink truncate">{n.name}</div><div className="text-[11px] text-ink3 truncate">{(ROLE[n.role]?.[1] ?? n.role)} · {n.country}</div></div>
          {following.has(n.id) && <span className="text-[10px] text-ink3">Following</span>}
        </button>
      ))}
    </div>
  );
}

function Tile({ post, now, tall, onOpen }: { post: SocialPost; now: number; tall: boolean; onOpen: () => void }) {
  const [a, b] = gradientFor(post.id + (tall ? 'clip' : ''));
  const live = liveCounts(post, now);
  return (
    <button onClick={onOpen} className={cn('relative overflow-hidden text-left', tall ? 'aspect-[9/14] rounded-[8px]' : 'aspect-square')} style={{ background: `linear-gradient(${(post.id.charCodeAt(0) * 7) % 360}deg, ${a}, ${b})` }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-x-2 top-2 text-white text-[11px] leading-tight line-clamp-3 drop-shadow">{post.content}</div>
      <div className="absolute bottom-1.5 left-2 text-white text-[11px] font-semibold">{tall ? `▷ ${compact(live.views)}` : `♥ ${compact(live.likes)}`}</div>
      {post.viral && <div className="absolute top-1.5 right-1.5 text-[11px]">🔥</div>}
    </button>
  );
}

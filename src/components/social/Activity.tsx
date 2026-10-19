// ─── SOCIAL: ACTIVITY ──────────────────────────────────────────────────────
// Who liked, commented, followed, tagged you — as it happens.

import { cn } from '@/utils/cn';
import { minutesAgo } from '../../sim/socialLive';
import type { SocialActivity } from '../../types/game';
import { Avatar } from './shared';

const ICON: Record<SocialActivity['kind'], string> = {
  like: '♥', comment: '💬', follow: '➕', mention: '@', repost: '↻', milestone: '🏆', unfollow: '➖', story: '👁', verified: '✓',
};
const COLOR: Record<SocialActivity['kind'], string> = {
  like: '#F91880', comment: '#4DA3FF', follow: '#2ECC71', mention: '#F5B301', repost: '#2ECC71', milestone: '#F5B301', unfollow: '#FF5C5C', story: '#E93D82', verified: '#4DA3FF',
};

export function ActivityList({ items, now, onOpenPost, onOpenArtist }: { items: SocialActivity[]; now: number; onOpenPost: (id: string) => void; onOpenArtist: (id: string) => void }) {
  if (!items.length) return <div className="p-10 text-center text-[13px] text-ink3">Nothing yet. Post something and it starts moving.</div>;
  return (
    <div>
      {items.map((a) => (
        <button
          key={a.id}
          onClick={() => (a.postId ? onOpenPost(a.postId) : a.actorId ? onOpenArtist(a.actorId) : undefined)}
          className={cn('w-full flex items-center gap-3 px-4 py-3 border-b border-line text-left hover:bg-white/[0.02]', !a.read && 'bg-[#4DA3FF]/[0.05]')}
        >
          <div className="relative">
            {a.actorName ? <span role="link" onClick={(e) => { if (a.actorId) { e.stopPropagation(); onOpenArtist(a.actorId); } }}><Avatar name={a.actorName} seed={a.actorId ?? a.actorName} size={38} /></span> : <div className="w-[38px] h-[38px] rounded-full bg-white/[0.06] flex items-center justify-center text-[16px]">{ICON[a.kind]}</div>}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-black" style={{ background: COLOR[a.kind] }}>{ICON[a.kind]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-ink leading-snug line-clamp-2">{a.text}</div>
            <div className="text-[11px] text-ink3 mt-0.5">{minutesAgo(now, a.minute)}</div>
          </div>
          {!a.read && <span className="w-2 h-2 rounded-full bg-[#4DA3FF] shrink-0" />}
        </button>
      ))}
    </div>
  );
}

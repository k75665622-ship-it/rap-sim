// ─── UPDATES ───────────────────────────────────────────────────────────────
// Everything the world told you: your notifications (charts, money, features,
// milestones), the headlines about you and the scene, what's trending, and
// the storylines still developing.

import { useMemo, useState } from 'react';
import { openNotificationAction } from '../notificationRoute';
import { useGameStore } from '../../store/gameStore';
import { dateToSerial } from '../../sim/gameClock';
import { gradientFor } from '../ui/kit';
import { compact } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { GameNotification } from '../../types/game';

type Tab = 'alerts' | 'news' | 'trending';
type Kind = 'all' | 'charts' | 'money' | 'people' | 'milestones';

const KIND_META: Record<string, { emoji: string; label: string; group: Kind }> = {
  chart_debut: { emoji: '📈', label: 'Chart debut', group: 'charts' },
  chart_move: { emoji: '↗️', label: 'Chart move', group: 'charts' },
  chart_number_one: { emoji: '👑', label: 'Number one', group: 'charts' },
  chart_exit: { emoji: '📉', label: 'Off the chart', group: 'charts' },
  certification: { emoji: '💿', label: 'Certified', group: 'milestones' },
  milestone: { emoji: '🏁', label: 'Milestone', group: 'milestones' },
  artist_release: { emoji: '🎵', label: 'New music', group: 'people' },
  artist_video: { emoji: '🎬', label: 'New video', group: 'people' },
  subscriber: { emoji: '🔔', label: 'Subscribers', group: 'milestones' },
  video_milestone: { emoji: '▶️', label: 'Video', group: 'milestones' },
  feature: { emoji: '🤝', label: 'People', group: 'people' },
  business: { emoji: '💼', label: 'Money', group: 'money' },
};

const CAT: Record<string, { emoji: string; cls: string }> = {
  award: { emoji: '🏆', cls: 'bg-amber/15 text-amber' },
  chart: { emoji: '📈', cls: 'bg-new/15 text-new' },
  beef: { emoji: '🔥', cls: 'bg-fall/15 text-fall' },
  feature: { emoji: '🎵', cls: 'bg-rise/15 text-rise' },
  show: { emoji: '🎭', cls: 'bg-re/15 text-re' },
  scandal: { emoji: '💥', cls: 'bg-fall/15 text-fall' },
  business: { emoji: '💼', cls: 'bg-new/15 text-new' },
  general: { emoji: '📰', cls: 'bg-white/10 text-ink2' },
};

export function NewsScreen() {
  const notifications = useGameStore((s) => s.notifications);
  const headlines = useGameStore((s) => s.headlines);
  const socialPosts = useGameStore((s) => s.socialPosts);
  const openThreads = useGameStore((s) => s.openThreads);
  const gameDate = useGameStore((s) => s.gameDate);
  const markRead = useGameStore((s) => s.markNotificationRead);
  const markAll = useGameStore((s) => s.markAllNotificationsRead);
  const clear = useGameStore((s) => s.clearNotifications);
  const [tab, setTab] = useState<Tab>('alerts');
  const [kind, setKind] = useState<Kind>('all');
  const today = dateToSerial(gameDate);
  const list = notifications ?? [];
  const unread = list.filter((n) => !n.read).length;

  const groups = useMemo(() => {
    const filtered = list.filter((n) => kind === 'all' || KIND_META[n.kind]?.group === kind);
    const out: { label: string; items: GameNotification[] }[] = [];
    for (const n of filtered) {
      const d = today - n.daySerial;
      const label = d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 7 ? 'This week' : 'Earlier';
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(n); else out.push({ label, items: [n] });
    }
    return out;
  }, [list, kind, today]);

  const open = (n: GameNotification) => {
    markRead(n.id);
    const a = n.action;
    if (!a) return;
    openNotificationAction(a);
  };

  const news = [...headlines].sort((a, b) => b.priority - a.priority).slice(0, 30);
  const trending = socialPosts.filter((p) => p.trendingScore > 20).sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 8);
  const threads = openThreads.filter((t) => !t.resolved);

  return (
    <div className="max-w-[760px] mx-auto space-y-4 pb-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-ink leading-tight">Updates</h1>
          <div className="text-[12px] text-ink3">{unread ? `${unread} unread` : 'All caught up'}</div>
        </div>
        {tab === 'alerts' && list.length > 0 && (
          <div className="flex gap-2">
            <button onClick={markAll} disabled={!unread} className="h-9 px-3 rounded-full border border-line text-[12px] font-semibold text-ink2 disabled:opacity-40">Mark all read</button>
            <button onClick={clear} className="h-9 px-3 rounded-full border border-line text-[12px] font-semibold text-ink3 hover:text-fall">Clear</button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {([['alerts', `🔔 Notifications${unread ? ` · ${unread}` : ''}`], ['news', '📰 Headlines'], ['trending', '🔥 Trending']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={cn('shrink-0 h-9 px-3.5 rounded-full border text-[13px] font-semibold', tab === id ? 'border-amber bg-amber text-black' : 'border-line bg-card text-ink2')}>{label}</button>
        ))}
      </div>

      {tab === 'alerts' && (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {([['all', 'All'], ['charts', 'Charts'], ['money', 'Money'], ['people', 'People'], ['milestones', 'Milestones']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setKind(id)} className={cn('shrink-0 h-8 px-3 rounded-full border text-[12px] font-semibold', kind === id ? 'border-amber/60 bg-amber/10 text-amber' : 'border-line text-ink3')}>{label}</button>
            ))}
          </div>
          {groups.length === 0 ? (
            <div className="rounded-[18px] border border-line bg-card p-10 text-center"><div className="text-4xl mb-2">🔔</div><div className="text-[13px] text-ink3">Nothing yet. Chart moves, money, features and milestones show up here.</div></div>
          ) : groups.map((g) => (
            <section key={g.label}>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-ink3 mb-2 px-1">{g.label}</div>
              <div className="rounded-[18px] border border-line bg-card divide-y divide-line/70 overflow-hidden">
                {g.items.map((n) => {
                  const meta = KIND_META[n.kind] ?? { emoji: '🔔', label: 'Update' };
                  const [a, b] = gradientFor(n.artSeed);
                  const age = today - n.daySerial;
                  const h = Math.floor(n.minuteOfDay / 60);
                  return (
                    <button key={n.id} onClick={() => open(n)} className={cn('w-full flex gap-3 p-3.5 text-left hover:bg-white/[0.03] transition', !n.read && 'bg-amber/[0.04]')}>
                      <div className="w-11 h-11 rounded-[12px] shrink-0 flex items-center justify-center text-[20px]" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>{meta.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-ink3">{meta.label}</span>
                          <span className="text-[11px] text-ink3 ml-auto shrink-0">{age <= 0 ? `${String(h).padStart(2, '0')}:${String(n.minuteOfDay % 60).padStart(2, '0')}` : `${age}d ago`}</span>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-amber shrink-0" />}
                        </div>
                        <div className={cn('text-[14px] leading-snug mt-0.5', n.read ? 'text-ink2' : 'text-ink font-semibold')}>{n.title}</div>
                        <div className="text-[12px] text-ink3 leading-snug mt-0.5">{n.body}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {tab === 'news' && (
        <div className="space-y-2.5">
          {news.length === 0 && <div className="rounded-[18px] border border-line bg-card p-10 text-center text-[13px] text-ink3">No headlines yet. Release music and make moves.</div>}
          {news.map((h, i) => {
            const c = CAT[h.category] ?? CAT.general;
            return (
              <article key={h.id} className={cn('rounded-[18px] border border-line bg-card p-4', i === 0 && h.priority >= 6 && 'border-fall/40')}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', c.cls)}>{c.emoji} {h.category}</span>
                  {h.priority >= 7 && <span className="text-[10px] font-bold uppercase text-fall">Breaking</span>}
                  <span className="text-[11px] text-ink3 ml-auto">{h.date}</span>
                </div>
                <h3 className={cn('font-bold text-ink leading-snug', i === 0 ? 'text-[18px]' : 'text-[15px]')}>{h.text}</h3>
                <p className="text-[13px] text-ink2 leading-relaxed mt-1">{h.fullStory}</p>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'trending' && (
        <div className="space-y-4">
          <section className="rounded-[18px] border border-line bg-card divide-y divide-line/70 overflow-hidden">
            {trending.length === 0 && <div className="p-6 text-center text-[13px] text-ink3">Nothing trending yet.</div>}
            {trending.map((p, i) => (
              <div key={p.id} className="p-3.5 flex gap-3">
                <span className="text-[13px] font-bold text-ink3 w-5 num">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink truncate">{p.authorName} <span className="text-ink3 font-normal">· {p.platform}</span></div>
                  <div className="text-[13px] text-ink2 leading-snug mt-0.5 line-clamp-2">{p.content}</div>
                  <div className="flex gap-4 mt-1.5 text-[11px] text-ink3 num"><span>❤️ {compact(p.likes)}</span><span>🔁 {compact(p.shares)}</span><span>💬 {compact(p.target?.comments ?? p.comments.length)}</span></div>
                </div>
              </div>
            ))}
          </section>
          {threads.length > 0 && (
            <section className="rounded-[18px] border border-line bg-card p-4">
              <div className="text-[14px] font-semibold text-ink mb-2">🕵️ Developing storylines</div>
              {threads.slice(0, 6).map((t) => (
                <div key={t.id} className="py-1.5 border-b border-line/50 last:border-0">
                  <div className="text-[13px] text-ink2">{t.type === 'beef' ? '🔥' : t.type === 'romance' ? '💕' : t.type === 'deal' ? '💼' : t.type === 'legal' ? '⚖️' : '📌'} {t.description}</div>
                  {t.escalationCount > 0 && <div className="text-[11px] text-fall mt-0.5">Escalated {t.escalationCount}×</div>}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

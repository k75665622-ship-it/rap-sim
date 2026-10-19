// ─── TOP BAR + NOTIFICATION PANEL ──────────────────────────────────────────
// One top bar for every music page: logo mark, search, country, bell, profile.
// The bell opens a slide-in feed. Every item in it comes from a real game event
// — nothing is generated for display.

import { Portrait } from '../avatar/Portrait';
import type { ReactNode } from 'react';
import { openNotificationAction } from '../notificationRoute';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { CountrySelect } from '../ui/CountrySelect';
import { Artwork, EmptyState, SearchInput, SlidePanel, Tag } from '../ui/kit';
import { PlatformLogo } from '../ui/cards';
import type { PlatformConfig } from '../../data/platforms';
import { dateToSerial, relativeAge } from '../../sim/gameClock';
import type { GameNotification } from '../../types/game';
import { IconBell, IconX } from '../icons';

export function TopBar({
  platform,
  country,
  onCountryChange,
  search,
  right,
  title,
}: {
  platform?: PlatformConfig;
  country?: string;
  onCountryChange?: (c: string) => void;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  right?: ReactNode;
  title?: ReactNode;
}) {
  const { player, recentCountries, notifications, setScreen } = useGameStore();
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="flex items-center gap-3 flex-wrap mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {platform ? (
          <PlatformLogo platform={platform} size="md" />
        ) : title ? (
          <div className="text-[15px] font-semibold text-ink">{title}</div>
        ) : (
          <span className="text-[13px] font-black tracking-widest text-ink">RAP LIFE</span>
        )}
      </div>

      {search ? (
        <div className="order-last md:order-none w-full md:w-auto md:flex-1 md:max-w-md">
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder ?? 'Search songs, artists, albums'}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-2 ml-auto">
        {country && onCountryChange ? (
          <CountrySelect
            value={country}
            onChange={onCountryChange}
            home={player?.country}
            recent={recentCountries ?? []}
            size="sm"
          />
        ) : null}

        {right}

        <button
          onClick={() => setScreen('news')}
          aria-label="Notifications"
          className="relative w-9 h-9 rounded-[10px] bg-card border border-line flex items-center justify-center text-ink2 hover:text-ink hover:bg-cardhover transition-colors"
        >
          <IconBell size={18} />
          {unread > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-amber text-black text-[10px] font-bold flex items-center justify-center num">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>

        {player ? (
          <button onClick={() => useGameStore.getState().setScreen('style')} title={player.artistName} aria-label="Your look">
            <Portrait seed="player" name={player.artistName} size={36} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const KIND_LABEL: Record<GameNotification['kind'], string> = {
  chart_debut: 'Chart',
  chart_move: 'Chart',
  chart_number_one: 'Chart',
  chart_exit: 'Chart',
  certification: 'Certified',
  milestone: 'Milestone',
  artist_release: 'New music',
  artist_video: 'New video',
  subscriber: 'Subscribers',
  video_milestone: 'Video',
  feature: 'Feature',
  business: 'Business',
};

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Selectors, not the whole store: this panel shouldn't re-render on every tick.
  const notifications = useGameStore((s) => s.notifications);
  const markNotificationRead = useGameStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useGameStore((s) => s.markAllNotificationsRead);
  const clearNotifications = useGameStore((s) => s.clearNotifications);

  const nowSerial = dateToSerial(useGameStore((s) => s.gameDate));
  const list = notifications ?? [];
  const unread = list.filter((n) => !n.read).length;

  const openAction = (n: GameNotification) => {
    markNotificationRead(n.id);
    const a = n.action;
    if (!a) return;
    openNotificationAction(a);
    onClose();
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Notifications"
      subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
      width={400}
      footer={
        list.length > 0 ? (
          <div className="flex gap-2">
            <button
              onClick={markAllNotificationsRead}
              disabled={unread === 0}
              className="flex-1 h-9 rounded-[10px] bg-card border border-line text-[12px] font-semibold text-ink2 hover:text-ink disabled:opacity-40 transition"
            >
              Mark all read
            </button>
            <button
              onClick={clearNotifications}
              className="h-9 px-3 rounded-[10px] bg-card border border-line text-[12px] font-semibold text-ink3 hover:text-fall transition"
            >
              Clear
            </button>
          </div>
        ) : null
      }
    >
      {list.length === 0 ? (
        <EmptyState
          icon={<IconBell size={26} />}
          title="Nothing yet"
          body="Chart debuts, certifications and the artists you follow will show up here as the game moves."
        />
      ) : (
        <div className="divide-y divide-line">
          {list.map((n) => (
            <button
              key={n.id}
              onClick={() => openAction(n)}
              className={cn(
                'w-full flex gap-3 p-3 text-left transition-colors hover:bg-white/[0.03]',
                !n.read && 'bg-amber/[0.04]',
              )}
            >
              <Artwork seed={n.artSeed} title={n.title} size={40} rounded={8} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Tag tone={n.kind.startsWith('chart') ? 'new' : 'muted'}>
                    {KIND_LABEL[n.kind]}
                  </Tag>
                  {!n.read ? <span className="w-1.5 h-1.5 rounded-full bg-amber" /> : null}
                </div>
                <div className="text-[13px] font-semibold text-ink mt-1 leading-snug">{n.title}</div>
                <div className="text-[12px] text-ink2 mt-0.5 leading-snug">{n.body}</div>
                <div className="text-[11px] text-ink3 mt-1">
                  {relativeAge(n.daySerial, nowSerial, n.minuteOfDay)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </SlidePanel>
  );
}

/** Small helper used by the pages that need a bell without the full bar. */
export function BellButton({ onClick }: { onClick: () => void }) {
  const unread = (useGameStore((s) => s.notifications) ?? []).filter((n) => !n.read).length;
  return (
    <button
      onClick={onClick}
      className="relative w-9 h-9 rounded-[10px] bg-card border border-line flex items-center justify-center text-ink2 hover:text-ink transition-colors"
      aria-label="Notifications"
    >
      <IconBell size={18} />
      {unread > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-amber text-black text-[10px] font-bold flex items-center justify-center num">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </button>
  );
}

export function CloseIcon() {
  return <IconX size={18} />;
}

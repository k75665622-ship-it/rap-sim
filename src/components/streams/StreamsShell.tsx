// ─── RAP LIFE STREAMS — APP SHELL ──────────────────────────────────────────
// The streaming platform is its own product inside the game, so it gets its own
// chrome: a branded left nav, a search bar across the top, and a right rail for
// the "what's happening" column. Every streaming and video page renders inside
// this, which is why they all look like one app instead of five screens.

import { useState, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { CountrySelect } from '../ui/CountrySelect';
import { PlatformSwitcher } from '../ui/cards';
import {
  IconBell,
  IconCamera,
  IconDisc,
  IconFilm,
  IconHome,
  IconMusic,
  IconPlay,
  IconSearch,
  IconSparkle,
  IconTrend,
  IconUsers,
} from '../icons';

export type StreamsTab =
  | 'home'
  | 'charts'
  | 'albums'
  | 'artists'
  | 'playlists'
  | 'new'
  | 'search'
  | 'videos';

export interface StreamsShellProps {
  tab: StreamsTab;
  onTab: (tab: StreamsTab) => void;
  /** The search box value, when the page has one. */
  query?: string;
  onQuery?: (v: string) => void;
  onSearchSubmit?: () => void;
  country: string;
  onCountry: (c: string) => void;
  home?: string;
  recent?: string[];
  platformId?: string;
  onPlatform?: (id: string) => void;
  /** The right-hand column. */
  rail?: ReactNode;
  /** A wide strip under the content — the promo banner in the mockup. */
  footer?: ReactNode;
  children: ReactNode;
  /** Notification dot on the bell. */
  hasAlerts?: boolean;
  onBell?: () => void;
}

const NAV: Array<{ id: StreamsTab; label: string; icon: ReactNode }> = [
  { id: 'home', label: 'Home', icon: <IconHome size={18} /> },
  { id: 'charts', label: 'Top Charts', icon: <IconTrend size={18} /> },
  { id: 'albums', label: 'Albums', icon: <IconDisc size={18} /> },
  { id: 'artists', label: 'Artists', icon: <IconUsers size={18} /> },
  { id: 'playlists', label: 'Playlists', icon: <IconMusic size={18} /> },
  { id: 'new', label: 'New Releases', icon: <IconSparkle size={18} /> },
  { id: 'videos', label: 'Videos', icon: <IconFilm size={18} /> },
  { id: 'search', label: 'Search', icon: <IconSearch size={18} /> },
];

export function StreamsShell({
  tab,
  onTab,
  query,
  onQuery,
  onSearchSubmit,
  country,
  onCountry,
  home,
  recent,
  platformId,
  onPlatform,
  rail,
  footer,
  children,
  hasAlerts,
  onBell,
}: StreamsShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  const nav = (
    <>
      {/* Brand */}
      <div className="px-4 h-14 flex items-center gap-2 shrink-0">
        <span className="w-7 h-7 rounded-full bg-amber text-black font-black text-[14px] flex items-center justify-center">
          <IconPlay size={14} />
        </span>
        <span className="leading-none">
          <span className="block text-[13px] font-black tracking-widest text-ink">RAP LIFE</span>
          <span className="block text-[9px] tracking-[0.28em] text-amber font-bold mt-0.5">
            STREAMS
          </span>
        </span>
      </div>

      <nav className="px-2 space-y-0.5">
        {NAV.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTab(item.id);
                setNavOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 h-9 rounded-[9px] text-[13px] transition-colors relative',
                active ? 'text-amber bg-amber/10 font-semibold' : 'text-ink2 hover:text-ink hover:bg-white/5',
              )}
            >
              {active ? <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-amber" /> : null}
              <span className={cn('shrink-0', active ? 'text-amber' : 'text-ink3')}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 px-4">
        <div className="text-[10px] uppercase tracking-widest text-ink3 font-bold mb-1.5">
          Your Library
        </div>
        <StreamsLibrary />
      </div>

      {/* The promo card from the mockup. It is a real link, not decoration. */}
      <div className="mt-auto p-3">
        <div className="rounded-[12px] bg-gradient-to-b from-amber/20 to-transparent border border-amber/25 p-3">
          <div className="text-[12px] font-bold text-ink">Get your music heard</div>
          <p className="text-[11px] text-ink2 mt-1 leading-snug">
            Build your fanbase. Climb the charts. Make your mark.
          </p>
          <button
            onClick={() => onTab('new')}
            className="mt-2.5 w-full h-8 rounded-[8px] bg-amber text-black text-[12px] font-bold hover:brightness-110 transition"
          >
            Release Music
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex gap-4 min-h-full">
      {/* ── Left nav ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[184px] shrink-0 flex-col bg-sidebar border border-line rounded-[16px] py-1 sticky top-0 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {nav}
      </aside>

      {/* ── Centre column ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Top bar: search + country + icons. */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setNavOpen(true)}
            className="lg:hidden w-10 h-10 shrink-0 rounded-[12px] bg-card border border-line flex items-center justify-center text-ink2"
            aria-label="Open streams menu"
          >
            <IconTrend size={18} />
          </button>

          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none">
              <IconSearch size={16} />
            </span>
            <input
              value={query ?? ''}
              onChange={(e) => onQuery?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
              placeholder="Search for songs, artists, albums…"
              className="w-full h-10 pl-10 pr-24 rounded-full bg-card border border-line text-ink text-[13px] placeholder:text-ink3 focus:outline-none focus:border-amber transition-colors"
            />
            <button
              onClick={() => onSearchSubmit?.()}
              className="absolute right-1.5 top-1.5 h-7 px-4 rounded-full bg-amber text-black text-[12px] font-bold hover:brightness-110 transition"
            >
              Search
            </button>
          </div>

          <CountrySelect value={country} onChange={onCountry} home={home} recent={recent} size="sm" />

          <button
            onClick={onBell}
            aria-label="Notifications"
            className="w-10 h-10 shrink-0 rounded-[12px] bg-card border border-line flex items-center justify-center text-ink2 hover:text-ink relative"
          >
            <IconBell size={18} />
            {hasAlerts ? (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-fall" />
            ) : null}
          </button>
        </div>

        {/* Platform pills, when the page cares about a platform. */}
        {platformId && onPlatform ? (
          <div className="mb-4">
            <PlatformSwitcher value={platformId} onChange={onPlatform} />
          </div>
        ) : null}

        {children}
        {footer}
      </div>

      {/* ── Right rail ───────────────────────────────────────────────── */}
      {rail ? (
        <aside className="hidden xl:block w-[292px] shrink-0 space-y-4">{rail}</aside>
      ) : null}

      {/* ── Phone nav drawer ─────────────────────────────────────────── */}
      {navOpen ? (
        <div className="lg:hidden fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/60 rl-fade" onClick={() => setNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[240px] bg-sidebar border-r border-line flex flex-col py-1 rl-fade">
            {nav}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The library block. It used to be two static rows with a hover highlight and
 * no handler — an affordance that lied. Both entries are real now and both go
 * somewhere: recent plays are the store's own watch history, and releases are
 * the records the player has actually put out.
 */
function StreamsLibrary() {
  const state = useGameStore();
  const openVideo = useGameStore((s) => s.openVideo);
  const openSong = useGameStore((s) => s.openSong);

  const recent = (state.watchHistory ?? [])
    .map((id) => (state.videos ?? []).find((v) => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
    .slice(0, 4);

  const releases = (state.songs ?? []).filter((s) => s.releaseDate).slice(0, 4);

  if (recent.length === 0 && releases.length === 0) {
    return (
      <p className="text-[11px] text-ink3 leading-snug px-1">
        Nothing here yet. Watch a video or release a record and it lands in your library.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {recent.length > 0 ? (
        <div>
          <div className="text-[10px] text-ink3 mb-1 px-1">Recently played</div>
          <div className="space-y-0.5">
            {recent.map((v) => (
              <button
                key={v.id}
                onClick={() => openVideo(v.id)}
                className="w-full text-left px-1 py-1 rounded-[8px] hover:bg-white/5 text-[12px] text-ink2 hover:text-ink truncate transition-colors"
              >
                {v.songTitle}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {releases.length > 0 ? (
        <div>
          <div className="text-[10px] text-ink3 mb-1 px-1">Your releases</div>
          <div className="space-y-0.5">
            {releases.map((s) => (
              <button
                key={s.id}
                onClick={() => openSong(s.id)}
                className="w-full text-left px-1 py-1 rounded-[8px] hover:bg-white/5 text-[12px] text-ink2 hover:text-ink truncate transition-colors"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The section header used at the top of a rail card. */
export function RailCard({
  title,
  action,
  children,
  onAction,
}: {
  title: string;
  action?: string;
  children: ReactNode;
  onAction?: () => void;
}) {
  return (
    <section className="bg-card border border-line rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {action ? (
          <button onClick={onAction} className="text-[11px] text-amber hover:underline">
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** The wide promo strip at the bottom of the home page. */
export function PromoStrip({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="mt-6 rounded-[16px] overflow-hidden border border-line bg-gradient-to-r from-amber/15 via-card to-card">
      <div className="flex items-center gap-4 p-5">
        <span className="w-12 h-12 rounded-full bg-amber text-black flex items-center justify-center shrink-0">
          <IconPlay size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink">The world listens here.</div>
          <p className="text-[12px] text-ink2 mt-0.5">
            More streams. More fans. More opportunities.
          </p>
        </div>
        <button
          onClick={onExplore}
          className="shrink-0 h-9 px-4 rounded-[10px] bg-amber text-black text-[13px] font-bold hover:brightness-110 transition"
        >
          Explore Playlists
        </button>
      </div>
    </div>
  );
}

/** A camera icon button, used on video pages. */
export function UploadButton({ onClick, label = 'Upload' }: { onClick?: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="h-10 px-3 rounded-[12px] bg-card border border-line flex items-center gap-2 text-[12px] font-semibold text-ink2 hover:text-ink transition"
    >
      <IconCamera size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

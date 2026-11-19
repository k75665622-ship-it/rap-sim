// ─── THE CITY: THE PHONE ───────────────────────────────────────────────────
//
// Your phone, out in the street. A home screen of apps, each one a screen the
// game already has (PingChat, Mail, Chirp, Streams…), opened inside the phone
// while the city carries on behind it.
//
// Apps are drawn inside an iframe. The game's screens size themselves by the
// width of the window (Tailwind's `md:` and so on), so inside a 390-px-wide
// frame they lay out exactly as they do on a real phone, even on a computer.
// React portals into the frame, so state, clicks and typing all work as normal.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../store/gameStore';
import { goBack } from '../components/layout/nav';
import { formatClockTime, formatLong } from '../sim/gameClock';
import type { GameScreen } from '../types/game';
import {
  IconBird, IconBriefcase, IconCamera, IconChevronLeft, IconCircle, IconDiamond, IconFilm, IconHome, IconJournal,
  IconMail, IconMessage, IconMusic, IconNews, IconPlay, IconStats, IconTeam, IconTrend, IconUsers, IconX,
} from '../components/icons';
import { phone, usePhoneOpen } from './phone';

interface App { id: GameScreen; label: string; icon: ReactNode; bg: string }

const APPS: App[] = [
  { id: 'pingchat', label: 'PingChat', icon: <IconMessage size={26} />, bg: 'linear-gradient(160deg,#3ee07f,#14a84f)' },
  { id: 'mailbox', label: 'Mail', icon: <IconMail size={26} />, bg: 'linear-gradient(160deg,#5fb2ff,#2a6fd6)' },
  { id: 'news', label: 'Updates', icon: <IconNews size={26} />, bg: 'linear-gradient(160deg,#ff6b78,#d63040)' },
  { id: 'streams', label: 'Streams', icon: <IconMusic size={26} />, bg: 'linear-gradient(160deg,#ffcc33,#e09a00)' },
  { id: 'social_chirp', label: 'Chirp', icon: <IconBird size={26} />, bg: 'linear-gradient(160deg,#38b6ff,#1677c9)' },
  { id: 'social_snapgram', label: 'Snapgram', icon: <IconCamera size={26} />, bg: 'linear-gradient(160deg,#ffb347,#e1306c 55%,#833ab4)' },
  { id: 'social_clip', label: 'Clip', icon: <IconFilm size={26} />, bg: 'linear-gradient(160deg,#2a2d36,#0d0e12)' },
  { id: 'social_circle', label: 'Circle', icon: <IconCircle size={26} />, bg: 'linear-gradient(160deg,#8f7bff,#5a3fd6)' },
  { id: 'charts', label: 'Charts', icon: <IconTrend size={26} />, bg: 'linear-gradient(160deg,#c79bff,#7d45d9)' },
  { id: 'videos', label: 'Videos', icon: <IconPlay size={26} />, bg: 'linear-gradient(160deg,#ff4a5f,#c4001d)' },
  { id: 'investments', label: 'Bank', icon: <IconDiamond size={26} />, bg: 'linear-gradient(160deg,#3ee07f,#0f7a3a)' },
  { id: 'stats', label: 'Career', icon: <IconStats size={26} />, bg: 'linear-gradient(160deg,#6fb8ff,#2f5fb3)' },
  { id: 'team', label: 'Team', icon: <IconTeam size={26} />, bg: 'linear-gradient(160deg,#ff9a55,#d9591a)' },
  { id: 'jobs', label: 'Jobs', icon: <IconBriefcase size={26} />, bg: 'linear-gradient(160deg,#b4b9c8,#6b7186)' },
  { id: 'npc_profile', label: 'Artists', icon: <IconUsers size={26} />, bg: 'linear-gradient(160deg,#ff8fbd,#d6407f)' },
  { id: 'journal', label: 'Notes', icon: <IconJournal size={26} />, bg: 'linear-gradient(160deg,#ffe28a,#e0b020)' },
];

/** What the bar at the top of an app says. */
const TITLES: Partial<Record<GameScreen, string>> = {
  ...Object.fromEntries(APPS.map((a) => [a.id, a.label])),
  streaming: 'Streams', platform: 'Streams', catalog: 'Catalog', search: 'Search', song: 'Song', artist_page: 'Artist',
  watch: 'Videos', channel: 'Channel', create_video: 'New video', dashboard: 'Home', shows: 'Shows', studio: 'Studio',
};

export function useUnread() {
  const dms = useGameStore((s) => Object.values(s.dmThreads).reduce((n, t) => n + t.unread, 0) + (s.teamChatUnread ?? 0));
  const mail = useGameStore((s) => s.mailbox.filter((m) => !m.read).length);
  const news = useGameStore((s) => (s.notifications ?? []).filter((n) => !n.read).length);
  return { dms, mail, news, total: dms + mail + news };
}

export function Phone({ app }: { app: ReactNode | null }) {
  const open = usePhoneOpen();
  const screen = useGameStore((s) => s.screen);
  const minute = useGameStore((s) => s.clockMinute);
  if (!open) return null;

  return (
    <div className="absolute inset-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[392px] sm:h-[min(820px,calc(100vh-48px))] z-40 pointer-events-auto rl-fade">
      {/* The handset: a bezel on a computer, the whole screen on a phone. */}
      <div className="w-full h-full sm:rounded-[46px] sm:p-[10px] sm:bg-[#050507] sm:border sm:border-white/15 sm:shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="relative w-full h-full sm:rounded-[36px] overflow-hidden bg-bg flex flex-col">
          <StatusBar time={formatClockTime(minute ?? 0)} />
          {app ? (
            <>
              <div className="h-11 shrink-0 flex items-center gap-1 px-2 border-b border-line bg-sidebar">
                <button onClick={goBack} aria-label="Back" className="w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-white/5">
                  <IconChevronLeft size={22} />
                </button>
                <div className="flex-1 text-center text-[14px] font-bold truncate">{TITLES[screen] ?? 'RAP LIFE'}</div>
                <button onClick={phone.home} aria-label="Home screen" className="w-9 h-9 rounded-full flex items-center justify-center text-ink2 hover:text-ink hover:bg-white/5">
                  <IconHome size={19} />
                </button>
                <button onClick={phone.close} aria-label="Put phone away" className="w-9 h-9 rounded-full flex items-center justify-center text-ink2 hover:text-ink hover:bg-white/5">
                  <IconX size={19} />
                </button>
              </div>
              <AppFrame screenKey={screen}>{app}</AppFrame>
            </>
          ) : (
            <HomeScreen />
          )}
          {/* Home bar: tap to go home, or put the phone away from home. */}
          <button
            onClick={() => (app ? phone.home() : phone.close())}
            aria-label={app ? 'Home screen' : 'Put phone away'}
            className="h-6 shrink-0 flex items-center justify-center bg-transparent"
          >
            <span className="w-28 h-1.5 rounded-full bg-white/50" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ time }: { time: string }) {
  return (
    <div className="h-8 shrink-0 px-6 flex items-center justify-between text-[12px] font-semibold text-ink bg-transparent relative">
      <span className="num">{time}</span>
      {/* Camera island. */}
      <span className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-1.5 w-24 h-6 rounded-full bg-black" />
      <span className="flex items-center gap-1.5 text-ink2">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.3" y="5" width="3" height="6" rx="1" /><rect x="8.6" y="2.5" width="3" height="8.5" rx="1" /><rect x="12.9" y="0" width="3" height="11" rx="1" /></svg>
        <span className="text-[10px]">4G</span>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none" aria-hidden="true"><rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="currentColor" /><rect x="2.5" y="2.5" width="14" height="7" rx="1.5" fill="#2ed573" /><rect x="21.5" y="4" width="2" height="4" rx="1" fill="currentColor" /></svg>
      </span>
    </div>
  );
}

function HomeScreen() {
  const minute = useGameStore((s) => s.clockMinute);
  const date = useGameStore((s) => s.gameDate);
  const name = useGameStore((s) => s.player?.artistName ?? '');
  const unread = useUnread();
  const badge = (id: GameScreen) => (id === 'pingchat' ? unread.dms : id === 'mailbox' ? unread.mail : id === 'news' ? unread.news : 0);

  return (
    <div
      className="flex-1 overflow-y-auto px-5 pb-4"
      style={{ background: 'radial-gradient(120% 70% at 0% 0%, #ffb80055, transparent 60%), radial-gradient(120% 80% at 100% 100%, #7d45d955, transparent 60%), #0d0e14' }}
    >
      <div className="text-center pt-6 pb-7">
        <div className="text-[64px] leading-none font-black num tracking-tight">{formatClockTime(minute ?? 0)}</div>
        <div className="text-[13px] text-ink2 mt-1.5">{date ? formatLong(date) : ''}</div>
        {name ? <div className="text-[11px] text-ink3 mt-0.5">{name}</div> : null}
      </div>
      <div className="grid grid-cols-4 gap-x-3 gap-y-5">
        {APPS.map((a) => {
          const n = badge(a.id);
          return (
            <button key={a.id} onClick={() => phone.launch(a.id)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <span className="relative w-[58px] h-[58px] rounded-[16px] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)]" style={{ background: a.bg }}>
                {a.icon}
                {n > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-fall text-white text-[11px] font-bold flex items-center justify-center num border-2 border-[#0d0e14]">
                    {n > 99 ? '99+' : n}
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] text-ink truncate max-w-full">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── the app frame ─────────────────────────────────────────────────────────

const FRAME_DOC = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="phone-root"></div></body></html>';

function AppFrame({ children, screenKey }: { children: ReactNode; screenKey: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);

  const onLoad = () => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    // Bring the game's styles in, and keep them in step if more arrive.
    const copy = (n: Node) => doc.head.appendChild(doc.importNode(n, true));
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(copy);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => {
        if (n instanceof HTMLStyleElement || (n instanceof HTMLLinkElement && n.rel === 'stylesheet')) copy(n);
      });
    });
    obs.observe(document.head, { childList: true });
    (ref.current as HTMLIFrameElement & { _obs?: MutationObserver })._obs = obs;
    const r = doc.getElementById('phone-root')!;
    r.style.padding = '12px 12px 24px';
    r.style.minHeight = '100%';
    setRoot(r);
  };

  useEffect(() => () => {
    (ref.current as (HTMLIFrameElement & { _obs?: MutationObserver }) | null)?._obs?.disconnect();
  }, []);

  // A new app starts at the top, not wherever the last one was scrolled to.
  useEffect(() => {
    const se = root?.ownerDocument.scrollingElement;
    if (se) se.scrollTop = 0;
  }, [screenKey, root]);

  return (
    <div className="flex-1 min-h-0 relative">
      <iframe ref={ref} title="Phone" srcDoc={FRAME_DOC} onLoad={onLoad} className="absolute inset-0 w-full h-full border-0 bg-bg" />
      {root ? createPortal(children, root) : null}
    </div>
  );
}

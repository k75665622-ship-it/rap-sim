// ─── SIDEBAR ───────────────────────────────────────────────────────────────
// One consistent line-icon set, a real active state, and a Music section that
// holds Charts, Streaming and Videos together. On a phone it collapses into a
// drawer behind a hamburger.

import { useState, useMemo, type ReactNode } from 'react';
import { blendedFame, useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import type { GameScreen } from '../../types/game';
import { energyColor, energyLabel, needsRest, restRefusal, restOutcomeLine, REST_OPTIONS } from '../../sim/energy';
import { crewBonuses } from '../../sim/roles';
import { money } from '@/utils/format';
import { GameClock } from './GameClock';
import { goBack, useCanGoBack } from './nav';
import { Portrait } from '../avatar/Portrait';
import { currentAccount } from '../../store/accounts';
import {
  IconSparkle,
  IconScale,
  IconShirt,
  IconJournal,
  IconUser,
  IconBell,
  IconBird,
  IconBriefcase,
  IconCamera,
  IconCareers,
  IconCircle,
  IconDiamond,
  IconDisc,
  IconDumbbell,
  IconFilm,
  IconHome,
  IconKey,
  IconInterview,
  IconMail,
  IconMenu,
  IconMessage,
  IconMic,
  IconMusic,
  IconNews,
  IconPlay,
  IconReceipt,
  IconStats,
  IconTeam,
  IconTicket,
  IconTrend,
  IconTrophy,
  IconUsers,
  IconX,
} from '../icons';

interface NavItem {
  id: GameScreen;
  label: string;
  icon: ReactNode;
  badge?: number;
  group: string;
}

export function Sidebar() {
  const { screen, setScreen, player, dmThreads, mailbox, notifications, rest, label } = useGameStore();
  const crew = useGameStore((s) => s.crew);
  const cases = useGameStore((s) => s.cases);
  // A personal assistant makes a nap worth more. The control says what it will
  // actually give back rather than what it would give back alone.
  const restMult = useMemo(() => crewBonuses(crew).energyRecovery, [crew]);
  const [open, setOpen] = useState(false);
  const canBack = useCanGoBack();
  /** The result of the last sleep, so the control answers back. */
  const [restNotice, setRestNotice] = useState<string | null>(null);

  const totalUnread = Object.values(dmThreads).reduce((sum, t) => sum + t.unread, 0);
  const unreadMail = mailbox.filter((m) => !m.read).length;
  // Things at the label waiting on the player: records to fund, demands,
  // poaching and disputes, and talks about to lapse.
  const labelAlerts = label
    ? label.roster.filter((s) => s.demand || s.rivalOffer || s.status === 'dispute' || s.status === 'expiring').length +
      (label.submissions ?? []).filter((x) => x.status === 'pending').length
    : 0;

  const awardSeasons = useGameStore((s) => s.awardSeasons);
  // Award seasons where the player is nominated and the night hasn't happened.
  const awardAlerts = Object.values(awardSeasons ?? {}).filter((x) => x.phase === 'nominations' && x.categories.some((c) => c.nominees.some((n) => n.isPlayer))).length;
  // Cases that need the player: an answer due, an offer on the table.
  const courtAlerts = (cases ?? []).filter((c) => (c.side === 'defendant' && c.status === 'served') || c.offers.some((o) => o.status === 'open' && o.from === 'them')).length;
  const rentDue = useGameStore((s) => (s.home?.due ? 1 : 0));

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <IconHome />, group: 'main' },
    { id: 'studio', label: 'Studio', icon: <IconMic />, group: 'main' },
    { id: 'stats', label: 'Stats', icon: <IconStats />, group: 'main' },
    { id: 'training', label: 'Training', icon: <IconDumbbell />, group: 'main' },
    { id: 'jobs', label: 'Jobs', icon: <IconBriefcase />, group: 'main' },
    { id: 'team', label: 'Team', icon: <IconTeam />, group: 'main' },
    { id: 'tax', label: 'Tax', icon: <IconReceipt />, group: 'main' },
    { id: 'shows', label: 'Shows', icon: <IconTicket />, group: 'main' },
    { id: 'style', label: 'Drip & Ink', icon: <IconShirt />, group: 'main' },
    { id: 'journal', label: 'Journal', icon: <IconJournal />, group: 'main' },
    // Careers lives at the end of Career because it is where you go to leave
    // this one — every other entry edits the career you are in.
    { id: 'careers', label: 'Careers', icon: <IconCareers />, group: 'main' },

    // Music — the industry itself, which is what the game is about.
    // "Streaming" opens the RAP LIFE Streams front page (the mockup home); the
    // per-platform page it used to open is still reachable from the shell's
    // Albums / Artists / New Releases tabs.
    { id: 'streams', label: 'Streaming', icon: <IconMusic />, group: 'music' },
    { id: 'charts', label: 'Charts', icon: <IconTrend />, group: 'music' },
    { id: 'videos', label: 'Videos', icon: <IconPlay />, group: 'music' },

    { id: 'social_chirp', label: 'Chirp', icon: <IconBird />, group: 'social' },
    { id: 'social_snapgram', label: 'Snapgram', icon: <IconCamera />, group: 'social' },
    { id: 'social_clip', label: 'Clip', icon: <IconFilm />, group: 'social' },
    { id: 'social_circle', label: 'Circle', icon: <IconCircle />, group: 'social' },

    { id: 'pingchat', label: 'PingChat', icon: <IconMessage />, badge: totalUnread, group: 'comms' },
    { id: 'mailbox', label: 'Mailbox', icon: <IconMail />, badge: unreadMail, group: 'comms' },
    {
      id: 'news',
      label: 'Updates',
      icon: <IconNews />,
      badge: (notifications ?? []).filter((n) => !n.read).length,
      group: 'comms',
    },

    { id: 'npc_profile', label: 'Artists', icon: <IconUsers />, group: 'world' },

    { id: 'interviews', label: 'Interviews', icon: <IconInterview />, group: 'business' },
    { id: 'label', label: 'My Label', icon: <IconDisc />, badge: labelAlerts, group: 'business' },
    { id: 'investments', label: 'Money', icon: <IconTrend />, group: 'business' },
    { id: 'lifestyle', label: 'Home & Life', icon: <IconKey />, badge: rentDue, group: 'main' },
    { id: 'court', label: 'Courthouse', icon: <IconScale />, badge: courtAlerts, group: 'business' },
    { id: 'awards', label: 'Awards', icon: <IconTrophy />, badge: awardAlerts, group: 'world' },
    { id: 'trophy_room', label: 'Trophy Room', icon: <IconTrophy />, group: 'business' },
    { id: 'retirement', label: 'Industry & Life', icon: <IconDiamond />, group: 'business' },
    { id: 'ai', label: 'AI Brain', icon: <IconSparkle />, group: 'business' },
    { id: 'account', label: 'Account', icon: <IconUser />, group: 'business' },
  ];

  const groups = [
    { id: 'main', label: 'Career' },
    { id: 'music', label: 'Music' },
    { id: 'social', label: 'Social' },
    { id: 'comms', label: 'Inbox' },
    { id: 'world', label: 'The World' },
    { id: 'business', label: 'Business' },
  ];

  const go = (id: GameScreen) => {
    setScreen(id);
    setOpen(false);
  };

  const body = (
    <>
      <div className="px-4 h-14 flex items-center justify-between border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-[7px] bg-amber text-black font-black text-[13px] flex items-center justify-center">
            R
          </span>
          <span className="text-[13px] font-black tracking-widest text-ink">RAP LIFE</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-ink2 hover:text-ink"
        >
          <IconX size={18} />
        </button>
      </div>

      {player ? (
        <button onClick={() => go('style')} className="w-full px-4 py-3 border-b border-line flex items-center gap-3 text-left hover:bg-white/[0.03]">
          <Portrait seed="player" size={38} ring="#ffb800" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink truncate">{player.artistName}</div>
            <div className="text-[11px] text-ink3 truncate">
              {player.city}, {player.country}
            </div>
            <div className="text-[10px] text-ink3 truncate">{currentAccount()?.kind === 'guest' ? 'Guest · offline' : currentAccount() ? `@${currentAccount()!.username}${currentAccount()!.kind === 'cloud' ? ' · online' : ' · this device'}` : ''}</div>
          </div>
        </button>
      ) : null}

      {/* The clock sits above the nav, where it cannot be scrolled away. */}
      <GameClock />

      <nav className="flex-1 py-2 overflow-y-auto">
        {groups.map((group) => {
          const items = navItems.filter((i) => i.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="mb-2">
              <div className="px-4 py-1 text-[10px] text-ink3 uppercase tracking-widest font-bold">
                {group.label}
              </div>
              {items.map((item) => {
                const active = screen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 h-10 text-[13px] transition-colors relative',
                      active
                        ? 'text-amber bg-amber/10 font-semibold'
                        : 'text-ink2 hover:text-ink hover:bg-white/5',
                    )}
                  >
                    {active ? (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber" />
                    ) : null}
                    <span className={cn('shrink-0', active ? 'text-amber' : 'text-ink3')}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className="ml-auto bg-amber text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center num">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {player ? (
        <div className="p-3 border-t border-line shrink-0">
          <div className="bg-card rounded-[12px] p-3 space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink3">Energy</span>
                <span className={cn('font-semibold', energyColor(player.energy, player.maxEnergy).replace('bg-', 'text-'))}>
                  {energyLabel(player.energy, player.maxEnergy)}
                </span>
              </div>
              <div className="bg-line rounded-full h-1.5">
                <div
                  className={cn('h-1.5 rounded-full transition-all', energyColor(player.energy, player.maxEnergy))}
                  // Against the CEILING, not against 100. A trainer raises the
                  // ceiling, and a bar that fills at 100 while the real max is
                  // 112 would show a full tank the player has not got.
                  style={{ width: `${Math.max(0, Math.min(100, (player.energy / Math.max(1, player.maxEnergy)) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-ink3 mt-1 num">
                {Math.round(player.energy)} / {Math.round(player.maxEnergy)}
                {player.maxEnergy !== 100 ? <span className={player.maxEnergy > 100 ? 'text-rise' : 'text-amber'}> · {player.maxEnergy > 100 ? 'max up' : 'max down'}</span> : null}
              </div>
            </div>

            {/* ── Sleep ──────────────────────────────────────────────────
                The cheap way back up: three hours instead of a whole day.
                Shown next to the bar it refills, so the cost and the effect
                are in the same place. */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink3">Sleep</span>
                <span className="text-ink3 text-[10px]">
                  {needsRest(player.energy, player.maxEnergy) ? '3h = full' : 'rested'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {REST_OPTIONS.map((o) => {
                  const blocked = restRefusal(o.minutes, player.energy, player.maxEnergy);
                  return (
                    <button
                      key={o.minutes}
                      // A refused rest explains itself on hover rather than
                      // being a dead control with no reason attached.
                      title={blocked ?? `${o.label} — ${restOutcomeLine(o.minutes, player.energy, player.maxEnergy, restMult)}. ${o.blurb}`}
                      disabled={!!blocked}
                      onClick={() => setRestNotice(rest(o.minutes).message)}
                      className={cn(
                        'rounded-[8px] border py-1 text-[10px] font-semibold transition-colors',
                        blocked
                          ? 'border-line text-ink3/50 cursor-not-allowed'
                          : 'border-line text-ink2 hover:bg-cardhover hover:text-ink',
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {restNotice && (
                <p className="text-[10px] text-ink3 mt-1 leading-snug">{restNotice}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink3">Fame</span>
                <span className="text-ink num">{Math.round(blendedFame(player))}</span>
              </div>
              <div className="bg-line rounded-full h-1.5">
                <div
                  className="bg-amber h-1.5 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, blendedFame(player)))}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-[12px] border-t border-line pt-2.5">
              <span className="text-ink3">Balance</span>
              <span className="text-rise font-semibold num">{money(player.career.money)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {/* Phone bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-line flex items-center px-3 gap-3 z-40">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-ink2 hover:text-ink hover:bg-white/5"
        >
          <IconMenu />
        </button>
        {canBack ? (
          <button
            onClick={goBack}
            aria-label="Go back"
            className="w-9 h-9 -ml-2 rounded-[10px] flex items-center justify-center text-ink hover:bg-white/5 text-[20px] leading-none"
          >
            ←
          </button>
        ) : null}
        <span className="text-[13px] font-black tracking-widest text-ink">RAP LIFE</span>
        <div className="ml-auto">
          <GameClock compact />
        </div>
        <button
          onClick={() => go('news')}
          aria-label="Notifications"
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-ink2 hover:text-ink hover:bg-white/5 relative"
        >
          <IconBell />
          {(notifications ?? []).some((n) => !n.read) ? (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber" />
          ) : null}
        </button>
      </div>

      {open ? (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 rl-fade" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-sidebar border-r border-line flex flex-col rl-fade">
            {body}
          </aside>
        </div>
      ) : null}

      <aside className="hidden md:flex w-56 bg-sidebar border-r border-line flex-col h-screen fixed left-0 top-0 z-30">
        {body}
      </aside>
    </>
  );
}

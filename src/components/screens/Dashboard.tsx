// ─── DASHBOARD ─────────────────────────────────────────────────────────────
// Your life at a glance: who you are right now, what needs you, what's in the
// diary, how the music and the money are doing, and what happened while you
// were away.

import { useMemo } from 'react';
import { useGameStore, blendedFame, nowMinuteOf, netWorthOf } from '../../store/gameStore';
import { MomentCard, MomentsInbox } from '../moments/MomentCard';
import { WorkInProgress } from '../ui/WorkInProgress';
import { Avatar } from '../social/shared';
import { gradientFor } from '../ui/kit';
import { IconVerified } from '../icons';
import { KIND_LABEL, whenLabel } from '../../sim/appointments';
import { formatLong } from '../../sim/gameClock';
import { formatClockTime } from '../../sim/gameClock';
import { compact } from '@/utils/format';
import { usd } from '../money/shared';
import { cn } from '@/utils/cn';

export function Dashboard() {
  const player = useGameStore((s) => s.player);
  const gameDate = useGameStore((s) => s.gameDate);
  const clockMinute = useGameStore((s) => s.clockMinute);
  const verified = useGameStore((s) => s.verified);
  const advanceTurn = useGameStore((s) => s.advanceTurn);
  const setScreen = useGameStore((s) => s.setScreen);
  const moments = useGameStore((s) => s.moments);
  const dmThreads = useGameStore((s) => s.dmThreads);
  const mailbox = useGameStore((s) => s.mailbox);
  const notifications = useGameStore((s) => s.notifications);
  const appointments = useGameStore((s) => s.appointments);
  const football = useGameStore((s) => s.football);
  const now = useGameStore((s) => nowMinuteOf(s));

  if (!player) return null;
  const fame = blendedFame(player);
  const unreadDM = Object.values(dmThreads).reduce((a, t) => a + t.unread, 0);
  const unreadMail = mailbox.filter((m) => !m.read).length;
  const unreadNotes = (notifications ?? []).filter((n) => !n.read).length;
  const life = (moments ?? []).filter((m) => m.channel === 'life' && m.status === 'open');
  const recentLife = (moments ?? []).filter((m) => m.channel === 'life' && m.status === 'resolved').slice(0, 2);
  const plans = (appointments ?? []).filter((a) => (a.status === 'confirmed' || a.status === 'proposed') && a.atMinute >= now - 60).sort((a, b) => a.atMinute - b.atMinute);
  const openBets = (football?.bets ?? []).filter((b) => b.status === 'open').length;
  const energyPct = Math.round((player.energy / Math.max(1, player.maxEnergy)) * 100);
  const [g1, g2] = gradientFor(player.id);

  return (
    <div className="max-w-[1040px] mx-auto space-y-5 pb-10">
      {/* Hero */}
      <section className="relative rounded-[22px] border border-line overflow-hidden" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${g1}33, rgba(10,11,16,0) 55%), radial-gradient(100% 120% at 100% 100%, ${g2}22, rgba(10,11,16,0) 60%), #14161e` }}>
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar name={player.artistName} seed={player.id} size={68} ring="#ffb800" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-[26px] sm:text-[32px] font-black text-ink leading-tight truncate">{player.artistName}</h1>
                {verified && <span className="text-new shrink-0"><IconVerified size={20} /></span>}
              </div>
              <div className="text-[13px] text-ink2 truncate">{player.genre.replace(/_/g, ' ')} · {player.city}, {player.country} · {player.age}</div>
              <div className="text-[12px] text-ink3 mt-0.5">{formatLong(gameDate)} · {formatClockTime(clockMinute ?? 0)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            <Stat label="Cash" value={usd(player.career.money)} sub={`${usd(player.career.totalEarnings)} earned`} onClick={() => setScreen('investments')} />
            <Stat label="Fans" value={compact(player.career.fanbase)} sub="across every app" onClick={() => setScreen('stats')} />
            <Stat label="Fame" value={`${Math.round(fame)}`} sub={fame >= 65 ? 'a star' : fame >= 40 ? 'known nationally' : fame >= 20 ? 'known in town' : 'underground'} bar={fame} onClick={() => setScreen('stats')} />
            <Stat label="Momentum" value={`${Math.round(player.career.momentum)}`} sub={`reputation ${Math.round(player.career.reputation)}`} bar={player.career.momentum} />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[11px] text-ink3 mb-1"><span>Energy</span><span className="num">{Math.round(player.energy)}/{player.maxEnergy}</span></div>
              <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden"><div className={cn('h-full rounded-full', energyPct > 50 ? 'bg-rise' : energyPct > 25 ? 'bg-amber' : 'bg-fall')} style={{ width: `${energyPct}%` }} /></div>
            </div>
            <div className="flex rounded-[12px] border border-line bg-black/30 p-0.5 shrink-0">
              {(['day', 'week', 'month'] as const).map((u) => (
                <button key={u} onClick={() => advanceTurn(u)} className={cn('h-8 px-3 rounded-[10px] text-[12px] font-semibold transition', u === 'month' ? 'text-amber hover:bg-amber/10' : 'text-ink2 hover:bg-white/5')}>+1 {u[0].toUpperCase() + u.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Right now */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        <Pill emoji="💬" label="DMs" value={unreadDM} onClick={() => setScreen('pingchat')} hot={unreadDM > 0} />
        <Pill emoji="📬" label="Mail" value={unreadMail} onClick={() => setScreen('mailbox')} hot={unreadMail > 0} />
        <Pill emoji="🔔" label="Updates" value={unreadNotes} onClick={() => setScreen('news')} hot={unreadNotes > 0} />
        <Pill emoji="📅" label="Plans" value={plans.length} onClick={() => setScreen('pingchat')} hot={plans.some((p) => p.status === 'proposed')} />
        <Pill emoji="⚽" label="Bets" value={openBets} onClick={() => setScreen('investments')} />
        <Pill emoji="🎤" label="Studio" onClick={() => setScreen('studio')} />
        <Pill emoji="🎟️" label="Shows" onClick={() => setScreen('shows')} />
      </div>

      {/* Life */}
      {life.length > 0 && (
        <section>
          <div className="text-[16px] font-semibold text-ink mb-2">Life happens <span className="text-new">· {life.length}</span></div>
          <div className="grid md:grid-cols-2 gap-3">{life.map((m) => <MomentCard key={m.id} moment={m} />)}</div>
        </section>
      )}

      <MomentsInbox />

      <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5">
        <div className="space-y-5 min-w-0">
          <MusicCard />
          <WorkInProgress />
          {recentLife.length > 0 && (
            <section className="space-y-2">
              <div className="text-[13px] font-semibold text-ink2">How it went</div>
              {recentLife.map((m) => <MomentCard key={m.id} moment={m} />)}
            </section>
          )}
          <Feed />
        </div>
        <div className="space-y-5 min-w-0">
          <Diary plans={plans} now={now} />
          <MoneyCard />
          <Extras />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, bar, onClick }: { label: string; value: string; sub: string; bar?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-[14px] bg-black/25 border border-white/[0.06] p-3 hover:bg-black/35 transition min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">{label}</div>
      <div className="text-[20px] font-bold text-ink num leading-tight mt-0.5 truncate">{value}</div>
      {bar !== undefined ? <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1.5"><div className="h-full bg-amber" style={{ width: `${Math.min(100, bar)}%` }} /></div> : null}
      <div className="text-[11px] text-ink3 mt-1 truncate">{sub}</div>
    </button>
  );
}

function Pill({ emoji, label, value, onClick, hot }: { emoji: string; label: string; value?: number; onClick: () => void; hot?: boolean }) {
  return (
    <button onClick={onClick} className={cn('shrink-0 h-10 pl-3 pr-3.5 rounded-full border flex items-center gap-2 text-[13px] font-semibold transition', hot ? 'border-amber/50 bg-amber/10 text-ink' : 'border-line bg-card text-ink2 hover:text-ink')}>
      <span>{emoji}</span>{label}
      {value !== undefined && value > 0 && <span className={cn('min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center', hot ? 'bg-amber text-black' : 'bg-white/10 text-ink2')}>{value}</span>}
    </button>
  );
}

function MusicCard() {
  const songs = useGameStore((s) => s.songs);
  const setScreen = useGameStore((s) => s.setScreen);
  const live = useMemo(() => songs.filter((s) => s.weeklyStreams > 0).sort((a, b) => b.weeklyStreams - a.weeklyStreams), [songs]);
  const weekly = live.reduce((a, s) => a + s.weeklyStreams, 0);
  return (
    <section className="rounded-[18px] border border-line bg-card overflow-hidden">
      <div className="p-4 flex items-end justify-between gap-3">
        <div><div className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">Streaming this week</div><div className="text-[26px] font-black text-ink num leading-tight">{compact(weekly)}</div></div>
        <div className="flex gap-2">
          <button onClick={() => setScreen('studio')} className="h-9 px-3.5 rounded-full bg-amber text-black text-[13px] font-bold">🎤 Studio</button>
          <button onClick={() => setScreen('charts')} className="h-9 px-3.5 rounded-full border border-line text-ink2 text-[13px] font-semibold hover:text-ink">Charts</button>
        </div>
      </div>
      {live.length === 0 ? (
        <div className="px-4 pb-5 text-[13px] text-ink3">Nothing out yet. Record something and drop it.</div>
      ) : (
        <div className="divide-y divide-line/60">
          {live.slice(0, 5).map((s, i) => {
            const [a, b] = gradientFor(s.id);
            const max = live[0].weeklyStreams;
            return (
              <button key={s.id} onClick={() => setScreen('streams')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02]">
                <span className="text-[12px] text-ink3 w-4 num">{i + 1}</span>
                <div className="w-10 h-10 rounded-[10px] shrink-0" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-ink font-medium truncate">{s.title}{s.certifications?.length ? ' 🏆' : ''}</div>
                  <div className="h-1 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden"><div className="h-full bg-rise/70" style={{ width: `${(s.weeklyStreams / Math.max(1, max)) * 100}%` }} /></div>
                </div>
                <div className="text-right shrink-0"><div className="text-[13px] text-ink num">{compact(s.weeklyStreams)}</div><div className="text-[10px] text-ink3">{compact(s.totalStreams)} total</div></div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Diary({ plans, now }: { plans: { id: string; npcId: string; npcName: string; kind: keyof typeof KIND_LABEL; atMinute: number; place: string; status: string }[]; now: number }) {
  const setScreen = useGameStore((s) => s.setScreen);
  const selectNPC = useGameStore((s) => s.selectNPC);
  return (
    <section className="rounded-[18px] border border-line bg-card p-4">
      <div className="flex items-center justify-between mb-3"><div className="text-[15px] font-semibold text-ink">📅 Diary</div><span className="text-[11px] text-ink3">Plan from any chat</span></div>
      {plans.length === 0 ? (
        <div className="text-[13px] text-ink3">Nothing planned. Invite someone to the studio from PingChat.</div>
      ) : (
        <div className="space-y-2">
          {plans.slice(0, 5).map((a) => (
            <button key={a.id} onClick={() => { selectNPC(a.npcId); setScreen('pingchat'); }} className="w-full flex items-center gap-3 rounded-[12px] border border-line px-3 py-2.5 text-left hover:bg-white/[0.03]">
              <span className="text-[20px]">{KIND_LABEL[a.kind].emoji}</span>
              <div className="min-w-0 flex-1"><div className="text-[13px] text-ink font-semibold truncate">{KIND_LABEL[a.kind].label} · {a.npcName}</div><div className="text-[11px] text-ink3 truncate">{whenLabel(a.atMinute, now)} · {a.place}</div></div>
              {a.status === 'proposed' ? <span className="text-[10px] font-bold text-amber shrink-0">ANSWER</span> : <span className="text-[11px] text-ink2 shrink-0 num">{a.atMinute - now < 60 ? `${Math.max(0, a.atMinute - now)}m` : `${Math.round((a.atMinute - now) / 60)}h`}</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function MoneyCard() {
  const setScreen = useGameStore((s) => s.setScreen);
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const market = useGameStore((s) => s.market);
  const portfolio = useGameStore((s) => s.portfolio);
  const ventures = useGameStore((s) => s.ventures);
  const projects = useGameStore((s) => s.devProjects);
  const nw = useMemo(() => netWorthOf(useGameStore.getState()), [money, market, portfolio, ventures, projects]);
  const biz = (ventures ?? []).filter((v) => !v.closed);
  return (
    <button onClick={() => setScreen('investments')} className="w-full text-left rounded-[18px] border border-amber/25 p-4 hover:border-amber/50 transition" style={{ background: 'linear-gradient(135deg, rgba(255,184,0,0.10), rgba(255,184,0,0.01) 60%), #14161e' }}>
      <div className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">Net worth</div>
      <div className="text-[24px] font-black text-ink num">{usd(nw.total)}</div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
        <div><div className="text-ink3">Invested</div><div className="text-ink num">{usd(nw.stocks + nw.crypto)}</div></div>
        <div><div className="text-ink3">Businesses</div><div className="text-ink num">{biz.length ? usd(nw.businesses) : '—'}</div></div>
        <div><div className="text-ink3">Property</div><div className="text-ink num">{nw.property ? usd(nw.property) : '—'}</div></div>
      </div>
    </button>
  );
}

function Feed() {
  const log = useGameStore((s) => s.lastEventLog);
  if (!log.length) return null;
  return (
    <section className="rounded-[18px] border border-line bg-card p-4">
      <div className="text-[15px] font-semibold text-ink mb-2">While you were away</div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {log.map((entry, i) => <div key={i} className="text-[13px] text-ink2 leading-snug border-l-2 border-line pl-3">{entry}</div>)}
      </div>
    </section>
  );
}

function Extras() {
  const certifications = useGameStore((s) => s.certifications);
  const contracts = useGameStore((s) => s.contracts);
  const openThreads = useGameStore((s) => s.openThreads);
  const threads = openThreads.filter((t) => !t.resolved);
  const active = contracts.filter((c) => c.active);
  if (!certifications.length && !active.length && !threads.length) return null;
  return (
    <section className="rounded-[18px] border border-line bg-card p-4 space-y-4">
      {threads.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-ink mb-1.5">🕵️ Storylines</div>
          {threads.slice(0, 4).map((t) => <div key={t.id} className="text-[12px] text-ink2 leading-snug py-0.5">{t.type === 'beef' ? '🔥' : t.type === 'romance' ? '💕' : t.type === 'deal' ? '💼' : t.type === 'legal' ? '⚖️' : '📌'} {t.description}</div>)}
        </div>
      )}
      {certifications.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-ink mb-1.5">🏆 Certifications</div>
          {certifications.slice(0, 4).map((c) => <div key={c.id} className="flex justify-between text-[12px] py-0.5"><span className="text-ink2 truncate">{c.songTitle}</span><span className={cn('font-bold ml-2', c.level === 'diamond' ? 'text-new' : c.level === 'platinum' ? 'text-ink' : c.level === 'gold' ? 'text-amber' : 'text-[#cd7f32]')}>{c.level.toUpperCase()}</span></div>)}
        </div>
      )}
      {active.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-ink mb-1.5">📋 Contracts</div>
          {active.map((c) => <div key={c.id} className="text-[12px] py-0.5"><span className="text-ink">{c.npcName}</span> <span className="text-ink3">· {c.type} · {c.terms.percentage}% · until {c.expiresAt}</span></div>)}
        </div>
      )}
    </section>
  );
}

// ─── A DECISION ────────────────────────────────────────────────────────────
// Something happening in your life or your team, with what you can do about
// it. After you choose, it shows what happened.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Moment } from '../../types/game';
import { dateToSerial } from '../../sim/gameClock';
import { cn } from '@/utils/cn';

const ICON: Record<string, string> = {
  family_money: '👨‍👩‍👧', police_stop: '🚓', phone_stolen: '📱', account_hacked: '🔓', fan_mob: '📸', old_friend: '🫂', charity_visit: '💛',
  award_presenter: '🏆', health_scare: '🤒', power_cut: '💡', movie_sync: '🎬', scam_promoter: '🎭', viral_wedding: '🔥', break_in: '🚪',
  church_invite: '⛪', car_trouble: '🚗', brand_deal: '🏷️', bad_press: '📰', burnout: '🥵', leak_threat: '💧', crew_raise: '💵', team_feud: '⚡', stylist_designer: '🧥',
};

export function MomentCard({ moment, compact }: { moment: Moment; compact?: boolean }) {
  const answerMoment = useGameStore((s) => s.answerMoment);
  const gameDate = useGameStore((s) => s.gameDate);
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const energy = useGameStore((s) => s.player?.energy ?? 0);
  const [err, setErr] = useState<string | null>(null);
  const today = dateToSerial(gameDate);
  const left = Math.max(0, moment.expiresSerial - today);
  const open = moment.status === 'open';
  const life = moment.channel === 'life';

  return (
    <div className={cn('rounded-[16px] border p-4 space-y-3', open ? (life ? 'border-new/40 bg-new/[0.05]' : 'border-amber/40 bg-amber/[0.05]') : 'border-line bg-card')}>
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-white/[0.06] flex items-center justify-center text-[20px] shrink-0">{ICON[moment.kind] ?? (life ? '🌍' : '👥')}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[14px] font-semibold text-ink leading-snug">{moment.title}</div>
              {open && <span className={cn('text-[10px] font-bold shrink-0 mt-0.5', left <= 1 ? 'text-fall' : 'text-ink3')}>{left <= 0 ? 'today' : `${left}d`}</span>}
            </div>
            {moment.channel !== 'dm' && <p className="text-[13px] text-ink2 leading-relaxed mt-1">{moment.body}</p>}
          </div>
        </div>
      )}
      {open ? (
        <div className="grid gap-1.5">
          {moment.options.map((o) => {
            const broke = !!o.cost && money < o.cost;
            const tired = !!o.energy && energy < o.energy;
            return (
              <button
                key={o.id}
                disabled={broke || tired}
                onClick={() => { const r = answerMoment(moment.id, o.id); if (!r.ok) setErr(r.message); }}
                className="text-left rounded-[12px] border border-line bg-card hover:border-amber/60 hover:bg-cardhover px-3.5 py-2.5 disabled:opacity-40 transition"
              >
                <div className="text-[13px] font-semibold text-ink">{o.label}</div>
                {(o.hint || o.energy || broke || tired) && (
                  <div className="text-[11px] text-ink3 mt-0.5">
                    {[o.hint, o.energy ? `⚡${o.energy}` : '', broke ? 'not enough money' : '', tired ? 'too tired' : ''].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            );
          })}
          {err && <div className="text-[12px] text-fall">{err}</div>}
        </div>
      ) : (
        <div className="text-[13px] leading-snug">
          {moment.resolution?.label && <div className="text-ink3 text-[12px]">You chose: <span className="text-ink2">{moment.resolution.label}</span></div>}
          <div className={moment.status === 'expired' ? 'text-ink3 italic' : 'text-ink mt-0.5'}>{moment.resolution?.text}</div>
        </div>
      )}
    </div>
  );
}

/** Everything waiting on the player, for the dashboard: decisions, the manager's desk, interviews. */
export function MomentsInbox() {
  const moments = useGameStore((s) => s.moments);
  const desk = useGameStore((s) => s.managerDesk);
  const invites = useGameStore((s) => s.interviewInvites);
  const live = useGameStore((s) => s.activeInterview);
  const setScreen = useGameStore((s) => s.setScreen);
  const selectNPC = useGameStore((s) => s.selectNPC);
  const open = (moments ?? []).filter((m) => m.status === 'open' && m.channel !== 'life');
  const briefs = (desk ?? []).filter((b) => b.status !== 'done');
  const inv = (invites ?? []).filter((i) => i.status === 'open');
  const total = open.length + briefs.length + inv.length + (live ? 1 : 0);
  if (total === 0) return null;
  const tile = 'text-left rounded-[14px] border border-line bg-card hover:bg-cardhover hover:border-amber/50 px-3.5 py-3 transition';
  return (
    <section>
      <div className="flex items-end justify-between mb-2">
        <div className="text-[16px] font-semibold text-ink">Waiting on you <span className="text-amber">· {total}</span></div>
        <div className="text-[11px] text-ink3 hidden sm:block">Ignoring one is a choice too.</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {live && (
          <button onClick={() => setScreen('interviews')} className={tile}>
            <div className="text-[10px] uppercase tracking-wider text-fall font-semibold">🔴 On air</div>
            <div className="text-[13px] text-ink font-semibold truncate mt-0.5">You're mid-interview on {live.outletName}</div>
          </button>
        )}
        {briefs.slice(0, 4).map((b) => (
          <button key={b.id} onClick={() => setScreen('pingchat')} className={tile}>
            <div className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">📋 Manager · {b.advice === 'take' ? 'take it' : b.advice === 'pass' ? 'pass' : b.advice === 'counter' ? 'counter' : 'your call'}</div>
            <div className="text-[13px] text-ink font-semibold truncate mt-0.5">{b.title}</div>
          </button>
        ))}
        {inv.slice(0, 3).map((i) => (
          <button key={i.id} onClick={() => setScreen('interviews')} className={tile}>
            <div className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">🎙️ Interview</div>
            <div className="text-[13px] text-ink font-semibold truncate mt-0.5">{i.outletName} wants you on</div>
          </button>
        ))}
        {open.slice(0, 6).map((m) => (
          <button
            key={m.id}
            onClick={() => {
              if (m.channel === 'dm' && m.npcId) { selectNPC(m.npcId); setScreen('pingchat'); }
              else setScreen('team');
            }}
            className={tile}
          >
            <div className="text-[10px] uppercase tracking-wider text-ink3 font-semibold">{m.channel === 'dm' ? '💬 PingChat' : '👥 Your team'}</div>
            <div className="text-[13px] text-ink font-semibold truncate mt-0.5">{m.title}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

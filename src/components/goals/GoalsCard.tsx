// Your first steps, today's goals, the week's goal, and the streak.
import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { MISSIONS, STREAK_REWARDS, dailyDef, weeklyDef, metricsOf, progress, isUnlocked, GATED, UNLOCK_NOTE } from '../../sim/goals';
import { track } from '../../analytics';
import { cn } from '@/utils/cn';

const money = (n: number) => `$${n.toLocaleString()}`;

function Bar({ v, max }: { v: number; max: number }) {
  return <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-amber transition-all" style={{ width: `${Math.min(100, (v / Math.max(1, max)) * 100)}%` }} /></div>;
}

export function GoalsCard() {
  const goals = useGameStore((s) => s.goals);
  // re-render when anything the goals read changes
  useGameStore((s) => s.songs); useGameStore((s) => s.videos); useGameStore((s) => s.beats); useGameStore((s) => s.academy);
  const fans = useGameStore((s) => s.player?.career.fanbase); useGameStore((s) => s.player?.career.totalStreams); useGameStore((s) => s.player?.career.totalEarnings);
  const claim = useGameStore((s) => s.claimGoal);
  const setScreen = useGameStore((s) => s.setScreen);
  const seeUnlocks = useGameStore((s) => s.seeUnlocks);
  const [note, setNote] = useState<string | null>(null);
  const st = useGameStore.getState();
  const m = useMemo(() => (goals ? metricsOf(st, goals) : null), [goals, st.songs, st.videos, st.beats, st.academy, fans, st.player?.career.totalStreams, st.player?.career.totalEarnings, st.player?.career.money]);
  if (!goals || !m) return null;

  const onClaim = (kind: 'mission' | 'daily' | 'weekly', id: string) => {
    const r = claim(kind, id);
    setNote(r.ok ? `🎉 ${r.message}` : null);
    if (r.ok && kind === 'mission') track('mission', id);
    window.setTimeout(() => setNote(null), 4000);
  };
  const missions = goals.legacy ? [] : MISSIONS;
  const doneN = missions.filter((x) => goals.claimed[x.id]).length;
  const next = missions.filter((x) => !goals.claimed[x.id]).slice(0, 3);
  const weekly = weeklyDef(goals.weekly.id);
  const newly = goals.showAll || goals.legacy ? [] : GATED.filter((id) => isUnlocked(id, st, goals, m) && !goals.seenUnlocks.includes(id) && UNLOCK_NOTE[id]);
  const nextStreak = Object.keys(STREAK_REWARDS).map(Number).find((n) => n > goals.streak);

  return (
    <section className="rounded-[18px] border border-line bg-card p-4 space-y-4" data-testid="goals-card">
      {note && <div className="rounded-lg bg-amber/15 border border-amber/40 text-amber text-[13px] px-3 py-2" data-testid="goal-note">{note}</div>}
      {newly.length > 0 && (
        <div className="rounded-lg bg-white/5 border border-line px-3 py-2 text-[12px]">
          <b className="text-ink">New in your menu:</b> {newly.map((id) => `${id.replace(/_/g, ' ')} — ${UNLOCK_NOTE[id]}`).join(' · ')}
          <button onClick={() => seeUnlocks(newly)} className="ml-2 text-amber font-semibold">Got it</button>
        </div>
      )}

      {missions.length > 0 && doneN < missions.length && (
        <div data-testid="missions">
          <div className="flex items-baseline justify-between mb-1.5"><div className="text-[13px] font-black tracking-wide text-ink">YOUR FIRST STEPS</div><div className="text-[11px] text-ink3">{doneN}/{missions.length}</div></div>
          <Bar v={doneN} max={missions.length} />
          <div className="mt-2 space-y-1.5">
            {next.map((x, i) => {
              const ready = x.done(m, goals);
              return (
                <div key={x.id} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', i === 0 ? 'border-amber/50 bg-amber/5' : 'border-line')}>
                  <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-ink">{x.title}</div><div className="text-[11px] text-ink3">{x.hint}</div></div>
                  {ready
                    ? <button onClick={() => onClaim('mission', x.id)} className="h-8 px-3 rounded-full bg-amber text-black text-[12px] font-bold" data-testid={`claim-${x.id}`}>Claim {money(x.reward)}</button>
                    : <button onClick={() => setScreen(x.go)} className="h-8 px-3 rounded-full border border-line text-[12px] font-semibold text-ink2">Go · {money(x.reward)}</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div data-testid="dailies">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[13px] font-black tracking-wide text-ink">TODAY</div>
          <div className="text-[11px] text-ink3">🔥 {goals.streak}-day streak{nextStreak ? ` · ${money(STREAK_REWARDS[nextStreak])} at ${nextStreak}` : ''}</div>
        </div>
        <div className="space-y-1.5">
          {goals.daily.map((slot) => {
            const def = dailyDef(slot.id); if (!def) return null;
            const p = progress(def, m, goals.base);
            const ready = p >= def.target;
            return (
              <div key={slot.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                <div className="min-w-0 flex-1"><div className={cn('text-[13px]', slot.claimed ? 'text-ink3 line-through' : 'text-ink')}>{def.text}</div><Bar v={p} max={def.target} /></div>
                {slot.claimed ? <span className="text-[12px] text-green-400">✓</span>
                  : ready ? <button onClick={() => onClaim('daily', slot.id)} className="h-8 px-3 rounded-full bg-amber text-black text-[12px] font-bold" data-testid={`claim-${slot.id}`}>Claim {money(def.reward)}</button>
                  : <button onClick={() => setScreen(def.go)} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink2">{money(def.reward)}</button>}
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-ink3 mt-1.5">Finish two a day to keep your streak. Miss a day and it waits for you.</div>
      </div>

      {weekly && (
        <div data-testid="weekly">
          <div className="text-[13px] font-black tracking-wide text-ink mb-1.5">THIS WEEK</div>
          {(() => {
            const p = progress(weekly, m, goals.weekBase); const ready = p >= weekly.target;
            return (
              <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                <div className="min-w-0 flex-1"><div className={cn('text-[13px]', goals.weekly.claimed ? 'text-ink3 line-through' : 'text-ink')}>{weekly.text}</div><Bar v={p} max={weekly.target} /></div>
                {goals.weekly.claimed ? <span className="text-[12px] text-green-400">✓</span>
                  : ready ? <button onClick={() => onClaim('weekly', weekly.id)} className="h-8 px-3 rounded-full bg-amber text-black text-[12px] font-bold">Claim {money(weekly.reward)}</button>
                  : <button onClick={() => setScreen(weekly.go)} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink2">{money(weekly.reward)}</button>}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}

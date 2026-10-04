import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Button } from '../ui/Card';
import { JOB_CATEGORY_LABEL } from '../../data/jobs';
import { energyLabel, energyColor } from '../../sim/energy';
import type { JobCategory } from '../../types/game';

export function JobsScreen() {
  const { player, jobBoard, jobShifts, workJob, refreshJobBoard } = useGameStore();
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // The board is rolled by the turn engine, but if the player arrives on a
  // fresh save (or after a load) there may not be one yet.
  useEffect(() => {
    refreshJobBoard();
  }, [refreshJobBoard]);

  const byCategory = useMemo(() => {
    const groups = new Map<JobCategory, typeof jobBoard>();
    for (const job of jobBoard) {
      const list = groups.get(job.category) ?? [];
      list.push(job);
      groups.set(job.category, list);
    }
    return [...groups.entries()];
  }, [jobBoard]);

  const totalEarned = useMemo(
    () => jobShifts.reduce((sum, s) => sum + s.pay, 0),
    [jobShifts],
  );

  if (!player) return null;

  const energy = player.energy;

  const handleWork = (jobId: string) => {
    setBusy(true);
    const res = workJob(jobId);
    setNotice({ tone: res.ok ? 'good' : 'bad', text: res.message });
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Work that pays now. It costs you energy and days you could have spent on the music —
            that is the trade.
          </p>
        </div>

        <Card className="shrink-0 !p-3 min-w-[190px]">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Energy</span>
            <span className="text-white">{energyLabel(energy, player.maxEnergy)}</span>
          </div>
          <div className="bg-gray-800 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${energyColor(energy, player.maxEnergy)}`}
              style={{ width: `${Math.max(0, Math.min(100, energy))}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-600 mt-1">
            {Math.floor(energy)} / {player.maxEnergy}
          </div>
        </Card>
      </div>

      {notice && (
        <Card
          className={
            notice.tone === 'good'
              ? '!bg-green-500/10 !border-green-500/30'
              : '!bg-red-500/10 !border-red-500/30'
          }
        >
          <div className={`text-sm ${notice.tone === 'good' ? 'text-green-300' : 'text-red-300'}`}>
            {notice.text}
          </div>
        </Card>
      )}

      {energy <= 0 && (
        <Card className="!bg-orange-500/10 !border-orange-500/30">
          <div className="text-sm text-orange-200">
            You are <strong>gassed out</strong>. Nothing on this board is happening today —
            let the clock move (sim a day, a week, a month) and the energy comes back.
          </div>
        </Card>
      )}

      {/* ── BOARD ─────────────────────────────────────────────────────── */}
      {jobBoard.length === 0 ? (
        <Card>
          <div className="text-sm text-gray-500">
            Nothing on the board right now. Let some time pass and it refreshes.
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {byCategory.map(([category, jobs]) => {
            const meta = JOB_CATEGORY_LABEL[category];
            return (
              <div key={category}>
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                  {meta?.emoji} {meta?.label ?? category}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {jobs.map(job => {
                    const cannotAffordEnergy = energy < job.energyCost;
                    return (
                      <Card key={job.id} className="flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{job.title}</div>
                            <div className="text-xs text-gray-500 truncate">{job.employer}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-green-400 font-mono">
                              ${job.pay.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 leading-snug mb-3 flex-1">{job.blurb}</p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
                          <span className={cannotAffordEnergy ? 'text-red-400' : ''}>
                            ⚡ {job.energyCost}
                          </span>
                          <span>📅 {job.daysCost} day{job.daysCost > 1 ? 's' : ''}</span>
                          {job.requirement && (
                            <span className="text-gray-600">· needs {job.requirement.label}</span>
                          )}
                        </div>

                        <Button
                          variant={cannotAffordEnergy ? 'ghost' : 'primary'}
                          size="sm"
                          disabled={cannotAffordEnergy || busy}
                          onClick={() => handleWork(job.id)}
                        >
                          {cannotAffordEnergy ? 'Not enough energy' : 'Take the shift'}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm">Recent shifts</h3>
          <span className="text-xs text-gray-500">
            {jobShifts.length} worked · ${totalEarned.toLocaleString()} earned
          </span>
        </div>
        {jobShifts.length === 0 ? (
          <div className="text-sm text-gray-500">You have not worked a shift yet.</div>
        ) : (
          <div className="space-y-1.5">
            {jobShifts.slice(0, 8).map(shift => (
              <div
                key={shift.id}
                className="flex items-center justify-between text-xs bg-gray-800/50 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-gray-300">{shift.title}</span>
                  <span className="text-gray-600"> · {shift.employer}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-gray-600">{shift.date}</span>
                  <span className="text-green-400 font-mono">+${shift.pay.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

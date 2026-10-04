// ─── GAME CLOCK ────────────────────────────────────────────────────────────
// The date, the time of day, and the controls that decide how fast the world
// runs. Every value comes off the game calendar — never the machine clock — so
// what is on screen is what the simulation actually believes.

import { useGameStore } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { formatLong, weekIndexOf, formatClockTime } from '../../sim/gameClock';
import { IconPause, IconPlay } from '../icons';

const SPEEDS = [1, 2, 4] as const;

/** '08:42' from minutes past midnight. */
export const formatClock = formatClockTime;

/** The phase of the day, so 04:00 does not read the same as 14:00. */
function phaseOf(minute: number): string {
  const h = Math.floor((((minute % 1440) + 1440) % 1440) / 60);
  if (h < 5) return 'Late night';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 22) return 'Evening';
  return 'Night';
}

export function GameClock({ compact = false }: { compact?: boolean }) {
  const gameDate = useGameStore((s) => s.gameDate);
  const clockMinute = useGameStore((s) => s.clockMinute);
  const clockPaused = useGameStore((s) => s.clockPaused);
  const clockSpeed = useGameStore((s) => s.clockSpeed);
  const setClockPaused = useGameStore((s) => s.setClockPaused);
  const setClockSpeed = useGameStore((s) => s.setClockSpeed);

  const minute = clockMinute ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="num text-[12px] font-semibold text-ink tabular-nums">
          {formatClock(minute)}
        </span>
        <button
          onClick={() => setClockPaused(!clockPaused)}
          aria-label={clockPaused ? 'Resume the clock' : 'Pause the clock'}
          className={cn(
            'w-7 h-7 rounded-[8px] border flex items-center justify-center transition-colors',
            clockPaused
              ? 'border-amber/40 bg-amber/10 text-amber'
              : 'border-line bg-card text-ink2 hover:text-ink',
          )}
        >
          {clockPaused ? <IconPlay size={13} /> : <IconPause size={13} />}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-line">
      <div className="flex items-baseline justify-between">
        <span className="num text-[19px] font-black text-ink tabular-nums leading-none">
          {formatClock(minute)}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-ink3 font-bold">
          {phaseOf(minute)}
        </span>
      </div>

      <div className="text-[11px] text-ink2 mt-1.5 leading-tight">{formatLong(gameDate)}</div>
      <div className="text-[10px] text-ink3 mt-0.5">Tracking week {weekIndexOf(gameDate)}</div>

      <div className="flex items-center gap-1.5 mt-2.5">
        <button
          onClick={() => setClockPaused(!clockPaused)}
          aria-label={clockPaused ? 'Resume the clock' : 'Pause the clock'}
          className={cn(
            'w-7 h-7 rounded-[8px] border flex items-center justify-center transition-colors',
            clockPaused
              ? 'border-amber/40 bg-amber/10 text-amber'
              : 'border-line bg-card text-ink2 hover:text-ink',
          )}
        >
          {clockPaused ? <IconPlay size={13} /> : <IconPause size={13} />}
        </button>

        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setClockSpeed(s)}
            className={cn(
              'h-7 px-2 rounded-[8px] border text-[11px] font-semibold num transition-colors',
              (clockSpeed ?? 1) === s
                ? 'border-amber/40 bg-amber/10 text-amber'
                : 'border-line bg-card text-ink3 hover:text-ink',
            )}
          >
            {s}×
          </button>
        ))}

        <span
          className={cn(
            'ml-auto text-[10px] font-bold uppercase tracking-wider',
            clockPaused ? 'text-ink3' : 'text-rise',
          )}
        >
          {clockPaused ? 'Paused' : 'Live'}
        </span>
      </div>
    </div>
  );
}

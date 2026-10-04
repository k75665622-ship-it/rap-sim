import { useGameStore } from '../../store/gameStore';
import { Card } from './Card';
import {
  WORK_KIND_EMOJI,
  byWorkAlmostDone,
  workDaysLeft,
  workEtaLine,
  workProgress,
} from '../../sim/work';

/**
 * What the artist is in the middle of right now.
 *
 * A session is days in a room, not a button — so the days have to be visible
 * somewhere, or the player books a six-day session, sims once and cannot tell
 * whether anything happened. This is that somewhere.
 *
 * Renders nothing when the artist is free, unless `always` is set (the studio
 * wants to say "the booth is empty" rather than silently show nothing).
 */
export function WorkInProgress({ always = false }: { always?: boolean }) {
  const workItems = useGameStore((s) => s.workItems);

  if (!workItems || workItems.length === 0) {
    if (!always) return null;
    return (
      <Card>
        <h3 className="font-bold text-white text-sm mb-2">🎬 In Progress</h3>
        <p className="text-xs text-gray-500">
          Nothing on the go. Book a session, a mix or a shoot and the days will show up here.
        </p>
      </Card>
    );
  }

  // The job closest to landing first — that is the one the player is waiting on.
  const items = [...workItems].sort(byWorkAlmostDone);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-white text-sm">🎬 In Progress</h3>
        <span className="text-xs text-gray-500">
          {items.length} job{items.length === 1 ? '' : 's'} on the go
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const pct = Math.round(workProgress(item) * 100);
          const left = workDaysLeft(item);
          return (
            <div key={item.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-white truncate">
                  <span className="mr-1.5">{WORK_KIND_EMOJI[item.kind]}</span>
                  {item.label}
                </p>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {left === 0 ? 'finishing up' : `${left} day${left === 1 ? '' : 's'} left`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <span className="text-xs text-gray-500 truncate">{item.detail}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{workEtaLine(item)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        The energy is already spent, so the time is yours — go and do something else.
      </p>
    </Card>
  );
}

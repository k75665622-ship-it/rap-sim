// The recorded vocal, bar by bar. Tap the bars where your hook is.
import { cn } from '@/utils/cn';

export function BarStrip({ bars, hook, onToggle, now }: { bars: number; hook: number[]; onToggle?: (b: number) => void; now?: number | null }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      {Array.from({ length: Math.max(1, bars) }, (_, b) => {
        const on = hook.includes(b);
        return (
          <button key={b} type="button" disabled={!onToggle} onClick={() => onToggle?.(b)} aria-pressed={on} aria-label={`Bar ${b + 1}${on ? ', hook' : ''}`}
            className={cn('shrink-0 w-7 h-9 rounded-[6px] border text-[10px] num transition', on ? 'bg-amber border-amber text-black font-bold' : 'border-line text-ink3 hover:border-amber/50', now === b && 'ring-2 ring-rise ring-offset-1 ring-offset-black')}>
            {b + 1}
          </button>
        );
      })}
    </div>
  );
}

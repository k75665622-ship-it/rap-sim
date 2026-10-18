// ─── MONEY: SHARED PIECES ──────────────────────────────────────────────────

import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Price formatting that copes with a $0.00004 meme coin and a $40,000 one. */
export function px(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(3)}`;
}

export function usd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 100_000) return `${sign}$${Math.round(a / 1000)}K`;
  return `${sign}$${Math.round(a).toLocaleString()}`;
}

export function units(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1000) return Math.round(n).toLocaleString();
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function Delta({ v, className, digits = 1 }: { v: number; className?: string; digits?: number }) {
  if (!Number.isFinite(v)) return <span className={cn('text-ink3', className)}>—</span>;
  const up = v >= 0;
  return (
    <span className={cn('num font-semibold', up ? 'text-rise' : 'text-fall', className)}>
      {up ? '▲' : '▼'} {Math.abs(v * 100).toFixed(digits)}%
    </span>
  );
}

/** A small line chart. */
export function Spark({ data, w = 96, h = 32, className, fill = true, color }: { data: number[]; w?: number; h?: number; className?: string; fill?: boolean; color?: string }) {
  const id = useId();
  if (data.length < 2) return <svg width={w} height={h} className={className} />;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const span = hi - lo || hi || 1;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - 2 - ((d - lo) / span) * (h - 4)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const c = color ?? (data[data.length - 1] >= data[0] ? '#2ed573' : '#ff4757');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity="0.28" />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Big responsive chart: fills its container width. */
export function Chart({ data, h = 140 }: { data: number[]; h?: number }) {
  return (
    <div className="w-full" style={{ height: h }}>
      <Spark data={data} w={600} h={h} className="w-full h-full" />
    </div>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, className }: { options: { id: T; label: ReactNode }[]; value: T | null; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto pb-0.5', className)}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          onClick={() => onChange(o.id)}
          className={cn(
            'shrink-0 h-8 px-3 rounded-full border text-[12px] font-semibold transition whitespace-nowrap',
            value === o.id ? 'border-amber bg-amber/15 text-amber' : 'border-line bg-card text-ink2 hover:text-ink hover:bg-cardhover',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={cn('rounded-[16px] border border-line bg-card', className)} style={style}>{children}</div>;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-[10px] font-semibold uppercase tracking-wider text-ink3', className)}>{children}</div>;
}

export function Flash({ msg, onClose }: { msg: { ok: boolean; message: string } | null; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className={cn('rl-pop rounded-[12px] border px-3.5 py-2.5 text-[13px] flex items-start gap-3', msg.ok ? 'border-rise/40 bg-rise/10 text-ink' : 'border-fall/40 bg-fall/10 text-ink')}>
      <span className="flex-1 leading-snug">{msg.message}</span>
      <button onClick={onClose} className="text-ink3 hover:text-ink text-[12px]">✕</button>
    </div>
  );
}

const CALL_STYLE: Record<string, string> = {
  'Strong buy': 'bg-rise/20 text-rise border-rise/40',
  Buy: 'bg-rise/10 text-rise border-rise/30',
  Hold: 'bg-white/5 text-ink2 border-line',
  Sell: 'bg-fall/10 text-fall border-fall/30',
  Avoid: 'bg-fall/20 text-fall border-fall/40',
};
export function CallBadge({ call }: { call: string }) {
  return <span className={cn('inline-flex items-center h-6 px-2 rounded-full border text-[11px] font-bold whitespace-nowrap', CALL_STYLE[call] ?? CALL_STYLE.Hold)}>{call}</span>;
}

/** A row of quick amounts plus a typed amount. */
export function AmountPicker({ value, onChange, presets, max }: { value: number; onChange: (n: number) => void; presets: number[]; max: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-ink3 text-[14px]">$</span>
        <input
          type="number"
          inputMode="numeric"
          value={value || ''}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          placeholder="Amount"
          className="flex-1 min-w-0 h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[15px] text-ink num focus:border-amber outline-none"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {presets.filter((p) => p <= max).map((p) => (
          <button key={p} onClick={() => onChange(p)} className={cn('shrink-0 h-7 px-2.5 rounded-full border text-[11px] font-semibold', value === p ? 'border-amber text-amber bg-amber/10' : 'border-line text-ink2 bg-card')}>{usd(p)}</button>
        ))}
        {max > 0 && <button onClick={() => onChange(Math.floor(max))} className="shrink-0 h-7 px-2.5 rounded-full border border-line text-[11px] font-semibold text-ink2 bg-card">Max</button>}
      </div>
    </div>
  );
}

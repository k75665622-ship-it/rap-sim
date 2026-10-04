// ─── SHARED UI KIT ─────────────────────────────────────────────────────────
// One set of primitives used by every page. Nothing here knows about the game —
// these are the pieces the game is assembled from, so a change to the card
// radius or the loading state happens once and lands everywhere.

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';
import { IconAlert, IconChevronDown, IconInfo, IconSearch, IconX } from '../icons';

// ─── SURFACES ──────────────────────────────────────────────────────────────

export function Panel({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}) {
  return (
    <Tag className={cn('bg-card border border-line rounded-[14px] shadow-sm', className)}>
      {children}
    </Tag>
  );
}

/** A card that responds to being pointed at. */
export function Tile({
  children,
  className,
  onClick,
  accent,
  selected,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  accent?: string;
  selected?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      style={selected && accent ? { borderColor: accent, background: `${accent}14` } : undefined}
      className={cn(
        'bg-card border border-line rounded-[14px] shadow-sm transition-all duration-150',
        onClick && 'cursor-pointer hover:bg-cardhover hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3 mb-3', className)}>
      <h2 className="text-[18px] font-semibold text-ink leading-tight">{children}</h2>
      {action}
    </div>
  );
}

export function PageTitle({
  children,
  subtitle,
  action,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold text-ink leading-tight truncate">{children}</h1>
        {subtitle ? <div className="text-[13px] text-ink2 mt-1">{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}

// ─── STATES ────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rl-skeleton rounded-[10px]', className)} />;
}

/** A list placeholder that matches the shape of what is loading. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-14 h-14" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4',
        className,
      )}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-[14px]" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="text-ink3 mb-3">{icon ?? <IconInfo size={26} />}</div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body ? <p className="text-[13px] text-ink2 mt-1.5 max-w-sm leading-relaxed">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="text-fall mb-3">
        <IconAlert size={26} />
      </div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body ? <p className="text-[13px] text-ink2 mt-1.5 max-w-sm leading-relaxed">{body}</p> : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-[10px] bg-amber text-black text-[13px] font-semibold hover:brightness-110 transition"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

// ─── CONTROLS ──────────────────────────────────────────────────────────────

export function Pill({
  children,
  active,
  accent,
  onClick,
  className,
  title,
}: {
  children: ReactNode;
  active?: boolean;
  accent?: string;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  const style =
    active && accent
      ? { background: `${accent}22`, borderColor: accent, color: accent }
      : undefined;
  return (
    <button
      title={title}
      onClick={onClick}
      style={style}
      className={cn(
        'px-3 h-8 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-all duration-150',
        active
          ? accent
            ? ''
            : 'bg-amber/15 border-amber text-amber'
          : 'bg-card border-line text-ink2 hover:text-ink hover:bg-cardhover',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ id: T; label: string; badge?: string }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex p-1 rounded-[12px] bg-sidebar border border-line gap-1',
        className,
      )}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'px-3.5 h-8 rounded-[9px] text-[13px] font-semibold transition-all duration-150 whitespace-nowrap',
            value === o.id
              ? 'bg-cardhover text-ink shadow-sm'
              : 'text-ink3 hover:text-ink2',
          )}
        >
          {o.label}
          {o.badge ? (
            <span className="ml-1.5 text-[10px] text-ink3 num">{o.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  accent,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
  size?: 'sm' | 'md';
  disabled?: boolean;
  accent?: string;
  className?: string;
  title?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = size === 'sm' ? 'h-8 px-3 text-[12px]' : 'h-10 px-4 text-[13px]';
  const variants: Record<string, string> = {
    primary: 'bg-amber text-black hover:brightness-110',
    secondary: 'bg-card border border-line text-ink hover:bg-cardhover',
    ghost: 'text-ink2 hover:text-ink hover:bg-white/5',
    accent: 'text-black',
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={variant === 'accent' && accent ? { background: accent } : undefined}
      className={cn(base, sizes, variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none">
        <IconSearch size={16} />
      </span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-9 rounded-[10px] bg-card border border-line text-ink text-[13px] placeholder:text-ink3 focus:outline-none focus:border-amber transition-colors"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
        >
          <IconX size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full h-10 pl-3 pr-8 rounded-[10px] bg-card border border-line text-ink text-[13px] focus:outline-none focus:border-amber cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none">
        <IconChevronDown size={15} />
      </span>
    </div>
  );
}

// ─── ARTWORK ───────────────────────────────────────────────────────────────
// A song with no cover art still gets something deliberate rather than a broken
// image: a gradient derived from the item's own id, with its initials on top.

const GRADIENTS: Array<[string, string]> = [
  ['#FFB800', '#FF5E3A'],
  ['#4DA3FF', '#1DB954'],
  ['#B57BFF', '#FF3B7B'],
  ['#2ED573', '#0E9F6E'],
  ['#FF4757', '#B44CFF'],
  ['#1E90FF', '#00D1C1'],
  ['#FF9F1C', '#FF4757'],
  ['#6B7186', '#232632'],
];

export function seedHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function gradientFor(seed: string): [string, string] {
  return GRADIENTS[seedHash(seed) % GRADIENTS.length];
}

export function Artwork({
  seed,
  title,
  size = 56,
  rounded = 10,
  className,
}: {
  seed: string;
  title: string;
  size?: number;
  rounded?: number;
  className?: string;
}) {
  const [a, b] = gradientFor(seed);
  return (
    <div
      className={cn('shrink-0 flex items-center justify-center font-bold text-black/80 select-none', className)}
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: Math.max(10, size * 0.3),
        letterSpacing: '-0.02em',
      }}
      aria-hidden="true"
    >
      {initials(title)}
    </div>
  );
}

/** A 16:9 tile for video thumbnails. */
export function VideoArt({
  seed,
  title,
  className,
  children,
}: {
  seed: string;
  title: string;
  className?: string;
  children?: ReactNode;
}) {
  const [a, b] = gradientFor(seed);
  return (
    <div
      className={cn('relative w-full aspect-video rounded-[12px] overflow-hidden', className)}
      style={{ background: `linear-gradient(140deg, ${a}, ${b})` }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-black/70 font-bold text-lg tracking-tight">{initials(title)}</span>
      </div>
      {children}
    </div>
  );
}

// ─── OVERLAYS ──────────────────────────────────────────────────────────────

function useEscape(onClose: () => void, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, open]);
}

/**
 * A panel that slides in from the right. Full screen on a phone, a fixed-width
 * column from `md` up. Used for the notification feed and every chart drawer.
 */
export function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 420,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}) {
  useEscape(onClose, open);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/60 rl-fade"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-0 h-full w-full md:w-auto bg-sidebar border-l border-line flex flex-col rl-slide"
        style={{ maxWidth: '100%', ...(typeof window !== 'undefined' && window.innerWidth >= 768 ? { width } : {}) }}
      >
        <div className="flex items-start justify-between gap-3 px-4 h-14 border-b border-line shrink-0">
          <div className="min-w-0 self-center">
            <div className="text-[15px] font-semibold text-ink truncate">{title}</div>
            {subtitle ? <div className="text-[11px] text-ink3 truncate">{subtitle}</div> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="self-center w-8 h-8 rounded-full flex items-center justify-center text-ink2 hover:text-ink hover:bg-white/5 transition"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="border-t border-line p-3 shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}

/** A short badge. `tone` picks the semantic colour. */
export function Tag({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode;
  tone?: 'muted' | 'up' | 'down' | 'new' | 're' | 'amber' | 'accent';
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: 'bg-white/5 text-ink3',
    up: 'bg-rise/15 text-rise',
    down: 'bg-fall/15 text-fall',
    new: 'bg-new/15 text-new',
    re: 'bg-re/15 text-re',
    amber: 'bg-amber/15 text-amber',
    accent: 'bg-white/10 text-ink2',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 h-[18px] rounded-full text-[10px] font-bold tracking-wide uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A simple labelled figure. */
export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-wider text-ink3">{label}</div>
      <div className="text-[17px] font-semibold text-ink num mt-0.5">{value}</div>
      {sub ? <div className="text-[11px] text-ink3 mt-0.5 num">{sub}</div> : null}
    </div>
  );
}

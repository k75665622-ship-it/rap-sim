// ─── DOMAIN CARDS AND ROWS ─────────────────────────────────────────────────
// The shared building blocks every music page is assembled from. Defined once so
// a song looks the same in a chart, a search result and a platform home.

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Artwork, Tag, VideoArt, gradientFor } from './kit';
import { compact, duration, initials } from '@/utils/format';
import type { ChartRow as ChartRowData } from '../../types/game';
import { PLATFORM_LIST, type PlatformConfig } from '../../data/platforms';
import { IconArrowDown, IconArrowUp, IconMinus, IconPlay, IconVerified } from '../icons';

// ─── SONG ──────────────────────────────────────────────────────────────────

export function SongCard({
  title,
  artist,
  seed,
  meta,
  onClick,
  isPlayer,
  badge,
}: {
  title: string;
  artist: string;
  seed: string;
  meta?: ReactNode;
  onClick?: () => void;
  isPlayer?: boolean;
  badge?: ReactNode;
}) {
  return (
    <button onClick={onClick} className="text-left group w-full">
      <div className="relative">
        <div className="w-full aspect-square rounded-[14px] overflow-hidden border border-line transition-all duration-150 group-hover:border-ink3/40 group-hover:-translate-y-0.5">
          <Artwork seed={seed} title={title} size={220} rounded={0} className="!w-full !h-full" />
        </div>
        {isPlayer ? (
          <span className="absolute top-2 left-2">
            <Tag tone="amber">You</Tag>
          </span>
        ) : null}
        {badge ? <span className="absolute top-2 right-2">{badge}</span> : null}
      </div>
      <div className="mt-2">
        <div className="text-[13px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
          {title}
        </div>
        <div className="text-[12px] text-ink2 truncate">{artist}</div>
        {meta ? <div className="text-[11px] text-ink3 mt-0.5 num truncate">{meta}</div> : null}
      </div>
    </button>
  );
}

export function SongGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">{children}</div>
  );
}

// ─── ALBUM ─────────────────────────────────────────────────────────────────

export function AlbumCard({
  title,
  artist,
  seed,
  type,
  meta,
  onClick,
}: {
  title: string;
  artist: string;
  seed: string;
  type?: 'album' | 'ep' | 'deluxe' | 'mixtape';
  meta?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left group w-full">
      <div className="relative w-full aspect-square rounded-[14px] overflow-hidden border border-line transition-all duration-150 group-hover:border-ink3/40 group-hover:-translate-y-0.5">
        <Artwork seed={seed} title={title} size={220} rounded={0} className="!w-full !h-full" />
        {type ? (
          <span className="absolute bottom-2 left-2">
            <Tag tone="accent">
              {type === 'ep' ? 'EP' : type === 'mixtape' ? 'Mixtape' : type === 'deluxe' ? 'Deluxe' : 'Album'}
            </Tag>
          </span>
        ) : null}
      </div>
      <div className="mt-2">
        <div className="text-[13px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
          {title}
        </div>
        <div className="text-[12px] text-ink2 truncate">{artist}</div>
        {meta ? <div className="text-[11px] text-ink3 mt-0.5 num truncate">{meta}</div> : null}
      </div>
    </button>
  );
}

// ─── ARTIST ────────────────────────────────────────────────────────────────

export function ArtistCard({
  name,
  seed,
  subtitle,
  meta,
  onClick,
  verified,
  size = 96,
}: {
  name: string;
  seed: string;
  subtitle?: string;
  meta?: ReactNode;
  onClick?: () => void;
  verified?: boolean;
  size?: number;
}) {
  const [a, b] = gradientFor(seed);
  return (
    <button onClick={onClick} className="text-left group w-full flex flex-col items-center text-center">
      <div
        className="rounded-full flex items-center justify-center font-bold text-black/80 transition-all duration-150 group-hover:-translate-y-0.5"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${a}, ${b})`,
          fontSize: size * 0.3,
        }}
      >
        {initials(name)}
      </div>
      <div className="mt-2 flex items-center gap-1 justify-center max-w-full">
        <span className="text-[13px] font-semibold text-ink truncate group-hover:text-amber transition-colors">
          {name}
        </span>
        {verified ? <IconVerified size={13} className="text-new shrink-0" /> : null}
      </div>
      {subtitle ? <div className="text-[11px] text-ink2 truncate w-full">{subtitle}</div> : null}
      {meta ? <div className="text-[11px] text-ink3 num mt-0.5">{meta}</div> : null}
    </button>
  );
}

// ─── VIDEO ─────────────────────────────────────────────────────────────────

export function VideoCard({
  title,
  artist,
  seed,
  views,
  age,
  durationSec,
  onClick,
  isPlayer,
  verified,
}: {
  title: string;
  artist: string;
  seed: string;
  views: number;
  age: string;
  durationSec: number;
  onClick?: () => void;
  isPlayer?: boolean;
  verified?: boolean;
}) {
  return (
    <button onClick={onClick} className="text-left group w-full">
      <VideoArt seed={seed} title={title}>
        <span className="absolute bottom-2 right-2 px-1.5 h-5 rounded bg-black/75 text-white text-[11px] font-semibold flex items-center num">
          {duration(durationSec)}
        </span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-11 h-11 rounded-full bg-black/60 flex items-center justify-center text-white">
            <IconPlay size={20} />
          </span>
        </span>
      </VideoArt>
      <div className="mt-2 flex gap-2.5">
        <div
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-black/80"
          style={{ background: `linear-gradient(135deg, ${gradientFor(seed)[0]}, ${gradientFor(seed)[1]})` }}
        >
          {initials(artist)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink line-clamp-2 leading-snug group-hover:text-amber transition-colors">
            {title}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[12px] text-ink2 truncate">{artist}</span>
            {verified ? <IconVerified size={12} className="text-new shrink-0" /> : null}
            {isPlayer ? <Tag tone="amber">You</Tag> : null}
          </div>
          <div className="text-[11px] text-ink3 num">
            {compact(views)} views · {age}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── CHART ROW ─────────────────────────────────────────────────────────────

export function MovementBadge({ row }: { row: ChartRowData }) {
  if (row.movement === 'new') return <Tag tone="new">New</Tag>;
  if (row.movement === 'reentry') return <Tag tone="re">Re-entry</Tag>;
  if (row.movement === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-rise text-[11px] font-bold num">
        <IconArrowUp size={11} />
        {row.delta}
      </span>
    );
  }
  if (row.movement === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-fall text-[11px] font-bold num">
        <IconArrowDown size={11} />
        {row.delta}
      </span>
    );
  }
  return <IconMinus size={12} className="text-ink3" />;
}

/** Rank 1 gets a hero card. Everyone else gets a row. */
export function ChartHero({
  row,
  metricLabel,
  onClick,
}: {
  row: ChartRowData;
  metricLabel: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-[14px] bg-card border border-line cursor-pointer hover:bg-cardhover transition-colors"
      style={row.isPlayer ? { borderLeftWidth: 3, borderLeftColor: '#FFB800' } : undefined}
    >
      <Artwork seed={`${row.itemId}`} title={row.title} size={96} rounded={12} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber">
            #1 on chart
          </span>
          {row.isPlayer ? <Tag tone="amber">You</Tag> : null}
        </div>
        <div className="text-[17px] font-semibold text-ink truncate">{row.title}</div>
        <div className="text-[13px] text-ink2 truncate">{row.artistName}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-ink3 num">
          <span>
            <span className="text-ink font-semibold">{compact(row.metric)}</span> {metricLabel}
          </span>
          {row.weeksAtNo1 > 0 ? <span>{row.weeksAtNo1} wk at #1</span> : null}
          <span>{row.weeks} wk on chart</span>
        </div>
      </div>
    </div>
  );
}

export function ChartRow({
  row,
  metricLabel,
  onClick,
}: {
  row: ChartRowData;
  metricLabel: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-[10px] cursor-pointer transition-colors',
        'hover:bg-cardhover',
        row.isPlayer && 'bg-amber/5',
      )}
      style={row.isPlayer ? { borderLeft: '3px solid #FFB800' } : { borderLeft: '3px solid transparent' }}
    >
      <div className="w-8 text-right shrink-0">
        <span className="text-[17px] font-bold text-ink num">{row.position}</span>
      </div>

      <div className="w-11 shrink-0 flex justify-center">
        <MovementBadge row={row} />
      </div>

      <Artwork seed={`${row.itemId}`} title={row.title} size={44} rounded={8} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-ink truncate">{row.title}</span>
          {row.isPlayer ? <Tag tone="amber">You</Tag> : null}
          {row.hasTopped ? <Tag tone="amber">#1</Tag> : null}
        </div>
        <div className="text-[12px] text-ink2 truncate">{row.artistName}</div>
        {/* On a phone the extra columns move to a second line. */}
        <div className="md:hidden flex gap-3 text-[11px] text-ink3 num mt-0.5">
          <span>LW {row.lastPosition === 0 ? '—' : row.lastPosition}</span>
          <span>Peak {row.peak}</span>
          <span>{row.weeks}w</span>
          <span className="text-ink2 font-semibold">
            {compact(row.metric)} {metricLabel}
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 shrink-0 text-[12px] num">
        <span className="w-10 text-right text-ink3">{row.lastPosition === 0 ? '—' : row.lastPosition}</span>
        <span className="w-10 text-right text-ink3">{row.peak}</span>
        <span className="w-10 text-right text-ink3">{row.weeks}</span>
        <span className="w-24 text-right text-ink font-semibold">
          {compact(row.metric)}
          <span className="text-ink3 font-normal ml-1">{metricLabel}</span>
        </span>
      </div>
    </div>
  );
}

export function ChartHeader() {
  return (
    <div className="hidden md:flex items-center gap-3 px-3 pb-1 text-[10px] uppercase tracking-widest text-ink3 font-bold">
      <div className="w-8 text-right">#</div>
      <div className="w-11 text-center">Move</div>
      <div className="w-11" />
      <div className="flex-1">Title</div>
      <div className="flex items-center gap-6 shrink-0">
        <span className="w-10 text-right">LW</span>
        <span className="w-10 text-right">Peak</span>
        <span className="w-10 text-right">Wks</span>
        <span className="w-24 text-right">Metric</span>
      </div>
    </div>
  );
}

// ─── PLATFORM SWITCHER ─────────────────────────────────────────────────────

export function PlatformMark({ platform, size = 22 }: { platform: PlatformConfig; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[6px] font-bold text-black shrink-0"
      style={{
        width: size,
        height: size,
        background: platform.accent,
        fontSize: Math.max(8, size * 0.42),
        letterSpacing: '-0.03em',
      }}
      aria-hidden="true"
    >
      {platform.mark}
    </span>
  );
}

export function PlatformSwitcher({
  value,
  onChange,
  platforms = PLATFORM_LIST,
  showQuirk,
}: {
  value: string;
  onChange: (id: string) => void;
  platforms?: PlatformConfig[];
  showQuirk?: boolean;
}) {
  const active = platforms.find((p) => p.id === value);
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {platforms.map((p) => {
          const on = p.id === value;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              title={p.quirk}
              style={on ? { background: `${p.accent}22`, borderColor: p.accent, color: p.accent } : undefined}
              className={cn(
                'flex items-center gap-2 h-9 px-3 rounded-full border text-[12px] font-semibold whitespace-nowrap transition-all duration-150',
                on ? '' : 'bg-card border-line text-ink2 hover:text-ink hover:bg-cardhover',
              )}
            >
              <PlatformMark platform={p} size={18} />
              {p.name}
            </button>
          );
        })}
      </div>
      {showQuirk && active ? (
        <p className="text-[12px] text-ink3 mt-2">{active.quirk}</p>
      ) : null}
    </div>
  );
}

// ─── PLATFORM LOGO LOCKUP ──────────────────────────────────────────────────

export function PlatformLogo({
  platform,
  size = 'md',
}: {
  platform: PlatformConfig;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = { sm: 20, md: 26, lg: 34 }[size];
  const text = { sm: 'text-[13px]', md: 'text-[16px]', lg: 'text-[22px]' }[size];
  return (
    <div className="flex items-center gap-2">
      <PlatformMark platform={platform} size={dims} />
      <span className={cn('font-bold tracking-tight', text)} style={{ color: platform.accent }}>
        {platform.wordmark}
      </span>
    </div>
  );
}

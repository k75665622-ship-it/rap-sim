// ─── COUNTRY SELECT ────────────────────────────────────────────────────────
// Replaces the wall of country buttons that used to sit on top of every chart.
// One control: a country mark, the name, an arrow. Open it and you get a
// searchable list grouped by region, with the home country pinned and the
// recently viewed ones as chips.

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { MARKETS, marketsByRegion, type Market } from '../../data/markets';
import { gradientFor } from './kit';
import { IconChevronDown, IconSearch, IconX } from '../icons';

/** A small country mark. Deliberately not a flag image — it is a game mark. */
export function CountryMark({ market, size = 18 }: { market: Market; size?: number }) {
  const [a, b] = gradientFor(`market|${market.country}`);
  return (
    <span
      className="inline-flex items-center justify-center rounded-[4px] font-bold text-black/75 shrink-0"
      style={{
        width: size * 1.35,
        height: size,
        fontSize: Math.max(8, size * 0.55),
        background: `linear-gradient(135deg, ${a}, ${b})`,
      }}
      aria-hidden="true"
    >
      {market.code}
    </span>
  );
}

export function CountrySelect({
  value,
  onChange,
  home,
  recent = [],
  size = 'md',
  className,
  label,
}: {
  value: string;
  onChange: (country: string) => void;
  /** The player's home country, pinned to the top. */
  home?: string;
  /** Recently viewed countries, newest first. */
  recent?: string[];
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = useMemo(
    () => MARKETS.find((m) => m.country === value),
    [value],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return marketsByRegion();
    return [
      {
        region: 'Results' as const,
        markets: MARKETS.filter(
          (m) =>
            m.country.toLowerCase().includes(q) || m.code.toLowerCase() === q,
        ).sort((a, b) => b.weight - a.weight),
      },
    ];
  }, [query]);

  const homeMarket = home ? MARKETS.find((m) => m.country === home) : undefined;
  const recentMarkets = recent
    .map((c) => MARKETS.find((m) => m.country === c))
    .filter((m): m is Market => !!m && m.country !== home && m.country !== value)
    .slice(0, 5);

  const pick = (country: string) => {
    onChange(country);
    setOpen(false);
    setQuery('');
  };

  const height = size === 'sm' ? 'h-8 text-[12px]' : 'h-10 text-[13px]';

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      {label ? (
        <div className="text-[11px] uppercase tracking-wider text-ink3 mb-1.5">{label}</div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 px-2.5 rounded-[10px] bg-card border border-line text-ink font-semibold',
          'hover:bg-cardhover transition-colors',
          height,
        )}
      >
        {current ? <CountryMark market={current} size={14} /> : null}
        <span className="truncate max-w-[150px]">{value}</span>
        {home === value ? (
          <span className="text-[10px] text-amber font-bold">HOME</span>
        ) : null}
        <IconChevronDown size={14} className="text-ink3" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1.5 w-[290px] rounded-[14px] bg-sidebar border border-line shadow-xl overflow-hidden rl-fade">
          <div className="p-2 border-b border-line">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none">
                <IconSearch size={14} />
              </span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries"
                className="w-full h-9 pl-8 pr-8 rounded-[10px] bg-card border border-line text-ink text-[12px] placeholder:text-ink3 focus:outline-none focus:border-amber"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
                >
                  <IconX size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Home pinned first, then recents, then everything by region. */}
          {!query && homeMarket ? (
            <div className="p-2 border-b border-line">
              <div className="text-[10px] uppercase tracking-widest text-ink3 font-bold px-1 mb-1">
                Your market
              </div>
              <Row market={homeMarket} selected={homeMarket.country === value} onPick={pick} />
            </div>
          ) : null}

          {!query && recentMarkets.length > 0 ? (
            <div className="p-2 border-b border-line">
              <div className="text-[10px] uppercase tracking-widest text-ink3 font-bold px-1 mb-1">
                Recently viewed
              </div>
              <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                {recentMarkets.map((m) => (
                  <button
                    key={m.country}
                    onClick={() => pick(m.country)}
                    className="flex items-center gap-1.5 px-2 h-7 rounded-full bg-card border border-line text-[11px] text-ink2 hover:text-ink hover:bg-cardhover transition"
                  >
                    <CountryMark market={m} size={12} />
                    {m.country}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="max-h-[300px] overflow-y-auto p-2">
            {groups.map((g) => (
              <div key={g.region} className="mb-2 last:mb-0">
                <div className="text-[10px] uppercase tracking-widest text-ink3 font-bold px-1 mb-1">
                  {g.region}
                </div>
                {g.markets.length === 0 ? (
                  <p className="text-[12px] text-ink3 px-1 py-2">No country matches that.</p>
                ) : (
                  g.markets.map((m) => (
                    <Row key={m.country} market={m} selected={m.country === value} onPick={pick} />
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  market,
  selected,
  onPick,
}: {
  market: Market;
  selected: boolean;
  onPick: (c: string) => void;
}) {
  return (
    <button
      onClick={() => onPick(market.country)}
      className={cn(
        'w-full flex items-center gap-2 px-2 h-8 rounded-[8px] text-[12px] transition-colors',
        selected ? 'bg-amber/15 text-amber font-semibold' : 'text-ink2 hover:bg-white/5 hover:text-ink',
      )}
    >
      <CountryMark market={market} size={13} />
      <span className="truncate">{market.country}</span>
      <span className="ml-auto text-[10px] text-ink3 num">
        {market.weight >= 10 ? `${(market.weight / 10).toFixed(0)}x` : `${market.weight.toFixed(1)}x`}
      </span>
    </button>
  );
}

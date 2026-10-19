import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glass?: boolean;
  glow?: boolean;
}

export function Card({ children, className, onClick, glass, glow }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[16px] p-4 min-w-0',
        glass ? 'bg-card/80 backdrop-blur-sm border border-line' : 'bg-card border border-line',
        glow && 'shadow-lg shadow-amber/10 border-amber/30',
        onClick && 'cursor-pointer hover:bg-cardhover transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatBar({ label, value, max = 100, color = 'yellow' }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-400',
    green: 'bg-green-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    red: 'bg-red-400',
    orange: 'bg-orange-400',
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink3 w-32 text-xs truncate">{label}</span>
      <div className="flex-1 bg-white/[0.07] rounded-full h-1.5">
        <div
          className={cn('h-1.5 rounded-full transition-all', colorMap[color] ?? 'bg-yellow-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-ink w-8 text-xs text-right num">{Math.round(value)}</span>
    </div>
  );
}

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-white/[0.07] text-ink2',
    yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    green: 'bg-green-500/20 text-green-400 border border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    red: 'bg-red-500/20 text-red-400 border border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorMap[color] ?? colorMap.gray)}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const variants = {
    primary: 'bg-amber hover:brightness-110 text-black font-bold',
    secondary: 'bg-card hover:bg-cardhover text-ink border border-line font-semibold',
    ghost: 'hover:bg-white/5 text-ink2 hover:text-ink font-semibold',
    danger: 'bg-fall/15 hover:bg-fall/25 text-fall border border-fall/30 font-semibold',
    gold: 'bg-amber hover:brightness-110 text-black font-bold shadow-lg shadow-amber/20',
  };
  const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-10 px-4 text-[13px]', lg: 'h-12 px-6 text-[15px]' };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-[10px] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap',
        variants[variant],
        sizes[size],
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

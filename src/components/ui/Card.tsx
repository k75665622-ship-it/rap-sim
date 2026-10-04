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
        'rounded-2xl p-4',
        glass ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-gray-900 border border-gray-800',
        glow && 'shadow-lg shadow-yellow-500/10',
        onClick && 'cursor-pointer hover:bg-gray-800 transition-colors',
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
      <span className="text-gray-400 w-32 text-xs truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div
          className={cn('h-1.5 rounded-full transition-all', colorMap[color] ?? 'bg-yellow-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-white w-8 text-xs text-right">{Math.round(value)}</span>
    </div>
  );
}

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-800 text-gray-300',
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
    primary: 'bg-yellow-500 hover:bg-yellow-400 text-black font-bold',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700',
    ghost: 'hover:bg-white/5 text-gray-300 hover:text-white',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    gold: 'bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black font-bold shadow-lg shadow-yellow-500/20',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-xl transition-all inline-flex items-center gap-2',
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

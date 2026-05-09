import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'mana';
  color?: 'W' | 'U' | 'B' | 'R' | 'G' | 'gold' | 'colorless';
  className?: string;
}

const variantStyles = {
  default: 'bg-white/[0.08] text-white/70 border border-white/[0.08] shadow-sm',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-sm',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/20 shadow-sm',
  info: 'bg-sky-500/15 text-sky-400 border border-sky-500/20 shadow-sm',
  mana: '',
};

const manaStyles: Record<string, string> = {
  W: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 shadow-sm',
  U: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm',
  B: 'bg-gradient-to-br from-neutral-500 to-neutral-700 text-white shadow-sm',
  R: 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-sm',
  G: 'bg-gradient-to-br from-green-500 to-green-700 text-white shadow-sm',
  gold: 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-sm',
  colorless: 'bg-gradient-to-br from-neutral-400 to-neutral-600 text-white shadow-sm',
};

export function Badge({ children, variant = 'default', color, className = '' }: BadgeProps) {
  const style = variant === 'mana' && color
    ? manaStyles[color] || manaStyles.colorless
    : variantStyles[variant];

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium
      backdrop-blur-sm transition-colors duration-200
      ${style}
      ${className}
    `}>
      {children}
    </span>
  );
}

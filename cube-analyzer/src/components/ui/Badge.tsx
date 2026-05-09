import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'mana';
  color?: 'W' | 'U' | 'B' | 'R' | 'G' | 'gold' | 'colorless';
}

const variantStyles = {
  default: 'bg-white/10 text-white/70 border border-white/10',
  success: 'bg-green-500/10 text-green-400 border border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  mana: '',
};

const manaStyles: Record<string, string> = {
  W: 'bg-amber-100/90 text-amber-900',
  U: 'bg-blue-500/80 text-white',
  B: 'bg-neutral-600 text-white border border-neutral-500',
  R: 'bg-red-500/80 text-white',
  G: 'bg-green-600/80 text-white',
  gold: 'bg-amber-500/80 text-white',
  colorless: 'bg-neutral-500/80 text-white',
};

export function Badge({ children, variant = 'default', color }: BadgeProps) {
  const style = variant === 'mana' && color
    ? manaStyles[color] || manaStyles.colorless
    : variantStyles[variant];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {children}
    </span>
  );
}

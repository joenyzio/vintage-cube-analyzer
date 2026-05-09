import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'mana';
  color?: 'W' | 'U' | 'B' | 'R' | 'G' | 'gold' | 'colorless';
}

const variantStyles = {
  default: 'bg-gray-700 text-gray-200',
  success: 'bg-green-900/50 text-green-400 border border-green-700/50',
  warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50',
  danger: 'bg-red-900/50 text-red-400 border border-red-700/50',
  info: 'bg-blue-900/50 text-blue-400 border border-blue-700/50',
  mana: '', // Will be set by color
};

const manaStyles: Record<string, string> = {
  W: 'bg-amber-100 text-amber-900',
  U: 'bg-blue-600 text-white',
  B: 'bg-gray-800 text-gray-200 border border-gray-600',
  R: 'bg-red-600 text-white',
  G: 'bg-green-700 text-white',
  gold: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white',
  colorless: 'bg-gray-500 text-white',
};

export function Badge({ children, variant = 'default', color }: BadgeProps) {
  const style = variant === 'mana' && color
    ? manaStyles[color] || manaStyles.colorless
    : variantStyles[variant];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {children}
    </span>
  );
}

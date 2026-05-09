import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export function Card({ children, className = '', hover = false, glass = false, ...props }: CardProps) {
  const baseStyles = glass
    ? 'glass-card rounded-xl p-6'
    : 'bg-black border border-white/[0.06] rounded-xl p-6';

  const hoverStyles = hover
    ? 'hover:border-white/[0.12] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300'
    : '';

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-white tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-sm text-white/50 mt-1 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

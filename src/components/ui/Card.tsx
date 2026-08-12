import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Removes default padding so callers can lay out their own. */
  bare?: boolean;
}

export function Card({ children, className = '', bare = false }: CardProps) {
  const padding = bare ? '' : 'p-5';
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-white shadow-sm ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

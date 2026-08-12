import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeTone = 'brand' | 'accent' | 'neutral' | 'success' | 'warning';

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: 'bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-[var(--color-brand)]/30',
  accent: 'bg-[var(--color-accent)]/15 text-[#8a4a00] ring-[var(--color-accent)]/30',
  neutral: 'bg-[var(--color-border)]/60 text-[var(--color-muted)] ring-[var(--color-border)]',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
  warning: 'bg-amber-50 text-amber-800 ring-amber-300',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}

export function Badge({ children, tone = 'neutral', className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

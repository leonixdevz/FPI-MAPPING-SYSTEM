import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[var(--color-brand)] text-[var(--color-brand-fg)] hover:brightness-110 shadow-sm',
  secondary:
    'border border-[var(--color-border)] bg-white text-[var(--color-fg)] hover:bg-[var(--color-border)]/60 shadow-sm',
  ghost: 'text-[var(--color-fg)] hover:bg-[var(--color-border)]/70',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

/** Shared class string so <Link> elements can look identical to buttons. */
export function buttonClasses(
  variant: Variant = 'primary',
  size: Size = 'md',
  extra?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    extra,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? (
        <span
          role="status"
          aria-label="Loading"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current opacity-40 border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

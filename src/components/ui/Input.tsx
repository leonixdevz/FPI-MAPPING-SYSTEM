import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
}

let inputCounter = 0;

export function Input({ label, hint, error, id, className, required, ...rest }: InputProps) {
  const resolvedId = id ?? `input-${++inputCounter}`;
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={resolvedId} className="text-sm font-medium text-[var(--color-fg)]">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
      ) : null}
      <input
        id={resolvedId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined}
        required={required}
        className={cn(
          'w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)]/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
          error
            ? 'border-red-400 focus-visible:ring-red-500'
            : 'border-[var(--color-border)]',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${resolvedId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${resolvedId}-hint`} className="text-xs text-[var(--color-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

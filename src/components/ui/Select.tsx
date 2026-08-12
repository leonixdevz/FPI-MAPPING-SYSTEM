import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  id?: string;
}

let selectCounter = 0;

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  id,
  className,
  required,
  ...rest
}: SelectProps) {
  const resolvedId = id ?? `select-${++selectCounter}`;
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={resolvedId} className="text-sm font-medium text-[var(--color-fg)]">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
      ) : null}
      <select
        id={resolvedId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined}
        required={required}
        className={cn(
          'w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--color-fg)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
          error ? 'border-red-400 focus-visible:ring-red-500' : 'border-[var(--color-border)]',
          className,
        )}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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

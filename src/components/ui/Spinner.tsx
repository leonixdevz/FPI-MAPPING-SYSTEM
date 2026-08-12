interface SpinnerProps {
  /** Tailwind size classes, e.g. 'h-5 w-5'. Defaults to 1rem. */
  size?: string;
  label?: string;
}

export function Spinner({ size = 'h-4 w-4', label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block ${size} animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]`}
    />
  );
}

import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white p-8 text-center">
      <h3 className="text-base font-semibold text-[var(--color-fg)]">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

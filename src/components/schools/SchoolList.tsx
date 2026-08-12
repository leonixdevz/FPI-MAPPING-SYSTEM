import type { School } from '../../types/school';
import { educationLevelLabel, formatLatLng, schoolTypeLabel } from '../../lib/utils';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { SchoolCard } from './SchoolCard';
import { cn } from '../../lib/utils';

interface SchoolListProps {
  schools: School[];
  loading?: boolean;
  /** Map of school id -> dimmed (filtered-out on the map). */
  dimmed?: Record<string, boolean>;
  /**
   * When provided, schools render as selectable rows (e.g. the map
   * sidebar) instead of links to the details page.
   */
  onSelect?: (school: School) => void;
  /** Id of the currently selected row (map sidebar). */
  selectedId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function SchoolList({
  schools,
  loading = false,
  dimmed,
  onSelect,
  selectedId,
  emptyTitle = 'No schools found',
  emptyDescription = 'Try adjusting your search or filters.',
}: SchoolListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-muted)]">
        <Spinner />
        Loading schools…
      </div>
    );
  }

  if (schools.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (onSelect) {
    return (
      <ul className="flex flex-col gap-2">
        {schools.map((school) => {
          const active = selectedId === school.id;
          return (
            <li key={school.id}>
              <button
                type="button"
                onClick={() => onSelect(school)}
                aria-pressed={active}
                className={cn(
                  'w-full rounded-lg border border-[var(--color-border)] bg-white p-3 text-left transition',
                  'hover:border-[var(--color-brand)]/50 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
                  active ? 'border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]' : '',
                  dimmed?.[school.id] ? 'opacity-40' : '',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[var(--color-fg)]">{school.name}</span>
                  <span className="shrink-0 text-xs text-[var(--color-muted)]">
                    {formatLatLng(school.latitude, school.longitude)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{schoolTypeLabel(school.schoolType)}</Badge>
                  <Badge>{educationLevelLabel(school.educationLevel)}</Badge>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {schools.map((school) => (
        <li key={school.id}>
          <SchoolCard school={school} dimmed={dimmed?.[school.id] ?? false} />
        </li>
      ))}
    </ul>
  );
}

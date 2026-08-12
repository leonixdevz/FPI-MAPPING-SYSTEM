import { Link } from 'react-router-dom';
import type { School } from '../../types/school';
import { educationLevelLabel, formatLatLng, schoolTypeLabel } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface SchoolCardProps {
  school: School;
  /** Dim the card when the school is filtered out on the map. */
  dimmed?: boolean;
}

export function SchoolCard({ school, dimmed = false }: SchoolCardProps) {
  return (
    <Link
      to={`/schools/${school.id}`}
      className={dimmed ? 'pointer-events-none' : undefined}
      aria-disabled={dimmed || undefined}
      tabIndex={dimmed ? -1 : undefined}
    >
      <Card
        bare
        className={`p-4 transition hover:border-[var(--color-brand)]/50 hover:shadow-md ${
          dimmed ? 'opacity-40' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[var(--color-fg)]">{school.name}</h3>
          <span className="mt-0.5 shrink-0 text-xs text-[var(--color-muted)]">
            {formatLatLng(school.latitude, school.longitude)}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone="brand">{schoolTypeLabel(school.schoolType)}</Badge>
          <Badge>{educationLevelLabel(school.educationLevel)}</Badge>
          {school.capacity > 0 ? <Badge tone="success">{school.capacity} capacity</Badge> : null}
        </div>
        {school.address ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{school.address}</p>
        ) : null}
        {school.facilities.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {school.facilities.map((facility) => (
              <span
                key={facility}
                className="rounded bg-[var(--color-border)]/50 px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]"
              >
                {facility}
              </span>
            ))}
          </div>
        ) : null}
      </Card>
    </Link>
  );
}

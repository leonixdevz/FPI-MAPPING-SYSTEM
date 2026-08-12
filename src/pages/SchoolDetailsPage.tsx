import { Link, useParams } from 'react-router-dom';
import { useSchools } from '../hooks/useSchools';
import {
  educationLevelLabel,
  formatDate,
  formatLatLng,
  schoolTypeLabel,
} from '../lib/utils';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { buttonClasses } from '../components/ui/Button';

export function SchoolDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { schools, loading } = useSchools({ publicOnly: true });
  const school = schools.find((s) => s.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--color-muted)]">
        <Spinner /> Loading…
      </div>
    );
  }

  if (!school) {
    return (
      <Section>
        <EmptyState
          title="School not found"
          description="This school does not exist or is no longer public."
          action={
            <Link to="/schools" className={buttonClasses('secondary', 'md')}>
              Back to schools
            </Link>
          }
        />
      </Section>
    );
  }

  const details: Array<{ label: string; value: string }> = [
    { label: 'School type', value: schoolTypeLabel(school.schoolType) },
    { label: 'Education level', value: educationLevelLabel(school.educationLevel) },
    { label: 'Address', value: school.address || '—' },
    { label: 'Coordinates', value: formatLatLng(school.latitude, school.longitude) },
    { label: 'Capacity', value: school.capacity > 0 ? school.capacity.toLocaleString() : '—' },
    { label: 'Topography', value: school.topography || '—' },
    { label: 'Noise information', value: school.noiseInformation || '—' },
    { label: 'Added', value: formatDate(school.createdAt) },
  ];

  return (
    <Section>
      <Link to="/schools" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
        ← All schools
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-fg)]">{school.name}</h1>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{schoolTypeLabel(school.schoolType)}</Badge>
                  <Badge>{educationLevelLabel(school.educationLevel)}</Badge>
                  {school.isPublic ? <Badge tone="success">Public</Badge> : null}
                </div>
              </div>
              <Link to={`/map?school=${school.id}`} className={buttonClasses('secondary', 'sm')}>
                Locate on map
              </Link>
            </div>

            {school.description ? (
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-fg)]">
                {school.description}
              </p>
            ) : null}

            {school.facilities.length > 0 ? (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-[var(--color-fg)]">Facilities</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {school.facilities.map((facility) => (
                    <span
                      key={facility}
                      className="rounded-md bg-[var(--color-border)]/50 px-2 py-1 text-xs text-[var(--color-fg)]"
                    >
                      {facility.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-[var(--color-fg)]">Details</h2>
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            {details.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-[var(--color-muted)]">{label}</dt>
                <dd className="font-medium text-[var(--color-fg)]">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </Section>
  );
}

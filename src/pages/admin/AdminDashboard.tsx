import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchools } from '../../hooks/useSchools';
import { useMedia } from '../../hooks/useMedia';
import { useSiteFeatures } from '../../hooks/useSiteFeatures';
import { resetData } from '../../services';
import {
  STUDY_AREA_HECTARES,
  STUDY_AREA_LOCATION,
  STUDY_AREA_NAME,
} from '../../config/studyArea';
import { formatHectares } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

export function AdminDashboard() {
  const schools = useSchools({ publicOnly: false });
  const media = useMedia({ publicOnly: false });
  const features = useSiteFeatures();
  const { showToast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const stats = [
    { label: 'Schools', value: schools.schools.length, loading: schools.loading },
    { label: 'Site features', value: features.features.length, loading: features.loading },
    { label: 'Media records', value: media.media.length, loading: media.loading },
    { label: 'Study area (documented)', value: `${formatHectares(STUDY_AREA_HECTARES)} ha`, loading: false },
  ];

  const handleReset = async () => {
    setConfirmReset(false);
    try {
      await resetData();
      showToast('Demo data reset — re-seeded.', 'success');
      window.location.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset failed.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} bare className="p-4">
            <p className="text-sm text-[var(--color-muted)]">{stat.label}</p>
            {stat.loading ? (
              <p className="mt-1 text-2xl font-semibold text-[var(--color-muted)]">…</p>
            ) : (
              <p className="mt-1 text-2xl font-semibold text-[var(--color-fg)]">{stat.value}</p>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold text-[var(--color-fg)]">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/admin/schools/new" className={buttonClasses('primary', 'md')}>
            Add school
          </Link>
          <Link to="/admin/schools" className={buttonClasses('secondary', 'md')}>
            Manage schools
          </Link>
          <Link to="/admin/media" className={buttonClasses('secondary', 'md')}>
            Manage media
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-[var(--color-fg)]">Study area</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--color-muted)]">Name</dt>
            <dd className="font-medium text-[var(--color-fg)]">{STUDY_AREA_NAME}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Documented area</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {formatHectares(STUDY_AREA_HECTARES)} hectares
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Location</dt>
            <dd className="font-medium text-[var(--color-fg)]">{STUDY_AREA_LOCATION}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          The boundary polygon and site coordinates are marked{' '}
          <code>TODO: REQUIRED PROJECT GIS DATA</code> until the real survey data is supplied. The
          area above is the documented figure, not a derived polygon.
        </p>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <h2 className="font-semibold text-[var(--color-fg)]">Development tools</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Clears all records in the active data store (local browser storage or the Supabase
          database) and re-seeds the demo data. Useful for resetting the defence demo.
        </p>
        <div className="mt-3">
          <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Button>
        </div>
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Yes, reset everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-fg)]">
          This permanently deletes all records in the active data store and restores the seeded
          demo school and media. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

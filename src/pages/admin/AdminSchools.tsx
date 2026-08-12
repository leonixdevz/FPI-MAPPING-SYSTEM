import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { School } from '../../types/school';
import { useSchools } from '../../hooks/useSchools';
import { educationLevelLabel, schoolTypeLabel } from '../../lib/utils';
import { buttonClasses } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

export function AdminSchools() {
  const { schools, loading, remove } = useSchools({ publicOnly: false });
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<School | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await remove(pendingDelete.id);
      showToast(`Deleted "${pendingDelete.name}".`, 'success');
      setPendingDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-[var(--color-muted)]">
        <Spinner /> Loading schools…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">{schools.length} school(s)</p>
        <Link to="/admin/schools/new" className={buttonClasses('primary', 'sm')}>
          + Add school
        </Link>
      </div>

      {schools.length === 0 ? (
        <EmptyState
          title="No schools yet"
          description="Create your first school record to see it on the public map."
          action={
            <Link to="/admin/schools/new" className={buttonClasses('primary', 'md')}>
              Add school
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-border)]/30 text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {schools.map((school) => (
                <tr key={school.id} className="transition hover:bg-[var(--color-border)]/30">
                  <td className="px-4 py-3 font-medium text-[var(--color-fg)]">{school.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone="brand">{schoolTypeLabel(school.schoolType)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-fg)]">
                    {educationLevelLabel(school.educationLevel)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-fg)]">{school.capacity.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {school.isPublic ? (
                      <Badge tone="success">Public</Badge>
                    ) : (
                      <Badge tone="warning">Hidden</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/admin/schools/${school.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setPendingDelete(school)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete school?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-fg)]">
          This will permanently delete{' '}
          <strong>{pendingDelete?.name ?? ''}</strong> and remove it from the public map. This
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

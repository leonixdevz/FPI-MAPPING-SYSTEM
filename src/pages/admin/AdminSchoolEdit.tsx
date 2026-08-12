import { useNavigate, useParams } from 'react-router-dom';
import { useSchools } from '../../hooks/useSchools';
import { SchoolForm } from '../../components/schools/SchoolForm';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { buttonClasses } from '../../components/ui/Button';
import type { SchoolInput } from '../../types/school';

export function AdminSchoolEdit() {
  const { id } = useParams<{ id: string }>();
  const { schools, loading, update } = useSchools({ publicOnly: false });
  const navigate = useNavigate();
  const { showToast } = useToast();

  const school = schools.find((s) => s.id === id);

  const handleSubmit = async (input: SchoolInput) => {
    if (!id) return;
    const next = await update(id, input);
    showToast(`Updated "${next.name}".`, 'success');
    navigate('/admin/schools');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-[var(--color-muted)]">
        <Spinner /> Loading school…
      </div>
    );
  }

  if (!school) {
    return (
      <EmptyState
        title="School not found"
        description="The record you are editing no longer exists."
        action={
          <button
            type="button"
            onClick={() => navigate('/admin/schools')}
            className={buttonClasses('secondary', 'md')}
          >
            Back to schools
          </button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-semibold text-[var(--color-fg)]">Edit school</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Updating this record immediately refreshes the public map.
      </p>
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-white p-5">
        <SchoolForm
          initial={school}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/schools')}
        />
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useSchools } from '../../hooks/useSchools';
import { SchoolForm } from '../../components/schools/SchoolForm';
import { useToast } from '../../components/ui/Toast';
import type { SchoolInput } from '../../types/school';

export function AdminSchoolNew() {
  const { create } = useSchools({ publicOnly: false });
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (input: SchoolInput) => {
    const created = await create(input);
    showToast(`School "${created.name}" added — it is now on the public map.`, 'success');
    navigate('/admin/schools');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-semibold text-[var(--color-fg)]">Add a school</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        All fields follow the project spec. Latitude/longitude must be valid WGS84 coordinates.
      </p>
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-white p-5">
        <SchoolForm
          submitLabel="Add school"
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/schools')}
        />
      </div>
    </div>
  );
}

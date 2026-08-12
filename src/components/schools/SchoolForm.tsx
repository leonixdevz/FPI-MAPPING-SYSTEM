import { useState, type FormEvent } from 'react';
import type { School, SchoolInput } from '../../types/school';
import { validateSchoolInput, type ValidationIssue } from '../../types/school';
import {
  EDUCATION_LEVEL_LABELS,
  SCHOOL_TYPE_LABELS,
} from '../../lib/utils';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface SchoolFormProps {
  /** Existing school for edit mode, or undefined for create mode. */
  initial?: School;
  submitLabel?: string;
  onSubmit: (input: SchoolInput) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  name: string;
  schoolType: SchoolInput['schoolType'];
  educationLevel: SchoolInput['educationLevel'];
  address: string;
  latitude: string;
  longitude: string;
  capacity: string;
  facilities: string;
  topography: string;
  noiseInformation: string;
  description: string;
  isPublic: boolean;
}

function toFormState(school?: School): FormState {
  return {
    name: school?.name ?? '',
    schoolType: school?.schoolType ?? 'public',
    educationLevel: school?.educationLevel ?? 'senior_secondary',
    address: school?.address ?? '',
    latitude: school ? String(school.latitude) : '',
    longitude: school ? String(school.longitude) : '',
    capacity: school ? String(school.capacity) : '0',
    facilities: school?.facilities.join(', ') ?? '',
    topography: school?.topography ?? '',
    noiseInformation: school?.noiseInformation ?? '',
    description: school?.description ?? '',
    isPublic: school?.isPublic ?? true,
  };
}

function toInput(state: FormState): SchoolInput {
  const facilities = state.facilities
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  return {
    name: state.name.trim(),
    schoolType: state.schoolType,
    educationLevel: state.educationLevel,
    address: state.address.trim(),
    latitude: Number(state.latitude),
    longitude: Number(state.longitude),
    capacity: Number(state.capacity),
    facilities,
    topography: state.topography.trim(),
    noiseInformation: state.noiseInformation.trim(),
    description: state.description.trim(),
    isPublic: state.isPublic,
  };
}

export function SchoolForm({ initial, submitLabel, onSubmit, onCancel }: SchoolFormProps) {
  const [state, setState] = useState<FormState>(() => toFormState(initial));
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const issueFor = (field: keyof SchoolInput) =>
    issues.find((issue) => issue.field === field)?.message;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input = toInput(state);
    const validation = validateSchoolInput(input);
    if (validation.length > 0) {
      setIssues(validation);
      return;
    }
    setIssues([]);
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(input);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {formError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="School name"
            required
            value={state.name}
            onChange={(e) => set('name', e.target.value)}
            error={issueFor('name')}
          />
        </div>

        <Select
          label="School type"
          required
          value={state.schoolType}
          onChange={(e) => set('schoolType', e.target.value as FormState['schoolType'])}
          options={Object.entries(SCHOOL_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          error={issueFor('schoolType')}
        />
        <Select
          label="Education level"
          value={state.educationLevel}
          onChange={(e) => set('educationLevel', e.target.value as FormState['educationLevel'])}
          options={Object.entries(EDUCATION_LEVEL_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <div className="sm:col-span-2">
          <Input
            label="Address"
            value={state.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Street / town / state"
          />
        </div>

        <Input
          label="Latitude"
          required
          type="number"
          step="any"
          min={-90}
          max={90}
          value={state.latitude}
          onChange={(e) => set('latitude', e.target.value)}
          error={issueFor('latitude')}
          hint="WGS84 decimal degrees, e.g. 6.828"
        />
        <Input
          label="Longitude"
          required
          type="number"
          step="any"
          min={-180}
          max={180}
          value={state.longitude}
          onChange={(e) => set('longitude', e.target.value)}
          error={issueFor('longitude')}
          hint="WGS84 decimal degrees, e.g. 3.09"
        />

        <Input
          label="Capacity"
          required
          type="number"
          min={0}
          step={1}
          value={state.capacity}
          onChange={(e) => set('capacity', e.target.value)}
          error={issueFor('capacity')}
        />
        <Input
          label="Facilities"
          value={state.facilities}
          onChange={(e) => set('facilities', e.target.value)}
          placeholder="library, laboratory, sports_field"
          hint="Comma-separated list"
        />

        <div className="sm:col-span-2">
          <Input
            label="Topography"
            value={state.topography}
            onChange={(e) => set('topography', e.target.value)}
            placeholder="Terrain description, e.g. flat / gentle slope"
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Noise information"
            value={state.noiseInformation}
            onChange={(e) => set('noiseInformation', e.target.value)}
            placeholder="Noise context near the site"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="school-description" className="text-sm font-medium text-[var(--color-fg)]">
            Description
          </label>
          <textarea
            id="school-description"
            rows={4}
            value={state.description}
            onChange={(e) => set('description', e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-fg)] sm:col-span-2">
          <input
            type="checkbox"
            checked={state.isPublic}
            onChange={(e) => set('isPublic', e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-brand)]"
          />
          Visible to public visitors
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel ?? 'Save school'}
        </Button>
      </div>
    </form>
  );
}

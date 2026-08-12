import { lazy, Suspense, useState, type FormEvent } from 'react';
import type { SiteFeature, SiteFeatureInput } from '../../types/siteFeature';
import {
  FEATURE_TYPES,
  validateSiteFeatureInput,
  type ValidationIssue_Feature,
} from '../../types/siteFeature';
import { FEATURE_TYPE_LABELS, formatLatLng } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

// Lazy so Leaflet stays out of the main bundle (shared with the map page).
const MapPicker = lazy(() => import('./MapPicker').then((m) => ({ default: m.MapPicker })));

interface SiteFeatureFormProps {
  /** Existing feature for edit mode, or undefined for create mode. */
  initial?: SiteFeature;
  submitLabel?: string;
  onSubmit: (input: SiteFeatureInput) => Promise<void>;
  onCancel: () => void;
}

function toInput(
  name: string,
  featureType: SiteFeatureInput['featureType'],
  description: string,
  latitude: string,
  longitude: string,
): SiteFeatureInput {
  return {
    name: name.trim(),
    featureType,
    description: description.trim(),
    latitude: latitude === '' ? Number.NaN : Number(latitude),
    longitude: longitude === '' ? Number.NaN : Number(longitude),
    geometry: null,
  };
}

export function SiteFeatureForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: SiteFeatureFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [featureType, setFeatureType] = useState<SiteFeatureInput['featureType']>(
    initial?.featureType ?? 'building',
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [latitude, setLatitude] = useState(initial ? String(initial.latitude) : '');
  const [longitude, setLongitude] = useState(initial ? String(initial.longitude) : '');
  const [issues, setIssues] = useState<ValidationIssue_Feature[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const issueFor = (field: keyof SiteFeatureInput) =>
    issues.find((issue) => issue.field === field)?.message;

  const hasCoords =
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    latitude !== '' &&
    longitude !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input = toInput(name, featureType, description, latitude, longitude);
    const validation = validateSiteFeatureInput(input);
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
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Feature name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Admin block, Internal access road, Borehole"
            error={issueFor('name')}
          />
        </div>

        <Select
          label="Feature type"
          required
          value={featureType}
          onChange={(e) => setFeatureType(e.target.value as SiteFeatureInput['featureType'])}
          options={FEATURE_TYPES.map((type) => ({ value: type, label: FEATURE_TYPE_LABELS[type] }))}
          error={issueFor('featureType')}
        />
        <div className="flex flex-col justify-end pb-1">
          {hasCoords ? (
            <p className="text-sm text-[var(--color-fg)]">
              Location: <span className="font-medium">{formatLatLng(Number(latitude), Number(longitude))}</span>
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">Location not set yet — click the map.</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Suspense
            fallback={
              <div className="flex h-60 items-center justify-center rounded-md border border-[var(--color-border)] text-sm text-[var(--color-muted)]">
                Loading map…
              </div>
            }
          >
            <MapPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
            />
          </Suspense>
        </div>

        <Input
          label="Latitude"
          required
          type="number"
          step="any"
          min={-90}
          max={90}
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
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
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          error={issueFor('longitude')}
          hint="WGS84 decimal degrees, e.g. 3.09"
        />

        <div className="sm:col-span-2">
          <label
            htmlFor="feature-description"
            className="text-sm font-medium text-[var(--color-fg)]"
          >
            Description
          </label>
          <textarea
            id="feature-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this feature, and what is its current condition?"
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel ?? 'Save feature'}
        </Button>
      </div>
    </form>
  );
}

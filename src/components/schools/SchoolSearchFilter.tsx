import { useMemo } from 'react';
import type { SchoolFilters } from '../../lib/schoolFilters';
import { allFacilities, filtersAreActive } from '../../lib/schoolFilters';
import type { School } from '../../types/school';
import { EDUCATION_LEVEL_LABELS, SCHOOL_TYPE_LABELS } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface SchoolSearchFilterProps {
  filters: SchoolFilters;
  onChange: (filters: SchoolFilters) => void;
  schools: School[];
  /** "Showing X of Y schools" */
  resultCount: number;
}

const FACILITY_TOGGLES = [
  'library',
  'laboratory',
  'sports_field',
  'computer_lab',
  'hostel',
  'clinic',
] as const;

export function SchoolSearchFilter({
  filters,
  onChange,
  schools,
  resultCount,
}: SchoolSearchFilterProps) {
  const facilityOptions = useMemo(() => {
    const present = new Set(allFacilities(schools));
    const curated = FACILITY_TOGGLES.filter((f) => present.has(f));
    // Fall back to whatever facilities actually exist if none of the
    // curated ones are present in the data.
    return curated.length > 0 ? curated : allFacilities(schools);
  }, [schools]);

  const set = (patch: Partial<SchoolFilters>) => onChange({ ...filters, ...patch });

  const toggleFacility = (facility: string) => {
    const active = filters.facilities.includes(facility);
    set({
      facilities: active
        ? filters.facilities.filter((f) => f !== facility)
        : [...filters.facilities, facility],
    });
  };

  const hasActiveFilters = filtersAreActive(filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            type="search"
            label="Search"
            placeholder="Search by name or address…"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
          />
        </div>
        <Select
          label="School type"
          placeholder="Any type"
          value={filters.schoolType}
          onChange={(e) => set({ schoolType: e.target.value as SchoolFilters['schoolType'] })}
          options={Object.entries(SCHOOL_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          label="Education level"
          placeholder="Any level"
          value={filters.educationLevel}
          onChange={(e) =>
            set({ educationLevel: e.target.value as SchoolFilters['educationLevel'] })
          }
          options={Object.entries(EDUCATION_LEVEL_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {facilityOptions.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-medium text-[var(--color-fg)]">Facilities</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {facilityOptions.map((facility) => {
              const active = filters.facilities.includes(facility);
              return (
                <button
                  key={facility}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleFacility(facility)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
                    active
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-brand-fg)]'
                      : 'border-[var(--color-border)] bg-white text-[var(--color-fg)] hover:bg-[var(--color-border)]/50',
                  )}
                >
                  {facility.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <p className="text-sm text-[var(--color-muted)]">
          Showing <strong className="text-[var(--color-fg)]">{resultCount}</strong> of {schools.length}{' '}
          {schools.length === 1 ? 'school' : 'schools'}
        </p>
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                query: '',
                schoolType: '',
                educationLevel: '',
                facilities: [],
              })
            }
          >
            Reset filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

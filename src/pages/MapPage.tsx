import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSchools } from '../hooks/useSchools';
import { useMedia } from '../hooks/useMedia';
import { useSiteFeatures } from '../hooks/useSiteFeatures';
import { useStudyAreaBoundary } from '../hooks/useStudyAreaBoundary';
import { useDebounce } from '../hooks/useDebounce';
import type { SchoolFilters } from '../lib/schoolFilters';
import {
  DEFAULT_SCHOOL_FILTERS,
  filterSchools,
  matchesFilters,
} from '../lib/schoolFilters';
import type { School } from '../types/school';
import { MapView } from '../components/map/MapView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SchoolSearchFilter } from '../components/schools/SchoolSearchFilter';
import { SchoolList } from '../components/schools/SchoolList';
import { cn } from '../lib/utils';

export function MapPage() {
  const { schools, loading } = useSchools({ publicOnly: true });
  const { media } = useMedia({ publicOnly: true });
  const { features } = useSiteFeatures();
  const boundaryState = useStudyAreaBoundary();
  const [searchParams] = useSearchParams();
  const handledSchoolParam = useRef(false);

  const [filters, setFilters] = useState<SchoolFilters>(DEFAULT_SCHOOL_FILTERS);
  const debouncedQuery = useDebounce(filters.query, 250);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const effectiveFilters = useMemo<SchoolFilters>(
    () => ({ ...filters, query: debouncedQuery }),
    [filters, debouncedQuery],
  );

  const filteredSchools = useMemo(
    () => filterSchools(schools, effectiveFilters),
    [schools, effectiveFilters],
  );

  const dimmedMap = useMemo(
    () =>
      Object.fromEntries(schools.map((s) => [s.id, !matchesFilters(s, effectiveFilters)])),
    [schools, effectiveFilters],
  );

  const handleListSelect = (school: School) => {
    setSelectedSchoolId(school.id);
    setFlyTarget({ lat: school.latitude, lng: school.longitude });
    setSidebarOpen(false);
  };

  // Support deep links from the details page: /map?school=<id> selects
  // and flies to that school once its record has loaded.
  useEffect(() => {
    if (handledSchoolParam.current) return;
    const id = searchParams.get('school');
    if (!id) return;
    const school = schools.find((s) => s.id === id);
    if (!school) return; // schools still loading — retry on next render
    handledSchoolParam.current = true;
    handleListSelect(school);
  }, [searchParams, schools]);

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-[var(--color-border)] bg-white p-4">
        <SchoolSearchFilter
          filters={filters}
          onChange={setFilters}
          schools={schools}
          resultCount={filteredSchools.length}
        />
      </div>
      <div className="flex-1 bg-white p-4">
        <SchoolList
          schools={filteredSchools}
          loading={loading}
          dimmed={dimmedMap}
          selectedId={selectedSchoolId}
          onSelect={handleListSelect}
          emptyTitle={filteredSchools.length === 0 && !loading ? 'No matches' : 'No schools yet'}
          emptyDescription={
            filteredSchools.length === 0 && !loading
              ? 'Try removing some filters.'
              : 'Schools added by the administrator appear here and on the map.'
          }
        />
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100dvh-56px)] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-[360px] shrink-0 border-r border-[var(--color-border)] bg-white lg:block">
        {sidebar}
      </aside>

      {/* Map */}
      <div className="relative min-w-0 flex-1">
        <ErrorBoundary>
        <MapView
          schools={schools}
          features={features}
          media={media}
          filters={effectiveFilters}
          selectedSchoolId={selectedSchoolId}
          flyTarget={flyTarget}
          boundaryState={boundaryState}
          onSelectSchool={setSelectedSchoolId}
        />
        </ErrorBoundary>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className={cn(
            'absolute left-3 top-14 z-[500] rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-[var(--color-border)]/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
            'lg:hidden',
          )}
        >
          {sidebarOpen ? 'Close' : 'Schools & filters'}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div className="absolute inset-0 z-[550] flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <h2 className="font-semibold text-[var(--color-fg)]">Schools & filters</h2>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="rounded-md px-2 py-1 text-xl text-[var(--color-muted)] transition hover:bg-[var(--color-border)]/50"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1">{sidebar}</div>
        </div>
      ) : null}
    </div>
  );
}

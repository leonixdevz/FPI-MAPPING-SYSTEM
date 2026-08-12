import { useMemo, useState } from 'react';
import { useSchools } from '../hooks/useSchools';
import { useDebounce } from '../hooks/useDebounce';
import type { SchoolFilters } from '../lib/schoolFilters';
import { DEFAULT_SCHOOL_FILTERS, filterSchools } from '../lib/schoolFilters';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { SchoolSearchFilter } from '../components/schools/SchoolSearchFilter';
import { SchoolList } from '../components/schools/SchoolList';

export function SchoolsPage() {
  const { schools, loading } = useSchools({ publicOnly: true });
  const [filters, setFilters] = useState<SchoolFilters>(DEFAULT_SCHOOL_FILTERS);
  const debouncedQuery = useDebounce(filters.query, 250);

  const effectiveFilters = useMemo<SchoolFilters>(
    () => ({ ...filters, query: debouncedQuery }),
    [filters, debouncedQuery],
  );

  const filtered = useMemo(() => filterSchools(schools, effectiveFilters), [schools, effectiveFilters]);

  return (
    <>
      <Section className="pb-2">
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Schools</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Schools in the study area. Use the filters to narrow the list.
        </p>
      </Section>
      <Section className="pt-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <Card className="h-fit lg:sticky lg:top-20">
            <SchoolSearchFilter
              filters={filters}
              onChange={setFilters}
              schools={schools}
              resultCount={filtered.length}
            />
          </Card>
          <SchoolList
            schools={filtered}
            loading={loading}
            emptyTitle={filtered.length === 0 && !loading ? 'No matches' : 'No schools yet'}
            emptyDescription={
              filtered.length === 0 && !loading
                ? 'Try adjusting your search or filters.'
                : 'Schools added by the administrator will appear here.'
            }
          />
        </div>
      </Section>
    </>
  );
}
